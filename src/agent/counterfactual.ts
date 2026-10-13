// The counterfactual re-ask (docs/INHABITANT.md, section 8): put the very observation a recorded decision was made on to the model
// again, several times, with its notes and without, and see whether the choice moves. The pairing is exact (same observation, same
// refused picks), which a second full run cannot give: the model is not deterministic, so two runs part at their first differing choice.
// Nothing runs in the world; the transcript's asks are the whole input. The with-notes arm measures the model's own variance, so a
// difference between the arms is read against it, not against one draw.
import { DAY } from '../sim/constants';
import { hasNotes, notesForPrompt } from './memory';
import { ModelGate } from './model';
import type { Budget, GateDeps, ModelClient } from './model';
import { buildPrompt, parseProposal } from './protocol';
import type { Transcript } from './transcript';

export interface Arm {
  notes: boolean;
  /** the key chosen on each repeat; null when the call failed or the answer was unusable */
  choices: (string | null)[];
  whys: (string | null)[];
  problems: (string | null)[];
  outputTokens: number;
  latencyMs: number;
}

export interface CounterfactualAsk {
  seq: number;
  tick: number;
  options: number;
  recorded: string | null;
  with: Arm | null;
  without: Arm;
  majorityWith: string | null;
  majorityWithout: string | null;
  /** the arms' most common choices differ. Null when there is nothing to decide: the ask had no notes to take away, or an arm got no
   * usable answer at all (a failed run is no result, never a null result). */
  shift: boolean | null;
}

export interface Counterfactual {
  person: string;
  model: string;
  repeats: number;
  asks: CounterfactualAsk[];
  calls: number;
  /** calls that came back with a usable proposal */
  answered: number;
  shifts: number;
  /** asks with notes where an arm got no usable answer: nothing can be said about them */
  undecided: number;
}

export function majority(choices: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const c of choices) if (c !== null) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    if (v > n) {
      best = k;
      n = v;
    }
  }
  return best;
}

export interface CounterfactualOptions {
  repeats?: number;
  /** also re-ask with the notes, to measure the model's own variance (default true where the ask had notes) */
  both?: boolean;
  budget?: Budget;
  deps?: GateDeps;
  /** called after each model call (progress) */
  onCall?: (done: number, total: number) => void;
}

export async function counterfactual(t: Transcript, seqs: number[], model: ModelClient, opts: CounterfactualOptions = {}): Promise<Counterfactual> {
  const repeats = Math.max(1, Math.round(opts.repeats ?? 3));
  const both = opts.both ?? true;
  const gate = new ModelGate(model, opts.budget, opts.deps);
  const asks = seqs.map((s) => {
    const a = t.asks[s];
    if (!a) throw new Error(`the transcript has no ask #${s}`);
    return a;
  });
  const total = asks.reduce((n, a) => n + repeats * (both && hasNotes(a.notes) ? 2 : 1), 0);
  let done = 0;
  const results: CounterfactualAsk[] = [];
  for (const ask of asks) {
    const arm = async (notes: boolean): Promise<Arm> => {
      const prompt = buildPrompt({ observation: ask.observation, rejected: ask.rejected, notes: notes && hasNotes(ask.notes) ? notesForPrompt(ask.notes) : null, memory: notes });
      const out: Arm = { notes, choices: [], whys: [], problems: [], outputTokens: 0, latencyMs: 0 };
      for (let i = 0; i < repeats; i++) {
        const r = await gate.call(prompt, Math.floor(ask.tick / DAY));
        done++;
        opts.onCall?.(done, total);
        out.latencyMs += r.latencyMs;
        if (!r.ok) {
          out.choices.push(null);
          out.whys.push(null);
          out.problems.push(r.reason);
          continue;
        }
        out.outputTokens += r.reply.usage?.output ?? 0;
        const parsed = parseProposal(r.reply.text);
        if (!parsed.proposal) {
          out.choices.push(null);
          out.whys.push(null);
          out.problems.push(parsed.problem);
          continue;
        }
        // a key not on offer is recorded as what it is: the model's answer, which the engine would have refused
        out.choices.push(parsed.proposal.choose);
        out.whys.push(parsed.proposal.why ?? null);
        out.problems.push(ask.observation.options.some((o) => o.key === parsed.proposal!.choose) ? null : 'not among the options');
      }
      return out;
    };
    const withNotes = both && hasNotes(ask.notes) ? await arm(true) : null;
    const without = await arm(false);
    const majorityWith = withNotes ? majority(withNotes.choices) : null;
    const majorityWithout = majority(without.choices);
    results.push({
      seq: ask.seq,
      tick: ask.tick,
      options: ask.observation.options.length,
      recorded: ask.proposal?.choose ?? null,
      with: withNotes,
      without,
      majorityWith,
      majorityWithout,
      shift: withNotes === null || majorityWith === null || majorityWithout === null ? null : majorityWith !== majorityWithout,
    });
  }
  const answered = results.reduce((n, r) => n + [...(r.with?.choices ?? []), ...r.without.choices].filter((c) => c !== null).length, 0);
  return {
    person: t.header.personName,
    model: model.id,
    repeats,
    asks: results,
    calls: gate.calls,
    answered,
    shifts: results.filter((r) => r.shift === true).length,
    undecided: results.filter((r) => r.with !== null && r.shift === null).length,
  };
}

function tally(arm: Arm): string {
  const counts = new Map<string, number>();
  for (const c of arm.choices) counts.set(c ?? '(none)', (counts.get(c ?? '(none)') ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k} x${v}`)
    .join(', ');
}

export function renderCounterfactual(c: Counterfactual): string {
  const lines: string[] = [];
  const decided = c.asks.filter((a) => a.shift !== null).length;
  const noNotes = c.asks.filter((a) => a.with === null).length;
  if (c.answered === 0) {
    // every call failed: say so in the first line, in words no summary can mistake for a finding
    const why = Array.from(new Set(c.asks.flatMap((a) => [...(a.with?.problems ?? []), ...a.without.problems]).filter((p): p is string => p !== null))).slice(0, 2);
    lines.push(`NO RESULT: counterfactual re-ask of ${c.person} by ${c.model}: ${c.calls} calls, none answered${why.length ? ` (${why.join('; ')})` : ''}. This says nothing about the notes.`);
  } else {
    lines.push(
      `counterfactual re-ask: ${c.person}, ${c.model}, ${c.repeats} repeats per arm, ${c.calls} calls (${c.answered} answered); ${c.shifts} of ${decided} decided asks shift when the notes are taken away` +
        `${c.undecided ? `; ${c.undecided} undecided (an arm got no usable answer)` : ''}${noNotes ? `; ${noNotes} had no notes to take away` : ''}`,
    );
  }
  lines.push('');
  for (const a of c.asks) {
    const mark = a.shift === true ? '*' : a.shift === null && a.with !== null ? '?' : ' ';
    lines.push(`${mark} ask ${a.seq} t${a.tick}  recorded ${a.recorded ?? '-'} of ${a.options} options${a.shift === null && a.with !== null ? '  (undecided)' : ''}`);
    if (a.with) lines.push(`    with notes:    ${tally(a.with)}`);
    lines.push(`    without notes: ${tally(a.without)}`);
    const why = a.without.whys.find((w) => w) ?? null;
    if (why) lines.push(`    a reason without notes: ${why}`);
    const problems = [...(a.with?.problems ?? []), ...a.without.problems].filter((p): p is string => p !== null);
    if (problems.length) lines.push(`    problems: ${Array.from(new Set(problems)).join('; ')}`);
  }
  return lines.join('\n');
}
