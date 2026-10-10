// A model is anything that answers a prompt with text. The simulation never sees one; the runner (run.ts) calls it between ticks
// through the gate below, which enforces the budget: calls per simulated day, prompt size, answer size, time per call, and how many
// failures in a row before the model is given up on for the rest of the run. Every refusal is a reason the transcript records.
//
// Nothing in src/agent talks to the network. A real client (the Anthropic SDK) lives in scripts/inhabit/; tests use stubModel.

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
  kind: 'stub' | 'api';
  /** configuration worth recording (temperature, effort, …); never secrets */
  config: Record<string, unknown>;
  complete(req: ModelRequest, signal: AbortSignal): Promise<ModelReply>;
}

export interface Budget {
  /** model calls allowed per simulated day (a day is 2400 ticks); decisions beyond it fall to the engine */
  maxCallsPerDay: number;
  /** longest prompt (system + user, in characters) that is sent at all */
  maxInputChars: number;
  /** answer size asked of the model */
  maxOutputTokens: number;
  /** wall-clock time per call */
  timeoutMs: number;
  /** after this many failed calls in a row the model is not called again in this run */
  maxConsecutiveFailures: number;
}

export const DEFAULT_BUDGET: Readonly<Budget> = Object.freeze({
  maxCallsPerDay: 400,
  maxInputChars: 120_000,
  maxOutputTokens: 8_000,
  timeoutMs: 60_000,
  maxConsecutiveFailures: 5,
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

export type GateResult = { ok: true; reply: ModelReply; latencyMs: number } | { ok: false; reason: string; latencyMs: number };

/** Applies the budget to a client. One per run; its counters are part of the run's record. */
export class ModelGate {
  calls = 0;
  failures = 0;
  consecutiveFailures = 0;
  refused = 0;
  inputChars = 0;
  outputTokens = 0;
  /** calls made per simulated day */
  callsByDay: Record<number, number> = {};
  /** set once the model is given up on, with why */
  givenUp: string | null = null;

  constructor(
    readonly client: ModelClient,
    readonly budget: Budget = DEFAULT_BUDGET,
  ) {}

  /** `day` is the simulated day the decision falls in (for the per-day cap) */
  async call(req: Omit<ModelRequest, 'maxOutputTokens'>, day: number): Promise<GateResult> {
    const t0 = Date.now();
    if (this.givenUp) return this.refuse(`model given up on: ${this.givenUp}`, t0);
    const today = this.callsByDay[day] ?? 0;
    if (today >= this.budget.maxCallsPerDay) return this.refuse(`budget: ${this.budget.maxCallsPerDay} calls already made on day ${day}`, t0);
    const size = req.system.length + req.user.length;
    if (size > this.budget.maxInputChars) return this.refuse(`budget: prompt of ${size} characters exceeds ${this.budget.maxInputChars}`, t0);
    this.callsByDay[day] = today + 1;
    this.calls++;
    this.inputChars += size;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error(`timed out after ${this.budget.timeoutMs} ms`)), this.budget.timeoutMs);
    try {
      const reply = await Promise.race([
        this.client.complete({ ...req, maxOutputTokens: this.budget.maxOutputTokens }, ctrl.signal),
        new Promise<never>((_, reject) => ctrl.signal.addEventListener('abort', () => reject(ctrl.signal.reason instanceof Error ? ctrl.signal.reason : new Error('aborted')))),
      ]);
      if (typeof reply.text !== 'string') throw new Error('the model returned no text');
      this.consecutiveFailures = 0;
      if (reply.usage) this.outputTokens += reply.usage.output;
      return { ok: true, reply, latencyMs: Date.now() - t0 };
    } catch (e) {
      this.failures++;
      this.consecutiveFailures++;
      const msg = e instanceof Error ? e.message : String(e);
      if (this.consecutiveFailures >= this.budget.maxConsecutiveFailures) this.givenUp = `${this.consecutiveFailures} failures in a row (last: ${msg})`;
      return { ok: false, reason: `model call failed: ${msg}`, latencyMs: Date.now() - t0 };
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
    return { ok: false, reason, latencyMs: Date.now() - t0 };
  }

  summary(): Record<string, number | string | null> {
    return { calls: this.calls, failures: this.failures, refused: this.refused, inputChars: this.inputChars, outputTokens: this.outputTokens, givenUp: this.givenUp };
  }
}
