import { BUILD_DEF, isHomeType, isSolidHome } from './constants';
import { addItem, isEmptyItems, cloneItems } from './economy';
import { addEvent, addFx } from './events';
import { isFacilityType, newOps } from './recipes';
import { hashUnit } from './rng';
import { retagTools } from './toolreg';
import { newId, registerBuilding, registerSite, unregisterBuilding, unregisterSite, isFreeLand, isWalkable, registerGeneric } from './registry';
import type { Building, BuildingType, Household, Items, Person, Pile, Site, World } from './types';
import { T } from './types';
import { dist } from './util';

export function buildingLabel(t: BuildingType): string {
  return BUILD_DEF[t].label;
}

function doorFor(type: BuildingType, x: number, y: number): { x: number; y: number } {
  const d = BUILD_DEF[type];
  return { x: x, y: y + d.h };
}

export function createBuilding(world: World, type: BuildingType, x: number, y: number, hhId: number, opts: { condition?: number; fuel?: number } = {}): Building {
  const d = BUILD_DEF[type];
  const door = doorFor(type, x, y);
  const b: Building = {
    ent: 'building',
    id: newId(world),
    type,
    x,
    y,
    w: d.w,
    h: d.h,
    condition: opts.condition ?? 100,
    hhId,
    store: { items: {}, cap: d.cap },
    fuel: opts.fuel ?? 0,
    builtTick: world.tick,
    doorX: door.x,
    doorY: door.y,
    variant: Math.floor(hashUnit(x, y, 77) * 4),
    inside: [],
    ops: isFacilityType(type) ? newOps() : undefined,
  };
  registerBuilding(world, b);
  return b;
}

export function createSite(
  world: World,
  type: BuildingType,
  x: number,
  y: number,
  hhId: number,
  creatorId: number,
  opts: { upgradeOf?: number; depositId?: number } = {},
): Site {
  const d = BUILD_DEF[type];
  const required: Items = { ...d.cost };
  const s: Site = {
    ent: 'site',
    id: newId(world),
    type,
    x,
    y,
    w: d.w,
    h: d.h,
    hhId,
    creatorId,
    required,
    delivered: {},
    used: {},
    work: 0,
    workTotal: d.work,
    createdTick: world.tick,
    lastWorkTick: world.tick,
    maxWorkers: d.workers,
    status: 'waiting for materials',
    variant: Math.floor(hashUnit(x, y, 91) * 4),
    contrib: {},
  };
  if (opts.upgradeOf) s.upgradeOf = opts.upgradeOf;
  if (opts.depositId) s.depositId = opts.depositId;
  registerSite(world, s);
  if (opts.upgradeOf) {
    const old = world.byId.get(opts.upgradeOf);
    if (old && old.ent === 'building') old.upgrading = s.id;
  }
  return s;
}

export function homeOf(world: World, hh: Household | undefined): Building | null {
  if (!hh || !hh.homeId) return null;
  const e = world.byId.get(hh.homeId);
  return e && e.ent === 'building' ? e : null;
}

export function householdOf(world: World, p: Person): Household | undefined {
  return world.households.find((h) => h.id === p.hhId);
}

export function makeHousePile(world: World, x: number, y: number, items: Items, note: string, fromHolder = 0): Pile | null {
  if (isEmptyItems(items)) return null;
  let target: Pile | null = null;
  // merge into an existing pile on the tile if present
  for (const pile of world.piles) {
    if (pile.x === x && pile.y === y) {
      for (const k in items) addItem(pile.items, k as keyof Items, items[k as keyof Items] ?? 0);
      target = pile;
      break;
    }
  }
  if (!target) {
    target = { ent: 'pile', id: newId(world), x, y, items: cloneItems(items), since: world.tick, note };
    registerGeneric(world, target);
  }
  // equipment keeps its identity: its records move to the heap along with the counts
  if (fromHolder) for (const k of ['axe', 'pick', 'hoe', 'basket', 'hammer', 'saw', 'jar'] as const) if ((items[k] ?? 0) > 0) retagTools(world, k, items[k] ?? 0, fromHolder, target.id);
  return target;
}

/** Drop items on the nearest free tile near (x, y) so nothing silently disappears. */
export function dropNear(world: World, fx: number, fy: number, items: Items, note: string, fromHolder = 0): void {
  if (isEmptyItems(items)) return;
  const cx = Math.floor(fx);
  const cy = Math.floor(fy);
  for (let r = 0; r < 5; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        if (isWalkable(world, tx, ty)) {
          makeHousePile(world, tx, ty, items, note, fromHolder);
          return;
        }
      }
    }
  }
  makeHousePile(world, cx, cy, items, note, fromHolder);
}

/** Shares of what it took to build, by household (materials count 1 a unit, work 1 per 25 ticks). */
function builderShares(site: Site): Record<number, number> {
  const out: Record<number, number> = {};
  const c = site.contrib ?? {};
  let total = 0;
  for (const k of Object.keys(c)) total += c[Number(k)];
  if (total <= 0) {
    out[site.hhId] = 1;
    return out;
  }
  for (const k of Object.keys(c)) out[Number(k)] = c[Number(k)] / total;
  return out;
}

