import type { CameraState } from '../app/game';
import { clamp } from '../sim/util';
import { TILE_H, TILE_W, project, unproject } from './iso';

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3.2;

/** the ordinary world's size in tiles: its widest view (all of it) is as much ground as any world is drawn at once */
const ORDINARY_TILES = 80 * 80;

/**
 * The widest the view may be. For the ordinary world (and anything not larger) it is MIN_ZOOM, as it always was. For a larger world it is
 * the zoom at which the window shows no more ground than the ordinary world's widest view does (about 6,400 tiles), so that a frame is
 * never made to draw many times what the ordinary world's costs; the minimap is the way to see the rest of a large world.
 */
export function minZoomFor(size: { W: number; H: number }, view: { w: number; h: number }): number {
  if (size.W * size.H <= ORDINARY_TILES) return MIN_ZOOM;
  const tileArea = (TILE_W * TILE_H) / 2; // one tile on the isometric plane, in pixels at zoom 1
  return Math.max(MIN_ZOOM, Math.sqrt((view.w * view.h) / (tileArea * ORDINARY_TILES)));
}

/**
 * Keep the camera within the zoom limits and the middle of the view somewhere over the map. The map is whatever size the world is:
 * 80x80 for the ordinary world, larger for the larger ones.
 */
export function clampCamera(c: CameraState, size: { W: number; H: number }, view: { w: number; h: number }): void {
  c.zoom = clamp(c.zoom, minZoomFor(size, view), MAX_ZOOM);
  const a = project(0, 0);
  const b = project(size.W, 0);
  const d = project(0, size.H);
  const e = project(size.W, size.H);
  const minX = Math.min(a.sx, d.sx);
  const maxX = Math.max(b.sx, e.sx);
  const minY = a.sy - 40;
  const maxY = e.sy + 60;
  c.x = clamp(c.x, minX, maxX);
  c.y = clamp(c.y, minY, maxY);
}

export function worldToScreen(c: CameraState, viewW: number, viewH: number, wx: number, wy: number): { x: number; y: number } {
  const p = project(wx, wy);
  return { x: (p.sx - c.x) * c.zoom + viewW / 2, y: (p.sy - c.y) * c.zoom + viewH / 2 };
}

export function screenToWorld(c: CameraState, viewW: number, viewH: number, px: number, py: number): { x: number; y: number } {
  return unproject((px - viewW / 2) / c.zoom + c.x, (py - viewH / 2) / c.zoom + c.y);
}

/** Ease the camera toward its fly target / the followed person, using real elapsed time (never simulation time). */
export function updateCamera(
  cam: CameraState,
  dt: number,
  follow: { x: number; y: number } | null,
  fly: { x: number; y: number; zoom: number | null } | null,
): boolean {
  const k = 1 - Math.pow(0.0009, Math.min(dt, 0.1));
  let flyDone = false;
  if (fly) {
    cam.x += (fly.x - cam.x) * k;
    cam.y += (fly.y - cam.y) * k;
    if (fly.zoom !== null) cam.zoom += (fly.zoom - cam.zoom) * k;
    if (Math.hypot(fly.x - cam.x, fly.y - cam.y) < 1.5 && (fly.zoom === null || Math.abs(fly.zoom - cam.zoom) < 0.01)) flyDone = true;
  } else if (follow) {
    const kk = 1 - Math.pow(0.004, Math.min(dt, 0.1));
    cam.x += (follow.x - cam.x) * kk;
    cam.y += (follow.y - cam.y) * kk;
  }
  return flyDone;
}
