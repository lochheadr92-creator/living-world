// REVIEW DIAGNOSTIC (agent E). Staged, labelled situations: (1) a hungry adult whose pack is full of non-food beside a berry
// bush and a ripe household crop; (2) a starving dependant beside a household adult who carries food. Rich dynamics, current
// rules. Writes nothing to the repository besides this file; prints the option lists it finds.
import { expect, it } from 'vitest';
import { stage, addPerson, done, learn } from './helpers/kit';
import { makeSource } from '../src/sim/sources';
import { createPlot } from '../src/sim/farming';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { stepWorld } from '../src/sim/world';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { invWeight, foodUnits } from '../src/sim/economy';
import { carryCap, isDependent } from '../src/sim/people';
import type { Items, Person, World } from '../src/sim/types';

function listHunger(w: World, p: Person) {
  const ctx = generateOptions(w, p, true, true);
  const ranked = rankOptions(ctx);
  const food = ctx.options.filter((o) => o.need === 'hunger').map((o) => `${o.kind} "${o.label}" util=${o.util.toFixed(1)} eta=${Math.round(o.eta)} key=${o.key}`);
  const eligible = ranked.filter((o) => o.need === 'hunger').map((o) => o.key);
  const blocked = ctx.blocked.filter((o) => o.need === 'hunger' || o.tag === 'food').map((o) => `${o.kind} "${o.label}": ${o.blocked}`);
  const leave = ctx.options.filter((o) => o.key.startsWith('leave:')).map((o) => o.label);
  return { criticals: ctx.criticals, drives: ctx.drives.hunger, food, eligible, blocked, leave, top: ranked.slice(0, 3).map((o) => `${o.kind} ${o.key} ${o.util.toFixed(1)}`) };
}

function runTrace(w: World, p: Person, ticks: number) {
  const ends: string[] = [];
  w.hooks = { onActivityEnd: (q, a, outcome, detail) => { if (q === p) ends.push(`t${w.tick} ${a.kind}|${a.phase}|${outcome}|${detail} cycle=${a.cycle} hunger=${q.needs.hunger.toFixed(1)}`); } };
  for (let i = 0; i < ticks; i++) stepWorld(w);
  delete w.hooks;
  return ends;
}

function fullPackScene(name: string, inv: Items) {
  const s = stage(name);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = CURRENT_RULES_VERSION;
  const p = addPerson(s, 'Ada', 40.5, 40.5, { age: 35, hunger: 30, thirst: 95, energy: 95, inv });
  p.needs.warmth = 95;
  p.needs.safety = 95;
  const bush = makeSource(w, 'berry_bush', 43, 40, 6);
  const plot = createPlot(w, 40, 43, p.hhId);
  plot.state = 'ripe'; plot.progress = 1; plot.stock = 4; plot.seedStock = 1; plot.ripeTick = w.tick;
  done(s);
  learn(w, p, bush, plot);
  w.sceneLabel = 'STAGED review: hungry adult with a full non-food pack beside a berry bush and a known ripe household crop';
  return { w, p, bush, plot };
}

it('Q1a: full pack of tools+wood+stone, hunger 30: which food options exist, and does she eat at the source?', () => {
  const { w, p, bush, plot } = fullPackScene('review-e-fullpack-materials', { axe: 1, hoe: 1, basket: 1, seeds: 4, wood: 1, stone: 4 });
  const cap = carryCap(w, p);
  const weight = invWeight(p);
  console.log('cap', cap, 'weight', weight, 'room', cap - weight);
  expect(weight).toBeGreaterThanOrEqual(cap);
  const before = listHunger(w, p);
  console.log('Q1a options', JSON.stringify(before, null, 1));
  expect(before.food.some((f) => f.includes(`gather:${bush.id}`))).toBe(true);
  // the ripe household crop: expected blocked by pack room (hungry_harvest.ts)
  expect(before.blocked.some((b) => b.includes('no room to carry a grain'))).toBe(true);
  expect(before.leave.length).toBe(0);
  const ends = runTrace(w, p, 600);
  console.log('Q1a trace', ends.join('\n'));
  console.log('Q1a after: hunger', p.needs.hunger.toFixed(1), 'weight', invWeight(p), 'bush', bush.amount, 'plot', plot.stock, 'eaten at source', w.ledger.reasons['eaten at the source'] ?? w.ledger.reasons['consumed:eaten at the source'] ?? JSON.stringify(Object.keys(w.ledger.reasons).filter((k) => k.includes('eaten'))));
  expect(p.needs.hunger).toBeGreaterThan(30);
  expect(invWeight(p)).toBe(weight);
});

