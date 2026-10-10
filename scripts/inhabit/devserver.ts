// A Vite dev-server endpoint that lets the app reach a model without the key ever entering the browser: the page POSTs the prompt
// to /__inhabit/model, this middleware calls the SDK client (the same ones scripts/inhabit.ts uses) with the key from the shell that
// started `npm run dev`, and returns the answer. Only in `vite` (serve), never in a build.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

interface ModelRequestBody {
  api?: string;
  model?: string;
  effort?: string;
  system?: string;
  user?: string;
  maxOutputTokens?: number;
}

function readJson(req: IncomingMessage, limit = 4_000_000): Promise<ModelRequestBody> {
  return new Promise((resolve, reject) => {
    let text = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      text += chunk;
      if (text.length > limit) {
        reject(new Error('request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(text) as ModelRequestBody);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function inhabitDevServer(): Plugin {
  return {
    name: 'living-world-inhabit-model',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__inhabit/model', (req, res) => {
        void (async () => {
          if (req.method !== 'POST') {
            send(res, 405, { error: 'POST a prompt here' });
            return;
          }
          let body: ModelRequestBody;
          try {
            body = await readJson(req);
          } catch (e) {
            send(res, 400, { error: e instanceof Error ? e.message : String(e) });
            return;
          }
          if (typeof body.system !== 'string' || typeof body.user !== 'string' || typeof body.model !== 'string') {
            send(res, 400, { error: 'system, user and model are required' });
            return;
          }
          const ac = new AbortController();
          req.on('close', () => ac.abort());
          try {
            const client =
              body.api === 'anthropic'
                ? (await import('./anthropic')).anthropicModel({ model: body.model, effort: (body.effort as 'low' | 'medium' | 'high') || 'medium' })
                : (await import('./openai')).openaiModel({ model: body.model, ...(body.effort ? { effort: body.effort as 'low' | 'medium' | 'high' } : {}) });
            const reply = await client.complete({ system: body.system, user: body.user, maxOutputTokens: Number(body.maxOutputTokens) || 8000 }, ac.signal);
            send(res, 200, reply);
          } catch (e) {
            send(res, 502, { error: e instanceof Error ? e.message : String(e) });
          }
        })();
      });
    },
  };
}
