// How many people the water can carry. Read-only measurement: one ordinary world; every day, for each body of natural water
// (hydrology.ts: a stock that only rain refills, and wells draw from the same stock), what it held, what rain put in, what
// evaporated and what was drawn; and how much each person drew. From those: the settlement's own water (the body it draws
// most from), how much rain could refill it in a day at most, and how many people that would carry at the measured draw.
//
//   npx vite-node scripts/water_probe.ts -- --seed aspen --days 36 [--arrivals on|off] [--rules N] [--out water.json]
//   (or --load <save point> in place of --seed: see scripts/world_args.ts)
import { worldFromArgs } from './world_args';
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
let seed = opt('seed', 'aspen');
const days = Number(opt('days', '36'));
const out = opt('out', '');
const { w }: { w: World } = worldFromArgs(opt, seed);
seed = w.settings.seed;

const bodies = w.waterBodies ?? [];
const start = bodies.map((b) => ({ id: b.id, tiles: b.tiles.length, capacity: b.capacity }));
// what full rain could put into each body, whether or not there was room for it (the model: two units a tile a day in full rain)
const rainCould = bodies.map(() => 0);
const perDay: { day: number; alive: number; held: number[]; drawn: number[]; rain: number[]; evaporated: number[]; wells: number; wellWater: number }[] = [];
let last = bodies.map((b) => ({ drawn: b.drawn, replenished: b.replenished, evaporated: b.evaporated }));
let personDays = 0;
// rules 236 (groundwater.ts): water that rose in a well from the ground beneath it, and deaths of thirst
let raised = 0;
w.hooks = { ...(w.hooks ?? {}), onTransfer: (t) => { if (t.reason === 'water rises in the well') raised += t.n; } };
for (let i = w.tick + 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (w.tick % 60 === 0) bodies.forEach((b, k) => { rainCould[k] += b.tiles.length * Math.max(0, w.weather.rain) * 2 * (60 / DAY); });
  if (i % DAY !== 0) continue;
  const alive = w.persons.filter((p) => p.alive).length;
  personDays += alive;
  const wells = w.buildings.filter((b) => b.type === 'well');
  perDay.push({
    day: i / DAY, alive,
    held: bodies.map((b) => b.amount),
    drawn: bodies.map((b, k) => b.drawn - last[k].drawn),
    rain: bodies.map((b, k) => b.replenished - last[k].replenished),
    evaporated: bodies.map((b, k) => b.evaporated - last[k].evaporated),
    wells: wells.length, wellWater: wells.reduce((n, b) => n + (b.store.items.water ?? 0), 0),
  });
  last = bodies.map((b) => ({ drawn: b.drawn, replenished: b.replenished, evaporated: b.evaporated }));
}
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const drawnBy = bodies.map((_, k) => sum(perDay.map((d) => d.drawn[k])));
const home = drawnBy.indexOf(Math.max(...drawnBy)); // the settlement's own water: the body most is drawn from
const drawnAll = sum(drawnBy);
const perPersonDay = personDays ? (drawnAll + raised) / personDays : 0;
const thirst = (w.deceased ?? []).filter((x: { cause?: string }) => /thirst/i.test(x.cause ?? '')).length;
const groundHeld = Object.values(w.groundwater ?? {}).reduce((n, g) => n + g.amount, 0);
const homeRainCould = rainCould[home] / days;
const homeEvaporated = sum(perDay.map((d) => d.evaporated[home])) / days;
const homeDrawn = drawnBy[home] / days;
const carries = perPersonDay > 0 ? (homeRainCould - homeEvaporated) / perPersonDay : 0;
const lowest = Math.min(...perDay.map((d) => d.held[home]));
const result = {
  seed, days, rulesVersion: w.settings.rulesVersion, bodies: start, home: start[home], shareDrawnFromHome: drawnAll ? drawnBy[home] / drawnAll : 0,
  aliveStart: perDay[0]?.alive ?? 0, aliveEnd: perDay[perDay.length - 1]?.alive ?? 0, meanAlive: personDays / days,
  drawnPerPersonDay: perPersonDay, homeDrawnPerDay: homeDrawn, homeRainCouldPerDay: homeRainCould, homeRainTakenPerDay: sum(perDay.map((d) => d.rain[home])) / days,
  homeEvaporatedPerDay: homeEvaporated, peopleTheRainCarries: carries, homeLowest: lowest, homeLowestShare: start[home] ? lowest / start[home].capacity : 0,
  daysOfWaterIfNoRain: perPersonDay > 0 && start[home] ? start[home].capacity / (perPersonDay * (personDays / days)) : 0,
  wellsAtEnd: perDay[perDay.length - 1]?.wells ?? 0, raisedFromGroundPerDay: raised / days, groundHeldAtEnd: groundHeld, thirstDeaths: thirst, peak: Math.max(...perDay.map((x) => x.alive)), perDay,
};
if (out) writeFileSync(out, JSON.stringify(result));
const r1 = (x: number): string => (Math.round(x * 10) / 10).toString();
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}; people ${result.aliveStart} to ${result.aliveEnd} (mean ${r1(result.meanAlive)}); ${bodies.length} bodies of water, ${sum(start.map((b) => b.tiles))} tiles, holding ${sum(start.map((b) => b.capacity))} when full`);
console.log(`  the settlement's water: ${result.home.tiles} tiles holding ${result.home.capacity} when full; ${Math.round(result.shareDrawnFromHome * 100)}% of all that is drawn comes from it; ${result.wellsAtEnd} wells at the end`);
console.log(`  a day, on average: drawn ${r1(homeDrawn)} (${r1(perPersonDay)} a person), rain could put in ${r1(homeRainCould)} and did put in ${r1(result.homeRainTakenPerDay)}, evaporated ${r1(homeEvaporated)}`);
console.log(`  wells: ${result.wellsAtEnd} at the end, raising ${r1(result.raisedFromGroundPerDay)} a day from the ground (${groundHeld} held there at the end); most people at once ${result.peak}; deaths of thirst ${thirst}`);
console.log(`  so the rain carries about ${Math.round(carries)} people at this draw; with no rain a full body lasts ${r1(result.daysOfWaterIfNoRain)} days at the mean population; lowest it stood ${lowest} of ${result.home.capacity} (${Math.round(result.homeLowestShare * 100)}%)`);
