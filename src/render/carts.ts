// Handcarts: a two-wheeled bed on shafts that trails whoever pulls it, with the load stacked in it in proportion to what it
// really carries. Drawn procedurally from the cart's interpolated position and heading (the same convention as people), so a
// parked cart stands still and a paused world freezes the wheels.
import { weightOf } from '../sim/economy';
import { WEIGHT } from '../sim/constants';
import { hashUnit } from '../sim/rng';
import type { Cart, ItemKind, Person, World } from '../sim/types';
import { angleDiff } from '../sim/util';
import { orientedBox } from './iso3d';
import type { S3 } from './iso3d';
import { alpha, mix, shade } from './sprites';

type Ctx = CanvasRenderingContext2D;
type V3 = readonly [number, number, number];

const WOOD = ['#b98d5c', '#a67a4c', '#c79e68'] as const;
const WORN = '#7c6a58';

const BED = { u0: -0.31, u1: 0.31, v: 0.215, floor: 9.5, side: 4 } as const;
const WHEEL = { u: 0.02, v: 0.29, r: 7.6, z: 7.6 } as const;
const PX_PER_TILE = 34;

interface Roll {
  x: number;
  y: number;
  rot: number;
}

export class CartRenderer {
  private rolls = new Map<number, Roll>();

  /** Advance wheel rotation from distance rolled; zero when the world is paused because positions then do not change. */
  updateAll(world: World, alphaT: number): void {
    for (const c of world.carts) {
      const x = c.px + (c.x - c.px) * alphaT;
      const y = c.py + (c.y - c.py) * alphaT;
      let r = this.rolls.get(c.id);
      if (!r) {
        r = { x, y, rot: hashUnit(c.id, 3, 5) * 6 };
        this.rolls.set(c.id, r);
      }
      const d = Math.hypot(x - r.x, y - r.y);
      if (d < 3) r.rot += (d * PX_PER_TILE) / WHEEL.r;
      r.x = x;
      r.y = y;
    }
    if (this.rolls.size > world.carts.length + 20) {
      const live = new Set(world.carts.map((c) => c.id));
      for (const id of this.rolls.keys()) if (!live.has(id)) this.rolls.delete(id);
    }
  }

