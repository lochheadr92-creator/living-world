import { describe, expect, it } from 'vitest';
import { makeSource } from '../src/sim/sources';
import type { Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, learn, pin, stage } from './helpers/kit';

// Two equally hungry people go for the one berry on the same tick and reach it on the same tick, in a crowd of fifteen. They are
// tied in everything but the order the world happens to call them in: whoever is called first claims the berry, and the other
// finds out ("someone else is already taking it"). A fair world does not let the order of the list decide who that is: over many
// such ties the person listed first should win about half of them, and swapping the two people's places in the list should not
// change who wins (the winner follows the person, not the slot).
//
// Today the world walks the list from a different starting point each tick, in list order, so of two people listed next to each
// other the first is called first on 14 ticks out of 15 (93%), and swapping their places swaps the winner. Both checks that
// ought to hold are expected to fail until the claim order is hashed per tick (Stage 8): `it.fails` keeps the failure on record
// and turns red the day it is fixed, as a reminder to make them ordinary tests.
//
// A tie has to be exact to count. Two people never walk quite the same distance (each stands in a slightly different place at
// the bush), so each tie is built by measurement: each contestant's walk is timed alone, and whoever would arrive first
// is held back for the difference, so that both reach the berry on the same tick. A tie that does not come out exact is dropped.

const TRIALS = 240;
const NEEDED = 200;
const BX = 40.5;
const BY = 36.5;

interface Setup {
  w: World;
  a: Person;
  b: Person;
  crowd: Person[];
  bush: ReturnType<typeof makeSource>;
}

/** The scene for trial `i`: `who` = who is there ('both', or one alone for timing his walk). */
function build(i: number, who: 'both' | 'a' | 'b'): Setup {
  const s = stage('tie-' + i);
  const d = 3 + i * 0.027;
  const a = addPerson(s, 'Aa', BX - d, BY, { hunger: 18 });
  const b = addPerson(s, 'Bb', BX + d, BY, { sex: 'm', hunger: 18 });
  const crowd: Person[] = [];
  for (let k = 0; k < 13; k++) crowd.push(addPerson(s, 'X' + k, 6 + k * 5, 62, { hunger: 95 }));
  const bush = makeSource(s.w, 'berry_bush', Math.floor(BX), Math.floor(BY), 1);
  const w = done(s);
  for (const o of crowd) pin(o);
  if (who === 'a') pin(b);
  if (who === 'b') pin(a);
  learn(w, a, bush);
  learn(w, b, bush);
  bush.regrowTimer = -1e9; // the berry is not to grow back while they race for it
  return { w, a, b, crowd, bush };
}

/** The first tick a person is at work on the bush (counted in the tick that was being stepped), or -1. */
const workStart = (p: Person, bushId: number, w: World, was: number): number => (was < 0 && p.activity?.kind === 'gather' && p.activity.targetId === bushId && p.activity.phase === 'work' ? w.tick - 1 : was);

/** How many ticks after being told to decide `p` begins work on the bush, when nobody else is in the way. */
function walkTime(i: number, who: 'a' | 'b'): number {
  const { w, a, b, bush } = build(i, who);
  const p = who === 'a' ? a : b;
  p.nextThink = w.tick;
  let start = -1;
  for (let t = 0; t < 200 && start < 0; t++) {
    stepWorld(w);
    start = workStart(p, bush.id, w, start);
  }
  return start;
}

interface Tie {
  /** 'first': the winner is listed ahead of the loser in the array */
  slot: 'first' | 'second';
  /** the winner, by name */
  who: 'Aa' | 'Bb';
}

/** One exact tie, or null if it did not come out exact. */
function tie(i: number, swapSlots: boolean): Tie | null {
  const ta = walkTime(i, 'a');
  const tb = walkTime(i, 'b');
  if (ta < 0 || tb < 0) return null;
  const { w, a, b, bush } = build(i, 'both');
  if (swapSlots) {
    const x = w.persons.indexOf(a);
    const y = w.persons.indexOf(b);
    [w.persons[x], w.persons[y]] = [w.persons[y], w.persons[x]];
  }
  // each decides when told: the quicker walker is held back so both arrive on the same tick
  const decide = w.tick + i;
  a.nextThink = decide + Math.max(0, tb - ta);
  b.nextThink = decide + Math.max(0, ta - tb);
  let sa = -1;
  let sb = -1;
  for (let t = 0; t < i + 200; t++) {
    stepWorld(w);
    sa = workStart(a, bush.id, w, sa);
    sb = workStart(b, bush.id, w, sb);
  }
  // exactly one of them got to work, and the other was told on the same tick that someone else had it
  const winner = sa >= 0 && sb < 0 ? a : sb >= 0 && sa < 0 ? b : null;
  if (!winner) return null;
  const loser = winner === a ? b : a;
  const failure = loser.failures[bush.id];
  if (!failure || failure.tick !== (winner === a ? sa : sb)) return null;
  return { slot: w.persons.indexOf(winner) < w.persons.indexOf(loser) ? 'first' : 'second', who: winner.name as Tie['who'] };
}

const memo = new Map<boolean, (Tie | null)[]>();
/** every trial, once per arrangement of the two people in the list (the three checks below share the runs) */
function tally(swapSlots: boolean): (Tie | null)[] {
  let out = memo.get(swapSlots);
  if (!out) {
    out = [];
    for (let i = 0; i < TRIALS; i++) out.push(tie(i, swapSlots));
    memo.set(swapSlots, out);
  }
  return out;
}

describe('a tie for the last berry is not settled by where people stand in the list', () => {
  it('measures what it claims to: at least 200 exact ties, in a crowd of fifteen, each settled by the claim alone', () => {
    const ties = tally(false).filter((t): t is Tie => t !== null);
    expect(ties.length, 'exact ties').toBeGreaterThanOrEqual(NEEDED);
    // both people win some: nobody is favoured by anything but the order (the walk was equalised, and each tie is exact)
    expect(new Set(ties.map((t) => t.who)).size).toBe(2);
  }, 300_000);

  it.fails('the person listed first wins at most 60% of the ties', () => {
    const ties = tally(false).filter((t): t is Tie => t !== null);
    const first = ties.filter((t) => t.slot === 'first').length / ties.length;
    expect(first).toBeLessThanOrEqual(0.6);
  }, 300_000);

  it.fails('swapping the two people’s places in the list does not change who wins', () => {
    const before = tally(false);
    const after = tally(true);
    const both = before.map((t, i) => (t && after[i] ? [t, after[i] as Tie] : null)).filter((x): x is [Tie, Tie] => x !== null);
    expect(both.length).toBeGreaterThanOrEqual(NEEDED);
    const same = both.filter(([x, y]) => x.who === y.who).length / both.length;
    expect(same).toBeGreaterThanOrEqual(0.9);
  }, 600_000);
});
