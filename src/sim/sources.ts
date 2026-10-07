import { hubWithin } from './settlements';
import { SAPLING_TICKS, SOURCE_ITEM, SOURCE_MAX, SOURCE_REGROW } from './constants';
import { ledgerCreate } from './economy';
import { addFx } from './events';
import { hashUnit } from './rng';
import { isFreeLand, newId, registerSource, unregisterSource } from './registry';
import type { Source, SourceType, World } from './types';
import { T } from './types';

export function makeSource(world: World, type: SourceType, x: number, y: number, amount?: number, growth = 1): Source {
  const s: Source = {
    ent: 'source',
    id: newId(world),
    type,
    x,
    y,
    item: SOURCE_ITEM[type],
    amount: amount ?? SOURCE_MAX[type],
    max: SOURCE_MAX[type],
    reserved: 0,
    regrowEvery: SOURCE_REGROW[type] * (world.settings.harsh ? 1.7 : 1),
    regrowTimer: Math.floor(hashUnit(x, y, 5) * SOURCE_REGROW[type]),
    variant: Math.floor(hashUnit(x, y, 13) * 4),
    growth,
    solid: type === 'tree' || type === 'rock' || type === 'fruit_tree' || type === 'ore_vein' || type === 'outcrop',
    lastTaker: 0,
    lastTakeTick: -9999,
  };
  registerSource(world, s);
  if (type === 'tree') world.stats.trees = (world.stats.trees ?? 0) + 1;
  return s;
}

export function fellTree(world: World, s: Source): void {
  unregisterSource(world, s);
  world.stats.trees = (world.stats.trees ?? 1) - 1;
  world.stumps.push({ x: s.x, y: s.y, tick: world.tick });
  addFx(world, 'fell', s.x + 0.5, s.y + 0.5, s.variant);
}

function treesNear(world: World, x: number, y: number, r: number): number {
  let n = 0;
  for (let yy = y - r; yy <= y + r; yy++) {
    for (let xx = x - r; xx <= x + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= world.W || yy >= world.H) continue;
      const id = world.occ[yy * world.W + xx];
      if (!id) continue;
      const e = world.byId.get(id);
      if (e && e.ent === 'source' && e.type === 'tree') n++;
    }
  }
  return n;
}

/** Renewal and growth: every unit created here is recorded in the ledger as an explicit world process. */
export function updateSources(world: World): void {
  const rainBoost = 1 + 0.8 * world.weather.rain;
  const list = world.sources;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.type === 'tree') {
      if (s.growth < 1) {
        s.growth = Math.min(1, s.growth + 1 / SAPLING_TICKS);
        const target = Math.floor(s.max * s.growth + 1e-6);
        if (s.amount < target) {
          s.amount++;
          ledgerCreate(world, 'wood', 1, 'tree growth');
        }
      } else if ((world.tick + i) % 240 === 0 && s.amount >= 2 && (world.stats.trees ?? 0) < (world.stats.treeCap ?? 0) && world.rng.next() < 0.0035) {
        // seed a sapling nearby (forest slowly recovers)
        const dx = world.rng.int(7) - 3;
        const dy = world.rng.int(7) - 3;
        const tx = s.x + dx;
        const ty = s.y + dy;
        if ((dx || dy) && isFreeLand(world, tx, ty)) {
          const t = world.terrain[ty * world.W + tx];
          const nearCamp = hubWithin(world, tx, ty, 7);
          if ((t === T.GRASS || t === T.FOREST) && !nearCamp && treesNear(world, tx, ty, 3) < 9 && world.waterDist[ty * world.W + tx] > 1) {
            makeSource(world, 'tree', tx, ty, 0, 0.02);
          }
        }
      }
      continue;
    }
    if (s.regrowEvery > 0 && s.amount < s.max) {
      s.regrowTimer += rainBoost;
      if (s.regrowTimer >= s.regrowEvery) {
        s.regrowTimer = 0;
        s.amount++;
        ledgerCreate(world, s.item, 1, 'regrowth: ' + s.type.replace('_', ' '));
      }
    }
  }
}
