// The model gate's two kinds of failure (src/agent/model.ts): the provider's refusal for the moment is waited out and never counted
// against the model; the model's own failures trip the breaker, which stays half-open so the run notices when the trouble ends.
import { describe, expect, it } from 'vitest';
import { DEFAULT_BUDGET, ModelGate, RetryableModelError, isRetryable } from '../src/agent/model';
import type { ModelClient } from '../src/agent/model';
import { parseDuration, retryAfterMs } from '../scripts/inhabit/transient';
import OpenAI from 'openai';
import { describeError } from '../scripts/inhabit/openai';

const req = { system: 'x', user: '<observation>\n{"options":[{"key":"wander"}]}\n</observation>' };

function fakeSleep(): { sleep: (ms: number) => Promise<void>; waits: number[] } {
  const waits: number[] = [];
  return {
    waits,
    sleep: async (ms) => {
      waits.push(ms);
    },
  };
}

/** a client whose answers are scripted: a string is a reply, an Error is thrown; the last step repeats */
function scripted(steps: (string | Error)[]): ModelClient & { calls: number } {
  const c = {
    id: 'scripted',
    kind: 'stub' as const,
    config: {},
    calls: 0,
    async complete() {
      const s = steps[Math.min(c.calls, steps.length - 1)]!;
      c.calls++;
      if (s instanceof Error) throw s;
      return { text: s };
    },
  };
  return c;
}

const limited = (ms?: number) => new RetryableModelError('rate limited (429)', ms);

describe("the model gate and the provider's refusals", () => {
  it('waits out a rate limit for the time the provider asks; the call counts once and succeeds', async () => {
    const m = scripted([limited(10), limited(25), '{"choose":"wander"}']);
    const { sleep, waits } = fakeSleep();
    const gate = new ModelGate(m, DEFAULT_BUDGET, { sleep });
    const r = await gate.call(req, 0);
    expect(r.ok).toBe(true);
    expect(r.retries).toBe(2);
    expect(waits).toEqual([10, 25]);
    expect(m.calls).toBe(3);
    expect(gate.calls).toBe(1);
    expect(gate.callsByDay[0]).toBe(1);
    expect(gate.failures).toBe(0);
    expect(gate.consecutiveFailures).toBe(0);
    expect(gate.retries).toBe(2);
    expect(gate.givenUp).toBeNull();
  });

  it('backs off on its own when the provider names no wait: 2 s, 4 s, 8 s, up to a minute', async () => {
    const m = scripted([limited(), limited(), limited(), '{"choose":"wander"}']);
    const { sleep, waits } = fakeSleep();
    const gate = new ModelGate(m, DEFAULT_BUDGET, { sleep });
    expect((await gate.call(req, 0)).ok).toBe(true);
    expect(waits).toEqual([2000, 4000, 8000]);
    const many = scripted([limited(), limited(), limited(), limited(), limited(), limited(), limited(), '{"choose":"wander"}']);
    const f = fakeSleep();
    expect((await new ModelGate(many, { ...DEFAULT_BUDGET, maxRetryMs: 10 * 60_000 }, f).call(req, 0)).ok).toBe(true);
    expect(f.waits).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  });

  it('a wait beyond the retry budget is not taken: the call fails once, with the retries on record, and counts toward the breaker', async () => {
    const m = scripted([limited(10)]);
    const { sleep, waits } = fakeSleep();
    const gate = new ModelGate(m, { ...DEFAULT_BUDGET, maxRetryMs: 25 }, { sleep });
    const r = await gate.call(req, 0);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/rate limited \(429\) \(after 2 retries over 0 s\)/);
    expect(r.retries).toBe(2);
    expect(waits).toEqual([10, 10]);
    expect(m.calls).toBe(3);
    expect(gate.failures).toBe(1);
    expect(gate.consecutiveFailures).toBe(1);
    expect(gate.retries).toBe(2);
    // a provider asking for longer than the whole budget is not waited for at all
    const long = scripted([limited(6 * 3_600_000)]);
    const f = fakeSleep();
    const r2 = await new ModelGate(long, { ...DEFAULT_BUDGET, maxRetryMs: 1000 }, f).call(req, 0);
    expect(r2.ok).toBe(false);
    expect(r2.retries).toBe(0);
    expect(f.waits).toEqual([]);
    expect(long.calls).toBe(1);
  });

  it("a plain failure is the model's: never retried, counted at once; a success afterwards clears the streak", async () => {
    const m = scripted([new Error('boom'), '{"choose":"wander"}']);
    const { sleep, waits } = fakeSleep();
    const gate = new ModelGate(m, DEFAULT_BUDGET, { sleep });
    const r = await gate.call(req, 0);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('model call failed: boom');
    expect(r.retries).toBe(0);
    expect(waits).toEqual([]);
    expect(gate.failures).toBe(1);
    expect(gate.retries).toBe(0);
    expect((await gate.call(req, 0)).ok).toBe(true);
    expect(gate.consecutiveFailures).toBe(0);
  });

  it('the breaker is half-open: given up, every probeEvery-th ask is tried anyway, and one success puts the model back', async () => {
    const m = scripted([new Error('boom'), new Error('boom'), '{"choose":"wander"}']);
    const gate = new ModelGate(m, { ...DEFAULT_BUDGET, maxConsecutiveFailures: 2, probeEvery: 3 }, fakeSleep());
    expect((await gate.call(req, 0)).ok).toBe(false);
    expect((await gate.call(req, 0)).ok).toBe(false);
    expect(gate.givenUp).toMatch(/2 failures in a row/);
    for (let i = 0; i < 2; i++) {
      const r = await gate.call(req, 0);
      expect(!r.ok && r.reason).toMatch(/given up/);
    }
    expect(m.calls).toBe(2);
    expect(gate.refused).toBe(2);
    const probe = await gate.call(req, 0);
    expect(probe.ok).toBe(true);
    expect(m.calls).toBe(3);
    expect(gate.givenUp).toBeNull();
    expect(gate.consecutiveFailures).toBe(0);
    expect((await gate.call(req, 0)).ok).toBe(true);
    expect(m.calls).toBe(4);
    expect(gate.refused).toBe(2);
    expect(gate.summary()).toMatchObject({ calls: 4, failures: 2, refused: 2, retries: 0, givenUp: null });
  });

  it('a failed probe leaves the model given up on, with the fresh reason, and the next probe is another probeEvery asks away', async () => {
    const m = scripted([new Error('boom')]);
    const gate = new ModelGate(m, { ...DEFAULT_BUDGET, maxConsecutiveFailures: 1, probeEvery: 2 }, fakeSleep());
    expect((await gate.call(req, 0)).ok).toBe(false);
    expect(!(await gate.call(req, 0)).ok).toBe(true);
    expect(m.calls).toBe(1);
    const probe = await gate.call(req, 0);
    expect(!probe.ok && probe.reason).toBe('model call failed: boom');
    expect(m.calls).toBe(2);
    expect(gate.givenUp).toMatch(/2 failures in a row/);
    expect(!(await gate.call(req, 0)).ok).toBe(true);
    expect(m.calls).toBe(2);
    expect(gate.refused).toBe(2);
  });

  it('a retryable error is known by class or by name, since the page and the dev server may hold different copies of the class', () => {
    expect(isRetryable(new RetryableModelError('x'))).toBe(true);
    const other = new Error('x');
    other.name = 'RetryableModelError';
    expect(isRetryable(other)).toBe(true);
    expect(isRetryable(new Error('x'))).toBe(false);
    expect(isRetryable('x')).toBe(false);
  });
});

