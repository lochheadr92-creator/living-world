// How often a wolf is wounded and killed. Read-only measurement: one ordinary world; every wound a wolf takes is recorded
// (tick, which wolf, health after), with the stands made, the bites taken, the wolves killed and the wolves come back. From
// the list of wounds the script also says how many wolves other settings of the wound and the mending would have killed
// (as if the wolves had behaved the same, which a dead wolf does not).
//
//   npx vite-node scripts/wolf_probe.ts -- --seed aspen --days 36 [--rules N] [--out wolves.json]
//   (or --load <save point> in place of --seed: see scripts/world_args.ts)
import { writeFileSync } from 'node:fs';
import { worldFromArgs } from './world_args';
import { DAY } from '../src/sim/constants';
import { defProbe, defReset, defSnapshot } from '../src/sim/defence';
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { skinsHung } from '../src/sim/wolf_skin';
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
// a world read from --load (a save point written by a long run) or made fresh (scripts/world_args.ts)
const { w }: { w: World } = worldFromArgs(opt, seed);
seed = w.settings.seed;
defProbe.on = true;
defReset();

const wolvesNow = (): Map<number, number> => new Map(w.animals.filter((a) => a.type === 'wolf').map((a) => [a.id, a.health]));
let before = wolvesNow();
const atStart = before.size;
const wounds: { tick: number; wolf: number; after: number }[] = [];
let killed = 0, cameBack = 0, bites = 0, wolfDeaths = 0, deceased = 0;
// rules 241 (wolf_skin.ts): when the first skin was cut and when the first was hung
let firstSkinCut = 0, firstSkinHung = 0;
let lastEvent = w.events.length ? w.events[w.events.length - 1].id : 0;
for (let i = w.tick + 1; i <= days * DAY; i++) {
  stepWorld(w);
  const now = wolvesNow();
  for (const [id, h] of now) {
    const was = before.get(id);
    if (was === undefined) cameBack++;
    else if (h < was) wounds.push({ tick: w.tick, wolf: id, after: h });
  }
  for (const id of before.keys()) if (!now.has(id)) { killed++; wounds.push({ tick: w.tick, wolf: id, after: 0 }); }
  before = now;
  // the event list is capped, so new events are told by their ids, not by the list's length
  for (let k = w.events.length - 1; k >= 0 && w.events[k].id > lastEvent; k--) if (/^A wolf bit /.test(w.events[k].text)) bites++;
  if (w.events.length) lastEvent = w.events[w.events.length - 1].id;
  if (!firstSkinCut && w.persons.some((p) => p.wolfSkins)) firstSkinCut = w.tick;
  if (!firstSkinHung && skinsHung(w) > 0) firstSkinHung = w.tick;
  for (const d of w.deceased.slice(deceased)) if (d.cause === 'wolf attack') wolfDeaths++;
  deceased = w.deceased.length;
}
const d = defSnapshot();
/** how many wolves a wound of `dose` mending `perDay` a day would have killed, from the stands that were actually won */
function wouldKill(dose: number, perDay: number): number {
  const health = new Map<number, { h: number; at: number }>();
  let n = 0;
  const dead = new Set<number>();
  for (const x of wounds) {
    if (dead.has(x.wolf)) continue;
    const s = health.get(x.wolf) ?? { h: 100, at: x.tick };
    const h = Math.min(100, s.h + ((x.tick - s.at) / DAY) * perDay) - dose;
    if (h <= 0) { dead.add(x.wolf); n++; } else health.set(x.wolf, { h, at: x.tick });
  }
  return n;
}
const perWolf: Record<number, number> = {};
for (const x of wounds) perWolf[x.wolf] = (perWolf[x.wolf] ?? 0) + 1;
const result = { seed, days, rulesVersion: w.settings.rulesVersion, alive: w.persons.filter((p) => p.alive).length, wolvesAtStart: atStart, wolvesAtEnd: before.size, killed, cameBack, bites, wolfDeaths, firstSkinCut, firstSkinHung, skinsHung: skinsHung(w), skinsHeld: w.persons.reduce((n, p) => n + (p.wolfSkins ?? 0), 0), skinPlaces: w.buildings.filter((b) => b.wolfSkins).map((b) => `${b.type} ${b.wolfSkins}`), hidesFromWolvesLeftToRot: w.piles.filter((b) => b.carcass?.species === 'wolf' && b.carcass.remaining.hide > 0).length, defence: d,
  spears: w.tools.filter((t) => t.kind === 'spear').length, wounds, woundsPerWolf: Object.values(perWolf).sort((a, b) => b - a),
  wouldKill: { 'wound 34, mends 10 a day': wouldKill(34, 10), 'wound 34, mends 5 a day': wouldKill(34, 5), 'wound 50, mends 10 a day': wouldKill(50, 10), 'wound 50, mends 5 a day': wouldKill(50, 5), 'wound 50, mends 2 a day': wouldKill(50, 2), 'wound 100': wouldKill(100, 0) } };
if (out) writeFileSync(out, JSON.stringify(result));
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}; ${result.alive} alive; wolves ${atStart} at the start, ${before.size} at the end; ${killed} killed, ${cameBack} came back; ${bites} bites, ${wolfDeaths} people killed by wolves; ${result.spears} spears`);
console.log(`  stands: offered ${d.offered}, set out ${d.setOut}, tried ${d.attempts}, won ${d.droveOff} (wounded ${d.wounded}, killed ${d.killed}), lost ${d.failed}, the wolf left first ${d.leftOnItsOwn}`);
console.log(`  wolf skins: first cut on tick ${firstSkinCut || 'never'}, first hung on tick ${firstSkinHung || 'never'}; ${result.skinsHung} hung (${result.skinPlaces.join(', ') || 'nowhere'}), ${result.skinsHeld} still held`);
console.log(`  wounds by wolf (most first): ${result.woundsPerWolf.join(' ') || 'none'}; on days ${wounds.map((x) => Math.round((x.tick / DAY) * 10) / 10).join(' ')}`);
console.log('  from these wounds, wolves killed under other settings: ' + Object.entries(result.wouldKill).map(([k, n]) => `${k}: ${n}`).join('; '));
