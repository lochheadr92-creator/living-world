import { DEPOSIT_TYPES, MAP_H, MAP_W, SOURCE_MAX } from './constants';
import { createBuilding } from './buildings';
import { addItem, emptyLedger, snapshotInitial } from './economy';
import { addToHousehold, createHousehold } from './households';
import { ACCESS_CELL, observe, putBelief, waterBeliefId } from './knowledge';
import { createPerson } from './people';
import { relOf } from './relations';
import { makeGrid, gridQuery, isWalkable, isFreeLand, rebuildMobileGrid } from './registry';
import { perceive } from './perception';
import { hashString, hashUnit, RNG } from './rng';
import { makeSource } from './sources';
import { registerStartingTools } from './tools';
import { makeWolf } from './wildlife';
import type { Building, Entity, Household, Person, Settings, Source, SourceType, World } from './types';
import { T } from './types';
import { clamp, dist, smoothstep, TAU } from './util';

// ───────────────────────── noise ─────────────────────────
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hashUnit(xi, yi, seed);
  const b = hashUnit(xi + 1, yi, seed);
  const c = hashUnit(xi, yi + 1, seed);
  const d = hashUnit(xi + 1, yi + 1, seed);
  const u = fade(xf);
  const v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, seed: number, oct = 4): number {
  let amp = 0.5;
  let f = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * f, y * f, seed + i * 131);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

// ───────────────────────── blank world ─────────────────────────
export function defaultSettings(seed = 'meadow'): Settings {
  return { seed, population: 28, harsh: false, immigration: true, scene: 'natural' };
}

export function blankWorld(settings: Settings, W = MAP_W, H = MAP_H): World {
  const accessCW = Math.ceil(W / ACCESS_CELL);
  const accessCH = Math.ceil(H / ACCESS_CELL);
  const w: World = {
    settings: { ...settings },
    seed: settings.seed,
    sceneLabel: '',
    tick: 0,
    rng: new RNG(hashString(settings.seed + '|sim')),
    W,
    H,
    terrain: new Uint8Array(W * H).fill(T.GRASS),
    solid: new Uint8Array(W * H),
    occ: new Int32Array(W * H),
    wear: new Float32Array(W * H),
    accessCell: new Int32Array(accessCW * accessCH).fill(-1),
    waterDist: new Uint8Array(W * H).fill(255),
    stumps: [],
    nextId: 1,
    persons: [],
    deceased: [],
    sources: [],
    buildings: [],
    sites: [],
    plots: [],
    piles: [],
    graves: [],
    animals: [],
    tools: [],
    carts: [],
    meals: [],
    households: [],
    requests: [],
    conversations: [],
    reservations: new Map(),
    events: [],
    fx: [],
    delayed: [],
    weather: { kind: 'clear', rain: 0, cloud: 0.08, storm: 0, nextChange: 1500, temp: 16, wind: 0.22 },
    light: 1,
    ledger: emptyLedger(),
    camp: { x: W / 2, y: H / 2 },
    byId: new Map(),
    grid: makeGrid(W, H),
    pgrid: makeGrid(W, H),
    usedNames: new Set(),
    stats: {},
  };
  return w;
}

// ───────────────────────── derived terrain data ─────────────────────────
export function computeWaterDist(world: World): void {
  const { W, H } = world;
  const dist8 = world.waterDist;
  dist8.fill(255);
  const queue: number[] = [];
  for (let i = 0; i < W * H; i++) {
    const t = world.terrain[i];
    if (t === T.DEEP || t === T.SHALLOW) {
      dist8[i] = 0;
      queue.push(i);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const x = i % W;
    const y = (i / W) | 0;
    const d = dist8[i];
    if (d >= 12) continue;
    const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
    for (const n of nb) {
      if (n >= 0 && dist8[n] > d + 1) {
        dist8[n] = d + 1;
        queue.push(n);
      }
    }
  }
}

export function computeAccessCells(world: World): void {
  const { W, H } = world;
  const cw = Math.ceil(W / ACCESS_CELL);
  world.accessCell.fill(-1);
  for (let cy = 0; cy < Math.ceil(H / ACCESS_CELL); cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let best = -1;
      let bd = 1e9;
      const mx = cx * ACCESS_CELL + ACCESS_CELL / 2;
      const my = cy * ACCESS_CELL + ACCESS_CELL / 2;
      for (let y = cy * ACCESS_CELL; y < Math.min(H, (cy + 1) * ACCESS_CELL); y++) {
        for (let x = cx * ACCESS_CELL; x < Math.min(W, (cx + 1) * ACCESS_CELL); x++) {
          if (isWaterAccessTile(world, x, y)) {
            const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
            if (d < bd) {
              bd = d;
              best = y * W + x;
            }
          }
        }
      }
      world.accessCell[cy * cw + cx] = best;
    }
  }
}

