// One small client for the three OpenAI-compatible Chat Completions APIs the relay talks to (xAI, DeepSeek, OpenAI). It is built on
// node:http and node:https directly, with no SDK and no fetch, for one reason: every timeout in it is ours. An SDK or Node's own
// agent brings timeouts of its own (a five-second socket idle default, for one) that would cut off a reasoning model thinking for
// ten minutes and report it as a network error. Four clocks are kept here, each named when it expires: connect, first byte, idle
// (the longest silence between two chunks of the body) and total.
//
// Everything a vendor returns is untrusted text. Error bodies are capped, stripped of control characters and redacted of every
// known key before they reach a message; the key goes out only in the Authorization header, only to a host config.ts allows, and a
// redirect is never followed. The file writes nothing to disk and prints nothing: the caller decides what to record.
//
// It cannot be tested against the real vendors from the build machine, so every failure says what happened in plain words.
import { request as httpRequest } from 'node:http';
import type { ClientRequest, IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { retryAfterMs } from '../../scripts/inhabit/transient';
import { baseUrlProblems } from './config';
import { makeRedactor, secretsFrom } from './redact';
import type { ChatReply, ChatRequest, Clocks, ProviderConfig, ProviderErrorKind, ProviderName, RelayConfig } from './types';

/** an error body is read up to this much and no further */
const ERROR_BODY_BYTES = 64 * 1024;
/** what a vendor's error text may contribute to a message */
const SHOWN_BODY_CHARS = 2000;
/** a whole non-streamed answer, or the text of a streamed one, may not exceed this; real answers are a few hundred kilobytes */
const MAX_ANSWER_BYTES = 8 * 1024 * 1024;
/** a vendor's own Retry-After is believed up to ten minutes; a hostile or broken one cannot park the relay for a day */
const MAX_RETRY_AFTER_MS = 600_000;
/** the same pattern scripts/inhabit/openai.ts uses to tell "out of credit" (no wait helps) from an ordinary rate limit */
const OUT_OF_CREDIT = /insufficient_quota|no credits|exceeded your current quota|billing/i;
/** socket-level failures that mean the certificate or the machine's trust is wrong, which no retry will change */
const TLS_TRUST = /^(CERT_|UNABLE_TO_|DEPTH_ZERO|SELF_SIGNED|HOSTNAME_MISMATCH|ERR_TLS_|ERR_SSL_)/;

type ClockName = 'connect' | 'firstByte' | 'idle' | 'total';

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  status?: number;
  /** the vendor's body, trimmed to 2,000 characters and redacted */
  body?: string;
  clock?: ClockName;
  provider: ProviderName;
  /** attempts made when the error was finally thrown; 0 until the retry loop has run */
  attempts: number;
  /** how long the vendor asked us to wait, when it said (capped); used for the next retry */
  retryAfterMs?: number;

  constructor(kind: ProviderErrorKind, provider: ProviderName, message: string, extra: { status?: number; body?: string; clock?: ClockName; retryAfterMs?: number } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.provider = provider;
    this.attempts = 0;
    if (extra.status !== undefined) this.status = extra.status;
    if (extra.body !== undefined) this.body = extra.body;
    if (extra.clock !== undefined) this.clock = extra.clock;
    if (extra.retryAfterMs !== undefined) this.retryAfterMs = extra.retryAfterMs;
  }
}

/** how the four clocks are kept; a test replaces it to make an expiry happen without waiting */
export interface Timers {
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
}

export interface CallDeps {
  env: Record<string, string | undefined>;
  sleep(ms: number): Promise<void>;
  now(): number;
  /** told before each retry: the number of the attempt about to start, how long the wait is, and why the last one failed */
  onAttempt?(info: { attempt: number; waitMs: number; reason: string }): void;
  /** the timer seam for the four clocks; real timers when absent */
  timers?: Timers;
}

const REAL_TIMERS: Timers = { setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) };

type ResolvedDeps = Omit<CallDeps, 'timers'> & { timers: Timers };

