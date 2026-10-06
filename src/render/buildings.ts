// Draws finished buildings: the sprite layers, and the things that change with the real state of the place — what is stacked
// outside it (in proportion to what its store holds), how full the granary's bins are, wear on the roof, a sack by a home's door.
// Everything here is a pure function of the presented world; nothing is stored between frames.
import { hashUnit } from '../sim/rng';
import { weightOf } from '../sim/economy';
import type { Building, ItemKind } from '../sim/types';
import { GRANARY } from './bld_food';
import { stackSprite } from './goods';
import type { StackKind } from './goods';
import { SpriteCache, blit } from './sprites';
import { STRUCT, buildingLayers } from './structures';
import type { BuildKind } from './structures';

const iso = (wx: number, wy: number): [number, number] => [(wx - wy) * 32, (wx + wy) * 16];

interface Slot {
  item: ItemKind;
  kind: StackKind;
  /** where the stack stands, in the building's own footprint coordinates */
  fx: number;
  fy: number;
  /** units of the item that one step of the stack stands for */
  per: number;
  max: number;
  /** 0 = painted between the back and front layers (inside a shed), 1 = painted last */
  layer: 0 | 1;
}

/** Listed back to front, so overlapping stacks are drawn in the right order. */
const STOCK: Partial<Record<BuildKind, Slot[]>> = {
  timber_yard: [
    { item: 'handles', kind: 'handles', fx: 0.6, fy: 0.78, per: 1, max: 14, layer: 0 },
    { item: 'planks', kind: 'planks', fx: 2.38, fy: 0.8, per: 1, max: 14, layer: 0 },
    { item: 'wood', kind: 'wood', fx: 0.34, fy: 1.6, per: 2, max: 10, layer: 1 },
  ],
  quarry: [{ item: 'stone', kind: 'cutstone', fx: 0.6, fy: 1.5, per: 1, max: 9, layer: 1 }],
  kiln: [
    { item: 'charcoal', kind: 'charcoal', fx: 1.86, fy: 1.1, per: 1, max: 12, layer: 1 },
    { item: 'wood', kind: 'wood', fx: 0.1, fy: 1.62, per: 2, max: 10, layer: 1 },
    { item: 'bricks', kind: 'bricks', fx: 1.74, fy: 1.66, per: 1, max: 24, layer: 1 },
  ],
  smithy: [
    { item: 'ore', kind: 'ore', fx: 2.15, fy: 1.2, per: 1, max: 12, layer: 1 },
    { item: 'charcoal', kind: 'charcoal', fx: 2.02, fy: 1.85, per: 1, max: 12, layer: 1 },
    { item: 'iron', kind: 'iron', fx: 0.3, fy: 1.88, per: 1, max: 12, layer: 1 },
  ],
  granary: [
    { item: 'flour', kind: 'flour', fx: 1.6, fy: 2.2, per: 2, max: 4, layer: 1 },
    { item: 'bread', kind: 'bread', fx: 1.1, fy: 2.38, per: 1, max: 9, layer: 1 },
  ],
  bakery: [
    { item: 'flour', kind: 'flour', fx: 0.05, fy: 1.45, per: 2, max: 4, layer: 1 },
    { item: 'bread', kind: 'bread', fx: 1.0, fy: 1.8, per: 1, max: 9, layer: 1 },
  ],
  smokehouse: [{ item: 'smoked_fish', kind: 'smoked', fx: 0.62, fy: 1.82, per: 1, max: 9, layer: 1 }],
};

export class BuildingPainter {
  constructor(private cache: SpriteCache) {}

  draw(ctx: CanvasRenderingContext2D, b: Building): void {
    const kind = b.type as BuildKind;
    const [x, y] = iso(b.x + b.w / 2, b.y + b.h / 2);
    const layers = buildingLayers(this.cache, kind, b.variant);
    blit(ctx, layers[0], x, y);
    const slots = STOCK[kind];
    if (layers.length > 1) {
      if (slots) this.stock(ctx, b, slots, 0);
      if (kind === 'granary') this.binFill(ctx, b, x, y);
      blit(ctx, layers[1], x, y);
      if (slots) this.stock(ctx, b, slots, 1);
    } else if (slots) this.stock(ctx, b, slots, -1);

    this.wear(ctx, b, kind, x, y);

    if (kind === 'storehouse') {
      const crates = Math.min(6, Math.ceil(weightOf(b.store.items) / 22));
      for (let i = 0; i < crates; i++) {
        const [cx, cy] = iso(b.x + 2.15 + (i % 2) * 0.32, b.y + 0.35 + Math.floor(i / 2) * 0.45);
        crate(ctx, cx, cy - (i > 3 ? 7 : 0), i);
      }
    } else if ((kind === 'hut' || kind === 'house' || kind === 'lean_to') && b.store.cap > 0 && weightOf(b.store.items) > 4) {
      // a sack or two by the door of a home with food stored
      const [cx, cy] = iso(b.doorX + 0.25, b.doorY + 0.15);
      sack(ctx, cx, cy, '#cdb683');
    }
  }

