// SCRATCH ONLY (trip waste measurement, 18 November 2026). Read-only observer: it reads people, activities, beliefs, buildings, piles and
// packs, keeps its own copies, and writes nothing to the world or to anything reachable from it. It never calls the world's random
// generator and never changes the order of any sim collection. Call `sampleTick(world)` once a tick, before the world steps (the same
// moment TimeBudget and TripShape read), then `report()` and `rows()`. `attach(world)` chains an end-of-activity hook exactly as
// TripShape.attach does; the hook only copies what it is handed.
//
// WHAT IT ANSWERS. For every withdraw activity (a person walking to a store, a heap or a site to take goods out): what the person
// believed was there (p.beliefs[target], units of the wanted kinds, how old, seen or told), what was truly there when they set out, when
// they began the work and at the last sample before the transfer (act_resource.ts registerHandler('withdraw'): begin() observes the
// place, so the belief is refreshed on arrival; work() transfers after `duration` ticks), the units wanted, the pack room, and how the
// activity ended. Truth is read from the container the handler itself reads (containerItems: building.store.items, pile.items,
// site.delivered), never changed.
import { AGE_CHILD, DAY, WEIGHT } from '../../src/sim/constants';
import { roomFor } from '../../src/sim/economy';
import { accessLevel, withdrawAllowance } from '../../src/sim/facilities';
import { ageYears, carryCap } from '../../src/sim/people';
import type { Activity, Building, ItemKind, Person, World } from '../../src/sim/types';
import { dist } from './trip_shape';
import { timeCategory } from './time_budget';

const r3 = (x: number): number => Math.round(x * 1000) / 1000;
const share = (n: number, d: number): number | null => (d > 0 ? r3(n / d) : null);
const bump = (r: Record<string, number>, k: string, n = 1): void => { r[k] = (r[k] ?? 0) + n; };
const norm = (s: string): string => s.replace(/[0-9]+(\.[0-9]+)?/g, '#').slice(0, 70);

type Counts = Record<string, number>;
/** what the sim's own access rules say about a person taking the wanted kinds from a building, read at one tick (amendment 2) */
interface Access { allow: number; have: number; earmTotal: number; earmMine: number; earmOthersSameHh: number; level: string; granary: boolean; share: number }
interface Rec {
  access: Access | null; beliefClientIsMe: boolean; beliefOutput: number;
  id: number; person: number; adult: boolean; startTick: number; firstPhase: string;
  targetId: number; targetType: string; storeClass: string; buildingType: string; goal: string; materialStock: string;
  wanted: Counts; wantedUnits: number; mainKind: string;
  packWeight: number; packCap: number; roomMain: number;
  beliefPresent: boolean; beliefItemsKnown: boolean; beliefUnits: number; beliefMain: number; beliefSeen: number; beliefAge: number; beliefSrc: string; beliefHops: number; beliefHh: number;
  truthDep: number; truthDepMain: number; truthArr: number | null; truthArrMain: number | null; truthLastWork: number | null; truthLastWorkMain: number | null;
  travelTicks: number; arrivedTick: number | null;
  endTick: number | null; endOutcome: string; endDetail: string; moved: number;
}

/** units of the given kinds in a container, or null when the target is no longer a container */
function truthOf(world: World, id: number, kinds: string[]): { sum: number; main: number; storeClass: string; type: string; hh: number } | null {
  const e = world.byId.get(id);
  if (!e) return null;
  let items: Counts | undefined;
  let storeClass = 'other', type = '', hh = -1;
  if (e.ent === 'building') { items = e.store.items as Counts; type = e.type; hh = e.hhId; }
  else if (e.ent === 'site') { items = e.delivered as Counts; storeClass = 'site'; type = e.type; hh = e.hhId; }
  else if (e.ent === 'pile') { items = e.items as Counts; storeClass = 'pile'; type = 'pile'; }
  if (!items) return null;
  let sum = 0;
  for (const k of kinds) sum += items[k] ?? 0;
  return { sum, main: items[kinds[0]] ?? 0, storeClass, type, hh };
}