function resolveDeps(d?: Partial<CallDeps>): ResolvedDeps {
  return {
    env: d?.env ?? process.env,
    sleep: d?.sleep ?? ((ms) => new Promise<void>((done) => setTimeout(done, ms))),
    now: d?.now ?? (() => Date.now()),
    onAttempt: d?.onAttempt,
    timers: d?.timers ?? REAL_TIMERS,
  };
}

// ---- the request body ----

/**
 * The JSON body for a chat request. Sampling parameters (temperature, top_p, penalties, stop, logprobs) are never sent: each of
 * the three vendors rejects or silently ignores some of them on its reasoning models, and the owner's extraBody is the only door
 * for anything else.
 */
export function buildBody(cfg: RelayConfig, req: ChatRequest): Record<string, unknown> {
  const role = cfg.roles[req.role];
  const provider = cfg.providers[role.provider];
  const body: Record<string, unknown> = {
    model: role.model,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
    [provider.tokenParam]: role.maxOutputTokens,
    stream: provider.stream,
  };
  if (provider.stream && provider.streamUsage) body.stream_options = { include_usage: true };
  if (req.json && provider.jsonMode === 'json_object') body.response_format = { type: 'json_object' };
  return { ...body, ...role.extraBody };
}

// ---- small helpers ----

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** vendor text made safe to print: control characters (a terminal escape sequence, say) become spaces, newlines and tabs stay */
function plain(text: string): string {
  return text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ');
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** base URL plus a path, joined without doubling or dropping a slash */
function endpoint(base: string, path: string): URL {
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  url.hash = '';
  return url;
}

const firstHeader = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

function waitHint(headers: IncomingHttpHeaders, body: string): number | undefined {
  const ms = retryAfterMs({ headers: { 'retry-after': firstHeader(headers['retry-after']) }, message: body });
  return ms === undefined ? undefined : Math.min(Math.max(0, ms), MAX_RETRY_AFTER_MS);
}

// ---- one HTTP exchange with four clocks ----

interface Exchange {
  status: number;
  headers: IncomingHttpHeaders;
  /** the collected body; empty when a body sink took it */
  body: string;
}

interface ExchangeOptions {
  provider: ProviderName;
  url: URL;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  payload?: string;
  clocks: Clocks;
  timers: Timers;
  /** takes each chunk of a 2xx body instead of collecting it; may throw a ProviderError to end the call */
  sink?: (chunk: Buffer) => void;
}

function clockMessage(clock: ClockName, ms: number): string {
  switch (clock) {
    case 'connect':
      return `the connect clock expired: no connection was made within ${ms} ms`;
    case 'firstByte':
      return `the first-byte clock expired: the vendor sent no response within ${ms} ms of the request`;
    case 'idle':
      return `the idle clock expired: the answer went silent for ${ms} ms in the middle of the body (no data, not even a keep-alive line)`;
    case 'total':
      return `the total clock expired: the call was not finished within ${ms} ms`;
  }
}

function networkError(provider: ProviderName, e: Error & { code?: string }, when: string): ProviderError {
  const code = e.code ? ` (${e.code})` : '';
  if (e.code && TLS_TRUST.test(e.code)) {
    return new ProviderError('config', provider, `the TLS certificate could not be trusted${code}: ${plain(e.message)}. A proxy or an out-of-date certificate store on this machine is the usual cause; a retry will not help.`);
  }
  return new ProviderError('network', provider, `network error${code} ${when}: ${plain(e.message)}`);
}

function exchange(o: ExchangeOptions): Promise<Exchange> {
  return new Promise<Exchange>((resolve, reject) => {
    let settled = false;
    let req: ClientRequest | undefined;
    let res: IncomingMessage | undefined;
    const handles = new Map<ClockName, unknown>();

    const stop = (name: ClockName): void => {
      if (!handles.has(name)) return;
      o.timers.clearTimer(handles.get(name));
      handles.delete(name);
    };
    const settle = (): void => {
      settled = true;
      for (const name of [...handles.keys()]) stop(name);
    };
    const fail = (err: ProviderError): void => {
      if (settled) return;
      settle();
      res?.destroy();
      req?.destroy();
      reject(err);
    };
    const succeed = (x: Exchange): void => {
      if (settled) return;
      settle();
      resolve(x);
    };
    const arm = (name: ClockName, ms: number): void => {
      stop(name);
      const h = o.timers.setTimer(() => fail(new ProviderError('clock', o.provider, clockMessage(name, ms), { clock: name })), ms);
      // a timer that fired while it was being set has already ended the call; do not keep its handle
      if (settled) o.timers.clearTimer(h);
      else handles.set(name, h);
    };

    const tls = o.url.protocol === 'https:';
    try {
      req = (tls ? httpsRequest : httpRequest)({
        protocol: o.url.protocol,
        hostname: o.url.hostname,
        port: o.url.port || undefined,
        path: `${o.url.pathname}${o.url.search}`,
        method: o.method,
        headers: o.headers,
        // no pooled agent: its own socket timeout would sit beside ours, and a key must never ride a shared connection
        agent: false,
      });
    } catch (e) {
      reject(new ProviderError('config', o.provider, `the request could not be built: ${e instanceof Error ? plain(e.message) : 'unknown error'}`));
      return;
    }

    req.on('error', (e: Error & { code?: string }) => fail(networkError(o.provider, e, `talking to ${o.url.host}`)));
    req.on('socket', (socket) => {
      if (tls) socket.once('secureConnect', () => stop('connect'));
      else if (socket.connecting) socket.once('connect', () => stop('connect'));
      else stop('connect');
    });

    req.on('response', (r: IncomingMessage) => {
      res = r;
      stop('firstByte');
      const status = r.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        fail(new ProviderError('config', o.provider, `the vendor answered with a redirect (status ${status}); refusing to send the key elsewhere`, { status }));
        return;
      }
      const good = status >= 200 && status < 300;
      const cap = good ? MAX_ANSWER_BYTES : ERROR_BODY_BYTES;
      const parts: Buffer[] = [];
      let size = 0;
      arm('idle', o.clocks.idleMs);

      r.on('data', (chunk: Buffer) => {
        if (settled) return;
        arm('idle', o.clocks.idleMs);
        try {
          if (good && o.sink) {
            o.sink(chunk);
            return;
          }
          if (size + chunk.length > cap) {
            if (good) {
              fail(new ProviderError('server', o.provider, `the answer is larger than ${cap} bytes; refusing to read more`, { status }));
              return;
            }
            parts.push(chunk.subarray(0, cap - size));
            size = cap;
            succeed({ status, headers: r.headers, body: Buffer.concat(parts).toString('utf8') });
            req?.destroy();
            return;
          }
          parts.push(chunk);
          size += chunk.length;
        } catch (e) {
          if (e instanceof ProviderError) fail(e);
          else fail(new ProviderError('server', o.provider, `unexpected failure while reading the answer: ${e instanceof Error ? plain(e.message) : 'unknown'}`));
        }
      });
      r.on('end', () => succeed({ status, headers: r.headers, body: Buffer.concat(parts).toString('utf8') }));
      r.on('error', (e: Error & { code?: string }) => fail(networkError(o.provider, e, 'while the answer was arriving')));
      // a socket cut without 'end' and without an error event
      r.on('close', () => fail(new ProviderError('network', o.provider, 'the connection closed before the answer was complete')));
    });

    arm('connect', o.clocks.connectMs);
    arm('firstByte', o.clocks.firstByteMs);
    arm('total', o.clocks.totalMs);
    if (settled) return;
    req.end(o.payload);
  });
}