  draw(ctx: Ctx, world: World, c: Cart, alphaT: number, simT: number, selected: boolean, hovered: boolean): void {
    const x = c.px + (c.x - c.px) * alphaT;
    const y = c.py + (c.y - c.py) * alphaT;
    const hd = c.pheading + angleDiff(c.pheading, c.heading) * alphaT;
    const fx = Math.cos(hd);
    const fy = Math.sin(hd);
    const lx = -fy;
    const ly = fx;
    const S: S3 = (u, v, z) => {
      const wx = x + fx * u + lx * v;
      const wy = y + fy * u + ly * v;
      return [(wx - wy) * 32, (wx + wy) * 16 - z, wx + wy];
    };
    const base = S(0, 0, 0);
    const roll = this.rolls.get(c.id)?.rot ?? 0;

    // colours: the wood greys and cracks as the cart wears out
    const wearK = Math.min(1, c.wear / 100);
    const wood = mix(WOOD[c.variant % 3], WORN, wearK * 0.7);
    const woodDark = shade(wood, 0.72);
    const woodLit = shade(wood, 1.12);

    // shadow and selection ring
    ctx.fillStyle = 'rgba(15,25,15,0.3)';
    ctx.beginPath();
    ctx.ellipse(base[0], base[1] + 1, 21, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (selected || hovered) {
      ctx.strokeStyle = selected ? `rgba(255,214,120,${0.75 + 0.2 * Math.sin(simT * 4)})` : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = selected ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.ellipse(base[0], base[1] + 1, 24, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // who is pulling: the shafts meet their hands
    const puller = c.puller ? world.byId.get(c.puller) : undefined;
    let handL: V3 | null = null;
    let handR: V3 | null = null;
    if (puller && puller.ent === 'person') {
      [handL, handR] = this.hands(puller, alphaT);
    }
    const parked = !handL;

    // which side is the far one decides the drawing order
    const farSign = S(0, 1, 0)[2] < S(0, -1, 0)[2] ? 1 : -1;
    const wheel = (side: number) => this.wheel(ctx, S, side * WHEEL.v, roll, wood, woodDark);
    const shaft = (side: number) => {
      const a = S(BED.u1 - 0.03, side * 0.15, 10.5);
      let b: V3;
      if (handL && handR) b = side > 0 ? handL : handR;
      else b = S(0.86, side * 0.15, 1.6);
      // limit how far a shaft may reach from the bed
      const reach = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (reach > 56) {
        const k = 56 / reach;
        b = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, b[2]];
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(30,18,8,0.55)';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = woodLit;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    };

    // far wheel and far shaft first
    wheel(farSign);
    shaft(farSign);

    // the bed: floor, far and end boards
    this.bed(ctx, S, fx, fy, wood, woodDark);

    // the load, then the near side of the bed over it
    this.load(ctx, S, fx, fy, c);
    this.nearBoards(ctx, S, fx, fy, wood, woodDark, woodLit);

    // near shaft and wheel
    shaft(-farSign);
    wheel(-farSign);

    // a little prop under a parked cart's shafts
    if (parked) {
      const t = S(0.8, 0, 0);
      ctx.strokeStyle = 'rgba(30,18,8,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t[0] - 2, t[1] + 0.5);
      ctx.lineTo(t[0] + 2, t[1] + 0.5);
      ctx.stroke();
    }
  }

  /** world positions (as iso px) of the puller's two hands: the cart's shafts are drawn to meet them */
  private hands(p: Person, alphaT: number): [V3, V3] {
    const px = p.px + (p.x - p.px) * alphaT;
    const py = p.py + (p.y - p.py) * alphaT;
    const hd = p.pheading + angleDiff(p.pheading, p.heading) * alphaT;
    const fx = Math.cos(hd);
    const fy = Math.sin(hd);
    const lx = -fy;
    const ly = fx;
    const at = (v: number): V3 => {
      const wx = px + fx * HAND_U + lx * v;
      const wy = py + fy * HAND_U + ly * v;
      return [(wx - wy) * 32, (wx + wy) * 16 - HAND_Z, wx + wy];
    };
    return [at(HAND_V), at(-HAND_V)];
  }

  private wheel(ctx: Ctx, S: S3, v: number, rot: number, wood: string, dark: string): void {
    const ru = WHEEL.r / PX_PER_TILE;
    const c = S(WHEEL.u, v, WHEEL.z);
    const ring = (r: number, steps: number): V3[] => {
      const pts: V3[] = [];
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        pts.push(S(WHEEL.u + Math.cos(a) * ru * (r / WHEEL.r), v, WHEEL.z + Math.sin(a) * r));
      }
      return pts;
    };
    const outer = ring(WHEEL.r, 18);
    // tyre
    ctx.beginPath();
    ctx.moveTo(outer[0][0], outer[0][1]);
    for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i][0], outer[i][1]);
    ctx.closePath();
    ctx.fillStyle = 'rgba(40,26,14,0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,0.8)';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = shade(wood, 1.05);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // spokes, turning as the cart rolls
    ctx.strokeStyle = shade(wood, 0.95);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = rot + (k * Math.PI) / 3;
      const t = S(WHEEL.u + Math.cos(a) * ru * 0.92, v, WHEEL.z + Math.sin(a) * WHEEL.r * 0.92);
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(t[0], t[1]);
    }
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(c[0], c[1], 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  private bed(ctx: Ctx, S: S3, fx: number, fy: number, wood: string, dark: string): void {
    const { u0, u1, v, floor, side } = BED;
    // floor planks
    orientedBox(ctx, S, fx, fy, u0, u1, -v, v, floor - 2, floor, { top: shade(wood, 0.8), lit: shade(wood, 0.7), dark: shade(wood, 0.55), stroke: 'rgba(30,18,8,0.55)' });
    // axle
    const a = S(WHEEL.u, -WHEEL.v, WHEEL.z);
    const b = S(WHEEL.u, WHEEL.v, WHEEL.z);
    ctx.strokeStyle = 'rgba(30,18,8,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    // the boards that stand on the far side: the end and side the viewer sees the inside of
    const st = { top: wood, lit: shade(wood, 0.95), dark: dark, stroke: 'rgba(30,18,8,0.55)' };
    const far = (nx: number, ny: number) => nx + ny < 0;
    const lx = -fy;
    const ly = fx;
    if (far(fx, fy)) orientedBox(ctx, S, fx, fy, u1 - 0.03, u1, -v, v, floor, floor + side, st);
    if (far(-fx, -fy)) orientedBox(ctx, S, fx, fy, u0, u0 + 0.03, -v, v, floor, floor + side, st);
    if (far(lx, ly)) orientedBox(ctx, S, fx, fy, u0, u1, v - 0.03, v, floor, floor + side, st);
    if (far(-lx, -ly)) orientedBox(ctx, S, fx, fy, u0, u1, -v, -v + 0.03, floor, floor + side, st);
  }

  private nearBoards(ctx: Ctx, S: S3, fx: number, fy: number, wood: string, dark: string, lit: string): void {
    const { u0, u1, v, floor, side } = BED;
    const st = { top: lit, lit: wood, dark: dark, stroke: 'rgba(30,18,8,0.55)' };
    const near = (nx: number, ny: number) => nx + ny >= 0;
    const lx = -fy;
    const ly = fx;
    if (near(fx, fy)) orientedBox(ctx, S, fx, fy, u1 - 0.03, u1, -v, v, floor, floor + side, st);
    if (near(-fx, -fy)) orientedBox(ctx, S, fx, fy, u0, u0 + 0.03, -v, v, floor, floor + side, st);
    if (near(lx, ly)) orientedBox(ctx, S, fx, fy, u0, u1, v - 0.03, v, floor, floor + side, st);
    if (near(-lx, -ly)) orientedBox(ctx, S, fx, fy, u0, u1, -v, -v + 0.03, floor, floor + side, st);
  }

  // ───────────── the load ─────────────
  private load(ctx: Ctx, S: S3, fx: number, fy: number, c: Cart): void {
    const total = weightOf(c.load);
    if (total <= 0.01) return;
    // the heaviest few kinds, each in its own bay along the bed
    const kinds = (Object.keys(c.load) as ItemKind[])
      .filter((k) => (c.load[k] ?? 0) > 0)
      .map((k) => ({ k, n: c.load[k] ?? 0, w: (c.load[k] ?? 0) * WEIGHT[k] }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 3);
    const sum = kinds.reduce((s, q) => s + q.w, 0);
    const usable = BED.u1 - BED.u0 - 0.06;
    let u = BED.u0 + 0.03;
    // draw order: bays in the order that puts the farther one first
    const bays = kinds.map((q) => {
      const len = Math.max(0.17, (q.w / sum) * usable);
      const b = { ...q, u0: 0, u1: 0 };
      b.u0 = u;
      u += len;
      b.u1 = u;
      return b;
    });
    // scale the bays to fit the bed exactly
    const k = usable / Math.max(0.01, u - (BED.u0 + 0.03));
    for (const b of bays) {
      b.u0 = BED.u0 + 0.03 + (b.u0 - (BED.u0 + 0.03)) * k;
      b.u1 = BED.u0 + 0.03 + (b.u1 - (BED.u0 + 0.03)) * k;
    }
    const order = fx + fy > 0 ? bays : bays.slice().reverse();
    const floor = BED.floor;
    for (const b of order) {
      const len = b.u1 - b.u0;
      const cap = c.cap * (len / usable);
      const q = Math.min(1, b.w / Math.max(1, cap));
      const H = 3 + q * 15;
      this.pile(ctx, S, fx, fy, b.k, b.n, b.u0, b.u1, floor, H);
    }
  }

  private pile(ctx: Ctx, S: S3, fx: number, fy: number, kind: ItemKind, n: number, u0: number, u1: number, z: number, H: number): void {
    const v = BED.v - 0.035;
    const um = (u0 + u1) / 2;
    const lineAlong = (vv: number, zz: number, r: number, col: string, hi: string) => {
      const a = S(u0 + 0.02, vv, zz);
      const b = S(u1 - 0.02, vv, zz);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(25,15,8,0.55)';
      ctx.lineWidth = r * 2 + 0.9;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = hi;
      ctx.lineWidth = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] - r * 0.5);
      ctx.lineTo(b[0], b[1] - r * 0.5);
      ctx.stroke();
      // sawn ends
      const end = fx + fy > 0 ? b : a;
      ctx.fillStyle = '#dcb67e';
      ctx.beginPath();
      ctx.ellipse(end[0], end[1], r * 0.78, r * 0.96, 0.3, 0, Math.PI * 2);
      ctx.fill();
    };
    switch (kind) {
      case 'planks': {
        const layers = Math.max(1, Math.round(H / 2.2));
        const h = layers * 2.2;
        orientedBox(ctx, S, fx, fy, u0 + 0.01, u1 - 0.01, -v, v, z, z + h, { top: '#ecd2a0', lit: '#d8b680', dark: '#b08a58', stroke: 'rgba(60,38,14,0.5)' });
        // board edges on the faces we see
        this.edgeLines(ctx, S, fx, fy, u0 + 0.01, u1 - 0.01, v, z, layers, 2.2, 'rgba(90,58,24,0.5)');
        break;
      }
      case 'bricks': {
        const layers = Math.max(1, Math.round(H / 3.4));
        const h = layers * 3.4;
        orientedBox(ctx, S, fx, fy, u0 + 0.01, u1 - 0.01, -v + 0.02, v - 0.02, z, z + h, { top: '#cf6a4a', lit: '#b4573f', dark: '#8c4130', stroke: 'rgba(50,20,12,0.55)' });
        this.edgeLines(ctx, S, fx, fy, u0 + 0.01, u1 - 0.01, v - 0.02, z, layers, 3.4, 'rgba(235,200,170,0.5)');
        break;
      }
      case 'wood': {
        const rows = H > 12 ? 3 : H > 7 ? 2 : 1;
        const r = 2.7;
        for (let row = 0; row < rows; row++) {
          const cnt = 3 - row;
          // far logs first
          const lats: number[] = [];
          for (let i = 0; i < cnt; i++) lats.push((i - (cnt - 1) / 2) * 0.15);
          lats.sort((a, b) => S(0, a, 0)[2] - S(0, b, 0)[2]);
          lats.forEach((lat, i) => lineAlong(lat, z + r + row * 4.6, r, (i + row) % 2 ? '#9a6b3f' : '#b0804c', 'rgba(255,230,180,0.28)'));
        }
        break;
      }
      case 'stone':
      case 'clay':
      case 'ore':
      case 'charcoal': {
        const cols: Record<string, [string, string]> = {
          stone: ['#aaa89f', 'rgba(255,255,255,0.3)'],
          clay: ['#c98557', 'rgba(255,225,190,0.5)'],
          ore: ['#55535e', '#d98f3c'],
          charcoal: ['#2c2926', 'rgba(150,148,140,0.4)'],
        };
        const [col, hi] = cols[kind];
        const cnt = Math.max(2, Math.min(16, Math.round(H * 1.2 + n * 0.25)));
        const items: { u: number; v: number; zz: number; r: number }[] = [];
        for (let i = 0; i < cnt; i++) {
          const layer = i < cnt * 0.65 ? 0 : i < cnt * 0.92 ? 1 : 2;
          const rad = layer === 0 ? 1 : layer === 1 ? 0.6 : 0.25;
          items.push({
            u: um + (hashUnit(i, n, 7) - 0.5) * (u1 - u0 - 0.04) * rad,
            v: (hashUnit(i, n, 8) - 0.5) * (v * 1.9) * rad,
            zz: z + 2 + layer * Math.max(2.2, H * 0.28),
            r: 2.6 + hashUnit(i, n, 9) * 1.6,
          });
        }
        items.sort((a, b) => S(a.u, a.v, 0)[2] + a.zz * 0.001 - (S(b.u, b.v, 0)[2] + b.zz * 0.001));
        items.sort((a, b) => a.zz - b.zz);
        for (const it of items) {
          const p = S(it.u, it.v, it.zz);
          ctx.fillStyle = 'rgba(25,22,18,0.35)';
          ctx.beginPath();
          ctx.ellipse(p[0] + 0.5, p[1] + 1.2, it.r + 0.5, it.r * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = shade(col, 0.85 + hashUnit(Math.round(p[0]), Math.round(p[1]), 3) * 0.3);
          ctx.beginPath();
          ctx.ellipse(p[0], p[1], it.r, it.r * 0.78, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = kind === 'ore' && hashUnit(Math.round(p[0]), 2, 4) > 0.5 ? hi : alpha('#ffffff', kind === 'ore' ? 0 : 0.0);
          if (kind === 'ore') ctx.fillRect(p[0] + 0.5, p[1] - 0.5, 1.4, 1.2);
          ctx.fillStyle = kind === 'ore' ? 'rgba(180,180,190,0.35)' : hi;
          ctx.beginPath();
          ctx.ellipse(p[0] - it.r * 0.3, p[1] - it.r * 0.3, it.r * 0.45, it.r * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'flour':
      case 'grain':
      case 'seeds':
      case 'berries':
      case 'fruit':
      case 'fish':
      case 'water': {
        const body: Record<string, [string, string]> = {
          flour: ['#f5eddc', '#bfb59b'],
          grain: ['#e0c98a', '#a58a4a'],
          seeds: ['#c9b27a', '#8f7a48'],
          berries: ['#b2486a', '#7a2a44'],
          fruit: ['#e0823a', '#a85a20'],
          fish: ['#9ac1d4', '#6a93a8'],
          water: ['#6b8fb3', '#456a8c'],
        };
        const [c1, c2] = body[kind];
        const cnt = Math.max(1, Math.min(6, Math.round(H / 4.2) + 1));
        const spots: [number, number, number][] = [
          [u0 + (u1 - u0) * 0.28, -0.1, 0],
          [u0 + (u1 - u0) * 0.28, 0.1, 0],
          [u0 + (u1 - u0) * 0.72, -0.1, 0],
          [u0 + (u1 - u0) * 0.72, 0.1, 0],
          [um, -0.05, 1],
          [um, 0.07, 1],
        ];
        const order = spots.slice(0, cnt).sort((a, b) => a[2] - b[2] || S(a[0], a[1], 0)[2] - S(b[0], b[1], 0)[2]);
        for (const [su, sv, lvl] of order) {
          const p = S(su, sv, z + 2 + lvl * 6);
          const g = ctx.createRadialGradient(p[0] - 1.5, p[1] - 5, 0.5, p[0], p[1] - 3, 6);
          g.addColorStop(0, c1);
          g.addColorStop(1, c2);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(p[0] - 4.2, p[1] + 1);
          ctx.quadraticCurveTo(p[0] - 6, p[1] - 4.5, p[0] - 1.8, p[1] - 7);
          ctx.lineTo(p[0] + 1.8, p[1] - 7);
          ctx.quadraticCurveTo(p[0] + 6, p[1] - 4.5, p[0] + 4.2, p[1] + 1);
          ctx.quadraticCurveTo(p[0], p[1] + 2.4, p[0] - 4.2, p[1] + 1);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(50,34,16,0.5)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.fillStyle = shade(c2, 0.8);
          ctx.fillRect(p[0] - 2.4, p[1] - 7.6, 4.8, 1.6);
        }
        break;
      }
      case 'bread': {
        const p = S(um, 0, z + 1.5);
        // a basket heaped with loaves
        ctx.fillStyle = '#b98a4f';
        ctx.strokeStyle = 'rgba(70,45,20,0.65)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(p[0] - 9, p[1] - 5);
        ctx.lineTo(p[0] + 9, p[1] - 5);
        ctx.lineTo(p[0] + 7, p[1] + 2);
        ctx.quadraticCurveTo(p[0], p[1] + 4.5, p[0] - 7, p[1] + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        const loaves = Math.max(2, Math.min(7, Math.round(n / 1.2)));
        for (let i = 0; i < loaves; i++) {
          const lx = p[0] + ((i % 4) - 1.5) * 5.2;
          const ly = p[1] - 7 - Math.floor(i / 4) * 3 + (i % 2) * 0.6;
          ctx.fillStyle = '#c4863c';
          ctx.beginPath();
          ctx.ellipse(lx, ly, 3.6, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(246,200,130,0.7)';
          ctx.beginPath();
          ctx.ellipse(lx - 0.9, ly - 0.7, 1.9, 1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'iron': {
        const layers = Math.max(1, Math.min(4, Math.round(H / 3)));
        for (let l = 0; l < layers; l++) {
          for (let i = 0; i < 3; i++) {
            const vv = (i - 1) * 0.1;
            orientedBox(ctx, S, fx, fy, u0 + 0.02, u1 - 0.02, vv - 0.035, vv + 0.035, z + l * 2.8, z + l * 2.8 + 2.6, { top: '#8f95a3', lit: '#656b79', dark: '#454a56', stroke: 'rgba(15,15,22,0.55)' });
          }
        }
        break;
      }
      case 'handles': {
        for (let i = 0; i < Math.max(4, Math.min(12, n)); i++) {
          const vv = ((i % 4) - 1.5) * 0.07;
          const zz = z + 1.3 + Math.floor(i / 4) * 2;
          const a = S(u0 + 0.02, vv, zz);
          const b = S(u1 - 0.02, vv, zz);
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(40,25,10,0.5)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.strokeStyle = i % 2 ? '#c89a62' : '#d8ae78';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
        break;
      }
      default: {
        // anything else rides in a crate
        orientedBox(ctx, S, fx, fy, u0 + 0.02, u1 - 0.02, -0.14, 0.14, z, z + Math.min(H, 9), { top: '#d4a96b', lit: '#a77a47', dark: '#86602f', stroke: 'rgba(40,25,10,0.5)' });
      }
    }
  }

  /** courses on the faces of a stack that we can see */
  private edgeLines(ctx: Ctx, S: S3, fx: number, fy: number, u0: number, u1: number, v: number, z: number, layers: number, layerH: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const lx = -fy;
    const ly = fx;
    const sv = lx + ly > 0 ? v : -v;
    const su = fx + fy > 0 ? u1 : u0;
    for (let i = 1; i < layers; i++) {
      const zz = z + i * layerH;
      const a = S(u0, sv, zz);
      const b = S(u1, sv, zz);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      const c = S(su, -v, zz);
      const d = S(su, v, zz);
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
    }
    ctx.stroke();
  }
}

// where the puller's hands are, shared with the character rig so shafts and hands meet
export const HAND_U = -0.06;
export const HAND_V = 0.11;
export const HAND_Z = 9;
