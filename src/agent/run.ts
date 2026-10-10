// Driving a world with one person answered from outside (docs/INHABITANT.md, section 5).
//
// A tick never waits. When the controlled person is about to choose and the controller has no answer, the engine records the
// observation and the person stands for that tick ('defer'). The driver then asks the model, and instead of letting the answer land a
// tick late it REWINDS: the stepped world is thrown away, the last snapshot restored, and the same tick run again with the answer in
// hand, so the choice is applied at the very tick, against the very options, it was asked about. The transcript records the rewind's
// result only; the discarded timeline leaves no trace but the ask itself. A snapshot is taken whenever the person is about to be free
// (cheap) and after every applied choice (bounded re-run otherwise).
//
// LiveSession holds that logic as four calls around a tick (beforeTick, afterTick, answer, rewind) so that a headless loop
// (runLive) and the app's clock (src/app/inhabit.ts) drive it the same way. A replay installs the same controller in replay mode and
// steps the world; the controller supplies each recorded choice at its tick and stops at the first difference. No model is involved.
import { deserializeWorld, serializeWorld } from '../app/save';
import { DAY } from '../sim/constants';
import { setExternalController } from '../sim/external';
import type { Person, World } from '../sim/types';
import { hashWorld, stepWorld } from '../sim/world';
import { LIMITS, MEMORY_VERSION, emptyCounters, emptyNotes, notesForPrompt, notesHash } from './memory';
import { DEFAULT_BUDGET, ModelGate } from './model';
import type { Budget, ModelClient } from './model';
import type { ObserveOptions } from './observe';
import { buildPrompt, parseProposal, protocolFor, protocolHasMemory } from './protocol';
import { TranscriptController, newTranscript, simBehaviourFingerprint, verifyHeader } from './transcript';
import type { Ask, Transcript } from './transcript';

export interface SessionOptions {
  observe?: ObserveOptions;
  budget?: Budget;
  /** keep the inhabitant's own notes between decisions (protocol inhabitant/2); off, the run speaks inhabitant/1 as before */
  memory?: boolean;
  /** a fingerprint of src/sim, when the caller can read the files (scripts do; tests and the app do not) */
  sources?: string;
}

export interface RunOptions extends SessionOptions {
  /** run until this tick */
  until: number;
  /** called after every tick that stands (not after ticks that are rewound) */
  onTick?: (world: World) => void;
}

export interface RunResult {
  world: World;
  transcript: Transcript;
  gate: ModelGate | null;
}

/**
 * Mark a person as driven from outside: the mark is saved with the world and folded into its hash. With `memory`, their notes start
 * empty (and are kept if the mark already carries some). Idempotent.
 */
export function markInhabitant(world: World, personId: number, memory = false): void {
  const p = world.byId.get(personId);
  if (!p || p.ent !== 'person') throw new Error(`no person #${personId}`);
  world.inhabitants ??= {};
  const state = (world.inhabitants[personId] ??= { since: world.tick, turns: 0, fallbacks: 0 });
  if (memory) {
    state.notes ??= emptyNotes();
    state.memory ??= emptyCounters();
  }
}

/** the person, or null once they are dead (the dead leave the world's index) */
export function livingPerson(world: World, id: number): Person | null {
  const p = world.byId.get(id);
  return p && p.ent === 'person' && p.alive ? p : null;
}

/** One live run: the controller, the gate, the snapshots and the bookkeeping, driven a tick at a time by whoever owns the clock. */
export class LiveSession {
  readonly transcript: Transcript;
  readonly ctrl: TranscriptController;
  readonly gate: ModelGate;
  readonly memory: boolean;
  readonly personId: number;
  private snapshot: { text: string; tick: number; calls: number };
  private watching: { call: number; activityId: number; label: string; since: number } | null = null;
  private lastEventTick: number;
  private restore: (() => void) | null;
  died = false;

