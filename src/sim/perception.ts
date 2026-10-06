import { SENSE_RADIUS } from './constants';
import { ACCESS_CELL, delBelief, learn, observe, putBelief, snapshotEntity, waterBeliefId } from './knowledge';
import { stageOf } from './people';
import { probe } from './probe';
import { distToFootprint, gridQuery, isWaterAccess } from './registry';
import type { Animal, Building, ItemKind, Person, SeenEntity, World } from './types';

export function nearLitFire(world: World, x: number, y: number, r: number): Building | null {
  let best: Building | null = null;
  let bd = r;
  for (const b of world.buildings) {
    if (b.type !== 'fire' || b.fuel <= 0) continue;
    const d = Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

/** How far a person can see right now: reduced by darkness and bad weather, extended near firelight. */
export function senseRadius(world: World, p: Person): number {
  let light = world.light;
  if (light < 0.8 && nearLitFire(world, p.x, p.y, 7)) light = Math.max(light, 0.85);
  let r = SENSE_RADIUS * (0.5 + 0.5 * light);
  r *= 1 - 0.14 * world.weather.rain - 0.12 * world.weather.storm;
  if (stageOf(world, p) === 'child') r *= 0.88;
  return r;
}

const CARRY_KEYS: ItemKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'seeds', 'water', 'wood', 'stone', 'clay', 'ore', 'planks', 'handles', 'bricks', 'charcoal', 'iron', 'flour', 'axe', 'pick', 'hoe', 'basket', 'hammer', 'saw', 'jar'];

function describeSeenPerson(world: World, e: Person): SeenEntity {
  const carrying: ItemKind[] = [];
  for (const k of CARRY_KEYS) if ((e.inv[k] ?? 0) > 0) carrying.push(k);
  return {
    id: e.id,
    ent: 'person',
    x: e.x,
    y: e.y,
    hungry: e.needs.hunger < 42,
    thirsty: e.needs.thirst < 40,
    tired: e.needs.energy < 25,
    cold: e.needs.warmth < 35,
    hurt: e.health < 60,
    child: stageOf(world, e) === 'child',
    carrying,
    asleep: e.pose === 'sleep',
    act: e.activity ? e.activity.kind : '',
    busyTalking: e.convId !== 0,
  };
}

function describeSeenAnimal(e: Animal): SeenEntity {
  return {
    id: e.id,
    ent: 'animal',
    x: e.x,
    y: e.y,
    hungry: false,
    thirsty: false,
    tired: false,
    cold: false,
    hurt: false,
    child: false,
    carrying: [],
    asleep: false,
    act: '',
    busyTalking: false,
  };
}

/** Mark the map tiles around a person as explored. */
export function stampExplored(world: World, p: Person, r: number): void {
  const cx = Math.floor(p.x);
  const cy = Math.floor(p.y);
  if (Math.abs(cx - p.stampX) + Math.abs(cy - p.stampY) < 2) return;
  p.stampX = cx;
  p.stampY = cy;
  const R = Math.ceil(r);
  const r2 = r * r;
  const W = world.W;
  for (let dy = -R; dy <= R; dy++) {
    const yy = cy + dy;
    if (yy < 0 || yy >= world.H) continue;
    for (let dx = -R; dx <= R; dx++) {
      const xx = cx + dx;
      if (xx < 0 || xx >= W) continue;
      if (dx * dx + dy * dy <= r2) p.explored[yy * W + xx] = 1;
    }
  }
}

/**
 * world state -> local perception.
 * Only things within the person's sensing radius become observations; everything seen is snapshotted into beliefs.
 */
export function perceive(world: World, p: Person): void {
  const r = senseRadius(world, p);
  p.seen.length = 0;
  let fresh = 0;

  gridQuery(world.grid, p.x, p.y, r + 2.5, (e) => {
    if (distToFootprint(e, p.x, p.y) > r) return;
    if (e.ent === 'source' && e.type === 'tree' && e.amount < 1) return;
    if (probe.on) probe.perceiveStatic++;
    if (observe(world, p, e)) fresh++;
  });

  gridQuery(world.pgrid, p.x, p.y, r + 1, (e) => {
    if (e === p) return;
    if (e.ent === 'person') {
      if (!e.alive) return;
      if (Math.hypot(e.x - p.x, e.y - p.y) > r) return;
      p.seen.push(describeSeenPerson(world, e));
      p.whereabouts[e.id] = { x: e.x, y: e.y, tick: world.tick };
    } else if (e.ent === 'cart') {
      if (Math.hypot(e.x - p.x, e.y - p.y) > r) return;
      if (observe(world, p, e)) fresh++;
    } else if (e.ent === 'animal') {
      if (Math.hypot(e.x - p.x, e.y - p.y) > r) return;
      p.seen.push(describeSeenAnimal(e));
      const b = snapshotEntity(world, e, world.tick);
      if (b) {
        learn(p, b);
        fresh++;
      }
    }
  });

  // coarse water-access cells
  const cw = Math.ceil(world.W / ACCESS_CELL);
  const c0x = Math.max(0, Math.floor((p.x - r) / ACCESS_CELL));
  const c1x = Math.min(cw - 1, Math.floor((p.x + r) / ACCESS_CELL));
  const c0y = Math.max(0, Math.floor((p.y - r) / ACCESS_CELL));
  const c1y = Math.min(Math.ceil(world.H / ACCESS_CELL) - 1, Math.floor((p.y + r) / ACCESS_CELL));
  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      const idx = cy * cw + cx;
      let t = world.accessCell[idx];
      if (t < 0) continue;
      if (world.solid[t]) {
        // something has been built (or has grown) on the remembered shore tile: find the shore tile that is now usable
        t = refreshAccessCell(world, idx);
        if (t < 0) continue;
      }
      const tx = t % world.W;
      const ty = Math.floor(t / world.W);
      if (Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) > r) continue;
      const id = waterBeliefId(idx);
      const old = p.beliefs[id];
      if (!old) fresh++;
      putBelief(p, { id, kind: 'water', x: tx + 0.5, y: ty + 0.5, amount: 0, max: 0, seen: world.tick, src: 'seen', from: 0, learned: old ? old.learned : world.tick });
    }
  }

  stampExplored(world, p, r);
  p.lastPercept = { tick: world.tick, seen: p.seen.length, newBeliefs: fresh };
  if (probe.on) {
    probe.perceives++;
    probe.perceiveMobile += p.seen.length;
    probe.perceiveFresh += fresh;
  }
}