function isWaterAccessTile(world: World, x: number, y: number): boolean {
  const i = y * world.W + x;
  if (world.terrain[i] === T.DEEP || world.solid[i]) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= world.W || yy >= world.H) continue;
      const t = world.terrain[yy * world.W + xx];
      if (t === T.DEEP || t === T.SHALLOW) return true;
    }
  }
  return false;
}

function floodReach(world: World, sx: number, sy: number, useSolid: boolean): Uint8Array {
  const { W, H } = world;
  const seen = new Uint8Array(W * H);
  const q: number[] = [];
  const start = Math.floor(sy) * W + Math.floor(sx);
  seen[start] = 1;
  q.push(start);
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % W;
    const y = (i / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
      const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (seen[ni]) continue;
      if (world.terrain[ni] === T.DEEP) continue;
      if (useSolid && world.solid[ni]) continue;
      seen[ni] = 1;
      q.push(ni);
    }
  }
  return seen;
}

// ───────────────────────── natural world ─────────────────────────
interface Water {
  cx: number;
  cy: number;
  R: number;
  stretch: number;
  ax: number;
  seed: number;
  amp: number;
}

function waterValue(wt: Water, x: number, y: number): number {
  const dx = x + 0.5 - wt.cx;
  const dy = y + 0.5 - wt.cy;
  const c = Math.cos(wt.ax);
  const s = Math.sin(wt.ax);
  const u = dx * c + dy * s;
  const v = -dx * s + dy * c;
  const d = Math.hypot(u / wt.stretch, v * wt.stretch);
  return d / wt.R + (fbm(x / 6.5, y / 6.5, wt.seed) - 0.5) * wt.amp;
}

function pickSpot(
  world: World,
  gen: RNG,
  cx: number,
  cy: number,
  rmin: number,
  rmax: number,
  pred: (x: number, y: number) => boolean,
  tries = 260,
): { x: number; y: number } | null {
  for (let i = 0; i < tries; i++) {
    const a = gen.next() * TAU;
    const r = rmin + gen.next() * (rmax - rmin);
    const x = Math.floor(cx + Math.cos(a) * r);
    const y = Math.floor(cy + Math.sin(a) * r);
    if (x < 3 || y < 3 || x >= world.W - 3 || y >= world.H - 3) continue;
    if (pred(x, y)) return { x, y };
  }
  return null;
}