/**
 * Who a finished workplace belongs to: a household that did at least 60% of the effort holds title; if the effort was shared out
 * more evenly than that the workplace belongs to everyone. Halls and granaries are always common property.
 */
function titleHolder(site: Site, shares: Record<number, number>): number {
  if (site.type === 'hall' || site.type === 'granary') return 0;
  if (!isFacilityType(site.type)) return site.hhId;
  let top = 0;
  let best = 0;
  for (const k of Object.keys(shares)) if (shares[Number(k)] > best) {
    best = shares[Number(k)];
    top = Number(k);
  }
  return best >= 0.6 ? top : 0;
}

/** A finished site becomes a building (or, for an upgrade, the home it stands on is rebuilt in place); the household moves in. */
export function completeSite(world: World, site: Site, builder: Person | null): Building {
  unregisterSite(world, site);
  const hh = world.households.find((h) => h.id === site.hhId);
  const who = builder ? builder.name : 'Someone';
  const label = buildingLabel(site.type);
  if (site.upgradeOf) {
    const old = world.byId.get(site.upgradeOf);
    if (old && old.ent === 'building') {
      const was = buildingLabel(old.type);
      old.type = site.type;
      old.upgrading = undefined;
      old.condition = 100;
      old.store.cap = BUILD_DEF[site.type].cap;
      for (const k in site.delivered) {
        const n = site.delivered[k as keyof Items] ?? 0;
        if (n > 0) addItem(old.store.items, k as keyof Items, n);
      }
      addFx(world, 'built', old.x + old.w / 2, old.y + old.h / 2, old.id);
      addEvent(world, 'build', `${who} finished rebuilding the ${hh ? hh.name + ' household’s ' : ''}${was} as a ${label}.`, builder ? [builder.id] : [], old.x + old.w / 2, old.y + old.h / 2);
      return old;
    }
  }
  const shares = builderShares(site);
  const owner = titleHolder(site, shares);
  const b = createBuilding(world, site.type, site.x, site.y, isFacilityType(site.type) ? owner : site.hhId, { condition: 100, fuel: 0 });
  if (b.ops) {
    b.ops.builders = shares;
    b.ops.depositId = site.depositId ?? 0;
    b.ops.tended = world.tick;
  }
  // leftover delivered materials (should be none) go into the new building's store, never vanish
  for (const k in site.delivered) {
    const n = site.delivered[k as keyof Items] ?? 0;
    if (n > 0 && b.store.cap > 0) addItem(b.store.items, k as keyof Items, n);
    else if (n > 0) makeHousePile(world, b.doorX, b.doorY, { [k]: n } as Items, 'leftover materials');
  }
  if (hh && isHomeType(site.type)) {
    const cur = homeOf(world, hh);
    if (!cur || isSolidHome(site.type)) hh.homeId = b.id;
  }
  addFx(world, 'built', b.x + b.w / 2, b.y + b.h / 2, b.id);
  const ownerText = isFacilityType(site.type) ? (owner ? ` for the ${world.households.find((h) => h.id === owner)?.name ?? ''} household` : ' for everyone') : hh ? ` for the ${hh.name} household` : '';
  addEvent(world, 'build', `${who}${site.type === 'fire' ? ' lit' : ' finished'} a ${label}${ownerText}.`, builder ? [builder.id] : [], b.x + b.w / 2, b.y + b.h / 2);
  return b;
}

export function destroyBuilding(world: World, b: Building, why: string): void {
  unregisterBuilding(world, b);
  const scatter: Items = cloneItems(b.store.items);
  const held = b.ops?.job?.held;
  if (held) for (const k in held) addItem(scatter, k as keyof Items, held[k as keyof Items] ?? 0);
  if (b.ops) b.ops.job = null;
  if (b.store.cap > 0) makeHousePile(world, b.doorX, b.doorY, scatter, 'rubble from the ' + buildingLabel(b.type), b.id);
  const hh = world.households.find((h) => h.homeId === b.id);
  if (hh) hh.homeId = 0;
  if (b.upgrading) {
    const up = world.byId.get(b.upgrading);
    if (up && up.ent === 'site') cancelSite(world, up, 'the building it was to replace collapsed');
  }
  addFx(world, 'collapse', b.x + b.w / 2, b.y + b.h / 2, b.id);
  addEvent(world, 'nature', `A ${buildingLabel(b.type)} ${why}.`, [], b.x + b.w / 2, b.y + b.h / 2);
}

export function cancelSite(world: World, site: Site, why: string): void {
  unregisterSite(world, site);
  if (site.upgradeOf) {
    const old = world.byId.get(site.upgradeOf);
    if (old && old.ent === 'building') old.upgrading = undefined;
  }
  makeHousePile(world, site.x, site.y, site.delivered, 'abandoned building materials');
  addEvent(world, 'build', `The ${buildingLabel(site.type)} site was abandoned (${why}).`, [], site.x, site.y);
}

