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
import { carryCap, stageOf } from '../src/sim/people';
import { isDark } from '../src/sim/environment';
import { WEIGHT } from '../src/sim/constants';
import { toolsHeldBy } from '../src/sim/toolreg';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { setSiteSupply } from '../src/sim/site_supply';
import type { SiteSupplyPart } from '../src/sim/site_supply';
import { setSeenStock } from '../src/sim/seen_stock';
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
// --off worth,saw,room,bench switches parts of rules 229 off; --exact-stock restores the exact copy of a store's contents (rules 168)
for (const part of opt('off', '').split(',').filter(Boolean)) setSiteSupply(false, part as SiteSupplyPart);
if (args.includes('--exact-stock')) setSeenStock(false);
const pinned = opt('rules', '');
if (pinned) settings.rulesVersion = Number(pinned);
const w: World = deserializeWorld(serializeWorld(createWorld(settings)));

// --match REGEX looks at another chain than planks and bricks (iron: "iron|ore|charcoal|smelt|forg"); --knows TYPE then takes
// every grown person who knows a building of that type, instead of those who know a site short of planks or bricks
const MADE = new RegExp(opt('match', 'plank|brick'), 'i');
const KNOWS = opt('knows', '');
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
const dayGap: number[] = []; // in daylight only: how far the best step toward planks or bricks is behind the first choice
const dayBest: number[] = []; // ... and what that step is worth
let dayTop = 0;
const dayBeatenBy: Record<string, number> = {};
const packWhenNoRoom: Record<string, number> = {}; // weight carried, by item, when a refusal says the pack has no room
let noRoom = 0;
let noRoomFree = 0; // weight still free in those packs
let sawBlocked = 0; // sawing refused for want of a saw ...
let sawBlockedWhileHeld = 0; // ... while a saw is in somebody's pack
let sawOnRack = 0; // looks at which a saw lay at some timber yard
const hashBefore = (): string => serializeWorld(w).length + ':' + w.rng.a;
let impure = 0;
for (let i = 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (i % every !== 0 || i < 12 * DAY) continue; // from the second year, when the yard and the kiln stand
  for (const p of w.persons) {
    if (!p.alive || stageOf(w, p) === 'child' || p.pose === 'sleep' || p.convId) continue;
    samples++;
    const wants = KNOWS ? Object.values(p.beliefs).some((b) => b.kind === 'building' && b.btype === KNOWS) : Object.values(p.beliefs).some((b) => b.kind === 'site' && ((b.need?.planks ?? 0) > 0 || (b.need?.bricks ?? 0) > 0));
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
      if (!isDark(w)) {
        dayBest.push(mine[0].util);
        if (ranked[0] === mine[0]) dayTop++;
        else { dayGap.push(ranked[0].util - mine[0].util); bump(dayBeatenBy, `${ranked[0].kind}: ${strip(ranked[0].label)}`.slice(0, 60)); }
      }
    } else if (refused.length) {
      onlyRefused++;
    } else {
      silent++;
      bump(silentDoing, p.activity ? p.activity.kind : 'idle');
    }
    for (const r of refused) bump(refusals, `${strip(r.label)}: ${strip(r.blocked ?? '')}`);
    if (refused.some((r) => /no room in my pack/.test(r.blocked ?? ''))) {
      noRoom++;
      let carried = 0;
      for (const k of Object.keys(p.inv) as (keyof typeof WEIGHT)[]) { const wt = (p.inv[k] ?? 0) * WEIGHT[k]; if (wt > 0) { bump(packWhenNoRoom, k, wt); carried += wt; } }
      noRoomFree += carryCap(w, p) - carried;
    }
    if (refused.some((r) => /needs a saw/.test(r.blocked ?? ''))) {
      sawBlocked++;
      if (w.persons.some((q) => q.alive && toolsHeldBy(w, q.id, 'saw').length > 0)) sawBlockedWhileHeld++;
    }
    if (w.buildings.some((b) => b.type === 'timber_yard' && (b.store.items.saw ?? 0) > 0)) sawOnRack++;
  }
}
const top = (o: Record<string, number>, n: number): string => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v}x ${k}`).join('\n    ');
const meanGap = gap.length ? gap.reduce((a, b) => a + b, 0) / gap.length : 0;
const q = (xs: number[], f: number): number => { const s2 = [...xs].sort((a, b) => a - b); return s2.length ? s2[Math.min(s2.length - 1, Math.floor(f * s2.length))] : 0; };
const sawsHeld = w.persons.filter((x) => x.alive).reduce((n, x) => n + toolsHeldBy(w, x.id, 'saw').length, 0);
const daylight = { offered: dayBest.length, top: dayTop, gapQ: [0.1, 0.25, 0.5, 0.75, 0.9].map((f) => Math.round(q(dayGap, f) * 10) / 10), bestQ: [0.1, 0.5, 0.9].map((f) => Math.round(q(dayBest, f) * 10) / 10), beatenBy: dayBeatenBy };
const pack = { noRoom, meanFree: noRoom ? noRoomFree / noRoom : 0, weightByItem: packWhenNoRoom };
const saws = { sawBlocked, sawBlockedWhileHeld, sawOnRack, heldAtEnd: sawsHeld };
const grown = w.persons.filter((x) => x.alive && stageOf(w, x) !== 'child');
const holds = (k: 'charcoal' | 'smelting' | 'forging'): number => grown.filter((x) => x.techniques?.[k]).length;
const tries = (k: 'charcoal' | 'smelting' | 'forging'): number => grown.reduce((n, x) => n + (x.techniques?.[k] ? 0 : 0) + Number((x as { trials?: Record<string, { attempts?: number }> }).trials?.[k]?.attempts ?? 0), 0);
const made = (k: string): number => (w.ledger.created as Record<string, number>)[k] ?? 0;
const iron = { grown: grown.length, holdCharcoal: holds('charcoal'), holdSmelting: holds('smelting'), holdForging: holds('forging'), trials: { smelting: tries('smelting'), forging: tries('forging') }, made: { charcoal: made('charcoal'), ore: made('ore'), iron: made('iron') }, oreMined: (w.ledger.reasons as Record<string, number>)['extracted from the vein'] ?? 0, picks: grown.reduce((n, x) => n + toolsHeldBy(w, x.id, 'pick').length, 0), worn: grown.filter((x) => toolsHeldBy(w, x.id).some((t) => t.wear >= 18 && t.tier !== 1)).length };
const result = { iron, daylight, pack, saws, seed, days, every, rulesVersion: w.settings.rulesVersion, samples, wantSamples, offered, offeredTop, onlyRefused, silent, meanGap, offeredLabels, refusals, beatenBy, silentDoing, impure, made: { planks: (w.ledger.created as Record<string, number>).planks ?? 0, bricks: (w.ledger.created as Record<string, number>).bricks ?? 0 } };
if (out) writeFileSync(out, JSON.stringify(result));
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}; planks made ${result.made.planks}, bricks made ${result.made.bricks}; observer changed the world in ${impure} checks`);
console.log(`looks at a grown person awake: ${samples}; of which they knew a site short of planks or bricks: ${wantSamples}`);
console.log(`  an option about planks or bricks was offered: ${offered} (their first choice ${offeredTop} times; otherwise behind by ${meanGap.toFixed(1)} on average)`);
console.log(`  none offered but a refusal said why: ${onlyRefused}; neither offered nor refused: ${silent}`);
console.log('  what was offered:\n    ' + top(offeredLabels, 10));
console.log('  what beat it:\n    ' + top(beatenBy, 12));
console.log('  refusals:\n    ' + top(refusals, 24));
console.log(`  in daylight: a step offered ${daylight.offered} times, first choice ${daylight.top}; behind by (10th, 25th, middle, 75th, 90th) ${daylight.gapQ.join(', ')}; the step itself worth (10th, middle, 90th) ${daylight.bestQ.join(', ')}`);
console.log('  what beat it in daylight:\n    ' + top(dayBeatenBy, 14));
console.log(`  packs with no room (${noRoom} looks, ${pack.meanFree.toFixed(1)} weight free on average), weight carried by item: ` + Object.entries(packWhenNoRoom).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${(v / Math.max(1, noRoom)).toFixed(1)}`).join(', '));
console.log(`  sawing refused for want of a saw ${sawBlocked} times, ${sawBlockedWhileHeld} of them while a saw was in somebody's pack; a saw lay at a timber yard at ${sawOnRack} looks; saws in packs at the end ${sawsHeld}`);
console.log(`  iron: of ${iron.grown} grown people ${iron.holdCharcoal} know charcoal firing, ${iron.holdSmelting} smelting, ${iron.holdForging} forging; ${iron.picks} picks held; ${iron.worn} people hold a worn tool an iron one would replace; made charcoal ${iron.made.charcoal}, iron ${iron.made.iron}`);
console.log('  doing, when nothing was offered or refused: ' + top(silentDoing, 8).replace(/\n\s+/g, '; '));
