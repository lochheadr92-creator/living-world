// Workshops: timber yard, quarry, kiln, smithy (and the well, which belongs to everyone). Each is a distinct silhouette:
//   timber yard  wide, low, open-sided shed with a plank roof, a saw trestle and a chopping block
//   quarry       a stepped face of cut stone with a wooden tripod derrick
//   kiln         a clay dome with a stoking mouth and a squat chimney
//   smithy       a dark low shed with a tall stone forge chimney, an anvil and a quench trough
//   well         a ring of fitted stones round a dark shaft, under a little shingled gable with a windlass and a bucket on its rope
import { hashUnit } from '../sim/rng';
import { box, boxTones, coursesL, cylinder, dome, domeCourses, faceL, faceR, faceT, jointsL, jointsR } from './iso3d';
import { chimneyStack, doorL, gableR, groundPatch, post, roofEdge, roofFront, scatter } from './bld_common';
import type { Roof } from './bld_common';
import { SpriteCache, ellipse, groundShadow, line, mk, plankLines, poly, shade } from './sprites';
import type { Sprite } from './sprites';

type Ctx = CanvasRenderingContext2D;

// ───────────────────────────── timber yard (3 x 2) ─────────────────────────────
export const TIMBER = { roofBack: 50, roofFront: 34 } as const;

/** ground, back wall and left end wall of the shed: everything that stock inside the shed stands in front of */
export function timberYardBack(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`timber_b${v}`, 212, 172, 106, 108, (ctx) => {
    const p = mk(3, 2);
    groundShadow(ctx, 92, 31, 0.3, 4);
    groundPatch(ctx, p, 0.04, 2.96, 0.04, 1.96, 'rgba(160,130,92,0.6)');
    // sawdust round the trestle
    const sd = p(1.55, 1.62, 0);
    ellipse(ctx, sd[0], sd[1], 36, 13, 'rgba(236,216,172,0.7)');
    scatter(ctx, p, 0.2, 2.8, 1.2, 1.95, 46, v + 1, ['rgba(240,222,180,0.9)', 'rgba(200,170,120,0.8)', 'rgba(150,115,75,0.7)'], 1.5);
    // trodden floor under the shed
    groundPatch(ctx, p, 0.1, 2.9, 0.14, 1.1, 'rgba(96,74,50,0.5)');
    // back wall: weathered boards, a rack of tools on it
    const wall = ['#79593a', '#715436', '#7f6040', '#6b4f33'][v];
    faceL(ctx, p, 0.08, 2.92, 0.14, 0, 46, wall, 'rgba(30,18,8,0.5)', 0.9);
    plankLines(ctx, p, 'L', 0.08, 2.92, 0, 0.14, 0, 46, 24, 'rgba(25,15,6,0.35)');
    line(ctx, p(0.08, 0.14, 24), p(2.92, 0.14, 24), 'rgba(25,15,6,0.4)', 1.2);
    // left end wall (its inside face is what we see)
    faceR(ctx, p, 0.08, 0.14, 1.1, 0, 44, shade(wall, 0.82), 'rgba(30,18,8,0.5)', 0.9);
    for (let i = 1; i < 8; i++) {
      const y = 0.14 + ((1.1 - 0.14) * i) / 8;
      line(ctx, p(0.08, y, 0), p(0.08, y, 44 - i * 0.2), 'rgba(25,15,6,0.3)', 0.7);
    }
    // tools hung on the back wall: a long saw, an axe and a mallet
    const sw = (a: [number, number], b: [number, number], col: string, lw: number) => line(ctx, p(a[0], 0.15, a[1]), p(b[0], 0.15, b[1]), col, lw);
    sw([1.25, 18], [1.25, 40], '#b7bcc4', 3);
    sw([1.25, 40], [1.25, 43], '#6b4a2c', 3.4);
    for (let i = 0; i < 9; i++) sw([1.215, 19 + i * 2.4], [1.235, 20.2 + i * 2.4], '#8a9099', 1);
    sw([1.7, 20], [1.7, 36], '#7a5434', 1.6);
    poly(ctx, [p(1.62, 0.15, 36), p(1.78, 0.15, 36), p(1.78, 0.15, 41), p(1.66, 0.15, 42)], '#aeb2b8', 'rgba(20,20,24,0.6)', 0.7);
    sw([2.1, 22], [2.1, 36], '#7a5434', 1.6);
    box(ctx, p, 2.03, 2.17, 0.14, 0.2, 35, 40, boxTones('#8a6038'));
  });
}

