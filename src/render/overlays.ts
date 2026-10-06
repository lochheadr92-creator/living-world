import type { Entity, Person, Speech, World } from '../sim/types';
import type { ActivityKind } from '../sim/types';
import { NEED_COLORS } from './palette';

// ───────────────────────── world-space overlays (drawn in the iso plane) ─────────────────────────
export function drawFootprintHighlight(ctx: CanvasRenderingContext2D, e: Entity, simT: number, color = '255,214,120', strong = true): void {
  let x: number, y: number, w: number, h: number;
  if (e.ent === 'building' || e.ent === 'site') {
    x = e.x;
    y = e.y;
    w = e.w;
    h = e.h;
  } else {
    x = (e as { x: number }).x;
    y = (e as { y: number }).y;
    w = 1;
    h = 1;
  }
  const P = (a: number, b: number): [number, number] => [(a - b) * 32, (a + b) * 16];
  const c = [P(x - 0.06, y - 0.06), P(x + w + 0.06, y - 0.06), P(x + w + 0.06, y + h + 0.06), P(x - 0.06, y + h + 0.06)];
  ctx.beginPath();
  ctx.moveTo(c[0][0], c[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]);
  ctx.closePath();
  ctx.fillStyle = `rgba(${color},${strong ? 0.16 + 0.06 * Math.sin(simT * 4) : 0.1})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${color},${strong ? 0.95 : 0.6})`;
  ctx.lineWidth = strong ? 2.2 : 1.4;
  ctx.setLineDash(strong ? [] : [5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawPerceptionRadius(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, simT: number): void {
  ctx.beginPath();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wx = x + Math.cos(a) * r;
    const wy = y + Math.sin(a) * r;
    const sx = (wx - wy) * 32;
    const sy = (wx + wy) * 16;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(120,200,255,0.07)';
  ctx.fill();
  ctx.strokeStyle = `rgba(150,215,255,${0.55 + 0.15 * Math.sin(simT * 3)})`;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawPath(ctx: CanvasRenderingContext2D, p: Person, x: number, y: number, simT: number): void {
  const a = p.activity;
  if (!a || a.phase !== 'travel' || a.pi >= a.path.length) return;
  ctx.beginPath();
  ctx.moveTo((x - y) * 32, (x + y) * 16);
  for (let i = a.pi; i < a.path.length; i += 2) {
    const wx = a.path[i];
    const wy = a.path[i + 1];
    ctx.lineTo((wx - wy) * 32, (wx + wy) * 16);
  }
  ctx.strokeStyle = 'rgba(255,214,120,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.lineDashOffset = -simT * 14;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  const gx = a.spotX;
  const gy = a.spotY;
  const sx = (gx - gy) * 32;
  const sy = (gx + gy) * 16;
  ctx.strokeStyle = 'rgba(255,214,120,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 7 + Math.sin(simT * 5) * 1.2, 3.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx - 3, sy - 1.5);
  ctx.lineTo(sx + 3, sy + 1.5);
  ctx.moveTo(sx + 3, sy - 1.5);
  ctx.lineTo(sx - 3, sy + 1.5);
  ctx.stroke();
}

const BELIEF_COLOR: Record<string, string> = {
  berry_bush: '#d6456b',
  fruit_tree: '#f0904a',
  tree: '#7bbb5c',
  rock: '#b9b8b0',
  fish_spot: '#7ac7e0',
  wild_grain: '#e6c85a',
  water: '#4fa8e0',
  building: '#d8b078',
  site: '#e6a050',
  plot: '#b6d460',
  pile: '#c9a46c',
  grave: '#aab',
  danger: '#e5463e',
  clay_pit: '#e2955f',
  ore_vein: '#e0a24c',
  outcrop: '#e4e1d2',
  cart: '#d1a96c',
};

/** shapes for the deposits and carts, so they can be told apart from the round markers without relying on colour */
const BELIEF_SHAPE: Record<string, 'diamond' | 'tri' | 'square'> = { ore_vein: 'diamond', outcrop: 'tri', cart: 'square' };

function markerPath(ctx: CanvasRenderingContext2D, shape: 'diamond' | 'tri' | 'square' | undefined, x: number, y: number, r: number): void {
  ctx.beginPath();
  if (shape === 'diamond') {
    ctx.moveTo(x, y - r * 1.25);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r * 1.25);
    ctx.lineTo(x - r, y);
    ctx.closePath();
  } else if (shape === 'tri') {
    ctx.moveTo(x, y - r * 1.2);
    ctx.lineTo(x + r * 1.1, y + r * 0.8);
    ctx.lineTo(x - r * 1.1, y + r * 0.8);
    ctx.closePath();
  } else if (shape === 'square') {
    ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  } else ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** What this person remembers: markers faded by age; hollow rings are things they only heard about. */
export function drawKnowledge(ctx: CanvasRenderingContext2D, world: World, p: Person, simT: number): void {
  for (const k in p.beliefs) {
    const b = p.beliefs[k as unknown as number];
    if (b.kind === 'tree' && (Number(k) + Math.floor(simT * 0)) % 3 !== 0) continue; // thin out trees: there are hundreds
    const age = world.tick - b.seen;
    const fresh = Math.max(0.22, 1 - age / 7000);
    const col = BELIEF_COLOR[b.kind] ?? '#fff';
    const sx = (b.x - b.y) * 32;
    const sy = (b.x + b.y) * 16 - 4;
    ctx.globalAlpha = fresh;
    const shape = BELIEF_SHAPE[b.kind];
    if (b.src === 'told') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      markerPath(ctx, shape, sx, sy, 4.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.8;
      markerPath(ctx, shape, sx, sy, b.kind === 'tree' ? 2.4 : 4);
      ctx.fill();
      ctx.stroke();
    }
    if (b.kind === 'danger' && b.amount > 0) {
      ctx.strokeStyle = '#e5463e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 9 + Math.sin(simT * 6) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ───────────────────────── glyphs for the "intentions" overlay ─────────────────────────
/**
 * `target` is whatever names the job: the kind of source being worked, or for a workshop the recipe being made.
 * Colours follow the families of work: wood and stone are tan, fire and metal copper, bread and food gold, carrying slate blue.
 */
export function glyphFor(kind: ActivityKind, target?: string): { id: string; color: string } | null {
  switch (kind) {
    case 'gather':
      if (target === 'clay_pit') return { id: 'spade', color: '#e2955f' };
      if (target === 'ore_vein') return { id: 'pick', color: '#e0a24c' };
      if (target === 'outcrop') return { id: 'pick', color: '#dcd8c8' };
      return { id: target === 'tree' ? 'axe' : target === 'rock' ? 'pick' : target === 'fish_spot' ? 'fish' : 'berries', color: target === 'tree' || target === 'rock' ? '#c79a62' : '#e9a23b' };
    case 'operate':
      switch (target) {
        case 'saw_planks':
        case 'hew_planks':
        case 'split_handles':
          return { id: 'saw', color: '#d8b57a' };
        case 'build_cart':
          return { id: 'cart', color: '#c79a62' };
        case 'quarry_stone':
          return { id: 'pick', color: '#dcd8c8' };
        case 'fire_bricks':
        case 'fire_jar':
          return { id: 'brick', color: '#e0775a' };
        case 'burn_charcoal':
          return { id: 'flame', color: '#e8904a' };
        case 'smelt_iron':
          return { id: 'anvil', color: '#e8a36a' };
        case 'mill_flour':
          return { id: 'wheat', color: '#e6c85a' };
        case 'bake_bread':
          return { id: 'loaf', color: '#e6b25a' };
        case 'tend_granary':
          return { id: 'sprout', color: '#9bd36a' };
        case 'smoke_fish':
          return { id: 'fish', color: '#d9a35a' };
        default:
          return target && target.startsWith('forge_') ? { id: 'anvil', color: '#e8a36a' } : { id: 'hammer', color: '#d8a960' };
      }
    case 'tool_work':
      return { id: 'wrench', color: '#bcc7d4' };
    case 'cart_haul':
      return { id: 'cart', color: '#9fb6d2' };
    case 'attend_meal':
    case 'host_meal':
      return { id: 'plate', color: '#f0c98a' };
    case 'visit':
      return { id: 'door', color: '#e07bb0' };
    case 'return_tool':
      return { id: 'undo', color: '#bcc7d4' };
    case 'eat':
    case 'eat_store':
      return { id: 'apple', color: NEED_COLORS.hunger };
    case 'drink':
    case 'fetch_water':
      return { id: 'drop', color: NEED_COLORS.thirst };
    case 'sleep':
      return { id: 'zzz', color: NEED_COLORS.energy };
    case 'rest':
      return { id: 'dots', color: NEED_COLORS.energy };
    case 'warm':
    case 'fuel_fire':
      return { id: 'flame', color: NEED_COLORS.warmth };
    case 'build':
    case 'repair':
    case 'craft':
    case 'plan_site':
      return { id: 'hammer', color: '#d8a960' };
    case 'haul':
    case 'deposit':
    case 'withdraw':
      return { id: 'crate', color: '#c9a46c' };
    case 'till':
      return { id: 'hoe', color: '#b6d460' };
    case 'plant':
    case 'tend':
      return { id: 'sprout', color: '#9bd36a' };
    case 'harvest':
      return { id: 'wheat', color: '#e6c85a' };
    case 'socialize':
    case 'converse':
      return { id: 'speech', color: NEED_COLORS.social };
    case 'give':
    case 'care':
      return { id: 'heart', color: '#f06a9a' };
    case 'flee':
      return { id: 'bang', color: '#e5463e' };
    case 'explore':
    case 'search':
      return { id: 'compass', color: '#8ec5ff' };
    case 'argue':
      return { id: 'zig', color: '#e5463e' };
    case 'claim_home':
      return { id: 'crate', color: '#c9a46c' };
    default:
      return null;
  }
}

export function drawGlyphBadge(ctx: CanvasRenderingContext2D, id: string, color: string, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(14,22,30,0.82)';
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  const u = s / 10;
  ctx.scale(u, u);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (id) {
    case 'berries':
      for (const [a, b] of [[-2.5, 1.5], [2.5, 1.5], [0, -2.2]]) {
        ctx.beginPath();
        ctx.arc(a, b, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'axe':
      ctx.beginPath();
      ctx.moveTo(-4, 5);
      ctx.lineTo(3, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, -6);
      ctx.lineTo(6, -2);
      ctx.lineTo(2.5, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case 'pick':
      ctx.beginPath();
      ctx.moveTo(-4, 5);
      ctx.lineTo(3, -3);
      ctx.moveTo(-3, -5);
      ctx.quadraticCurveTo(2, -7.5, 6, -1);
      ctx.stroke();
      break;
    case 'fish':
      ctx.beginPath();
      ctx.ellipse(-1, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3.5, 0);
      ctx.lineTo(7, -3);
      ctx.lineTo(7, 3);
      ctx.closePath();
      ctx.fill();
      break;
    case 'apple':
      ctx.beginPath();
      ctx.arc(0, 1.5, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7bbb5c';
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(1, -6, 4, -6);
      ctx.stroke();
      break;
    case 'drop':
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(6, 1, 0, 6);
      ctx.quadraticCurveTo(-6, 1, 0, -6);
      ctx.fill();
      break;
    case 'zzz':
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('z', -1.5, 2.5);
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('z', 3.5, -3);
      break;
    case 'dots':
      for (const a of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.arc(a, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'flame':
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.quadraticCurveTo(6, -1, 3, 4);
      ctx.quadraticCurveTo(0, 7, -3, 4);
      ctx.quadraticCurveTo(-5, 0, 0, -6.5);
      ctx.fill();
      break;
    case 'hammer':
      ctx.beginPath();
      ctx.moveTo(-4.5, 5);
      ctx.lineTo(2, -2);
      ctx.stroke();
      ctx.fillRect(-0.5, -6.5, 7, 4.2);
      break;
    case 'crate':
      ctx.strokeRect(-4.5, -3.5, 9, 7.5);
      ctx.beginPath();
      ctx.moveTo(-4.5, 0);
      ctx.lineTo(4.5, 0);
      ctx.stroke();
      break;
    case 'hoe':
      ctx.beginPath();
      ctx.moveTo(-4, 5);
      ctx.lineTo(3, -4);
      ctx.moveTo(1, -6);
      ctx.lineTo(6, -3);
      ctx.stroke();
      break;
    case 'sprout':
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(0, -1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-3, -2.5, 3.2, 1.8, -0.6, 0, Math.PI * 2);
      ctx.ellipse(3, -3.5, 3.2, 1.8, 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'wheat':
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, -5);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(-2.6, -4 + i * 3, 1.5, 2.4, -0.6, 0, Math.PI * 2);
        ctx.ellipse(2.6, -4 + i * 3, 1.5, 2.4, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'speech':
      ctx.beginPath();
      ctx.ellipse(0, -0.5, 6, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-2, 3);
      ctx.lineTo(-4, 6.5);
      ctx.lineTo(1, 3.5);
      ctx.fill();
      break;
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(0, 5.5);
      ctx.bezierCurveTo(-9, -1, -4, -7, 0, -2.5);
      ctx.bezierCurveTo(4, -7, 9, -1, 0, 5.5);
      ctx.fill();
      break;
    case 'bang':
      ctx.fillRect(-1.4, -6, 2.8, 8);
      ctx.beginPath();
      ctx.arc(0, 4.6, 1.7, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'compass':
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(3.2, 0);
      ctx.lineTo(0, 6.5);
      ctx.lineTo(-3.2, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'zig':
      ctx.beginPath();
      ctx.moveTo(-3, -6);
      ctx.lineTo(2, -1);
      ctx.lineTo(-2, 1);
      ctx.lineTo(3, 6);
      ctx.stroke();
      break;
    case 'saw':
      // a blade with a handle
      ctx.beginPath();
      ctx.moveTo(-5.5, 2.5);
      ctx.lineTo(4.5, -3.5);
      ctx.lineTo(5.5, -1);
      ctx.lineTo(-4.5, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(4.5, -3.5);
      ctx.lineTo(6.5, -6);
      ctx.stroke();
      break;
    case 'anvil':
      ctx.beginPath();
      ctx.moveTo(-6.5, -2.5);
      ctx.lineTo(5.5, -2.5);
      ctx.lineTo(5.5, 0);
      ctx.lineTo(2, 1.2);
      ctx.lineTo(2, 3);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.lineTo(-2, 3);
      ctx.lineTo(-2, 1.2);
      ctx.lineTo(-4.5, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case 'loaf':
      ctx.beginPath();
      ctx.ellipse(0, 1, 6.6, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0e1822';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-3.2, -0.8);
      ctx.lineTo(-1.8, 2.4);
      ctx.moveTo(0, -1.6);
      ctx.lineTo(1.4, 2);
      ctx.moveTo(3, -0.8);
      ctx.lineTo(4, 2.2);
      ctx.stroke();
      break;
    case 'brick':
      ctx.fillRect(-6.5, -4, 8, 3.8);
      ctx.fillRect(-1.5, 0.2, 8, 3.8);
      break;
    case 'cart':
      ctx.beginPath();
      ctx.moveTo(-5.5, -3);
      ctx.lineTo(4.5, -3);
      ctx.lineTo(3.5, 1.5);
      ctx.lineTo(-4.5, 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-0.5, 3.6, 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4.5, -2);
      ctx.lineTo(7, -5);
      ctx.stroke();
      break;
    case 'wrench':
      ctx.beginPath();
      ctx.moveTo(-4.5, 5);
      ctx.lineTo(1.2, -0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2.6, -2.8, 3.1, 0.7, Math.PI * 2 - 0.9);
      ctx.stroke();
      break;
    case 'plate':
      ctx.beginPath();
      ctx.ellipse(0, 1, 6.6, 3.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 1, 3.3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'door':
      ctx.beginPath();
      ctx.moveTo(-4.5, 6);
      ctx.lineTo(-4.5, -1);
      ctx.arc(0, -1, 4.5, Math.PI, 0);
      ctx.lineTo(4.5, 6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2, 2.4, 0.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'undo':
      ctx.beginPath();
      ctx.moveTo(-4, -3);
      ctx.lineTo(2, -3);
      ctx.quadraticCurveTo(6.5, -3, 6.5, 1);
      ctx.quadraticCurveTo(6.5, 5, 2, 5);
      ctx.lineTo(-2, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(-5.5, -3);
      ctx.lineTo(-2, 0);
      ctx.stroke();
      break;
    case 'spade':
      ctx.beginPath();
      ctx.moveTo(-1, -6);
      ctx.lineTo(-1, 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, 1);
      ctx.lineTo(2, 1);
      ctx.lineTo(1.5, 6);
      ctx.lineTo(-3.5, 6);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

// ───────────────────────── speech bubbles & labels (screen space) ─────────────────────────
const FONT = '600 12px Inter, "Segoe UI", system-ui, sans-serif';
const BUBBLE: Record<Speech['kind'], { bg: string; fg: string; edge: string }> = {
  say: { bg: 'rgba(250,250,246,0.96)', fg: '#1f2a33', edge: 'rgba(40,50,60,0.45)' },
  ask: { bg: 'rgba(224,240,255,0.97)', fg: '#16324a', edge: 'rgba(60,110,160,0.6)' },
  warn: { bg: 'rgba(255,226,222,0.97)', fg: '#5b1a14', edge: 'rgba(190,70,60,0.7)' },
  angry: { bg: 'rgba(255,230,205,0.97)', fg: '#5a2a0a', edge: 'rgba(210,110,40,0.75)' },
  happy: { bg: 'rgba(226,250,226,0.97)', fg: '#1e4a26', edge: 'rgba(80,160,90,0.6)' },
  think: { bg: 'rgba(235,238,242,0.9)', fg: '#4a5560', edge: 'rgba(100,110,120,0.5)' },
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function drawBubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, kind: Speech['kind'], alpha: number, scale = 1): { w: number; h: number } {
  ctx.save();
  ctx.font = FONT;
  const lines = wrap(ctx, text, 170);
  const lh = 15;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const h = lines.length * lh + 10;
  const col = BUBBLE[kind];
  const bx = x - w / 2;
  const by = y - h - 9;
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 6 * scale;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = col.bg;
  roundRect(ctx, bx, by, w, h, 8);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = col.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  // tail
  ctx.fillStyle = col.bg;
  ctx.beginPath();
  ctx.moveTo(x - 5, by + h - 0.5);
  ctx.lineTo(x, by + h + 7);
  ctx.lineTo(x + 5, by + h - 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = col.edge;
  ctx.beginPath();
  ctx.moveTo(x - 5, by + h);
  ctx.lineTo(x, by + h + 7);
  ctx.lineTo(x + 5, by + h);
  ctx.stroke();
  ctx.fillStyle = col.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, by + 5 + lh * i + lh / 2));
  ctx.restore();
  return { w, h };
}

export function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, emphasis = false): void {
  ctx.save();
  ctx.font = emphasis ? '700 12.5px Inter, "Segoe UI", system-ui, sans-serif' : '600 11px Inter, "Segoe UI", system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  const h = emphasis ? 19 : 16;
  ctx.fillStyle = emphasis ? 'rgba(16,24,32,0.88)' : 'rgba(16,24,32,0.7)';
  roundRect(ctx, x - w / 2, y - h, w, h, 7);
  ctx.fill();
  if (emphasis) {
    ctx.strokeStyle = 'rgba(255,214,120,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = emphasis ? '#ffe3a3' : '#e9eef2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - h / 2 + 0.5);
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
