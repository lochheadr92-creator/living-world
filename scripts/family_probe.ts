// Why few pair up and few are born. Read-only measurement: one ordinary world; every so often each unattached grown person is
// taken through the gates of a partner proposal (options_social.ts optPropose, relations.ts spark) in order, and each woman of
// childbearing age through the gates of conception (lifecycle.ts conceptionTick), and the first gate that stops each is
// counted. Also what happened: couples formed, children conceived and born, who arrived alone.
//
//   npx vite-node scripts/family_probe.ts -- --seed aspen --days 72 [--every 300] [--rules N] [--out family.json]
import { writeFileSync } from 'node:fs';
import { BIRTH_SPACING_TICKS, CONCEPTION_PER_YEAR, DAY, TICKS_PER_YEAR } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { householdFoodPerHead } from '../src/sim/lifecycle';
import { ageYears, stageOf } from '../src/sim/people';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { spark } from '../src/sim/relations';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { Person, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'aspen');
const days = Number(opt('days', '72'));
const every = Number(opt('every', '300'));
const out = opt('out', '');
const settings = freshRunSettings(parseRunRules('rich'), 'normal', seed, { immigration: opt('arrivals', 'on') === 'on' });
const pinned = opt('rules', '');
if (pinned) settings.rulesVersion = Number(pinned);
const w: World = deserializeWorld(serializeWorld(createWorld(settings)));

const bump = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };
const grown = (p: Person): boolean => { const s = stageOf(w, p); return s === 'adult' || s === 'elder'; };
// the proposal's gates, in the order a person meets them; a look stops at the first that no candidate passes
const PAIR = ['nobody unattached and grown who is not kin', 'no such person the two could be a couple with (attraction, age within 18 years)', 'does not know any of them', 'knows them too little (familiarity under 10)', 'does not like any enough (affinity under 30)', 'does not trust any enough (trust under 20)', 'none of them in sight within ten tiles and free to talk', 'too hungry or thirsty to ask', 'asked lately (cooling off)', 'a proposal is offered'];
const pair: Record<string, number> = {};
let pairLooks = 0, offered = 0, offeredTop = 0;
const beat: Record<string, number> = {};
// conception's gates, in order
const BABY = ['no partner', 'already expecting', 'partner not of the household, or not a man', 'no home yet', 'three children at home already', 'a birth in the last year and a half', 'less than three food a head at home', 'unwell or hungry', 'may conceive'];
const baby: Record<string, number> = {};
let babyChecks = 0;
// of the checks stopped for want of food at home: how many households held three a head once their other stores are counted.
// The gate itself is the world's own count (lifecycle.ts householdFoodPerHead: the members' packs and the home's own store, and
// from rules 237 the household's other buildings too, so from 237 this second count finds nothing more).
let foodElsewhere = 0;
const elsewhere: Record<string, number> = {};
const foodPerHead = (p: Person): number => {
  const ms = w.persons.filter((m) => m.alive && m.hhId === p.hhId);
  let food = 0;
  for (const m of ms) food += foodUnits(m.inv);
  const hh = w.households.find((h) => h.id === p.hhId);
  const home = hh?.homeId ? w.byId.get(hh.homeId) : undefined;
  if (home && home.ent === 'building') food += foodUnits(home.store.items);
  return food / Math.max(1, ms.length);
};
const partnered = new Set<number>();
let couplesFormed = 0, conceived = 0, born = 0;
const wasPregnant = new Set<number>();
const known = new Set<number>(w.persons.map((p) => p.id));
let arrived = 0, arrivedGrownAlone = 0;
for (let i = 1; i <= days * DAY; i++) {
  stepWorld(w);
  for (const p of w.persons) {
    if (!known.has(p.id)) {
      known.add(p.id);
      if (ageYears(w, p) < 0.1) born++;
      else { arrived++; if (grown(p) && p.partnerId === 0) arrivedGrownAlone++; }
    }
    if (p.alive && p.partnerId !== 0 && !partnered.has(p.id)) { partnered.add(p.id); if (p.id < p.partnerId) couplesFormed++; }
    if (p.alive && p.partnerId === 0) partnered.delete(p.id);
    if (p.pregnantUntil > 0 && !wasPregnant.has(p.id)) { wasPregnant.add(p.id); conceived++; }
    if (p.pregnantUntil === 0) wasPregnant.delete(p.id);
  }
  if (i % 200 === 0) {
    for (const p of w.persons) {
      if (!p.alive || p.sex !== 'f') continue;
      const age = ageYears(w, p);
      if (age < 17 || age > 44) continue;
      babyChecks++;
      const partner = w.persons.find((q) => q.id === p.partnerId);
      const hh = w.households.find((h) => h.id === p.hhId);
      const gate = p.partnerId === 0 ? 0 : p.pregnantUntil > 0 ? 1 : !partner || partner.hhId !== p.hhId || partner.sex !== 'm' ? 2 : !hh || !hh.homeId ? 3
        : w.persons.filter((m) => m.alive && m.hhId === p.hhId && stageOf(w, m) === 'child').length >= 3 ? 4 : w.tick - (p.cooldowns.lastBirth ?? -99999) < BIRTH_SPACING_TICKS ? 5
        : householdFoodPerHead(w, p) < 3 ? 6 : p.health < 60 || p.needs.hunger < 35 ? 7 : 8;
      bump(baby, BABY[gate]);
      if (gate === 6) {
        const members = w.persons.filter((m) => m.alive && m.hhId === p.hhId).length;
        let more = 0;
        for (const b of w.buildings) if (b.hhId === p.hhId && b.id !== hh!.homeId) { const f = foodUnits(b.store.items); if (f > 0) { more += f; bump(elsewhere, b.type, f); } }
        if ((w.settings.rulesVersion ?? 0) < 237 && foodPerHead(p) + more / Math.max(1, members) >= 3) foodElsewhere++;
      }
    }
  }
  if (i % every !== 0 || i < 2 * DAY) continue;
  for (const p of w.persons) {
    if (!p.alive || !grown(p) || p.partnerId !== 0 || p.pose === 'sleep' || p.convId) continue;
    pairLooks++;
    const free = w.persons.filter((q) => q.alive && q.id !== p.id && grown(q) && q.partnerId === 0 && !p.relations[q.id]?.kin);
    const could = free.filter((q) => spark(p, q));
    const knows = could.filter((q) => p.relations[q.id]);
    const fam = knows.filter((q) => p.relations[q.id].familiarity >= 10);
    const likes = fam.filter((q) => p.relations[q.id].affinity >= 30);
    const trusts = likes.filter((q) => p.relations[q.id].trust >= 20);
    const ctx = generateOptions(w, p, true, true);
    const near = trusts.filter((q) => ctx.seenPersons.some((s) => s.id === q.id && !s.asleep && !s.busyTalking && Math.hypot(s.x - p.x, s.y - p.y) <= 10));
    const calm = ctx.drives.hunger <= 25 && ctx.drives.thirst <= 25;
    const fresh = near.filter((q) => (p.cooldowns['propose' + q.id] ?? 0) <= w.tick && (p.cooldowns['talk' + q.id] ?? 0) <= w.tick);
    const ranked = [...ctx.options].sort((a, b) => b.util - a.util);
    const prop = ranked.find((o) => /Ask .* to move in together|they mean a lot/.test(o.label));
    const gate = !free.length ? 0 : !could.length ? 1 : !knows.length ? 2 : !fam.length ? 3 : !likes.length ? 4 : !trusts.length ? 5 : !near.length ? 6 : !calm ? 7 : !fresh.length ? 8 : 9;
    bump(pair, PAIR[prop ? 9 : Math.min(gate, 8)]);
    if (prop) { offered++; if (ranked[0] === prop) offeredTop++; else bump(beat, `${ranked[0].kind}: ${ranked[0].label.replace(/\b[A-Z][a-z]+\b(?= |$)/g, 'X').slice(0, 40)}`); }
  }
}
const alive = w.persons.filter((p) => p.alive);
const adults = alive.filter(grown);
const women = alive.filter((p) => p.sex === 'f' && ageYears(w, p) >= 17 && ageYears(w, p) <= 44);
const result = { seed, days, rulesVersion: w.settings.rulesVersion, alive: alive.length, grown: adults.length, grownPartnered: adults.filter((p) => p.partnerId !== 0).length, women: women.length, womenPartnered: women.filter((p) => p.partnerId !== 0).length,
  couplesFormed, conceived, born, arrived, arrivedGrownAlone, foodElsewhere, elsewhere, pairLooks, pair, offered, offeredTop, beat, babyChecks, baby, chanceAYear: CONCEPTION_PER_YEAR, ticksAYear: TICKS_PER_YEAR };
