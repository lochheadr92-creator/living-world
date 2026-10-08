// Service and storage buildings of the village-economy expansion (docs/BUILDINGS.md). One small, recognisable silhouette each.
//   well   a round stone kerb, a windlass on two posts under a little plank roof, a rope and a bucket
import { box, boxTones, coursesL, cylinder, faceL, faceT } from './iso3d';
import { SpriteCache, ellipse, groundShadow, line, mk, poly, shade } from './sprites';
import type { Sprite } from './sprites';

// ───────────────────────────── well (1 x 1) ─────────────────────────────
export function wellSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`well${v}`, 84, 92, 42, 66, (ctx) => {
    const p = mk(1, 1);
    groundShadow(ctx, 28, 10, 0.3, 2);
    const stone = ['#b9b5a6', '#aeb0a8', '#c2baa4', '#a9ab9c'][v];
    const [cx, cy] = p(0.5, 0.5, 0);
    // trodden ground and a few pebbles round the kerb
    ellipse(ctx, cx, cy + 1, 30, 14, 'rgba(120,100,70,0.35)');
    // the kerb and the dark water below its lip
    cylinder(ctx, cx, cy, 21, 15, shade(stone, 1.08), shade(stone, 0.7), shade(stone, 0.9));
    ellipse(ctx, cx, cy - 15, 15, 7.5, '#2d5a73');
    ellipse(ctx, cx - 3, cy - 16.5, 7, 2.6, 'rgba(180,220,235,0.35)');
    // courses of stone on the kerb
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.15 + 0.14 * i);
      line(ctx, [cx + Math.cos(a) * 21, cy + Math.sin(a) * 10.5], [cx + Math.cos(a) * 21, cy + Math.sin(a) * 10.5 - 15], 'rgba(60,56,48,0.4)', 0.8);
    }
    // two posts, a windlass beam between them, and a little plank roof
    const wood = '#7d5a37';
    const a0 = p(0.12, 0.5, 14);
    const a1 = p(0.12, 0.5, 52);
    const b0 = p(0.88, 0.5, 14);
    const b1 = p(0.88, 0.5, 52);
    for (const [s, e] of [[a0, a1], [b0, b1]] as const) {
      line(ctx, s, e, 'rgba(25,14,6,0.55)', 4.2);
      line(ctx, s, e, wood, 2.8);
    }
    const beamA = p(0.12, 0.5, 40);
    const beamB = p(0.88, 0.5, 40);
    line(ctx, beamA, beamB, 'rgba(25,14,6,0.55)', 4.2);
    line(ctx, beamA, beamB, shade(wood, 1.15), 3);
    poly(ctx, [p(0.04, 0.22, 52), p(0.96, 0.22, 52), p(0.96, 0.78, 44), p(0.04, 0.78, 44)], '#8d6842', 'rgba(30,18,8,0.5)', 0.9);
    line(ctx, p(0.04, 0.5, 48), p(0.96, 0.5, 48), 'rgba(30,18,8,0.35)', 0.8);
    // rope and bucket
    const mid = p(0.5, 0.5, 40);
    const bucket = p(0.5, 0.5, 22);
    line(ctx, mid, [bucket[0], bucket[1] - 3], '#d4c08a', 1.2);
    poly(ctx, [[bucket[0] - 3.5, bucket[1] - 3], [bucket[0] + 3.5, bucket[1] - 3], [bucket[0] + 2.8, bucket[1] + 3], [bucket[0] - 2.8, bucket[1] + 3]], '#6e4d2c', 'rgba(25,14,6,0.6)', 0.7);
  });
}

// ───────────────────────────── cellar (2 x 1) ─────────────────────────────
/** a grassed earth bank with a stone-framed timber door set into its front, and a vent pipe */
export function cellarSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`cellar${v}`, 120, 92, 60, 56, (ctx) => {
    const p = mk(2, 1);
    groundShadow(ctx, 44, 12, 0.3, 3);
    const earth = ['#7b6a48', '#74684a', '#806e4a', '#6f6247'][v];
    // the mound: a low box of earth, grassed on top
    box(ctx, p, 0.05, 1.95, 0.1, 0.95, 0, 14, { top: '#7da05a', left: shade(earth, 1.0), right: shade(earth, 0.75), stroke: 'rgba(30,24,16,0.4)' });
    for (let i = 0; i < 9; i++) {
      const q = p(0.2 + i * 0.2, 0.25 + ((i * 37) % 5) * 0.12, 14);
      ctx.fillStyle = 'rgba(70,110,50,0.55)';
      ctx.fillRect(q[0] - 1, q[1] - 2, 2, 3);
    }
    // the stone frame and the door
    const stone = '#b3ad9b';
    box(ctx, p, 0.55, 1.45, 0.88, 1.0, 0, 20, boxTones(stone, 'rgba(50,46,38,0.55)'));
    coursesL(ctx, p, 0.55, 1.45, 1.0, 0, 20, 3, 'rgba(60,56,48,0.4)');
    faceL(ctx, p, 0.7, 1.3, 1.004, 0, 15, '#5c4129', 'rgba(25,14,6,0.6)', 0.9);
    for (let i = 1; i < 4; i++) {
      const x = 0.7 + 0.15 * i;
      const a = p(x, 1.004, 0);
      const b = p(x, 1.004, 15);
      ctx.strokeStyle = 'rgba(25,14,6,0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.fillStyle = '#c9b27a';
    const knob = p(1.2, 1.004, 7);
    ctx.fillRect(knob[0] - 1.2, knob[1] - 1.2, 2.4, 2.4);
    faceT(ctx, p, 0.55, 1.45, 0.88, 1.0, 20, shade(stone, 1.12), 'rgba(50,46,38,0.55)', 0.8);
    // a vent pipe on the bank
    const vent = p(1.7, 0.4, 14);
    box(ctx, p, 1.64, 1.76, 0.34, 0.46, 14, 26, boxTones('#8e8a7d'));
    ctx.fillStyle = 'rgba(20,18,14,0.7)';
    ctx.fillRect(vent[0] - 2, vent[1] - 13, 4, 2);
  });
}
