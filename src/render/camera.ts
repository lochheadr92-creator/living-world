import type { CameraState } from '../app/game';
import { MAP_H, MAP_W } from '../sim/constants';
import { clamp } from '../sim/util';
import { project, unproject } from './iso';

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3.2;

export function clampCamera(c: CameraState, viewW: number, viewH: number): void {
  c.zoom = clamp(c.zoom, MIN_ZOOM, MAX_ZOOM);
  // keep the middle of the view somewhere over the map
  const a = project(0, 0);
  const b = project(MAP_W, 0);
  const d = project(0, MAP_H);
  const e = project(MAP_W, MAP_H);
  const minX = Math.min(a.sx, d.sx);
  const maxX = Math.max(b.sx, e.sx);
  const minY = a.sy - 40;
  const maxY = e.sy + 60;
  c.x = clamp(c.x, minX, maxX);
  c.y = clamp(c.y, minY, maxY);
  void viewW;
  void viewH;
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