  constructor(world: World, personId: number, model: ModelClient, opts: SessionOptions = {}) {
    this.memory = opts.memory === true;
    this.personId = personId;
    markInhabitant(world, personId, this.memory);
    const budget = opts.budget ?? DEFAULT_BUDGET;
    this.gate = new ModelGate(model, budget);
    const person = livingPerson(world, personId);
    if (!person) throw new Error(`no living person #${personId}`);
    this.transcript = newTranscript({
      protocol: protocolFor(this.memory),
      mode: 'live',
      seed: world.settings.seed,
      settings: { ...world.settings },
      personId,
      personName: person.name,
      startTick: world.tick,
      startHash: hashWorld(world),
      sim: { behaviour: simBehaviourFingerprint(), ...(opts.sources ? { sources: opts.sources } : {}) },
      model: { id: model.id, kind: model.kind, config: { ...model.config } },
      budget: { ...budget },
      observe: { ...(opts.observe ?? {}) },
      ...(this.memory ? { memory: { version: MEMORY_VERSION, limits: { ...LIMITS } } } : {}),
    });
    this.ctrl = new TranscriptController(this.transcript, 'live');
    this.restore = setExternalController(this.ctrl);
    this.snapshot = { text: serializeWorld(world), tick: world.tick, calls: 0 };
    this.lastEventTick = world.tick - 1;
  }

  private takeSnapshot(world: World): void {
    this.snapshot = { text: serializeWorld(world), tick: world.tick, calls: this.transcript.calls.length };
  }

  /** before a tick: a snapshot when the person is about to be free, so the coming ask's rewind costs one tick. Returns false once the person is dead. */
  beforeTick(world: World): boolean {
    const p = livingPerson(world, this.personId);
    if (!p) {
      this.died = true;
      return false;
    }
    if (!p.activity && world.tick >= p.nextThink && this.snapshot.tick !== world.tick) this.takeSnapshot(world);
    return true;
  }

  /** after a tick: the ask the model must answer, if one opened (the tick must then be rewound once it is answered); else null */
  afterTick(_world: World): Ask | null {
    return this.ctrl.openAsk();
  }

  /** ask the model (through the gate) and keep its answer, or why there is none, on the ask */
  async answer(ask: Ask): Promise<void> {
    const prompt = buildPrompt({ observation: ask.observation, rejected: ask.rejected, notes: ask.notes ? notesForPrompt(ask.notes) : null, memory: this.memory });
    const r = await this.gate.call(prompt, Math.floor(ask.tick / DAY));
    if (!r.ok) {
      ask.model = { ok: false, text: null, reason: r.reason, latencyMs: r.latencyMs };
      ask.problem = r.reason;
      return;
    }
    ask.model = { ok: true, text: r.reply.text, reason: null, latencyMs: r.latencyMs, usage: r.reply.usage };
    const parsed = parseProposal(r.reply.text);
    ask.proposal = parsed.proposal;
    ask.problem = parsed.problem;
    ask.notesProblem = parsed.notesProblem;
    if (parsed.problem) this.gate.markUnusable(parsed.problem);
  }

  /** throw the stepped world away: restore the snapshot and run it forward to the ask's tick (not through it). Returns the world to go on with. */
  rewind(ask: Ask): World {
    const w = deserializeWorld(this.snapshot.text);
    this.ctrl.rewindCalls(this.snapshot.calls);
    while (w.tick < ask.tick) stepWorld(w);
    return w;
  }

  /** the call that last started an activity (to notice a new one) */
  lastApplied(): number {
    return this.ctrl.lastApplied?.seq ?? -1;
  }

  /** after a tick that stands: note a newly applied choice (and snapshot), and what became of the one being watched */
  settle(world: World, appliedBefore: number): void {
    const applied = this.ctrl.lastApplied;
    if (applied && applied.seq !== appliedBefore && applied.result && applied.result.activityId !== undefined) {
      this.watching = { call: applied.seq, activityId: applied.result.activityId, label: applied.result.label ?? '', since: world.tick };
      const events = world.events.filter((e) => e.tick > this.lastEventTick && e.ids.includes(this.personId)).map((e) => ({ tick: e.tick, kind: e.kind, text: e.text }));
      this.lastEventTick = world.tick;
      this.transcript.observer.push({ call: applied.seq, tick: world.tick, events });
      this.takeSnapshot(world);
    }
    if (this.watching) {
      const q = livingPerson(world, this.personId);
      // an activity put aside for a conversation is not over: it resumes afterwards
      const paused = q !== null && q.suspended !== null && q.suspended.id === this.watching.activityId;
      if (!paused && (!q || !q.activity || q.activity.id !== this.watching.activityId)) {
        const r = q ? q.lastResult : null;
        const w = this.watching;
        this.transcript.outcomes.push({ call: w.call, activityId: w.activityId, label: w.label, tick: world.tick, outcome: r && r.tick >= w.since ? r.outcome : 'unknown', detail: r && r.tick >= w.since ? r.detail : '' });
        this.watching = null;
      }
    }
  }

