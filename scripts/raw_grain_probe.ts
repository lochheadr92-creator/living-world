// Review notes (14 November 2026, after the six-world run): fixed (1) the per-tick pass kept references to the start-of-tick records and then
// overwrote them, so a meal whose last bite ended the activity was never matched to its store (now a copy); (2) the reconcile lines compared
// spoilage in stores with the ledger's spoilage of every kind (now store spoilage only) and ignored batches still in a mill (now net of them);
// added the eaters' age in years, the cross-tabs for bites with other food held, the people who died with grain, and the debug capture of
// whatever the ledger booked as eaten that the pass did not place. Known residue, at most a few units in a world: a bite at a store's table is
// credited to the actor on a spoilage tick (every 120th) even if that tick was not the bite, so spoilage and table meals can swap one unit.
// Hunger is the eater's hunger at the tick of the bite (later bites of one meal are higher than the first).
// Where and how raw grain is eaten. Read-only measurement: one ordinary world, stepped as it is; the probe only looks (it writes
// nothing to the world: a run with it and a run with --bare end on the same hash).
//
// Rules 243 (src/sim/grain_kept.ts) keep grain for the granary and the bakery instead of eating it raw, yet over four years in three
// worlds (docs/GROWTH_PLAN.md "Farming, grain and bread") 2,000 to 2,500 units of grain were "eaten or used" and only 60 to 100 went
// into flour. The goods account's reasons ('eaten', 'eaten at the source', ...) are not split by item, so nobody has said WHERE and HOW
// the grain is eaten. This counts it, three ways that must agree:
//
//   A. the ledger split by item: world.ledger.created / consumed / spoiled and world.ledger.reasons are wrapped in read-only proxies for
//      the run, so every reason that moves grain (and flour, bread, seeds, beer) is booked against its item exactly. This is the
//      reference total, and it is what the other two are reconciled against (the "reconcile" lines);
//   B. the grain's own movements: the `onTransfer` hook (economy.ts transfer, gatherFromSource, harvestPlot) gives every move of grain
//      between a plot, a source, a pack, a store, a cart, a meal table or a person, by reason and by the kind of thing at each end;
//   C. the per-tick difference: each tick, for every living person and every building, what the pack or the store held before, plus what
//      the hook says came in, minus what it says went out, against what it holds now. What is left is grain that was used up in place,
//      and it is attributed by what the person was doing at the START of the tick (activity kind, its target's type): eating from the
//      pack (`eat`), a meal taken from a store (`eat_store`), a bite at a store's table, a batch loaded into a mill or bakery
//      (`operate`), grain going off (a store losing grain on a spoilage tick, which is every 120th tick), and so on. Grain eaten
//      straight from a wild source is seen as a person whose gather is for eating, at a `wild_grain` source, who ate this tick and moved
//      no grain into the pack.
//
// For each bite of grain from a pack it also records what else the pack held (the rule allows grain only when it is the only food),
// the eater's hunger and age, how many grain they held, whether they knew a granary, a bakery or a mill, what the last grain to enter
// that pack was and how long ago, and the hour of the day.
//
//   node scripts/fast.mjs scripts/raw_grain_probe.ts -- --load <save point> --days 60 [--out grain.json]
//   (--days is the ABSOLUTE day to run to; --bare steps the world with no observation, for the purity check; --no-split leaves the
//   ledger unwrapped, to check that the hook and the per-tick passes alone leave the world as it was)
import { writeFileSync } from 'node:fs';
import { worldFromArgs } from './world_args';
import { DAY } from '../src/sim/constants';
import { totalItems } from '../src/sim/economy';
import { beliefsByKind } from '../src/sim/optutil';
import { ageYears, stageOf } from '../src/sim/people';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Building, ItemKind, Items, Person, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const days = Number(opt('days', '24'));
const out = opt('out', '');
const bare = args.includes('--bare');
const noSplit = args.includes('--no-split');
const { w, loaded }: { w: World; loaded: string } = worldFromArgs(opt, opt('seed', 'aspen'));
const seed = w.settings.seed;
const startTick = w.tick;
const startDay = startTick / DAY;

