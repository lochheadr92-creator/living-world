// Attribution (src/agent/attribute.ts) and the counterfactual re-ask (src/agent/counterfactual.ts): the tools that say, from a recorded
// transcript, which decisions rested on the notes, and then test that at the model's price with the pairing kept exact.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { attribute, candidateAsks, contentWords, mentions, notedIds, renderAttribution } from '../src/agent/attribute';
import { counterfactual, majority, renderCounterfactual } from '../src/agent/counterfactual';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { runLive } from '../src/agent/run';
import { goalKeeperModel, pickerModel } from '../src/agent/stubs';
import type { Transcript } from '../src/agent/transcript';
import { natural, run } from './helpers/util';

const DAY = 2400;
const memoryRun = (): Transcript => JSON.parse(readFileSync('experiments/memory-pavel-gpt5/transcript.json', 'utf8')) as Transcript;
const baselineRun = (): Transcript => JSON.parse(readFileSync('experiments/baseline-pavel-gpt5/transcript.json', 'utf8')) as Transcript;
const tomasRun = (): Transcript => JSON.parse(readFileSync('experiments/harsh6-tomas-gpt5/transcript.json', 'utf8')) as Transcript;

describe('attribution', () => {
  it('reads content words and tolerates inflection', () => {
    expect(contentWords("I'm right by Thistle's hut and can add quick progress")).toEqual(['thistle', 'hut', 'add', 'quick', 'progress']);
    expect(mentions('"label":"chopping wood to keep the fire going"', 'chop')).toBe(true);
    expect(mentions('"label":"chopping wood"', 'chopped')).toBe(true);
    expect(mentions('the site is waiting for materials', 'stalled')).toBe(false);
    expect(notedIds('Pick berries at bush 808, then help at the hut [place:2077]; at t2523 Dov was 88% sound')).toEqual(['2077', '808']);
  });

  it('on the recorded memory run: five decisions, two weak candidates and no strong one; the wood-chopping one rested on the observation', () => {
    const a = attribute(memoryRun());
    expect(a.memory).toBe(true);
    expect(a.summary.decisions).toBe(5);
    expect(a.asks[0]!.candidate).toBe(false); // the notebook was still empty
    // the build at ask 2 carries out the intention written at ask 1 (shared words with the option: weak), and ask 1 reuses the notes' words
    const build = a.asks.find((x) => x.chosen === 'build:2077')!;
    expect(build.pursues).not.toBeNull();
    expect(build.pursues!.kind).toBe('intention');
    expect(build.pursues!.via).toBe('words');
    expect(build.pursues!.asksAgo).toBe(1);
    expect(build.candidate).toBe(false);
    expect(build.weak).toBe(true);
    expect(a.asks.find((x) => x.chosen === 'haul:2077')!.notesOnly.length).toBeGreaterThan(0);
    expect(a.summary.candidates).toBe(0);
    expect(a.summary.weak).toBe(2);
    expect(candidateAsks(memoryRun())).toEqual([]);
    expect(candidateAsks(memoryRun(), 'weak')).toEqual([1, 2]);
    expect(candidateAsks(memoryRun(), 'all')).toEqual([0, 1, 2, 3, 4]);
    // the chop at ask 3: its reason ("stalled for lack of wood") answers the fresh partial-build result; the notes it was shown still
    // said the site had materials, so nothing in the reason is the notes' and the chosen option carries out no noted intention
    const chop = a.asks.find((x) => x.chosen === 'gather:270')!;
    expect(chop.notesOnly).toEqual([]);
    expect(chop.pursues).toBeNull();
    expect(chop.candidate).toBe(false);
    expect(chop.weak).toBe(false);
    const text = renderAttribution(a);
    expect(text).toMatch(/5 decisions, 0 strong candidates .*, 2 weak/);
    expect(text).toMatch(/~ ask 2 /);
    expect(text).toMatch(/carries out intention n11/);
  });

  it('on the six-day Tomas run: the notes named a target at 58 decisions and the choice was one of them at 6, the strong candidates', () => {
    const a = attribute(tomasRun());
    expect(a.summary.decisions).toBe(82);
    expect(a.summary.plans).toEqual({ named: 58, followed: 6 });
    expect(candidateAsks(tomasRun())).toEqual([24, 51, 59, 60, 75, 79]);
    for (const seq of candidateAsks(tomasRun())) {
      const x = a.asks.find((y) => y.seq === seq)!;
      expect(x.pursues!.via).toBe('reference');
      expect(x.plannedTarget).toBe(true);
    }
    expect(a.summary.weak).toBeGreaterThan(40); // the weak signals are no help on a run with one vocabulary
  });

  it('on the recorded no-memory run: nothing can be attributed to notes', () => {
    const a = attribute(baselineRun());
    expect(a.memory).toBe(false);
    expect(a.summary.decisions).toBe(5);
    expect(a.summary.candidates).toBe(0);
    for (const x of a.asks) {
      expect(x.notesOnly).toEqual([]);
      expect(x.pursues).toBeNull();
    }
  });

  it('on the goal keeper: every pursued choice is attributed to the goal, by its place reference', async () => {
    const w = natural('meadow');
    run(w, DAY);
    const p = w.persons.find((q) => q.name === 'Pavel')!;
    const m = await runLive(w, p.id, goalKeeperModel(), { until: DAY + 700, memory: true });
    const a = attribute(m.transcript);
    const firstOf = (seq: number) => m.transcript.asks[seq]!.observation.options[0]!.key;
    const pursued = a.asks.filter((x) => x.chosen !== null && x.chosen !== firstOf(x.seq));
    expect(pursued.length).toBeGreaterThan(0);
    for (const x of pursued) {
      expect(x.pursues).not.toBeNull();
      expect(x.pursues!.kind).toBe('goal');
      expect(x.pursues!.via).toBe('reference');
      expect(x.pursues!.asksAgo).toBeGreaterThanOrEqual(1);
      expect(x.candidate).toBe(true);
      expect(x.plannedTarget).toBe(true);
    }
    expect(a.summary.pursuingByReference).toBe(pursued.length);
    expect(a.summary.plans.followed).toBeGreaterThanOrEqual(pursued.length);
    // the same world under a model that keeps no notes: nothing to attribute
    const w2 = natural('meadow');
    run(w2, DAY);
    const n = await runLive(w2, p.id, pickerModel('first'), { until: DAY + 700 });
    expect(attribute(n.transcript).summary.candidates).toBe(0);
  }, 120_000);
});

