import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { reviewActivity } from '../src/sim/decision';
import { putBelief, waterBeliefId } from '../src/sim/knowledge';
import { makeCtx } from '../src/sim/optutil';
import type { Option } from '../src/sim/optutil';
import { foodRelief, guardOption, projected, waterRelief } from '../src/sim/relief';
import { makeWolf } from '../src/sim/wildlife';
import { DAY } from '../src/sim/constants';
import { markSetAside } from '../src/sim/social';
import type { Person, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';
import { run } from './helpers/util';

/** a discretionary job of a given length (what the planner would offer for work that is not about survival) */
function job(eta: number, kind: Option['kind'] = 'build'): Option {
  return { kind, label: 'a job', goal: 'test', need: null, util: 30, parts: [], eta, key: 'job', targetId: 0, tag: 'site', make: () => null };
}

function scene(name: string, o: { thirst?: number; hunger?: number; water?: 'fresh' | 'old' | 'none'; carry?: Record<string, number>; y?: number } = {}) {
  const s = stage(name);
  const p = addPerson(s, 'Pia', 44, o.y ?? 40, { thirst: o.thirst ?? 55, hunger: o.hunger ?? 80, inv: o.carry ?? {} });
  s.w.camp = { x: 44.5, y: 30.5 }; // the lake is within what everyone knows of the land
  const w = done(s);
  // what the person knows of the water: shore seen just now, shore remembered from long ago, or none at all
  for (const k of Object.keys(p.beliefs)) {
    const b = p.beliefs[Number(k)];
    if (b.kind === 'water') {
      if (o.water === 'none') delete p.beliefs[Number(k)];
      else b.seen = o.water === 'old' ? w.tick - 3000 : w.tick - 5;
    }
  }
  if (o.water === 'none') p.bykind.water = [];
  return { w, p };
}

describe('survival comes before work', () => {
  it('relief is confirmed when it is in the pack or in view, only possible when it is a memory', () => {
    const a = scene('relief-pack', { carry: { water: 2, fruit: 2 } });
    expect(waterRelief(makeCtx(a.w, a.p, false))).toMatchObject({ confirmed: true, eta: 0 });
    expect(foodRelief(makeCtx(a.w, a.p, false))).toMatchObject({ confirmed: true, eta: 0 });
    const b = scene('relief-view', { water: 'fresh' });
    expect(waterRelief(makeCtx(b.w, b.p, false))?.confirmed).toBe(true);
    const c = scene('relief-memory', { water: 'old' });
    expect(waterRelief(makeCtx(c.w, c.p, false))?.confirmed).toBe(false);
    const d = scene('relief-none', { water: 'none' });
    expect(waterRelief(makeCtx(d.w, d.p, false))).toBeNull();
  });

  it('a job that would leave someone too far from water is not taken on — and the reason is on record', () => {
    const { w, p } = scene('guard-far', { thirst: 52, water: 'fresh' });
    const ctx = makeCtx(w, p, true);
    const water = waterRelief(ctx);
    const food = foodRelief(ctx);
    expect(guardOption(ctx, job(60), water, food).ok).toBe(true);
    const long = guardOption(ctx, job(480), water, food);
    expect(long.ok).toBe(false);
    expect(long.why).toMatch(/too far from water/);
    expect(long.why).toMatch(/only water in view/);
  });

  it('the same job passes with water in the pack, and fails harder when the only water is a memory', () => {
    const base = { thirst: 52 };
    const carrying = scene('guard-carry', { ...base, water: 'fresh', carry: { water: 3, fruit: 3 } });
    const c1 = makeCtx(carrying.w, carrying.p, false);
    expect(guardOption(c1, job(480), waterRelief(c1), foodRelief(c1)).ok).toBe(true);
    const seen = scene('guard-seen', { ...base, water: 'fresh', carry: { fruit: 3 } });
    const remembered = scene('guard-remembered', { ...base, water: 'old', carry: { fruit: 3 } });
    // find a job length that is fine with confirmed water but not with merely remembered water
    let flip = 0;
    for (let e = 100; e < 520; e += 20) {
      const cs = makeCtx(seen.w, seen.p, false);
      const cr = makeCtx(remembered.w, remembered.p, false);
      const okSeen = guardOption(cs, job(e), waterRelief(cs), foodRelief(cs)).ok;
      const okMem = guardOption(cr, job(e), waterRelief(cr), foodRelief(cr)).ok;
      if (okSeen && !okMem) flip = e;
    }
    expect(flip, 'there is a range of jobs allowed on confirmed water but not on a memory').toBeGreaterThan(0);
  });

  it('the walk there, the work, and the walk back to water all count: the longer the job, the earlier it stops being safe', () => {
    const { w, p } = scene('guard-time', { thirst: 60, water: 'fresh' });
    const ctx = makeCtx(w, p, false);
    const water = waterRelief(ctx);
    const short = projected(ctx, 'thirst', 100, water);
    const long = projected(ctx, 'thirst', 400, water);
    expect(long.level).toBeLessThan(short.level);
    // the margin demanded is larger when relief is only possible
    const possible = projected(ctx, 'thirst', 100, { ...water!, confirmed: false });
    expect(possible.margin).toBeGreaterThan(short.margin);
  });

  it('survival options and fleeing are never held back by the guard', () => {
    const { w, p } = scene('guard-never', { thirst: 20, water: 'none' });
    const ctx = makeCtx(w, p, false);
    for (const kind of ['drink', 'eat', 'flee', 'sleep', 'rest', 'fetch_water'] as Option['kind'][]) expect(guardOption(ctx, job(900, kind), null, null).ok).toBe(true);
    expect(guardOption(ctx, { ...job(900), need: 'thirst' }, null, null).ok).toBe(true);
  });

  it('with wolves about, a long trip that cannot be finished before dark is not started', () => {
    const { w, p } = scene('guard-dark', { thirst: 95, hunger: 95, water: 'fresh', carry: { water: 3, fruit: 3 } });
    w.tick = Math.round(DAY * 0.5); // the afternoon is well along
    const wolf = makeWolf(w, 70, 70);
    putBelief(p, { id: wolf.id, kind: 'danger', x: 70, y: 70, amount: 1, max: 0, seen: w.tick - 50, src: 'seen', from: 0, learned: w.tick - 50 });
    const ctx = makeCtx(w, p, true);
    const verdict = guardOption(ctx, job(1500, 'explore'), waterRelief(ctx), foodRelief(ctx));
    expect(verdict.ok).toBe(false);
    expect(verdict.why).toMatch(/before dark/);
    // and a short errand, or one at dawn, is fine
    expect(guardOption(ctx, job(150, 'explore'), waterRelief(ctx), foodRelief(ctx)).ok).toBe(true);
  });
});

describe('a drink or a meal under way is not thrown away', () => {
  function drinking(name: string, thirst: number) {
    const { w, p } = scene(name, { thirst, water: 'fresh', carry: { water: 2, fruit: 1 } });
    const act = newActivity(w, p, { kind: 'drink', label: 'Drinking', goal: 'test', need: 'thirst', here: true, utility: 20, minCommit: 1, maxTicks: 400, data: { fromInv: true, optKey: 'x' } });
    startActivity(w, p, act);
    act.progress = 4;
    act.duration = 20;
    act.minCommit = 0;
    return { w, p, act };
  }

  it('a better-looking chore does not end it while the drink is still doing good', () => {
    const { w, p, act } = drinking('drink-protected', 52);
    p.inv.wood = 3;
    // give the review something attractive to switch to
    p.nextThink = 0;
    reviewActivity(w, p);
    expect(p.activity).toBe(act);
  });

  it('danger still ends it at once', () => {
    const { w, p, act } = drinking('drink-danger', 52);
    makeWolf(w, p.x + 2, p.y + 1);
    p.seen.push({ id: 9999, ent: 'animal', x: p.x + 2, y: p.y + 1, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '', busyTalking: false });
    p.nextThink = 0;
    reviewActivity(w, p);
    expect(p.activity === act).toBe(false);
  });
});

describe('promises give way to survival without shame, then come back', () => {
  it('putting a promise aside for a critical need marks it as set aside rather than neglected', () => {
    const { w, p } = scene('aside', { thirst: 10, water: 'fresh' });
    const other = addPerson(stage('x'), 'Z', 0, 0);
    void other;
    p.commitments.push({ id: 1, requestId: 0, kind: 'deliver', to: p.id, item: 'wood', amount: 1, siteId: 0, made: w.tick, deadline: w.tick + 100, status: 'active' });
    markSetAside(w, p);
    expect(p.commitments[0].setAside).toBe(w.tick);
  });
});

void run;
void ({} as Person);
void ({} as World);
void waterBeliefId;