// ---- reading an answer ----

interface Parsed {
  text: string;
  model: string;
  finish: string | null;
  usage?: { input: number; output: number };
  done: boolean;
}

function usageOf(v: unknown): { input: number; output: number } | undefined {
  if (!isObject(v)) return undefined;
  const input = v.prompt_tokens;
  const output = v.completion_tokens;
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  if (!ok(input) && !ok(output)) return undefined;
  return { input: ok(input) ? input : 0, output: ok(output) ? output : 0 };
}

function errorText(e: unknown): string {
  if (typeof e === 'string') return e;
  if (isObject(e) && typeof e.message === 'string') return e.message;
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return String(e);
  }
}

/** Reads a server-sent-events body a chunk at a time. A chunk may end in the middle of a line or of a UTF-8 character. */
class StreamReader {
  private readonly decoder = new TextDecoder('utf-8');
  private pending = '';
  private readonly pieces: string[] = [];
  private length = 0;
  private stray = '';
  model = '';
  finish: string | null = null;
  usage?: { input: number; output: number };
  done = false;

  constructor(private readonly provider: ProviderName) {}

  feed(chunk: Buffer): void {
    this.pending += this.decoder.decode(chunk, { stream: true });
    this.drain(false);
  }

  /** the body ended: the last line may have had no newline */
  end(): void {
    this.pending += this.decoder.decode();
    this.drain(true);
  }

