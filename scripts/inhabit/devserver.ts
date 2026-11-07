// A Vite dev-server endpoint that lets the app reach a model without the key ever entering the browser: the page POSTs the prompt
// to /__inhabit/model, this middleware calls the SDK client (the same ones scripts/inhabit.ts uses) with the key from the shell that
// started `npm run dev`, and returns the answer. Only in `vite` (serve), never in a build.
//
// The key is the shell's, so the endpoint answers only the page itself: a request must be JSON (a cross-site form or a no-cors fetch
// cannot send that without a preflight) and, when it carries an Origin, come from this server's own origin. The api, model, effort and
// answer size are checked against what the clients accept; INHABIT_MODELS (comma-separated) narrows the models further. One launch
// makes at most INHABIT_MAX_CALLS calls upstream (default 2000), retries included. A caller that goes away aborts its call.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { isRetryable, type ModelClient } from '../../src/agent/model';

interface ModelRequestBody {
  api: 'anthropic' | 'openai';
  model: string;
  effort?: string;
  system: string;
  user: string;
  maxOutputTokens: number;
}

/** the efforts each client accepts (scripts/inhabit/anthropic.ts, openai.ts) */
const EFFORTS: Record<ModelRequestBody['api'], readonly string[]> = {
  anthropic: ['low', 'medium', 'high'],
  openai: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
};
/** the largest answer the page may ask for (the budget's default is 8000) */
export const MAX_OUTPUT_TOKENS = 32_000;
export const DEFAULT_MAX_CALLS = 2000;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

export interface ModelEndpointOptions {
  /** builds the client for a checked request (tests pass a fake; the default loads the SDK clients) */
  clientFor?: (body: ModelRequestBody) => Promise<ModelClient>;
  /** upstream calls this launch may make */
  maxCalls?: number;
  /** when set, the only model ids served */
  models?: readonly string[] | null;
}

class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function readJson(req: IncomingMessage, limit = 4_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let text = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      text += chunk;
      if (text.length > limit) {
        reject(new Refusal(413, 'request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Refusal(400, 'the body is not JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

/** only this server's own page: JSON, and an Origin (when one is sent) whose host is the one the request came to */
function checkCaller(req: IncomingMessage): void {
  const type = (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
  if (type !== 'application/json') throw new Refusal(415, 'send the prompt as application/json');
  const origin = req.headers.origin;
  if (origin !== undefined) {
    let host: string | null = null;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    if (!host || host !== req.headers.host) throw new Refusal(403, 'only the page this server serves may ask the model');
  }
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin' && site !== 'none') throw new Refusal(403, 'only the page this server serves may ask the model');
}

function checkBody(raw: unknown, models: readonly string[] | null): ModelRequestBody {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Refusal(400, 'the body must be a JSON object');
  const b = raw as Record<string, unknown>;
  if (typeof b.system !== 'string' || typeof b.user !== 'string' || typeof b.model !== 'string') throw new Refusal(400, 'system, user and model are required');
  const api = b.api === 'anthropic' ? 'anthropic' : b.api === 'openai' || b.api === undefined ? 'openai' : null;
  if (!api) throw new Refusal(400, 'api must be anthropic or openai');
  if (!MODEL_ID.test(b.model)) throw new Refusal(400, 'not a model id');
  if (models && !models.includes(b.model)) throw new Refusal(403, `model ${b.model} is not in INHABIT_MODELS`);
  let effort: string | undefined;
  if (b.effort !== undefined && b.effort !== '') {
    if (typeof b.effort !== 'string' || !EFFORTS[api].includes(b.effort)) throw new Refusal(400, `effort must be one of ${EFFORTS[api].join(', ')}`);
    effort = b.effort;
  }
  const tokens = b.maxOutputTokens === undefined ? 8000 : b.maxOutputTokens;
  if (typeof tokens !== 'number' || !Number.isInteger(tokens) || tokens < 1 || tokens > MAX_OUTPUT_TOKENS) throw new Refusal(400, `maxOutputTokens must be a whole number from 1 to ${MAX_OUTPUT_TOKENS}`);
  return { api, model: b.model, ...(effort ? { effort } : {}), system: b.system, user: b.user, maxOutputTokens: tokens };
}

async function sdkClient(body: ModelRequestBody): Promise<ModelClient> {
  return body.api === 'anthropic'
    ? (await import('./anthropic')).anthropicModel({ model: body.model, effort: (body.effort as 'low' | 'medium' | 'high' | undefined) ?? 'medium' })
    : (await import('./openai')).openaiModel({ model: body.model, ...(body.effort ? { effort: body.effort as 'low' | 'medium' | 'high' } : {}) });
}

/** the endpoint's handler, apart from Vite so it can be tested on a plain server */
export function modelEndpoint(opts: ModelEndpointOptions = {}): (req: IncomingMessage, res: ServerResponse) => void {
  const clientFor = opts.clientFor ?? sdkClient;
  const maxCalls = opts.maxCalls ?? DEFAULT_MAX_CALLS;
  const models = opts.models ?? null;
  let calls = 0;
  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // registered before the body is read: a caller that goes away (the page's own timeout, a closed tab) ends the upstream call too
    const ac = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) ac.abort();
    });
    if (req.method !== 'POST') throw new Refusal(405, 'POST a prompt here');
    checkCaller(req);
    const body = checkBody(await readJson(req), models);
    if (calls >= maxCalls) throw new Refusal(429, `this dev server has made its ${maxCalls} model calls; restart it (or set INHABIT_MAX_CALLS) to allow more`);
    calls++;
    try {
      const client = await clientFor(body);
      const reply = await client.complete({ system: body.system, user: body.user, maxOutputTokens: body.maxOutputTokens }, ac.signal);
      send(res, 200, reply);
    } catch (e) {
      // the page's client (src/app/inhabit.ts) turns a retryable answer back into a RetryableModelError, so the gate waits it out
      const error = e instanceof Error ? e.message : String(e);
      if (isRetryable(e)) send(res, 503, { error, retryable: true, ...(e.retryAfterMs !== undefined ? { retryAfterMs: e.retryAfterMs } : {}) });
      else send(res, 502, { error });
    }
  };
  return (req, res) => {
    // nothing a request does may end the dev server (an unhandled rejection would)
    handle(req, res).catch((e: unknown) => {
      if (e instanceof Refusal) send(res, e.status, { error: e.message });
      else send(res, 500, { error: e instanceof Error ? e.message : String(e) });
    });
  };
}

function envModels(): string[] | null {
  const list = (process.env.INHABIT_MODELS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

function envMaxCalls(): number {
  const raw = process.env.INHABIT_MAX_CALLS;
  if (raw === undefined || raw === '') return DEFAULT_MAX_CALLS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`INHABIT_MAX_CALLS must be a whole number, not ${raw}`);
  return n;
}

export function inhabitDevServer(): Plugin {
  return {
    name: 'living-world-inhabit-model',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__inhabit/model', modelEndpoint({ maxCalls: envMaxCalls(), models: envModels() }));
    },
  };
}