/** posts, roof, trestle and chopping block: drawn over the stock that sits inside the shed */
export function timberYardFront(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`timber_f${v}`, 212, 172, 106, 108, (ctx) => {
    const p = mk(3, 2);
    const woodC = ['#8a6038', '#80583a', '#946a40', '#7a5232'][v];
    // front posts and the beam they carry
    for (const x of [0.1, 1.05, 2.0, 2.9]) post(ctx, p, x, 1.1, 0, 36, 0.11, woodC);
    box(ctx, p, 0.04, 2.96, 1.05, 1.15, 32, 36, boxTones(woodC, 'rgba(25,14,6,0.55)'));
    // knee braces on the open right end and between posts
    line(ctx, p(2.9, 1.1, 16), p(2.9, 0.62, 33), woodC, 2);
    line(ctx, p(2.0, 1.1, 14), p(1.55, 1.1, 32), woodC, 1.8);
    line(ctx, p(1.05, 1.1, 14), p(1.5, 1.1, 32), woodC, 1.8);
    // mono-pitch plank roof, sloping to the front
    const zB = TIMBER.roofBack;
    const zF = TIMBER.roofFront;
    const yF = 1.3;
    const g = ctx.createLinearGradient(...p(1.5, 0, zB), ...p(1.5, yF, zF));
    const roofC = ['#a98055', '#9c7550', '#b08860', '#946d4a'][v];
    g.addColorStop(0, shade(roofC, 1.12));
    g.addColorStop(1, shade(roofC, 0.8));
    // under-eave shadow strip so the roof reads as a slab
    faceL(ctx, p, -0.12, 3.12, yF, zF - 3.6, zF, shade(roofC, 0.5), 'rgba(25,14,6,0.6)', 0.8);
    poly(ctx, [p(3.12, 0, zB - 3.6), p(3.12, yF, zF - 3.6), p(3.12, yF, zF), p(3.12, 0, zB)], shade(roofC, 0.55), 'rgba(25,14,6,0.55)', 0.8);
    poly(ctx, [p(-0.12, yF, zF), p(3.12, yF, zF), p(3.12, 0, zB), p(-0.12, 0, zB)], g, 'rgba(25,14,6,0.55)', 0.9);
    const n = 16;
    for (let i = 1; i < n; i++) {
      const x = -0.12 + (3.24 * i) / n;
      line(ctx, p(x, 0, zB), p(x, yF, zF), 'rgba(35,20,8,0.42)', 0.8);
    }
    for (let i = 0; i < 26; i++) {
      const x = -0.12 + 3.24 * hashUnit(v, i, 11);
      const t = hashUnit(v, i, 12);
      line(ctx, p(x, yF * t, zB + (zF - zB) * t), p(x + 0.01, yF * Math.min(1, t + 0.18), zB + (zF - zB) * Math.min(1, t + 0.18)), 'rgba(255,230,180,0.17)', 0.8);
    }
    // moss and a dark patch or two
    for (let i = 0; i < 4; i++) {
      const x = 0.2 + 2.6 * hashUnit(v, i, 21);
      const t = 0.2 + 0.6 * hashUnit(v, i, 22);
      const q = p(x, yF * t, zB + (zF - zB) * t);
      ellipse(ctx, q[0], q[1], 7 + hashUnit(v, i, 23) * 5, 2.4, 'rgba(78,98,52,0.28)');
    }
    line(ctx, p(-0.12, 0, zB + 0.4), p(3.12, 0, zB + 0.4), '#4f3320', 2.2);

    // the saw trestle: two crossed frames carrying a big log, with a crosscut saw lying across it
    const legs = (x: number) => {
      line(ctx, p(x, 1.44, 0), p(x, 1.84, 19), 'rgba(25,14,6,0.6)', 4);
      line(ctx, p(x, 1.84, 0), p(x, 1.44, 19), 'rgba(25,14,6,0.6)', 4);
      line(ctx, p(x, 1.44, 0), p(x, 1.84, 19), woodC, 2.8);
      line(ctx, p(x, 1.84, 0), p(x, 1.44, 19), woodC, 2.8);
    };
    legs(1.0);
    legs(2.15);
    const a = p(0.8, 1.64, 24);
    const b = p(2.4, 1.64, 24);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(25,14,6,0.6)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.strokeStyle = '#a2723f';
    ctx.lineWidth = 9.6;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,180,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] - 2.6);
    ctx.lineTo(b[0], b[1] - 2.6);
    ctx.stroke();
    // the cut end, and a fresh kerf
    ctx.save();
    ctx.translate(b[0], b[1]);
    ctx.rotate(0.3);
    ctx.fillStyle = '#e0bb84';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.4, 5.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,76,30,0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.2, 2.7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // crosscut saw: blade across the log with an upright handle at each end
    const s0 = p(1.55, 1.3, 30.5);
    const s1 = p(1.55, 2.0, 30.5);
    poly(ctx, [[s0[0], s0[1] - 1.4], [s1[0], s1[1] - 1.4], [s1[0], s1[1] + 1.2], [s0[0], s0[1] + 1.2]], '#b8bec6', 'rgba(25,25,30,0.7)', 0.7);
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      ctx.fillStyle = '#6f757d';
      ctx.fillRect(s0[0] + (s1[0] - s0[0]) * t - 0.5, s0[1] + (s1[1] - s0[1]) * t + 1.2, 1, 1.2);
    }
    for (const q of [s0, s1]) line(ctx, [q[0], q[1] - 1], [q[0], q[1] - 9], '#6b4a2c', 2.6);
    // chopping block with an axe
    const cb = p(2.72, 1.5, 0);
    cylinder(ctx, cb[0], cb[1], 8, 10, '#a67a48', '#7a5430', '#d8b27a');
    line(ctx, [cb[0] + 1, cb[1] - 10], [cb[0] + 11, cb[1] - 30], '#7a5434', 2.2);
    poly(ctx, [[cb[0] + 8.5, cb[1] - 27], [cb[0] + 15, cb[1] - 30.5], [cb[0] + 13.5, cb[1] - 23], [cb[0] + 9.5, cb[1] - 22]], '#b9bec4', 'rgba(25,25,30,0.7)', 0.7);
  });
}

