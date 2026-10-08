import { CELLAR_SPOIL, cellarAccepts } from './storage';
import { DAY, GRANARY_NEGLECT_MULT, GRANARY_SPOIL, GRANARY_TEND_EVERY, PERISHABLE, SKILL_GAIN, SKILL_MAX, WEIGHT, RAW_MATERIALS } from './constants';
import { addItem, ledgerConsume, ledgerCreate, weightOf, takeFrom } from './economy';
import { addEvent, addFx, addLog } from './events';
import { newCart } from './carts';
import { RECIPE_BY_ID, acceptedAt, isFacilityType, newOps, recipesAt } from './recipes';
import type { Recipe } from './recipes';
import { newId, personById } from './registry';
import { affinityOf } from './relations';
import { benchTool, mintTool, recipeToolMultiplier, wearTool } from './tools';
import { bestOf } from './toolreg';
import type { Building, Earmark, FacilitySnapshot, FacilityState, Items, ItemKind, Job, Person, Source, World } from './types';

/** A batch nobody has worked on for this long is shelved: its inputs go back on the shelves unharmed. */
export const STALL_LIMIT = DAY * 2;
/** Finished goods and delivered inputs are held for whoever they belong to this long, then become the workplace's own stock. */
export const EARMARK_TERM = Math.round(DAY * 1.5);

export function opsOf(b: Building): FacilityState | null {
  if (!isFacilityType(b.type)) return null;
  if (!b.ops) b.ops = newOps();
  return b.ops;
}

// ───────────────────────── who may use a workplace ─────────────────────────
export type AccessLevel = 'owner' | 'communal' | 'builder' | 'friend' | 'none';

/**
 * Ownership and access, as documented in docs/ECONOMY.md:
 *   – a workplace laid out by one household belongs to it; one built by several (no household with a clear majority of the effort) belongs to everyone;
 *   – owners and communal workplaces are open to everybody they belong to;
 *   – a household that did at least a fifth of the building work may use it too;
 *   – anyone else may use it if one of the owners counts them a friend (affinity of 12 or more) — and the goods they bring and make remain theirs.
 */
export function accessLevel(world: World, p: Person, b: Building): AccessLevel {
  if (b.hhId === 0) return 'communal';
  if (p.hhId === b.hhId) return 'owner';
  const share = b.ops?.builders[p.hhId] ?? 0;
  if (share >= 0.2) return 'builder';
  for (const q of world.persons) if (q.alive && q.hhId === b.hhId && affinityOf(p, q.id) >= 12 && affinityOf(q, p.id) >= 6) return 'friend';
  return 'none';
}

export function mayUse(world: World, p: Person, b: Building): boolean {
  return accessLevel(world, p, b) !== 'none';
}

/** Is the workplace's own stock (not earmarked for anyone) open to this person? */
function houseStockOpen(level: AccessLevel): boolean {
  return level === 'owner' || level === 'communal' || level === 'builder';
}

// ───────────────────────── stock accounting inside a workplace ─────────────────────────
function liveEarmarks(world: World, ops: FacilityState): Earmark[] {
  return ops.earmarks.filter((e) => e.until > world.tick && e.n > 0);
}

function earmarkedTotal(world: World, ops: FacilityState, item: ItemKind): number {
  let n = 0;
  for (const e of liveEarmarks(world, ops)) if (e.item === item) n += e.n;
  return n;
}

function earmarkedTo(world: World, ops: FacilityState, item: ItemKind, owner: number): number {
  let n = 0;
  for (const e of liveEarmarks(world, ops)) if (e.item === item && e.owner === owner) n += e.n;
  return n;
}

/** How many units of `item` in this store this person may take or use right now. */
export function usableUnits(world: World, b: Building, p: Person, item: ItemKind): number {
  const have = b.store.items[item] ?? 0;
  const ops = b.ops;
  if (!ops) return have;
  const level = accessLevel(world, p, b);
  const mine = Math.min(have, earmarkedTo(world, ops, item, p.id));
  const free = Math.max(0, have - earmarkedTotal(world, ops, item));
  return Math.min(have, mine + (houseStockOpen(level) ? free : 0));
}