  /** Stacks of what the store actually holds. `layer` -1 paints all slots. */
  private stock(ctx: CanvasRenderingContext2D, b: Building, slots: Slot[], layer: number): void {
    const items = b.store.items;
    for (const s of slots) {
      if (layer >= 0 && s.layer !== layer) continue;
      const have = items[s.item] ?? 0;
      if (have <= 0) continue;
      const n = Math.min(s.max, Math.ceil(have / s.per));
      const spr = stackSprite(this.cache, s.kind, n);
      const [sx, sy] = iso(b.x + s.fx, b.y + s.fy);
      blit(ctx, spr, sx, sy);
    }
  }

  /** The grain showing through the slats: the fuller the bins, the higher the gold. */
  private binFill(ctx: CanvasRenderingContext2D, b: Building, x: number, y: number): void {
    const cap = Math.max(1, b.store.cap);
    const fill = Math.min(1, weightOf(b.store.items) / cap);
    if (fill <= 0.02) return;
    const bin = GRANARY.bin - GRANARY.floor;
    const z1 = GRANARY.floor + 1 + Math.max(2, fill * (bin - 3));
    // plane coordinates inside the bin (same projection as the sprite: footprint 2 x 2, centred on the anchor)
    const P = (px: number, py: number, pz: number): [number, number] => [x + (px - 1 - (py - 1)) * 32, y + (px - 1 + (py - 1)) * 16 - pz];
    const z0 = GRANARY.floor;
    const x0 = GRANARY.x0;
    const x1 = GRANARY.x1 - 0.03;
    const y0 = GRANARY.y0;
    const y1 = GRANARY.y1 - 0.03;
    const g = ctx.createLinearGradient(0, P(1, y1, z1)[1], 0, P(1, y1, z0)[1]);
    g.addColorStop(0, '#ffd45a');
    g.addColorStop(1, '#e0a02c');
    ctx.fillStyle = g;
    ctx.beginPath();
    let a = P(x0, y1, z0);
    ctx.moveTo(a[0], a[1]);
    a = P(x1, y1, z0);
    ctx.lineTo(a[0], a[1]);
    a = P(x1, y1, z1);
    ctx.lineTo(a[0], a[1]);
    a = P(x0, y1, z1);
    ctx.lineTo(a[0], a[1]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c28a24';
    ctx.beginPath();
    a = P(x1, y0, z0);
    ctx.moveTo(a[0], a[1]);
    a = P(x1, y1, z0);
    ctx.lineTo(a[0], a[1]);
    a = P(x1, y1, z1);
    ctx.lineTo(a[0], a[1]);
    a = P(x1, y0, z1);
    ctx.lineTo(a[0], a[1]);
    ctx.closePath();
    ctx.fill();
  }

  /** Wear and tear shows on the roof. */
  private wear(ctx: CanvasRenderingContext2D, b: Building, kind: BuildKind, x: number, y: number): void {
    if (b.condition >= 55) return;
    if (kind === 'quarry' || kind === 'kiln') return;
    const worn = (55 - b.condition) / 55;
    const m = STRUCT[kind];
    const n =Math.ceil(worn * (kind === 'lean_to' ? 5 : 9));
    const spread = kind === 'lean_to' ? 40 : (b.w + b.h) * 21;
    const mid = -(m.wall + (m.top - m.wall) * 0.28);
    for (let i = 0; i < n; i++) {
      const rx = (hashUnit(b.id, i, 1) - 0.5) * spread;
      const ry = mid + (hashUnit(b.id, i, 2) - 0.2) * (kind === 'lean_to' ? 18 : 26);
      ctx.fillStyle = `rgba(45,32,20,${0.35 + 0.35 * worn})`;
      ctx.beginPath();
      ctx.ellipse(x + rx, y + ry, 3 + hashUnit(b.id, i, 3) * 4, 1.8 + hashUnit(b.id, i, 4) * 2, hashUnit(b.id, i, 5) - 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function sack(ctx: CanvasRenderingContext2D, x: number, y: number, tint: string): void {
  ctx.fillStyle = 'rgba(25,20,10,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 2, y - 6, 1, x, y - 3, 7);
  g.addColorStop(0, '#e6d6ae');
  g.addColorStop(1, '#b49a68');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.quadraticCurveTo(x - 7, y - 6, x - 2, y - 9);
  ctx.lineTo(x + 2, y - 9);
  ctx.quadraticCurveTo(x + 7, y - 6, x + 4, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,50,20,0.55)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.arc(x, y - 9.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

export function crate(ctx: CanvasRenderingContext2D, x: number, y: number, i: number): void {
  const w = 9;
  const h = 7;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(40,25,10,0.5)';
  const face = (pts: number[][], fill: string) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  face([[x - w, y - h], [x, y - h + 4.5], [x, y + 4.5], [x - w, y]], '#a77a47');
  face([[x, y - h + 4.5], [x + w, y - h], [x + w, y], [x, y + 4.5]], '#86602f');
  face([[x, y - h - 4.5], [x + w, y - h], [x, y - h + 4.5], [x - w, y - h]], i % 2 ? '#c99b61' : '#d4a96b');
}
