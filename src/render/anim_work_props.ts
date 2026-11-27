// Work (H): the things held in the hand by the work animations of anim_work.ts. Each is drawn only when the record holds it:
// a jar only if one is carried, the piece being set only if the site has that material on hand, the catch, the fruit and the
// bundle only for the unit the activity is about to take. Presentation only.
import type { Person, Site, World } from '../sim/types';
import type { AnimId } from './animation';
import { R } from './rig';
import type { Rig } from './rig';

type V3 = readonly [number, number, number];
type Part = { d: number; draw: () => void };

/** the colour of the small thing in the hand while somebody eats it (`data.food` of the eat activity) */
export const FOOD_DOT: Readonly<Record<string, string>> = {
  berries: '#a8294f', fruit: '#e0723a', grain: '#d9b44a', fish: '#9ac1d4', bread: '#d3ad78', meat: '#b5523b', dried_fish: '#b9a98a', smoked_fish: '#a98a62',
  dried_meat: '#8d4a35', smoked_meat: '#7d4332', rendered_fat: '#efe6c8', milk: '#f3f1ea', cheese: '#e4c45c', egg: '#f1e8cf', pork: '#c9755f', bacon: '#b8553f',
};

/** which piece the builder is setting: the materials the site has on hand, taken in turn, one for each piece (the record names no single "next" one) */
const PIECES = ['planks', 'stone', 'bricks', 'wood'] as const;
export function pieceOf(site: Site, n: number): (typeof PIECES)[number] | null {
  let have = 0;
  for (const k of PIECES) if ((site.delivered[k] ?? 0) > 0) have++;
  if (have === 0) return null;
  let want = ((n % have) + have) % have;
  for (const k of PIECES) {
    if ((site.delivered[k] ?? 0) <= 0) continue;
    if (want === 0) return k;
    want--;
  }
  return null;
}

