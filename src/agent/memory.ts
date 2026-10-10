// The inhabitant's own notes (docs/INHABITANT.md, section 4): what a person driven from outside writes down for themselves between
// decisions, kept in world.inhabitants[id].notes so it is saved with the world and folded into its hash.
//
// Epistemic standing, kept apart on purpose:
//   what the person SEES now and what they legitimately REMEMBER or were TOLD come from the engine (the observation);
//   what the model INFERS, INTENDS, HOPES or DOUBTS is written here, by the model, and is never verified by the engine.
// An inference carries a confidence (0 doubtful .. 1 sure) and must rest on references into observations the model was actually
// given; a reference it was never given is dropped, and an inference left without any is refused. The lists are bounded in number,
// in characters and in total size; anything over a limit is cut or dropped deterministically and counted, never left to corrupt the
// world. Nothing in src/sim reads these notes.
import type { InhabitantNotes, InhabitantState, Inference, MemoryCounters, NoteEntry } from '../sim/types';
import { hashString } from '../sim/rng';
import type { InhabitantObservation } from './observe';

export const MEMORY_VERSION = 1;

export const LIMITS = Object.freeze({
  goals: 6,
  intentions: 6,
  inferences: 12,
  uncertainties: 8,
  journal: 40,
  /** characters per goal, intention, inference or uncertainty */
  textChars: 200,
  journalChars: 240,
  basisPerInference: 6,
  refChars: 60,
  /** the whole notes record as JSON */
  totalChars: 12_000,
  /** journal entries shown to the model (all are kept) */
  journalShown: 12,
});

export function emptyNotes(): InhabitantNotes {
  return { goals: [], intentions: [], inferences: [], uncertainties: [], journal: [] };
}

export function emptyCounters(): MemoryCounters {
  return { version: MEMORY_VERSION, updates: 0, rejectedUpdates: 0, rejectedEntries: 0, new: 0, kept: 0, strengthened: 0, weakened: 0, revised: 0, abandoned: 0, nextId: 1 };
}

/** an entry as the model wrote it: an existing id to keep or change it, no id (or an unknown one) to add it */
export interface EntryIn {
  id?: string;
  text: string;
}
export interface InferenceIn extends EntryIn {
  confidence: number;
  basis: string[];
}
/** a list that is present replaces the list; a list that is absent leaves it as it was; the journal takes one new entry */
export interface NoteUpdate {
  goals?: EntryIn[];
  intentions?: EntryIn[];
  inferences?: InferenceIn[];
  uncertainties?: EntryIn[];
  journal?: string | null;
}

export interface RevisionRecord {
  /** inferences: created, restated unchanged, confidence raised, confidence lowered, text changed, left out */
  new: number;
  kept: number;
  strengthened: number;
  weakened: number;
  revised: number;
  abandoned: number;
  goalsAdopted: number;
  goalsDropped: number;
  /** entries dropped as malformed, over a count limit, or (an inference) without a usable reference */
  rejectedEntries: number;
  /** strings cut to their limit */
  truncated: number;
  /** entries dropped afterwards to bring the record under its total size */
  trimmed: number;
  /** a few words on each problem, bounded */
  problems: string[];
}

function clean(s: string, max: number, rec?: { truncated: number }): string {
  let t = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) continue;
    t += s[i];
  }
  t = t.trim();
  if (t.length > max) {
    t = t.slice(0, max);
    if (rec) rec.truncated++;
  }
  return t;
}

const REF = /^(place|person|seen|memory|result|option|obs):[A-Za-z0-9_:.+\-]{1,60}$/;

function entryIn(v: unknown): EntryIn | null {
  if (typeof v === 'string') return { text: v };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.text !== 'string') return null;
  return typeof o.id === 'string' ? { id: o.id.slice(0, 12), text: o.text } : { text: o.text };
}

function inferenceIn(v: unknown): InferenceIn | null {
  const e = entryIn(v);
  if (!e || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.confidence !== 'number' || !Number.isFinite(o.confidence)) return null;
  if (!Array.isArray(o.basis)) return null;
  return { ...e, confidence: o.confidence, basis: o.basis.filter((b): b is string => typeof b === 'string') };
}

/**
 * The "notes" field of a model's answer, shape-checked: a present list must be an array (else the whole update is refused);
 * entries that are not what they should be are dropped here and counted when applied. Text is not yet cut: that happens on applying,
 * where it is counted.
 */