describe("the OpenAI client's reading of a 429", () => {
  it('a rate limit is retryable; an exhausted account is not, whatever the status code says', () => {
    // the SDK builds the message from the error body, which is where OpenAI puts the "try again in" hint
    const limited = new OpenAI.RateLimitError(429, { message: 'Rate limit reached for gpt-5. Please try again in 8.4s.', code: 'rate_limit_exceeded' }, undefined, new Headers());
    const r = describeError(limited);
    expect(isRetryable(r)).toBe(true);
    expect((r as RetryableModelError).retryAfterMs).toBe(8400);
    const broke = new OpenAI.RateLimitError(429, { message: 'You have no credits remaining', code: 'insufficient_quota' }, 'You have no credits remaining. Add credits to continue using the API.', new Headers());
    const b = describeError(broke);
    expect(isRetryable(b)).toBe(false);
    expect(b.message).toMatch(/no credits on the account/);
    expect(isRetryable(describeError(new Error('boom')))).toBe(false);
  });
});

describe("the wait a provider names", () => {
  it('reads durations the way OpenAI writes them', () => {
    expect(parseDuration('1.234s')).toBe(1234);
    expect(parseDuration('20ms')).toBe(20);
    expect(parseDuration('6m0s')).toBe(360_000);
    expect(parseDuration('1h2m3s')).toBe(3_723_000);
    expect(parseDuration('soon')).toBeUndefined();
  });

  it('prefers the Retry-After header, in seconds or as a date, and falls back to the message', () => {
    expect(retryAfterMs({ headers: new Headers({ 'retry-after': '3' }), message: 'try again in 1s' })).toBe(3000);
    const at = retryAfterMs({ headers: new Headers({ 'retry-after': new Date(Date.now() + 90_000).toUTCString() }) });
    expect(at).toBeGreaterThan(80_000);
    expect(at).toBeLessThanOrEqual(90_000);
    expect(retryAfterMs({ headers: { 'retry-after': '2' } })).toBe(2000);
    expect(retryAfterMs({ message: 'Rate limit reached for gpt-5 on tokens per min (TPM): Limit 30000, Used 29500, Requested 6000. Please try again in 8.4s. Visit the docs.' })).toBe(8400);
    expect(retryAfterMs({ message: 'Please try again in 6m0s.' })).toBe(360_000);
    expect(retryAfterMs({ message: 'something else' })).toBeUndefined();
    expect(retryAfterMs({})).toBeUndefined();
  });
});