export function drawWorkProps(
  ctx: CanvasRenderingContext2D,
  parts: Part[],
  world: World,
  p: Person,
  anim: AnimId,
  rig: Rig,
  handL: V3,
  handR: V3,
  fx: number,
  fy: number,
  sc: number,
  bt: number,
): void {
  // direction on screen of "forward"
  const fxS = (fx - fy) * 32;
  const fyS = (fx + fy) * 16;
  const flen = Math.hypot(fxS, fyS) || 1;
  const dirx = fxS / flen;
  const diry = fyS / flen;
  const front = Math.max(handL[2], handR[2]) + 0.02;
  const mx = (handL[0] + handR[0]) / 2;
  const my = (handL[1] + handR[1]) / 2;
  const ph = rig[R.PH];

  switch (anim) {
    case 'pick_tree': {
      // the fruit just brought down to the other arm
      if (ph < 0.4) return;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.fillStyle = '#e0723a';
          ctx.strokeStyle = 'rgba(60,24,8,0.6)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.arc(handR[0], handR[1] - 1.2, 2.2 * sc, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'pick_bush': {
      // what the picking hand takes to the hip
      if (ph < 0.25) return;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.fillStyle = '#a8294f';
          ctx.strokeStyle = 'rgba(50,10,24,0.6)';
          ctx.lineWidth = 0.6;
          for (const [ox, oy] of [[-1.1, 0.4], [1, -0.6], [0, -1.8]]) {
            ctx.beginPath();
            ctx.arc(handR[0] + ox * sc, handR[1] + oy * sc - 1.2, 1.5 * sc, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'reap': {
      // the bundle of stalks held at the chest, the ears at the top, bound round the middle
      if (ph < 0.4) return;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt * Math.min(1, ph * 1.5);
          ctx.lineCap = 'round';
          const bx = mx - dirx * 0.5;
          const by = my + 3.4 * sc;
          for (const [w, col] of [[2.6, 'rgba(60,40,10,0.5)'], [1.5, '#d6b552']] as [number, string][]) {
            ctx.strokeStyle = col;
            ctx.lineWidth = w;
            for (const o of [-3.2, -1.1, 1.1, 3.2]) {
              ctx.beginPath();
              ctx.moveTo(bx + o * 0.35 * sc, by);
              ctx.lineTo(bx + o * sc, by - 11 * sc);
              ctx.stroke();
            }
          }
          ctx.strokeStyle = '#7a5a28';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(bx - 2.2 * sc, by - 3.6 * sc);
          ctx.lineTo(bx + 2.2 * sc, by - 3.8 * sc);
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'fish_cast':
    case 'fish_hand': {
      // the catch, as it comes up (the unit this activity takes is a fish)
      if (ph < 0.3) return;
      const x = anim === 'fish_hand' ? mx : handL[0];
      const y = anim === 'fish_hand' ? my - 2 * sc : handL[1] + 1;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.fillStyle = '#a9c8d8';
          ctx.strokeStyle = 'rgba(30,50,70,0.7)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.ellipse(x, y, 4.2 * sc, 1.9 * sc, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - 3.6 * sc, y + 1.4 * sc);
          ctx.lineTo(x - 6.4 * sc, y + 3.2 * sc);
          ctx.lineTo(x - 6 * sc, y - 0.4 * sc);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'water_crop': {
      // the pour: a jar only if one is carried, the stream from whatever the water is poured from
      const tip = ph;
      if (tip < 0.12) return;
      const jar = (p.inv.jar ?? 0) > 0;
      const side = dirx >= 0 ? 1 : -1;
      const th = tip * 1.15 * side;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          const w = 3.6 * sc;
          const h = 4.8 * sc;
          const cx = mx;
          const cy = my - 2 * sc;
          // the mouth, after the tilt
          const mxp = cx + Math.sin(th) * h * 0.95;
          const myp = cy - Math.cos(th) * h * 0.95;
          if (jar) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(th);
            const g = ctx.createLinearGradient(-w, 0, w, 0);
            g.addColorStop(0, '#c98a58');
            g.addColorStop(1, '#8f5a34');
            ctx.fillStyle = g;
            ctx.strokeStyle = 'rgba(50,28,12,0.7)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#5a3a22';
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.95, w * 0.5, w * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          // the stream (water is in the pack: it is what the activity spends)
          ctx.strokeStyle = 'rgba(150,200,235,0.9)';
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(mxp, myp);
          ctx.quadraticCurveTo(mxp + dirx * 4, myp + 3, mxp + dirx * 5.5, myp + 14 * sc + 5);
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'plant_tree':
    case 'take_cutting': {
      // the cutting, only if one is in the pack (it is what is set into the ground; and what the sap-cut branch becomes)
      if (ph < 0.3 || (p.inv.cutting ?? 0) <= 0) return;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#7a5434';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(handR[0], handR[1] + 3 * sc);
          ctx.lineTo(handR[0] + 0.5, handR[1] - 12 * sc);
          ctx.stroke();
          ctx.fillStyle = '#5f9a47';
          ctx.beginPath();
          ctx.ellipse(handR[0] - 1.6, handR[1] - 11 * sc, 2.8 * sc, 1.5 * sc, -0.5, 0, Math.PI * 2);
          ctx.ellipse(handR[0] + 2.2, handR[1] - 13 * sc, 2.8 * sc, 1.5 * sc, 0.5, 0, Math.PI * 2);
          ctx.ellipse(handR[0] + 0.3, handR[1] - 15.5 * sc, 2.3 * sc, 1.3 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'raise': {
      // the piece being lifted and set: a material the site has on hand
      if (ph < 0.5) return;
      const a = p.activity;
      const site = a ? world.byId.get(a.targetId) : undefined;
      if (!a || !site || site.ent !== 'site') return;
      const kind = pieceOf(site, Math.floor(a.progress / 42));
      if (!kind) return;
      // across the body, between the hands
      const px = -diry;
      const py = dirx;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.lineCap = 'round';
          if (kind === 'planks' || kind === 'wood') {
            const half = (kind === 'planks' ? 8 : 9) * sc;
            const wd = (kind === 'planks' ? 3 : 4.2) * sc;
            const col = kind === 'planks' ? '#e3c58f' : '#9a6b3f';
            ctx.strokeStyle = 'rgba(40,25,10,0.55)';
            ctx.lineWidth = wd + 1.2;
            ctx.beginPath();
            ctx.moveTo(mx - px * half, my - py * half * 0.5);
            ctx.lineTo(mx + px * half, my + py * half * 0.5);
            ctx.stroke();
            ctx.strokeStyle = col;
            ctx.lineWidth = wd;
            ctx.beginPath();
            ctx.moveTo(mx - px * half, my - py * half * 0.5);
            ctx.lineTo(mx + px * half, my + py * half * 0.5);
            ctx.stroke();
          } else {
            ctx.fillStyle = kind === 'bricks' ? '#b4573a' : '#aeaca4';
            ctx.strokeStyle = 'rgba(30,26,22,0.7)';
            ctx.lineWidth = 0.8;
            const bw = (kind === 'bricks' ? 6 : 7) * sc;
            const bh = (kind === 'bricks' ? 3.6 : 6) * sc;
            ctx.beginPath();
            ctx.rect(mx - bw, my - bh * 0.5 - 1.5, bw * 2, bh);
            ctx.fill();
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    default:
  }
}
