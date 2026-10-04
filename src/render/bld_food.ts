// Granary, bakery and hall.
//   granary  raised on stilts with stone caps, slatted bins, a ladder and a steep thatched roof
//   bakery   a brick workroom with a round brick oven dome in front, a thin flue and a hanging loaf sign
//   hall     a long half-timbered hall with a big arched door, a steep roof with a smoke louvre and a pennant
import { box, boxTones, coursesL, cylinder, dome, domeCourses, faceL, faceR, jointsL } from './iso3d';
import { brickFaceL, brickFaceR, chimneyStack, doorL, gableR, groundPatch, roofEdge, roofFront, scatter, windowL } from './bld_common';
import type { Roof } from './bld_common';
import { SpriteCache, ellipse, groundShadow, line, mk, plankLines, poly, shade } from './sprites';
import type { Sprite } from './sprites';

// ───────────────────────────── granary (2 x 2) ─────────────────────────────
export const GRANARY = { legs: 19, floor: 21, bin: 56, ridge: 96, x0: 0.15, x1: 1.85, y0: 0.15, y1: 1.85 } as const;

/** stilts, floor and the dark backing of the bins: the dynamic grain fill is painted on top of this and under the slats */
export function granaryBack(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`granary_b${v}`, 192, 200, 96, 144, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 62, 24, 0.3, 4);
    // hard-packed ground and dropped grain
    groundPatch(ctx, p, 0.1, 1.9, 0.1, 2.45, 'rgba(150,120,80,0.35)');
    scatter(ctx, p, 0.2, 1.8, 0.3, 2.3, 18, v + 2, ['rgba(226,196,110,0.8)', 'rgba(120,96,60,0.5)'], 1.2);
    const wood = ['#8a6a44', '#806040', '#92704a', '#7a5c3c'][v];
    const { legs: L, floor: F, x0, x1, y0, y1 } = GRANARY;
    const stilt = (x: number, y: number) => {
      const b = p(x, y, 0);
      const top = p(x, y, L);
      // post and a round staddle-stone cap that keeps the vermin out
      line(ctx, b, top, 'rgba(25,14,6,0.55)', 5.4);
      line(ctx, b, top, wood, 3.8);
      line(ctx, [b[0] - 0.8, b[1]], [top[0] - 0.8, top[1]], 'rgba(255,230,180,0.2)', 1.1);
      cylinder(ctx, top[0], top[1] + 1.5, 7.2, 3.2, '#bcb7aa', '#8d887d', '#cfcabd');
    };
    // back legs first, then the front ones
    stilt(x0 + 0.1, y0 + 0.1);
    stilt(1.0, y0 + 0.1);
    stilt(x1 - 0.1, y0 + 0.1);
    stilt(x0 + 0.1, 1.0);
    stilt(x1 - 0.1, 1.0);
    stilt(x0 + 0.1, y1 - 0.1);
    stilt(1.0, y1 - 0.1);
    stilt(x1 - 0.1, y1 - 0.1);
    // floor frame
    box(ctx, p, x0 - 0.04, x1 + 0.04, y0 - 0.04, y1 + 0.04, F - 3, F, boxTones('#6d5236', 'rgba(25,14,6,0.55)'));
    // dark inside of the bins
    faceL(ctx, p, x0, x1, y1 - 0.03, F, GRANARY.bin, '#2b1f15');
    faceR(ctx, p, x1 - 0.03, y0, y1, F, GRANARY.bin, '#21170f');
  });
}