export function generateNatural(settings: Settings): World {
  const world = blankWorld(settings);
  const { W, H } = world;
  const gen = new RNG(hashString(settings.seed + '|gen'));
  const S = hashString(settings.seed + '|noise') & 0xfffff;
  const harsh = settings.harsh;

  // camp somewhere around the middle
  const campX = Math.floor(W / 2 + gen.range(-5, 5));
  const campY = Math.floor(H / 2 + gen.range(-5, 5));
  world.camp = { x: campX + 0.5, y: campY + 0.5 };

  // lake beside the camp, ponds elsewhere
  const lakeR = gen.range(10.5, 13);
  const lakeAng = gen.next() * TAU;
  let lcx = campX + Math.cos(lakeAng) * (lakeR + 8.5);
  let lcy = campY + Math.sin(lakeAng) * (lakeR + 8.5);
  lcx = clamp(lcx, lakeR + 4, W - lakeR - 4);
  lcy = clamp(lcy, lakeR + 4, H - lakeR - 4);
  const waters: Water[] = [{ cx: lcx, cy: lcy, R: lakeR, stretch: gen.range(0.82, 1.3), ax: gen.next() * Math.PI, seed: S + 1, amp: 0.62 }];
  for (let i = 0; i < 2; i++) {
    const sp = pickSpot(world, gen, campX, campY, 22, 40, (x, y) => dist(x, y, lcx, lcy) > lakeR + 12 && x > 8 && y > 8 && x < W - 8 && y < H - 8);
    if (sp) waters.push({ cx: sp.x, cy: sp.y, R: gen.range(3.4, 5.4), stretch: gen.range(0.85, 1.25), ax: gen.next() * Math.PI, seed: S + 5 + i, amp: 0.5 });
  }

  // water pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let w = 9;
      if (dist(x + 0.5, y + 0.5, campX + 0.5, campY + 0.5) >= 8.5) for (const wt of waters) w = Math.min(w, waterValue(wt, x, y));
      const i = y * W + x;
      if (w < 0.72) world.terrain[i] = T.DEEP;
      else if (w < 0.98) world.terrain[i] = T.SHALLOW;
    }
  }
  computeWaterDist(world);

  // land pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (world.terrain[i] === T.DEEP || world.terrain[i] === T.SHALLOW) continue;
      const dw = world.waterDist[i];
      const dC = dist(x + 0.5, y + 0.5, world.camp.x, world.camp.y);
      const nz = fbm(x / 5.5, y / 5.5, S + 9);
      let t: number = T.GRASS;
      if (dw <= 1 || (dw === 2 && nz > 0.52) || (dw === 3 && nz > 0.78)) t = T.SAND;
      else {
        const ff = fbm(x / 11, y / 11, S + 2) + clamp((dC - 10) / 45, 0, 0.22);
        if (ff > 0.56) t = T.FOREST;
        const rf = fbm(x / 8, y / 8, S + 3);
        if (rf > 0.665 && dC > 14 && dw > 2) t = T.STONY;
      }
      world.terrain[i] = t;
    }
  }

  const terrainReach = floodReach(world, campX, campY, false);
  const okLand = (x: number, y: number, allowForest = true): boolean => {
    const i = y * W + x;
    const t = world.terrain[i];
    if (!(t === T.GRASS || (allowForest && t === T.FOREST))) return false;
    return world.occ[i] === 0 && world.solid[i] === 0 && world.waterDist[i] >= 2 && terrainReach[i] === 1;
  };

  // ── trees ──
  const treeCountNear = (x: number, y: number) => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && world.occ[(y + dy) * W + (x + dx)]) n++;
    return n;
  };
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const i = y * W + x;
      const t = world.terrain[i];
      if (t !== T.GRASS && t !== T.FOREST) continue;
      if (world.waterDist[i] < 3 || terrainReach[i] !== 1) continue;
      const dC = dist(x + 0.5, y + 0.5, world.camp.x, world.camp.y);
      if (dC < 8.5) continue;
      const ff = fbm(x / 11, y / 11, S + 2) + clamp((dC - 10) / 45, 0, 0.22);
      const p = t === T.FOREST ? 0.06 + 0.3 * smoothstep(0.56, 0.84, ff) : 0.01;
      if (gen.next() < p && treeCountNear(x, y) <= 2) {
        const growth = gen.chance(0.12) ? gen.range(0.25, 0.7) : 1;
        const maxW = SOURCE_MAX.tree;
        makeSource(world, 'tree', x, y, Math.floor(maxW * growth + 1e-6) > 0 ? Math.max(1, Math.round(gen.range(3, maxW + 0.4) * growth)) : 0, growth);
      }
    }
  }

  // ── resource clusters ──
  const mk = (type: SourceType, x: number, y: number, amount?: number) => makeSource(world, type, x, y, amount);
  const scale = harsh ? 0.65 : 1;
  const cluster = (type: SourceType, rmin: number, rmax: number, count: number, spread: number, allowForest = true) => {
    const c = pickSpot(world, gen, campX, campY, rmin, rmax, (x, y) => okLand(x, y, allowForest));
    if (!c) return;
    let placed = 0;
    for (let k = 0; k < 40 && placed < count; k++) {
      const x = c.x + Math.round(gen.range(-spread, spread));
      const y = c.y + Math.round(gen.range(-spread, spread));
      if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || !okLand(x, y, allowForest)) continue;
      const maxv = SOURCE_MAX[type];
      mk(type, x, y, Math.max(1, Math.round(gen.range(maxv * 0.35, maxv))));
      placed++;
    }
  };
  const nearB = harsh ? 2 : 3;
  for (let i = 0; i < nearB; i++) cluster('berry_bush', 7.5, 13.5, gen.int(3) + 3, 2.2);
  for (let i = 0; i < Math.round(3 * scale); i++) cluster('berry_bush', 16, 27, gen.int(3) + 3, 2.4);
  for (let i = 0; i < Math.round(4 * scale); i++) cluster('berry_bush', 28, 46, gen.int(3) + 3, 2.4);
  cluster('fruit_tree', 14, 20, 3, 2.6);
  for (let i = 0; i < Math.round(2 * scale); i++) cluster('fruit_tree', 22, 32, gen.int(2) + 3, 2.8);
  for (let i = 0; i < Math.round(3 * scale); i++) cluster('fruit_tree', 33, 50, gen.int(3) + 2, 2.8);
  cluster('wild_grain', 10, 17, 5, 1.8, false);
  for (let i = 0; i < Math.round(2 * scale); i++) cluster('wild_grain', 19, 31, gen.int(3) + 3, 2, false);
  for (let i = 0; i < Math.round(2 * scale); i++) cluster('wild_grain', 33, 48, gen.int(3) + 3, 2, false);

  // rock outcrops: ensure a small near cluster by carving stony ground if the noise left none
  const rockSpot = (rmin: number, rmax: number, count: number) => {
    const c = pickSpot(world, gen, campX, campY, rmin, rmax, (x, y) => okLand(x, y, true));
    if (!c) return;
    let placed = 0;
    for (let k = 0; k < 60 && placed < count; k++) {
      const x = c.x + Math.round(gen.range(-2.6, 2.6));
      const y = c.y + Math.round(gen.range(-2.6, 2.6));
      if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || !okLand(x, y, true)) continue;
      mk('rock', x, y, Math.max(2, Math.round(gen.range(4, SOURCE_MAX.rock))));
      placed++;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const j = (y + dy) * W + (x + dx);
          if ((world.terrain[j] === T.GRASS || world.terrain[j] === T.FOREST) && world.waterDist[j] > 2) world.terrain[j] = T.STONY;
        }
    }
  };
  rockSpot(14, 21, 4);
  for (let i = 0; i < Math.round(3 * scale); i++) rockSpot(24, 46, 5);
  // rocks on naturally stony ground
  for (let y = 3; y < H - 3; y++) {
    for (let x = 3; x < W - 3; x++) {
      const i = y * W + x;
      if (world.terrain[i] === T.STONY && world.occ[i] === 0 && gen.next() < 0.1 && terrainReach[i] === 1) {
        mk('rock', x, y, Math.max(2, Math.round(gen.range(4, SOURCE_MAX.rock))));
      }
    }
  }

  // fish spots
  const fishCand: number[] = [];
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const i = y * W + x;
      if (world.terrain[i] !== T.SHALLOW) continue;
      let land = false;
      let deep = false;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const t = world.terrain[(y + dy) * W + (x + dx)];
          if (t === T.SAND || t === T.GRASS || t === T.FOREST) land = true;
          if (t === T.DEEP) deep = true;
        }
      if (land && deep && terrainReach[i] === 1) fishCand.push(i);
    }
  }
  gen.shuffle(fishCand);
  const fishSpots: { x: number; y: number }[] = [];
  const wantFish = Math.round(11 * scale);
  fishCand.sort((a, b) => {
    const da = dist(a % W, (a / W) | 0, campX, campY);
    const db = dist(b % W, (b / W) | 0, campX, campY);
    return da - db + (hashUnit(a, 3) - hashUnit(b, 3)) * 14; // mostly near the camp but with scatter
  });
  for (const i of fishCand) {
    if (fishSpots.length >= wantFish) break;
    const x = i % W;
    const y = (i / W) | 0;
    if (fishSpots.some((f) => dist(f.x, f.y, x, y) < 4.2)) continue;
    fishSpots.push({ x, y });
    mk('fish_spot', x, y, Math.max(2, Math.round(gen.range(4, SOURCE_MAX.fish_spot))));
  }

  // ── camp: fire and first shelters ──
  createBuilding(world, 'fire', campX, campY, 0, { fuel: 1500 });

  // ── households and people ──
  populate(world, gen, settings.population, campX, campY);

  // ── wolves ──
  const dens: { x: number; y: number }[] = [];
  const wolfCount = harsh ? 5 : 3;
  for (let i = 0; i < wolfCount; i++) {
    const denOk = (x: number, y: number): boolean =>
      world.terrain[y * W + x] === T.FOREST && world.solid[y * W + x] === 0 && terrainReach[y * W + x] === 1 && dens.every((d) => dist(d.x, d.y, x, y) > 14) && openNeighbours(world, x, y) >= 6;
    // a den beside the only pond would keep people from ever drinking: prefer ground well away from water
    const sp = pickSpot(world, gen, campX, campY, 23, 44, (x, y) => denOk(x, y) && world.waterDist[y * W + x] >= 10) ?? pickSpot(world, gen, campX, campY, 23, 44, denOk);
    if (sp) {
      dens.push(sp);
      makeWolf(world, sp.x + 0.5, sp.y + 0.5);
    }
  }

  // ── deposits: clay by the water, ore and big outcrops in the rocky country ──
  // (drawn from their own random stream, after everything else, so the rest of the world is laid out exactly as it always was)
  placeDeposits(world, new RNG(hashString(settings.seed + '|deposits')), campX, campY, terrainReach);

  // the forest may recover from felling, but not grow without bound
  world.stats.treeCap = Math.round((world.stats.trees ?? 0) * 1.08);

  // drop resources that ended up unreachable
  finalizeReachability(world, campX, campY);
  computeAccessCells(world);
  seedKnowledge(world, gen);
  lookAround(world);
  snapshotInitial(world);
  return world;
}