  result(): Parsed {
    return { text: this.pieces.join(''), model: this.model, finish: this.finish, usage: this.usage, done: this.done };
  }

  /** what arrived that was not server-sent events, for a message that has to explain a stream with no finish */
  strayText(): string {
    return this.stray;
  }

  private drain(final: boolean): void {
    const lines = this.pending.split(/\r\n|\n|\r/);
    this.pending = final ? '' : (lines.pop() ?? '');
    for (const line of lines) this.line(line);
    if (this.pending.length > MAX_ANSWER_BYTES) throw new ProviderError('server', this.provider, 'malformed stream: a single line is longer than the limit');
  }

  private line(line: string): void {
    if (this.done || line === '' || line.startsWith(':')) return;
    if (!line.startsWith('data:')) {
      if (!/^(event|id|retry):/.test(line) && this.stray.length < 300) this.stray += `${this.stray ? ' ' : ''}${shorten(plain(line), 200)}`;
      return;
    }
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') {
      this.done = true;
      return;
    }
    if (payload === '') return;
    let chunk: unknown;
    try {
      chunk = JSON.parse(payload);
    } catch {
      throw new ProviderError('server', this.provider, `malformed stream: a data line was not JSON: ${shorten(plain(payload), 200)}`, { body: shorten(plain(payload), SHOWN_BODY_CHARS) });
    }
    if (!isObject(chunk)) throw new ProviderError('server', this.provider, `malformed stream: a data line was not a JSON object: ${shorten(plain(payload), 200)}`);
    if (chunk.error !== undefined && chunk.error !== null) {
      const detail = shorten(plain(errorText(chunk.error)), SHOWN_BODY_CHARS);
      throw new ProviderError('server', this.provider, `the vendor sent an error in the middle of the stream: ${detail}`, { body: detail });
    }
    if (!this.model && typeof chunk.model === 'string' && chunk.model) this.model = chunk.model;
    const usage = usageOf(chunk.usage);
    if (usage) this.usage = usage;
    const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : undefined;
    if (!isObject(choice)) return;
    if (typeof choice.finish_reason === 'string' && choice.finish_reason) this.finish = choice.finish_reason;
    // reasoning_content and every other field are ignored; only the answer's own text is kept
    const delta = choice.delta;
    if (isObject(delta) && typeof delta.content === 'string') {
      this.length += delta.content.length;
      if (this.length > MAX_ANSWER_BYTES) throw new ProviderError('server', this.provider, 'the streamed answer is longer than the limit; refusing to read more');
      this.pieces.push(delta.content);
    }
  }
}

