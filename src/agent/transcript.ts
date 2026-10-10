// The transcript: every outside decision as a deterministic input, tied to the simulation that produced it (docs/INHABITANT.md,
// section 5), and the one controller that both records it (live) and consumes it (replay).
//
// Three kinds of record:
//   an ASK      one exchange with the model: the exact observation and its hash, the notes as shown, what the model was told about
//               picks already refused in the same moment, the raw answer (or why there was none), the parsed proposal;
//   a CALL      one invocation of choose(): the tick and attempt, the hashes of the observation and of the whole world at that moment,
//               the choice returned, what the engine made of it (applied, refused, or chose for itself), and with memory the hash of
//               the notes after the update and what the update changed;
//   an OVERRIDE the engine ending the person's activity on its own authority (danger, a deadlier need).
// A replay consumes the calls in order and refuses to go on at the first thing that differs: a missing or out-of-order call, a different
// observation, a different world hash, a different result, a different notes hash after a memory update, a different protocol or
// simulation fingerprint. It never calls a model.
import { createWorld, defaultSettings } from '../sim/factory';
import type { ExternalChoice, ExternalController, ExternalNote } from '../sim/external';
import type { Ctx, Option } from '../sim/optutil';
import type { InhabitantNotes, Person, Settings, World } from '../sim/types';
import { hashWorld, stepWorld } from '../sim/world';
import { LIMITS, MEMORY_VERSION, applyNoteUpdate, notesHash } from './memory';
import type { RevisionRecord } from './memory';
import { observeInhabitant, observationHash } from './observe';
import type { InhabitantObservation, ObserveOptions } from './observe';
import type { Budget } from './model';
import { PROTOCOL_VERSIONS, observationVersionFor, protocolHasMemory } from './protocol';
import type { Proposal } from './protocol';

export const TRANSCRIPT_VERSION = 1;

export interface Ask {
  seq: number;
  tick: number;
  /** 0 for the first pick of a decision, 1 and 2 after refusals in the same moment */
  attempt: number;
  observationHash: string;
  observation: InhabitantObservation;
  /** with memory: the notes as they stood when asked (what the model was shown, before the journal was cut for the prompt) */
  notes: InhabitantNotes | null;
  /** picks refused earlier in this decision, as the model was told */
  rejected: { key: string; reason: string }[];
  /** the exchange; null while the ask is open (no answer yet) */
  model: { ok: boolean; text: string | null; reason: string | null; latencyMs: number; usage?: { input: number; output: number } } | null;
  proposal: Proposal | null;
  /** why the answer could not be used as a proposal, when it could not */
  problem: string | null;
  /** why the notes in the answer could not be used, when they could not (the choice stands) */
  notesProblem: string | null;
}

export interface Call {
  seq: number;
  tick: number;
  attempt: number;
  /** the ask this call opened or answered */
  ask: number;
  observationHash: string;
  /** hashWorld(world) at the moment of choosing, before anything was applied */
  worldHash: string;
  choice: ExternalChoice;
  /** exact: answered at the tick it was asked; lagged: the answer was applied at a later tick (no rewind was possible) */
  timing: 'exact' | 'lagged';
  /** what the engine made of it; null for a deferral */
  result: { status: 'applied' | 'rejected' | 'fallback'; key?: string; reason?: string; activityId?: number; label?: string } | null;
  /** with memory, on a consuming call: the notes after this call's update (or unchanged), and what the update did */
  notesHash?: string;
  revision?: RevisionRecord;
}

export interface OverrideRecord {
  seq: number;
  tick: number;
  why: string;
  activityId: number;
  label: string;
}

/** what an applied choice came to, as the person themselves recorded it (p.lastResult) */
export interface OutcomeRecord {
  call: number;
  activityId: number;
  label: string;
  tick: number;
  outcome: string;
  detail: string;
}

/** observer only (never read by the prompt builder): the village's record of this person since the previous entry */
export interface ObserverRecord {
  call: number;
  tick: number;
  events: { tick: number; kind: string; text: string }[];
}

export interface TranscriptHeader {
  version: number;
  /** inhabitant/1 (no memory) or inhabitant/2 (memory) */
  protocol: string;
  mode: 'live' | 'replay';
  seed: string;
  settings: Settings;
  personId: number;
  personName: string;
  startTick: number;
  /** hashWorld(world) at the start, with the person already marked as driven from outside */
  startHash: string;
  /** fingerprints of the simulation: behaviour (a fixed world stepped a fixed number of ticks) and, when the runner can read them, its sources */
  sim: { behaviour: string; sources?: string };
  model: { id: string; kind: string; config: Record<string, unknown> };
  budget: Budget;
  observe: ObserveOptions;
  /** with memory: the schema version and limits the notes were kept under */
  memory?: { version: number; limits: Record<string, number> };
}