// ───────── siting ─────────
function footprintFree(world: World, x: number, y: number, w: number, h: number): boolean {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!isFreeLand(world, xx, yy)) return false;
  return true;
}

/**
 * Would the doorway of a building laid out at (x, y) still be reachable on foot once its footprint is filled in: from the
 * settlement (the camp, or the household's home) and from where the planner stands? A new building must never shut anyone
 * in. Breadth-first over walkable tiles; four neighbours are enough, since the pathfinder never cuts a corner.
 */
export function doorStaysConnected(world: World, p: Person, type: BuildingType, x: number, y: number): boolean {
  const d = BUILD_DEF[type];
  const W = world.W;
  const open = (tx: number, ty: number) => isWalkable(world, tx, ty) && !(tx >= x && tx < x + d.w && ty >= y && ty < y + d.h);
  const door = doorFor(type, x, y);
  if (!open(door.x, door.y)) return false;
  const home = homeOf(world, householdOf(world, p));
  const px = Math.floor(p.x);
  const py = Math.floor(p.y);
  let settled = false;
  let planner = false;
  const seen = new Uint8Array(W * world.H);
  const queue = [door.y * W + door.x];
  seen[queue[0]] = 1;
  for (let q = 0; q < queue.length && !(settled && planner); q++) {
    const tx = queue[q] % W;
    const ty = (queue[q] / W) | 0;
    if (Math.hypot(tx + 0.5 - world.camp.x, ty + 0.5 - world.camp.y) <= 3 || (home && Math.abs(tx - home.doorX) <= 1 && Math.abs(ty - home.doorY) <= 1)) settled = true;
    if (Math.abs(tx - px) <= 1 && Math.abs(ty - py) <= 1) planner = true;
    for (const [nx, ny] of [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]]) {
      if (!open(nx, ny) || seen[ny * W + nx]) continue;
      seen[ny * W + nx] = 1;
      queue.push(ny * W + nx);
    }
  }
  return settled && planner;
}

/**
 * Find a spot the person could plausibly lay out a building: land they have seen, free of objects,
 * not hard against water, with a clear doorway tile that stays connected to the settlement.
 */
export function findBuildSpot(
  world: World,
  p: Person,
  type: BuildingType,
  ax: number,
  ay: number,
  rMin: number,
  rMax: number,
  prefer: number,
): { x: number; y: number } | null {
  const d = BUILD_DEF[type];
  const cands: { x: number; y: number; score: number }[] = [];
  const x0 = Math.max(2, Math.floor(ax - rMax));
  const x1 = Math.min(world.W - 4, Math.ceil(ax + rMax));
  const y0 = Math.max(2, Math.floor(ay - rMax));
  const y1 = Math.min(world.H - 4, Math.ceil(ay + rMax));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const cx = x + d.w / 2;
      const cy = y + d.h / 2;
      const dd = dist(cx, cy, ax, ay);
      if (dd < rMin || dd > rMax) continue;
      if (!footprintFree(world, x, y, d.w, d.h)) continue;
      const dx = x;
      const dy = y + d.h;
      if (!isFreeLand(world, dx, dy) && !isWalkable(world, dx, dy)) continue;
      if (p.explored[y * world.W + x] === 0) continue;
      let ok = true;
      let wd = 255;
      for (let yy = y - 1; yy <= y + d.h && ok; yy++) {
        for (let xx = x - 1; xx <= x + d.w && ok; xx++) {
          if (xx < 0 || yy < 0 || xx >= world.W || yy >= world.H) {
            ok = false;
            break;
          }
          const i = yy * world.W + xx;
          const inside = xx >= x && xx < x + d.w && yy >= y && yy < y + d.h;
          if (!inside) {
            const t = world.terrain[i];
            if (t === T.DEEP) ok = false;
            const occ = world.occ[i];
            if (occ) {
              const e = world.byId.get(occ);
              if (e && (e.ent === 'building' || e.ent === 'site')) ok = false; // keep a gap between houses
            }
          }
          wd = Math.min(wd, world.waterDist[i]);
        }
      }
      if (!ok) continue;
      if (wd < 2) continue;
      let score = -Math.abs(dd - prefer) * 1.2 + hashUnit(p.id, x, y) * 2.2;
      const t0 = world.terrain[y * world.W + x];
      if (t0 === T.GRASS) score += 1.2;
      if (t0 === T.FOREST) score -= 1.5;
      if (t0 === T.STONY) score -= 2.5;
      if (wd <= 6) score += 0.8;
      cands.push({ x, y, score });
    }
  }
  // the best-scoring spot whose doorway would not be shut in (equal scores keep the order they were found in)
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands.slice(0, 24)) if (doorStaysConnected(world, p, type, c.x, c.y)) return { x: c.x, y: c.y };
  return null;
}
