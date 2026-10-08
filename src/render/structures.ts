// Every building drawing in one place: which sprite(s) a building type uses, and the measurements the rest of the renderer needs
// (how tall each one stands for click targets, where its chimney is, the heights that construction stages are built to).
import type { BuildingType } from '../sim/types';
import { GRANARY, BAKERY, HALL, bakerySprite, granaryBack, granaryFront, hallSprite } from './bld_food';
import { HOUSE, houseSprite } from './bld_home';
import { KILN, SMITHY, kilnSprite, quarrySprite, smithySprite, timberYardBack, timberYardFront } from './bld_work';
import { cellarSprite, clampSprite, foresterSprite, millSprite, mineSprite, smokehouseSprite, stockyardSprite, wellSprite } from './bld_service';
import { SpriteCache, classicBuildingSprite } from './sprites';
import type { Sprite } from './sprites';

export type BuildKind = Exclude<BuildingType, 'fire'>;

/**
 * The sprite layers of a building, back to front. Most are a single layer; a few (an open shed, a slatted granary) have a
 * back layer and a front layer so that stock can be painted between them.
 */
export function buildingLayers(cache: SpriteCache, kind: BuildKind, variant: number): Sprite[] {
  switch (kind) {
    case 'lean_to':
    case 'hut':
    case 'storehouse':
      return [classicBuildingSprite(cache, kind, variant)];
    case 'house':
      return [houseSprite(cache, variant)];
    case 'timber_yard':
      return [timberYardBack(cache, variant), timberYardFront(cache, variant)];
    case 'quarry':
      return [quarrySprite(cache, variant)];
    case 'kiln':
      return [kilnSprite(cache, variant)];
    case 'smithy':
      return [smithySprite(cache, variant)];
    case 'granary':
      return [granaryBack(cache, variant), granaryFront(cache, variant)];
    case 'bakery':
      return [bakerySprite(cache, variant)];
    case 'hall':
      return [hallSprite(cache, variant)];
    case 'well':
      return [wellSprite(cache, variant)];
    case 'cellar':
      return [cellarSprite(cache, variant)];
    case 'mine':
      return [mineSprite(cache, variant)];
    case 'forester':
      return [foresterSprite(cache, variant)];
    case 'stockyard':
      return [stockyardSprite(cache, variant)];
    case 'clamp':
      return [clampSprite(cache, variant)];
    case 'mill':
      return [millSprite(cache, variant)];
    case 'smokehouse':
      return [smokehouseSprite(cache, variant)];
    default:
      // a kind of building this renderer has no drawing for yet stands as a plain store rather than breaking the frame
      return [classicBuildingSprite(cache, 'storehouse', variant)];
  }
}

/** Footprint-relative position (tiles) and height (px) of a point on a building, such as a chimney top. */
export interface Anchor {
  x: number;
  y: number;
  z: number;
}

export interface StructMeta {
  /** height of the foundation course */
  plinth: number;
  /** height of the eaves (top of the walls) */
  wall: number;
  /** height of the highest part of the roof */
  top: number;
  /** how far above its footprint the thing stands, for click targets */
  click: number;
  /** where smoke comes out, if anything does */
  chimney?: Anchor;
  /** where the fire shows (forge mouth, kiln mouth, oven mouth, hearth) */
  mouth?: Anchor;
}

const STRUCT_TABLE: Record<BuildKind, StructMeta> = {
  lean_to: { plinth: 0, wall: 17, top: 41, click: 44 },
  hut: { plinth: 6, wall: 28, top: 57, click: 66, chimney: { x: 1.65, y: 0.85, z: 66 } },
  house: { plinth: HOUSE.plinth, wall: HOUSE.wall, top: HOUSE.chimneyTop + 4, click: 104, chimney: { x: HOUSE.chimney.x, y: HOUSE.chimney.y, z: HOUSE.chimneyTop + 4 } },
  storehouse: { plinth: 7, wall: 34, top: 69, click: 70 },
  timber_yard: { plinth: 0, wall: 34, top: 52, click: 66 },
  quarry: { plinth: 0, wall: 30, top: 68, click: 70 },
  kiln: { plinth: 4, wall: 30, top: 70, click: 76, chimney: { x: KILN.chimney.x, y: KILN.chimney.y, z: KILN.chimney.z + 4 }, mouth: KILN.mouth },
  smithy: { plinth: 5, wall: 28, top: 92, click: 98, chimney: { x: SMITHY.chimney.x, y: SMITHY.chimney.y, z: SMITHY.chimney.z + 4 }, mouth: SMITHY.mouth },
  granary: { plinth: GRANARY.legs, wall: GRANARY.bin, top: GRANARY.ridge + 4, click: 98 },
  bakery: { plinth: 5, wall: 30, top: 86, click: 92, chimney: { x: BAKERY.chimney.x, y: BAKERY.chimney.y - 0.1, z: BAKERY.chimney.z + 4 }, mouth: BAKERY.mouth },
  hall: { plinth: HALL.plinth, wall: HALL.wall, top: HALL.louvre.z + 8, click: 134, chimney: HALL.louvre },
  well: { plinth: 8, wall: 12, top: 42, click: 48 },
  cellar: { plinth: 0, wall: 18, top: 30, click: 40 },
  mine: { plinth: 0, wall: 28, top: 62, click: 66 },
  forester: { plinth: 0, wall: 22, top: 40, click: 48 },
  stockyard: { plinth: 0, wall: 14, top: 30, click: 40 },
  clamp: { plinth: 0, wall: 22, top: 46, click: 52, chimney: { x: 1.0, y: 1.0, z: 40 } },
  mill: { plinth: 6, wall: 62, top: 118, click: 122 },
  smokehouse: { plinth: 4, wall: 44, top: 74, click: 80, chimney: { x: 1.0, y: 0.5, z: 70 } },
};

/** measurements by building type; a type this file does not know yet is measured like a plain store, so a new kind never breaks a frame */
export const STRUCT = new Proxy(STRUCT_TABLE, {
  get: (t, k) => t[k as BuildKind] ?? t.storehouse,
}) as Record<BuildKind, StructMeta>;