/** a non-streamed body: JSON, possibly after the blank lines DeepSeek sends as keep-alives */
function parseWhole(provider: ProviderName, body: string): Parsed {
  let json: unknown;
  try {
    json = JSON.parse(body.trim());
  } catch {
    throw new ProviderError('server', provider, `the vendor's answer was not JSON: ${shorten(plain(body.trim()), 200)}`, { body: shorten(plain(body.trim()), SHOWN_BODY_CHARS) });
  }
  if (!isObject(json)) throw new ProviderError('server', provider, `the vendor's answer was not a JSON object: ${shorten(plain(body.trim()), 200)}`);
  if (json.error !== undefined && json.error !== null) {
    const detail = shorten(plain(errorText(json.error)), SHOWN_BODY_CHARS);
    throw new ProviderError('server', provider, `the vendor answered 200 with an error: ${detail}`, { body: detail });
  }
  const choice = Array.isArray(json.choices) ? json.choices[0] : undefined;
  const message = isObject(choice) && isObject(choice.message) ? choice.message : undefined;
  return {
    text: message && typeof message.content === 'string' ? message.content : '',
    model: typeof json.model === 'string' ? json.model : '',
    finish: isObject(choice) && typeof choice.finish_reason === 'string' && choice.finish_reason ? choice.finish_reason : null,
    usage: usageOf(json.usage),
    done: false,
  };
}

// ---- one call, with its retries ----

interface Ctx {
  cfg: RelayConfig;
  provider: ProviderName;
  pc: ProviderConfig;
  key: string;
  deps: ResolvedDeps;
  redact: (text: string) => string;
}

/** the same error with its text redacted; the stack is the new error's own, so the original text is not carried along */
function scrub(ctx: Pick<Ctx, 'redact'>, e: ProviderError): ProviderError {
  const out = new ProviderError(e.kind, e.provider, ctx.redact(e.message), {
    status: e.status,
    body: e.body === undefined ? undefined : ctx.redact(e.body),
    clock: e.clock,
    retryAfterMs: e.retryAfterMs,
  });
  out.attempts = e.attempts;
  return out;
}

/** Everything that must hold before a byte is sent: an allowed host, a key that is there and fit to go in a header. */
function prepare(cfg: RelayConfig, provider: ProviderName, deps: ResolvedDeps): Ctx {
  const redact = makeRedactor(secretsFrom(cfg, deps.env), []);
  const refuse = (kind: ProviderErrorKind, message: string): never => {
    throw scrub({ redact }, new ProviderError(kind, provider, message));
  };
  const pc = cfg.providers?.[provider];
  if (!pc) return refuse('config', `providers.${provider} is missing from the configuration`);
  const problems = baseUrlProblems(provider, pc.baseUrl);
  if (problems.length) return refuse('config', `refusing to call ${provider}, nothing was sent: ${problems.join('; ')}`);
  const raw = deps.env[pc.keyEnv];
  const key = typeof raw === 'string' ? raw.trim() : '';
  if (!key) return refuse('no_key', `no key for ${provider}: the environment variable ${pc.keyEnv} is not set or is blank`);
  if (!/^[\x21-\x7e]+$/.test(key)) return refuse('config', `the value of ${pc.keyEnv} has characters that cannot go in an HTTP header (a space, a line break or a non-ASCII character); check how it was pasted`);
  return { cfg, provider, pc, key, deps, redact };
}

const RETRIED_FREELY: ReadonlySet<ProviderErrorKind> = new Set(['rate_limit', 'server', 'network']);
const RETRIED_ONCE: ReadonlySet<ProviderErrorKind> = new Set(['clock', 'blank']);

async function withRetries<T>(ctx: Ctx, once: () => Promise<T>): Promise<{ value: T; attempts: number }> {
  const { limits } = ctx.cfg;
  const limit = Math.max(1, limits.attempts);
  const usedOnce = new Set<ProviderErrorKind>();
  for (let attempt = 1; ; attempt++) {
    try {
      return { value: await once(), attempts: attempt };
    } catch (e) {
      if (!(e instanceof ProviderError)) {
        // a defect of ours, not a vendor's answer: still no key in its text
        const text = ctx.redact(e instanceof Error ? e.message : String(e));
        throw new Error(text);
      }
      const err = scrub(ctx, e);
      err.attempts = attempt;
      let retry = attempt < limit;
      if (retry && RETRIED_ONCE.has(err.kind)) {
        retry = !usedOnce.has(err.kind);
        usedOnce.add(err.kind);
      } else if (retry) {
        retry = RETRIED_FREELY.has(err.kind);
      }
      if (!retry) throw err;
      const schedule = limits.backoffMs;
      const backoff = schedule[attempt - 1] ?? schedule[schedule.length - 1] ?? 0;
      const waitMs = Math.max(err.retryAfterMs ?? 0, backoff);
      ctx.deps.onAttempt?.({ attempt: attempt + 1, waitMs, reason: `${err.kind}: ${shorten(err.message, 300)}` });
      await ctx.deps.sleep(waitMs);
    }
  }
}