export function parseNoteUpdate(raw: unknown): { update: NoteUpdate | null; problem: string | null; dropped: number } {
  if (raw === undefined || raw === null) return { update: null, problem: null, dropped: 0 };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { update: null, problem: '"notes" is not an object', dropped: 0 };
  const o = raw as Record<string, unknown>;
  const update: NoteUpdate = {};
  let dropped = 0;
  for (const k of ['goals', 'intentions', 'uncertainties'] as const) {
    if (o[k] === undefined) continue;
    if (!Array.isArray(o[k])) return { update: null, problem: `"notes.${k}" is not a list`, dropped };
    const list: EntryIn[] = [];
    for (const v of o[k] as unknown[]) {
      const e = entryIn(v);
      if (e) list.push(e);
      else dropped++;
    }
    update[k] = list;
  }
  if (o.inferences !== undefined) {
    if (!Array.isArray(o.inferences)) return { update: null, problem: '"notes.inferences" is not a list', dropped };
    const list: InferenceIn[] = [];
    for (const v of o.inferences as unknown[]) {
      const e = inferenceIn(v);
      if (e) list.push(e);
      else dropped++;
    }
    update.inferences = list;
  }
  if (o.journal !== undefined) {
    if (o.journal === null) update.journal = null;
    else if (typeof o.journal === 'string') update.journal = o.journal;
    else if (o.journal && typeof o.journal === 'object' && typeof (o.journal as { text?: unknown }).text === 'string') update.journal = (o.journal as { text: string }).text;
    else dropped++;
  }
  return { update, problem: null, dropped };
}

/** every reference the observation supports */
export function observationRefs(obs: InhabitantObservation): Set<string> {
  const refs = new Set<string>();
  refs.add(`obs:${obs.time.tick}`);
  for (const pl of [...obs.remembered.places, ...obs.remembered.water, ...obs.remembered.dangers]) refs.add(`place:${pl.id}`);
  for (const s of obs.seen.people) {
    refs.add(`seen:${s.id}`);
    refs.add(`person:${s.id}`);
  }
  for (const r of obs.people.relations) refs.add(`person:${r.id}`);
  for (const w of obs.people.whereabouts) refs.add(`person:${w.id}`);
  for (const m of obs.recent.memory) if (m.t !== undefined) refs.add(`memory:${m.t}`);
  if (obs.doing.lastResult && obs.doing.lastResult.t !== undefined) refs.add(`result:${obs.doing.lastResult.t}`);
  for (const o of obs.options) refs.add(`option:${o.key}`);
  return refs;
}

function fresh(counters: MemoryCounters, prefix: string): string {
  return `${prefix}${counters.nextId++}`;
}

function replaceList(prev: NoteEntry[], next: EntryIn[], prefix: string, limit: number, counters: MemoryCounters, tick: number, rec: RevisionRecord): { list: NoteEntry[]; adopted: number; dropped: number } {
  const byId = new Map(prev.map((e) => [e.id, e]));
  const out: NoteEntry[] = [];
  const used = new Set<string>();
  let adopted = 0;
  for (const e of next) {
    if (out.length >= limit) {
      rec.rejectedEntries++;
      rec.problems.push(`${prefix}: over ${limit} entries`);
      break;
    }
    const text = clean(e.text, LIMITS.textChars, rec);
    if (!text) {
      rec.rejectedEntries++;
      continue;
    }
    const old = e.id && !used.has(e.id) ? byId.get(e.id) : undefined;
    if (old) {
      used.add(old.id);
      out.push({ id: old.id, text, since: old.since });
    } else {
      out.push({ id: fresh(counters, prefix), text, since: tick });
      adopted++;
    }
  }
  return { list: out, adopted, dropped: prev.filter((e) => !used.has(e.id)).length };
}

function replaceInferences(prev: Inference[], next: InferenceIn[], refs: Set<string>, counters: MemoryCounters, tick: number, rec: RevisionRecord): Inference[] {
  const byId = new Map(prev.map((e) => [e.id, e]));
  const known = new Set<string>();
  for (const e of prev) for (const b of e.basis) known.add(b);
  const out: Inference[] = [];
  const used = new Set<string>();
  for (const e of next) {
    if (out.length >= LIMITS.inferences) {
      rec.rejectedEntries++;
      rec.problems.push(`inferences: over ${LIMITS.inferences} entries`);
      break;
    }
    const text = clean(e.text, LIMITS.textChars, rec);
    const basis: string[] = [];
    for (const b of e.basis) {
      const ref = clean(b, LIMITS.refChars);
      if (basis.length >= LIMITS.basisPerInference) break;
      if (REF.test(ref) && (refs.has(ref) || known.has(ref)) && !basis.includes(ref)) basis.push(ref);
    }
    if (!text || basis.length === 0) {
      rec.rejectedEntries++;
      rec.problems.push(basis.length === 0 && text ? `inference without a usable reference: “${text.slice(0, 40)}”` : 'inference without text');
      continue;
    }
    const confidence = Math.round(Math.max(0, Math.min(1, e.confidence)) * 100) / 100;
    const old = e.id && !used.has(e.id) ? byId.get(e.id) : undefined;
    if (old) {
      used.add(old.id);
      const changedText = old.text !== text;
      if (changedText) rec.revised++;
      else if (confidence > old.confidence) rec.strengthened++;
      else if (confidence < old.confidence) rec.weakened++;
      else rec.kept++;
      const changed = changedText || confidence !== old.confidence;
      out.push({ id: old.id, text, since: old.since, confidence, basis, revised: changed ? tick : old.revised });
    } else {
      rec.new++;
      out.push({ id: fresh(counters, 'i'), text, since: tick, confidence, basis, revised: tick });
    }
  }
  rec.abandoned += prev.filter((e) => !used.has(e.id)).length;
  return out;
}

