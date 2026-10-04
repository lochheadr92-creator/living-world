// Shared pieces for the procedural building sprites: roofs, doors, windows, posts, chimneys.
// Coordinates follow sprites.ts `mk(w, h)`: the door side is the "left" face (y = max), the gable side the "right" face (x = max).
import { hashUnit } from '../sim/rng';
import { box, boxTones, coursesL, coursesR, faceL, faceR, jointsL, jointsR } from './iso3d';
import type { P3 } from './iso3d';
import { line, poly, shade } from './sprites';

type Ctx = CanvasRenderingContext2D;

export type RoofTex = 'thatch' | 'tiles' | 'shingle' | 'slate' | 'planks';

export interface Roof {
  x0: number;
  x1: number;
  /** y of the ridge */
  ym: number;
  /** y of the eave line (the roof overhangs it by `oy`) */
  yE: number;
  zE: number;
  zR: number;
  ox: number;
  oy: number;
  base: string;
  tex: RoofTex;
  v: number;
}

/** Height of the roof surface at y (follows the slope past the eave too). */
export function roofZ(r: Roof, y: number): number {
  return r.zR + ((r.zE - r.zR) * (y - r.ym)) / (r.yE - r.ym);
}

/** The slope that faces the viewer, with its texture. */
export function roofFront(ctx: Ctx, p: P3, r: Roof): void {
  const yy = r.yE + r.oy;
  const zz = roofZ(r, yy);
  const xa = r.x0 - r.ox;
  const xb = r.x1 + r.ox;
  const g = ctx.createLinearGradient(...p(1, r.ym, r.zR), ...p(1, yy, zz));
  g.addColorStop(0, shade(r.base, 1.08));
  g.addColorStop(1, shade(r.base, 0.82));
  poly(ctx, [p(xa, yy, zz), p(xb, yy, zz), p(xb, r.ym, r.zR), p(xa, r.ym, r.zR)], g, 'rgba(40,24,12,0.55)', 0.9);
  const at = (t: number): [number, number] => [r.ym + (yy - r.ym) * t, r.zR + (zz - r.zR) * t];
  switch (r.tex) {
    case 'thatch': {
      for (let i = 1; i < 8; i++) {
        const [y, z] = at(i / 8);
        line(ctx, p(xa, y, z), p(xb, y, z), 'rgba(90,65,25,0.32)', 0.9);
      }
      for (let i = 0; i < 30; i++) {
        const [y, z] = at(hashUnit(r.v, i, 41));
        const xx = xa + (xb - xa) * hashUnit(r.v, i, 42);
        line(ctx, p(xx, y, z), p(xx + 0.05, y - 0.02, z + 3), 'rgba(255,240,170,0.28)', 0.8);
      }
      break;
    }
    case 'tiles':
    case 'shingle':
    case 'slate': {
      const rows = r.tex === 'tiles' ? 9 : r.tex === 'shingle' ? 13 : 11;
      const cols = r.tex === 'tiles' ? 10 : r.tex === 'shingle' ? 16 : 12;
      const rowCol = r.tex === 'slate' ? 'rgba(15,20,30,0.45)' : 'rgba(50,22,12,0.4)';
      for (let i = 1; i < rows; i++) {
        const [y, z] = at(i / rows);
        line(ctx, p(xa, y, z), p(xb, y, z), rowCol, 0.9);
        // a light lip under each course
        const [y2, z2] = at((i + 0.12) / rows);
        line(ctx, p(xa, y2, z2), p(xb, y2, z2), 'rgba(255,255,255,0.1)', 0.7);
      }
      for (let i = 0; i < rows; i++) {
        const [ya, za] = at(i / rows);
        const [yb, zb] = at((i + 1) / rows);
        for (let c = 0; c < cols; c++) {
          const xx = xa + ((xb - xa) * (c + (i % 2 ? 0.5 : 0))) / cols;
          if (xx <= xa + 0.01 || xx >= xb - 0.01) continue;
          line(ctx, p(xx, ya, za), p(xx, yb, zb), rowCol, 0.65);
        }
      }
      // a few slightly different tiles
      for (let i = 0; i < 14; i++) {
        const [y, z] = at(hashUnit(r.v, i, 51));
        const xx = xa + (xb - xa) * hashUnit(r.v, i, 52);
        line(ctx, p(xx, y, z), p(xx + 0.18, y, z), hashUnit(r.v, i, 53) > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', 2.2);
      }
      break;
    }
    case 'planks': {
      const n = Math.max(6, Math.round((xb - xa) * 5));
      for (let i = 1; i < n; i++) {
        const xx = xa + ((xb - xa) * i) / n;
        line(ctx, p(xx, r.ym, r.zR), p(xx, yy, zz), 'rgba(40,24,10,0.4)', 0.8);
      }
      for (let i = 0; i < 18; i++) {
        const [y, z] = at(hashUnit(r.v, i, 61));
        const xx = xa + (xb - xa) * hashUnit(r.v, i, 62);
        line(ctx, p(xx, y, z), p(xx + 0.02, Math.min(yy, y + 0.2), z + (zz - r.zR) * 0.1), 'rgba(255,230,180,0.16)', 0.8);
      }
      break;
    }
  }
}

/** The thickness of the roof along the gable end on the right, and the ridge cap. */
export function roofEdge(ctx: Ctx, p: P3, r: Roof, ridgeCol = '#5e3320'): void {
  const yy = r.yE + r.oy;
  const zz = roofZ(r, yy);
  const xb = r.x1 + r.ox;
  poly(ctx, [p(xb, yy, zz), p(xb, r.ym, r.zR), p(xb + 0.06, r.ym, r.zR), p(xb + 0.06, yy, zz)], shade(r.base, 0.62));
  line(ctx, p(r.x0 - r.ox, r.ym, r.zR + 0.5), p(xb, r.ym, r.zR + 0.5), ridgeCol, 2.4);
}

/** The wall triangle under a gable on the right face. */
export function gableR(ctx: Ctx, p: P3, x: number, y0: number, y1: number, ym: number, zW: number, zR: number, fill: string, boards = 0, boardCol = 'rgba(60,40,20,0.3)'): void {
  poly(ctx, [p(x, y0, zW), p(x, y1, zW), p(x, ym, zR)], fill, 'rgba(50,32,16,0.42)', 0.8);
  const half = Math.max(0.01, Math.max(y1 - ym, ym - y0));
  for (let i = 1; i < boards; i++) {
    const y = y0 + ((y1 - y0) * i) / boards;
    const k = Math.max(0, Math.min(1, 1 - Math.abs(y - ym) / half));
    line(ctx, p(x, y, zW), p(x, y, zW + (zR - zW) * k), boardCol, 0.7);
  }
}

export interface DoorOpts {
  fill: string;
  frame: string;
  arch?: boolean;
  planks?: number;
  knob?: string;
  strap?: string;
}

/** A door in a left face. */
export function doorL(ctx: Ctx, p: P3, x0: number, x1: number, y: number, z0: number, z1: number, o: DoorOpts): void {
  const hw = (x1 - x0) / 2;
  const xc = (x0 + x1) / 2;
  const ar = o.arch ? Math.min((z1 - z0) * 0.38, 9) : 0;
  const pts: [number, number][] = [p(x0, y, z0) as [number, number], p(x1, y, z0) as [number, number]];
  if (o.arch) {
    pts.push(p(x1, y, z1 - ar) as [number, number]);
    for (let i = 1; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      pts.push(p(xc + hw * Math.cos(a), y, z1 - ar + ar * Math.sin(a)) as [number, number]);
    }
    pts.push(p(x0, y, z1 - ar) as [number, number]);
  } else {
    pts.push(p(x1, y, z1) as [number, number], p(x0, y, z1) as [number, number]);
  }
  poly(ctx, pts, o.fill, o.frame, 1.1);
  const n = o.planks ?? 0;
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    line(ctx, p(x, y, z0), p(x, y, z1 - ar * 0.6), 'rgba(15,8,4,0.5)', 0.8);
  }
  if (o.strap) {
    line(ctx, p(x0, y, z0 + (z1 - z0) * 0.3), p(x1, y, z0 + (z1 - z0) * 0.3), o.strap, 1.1);
    line(ctx, p(x0, y, z0 + (z1 - z0) * 0.68), p(x1, y, z0 + (z1 - z0) * 0.68), o.strap, 1.1);
  }
  if (o.knob) {
    const k = p(x1 - 0.06, y, z0 + (z1 - z0) * 0.45);
    ctx.fillStyle = o.knob;
    ctx.beginPath();
    ctx.arc(k[0], k[1], 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface WindowOpts {
  frame: string;
  glass: string;
  shutter?: string;
  lit?: boolean;
  bars?: boolean;
}

/** A small window in a left face, optionally with open shutters either side. */
export function windowL(ctx: Ctx, p: P3, x0: number, x1: number, y: number, z0: number, z1: number, o: WindowOpts): void {
  const sw = (x1 - x0) * 0.46;
  if (o.shutter) {
    for (const [a, b] of [
      [x0 - sw - 0.012, x0 - 0.012],
      [x1 + 0.012, x1 + sw + 0.012],
    ]) {
      poly(ctx, [p(a, y, z0 - 0.5), p(b, y, z0 - 0.5), p(b, y, z1 + 0.5), p(a, y, z1 + 0.5)], o.shutter, 'rgba(25,30,30,0.5)', 0.8);
      for (let i = 1; i < 4; i++) {
        const z = z0 + ((z1 - z0) * i) / 4;
        line(ctx, p(a, y, z), p(b, y, z), 'rgba(0,0,0,0.22)', 0.7);
      }
    }
  }
  poly(ctx, [p(x0 - 0.015, y, z0 - 0.7), p(x1 + 0.015, y, z0 - 0.7), p(x1 + 0.015, y, z1 + 0.7), p(x0 - 0.015, y, z1 + 0.7)], o.frame, 'rgba(25,18,10,0.5)', 0.8);
  poly(ctx, [p(x0, y, z0), p(x1, y, z0), p(x1, y, z1), p(x0, y, z1)], o.glass);
  if (o.bars !== false) {
    const xm = (x0 + x1) / 2;
    const zm = (z0 + z1) / 2;
    line(ctx, p(xm, y, z0), p(xm, y, z1), o.frame, 0.9);
    line(ctx, p(x0, y, zm), p(x1, y, zm), o.frame, 0.9);
  }
  // a glint
  line(ctx, p(x0 + 0.03, y, z1 - 1.2), p(x0 + (x1 - x0) * 0.4, y, z1 - 1.2), 'rgba(255,255,255,0.35)', 0.9);
}

/** A square post as a thin box. */
export function post(ctx: Ctx, p: P3, x: number, y: number, z0: number, z1: number, t: number, base: string): void {
  box(ctx, p, x - t / 2, x + t / 2, y - t / 2, y + t / 2, z0, z1, boxTones(base, 'rgba(25,16,8,0.5)'));
}

export interface BrickStyle {
  base: string;
  mortar?: string;
}

/** A brick wall: a left face and/or a right face filled with brick colour and running-bond joints. */
export function brickFaceL(ctx: Ctx, p: P3, x0: number, x1: number, y: number, z0: number, z1: number, st: BrickStyle, tone = 1): void {
  faceL(ctx, p, x0, x1, y, z0, z1, shade(st.base, tone), 'rgba(50,20,12,0.45)', 0.8);
  const courses = Math.max(2, Math.round((z1 - z0) / 4));
  const m = st.mortar ?? 'rgba(235,205,175,0.42)';
  coursesL(ctx, p, x0, x1, y, z0, z1, courses, m, 0.7);
  jointsL(ctx, p, x0, x1, y, z0, z1, courses, Math.max(2, Math.round((x1 - x0) * 7)), m, 0.6);
}

export function brickFaceR(ctx: Ctx, p: P3, x: number, y0: number, y1: number, z0: number, z1: number, st: BrickStyle, tone = 0.78): void {
  faceR(ctx, p, x, y0, y1, z0, z1, shade(st.base, tone), 'rgba(50,20,12,0.45)', 0.8);
  const courses = Math.max(2, Math.round((z1 - z0) / 4));
  const m = st.mortar ?? 'rgba(235,205,175,0.34)';
  coursesR(ctx, p, x, y0, y1, z0, z1, courses, m, 0.7);
  jointsR(ctx, p, x, y0, y1, z0, z1, courses, Math.max(2, Math.round((y1 - y0) * 7)), m, 0.6);
}

/** A brick chimney stack standing at footprint (cx, cy) up to height zTop; `hw` is its half width in tiles. */
export function chimneyStack(ctx: Ctx, p: P3, cx: number, cy: number, hw: number, z0: number, zTop: number, brick: string, cap = '#9b978c'): void {
  const x0 = cx - hw;
  const x1 = cx + hw;
  const y0 = cy - hw;
  const y1 = cy + hw;
  brickFaceL(ctx, p, x0, x1, y1, z0, zTop, { base: brick });
  brickFaceR(ctx, p, x1, y0, y1, z0, zTop, { base: brick });
  // cap slab and flue
  const o = hw * 0.35;
  box(ctx, p, x0 - o, x1 + o, y0 - o, y1 + o, zTop, zTop + 3.2, boxTones(cap, 'rgba(30,30,28,0.5)'));
  poly(ctx, [p(x0 + hw * 0.4, y0 + hw * 0.4, zTop + 3.25), p(x1 - hw * 0.4, y0 + hw * 0.4, zTop + 3.25), p(x1 - hw * 0.4, y1 - hw * 0.4, zTop + 3.25), p(x0 + hw * 0.4, y1 - hw * 0.4, zTop + 3.25)], '#2a2420');
}

/** A flat scatter of small marks on the ground inside a footprint (chips, gravel, ash). */
export function scatter(ctx: Ctx, p: P3, x0: number, x1: number, y0: number, y1: number, n: number, seed: number, colors: string[], size = 1.4): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * hashUnit(seed, i, 71);
    const y = y0 + (y1 - y0) * hashUnit(seed, i, 72);
    const [sx, sy] = p(x, y, 0);
    ctx.fillStyle = colors[Math.floor(hashUnit(seed, i, 73) * colors.length)];
    ctx.beginPath();
    ctx.ellipse(sx, sy, size * (0.7 + hashUnit(seed, i, 74)), size * 0.5 * (0.7 + hashUnit(seed, i, 75)), hashUnit(seed, i, 76) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A trodden-earth patch under a building or yard. */
export function groundPatch(ctx: Ctx, p: P3, x0: number, x1: number, y0: number, y1: number, fill: string): void {
  poly(ctx, [p(x0, y0, 0), p(x1, y0, 0), p(x1, y1, 0), p(x0, y1, 0)], fill);
}
