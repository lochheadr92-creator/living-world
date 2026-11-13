// Rules 233: work is picked up where it was left (src/sim/picked_up.ts; read in activities.ts suspendActivity and beginWork).
// STAGED: one grown woman is set to chopping at a tree she knows; part way through a log the work is put on hold exactly as a
// conversation does it (activities.ts suspendActivity) and picked up again (resumeSuspended), and the count is read when she is
// back at the work. The ordinary-world evidence is scripts/job_drops.ts and docs/GROWTH_PLAN.md.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { resumeSuspended, suspendActivity } from '../src/sim/activities';
import { conservationReport } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { PICKED_UP_PARTS, SAME_PLACE, keepCount, putCountBack, setPickedUp } from '../src/sim/picked_up';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import type { Activity, ActivityKind, Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, pin, stage } from './helpers/kit';
import { selectPrerequisite } from './helpers/tool_prerequisite';

afterEach(() => setPickedUp(true));

/** A grown woman chopping at a tree, part way through a log (staged). */
function chopping(version: number, ticksIn = 12) {
  const s = stage('picked-up'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 }, inv: { bread: 1 } });
  const home = building(s, 'lean_to', 36, 36, p.hhId, { grain: 8 });
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const tree = makeSource(w, 'tree', 43, 41, 8);
  done(s);
  observe(w, p, home); observe(w, p, tree); perceive(w, p); pin(p);
  const key = `gather:${tree.id}`;
  const { act, restore } = selectPrerequisite(w, p, key);
  for (let n = 0; n < 400 && !(act.phase === 'work' && act.progress >= ticksIn); n++) stepWorld(w);
  if (p.activity !== act || act.phase !== 'work' || act.progress < ticksIn) throw new Error('staging failed: not chopping');
  return { w, p, act, restore, tree };
}
/** Put the work on hold as a conversation does, pick it up again, and step until she is back at it; returns the count then. */
function holdAndPickUp(f: ReturnType<typeof chopping>): { before: number; after: number; cycle: number } {
  const before = f.act.progress, cycle = f.act.cycle;
  try {
    suspendActivity(f.w, f.p);
    expect(f.p.activity).toBeNull();
    expect(f.p.suspended).toBe(f.act);
    expect(f.act.phase).toBe('travel');
    expect(resumeSuspended(f.w, f.p)).toBe(true);
    let after = -1;
    for (let n = 0; n < 60 && after < 0; n++) { stepWorld(f.w); if (f.p.activity === f.act && f.act.phase === 'work') after = f.act.progress; }
    expect(after).toBeGreaterThanOrEqual(0);
    return { before, after, cycle: f.act.cycle - cycle };
  } finally { f.restore(); }
}
const fake = (kind: ActivityKind, progress: number, duration: number): Activity => ({ kind, phase: 'work', progress, pprogress: progress, duration, data: {} }) as unknown as Activity;
const at = (x: number, y: number): Person => ({ x, y }) as unknown as Person;
const rich = (version: number): World => ({ settings: { dynamics: 'rich', rulesVersion: version } }) as unknown as World;