export interface Transcript {
  header: TranscriptHeader;
  asks: Ask[];
  calls: Call[];
  overrides: OverrideRecord[];
  outcomes: OutcomeRecord[];
  observer: ObserverRecord[];
  end: { tick: number; hash: string; died: boolean; calls: number; applied: number; rejected: number; fallbacks: number; lagged: number; gate: Record<string, number | string | null> | null; notesHash?: string } | null;
}

export class ReplayDiverged extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplayDiverged';
  }
}

let behaviourFingerprint: string | null = null;
/** the behaviour of this build of the simulation: a fixed ordinary world after a fixed number of ticks. Memoised per process. */
export function simBehaviourFingerprint(): string {
  if (behaviourFingerprint) return behaviourFingerprint;
  const w = createWorld(defaultSettings('inhabitant-fingerprint'));
  const h0 = hashWorld(w);
  for (let i = 0; i < 240; i++) stepWorld(w);
  behaviourFingerprint = `${h0}:${hashWorld(w)}`;
  return behaviourFingerprint;
}

export function newTranscript(header: Omit<TranscriptHeader, 'version'>): Transcript {
  return { header: { version: TRANSCRIPT_VERSION, ...header }, asks: [], calls: [], overrides: [], outcomes: [], observer: [], end: null };
}

function copyNotes(n: InhabitantNotes | undefined): InhabitantNotes | null {
  return n ? (JSON.parse(JSON.stringify(n)) as InhabitantNotes) : null;
}

/**
 * The controller. Live: answers from asks the runner has had answered, opens a new ask (and defers) when it has none. Replay: answers
 * from the recorded calls, verifying each. Both update the world's inhabitant record the same way (counters, and with memory the
 * notes), so the hashes agree.
 */
export class TranscriptController implements ExternalController {
  private cursor = 0;
  private attempt = 0;
  private attemptTick = -1;
  private rejectedNow: { key: string; reason: string }[] = [];
  private lastCall: Call | null = null;
  private overrideCursor = 0;
  /** live: the call that last started an activity (the runner watches what became of it) */
  lastApplied: Call | null = null;

  constructor(
    readonly transcript: Transcript,
    readonly mode: 'live' | 'replay',
  ) {}

  get personId(): number {
    return this.transcript.header.personId;
  }

  /** does this run keep the inhabitant's notes? (decided by the protocol the transcript speaks) */
  get memory(): boolean {
    return protocolHasMemory(this.transcript.header.protocol);
  }

  controls(_world: World, p: Person): boolean {
    return p.id === this.personId;
  }

  /** live: the ask that is waiting for the model, if any */
  openAsk(): Ask | null {
    const a = this.transcript.asks[this.transcript.asks.length - 1];
    return a && a.model === null ? a : null;
  }

  private consumed(askSeq: number): boolean {
    return this.transcript.calls.some((c) => c.ask === askSeq && c.choice.kind !== 'defer');
  }

  /** live: forget the calls made on a timeline the runner is discarding (the asks and their answers are kept) */
  rewindCalls(count: number): void {
    const calls = this.transcript.calls;
    if (calls.length > count) calls.splice(count, calls.length - count);
    this.attemptTick = -1;
    this.attempt = 0;
    this.rejectedNow = [];
    this.lastCall = null;
    this.lastApplied = null;
  }

