// Service and storage buildings of the village-economy expansion (docs/BUILDINGS.md). One small, recognisable silhouette each.
//   well   a round stone kerb, a windlass on two posts under a little plank roof, a rope and a bucket
import { cylinder } from './iso3d';
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
