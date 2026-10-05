import { describe, expect, it } from 'vitest';
import { LOAN_TERM } from '../src/sim/constants';
import { lendTool, toolById } from '../src/sim/tools';
import type { Commitment, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, give, stage } from './helpers/kit';
import { expectSameWorld, reloaded } from './helpers/resume';
import { natural, person, run, scene } from './helpers/util';

// A save can be taken at any moment, so it has to be taken in the middle of things: a person halfway along a path, two people
// halfway through a conversation, a promise under way, a tool out on loan, a batch in the kiln, a house half up. Each test
// takes the world at such a moment, saves it, loads the copy, carries both on for the same number of ticks, and requires the
// whole serialised world (not only its fingerprint) and the rebuilt indexes to be the same.

/** Step until the world is in the state the test names (never more than `limit` ticks). */
function until(w: World, when: (w: World) => boolean, limit: number, what: string): void {
  for (let i = 0; i < limit && !when(w); i++) stepWorld(w);
  expect(when(w), `${what} within ${limit} ticks`).toBe(true);
}

/** Save the world now, load the copy, run both on `more` ticks: they must be the same world. */
function resumesCleanly(w: World, still: (w: World) => boolean, more: number): void {
  const copy = reloaded(w);
  expect(still(copy), 'the loaded copy is in the same state as the one saved').toBe(true);
  run(w, more);
  run(copy, more);
  expectSameWorld(w, copy);
}

const midWalk = (w: World): boolean => w.persons.some((p) => p.activity?.phase === 'travel' && p.activity.path.length >= 6 && p.activity.pi >= 2 && p.activity.pi < p.activity.path.length - 2);
const midTalk = (w: World): boolean => w.conversations.some((c) => c.end === 0 && c.phase >= 2 && w.tick > c.start + 20);
const activePromise = (w: World): Commitment | undefined => w.persons.flatMap((p) => p.commitments).find((c) => c.status === 'active');
const midLoan = (w: World): boolean => w.tools.some((t) => t.loan !== null && t.loan.lender !== 0);
const midBatch = (w: World): boolean => w.buildings.some((b) => b.ops?.job && b.ops.job.progress > 0 && b.ops.job.progress < b.ops.job.total);
const midBuild = (w: World): boolean => w.sites.some((s) => s.work > 5 && s.work < s.workTotal - 5);

describe('saving in the middle of things and carrying on gives exactly the world that was never saved', () => {
  it('mid-walk: someone is part of the way along a path to somewhere', () => {
    const w = natural('meadow');
    until(w, midWalk, 3000, 'somebody part-way along a path');
    resumesCleanly(w, midWalk, 900);
  }, 120_000);

  it('mid-conversation: two people are in the middle of talking', () => {
    const w = natural('meadow');
    until(w, midTalk, 6000, 'a conversation under way');
    resumesCleanly(w, midTalk, 900);
  }, 120_000);

  it('mid-promise: a promise has been made and is being kept', () => {
    const w = natural('meadow');
    until(w, (x) => !!activePromise(x), 6000, 'a promise that is active');
    resumesCleanly(w, (x) => !!activePromise(x), 1500);
  }, 120_000);

  it('mid-loan: a tool is out on loan and has to come back', () => {
    // STAGED: Lena lends her hammer to Bo, who promises to bring it back
    const s = stage('mid-loan');
    const lena = addPerson(s, 'Lena', 30, 26, { inv: { fruit: 5 } });
    const bo = addPerson(s, 'Bo', 46, 26, { sex: 'm', inv: { fruit: 5 } });
    const t = give(s.w, lena, 'hammer');
    s.w.camp = { x: 44.5, y: 26.5 };
    const w = done(s);
    expect(lendTool(w, t, lena, bo, w.tick + LOAN_TERM)).toBe(true);
    bo.commitments.push({ id: w.nextId++, requestId: 0, kind: 'return_tool', to: lena.id, item: 'hammer', amount: 1, toolId: t.id, siteId: 0, made: w.tick, deadline: w.tick + LOAN_TERM + 400, status: 'active', delivered: 0, grace: 0 });
    run(w, 40);
    expect(midLoan(w), 'the hammer is still out on loan, and Bo is on his way back with it').toBe(true);
    resumesCleanly(w, midLoan, 1500);
    // the loan was settled the same way in both worlds (the comparison above); and the hammer is still accounted for
    expect(toolById(w, t.id)?.holder).toBeDefined();
  }, 120_000);

  it('mid-production: a batch is under way at a workplace', () => {
    // STAGED: the timber-yard scene (somebody fells, somebody saws)
    const w = scene('workshop');
    until(w, midBatch, 6000, 'a batch under way');
    resumesCleanly(w, midBatch, 900);
  }, 120_000);

  it('mid-construction: a building is half up', () => {
    // STAGED: Mira builds a hut while Tomas brings the wood
    const w = scene('cooperate');
    until(w, midBuild, 3000, 'a site under construction');
    resumesCleanly(w, midBuild, 1500);
    expect(person(w, 'Mira')).toBeDefined();
  }, 120_000);
});