/**
 * Finite deposits that make the later chains possible. They are not near the camp (nobody starts out knowing them):
 * clay lies along the shores, ore under stony ground a long walk out, and large cuttable outcrops between.
 */
function placeDeposits(world: World, dg: RNG, campX: number, campY: number, reach: Uint8Array): void {
  const { W, H } = world;
  const free = (x: number, y: number): boolean => x >= 4 && y >= 4 && x < W - 4 && y < H - 4 && world.occ[y * W + x] === 0 && world.solid[y * W + x] === 0 && reach[y * W + x] === 1;
  const placed: { x: number; y: number }[] = [];
  const apart = (x: number, y: number, d: number): boolean => placed.every((q) => dist(q.x, q.y, x, y) >= d);
  const stonyNear = (x: number, y: number, r: number): boolean => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (world.terrain[(y + dy) * W + (x + dx)] === T.STONY) return true;
    return false;
  };
  const pickFrom = (cands: number[], n: number, spacing: number, type: SourceType, lo: number, hi: number): void => {
    dg.shuffle(cands);
    cands.sort((a, b) => (dist(a % W, (a / W) | 0, campX, campY) + hashUnit(a, 9) * 10) - (dist(b % W, (b / W) | 0, campX, campY) + hashUnit(b, 9) * 10));
    let k = 0;
    for (const i of cands) {
      if (k >= n) break;
      const x = i % W;
      const y = (i / W) | 0;
      if (!free(x, y) || !apart(x, y, spacing)) continue;
      makeSource(world, type, x, y, Math.max(2, Math.round(dg.range(lo, hi))));
      placed.push({ x, y });
      k++;
      if (type === 'outcrop' || type === 'ore_vein') {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const j = (y + dy) * W + (x + dx);
            if ((world.terrain[j] === T.GRASS || world.terrain[j] === T.FOREST) && world.waterDist[j] > 2) world.terrain[j] = T.STONY;
          }
      }
    }
  };
  const clay: number[] = [];
  const ore: number[] = [];
  const outcrop: number[] = [];
  for (let y = 4; y < H - 4; y++) {
    for (let x = 4; x < W - 4; x++) {
      const i = y * W + x;
      const t = world.terrain[i];
      const d = dist(x + 0.5, y + 0.5, campX + 0.5, campY + 0.5);
      if ((t === T.SAND || t === T.GRASS) && world.waterDist[i] >= 1 && world.waterDist[i] <= 3 && d >= 11 && d <= 36) clay.push(i);
      if ((t === T.STONY || t === T.FOREST || t === T.GRASS) && world.waterDist[i] >= 3 && stonyNear(x, y, 2) && d >= 24 && d <= 46) ore.push(i);
      if ((t === T.STONY || t === T.GRASS) && world.waterDist[i] >= 3 && stonyNear(x, y, 1) && d >= 17 && d <= 36) outcrop.push(i);
    }
  }
  pickFrom(clay, 3, 9, 'clay_pit', 24, SOURCE_MAX.clay_pit);
  pickFrom(outcrop, 2, 10, 'outcrop', 40, SOURCE_MAX.outcrop);
  pickFrom(ore, 2, 12, 'ore_vein', 14, SOURCE_MAX.ore_vein);
}

