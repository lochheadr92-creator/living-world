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

// ───────────────────────────── mine (2 x 2) ─────────────────────────────
// A bank of bare rock and earth with a timbered portal, a spoil heap of dark ore at its foot and a little cart on a plank track.
export function mineSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`mine${v}`, 184, 150, 92, 94, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 66, 22, 0.3, 4);
    const rock = ['#8d877a', '#837f76', '#948b78', '#7f7c72'][v];
    // the bank: two steps of rock, grassed along the top
    box(ctx, p, 0.1, 1.9, 0.08, 0.86, 0, 26, { top: '#7a9a56', left: shade(rock, 1.04), right: shade(rock, 0.74), stroke: 'rgba(30,26,20,0.45)' });
    box(ctx, p, 0.3, 1.7, 0.08, 0.5, 26, 44, { top: '#80a05a', left: shade(rock, 1.0), right: shade(rock, 0.72), stroke: 'rgba(30,26,20,0.45)' });
    coursesL(ctx, p, 0.1, 1.9, 0.86, 0, 26, 3, 'rgba(50,44,36,0.4)');
    // the portal: two posts and a lintel round a black opening, props inside
    const wood = '#7d5a37';
    box(ctx, p, 0.62, 1.38, 0.84, 0.92, 0, 22, boxTones('#2a2420', 'rgba(10,8,6,0.7)'));
    box(ctx, p, 0.56, 0.68, 0.84, 0.96, 0, 26, boxTones(wood, 'rgba(25,14,6,0.6)'));
    box(ctx, p, 1.32, 1.44, 0.84, 0.96, 0, 26, boxTones(wood, 'rgba(25,14,6,0.6)'));
    box(ctx, p, 0.5, 1.5, 0.84, 0.96, 22, 28, boxTones(shade(wood, 1.1), 'rgba(25,14,6,0.6)'));
    // spoil heap of dark ore and grey rubble at the foot
    for (let i = 0; i < 12; i++) {
      const q = p(0.2 + hashLike(v, i, 1) * 0.9, 1.12 + hashLike(v, i, 2) * 0.55, 0);
      ellipse(ctx, q[0], q[1] - 1.5, 3 + hashLike(v, i, 3) * 3, 2.2, i % 3 === 0 ? '#5a5047' : shade('#3f3a38', 0.8 + hashLike(v, i, 4) * 0.5));
    }
    // a plank track and a cart
    line(ctx, p(0.85, 0.96, 0), p(1.35, 1.7, 0), 'rgba(60,44,28,0.7)', 2);
    line(ctx, p(1.05, 0.96, 0), p(1.55, 1.7, 0), 'rgba(60,44,28,0.7)', 2);
    const c = p(1.22, 1.38, 4);
    poly(ctx, [[c[0] - 8, c[1] - 7], [c[0] + 8, c[1] - 7], [c[0] + 6, c[1] + 1], [c[0] - 6, c[1] + 1]], '#6b4f30', 'rgba(25,14,6,0.7)', 0.8);
    ellipse(ctx, c[0], c[1] - 8, 7, 2.6, '#4a423c');
    ellipse(ctx, c[0] - 6, c[1] + 2, 2, 2, '#2b2420');
    ellipse(ctx, c[0] + 6, c[1] + 2, 2, 2, '#2b2420');
  });
}

function hashLike(a: number, b: number, c: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

// ───────────────────────────── forester's lodge (2 x 1) ─────────────────────────────
// A low timber lodge with a turf-edged nursery bed in front: three staked seedlings and a bundle of stakes against the wall.
export function foresterSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`forester${v}`, 130, 100, 65, 62, (ctx) => {
    const p = mk(2, 1);
    groundShadow(ctx, 48, 12, 0.3, 3);
    const wood = ['#8a6a43', '#80633f', '#93714a', '#7a5d3b'][v];
    // the lodge: a low box of timber under a turf-green roof
    box(ctx, p, 0.1, 1.9, 0.05, 0.5, 0, 22, { top: '#6f8f4e', left: shade(wood, 1.05), right: shade(wood, 0.76), stroke: 'rgba(25,14,6,0.55)' });
    box(ctx, p, 0.05, 1.95, 0.0, 0.55, 22, 28, { top: '#7da05a', left: '#7da05a', right: '#5f7f41', stroke: 'rgba(25,14,6,0.45)' });
    faceL(ctx, p, 0.3, 0.7, 0.505, 0, 15, '#4b361f', 'rgba(25,14,6,0.6)', 0.9);
    // the nursery bed: a low frame of boards with turned earth and seedlings
    box(ctx, p, 0.2, 1.8, 0.62, 0.98, 0, 4, { top: '#5a4630', left: '#9a7a4e', right: '#6e5434', stroke: 'rgba(25,14,6,0.5)' });
    for (let i = 0; i < 3; i++) {
      const b0 = p(0.5 + i * 0.5, 0.8, 4);
      line(ctx, b0, [b0[0], b0[1] - 7], '#8b6b45', 1.4);
      ellipse(ctx, b0[0], b0[1] - 10, 4.2, 3.4, ['#5f9446', '#6aa24e', '#558a3e'][(i + v) % 3]);
      ellipse(ctx, b0[0] - 1.5, b0[1] - 11.5, 2, 1.6, 'rgba(190,230,150,0.55)');
    }
    // stakes leaning on the wall
    for (let i = 0; i < 4; i++) line(ctx, p(1.55 + i * 0.07, 0.56, 0), p(1.5 + i * 0.07, 0.56, 24), '#c4a373', 1.5);
  });
}