function emptyRevision(): RevisionRecord {
  return { new: 0, kept: 0, strengthened: 0, weakened: 0, revised: 0, abandoned: 0, goalsAdopted: 0, goalsDropped: 0, rejectedEntries: 0, truncated: 0, trimmed: 0, problems: [] };
}

/** bring the record under its total size, dropping what matters least first; deterministic */
function trimToSize(notes: InhabitantNotes, rec: RevisionRecord): void {
  const size = () => JSON.stringify(notes).length;
  let guard = 0;
  while (size() > LIMITS.totalChars && guard++ < 200) {
    if (notes.journal.length > 4) notes.journal.shift();
    else if (notes.inferences.length > 0) {
      let at = 0;
      for (let i = 1; i < notes.inferences.length; i++) if (notes.inferences[i].confidence < notes.inferences[at].confidence) at = i;
      notes.inferences.splice(at, 1);
    } else if (notes.uncertainties.length > 0) notes.uncertainties.pop();
    else if (notes.intentions.length > 0) notes.intentions.pop();
    else if (notes.goals.length > 0) notes.goals.pop();
    else if (notes.journal.length > 0) notes.journal.shift();
    else break;
    rec.trimmed++;
  }
}

/**
 * Apply one update to a person's notes. Deterministic: the same notes, update, observation and tick always give the same result, so
 * a replay reproduces it without the model. Mutates `state.notes` and `state.memory`; returns what changed.
 */
export function applyNoteUpdate(state: InhabitantState, update: NoteUpdate, observation: InhabitantObservation, tick: number): RevisionRecord {
  const notes = (state.notes ??= emptyNotes());
  const counters = (state.memory ??= emptyCounters());
  const rec = emptyRevision();
  counters.updates++;
  const refs = observationRefs(observation);
  if (update.goals) {
    const r = replaceList(notes.goals, update.goals, 'g', LIMITS.goals, counters, tick, rec);
    notes.goals = r.list;
    rec.goalsAdopted = r.adopted;
    rec.goalsDropped = r.dropped;
  }
  if (update.intentions) notes.intentions = replaceList(notes.intentions, update.intentions, 'n', LIMITS.intentions, counters, tick, rec).list;
  if (update.uncertainties) notes.uncertainties = replaceList(notes.uncertainties, update.uncertainties, 'u', LIMITS.uncertainties, counters, tick, rec).list;
  if (update.inferences) notes.inferences = replaceInferences(notes.inferences, update.inferences, refs, counters, tick, rec);
  if (typeof update.journal === 'string') {
    const text = clean(update.journal, LIMITS.journalChars, rec);
    if (text) {
      notes.journal.push({ tick, text });
      while (notes.journal.length > LIMITS.journal) notes.journal.shift();
    } else rec.rejectedEntries++;
  }
  trimToSize(notes, rec);
  if (rec.problems.length > 6) rec.problems.length = 6;
  counters.rejectedEntries += rec.rejectedEntries;
  counters.new += rec.new;
  counters.kept += rec.kept;
  counters.strengthened += rec.strengthened;
  counters.weakened += rec.weakened;
  counters.revised += rec.revised;
  counters.abandoned += rec.abandoned;
  return rec;
}

/** the notes as the model is shown them: everything but the oldest journal entries */
export function notesForPrompt(notes: InhabitantNotes): InhabitantNotes {
  return { ...notes, journal: notes.journal.slice(-LIMITS.journalShown) };
}

export function notesHash(notes: InhabitantNotes | undefined): string {
  return hashString(JSON.stringify(notes ?? null)).toString(16).padStart(8, '0');
}