  choose(world: World, p: Person, ctx: Ctx, ranked: Option[], _trigger: string): ExternalChoice {
    if (this.attemptTick !== world.tick) {
      this.attemptTick = world.tick;
      this.attempt = 0;
      this.rejectedNow = [];
    }
    const attempt = this.attempt++;
    const header = this.transcript.header;
    const observation = observeInhabitant(world, p, ctx, ranked, { ...header.observe, version: observationVersionFor(header.protocol) });
    const oh = observationHash(observation);
    const wh = hashWorld(world);
    const state = world.inhabitants?.[p.id];

    let call: Call;
    if (this.mode === 'replay') {
      call = this.replayCall(world, attempt, oh, wh);
    } else {
      // an answered ask for this very moment (the re-run after a rewind), else an answered one from an earlier tick (no rewind: lagged)
      let ask: Ask | undefined;
      let timing: Call['timing'] = 'exact';
      for (const a of this.transcript.asks) {
        if (a.model === null || this.consumed(a.seq)) continue;
        if (a.tick === world.tick && a.attempt === attempt) {
          if (a.observationHash !== oh) throw new Error(`the rewind was not exact: at tick ${world.tick} the person sees something different from what was asked about`);
          ask = a;
          break;
        }
        if (a.tick < world.tick && attempt === 0) {
          ask = a;
          timing = 'lagged';
          break;
        }
      }
      if (!ask) {
        const a: Ask = {
          seq: this.transcript.asks.length,
          tick: world.tick,
          attempt,
          observationHash: oh,
          observation,
          notes: this.memory ? copyNotes(state?.notes) : null,
          rejected: this.rejectedNow.slice(),
          model: null,
          proposal: null,
          problem: null,
          notesProblem: null,
        };
        this.transcript.asks.push(a);
        this.push({ seq: 0, tick: world.tick, attempt, ask: a.seq, observationHash: oh, worldHash: wh, choice: { kind: 'defer' }, timing: 'exact', result: null });
        return { kind: 'defer' };
      }
      const choice: ExternalChoice = ask.proposal ? { kind: 'pick', key: ask.proposal.choose } : { kind: 'fallback', reason: ask.problem ?? ask.model?.reason ?? 'no answer' };
      call = { seq: 0, tick: world.tick, attempt, ask: ask.seq, observationHash: oh, worldHash: wh, choice, timing, result: null };
      this.push(call);
    }

    // a consuming call carries the notes update, applied here in both modes so the world (and its hash) agree
    if (call.choice.kind !== 'defer' && this.memory && state) {
      const update = this.transcript.asks[call.ask]?.proposal?.notes;
      const revision = update ? applyNoteUpdate(state, update, observation, world.tick) : undefined;
      const h = notesHash(state.notes);
      if (this.mode === 'replay') {
        if (call.notesHash !== h) throw new ReplayDiverged(`call #${call.seq} at tick ${call.tick}: the memory update gives notes ${h} where the transcript recorded ${call.notesHash ?? 'none'}`);
      } else {
        call.notesHash = h;
        if (revision) call.revision = revision;
      }
    }
    return call.choice;
  }

  private push(c: Call): void {
    c.seq = this.transcript.calls.length;
    this.transcript.calls.push(c);
    this.lastCall = c;
  }

  private replayCall(world: World, attempt: number, oh: string, wh: string): Call {
    const c = this.transcript.calls[this.cursor];
    if (!c) throw new ReplayDiverged(`no recorded decision for tick ${world.tick}: the transcript holds ${this.transcript.calls.length} calls and all are consumed`);
    if (c.tick !== world.tick || c.attempt !== attempt) throw new ReplayDiverged(`call #${c.seq} was recorded at tick ${c.tick} (attempt ${c.attempt}) but is being consumed at tick ${world.tick} (attempt ${attempt})`);
    if (c.observationHash !== oh) throw new ReplayDiverged(`call #${c.seq} at tick ${c.tick}: the person observes something different from what was recorded`);
    if (c.worldHash !== wh) throw new ReplayDiverged(`call #${c.seq} at tick ${c.tick}: the world is in a different state from the one recorded`);
    if (c.choice.kind !== 'defer' && !this.transcript.asks[c.ask]) throw new ReplayDiverged(`call #${c.seq} answers ask #${c.ask}, which the transcript does not hold`);
    this.cursor++;
    this.lastCall = c;
    return c;
  }

