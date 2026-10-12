// Two chains from a real event to a later, different decision. Each link is read off state the engine set, and each chain is a PAIRED
// case: the same world, the same seed, one thing changed, the actions compared. Changed notes or counters would not count.
import { describe, expect, it } from 'vitest';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { observe, putBelief } from '../src/sim/knowledge';
import { tellBelief } from '../src/sim/news';
import { makeSource } from '../src/sim/sources';
import { stepWorld } from '../src/sim/world';
import type { Belief, Person, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

const WOLF = 970001;

/**
 * One forager and two bushes she knows: a nearer one she prefers, and a further one. A wolf, when there is one, is put 6 tiles from
 * the nearer bush and 14 from her: inside dangerAt's 10-tile reach (so the bush beside it is worth less) but outside her flee radius
 * of 12.5 (so nothing is overridden). The warning therefore has to work through the ordinary ranking, not through the danger guard.
 */
function twoBushes(seed: string) {
  const s = stage(seed);
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { hunger: 45, thirst: 90, energy: 90 });
  // the same two people in both arms of the pair, so the only difference is whether anything is said
  const ben = addPerson(s, 'Ben', 41.5, 40.5, { sex: 'm', hunger: 90, thirst: 90, energy: 90 });
  const near = makeSource(s.w, 'berry_bush', 48, 40, 9);
  const far = makeSource(s.w, 'berry_bush', 31, 40, 9);
  const w = done(s);
  observe(w, ana, near);
  observe(w, ana, far);
  return { w, ana, ben, near, far };
}

const bestGather = (w: World, p: Person): string => {
  const ranked = rankOptions(generateOptions(w, p, true));
  return ranked.find((o) => o.key.startsWith('gather:'))?.key ?? '';
};

describe('a warning reaches a later decision', () => {
  it('being told about a wolf by the near bush turns the forager to the far one; without the telling she goes to the near one', () => {
    // control: nobody tells her anything
    const a = twoBushes('chain-warn-control');
    const controlPick = bestGather(a.w, a.ana);
    expect(controlPick, 'she should want a bush').toBe(`gather:${a.near.id}`);

    // the same world, the same seed: one wolf, told to her by a neighbour through the engine's own transfer
    const b = twoBushes('chain-warn-control');
    const teller = b.ben;
    const wolf: Belief = { id: WOLF, kind: 'danger', x: 54.5, y: 40.5, amount: 1, max: 1, seen: b.w.tick, src: 'seen', from: 0, learned: b.w.tick };
    putBelief(teller, { ...wolf });
    const landed = tellBelief(b.w, teller, b.ana, teller.beliefs[WOLF]);

    // link 1: the information really passed, as hearsay, with its source
    expect(landed, 'the warning was new to her').toBe(true);
    expect(b.ana.beliefs[WOLF]?.src).toBe('told');
    expect(b.ana.beliefs[WOLF]?.from).toBe(teller.id);
    // link 2: it cost her something real — the engine lowers her sense of safety on being warned
    expect(b.ana.needs.safety).toBeLessThan(a.ana.needs.safety);
    // link 3: the later decision is a different one, and it is the far bush she turns to
    const warnedRanked = rankOptions(generateOptions(b.w, b.ana, true));
    // it is the ranking that changed, not the guard: fleeing is not on offer, so nothing was overridden
    expect(warnedRanked.some((o) => o.kind === 'flee'), 'the wolf is outside her flee radius').toBe(false);
    const warnedPick = warnedRanked.find((o) => o.key.startsWith('gather:'))?.key ?? '';
    expect(warnedPick).not.toBe(controlPick);
    expect(warnedPick).toBe(`gather:${b.far.id}`);
    // and the bush beside the wolf is worth measurably less to her than it was
    const before = rankOptions(generateOptions(a.w, a.ana, true)).find((o) => o.key === `gather:${a.near.id}`)!.util;
    const after = warnedRanked.find((o) => o.key === `gather:${b.near.id}`)!.util;
    expect(after).toBeLessThan(before);
  });
});

describe('a source running out reaches a later decision', () => {
  it('she empties the near bush, records it as empty, and goes to the far one next; the near bush is no longer worth offering', () => {
    const { w, ana, near, far } = twoBushes('chain-depletion');
    const firstPick = bestGather(w, ana);
    expect(firstPick).toBe(`gather:${near.id}`);

    // link 1: the bush is really emptied — by the world, not by the test
    for (let i = 0; i < 4000 && near.amount > 0; i++) stepWorld(w);
    expect(near.amount, 'the near bush should be picked clean').toBe(0);

    // link 2: what she knows of it says so, from having been there
    observe(w, ana, near);
    expect(ana.beliefs[near.id]?.amount).toBe(0);
    expect(ana.beliefs[near.id]?.src).toBe('seen');

    // link 3: the next choice is a different place — the one she remembers still has some
    const nextPick = bestGather(w, ana);
    expect(nextPick).not.toBe(firstPick);
    expect(nextPick).toBe(`gather:${far.id}`);
    expect(ana.beliefs[far.id]?.amount).toBeGreaterThan(0);
  });
});
