// Why nobody makes planks or bricks. Read-only measurement: one ordinary world; every so often each grown person's options are
// generated as an observer (decision.ts generateOptions with observer set, which changes nothing), and for the options and the
// refusals that concern planks or bricks it is counted what was offered, how it ranked against what they would choose, and what
// each refusal said.
//
//   npx vite-node scripts/supply_probe.ts -- --seed birch --days 36 [--every 300] [--rules N] [--out supply.json]
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { createWorld } from '../src/sim/factory';
import { stageOf } from '../src/sim/people';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld, } from '../src/app/save';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'birch');
const days = Number(opt('days', '36'));
const every = Number(opt('every', '300'));
const out = opt('out', '');
const settings = freshRunSettings(parseRunRules('rich'), 'normal', seed, { immigration: opt('arrivals', 'on') === 'on' });
const pinned = opt('rules', '');
if (pinned) settings.rulesVersion = Number(pinned);
const w: World = deserializeWorld(serializeWorld(createWorld(settings)));

const MADE = /plank|brick/i;
const bump = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };
const strip = (s: string): string => s.replace(/\d+(\.\d+)?/g, 'N').replace(/\b[A-Z][a-z]+(?= household|'s)/g, 'X').slice(0, 110);
let samples = 0;
let wantSamples = 0; // the person knows of a site that still needs planks or bricks
let offered = 0; // ... and some option concerning planks or bricks is among their options
let offeredTop = 0; // ... and it is the option they would choose
let onlyRefused = 0; // ... and none is offered, but a refusal names why
let silent = 0; // ... and neither an option nor a refusal mentions them
const offeredLabels: Record<string, number> = {};
const refusals: Record<string, number> = {};
const beatenBy: Record<string, number> = {};
const gap: number[] = [];
const silentDoing: Record<string, number> = {};
const hashBefore = (): string => serializeWorld(w).length + ':' + w.rng.a;
let impure = 0;
for (let i = 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (i % every !== 0 || i < 12 * DAY) continue; // from the second year, when the yard and the kiln stand
  for (const p of w.persons) {
    if (!p.alive || stageOf(w, p) === 'child' || p.pose === 'sleep' || p.convId) continue;
    samples++;
    const wants = Object.values(p.beliefs).some((b) => b.kind === 'site' && ((b.need?.planks ?? 0) > 0 || (b.need?.bricks ?? 0) > 0));
    if (!wants) continue;
    wantSamples++;
    const before = samples % 97 === 0 ? hashBefore() : '';
    const ctx = generateOptions(w, p, true, true);
    if (before && before !== hashBefore()) impure++;
    const ranked = [...ctx.options].sort((a, b) => b.util - a.util);
    const mine = ranked.filter((o) => MADE.test(o.label) || MADE.test(o.goal) || o.parts.some((part) => MADE.test(String((part as { why?: string }).why ?? ''))));
    const refused = ctx.blocked.filter((o) => MADE.test(o.label) || MADE.test(o.blocked ?? '') || o.kind === 'operate');
    if (mine.length) {
      offered++;
      bump(offeredLabels, strip(mine[0].label));
      if (ranked[0] === mine[0]) offeredTop++;
      else { bump(beatenBy, `${ranked[0].kind}: ${strip(ranked[0].label)}`.slice(0, 60)); gap.push(ranked[0].util - mine[0].util); }
    } else if (refused.length) {
      onlyRefused++;
    } else {
      silent++;
      bump(silentDoing, p.activity ? p.activity.kind : 'idle');
    }
    for (const r of refused) bump(refusals, `${strip(r.label)}: ${strip(r.blocked ?? '')}`);
  }
}
const top = (o: Record<string, number>, n: number): string => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v}x ${k}`).join('\n    ');
const meanGap = gap.length ? gap.reduce((a, b) => a + b, 0) / gap.length : 0;
const result = { seed, days, every, rulesVersion: w.settings.rulesVersion, samples, wantSamples, offered, offeredTop, onlyRefused, silent, meanGap, offeredLabels, refusals, beatenBy, silentDoing, impure, made: { planks: (w.ledger.created as Record<string, number>).planks ?? 0, bricks: (w.ledger.created as Record<string, number>).bricks ?? 0 } };
if (out) writeFileSync(out, JSON.stringify(result));
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}; planks made ${result.made.planks}, bricks made ${result.made.bricks}; observer changed the world in ${impure} checks`);
console.log(`looks at a grown person awake: ${samples}; of which they knew a site short of planks or bricks: ${wantSamples}`);
console.log(`  an option about planks or bricks was offered: ${offered} (their first choice ${offeredTop} times; otherwise behind by ${meanGap.toFixed(1)} on average)`);
console.log(`  none offered but a refusal said why: ${onlyRefused}; neither offered nor refused: ${silent}`);
console.log('  what was offered:\n    ' + top(offeredLabels, 10));
console.log('  what beat it:\n    ' + top(beatenBy, 12));
console.log('  refusals:\n    ' + top(refusals, 24));
console.log('  doing, when nothing was offered or refused: ' + top(silentDoing, 8).replace(/\n\s+/g, '; '));