/** Take `n` units of `item` for a person's use from the store, earmarked units first. */
function drawStock(world: World, b: Building, p: Person, item: ItemKind, n: number): number {
  const ops = b.ops!;
  const m = Math.min(n, usableUnits(world, b, p, item));
  if (m <= 0) return 0;
  let left = m;
  for (const e of ops.earmarks) {
    if (left <= 0) break;
    if (e.item !== item || e.owner !== p.id || e.until <= world.tick) continue;
    const t = Math.min(e.n, left);
    e.n -= t;
    left -= t;
  }
  ops.earmarks = ops.earmarks.filter((e) => e.n > 0);
  takeFrom(b.store.items, item, m);
  return m;
}

export function addEarmark(world: World, b: Building, e: Omit<Earmark, 'until'> & { term?: number }): void {
  const ops = opsOf(b);
  if (!ops) return;
  const until = world.tick + (e.term ?? EARMARK_TERM);
  const found = ops.earmarks.find((x) => x.kind === e.kind && x.item === e.item && x.owner === e.owner && x.until > world.tick);
  if (found) {
    found.n += e.n;
    found.until = until;
  } else ops.earmarks.push({ kind: e.kind, item: e.item, n: e.n, owner: e.owner, until, reason: e.reason });
}

function expireEarmarks(world: World, ops: FacilityState): void {
  if (!ops.earmarks.length) return;
  const have = (item: ItemKind, b: Building) => b.store.items[item] ?? 0;
  void have;
  ops.earmarks = ops.earmarks.filter((e) => e.until > world.tick && e.n > 0);
}

/** Keep earmarks honest when the store has lost goods (spoilage, collapse): nobody can hold a claim on more than is there. */
function trimEarmarks(b: Building): void {
  const ops = b.ops;
  if (!ops) return;
  const byItem: Record<string, number> = {};
  for (const e of ops.earmarks) byItem[e.item] = (byItem[e.item] ?? 0) + e.n;
  for (const k of Object.keys(byItem)) {
    const have = b.store.items[k as ItemKind] ?? 0;
    let over = byItem[k] - have;
    if (over <= 0) continue;
    for (let i = ops.earmarks.length - 1; i >= 0 && over > 0; i--) {
      const e = ops.earmarks[i];
      if (e.item !== k) continue;
      const t = Math.min(e.n, over);
      e.n -= t;
      over -= t;
    }
  }
  ops.earmarks = ops.earmarks.filter((e) => e.n > 0);
}

// ───────────────────────── what goes in and out of a workplace's store ─────────────────────────
/** May this person put this item into the building's store (the store is for the work done there)? */
export function mayDeposit(b: Building, item: ItemKind): boolean {
  if (b.type === 'well') return false; // a well holds only the water that seeps into it
  if (b.type === 'cellar') return cellarAccepts(item);
  if (b.type === 'stockyard') return RAW_MATERIALS.includes(item);
  if (!b.ops) return true;
  return acceptedAt(b.type).includes(item);
}

/** A deposit by someone who is not of the owning household is theirs to use in their own batch. */
export function noteDeposit(world: World, b: Building, p: Person, item: ItemKind, n: number): void {
  if (n <= 0) return;
  const ops = b.ops;
  if (!ops) return;
  if (b.type === 'granary') {
    const sh = (ops.shares[p.hhId] ??= {});
    sh[item] = (sh[item] ?? 0) + n;
    return;
  }
  const level = accessLevel(world, p, b);
  if (level === 'friend' || level === 'builder') addEarmark(world, b, { kind: 'in', item, n, owner: p.id, reason: 'brought for their own batch' });
}

