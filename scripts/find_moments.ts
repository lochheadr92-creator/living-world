// Disposable: find the moments worth watching in an ordinary world. usage: npx vite-node scripts/find_moments.ts <seed> <days>
import { createWorld, defaultSettings } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { clockText, dayNumber } from '../src/sim/environment';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 40);
const w = createWorld({ ...defaultSettings(seed) });
const CATS: Record<string, RegExp> = {
  site_started: /marked out/,
  planks_batch: /finished (hewn|sawn) planks/,
  bricks_batch: /finished fired bricks/,
  stone_batch: /finished cut stone/,
  bread_batch: /finished (milled|baked)/,
  iron_batch: /finished (smelted|forged)/,
  site_finished: /finished (a|an|the) |finished rebuilding/,
  promised: /promised/,
  kept: /kept a promise/,
  broken_promise: /did not keep a promise/,
  meal_hosted: /hosted a shared meal/,
  meal_off: /shared meal .* was called off/,
  welfare: /looked in on .* and brought/,
  argued: /argued over|reached the last/,
  peace: /made peace/,
  good_terms: /on good terms again/,
  lent: /lent an? /,
  returned: /returned .*’s/,
};
const tally: Record<string, number> = {};
const first: Record<string, string[]> = {};
let last = -1;
for (let t = 0; t < days * DAY; t++) {
  stepWorld(w);
  for (let i = w.events.length - 1; i >= 0; i--) {
    const e = w.events[i];
    if (e.id <= last) break;
    for (const [k, re] of Object.entries(CATS)) {
      if (re.test(e.text)) {
        tally[k] = (tally[k] ?? 0) + 1;
        const arr = (first[k] ??= []);
        if (arr.length < 4) arr.push(`day ${dayNumber(e.tick)} ${clockText(e.tick)} t${e.tick}: ${e.text}`);
      }
    }
  }
  if (w.events.length) last = Math.max(last, w.events[w.events.length - 1].id);
}
// the story of the first pair whose quarrel ended: everything the feed says about the two of them
const gt = w.events.find((e) => /on good terms again/.test(e.text));
if (gt) {
  const names = gt.text.replace(/ are on good terms.*/, '').split(' and ');
  console.log('--- the pair', names.join(' & '));
  for (const e of w.events) if (names.every((n) => e.text.includes(n))) console.log(`   day ${dayNumber(e.tick)} ${clockText(e.tick)} t${e.tick} [${e.kind}] ${e.text}`);
}
console.log(`${seed}: ${days} days, pop ${w.persons.length}, deaths ${w.deceased.length}`);
for (const k of Object.keys(CATS)) console.log(`${k.padEnd(15)} ${String(tally[k] ?? 0).padStart(4)}  ${(first[k] ?? []).map((x) => x.slice(0, 120)).join('\n                      ')}`);