// ───────────────────────────── quarry (2 x 2) ─────────────────────────────
export function quarrySprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`quarry${v}`, 184, 160, 92, 102, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 66, 25, 0.28, 4);
    groundPatch(ctx, p, 0.03, 1.97, 0.03, 1.97, 'rgba(196,192,178,0.88)');
    scatter(ctx, p, 0.1, 1.9, 0.5, 1.95, 60, v + 3, ['rgba(238,236,226,0.95)', 'rgba(150,146,134,0.8)', 'rgba(110,106,96,0.7)'], 1.7);
    const tone = [1.0, 0.96, 1.04, 0.93][v];
    const st = (k: number) => ({ top: shade('#ebe8dc', k * tone), left: shade('#d3d0c3', k * tone), right: shade('#a9a69a', k * tone), stroke: 'rgba(60,58,50,0.55)', lw: 0.9 });
    // the stepped cut face
    const tiers: [number, number, number, number, number, number][] = [
      [0.16, 1.84, 0.1, 0.58, 0, 15],
      [0.16, 1.4, 0.1, 0.4, 15, 30],
      [0.16, 0.86, 0.1, 0.28, 30, 45],
    ];
    tiers.forEach(([x0, x1, y0, y1, z0, z1], i) => {
      box(ctx, p, x0, x1, y0, y1, z0, z1, st(1 - i * 0.03));
      const courses = 2;
      coursesL(ctx, p, x0, x1, y1, z0, z1, courses, 'rgba(70,68,58,0.45)');
      jointsL(ctx, p, x0, x1, y1, z0, z1, courses, Math.round((x1 - x0) * 3.2), 'rgba(70,68,58,0.4)');
      jointsR(ctx, p, x1, y0, y1, z0, z1, courses, 1, 'rgba(70,68,58,0.35)');
      // pale chisel-dressed edge and wedge slots along the lip
      line(ctx, p(x0, y1, z1), p(x1, y1, z1), 'rgba(255,255,255,0.55)', 1.1);
      for (let k = 0; k < Math.floor((x1 - x0) * 4); k++) {
        const x = x0 + 0.12 + k * 0.25;
        line(ctx, p(x, y1 - 0.05, z1), p(x + 0.02, y1 - 0.05, z1), 'rgba(40,38,32,0.7)', 1.5);
      }
    });
    // rubble where the face has been broken
    for (let i = 0; i < 7; i++) {
      const q = p(0.2 + 0.3 * i + hashUnit(v, i, 31) * 0.1, 0.68 + hashUnit(v, i, 32) * 0.18, 0);
      ellipse(ctx, q[0], q[1] - 1.5, 3 + hashUnit(v, i, 33) * 2.5, 2.1, shade('#c9c6b8', 0.8 + hashUnit(v, i, 34) * 0.3));
    }

    // a wooden tripod derrick lifting a squared block
    const apex = p(1.6, 1.26, 68);
    const feet: [number, number][] = [
      [1.32, 1.62],
      [1.94, 1.5],
      [1.56, 0.98],
    ];
    const wood = '#7d5a37';
    for (const [fx, fy] of feet) {
      const f = p(fx, fy, 0);
      line(ctx, f, apex, 'rgba(25,14,6,0.55)', 4.4);
      line(ctx, f, apex, wood, 3);
      line(ctx, [f[0] - 0.6, f[1]], [apex[0] - 0.6, apex[1]], 'rgba(255,230,180,0.2)', 1);
    }
    // lashing and a tie
    const t0 = p(1.42, 1.5, 28);
    const t1 = p(1.8, 1.44, 28);
    line(ctx, t0, t1, wood, 2);
    ctx.fillStyle = '#d6c08a';
    ctx.fillRect(apex[0] - 3, apex[1] - 1, 6, 3);
    ctx.beginPath();
    ctx.arc(apex[0], apex[1] + 3, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#6b6258';
    ctx.fill();
    // rope down to a hook and two ropes to the block
    const hook = p(1.6, 1.26, 34);
    line(ctx, [apex[0], apex[1] + 4], hook, '#d4c08a', 1.3);
    const blk = { x0: 1.46, x1: 1.76, y0: 1.12, y1: 1.4, z0: 18, z1: 29 };
    line(ctx, hook, p(blk.x0 + 0.05, blk.y1, blk.z1), '#d4c08a', 1);
    line(ctx, hook, p(blk.x1 - 0.05, blk.y1, blk.z1), '#d4c08a', 1);
    box(ctx, p, blk.x0, blk.x1, blk.y0, blk.y1, blk.z0, blk.z1, st(1.02));
    line(ctx, p(blk.x0, blk.y1, 23.6), p(blk.x1, blk.y1, 23.6), 'rgba(70,68,58,0.4)', 0.7);
    // a sledge and its runners, a mallet and wedges on the ground
    const mal = p(1.05, 1.78, 0);
    line(ctx, mal, [mal[0] + 9, mal[1] - 3], '#7a5434', 2);
    box(ctx, p, 1.1, 1.26, 1.72, 1.8, 0.2, 5, boxTones('#6b6258'));
    for (let i = 0; i < 3; i++) {
      const w = p(0.45 + i * 0.12, 1.75 + (i % 2) * 0.06, 0);
      poly(ctx, [[w[0] - 1.6, w[1] - 0.6], [w[0] + 1.6, w[1] - 0.6], [w[0] + 0.6, w[1] - 4.4]], '#8d939b', 'rgba(25,25,30,0.6)', 0.5);
    }
  });
}