/** The error for a non-2xx answer, by status. */
function httpFailure(ctx: Ctx, ex: Exchange, model?: string, roleName?: string): ProviderError {
  const { status } = ex;
  const full = plain(ex.body).trim();
  const shown = shorten(full, SHOWN_BODY_CHARS);
  let kind: ProviderErrorKind;
  let what: string;
  if (status === 401 || status === 403) {
    kind = 'auth';
    what = `the key was refused; check that ${ctx.pc.keyEnv} holds a current ${ctx.provider} key with access to this API`;
  } else if (status === 404) {
    kind = 'not_found';
    what = model
      ? `not found; this is usually a model name the vendor does not know ("${model}"${roleName ? `, roles.${roleName}.model` : ''}) or a wrong base URL path; "doctor --live" lists the names this key can use`
      : 'not found; the base URL path or the models path is probably wrong';
  } else if (status === 400 || status === 409 || status === 422) {
    kind = 'bad_request';
    what = 'the vendor rejected the request as invalid';
  } else if (status === 402) {
    // DeepSeek answers an empty balance with 402
    kind = 'quota';
    what = 'payment is required: the account is out of credit, and waiting will not cure it';
  } else if (status === 429) {
    if (OUT_OF_CREDIT.test(full)) {
      kind = 'quota';
      what = 'rate-limit status, but the body says the account is out of credit or over its quota; waiting will not cure it';
    } else {
      kind = 'rate_limit';
      what = 'rate limited';
    }
  } else if (status >= 500) {
    kind = 'server';
    what = "the vendor's server failed";
  } else {
    kind = 'bad_request';
    what = 'an unexpected status';
  }
  const hint = kind === 'rate_limit' || kind === 'server' ? waitHint(ex.headers, full) : undefined;
  return new ProviderError(kind, ctx.provider, `${ctx.provider} answered ${status} (${what})${shown ? `. The vendor said: ${shown}` : '. The vendor sent no text.'}`, { status, body: shown, retryAfterMs: hint });
}

function authHeaders(ctx: Ctx): Record<string, string> {
  return { authorization: `Bearer ${ctx.key}`, 'user-agent': 'living-world-model-relay' };
}

/**
 * One chat completion. Retries are inside: a rate limit, a server error or a dropped connection up to cfg.limits.attempts times
 * in all, a clock expiry or a blank answer once, and nothing else. The reply is returned only when the vendor said "stop" (and,
 * for a streamed answer where [DONE] is required, sent [DONE]); a cut-off answer is an error, never a shorter reply.
 */
