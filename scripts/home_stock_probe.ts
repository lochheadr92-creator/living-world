// What a household thinks it holds at home, against what it holds. Read-only measurement: one ordinary world, stepped as it is; the
// probe only looks (it writes nothing to the world: a run with it and a run with --bare end on the same hash).
//
// Since rules 169 a sight of a store remembers each kind of item as one unit (src/sim/seen_stock.ts), the home included. A household's
// idea of its own food (`hhState` in src/sim/options_work.ts) is the deciding person's own pack plus the home buildings they remember,
// against 4.5 or 6 a head; `shortage` above 0.4 and 0.5 gates the extra field, building wants and foraging urgency. This asks:
//
//   1. at home, what a grown member remembers against what the store holds (every 300 ticks from day 2),
//   2. the household's `shortage` as the sim computes it, and what it would be with the true home food,
//   3. how many units a `withdraw` or `eat_store` trip moves, by the kind of building it went to.
//
//   node scripts/fast.mjs scripts/home_stock_probe.ts -- --seed aspen --days 24 [--rules N] [--arrivals on|off] [--out stock.json]
//   (or --load <save point> in place of --seed: see scripts/world_args.ts; --bare steps the world with no observation, for the purity check)
import { writeFileSync } from 'node:fs';
import { worldFromArgs } from './world_args';
import { DAY, isHomeType } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { hasCellars } from '../src/sim/cellars';
import { generateOptions } from '../src/sim/decision';
import { foodCount, beliefsByKind, makeCtx } from '../src/sim/optutil';
import { hhState } from '../src/sim/options_work';
import { stageOf } from '../src/sim/people';
import { glancedItems } from '../src/sim/seen_stock';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Items, ItemKind, Person, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const days = Number(opt('days', '24'));
const out = opt('out', '');
const bare = args.includes('--bare');
const EVERY = 300; // ticks between samples
const FROM_DAY = 2;
const { w }: { w: World } = worldFromArgs(opt, opt('seed', 'aspen'));
const seed = w.settings.seed;

const round = (n: number, d = 3): number => Math.round(n * 10 ** d) / 10 ** d;
const share = (n: number, of: number): number => (of > 0 ? round(n / of) : 0);
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const isFoodKind = (k: string): boolean => foodUnits({ [k]: 1 } as Items) > 0;
const bucketOf = (n: number | null): string => (n === null ? 'none' : n >= 4 ? '4+' : String(n));
const hist = (n: number): string => (n <= 0 ? '0' : n < 3 ? '1-2' : n < 6 ? '3-5' : n < 10 ? '6-9' : n < 20 ? '10-19' : '20+');

// ───────────── 1 and 2: samples ─────────────
interface Acc { n: number; sum: Record<string, number>; hit: Record<string, number> }
const acc = (): Acc => ({ n: 0, sum: {}, hit: {} });
const addSum = (a: Acc, k: string, v: number): void => { a.sum[k] = (a.sum[k] ?? 0) + v; };
const addHit = (a: Acc, k: string, yes: boolean): void => { if (yes) a.hit[k] = (a.hit[k] ?? 0) + 1; };
const house = acc(); // one row per household with a home and a grown member (the first grown member, lowest id, is the observer)
const member = acc(); // one row per grown member of such a household
const histBelieved: Record<string, number> = {};
const histTrue: Record<string, number> = {};
const shortRows = { replicaMismatch: 0, ctxMismatch: 0, ctxChecked: 0 };
let sampleTimes = 0;
let dropped = { noHome: 0, noGrown: 0 };

