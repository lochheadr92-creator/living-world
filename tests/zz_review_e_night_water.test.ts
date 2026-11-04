// REVIEW DIAGNOSTIC (agent E). Staged: a person indoors in her household hut at night with critical thirst. Variant A knows the
// shore (~15 tiles north); variant B knows no water at all (as the retained collapsed-home fixture did) and is followed for
// 2,000 ticks to see what the rules-110 water search does. Current rules, rich dynamics. Writes nothing to the repository.
import { expect, it } from 'vitest';
import { stage, addPerson, done, learn, building } from './helpers/kit';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { stepWorld } from '../src/sim/world';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { updateEnvironment, dayFraction } from '../src/sim/environment';
import { enterHome, doorPoint, indoorHome } from '../src/sim/habitation';
import { DAY } from '../src/sim/constants';
import type { World, Person } from '../src/sim/types';

function nightScene(name: string, opts: { storedWater?: number; thirst: number; knowsWater: boolean }) {
  const s = stage(name);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = CURRENT_RULES_VERSION;
  // everyoneKnowsTheLake (scenes.ts) plants water beliefs only within 30 tiles of world.camp: move the camp north so the
  // shore (y 14-16) is inside that radius when the person is meant to know it; leave it at (43.5,43.5) when she is not.
  if (opts.knowsWater) w.camp = { x: 40.5, y: 25.5 };
  // night: dayFraction = tick/DAY + 0.3 (mod 1); 0.92 -> tick = 0.62*DAY
  w.tick = Math.round(0.62 * DAY);
  const p = addPerson(s, 'Ada', 41.5, 33.5, { age: 35, hunger: 80, thirst: opts.thirst, energy: 85 });
  const hut = building(s, 'hut', 40, 31, p.hhId, opts.storedWater ? { water: opts.storedWater } : {});
  const hh = w.households.find((h) => h.id === p.hhId)!;
  hh.homeId = hut.id;
  done(s);
  learn(w, p, hut);
  const d = doorPoint(hut);
  p.x = d.x; p.y = d.y;
  const refused = enterHome(w, p, hut);
  expect(refused).toBeNull();
  expect(indoorHome(w, p)?.id).toBe(hut.id);
  updateEnvironment(w);
  w.sceneLabel = 'STAGED review: thirsty person indoors at night';
  return { w, p, hut };
}

function describe(w: World, p: Person) {
  const ctx = generateOptions(w, p, true, true);
  const ranked = rankOptions(ctx);
  const water = ctx.options.filter((o) => o.need === 'thirst').map((o) => `${o.kind} "${o.label}" util=${o.util.toFixed(1)} eta=${Math.round(o.eta)} key=${o.key}`);
  const eligible = ranked.filter((o) => o.need === 'thirst').map((o) => o.key);
  const blocked = ctx.blocked.filter((o) => o.need === 'thirst' || o.tag === 'water' || o.tag === 'rest').map((o) => `${o.kind} "${o.label}": ${o.blocked}`);
  return { frac: dayFraction(w.tick).toFixed(2), light: w.light.toFixed(2), night: ctx.night, criticals: ctx.criticals, lead: ctx.critical, waterBeliefs: (p.bykind.water ?? []).length, water, eligible, blocked, top: ranked.slice(0, 4).map((o) => `${o.kind} ${o.key} need=${o.need} ${o.util.toFixed(1)}`) };
}

function follow(w: World, p: Person, ticks: number) {
  const ends: string[] = [];
  const starts: string[] = [];
  let firstDrinkStart = -1;
  const t0 = w.tick;
  w.hooks = {
    onActivityStart: (q, a) => { if (q === p) { starts.push(`t${w.tick - t0} start ${a.kind} "${a.label}" -> (${a.spotX.toFixed(0)},${a.spotY.toFixed(0)}) thirst=${q.needs.thirst.toFixed(1)}`); if (a.kind === 'drink' && firstDrinkStart < 0) firstDrinkStart = w.tick - t0; } },
    onActivityEnd: (q, a, outcome, detail) => { if (q === p) ends.push(`t${w.tick - t0} end ${a.kind}|${a.phase}|${outcome}|${detail} thirst=${q.needs.thirst.toFixed(1)} health=${q.health.toFixed(0)} at (${q.x.toFixed(0)},${q.y.toFixed(0)}) indoors=${q.indoors ?? 0} waterBeliefs=${(q.bykind.water ?? []).length}`); },
  };
  for (let i = 0; i < ticks && p.alive; i++) stepWorld(w);
  delete w.hooks;
  return { ends, starts, firstDrinkStart, elapsed: w.tick - t0 };
}

it('Q5a: indoors at night, thirst 10, no stored water, shore known ~15 tiles north: drink is eligible and happens', () => {
  const { w, p } = nightScene('review-e-night-water-known', { thirst: 10, knowsWater: true });
  const d0 = describe(w, p);
  console.log('Q5a', JSON.stringify(d0, null, 1));
  expect(d0.night).toBe(true);
  expect(d0.waterBeliefs).toBeGreaterThan(0);
  expect(d0.eligible.some((k) => k.startsWith('drink:'))).toBe(true);
  const r = follow(w, p, 400);
  console.log('Q5a starts', r.starts.join('\n'));
  console.log('Q5a ends', r.ends.join('\n'));
  console.log('Q5a firstDrinkStart', r.firstDrinkStart, 'thirst now', p.needs.thirst.toFixed(1), 'alive', p.alive);
  expect(r.firstDrinkStart).toBeGreaterThanOrEqual(0);
  expect(r.firstDrinkStart).toBeLessThanOrEqual(100);
  expect(p.needs.thirst).toBeGreaterThan(10);
});

it('Q5b: the same with 2 water in the hut store: stored water is drunk', () => {
  const { w, p } = nightScene('review-e-night-water-stored', { thirst: 10, knowsWater: true, storedWater: 2 });
  const d0 = describe(w, p);
  console.log('Q5b', JSON.stringify(d0, null, 1));
  expect(d0.eligible.some((k) => k.startsWith('drink:store:'))).toBe(true);
  const r = follow(w, p, 200);
  console.log('Q5b ends', r.ends.join('\n'));
  console.log('Q5b thirst now', p.needs.thirst.toFixed(1), 'indoors', p.indoors ?? 0);
  expect(p.needs.thirst).toBeGreaterThan(10);
});

it('Q5c: indoors at night, thirst 10, NO known water (as the retained collapsed-home fixture): what does the search do in 2,000 ticks?', () => {
  const { w, p } = nightScene('review-e-night-water-unknown', { thirst: 10, knowsWater: false });
  const d0 = describe(w, p);
  console.log('Q5c', JSON.stringify(d0, null, 1));
  expect(d0.waterBeliefs).toBe(0);
  const r = follow(w, p, 2000);
  console.log('Q5c starts', r.starts.join('\n'));
  console.log('Q5c ends', r.ends.join('\n'));
  const explores = r.starts.filter((s) => s.includes('start explore')).length;
  const wanders = r.starts.filter((s) => s.includes('start wander')).length;
  console.log('Q5c explores', explores, 'wanders', wanders, 'firstDrinkStart', r.firstDrinkStart, 'alive', p.alive, 'health', p.health.toFixed(1), 'thirst', p.needs.thirst.toFixed(1), 'waterBeliefs now', (p.bykind.water ?? []).length, 'elapsed', r.elapsed, 'deaths', JSON.stringify(w.deceased.map((d) => [d.name, d.tick, d.cause])));
  expect(true).toBe(true);
});
