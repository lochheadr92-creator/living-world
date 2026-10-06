// Construction sites, in visibly different stages. What is drawn follows the site's real state:
//   marked out      pegs and a taut cord round the plot, cleared ground
//   materials       heaps of what has actually been delivered (logs, stone, planks, bricks...), in proportion to the amount
//   foundation      a stone footing laid course by course
//   frame           posts rise, then the plates and braces, then the roof timbers
//   walls and roof  the finished building is revealed from the ground up, behind a scaffold
// A site whose work is capped waiting for materials stands still, with an amber bar and a badge naming what it lacks.
// A home being rebuilt (site.upgradeOf) is not a second building: the old hut stays, and the new walls and roof rise over it
// inside a scaffold, with the planks and bricks stacked beside it.
import { hashUnit } from '../sim/rng';
import type { Building, BuildingType, ItemKind, Site, World } from '../sim/types';
import { box, boxTones } from './iso3d';
import type { P3 } from './iso3d';
import { ITEM_COLORS } from './palette';
import { stackSprite } from './goods';
import type { StackKind } from './goods';
import { SpriteCache, blit, ellipse, line, mk, poly, shade } from './sprites';
import { STRUCT, buildingLayers } from './structures';
import type { BuildKind } from './structures';

type Ctx = CanvasRenderingContext2D;

const iso = (wx: number, wy: number): [number, number] => [(wx - wy) * 32, (wx + wy) * 16];
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

interface Spec {
  /** how the structure first shows above the footing */
  frame: 'timber' | 'posts' | 'poles' | 'none';
  /** a gable roof whose rafters are framed before it is laid */
  gable: boolean;
  footing: 'blocks' | 'ring' | 'none';
  /** where along the build (0..1) the finished building starts to be revealed */
  reveal: number;
}

const SPEC: Record<BuildingType, Spec> = {
  lean_to: { frame: 'poles', gable: false, footing: 'none', reveal: 0.3 },
  hut: { frame: 'timber', gable: true, footing: 'blocks', reveal: 0.3 },
  house: { frame: 'timber', gable: true, footing: 'blocks', reveal: 0.22 },
  storehouse: { frame: 'timber', gable: true, footing: 'blocks', reveal: 0.3 },
  fire: { frame: 'none', gable: false, footing: 'none', reveal: 1 },
  timber_yard: { frame: 'posts', gable: false, footing: 'none', reveal: 0.42 },
  quarry: { frame: 'none', gable: false, footing: 'none', reveal: 0.15 },
  kiln: { frame: 'none', gable: false, footing: 'ring', reveal: 0.16 },
  smithy: { frame: 'timber', gable: true, footing: 'blocks', reveal: 0.32 },
  granary: { frame: 'none', gable: false, footing: 'none', reveal: 0.1 },
  bakery: { frame: 'timber', gable: true, footing: 'blocks', reveal: 0.3 },
  smokehouse: { frame: 'timber', gable: true, footing: 'blocks', reveal: 0.32 },
  hall: { frame: 'timber', gable: true, footing: 'blocks', reveal: 0.3 },
};

/** the order materials are stacked round a site, and which side of the plot each one goes to */
const PILE_ORDER: ItemKind[] = ['wood', 'stone', 'planks', 'bricks', 'handles', 'clay', 'iron', 'charcoal', 'ore', 'flour', 'bread'];

function stackKindOf(k: ItemKind): StackKind | null {
  switch (k) {
    case 'wood':
    case 'stone':
    case 'planks':
    case 'bricks':
    case 'handles':
    case 'clay':
    case 'iron':
    case 'charcoal':
    case 'ore':
    case 'flour':
    case 'bread':
      return k;
    default:
      return null;
  }
}

/** how far the work may go with the materials that have arrived (the same rule the builders obey) */
export function allowedFraction(s: Site): number {
  let f = 1;
  for (const k in s.required) {
    const need = s.required[k as ItemKind] ?? 0;
    if (need <= 0) continue;
    f = Math.min(f, ((s.delivered[k as ItemKind] ?? 0) + (s.used[k as ItemKind] ?? 0)) / need);
  }
  return clamp01(f);
}

export function missingMaterials(s: Site): { kind: ItemKind; n: number }[] {
  const out: { kind: ItemKind; n: number }[] = [];
  for (const k of Object.keys(s.required) as ItemKind[]) {
    const n = (s.required[k] ?? 0) - (s.delivered[k] ?? 0) - (s.used[k] ?? 0);
    if (n > 0) out.push({ kind: k, n });
  }
  return out;
}