// ───────────────────────────── kiln (2 x 2) ─────────────────────────────
export const KILN = { chimney: { x: 1.0, y: 0.62, z: 64 }, mouth: { x: 1.0, y: 1.9, z: 8 } } as const;

export function kilnSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`kiln${v}`, 184, 176, 92, 118, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 66, 25, 0.32, 4);
    groundPatch(ctx, p, 0.05, 1.95, 0.05, 1.95, 'rgba(90,76,64,0.38)');
    scatter(ctx, p, 0.2, 1.8, 1.4, 1.95, 22, v + 5, ['rgba(40,34,30,0.6)', 'rgba(150,130,110,0.5)'], 1.8);
    const c = p(1.0, 0.95, 0);
    // a low ring of stone under the dome
    cylinder(ctx, c[0], c[1], 40, 5, '#b2ac9f', '#85807a', '#a5a094');
    const clay = [['#e3ab80', '#c0825a', '#7c4a2e'], ['#dca37a', '#b87a54', '#74442a'], ['#e8b48a', '#c88a60', '#85503a'], ['#d79d74', '#b27250', '#6e4028']][v];
    dome(ctx, c[0], c[1] - 5, 36, 42, clay[0], clay[1], clay[2]);
    domeCourses(ctx, c[0], c[1] - 5, 36, 42, 8, 'rgba(70,34,18,0.38)');
    // stone joints between the courses
    ctx.strokeStyle = 'rgba(70,34,18,0.28)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 8; i++) {
      const t0 = i / 8;
      const t1 = (i + 1) / 8;
      const r0 = Math.cos(Math.asin(t0));
      const r1 = Math.cos(Math.asin(Math.min(0.999, t1)));
      const n = Math.max(3, Math.round(12 * r0));
      for (let k = 0; k <= n; k++) {
        const th = ((k + (i % 2 ? 0.5 : 0)) / n) * Math.PI;
        if (th <= 0.02 || th >= Math.PI - 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(c[0] + Math.cos(th) * 36 * r0, c[1] - 5 - 42 * t0 + Math.sin(th) * 18 * r0);
        ctx.lineTo(c[0] + Math.cos(th) * 36 * r1, c[1] - 5 - 42 * t1 + Math.sin(th) * 18 * r1);
        ctx.stroke();
      }
    }
    // soot round the vent at the top
    const topY = c[1] - 5 - 42;
    const sg = ctx.createRadialGradient(c[0] + 2, topY + 4, 1, c[0] + 2, topY + 4, 18);
    sg.addColorStop(0, 'rgba(25,18,14,0.55)');
    sg.addColorStop(1, 'rgba(25,18,14,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(c[0] - 18, topY - 12, 40, 36);
    // the chimney: a squat stack on the back of the dome
    chimneyStack(ctx, p, 1.0, 0.62, 0.14, 30, 62, '#8f6c52', '#8d887d');
    // the firebox in front, with its stoking mouth
    const fb = { x0: 0.58, x1: 1.42, y0: 1.38, y1: 1.88, z1: 22 };
    box(ctx, p, fb.x0, fb.x1, fb.y0, fb.y1, 0, fb.z1, { top: '#c9a37c', left: '#a9805a', right: '#7c593c', stroke: 'rgba(50,28,16,0.55)', lw: 0.9 });
    jointsL(ctx, p, fb.x0, fb.x1, fb.y1, 0, fb.z1, 4, 5, 'rgba(60,34,20,0.32)');
    jointsR(ctx, p, fb.x1, fb.y0, fb.y1, 0, fb.z1, 4, 3, 'rgba(60,34,20,0.28)');
    // arch: dark inside with a dull glow at the floor
    doorL(ctx, p, 0.82, 1.18, fb.y1, 1.2, 15.5, { fill: '#1c0f08', frame: '#4a3020', arch: true });
    const gl = p(1.0, fb.y1, 2.5);
    const gg = ctx.createRadialGradient(gl[0], gl[1], 0.5, gl[0], gl[1], 11);
    gg.addColorStop(0, 'rgba(255,150,60,0.55)');
    gg.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(gl[0] - 12, gl[1] - 12, 24, 20);
    // lintel and soot above the mouth
    box(ctx, p, 0.74, 1.26, fb.y1, fb.y1 + 0.05, 15.5, 19, boxTones('#8d887d'));
    const so = p(1.0, fb.y1, 20);
    const sg2 = ctx.createRadialGradient(so[0], so[1], 1, so[0], so[1], 10);
    sg2.addColorStop(0, 'rgba(25,18,14,0.5)');
    sg2.addColorStop(1, 'rgba(25,18,14,0)');
    ctx.fillStyle = sg2;
    ctx.fillRect(so[0] - 10, so[1] - 10, 20, 16);
  });
}

