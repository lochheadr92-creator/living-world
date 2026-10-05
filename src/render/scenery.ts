import { hashUnit } from '../sim/rng';
import type { Building, Grave, Pile, Plot, Site, Source, World } from '../sim/types';
import { BuildingPainter, sack } from './buildings';
import { SiteDrawer } from './construction';
import { clayPitSprite, oreVeinSprite, outcropSprite, stageOf } from './deposits';
import { brickStack, breadBasket, handleBundle, ironBars, lumpHeap, plankStack, sackPile } from './goods';
import { HOUSEHOLD_COLORS } from './palette';
import { BERRY_SPOTS, FRUIT_SPOTS, SpriteCache, blit, bushSprite, ellipse, fruitTreeSprite, graveSprite, groundShadow, poly, rockSprite, shade, stumpSprite, treeSprite } from './sprites';

const iso = (wx: number, wy: number): [number, number] => [(wx - wy) * 32, (wx + wy) * 16];

export class Scenery {
  readonly cache = new SpriteCache();
  private buildings = new BuildingPainter(this.cache);
  private sites = new SiteDrawer(this.cache);
  /** how much larger berries and fruit are drawn than true scale (1 at normal zoom; set each frame from the camera) */
  fruitScale = 1;

  // ───────── natural sources ─────────
  drawSource(ctx: CanvasRenderingContext2D, s: Source, simT: number, wind: number): void {
    const [x, y] = iso(s.x + 0.5, s.y + 0.5);
    switch (s.type) {
      case 'tree': {
        const spr = treeSprite(this.cache, s.variant);
        const scale = s.growth >= 1 ? 1 : 0.26 + 0.74 * Math.pow(s.growth, 0.8);
        const skew = Math.sin(simT * 1.05 + s.x * 0.7 + s.y * 0.45) * (0.012 + wind * 0.06) * (s.growth >= 1 ? 1 : 1.6);
        ctx.save();
        ctx.translate(x, y + 1);
        ctx.transform(1, 0, skew, 1, 0, 0);
        ctx.drawImage(spr.canvas, -spr.ax * scale, -spr.ay * scale, spr.w * scale, spr.h * scale);
        ctx.restore();
        break;
      }
      case 'fruit_tree': {
        const spr = fruitTreeSprite(this.cache, s.variant);
        const skew = Math.sin(simT * 1.1 + s.x * 0.6 + s.y * 0.5) * (0.01 + wind * 0.05);
        ctx.save();
        ctx.translate(x, y + 1);
        ctx.transform(1, 0, skew, 1, 0, 0);
        ctx.drawImage(spr.canvas, -spr.ax, -spr.ay, spr.w, spr.h);
        const col = ['#e5503a', '#f2a238', '#d9d04a'][s.variant % 3];
        const n = s.amount;
        for (let i = 0; i < Math.min(n, FRUIT_SPOTS.length); i++) {
          const [fx, fy] = FRUIT_SPOTS[i];
          ctx.fillStyle = 'rgba(40,20,10,0.35)';
          ctx.beginPath();
          ctx.arc(fx + 0.4, fy + 0.6, 2.7 * this.fruitScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(fx, fy, 2.5 * this.fruitScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(fx - 1.1, fy - 1.3, 1, 1);
        }
        ctx.restore();
        break;
      }
      case 'berry_bush': {
        const spr = bushSprite(this.cache, s.variant);
        const skew = Math.sin(simT * 1.3 + s.x * 0.9 + s.y) * (0.012 + wind * 0.05);
        ctx.save();
        ctx.translate(x, y + 1);
        ctx.transform(1, 0, skew, 1, 0, 0);
        ctx.drawImage(spr.canvas, -spr.ax, -spr.ay, spr.w, spr.h);
        for (let i = 0; i < Math.min(s.amount, BERRY_SPOTS.length); i++) {
          const [bx, by] = BERRY_SPOTS[i];
          ctx.fillStyle = '#b3274f';
          ctx.beginPath();
          ctx.arc(bx, by, 2.2 * this.fruitScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,200,215,0.85)';
          ctx.fillRect(bx - 0.9, by - 1.1, 0.9, 0.9);
        }
        ctx.restore();
        break;
      }
      case 'rock': {
        const stage = s.amount > 6 ? 2 : s.amount > 2 ? 1 : 0;
        blit(ctx, rockSprite(this.cache, s.variant, stage as 0 | 1 | 2), x, y + 2);
        break;
      }
      case 'clay_pit': {
        blit(ctx, clayPitSprite(this.cache, s.variant, stageOf(s.amount, s.max)), x, y);
        break;
      }
      case 'ore_vein': {
        blit(ctx, oreVeinSprite(this.cache, s.variant, stageOf(s.amount, s.max)), x, y + 2);
        break;
      }
      case 'outcrop': {
        blit(ctx, outcropSprite(this.cache, s.variant, stageOf(s.amount, s.max)), x, y + 2);
        break;
      }
      case 'wild_grain': {
        const n = s.amount <= 0 ? 3 : 4 + s.amount;
        for (let i = 0; i < n; i++) {
          const ox = (hashUnit(s.x, s.y, 200 + i) - 0.5) * 36;
          const oy = (hashUnit(s.x, s.y, 220 + i) - 0.5) * 14 + 2;
          const h = s.amount <= 0 ? 6 : 15 + hashUnit(s.x, s.y, 240 + i) * 7;
          const sway = Math.sin(simT * 1.6 + i + s.x) * (1 + wind * 3.5);
          ctx.strokeStyle = s.amount <= 0 ? '#9ab36a' : '#c9b25a';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.quadraticCurveTo(x + ox + sway * 0.4, y + oy - h * 0.55, x + ox + sway, y + oy - h);
          ctx.stroke();
          if (s.amount > 0) {
            ctx.fillStyle = '#e6c85a';
            ctx.beginPath();
            ctx.ellipse(x + ox + sway, y + oy - h - 2, 1.5, 3.4, sway * 0.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,245,170,0.6)';
            ctx.fillRect(x + ox + sway - 0.7, y + oy - h - 4.2, 0.8, 2);
          }
        }
        break;
      }
      case 'fish_spot': {
        // ripples and the occasional leap
        const ph = (simT * 0.45 + hashUnit(s.x, s.y, 5)) % 1;
        for (let k = 0; k < 2; k++) {
          const t = (ph + k * 0.5) % 1;
          ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.55})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(x, y + 16, 5 + t * 14, (5 + t * 14) * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (s.amount > 0) {
          const leap = (simT * 0.23 + hashUnit(s.x, s.y, 6) * 3) % 1;
          if (leap < 0.12) {
            const u = leap / 0.12;
            const fx = x + (u - 0.5) * 14;
            const fy = y + 14 - Math.sin(u * Math.PI) * 11;
            ctx.fillStyle = '#c8e1ee';
            ctx.beginPath();
            ctx.ellipse(fx, fy, 3.6, 1.7, (u - 0.5) * 1.4, 0, Math.PI * 2);
            ctx.fill();
          } else if (hashUnit(s.x, s.y, 7) > 0.35) {
            ctx.fillStyle = 'rgba(20,50,80,0.28)';
            ctx.beginPath();
            ctx.ellipse(x + Math.sin(simT * 0.7 + s.x) * 5, y + 17, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
    }
  }

  drawStump(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number): void {
    const [sx, sy] = iso(x + 0.5, y + 0.5);
    blit(ctx, stumpSprite(this.cache, variant), sx, sy + 1);
  }

  drawGrave(ctx: CanvasRenderingContext2D, g: Grave): void {
    const [x, y] = iso(g.x + 0.5, g.y + 0.5);
    blit(ctx, graveSprite(this.cache), x, y + 2);
  }

  // ───────── buildings ─────────
  drawBuilding(ctx: CanvasRenderingContext2D, b: Building, simT: number): void {
    if (b.type === 'fire') {
      this.drawFire(ctx, b, simT);
      return;
    }
    this.buildings.draw(ctx, b);
  }

  private drawFire(ctx: CanvasRenderingContext2D, b: Building, simT: number): void {
    const [x, y] = iso(b.x + 0.5, b.y + 0.5);
    // log seats around the fire
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.6;
      const [sx, sy] = iso(b.x + 0.5 + Math.cos(a) * 1.15, b.y + 0.5 + Math.sin(a) * 1.15);
      ctx.fillStyle = 'rgba(20,30,15,0.25)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2, 9, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5434';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 2.5, 8, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3d26';
      ctx.fillRect(sx - 8, sy - 2.5, 16, 4);
      ctx.beginPath();
      ctx.ellipse(sx, sy + 1.5, 8, 3.2, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#d3ad73';
      ctx.beginPath();
      ctx.ellipse(sx + 6.5, sy - 0.4, 1.8, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    groundShadow(ctx, 20, 8, 0.28, y + 2 - y);
    ctx.save();
    ctx.translate(x, y);
    // scorched ground and stone ring
    ctx.fillStyle = 'rgba(40,30,24,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 15, 7.4, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const sx = Math.cos(a) * 12;
      const sy = 3 + Math.sin(a) * 6;
      const g = ctx.createRadialGradient(sx - 1, sy - 2, 0.5, sx, sy, 4);
      g.addColorStop(0, '#c9c7bd');
      g.addColorStop(1, '#8d8b84');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 4.1, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,40,36,0.45)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    // logs
    ctx.lineCap = 'round';
    const lit = b.fuel > 0;
    for (const [a, c] of [[0.5, lit ? '#6b4325' : '#2c2622'], [2.1, lit ? '#7a5030' : '#332c26'], [3.7, lit ? '#6b4325' : '#2c2622']] as [number, string][]) {
      ctx.strokeStyle = 'rgba(15,10,6,0.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 9, 3 + Math.sin(a) * 4);
      ctx.lineTo(-Math.cos(a) * 3, 3 - Math.sin(a) * 1.5);
      ctx.stroke();
      ctx.strokeStyle = c;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 9, 3 + Math.sin(a) * 4);
      ctx.lineTo(-Math.cos(a) * 3, 3 - Math.sin(a) * 1.5);
      ctx.stroke();
    }
    if (lit) {
      const size = 0.62 + 0.38 * Math.min(1, b.fuel / 700);
      const fl = (k: number) => 1 + 0.16 * Math.sin(simT * 12 + k * 2.1) + 0.08 * Math.sin(simT * 27 + k);
      const tongue = (dx: number, h: number, w: number, c1: string, c2: string, k: number) => {
        const hh = h * size * fl(k);
        const lean = Math.sin(simT * 5 + k) * 1.8;
        const g = ctx.createLinearGradient(0, 2, 0, -hh);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(dx - w, 2);
        ctx.quadraticCurveTo(dx - w * 1.1 + lean * 0.4, -hh * 0.5, dx + lean, -hh);
        ctx.quadraticCurveTo(dx + w * 1.1 + lean * 0.4, -hh * 0.5, dx + w, 2);
        ctx.closePath();
        ctx.fill();
      };
      tongue(-4, 17, 5, 'rgba(255,110,30,0.95)', 'rgba(255,170,50,0)', 1);
      tongue(4, 19, 5.4, 'rgba(255,100,25,0.95)', 'rgba(255,170,50,0)', 2);
      tongue(0, 25, 6.4, 'rgba(255,150,40,0.97)', 'rgba(255,210,90,0)', 3);
      tongue(0, 15, 3.4, 'rgba(255,235,150,0.97)', 'rgba(255,250,200,0)', 4);
    } else {
      // embers and ash
      ctx.fillStyle = 'rgba(70,64,60,0.7)';
      ctx.beginPath();
      ctx.ellipse(0, 3, 6, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ───────── construction sites ─────────
  drawSite(ctx: CanvasRenderingContext2D, s: Site, world: World, simT: number): void {
    this.sites.draw(ctx, s, world, simT);
  }

  // ───────── farm plots ─────────
  drawPlot(ctx: CanvasRenderingContext2D, pl: Plot, world: World, simT: number, wind: number): void {
    const P = (a: number, b: number): [number, number] => iso(pl.x + a, pl.y + b);
    const rowsDone = pl.state === 'tilling' ? pl.progress : 1;
    const c = [P(0.05, 0.05), P(0.95, 0.05), P(0.95, 0.95), P(0.05, 0.95)];
    const soil = pl.state === 'tilling' ? '#a98456' : pl.care > 0.55 ? '#6f4a2a' : '#80582f';
    poly(ctx, c, soil);
    // furrows
    ctx.lineCap = 'round';
    const nRows = 5;
    for (let r = 0; r < nRows; r++) {
      const t = 0.14 + (r / (nRows - 1)) * 0.72;
      const reach = Math.min(1, rowsDone * 1.15 - r * 0.06);
      if (reach <= 0) continue;
      const a = P(0.1, t);
      const b = P(0.1 + 0.8 * reach, t);
      ctx.strokeStyle = 'rgba(40,22,10,0.55)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,150,100,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] - 1.8);
      ctx.lineTo(b[0], b[1] - 1.8);
      ctx.stroke();
    }
    // plants
    if (pl.state === 'growing' || pl.state === 'ripe') {
      const g = pl.state === 'ripe' ? 1 : pl.progress;
      const h = 3 + 14 * Math.pow(g, 0.85);
      const wilt = pl.care < 0.25 && pl.state === 'growing';
      for (let r = 0; r < nRows; r++) {
        const t = 0.14 + (r / (nRows - 1)) * 0.72;
        for (let k = 0; k < 4; k++) {
          const u = 0.17 + k * 0.22 + (r % 2) * 0.05;
          const [px, py] = P(u, t);
          const sway = Math.sin(simT * 1.8 + r * 1.3 + k + pl.x) * (0.6 + wind * 2.8) * g;
          if (g < 0.12) {
            ctx.fillStyle = '#b4e08a';
            ctx.fillRect(px - 0.8, py - 2, 1.6, 2);
            continue;
          }
          ctx.strokeStyle = wilt ? '#a8a05a' : pl.state === 'ripe' ? '#c4b050' : '#6fb04c';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(px + sway * 0.4, py - h * 0.5, px + sway, py - h);
          ctx.stroke();
          if (pl.state === 'ripe') {
            ctx.fillStyle = '#e9c752';
            ctx.beginPath();
            ctx.ellipse(px + sway, py - h - 2.4, 1.7, 3.8, sway * 0.04, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,250,190,0.7)';
            ctx.fillRect(px + sway - 0.8, py - h - 5, 0.9, 2.4);
          } else if (g > 0.3) {
            ctx.fillStyle = wilt ? '#b5ad62' : '#8ad162';
            ctx.beginPath();
            ctx.ellipse(px + sway * 0.8 - 2.4, py - h * 0.55, 2.7, 1.2, -0.6, 0, Math.PI * 2);
            ctx.ellipse(px + sway * 0.8 + 2.4, py - h * 0.75, 2.7, 1.2, 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    // owner's marker: a little flag on the corner post
    const hh = world.households.find((x) => x.id === pl.hhId);
    if (hh) {
      const [fx, fy] = P(0.02, 0.98);
      ctx.strokeStyle = '#6d4c2c';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 1);
      ctx.lineTo(fx, fy - 11);
      ctx.stroke();
      ctx.fillStyle = HOUSEHOLD_COLORS[hh.color % HOUSEHOLD_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(fx, fy - 11);
      ctx.lineTo(fx + 6 + Math.sin(simT * 3 + pl.x) * 1, fy - 9);
      ctx.lineTo(fx, fy - 7);
      ctx.closePath();
      ctx.fill();
    }
    // care indicator (thirsty soil is paler)
    if (pl.state === 'growing' && pl.care < 0.3) {
      ctx.fillStyle = 'rgba(210,180,120,0.18)';
      ctx.beginPath();
      ctx.moveTo(c[0][0], c[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ───────── things lying about ─────────
  drawPile(ctx: CanvasRenderingContext2D, p: Pile): void {
    const [x, y] = iso(p.x + 0.5, p.y + 0.5);
    ctx.fillStyle = 'rgba(25,35,20,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    let slot = 0;
    const place = () => {
      const ox = [-6, 6, 0, -9, 9][slot % 5];
      const oy = [0, 1, -3, 3, -1][slot % 5];
      slot++;
      return [x + ox, y + oy] as const;
    };
    for (const k of Object.keys(p.items) as (keyof Pile['items'])[]) {
      const n = p.items[k] ?? 0;
      if (n <= 0) continue;
      const [px, py] = place();
      if (k === 'wood') {
        for (let i = 0; i < Math.min(3, Math.ceil(n / 2)); i++) {
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#8a6038';
          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.moveTo(px - 6, py - i * 3 + 1);
          ctx.lineTo(px + 6, py - i * 3 - 2);
          ctx.stroke();
        }
      } else if (k === 'stone') {
        for (let i = 0; i < Math.min(3, n); i++) ellipse(ctx, px + (i - 1) * 4, py - (i === 1 ? 4 : 1), 4, 3, shade('#a8a79f', 0.88 + i * 0.07));
      } else if (k === 'water') {
        ellipse(ctx, px, py - 3, 3, 4, '#6b8fb3');
      } else if (k === 'axe' || k === 'pick' || k === 'hoe' || k === 'basket' || k === 'hammer' || k === 'saw' || k === 'jar') {
        this.dropTool(ctx, k, px, py);
      } else if (k === 'planks') {
        blit(ctx, plankStack(this.cache, Math.ceil(n / 2)), px, py, 0.7);
      } else if (k === 'bricks') {
        blit(ctx, brickStack(this.cache, n), px, py, 0.8);
      } else if (k === 'clay' || k === 'ore' || k === 'charcoal') {
        blit(ctx, lumpHeap(this.cache, k, n), px, py, 0.75);
      } else if (k === 'iron') {
        blit(ctx, ironBars(this.cache, n), px, py, 0.8);
      } else if (k === 'flour') {
        blit(ctx, sackPile(this.cache, 'flour', Math.ceil(n / 2)), px, py, 0.7);
      } else if (k === 'bread') {
        blit(ctx, breadBasket(this.cache, n), px, py, 0.7);
      } else if (k === 'handles') {
        blit(ctx, handleBundle(this.cache, n), px, py, 0.8);
      } else {
        sack(ctx, px, py, k === 'fish' ? '#9ac1d4' : k === 'berries' ? '#b2486a' : k === 'fruit' ? '#e0823a' : k === 'seeds' ? '#8a6a3a' : '#d9b44a');
      }
    }
  }

  /** A tool dropped on the ground. */
  private dropTool(ctx: CanvasRenderingContext2D, k: string, px: number, py: number): void {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7a5434';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(px - 5, py);
    ctx.lineTo(px + 5, py - 5);
    ctx.stroke();
    ctx.fillStyle = '#b8b8b0';
    if (k === 'saw') {
      poly(ctx, [[px - 6, py - 1], [px + 6, py - 6], [px + 6, py - 3.5], [px - 6, py + 1.5]], '#c4c8ce', 'rgba(20,20,26,0.6)', 0.6);
    } else if (k === 'jar') {
      ellipse(ctx, px, py - 4, 4, 5, '#c98a5a');
      ellipse(ctx, px, py - 8.6, 2.2, 1.1, '#7a4a2c');
    } else if (k === 'hammer') {
      ctx.fillRect(px + 2, py - 8, 5, 4);
    } else if (k === 'basket') {
      ellipse(ctx, px, py - 3, 5, 3.4, '#b98a4f');
    } else {
      ctx.fillRect(px + 3, py - 8, 4.5, 3);
    }
  }
}