const round = (n: number, d = 2): number => Math.round(n * 10 ** d) / 10 ** d;
const bump = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };
const OTHER_FOODS = ['berries', 'fruit', 'fish', 'meat', 'bread', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat'] as const;
const WATCHED = new Set(['grain', 'flour', 'bread', 'seeds', 'beer']);
const spanDays = Math.max(1, Math.ceil(days - startDay));
const dayOf = (tick: number): number => Math.min(spanDays - 1, Math.max(0, Math.floor((tick - startTick) / DAY)));
const perDay: Record<string, number[]> = {};
const bumpDay = (key: string, tick: number, n: number): void => { (perDay[key] ??= new Array(spanDays).fill(0))[dayOf(tick)] += n; };

// ───────────── A. the ledger split by item ─────────────
type Book = 'created' | 'consumed' | 'spoiled';
const PREFIX: Record<Book, string> = { created: '+', consumed: '-', spoiled: 'x' };
const split: Record<Book, Record<string, Record<string, number>>> = { created: {}, consumed: {}, spoiled: {} };
const splitMiss = { unmatched: 0, matched: 0 };
let pending: { book: Book; item: string; d: number } | null = null;
const ledgerBase = { created: { ...(w.ledger.created as Record<string, number>) }, consumed: { ...(w.ledger.consumed as Record<string, number>) }, spoiled: { ...(w.ledger.spoiled as Record<string, number>) } };
const reasonsBase = { ...w.ledger.reasons };
if (!bare && !noSplit) {
  for (const book of ['created', 'consumed', 'spoiled'] as Book[]) {
    w.ledger[book] = new Proxy(w.ledger[book], {
      set(t: Items, key: string | symbol, value: number): boolean {
        const k = String(key);
        pending = { book, item: k, d: value - ((t as Record<string, number>)[k] ?? 0) };
        (t as Record<string, number>)[k] = value;
        return true;
      },
    });
  }
  w.ledger.reasons = new Proxy(w.ledger.reasons, {
    set(t: Record<string, number>, key: string | symbol, value: number): boolean {
      const reason = String(key);
      const d = value - (t[reason] ?? 0);
      t[reason] = value;
      const pd = pending;
      pending = null;
      if (pd && reason[0] === PREFIX[pd.book] && Math.abs(pd.d - d) < 1e-9) {
        splitMiss.matched++;
        if (WATCHED.has(pd.item)) bump(((split[pd.book][pd.item] ??= {})), reason.slice(1), d);
      } else splitMiss.unmatched++;
      return true;
    },
  });
}

// ───────────── B. grain's own movements (the hook) ─────────────
const kindOfTag = (tag: string): string => tag.slice(0, tag.indexOf(':'));
const idOfTag = (tag: string): number => Number(tag.slice(tag.indexOf(':') + 1));
const typeOfTag = (tag: string): string => {
  const kind = kindOfTag(tag);
  if (kind === 'building' || kind === 'source') {
    const e = w.byId.get(idOfTag(tag));
    return !e ? kind + '(gone)' : e.ent === 'building' ? e.type : e.ent === 'source' ? 'source/' + e.type : e.ent;
  }
  return kind; // person, plot, pile, cart, site, meal, batch, water, ground
};
const flows: Record<string, number> = {}; // 'reason | from > to' -> units
const inT = new Map<number, number>(); // person id -> grain that came into the pack this tick
const outT = new Map<number, number>();
const gatherT = new Map<number, number>(); // person id -> grain gathered this tick from a source
const inB = new Map<number, number>(); // building id -> grain moved in / out this tick
const outB = new Map<number, number>();
const lastIn = new Map<number, { src: string; tick: number }>();
const addTo = (m: Map<number, number>, id: number, n: number): void => { m.set(id, (m.get(id) ?? 0) + n); };
const inflowLabel = (reason: string, fromT: string): string =>
  reason === 'harvest' ? 'harvested from a plot'
  : reason === 'gather' ? 'gathered from ' + fromT
  : reason === 'withdraw' ? 'withdrawn from ' + fromT
  : reason === 'eat from store' ? 'taken to eat from ' + fromT
  : fromT === 'person' ? 'from another person (' + reason + ')'
  : reason + ' from ' + fromT;
const hookOnTransfer = (info: { from: string; to: string; item: ItemKind; n: number; reason: string }): void => {
  if (info.item !== 'grain') return;
  const T = w.tick;
  const fromT = typeOfTag(info.from);
  const toT = typeOfTag(info.to);
  bump(flows, `${info.reason} | ${fromT} > ${toT}`, info.n);
  const fk = kindOfTag(info.from);
  const tk = kindOfTag(info.to);
  if (fk === 'person') addTo(outT, idOfTag(info.from), info.n);
  if (tk === 'person') {
    const id = idOfTag(info.to);
    addTo(inT, id, info.n);
    if (info.reason === 'gather') addTo(gatherT, id, info.n);
    lastIn.set(id, { src: inflowLabel(info.reason, fromT), tick: T });
    bumpDay('into packs: ' + inflowLabel(info.reason, fromT), T, info.n);
  }
  if (fk === 'building') addTo(outB, idOfTag(info.from), info.n);
  if (tk === 'building') addTo(inB, idOfTag(info.to), info.n);
  if (tk === 'building' && toT === 'granary') bumpDay('into the granary', T, info.n);
};

// ───────────── C. the per-tick difference ─────────────
interface Rec {
  grain: number; hunger: number; alive: boolean;
  kind: string; label: string; tgtId: number; tgtType: string; table: boolean; food: string; purpose: string;
}
const blank = (): Rec => ({ grain: 0, hunger: 0, alive: false, kind: '', label: '', tgtId: 0, tgtType: '', table: false, food: '', purpose: '' });
const fill = (rec: Rec, p: Person): void => {
  rec.grain = p.alive ? (p.inv.grain ?? 0) : 0;
  rec.hunger = p.needs.hunger;
  rec.alive = p.alive;
  const a = p.activity;
  if (!a) { rec.kind = ''; rec.label = ''; rec.tgtId = 0; rec.tgtType = ''; rec.table = false; rec.food = ''; rec.purpose = ''; return; }
  rec.kind = a.kind;
  rec.label = a.label;
  rec.tgtId = a.targetId;
  const e = a.targetId ? w.byId.get(a.targetId) : undefined;
  rec.tgtType = !e ? '' : e.ent === 'building' ? e.type : e.ent === 'source' ? 'source/' + e.type : e.ent;
  rec.table = !!a.data.table;
  rec.food = (a.data.food as string | undefined) ?? '';
  rec.purpose = (a.data.purpose as string | undefined) ?? '';
};
const prevP = new Map<number, Rec>();
const prevB = new Map<number, number>();
const prevJob = new Map<number, unknown>();
const builtInRun: { day: number; type: string }[] = [];
const seenBuilding = new Set<number>();

// what was counted
const pack = { // grain used up inside a pack, by what the person was doing
  byActivity: {} as Record<string, number>,
  byLabel: {} as Record<string, number>,
  unexplainedGain: 0, appeared: 0, diedWithGrain: 0, // grain in the pack of somebody who died (the belongings go to a pile; not used up)
};
const store = { // grain used up inside a store, by what happened there
  loadedIntoBatch: {} as Record<string, number>, // recipe id -> grain (mill, bakery, brewery)
  jobsStarted: {} as Record<string, number>,
  tableMeal: {} as Record<string, number>, // store type -> grain eaten at the store's table
  spoiled: {} as Record<string, number>,
  unexplainedLoss: {} as Record<string, number>,
  returnedFromBatch: 0, unexplainedGain: 0,
  debug: [] as unknown[], // the first unexplained store losses: who ate that tick, and where
};
const missDebug: { unattributedEaten: Record<string, number>; first: unknown[] } = { unattributedEaten: {}, first: [] }; // what the ledger booked as eaten that the per-tick pass did not place, by what the eaters were doing
let ledgerEatenBefore = 0, ledgerSeedSheepBefore = 0, attributedBefore = 0;
let eatenAtSource = 0;
const bites = {
  // one row per unit of grain eaten out of a pack, by activity kind ('eat', or 'eat_store' for a meal taken from a store)
  units: {} as Record<string, number>,
  onlyGrain: {} as Record<string, number>, // grain was the only food in the pack
  otherFoodKinds: {} as Record<string, Record<string, number>>, // activity kind -> kind of other food present -> units
  hunger: {} as Record<string, number[]>,
  hungerBand: {} as Record<string, Record<string, number>>,
  stage: {} as Record<string, Record<string, number>>,
  ageYears: {} as Record<string, number[]>,
  grainHeld: {} as Record<string, Record<string, number>>, // pack grain just before the bite
  knows: {} as Record<string, Record<string, number>>, // 'granary', 'bakery', 'mill', 'granary+bakery', 'none'
  knowsGranaryWithGrain: {} as Record<string, number>,
  lastIn: {} as Record<string, Record<string, number>>, // what the last grain to enter this pack was
  lastInAge: {} as Record<string, Record<string, number>>,
  hour: new Array(24).fill(0) as number[],
  eatLabel: {} as Record<string, number>,
  storeType: {} as Record<string, number>, // eat_store: the kind of store the meal was taken at
  withOtherFoodAndGrainHeld: {} as Record<string, number[]>, // rule failures: [units, hunger sum]
  otherFoodBand: {} as Record<string, Record<string, number>>, // the same bites by hunger band
  otherFoodStage: {} as Record<string, Record<string, number>>, // the same bites by life stage
  otherFoodKnewGranary: {} as Record<string, number>, // the same bites where the eater also knew a granary
  onlyFoodKnewGranaryWithGrain: {} as Record<string, number>, // bites where grain was the only food and a granary holding grain was known
};
const band = (h: number): string => (h < 25 ? '0-24 starving' : h < 50 ? '25-49' : h < 75 ? '50-74' : '75+');
const heldBand = (n: number): string => (n <= 1 ? '1' : n === 2 ? '2' : n <= 4 ? '3-4' : n <= 7 ? '5-7' : '8+');
const ageBand = (t: number): string => (t <= 120 ? 'same trip (<=120 ticks)' : t <= 600 ? '<=600 ticks' : t <= DAY ? '<=1 day' : t <= 3 * DAY ? '<=3 days' : 'older');

function recordBite(p: Person, rec: Rec, units: number, T: number): void {
  const k = rec.kind;
  bump(bites.units, k, units);
  const others: string[] = [];
  for (const f of OTHER_FOODS) if ((p.inv[f] ?? 0) > 0) others.push(f);
  if (others.length === 0) bump(bites.onlyGrain, k, units);
  else {
    const o = (bites.otherFoodKinds[k] ??= {});
    for (const f of others) bump(o, f, units);
    bump(o, '(any other food)', units);
  }
  (bites.hunger[k] ??= []).push(...new Array(units).fill(round(rec.hunger, 1)));
  bump((bites.hungerBand[k] ??= {}), band(rec.hunger), units);
  bump((bites.stage[k] ??= {}), stageOf(w, p), units);
  (bites.ageYears[k] ??= []).push(...new Array(units).fill(Math.round(ageYears(w, p))));
  bump((bites.grainHeld[k] ??= {}), heldBand(rec.grain), units);
  let granary = false, bakery = false, mill = false, granaryHasGrain = false;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype === 'granary') { granary = true; if ((b.items?.grain ?? 0) > 0) granaryHasGrain = true; }
    else if (b.btype === 'bakery') bakery = true;
    else if (b.btype === 'mill') mill = true;
  }
  bump((bites.knows[k] ??= {}), granary && bakery ? 'granary+bakery' : granary ? 'granary only' : bakery ? 'bakery only' : mill ? 'mill only' : 'neither', units);
  if (granaryHasGrain) bump(bites.knowsGranaryWithGrain, k, units);
  if (mill) bump((bites.knows[k] ??= {}), '(any: knew a mill)', units);
  const li = lastIn.get(p.id);
  bump((bites.lastIn[k] ??= {}), li ? li.src : '(none since the run began)', units);
  bump((bites.lastInAge[k] ??= {}), li ? ageBand(T - li.tick) : '(none since the run began)', units);
  bites.hour[Math.min(23, Math.floor(((T % DAY) / DAY) * 24))] += units;
  bump(bites.eatLabel, `${k}: ${rec.label}`, units);
  if (k === 'eat_store') bump(bites.storeType, rec.tgtType || '(unknown)', units);
  if (others.length > 0) {
    const r = (bites.withOtherFoodAndGrainHeld[k] ??= [0, 0]);
    r[0] += units; r[1] += rec.hunger * units;
    bump((bites.otherFoodBand[k] ??= {}), band(rec.hunger), units);
    bump((bites.otherFoodStage[k] ??= {}), stageOf(w, p), units);
    if (granary) bump(bites.otherFoodKnewGranary, k, units);
  } else if (granaryHasGrain) bump(bites.onlyFoodKnewGranaryWithGrain, k, units);
}