// ───────────────────────────── smithy (2 x 2) ─────────────────────────────
export const SMITHY = { chimney: { x: 1.51, y: 1.35, z: 90 }, mouth: { x: 1.51, y: 1.62, z: 7 } } as const;

export function smithySprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`smithy${v}`, 188, 196, 94, 140, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 68, 26, 0.34, 4);
    groundPatch(ctx, p, 0.05, 1.95, 0.05, 1.95, 'rgba(70,58,48,0.5)');
    scatter(ctx, p, 0.1, 1.9, 1.15, 1.95, 30, v + 9, ['rgba(30,26,24,0.6)', 'rgba(120,108,96,0.5)', 'rgba(210,120,50,0.35)'], 1.6);
    const wallC = ['#72573f', '#6a503a', '#7a5f45', '#654c37'][v];
    const x0 = 0.1;
    const x1 = 1.9;
    const y0 = 0.1;
    const y1 = 1.15;
    const ym = 0.62;
    const WT = 28;
    // low stone footing
    faceL(ctx, p, x0 - 0.03, x1 + 0.03, y1 + 0.03, 0, 5, '#8a857a', 'rgba(30,30,28,0.45)', 0.8);
    faceR(ctx, p, x1 + 0.03, y0 - 0.03, y1 + 0.03, 0, 5, '#6c685f', 'rgba(30,30,28,0.45)', 0.8);
    // walls: dark planks
    faceL(ctx, p, x0, x1, y1, 5, WT, wallC, 'rgba(25,15,8,0.5)', 0.9);
    faceR(ctx, p, x1, y0, y1, 5, WT, shade(wallC, 0.78), 'rgba(25,15,8,0.5)', 0.9);
    plankLines(ctx, p, 'L', x0, x1, y0, y1, 5, WT, 14, 'rgba(20,12,6,0.35)');
    plankLines(ctx, p, 'R', x0, x1, y0, y1, 5, WT, 8, 'rgba(20,12,6,0.35)');
    // the open working bay on the left half of the front wall
    poly(ctx, [p(0.22, y1, 5), p(1.0, y1, 5), p(1.0, y1, 25), p(0.22, y1, 25)], '#16100c', '#3a281a', 1.2);
    const bay = p(0.6, y1, 12);
    const bg = ctx.createRadialGradient(bay[0], bay[1], 1, bay[0], bay[1], 24);
    bg.addColorStop(0, 'rgba(120,52,18,0.35)');
    bg.addColorStop(1, 'rgba(120,52,18,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(bay[0] - 26, bay[1] - 24, 52, 40);
    // tools hanging inside the bay
    for (let i = 0; i < 4; i++) line(ctx, p(0.32 + i * 0.16, y1 - 0.02, 24), p(0.32 + i * 0.16, y1 - 0.02, 14 + (i % 2) * 3), '#7a8089', 1.4);
    for (const x of [x0, 1.0, x1]) line(ctx, p(x, y1, 5), p(x, y1, WT), '#3d2a1a', 2.4);
    line(ctx, p(x0, y1, WT), p(x1, y1, WT), '#3d2a1a', 2.6);
    gableR(ctx, p, x1, y0, y1, ym, WT, 45, shade(wallC, 0.64), 8, 'rgba(20,12,6,0.35)');
    // dark slate roof, low pitch
    const roof: Roof = { x0, x1, ym, yE: y1, zE: 25, zR: 47, ox: 0.15, oy: 0.17, base: ['#5b5d69', '#565965', '#62646f', '#505360'][v], tex: 'slate', v };
    roofFront(ctx, p, roof);
    roofEdge(ctx, p, roof, '#2e2a28');

    // the forge: stone hearth with an arched fire mouth, its flue rising high above the roof
    const h0 = { x0: 1.2, x1: 1.82, y0: 1.15, y1: 1.64, z1: 20 };
    box(ctx, p, h0.x0, h0.x1, h0.y0, h0.y1, 0, h0.z1, { top: '#9a948a', left: '#857f75', right: '#605c54', stroke: 'rgba(30,30,28,0.55)', lw: 0.9 });
    jointsL(ctx, p, h0.x0, h0.x1, h0.y1, 0, h0.z1, 4, 5, 'rgba(30,30,28,0.3)');
    jointsR(ctx, p, h0.x1, h0.y0, h0.y1, 0, h0.z1, 4, 3, 'rgba(30,30,28,0.3)');
    doorL(ctx, p, 1.36, 1.68, h0.y1, 1.2, 13.5, { fill: '#170d08', frame: '#3a3430', arch: true });
    const em = p(1.52, h0.y1, 3);
    const eg = ctx.createRadialGradient(em[0], em[1], 0.5, em[0], em[1], 10);
    eg.addColorStop(0, 'rgba(255,170,70,0.75)');
    eg.addColorStop(0.5, 'rgba(220,90,30,0.35)');
    eg.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(em[0] - 12, em[1] - 12, 24, 20);
    // stepped hood and tall flue
    box(ctx, p, 1.3, 1.72, 1.2, 1.56, 20, 30, { top: '#9a948a', left: '#8a847a', right: '#656158', stroke: 'rgba(30,30,28,0.55)', lw: 0.9 });
    chimneyStack(ctx, p, SMITHY.chimney.x, SMITHY.chimney.y - 0.08, 0.14, 30, 86, '#8a857a', '#6f6a62');
    // soot streaks high on the stack
    const sk = p(SMITHY.chimney.x, SMITHY.chimney.y + 0.06, 80);
    const skg = ctx.createRadialGradient(sk[0], sk[1], 1, sk[0], sk[1], 11);
    skg.addColorStop(0, 'rgba(20,16,12,0.5)');
    skg.addColorStop(1, 'rgba(20,16,12,0)');
    ctx.fillStyle = skg;
    ctx.fillRect(sk[0] - 12, sk[1] - 12, 24, 24);

    // anvil on a stump, in front of the bay
    const sp = p(0.58, 1.58, 0);
    cylinder(ctx, sp[0], sp[1], 7.5, 9, '#9b7040', '#6a4826', '#c49660');
    const an = (dx: number, dy: number, w: number, h: number) => [sp[0] + dx, sp[1] - 9.5 + dy, w, h] as const;
    const [ax, ay, aw, ah] = an(-7, -5, 14, 5);
    poly(ctx, [[ax, ay + ah], [ax + aw, ay + ah], [ax + aw - 2.5, ay + ah - 2.5], [ax + aw, ay], [ax + 1, ay]], '#4d5058', 'rgba(10,10,14,0.7)', 0.7);
    // horn
    poly(ctx, [[ax + 1, ay], [ax - 6, ay + 0.5], [ax - 1, ay + 3]], '#4d5058', 'rgba(10,10,14,0.7)', 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(ax + 2, ay + 0.4, aw - 4, 0.9);
    // the quench trough
    box(ctx, p, 0.92, 1.18, 1.7, 1.92, 0, 7.5, { top: '#2e4150', left: '#7c5a38', right: '#56402a', stroke: 'rgba(30,18,8,0.6)', lw: 0.9 });
    faceT(ctx, p, 0.97, 1.13, 1.74, 1.88, 6.6, '#34536a');
    line(ctx, p(0.99, 1.76, 6.7), p(1.08, 1.76, 6.7), 'rgba(190,225,245,0.5)', 0.9);
    // tongs and a hammer lying by the anvil
    line(ctx, p(0.22, 1.82, 0.6), p(0.46, 1.9, 0.6), '#63676f', 1.3);
    line(ctx, p(0.28, 1.76, 0.6), p(0.5, 1.7, 0.6), '#7a5434', 1.8);
  });
}

