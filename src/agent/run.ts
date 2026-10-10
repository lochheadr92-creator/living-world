// Driving a world with one person answered from outside (docs/INHABITANT.md, section 4).
//
// A tick never waits. When the controlled person is about to choose and the controller has no answer, the engine records the
// observation and the person stands for that tick ('defer'). The runner then asks the model, and instead of letting the answer land a
// tick late it REWINDS: the stepped world is thrown away, the last snapshot restored, and the same tick run again with the answer in
// hand, so the choice is applied at the very tick, against the very options, it was asked about. The transcript records the rewind's
// result only; the discarded timeline leaves no trace but the ask itself. A snapshot is taken whenever the person is about to be free
// (cheap) and after every applied choice (bounded re-run otherwise).
//
// A replay installs the same controller in replay mode and steps the world; the controller supplies each recorded choice at its tick
// and stops at the first difference. No model is involved.
import { deserializeWorld, serializeWorld } from '../app/save';
import { DAY } from '../sim/constants';
import { setExternalController } from '../sim/external';
import type { Person, World } from '../sim/types';
import { hashWorld, stepWorld } from '../sim/world';
import { DEFAULT_BUDGET, ModelGate } from './model';
import type { Budget, ModelClient } from './model';
import type { ObserveOptions } from './observe';
import { buildPrompt, parseProposal } from './protocol';
import { TranscriptController, newTranscript, simBehaviourFingerprint, verifyHeader } from './transcript';
import type { Ask, Transcript } from './transcript';

export interface RunOptions {
  /** run until this tick */
  until: number;
  observe?: ObserveOptions;
  budget?: Budget;
  /** a fingerprint of src/sim, when the caller can read the files (scripts do; tests do not) */
  sources?: string;
  /** called after every tick that stands (not after ticks that are rewound) */
  onTick?: (world: World) => void;
}

export interface RunResult {
  world: World;
  transcript: Transcript;
  gate: ModelGate | null;
}

/** Mark a person as driven from outside: the mark is saved with the world and folded into its hash. Idempotent. */
export function markInhabitant(world: World, personId: number): void {
  const p = world.byId.get(personId);
  if (!p || p.ent !== 'person') throw new Error(`no person #${personId}`);
  world.inhabitants ??= {};
  world.inhabitants[personId] ??= { since: world.tick, turns: 0, fallbacks: 0 };
}

/** the person, or null once they are dead (the dead leave the world's index) */
function personOf(world: World, id: number): Person | null {
  const p = world.byId.get(id);
  return p && p.ent === 'person' && p.alive ? p : null;
}

async function answerAsk(ask: Ask, gate: ModelGate, personTick: number): Promise<void> {
  const prompt = buildPrompt({ observation: ask.observation, rejected: ask.rejected });
  const r = await gate.call(prompt, Math.floor(personTick / DAY));
  if (!r.ok) {
    ask.model = { ok: false, text: null, reason: r.reason, latencyMs: r.latencyMs };
    ask.problem = r.reason;
    return;
  }
  ask.model = { ok: true, text: r.reply.text, reason: null, latencyMs: r.latencyMs, usage: r.reply.usage };
  const parsed = parseProposal(r.reply.text);
  ask.proposal = parsed.proposal;
  ask.problem = parsed.problem;
  if (parsed.problem) gate.markUnusable(parsed.problem);
}