if (out) writeFileSync(out, JSON.stringify(result));
const pct = (n: number, d: number): string => (d ? Math.round((100 * n) / d) : 0) + '%';
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}; ${alive.length} alive, ${adults.length} grown of whom ${result.grownPartnered} have a partner; ${women.length} women of 17 to 44, ${result.womenPartnered} with a partner`);
console.log(`  happened: ${couplesFormed} couples formed, ${conceived} conceived, ${born} born; ${arrived} arrived, ${arrivedGrownAlone} of them grown and alone`);
console.log(`  a partner: ${pairLooks} looks at an unattached grown person awake; where each stopped:`);
for (const k of PAIR) if (pair[k]) console.log(`    ${String(pair[k]).padStart(6)} ${pct(pair[k], pairLooks).padStart(4)}  ${k}`);
console.log(`    of the ${offered} offers, the first choice ${offeredTop} times; what beat it: ` + Object.entries(beat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${n}x ${k}`).join('; '));
console.log(`  a child: ${babyChecks} checks of a woman of 17 to 44 (every 200 ticks, as the world checks); where each stopped:`);
for (const k of BABY) if (baby[k]) console.log(`    ${String(baby[k]).padStart(6)} ${pct(baby[k], babyChecks).padStart(4)}  ${k}`);
console.log(`    of those stopped for food at home, ${foodElsewhere} (${pct(foodElsewhere, baby[BABY[6]] ?? 0)}) held three a head once the household's other stores are counted: ` + Object.entries(elsewhere).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '));
