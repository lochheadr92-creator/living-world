// The things held in the hand by the animations of anim_rig.ts. Each is drawn only when the person's own record holds it:
// a spear only if a spear is in their pack, a jar only if they carry one, a wolf skin only if they hold one. Presentation only.
import type { Person } from '../sim/types';
import type { AnimId } from './animation';
import { R } from './rig';
import type { Rig } from './rig';

type V3 = readonly [number, number, number];
type Part = { d: number; draw: () => void };

export function drawAnimProps(
  ctx: CanvasRenderingContext2D,
  parts: Part[],
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
  const inv = p.inv;
  const front = Math.max(handL[2], handR[2]) + 0.02;

  switch (anim) {
    case 'guard':
    case 'charge':
    case 'strike':
    case 'stalk': {
      if ((inv.spear ?? 0) <= 0) return;
      // a spear, along the facing from the right hand
      const ang = rig[R.TOOL];
      const ux = dirx * Math.cos(ang);
      const uy = diry * Math.cos(ang) - Math.sin(ang);
      const back = 11 * sc;
      const fwd = (anim === 'guard' ? 27 : 21) * sc;
      const x0 = handR[0] - ux * back;
      const y0 = handR[1] - uy * back;
      const x1 = handR[0] + ux * fwd;
      const y1 = handR[1] + uy * fwd;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(25,15,8,0.55)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.strokeStyle = '#9a7040';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          // the stone head
          const px = -uy;
          const py = ux;
          const hl = 5.5 * sc;
          const hw = 1.9 * sc;
          ctx.fillStyle = '#c9ccd2';
          ctx.strokeStyle = 'rgba(20,22,28,0.75)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(x1 + ux * hl, y1 + uy * hl);
          ctx.lineTo(x1 + px * hw, y1 + py * hw);
          ctx.lineTo(x1 - px * hw, y1 - py * hw);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'filljar': {
      if ((inv.jar ?? 0) <= 0) return;
      const mx = (handL[0] + handR[0]) / 2;
      const my = (handL[1] + handR[1]) / 2;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          const w = 4.2 * sc;
          const h = 5.4 * sc;
          const g = ctx.createLinearGradient(mx - w, my, mx + w, my);
          g.addColorStop(0, '#c98a58');
          g.addColorStop(1, '#8f5a34');
          ctx.fillStyle = g;
          ctx.strokeStyle = 'rgba(50,28,12,0.7)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(mx, my + h * 0.45, w, h, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // the mouth of the jar, wet when it has just come up
          ctx.fillStyle = rig[R.PH] < 0.35 ? '#7fb6d6' : '#5a3a22';
          ctx.beginPath();
          ctx.ellipse(mx, my - h * 0.45, w * 0.55, w * 0.24, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'hangskin': {
      if (!(p.wolfSkins && p.wolfSkins > 0)) return;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          const drop = 13 * sc;
          ctx.fillStyle = '#8b877f';
          ctx.strokeStyle = 'rgba(30,26,22,0.7)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(handL[0], handL[1]);
          ctx.lineTo(handR[0], handR[1]);
          ctx.lineTo(handR[0] + 1.5 * sc, handR[1] + drop * 0.7);
          ctx.lineTo((handL[0] + handR[0]) / 2 + 2 * sc, (handL[1] + handR[1]) / 2 + drop);
          ctx.lineTo((handL[0] + handR[0]) / 2 - 2 * sc, (handL[1] + handR[1]) / 2 + drop * 0.86);
          ctx.lineTo(handL[0] - 1.5 * sc, handL[1] + drop * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = 'rgba(60,56,50,0.6)';
          ctx.beginPath();
          ctx.moveTo((handL[0] + handR[0]) / 2, (handL[1] + handR[1]) / 2 + 1);
          ctx.lineTo((handL[0] + handR[0]) / 2, (handL[1] + handR[1]) / 2 + drop * 0.8);
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'feedfire': {
      // the piece of wood in the throwing hand, until it has left it
      if ((inv.wood ?? 0) <= 0 || rig[R.PH] > 0.6) return;
      parts.push({
        d: handR[2] + 0.02,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(25,15,8,0.55)';
          ctx.lineWidth = 4 * sc;
          ctx.beginPath();
          ctx.moveTo(handR[0] - dirx * 3.5 * sc, handR[1] - diry * 3.5 * sc - 1);
          ctx.lineTo(handR[0] + dirx * 4 * sc, handR[1] + diry * 4 * sc - 1);
          ctx.stroke();
          ctx.strokeStyle = '#a2723f';
          ctx.lineWidth = 3 * sc;
          ctx.beginPath();
          ctx.moveTo(handR[0] - dirx * 3.5 * sc, handR[1] - diry * 3.5 * sc - 1);
          ctx.lineTo(handR[0] + dirx * 4 * sc, handR[1] + diry * 4 * sc - 1);
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'whittle':
    case 'mend_tool': {
      // the piece being worked, held in the left hand across the lap
      const len = (anim === 'mend_tool' ? 12 : 8) * sc;
      const x0 = handL[0] - dirx * len * 0.3;
      const y0 = handL[1] - diry * len * 0.3 - 0.6;
      const x1 = handL[0] + dirx * len * 0.7;
      const y1 = handL[1] + diry * len * 0.7 - 1.4;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(40,25,10,0.5)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.strokeStyle = '#d8ae78';
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'play_sticks': {
      const ang = rig[R.TOOL];
      const ux = dirx * Math.cos(ang);
      const uy = diry * Math.cos(ang) - Math.sin(ang);
      const len = 11 * sc;
      parts.push({
        d: handR[2] + 0.02,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(40,25,10,0.5)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(handR[0] - ux * 2, handR[1] - uy * 2);
          ctx.lineTo(handR[0] + ux * len, handR[1] + uy * len);
          ctx.stroke();
          ctx.strokeStyle = '#9a6b3f';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(handR[0] - ux * 2, handR[1] - uy * 2);
          ctx.lineTo(handR[0] + ux * len, handR[1] + uy * len);
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    case 'play_toy': {
      if ((inv.toy ?? 0) <= 0) return;
      const mx = (handL[0] + handR[0]) / 2;
      const my = (handL[1] + handR[1]) / 2 - 2 * sc;
      parts.push({
        d: front,
        draw: () => {
          ctx.globalAlpha = bt;
          // a little wooden figure
          ctx.fillStyle = '#c89a62';
          ctx.strokeStyle = 'rgba(50,30,12,0.7)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.ellipse(mx, my, 1.8 * sc + 0.6, 2.8 * sc + 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(mx, my - 3.4 * sc - 0.8, 1.4 * sc + 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
      return;
    }
    default:
  }
}