function observeTick(): void {
  const T = w.tick - 1; // the tick just stepped (the clock moves on at the end of a step)
  const spoilTick = T % 120 === 59;
  // who was where doing what at the start of the tick (the record each person left at the end of the last one)
  const ate: { id: number; startKind: string; startTgt: number; startTable: boolean; startFood: string; nowKind: string; nowTgt: number; nowTable: boolean; hunger: number }[] = [];
  const actorAt = new Map<number, Rec[]>();
  for (const rec of prevP.values()) {
    if (rec.alive && rec.tgtId && (rec.kind === 'eat_store' || rec.kind === 'operate')) {
      const list = actorAt.get(rec.tgtId);
      const snap = { ...rec }; // a copy: the person loop below overwrites each record with the end-of-tick state
      if (list) list.push(snap); else actorAt.set(rec.tgtId, [snap]);
    }
  }
  for (const p of w.persons) {
    let rec = prevP.get(p.id);
    if (!rec) {
      rec = blank();
      prevP.set(p.id, rec);
      fill(rec, p);
      pack.appeared += rec.grain;
      continue;
    }
    if (p.alive && p.lastAteTick === T) ate.push({ id: p.id, startKind: rec.kind, startTgt: rec.tgtId, startTable: rec.table, startFood: rec.food, nowKind: p.activity?.kind ?? '', nowTgt: p.activity?.targetId ?? 0, nowTable: !!p.activity?.data.table, hunger: round(p.needs.hunger, 1) });
    if (rec.alive) {
      const cur = p.alive ? (p.inv.grain ?? 0) : 0;
      const resid = rec.grain + (inT.get(p.id) ?? 0) - (outT.get(p.id) ?? 0) - cur;
      if (resid > 0) {
        if (!p.alive) bump(pack.byActivity, 'lost when the person died or left', resid);
        else if (rec.kind === 'eat' || rec.kind === 'eat_store') {
          bump(pack.byActivity, rec.kind, resid);
          recordBite(p, rec, resid, T);
          bumpDay('eaten from a pack: ' + rec.kind, T, resid);
        } else {
          bump(pack.byActivity, 'other: ' + (rec.kind || '(no activity)'), resid);
          bump(pack.byLabel, `${rec.kind}: ${rec.label}`, resid);
        }
      } else if (resid < 0) pack.unexplainedGain += -resid;
      // grain eaten straight from a wild source: a gather for eating, at wild grain, that fed the person this tick and moved no grain
      if (rec.kind === 'gather' && rec.purpose === 'eat' && rec.tgtType === 'source/wild_grain' && p.alive && p.lastAteTick === T && (gatherT.get(p.id) ?? 0) === 0) {
        eatenAtSource++;
        bumpDay('eaten at the wild source', T, 1);
      }
    }
    fill(rec, p);
  }
  if (prevP.size > w.persons.length) {
    for (const [id, rec] of prevP) if (!w.byId.has(id)) { if (rec.alive) pack.diedWithGrain += rec.grain; prevP.delete(id); lastIn.delete(id); }
  }
  for (const b of w.buildings) {
    const cur = b.store.items.grain ?? 0;
    const job = (b.ops?.job ?? null) as { recipe: string; held: Items } | null;
    if (!seenBuilding.has(b.id)) {
      seenBuilding.add(b.id);
      prevB.set(b.id, cur);
      prevJob.set(b.id, job);
      if (['granary', 'mill', 'bakery', 'cellar', 'storehouse', 'brewery'].includes(b.type)) builtInRun.push({ day: round(T / DAY, 2), type: b.type });
      continue;
    }
    const pj = prevJob.get(b.id) ?? null;
    let resid = (prevB.get(b.id) ?? 0) + (inB.get(b.id) ?? 0) - (outB.get(b.id) ?? 0) - cur;
    if (job && job !== pj) {
      bump(store.jobsStarted, `${b.type}: ${job.recipe}`);
      const g = job.held.grain ?? 0;
      if (g > 0) { bump(store.loadedIntoBatch, `${b.type}: ${job.recipe}`, g); bumpDay('loaded into a mill or bakery batch', T, g); resid -= g; }
    }
    if (resid < 0) {
      if (pj && pj !== job) store.returnedFromBatch += -resid; else store.unexplainedGain += -resid;
    } else if (resid > 0) {
      let r = resid;
      for (const a of actorAt.get(b.id) ?? []) {
        if (r > 0 && a.kind === 'eat_store' && a.table && a.food === 'grain') { bump(store.tableMeal, b.type, 1); bumpDay('eaten at a store table', T, 1); r -= 1; }
      }
      if (r > 0) bump(spoilTick ? store.spoiled : store.unexplainedLoss, b.type, r);
      if (r > 0 && !spoilTick && store.debug.length < 40) store.debug.push({ T, day: round(T / DAY, 2), type: b.type, id: b.id, lost: r, ate: ate.filter((x) => x.startTgt === b.id || x.nowTgt === b.id), anyAte: ate.length });
    }
    prevB.set(b.id, cur);
    prevJob.set(b.id, job);
  }
  { // the ledger's 'eaten' grain this tick against what this pass placed
    const ledgerEaten = split.consumed.grain?.['eaten'] ?? 0;
    const seedSheep = (split.consumed.grain?.['saved as seed'] ?? 0) + (split.consumed.grain?.['feeding sheep'] ?? 0);
    const packAll = Object.values(pack.byActivity).reduce((s, n) => s + n, 0);
    const attributed = packAll + Object.values(store.tableMeal).reduce((s, n) => s + n, 0);
    const miss = (ledgerEaten - ledgerEatenBefore) - ((attributed - attributedBefore) - (seedSheep - ledgerSeedSheepBefore));
    if (Math.abs(miss) > 1e-9) {
      const key = ate.length ? ate.map((x) => `${x.startKind}${x.startTable ? '/table' : ''}:${x.startFood || '-'} -> ${x.nowKind || '(none)'}`).join(' + ') : '(nobody ate)';
      bump(missDebug.unattributedEaten, `${round(miss, 0)} by ${key}`, 1);
      if (missDebug.first.length < 30) missDebug.first.push({ T, day: round(T / DAY, 2), miss, ate });
    }
    ledgerEatenBefore = ledgerEaten; ledgerSeedSheepBefore = seedSheep; attributedBefore = attributed;
  }
  inT.clear(); outT.clear(); gatherT.clear(); inB.clear(); outB.clear();
}