/** The household's home food as hhState counts it (same loop, same keys), with the remembered items or the true store. */
function homeFoodOf(world: World, p: Person, truth: boolean, all: boolean): number {
  let n = 0;
  const count = (items: Items | undefined): number => (all ? foodUnits(items ?? {}) : foodCount((items ?? {}) as Items));
  for (const b of beliefsByKind(p, ['building'])) {
    const home = b.hh === p.hhId && isHomeType(b.btype);
    const cellar = hasCellars(world) && b.hh === p.hhId && b.btype === 'cellar';
    if (!home && !cellar) continue;
    let items: Items | undefined = b.items;
    if (truth) {
      const e = world.byId.get(b.id);
      items = e && e.ent === 'building' ? e.store.items : undefined;
    }
    n += count(items);
  }
  return n;
}

function sample(world: World): void {
  sampleTimes++;
  for (const hh of world.households) {
    const home = hh.homeId ? world.byId.get(hh.homeId) : undefined;
    if (!home || home.ent !== 'building') { dropped.noHome++; continue; }
    const grown: Person[] = [];
    for (const id of hh.members) {
      const e = world.byId.get(id);
      if (e && e.ent === 'person' && e.alive && stageOf(world, e) !== 'child') grown.push(e);
    }
    if (!grown.length) { dropped.noGrown++; continue; }
    grown.sort((a, b) => a.id - b.id);
    const trueHome = foodUnits(home.store.items);
    const trueCounted = foodCount(home.store.items);
    const freshGlance = foodUnits(glancedItems(world, home.store.items, home.store.cap));
    const memberPacks = hh.members.reduce((s, id) => { const e = world.byId.get(id); return s + (e && e.ent === 'person' && e.alive ? foodUnits(e.inv) : 0); }, 0);
    grown.forEach((p, idx) => {
      const a = idx === 0 ? [house, member] : [member];
      // measurement 1: the home building's own belief
      const bel = p.beliefs[home.id];
      const believed = bel?.items ? foodUnits(bel.items) : 0;
      // measurement 2: the sim's own numbers, and the same formula with the true home food
      const ctx = makeCtx(world, p, false, true);
      const hs = hhState(ctx);
      const target = hs.foodTarget;
      const replica = homeFoodOf(world, p, false, false);
      const trueSim = homeFoodOf(world, p, true, false);
      const trueAll = homeFoodOf(world, p, true, true);
      const sh = (stock: number): number => clamp01(1 - stock / target);
      const shA = hs.shortage; // as computed
      const shB = sh(ctx.food + trueSim); // true home food, the sim's own food kinds
      const shC = sh(foodUnits(p.inv) + trueAll); // true home food, every food kind (bread and meat too)
      const shD = sh(memberPacks + trueAll); // C and every member's pack: what the household really holds
      for (const row of a) {
        row.n++;
        addSum(row, 'believed', believed);
        addSum(row, 'true', trueHome);
        addSum(row, 'trueCountedBySim', trueCounted);
        addSum(row, 'freshGlance', freshGlance);
        addSum(row, 'beliefAge', bel ? world.tick - bel.seen : 0);
        addSum(row, 'simHomeFood', hs.homeFood);
        addSum(row, 'target', target);
        addSum(row, 'packFood', ctx.food);
        addSum(row, 'shortageSim', shA); addSum(row, 'shortageTrueHome', shB); addSum(row, 'shortageTrueAllKinds', shC); addSum(row, 'shortageTrueHousehold', shD);
        addHit(row, 'noBelief', !bel);
        addHit(row, 'noItemsInBelief', !!bel && !bel.items);
        addHit(row, 'trueAtLeast3MoreThanBelieved', trueHome - believed >= 3);
        addHit(row, 'believedZeroTruePositive', believed === 0 && trueHome > 0);
        addHit(row, 'trueHomeHasFood', trueHome > 0);
        addHit(row, 'freshGlanceAtLeast3Below', trueHome - freshGlance >= 3);
        addHit(row, 'beliefOlderThan600', !!bel && world.tick - bel.seen > 600);
        for (const [name, v] of [['Sim', shA], ['TrueHome', shB], ['TrueAllKinds', shC], ['TrueHousehold', shD]] as [string, number][]) {
          addHit(row, 'short04' + name, v > 0.4);
          addHit(row, 'short05' + name, v > 0.5);
        }
        addHit(row, 'shortSimButNotTrueHome04', shA > 0.4 && shB <= 0.4);
        addHit(row, 'notShortSimButTrueHome04', shA <= 0.4 && shB > 0.4);
        addHit(row, 'shortSimButNotTrueHome05', shA > 0.5 && shB <= 0.5);
        addHit(row, 'shortSimButNotTrueHousehold04', shA > 0.4 && shD <= 0.4);
        addHit(row, 'breadOrMeatAtHome', trueHome - trueCounted > 0);
      }
      if (idx === 0) {
        histBelieved[hist(believed)] = (histBelieved[hist(believed)] ?? 0) + 1;
        histTrue[hist(trueHome)] = (histTrue[hist(trueHome)] ?? 0) + 1;
        if (replica !== hs.homeFood) shortRows.replicaMismatch++;
        // a few times only: hhState from the full option pass (observer mode) against the one from the bare context
        if (sampleTimes <= 5 && shortRows.ctxChecked < 12) {
          shortRows.ctxChecked++;
          const full = hhState(generateOptions(world, p, true, true));
          if (full.shortage !== hs.shortage || full.homeFood !== hs.homeFood || full.foodStock !== hs.foodStock) shortRows.ctxMismatch++;
        }
      }
    });
  }
}