/** Live: the model answers each ask; every answer is applied at the tick it was asked about. */
export async function runLive(world: World, personId: number, model: ModelClient, opts: RunOptions): Promise<RunResult> {
  markInhabitant(world, personId);
  const budget = opts.budget ?? DEFAULT_BUDGET;
  const gate = new ModelGate(model, budget);
  const person = personOf(world, personId);
  if (!person) throw new Error(`no living person #${personId}`);
  const transcript = newTranscript({
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
  });
  const ctrl = new TranscriptController(transcript, 'live');
  const restore = setExternalController(ctrl);
  let w = world;
  let snapshot = { text: serializeWorld(w), tick: w.tick, calls: 0 };
  const takeSnapshot = () => {
    snapshot = { text: serializeWorld(w), tick: w.tick, calls: transcript.calls.length };
  };
  let watching: { call: number; activityId: number; label: string; since: number } | null = null;
  let lastEventTick = w.tick - 1;
  let died = false;
  try {
    while (w.tick < opts.until) {
      const p = personOf(w, personId);
      if (!p) {
        died = true;
        break;
      }
      // about to be free: a snapshot now makes the coming ask's rewind cost one tick
      if (!p.activity && w.tick >= p.nextThink && snapshot.tick !== w.tick) takeSnapshot();
      const before = ctrl.lastApplied;
      stepWorld(w);
      const open = ctrl.openAsk();
      if (open) {
        await answerAsk(open, gate, open.tick);
        // rewind to the snapshot and run the same tick again with the answer in hand
        w = deserializeWorld(snapshot.text);
        ctrl.rewindCalls(snapshot.calls);
        while (w.tick < open.tick) stepWorld(w);
        continue;
      }
      opts.onTick?.(w);
      const applied = ctrl.lastApplied;
      if (applied && applied !== before && applied.result && applied.result.activityId !== undefined) {
        watching = { call: applied.seq, activityId: applied.result.activityId, label: applied.result.label ?? '', since: w.tick };
        const events = w.events.filter((e) => e.tick > lastEventTick && e.ids.includes(personId)).map((e) => ({ tick: e.tick, kind: e.kind, text: e.text }));
        lastEventTick = w.tick;
        transcript.observer.push({ call: applied.seq, tick: w.tick, events });
        takeSnapshot();
      }
      if (watching) {
        const q = personOf(w, personId);
        // an activity put aside for a conversation is not over: it resumes afterwards
        const paused = q !== null && q.suspended !== null && q.suspended.id === watching.activityId;
        if (!paused && (!q || !q.activity || q.activity.id !== watching.activityId)) {
          const r = q ? q.lastResult : null;
          transcript.outcomes.push({ call: watching.call, activityId: watching.activityId, label: watching.label, tick: w.tick, outcome: r && r.tick >= watching.since ? r.outcome : 'unknown', detail: r && r.tick >= watching.since ? r.detail : '' });
          watching = null;
        }
      }
    }
  } finally {
    restore();
  }
  const calls = transcript.calls;
  transcript.end = {
    tick: w.tick,
    hash: hashWorld(w),
    died,
    calls: calls.length,
    applied: calls.filter((c) => c.result?.status === 'applied').length,
    rejected: calls.filter((c) => c.result?.status === 'rejected').length,
    fallbacks: calls.filter((c) => c.result?.status === 'fallback').length,
    lagged: calls.filter((c) => c.timing === 'lagged').length,
    gate: gate.summary(),
  };
  return { world: w, transcript, gate };
}

export interface ReplayOptions {
  /** stop earlier than the transcript's end (then the end hash is not checked) */
  until?: number;
  sources?: string;
  allowSourceDrift?: boolean;
  onTick?: (world: World) => void;
}

/** Replay: the recorded choices are supplied at their ticks; the first difference stops the run with ReplayDiverged. */
export function runReplay(world: World, transcript: Transcript, opts: ReplayOptions = {}): RunResult & { warnings: string[] } {
  markInhabitant(world, transcript.header.personId);
  const warnings = verifyHeader(transcript, world, { sources: opts.sources, allowSourceDrift: opts.allowSourceDrift });
  const until = opts.until ?? transcript.end?.tick ?? world.tick;
  const ctrl = new TranscriptController(transcript, 'replay');
  const restore = setExternalController(ctrl);
  try {
    while (world.tick < until) {
      if (!personOf(world, transcript.header.personId)) break;
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
