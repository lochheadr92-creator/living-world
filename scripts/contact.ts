// Do the camps of a larger world ever meet?  Runs the world and, each day, reports how far from their own camp people have been, how
// many know a place that belongs to another camp, how many have a relation with someone from another camp, and whether anyone is
// talking to, or standing within sight of, a person of another camp.
//   npx vite-node scripts/contact.ts -- --profile huge --days 30 [--arrivals off] [--seed meadow]
// A person's camp is the settlement nearest to where they were at tick 0 (founders only; arrivals, if on, are counted apart).
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { nearestHub } from '../src/sim/settlements';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const profile = opt('profile', 'huge') as ProfileName;
const days = Number(opt('days', '30'));
const w = createWorld(settingsForProfile(profile, opt('seed', 'meadow'), { immigration: opt('arrivals', 'off') !== 'off' }));
const hubs = [w.camp, ...(w.extraSettlements ?? [])];
const campOfPoint = (x: number, y: number): number => hubs.indexOf(nearestHub(w, x, y));
const home = new Map<number, number>();
for (const p of w.persons) home.set(p.id, campOfPoint(p.x, p.y));
const minHubGap = Math.min(...hubs.flatMap((a, i) => hubs.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
console.log(`${profile}: ${hubs.length} camps, nearest two are ${minHubGap.toFixed(0)} tiles apart; ${w.persons.length} founders`);
console.log('day  farthest from own camp (tiles)  | people ever > 30 / 50 tiles out | know a place nearer another camp | relations across camps (people with one) | in a talk across camps now | in sight of another camp now | foreign camps whose fire/building anyone has seen');

const everOut30 = new Set<number>();
const everOut50 = new Set<number>();
let farthest = 0;
const seenCamp = new Set<string>(); // "viewer camp>seen camp" for buildings
for (let t = 1; t <= days * DAY; t++) {
  stepWorld(w);
  const dayEnd = t % DAY === 0;
  // cheap per-tick tracking of how far anyone is from their own camp
  if (t % 20 === 0) {
    for (const p of w.persons) {
      if (!p.alive || !home.has(p.id)) continue;
      const h = hubs[home.get(p.id)!];
      const d = Math.hypot(p.x - h.x, p.y - h.y);
      if (d > farthest) farthest = d;
      if (d > 30) everOut30.add(p.id);
      if (d > 50) everOut50.add(p.id);
    }
  }
  if (!dayEnd) continue;
  let knowForeign = 0;
  let relAcross = 0;
  let talkAcross = 0;
  let sightAcross = 0;
  for (const p of w.persons) {
    if (!p.alive || !home.has(p.id)) continue;
    const mine = home.get(p.id)!;
    let foreign = false;
    for (const id in p.beliefs) {
      const b = p.beliefs[id as unknown as number];
      if (b.kind === 'water') continue;
      const c = campOfPoint(b.x, b.y);
      if (c !== mine && Math.hypot(b.x - hubs[c].x, b.y - hubs[c].y) < 25) {
        foreign = true;
        if (b.kind === 'building') seenCamp.add(`${mine}>${c}`);
      }
    }
    if (foreign) knowForeign++;
    let cross = false;
    for (const id in p.relations) if (home.has(Number(id)) && home.get(Number(id)) !== mine) cross = true;
    if (cross) relAcross++;
    for (const s of p.seen) if (s.ent === 'person' && home.has(s.id) && home.get(s.id) !== mine) sightAcross++;
    if (p.convId) {
      const c = w.conversations.find((q) => q.id === p.convId);
      if (c && [c.a, c.b].some((m) => home.has(m) && home.get(m) !== mine)) talkAcross++;
    }
  }
  const d = t / DAY;
  if (d <= 5 || d % 5 === 0) console.log([d, farthest.toFixed(0), `${everOut30.size} / ${everOut50.size}`, knowForeign, relAcross, talkAcross, sightAcross, seenCamp.size].map((v) => String(v).padEnd(8)).join(''));
}
console.log(`\nfarthest anyone got from their own camp: ${farthest.toFixed(0)} tiles; people who were ever over 30 tiles out: ${everOut30.size}; over 50: ${everOut50.size}`);
console.log(`ordered pairs (camp A knows a building of camp B): ${seenCamp.size} of ${hubs.length * (hubs.length - 1)}`);