/** How many units this person may take out of the building's store. */
export function withdrawAllowance(world: World, b: Building, p: Person, item: ItemKind, want: number): number {
  const ops = b.ops;
  const have = b.store.items[item] ?? 0;
  if (!ops) return Math.min(want, have);
  if (b.type === 'granary') {
    const share = ops.shares[p.hhId]?.[item] ?? 0;
    let allow = share;
    // an emergency ration: anyone starving, or with a starving child in the house, may take a little beyond their share
    if (allow < want && (p.needs.hunger < 25 || hasHungryDependent(world, p)) && accessLevel(world, p, b) !== 'none') allow = Math.max(allow, Math.min(3, have));
    return Math.min(want, have, allow);
  }
  if (b.type === 'hall') return Math.min(want, have, accessLevel(world, p, b) === 'none' ? 0 : have);
  const lvl = accessLevel(world, p, b);
  if (lvl === 'none') return 0;
  return Math.min(want, usableUnits(world, b, p, item));
}

function hasHungryDependent(world: World, p: Person): boolean {
  return world.persons.some((q) => q.alive && q.hhId === p.hhId && q.id !== p.id && q.needs.hunger < 30 && (q.birthTick > world.tick - 12 * 2400 * 16 || q.health < 60));
}

/** Called after a person has taken goods out. Keeps earmarks and granary shares in step. */
export function noteWithdraw(world: World, b: Building, p: Person, item: ItemKind, n: number): void {
  const ops = b.ops;
  if (!ops || n <= 0) return;
  if (b.type === 'granary') {
    const sh = (ops.shares[p.hhId] ??= {});
    let left = n;
    const own = Math.min(sh[item] ?? 0, left);
    sh[item] = (sh[item] ?? 0) - own;
    left -= own;
    if (left > 0) {
      // an emergency ration: it comes out of the shares of those with the most, and is owed
      let guard = 0;
      while (left > 0 && guard++ < 20) {
        let rich = 0;
        let best = 0;
        for (const hid of Object.keys(ops.shares)) {
          const v = ops.shares[Number(hid)][item] ?? 0;
          if (v > best && Number(hid) !== p.hhId) {
            best = v;
            rich = Number(hid);
          }
        }
        if (!rich) break;
        ops.shares[rich][item] = best - 1;
        left--;
      }
    }
    for (const hid of Object.keys(ops.shares)) {
      const sh2 = ops.shares[Number(hid)];
      if ((sh2[item] ?? 0) <= 0) delete sh2[item];
    }
    return;
  }
  // earmarked goods leave the claim with the person who took them
  let left = n;
  for (const e of ops.earmarks) {
    if (left <= 0) break;
    if (e.item === item && e.owner === p.id) {
      const t = Math.min(e.n, left);
      e.n -= t;
      left -= t;
    }
  }
  ops.earmarks = ops.earmarks.filter((e) => e.n > 0);
}

// ───────────────────────── spoilage (called from the world's slow process) ─────────────────────────
/** Multiplier on how fast perishable goods go off in this building. */
export function spoilMultiplier(world: World, b: Building): number {
  if (b.type === 'cellar') return CELLAR_SPOIL;
  if (b.type === 'granary') {
    const ops = b.ops;
    const tended = ops ? world.tick - Math.max(ops.tended, b.builtTick) < GRANARY_TEND_EVERY : true;
    return tended ? GRANARY_SPOIL : GRANARY_NEGLECT_MULT;
  }
  return 1;
}

/** Granary shares follow losses: the spoilage falls on households in proportion to what they have in the bins. */
export function noteSpoiled(world: World, b: Building, item: ItemKind, lost: number): void {
  const ops = b.ops;
  if (!ops || b.type !== 'granary' || lost <= 0) return;
  for (let i = 0; i < lost; i++) {
    let total = 0;
    for (const hid of Object.keys(ops.shares)) total += ops.shares[Number(hid)][item] ?? 0;
    if (total <= 0) break;
    let pick = world.rng.next() * total;
    for (const hid of Object.keys(ops.shares)) {
      const v = ops.shares[Number(hid)][item] ?? 0;
      if (pick < v) {
        ops.shares[Number(hid)][item] = v - 1;
        break;
      }
      pick -= v;
    }
  }
  for (const hid of Object.keys(ops.shares)) {
    const sh = ops.shares[Number(hid)];
    if ((sh[item] ?? 0) <= 0) delete sh[item];
  }
}

