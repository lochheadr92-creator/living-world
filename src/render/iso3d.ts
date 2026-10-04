// Small 3D-ish helpers for the procedural isometric art: boxes, cylinders and textured faces.
// Coordinates are the same as sprites.ts `mk(w, h)`: x runs toward the lower right, y toward the lower left, z is up in px.
// The two faces a viewer sees are the "left" face (y = max, facing lower-left) and the "right" face (x = max, facing lower-right).
import { line, poly, shade } from './sprites';
import type { Pt } from './sprites';

export type P3 = (x: number, y: number, z?: number) => Pt;

/** A face on the plane y = y (the one that faces lower-left). */
export function faceL(ctx: CanvasRenderingContext2D, p: P3, x0: number, x1: number, y: number, z0: number, z1: number, fill: string | CanvasGradient, stroke?: string, lw = 0.8): void {
  poly(ctx, [p(x0, y, z0), p(x1, y, z0), p(x1, y, z1), p(x0, y, z1)], fill, stroke, lw);
}

/** A face on the plane x = x (the one that faces lower-right). */
export function faceR(ctx: CanvasRenderingContext2D, p: P3, x: number, y0: number, y1: number, z0: number, z1: number, fill: string | CanvasGradient, stroke?: string, lw = 0.8): void {
  poly(ctx, [p(x, y0, z0), p(x, y1, z0), p(x, y1, z1), p(x, y0, z1)], fill, stroke, lw);
}

/** A horizontal face at height z. */
export function faceT(ctx: CanvasRenderingContext2D, p: P3, x0: number, x1: number, y0: number, y1: number, z: number, fill: string | CanvasGradient, stroke?: string, lw = 0.8): void {
  poly(ctx, [p(x0, y0, z), p(x1, y0, z), p(x1, y1, z), p(x0, y1, z)], fill, stroke, lw);
}

export interface BoxStyle {
  top: string;
  left: string;
  right: string;
  stroke?: string;
  lw?: number;
}

/** The three visible faces of a cuboid, back to front. */
export function box(ctx: CanvasRenderingContext2D, p: P3, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, st: BoxStyle): void {
  const lw = st.lw ?? 0.8;
  faceL(ctx, p, x0, x1, y1, z0, z1, st.left, st.stroke, lw);
  faceR(ctx, p, x1, y0, y1, z0, z1, st.right, st.stroke, lw);
  faceT(ctx, p, x0, x1, y0, y1, z1, st.top, st.stroke, lw);
}

/** Box colours from one base tone (lit top, mid left, dark right). */
export function boxTones(base: string, stroke = 'rgba(30,24,18,0.4)'): BoxStyle {
  return { top: shade(base, 1.1), left: shade(base, 0.92), right: shade(base, 0.72), stroke };
}

/** Horizontal course lines across a left face (e.g. boards laid flat, brick courses). */
export function coursesL(ctx: CanvasRenderingContext2D, p: P3, x0: number, x1: number, y: number, z0: number, z1: number, n: number, color: string, lw = 0.7): void {
  for (let i = 1; i < n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    line(ctx, p(x0, y, z), p(x1, y, z), color, lw);
  }
}

export function coursesR(ctx: CanvasRenderingContext2D, p: P3, x: number, y0: number, y1: number, z0: number, z1: number, n: number, color: string, lw = 0.7): void {
  for (let i = 1; i < n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    line(ctx, p(x, y0, z), p(x, y1, z), color, lw);
  }
}

/** Running-bond joints between courses on a left face. */
export function jointsL(ctx: CanvasRenderingContext2D, p: P3, x0: number, x1: number, y: number, z0: number, z1: number, courses: number, perCourse: number, color: string, lw = 0.6): void {
  const dz = (z1 - z0) / courses;
  for (let c = 0; c < courses; c++) {
    const off = c % 2 ? 0.5 : 0;
    for (let k = 0; k <= perCourse; k++) {
      const t = (k + off) / perCourse;
      if (t <= 0.001 || t >= 0.999) continue;
      const x = x0 + (x1 - x0) * t;
      line(ctx, p(x, y, z0 + c * dz), p(x, y, z0 + (c + 1) * dz), color, lw);
    }
  }
}

