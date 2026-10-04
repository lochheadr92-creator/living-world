import { SOURCE_REGROW } from './constants';
import { cloneItems } from './economy';
import { facilitySnapshot } from './facilities';
import { toolsHeldBy } from './toolreg';
import type { Belief, BeliefKind, Entity, Items, Person, Source, World } from './types';

/** synthetic belief ids for coarse water-access cells (ids below 1e6 are real entities) */
export const WATER_ID_BASE = 1_000_000;
export const ACCESS_CELL = 4;

export function waterBeliefId(cellIdx: number): number {
  return WATER_ID_BASE + cellIdx;
}

export function isWaterBeliefId(id: number): boolean {
  return id >= WATER_ID_BASE;
}

function blank(id: number, kind: BeliefKind, x: number, y: number, tick: number): Belief {
  return { id, kind, x, y, amount: 0, max: 0, seen: tick, src: 'seen', from: 0, learned: tick };
}

/** Snapshot an entity as it is right now. Used when a person actually observes it. */
export function snapshotEntity(world: World, e: Entity, tick: number): Belief | null {
  switch (e.ent) {
    case 'source': {
      const b = blank(e.id, e.type, e.x + 0.5, e.y + 0.5, tick);
      b.amount = e.amount;
      b.max = e.max;
      return b;
    }
    case 'building': {
      const b = blank(e.id, 'building', e.x + e.w / 2, e.y + e.h / 2, tick);
      b.btype = e.type;
      b.hh = e.hhId;
      b.cond = e.condition;
      b.fuel = e.fuel;
      b.items = cloneItems(e.store.items);
      if (e.ops) b.ops = facilitySnapshot(world, e);
      const racked = toolsHeldBy(world, e.id);
      if (racked.length) b.tools = racked.map((t) => t.kind);
      return b;
    }
    case 'cart': {
      const b = blank(e.id, 'cart', e.x, e.y, tick);
      b.items = cloneItems(e.load);
      b.state = e.puller ? 'pulled' : 'parked';
      b.hh = e.ownerHh;
      return b;
    }
    case 'site': {
      const b = blank(e.id, 'site', e.x + e.w / 2, e.y + e.h / 2, tick);
      b.btype = e.type;
      b.hh = e.hhId;
      b.need = missingMaterials(e);
      b.progress = e.workTotal > 0 ? e.work / e.workTotal : 0;
      return b;
    }
    case 'plot': {
      const b = blank(e.id, 'plot', e.x + 0.5, e.y + 0.5, tick);
      b.state = e.state;
      b.progress = e.progress;
      b.hh = e.hhId;
      b.amount = e.stock;
      return b;
    }
    case 'pile': {
      const b = blank(e.id, 'pile', e.x + 0.5, e.y + 0.5, tick);
      b.items = cloneItems(e.items);
      return b;
    }
    case 'grave': {
      return blank(e.id, 'grave', e.x + 0.5, e.y + 0.5, tick);
    }
    case 'animal': {
      const b = blank(e.id, 'danger', e.x, e.y, tick);
      b.amount = 1;
      return b;
    }
    default:
      return null;
  }
}

/** What a site still lacks (required minus delivered minus already used). */
export function missingMaterials(site: { required: Items; delivered: Items; used: Items }): Items {
  const need: Items = {};
  for (const k in site.required) {
    const key = k as keyof Items;
    const m = (site.required[key] ?? 0) - (site.delivered[key] ?? 0) - (site.used[key] ?? 0);
    if (m > 0) need[key] = m;
  }
  return need;
}

/** Store a belief and keep the per-kind index in step. All writes go through here. */
export function putBelief(p: Person, b: Belief): void {
  const old = p.beliefs[b.id];
  p.beliefs[b.id] = b;
  if (!old) {
    (p.bykind[b.kind] ??= []).push(b.id);
  } else if (old.kind !== b.kind) {
    const arr = p.bykind[old.kind];
    if (arr) arr.splice(arr.indexOf(b.id), 1);
    (p.bykind[b.kind] ??= []).push(b.id);
  }
}

export function delBelief(p: Person, id: number): void {
  const old = p.beliefs[id];
  if (!old) return;
  delete p.beliefs[id];
  const arr = p.bykind[old.kind];
  if (arr) {
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
  }
}

/** Insert or refresh a belief. Fresher information wins; hearsay never overrides a fresher personal observation. */
export function learn(p: Person, b: Belief): boolean {
  const old = p.beliefs[b.id];
  if (!old) {
    putBelief(p, b);
    return true;
  }
  if (b.seen >= old.seen) putBelief(p, b);
  return false;
}

export function forget(p: Person, id: number): void {
  delBelief(p, id);
}

/** Direct observation of one entity by one person. Returns true if this was new to them. */
export function observe(world: World, p: Person, e: Entity): boolean {
  const b = snapshotEntity(world, e, world.tick);
  if (!b) return false;
  b.origin = p.id;
  b.hops = 0;
  return learn(p, b);
}

/** People understand roughly how fast things regrow, so a stale "empty" memory slowly turns hopeful. */
export function estimatedAmount(world: World, b: Belief): number {
  if (b.kind === 'berry_bush' || b.kind === 'fruit_tree' || b.kind === 'wild_grain' || b.kind === 'fish_spot' || b.kind === 'rock') {
    const every = SOURCE_REGROW[b.kind as Source['type']];
    if (every > 0) {
      const gained = Math.floor((world.tick - b.seen) / every);
      return Math.min(b.max, b.amount + Math.max(0, gained));
    }
  }
  return b.amount;
}

export function beliefAge(world: World, b: Belief): number {
  return world.tick - b.seen;
}

export function noteFailure(world: World, p: Person, id: number, reason: string): void {
  const f = p.failures[id];
  if (f) {
    f.tick = world.tick;
    f.reason = reason;
    f.count++;
  } else {
    p.failures[id] = { tick: world.tick, reason, count: 1 };
  }
}

export function recentFailure(world: World, p: Person, id: number, within: number): { tick: number; reason: string; count: number } | undefined {
  const f = p.failures[id];
  if (f && world.tick - f.tick < within) return f;
  return undefined;
}

export function clearFailure(p: Person, id: number): void {
  delete p.failures[id];
}

export function beliefsOfKind(p: Person, ...kinds: BeliefKind[]): Belief[] {
  const out: Belief[] = [];
  for (const kind of kinds) {
    const ids = p.bykind[kind];
    if (ids) for (const id of ids) out.push(p.beliefs[id]);
  }
  return out;
}

export function countBeliefs(p: Person): number {
  let n = 0;
  for (const k in p.bykind) n += p.bykind[k as BeliefKind]?.length ?? 0;
  return n;
}

/** Is there an entity-world mismatch the person would notice on arrival? */
export function beliefStale(world: World, b: Belief): boolean {
  return !isWaterBeliefId(b.id) && !world.byId.has(b.id);
}
