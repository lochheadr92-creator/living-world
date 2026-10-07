// The geometry of the minimap's picture of a world. Pure functions of the world's size, kept apart from the drawing so they can be
// tested without a page.
import { HALF_H, HALF_W } from '../render/iso';

/** bounds of a world's whole map in isometric-plane pixels (the map is a diamond: its corners reach the edges of this box) */
export function mapBounds(world: { W: number; H: number }): { sxMin: number; sxSpan: number; sySpan: number } {
  return { sxMin: -world.H * HALF_W, sxSpan: (world.W + world.H) * HALF_W, sySpan: (world.W + world.H) * HALF_H };
}

/** how finely the terrain layer is sampled: 2x2 per pixel for the ordinary map, finer for a map with more tiles than pixels */
export function supersampling(world: { W: number; H: number }): number {
  return Math.min(4, Math.max(2, Math.ceil(Math.max(world.W, world.H) / 80)));
}

/** how large to draw a building or a site: as drawn for the ordinary map, smaller where the map has many more tiles to the pixel */
export function markScale(world: { W: number; H: number }): number {
  return Math.max(0.5, Math.min(1, 100 / Math.max(world.W, world.H)));
}