// ───────────── what is held, where ─────────────
function heldGrain(world: World): Record<string, number> {
  const o: Record<string, number> = {};
  for (const p of world.persons) if (p.alive) bump(o, 'packs', p.inv.grain ?? 0);
  for (const b of world.buildings) {
    bump(o, b.type, b.store.items.grain ?? 0);
    bump(o, 'batches in mills and bakeries', b.ops?.job?.held.grain ?? 0);
  }
  for (const pl of world.plots) bump(o, 'plots (ripe, unharvested)', pl.stock);
  for (const pile of world.piles) bump(o, 'piles', pile.items.grain ?? 0);
  for (const c of world.carts) bump(o, 'carts', c.load.grain ?? 0);
  for (const m of world.meals) if (m.status !== 'done' && m.status !== 'cancelled') bump(o, 'meal tables', m.table.grain ?? 0);
  for (const s of world.sources) if (s.item === 'grain') bump(o, 'wild sources (standing)', s.amount);
  return Object.fromEntries(Object.entries(o).filter(([, n]) => n > 0).map(([k, n]) => [k, round(n, 1)]));
}
function heldOf(world: World, item: 'bread' | 'flour'): Record<string, number> {
  const o: Record<string, number> = {};
  for (const p of world.persons) if (p.alive) bump(o, 'packs', p.inv[item] ?? 0);
  for (const b of world.buildings) bump(o, b.type, b.store.items[item] ?? 0);
  for (const pile of world.piles) bump(o, 'piles', pile.items[item] ?? 0);
  for (const m of world.meals) if (m.status !== 'done' && m.status !== 'cancelled') bump(o, 'meal tables', m.table[item] ?? 0);
  return Object.fromEntries(Object.entries(o).filter(([, n]) => n > 0).map(([k, n]) => [k, round(n, 1)]));
}
const aliveCount = (world: World): number => world.persons.filter((p) => p.alive).length;
const countType = (world: World, t: string): number => world.buildings.filter((b: Building) => b.type === t).length;
const buildingsNow = (world: World): Record<string, number> => ({ granary: countType(world, 'granary'), mill: countType(world, 'mill'), bakery: countType(world, 'bakery'), cellar: countType(world, 'cellar'), storehouse: countType(world, 'storehouse'), brewery: countType(world, 'brewery') });
const startState = { alive: aliveCount(w), buildings: buildingsNow(w), grainHeld: heldGrain(w), breadHeld: heldOf(w, 'bread'), flourHeld: heldOf(w, 'flour'), totalGrain: round(totalItems(w).grain ?? 0, 1) };