/** Everyone takes a first look at their surroundings before the first decision is made. */
export function lookAround(world: World): void {
  rebuildMobileGrid(world);
  for (const p of world.persons) perceive(world, p);
}

function openNeighbours(world: World, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isWalkable(world, x + dx, y + dy)) n++;
  return n;
}

function finalizeReachability(world: World, campX: number, campY: number): void {
  const reach = floodReach(world, campX, campY, true);
  const W = world.W;
  const isReachableNear = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < world.H && reach[yy * W + xx] && world.solid[yy * W + xx] === 0) return true;
    }
    return false;
  };
  const doomed: Source[] = [];
  for (const s of world.sources) {
    if (s.type === 'tree') continue;
    if (!isReachableNear(s.x, s.y)) doomed.push(s);
  }
  for (const s of doomed) {
    const i = world.sources.indexOf(s);
    world.sources.splice(i, 1);
    world.byId.delete(s.id);
    const arr = world.grid.cells.find((c) => c.includes(s));
    if (arr) arr.splice(arr.indexOf(s), 1);
    world.occ[s.y * W + s.x] = 0;
    world.solid[s.y * W + s.x] = 0;
  }
}

// ───────────────────────── people ─────────────────────────
interface Member {
  age: number;
  sex: 'f' | 'm';
  role: 'adult' | 'kid' | 'elder' | 'youth';
}