// ───────────── 3: trips ─────────────
const tallies: Record<string, Record<string, number>> = {};
const tally = (key: string, bucket: string): void => { const t = (tallies[key] ??= {}); t[bucket] = (t[bucket] ?? 0) + 1; };
const ended: Record<string, Record<string, number>> = {};
const pendingEat = new Map<number, number>();
const withdrawnUnits: Record<string, Record<string, number>> = {}; // building type -> item -> units, by reason 'withdraw'
const eatenUnits: Record<string, number> = {}; // building type -> units, by reason 'eat from store'
const capped = { items: 0, believed1: 0, requestIs1: 0, requestEqualsBelieved: 0, cappedByMemory: 0, leftBehindWhenCapped: 0 };
const cappedFood = { ...capped };
const cappedHome = { ...capped };

const targetGroup = (world: World, p: Person, targetId: number): { type: string; own: boolean } => {
  const e = world.byId.get(targetId);
  if (!e) return { type: 'gone', own: false };
  if (e.ent === 'building') return { type: e.type, own: isHomeType(e.type) && e.hhId === p.hhId };
  return { type: e.ent, own: false };
};
const typeOfTag = (world: World, tag: string): string => {
  const id = Number(tag.slice(tag.indexOf(':') + 1));
  const e = Number.isFinite(id) ? world.byId.get(id) : undefined;
  return !e ? 'gone' : e.ent === 'building' ? e.type : e.ent;
};

function trip(world: World, p: Person, a: { kind: string; label: string; targetId: number; data: Record<string, any>; cycle: number }, outcome: string): void {
  if (a.kind !== 'withdraw' && a.kind !== 'eat_store') return;
  const g = targetGroup(world, p, a.targetId);
  const e1 = (ended[a.kind] ??= {});
  e1[outcome] = (e1[outcome] ?? 0) + 1;
  if (outcome !== 'success') return;
  const groups = ['all', 'bt:' + g.type];
  if (g.own) groups.push('own_home');
  if (a.kind === 'withdraw') {
    const keys = Object.keys((a.data.items ?? {}) as Record<string, number>);
    const foodTrip = keys.length > 0 && keys.every(isFoodKind);
    groups.push(keys.length === 0 ? 'items_unknown' : foodTrip ? 'food' : 'nonfood');
    const m = /\d+/.exec(a.label);
    const labelN = m ? Number(m[0]) : null;
    for (const grp of groups) {
      tally(`withdraw|label|${grp}`, bucketOf(labelN));
      tally(`withdraw|moved|${grp}`, bucketOf(a.cycle > 0 ? a.cycle : null));
    }
  } else {
    const got = pendingEat.get(p.id) ?? 0;
    for (const grp of groups) tally(`eat_store|units|${grp}`, bucketOf(got));
  }
}

