import { MinHeap } from './util';
import { T } from './types';
import type { World } from './types';

const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];

let G = new Float32Array(0);
let From = new Int32Array(0);
let Seen = new Uint32Array(0);
let Closed = new Uint32Array(0);
let gen = 0;
const heap = new MinHeap();

function ensure(n: number): void {
  if (G.length !== n) {
    G = new Float32Array(n);
    From = new Int32Array(n);
    Seen = new Uint32Array(n);
    Closed = new Uint32Array(n);
    gen = 0;
  }
}

/** set while a path is planned for someone pulling a cart: forest, stony ground and water are barred to wheels */
let cartMode = false;

/** movement cost multiplier of a tile, or 0 if impassable */
export function tileCost(world: World, i: number): number {
  const t = world.terrain[i];
  if (t === T.DEEP || world.solid[i]) return 0;
  if (cartMode && (t === T.FOREST || t === T.STONY || t === T.SHALLOW)) return 0;
  let c = 1;
  if (t === T.SHALLOW) c = 1.8;
  else if (t === T.FOREST) c = 1.12;
  const w = world.wear[i];
  if (w > 0) c *= 1 - 0.3 * Math.min(1, w);
  return c;
}

/** Speed multiplier for standing on the tile at (x, y). */
export function terrainSpeed(world: World, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= world.W || ty >= world.H) return 1;
  const i = ty * world.W + tx;
  const t = world.terrain[i];
  let s = 1;
  if (t === T.SHALLOW) s = 0.6;
  else if (t === T.FOREST) s = 0.92;
  s *= 1 + 0.22 * Math.min(1, world.wear[i]);
  return s;
}

function lineClear(world: World, x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return true;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.ceil(len / 0.25);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    for (let o = -1; o <= 1; o++) {
      const px = cx + nx * o * 0.22;
      const py = cy + ny * o * 0.22;
      const tx = Math.floor(px);
      const ty = Math.floor(py);
      if (tx < 0 || ty < 0 || tx >= world.W || ty >= world.H) return false;
      const c = tileCost(world, ty * world.W + tx);
      if (c === 0 || c > 1.16) return false;
    }
  }
  return true;
}

export interface PathOpts {
  maxNodes?: number;
  /** accept any tile for which this returns true as the goal */
  goalFn?: (tx: number, ty: number) => boolean;
  /** make the final waypoint exactly here */
  exact?: { x: number; y: number };
  /** the walker is pulling a handcart */
  cart?: boolean;
}

/**
 * A* over the tile grid (8-neighbour, no corner cutting). Returns flat waypoints [x0,y0,x1,y1,...] in world coords
 * (tile centres), string-pulled where the straight line is clear. Empty array = already there. null = unreachable.
 */
export function findPath(world: World, sx: number, sy: number, gx: number, gy: number, opts: PathOpts = {}): number[] | null {
  cartMode = !!opts.cart;
  try {
    return findPathInner(world, sx, sy, gx, gy, opts);
  } finally {
    cartMode = false;
  }
}

function findPathInner(world: World, sx: number, sy: number, gx: number, gy: number, opts: PathOpts): number[] | null {
  const W = world.W;
  const H = world.H;
  ensure(W * H);
  const stx = Math.min(W - 1, Math.max(0, Math.floor(sx)));
  const sty = Math.min(H - 1, Math.max(0, Math.floor(sy)));
  const gtx = Math.min(W - 1, Math.max(0, Math.floor(gx)));
  const gty = Math.min(H - 1, Math.max(0, Math.floor(gy)));
  const goalFn = opts.goalFn ?? ((x: number, y: number) => x === gtx && y === gty);
  const maxNodes = opts.maxNodes ?? 7000;

  const startI = sty * W + stx;
  if (goalFn(stx, sty)) {
    if (opts.exact) return [opts.exact.x, opts.exact.y];
    return [];
  }

  gen++;
  heap.clear();
  G[startI] = 0;
  From[startI] = -1;
  Seen[startI] = gen;
  heap.push(startI, 0);
  let expanded = 0;
  let goalI = -1;

  while (heap.size > 0) {
    const cur = heap.pop();
    if (Closed[cur] === gen) continue;
    Closed[cur] = gen;
    const cx = cur % W;
    const cy = (cur / W) | 0;
    if (goalFn(cx, cy)) {
      goalI = cur;
      break;
    }
    if (++expanded > maxNodes) break;
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX[k];
      const ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (Closed[ni] === gen) continue;
      const c = tileCost(world, ni);
      if (c === 0) continue;
      if (k >= 4) {
        if (tileCost(world, cy * W + nx) === 0 || tileCost(world, ny * W + cx) === 0) continue;
      }
      const ng = G[cur] + (k >= 4 ? 1.4142 : 1) * c;
      if (Seen[ni] !== gen || ng < G[ni]) {
        G[ni] = ng;
        From[ni] = cur;
        Seen[ni] = gen;
        const ex = Math.abs(nx - gtx);
        const ey = Math.abs(ny - gty);
        const h = Math.max(ex, ey) + 0.4142 * Math.min(ex, ey);
        heap.push(ni, ng + h);
      }
    }
  }
  if (goalI < 0) return null;

  // reconstruct
  const tiles: number[] = [];
  for (let i = goalI; i >= 0; i = From[i]) tiles.push(i);
  tiles.reverse();
  const pts: number[] = [];
  for (let k = 1; k < tiles.length; k++) {
    pts.push((tiles[k] % W) + 0.5, Math.floor(tiles[k] / W) + 0.5);
  }
  if (opts.exact) {
    if (pts.length >= 2) {
      pts[pts.length - 2] = opts.exact.x;
      pts[pts.length - 1] = opts.exact.y;
    } else {
      pts.push(opts.exact.x, opts.exact.y);
    }
  }
  return smooth(world, sx, sy, pts);
}

function smooth(world: World, sx: number, sy: number, pts: number[]): number[] {
  const n = pts.length / 2;
  if (n <= 1) return pts;
  const out: number[] = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  while (i < n) {
    // farthest visible waypoint from (ax,ay)
    let j = n - 1;
    while (j > i && !lineClear(world, ax, ay, pts[j * 2], pts[j * 2 + 1])) j--;
    out.push(pts[j * 2], pts[j * 2 + 1]);
    ax = pts[j * 2];
    ay = pts[j * 2 + 1];
    i = j + 1;
  }
  return out;
}

/** Cheap reachability probe (bounded A*). */
export function reachable(world: World, sx: number, sy: number, gx: number, gy: number, maxNodes = 9000): boolean {
  return findPath(world, sx, sy, gx, gy, { maxNodes }) !== null;
}

/** Approximate walking distance for planning (straight line scaled), without running A*. */
export function walkEstimate(sx: number, sy: number, gx: number, gy: number): number {
  return Math.hypot(gx - sx, gy - sy) * 1.18;
}