function buildHouseholdSpecs(gen: RNG, population: number): Member[][] {
  const specs: Member[][] = [];
  let remaining = population;
  const sx = (): 'f' | 'm' => (gen.chance(0.5) ? 'f' : 'm');
  let kids = 0;
  let elders = 0;
  while (remaining > 0) {
    const roll = gen.next();
    let m: Member[] = [];
    if (roll < 0.34 && remaining >= 3) {
      m = [
        { age: gen.range(22, 44), sex: 'f', role: 'adult' },
        { age: gen.range(22, 46), sex: 'm', role: 'adult' },
      ];
      const nk = remaining >= 4 && gen.chance(0.55) ? 2 : 1;
      for (let i = 0; i < nk; i++) m.push({ age: gen.range(1.5, 11), sex: sx(), role: 'kid' });
      kids += nk;
    } else if (roll < 0.5 && remaining >= 2) {
      const s1 = sx();
      m = [
        { age: gen.range(18, 50), sex: s1, role: 'adult' },
        { age: gen.range(18, 50), sex: gen.chance(0.88) ? (s1 === 'f' ? 'm' : 'f') : s1, role: 'adult' },
      ];
    } else if (roll < 0.62 && remaining >= 2) {
      m = [{ age: gen.range(26, 44), sex: sx(), role: 'adult' }, { age: gen.range(2, 10), sex: sx(), role: 'kid' }];
      kids++;
    } else if (roll < 0.7 && remaining >= 2 && elders < 3) {
      m = [{ age: gen.range(66, 76), sex: sx(), role: 'elder' }, { age: gen.range(30, 44), sex: sx(), role: 'adult' }];
      elders++;
    } else if (roll < 0.78 && remaining >= 3) {
      const s1 = sx();
      m = [
        { age: gen.range(17, 30), sex: s1, role: 'adult' },
        { age: gen.range(17, 30), sex: gen.chance(0.85) ? (s1 === 'f' ? 'm' : 'f') : s1, role: 'adult' },
        { age: gen.range(13, 16), sex: sx(), role: 'youth' },
      ];
    } else {
      m = [{ age: gen.range(17, 55), sex: sx(), role: 'adult' }];
    }
    if (m.length > remaining) m = m.slice(0, remaining);
    specs.push(m);
    remaining -= m.length;
  }
  // make sure the band has some children and elders to show caregiving and life stages
  if (kids < 3) {
    for (const s of specs) {
      if (s.length === 1 && s[0].role === 'adult' && s[0].age > 24 && kids < 3) {
        s.push({ age: gen.range(2, 9), sex: sx(), role: 'kid' });
        kids++;
      }
    }
  }
  if (elders < 2) {
    for (const s of specs) {
      if (s.length === 1 && elders < 2) {
        s[0] = { age: gen.range(66, 75), sex: s[0].sex, role: 'elder' };
        elders++;
      }
    }
  }
  return specs;
}

