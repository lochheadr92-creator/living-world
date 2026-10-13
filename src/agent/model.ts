// A model is anything that answers a prompt with text. The simulation never sees one; the runner (run.ts) calls it between ticks
// through the gate below, which enforces the budget: calls per simulated day, prompt size, answer size, time per call, and how many
// failures in a row before the model is given up on. Every refusal is a reason the transcript records.
//
// Two kinds of failure are told apart. A failed call is the model's: no text, not the JSON asked for, a decline, a cut-off answer, a
// timeout; it counts toward the breaker. A RetryableModelError is the provider's: a rate limit, an outage, a dropped connection; the
// gate waits it out with backoff inside one call's retry budget (honouring the wait the provider names) and counts nothing against the
// model unless that budget runs out. The breaker is half-open: once the model is given up on, every probeEvery-th ask is tried anyway,
// and one success puts the model back in play, so a rate limit that lasted minutes does not turn the rest of a long run into an
// engine run. Retries happen outside the transcript: a replay sees only the answer that was finally used, or the reason there was none.
//
// Nothing in src/agent talks to the network. The real clients (the Anthropic and OpenAI SDKs) live in scripts/inhabit/; tests use
// stubModel.

export interface ModelRequest {
  system: string;
  user: string;
  maxOutputTokens: number;
}

export interface ModelReply {
  text: string;
  usage?: { input: number; output: number };
  /** why the model stopped, in the provider's own word, when it says */
  stop?: string;
}

export interface ModelClient {
  /** what the transcript records as the model's identity */
  id: string;
  kind: 'stub' | 'api' | 'manual';
  /** configuration worth recording (temperature, effort, …); never secrets */
  config: Record<string, unknown>;
  complete(req: ModelRequest, signal: AbortSignal): Promise<ModelReply>;
}

/** A failure that is the provider's for the moment, not the model's: the gate retries it and does not count it against the model. */
export class RetryableModelError extends Error {
  constructor(
    message: string,
    /** the wait the provider asked for, when it said */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'RetryableModelError';
  }
}

/** by class or by name: the dev server and the page may hold the class from different module instances */
export function isRetryable(e: unknown): e is RetryableModelError {
  return e instanceof RetryableModelError || (e instanceof Error && e.name === 'RetryableModelError');
}

export interface Budget {
  /** model calls allowed per simulated day (a day is 2400 ticks); decisions beyond it fall to the engine */
  maxCallsPerDay: number;
  /** longest prompt (system + user, in characters) that is sent at all */
  maxInputChars: number;
  /** answer size asked of the model */
  maxOutputTokens: number;
  /** wall-clock time per attempt */
  timeoutMs: number;
  /** after this many failed calls in a row the model is given up on (until a probe succeeds, see probeEvery) */
  maxConsecutiveFailures: number;
  /** wall-clock time one call may spend waiting out the provider's refusals (rate limits, outages) before it counts as failed */
  maxRetryMs: number;
  /** once the model is given up on, every this-many refused asks one is tried anyway; a success puts the model back in play */
  probeEvery: number;
}

export const DEFAULT_BUDGET: Readonly<Budget> = Object.freeze({
  maxCallsPerDay: 400,
  maxInputChars: 120_000,
  maxOutputTokens: 8_000,
  timeoutMs: 60_000,
  maxConsecutiveFailures: 5,
  maxRetryMs: 300_000,
  probeEvery: 10,
});

/** a scripted model for tests and smoke runs: deterministic, no network */
export function stubModel(id: string, answer: (req: ModelRequest, call: number) => string | Promise<string>, config: Record<string, unknown> = {}): ModelClient {
  let n = 0;
  return {
    id,
    kind: 'stub',
    config,
    async complete(req) {
      return { text: await answer(req, n++) };
    },
  };
}

export type GateResult = { ok: true; reply: ModelReply; latencyMs: number; retries: number } | { ok: false; reason: string; latencyMs: number; retries: number };

