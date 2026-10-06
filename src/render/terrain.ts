import type { CameraState } from '../app/game';
import { hashString, hashUnit } from '../sim/rng';
import { T } from '../sim/types';
import type { World } from '../sim/types';
import { fbm } from '../sim/worldgen';
import { mix } from './sprites';

// Fine steps keep neighbouring tiles from landing on visibly different shades (a coarse ramp shows the tile grid).
const STEPS = 24;
const WATER_WAVE = 0.9 * (STEPS / 8);
function ramp(a: string, b: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < STEPS; i++) out.push(mix(a, b, i / (STEPS - 1)));
  return out;
}

const PAL = {
  [T.DEEP]: ramp('#245c93', '#3b86bd'),
  [T.SHALLOW]: ramp('#49aec6', '#7ad3de'),
  [T.SAND]: ramp('#dac88c', '#f0e2b2'),
  [T.GRASS]: ramp('#69ad4c', '#8fd069'),
  [T.FOREST]: ramp('#4c8745', '#639f56'),
  [T.STONY]: ramp('#979689', '#b5b4a8'),
} as const;

const TUFT_LIGHT = 'rgba(190,235,140,0.75)';
const TUFT_DARK = 'rgba(45,100,50,0.55)';

export interface View {
  w: number;
  h: number;
}

export class TerrainPainter {
  private tint: Float32Array;
  private world: World;
  private wearBlob: HTMLCanvasElement | null = null;
  private seedNum: number;