/** read-only: the sim's own accessLevel and withdrawAllowance for the wanted kinds, and the live earmarks on them */
function accessOf(world: World, p: Person, b: Building, wanted: Counts): Access {
  const kinds = Object.keys(wanted);
  let allow = 0, have = 0, earmTotal = 0, earmMine = 0, earmOthersSameHh = 0, share = 0;
  for (const k of kinds) {
    have += b.store.items[k as ItemKind] ?? 0;
    allow += withdrawAllowance(world, b, p, k as ItemKind, wanted[k]);
    share += b.ops?.shares[p.hhId]?.[k as ItemKind] ?? 0;
  }
  if (b.ops) {
    for (const em of b.ops.earmarks) {
      if (em.until <= world.tick || em.n <= 0 || !kinds.includes(em.item)) continue;
      earmTotal += em.n;
      if (em.owner === p.id) earmMine += em.n;
      else if (world.persons.some((q) => q.id === em.owner && q.hhId === p.hhId)) earmOthersSameHh += em.n;
    }
  }
  return { allow, have, earmTotal, earmMine, earmOthersSameHh, level: accessLevel(world, p, b), granary: b.type === 'granary', share };
}

export class WithdrawCheck {
  private readonly live = new Map<number, Rec>();
  private readonly done: Rec[] = [];
  private unseenEnds = 0;
  private sampled = 0;
  private firstTick: number | null = null;
  private livingTicks = 0;

  attach(world: World): () => void {
    const prior = world.hooks;
    world.hooks = {
      ...prior,
      onActivityEnd: (p, a, outcome, detail) => {
        prior?.onActivityEnd?.(p, a, outcome, detail);
        this.noteEnd(world, a, outcome, detail);
      },
    };
    return () => { world.hooks = prior; };
  }

  private noteEnd(world: World, a: Activity, outcome: string, detail: string): void {
    if (a.kind !== 'withdraw') return;
    const rec = this.live.get(a.id);
    if (!rec) { this.unseenEnds++; return; }
    rec.endTick = world.tick; rec.endOutcome = outcome; rec.endDetail = detail; rec.moved = a.cycle;
    this.live.delete(a.id);
    this.done.push(rec);
  }

  sampleTick(world: World): void {
    if (this.firstTick === null) this.firstTick = world.tick;
    this.sampled++;
    const tick = world.tick;
    for (const p of world.persons) {
      if (!p.alive) continue;
      this.livingTicks++;
      const a = p.activity;
      if (!a || a.kind !== 'withdraw') continue;
      let rec = this.live.get(a.id);
      if (!rec) { rec = this.open(world, p, a, tick); this.live.set(a.id, rec); }
      const kinds = Object.keys(rec.wanted);
      if (a.phase === 'travel') {
        if (timeCategory(p, tick) === 'travel') rec.travelTicks++;
      } else if (a.phase === 'work') {
        const t = truthOf(world, a.targetId, kinds);
        if (rec.arrivedTick === null) { rec.arrivedTick = tick; rec.truthArr = t ? t.sum : null; rec.truthArrMain = t ? t.main : null; }
        rec.truthLastWork = t ? t.sum : null; rec.truthLastWorkMain = t ? t.main : null;
        const tgt = world.byId.get(a.targetId);
        if (tgt && tgt.ent === 'building') rec.access = accessOf(world, p, tgt, rec.wanted);
      }
    }
  }