/** slats, door, ladder and roof */
export function granaryFront(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`granary_f${v}`, 192, 200, 96, 144, (ctx) => {
    const p = mk(2, 2);
    const wood = ['#c9a56e', '#c0a064', '#cfae78', '#b99a60'][v];
    const dark = '#5d4228';
    const { floor: F, bin: B, x0, x1, y0, y1 } = GRANARY;
    // slats: upright boards with gaps between them
    const n = 13;
    for (let i = 0; i < n; i++) {
      const a = x0 + ((x1 - x0) * i) / n + 0.02;
      const b = x0 + ((x1 - x0) * (i + 1)) / n - 0.02;
      faceL(ctx, p, a, b, y1, F, B, i % 2 ? shade(wood, 0.95) : wood, 'rgba(70,46,20,0.5)', 0.6);
    }
    for (let i = 0; i < n; i++) {
      const a = y0 + ((y1 - y0) * i) / n + 0.02;
      const b = y0 + ((y1 - y0) * (i + 1)) / n - 0.02;
      faceR(ctx, p, x1, a, b, F, B, shade(i % 2 ? shade(wood, 0.95) : wood, 0.78), 'rgba(70,46,20,0.5)', 0.6);
    }
    // binding rails
    for (const z of [F + 1.5, 38, B - 1.5]) {
      line(ctx, p(x0 - 0.02, y1 + 0.02, z), p(x1 + 0.02, y1 + 0.02, z), dark, 2.2);
      line(ctx, p(x1 + 0.02, y0 - 0.02, z), p(x1 + 0.02, y1 + 0.02, z), shade(dark, 0.8), 2.2);
    }
    for (const x of [x0, x1]) line(ctx, p(x, y1 + 0.02, F), p(x, y1 + 0.02, B), dark, 2.6);
    // small hatch door
    poly(ctx, [p(0.42, y1 + 0.03, F + 1), p(0.86, y1 + 0.03, F + 1), p(0.86, y1 + 0.03, F + 21), p(0.42, y1 + 0.03, F + 21)], '#7a5a38', '#2c1b10', 1.2);
    line(ctx, p(0.64, y1 + 0.03, F + 1), p(0.64, y1 + 0.03, F + 21), 'rgba(20,10,4,0.55)', 0.9);
    line(ctx, p(0.42, y1 + 0.03, F + 21), p(0.86, y1 + 0.03, F + 1), 'rgba(20,10,4,0.4)', 0.9);
    ctx.fillStyle = '#d8b34a';
    const kn = p(0.8, y1 + 0.03, F + 10);
    ctx.beginPath();
    ctx.arc(kn[0], kn[1], 1, 0, Math.PI * 2);
    ctx.fill();
    // landing and ladder
    box(ctx, p, 0.32, 0.96, y1 + 0.02, y1 + 0.3, F - 1.5, F + 0.5, boxTones('#8a6a44'));
    const rail = (x: number) => {
      line(ctx, p(x, y1 + 0.6, 0), p(x, y1 + 0.28, F + 0.5), 'rgba(25,14,6,0.55)', 3);
      line(ctx, p(x, y1 + 0.6, 0), p(x, y1 + 0.28, F + 0.5), '#8a6a44', 2);
    };
    rail(0.4);
    rail(0.88);
    for (let i = 1; i < 6; i++) {
      const t = i / 6.5;
      line(ctx, p(0.4, y1 + 0.6 - 0.32 * t, (F + 0.5) * t), p(0.88, y1 + 0.6 - 0.32 * t, (F + 0.5) * t), '#a88358', 1.5);
    }
    // steep thatched roof with a deep overhang
    const roof: Roof = { x0, x1, ym: 1.0, yE: y1, zE: B - 2, zR: GRANARY.ridge - 2, ox: 0.2, oy: 0.2, base: ['#d6b468', '#cca95e', '#dcba70', '#c4a258'][v], tex: 'thatch', v };
    gableR(ctx, p, x1, y0, y1, 1.0, B, GRANARY.ridge - 12, shade(wood, 0.72), 14, 'rgba(70,46,20,0.5)');
    roofFront(ctx, p, roof);
    roofEdge(ctx, p, roof, '#6b4a22');
    // crossed finials on the ridge
    const fa = p(x1 + 0.2, 1.0, GRANARY.ridge);
    line(ctx, [fa[0] - 4, fa[1] - 8], [fa[0] + 4, fa[1] + 2], '#5d4228', 1.6);
    line(ctx, [fa[0] + 4, fa[1] - 8], [fa[0] - 4, fa[1] + 2], '#5d4228', 1.6);
  });
}