export async function chat(cfg: RelayConfig, req: ChatRequest, deps?: Partial<CallDeps>): Promise<ChatReply> {
  const d = resolveDeps(deps);
  const role = cfg.roles[req.role];
  if (!role) throw new Error(`the relay has no role called ${String(req.role)}`);
  const ctx = prepare(cfg, role.provider, d);
  const body = buildBody(cfg, req);
  const streaming = body.stream === true;
  const payload = JSON.stringify(body);
  const url = endpoint(ctx.pc.baseUrl, '/chat/completions');
  const started = d.now();

  const once = async (): Promise<{ parsed: Parsed; status: number }> => {
    const reader = streaming ? new StreamReader(ctx.provider) : undefined;
    const ex = await exchange({
      provider: ctx.provider,
      url,
      method: 'POST',
      headers: {
        ...authHeaders(ctx),
        'content-type': 'application/json',
        accept: streaming ? 'text/event-stream' : 'application/json',
        'content-length': String(Buffer.byteLength(payload)),
      },
      payload,
      clocks: cfg.clocks,
      timers: d.timers,
      sink: reader ? (chunk) => reader.feed(chunk) : undefined,
    });
    if (ex.status < 200 || ex.status >= 300) throw httpFailure(ctx, ex, role.model, req.role);
    let parsed: Parsed;
    if (reader) {
      reader.end();
      parsed = reader.result();
    } else {
      parsed = parseWhole(ctx.provider, ex.body);
    }
    const seen = (): string => `${parsed.finish ? `finish_reason "${parsed.finish}"` : 'no finish_reason'}, ${streaming ? (parsed.done ? '[DONE] seen' : 'no [DONE]') : 'whole body'}, ${parsed.text.length} characters of text`;
    const stray = reader && reader.strayText() ? ` The body held text that was not server-sent events: ${reader.strayText()}` : '';
    // completion is a positive test: only "stop" is a finished answer
    if (parsed.finish === 'length') {
      throw new ProviderError('truncated', ctx.provider, `the answer was cut off: it hit the output cap of ${role.maxOutputTokens} tokens (finish_reason "length"); raise roles.${req.role}.maxOutputTokens or ask for less`, { status: ex.status });
    }
    if (parsed.finish !== 'stop') {
      throw new ProviderError('truncated', ctx.provider, `the answer did not finish properly: ${seen()}, where "stop" was expected.${stray}`, { status: ex.status });
    }
    if (streaming && ctx.pc.requireDone && !parsed.done) {
      throw new ProviderError('truncated', ctx.provider, `the stream ended without the [DONE] line (${seen()}), so the answer may be incomplete`, { status: ex.status });
    }
    if (!parsed.text.trim()) {
      throw new ProviderError('blank', ctx.provider, `the vendor finished with "stop" but the answer was empty (${seen()})`, { status: ex.status });
    }
    return { parsed, status: ex.status };
  };

  const { value, attempts } = await withRetries(ctx, once);
  const { parsed, status } = value;
  return {
    text: parsed.text,
    // vendors reroute retired model names silently, so the echoed name is the one that ran
    model: parsed.model || role.model,
    finish: parsed.finish ?? 'stop',
    ...(parsed.usage ? { usage: parsed.usage } : {}),
    attempts,
    ms: d.now() - started,
    status,
  };
}

/** The model ids a provider's key can reach: GET baseUrl + modelsPath, ids from data[].id, or models[].id when there is no data array. */
export async function listModels(cfg: RelayConfig, provider: ProviderName, deps?: Partial<CallDeps>): Promise<string[]> {
  const d = resolveDeps(deps);
  const ctx = prepare(cfg, provider, d);
  const url = endpoint(ctx.pc.baseUrl, ctx.pc.modelsPath);

  const once = async (): Promise<string[]> => {
    const ex = await exchange({
      provider,
      url,
      method: 'GET',
      headers: { ...authHeaders(ctx), accept: 'application/json' },
      clocks: cfg.clocks,
      timers: d.timers,
    });
    if (ex.status < 200 || ex.status >= 300) throw httpFailure(ctx, ex);
    let json: unknown;
    try {
      json = JSON.parse(ex.body.trim());
    } catch {
      throw new ProviderError('server', provider, `the model list was not JSON: ${shorten(plain(ex.body.trim()), 200)}`, { status: ex.status });
    }
    const list = isObject(json) ? (Array.isArray(json.data) ? json.data : Array.isArray(json.models) ? json.models : undefined) : undefined;
    if (!list) throw new ProviderError('server', provider, `the model list had neither a "data" nor a "models" array: ${shorten(plain(ex.body.trim()), 200)}`, { status: ex.status });
    return list.flatMap((m: unknown) => (isObject(m) && typeof m.id === 'string' && m.id ? [m.id] : []));
  };

  return (await withRetries(ctx, once)).value;
}