  /** the transcript as it stands, with an end record for this moment (the session goes on) */
  snapshotTranscript(world: World): Transcript {
    const t: Transcript = JSON.parse(JSON.stringify(this.transcript)) as Transcript;
    t.end = this.endRecord(world);
    return t;
  }

  private endRecord(world: World): NonNullable<Transcript['end']> {
    const calls = this.transcript.calls;
    return {
      tick: world.tick,
      hash: hashWorld(world),
      died: this.died,
      calls: calls.length,
      applied: calls.filter((c) => c.result?.status === 'applied').length,
      rejected: calls.filter((c) => c.result?.status === 'rejected').length,
      fallbacks: calls.filter((c) => c.result?.status === 'fallback').length,
      lagged: calls.filter((c) => c.timing === 'lagged').length,
      gate: this.gate.summary(),
      ...(this.memory ? { notesHash: notesHash(world.inhabitants?.[this.personId]?.notes) } : {}),
    };
  }

  /** end the run: the controller is uninstalled and the transcript closed */
  finish(world: World): Transcript {
    this.restore?.();
    this.restore = null;
    this.transcript.end = this.endRecord(world);
    return this.transcript;
  }
}

/** Live, headless: the model answers each ask; every answer is applied at the tick it was asked about. */
export async function runLive(world: World, personId: number, model: ModelClient, opts: RunOptions): Promise<RunResult> {
  const s = new LiveSession(world, personId, model, opts);
  let w = world;
  try {
    while (w.tick < opts.until) {
      if (!s.beforeTick(w)) break;
      const before = s.lastApplied();
      stepWorld(w);
      const ask = s.afterTick(w);
      if (ask) {
        await s.answer(ask);
        w = s.rewind(ask);
        continue;
      }
      opts.onTick?.(w);
      s.settle(w, before);
    }
  } finally {
    s.finish(w);
  }
  return { world: w, transcript: s.transcript, gate: s.gate };
}

export interface ReplayOptions {
  /** stop earlier than the transcript's end (then the end hash is not checked) */
  until?: number;
  sources?: string;
  allowSourceDrift?: boolean;
  onTick?: (world: World) => void;
}

/** Replay: the recorded choices (and with memory the recorded notes updates) are supplied at their ticks; the first difference stops the run with ReplayDiverged. */
export function runReplay(world: World, transcript: Transcript, opts: ReplayOptions = {}): RunResult & { warnings: string[] } {
  markInhabitant(world, transcript.header.personId, protocolHasMemory(transcript.header.protocol));
  const warnings = verifyHeader(transcript, world, { sources: opts.sources, allowSourceDrift: opts.allowSourceDrift });
  const until = opts.until ?? transcript.end?.tick ?? world.tick;
  const ctrl = new TranscriptController(transcript, 'replay');
  const restore = setExternalController(ctrl);
  try {
    while (world.tick < until) {
      if (!livingPerson(world, transcript.header.personId)) break;
      stepWorld(world);
      opts.onTick?.(world);
    }
    if (opts.until === undefined) ctrl.verifyEnd(world);
  } finally {
    restore();
  }
  return { world, transcript, gate: null, warnings };
}

/** Standard: nobody is driven from outside. The same loop, for a paired comparison. */
export function runStandard(world: World, until: number, onTick?: (world: World) => void): World {
  while (world.tick < until) {
    stepWorld(world);
    onTick?.(world);
  }
  return world;
}