/** what tests swap out: the gate's waiting and its clock */
export interface GateDeps {
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** the backoff when the provider names no wait: 2 s, 4 s, 8 s, … up to a minute */
function defaultWait(retries: number): number {
  return Math.min(60_000, 2_000 * 2 ** retries);
}

/** Applies the budget to a client. One per run; its counters are part of the run's record. */
export class ModelGate {
  calls = 0;
  failures = 0;
  consecutiveFailures = 0;
  refused = 0;
  inputChars = 0;
  outputTokens = 0;
  /** attempts repeated after the provider refused for the moment (rate limits, outages); these are not failures */
  retries = 0;
  /** calls made per simulated day */
  callsByDay: Record<number, number> = {};
  /** set while the model is given up on, with why; cleared by a successful probe */
  givenUp: string | null = null;
  private refusedSinceGivenUp = 0;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(
    readonly client: ModelClient,
    readonly budget: Budget = DEFAULT_BUDGET,
    deps: GateDeps = {},
  ) {
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = deps.now ?? (() => Date.now());
  }

  /** `day` is the simulated day the decision falls in (for the per-day cap) */
  async call(req: Omit<ModelRequest, 'maxOutputTokens'>, day: number): Promise<GateResult> {
    const t0 = this.now();
    if (this.givenUp) {
      // half-open: every probeEvery-th ask is tried anyway, so the run notices when the trouble is over
      this.refusedSinceGivenUp++;
      if (this.refusedSinceGivenUp % this.budget.probeEvery !== 0) return this.refuse(`model given up on: ${this.givenUp}`, t0);
    }
    const today = this.callsByDay[day] ?? 0;
    if (today >= this.budget.maxCallsPerDay) return this.refuse(`budget: ${this.budget.maxCallsPerDay} calls already made on day ${day}`, t0);
    const size = req.system.length + req.user.length;
    if (size > this.budget.maxInputChars) return this.refuse(`budget: prompt of ${size} characters exceeds ${this.budget.maxInputChars}`, t0);
    this.callsByDay[day] = today + 1;
    this.calls++;
    this.inputChars += size;
    let retries = 0;
    let waited = 0;
    for (;;) {
      try {
        const reply = await this.attempt(req);
        this.consecutiveFailures = 0;
        if (this.givenUp) {
          this.givenUp = null;
          this.refusedSinceGivenUp = 0;
        }
        if (reply.usage) this.outputTokens += reply.usage.output;
        return { ok: true, reply, latencyMs: this.now() - t0, retries };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isRetryable(e)) {
          const wait = e.retryAfterMs !== undefined && e.retryAfterMs > 0 ? e.retryAfterMs : defaultWait(retries);
          if (waited + wait <= this.budget.maxRetryMs) {
            retries++;
            this.retries++;
            await this.sleep(wait);
            waited += wait;
            continue;
          }
        }
        // the model's failure, or the provider's that outlasted the retry budget: counted, and the breaker may trip
        this.failures++;
        this.consecutiveFailures++;
        const detail = retries ? `${msg} (after ${retries} ${retries === 1 ? 'retry' : 'retries'} over ${Math.round(waited / 1000)} s)` : msg;
        if (this.consecutiveFailures >= this.budget.maxConsecutiveFailures) this.givenUp = `${this.consecutiveFailures} failures in a row (last: ${detail})`;
        return { ok: false, reason: `model call failed: ${detail}`, latencyMs: this.now() - t0, retries };
      }
    }
  }

  /** one attempt under the per-attempt timeout */
  private async attempt(req: Omit<ModelRequest, 'maxOutputTokens'>): Promise<ModelReply> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error(`timed out after ${this.budget.timeoutMs} ms`)), this.budget.timeoutMs);
    try {
      const reply = await Promise.race([
        this.client.complete({ ...req, maxOutputTokens: this.budget.maxOutputTokens }, ctrl.signal),
        new Promise<never>((_, reject) => ctrl.signal.addEventListener('abort', () => reject(ctrl.signal.reason instanceof Error ? ctrl.signal.reason : new Error('aborted')))),
      ]);
      if (typeof reply.text !== 'string') throw new Error('the model returned no text');
      return reply;
    } finally {
      clearTimeout(timer);
    }
  }

  /** an answer that came back but could not be used (not the JSON asked for) counts as a failure for the breaker */
  markUnusable(problem: string): void {
    this.failures++;
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.budget.maxConsecutiveFailures) this.givenUp = `${this.consecutiveFailures} failures in a row (last: ${problem})`;
  }

  private refuse(reason: string, t0: number): GateResult {
    this.refused++;
    return { ok: false, reason, latencyMs: this.now() - t0, retries: 0 };
  }

  summary(): Record<string, number | string | null> {
    return { calls: this.calls, failures: this.failures, refused: this.refused, retries: this.retries, inputChars: this.inputChars, outputTokens: this.outputTokens, givenUp: this.givenUp };
  }
}
