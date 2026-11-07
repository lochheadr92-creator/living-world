// The dev server's model endpoint answers only its own page, checks what it is asked for, never dies on a bad request, stops the
// upstream call when the caller goes away, and has a cap per launch (scripts/inhabit/devserver.ts). The gate refuses a budget that
// would switch a cap off and retries one call a bounded number of times (src/agent/model.ts); the counterfactual run has a whole-run
// cap (src/agent/counterfactual.ts).
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { counterfactual } from '../src/agent/counterfactual';
import { DEFAULT_BUDGET, MAX_RETRIES_PER_CALL, ModelGate, RetryableModelError, type ModelClient } from '../src/agent/model';
import { stubModel } from '../src/agent/model';
import type { Transcript } from '../src/agent/transcript';
import { modelEndpoint, type ModelEndpointOptions } from '../scripts/inhabit/devserver';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))));
});

interface Fake {
  calls: number;
  signals: AbortSignal[];
  clientFor: NonNullable<ModelEndpointOptions['clientFor']>;
}
function fake(answer: (signal: AbortSignal) => Promise<string> = async () => '{"choose":"wander"}'): Fake {
  const f: Fake = {
    calls: 0,
    signals: [],
    clientFor: async () =>
      ({
        id: 'fake',
        kind: 'stub',
        config: {},
        complete: async (_req, signal) => {
          f.calls++;
          f.signals.push(signal);
          return { text: await answer(signal) };
        },
      }) satisfies ModelClient,
  };
  return f;
}

async function serve(opts: ModelEndpointOptions): Promise<string> {
  const handler = modelEndpoint(opts);
  const s = createServer((req, res) => handler(req, res));
  servers.push(s);
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', () => r()));
  return `http://127.0.0.1:${(s.address() as AddressInfo).port}/`;
}

const good = { api: 'openai', model: 'gpt-5', system: 's', user: 'u', maxOutputTokens: 8000 };
const post = (url: string, body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }, signal?: AbortSignal) =>
  fetch(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body), signal });