// ───────────── the run ─────────────
if (!bare) {
  w.hooks = { onTransfer: hookOnTransfer };
  for (const p of w.persons) { const r = blank(); fill(r, p); prevP.set(p.id, r); }
  for (const b of w.buildings) { seenBuilding.add(b.id); prevB.set(b.id, b.store.items.grain ?? 0); prevJob.set(b.id, b.ops?.job ?? null); }
}
const began = Date.now();
for (let i = w.tick + 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (!bare) observeTick();
  if (i % (2 * DAY) === 0) console.log(`.. day ${i / DAY} of ${days}, ${Math.round((Date.now() - began) / 1000)}s`);
}
const endHash = hashWorld(w);
const aliveEnd = aliveCount(w);

if (bare) {
  console.log(`${seed} (bare): days ${startDay} to ${days}, rules ${w.settings.rulesVersion}; ${aliveEnd} alive; end hash ${endHash}`);
  if (out) writeFileSync(out, JSON.stringify({ seed, loaded, startDay, days, bare, endHash, alive: aliveEnd }));
  process.exit(0);
}

// ───────────── report ─────────────
const sum = (o: Record<string, number> | undefined): number => Object.values(o ?? {}).reduce((s, n) => s + n, 0);
const sorted = (o: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(o).filter(([, n]) => Math.abs(n) > 1e-9).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, round(n, 1)]));
const quant = (xs: number[], q: number): number => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const ledgerDelta = (book: Book, item: string): number => round(((w.ledger[book] as Record<string, number>)[item] ?? 0) - (ledgerBase[book][item] ?? 0), 1);
const reasonSplit = (book: Book, item: string): Record<string, number> => sorted(split[book][item] ?? {});