// ───────────────────────────── stockyard (2 x 2) ─────────────────────────────
// An open yard: trodden ground inside a post-and-rail fence with a gap at the front; the stacks are drawn from what is really in it.
export function stockyardSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`stockyard${v}`, 184, 120, 92, 74, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 60, 20, 0.22, 4);
    const earth = ['rgba(170,150,110,0.8)', 'rgba(160,145,115,0.8)', 'rgba(176,156,112,0.8)', 'rgba(158,142,108,0.8)'][v];
    const [gx, gy] = p(1, 1, 0);
    ellipse(ctx, gx, gy, 54, 26, earth);
    const wood = '#7d5a37';
    const rail = (a: [number, number, number], b: [number, number, number]): void => {
      const q0 = p(a[0], a[1], a[2]);
      const q1 = p(b[0], b[1], b[2]);
      line(ctx, q0, q1, 'rgba(25,14,6,0.5)', 2.6);
      line(ctx, q0, q1, wood, 1.6);
    };
    const post = (x: number, y: number): void => {
      const q0 = p(x, y, 0);
      const q1 = p(x, y, 16);
      line(ctx, q0, q1, 'rgba(25,14,6,0.6)', 3.4);
      line(ctx, q0, q1, shade(wood, 1.1), 2.2);
    };
    // back-left and back-right sides, then the two front sides with a gap in the front corner
    const posts: [number, number][] = [
      [0.08, 0.08], [0.7, 0.08], [1.32, 0.08], [1.92, 0.08],
      [1.92, 0.7], [1.92, 1.32], [1.92, 1.92],
      [0.08, 0.7], [0.08, 1.32], [0.08, 1.92],
      [0.7, 1.92],
    ];
    for (const [x, y] of posts) post(x, y);
    for (const z of [6, 13]) {
      rail([0.08, 0.08, z], [1.92, 0.08, z]);
      rail([1.92, 0.08, z], [1.92, 1.92, z]);
      rail([0.08, 0.08, z], [0.08, 1.92, z]);
      rail([0.08, 1.92, z], [0.7, 1.92, z]);
    }
    // a few chips and a stray stone on the ground
    for (let i = 0; i < 6; i++) {
      const q = p(0.3 + hashLike(v, i, 5) * 1.4, 0.3 + hashLike(v, i, 6) * 1.4, 0);
      ellipse(ctx, q[0], q[1], 1.6 + hashLike(v, i, 7), 1, i % 2 ? '#b8a27a' : '#8f8a80');
    }
  });
}

// ───────────────────────────── charcoal clamp (2 x 2) ─────────────────────────────
// A domed stack of logs under turf and clay with a dark vent at the crown; a few logs and a rake beside it, soot on the ground.
export function clampSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`clamp${v}`, 150, 120, 75, 78, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 56, 22, 0.3, 4);
    const [cx, cy] = p(1, 1, 0);
    ellipse(ctx, cx, cy + 2, 46, 23, 'rgba(60,52,44,0.5)');
    const earth = ['#6e5a3c', '#66563c', '#735e40', '#625238'][v];
    // the dome: layered ellipses from the base up, earth below, turf toward the crown
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const rx = 34 * Math.sqrt(1 - t * t * 0.92);
      const ry = 17 * Math.sqrt(1 - t * t * 0.92);
      ellipse(ctx, cx, cy - i * 4, rx, ry, shade(i < 6 ? earth : '#6f8f4e', 1.0 - t * 0.25));
    }
    // log ends showing through the skin on the lit side
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.95 + 0.11 * i);
      ellipse(ctx, cx + Math.cos(a) * 26, cy - 6 + Math.sin(a) * 9, 3.2, 2.4, '#4a3421');
      ellipse(ctx, cx + Math.cos(a) * 26, cy - 6 + Math.sin(a) * 9, 1.6, 1.2, '#a6835a');
    }
    // the vent at the crown
    ellipse(ctx, cx, cy - 34, 5, 2.6, '#1c1814');
    // a rake and spare logs at the foot, soot on the ground
    line(ctx, p(1.75, 1.85, 0), p(1.9, 1.3, 24), '#8b6b45', 1.8);
    ellipse(ctx, p(0.3, 1.8, 0)[0], p(0.3, 1.8, 0)[1], 7, 3, 'rgba(30,26,22,0.45)');
  });
}
