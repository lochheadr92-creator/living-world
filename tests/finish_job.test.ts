// Rules 227: a job begun is finished (src/sim/finish_job.ts; read in decision.ts reviewActivity and options_social.ts). The
// situations in the first group are STAGED: an activity record is made by hand and needs are set, so they check the rule; the
// last two checks are ordinary worlds run side by side at rules 226 and 227.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { CRITICAL, REVIEW_EVERY } from '../src/sim/constants';
import { reviewActivity } from '../src/sim/decision';
import { FINISH_JOB_PARTS, HOLD_MAX, JOBS, hasCriticalNeed, holdsJob, leftToWork, setFinishJob } from '../src/sim/finish_job';
import { makeCtx } from '../src/sim/optutil';
import { probe } from '../src/sim/probe';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeWolf } from '../src/sim/wildlife';
import type { Activity, ActivityKind, Person, SeenEntity, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

afterEach(() => {
  setFinishJob(true);
  probe.on = false;
});

const world = (seed: string, version: number): World => natural(seed, { dynamics: 'rich', rulesVersion: version });
/** A grown person, fed and rested, with nothing in sight (staged). */
function settled(w: World): Person {
  const p = w.persons.find((q) => q.alive && !q.activity?.data.sticky)!;
  p.needs.hunger = p.needs.thirst = p.needs.energy = p.needs.warmth = p.needs.safety = 80;
  p.seen = [];
  return p;
}
/** An activity record made by hand: `kind`, arrived and working unless said otherwise (staged). */
const job = (w: World, kind: ActivityKind, extra: Partial<Activity> = {}): Activity => ({ kind, phase: 'work', start: w.tick, blocked: '', data: {}, progress: 5, duration: 40, ...extra }) as Activity;
const seen = (extra: Partial<SeenEntity>): SeenEntity => ({ id: 1, ent: 'person', x: 0, y: 0, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '', busyTalking: false, ...extra });

describe('rules 227: a job begun is finished', () => {
  it('is a supported version at or below the current one', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(227);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(227);
    expect(HOLD_MAX).toBe(800);
    expect(FINISH_JOB_PARTS).toEqual(['hold', 'asleep', 'quiet']);
  });

  it('hold: somebody at the work of a job is held to it; at rules 226 nobody is', () => {
    const w = world('job-hold', 227);
    const p = settled(w);
    for (const kind of ['gather', 'build', 'repair', 'craft', 'till', 'harvest', 'operate', 'haul'] as const) expect(holdsJob(w, p, job(w, kind)), kind).toBe(true);
    const old = world('job-hold', 226);
    expect(holdsJob(old, settled(old), job(old, 'gather'))).toBe(false);
  });

  it('hold: walking to the job is not held, nor is anything that is not a job', () => {
    const w = world('job-walk', 227);
    const p = settled(w);
    expect(holdsJob(w, p, job(w, 'gather', { phase: 'travel' }))).toBe(false);
    for (const kind of ['rest', 'warm', 'wander', 'socialize', 'explore', 'visit', 'eat', 'drink', 'flee', 'alone'] as const) {
      expect(JOBS.has(kind), kind).toBe(false);
      expect(holdsJob(w, p, job(w, kind)), kind).toBe(false);
    }
  });

  it('hold: a critical need, a threat in sight, a stuck job or a job run too long each bring the second look back', () => {
    const w = world('job-release', 227);
    const p = settled(w);
    const a = job(w, 'build');
    expect(holdsJob(w, p, a)).toBe(true);
    for (const k of ['hunger', 'thirst', 'energy', 'warmth', 'safety'] as const) {
      p.needs[k] = CRITICAL[k] - 1;
      expect(holdsJob(w, p, a), k).toBe(false);
      p.needs[k] = CRITICAL[k] + 40;
      expect(holdsJob(w, p, a), k + ' restored').toBe(true);
    }
    const wolf = makeWolf(w, p.x + 4, p.y);
    p.seen = [seen({ id: wolf.id, ent: 'animal', x: wolf.x, y: wolf.y })];
    expect(holdsJob(w, p, a)).toBe(false);
    p.seen = [seen({ id: w.persons.find((q) => q !== p)!.id })]; // a neighbour in sight is no threat
    expect(holdsJob(w, p, a)).toBe(true);
    // a danger remembered close by counts as one in sight; far off, long ago or gone it does not
    const remembered = (dx: number, age: number, amount = 1): void => { p.beliefs[wolf.id] = { id: wolf.id, kind: 'danger', x: p.x + dx, y: p.y, amount, max: 1, seen: w.tick - age, src: 'seen', from: 0, learned: w.tick - age }; p.bykind.danger = [wolf.id]; };
    remembered(6, 100);
    expect(holdsJob(w, p, a)).toBe(false);
    remembered(30, 100);
    expect(holdsJob(w, p, a)).toBe(true);
    remembered(6, 700);
    expect(holdsJob(w, p, a)).toBe(true);
    remembered(6, 100, 0);
    expect(holdsJob(w, p, a)).toBe(true);
    expect(holdsJob(w, p, job(w, 'build', { blocked: 'waiting for wood' }))).toBe(false);
    // rules 158 stands: gathering to ease hunger with food already in the pack is still looked at
    p.inv = { berries: 2 };
    expect(holdsJob(w, p, job(w, 'gather', { need: 'hunger' }))).toBe(false);
    expect(holdsJob(w, p, job(w, 'gather', { need: null }))).toBe(true);
    p.inv = {};
    expect(holdsJob(w, p, job(w, 'gather', { need: 'hunger' }))).toBe(true);
    expect(holdsJob(w, p, job(w, 'build', { start: w.tick - HOLD_MAX + 1 }))).toBe(true);
    expect(holdsJob(w, p, job(w, 'build', { start: w.tick - HOLD_MAX }))).toBe(false);
  });

  it('the critical lines are the ones decision making draws, thirst raised by the walk to known water', () => {
    const w = world('job-critical', 227);
    run(w, 600);
    let critical = 0;
    let checked = 0;
    for (let round = 0; round < 6; round++) {
      run(w, 150);
      w.persons.filter((q) => q.alive).forEach((q, i) => {
        // staged: needs are spread across the lines so both answers are met, thirst most finely
        if (i % 3 === 0) q.needs.thirst = 10 + ((i * 7 + round * 5) % 45);
        if (i % 5 === 1) q.needs.hunger = 8 + ((i + round) % 12);
        if (i % 7 === 2) q.needs.energy = 4 + ((i + round) % 8);
        const want = makeCtx(w, q, false).criticals.length > 0;
        expect(hasCriticalNeed(w, q), `${q.name} round ${round}`).toBe(want);
        checked++;
        if (want) critical++;
      });
    }
    expect(checked).toBeGreaterThan(100);
    expect(critical).toBeGreaterThan(20);
    expect(checked - critical).toBeGreaterThan(20);
  });

  it('hold: a second look at a held job generates no options; at rules 226, or with a critical need, it does', () => {
    const looks = (version: number, hungry: boolean, held = version >= 227 && !hungry): number => {
      const w = world('job-review', version);
      const p = settled(w);
      p.activity = job(w, 'gather', { need: null, minCommit: 0, utility: 1, claims: [] });
      if (hungry) p.needs.hunger = 5;
      probe.on = true;
      const before = probe.reviews;
      reviewActivity(w, p);
      probe.on = false;
      if (held) expect(p.nextThink).toBe(w.tick + REVIEW_EVERY);
      return probe.reviews - before;
    };
    expect(looks(227, false)).toBe(0);
    expect(looks(226, false)).toBe(1);
    expect(looks(227, true)).toBe(1);
    setFinishJob(false, 'hold');
    expect(looks(227, false, false)).toBe(1);
  });

  it('asleep: a sleeper takes no second look unless a need is critical or a danger is known; however long they have slept', () => {
    const w = world('job-asleep', 227);
    const p = settled(w);
    const sleeping = job(w, 'sleep', { start: w.tick - 5 * HOLD_MAX });
    expect(holdsJob(w, p, sleeping)).toBe(true);
    expect(holdsJob(w, p, job(w, 'sleep', { phase: 'travel' }))).toBe(false); // on the way to bed is not asleep
    p.needs.thirst = CRITICAL.thirst - 1;
    expect(holdsJob(w, p, sleeping)).toBe(false);
    p.needs.thirst = 80;
    const wolf = makeWolf(w, p.x + 3, p.y);
    p.seen = [seen({ id: wolf.id, ent: 'animal', x: wolf.x, y: wolf.y })];
    expect(holdsJob(w, p, sleeping)).toBe(false);
    p.seen = [];
    const old = world('job-asleep', 226);
    expect(holdsJob(old, settled(old), job(old, 'sleep'))).toBe(false);
    setFinishJob(false, 'asleep');
    expect(holdsJob(w, p, sleeping)).toBe(false);
    expect(holdsJob(w, p, job(w, 'gather'))).toBe(true); // the other part is its own switch
  });

  it('quiet: somebody seen at work is left to it; somebody resting, or seen at rules 226, is not', () => {
    const w = world('job-quiet', 227);
    expect(leftToWork(w, seen({ act: 'gather', work: 'forage' }))).toBe(true);
    expect(leftToWork(w, seen({ act: 'build', work: 'build' }))).toBe(true);
    expect(leftToWork(w, seen({ act: 'rest' }))).toBe(false);
    expect(leftToWork(w, seen({ act: '' }))).toBe(false);
    expect(leftToWork(world('job-quiet', 226), seen({ act: 'gather', work: 'forage' }))).toBe(false);
    setFinishJob(false, 'quiet');
    expect(leftToWork(w, seen({ act: 'gather', work: 'forage' }))).toBe(false);
    setFinishJob(true);
    const authored = natural('job-authored', { dynamics: 'authored', rulesVersion: 227 });
    expect(leftToWork(authored, seen({ act: 'gather', work: 'forage' }))).toBe(false);
    expect(holdsJob(authored, settled(authored), job(authored, 'gather'))).toBe(false);
  });

  it('ordinary world: far fewer jobs are dropped at the work for something better, and far fewer second looks are taken', () => {
    const day = (version: number): { dropped: number; looks: number } => {
      const w = world('job-ordinary', version);
      let dropped = 0;
      w.hooks = { onActivityEnd: (_p, a, outcome, detail) => { if (outcome === 'interrupted' && a.phase === 'work' && JOBS.has(a.kind) && detail === 'something better came up') dropped++; } };
      probe.on = true;
      const before = probe.reviews;
      run(w, 2400);
      probe.on = false;
      return { dropped, looks: probe.reviews - before };
    };
    const old = day(226);
    const now = day(227);
    expect(old.dropped).toBeGreaterThan(10);
    expect(now.dropped).toBeLessThan(old.dropped / 3);
    expect(now.looks).toBeLessThan(old.looks * 0.7);
  }, 120000);

  it('nothing is saved: a world saved and loaded continues the same', () => {
    const w = world('job-save', 227);
    run(w, 500);
    const copy = deserializeWorld(serializeWorld(w));
    run(w, 300);
    run(copy, 300);
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
  });
});