// grain exits by the ledger (exact, item by item)
const consumedGrain = reasonSplit('consumed', 'grain');
const spoiledGrain = reasonSplit('spoiled', 'grain');
const createdGrain = reasonSplit('created', 'grain');
const MILL_REASON = /^(used in (milled flour|ground flour)|wasted: (husks and chaff|bran and dust))$/;
const BEER_REASON = /^(used in beer|wasted: spent mash)$/;
const exits: Record<string, number> = {};
for (const [r, n] of Object.entries(consumedGrain)) {
  if (r === 'eaten') bump(exits, 'eaten (pack, store table, hand-fed)', n);
  else if (r === 'eaten at the source') bump(exits, 'eaten at the wild source', n);
  else if (r === 'eaten at a shared meal') bump(exits, 'eaten at a shared meal', n);
  else if (MILL_REASON.test(r)) bump(exits, 'milled (flour made, plus husks)', n);
  else if (BEER_REASON.test(r)) bump(exits, 'brewed', n);
  else bump(exits, 'other: ' + r, n);
}
const spoiledTotal = sum(spoiledGrain);
for (const [r, n] of Object.entries(spoiledGrain)) {
  if (r === 'grain bins: stored food spoiled') bump(exits, 'spoiled in the granary bins', n);
  else if (r === 'stored food spoiled') bump(exits, 'spoiled in other stores', n);
  else if (r === 'crop left to rot') bump(exits, 'rotted unharvested in the field', n);
  else if (r === 'left-out food spoiled') bump(exits, 'spoiled left out in the open', n);
  else bump(exits, 'spoiled: ' + r, n);
}
const exitTotal = sum(exits);

// what the per-tick pass attributed to eating, against the ledger's 'eaten'
const eatenLedger = consumedGrain['eaten'] ?? 0;
const eatPack = pack.byActivity['eat'] ?? 0;
const eatStoreMeal = pack.byActivity['eat_store'] ?? 0;
const eatTable = sum(store.tableMeal);
const packOther = Object.entries(pack.byActivity).filter(([k]) => k !== 'eat' && k !== 'eat_store').reduce((s, [, n]) => s + n, 0); // used up in a pack by anything but eating: seed saved, sheep fed, hand-feeding, a death
const seedSheep = (consumedGrain['saved as seed'] ?? 0) + (consumedGrain['feeding sheep'] ?? 0);
const handFedOrOther = Math.max(0, packOther - seedSheep); // an estimate: what is left of the other pack losses once seed and sheep are taken off (hand-feeding by a carer)
const attributedEaten = eatPack + eatStoreMeal + eatTable + handFedOrOther;
const eatenAtStoreAll = eatStoreMeal + eatTable;
const milledLoaded = Object.entries(store.loadedIntoBatch).filter(([k]) => /mill/.test(k)).reduce((s, [, n]) => s + n, 0);
const spoiledSeen = sum(store.spoiled);
const ledgerStoreSpoiled = (spoiledGrain['grain bins: stored food spoiled'] ?? 0) + (spoiledGrain['stored food spoiled'] ?? 0); // spoilage inside a building's store (the field's rot and food left out are not in a store)
const batchHeldStart = startState.grainHeld['batches in mills and bakeries'] ?? 0;
const batchHeldEnd = heldGrain(w)['batches in mills and bakeries'] ?? 0;

// pack inflows and outflows from the hook
const NOT_BUILDING = new Set(['person', 'plot', 'pile', 'cart', 'site', 'meal', 'batch', 'water', 'ground', 'animal']);
function isBuildingType(t: string): boolean { return !NOT_BUILDING.has(t) && !t.includes('/') && !t.includes('(gone)'); }
const inflows: Record<string, number> = {};
const outflows: Record<string, number> = {};
const intoStores: Record<string, number> = {};
const outOfStores: Record<string, number> = {};
for (const [key, n] of Object.entries(flows)) {
  const [reason, ends] = key.split(' | ');
  const [from, to] = ends.split(' > ');
  if (to === 'person') bump(inflows, inflowLabel(reason, from), n);
  if (from === 'person') bump(outflows, `${reason} -> ${to}`, n);
  if (isBuildingType(to)) bump(intoStores, `${to} (${reason})`, n);
  if (isBuildingType(from)) bump(outOfStores, `${from} (${reason})`, n);
}
const granaryIn = Object.entries(flows).filter(([k]) => k.endsWith('> granary')).reduce((s, [, n]) => s + n, 0);
const granaryOut = Object.entries(flows).filter(([k]) => k.includes('| granary >')).reduce((s, [, n]) => s + n, 0);