describe('the dev server endpoint', () => {
  it('answers its own page', async () => {
    const f = fake();
    const url = await serve({ clientFor: f.clientFor });
    const res = await post(url, good, { 'content-type': 'application/json', origin: url.replace(/\/$/, ''), 'sec-fetch-site': 'same-origin' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { text: string }).text).toContain('wander');
    expect(f.calls).toBe(1);
  });

  it('refuses another site, and a body that is not JSON, without calling the model', async () => {
    const f = fake();
    const url = await serve({ clientFor: f.clientFor });
    expect((await post(url, good, { 'content-type': 'application/json', origin: 'http://evil.example' })).status).toBe(403);
    expect((await post(url, good, { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    // what a cross-site form or a no-cors fetch can send without a preflight
    expect((await post(url, JSON.stringify(good), { 'content-type': 'text/plain' })).status).toBe(415);
    expect(f.calls).toBe(0);
  });

  it('a null body or an array is a 400, and the server is still there afterwards', async () => {
    const f = fake();
    const url = await serve({ clientFor: f.clientFor });
    expect((await post(url, 'null')).status).toBe(400);
    expect((await post(url, '[]')).status).toBe(400);
    expect((await post(url, '{not json')).status).toBe(400);
    expect((await post(url, good)).status).toBe(200);
  });

  it('checks the api, model id, effort and answer size', async () => {
    const f = fake();
    const url = await serve({ clientFor: f.clientFor, models: ['gpt-5', 'claude-opus-5-5'] });
    expect((await post(url, { ...good, api: 'elsewhere' })).status).toBe(400);
    expect((await post(url, { ...good, model: 'gpt-5; rm -rf' })).status).toBe(400);
    expect((await post(url, { ...good, model: 'gpt-5-pro' })).status).toBe(403); // not in INHABIT_MODELS
    expect((await post(url, { ...good, effort: 'ultra' })).status).toBe(400);
    expect((await post(url, { ...good, api: 'anthropic', model: 'claude-opus-5-5', effort: 'xhigh' })).status).toBe(400);
    expect((await post(url, { ...good, maxOutputTokens: 1e9 })).status).toBe(400);
    expect((await post(url, { ...good, maxOutputTokens: 'lots' })).status).toBe(400);
    expect(f.calls).toBe(0);
    expect((await post(url, { ...good, api: 'anthropic', model: 'claude-opus-5-5', effort: 'high' })).status).toBe(200);
  });

  it('stops the upstream call when the caller goes away', async () => {
    const f = fake((signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
    const url = await serve({ clientFor: f.clientFor });
    const ac = new AbortController();
    const pending = post(url, good, { 'content-type': 'application/json' }, ac.signal).catch(() => null);
    for (let i = 0; i < 100 && f.signals.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
    expect(f.signals.length).toBe(1);
    expect(f.signals[0]!.aborted).toBe(false);
    ac.abort();
    await pending;
    for (let i = 0; i < 100 && !f.signals[0]!.aborted; i++) await new Promise((r) => setTimeout(r, 10));
    expect(f.signals[0]!.aborted).toBe(true);
  });

  it('makes at most maxCalls upstream calls in one launch', async () => {
    const f = fake();
    const url = await serve({ clientFor: f.clientFor, maxCalls: 2 });
    expect((await post(url, good)).status).toBe(200);
    expect((await post(url, good)).status).toBe(200);
    const third = await post(url, good);
    expect(third.status).toBe(429);
    expect(((await third.json()) as { retryable?: boolean }).retryable).toBeUndefined(); // not something the gate should wait out
    expect(f.calls).toBe(2);
  });
});

describe('the gate and the counterfactual run cannot be told to spend without limit', () => {
  it('a budget value that is not a number (a flag such as 50k) is refused before any call', () => {
    const c = stubModel('s', () => '{}');
    for (const bad of [{ maxCallsPerDay: Number('50k') }, { maxCallsPerDay: Infinity }, { timeoutMs: Number.NaN }, { maxOutputTokens: -1 }, { probeEvery: 0 }, { maxRetryMs: Number.NaN }])
      expect(() => new ModelGate(c, { ...DEFAULT_BUDGET, ...bad }), JSON.stringify(bad)).toThrow(/budget: /);
    expect(() => new ModelGate(c, { ...DEFAULT_BUDGET, maxCallsPerDay: 0, maxRetryMs: 0 })).not.toThrow();
  });

  it('a provider naming a tiny wait cannot turn one call into thousands of requests', async () => {
    let calls = 0;
    const m: ModelClient = {
      id: 'limited',
      kind: 'stub',
      config: {},
      complete: async () => {
        calls++;
        throw new RetryableModelError('rate limited (429)', 1);
      },
    };
    const gate = new ModelGate(m, { ...DEFAULT_BUDGET, maxRetryMs: 10_000 }, { sleep: async () => {} });
    const r = await gate.call({ system: 's', user: 'u' }, 0);
    expect(r.ok).toBe(false);
    expect(r.retries).toBe(MAX_RETRIES_PER_CALL);
    expect(calls).toBe(MAX_RETRIES_PER_CALL + 1);
  });

  it('a counterfactual run that would pass its call cap, or whose repeat count is not a number, is refused before the first call', async () => {
    const ask = { seq: 0, tick: 0, observation: { options: [{ key: 'wander' }] }, prompt: { system: 's', user: 'u' } };
    const t = { asks: [ask, ask, ask] } as unknown as Transcript;
    let calls = 0;
    const m = stubModel('count', () => {
      calls++;
      return '{"choose":"wander"}';
    });
    await expect(counterfactual(t, [0, 1, 2], m, { repeats: 400, both: false, maxCalls: 300 })).rejects.toThrow(/1200 model calls, more than the cap of 300/);
    await expect(counterfactual(t, [0], m, { repeats: Number('3x') })).rejects.toThrow(/repeats must be a number/);
    await expect(counterfactual(t, [0], m, { repeats: 1, maxCalls: Number.NaN })).rejects.toThrow(/call cap/);
    expect(calls).toBe(0);
  });
});