export function siteIsWaiting(s: Site): boolean {
  if (s.work >= s.workTotal - 1e-6) return false;
  return s.work >= s.workTotal * Math.min(1, 0.06 + allowedFraction(s)) - 1e-6;
}

export class SiteDrawer {
  constructor(private cache: SpriteCache) {}

  draw(ctx: Ctx, s: Site, world: World, simT: number): void {
    const [cx, cy] = iso(s.x + s.w / 2, s.y + s.h / 2);
    const f = s.workTotal > 0 ? clamp01(s.work / s.workTotal) : 0;
    const spec = SPEC[s.type];
    const meta = s.type === 'fire' ? null : STRUCT[s.type as BuildKind];
    const upgrade = !!s.upgradeOf;
    const p = mk(s.w, s.h);
    const usedAny = Object.keys(s.used).some((k) => (s.used[k as ItemKind] ?? 0) > 0);

    ctx.save();
    ctx.translate(cx, cy);

    // ── ground: cleared plot, chalked outline, pegs and cord ──
    if (!upgrade) this.plot(ctx, p, s, f, simT);
    else this.trampled(ctx, p, s);

    // ── materials stacked round the plot: those behind the structure first ──
    const piles = this.pilePlan(s);
    for (const pl of piles) if (pl.back) blit(ctx, pl.spr, pl.x, pl.y);

    // ── the structure ──
    let top = 8;
    if (s.type === 'fire') {
      const n = Math.ceil(f * 9);
      for (let k = 0; k < n; k++) {
        const a = (k / 9) * Math.PI * 2;
        ellipse(ctx, Math.cos(a) * 12, 3 + Math.sin(a) * 6, 4, 3, shade('#a8a79f', 0.85 + (k % 3) * 0.08));
      }
      top = 22;
    } else if (meta) {
      // the finished building will take this variant, so the reveal does not change look at the moment it is done
      const old = upgrade ? world.byId.get(s.upgradeOf as number) : undefined;
      const variant = old && old.ent === 'building' ? (old as Building).variant : Math.floor(hashUnit(s.x, s.y, 77) * 4);
      top = this.structure(ctx, p, s, spec, meta, f, usedAny, upgrade, simT, variant);
    }

    for (const pl of piles) if (!pl.back) blit(ctx, pl.spr, pl.x, pl.y);
    ctx.restore();

    this.badge(ctx, s, cx, cy, f, top, simT, world);
  }

  // ───────────── ground ─────────────
  private plot(ctx: Ctx, p: P3, s: Site, f: number, simT: number): void {
    const { w, h } = s;
    const c = [p(0, 0), p(w, 0), p(w, h), p(0, h)];
    poly(ctx, c, 'rgba(150,118,76,0.62)');
    // freshly dug earth within the plot grows with the work
    if (f > 0.01) {
      const g = 0.08 + 0.1 * Math.min(1, f * 3);
      poly(ctx, [p(g, g), p(w - g, g), p(w - g, h - g), p(g, h - g)], 'rgba(120,92,58,0.55)');
    }
    ctx.strokeStyle = 'rgba(96,70,40,0.9)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(c[0][0], c[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    // chalked line of the walls
    const m = 0.16;
    ctx.strokeStyle = 'rgba(255,250,235,0.55)';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const q = [p(m, m), p(w - m, m), p(w - m, h - m), p(m, h - m)];
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    // pegs at the corners and along long sides, with a cord pulled between them
    const pegs: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
    for (let i = 1; i < w; i++) pegs.push([i, h], [i, 0]);
    for (let i = 1; i < h; i++) pegs.push([w, i], [0, i]);
    const cord = (a: [number, number], b: [number, number]) => {
      const A = p(a[0], a[1], 7);
      const B = p(b[0], b[1], 7);
      line(ctx, A, B, 'rgba(240,226,170,0.85)', 0.9);
    };
    cord([0, 0], [w, 0]);
    cord([w, 0], [w, h]);
    cord([w, h], [0, h]);
    cord([0, h], [0, 0]);
    pegs.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    for (const [px, py] of pegs) {
      const g = p(px, py, 0);
      const t = p(px, py, 10);
      line(ctx, g, t, '#6e4a2a', 2.1);
      line(ctx, [g[0] - 0.5, g[1]], [t[0] - 0.5, t[1]], 'rgba(255,230,180,0.3)', 0.8);
      const corner = (px === 0 || px === w) && (py === 0 || py === h);
      if (corner) {
        // a scrap of cloth that stirs a little in the wind
        const sw = Math.sin(simT * 3 + px * 1.3 + py * 0.7) * 1.1;
        poly(ctx, [[t[0], t[1]], [t[0] + 6 + sw, t[1] + 1.4], [t[0], t[1] + 4]], '#f1e3b0', 'rgba(110,80,40,0.45)', 0.6);
      } else {
        ctx.fillStyle = '#e4cf8a';
        ctx.fillRect(t[0] - 1.4, t[1] - 1, 2.8, 2);
      }
    }
  }

