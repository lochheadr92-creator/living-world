// The house: a hut rebuilt in place with planked walls, a brick plinth, a tiled roof and a tall brick chimney on the gable.
import { box, boxTones, coursesL, faceL, faceR } from './iso3d';
import { chimneyStack, doorL, gableR, roofEdge, roofFront, windowL } from './bld_common';
import type { Roof } from './bld_common';
import { SpriteCache, groundShadow, line, mk, plankLines, poly, shade } from './sprites';
import type { Sprite } from './sprites';

export const HOUSE = { plinth: 9, wall: 41, ridge: 82, chimneyTop: 101, chimney: { x: 2.07, y: 1.0 } } as const;

export function houseSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`house${v}`, 188, 188, 94, 130, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 70, 27, 0.32, 4);
    const x0 = 0.1;
    const x1 = 1.9;
    const y0 = 0.1;
    const y1 = 1.9;
    const ym = 1.0;
    const { plinth: PL, wall: WT, ridge: RG } = HOUSE;
    const plank = ['#ecdcb8', '#e4d3ac', '#f0e1c0', '#ddcba3'][v];
    const roofC = ['#b9623f', '#ab5a3c', '#c06c46', '#a3573b'][v];
    const shutter = ['#5c8a7e', '#4f6f94', '#8c4f4a', '#6d7f4a'][v];
    const trim = '#5a3e29';
    const brick = '#b4573f';

    // brick plinth
    faceL(ctx, p, x0 - 0.04, x1 + 0.04, y1 + 0.04, 0, PL, brick, 'rgba(50,20,12,0.45)', 0.8);
    faceR(ctx, p, x1 + 0.04, y0 - 0.04, y1 + 0.04, 0, PL, shade(brick, 0.78), 'rgba(50,20,12,0.45)', 0.8);
    coursesL(ctx, p, x0 - 0.04, x1 + 0.04, y1 + 0.04, 0, PL, 3, 'rgba(235,205,175,0.42)');
    line(ctx, p(x0 - 0.04, y1 + 0.04, PL), p(x1 + 0.04, y1 + 0.04, PL), 'rgba(255,240,215,0.5)', 1.1);
    line(ctx, p(x1 + 0.04, y0 - 0.04, PL), p(x1 + 0.04, y1 + 0.04, PL), 'rgba(255,240,215,0.3)', 1.1);

    // planked walls
    faceL(ctx, p, x0, x1, y1, PL, WT, plank, 'rgba(70,46,24,0.45)', 0.8);
    faceR(ctx, p, x1, y0, y1, PL, WT, shade(plank, 0.8), 'rgba(70,46,24,0.45)', 0.8);
    plankLines(ctx, p, 'L', x0, x1, y0, y1, PL, WT, 15, 'rgba(110,80,40,0.28)');
    plankLines(ctx, p, 'R', x0, x1, y0, y1, PL, WT, 15, 'rgba(80,55,28,0.3)');
    // timber frame: posts, a mid rail and the top plate
    for (const t of [x0, 0.66, 1.33, x1]) line(ctx, p(t, y1, PL), p(t, y1, WT), trim, 2);
    for (const t of [y0, 0.66, 1.33]) line(ctx, p(x1, t, PL), p(x1, t, WT), trim, 2);
    line(ctx, p(x0, y1, 26), p(x1, y1, 26), trim, 1.5);
    line(ctx, p(x1, y0, 26), p(x1, y1, 26), trim, 1.5);
    line(ctx, p(x0, y1, WT), p(x1, y1, WT), trim, 2.4);
    line(ctx, p(x1, y0, WT), p(x1, y1, WT), trim, 2.4);

    // gable on the right face, with a round window
    gableR(ctx, p, x1, y0, y1, ym, WT, RG - 6, shade(plank, 0.7), 12, 'rgba(80,55,28,0.3)');
    // a tie beam across the gable
    line(ctx, p(x1, y0 + 0.2, WT + 10), p(x1, y1 - 0.2, WT + 10), trim, 1.6);

    // door with an arch, a stone step and a lintel
    box(ctx, p, 0.27, 0.81, y1, y1 + 0.13, 0, 3.6, boxTones('#a9a79e'));
    doorL(ctx, p, 0.33, 0.77, y1, PL, PL + 26, { fill: '#5b3a22', frame: '#2c1b10', arch: true, planks: 3, knob: '#e0b848', strap: '#2a2420' });
    // two shuttered windows
    windowL(ctx, p, 1.05, 1.33, y1, PL + 11, PL + 26, { frame: '#f3ead2', glass: '#4a6677', shutter });
    windowL(ctx, p, 1.52, 1.8, y1, PL + 11, PL + 26, { frame: '#f3ead2', glass: '#4a6677', shutter });
    // a window box with something growing in it
    for (const [a, b] of [
      [1.0, 1.38],
      [1.47, 1.85],
    ] as [number, number][]) {
      box(ctx, p, a, b, y1, y1 + 0.07, PL + 6, PL + 10, boxTones('#7a5636'));
      for (let i = 0; i < 4; i++) {
        const q = p(a + 0.05 + ((b - a - 0.1) * i) / 3, y1 + 0.05, PL + 11);
        ctx.fillStyle = i % 2 ? '#e86a8a' : '#f5d44e';
        ctx.beginPath();
        ctx.arc(q[0], q[1], 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5d9a46';
        ctx.fillRect(q[0] - 0.7, q[1] + 0.6, 1.4, 2);
      }
    }

    // tiled roof with a good overhang
    const roof: Roof = { x0, x1, ym, yE: y1, zE: WT - 5, zR: RG, ox: 0.15, oy: 0.17, base: roofC, tex: 'tiles', v };
    roofFront(ctx, p, roof);
    roofEdge(ctx, p, roof, '#6e3320');

    // brick chimney stack against the gable end, standing well above the ridge
    chimneyStack(ctx, p, HOUSE.chimney.x, HOUSE.chimney.y, 0.15, 0, HOUSE.chimneyTop, brick);
  });
}