  private open(world: World, p: Person, a: Activity, tick: number): Rec {
    const wanted: Counts = {};
    const items = (a.data.items ?? {}) as Counts;
    for (const k of Object.keys(items)) if ((items[k] ?? 0) > 0) wanted[k] = items[k];
    let kinds = Object.keys(wanted);
    if (!kinds.length) kinds = Object.keys(items);
    let main = kinds[0] ?? '';
    for (const k of kinds) if ((wanted[k] ?? 0) > (wanted[main] ?? 0)) main = k;
    const ordered = main ? [main, ...kinds.filter((k) => k !== main)] : kinds;
    const wantedUnits = kinds.reduce((s, k) => s + (wanted[k] ?? 0), 0);
    const cap = carryCap(world, p);
    const t = truthOf(world, a.targetId, ordered);
    const b = p.beliefs[a.targetId];
    const bi = b?.items as Counts | undefined;
    let bu = 0;
    if (bi) for (const k of ordered) bu += bi[k] ?? 0;
    const e = world.byId.get(a.targetId);
    let storeClass = t ? t.storeClass : 'gone';
    if (e && e.ent === 'building') storeClass = e.hhId === p.hhId ? 'own_household' : e.hhId === 0 ? 'shared' : 'other_household';
    else if (e && e.ent === 'site') storeClass = e.hhId === p.hhId ? 'own_site' : 'other_site';
    const bops = b?.ops;
    let beliefOutput = 0;
    if (bops) for (const k of ordered) beliefOutput += bops.output?.[k as ItemKind] ?? 0;
    const rec: Rec = {
      access: null, beliefClientIsMe: !!bops && !!bops.job && bops.client === p.id, beliefOutput,
      id: a.id, person: p.id, adult: ageYears(world, p) >= AGE_CHILD, startTick: tick, firstPhase: a.phase,
      targetId: a.targetId, targetType: a.targetType, storeClass, buildingType: t ? t.type : '', goal: norm(a.goal ?? ''), materialStock: String(a.data.materialStock ?? ''),
      wanted, wantedUnits, mainKind: main,
      packWeight: r3(Object.entries(p.inv).reduce((s, [k, n]) => s + (n ?? 0) * (WEIGHT[k as ItemKind] ?? 1), 0)), packCap: cap,
      roomMain: main ? roomFor(p.inv, cap, main as ItemKind) : 0,
      beliefPresent: !!b, beliefItemsKnown: !!bi, beliefUnits: bu, beliefMain: bi && main ? (bi[main] ?? 0) : 0,
      beliefSeen: b ? b.seen : -1, beliefAge: b ? tick - b.seen : -1, beliefSrc: b ? b.src : 'none', beliefHops: b?.hops ?? 0, beliefHh: b?.hh ?? -1,
      truthDep: t ? t.sum : -1, truthDepMain: t ? t.main : -1, truthArr: null, truthArrMain: null, truthLastWork: null, truthLastWorkMain: null,
      travelTicks: 0, arrivedTick: null,
      endTick: null, endOutcome: '', endDetail: '', moved: 0,
    };
    return rec;
  }

  /** the class of one finished withdraw: how it came out and why */
  private classify(r: Rec) {
    const reached = r.arrivedTick !== null;
    let result: string;
    if (r.endTick === null) result = 'censored';
    else if (r.moved >= r.wantedUnits && r.moved > 0) result = 'took_all';
    else if (r.moved > 0) result = 'took_some';
    else if (reached && /nothing to take/.test(r.endDetail)) result = 'took_none_empty';
    else if (reached) result = 'took_none_other';
    else result = 'ended_before_arrival';
    let why = '';
    if (result === 'took_none_empty') {
      const last = r.truthLastWork ?? 0, arr = r.truthArr ?? 0, dep = r.truthDep;
      why = dep <= 0 ? 'stale_at_departure' : arr <= 0 ? 'drained_on_the_way' : last <= 0 ? 'emptied_while_waiting' : 'stock_there_nothing_allowed';
    }
    let beliefClass: string;
    if (!r.beliefPresent) beliefClass = 'no_belief';
    else if (!r.beliefItemsKnown) beliefClass = 'belief_without_items';
    else if (r.truthDep < 0) beliefClass = 'place_gone';
    else if (r.beliefUnits === r.truthDep) beliefClass = 'exact';
    else if (r.beliefUnits > r.truthDep) beliefClass = 'believed_more_than_there';
    else beliefClass = 'believed_less_than_there';
    // the signature of rules 169 (seen_stock.ts): a kind remembered as one where the true count is more
    const glance = r.beliefItemsKnown && r.beliefUnits > 0 && r.truthDepMain >= 2 && r.beliefMain >= 1 && r.beliefMain <= 1;
    const room = r.roomMain >= r.wantedUnits ? 'room_for_all' : r.roomMain > 0 ? 'room_for_some' : 'no_room';
    // amendment 2: for stock there and nothing allowed, why the sim's own access rules gave none (in the order the reading fixes)
    let accessWhy = '';
    if (why === 'stock_there_nothing_allowed') {
      const x = r.access;
      if (!x) accessWhy = 'other';
      else if (x.granary && x.share <= 0) accessWhy = 'granary, no share';
      else if (x.level === 'none') accessWhy = 'no access';
      else if (x.earmTotal > 0 && x.earmMine === 0 && x.have - x.earmTotal <= 0) accessWhy = 'earmarked to others';
      else if (x.level === 'friend' && x.earmMine === 0 && x.have - x.earmTotal > 0) accessWhy = 'guest stock';
      else accessWhy = 'other';
    }
    return { result, why, beliefClass, glance, room, accessWhy };
  }