/** Anything in the granary's bins that no household owns (grain from before the shares, or left by a household that is gone) is the commons'. */
export function commonsStock(b: Building, item: ItemKind): number {
  const ops = b.ops;
  if (!ops) return 0;
  let owned = 0;
  for (const hid of Object.keys(ops.shares)) owned += ops.shares[Number(hid)][item] ?? 0;
  return Math.max(0, (b.store.items[item] ?? 0) - owned);
}

// ───────────────────────── jobs ─────────────────────────
function itemsSum(a: Items, k: ItemKind): number {
  return a[k] ?? 0;
}

function bump(items: Items, k: ItemKind, n: number): void {
  items[k] = (items[k] ?? 0) + n;
}

export function recipeOf(job: Job): Recipe {
  return RECIPE_BY_ID[job.recipe];
}

/** The rate at which this person's work moves a batch along (1 = a worker of skill 1.0 without the helpful tool). */
export function workRate(world: World, p: Person, r: Recipe, toolMult: number): number {
  const skill = r.skill ? p.skills[r.skill] : 1;
  const tired = p.needs.energy < 25 ? 0.75 : 1;
  const weather = 1 - 0.1 * world.weather.rain;
  return (skill * tired * weather) / toolMult;
}

/** The tool a worker would use for this recipe: one they carry, or one lying on the workshop's rack. */
export function recipeTool(world: World, p: Person, b: Building, r: Recipe): { tool: ReturnType<typeof bestOf>; bench: boolean } {
  if (!r.tool) return { tool: null, bench: false };
  const own = bestOf(world, p.id, r.tool.kind, p.id);
  if (own) return { tool: own, bench: false };
  const t = benchTool(world, p, b.id, r.tool.kind);
  return { tool: t, bench: !!t };
}

function outputWeight(r: Recipe): number {
  let w = 0;
  for (const k of Object.keys(r.outputs) as ItemKind[]) w += (r.outputs[k] ?? 0) * WEIGHT[k];
  if (r.toolOut) w += WEIGHT[r.toolOut.kind];
  return w;
}

function storeFreeWeight(b: Building): number {
  return b.store.cap - weightOf(b.store.items);
}

function depositOf(world: World, b: Building): Source | null {
  const id = b.ops?.depositId ?? 0;
  if (!id) return null;
  const e = world.byId.get(id);
  return e && e.ent === 'source' ? e : null;
}

/** Why this person cannot start this recipe here right now ('' if they can). The text is what the inspector shows. */
export function startBlocker(world: World, b: Building, p: Person, r: Recipe): string {
  const ops = opsOf(b);
  if (!ops) return 'not a workplace';
  if (r.at !== b.type) return 'wrong kind of workplace';
  if (ops.job) return ops.job.phase === 'burn' ? 'the fire is already burning a batch' : ops.job.phase === 'ready' ? 'finished goods are waiting for room' : 'a batch is already under way';
  if (!mayUse(world, p, b)) return 'not theirs to use';
  if (b.condition < 12) return 'too run down to use';
  if (r.tool?.required) {
    const own = bestOf(world, p.id, r.tool.kind, p.id);
    const bench = bestOf(world, b.id, r.tool.kind, p.id);
    if (!own && !(bench && !(bench.loan && bench.loan.borrower !== p.id && bench.loan.due > world.tick))) return `needs a ${r.tool.kind === 'pick' ? 'pickaxe' : r.tool.kind}`;
  }
  const need: Items = {};
  for (const k of Object.keys(r.inputs) as ItemKind[]) bump(need, k, r.inputs[k] ?? 0);
  for (const k of Object.keys(r.fuel) as ItemKind[]) bump(need, k, r.fuel[k] ?? 0);
  for (const k of Object.keys(need) as ItemKind[]) {
    const have = usableUnits(world, b, p, k);
    if (have < (need[k] ?? 0)) return `lacks ${(need[k] ?? 0) - have} ${k}`;
  }
  if (r.fromDeposit) {
    const dep = depositOf(world, b);
    if (!dep) return r.at === 'mine' ? 'no ore vein to dig' : 'no stone outcrop to cut';
    if (dep.amount - dep.reserved < r.fromDeposit.n) return r.at === 'mine' ? 'the vein is worked out' : 'the outcrop is worked out';
  }
  const out = outputWeight(r);
  if (out > 0 && storeFreeWeight(b) - (r.fromDeposit ? 0 : 0) < out - weightOfList(r.inputs) * 0) {
    // inputs leave the store when the job starts, so they free up room
    const freed = weightOfList(r.inputs) + weightOfList(r.fuel);
    if (storeFreeWeight(b) + freed < out) return 'no room in the store for the product';
  }
  return '';
}