it('Q1b: full pack of seeds+tools only (no wood/stone): food options and leave-heaviest', () => {
  const { w, p, bush } = fullPackScene('review-e-fullpack-seeds', { axe: 1, pick: 1, hoe: 1, basket: 1, hammer: 1, saw: 1, jar: 1, spear: 1, seeds: 36 });
  const cap = carryCap(w, p);
  console.log('cap', cap, 'weight', invWeight(p));
  expect(invWeight(p)).toBeGreaterThanOrEqual(cap);
  const before = listHunger(w, p);
  console.log('Q1b options', JSON.stringify(before, null, 1));
  expect(before.food.some((f) => f.includes(`gather:${bush.id}`))).toBe(true);
  expect(before.leave.length).toBe(0);
  const ends = runTrace(w, p, 600);
  console.log('Q1b trace', ends.join('\n'));
  console.log('Q1b after: hunger', p.needs.hunger.toFixed(1), 'bush', bush.amount);
  expect(p.needs.hunger).toBeGreaterThan(30);
});

it('Q1c: full pack and hunger already critical (10): the same, under critical filtering', () => {
  const { w, p, bush } = fullPackScene('review-e-fullpack-critical', { axe: 1, hoe: 1, basket: 1, seeds: 4, wood: 1, stone: 4 });
  p.needs.hunger = 10;
  const before = listHunger(w, p);
  console.log('Q1c options', JSON.stringify(before, null, 1));
  expect(before.eligible.some((k) => k === `gather:${bush.id}`)).toBe(true);
  const ends = runTrace(w, p, 400);
  console.log('Q1c trace', ends.join('\n'));
  console.log('Q1c after: hunger', p.needs.hunger.toFixed(1), 'bush', bush.amount);
  expect(p.needs.hunger).toBeGreaterThan(10);
});

function careScene(name: string, dependant: { age: number; health: number }) {
  const s = stage(name);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = CURRENT_RULES_VERSION;
  const adult = addPerson(s, 'Hilda', 40.5, 40.5, { age: 35, hunger: 80, thirst: 90, energy: 90, inv: { fruit: 6, water: 2 } });
  const dep = addPerson(s, 'Eli', 41.5, 40.5, { age: dependant.age, hunger: 0, thirst: 70, energy: 80, hh: adult.hhId });
  dep.health = dependant.health;
  done(s);
  w.sceneLabel = 'STAGED review: a starving household dependant beside an adult who carries fruit';
  return { w, adult, dep };
}

it.each([
  ['child', { age: 8, health: 70 }],
  ['injured adult', { age: 30, health: 30 }],
])('Q6: a starving %s dependant beside a household adult carrying fruit is fed', (_label, spec) => {
  const { w, adult, dep } = careScene('review-e-care-' + _label.replace(' ', '-'), spec);
  expect(isDependent(w, dep)).toBe(true);
  expect(adult.hhId).toBe(dep.hhId);
  const ctx = generateOptions(w, adult, true, true);
  const ranked = rankOptions(ctx);
  const care = ctx.options.filter((o) => o.kind === 'give' || o.tag === 'care').map((o) => `${o.kind} "${o.label}" util=${o.util.toFixed(1)} key=${o.key}`);
  const blocked = ctx.blocked.filter((o) => o.tag === 'care').map((o) => `${o.kind} "${o.label}": ${o.blocked}`);
  console.log('Q6 adult sees dependant?', adult.seen.some((s) => s.id === dep.id), 'dependents', ctx.dependents.map((d) => d.name));
  console.log('Q6 care options', JSON.stringify(care), 'blocked', JSON.stringify(blocked), 'top', ranked.slice(0, 3).map((o) => `${o.kind} ${o.key} ${o.util.toFixed(1)}`));
  const dctx = generateOptions(w, dep, true, true);
  console.log('Q6 dependant options', dctx.options.slice(0, 8).map((o) => `${o.kind} ${o.key} ${o.util.toFixed(1)}`), 'criticals', dctx.criticals);
  const ends: string[] = [];
  w.hooks = { onActivityEnd: (q, a, outcome, detail) => ends.push(`t${w.tick} ${q.name} ${a.kind}|${a.phase}|${outcome}|${detail} cycle=${a.cycle}`), onTransfer: (i) => ends.push(`t${w.tick} transfer ${i.from}->${i.to} ${i.n} ${i.item} (${i.reason})`) };
  let fedTick = -1;
  for (let i = 0; i < 400; i++) {
    stepWorld(w);
    if (fedTick < 0 && foodUnits(dep.inv) > 0) fedTick = w.tick;
  }
  delete w.hooks;
  console.log('Q6 trace', ends.join('\n'));
  console.log('Q6 after: dep hunger', dep.needs.hunger.toFixed(1), 'dep inv', JSON.stringify(dep.inv), 'adult inv', JSON.stringify(adult.inv), 'fedTick', fedTick, 'fedUntil', dep.cooldowns.fedUntil);
  expect(fedTick).toBeGreaterThan(0);
  expect(dep.needs.hunger).toBeGreaterThan(0);
});