  notify(world: World, p: Person, note: ExternalNote): void {
    const state = world.inhabitants?.[p.id];
    if (note.kind === 'override') {
      if (this.mode === 'replay') {
        const o = this.transcript.overrides[this.overrideCursor++];
        if (!o || o.tick !== world.tick || o.why !== note.why || o.activityId !== note.activity.id) throw new ReplayDiverged(`at tick ${world.tick} the engine overrode the person (${note.why}) where the transcript ${o ? `recorded ${o.why} at tick ${o.tick}` : 'recorded nothing'}`);
      } else this.transcript.overrides.push({ seq: this.transcript.overrides.length, tick: world.tick, why: note.why, activityId: note.activity.id, label: note.activity.label });
      return;
    }
    const result: Call['result'] =
      note.kind === 'applied' ? { status: 'applied', key: note.key, activityId: note.activity.id, label: note.activity.label } : note.kind === 'rejected' ? { status: 'rejected', key: note.key, reason: note.reason } : { status: 'fallback', reason: note.reason, activityId: note.activity?.id, label: note.activity?.label };
    const c = this.lastCall;
    if (!c) throw new Error('the engine reported a result with no call to attach it to');
    if (this.mode === 'replay') {
      const r = c.result;
      if (!r || r.status !== result.status || r.key !== result.key || r.activityId !== result.activityId) throw new ReplayDiverged(`call #${c.seq} at tick ${c.tick}: the engine ${describe(result)} where the transcript recorded ${r ? describe(r) : 'nothing'}`);
    } else c.result = result;
    if (note.kind === 'rejected') this.rejectedNow.push({ key: note.key, reason: note.reason });
    if (note.kind === 'applied') {
      this.lastApplied = c;
      if (state) state.turns++;
    }
    if (note.kind === 'fallback' && state) state.fallbacks++;
  }

  /** replay: everything recorded must have been consumed, and the world must end where the transcript ended */
  verifyEnd(world: World): void {
    const t = this.transcript;
    if (this.cursor !== t.calls.length) throw new ReplayDiverged(`${t.calls.length - this.cursor} recorded decision(s) were never consumed (the person stopped deciding, or the run ended early)`);
    if (this.overrideCursor !== t.overrides.length) throw new ReplayDiverged(`${t.overrides.length - this.overrideCursor} recorded override(s) never happened`);
    if (t.end) {
      if (world.tick !== t.end.tick) throw new ReplayDiverged(`the replay ended at tick ${world.tick}, the transcript at ${t.end.tick}`);
      const h = hashWorld(world);
      if (h !== t.end.hash) throw new ReplayDiverged(`the world ends in state ${h}, the transcript recorded ${t.end.hash}`);
      if (this.memory) {
        const nh = notesHash(world.inhabitants?.[this.personId]?.notes);
        if (nh !== t.end.notesHash) throw new ReplayDiverged(`the notes end as ${nh}, the transcript recorded ${t.end.notesHash ?? 'none'}`);
      }
    }
  }
}

function describe(r: NonNullable<Call['result']>): string {
  return r.status === 'applied' ? `applied ${r.key} (activity ${r.activityId})` : r.status === 'rejected' ? `refused ${r.key}` : `chose for itself (${r.reason})`;
}

/** Check a transcript against this build before replaying it. Throws ReplayDiverged with the first mismatch. */
export function verifyHeader(t: Transcript, world: World, opts: { sources?: string; allowSourceDrift?: boolean } = {}): string[] {
  const warnings: string[] = [];
  const h = t.header;
  if (h.version !== TRANSCRIPT_VERSION) throw new ReplayDiverged(`transcript version ${h.version}; this build reads ${TRANSCRIPT_VERSION}`);
  if (!PROTOCOL_VERSIONS.includes(h.protocol)) throw new ReplayDiverged(`the transcript used protocol ${h.protocol}; this build speaks ${PROTOCOL_VERSIONS.join(' and ')}`);
  if (protocolHasMemory(h.protocol)) {
    if (!h.memory || h.memory.version !== MEMORY_VERSION) throw new ReplayDiverged(`the transcript kept notes under memory version ${h.memory?.version ?? 'none'}; this build keeps version ${MEMORY_VERSION}`);
    if (JSON.stringify(h.memory.limits) !== JSON.stringify(LIMITS)) throw new ReplayDiverged('the transcript kept notes under different limits from this build');
  }
  const fp = simBehaviourFingerprint();
  if (h.sim.behaviour !== fp) throw new ReplayDiverged(`the simulation behaves differently from the one that made the transcript (fingerprint ${fp}, recorded ${h.sim.behaviour})`);
  if (h.sim.sources && opts.sources && h.sim.sources !== opts.sources) {
    const msg = `the simulation's sources differ from the ones that made the transcript (${opts.sources} against ${h.sim.sources})`;
    if (!opts.allowSourceDrift) throw new ReplayDiverged(msg);
    warnings.push(msg);
  }
  if (world.tick !== h.startTick) throw new ReplayDiverged(`the world is at tick ${world.tick}; the transcript starts at ${h.startTick}`);
  const sh = hashWorld(world);
  if (sh !== h.startHash) throw new ReplayDiverged(`the world starts in state ${sh}; the transcript was made from ${h.startHash}`);
  return warnings;
}