// ───────────────────────────── bakery (2 x 2) ─────────────────────────────
export const BAKERY = { dome: { x: 1.52, y: 1.6, z: 32 }, chimney: { x: 1.52, y: 1.6, z: 82 }, mouth: { x: 1.52, y: 2.0, z: 8 } } as const;

export function bakerySprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`bakery${v}`, 188, 190, 94, 134, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 68, 26, 0.32, 4);
    groundPatch(ctx, p, 0.05, 1.95, 0.05, 1.95, 'rgba(176,150,112,0.4)');
    scatter(ctx, p, 0.2, 1.9, 1.2, 1.95, 20, v + 4, ['rgba(250,244,228,0.8)', 'rgba(150,120,80,0.5)'], 1.3);
    const brick = ['#b9593f', '#b05238', '#c0634a', '#a84d36'][v];
    const x0 = 0.1;
    const x1 = 1.9;
    const y0 = 0.1;
    const y1 = 1.2;
    const ym = 0.65;
    const WT = 30;
    // stone footing, brick walls with pale corner stones
    faceL(ctx, p, x0 - 0.03, x1 + 0.03, y1 + 0.03, 0, 5, '#b3ada0', 'rgba(30,30,28,0.45)', 0.8);
    faceR(ctx, p, x1 + 0.03, y0 - 0.03, y1 + 0.03, 0, 5, '#8c877b', 'rgba(30,30,28,0.45)', 0.8);
    brickFaceL(ctx, p, x0, x1, y1, 5, WT, { base: brick });
    brickFaceR(ctx, p, x1, y0, y1, 5, WT, { base: brick });
    for (let i = 0; i < 5; i++) {
      const z = 6 + i * 5;
      line(ctx, p(x0, y1, z), p(x0 + 0.1, y1, z), '#e3d9bf', 3.6);
      line(ctx, p(x1 - 0.1, y1, z), p(x1, y1, z), '#e3d9bf', 3.6);
    }
    gableR(ctx, p, x1, y0, y1, ym, WT, 52, shade(brick, 0.7), 0);
    // brick courses in the gable
    for (let i = 1; i < 6; i++) {
      const z = WT + i * 3.6;
      const k = 1 - (i * 3.6) / 22;
      line(ctx, p(x1, ym - 0.275 * k, z), p(x1, ym + 0.275 * k, z), 'rgba(235,205,175,0.3)', 0.6);
    }
    // door, window, and a hanging loaf sign
    doorL(ctx, p, 0.3, 0.7, y1, 5, 27, { fill: '#5b3a22', frame: '#2c1b10', arch: true, planks: 3, knob: '#e0b848', strap: '#2a2420' });
    windowL(ctx, p, 1.25, 1.55, y1, 12, 24, { frame: '#e8dcc0', glass: '#e9bf72', shutter: '#6a4a38' });
    line(ctx, p(0.92, y1, 26), p(0.92, y1 + 0.2, 26), '#2a2420', 1.5);
    line(ctx, p(0.92, y1 + 0.2, 26), p(0.92, y1 + 0.2, 21), '#2a2420', 1);
    const lf = p(0.92, y1 + 0.2, 19);
    ctx.fillStyle = '#7a4a1e';
    ctx.beginPath();
    ctx.ellipse(lf[0], lf[1] + 0.8, 6.2, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    const lg = ctx.createRadialGradient(lf[0] - 1.5, lf[1] - 1.5, 0.5, lf[0], lf[1], 6.5);
    lg.addColorStop(0, '#f6cc82');
    lg.addColorStop(1, '#c78a3e');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(lf[0], lf[1], 6, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,20,0.65)';
    ctx.lineWidth = 0.8;
    for (const dx of [-2.6, 0, 2.6]) {
      ctx.beginPath();
      ctx.moveTo(lf[0] + dx - 0.8, lf[1] - 1.8);
      ctx.lineTo(lf[0] + dx + 0.8, lf[1] + 1.6);
      ctx.stroke();
    }
    // wood-shingle roof
    const roof: Roof = { x0, x1, ym, yE: y1, zE: 27, zR: 54, ox: 0.15, oy: 0.17, base: ['#7a6450', '#725d4a', '#826b56', '#6c5744'][v], tex: 'shingle', v };
    roofFront(ctx, p, roof);
    roofEdge(ctx, p, roof, '#3a2c22');

    // the oven: a round brick dome in front of the right-hand side, with an iron-framed mouth and a thin flue
    const c = p(BAKERY.dome.x, BAKERY.dome.y, 0);
    cylinder(ctx, c[0], c[1], 24, 3.5, '#b3ada0', '#86817a', '#a39e92');
    dome(ctx, c[0], c[1] - 3.5, 21, 27, '#d98a6c', '#b45f45', '#703624');
    domeCourses(ctx, c[0], c[1] - 3.5, 21, 27, 7, 'rgba(235,205,175,0.34)');
    ctx.strokeStyle = 'rgba(235,205,175,0.25)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 7; i++) {
      const t0 = i / 7;
      const t1 = (i + 1) / 7;
      const r0 = Math.cos(Math.asin(t0));
      const r1 = Math.cos(Math.asin(Math.min(0.999, t1)));
      const nn = Math.max(3, Math.round(8 * r0));
      for (let k = 0; k <= nn; k++) {
        const th = ((k + (i % 2 ? 0.5 : 0)) / nn) * Math.PI;
        if (th <= 0.03 || th >= Math.PI - 0.03) continue;
        ctx.beginPath();
        ctx.moveTo(c[0] + Math.cos(th) * 21 * r0, c[1] - 3.5 - 27 * t0 + Math.sin(th) * 10.5 * r0);
        ctx.lineTo(c[0] + Math.cos(th) * 21 * r1, c[1] - 3.5 - 27 * t1 + Math.sin(th) * 10.5 * r1);
        ctx.stroke();
      }
    }
    // flue
    chimneyStack(ctx, p, BAKERY.chimney.x, BAKERY.chimney.y - 0.1, 0.075, 28, 80, '#a85238', '#8d887d');
    // mouth
    box(ctx, p, 1.28, 1.76, 1.82, 2.02, 0, 15, { top: '#cb7a5c', left: '#b45f45', right: '#8a4632', stroke: 'rgba(50,20,12,0.55)', lw: 0.9 });
    doorL(ctx, p, 1.4, 1.64, 2.02, 1.5, 11.5, { fill: '#170d08', frame: '#3a3430', arch: true });
    const gm = p(1.52, 2.02, 3);
    const gg = ctx.createRadialGradient(gm[0], gm[1], 0.5, gm[0], gm[1], 8);
    gg.addColorStop(0, 'rgba(255,170,70,0.5)');
    gg.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(gm[0] - 9, gm[1] - 9, 18, 16);
    // quern by the door: a stone disc with a wooden handle
    const q = p(0.52, 1.66, 0);
    cylinder(ctx, q[0], q[1], 10, 4.4, '#c5c1b4', '#97938a', '#d4d0c4');
    ellipse(ctx, q[0], q[1] - 4.4, 3.2, 1.6, '#8a867c');
    line(ctx, [q[0] + 1, q[1] - 5], [q[0] + 7, q[1] - 12], '#7a5434', 1.8);
  });
}