function weightOfList(items: Items): number {
  let w = 0;
  for (const k of Object.keys(items) as ItemKind[]) w += (items[k] ?? 0) * WEIGHT[k];
  return w;
}

/** Start a batch. Inputs and fuel leave the shelves (they still exist: they are held by the batch). Returns an error text or null. */
export function startJob(world: World, b: Building, p: Person, r: Recipe, client: number, purpose: string, destSite = 0): string | null {
  const why = startBlocker(world, b, p, r);
  if (why) return why;
  const ops = opsOf(b)!;
  const held: Items = {};
  for (const k of Object.keys(r.inputs) as ItemKind[]) {
    const m = drawStock(world, b, p, k, r.inputs[k] ?? 0);
    if (m > 0) bump(held, k, m);
  }
  for (const k of Object.keys(r.fuel) as ItemKind[]) {
    const m = drawStock(world, b, p, k, r.fuel[k] ?? 0);
    if (m > 0) bump(held, k, m);
  }
  if (r.fromDeposit) {
    const dep = depositOf(world, b);
    if (dep) {
      dep.amount -= r.fromDeposit.n;
      bump(held, r.fromDeposit.item, r.fromDeposit.n);
      world.hooks?.onTransfer?.({ from: 'source:' + dep.id, to: 'building:' + b.id, item: r.fromDeposit.item, n: r.fromDeposit.n, reason: r.at === 'mine' ? 'dug from the vein' : 'cut from the outcrop' });
    }
  }
  const job: Job = {
    recipe: r.id,
    client,
    purpose,
    destSite,
    phase: 'work',
    started: world.tick,
    lastWork: world.tick,
    progress: 0,
    total: r.work,
    burnLeft: 0,
    burnTotal: r.burn,
    held,
    workers: {},
    blocked: '',
  };
  ops.job = job;
  ops.lastBlocker = '';
  return null;
}

/** Can this person lend a hand to the batch under way? */
export function joinBlocker(world: World, b: Building, p: Person): string {
  const job = b.ops?.job;
  if (!job) return 'nothing is being made';
  if (job.phase !== 'work') return job.phase === 'burn' ? 'it is burning; there is nothing to do but wait' : 'finished, waiting for room';
  const r = recipeOf(job);
  if (!mayUse(world, p, b)) return 'not theirs to use';
  if (r.tool?.required && !bestOf(world, p.id, r.tool.kind, p.id) && !bestOf(world, b.id, r.tool.kind, p.id)) return `needs a ${r.tool.kind}`;
  const busy = Object.keys(b.ops!.present).filter((k) => world.tick - b.ops!.present[Number(k)] < 20 && Number(k) !== p.id).length;
  if (busy >= r.workers) return 'as many people as can work on it are already at it';
  return '';
}