  /** the earth round a home that is being rebuilt, scuffed by traffic */
  private trampled(ctx: Ctx, p: P3, s: Site): void {
    const { w, h } = s;
    const e = 0.32;
    poly(ctx, [p(-e, -e), p(w + e, -e), p(w + e, h + e), p(-e, h + e)], 'rgba(132,104,68,0.42)');
    ctx.strokeStyle = 'rgba(96,70,40,0.55)';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    const q = [p(-e, -e), p(w + e, -e), p(w + e, h + e), p(-e, h + e)];
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ───────────── materials ─────────────
  private pilePlan(s: Site): { spr: ReturnType<typeof stackSprite>; x: number; y: number; back: boolean }[] {
    const out: { spr: ReturnType<typeof stackSprite>; x: number; y: number; back: boolean }[] = [];
    const { w, h } = s;
    // slots round the plot, as (x, y) in footprint coordinates
    const slots: [number, number][] = [
      [w + 0.55, 0.5],
      [w * 0.55, h + 0.62],
      [-0.6, h * 0.45],
      [w * 0.45, -0.58],
      [w + 0.5, h * 0.85],
      [-0.5, h + 0.55],
      [w + 0.45, -0.45],
      [-0.55, -0.4],
      [w * 0.15, h + 0.7],
      [w + 0.7, h + 0.4],
      [w * 0.8, -0.65],
    ];
    let slot = 0;
    for (const k of PILE_ORDER) {
      const n = s.delivered[k] ?? 0;
      if (n <= 0) continue;
      const kind = stackKindOf(k);
      if (!kind) continue;
      const spr = stackSprite(this.cache, kind, n);
      const [sx, sy] = slots[slot % slots.length];
      slot++;
      const [ix, iy] = iso(sx - w / 2, sy - h / 2);
      out.push({ spr, x: ix, y: iy, back: sx + sy < (w + h) * 0.5 });
    }
    return out;
  }

  // ───────────── the structure ─────────────
  /** Draws the footing, frame and revealed building; returns how high the whole thing stands now (for the badge above it). */
  private structure(ctx: Ctx, p: P3, s: Site, spec: Spec, meta: (typeof STRUCT)[BuildKind], f: number, usedAny: boolean, upgrade: boolean, simT: number, variant: number): number {
    const { w, h } = s;
    const kind = s.type as BuildKind;
    let top = 10;

    // footing: laid course by course over the first stretch of the work
    if (!upgrade && spec.footing !== 'none' && (f > 0.01 || usedAny)) {
      this.footing(ctx, p, w, h, spec.footing, clamp01((f - 0.01) / 0.1), kind);
      top = 14;
    }
    // frame: posts first, then the plates, then the roof timbers
    const frameStart = 0.1;
    const frameEnd = Math.max(spec.reveal + 0.1, 0.4);
    if (!upgrade && spec.frame !== 'none' && f > frameStart) {
      const k = smooth((f - frameStart) / (frameEnd - frameStart));
      this.frame(ctx, p, w, h, spec, meta, k, f);
      top = Math.max(top, meta.wall * k + 8);
    }
    // the finished building appears from the ground up, behind a scaffold
    const r0 = upgrade ? Math.min(spec.reveal, 0.12) : spec.reveal;
    if (f > r0) {
      const t = smooth((f - r0) / (1 - r0));
      const zr = this.reveal(ctx, w, h, kind, variant, t);
      this.scaffold(ctx, p, w, h, Math.max(zr, 8));
      top = Math.max(top, zr + 14);
    } else if (upgrade) {
      // before any new wall is up the scaffold already stands round the old home
      const zr = 12 + f * 80;
      this.scaffold(ctx, p, w, h, zr);
      top = Math.max(top, zr + 12 + (STRUCT.hut.top - 20));
    }
    return upgrade ? Math.max(top, STRUCT.house.top * 0.9) : top;
  }

  private footing(ctx: Ctx, p: P3, w: number, h: number, mode: 'blocks' | 'ring', prog: number, kind: BuildKind): void {
    const stone = kind === 'smithy' || kind === 'kiln' ? '#8f8a80' : '#aeaa9f';
    if (mode === 'ring') {
      const c = p(w / 2, h / 2, 0);
      const n = 20;
      const m = Math.max(1, Math.ceil(n * prog));
      // a ring of stones that closes up
      const pts: [number, number][] = [];
      for (let i = 0; i < m; i++) {
        const a = (i / n) * Math.PI * 2 + 0.5;
        pts.push([c[0] + Math.cos(a) * 38, c[1] + Math.sin(a) * 19]);
      }
      pts.sort((a, b) => a[1] - b[1]);
      for (const [x, y] of pts) {
        ellipse(ctx, x + 0.6, y + 1.4, 6.2, 3.4, 'rgba(25,25,22,0.35)');
        ellipse(ctx, x, y - 1, 6, 3.8, shade(stone, 0.9 + hashUnit(Math.round(x), Math.round(y), 5) * 0.2));
        ellipse(ctx, x - 1.4, y - 2, 2.6, 1.3, 'rgba(255,255,255,0.28)');
      }
      return;
    }
    // blocks laid round the walls: front side, right side, back, left
    const t = 0.13;
    const bl = 0.5;
    interface B {
      x0: number;
      x1: number;
      y0: number;
      y1: number;
    }
    const seq: B[] = [];
    for (let x = 0; x < w - 1e-6; x += bl) seq.push({ x0: x, x1: Math.min(w, x + bl), y0: h - t, y1: h });
    for (let y = h - bl; y > -1e-6; y -= bl) seq.push({ x0: w - t, x1: w, y0: Math.max(0, y), y1: y + bl > h ? h : y + bl });
    for (let x = w - bl; x > -1e-6; x -= bl) seq.push({ x0: Math.max(0, x), x1: Math.min(w, x + bl), y0: 0, y1: t });
    for (let y = 0; y < h - 1e-6; y += bl) seq.push({ x0: 0, x1: t, y0: y, y1: Math.min(h, y + bl) });
    const n = Math.max(1, Math.ceil(seq.length * prog));
    const shown = seq.slice(0, n).sort((a, b) => a.x0 + a.y0 - (b.x0 + b.y0));
    // packed earth floor inside the footing
    poly(ctx, [p(t, t, 0.2), p(w - t, t, 0.2), p(w - t, h - t, 0.2), p(t, h - t, 0.2)], 'rgba(112,88,58,0.45)');
    shown.forEach((b, i) => {
      const tone = 0.9 + hashUnit(i, Math.round(b.x0 * 4), 9) * 0.2;
      box(ctx, p, b.x0, b.x1, b.y0, b.y1, 0, 4.6, boxTones(shade(stone, tone), 'rgba(40,40,34,0.45)'));
    });
  }

  private frame(ctx: Ctx, p: P3, w: number, h: number, spec: Spec, meta: (typeof STRUCT)[BuildKind], k: number, f: number): void {
    const wood = '#b48a55';
    const woodDark = '#8f6a3e';
    const zWall = meta.wall;
    const inset = 0.1;
    const xs: number[] = [inset];
    const ys: number[] = [inset];
    for (let i = 1; i < Math.round(w / 1.1); i++) xs.push(inset + ((w - 2 * inset) * i) / Math.round(w / 1.1));
    for (let i = 1; i < Math.round(h / 1.1); i++) ys.push(inset + ((h - 2 * inset) * i) / Math.round(h / 1.1));
    xs.push(w - inset);
    ys.push(h - inset);
    // posts: only those on the four sides, back ones first
    interface Pst {
      x: number;
      y: number;
    }
    const posts: Pst[] = [];
    for (const x of xs) for (const y of ys) {
      const edge = x === xs[0] || x === xs[xs.length - 1] || y === ys[0] || y === ys[ys.length - 1];
      if (edge) posts.push({ x, y });
    }
    posts.sort((a, b) => a.x + a.y - (b.x + b.y));
    const post = (x: number, y: number, z1: number, i: number) => {
      if (z1 < 0.5) return;
      box(ctx, p, x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0, z1, boxTones(i % 2 ? wood : shade(wood, 0.94), 'rgba(40,24,10,0.5)'));
    };
    // beams and braces appear once the posts stand
    const beam = clamp01((k - 0.7) / 0.3);
    const drawBeams = (side: 'back' | 'front') => {
      if (beam <= 0) return;
      const z = zWall * (spec.frame === 'poles' ? 1 : 0.98);
      const bx = (x0: number, y0: number, x1: number, y1: number) => box(ctx, p, Math.min(x0, x1) - 0.05, Math.max(x0, x1) + 0.05, Math.min(y0, y1) - 0.05, Math.max(y0, y1) + 0.05, z - 3, z, boxTones(woodDark, 'rgba(40,24,10,0.5)'));
      if (side === 'back') {
        bx(inset, inset, w - inset, inset);
        bx(inset, inset, inset, h - inset);
      } else {
        bx(inset, h - inset, w - inset, h - inset);
        bx(w - inset, inset, w - inset, h - inset);
        // diagonal braces on the two faces we can see
        const lf = p(inset, h - inset, 4);
        const lt = p(xs.length > 2 ? xs[1] : w / 2, h - inset, zWall - 4);
        line(ctx, lf, lt, woodDark, 1.8);
        const rf = p(w - inset, ys.length > 2 ? ys[1] : h / 2, 4);
        const rt = p(w - inset, inset, zWall - 4);
        line(ctx, rf, rt, woodDark, 1.8);
      }
    };
    const kk = (i: number) => clamp01(k * 1.35 - (i / Math.max(1, posts.length)) * 0.35);
    const back = posts.filter((q) => q.x + q.y < (w + h) / 2);
    const front = posts.filter((q) => q.x + q.y >= (w + h) / 2);
    back.forEach((q, i) => post(q.x, q.y, zWall * kk(i), i));
    drawBeams('back');
    front.forEach((q, i) => post(q.x, q.y, zWall * kk(i + back.length), i));
    drawBeams('front');

    // roof timbers over the frame: ridge, a pair of end rafters and a few common rafters
    if (spec.gable && f > 0.3) {
      const t = smooth((f - 0.3) / 0.45);
      if (t > 0) {
        const ym = h / 2;
        const zE = zWall - 2;
        const zR = zWall + (meta.top - zWall - 4) * t;
        ctx.globalAlpha = Math.min(1, t * 1.6);
        line(ctx, p(inset, ym, zR), p(w - inset, ym, zR), '#c9a06a', 2.2);
        const nR = Math.max(3, Math.round(w * 2.2));
        for (let i = 0; i <= nR; i++) {
          const x = inset + ((w - 2 * inset) * i) / nR;
          line(ctx, p(x, h - inset + 0.12, zE - 4 * t), p(x, ym, zR), i === 0 || i === nR ? '#b88a52' : 'rgba(184,138,82,0.8)', i === 0 || i === nR ? 2 : 1.3);
          line(ctx, p(x, inset - 0.12, zE - 4 * t), p(x, ym, zR), 'rgba(160,118,70,0.5)', 1.1);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  /**
   * Paint the finished building from the ground up to a working line that climbs with the work. The line is horizontal on
   * screen (as a flat picture can only be cut that way), so the front of the building rises first. Returns how high the
   * working line stands above the front corner, in px, for the scaffold.
   */
  private reveal(ctx: Ctx, w: number, h: number, kind: BuildKind, variant: number, t: number): number {
    const layers = buildingLayers(this.cache, kind, variant);
    const first = layers[0];
    const front = mk(w, h)(w, h);
    const bottom = front[1] + 6;
    const contentTop = -(first.ay - 8);
    const yv = bottom + (contentTop - bottom) * t;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-first.ax - 4, yv, first.w + 8, first.h - first.ay - yv + 8);
    ctx.clip();
    for (const spr of layers) blit(ctx, spr, 0, 0);
    ctx.restore();
    return Math.max(0, front[1] - yv);
  }

  /** Scaffold poles at the corners and along the front, with a deck of boards at the working height. */
  private scaffold(ctx: Ctx, p: P3, w: number, h: number, zr: number): void {
    const e = 0.22;
    const zTop = zr + 15;
    const pole = '#b99663';
    const corners: [number, number][] = [
      [-e, -e],
      [w + e, -e],
      [-e, h + e],
      [w + e, h + e],
    ];
    const extra: [number, number][] = [];
    if (w >= 3) extra.push([w / 2, h + e], [w + e, h / 2]);
    // back poles first
    const drawPole = (x: number, y: number) => {
      const g = p(x, y, 0);
      const t = p(x, y, zTop);
      line(ctx, g, t, 'rgba(40,24,10,0.45)', 3);
      line(ctx, g, t, pole, 2);
    };
    corners.slice(0, 1).forEach(([x, y]) => drawPole(x, y));
    // deck boards round the two sides we see, on putlogs
    const zd = Math.max(8, zr - 4);
    const deck = (x0: number, y0: number, x1: number, y1: number) => {
      const a = p(x0, y0, zd);
      const b = p(x1, y1, zd);
      line(ctx, a, b, 'rgba(60,40,20,0.5)', 3.4);
      line(ctx, a, b, '#d8b883', 2.2);
    };
    // ledgers
    const lg = (x0: number, y0: number, x1: number, y1: number, z: number) => line(ctx, p(x0, y0, z), p(x1, y1, z), 'rgba(185,150,99,0.9)', 1.3);
    corners.slice(1, 3).forEach(([x, y]) => drawPole(x, y));
    lg(-e, -e, -e, h + e, zd + 12);
    lg(-e, -e, w + e, -e, zd + 12);
    deck(-e, h + e, w + e, h + e);
    deck(w + e, -e, w + e, h + e);
    deck(-e, h + e - 0.12, w + e, h + e - 0.12);
    deck(w + e - 0.12, -e, w + e - 0.12, h + e);
    for (const [x, y] of extra) drawPole(x, y);
    corners.slice(3).forEach(([x, y]) => drawPole(x, y));
    lg(-e, h + e, w + e, h + e, zd + 12);
    lg(w + e, -e, w + e, h + e, zd + 12);
    // a cross brace and a ladder up the front
    line(ctx, p(-e, h + e, 2), p(w * 0.5, h + e, zd + 12), 'rgba(185,150,99,0.75)', 1.2);
    const lx = Math.min(w - 0.3, 0.7);
    line(ctx, p(lx, h + e + 0.5, 0), p(lx, h + e, zd), '#9a7a48', 1.6);
    line(ctx, p(lx + 0.28, h + e + 0.5, 0), p(lx + 0.28, h + e, zd), '#9a7a48', 1.6);
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      line(ctx, p(lx, h + e + 0.5 - 0.5 * t, zd * t), p(lx + 0.28, h + e + 0.5 - 0.5 * t, zd * t), '#b9976a', 1.1);
    }
  }

  // ───────────── bar and badge ─────────────
  private badge(ctx: Ctx, s: Site, cx: number, cy: number, f: number, top: number, simT: number, world: World): void {
    const waiting = siteIsWaiting(s);
    const bw = 38;
    const topY = cy - Math.min(top, 110) - 16;
    ctx.fillStyle = 'rgba(14,22,30,0.84)';
    ctx.fillRect(cx - bw / 2 - 1, topY - 1, bw + 2, 7);
    ctx.fillStyle = waiting ? '#e8a24f' : f > 0 ? '#9be28a' : '#caa65a';
    ctx.fillRect(cx - bw / 2, topY, bw * Math.max(0.04, f), 5);
    if (waiting) {
      // how far the materials allow the work to go
      const capX = cx - bw / 2 + bw * Math.min(1, 0.06 + allowedFraction(s));
      ctx.fillStyle = 'rgba(255,240,200,0.95)';
      ctx.fillRect(capX - 0.5, topY - 2, 1.4, 9);
    }
    if (waiting && world.tick - s.lastWorkTick > 40) {
      const pulse = 0.75 + 0.25 * Math.sin(simT * 5);
      ctx.fillStyle = `rgba(240,138,75,${pulse})`;
      ctx.beginPath();
      ctx.arc(cx, topY - 11, 6.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b1208';
      ctx.fillRect(cx - 0.9, topY - 15, 1.8, 5.5);
      ctx.beginPath();
      ctx.arc(cx, topY - 7, 1, 0, Math.PI * 2);
      ctx.fill();
      // what it is waiting for
      const miss = missingMaterials(s).slice(0, 3);
      ctx.font = '700 9px Inter, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let x = cx + 10;
      for (const m of miss) {
        ctx.fillStyle = 'rgba(14,22,30,0.85)';
        ctx.fillRect(x - 1, topY - 17, 22, 12);
        ctx.fillStyle = ITEM_COLORS[m.kind] ?? '#cccccc';
        ctx.fillRect(x + 1, topY - 15, 7, 8);
        ctx.fillStyle = '#f2f4f6';
        ctx.fillText(String(m.n), x + 10, topY - 10.5);
        x += 24;
      }
    }
  }
}