function startOfWithdraw(world: World, p: Person, a: { data: Record<string, any>; targetId: number }): void {
  const e = world.byId.get(a.targetId);
  const items = e && e.ent === 'building' ? e.store.items : e && e.ent === 'pile' ? e.items : null;
  if (!items) return;
  const g = targetGroup(world, p, a.targetId);
  const believedItems = p.beliefs[a.targetId]?.items ?? {};
  for (const [k, n] of Object.entries((a.data.items ?? {}) as Record<string, number>)) {
    const believed = believedItems[k as ItemKind] ?? 0;
    const have = items[k as ItemKind] ?? 0;
    const isCapped = n === believed && have - n >= 2;
    for (const c of [capped, ...(isFoodKind(k) ? [cappedFood] : []), ...(g.own ? [cappedHome] : [])]) {
      c.items++;
      if (believed === 1) c.believed1++;
      if (n === 1) c.requestIs1++;
      if (n === believed) c.requestEqualsBelieved++;
      if (isCapped) { c.cappedByMemory++; c.leftBehindWhenCapped += have - n; }
    }
  }
}

// ───────────── the run ─────────────
w.hooks = bare ? undefined : {
  onActivityStart: (p, a) => {
    if (a.kind === 'eat_store') pendingEat.set(p.id, 0);
    else if (a.kind === 'withdraw') startOfWithdraw(w, p, a);
  },
  onTransfer: (info) => {
    if (info.reason === 'eat from store' && info.to.startsWith('person:')) {
      const id = Number(info.to.slice(7));
      pendingEat.set(id, (pendingEat.get(id) ?? 0) + info.n);
      const t = typeOfTag(w, info.from);
      eatenUnits[t] = (eatenUnits[t] ?? 0) + info.n;
    } else if (info.reason === 'withdraw' && info.to.startsWith('person:')) {
      const t = typeOfTag(w, info.from);
      const o = (withdrawnUnits[t] ??= {});
      o[info.item] = (o[info.item] ?? 0) + info.n;
    }
  },
  onActivityEnd: (p, a, outcome) => trip(w, p, a, outcome),
};
const began = Date.now();
for (let i = w.tick + 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (!bare && i % EVERY === 0 && i >= FROM_DAY * DAY) sample(w);
  if (i % (2 * DAY) === 0) console.log(`.. day ${i / DAY} of ${days}, ${Math.round((Date.now() - began) / 1000)}s`);
}
const endHash = hashWorld(w);

// ───────────── report ─────────────
const rowOut = (a: Acc) => {
  const mean = (k: string): number => round((a.sum[k] ?? 0) / Math.max(1, a.n), 2);
  const frac = (k: string): number => share(a.hit[k] ?? 0, a.n);
  const o: Record<string, number> = { samples: a.n };
  for (const k of Object.keys(a.sum)) o['mean_' + k] = mean(k);
  for (const k of Object.keys(a.hit)) o['share_' + k] = frac(k);
  return o;
};
const alive = w.persons.filter((p) => p.alive);
const result = {
  seed, days, rulesVersion: w.settings.rulesVersion, endHash, bare, alive: alive.length,
  sampling: { everyTicks: EVERY, fromDay: FROM_DAY, times: sampleTimes, householdsWithoutHome: dropped.noHome, householdsWithoutGrown: dropped.noGrown },
  households: rowOut(house),
  members: rowOut(member),
  histBelievedHomeFood: histBelieved,
  histTrueHomeFood: histTrue,
  checks: { ...shortRows, note: 'replicaMismatch: my copy of the hhState home loop against hhState.homeFood; ctxMismatch: hhState on generateOptions(observer) against hhState on makeCtx, first 12 households' },
  endedActivities: ended,
  tripUnits: tallies,
  unitsTakenFromStores: { withdrawByBuildingType: withdrawnUnits, eatStoreByBuildingType: eatenUnits },
  withdrawRequestAgainstMemory: { all: capped, food: cappedFood, ownHome: cappedHome, note: 'at the start of a withdraw: units asked, units remembered at the target, units truly there; capped = asked equals remembered and two or more more were there' },
};
if (out) writeFileSync(out, JSON.stringify(result));