/** One tick of work on the running batch. Returns whether it is still going. */
export function workJob(world: World, b: Building, p: Person): 'continue' | 'worked' | 'stopped' {
  const ops = b.ops;
  const job = ops?.job;
  if (!ops || !job || job.phase !== 'work') return 'stopped';
  const r = recipeOf(job);
  const { tool } = recipeTool(world, p, b, r);
  const mult = r.tool ? recipeToolMultiplier(tool, r.tool.speed) : 1;
  const rate = workRate(world, p, r, mult);
  job.progress += rate;
  job.lastWork = world.tick;
  job.workers[p.id] = (job.workers[p.id] ?? 0) + 1;
  ops.present[p.id] = world.tick;
  ops.contributions[p.id] = (ops.contributions[p.id] ?? 0) + 1;
  ops.lastRun = world.tick;
  if (tool && r.tool) wearTool(world, tool, 1);
  if (job.progress >= job.total) {
    endWorkPhase(world, b);
    return 'worked';
  }
  return 'continue';
}

function endWorkPhase(world: World, b: Building): void {
  const ops = b.ops!;
  const job = ops.job!;
  const r = recipeOf(job);
  if (r.burn > 0) {
    // light the fire: fuel is spent now
    for (const k of Object.keys(r.fuel) as ItemKind[]) {
      const n = Math.min(job.held[k] ?? 0, r.fuel[k] ?? 0);
      if (n > 0) {
        takeFrom(job.held, k, n);
        ledgerConsume(world, k, n, 'burned as fuel');
        bump(ops.consumed, k, n);
      }
    }
    job.phase = 'burn';
    job.burnLeft = r.burn;
    addFx(world, 'smoke', b.x + b.w / 2, b.y + 0.3, b.id);
    return;
  }
  finishJob(world, b);
}

/** Per-tick upkeep of a workplace: the fire burns on without anybody there, stalled batches are shelved, claims lapse. */
export function facilityTick(world: World, b: Building): void {
  const ops = b.ops;
  if (!ops) return;
  const job = ops.job;
  if (job) {
    if (job.phase === 'burn') {
      job.burnLeft--;
      if (job.burnLeft <= 0) finishJob(world, b);
    } else if (job.phase === 'ready') {
      if ((world.tick + b.id) % 30 === 0) finishJob(world, b);
    } else if (job.phase === 'work' && world.tick - job.lastWork > STALL_LIMIT) {
      shelveJob(world, b, 'nobody came back to it');
    }
  }
  if ((world.tick + b.id) % 60 === 0) {
    expireEarmarks(world, ops);
    trimEarmarks(b);
    for (const k of Object.keys(ops.present)) if (world.tick - ops.present[Number(k)] > 400) delete ops.present[Number(k)];
  }
}

/** A batch nobody finishes: its inputs go back on the shelves (recorded), nothing is lost. */
export function shelveJob(world: World, b: Building, why: string): void {
  const ops = b.ops;
  const job = ops?.job;
  if (!ops || !job) return;
  const r = recipeOf(job);
  for (const k of Object.keys(job.held) as ItemKind[]) {
    const n = job.held[k] ?? 0;
    if (n <= 0) continue;
    if (r.fromDeposit && k === r.fromDeposit.item) {
      // stone cut out of the outcrop but never finished is simply stacked at the yard
      addItem(b.store.items, k, n);
    } else addItem(b.store.items, k, n);
  }
  addEvent(world, 'work', `A batch of ${r.label} at the ${b.type.replace('_', ' ')} was set aside (${why}); its materials went back on the shelves.`, [], b.x + b.w / 2, b.y + b.h / 2);
  ops.job = null;
  ops.lastBlocker = why;
}

