// Decision-level attribution over a recorded transcript (docs/INHABITANT.md, section 8): for each decision the model made, which words
// of its stated reason could only have come from its own notes, and whether the option it chose carries out a goal or intention it
// wrote at an earlier ask. This is triage, not a verdict: a word the model coined itself in an earlier note (its paraphrase of something
// it was shown) counts as notes-only here although the fact behind it was in the observation; and a reason can rest on a note without
// reusing its words. It finds the asks worth the counterfactual re-ask (counterfactual.ts), which does decide, at a model's price.
//
// Everything here reads the transcript only: the observation and notes each ask was shown, the proposal, the call's result and its outcome.
import { hasNotes, notesForPrompt } from './memory';
import type { Transcript } from './transcript';

const STOP = new Set(
  (
    'a an the and or but nor so yet for of to in on at by with from into onto over under about above below between among through during before after ' +
    'again against around out off up down than then there here where when while until once only also too very just quite rather really still even ever ' +
    'now soon later right left near nearby away back more most much many some any all both each few other another such same own ' +
    'i me my mine myself we us our ours you your yours he him his she her hers it its they them their theirs this that these those who whom whose which what ' +
    'is am are was were be been being have has had having do does did doing done can could may might must shall should will would ' +
    'not no yes if else because since though although as like get got let make made take took give gave go went come came keep kept ' +
    'one two three first last next new old good bad big small little bit lot way thing things something nothing anything everything ' +
    'while whether maybe perhaps probably likely sure okay well fine'
  ).split(/\s+/),
);

/** the words of a text that carry content: lower-case, three letters or more, not in the stop list; each once, in order of first use */
export function contentWords(text: string): string[] {
  const seen = new Set<string>();
  for (const w of text.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z]+/)) if (w.length >= 3 && !STOP.has(w)) seen.add(w);
  return Array.from(seen);
}

/** a stem that tolerates inflection: build/building, chop/chopped, stall/stalled */
function stem(w: string): string {
  return w.length <= 5 ? w : w.slice(0, Math.max(5, w.length - 3));
}

function sharesStem(a: string, b: string): boolean {
  const x = stem(a);
  const y = stem(b);
  return x.startsWith(y) || y.startsWith(x);
}

/** does a lower-cased text mention the word, allowing for inflection? */
export function mentions(text: string, word: string): boolean {
  return new RegExp(`\\b${stem(word)}`).test(text);
}

export interface Pursued {
  kind: 'goal' | 'intention';
  id: string;
  text: string;
  /** the tick the note was written */
  since: number;
  /** how many asks before this one the note was written (1: at the decision just before) */
  asksAgo: number;
  /** how the chosen option was matched to the note: a place or person reference, or shared words */
  via: 'reference' | 'words';
}

export interface AskAttribution {
  seq: number;
  tick: number;
  options: number;
  chosen: string | null;
  label: string | null;
  result: string | null;
  outcome: string | null;
  why: string;
  /** content words of the reason found in the notes shown and nowhere in the observation */
  notesOnly: string[];
  /** content words of the reason found in neither (the model's own paraphrase, or invention) */
  unaccounted: string[];
  /** content words of the reason found in the observation */
  inObservation: number;
  /** a goal or intention from an earlier ask that the chosen option carries out */
  pursues: Pursued | null;
  /** worth the counterfactual re-ask: notes-only words, or a pursued note */
  candidate: boolean;
}

export interface Attribution {
  person: string;
  protocol: string;
  memory: boolean;
  asks: AskAttribution[];
  summary: { decisions: number; candidates: number; withNotesOnlyWords: number; pursuingByReference: number; pursuingByWords: number; unaccounted: number };
}

const REF = /\[?(?:place|person|seen):(\d+)\]?/g;

/** the goal or intention the chosen option carries out, if any: by a place or person reference first, else by shared words */
function pursuedBy(
  option: { key: string; label: string; goal?: string; target?: string | null },
  notes: { goals: { id: string; text: string; since: number }[]; intentions: { id: string; text: string; since: number }[] },
  firstSeen: Map<string, number>,
  askIndex: number,
): Pursued | null {
  const targetId = /^[a-z_]+:(\d+)/.exec(option.key)?.[1] ?? null;
  const optionWords = contentWords(`${option.label} ${option.goal ?? ''} ${option.target ?? ''}`);
  let best: Pursued | null = null;
  const consider = (kind: 'goal' | 'intention', e: { id: string; text: string; since: number }): void => {
    const asksAgo = askIndex - (firstSeen.get(e.id) ?? askIndex) + 1;
    const refs = Array.from(e.text.matchAll(REF), (m) => m[1]);
    if (targetId && refs.includes(targetId)) {
      if (!best || best.via === 'words' || asksAgo > best.asksAgo) best = { kind, id: e.id, text: e.text, since: e.since, asksAgo, via: 'reference' };
      return;
    }
    const noteWords = contentWords(e.text);
    const shared = noteWords.filter((n) => optionWords.some((o) => sharesStem(n, o)));
    const name = shared.some((w) => new RegExp(`\\b${w[0]!.toUpperCase()}${w.slice(1)}`).test(e.text));
    if (shared.length >= 2 || (shared.length === 1 && name)) {
      if (!best || (best.via === 'words' && asksAgo > best.asksAgo)) best = { kind, id: e.id, text: e.text, since: e.since, asksAgo, via: 'words' };
    }
  };
  for (const g of notes.goals) consider('goal', g);
  for (const g of notes.intentions) consider('intention', g);
  return best;
}

