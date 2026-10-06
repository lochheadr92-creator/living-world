import { ALL_ITEMS, JAR_WATER_UNITS, NUTRITION, WEIGHT } from './constants';
import { carryCap } from './people';
import { idFromTag, isToolItem, retagTools } from './toolreg';
import type { Building, FoodKind, Items, ItemKind, Ledger, Person, Plot, Reservation, Site, Source, Store, World } from './types';

const FOOD_ORDER: FoodKind[] = ['berries', 'fruit', 'grain', 'fish', 'smoked_fish', 'bread'];

/** Choose the food that fits the current hunger deficit best (largest portion that does not overshoot much). */
export function pickFood(items: Items, hunger: number): FoodKind | null {
  const deficit = 100 - hunger;
  let best: FoodKind | null = null;
  let bestScore = 1e9;
  for (const k of FOOD_ORDER) {
    if ((items[k] ?? 0) <= 0) continue;
    const n = NUTRITION[k];
    const over = Math.max(0, n - deficit - 4);
    const score = over * 2 + Math.abs(deficit - n) * 0.15;
    if (score < bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}

export function foodUnits(items: Items): number {
  let n = 0;
  for (const k of FOOD_ORDER) n += items[k] ?? 0;
  return n;
}

// ───────── low level item containers (never touch the ledger) ─────────
export const count = (items: Items, k: ItemKind): number => items[k] ?? 0;

export function weightOf(items: Items): number {
  let w = 0;
  for (const k in items) w += (items[k as ItemKind] ?? 0) * WEIGHT[k as ItemKind];
  // a water jar carries its first few units of water without making the load heavier
  const jars = items.jar ?? 0;
  if (jars > 0 && (items.water ?? 0) > 0) w -= Math.min(items.water ?? 0, JAR_WATER_UNITS * jars) * WEIGHT.water;
  return w;
}

export function isEmptyItems(items: Items): boolean {
  for (const k in items) if ((items[k as ItemKind] ?? 0) > 0) return false;
  return true;
}

export function cloneItems(items: Items): Items {
  const o: Items = {};
  for (const k in items) if ((items[k as ItemKind] ?? 0) > 0) o[k as ItemKind] = items[k as ItemKind];
  return o;
}

/** how many of `k` fit into `items` under weight cap */
export function roomFor(items: Items, cap: number, k: ItemKind): number {
  return Math.max(0, Math.floor((cap - weightOf(items) + 1e-9) / WEIGHT[k]));
}

/** add up to n, bounded by weight capacity. returns amount actually added. */
export function addCapped(items: Items, cap: number, k: ItemKind, n: number): number {
  const m = Math.min(n, roomFor(items, cap, k));
  if (m > 0) items[k] = (items[k] ?? 0) + m;
  return m;
}

/** remove up to n. returns amount actually removed. */
export function takeFrom(items: Items, k: ItemKind, n: number): number {
  const have = items[k] ?? 0;
  const m = Math.min(n, have);
  if (m > 0) {
    const left = have - m;
    if (left > 0) items[k] = left;
    else delete items[k];
  }
  return m;
}

export function addItem(items: Items, k: ItemKind, n: number): void {
  items[k] = (items[k] ?? 0) + n;
}

// ───────── person inventories ─────────
export function invStore(world: World, p: Person): Store {
  return { items: p.inv, cap: carryCap(world, p) };
}

export function invRoom(world: World, p: Person, k: ItemKind): number {
  return roomFor(p.inv, carryCap(world, p), k);
}

export function invWeight(p: Person): number {
  return weightOf(p.inv);
}

// ───────── ledger ─────────
export function emptyLedger(): Ledger {
  return { initial: {}, created: {}, consumed: {}, spoiled: {}, reasons: {} };
}

function reasonBump(world: World, key: string, n: number): void {
  world.ledger.reasons[key] = (world.ledger.reasons[key] ?? 0) + n;
}

export function ledgerCreate(world: World, k: ItemKind, n: number, reason: string): void {
  if (n <= 0) return;
  addItem(world.ledger.created, k, n);
  reasonBump(world, '+' + reason, n);
}
export function ledgerConsume(world: World, k: ItemKind, n: number, reason: string): void {
  if (n <= 0) return;
  addItem(world.ledger.consumed, k, n);
  reasonBump(world, '-' + reason, n);
}
export function ledgerSpoil(world: World, k: ItemKind, n: number, reason: string): void {
  if (n <= 0) return;
  addItem(world.ledger.spoiled, k, n);
  reasonBump(world, 'x' + reason, n);
}

/** Consume (destroy) up to n from a container with a recorded reason. */
export function consume(world: World, items: Items, k: ItemKind, n: number, reason: string): number {
  const m = takeFrom(items, k, n);
  ledgerConsume(world, k, m, reason);
  return m;
}

/** Create items inside a container (world process like fishing renewal or crop growth), bounded by capacity. */
export function produce(world: World, items: Items, cap: number, k: ItemKind, n: number, reason: string): number {
  const m = addCapped(items, cap, k, n);
  ledgerCreate(world, k, m, reason);
  return m;
}

/** Move items between two containers, bounded by what exists and the destination's room. */
export function transfer(
  world: World,
  from: Items,
  to: Items,
  toCap: number,
  k: ItemKind,
  n: number,
  fromTag: string,
  toTag: string,
  reason: string,
): number {
  if (n <= 0) return 0;
  const room = roomFor(to, toCap, k);
  const m = Math.min(n, from[k] ?? 0, room);
  if (m <= 0) return 0;
  takeFrom(from, k, m);
  addItem(to, k, m);
  if (isToolItem(k)) retagTools(world, k, m, idFromTag(fromTag), idFromTag(toTag));
  world.hooks?.onTransfer?.({ from: fromTag, to: toTag, item: k, n: m, reason });
  return m;
}

/** Transfer into a person's pack. */
export function giveToPerson(world: World, from: Items, p: Person, k: ItemKind, n: number, fromTag: string, reason: string): number {
  return transfer(world, from, p.inv, carryCap(world, p), k, n, fromTag, 'person:' + p.id, reason);
}

export function takeFromPerson(world: World, p: Person, to: Items, toCap: number, k: ItemKind, n: number, toTag: string, reason: string): number {
  return transfer(world, p.inv, to, toCap, k, n, 'person:' + p.id, toTag, reason);
}

/** Move units out of a natural source into a person's pack. */
export function gatherFromSource(world: World, src: Source, p: Person, n: number): number {
  const room = invRoom(world, p, src.item);
  const m = Math.min(n, src.amount, room);
  if (m <= 0) return 0;
  src.amount -= m;
  addItem(p.inv, src.item, m);
  world.hooks?.onTransfer?.({ from: 'source:' + src.id, to: 'person:' + p.id, item: src.item, n: m, reason: 'gather' });
  return m;
}

/** Move grain/seeds out of a ripe plot into a person's pack. */
export function harvestPlot(world: World, plot: Plot, p: Person): { grain: number; seeds: number } {
  const g = Math.min(plot.stock, invRoom(world, p, 'grain'));
  plot.stock -= g;
  if (g > 0) addItem(p.inv, 'grain', g);
  const s = Math.min(plot.seedStock, invRoom(world, p, 'seeds'));
  plot.seedStock -= s;
  if (s > 0) addItem(p.inv, 'seeds', s);
  if (g > 0) world.hooks?.onTransfer?.({ from: 'plot:' + plot.id, to: 'person:' + p.id, item: 'grain', n: g, reason: 'harvest' });
  if (s > 0) world.hooks?.onTransfer?.({ from: 'plot:' + plot.id, to: 'person:' + p.id, item: 'seeds', n: s, reason: 'harvest' });
  return { grain: g, seeds: s };
}

export function buildingStore(b: Building): Store {
  return b.store;
}

export function siteStoreRoom(): number {
  return 9999;
}

// ───────── totals / conservation check ─────────
export function totalItems(world: World): Items {
  const t: Items = {};
  const add = (items: Items) => {
    for (const k in items) addItem(t, k as ItemKind, items[k as ItemKind] ?? 0);
  };
  for (const p of world.persons) if (p.alive) add(p.inv);
  for (const b of world.buildings) {
    add(b.store.items);
    if (b.ops?.job) add(b.ops.job.held);
  }
  for (const s of world.sites) add(s.delivered);
  for (const pile of world.piles) add(pile.items);
  for (const c of world.carts) add(c.load);
  for (const m of world.meals) if (m.status !== 'done' && m.status !== 'cancelled') add(m.table);
  for (const s of world.sources) if (s.amount > 0) addItem(t, s.item, s.amount);
  for (const pl of world.plots) {
    if (pl.stock > 0) addItem(t, 'grain', pl.stock);
    if (pl.seedStock > 0) addItem(t, 'seeds', pl.seedStock);
  }
  return t;
}

export function snapshotInitial(world: World): void {
  world.ledger.initial = cloneItems(totalItems(world));
}

/** Verify: now == initial + created - consumed - spoiled, for every item kind. */
export function conservationReport(world: World): { ok: boolean; diffs: { item: ItemKind; expected: number; actual: number }[] } {
  const now = totalItems(world);
  const L = world.ledger;
  const diffs: { item: ItemKind; expected: number; actual: number }[] = [];
  for (const k of ALL_ITEMS) {
    const expected = (L.initial[k] ?? 0) + (L.created[k] ?? 0) - (L.consumed[k] ?? 0) - (L.spoiled[k] ?? 0);
    const actual = now[k] ?? 0;
    if (expected !== actual) diffs.push({ item: k, expected, actual });
  }
  return { ok: diffs.length === 0, diffs };
}

// ───────── reservations ─────────
function addRes(world: World, owner: number, kind: Reservation['kind'], target: number, amount: number, ttl: number): number {
  const id = world.nextId++;
  world.reservations.set(id, { id, owner, kind, target, amount, expires: world.tick + ttl });
  return id;
}

/** Claim `n` units of a source for an in-progress gather cycle. Returns reservation id or 0. */
export function claimUnits(world: World, owner: number, src: Source, n: number, ttl: number): number {
  if (src.amount - src.reserved < n) return 0;
  src.reserved += n;
  return addRes(world, owner, 'unit', src.id, n, ttl);
}

/** A worker slot on a construction site (bounded number of simultaneous builders). */
export function claimSlot(world: World, owner: number, site: Site, ttl: number): number {
  let used = 0;
  for (const r of world.reservations.values()) {
    if (r.kind === 'slot' && r.target === site.id) {
      if (r.owner === owner) {
        r.expires = world.tick + ttl;
        return r.id;
      }
      used++;
    }
  }
  if (used >= site.maxWorkers) return 0;
  return addRes(world, owner, 'slot', site.id, 1, ttl);
}

/** Exclusive claim on a farm plot while someone works it. */
export function claimPlot(world: World, owner: number, plot: Plot, ttl: number): number {
  for (const r of world.reservations.values()) {
    if (r.kind === 'plot' && r.target === plot.id) {
      if (r.owner !== owner) return 0;
      r.expires = world.tick + ttl;
      return r.id;
    }
  }
  plot.claimedBy = owner;
  return addRes(world, owner, 'plot', plot.id, 1, ttl);
}

export function releaseClaim(world: World, id: number): void {
  const r = world.reservations.get(id);
  if (!r) return;
  world.reservations.delete(id);
  const e = world.byId.get(r.target);
  if (!e) return;
  if (r.kind === 'unit' && e.ent === 'source') e.reserved = Math.max(0, e.reserved - r.amount);
  if (r.kind === 'plot' && e.ent === 'plot' && e.claimedBy === r.owner) e.claimedBy = 0;
}

export function releaseClaims(world: World, ids: number[]): void {
  for (const id of ids) releaseClaim(world, id);
  ids.length = 0;
}

export function releaseAllFor(world: World, owner: number): void {
  for (const r of [...world.reservations.values()]) if (r.owner === owner) releaseClaim(world, r.id);
}

/** Safety net: reservations are bounded in time. */
export function expireReservations(world: World): void {
  for (const r of [...world.reservations.values()]) {
    if (r.expires < world.tick) releaseClaim(world, r.id);
  }
}
