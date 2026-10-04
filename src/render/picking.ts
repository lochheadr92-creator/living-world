import type { Game } from '../app/game';
import { gridQuery } from '../sim/registry';
import type { Entity } from '../sim/types';
import { worldToScreen } from './camera';
import { HALF_H, HALF_W } from './iso';
import { STRUCT } from './structures';
import type { BuildKind } from './structures';

/** How tall (screen px at zoom 1) each kind of thing stands above its footprint, for click targets. */
function heightOf(e: Entity): number {
  switch (e.ent) {
    case 'source':
      return e.type === 'tree'
        ? 78 * (0.45 + 0.55 * e.growth)
        : e.type === 'fruit_tree'
          ? 70
          : e.type === 'rock'
            ? 26
            : e.type === 'berry_bush'
              ? 22
              : e.type === 'wild_grain'
                ? 20
                : e.type === 'outcrop'
                  ? 46
                  : e.type === 'ore_vein'
                    ? 34
                    : 8;
    case 'building':
      return e.type === 'fire' ? 30 : STRUCT[e.type as BuildKind].click;
    case 'site':
      // a site stands as high as the walls and roof that have gone up so far (never less than its stakes and heaps)
      return e.type === 'fire' ? 30 : Math.max(40, STRUCT[e.type as BuildKind].top * Math.min(1, 0.4 + (e.work / Math.max(1, e.workTotal)) * 0.8));
    case 'plot':
      return 10;
    case 'pile':
      return 14;
    case 'grave':
      return 22;
    default:
      return 0;
  }
}

function footprint(e: Entity): { x: number; y: number; w: number; h: number } {
  if (e.ent === 'building' || e.ent === 'site') return { x: e.x, y: e.y, w: e.w, h: e.h };
  const p = e as { x: number; y: number };
  return { x: p.x, y: p.y, w: 1, h: 1 };
}

/** Is the screen point inside the (extruded) footprint of the entity? */
function hitStatic(game: Game, vw: number, vh: number, e: Entity, px: number, py: number): number {
  const f = footprint(e);
  const z = game.camera.zoom;
  const H = heightOf(e);
  // four ground corners
  const c = [worldToScreen(game.camera, vw, vh, f.x, f.y), worldToScreen(game.camera, vw, vh, f.x + f.w, f.y), worldToScreen(game.camera, vw, vh, f.x + f.w, f.y + f.h), worldToScreen(game.camera, vw, vh, f.x, f.y + f.h)];
  const minX = Math.min(c[0].x, c[1].x, c[2].x, c[3].x);
  const maxX = Math.max(c[0].x, c[1].x, c[2].x, c[3].x);
  const minY = Math.min(c[0].y, c[1].y, c[2].y, c[3].y) - H * z;
  const maxY = Math.max(c[0].y, c[1].y, c[2].y, c[3].y);
  if (px < minX || px > maxX || py < minY || py > maxY) return -1;
  // trees and other tall thin things: narrower than the footprint box
  if (e.ent === 'source' && (e.type === 'tree' || e.type === 'fruit_tree')) {
    const cx = (c[0].x + c[2].x) / 2;
    if (Math.abs(px - cx) > 20 * z * (e.type === 'tree' ? 0.6 + 0.4 * e.growth : 1)) return -1;
  }
  // prefer the one drawn in front (the scaffold round a home being rebuilt is in front of the home)
  return f.x + f.y + f.w + f.h + (e.ent === 'site' && e.upgradeOf ? 0.3 : 0);
}

export function pickEntity(game: Game, vw: number, vh: number, px: number, py: number): number {
  const w = game.world;
  const cam = game.camera;
  const z = cam.zoom;
  let best = 0;
  let bestScore = 1e9;

  // people and animals first: small targets that should win over scenery
  const test = (id: number, x: number, y: number, headH: number, r: number) => {
    const feet = worldToScreen(cam, vw, vh, x, y);
    const topY = feet.y - headH * z;
    const dx = px - feet.x;
    // distance to the vertical segment feet..top
    const t = Math.max(0, Math.min(1, (py - topY) / Math.max(1, feet.y - topY)));
    const sy = topY + t * (feet.y - topY);
    const d = Math.hypot(dx, py - sy);
    if (d < r * z && d < bestScore) {
      bestScore = d;
      best = id;
    }
  };
  for (const p of w.persons) {
    if (!p.alive) continue;
    const a = game.renderAlpha;
    const x = p.px + (p.x - p.px) * a;
    const y = p.py + (p.y - p.py) * a;
    test(p.id, x, y, 30, 13);
  }
  for (const an of w.animals) {
    const a = game.renderAlpha;
    test(an.id, an.px + (an.x - an.px) * a, an.py + (an.y - an.py) * a, 16, 15);
  }
  for (const c of w.carts) {
    const a = game.renderAlpha;
    test(c.id, c.px + (c.x - c.px) * a, c.py + (c.y - c.py) * a, 12, 17);
  }
  if (best) return best;

  // then scenery: find the front-most hit among nearby statics
  const cx = px;
  const cy = py;
  const ground = ((): { x: number; y: number } => {
    const sx = (cx - vw / 2) / z + cam.x;
    const sy = (cy - vh / 2) / z + cam.y;
    const a = sx / HALF_W;
    const b = sy / HALF_H;
    return { x: (a + b) / 2, y: (b - a) / 2 };
  })();
  let bestDepth = -1;
  gridQuery(w.grid, ground.x + 2, ground.y + 2, 7, (e) => {
    if (e.ent === 'plot' || e.ent === 'pile' || e.ent === 'grave' || e.ent === 'source' || e.ent === 'building' || e.ent === 'site') {
      const d = hitStatic(game, vw, vh, e, px, py);
      if (d > bestDepth) {
        bestDepth = d;
        best = e.id;
      }
    }
  });
  return best;
}