export function attribute(t: Transcript): Attribution {
  const firstSeen = new Map<string, number>();
  const asks: AskAttribution[] = [];
  t.asks.forEach((ask, i) => {
    if (ask.notes) for (const e of [...ask.notes.goals, ...ask.notes.intentions]) if (!firstSeen.has(e.id)) firstSeen.set(e.id, i);
    if (!ask.proposal) return;
    const why = ask.proposal.why ?? '';
    const shown = hasNotes(ask.notes) ? notesForPrompt(ask.notes) : null;
    const obsText = JSON.stringify(ask.observation).toLowerCase();
    const notesText = shown ? JSON.stringify(shown).toLowerCase() : '';
    const notesOnly: string[] = [];
    const unaccounted: string[] = [];
    let inObservation = 0;
    for (const w of contentWords(why)) {
      if (mentions(obsText, w)) inObservation++;
      else if (shown && mentions(notesText, w)) notesOnly.push(w);
      else unaccounted.push(w);
    }
    const call = t.calls.find((c) => c.ask === ask.seq && c.choice.kind !== 'defer');
    const outcome = call ? t.outcomes.find((o) => o.call === call.seq) : undefined;
    const option = ask.observation.options.find((o) => o.key === ask.proposal!.choose);
    const pursues = shown && option ? pursuedBy(option, shown, firstSeen, i) : null;
    asks.push({
      seq: ask.seq,
      tick: ask.tick,
      options: ask.observation.options.length,
      chosen: ask.proposal.choose,
      label: option?.label ?? null,
      result: call?.result ? (call.result.status === 'applied' ? 'applied' : call.result.status === 'rejected' ? `refused: ${call.result.reason ?? ''}` : `engine chose ${call.result.label ?? ''}`) : null,
      outcome: outcome ? `${outcome.outcome}${outcome.detail ? ` (${outcome.detail})` : ''}` : null,
      why,
      notesOnly,
      unaccounted,
      inObservation,
      pursues,
      candidate: notesOnly.length > 0 || pursues !== null,
    });
  });
  return {
    person: t.header.personName,
    protocol: t.header.protocol,
    memory: t.header.memory !== undefined,
    asks,
    summary: {
      decisions: asks.length,
      candidates: asks.filter((a) => a.candidate).length,
      withNotesOnlyWords: asks.filter((a) => a.notesOnly.length > 0).length,
      pursuingByReference: asks.filter((a) => a.pursues?.via === 'reference').length,
      pursuingByWords: asks.filter((a) => a.pursues?.via === 'words').length,
      unaccounted: asks.reduce((n, a) => n + a.unaccounted.length, 0),
    },
  };
}

/** the asks worth a counterfactual re-ask */
export function candidateAsks(t: Transcript): number[] {
  return attribute(t)
    .asks.filter((a) => a.candidate)
    .map((a) => a.seq);
}

export function renderAttribution(a: Attribution): string {
  const lines: string[] = [];
  lines.push(`attribution: ${a.person}, ${a.protocol}${a.memory ? ' (notes)' : ' (no notes)'}: ${a.summary.decisions} decisions, ${a.summary.candidates} candidates for the counterfactual re-ask`);
  lines.push(`  ${a.summary.withNotesOnlyWords} with words found only in the notes; ${a.summary.pursuingByReference} carrying out a noted goal or intention by its place reference (strong), ${a.summary.pursuingByWords} by shared words (weak); ${a.summary.unaccounted} reason words found in neither (the model's own wording)`);
  lines.push('');
  for (const x of a.asks) {
    const mark = x.candidate ? '*' : ' ';
    lines.push(`${mark} ask ${x.seq} t${x.tick}  ${x.chosen ?? '-'}${x.label ? ` (${x.label})` : ''}  ${x.result ?? ''}${x.outcome ? ` -> ${x.outcome}` : ''}`);
    lines.push(`    why: ${x.why}`);
    lines.push(`    words: ${x.inObservation} in the observation${x.notesOnly.length ? `, only in the notes: ${x.notesOnly.join(', ')}` : ''}${x.unaccounted.length ? `, in neither: ${x.unaccounted.join(', ')}` : ''}`);
    if (x.pursues) lines.push(`    carries out ${x.pursues.kind} ${x.pursues.id} written ${x.pursues.asksAgo} ask${x.pursues.asksAgo === 1 ? '' : 's'} earlier (t${x.pursues.since}, ${x.pursues.via === 'reference' ? 'by its place reference' : 'by shared words, weak'}): "${x.pursues.text}"`);
  }
  return lines.join('\n');
}