if (bare) {
  console.log(`${seed} (bare): days ${days}, rules ${result.rulesVersion}; ${alive.length} alive; end hash ${endHash}`);
} else {
  const H = result.households, M = result.members;
  const f = (n: number | undefined): string => ((n ?? 0) * 100).toFixed(1) + '%'; // a share never counted is 0
  const x = (n: number | undefined): string => (n === undefined ? '-' : n.toFixed(2));
  console.log(`${seed}: days ${days}, rules ${result.rulesVersion}, ${alive.length} alive; ${sampleTimes} sample times, ${H.samples} household-samples, ${M.samples} member-samples; end hash ${endHash}`);
  console.log(`  1 home food: believed ${x(H.mean_believed)}, true ${x(H.mean_true)} (fresh glance would give ${x(H.mean_freshGlance)}); true at least 3 above believed in ${f(H.share_trueAtLeast3MoreThanBelieved)} (members ${f(M.share_trueAtLeast3MoreThanBelieved)}); no belief of the home ${f(H.share_noBelief)}; belief older than 600 ticks ${f(H.share_beliefOlderThan600)}; bread or meat at home (uncounted by hhState) ${f(H.share_breadOrMeatAtHome)}`);
  console.log(`  2 shortage mean / share above 0.4 / share above 0.5: sim ${x(H.mean_shortageSim)} ${f(H.share_short04Sim)} ${f(H.share_short05Sim)}; true home ${x(H.mean_shortageTrueHome)} ${f(H.share_short04TrueHome)} ${f(H.share_short05TrueHome)}; true, all kinds ${x(H.mean_shortageTrueAllKinds)} ${f(H.share_short04TrueAllKinds)} ${f(H.share_short05TrueAllKinds)}; true household (all packs too) ${x(H.mean_shortageTrueHousehold)} ${f(H.share_short04TrueHousehold)} ${f(H.share_short05TrueHousehold)}`);
  console.log(`    members: sim above 0.4 ${f(M.share_short04Sim)}, true home ${f(M.share_short04TrueHome)}; short by the sim but not by the true home figure ${f(H.share_shortSimButNotTrueHome04)} of household-samples (the reverse ${f(H.share_notShortSimButTrueHome04)}); mean target ${x(H.mean_target)}, mean pack ${x(H.mean_packFood)}`);
  const row = (key: string): string => { const t = tallies[key]; return t ? ['1', '2', '3', '4+', 'none'].map((b) => `${b}:${t[b] ?? 0}`).join(' ') : '(none)'; };
  console.log(`  3 ended: ${JSON.stringify(ended)}`);
  for (const grp of ['all', 'food', 'nonfood', 'own_home']) console.log(`    withdraw ${grp}, label integer ${row(`withdraw|label|${grp}`)} | units moved ${row(`withdraw|moved|${grp}`)}`);
  for (const grp of ['all', 'own_home']) console.log(`    eat_store ${grp}, units taken to the pack ${row(`eat_store|units|${grp}`)} (0 shows as none)`);
  console.log(`    withdraw trips by building type (label): ${Object.keys(tallies).filter((k) => k.startsWith('withdraw|label|bt:')).map((k) => `${k.slice(18)} ${Object.values(tallies[k]).reduce((s, n) => s + n, 0)}`).join(', ')}`);
  console.log(`    request against memory at withdraw start, food items: ${JSON.stringify(cappedFood)}; own home: ${JSON.stringify(cappedHome)}`);
  console.log(`  checks: ${JSON.stringify(shortRows)}`);
}