/** The batch is done: inputs are used up, products appear in the store and are held for whoever asked for them. */
export function finishJob(world: World, b: Building): boolean {
  const ops = b.ops;
  const job = ops?.job;
  if (!ops || !job) return false;
  const r = recipeOf(job);
  const out = outputWeight(r);
  const freed = weightOfList(job.held) - (r.fromDeposit ? 0 : 0);
  // the held inputs are not in the store, so the product needs its own room
  if (out > 0 && storeFreeWeight(b) < out - (r.fromDeposit ? 0 : 0) && !(r.cartOut || (r.toolOut && false))) {
    job.phase = 'ready';
    job.blocked = 'the store is full: there is no room for the finished goods';
    ops.lastBlocker = job.blocked;
    return false;
  }
  void freed;
  // fuel for recipes with no separate burn phase is spent now
  for (const k of Object.keys(r.fuel) as ItemKind[]) {
    const n = Math.min(job.held[k] ?? 0, r.fuel[k] ?? 0);
    if (n > 0) {
      takeFrom(job.held, k, n);
      ledgerConsume(world, k, n, 'burned as fuel');
      bump(ops.consumed, k, n);
    }
  }
  // inputs: the part that becomes product is used, the rest is waste (both recorded)
  const stuff = r.fromDeposit ? [] : (Object.keys(r.inputs) as ItemKind[]);
  for (const k of stuff) {
    const n = Math.min(job.held[k] ?? 0, r.inputs[k] ?? 0);
    if (n <= 0) continue;
    takeFrom(job.held, k, n);
    const waste = Math.min(n, r.waste[k] ?? 0);
    if (n - waste > 0) ledgerConsume(world, k, n - waste, `used in ${r.label}`);
    if (waste > 0) {
      ledgerConsume(world, k, waste, `wasted: ${r.wasteWhy}`);
      ops.wasted[r.wasteWhy] = (ops.wasted[r.wasteWhy] ?? 0) + waste;
    }
    bump(ops.consumed, k, n);
  }
  // anything else still held (should not happen) returns to the shelves
  for (const k of Object.keys(job.held) as ItemKind[]) {
    const n = job.held[k] ?? 0;
    if (n <= 0) continue;
    if (r.fromDeposit && k === r.fromDeposit.item) continue;
    addItem(b.store.items, k, n);
    delete job.held[k];
  }
  const client = job.client;
  const clientP = personById(world, client);
  // products
  if (r.fromDeposit) {
    const n = job.held[r.fromDeposit.item] ?? 0;
    if (n > 0) {
      addItem(b.store.items, r.fromDeposit.item, n);
      bump(ops.produced, r.fromDeposit.item, n);
      if (client) addEarmark(world, b, { kind: 'out', item: r.fromDeposit.item, n, owner: client, reason: job.purpose });
    }
    delete job.held[r.fromDeposit.item];
  }
  for (const k of Object.keys(r.outputs) as ItemKind[]) {
    // what is cut from a deposit was moved above, not made: it must not be created a second time
    if (r.fromDeposit && r.fromDeposit.item === k) continue;
    const n = r.outputs[k] ?? 0;
    if (n <= 0) continue;
    addItem(b.store.items, k, n);
    ledgerCreate(world, k, n, `made ${r.label}`);
    bump(ops.produced, k, n);
    if (client) addEarmark(world, b, { kind: 'out', item: k, n, owner: client, reason: job.purpose });
  }
  if (r.toolOut) {
    const ownerHh = clientP ? clientP.hhId : b.hhId;
    const maker = Object.keys(job.workers).map(Number).sort((x, y) => (job.workers[y] ?? 0) - (job.workers[x] ?? 0))[0] ?? 0;
    mintTool(world, r.toolOut.kind, r.toolOut.tier, ownerHh, b.id, b.store.items, maker, `made ${r.label}`);
    bump(ops.produced, r.toolOut.kind, 1);
    if (client) addEarmark(world, b, { kind: 'out', item: r.toolOut.kind, n: 1, owner: client, reason: job.purpose });
  }
  if (r.cartOut) {
    const ownerHh = clientP ? clientP.hhId : b.hhId;
    newCart(world, b.doorX + 0.5, b.doorY + 0.5, ownerHh);
  }
  // effect on the workplace itself
  if (r.id === 'tend_granary') ops.tended = world.tick;
  ops.batches++;
  ops.lastRun = world.tick;
  // skill comes from finished work: everyone who put in a fair share learns a little, less the better they already are
  if (r.skill) {
    const total = Object.values(job.workers).reduce((s, v) => s + v, 0) || 1;
    for (const k of Object.keys(job.workers)) {
      const q = personById(world, Number(k));
      if (!q || job.workers[Number(k)] / total < 0.2) continue;
      const base = SKILL_GAIN[r.skill as keyof typeof SKILL_GAIN] ?? 0.012;
      q.skills[r.skill] = Math.min(SKILL_MAX, q.skills[r.skill] + base * Math.max(0.15, (SKILL_MAX - q.skills[r.skill]) / (SKILL_MAX - 0.7)));
    }
  }
  // who did it
  const names = Object.keys(job.workers)
    .map((k) => personById(world, Number(k))?.name)
    .filter((n): n is string => !!n);
  const doers = names.length ? names.slice(0, 2).join(' and ') : 'Someone';
  addEvent(world, 'work', `${doers} finished ${r.label} at the ${b.type.replace('_', ' ')}.`, Object.keys(job.workers).map(Number).slice(0, 3), b.x + b.w / 2, b.y + b.h / 2);
  for (const k of Object.keys(job.workers)) {
    const q = personById(world, Number(k));
    if (q) {
      q.stats.crafted++;
      addLog(world, q, 'work', `Finished ${r.label} at the ${b.type.replace('_', ' ')}.`);
    }
  }
  addFx(world, 'built', b.x + b.w / 2, b.y + b.h / 2, b.id);
  ops.job = null;
  return true;
}