/** Re-pick the usable shore tile of one coarse cell (the old one was built over). Returns its index, or -1 if the cell has no shore left. */
export function refreshAccessCell(world: World, cellIdx: number): number {
  const cw = Math.ceil(world.W / ACCESS_CELL);
  const cx = cellIdx % cw;
  const cy = Math.floor(cellIdx / cw);
  const mx = cx * ACCESS_CELL + ACCESS_CELL / 2;
  const my = cy * ACCESS_CELL + ACCESS_CELL / 2;
  let best = -1;
  let bd = 1e9;
  for (let y = cy * ACCESS_CELL; y < Math.min(world.H, (cy + 1) * ACCESS_CELL); y++) {
    for (let x = cx * ACCESS_CELL; x < Math.min(world.W, (cx + 1) * ACCESS_CELL); x++) {
      if (!isWaterAccess(world, x, y)) continue;
      const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
      if (d < bd) {
        bd = d;
        best = y * world.W + x;
      }
    }
  }
  world.accessCell[cellIdx] = best;
  return best;
}

/**
 * Housekeeping on memory: things that visibly no longer exist are forgotten, and old danger sightings fade.
 * A person only notices a change if they are close enough to see the spot again.
 */
export function refreshBeliefs(world: World, p: Person): void {
  const r = senseRadius(world, p) * 0.92;
  for (const key of Object.keys(p.beliefs)) {
    const id = Number(key);
    const b = p.beliefs[id];
    if (b.kind === 'danger') {
      if (world.tick - b.seen > 1600) delBelief(p, id);
      else if (b.amount > 0 && Math.hypot(b.x - p.x, b.y - p.y) < r && !p.seen.some((s) => s.id === id)) b.amount = 0; // they looked, it is gone
      continue;
    }
    if (b.kind === 'water') continue;
    if (!world.byId.has(id)) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < r) delBelief(p, id);
    }
  }
}
