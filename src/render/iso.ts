// Isometric projection shared by the renderer, input handling and UI (minimap, fly-to).
// World coordinates are in tiles; tile (i, j) covers [i, i+1) x [j, j+1).
// Screen-space is in pixels at zoom 1.

export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

/** world (tiles) -> isometric plane pixels (zoom 1, before camera) */
export function project(x: number, y: number): { sx: number; sy: number } {
  return { sx: (x - y) * HALF_W, sy: (x + y) * HALF_H };
}

export function projectX(x: number, y: number): number {
  return (x - y) * HALF_W;
}

export function projectY(x: number, y: number): number {
  return (x + y) * HALF_H;
}

/** isometric plane pixels -> world (tiles) on the ground plane */
export function unproject(sx: number, sy: number): { x: number; y: number } {
  const a = sx / HALF_W; // x - y
  const b = sy / HALF_H; // x + y
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