const bitesOut: Record<string, unknown> = {};
for (const k of Object.keys(bites.units)) {
  const u = bites.units[k];
  const h = bites.hunger[k] ?? [];
  bitesOut[k] = {
    units: u,
    grainWasTheOnlyFood: bites.onlyGrain[k] ?? 0,
    shareOnlyFood: round((bites.onlyGrain[k] ?? 0) / Math.max(1, u), 3),
    otherFoodPresent: bites.otherFoodKinds[k] ?? {},
    hunger: { mean: round(h.reduce((s, x) => s + x, 0) / Math.max(1, h.length), 1), p10: quant(h, 0.1), p25: quant(h, 0.25), median: quant(h, 0.5), p75: quant(h, 0.75), p90: quant(h, 0.9) },
    hungerBand: bites.hungerBand[k] ?? {},
    stage: bites.stage[k] ?? {},
    ageYears: { mean: round((bites.ageYears[k] ?? []).reduce((s, x) => s + x, 0) / Math.max(1, (bites.ageYears[k] ?? []).length), 1), p10: quant(bites.ageYears[k] ?? [], 0.1), median: quant(bites.ageYears[k] ?? [], 0.5), p90: quant(bites.ageYears[k] ?? [], 0.9) },
    grainHeldBeforeBite: bites.grainHeld[k] ?? {},
    knew: bites.knows[k] ?? {},
    knewAGranaryHoldingGrain: bites.knowsGranaryWithGrain[k] ?? 0,
    lastGrainIntoThePackWas: sorted(bites.lastIn[k] ?? {}),
    ...{ lastGrainIntoThePackAge: bites.lastInAge[k] ?? {} },
  };
}
const breadMade = reasonSplit('created', 'bread');
const flourMade = reasonSplit('created', 'flour');
const result = {
  seed, loaded, startDay, days, rulesVersion: w.settings.rulesVersion, endHash,
  people: { start: startState.alive, end: aliveEnd },
  buildings: { start: startState.buildings, end: buildingsNow(w), builtDuringRun: builtInRun },
  grainExits: { total: round(exitTotal, 1), byReason: sorted(exits), ledgerConsumedGrain: ledgerDelta('consumed', 'grain'), ledgerSpoiledGrain: ledgerDelta('spoiled', 'grain'), consumedByReason: consumedGrain, spoiledByReason: spoiledGrain, createdByReason: createdGrain },
  eatenSplit: {
    ledgerEaten: eatenLedger,
    fromThePackWhileEating: eatPack,
    mealTakenFromAStoreAndEatenFromThePack: eatStoreMeal,
    eatenAtAStoreTable: eatTable,
    eatenAtAStoreAll: eatenAtStoreAll,
    eatenByOtherActivitiesEstimate: handFedOrOther,
    packLossesByOtherActivities: packOther,
    eatenAtTheWildSource: eatenAtSource,
    ledgerEatenAtTheSource: consumedGrain['eaten at the source'] ?? 0,
    sharedMeals: consumedGrain['eaten at a shared meal'] ?? 0,
  },
  reconcile: {
    eatenAttributedMinusLedgerEaten: round(attributedEaten - eatenLedger, 1),
    packAndStoreTableUsedUpMinusLedgerEatenSeedSheep: round(eatPack + eatStoreMeal + packOther + eatTable - eatenLedger - seedSheep, 1),
    eatenAtSourceSeenMinusLedger: round(eatenAtSource - (consumedGrain['eaten at the source'] ?? 0), 1),
    // grain loaded into a batch, less the ledger's milled and brewed, less the change in what batches still hold: 0 when every load is seen
    batchLoadedMinusLedgerMilledAndBrewedMinusChangeInBatches: round(sum(store.loadedIntoBatch) - (exits['milled (flour made, plus husks)'] ?? 0) - (exits['brewed'] ?? 0) - (batchHeldEnd - batchHeldStart), 1),
    batchHeldStartEnd: [round(batchHeldStart, 1), round(batchHeldEnd, 1)],
    spoiledSeenInStoresMinusLedgerStoreSpoiled: round(spoiledSeen - ledgerStoreSpoiled, 1),
    spoiledSeenInStoresVsLedgerSpoiled: [round(spoiledSeen, 1), round(ledgerStoreSpoiled, 1), round(spoiledTotal, 1)], // seen in stores, ledger store spoilage, ledger spoilage of every kind (adds the field's rot and food left out)
    grainConservation: { startTotal: startState.totalGrain, endTotal: round(totalItems(w).grain ?? 0, 1), expectedEnd: round(startState.totalGrain + ledgerDelta('created', 'grain') - ledgerDelta('consumed', 'grain') - ledgerDelta('spoiled', 'grain'), 1) },
    ledgerSplitMatchesLedgerTotals: { consumed: [round(sum(consumedGrain), 1), ledgerDelta('consumed', 'grain')], spoiled: [round(spoiledTotal, 1), ledgerDelta('spoiled', 'grain')], created: [round(sum(createdGrain), 1), ledgerDelta('created', 'grain')] },
    reasonBumpsMatchedAnItem: splitMiss,
  },
  packBites: bitesOut,
  bitesByHour: bites.hour,
  biteLabels: sorted(bites.eatLabel),
  rulesFailedWhileEatingFromAPack: Object.fromEntries(Object.entries(bites.withOtherFoodAndGrainHeld).map(([k, [u, hs]]) => [k, { units: u, meanHunger: round(hs / Math.max(1, u), 1), hungerBand: bites.otherFoodBand[k] ?? {}, stage: bites.otherFoodStage[k] ?? {}, knewAGranary: bites.otherFoodKnewGranary[k] ?? 0 }])),
  onlyFoodAndKnewAGranaryWithGrain: bites.onlyFoodKnewGranaryWithGrain,
  packUsedUpByActivity: sorted(pack.byActivity),
  packUsedUpByLabel: sorted(pack.byLabel),
  packUnexplained: { gain: round(pack.unexplainedGain, 1), appearedWithGrain: pack.appeared, diedWithGrainInThePack: pack.diedWithGrain },
  unattributedEatenByContext: missDebug.unattributedEaten, unattributedEatenFirst: missDebug.first,
  storeUsedUp: { debug: store.debug, loadedIntoBatch: store.loadedIntoBatch, jobsStarted: store.jobsStarted, tableMeal: store.tableMeal, spoiledByStoreType: sorted(store.spoiled), unexplainedLoss: store.unexplainedLoss, returnedFromBatch: store.returnedFromBatch, unexplainedGain: store.unexplainedGain },
  packInflows: sorted(inflows),
  packOutflows: sorted(outflows),
  granary: { in: round(granaryIn, 1), out: round(granaryOut, 1) },
  intoStores: sorted(intoStores),
  outOfStores: sorted(outOfStores),
  allGrainFlows: sorted(flows),
  flourMade, breadMade,
  flourConsumed: reasonSplit('consumed', 'flour'),
  breadConsumed: reasonSplit('consumed', 'bread'),
  breadSpoiled: reasonSplit('spoiled', 'bread'),
  flourSpoiled: reasonSplit('spoiled', 'flour'),
  seedsConsumed: reasonSplit('consumed', 'seeds'),
  grainHeld: { start: startState.grainHeld, end: heldGrain(w) },
  breadHeld: { start: startState.breadHeld, end: heldOf(w, 'bread') },
  flourHeld: { start: startState.flourHeld, end: heldOf(w, 'flour') },
  perDay,
  seconds: Math.round((Date.now() - began) / 1000),
};
if (out) writeFileSync(out, JSON.stringify(result));