export function jointsR(ctx: CanvasRenderingContext2D, p: P3, x: number, y0: number, y1: number, z0: number, z1: number, courses: number, perCourse: number, color: string, lw = 0.6): void {
  const dz = (z1 - z0) / courses;
  for (let c = 0; c < courses; c++) {
    const off = c % 2 ? 0.5 : 0;
    for (let k = 0; k <= perCourse; k++) {
      const t = (k + off) / perCourse;
      if (t <= 0.001 || t >= 0.999) continue;
      const y = y0 + (y1 - y0) * t;
      line(ctx, p(x, y, z0 + c * dz), p(x, y, z0 + (c + 1) * dz), color, lw);
    }
  }
}

/**
 * A vertical cylinder standing on the ground at screen position (cx, cy) (the centre of its base), radius `rx` px along the
 * horizontal, so its iso ellipse is rx by rx/2. `lit`/`dark` colour the body left to right.
 */
export function cylinder(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, h: number, lit: string, dark: string, topFill: string, stroke = 'rgba(30,22,16,0.45)'): void {
  const ry = rx * 0.5;
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, lit);
  g.addColorStop(1, dark);
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx - rx, cy - h);
  ctx.ellipse(cx, cy - h, rx, ry, 0, Math.PI, 0, false);
  ctx.lineTo(cx + rx, cy);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - h, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = topFill;
  ctx.fill();
  ctx.stroke();
}

/** A dome: base ellipse (rx, rx/2) at (cx, cy) rising to height h, lit from the upper left. Returns nothing; draw courses on top. */
export function dome(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, h: number, c1: string, c2: string, c3: string, stroke = 'rgba(30,22,16,0.4)'): void {
  const ry = rx * 0.5;
  const g = ctx.createRadialGradient(cx - rx * 0.4, cy - h * 0.7, rx * 0.1, cx, cy - h * 0.35, rx * 1.15);
  g.addColorStop(0, c1);
  g.addColorStop(0.5, c2);
  g.addColorStop(1, c3);
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  // silhouette over the top: a half ellipse of height h
  ctx.ellipse(cx, cy, rx, h, 0, Math.PI, 0, false);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

/** Course rings on a dome drawn by `dome` (stone or brick bands that curve around it). */
export function domeCourses(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, h: number, n: number, color: string, lw = 0.7): void {
  const ry = rx * 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  for (let i = 1; i < n; i++) {
    const t = i / n; // height fraction
    const ang = Math.asin(t);
    const r = Math.cos(ang);
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * t, rx * r, ry * r, 0, 0, Math.PI, false);
    ctx.stroke();
  }
}

// ───────────── oriented boxes (for things that turn: carts, carried goods) ─────────────
/** local (u forward, v left, z up) to iso px plus a depth value */
export type S3 = (u: number, v: number, z: number) => readonly [number, number, number];

export interface OBoxStyle {
  top: string;
  /** the side that faces lower-left (lit) and the one that faces lower-right (shaded) */
  lit: string;
  dark: string;
  stroke?: string;
  lw?: number;
}

/**
 * A cuboid in a frame that has been turned by heading (fx, fy is the forward direction in the world).
 * Only the faces that can be seen from the camera are drawn: the top and up to two sides.
 */
export function orientedBox(ctx: CanvasRenderingContext2D, S: S3, fx: number, fy: number, u0: number, u1: number, v0: number, v1: number, z0: number, z1: number, st: OBoxStyle): void {
  const lx = -fy;
  const ly = fx;
  const lw = st.lw ?? 0.7;
  const face = (pts: readonly (readonly [number, number, number])[], fill: string) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (st.stroke) {
      ctx.strokeStyle = st.stroke;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };
  // side faces: outward normals +u, -u, +v, -v. A face is visible when its normal points toward the camera (+x +y).
  // The "lit" side is the one facing lower-left, i.e. normal . (1, -1) < 0.
  const side = (nx: number, ny: number, pts: readonly (readonly [number, number, number])[]) => {
    if (nx + ny <= 0.0001) return;
    face(pts, nx - ny < 0 ? st.lit : st.dark);
  };
  side(fx, fy, [S(u1, v0, z0), S(u1, v1, z0), S(u1, v1, z1), S(u1, v0, z1)]);
  side(-fx, -fy, [S(u0, v0, z0), S(u0, v1, z0), S(u0, v1, z1), S(u0, v0, z1)]);
  side(lx, ly, [S(u0, v1, z0), S(u1, v1, z0), S(u1, v1, z1), S(u0, v1, z1)]);
  side(-lx, -ly, [S(u0, v0, z0), S(u1, v0, z0), S(u1, v0, z1), S(u0, v0, z1)]);
  face([S(u0, v0, z1), S(u1, v0, z1), S(u1, v1, z1), S(u0, v1, z1)], st.top);
}