function populate(world: World, gen: RNG, population: number, campX: number, campY: number): void {
  const specs = buildHouseholdSpecs(gen, population);
  // trim if oversized after the fix-ups
  let total = specs.reduce((s, m) => s + m.length, 0);
  while (total > population) {
    const last = specs[specs.length - 1];
    last.pop();
    if (!last.length) specs.pop();
    total--;
  }
  const shelterCount = Math.max(1, Math.round(specs.length * 0.6));
  const used = new Set<number>();
  const households: Household[] = [];
  const homes: { x: number; y: number }[] = [];

  // lean-to ring around the camp
  for (let h = 0; h < shelterCount; h++) {
    const ang0 = (h / shelterCount) * TAU + gen.range(-0.2, 0.2);
    let placed = false;
    for (let ring = 0; ring < 6 && !placed; ring++) {
      for (let a = 0; a < 16 && !placed; a++) {
        const ang = ang0 + (a % 2 ? 1 : -1) * Math.floor((a + 1) / 2) * 0.22;
        const r = 5.2 + ring * 0.9;
        const x = Math.floor(campX + 0.5 + Math.cos(ang) * r);
        const y = Math.floor(campY + 0.5 + Math.sin(ang) * r);
        if (!isFreeLand(world, x, y) || world.waterDist[y * world.W + x] < 3) continue;
        if (!isFreeLand(world, x, y + 1)) continue;
        if (homes.some((hm) => dist(hm.x, hm.y, x, y) < 3.4)) continue;
        homes.push({ x, y });
        placed = true;
      }
    }
    if (!placed) homes.push({ x: -1, y: -1 });
  }

  specs.forEach((members, hIdx) => {
    const hh = createHousehold(world, gen);
    households.push(hh);
    const home = hIdx < shelterCount && homes[hIdx].x >= 0 ? homes[hIdx] : null;
    let lean: Building | null = null;
    if (home) {
      lean = createBuilding(world, 'lean_to', home.x, home.y, hh.id, { condition: 70 + gen.range(0, 30) });
      hh.homeId = lean.id;
    }
    const ax = lean ? lean.doorX + 0.5 : campX + 0.5 + gen.range(-4, 4);
    const ay = lean ? lean.doorY + 0.5 : campY + 0.5 + gen.range(3, 7);
    const persons: Person[] = [];
    members.forEach((m, mi) => {
      let x = ax + gen.range(-1.4, 1.4);
      let y = ay + gen.range(-1.0, 1.4) + (mi > 0 ? 0.3 : 0);
      for (let tries = 0; tries < 12 && !isWalkable(world, Math.floor(x), Math.floor(y)); tries++) {
        x = ax + gen.range(-2.2, 2.2);
        y = ay + gen.range(-2.2, 2.2);
      }
      const p = createPerson(world, gen, { age: m.age, sex: m.sex, hhId: hh.id, x, y });
      if (m.role === 'elder') p.health = 82;
      addToHousehold(world, p, hh);
      world.persons.push(p);
      world.byId.set(p.id, p);
      persons.push(p);
      used.add(p.id);
    });
    // kinship: adults who live together as couples, kids belong to adults
    const kids = persons.filter((_, i) => members[i].role === 'kid' || members[i].role === 'youth');
    const elders = persons.filter((_, i) => members[i].role === 'elder');
    const workers = persons.filter((_, i) => members[i].role === 'adult');
    if (workers.length >= 2 && elders.length === 0) {
      const [a, b] = workers;
      a.partnerId = b.id;
      b.partnerId = a.id;
      link(a, b, 'partner', 'partner');
    }
    const parents = workers.length >= 2 && elders.length === 0 ? [workers[0], workers[1]] : workers.length ? [workers[0]] : [];
    for (const k of kids) {
      for (const par of parents) {
        k.parents.push(par.id);
        par.children.push(k.id);
        link(par, k, 'child', 'parent');
      }
    }
    for (const e of elders) {
      for (const w of workers) {
        e.children.push(w.id);
        w.parents.push(e.id);
        link(e, w, 'child', 'parent');
      }
    }
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) link(kids[i], kids[j], 'sibling', 'sibling');
    // initial belongings
    const size = persons.length;
    const store = lean ? lean.store.items : null;
    for (const p of persons) {
      if (members[persons.indexOf(p)].role === 'kid') continue;
      const foods = ['berries', 'fruit', 'grain'] as const;
      addItem(p.inv, foods[gen.int(3)], 1 + gen.int(3));
      if (gen.chance(0.5)) addItem(p.inv, 'water', 1);
    }
    if (store) {
      addItem(store, 'berries', world.settings.harsh ? 1 : 2 + size);
      addItem(store, 'fruit', world.settings.harsh ? 0 : 1 + Math.floor(size / 2));
      if (gen.chance(0.6)) addItem(store, 'wood', 2);
    }
    hh.headId = (workers[0] ?? persons[0]).id;
  });

  // tools and seeds are unevenly distributed: some households own them, others do not
  const heads = households.map((h) => world.byId.get(h.headId) as Person);
  const pickHead = () => heads[gen.int(heads.length)];
  addItem(pickHead().inv, 'axe', 1);
  addItem(pickHead().inv, 'axe', 1);
  addItem(pickHead().inv, 'hoe', 1);
  addItem(pickHead().inv, 'basket', 1);
  addItem(pickHead().inv, 'basket', 1);
  addItem(pickHead().inv, 'pick', 1);
  for (let i = 0; i < 4; i++) addItem(pickHead().inv, 'seeds', 2 + gen.int(2));
  // dedupe-cap tools to one per person
  for (const p of world.persons) for (const t of ['axe', 'pick', 'hoe', 'basket'] as const) if ((p.inv[t] ?? 0) > 1) p.inv[t] = 1;
  registerStartingTools(world);

  // acquaintance among band members
  const ps = world.persons;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      if (a.relations[b.id]) continue;
      const aff = clamp(gen.gauss() * 15 + 8, -26, 46);
      const fam = 2 + gen.int(7);
      const ra = relOf(a, b.id);
      const rb = relOf(b, a.id);
      ra.affinity = aff + gen.range(-3, 3);
      rb.affinity = aff + gen.range(-3, 3);
      ra.trust = clamp(16 + aff * 0.5 + gen.range(-6, 10), 2, 60);
      rb.trust = clamp(16 + aff * 0.5 + gen.range(-6, 10), 2, 60);
      ra.familiarity = fam;
      rb.familiarity = fam;
      ra.lastMet = -300 - gen.int(1500);
      rb.lastMet = ra.lastMet;
    }
  }
}