// ───────────────────────────── well (1 x 1) ─────────────────────────────
export function wellSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`well${v}`, 104, 110, 52, 82, (ctx) => {
    const p = mk(1, 1);
    groundShadow(ctx, 40, 15, 0.3, 4);
    // trodden earth and a few flagstones round the curb
    groundPatch(ctx, p, 0.0, 1.0, 0.0, 1.0, 'rgba(112,98,78,0.4)');
    scatter(ctx, p, 0.06, 0.94, 0.5, 0.97, 10, v + 3, ['rgba(178,172,158,0.85)', 'rgba(132,126,114,0.8)', 'rgba(92,82,68,0.6)'], 2.2);
    const wood = ['#7c5a3a', '#73543a', '#82603f', '#6e5035'][v];
    const [lit, dark] = [['#c9c3b4', '#8c877d'], ['#c0bbae', '#86827a'], ['#cfc8b8', '#928b7e'], ['#bdb8ab', '#837f77']][v];
    const PX = [0.14, 0.86];
    // the two back posts stand behind the curb
    for (const x of PX) post(ctx, p, x, 0.14, 0, 40, 0.07, wood);
    // the curb: a ring of fitted stones round a dark shaft
    const c = p(0.5, 0.5, 0);
    const H = 14;
    const RX = 17;
    cylinder(ctx, c[0], c[1], RX, H, lit, dark, '#bdb7a9');
    ctx.strokeStyle = 'rgba(60,56,48,0.4)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) {
      const z = (H * (i + 1)) / 3;
      if (i < 2) {
        ctx.beginPath();
        ctx.ellipse(c[0], c[1] - z, RX, RX * 0.5, 0, 0.02 * Math.PI, 0.98 * Math.PI, false);
        ctx.stroke();
      }
      const n = 7;
      for (let k = 0; k <= n; k++) {
        const th = ((k + (i % 2 ? 0.5 : 0)) / n) * Math.PI;
        if (th <= 0.06 || th >= Math.PI - 0.06) continue;
        const x = c[0] + Math.cos(th) * RX;
        const y = c[1] + Math.sin(th) * RX * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y - (H * i) / 3);
        ctx.lineTo(x, y - (H * (i + 1)) / 3);
        ctx.stroke();
      }
    }
    // down the shaft: dark stone walls, and the water a long way down
    const ty = c[1] - H;
    ellipse(ctx, c[0], ty, RX - 3.4, (RX - 3.4) * 0.5, '#26323a');
    const wg = ctx.createRadialGradient(c[0] + 2, ty + 1.5, 1, c[0] + 2, ty + 1.5, RX - 5);
    wg.addColorStop(0, '#79a6bd');
    wg.addColorStop(1, '#3c5f72');
    ellipse(ctx, c[0] + 1, ty + 2, RX - 7, (RX - 7) * 0.5, wg);
    ctx.strokeStyle = 'rgba(235,245,250,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(c[0] - 1, ty + 1, 4.5, 2, 0, Math.PI * 1.1, Math.PI * 1.7, false);
    ctx.stroke();
    // the windlass: a roller between the posts, a crank, and a bucket on its rope
    const rl = p(PX[0], 0.5, 33);
    const rr = p(PX[1], 0.5, 33);
    line(ctx, rl, rr, 'rgba(25,14,6,0.6)', 5);
    line(ctx, rl, rr, shade(wood, 1.05), 3.4);
    line(ctx, [rl[0], rl[1] - 1.1], [rr[0], rr[1] - 1.1], shade(wood, 1.28), 1);
    const crank = p(PX[1] + 0.07, 0.5, 33);
    line(ctx, rr, crank, '#4a3420', 2);
    line(ctx, crank, [crank[0] + 1, crank[1] + 7], '#4a3420', 2);
    ellipse(ctx, crank[0] + 1, crank[1] + 8, 1.7, 1.2, '#2e2012');
    const m = p(0.5, 0.5, 33);
    const bucketTop = p(0.5, 0.5, 18);
    line(ctx, m, bucketTop, 'rgba(60,44,20,0.75)', 1.7);
    line(ctx, m, [bucketTop[0] - 0.4, bucketTop[1]], '#d9c692', 1);
    poly(ctx, [[bucketTop[0] - 4.6, bucketTop[1]], [bucketTop[0] + 4.6, bucketTop[1]], [bucketTop[0] + 3.6, bucketTop[1] + 7.5], [bucketTop[0] - 3.6, bucketTop[1] + 7.5]], '#8a6a44', 'rgba(25,14,6,0.6)', 0.8);
    line(ctx, [bucketTop[0] - 4.2, bucketTop[1] + 2.6], [bucketTop[0] + 4.2, bucketTop[1] + 2.6], '#4a4640', 0.9);
    line(ctx, [bucketTop[0] - 3.9, bucketTop[1] + 5.2], [bucketTop[0] + 3.9, bucketTop[1] + 5.2], '#4a4640', 0.9);
    // the two front posts and the little shingled gable over it all
    for (const x of PX) post(ctx, p, x, 0.86, 0, 40, 0.07, wood);
    gableR(ctx, p, PX[1], 0.1, 0.9, 0.5, 40, 56, shade(wood, 0.86), 5, 'rgba(25,14,6,0.4)');
    const roof: Roof = { x0: PX[0], x1: PX[1], ym: 0.5, yE: 0.9, zE: 40, zR: 56, ox: 0.1, oy: 0.12, base: ['#7d5a3c', '#74533a', '#86613f', '#6f5037'][v], tex: 'shingle', v };
    roofFront(ctx, p, roof);
    roofEdge(ctx, p, roof, '#2e2216');
    // a wet stain where the bucket is set down
    ellipse(ctx, c[0] + RX + 6, c[1] + 6, 4.5, 2, 'rgba(70,92,108,0.35)');
  });
}
