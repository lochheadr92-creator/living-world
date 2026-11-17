// Isolated day-length A/B: observe people, no edits to product source or saves.
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stageOf } from '../src/sim/people';
import { timeCategory } from './observers/time_budget';
import { stepWorld } from '../src/sim/world';

const argv = process.argv.slice(2).filter(x => x !== '--');
const option = (key: string, fallback: string) => {
  const n = argv.indexOf('--' + key);
  return n < 0 ? fallback : (argv[n + 1] ?? fallback);
};
const seed = option('seed', 'aspen');
const days = Number(option('days', '5'));
const filename = option('out', '');
if (!Number.isInteger(days) || days < 1 || days > 40) throw new Error('Invalid days');
const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
const initial = w.persons.filter(p => p.alive).length;
const categories: Record<string, number> = {};
const comfortable: Record<string, number> = {};
const starts: Record<string, number> = {};
const endings: Record<string, number> = {};
const bump = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };
let age12Ticks = 0, awakeTicks = 0, comfortableAwakeTicks = 0;
let nightWaitTicks = 0, blockedWaitTicks = 0, otherWaitTicks = 0;
let hungerLow = 0, thirstLow = 0, energyLow = 0;
let hungerSum = 0, thirstSum = 0, energySum = 0, healthSum = 0;
let totalAliveTicks = 0;
w.hooks = {
  onActivityStart: (_p, a) => { bump(starts, a.kind); },
  onActivityEnd: (_p, a, outcome) => { bump(endings, a.kind + ':' + outcome); }
};
for (let i = 0; i < days * DAY; i++) {
  totalAliveTicks += w.persons.filter(p => p.alive).length;
  for (const p of w.persons) {
    if (!p.alive || stageOf(w,p) === 'child') continue;
    age12Ticks++;
    const c = timeCategory(p,w.tick);
    bump(categories,c);
    if (c === 'waiting') {
      if (p.activity?.kind === 'rest' && p.activity.data.daylightAt !== undefined) nightWaitTicks++;
      else if (p.activity?.blocked) blockedWaitTicks++;
      else otherWaitTicks++;
    }
    if (c === 'sleep') continue;
    awakeTicks++;
    hungerSum += p.needs.hunger;
    thirstSum += p.needs.thirst;
    energySum += p.needs.energy;
    healthSum += p.health;
    if (p.needs.hunger < 62) hungerLow++;
    if (p.needs.thirst < 66) thirstLow++;
    if (p.needs.energy < 46) energyLow++;
    if (p.needs.hunger >= 62 && p.needs.thirst >= 66) {
      comfortableAwakeTicks++;
      bump(comfortable,c);
    }
  }
  stepWorld(w);
}
const alive = w.persons.filter(p => p.alive).length;
const share = (counts: Record<string,number>, denominator: number) =>
  Object.fromEntries(Object.entries(counts).map(([k,v]) => [k, Number((100*v/Math.max(1,denominator)).toFixed(3))]));
const allAwake = Object.fromEntries(Object.entries(categories).filter(([k]) => k !== 'sleep'));
const result = {
  source: 'Isolated clean worktree, 255 rules at HEAD baa9257d; arrivals off',
  seed, days, dayTicks: DAY, simulationTicks: days*DAY,
  initialAlive: initial, finalAlive: alive,
  deaths: w.persons.filter(p => !p.alive).length,
  newPeople: w.persons.length-initial,
  meanAlive: Number((totalAliveTicks/(days*DAY)).toFixed(2)),
  meanAge12: Number((age12Ticks/(days*DAY)).toFixed(2)),
  sleepShare: Number((100 * (categories.sleep??0) / Math.max(1,age12Ticks)).toFixed(3)),
  nightWaitWakingPercent: Number((100 * nightWaitTicks / Math.max(1,awakeTicks)).toFixed(3)),
  blockedWaitWakingPercent: Number((100 * blockedWaitTicks / Math.max(1,awakeTicks)).toFixed(3)),
  otherWaitWakingPercent: Number((100 * otherWaitTicks / Math.max(1,awakeTicks)).toFixed(3)),
  awakeCategoriesPercent: share(allAwake,awakeTicks),
  comfortableCategoriesPercent: share(comfortable,comfortableAwakeTicks),
  comfortableWakingPercent: Number((100*comfortableAwakeTicks/Math.max(1,awakeTicks)).toFixed(3)),
  hungryWakingPercent: Number((100*hungerLow/Math.max(1,awakeTicks)).toFixed(3)),
  thirstyWakingPercent: Number((100*thirstLow/Math.max(1,awakeTicks)).toFixed(3)),
  lowEnergyWakingPercent: Number((100*energyLow/Math.max(1,awakeTicks)).toFixed(3)),
  meanHunger: Number((hungerSum/Math.max(1,awakeTicks)).toFixed(2)),
  meanThirst: Number((thirstSum/Math.max(1,awakeTicks)).toFixed(2)),
  meanEnergy: Number((energySum/Math.max(1,awakeTicks)).toFixed(2)),
  meanHealth: Number((healthSum/Math.max(1,awakeTicks)).toFixed(2)),
  completedMealsByOutcome: Object.fromEntries(Object.entries(endings).filter(([k])=>/^(eat|eat_store|drink|fetch_water):/.test(k))),
  activityStarts: starts,
  activityEndings: endings
};
if (filename) writeFileSync(filename, JSON.stringify(result,null,2));
console.log(JSON.stringify({seed,dayTicks:DAY,days,alive,dead:result.deaths,travel:result.awakeCategoriesPercent.travel,work:result.awakeCategoriesPercent.work,leisure:result.awakeCategoriesPercent.leisure,social:result.awakeCategoriesPercent.social_contact,sleep:result.sleepShare,hungry:result.hungryWakingPercent,thirsty:result.thirstyWakingPercent,meal:result.completedMealsByOutcome}));