function link(a: Person, b: Person, aToB: 'partner' | 'child' | 'parent' | 'sibling', bToA: 'partner' | 'child' | 'parent' | 'sibling'): void {
  const strong = aToB === 'partner' || aToB === 'parent' || aToB === 'child' ? 82 : 62;
  const ra = relOf(a, b.id);
  const rb = relOf(b, a.id);
  ra.kin = aToB;
  rb.kin = bToA;
  ra.affinity = strong;
  rb.affinity = strong;
  ra.trust = 78;
  rb.trust = 78;
  ra.familiarity = 40;
  rb.familiarity = 40;
}

// ───────────────────────── starting knowledge ─────────────────────────
function seedKnowledge(world: World, gen: RNG): void {
  const camp = world.camp;
  const R = 13.5;
  const near: Entity[] = [];
  gridQuery(world.grid, camp.x, camp.y, R + 3, (e) => {
    const cx = e.ent === 'building' || e.ent === 'site' ? e.x + e.w / 2 : (e as { x: number }).x + 0.5;
    const cy = e.ent === 'building' || e.ent === 'site' ? e.y + e.h / 2 : (e as { y: number }).y + 0.5;
    if (dist(cx, cy, camp.x, camp.y) <= R) near.push(e);
  });
  const far = world.sources.filter((s) => s.type !== 'tree' && !DEPOSIT_TYPES.includes(s.type) && dist(s.x, s.y, camp.x, camp.y) > R + 1);
  const cw = Math.ceil(world.W / ACCESS_CELL);
  const W = world.W;
  for (const p of world.persons) {
    for (const e of near) {
      observe(world, p, e);
      const b = p.beliefs[e.id];
      if (b) b.seen = -Math.floor(gen.range(40, 500));
    }
    // trees near camp matter for wood
    for (const s of world.sources) {
      if (s.type === 'tree' && s.amount >= 1 && dist(s.x, s.y, camp.x, camp.y) <= R + 4) {
        observe(world, p, s);
        const b = p.beliefs[s.id];
        if (b) b.seen = -Math.floor(gen.range(40, 500));
      }
    }
    // water cells near camp
    for (let cy = 0; cy < Math.ceil(world.H / ACCESS_CELL); cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const t = world.accessCell[cy * cw + cx];
        if (t < 0) continue;
        const tx = t % W;
        const ty = (t / W) | 0;
        if (dist(tx + 0.5, ty + 0.5, camp.x, camp.y) <= R + 6) {
          const id = waterBeliefId(cy * cw + cx);
          putBelief(p, { id, kind: 'water', x: tx + 0.5, y: ty + 0.5, amount: 0, max: 0, seen: -50, src: 'seen', from: 0, learned: -50 });
        }
      }
    }
    // each traveller noticed a few distant places on the way here (more for the curious)
    const nFar = Math.round(1 + 4 * p.traits.curiosity);
    for (let k = 0; k < nFar && far.length; k++) {
      const s = far[gen.int(far.length)];
      observe(world, p, s);
      const b = p.beliefs[s.id];
      if (b) b.seen = -Math.floor(gen.range(900, 4200));
      // they remember that stretch of land
      const R2 = 5;
      for (let dy = -R2; dy <= R2; dy++)
        for (let dx = -R2; dx <= R2; dx++) {
          const xx = s.x + dx;
          const yy = s.y + dy;
          if (xx >= 0 && yy >= 0 && xx < world.W && yy < world.H && dx * dx + dy * dy <= R2 * R2) p.explored[yy * W + xx] = 1;
        }
    }
    // explored mask around the camp
    const Rx = Math.ceil(R + 2);
    for (let dy = -Rx; dy <= Rx; dy++)
      for (let dx = -Rx; dx <= Rx; dx++) {
        const xx = Math.floor(camp.x) + dx;
        const yy = Math.floor(camp.y) + dy;
        if (xx >= 0 && yy >= 0 && xx < world.W && yy < world.H && dx * dx + dy * dy <= (R + 2) * (R + 2)) p.explored[yy * W + xx] = 1;
      }
  }
}