/** Destroyed or collapsed: the batch's materials go with the rubble (the caller drops them). Returns the items to scatter. */
export function scrapJob(b: Building): Items {
  const job = b.ops?.job;
  if (!job) return {};
  const held = job.held;
  b.ops!.job = null;
  return held;
}

// ───────────────────────── views ─────────────────────────
export function facilitySnapshot(world: World, b: Building): FacilitySnapshot | undefined {
  const ops = b.ops;
  if (!ops) return undefined;
  const job = ops.job;
  const inputs: Items = {};
  const output: Items = {};
  const ins = new Set<ItemKind>();
  const outs = new Set<ItemKind>();
  for (const r of recipesAt(b.type)) {
    for (const k of Object.keys(r.inputs) as ItemKind[]) ins.add(k);
    for (const k of Object.keys(r.fuel) as ItemKind[]) ins.add(k);
    for (const k of Object.keys(r.outputs) as ItemKind[]) outs.add(k);
    if (r.toolOut) outs.add(r.toolOut.kind);
  }
  for (const k of Object.keys(b.store.items) as ItemKind[]) {
    const n = b.store.items[k] ?? 0;
    if (n <= 0) continue;
    if (outs.has(k)) output[k] = n;
    else if (ins.has(k)) inputs[k] = n;
  }
  const dep = depositOf(world, b);
  const rr = job ? recipeOf(job) : null;
  return {
    job: job ? job.recipe : null,
    progress: job ? Math.min(1, job.progress / Math.max(1, job.total)) : 0,
    burn: job && job.phase !== 'work' && job.burnTotal > 0 ? 1 - Math.max(0, job.burnLeft) / job.burnTotal : 0,
    output,
    inputs,
    blocked: ops.lastBlocker,
    deposit: dep ? dep.amount : -1,
    yields: rr ? { ...rr.outputs, ...(rr.fromDeposit ? { [rr.fromDeposit.item]: rr.fromDeposit.n } : {}), ...(rr.toolOut ? { [rr.toolOut.kind]: 1 } : {}) } : {},
    readyAt: job ? (job.phase === 'burn' ? world.tick + job.burnLeft : job.phase === 'ready' ? world.tick : world.tick + Math.max(0, job.total - job.progress) + job.burnTotal) : 0,
    client: job ? job.client : 0,
    tended: ops.tended,
  };
}

/** Record a reason why nobody could get on (shown in the inspector). */
export function noteBlocker(b: Building, why: string): void {
  if (b.ops) b.ops.lastBlocker = why;
}

export { newId };
export { PERISHABLE, itemsSum };