// ───────────── print ─────────────
const pct = (n: number, of: number): string => (of > 0 ? ((100 * n) / of).toFixed(0) + '%' : '-');
const R = result;
const line = (n: number): string => `${round(n, 0)} (${pct(n, exitTotal)})`;
console.log(`${seed}: days ${startDay} to ${days}, rules ${R.rulesVersion}, ${R.people.start} to ${R.people.end} people; buildings at start ${JSON.stringify(R.buildings.start)}, at end ${JSON.stringify(R.buildings.end)}; end hash ${endHash}`);
if (builtInRun.length) console.log(`  built during the run: ${builtInRun.map((b) => `${b.type} day ${b.day}`).join(', ')}`);
console.log(`  grain made ${round(sum(createdGrain), 0)} (${Object.entries(createdGrain).map(([k, n]) => `${k} ${round(n, 0)}`).join(', ')}); gone from the account ${round(exitTotal, 0)}: ${Object.entries(exits).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${line(n)}`).join('; ')}`);
console.log(`  'eaten' ${eatenLedger} split by what the person was doing: from the pack while eating ${line(eatPack)}; meal taken from a store then eaten from the pack ${line(eatStoreMeal)}; at a store's table ${line(eatTable)}; other activities ${line(handFedOrOther)}; unattributed ${round(eatenLedger - attributedEaten, 1)}; other pack losses (seed, sheep, hand-feeding) by activity ${JSON.stringify(Object.fromEntries(Object.entries(pack.byActivity).filter(([k]) => k !== 'eat' && k !== 'eat_store')))}`);
console.log(`  eaten at the wild source: seen ${eatenAtSource}, ledger ${consumedGrain['eaten at the source'] ?? 0}; shared meals ${consumedGrain['eaten at a shared meal'] ?? 0}`);
console.log(`  into the granary ${round(granaryIn, 0)}, out of it ${round(granaryOut, 0)} (${Object.entries(flows).filter(([k]) => k.includes('| granary >')).map(([k, n]) => `${k.split(' | ')[0]} ${round(n, 0)}`).join(', ') || 'none'}); loaded into mills and bakeries ${round(sum(store.loadedIntoBatch), 0)}; flour made ${JSON.stringify(flourMade)}; bread made ${JSON.stringify(breadMade)}`);
console.log(`  bread eaten and used: ${JSON.stringify(R.breadConsumed)}; bread spoiled ${JSON.stringify(R.breadSpoiled)}; bread held at the end ${JSON.stringify(R.breadHeld.end)} (start ${JSON.stringify(R.breadHeld.start)})`);
for (const [k, v] of Object.entries(bitesOut) as [string, any][]) {
  console.log(`  bites from a pack, ${k}: ${v.units} units; grain the only food in the pack ${pct(v.grainWasTheOnlyFood, v.units)}; other food present ${JSON.stringify(v.otherFoodPresent)}; hunger median ${v.hunger.median} (p10 ${v.hunger.p10}, p90 ${v.hunger.p90}), bands ${JSON.stringify(v.hungerBand)}; held ${JSON.stringify(v.grainHeldBeforeBite)}; knew ${JSON.stringify(v.knew)}; knew a granary with grain ${v.knewAGranaryHoldingGrain}; last grain in: ${JSON.stringify(v.lastGrainIntoThePackWas)}; age ${JSON.stringify(v.lastGrainIntoThePackAge)}`);
}
console.log(`  grain into packs: ${JSON.stringify(R.packInflows)}`);
console.log(`  grain out of packs: ${JSON.stringify(R.packOutflows)}`);
console.log(`  reconcile: ${JSON.stringify(R.reconcile)}`);
console.log(`  held grain at the end: ${JSON.stringify(R.grainHeld.end)} (start ${JSON.stringify(R.grainHeld.start)})`);