// ───────────────────────────── hall (3 x 3) ─────────────────────────────
export const HALL = { plinth: 9, wall: 52, ridge: 112, louvre: { x: 1.5, y: 1.5, z: 126 }, door: { x0: 1.1, x1: 1.9 } } as const;

export function hallSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`hall${v}`, 240, 252, 120, 172, (ctx) => {
    const p = mk(3, 3);
    groundShadow(ctx, 104, 38, 0.34, 4);
    groundPatch(ctx, p, 0.0, 3.0, 0.0, 3.3, 'rgba(176,150,112,0.28)');
    const x0 = 0.1;
    const x1 = 2.9;
    const y0 = 0.1;
    const y1 = 2.9;
    const ym = 1.5;
    const { plinth: PL, wall: WT, ridge: RG } = HALL;
    const plaster = ['#eadcb8', '#e2d4ae', '#efe2c2', '#dccfa8'][v];
    const timber = '#4a3626';
    // a deep stone plinth with a step in front of the door
    faceL(ctx, p, x0 - 0.05, x1 + 0.05, y1 + 0.05, 0, PL, '#b0ab9d', 'rgba(30,30,28,0.45)', 0.8);
    faceR(ctx, p, x1 + 0.05, y0 - 0.05, y1 + 0.05, 0, PL, '#8a857a', 'rgba(30,30,28,0.45)', 0.8);
    coursesL(ctx, p, x0 - 0.05, x1 + 0.05, y1 + 0.05, 0, PL, 2, 'rgba(40,40,36,0.3)');
    jointsL(ctx, p, x0 - 0.05, x1 + 0.05, y1 + 0.05, 0, PL, 2, 9, 'rgba(40,40,36,0.28)');
    box(ctx, p, 1.0, 2.0, y1 + 0.05, y1 + 0.3, 0, 3.4, boxTones('#a9a499'));
    box(ctx, p, 1.1, 1.9, y1 + 0.3, y1 + 0.52, 0, 1.8, boxTones('#a9a499'));
    // plastered walls in a heavy timber frame
    faceL(ctx, p, x0, x1, y1, PL, WT, plaster, 'rgba(60,40,20,0.5)', 0.9);
    faceR(ctx, p, x1, y0, y1, PL, WT, shade(plaster, 0.8), 'rgba(60,40,20,0.5)', 0.9);
    const studs = [x0, 0.8, 1.1, 1.9, 2.2, x1];
    for (const x of studs) line(ctx, p(x, y1, PL), p(x, y1, WT), timber, 2.8);
    for (const y of [y0, 0.8, 1.5, 2.2, y1]) line(ctx, p(x1, y, PL), p(x1, y, WT), shade(timber, 0.85), 2.8);
    for (const z of [PL + 1, 30, WT]) {
      line(ctx, p(x0, y1, z), p(x1, y1, z), timber, z === WT ? 3.4 : 2.4);
      line(ctx, p(x1, y0, z), p(x1, y1, z), shade(timber, 0.85), z === WT ? 3.4 : 2.4);
    }
    // diagonal braces
    line(ctx, p(x0, y1, PL), p(0.8, y1, 30), timber, 2);
    line(ctx, p(0.8, y1, WT), p(x0, y1, 30), timber, 2);
    line(ctx, p(2.2, y1, PL), p(x1, y1, 30), timber, 2);
    line(ctx, p(x1, y1, WT), p(2.2, y1, 30), timber, 2);
    for (const [ya, yb] of [
      [y0, 0.8],
      [1.5, 2.2],
    ]) {
      line(ctx, p(x1, ya, PL), p(x1, yb, 30), shade(timber, 0.85), 2);
      line(ctx, p(x1, ya, 30), p(x1, yb, PL), shade(timber, 0.85), 2);
    }
    // gable end: a king post, braces and a round window
    gableR(ctx, p, x1, y0, y1, ym, WT, RG - 10, shade(plaster, 0.7), 0);
    line(ctx, p(x1, ym, WT), p(x1, ym, RG - 11), shade(timber, 0.85), 2.6);
    line(ctx, p(x1, y0 + 0.15, WT), p(x1, ym, WT + 26), shade(timber, 0.85), 2);
    line(ctx, p(x1, y1 - 0.15, WT), p(x1, ym, WT + 26), shade(timber, 0.85), 2);
    const rw = p(x1, ym + 0.35, WT + 14);
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.ellipse(rw[0], rw[1], 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#34495a';
    ctx.beginPath();
    ctx.ellipse(rw[0], rw[1], 3.6, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // big arched double door and lanterns either side
    doorL(ctx, p, HALL.door.x0, HALL.door.x1, y1, PL, 41, { fill: '#4f3320', frame: '#241810', arch: true, planks: 6, strap: '#241c18', knob: '#d8b34a' });
    line(ctx, p(1.5, y1, PL), p(1.5, y1, 41), '#1a110a', 1.6);
    for (const lx of [0.98, 2.02]) {
      line(ctx, p(lx, y1, 36), p(lx, y1 + 0.14, 36), '#2a2420', 1.5);
      const lp = p(lx, y1 + 0.14, 31);
      poly(ctx, [[lp[0] - 2.6, lp[1] - 4], [lp[0] + 2.6, lp[1] - 4], [lp[0] + 2.2, lp[1] + 3], [lp[0] - 2.2, lp[1] + 3]], '#d9a850', '#2a2420', 0.9);
    }
    // shuttered windows to each side
    windowL(ctx, p, 0.34, 0.62, y1, 22, 38, { frame: '#e8dcc0', glass: '#47606f', shutter: '#6a4a3a' });
    windowL(ctx, p, 2.38, 2.66, y1, 22, 38, { frame: '#e8dcc0', glass: '#47606f', shutter: '#6a4a3a' });

    // steep shingled roof, deep eaves
    const roof: Roof = { x0, x1, ym, yE: y1, zE: 53, zR: RG, ox: 0.2, oy: 0.2, base: ['#8a6446', '#80593c', '#936c4c', '#76533a'][v], tex: 'shingle', v };
    roofFront(ctx, p, roof);
    roofEdge(ctx, p, roof, '#3a2518');
    // the smoke louvre on the ridge
    const lx0 = 1.2;
    const lx1 = 1.8;
    box(ctx, p, lx0, lx1, 1.38, 1.62, RG - 1, RG + 13, { top: '#6a4a32', left: '#8a6446', right: '#5e4030', stroke: 'rgba(30,18,10,0.6)', lw: 0.9 });
    for (let i = 1; i < 7; i++) {
      const x = lx0 + ((lx1 - lx0) * i) / 7;
      line(ctx, p(x, 1.62, RG + 1), p(x, 1.62, RG + 12), 'rgba(15,8,4,0.7)', 1);
    }
    poly(ctx, [p(lx0 - 0.06, 1.66, RG + 13), p(lx1 + 0.06, 1.66, RG + 13), p(lx1 + 0.06, 1.5, RG + 21), p(lx0 - 0.06, 1.5, RG + 21)], '#5e3f2a', 'rgba(25,14,8,0.6)', 0.9);
    // crossed finials and a pennant on the gable end
    const fa = p(x1 + 0.22, ym, RG);
    line(ctx, [fa[0] - 5, fa[1] - 10], [fa[0] + 5, fa[1] + 3], '#3a2518', 2);
    line(ctx, [fa[0] + 5, fa[1] - 10], [fa[0] - 5, fa[1] + 3], '#3a2518', 2);
    line(ctx, [fa[0], fa[1] - 2], [fa[0], fa[1] - 26], '#3a2518', 1.5);
    poly(ctx, [[fa[0], fa[1] - 26], [fa[0] + 14, fa[1] - 22], [fa[0], fa[1] - 17]], '#c0453a', 'rgba(60,15,10,0.6)', 0.7);
  });
}