describe('the counterfactual re-ask', () => {
  /** a model that takes the last option when it is shown its notes and the first when it is not */
  const swayed = stubModel('swayed', (req) => {
    const o = observationFromPrompt(req.user)!;
    const notes = req.user.includes('<your_notes>');
    return JSON.stringify({ choose: notes ? o.options[o.options.length - 1]!.key : o.options[0]!.key, why: notes ? 'as my notes say' : 'as I see it' });
  });

  it('puts the recorded observation to the model with and without notes, and reports where the choice moves', async () => {
    const t = memoryRun();
    const c = await counterfactual(t, [0, 3], swayed, { repeats: 2 });
    expect(c.repeats).toBe(2);
    expect(c.asks.length).toBe(2);
    // ask 0 had no notes: one arm only, nothing to decide
    expect(c.asks[0]!.with).toBeNull();
    expect(c.asks[0]!.shift).toBeNull();
    expect(c.asks[0]!.without.choices).toEqual([t.asks[0]!.observation.options[0]!.key, t.asks[0]!.observation.options[0]!.key]);
    // ask 3 had notes: both arms, and this model moves
    const a3 = c.asks[1]!;
    const opts = t.asks[3]!.observation.options;
    expect(a3.with!.choices).toEqual([opts[opts.length - 1]!.key, opts[opts.length - 1]!.key]);
    expect(a3.without.choices).toEqual([opts[0]!.key, opts[0]!.key]);
    expect(a3.majorityWith).toBe(opts[opts.length - 1]!.key);
    expect(a3.majorityWithout).toBe(opts[0]!.key);
    expect(a3.shift).toBe(true);
    expect(c.shifts).toBe(1);
    expect(c.undecided).toBe(0);
    expect(c.answered).toBe(6);
    expect(c.calls).toBe(2 + 4);
    const text = renderCounterfactual(c);
    expect(text).toMatch(/1 of 1 decided asks shift/);
    expect(text).toMatch(/1 had no notes to take away/);
    expect(text).toMatch(/\* ask 3 /);
    expect(text).toMatch(/a reason without notes: as I see it/);
  });

  it('a model that ignores its notes shows no shift; --no-both runs one arm; a failed call is a null choice', async () => {
    const t = memoryRun();
    const steady = await counterfactual(t, [3], pickerModel('first'), { repeats: 3 });
    expect(steady.asks[0]!.shift).toBe(false);
    expect(steady.calls).toBe(6);
    const one = await counterfactual(t, [3], pickerModel('first'), { repeats: 2, both: false });
    expect(one.asks[0]!.with).toBeNull();
    expect(one.calls).toBe(2);
    const broken = stubModel('broken', () => 'not json');
    const b = await counterfactual(t, [3], broken, { repeats: 1 });
    expect(b.asks[0]!.without.choices).toEqual([null]);
    expect(b.asks[0]!.without.problems[0]).toMatch(/JSON/);
    // a run in which nothing was answered is no result, never "0 shift"
    expect(b.answered).toBe(0);
    expect(b.shifts).toBe(0);
    expect(b.undecided).toBe(1);
    expect(b.asks[0]!.shift).toBeNull();
    const failed = renderCounterfactual(b);
    expect(failed.startsWith('NO RESULT:')).toBe(true);
    expect(failed).toMatch(/2 calls, none answered/);
    expect(failed).not.toMatch(/of \d+ decided asks shift/);
    expect(failed).toMatch(/\? ask 3 .*\(undecided\)/);
    // one arm failing (as a rate limit would) leaves the ask undecided, and the header says so
    const lopsided = stubModel('lopsided', (req) => (req.user.includes('<your_notes>') ? JSON.stringify({ choose: t.asks[3]!.observation.options[0]!.key }) : 'not json'));
    const l = await counterfactual(t, [3], lopsided, { repeats: 2 });
    expect(l.answered).toBe(2);
    expect(l.undecided).toBe(1);
    expect(l.asks[0]!.shift).toBeNull();
    expect(renderCounterfactual(l)).toMatch(/0 of 0 decided asks shift when the notes are taken away; 1 undecided/);
    expect(() => majority([])).not.toThrow();
    expect(majority(['a', 'b', 'b', null])).toBe('b');
    expect(majority(['b', 'a'])).toBe('a'); // a tie goes to the first by name
    await expect(counterfactual(t, [99], pickerModel('first'))).rejects.toThrow(/no ask #99/);
  });
});