  constructor(world: World) {
    this.world = world;
    this.seedNum = hashString(world.seed) & 0xffff;
    const { W, H } = world;
    this.tint = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const big = fbm(x / 9, y / 9, this.seedNum + 41, 3);
        const small = hashUnit(x, y, this.seedNum) * 0.22; // per-tile grain: well under one step, so it adds texture without outlining tiles
        this.tint[y * W + x] = Math.min(0.999, Math.max(0, big * 0.85 + small * 0.1));
      }
    }
  }

  /**
   * One worn tile of trampled ground: a soft-edged brown ellipse a little wider than the tile, so neighbours overlap and blend.
   * (A hard-edged diamond inset in each tile leaves a bright rim around every one of them, which reads as a grid.)
   */
  private wearSprite(): HTMLCanvasElement {
    if (this.wearBlob) return this.wearBlob;
    const c = document.createElement('canvas');
    c.width = 72;
    c.height = 36;
    const g = c.getContext('2d');
    if (g) {
      g.scale(1, 0.5);
      const grad = g.createRadialGradient(36, 36, 0, 36, 36, 36);
      grad.addColorStop(0, 'rgba(150,112,70,1)');
      grad.addColorStop(0.5, 'rgba(150,112,70,0.8)');
      grad.addColorStop(1, 'rgba(150,112,70,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 72, 72);
    }
    this.wearBlob = c;
    return c;
  }

  /** visible tile rectangle for the current camera */
  private bounds(cam: CameraState, vw: number, vh: number): { x0: number; x1: number; y0: number; y1: number } {
    const world = this.world;
    const corners = [
      [0, 0],
      [vw, 0],
      [0, vh],
      [vw, vh],
    ];
    let minX = 1e9;
    let maxX = -1e9;
    let minY = 1e9;
    let maxY = -1e9;
    for (const [px, py] of corners) {
      const sx = (px - vw / 2) / cam.zoom + cam.x;
      const sy = (py - vh / 2) / cam.zoom + cam.y;
      const a = sx / 32;
      const b = sy / 16;
      const x = (a + b) / 2;
      const y = (b - a) / 2;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return {
      x0: Math.max(0, Math.floor(minX) - 1),
      x1: Math.min(world.W - 1, Math.ceil(maxX) + 1),
      y0: Math.max(0, Math.floor(minY) - 1),
      y1: Math.min(world.H - 1, Math.ceil(maxY) + 4),
    };
  }

  /** The soil edge of the diorama block, visible below the front (south-west and south-east) sides. */
  drawBlockEdges(ctx: CanvasRenderingContext2D): void {
    const { W, H } = this.world;
    const D = 62;
    const P = (x: number, y: number): [number, number] => [(x - y) * 32, (x + y) * 16];
    const bands: [number, string, string][] = [
      [6, '#6cab4f', '#4f8f43'],
      [26, '#92683f', '#7a5433'],
      [20, '#6f4e30', '#5b3f27'],
      [10, '#4c3a2b', '#3a2c21'],
    ];
    // soft ground shadow under the block
    for (let k = 0; k < 3; k++) {
      const o = D + 10 + k * 12;
      ctx.fillStyle = `rgba(6,12,18,${0.16 - k * 0.04})`;
      ctx.beginPath();
      const a = P(0, H);
      const b = P(W, H);
      const c = P(W, 0);
      ctx.moveTo(a[0] - 8, a[1] + 4);
      ctx.lineTo(b[0], b[1] + o);
      ctx.lineTo(c[0] + 8, c[1] + 4);
      ctx.lineTo(c[0], c[1] + D * 0.4);
      ctx.lineTo(b[0], b[1] + D * 0.9);
      ctx.lineTo(a[0], a[1] + D * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    const face = (p0: [number, number], p1: [number, number], dark: number, edgeKey: number, n: number) => {
      let z0 = 0;
      for (const [hgt, c1, c2] of bands) {
        const g = ctx.createLinearGradient(0, p0[1] + z0, 0, p0[1] + z0 + hgt + Math.abs(p1[1] - p0[1]));
        g.addColorStop(0, shadeCss(c1, dark));
        g.addColorStop(1, shadeCss(c2, dark));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1] + z0);
        ctx.lineTo(p1[0], p1[1] + z0);
        ctx.lineTo(p1[0], p1[1] + z0 + hgt + 0.6);
        ctx.lineTo(p0[0], p0[1] + z0 + hgt + 0.6);
        ctx.closePath();
        ctx.fill();
        z0 += hgt;
      }
      // pebbles and roots in the soil, and vertical weathering streaks
      ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = p0[0] + (p1[0] - p0[0]) * t;
        const y = p0[1] + (p1[1] - p0[1]) * t;
        const r = hashUnit(i, edgeKey, 7);
        ctx.strokeStyle = `rgba(30,20,10,${0.08 + r * 0.14})`;
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x, y + 8 + 14 + r * 30);
        ctx.stroke();
        if (r > 0.55) {
          ctx.fillStyle = r > 0.8 ? 'rgba(180,176,165,0.55)' : 'rgba(40,28,18,0.35)';
          ctx.beginPath();
          ctx.ellipse(x + (r - 0.5) * 8, y + 18 + hashUnit(i, edgeKey, 9) * 24, 2.4 + r * 2, 1.6 + r, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    face(P(0, H), P(W, H), 1, 1, W * 2); // south-west face (left)
    face(P(W, H), P(W, 0), 0.74, 2, H * 2); // south-east face (right)
  }

  draw(ctx: CanvasRenderingContext2D, cam: CameraState, view: View, t: number, wind: number): void {
    const world = this.world;
    const { W } = world;
    const b = this.bounds(cam, view.w, view.h);
    const z = cam.zoom;
    const margin = 70;
    const offX = view.w / 2 - cam.x * z;
    const offY = view.h / 2 - cam.y * z;

    // pass 1: ground tiles
    for (let y = b.y0; y <= b.y1; y++) {
      for (let x = b.x0; x <= b.x1; x++) {
        const sx = (x - y) * 32;
        const sy = (x + y) * 16;
        const px = sx * z + offX;
        const py = sy * z + offY;
        if (px < -margin * z || px > view.w + margin * z || py < -margin * z || py > view.h + margin * z) continue;
        const i = y * W + x;
        const type = world.terrain[i] as 0 | 1 | 2 | 3 | 4 | 5;
        let k = Math.floor(this.tint[i] * STEPS);
        if (type === T.DEEP || type === T.SHALLOW) {
          const wave = Math.sin(t * 0.85 + x * 0.52 + y * 0.37) + 0.6 * Math.sin(t * 1.4 - x * 0.31 + y * 0.6);
          k = Math.max(0, Math.min(STEPS - 1, k + Math.round(wave * WATER_WAVE)));
        }
        ctx.fillStyle = PAL[type][k];
        ctx.beginPath();
        ctx.moveTo(sx, sy - 0.6);
        ctx.lineTo(sx + 32.9, sy + 16);
        ctx.lineTo(sx, sy + 32.6);
        ctx.lineTo(sx - 32.9, sy + 16);
        ctx.closePath();
        ctx.fill();
      }
    }

    // pass 2: wear (desire paths), shore foam, water glints, decor
    const detail = z >= 0.5;
    ctx.lineCap = 'round';
    // batched strokes
    let tuftL = new Path2D();
    let tuftD = new Path2D();
    const reeds: { x: number; y: number; h: number; s: number }[] = [];
    const flowers: { x: number; y: number; c: string }[] = [];
    for (let y = b.y0; y <= b.y1; y++) {
      for (let x = b.x0; x <= b.x1; x++) {
        const sx = (x - y) * 32;
        const sy = (x + y) * 16;
        const px = sx * z + offX;
        const py = sy * z + offY;
        if (px < -margin * z || px > view.w + margin * z || py < -margin * z || py > view.h + margin * z) continue;
        const i = y * W + x;
        const type = world.terrain[i];
        // wear
        const wr = world.wear[i];
        if (wr > 0.06) {
          const j = (hashUnit(x, y, 3) - 0.5) * 4;
          ctx.globalAlpha = Math.min(0.62, wr * 0.7);
          ctx.drawImage(this.wearSprite(), sx - 36 + j, sy - 2);
          ctx.globalAlpha = 1;
        }
        if (type === T.SHALLOW || type === T.DEEP) {
          // foam where water meets land
          const nb: [number, number, number, number, number][] = [
            [1, 0, 32, 16, 0], // right-front edge
            [0, 1, 0, 32, 0],
            [-1, 0, 0, 0, 0],
            [0, -1, 0, 0, 0],
          ];
          void nb;
          const edges: [number, number, number, number, number, number][] = [
            // neighbour dx, dy, edge from (x1,y1) to (x2,y2) in sprite px relative to tile top vertex
            [1, 0, 32, 16, 0, 32],
            [0, 1, -32, 16, 0, 32],
            [-1, 0, -32, 16, 0, 0],
            [0, -1, 32, 16, 0, 0],
          ];
          for (const [dx, dy, ex, ey, fx, fy] of edges) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= world.H) continue;
            const nt = world.terrain[ny * W + nx];
            if (nt === T.SHALLOW || nt === T.DEEP) continue;
            // draw a bright wavering line along the shared edge
            const a = 0.34 + 0.22 * Math.sin(t * 1.3 + x * 0.9 + y * 0.7);
            ctx.strokeStyle = `rgba(255,255,255,${a})`;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            if (dx === 1) {
              ctx.moveTo(sx + 32, sy + 16);
              ctx.lineTo(sx, sy + 32);
            } else if (dy === 1) {
              ctx.moveTo(sx - 32, sy + 16);
              ctx.lineTo(sx, sy + 32);
            } else if (dx === -1) {
              ctx.moveTo(sx, sy);
              ctx.lineTo(sx - 32, sy + 16);
            } else {
              ctx.moveTo(sx, sy);
              ctx.lineTo(sx + 32, sy + 16);
            }
            ctx.stroke();
            void ex;
            void ey;
            void fx;
            void fy;
          }
          if (detail && hashUnit(x, y, 11) < 0.55) {
            // light glints drifting across the surface
            const ph = t * 0.9 + hashUnit(x, y, 12) * 6.28;
            const a = Math.max(0, Math.sin(ph)) * (type === T.DEEP ? 0.28 : 0.4);
            if (a > 0.04) {
              const gx = sx + (hashUnit(x, y, 13) - 0.5) * 30 + Math.sin(ph * 0.5) * 3;
              const gy = sy + 16 + (hashUnit(x, y, 14) - 0.5) * 12;
              ctx.strokeStyle = `rgba(255,255,255,${a})`;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(gx - 4, gy);
              ctx.lineTo(gx + 4, gy);
              ctx.stroke();
            }
          }
          continue;
        }
        if (!detail) continue;
        const r = hashUnit(x, y, 21);
        if (type === T.GRASS || type === T.FOREST) {
          const n = type === T.GRASS ? 2 : 1;
          for (let k = 0; k < n; k++) {
            const fx = 0.15 + hashUnit(x, y, 30 + k) * 0.7;
            const fy = 0.15 + hashUnit(x, y, 40 + k) * 0.7;
            if (hashUnit(x, y, 50 + k) > (type === T.GRASS ? 0.62 : 0.3)) continue;
            const gx = (x + fx - (y + fy)) * 32;
            const gy = (x + fx + (y + fy)) * 16;
            const sway = Math.sin(t * 1.7 + x * 1.3 + y) * wind * 1.4;
            const path = k % 2 ? tuftD : tuftL;
            path.moveTo(gx - 1.5, gy);
            path.quadraticCurveTo(gx - 2 + sway * 0.5, gy - 3, gx - 2.5 + sway, gy - 6.5);
            path.moveTo(gx, gy);
            path.quadraticCurveTo(gx + sway * 0.4, gy - 4, gx + sway, gy - 8);
            path.moveTo(gx + 1.5, gy);
            path.quadraticCurveTo(gx + 2 + sway * 0.5, gy - 3, gx + 3 + sway, gy - 6);
          }
          if (type === T.GRASS && r < 0.075) {
            const fx = 0.2 + hashUnit(x, y, 60) * 0.6;
            const fy = 0.2 + hashUnit(x, y, 61) * 0.6;
            const cols = ['#f5d44e', '#f2f2ee', '#e86a8a', '#b794f0', '#ffb04a'];
            flowers.push({ x: (x + fx - (y + fy)) * 32, y: (x + fx + (y + fy)) * 16, c: cols[Math.floor(hashUnit(x, y, 62) * cols.length)] });
          }
          if (type === T.FOREST && r < 0.06) {
            // fallen leaves / mushroom
            const gx = sx + (hashUnit(x, y, 70) - 0.5) * 30;
            const gy = sy + 16 + (hashUnit(x, y, 71) - 0.5) * 12;
            ctx.fillStyle = hashUnit(x, y, 72) > 0.5 ? 'rgba(210,150,70,0.7)' : 'rgba(220,70,60,0.85)';
            ctx.beginPath();
            ctx.ellipse(gx, gy, 2.2, 1.3, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (type === T.SAND) {
          if (r < 0.06) {
            const gx = sx + (hashUnit(x, y, 80) - 0.5) * 34;
            const gy = sy + 16 + (hashUnit(x, y, 81) - 0.5) * 12;
            ctx.fillStyle = 'rgba(255,248,232,0.8)';
            ctx.beginPath();
            ctx.ellipse(gx, gy, 2.2, 1.3, 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          if (world.waterDist[i] <= 2 && r > 0.82) reeds.push({ x: sx + (hashUnit(x, y, 90) - 0.5) * 22, y: sy + 17 + (hashUnit(x, y, 91) - 0.5) * 8, h: 14 + hashUnit(x, y, 92) * 10, s: hashUnit(x, y, 93) * 6 });
        } else if (type === T.STONY && r < 0.14) {
          const gx = sx + (hashUnit(x, y, 100) - 0.5) * 34;
          const gy = sy + 16 + (hashUnit(x, y, 101) - 0.5) * 12;
          ctx.fillStyle = 'rgba(88,88,82,0.55)';
          ctx.beginPath();
          ctx.ellipse(gx, gy, 2.6, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (detail) {
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = TUFT_DARK;
      ctx.stroke(tuftD);
      ctx.strokeStyle = TUFT_LIGHT;
      ctx.stroke(tuftL);
      for (const f of flowers) {
        ctx.fillStyle = 'rgba(60,110,50,0.8)';
        ctx.fillRect(f.x - 0.4, f.y - 3, 0.9, 3);
        ctx.fillStyle = f.c;
        ctx.beginPath();
        ctx.arc(f.x, f.y - 3.4, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const rd of reeds) {
        const sway = Math.sin(t * 1.3 + rd.s) * wind * 2.4;
        ctx.strokeStyle = '#6e8a45';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = -1; k <= 1; k++) {
          ctx.moveTo(rd.x + k * 2, rd.y);
          ctx.quadraticCurveTo(rd.x + k * 2.6 + sway * 0.4, rd.y - rd.h * 0.5, rd.x + k * 3 + sway, rd.y - rd.h * (k === 0 ? 1 : 0.8));
        }
        ctx.stroke();
        ctx.fillStyle = '#7a5a34';
        ctx.fillRect(rd.x + sway - 1, rd.y - rd.h - 3, 2.4, 5);
      }
    }
    void tuftL;
    tuftL = new Path2D();
    tuftD = new Path2D();
  }

  /** Dim the tiles a person has never seen (for the knowledge overlay). */
  drawUnexplored(ctx: CanvasRenderingContext2D, cam: CameraState, view: View, explored: Uint8Array): void {
    const world = this.world;
    const b = this.bounds(cam, view.w, view.h);
    const z = cam.zoom;
    const offX = view.w / 2 - cam.x * z;
    const offY = view.h / 2 - cam.y * z;
    ctx.fillStyle = 'rgba(8,14,24,0.5)';
    ctx.beginPath();
    for (let y = b.y0; y <= b.y1; y++) {
      for (let x = b.x0; x <= b.x1; x++) {
        if (explored[y * world.W + x]) continue;
        const sx = (x - y) * 32;
        const sy = (x + y) * 16;
        const px = sx * z + offX;
        const py = sy * z + offY;
        if (px < -80 * z || px > view.w + 80 * z || py < -80 * z || py > view.h + 80 * z) continue;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 32, sy + 16);
        ctx.lineTo(sx, sy + 32);
        ctx.lineTo(sx - 32, sy + 16);
        ctx.closePath();
      }
    }
    ctx.fill();
  }
}

function shadeCss(c: string, f: number): string {
  const v = c.replace('#', '');
  const n = parseInt(v, 16);
  const r = Math.min(255, ((n >> 16) & 255) * f);
  const g = Math.min(255, ((n >> 8) & 255) * f);
  const b = Math.min(255, (n & 255) * f);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