  /** travel ticks of withdraws still open at the run end (rows() lists only the finished ones) */
  openTravelTicks(): number {
    let n = 0;
    for (const r of this.live.values()) n += r.travelTicks;
    return n;
  }

  rows() {
    return this.done.map((r) => {
      const c = this.classify(r);
      return { ...r, ...c };
    });
  }

  report() {
    const all = this.rows();
    for (const r of this.live.values()) all.push({ ...r, ...this.classify(r) });
    const adults = all.filter((r) => r.adult);
    const byResult = (rs: typeof all) => {
      const n: Counts = {}, ticks: Counts = {};
      for (const r of rs) { bump(n, r.result); bump(ticks, r.result, r.travelTicks); }
      const tt = Object.values(ticks).reduce((s, v) => s + v, 0);
      return { withdraws: rs.length, travelTicks: tt, count: n, travelTicksByResult: ticks, shareByCount: Object.fromEntries(Object.entries(n).map(([k, v]) => [k, share(v, rs.length)])), shareByTicks: Object.fromEntries(Object.entries(ticks).map(([k, v]) => [k, share(v, tt)])) };
    };
    const empties = adults.filter((r) => r.result === 'took_none_empty');
    const whyCount: Counts = {}, whyTicks: Counts = {};
    for (const r of empties) { bump(whyCount, r.why); bump(whyTicks, r.why, r.travelTicks); }
    const cross = (rs: typeof all, key: (r: (typeof all)[number]) => string) => {
      const m: Record<string, Counts> = {};
      for (const r of rs) { const k = key(r); (m[k] ??= {}); bump(m[k], r.result); bump(m[k], 'all'); }
      return m;
    };
    const emptyBeliefClass: Counts = {};
    for (const r of empties) bump(emptyBeliefClass, r.beliefClass);
    const accessCount: Counts = {}, accessTicks: Counts = {}, accessByType: Record<string, Counts> = {};
    for (const r of empties) {
      if (!r.accessWhy) continue;
      bump(accessCount, r.accessWhy); bump(accessTicks, r.accessWhy, r.travelTicks);
      const ty = r.buildingType || r.storeClass;
      (accessByType[ty] ??= {}); bump(accessByType[ty], r.accessWhy);
    }
    const earmarked = empties.filter((r) => r.accessWhy === 'earmarked to others');
    const earmarkedOwnHh = earmarked.filter((r) => (r.access?.earmOthersSameHh ?? 0) > 0).length;
    const beliefClientIsMe = empties.filter((r) => r.beliefClientIsMe).length;
    const beliefSawOutput = empties.filter((r) => r.beliefOutput > 0).length;
    const allowZeroAtWork = adults.filter((r) => r.access && r.access.allow <= 0 && r.access.have > 0).length;
    const staleBeliefHeld = empties.filter((r) => r.why === 'stale_at_departure' && r.beliefUnits >= 1).length;
    const goals: Counts = {};
    for (const r of adults) bump(goals, `${r.materialStock ? 'material:' + r.materialStock : 'other'} | ${r.goal}`);
    const topGoals = Object.entries(goals).sort((a, b) => b[1] - a[1]).slice(0, 15);
    // a place found empty that others walk to later: gap between empty events at the same target
    const emptiesByTarget = new Map<number, Rec[]>();
    for (const r of empties) { const l = emptiesByTarget.get(r.targetId) ?? []; l.push(r); emptiesByTarget.set(r.targetId, l); }
    const gaps: number[] = [];
    let secondEmpties = 0, byOtherPerson = 0;
    for (const l of emptiesByTarget.values()) {
      l.sort((a, b) => (a.endTick ?? 0) - (b.endTick ?? 0));
      for (let i = 1; i < l.length; i++) { secondEmpties++; gaps.push((l[i].startTick) - (l[i - 1].endTick ?? 0)); if (l[i].person !== l[i - 1].person) byOtherPerson++; }
    }
    const wasteTicks = empties.reduce((s, r) => s + r.travelTicks, 0);
    const totalTicks = adults.reduce((s, r) => s + r.travelTicks, 0);
    return {
      observer: 'WithdrawCheck',
      readOnly: 'reads the world only; no write, no random draw; the runner checks the saved state is byte-identical around a sample every 120 ticks',
      sampledTicks: this.sampled, firstTick: this.firstTick, livingPersonTicks: this.livingTicks, personDays: r3(this.livingTicks / DAY),
      counts: { withdrawsSeen: all.length, adults: adults.length, under12: all.length - adults.length, finished: this.done.length, stillOpenAtRunEnd: this.live.size, endedWithoutBeingSeen: this.unseenEnds, firstSeenInWorkPhase: all.filter((r) => r.firstPhase === 'work').length },
      adults: {
        byResult: byResult(adults),
        emptyWithdraws: {
          count: empties.length, travelTicks: wasteTicks, shareOfAllWithdrawTravelTicks: share(wasteTicks, totalTicks),
          why: { count: whyCount, travelTicks: whyTicks }, beliefClassAtDeparture: emptyBeliefClass,
          accessWhy: { count: accessCount, travelTicks: accessTicks, byBuildingType: accessByType, earmarkedToOthersWithAnOwnerInTheOwnHousehold: earmarkedOwnHh, earmarkedToOthers: earmarked.length, beliefNamedThePersonAsClient: beliefClientIsMe, beliefShowedOutputWaiting: beliefSawOutput, allAdultWithdrawsWithStockThereAndAllowanceZeroAtWork: allowZeroAtWork }, staleAtDepartureWithABeliefOfOneOrMoreUnits: staleBeliefHeld,
          glance: { count: empties.filter((r) => r.glance).length, share: share(empties.filter((r) => r.glance).length, empties.length) },
          beliefAgeTicks: dist(empties.filter((r) => r.beliefAge >= 0).map((r) => r.beliefAge)),
          beliefSource: Object.fromEntries(Object.entries(empties.reduce((m, r) => { bump(m, r.beliefSrc); return m; }, {} as Counts))),
          repeatEmptiesAtTheSamePlace: { secondOrLaterEmptyWalks: secondEmpties, byADifferentPerson: byOtherPerson, ticksFromTheLastEmptyEndToTheNextWalkStart: dist(gaps) },
        },
        glanceAmongAllWithdraws: { count: adults.filter((r) => r.glance).length, share: share(adults.filter((r) => r.glance).length, adults.length) },
        byStoreClass: cross(adults, (r) => r.storeClass),
        byBuildingType: cross(adults, (r) => r.buildingType || r.storeClass),
        byBeliefClass: cross(adults, (r) => r.beliefClass),
        byPackRoom: cross(adults, (r) => r.room),
        unitsWanted: dist(adults.map((r) => r.wantedUnits)),
        unitsTaken: dist(adults.filter((r) => r.result === 'took_all' || r.result === 'took_some').map((r) => r.moved)),
        packRoomForTheMainKindAtDeparture: dist(adults.map((r) => r.roomMain)),
        topGoals,
      },
      under12: byResult(all.filter((r) => !r.adult)),
    };
  }
}