describe('rules 233: work is picked up where it was left', () => {
  it('is a supported version at or below the current one, with its two parts', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(233);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(233);
    expect(PICKED_UP_PARTS).toEqual(['jobs', 'rest']);
    for (const arm of ['rich-no-picked-up', 'rich-no-picked-up-jobs', 'rich-no-picked-up-rest']) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('jobs: a log part chopped is still part chopped after the talk; at rules 232 and with the part off she begins it again', () => {
    const now = holdAndPickUp(chopping(233));
    expect(now.before).toBeGreaterThanOrEqual(12);
    expect(now.after).toBeGreaterThanOrEqual(now.before);
    expect(now.cycle).toBe(0); // no log came of the hold itself
    const old = holdAndPickUp(chopping(232));
    expect(old.after).toBeLessThan(old.before);
    expect(old.after).toBeLessThanOrEqual(2);
    setPickedUp(false, 'jobs');
    const off = holdAndPickUp(chopping(233));
    expect(off.after).toBeLessThanOrEqual(2);
  });

  it('the count is put back only at the same place and for a piece of the same length; the note is spent either way', () => {
    const w = rich(233);
    const kept = (a: Activity) => a.data.kept as { progress: number } | undefined;
    const a = fake('gather', 30, 40);
    keepCount(w, at(5, 5), a);
    expect(kept(a)?.progress).toBe(30);
    // as the hold leaves it, then begun again by its handler: count at nothing
    const again = (x: number, y: number, duration = 40): number => { const b = fake('gather', 0, duration); b.data.kept = { ...(a.data.kept as object) }; putCountBack(w, at(x, y), b); expect(b.data.kept).toBeUndefined(); return b.progress; };
    expect(again(5, 5)).toBe(30);
    expect(again(5 + SAME_PLACE - 0.1, 5)).toBe(30);
    expect(again(5 + SAME_PLACE + 0.5, 5)).toBe(0); // she is somewhere else
    expect(again(5, 5, 55)).toBe(0); // a different piece
    expect(again(5, 5, 30)).toBe(0); // the count would already be at its end
    // a handler that begins further on than the kept count keeps its own (tilling a plot somebody else went on with)
    const tilled = fake('till', 35, 40); tilled.data.kept = { ...(a.data.kept as object) }; putCountBack(w, at(5, 5), tilled); expect(tilled.progress).toBe(35);
  });

  it('rest: a rest part taken is kept too, by its own part; talk, walking and a batch at a workshop are not counted here', () => {
    const w = rich(233);
    const kept = (kind: ActivityKind): boolean => { const a = fake(kind, 30, 150); keepCount(w, at(1, 1), a); return a.data.kept !== undefined; };
    for (const kind of ['gather', 'craft', 'till', 'plant', 'tend', 'harvest', 'repair', 'tree_work', 'rest', 'warm'] as const) expect(kept(kind)).toBe(true);
    for (const kind of ['converse', 'operate', 'build', 'haul', 'wander', 'sleep', 'attend'] as const) expect(kept(kind)).toBe(false);
    setPickedUp(false, 'rest');
    expect(kept('rest')).toBe(false);
    expect(kept('warm')).toBe(false);
    expect(kept('gather')).toBe(true);
    setPickedUp(true);
    setPickedUp(false, 'jobs');
    expect(kept('gather')).toBe(false);
    expect(kept('rest')).toBe(true);
    setPickedUp(true);
    expect((() => { const a = fake('gather', 30, 150); keepCount(rich(232), at(1, 1), a); return a.data.kept; })()).toBeUndefined();
    // nothing to keep of a piece not begun, or of somebody still walking there
    expect((() => { const a = fake('gather', 0, 150); keepCount(w, at(1, 1), a); return a.data.kept; })()).toBeUndefined();
    expect((() => { const a = fake('gather', 30, 150); a.phase = 'travel'; keepCount(w, at(1, 1), a); return a.data.kept; })()).toBeUndefined();
  });

  it('a world saved while the work is on hold loads and continues the same, and the accounts balance', () => {
    const f = chopping(233);
    try {
      suspendActivity(f.w, f.p);
      expect((f.act.data.kept as { progress: number }).progress).toBeGreaterThanOrEqual(12);
      const copy = deserializeWorld(serializeWorld(f.w));
      resumeSuspended(f.w, f.p);
      resumeSuspended(copy, copy.persons.find((q) => q.id === f.p.id)!);
      for (let n = 0; n < 120; n++) { stepWorld(f.w); stepWorld(copy); }
      expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
      expect(f.act.cycle).toBeGreaterThan(0); // and the log was finished from where it stood
    } finally { f.restore(); }
    expect(conservationReport(f.w).ok).toBe(true);
  });
});
