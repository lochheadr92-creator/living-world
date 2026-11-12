import { conditionAt } from './ecology';
import { nearestHub } from './settlements';
import { growthRate } from './hardship';
import { cropPlenty } from './plenty';
import { CARE_DECAY, GROW_TICKS, RIPE_ROT_TICKS } from './constants';
import { ledgerCreate, ledgerSpoil } from './economy';
import { addEvent, addFx } from './events';
import { homeBuildingOf } from './households';
import { hashUnit } from './rng';
import { isFreeLand, isWalkable, newId, registerPlot } from './registry';
import { findPath } from './pathfinding';
import { recentFailure } from './knowledge';
import { runsRulesVersion } from './rulesversion';
import type { Person, Plot, World } from './types';
import { T } from './types';
import { dist } from './util';

export function createPlot(world: World, x: number, y: number, hhId: number): Plot {
  const pl: Plot = {
    ent: 'plot',
    id: newId(world),
    x,
    y,
    hhId,
    state: 'tilling',
    progress: 0,
    care: 0.5,
    careAcc: 0.5,
    stock: 0,
    seedStock: 0,
    sownTick: 0,
    ripeTick: 0,
    claimedBy: 0,
    lastTended: 0,
    variant: Math.floor(hashUnit(x, y, 31) * 4),
  };
  registerPlot(world, pl);
  return pl;
}

/** Growth, care decay and rotting: all the ways a crop changes over time. */
export function updatePlots(world: World): void {
  const w = world.weather;
  for (const pl of world.plots) {
    if (pl.state === 'growing') {
      pl.care = Math.max(0, pl.care - CARE_DECAY + w.rain * 0.0011);
      pl.care = Math.min(1, pl.care);
      pl.careAcc += (pl.care - pl.careAcc) * 0.002;
      const lightF = 0.25 + 0.75 * world.light;
      const warm = w.temp < 4 ? 0.4 : 1;
      pl.progress += (1 / GROW_TICKS) * (0.45 + 0.55 * pl.care) * lightF * warm * growthRate(world) * (0.5 + 0.5 * conditionAt(world, pl.x, pl.y));
      if (pl.progress >= 1) {
        pl.progress = 1;
        pl.state = 'ripe';
        pl.ripeTick = world.tick;
        const grain = Math.max(1, Math.floor((3 + Math.round(pl.careAcc * 4)) * (0.5 + 0.5 * conditionAt(world, pl.x, pl.y)))) * cropPlenty(world); // rules 226 (plenty.ts): a plot carries more grain
        const seeds = 1 + (pl.careAcc > 0.6 ? 1 : 0);
        pl.stock = grain;
        pl.seedStock = seeds;
        ledgerCreate(world, 'grain', grain, 'crop growth');
        ledgerCreate(world, 'seeds', seeds, 'crop growth');
        addFx(world, 'ripe', pl.x + 0.5, pl.y + 0.5, 0);
        const hh = world.households.find((h) => h.id === pl.hhId);
        if (hh && world.tick - (world.stats.lastRipeEvent ?? -9999) > 700) {
          world.stats.lastRipeEvent = world.tick;
          addEvent(world, 'farm', `Crops are ripening in the ${hh.name} field.`, [], pl.x, pl.y);
        }
      }
    } else if (pl.state === 'ripe') {
      if (world.tick - pl.ripeTick > RIPE_ROT_TICKS) {
        ledgerSpoil(world, 'grain', pl.stock, 'crop left to rot');
        ledgerSpoil(world, 'seeds', pl.seedStock, 'crop left to rot');
        pl.stock = 0;
        pl.seedStock = 0;
        pl.state = 'tilled';
        pl.progress = 0;
        addEvent(world, 'farm', 'A ripe crop was left too long and rotted.', [], pl.x, pl.y);
      }
    }
  }
}

/** Where could this person start a new field plot? Near home, on grass they have seen, next to other plots if possible. */
let reachableTilling=true;
export const reachableTillingOn=()=>reachableTilling;
export function setReachableTilling(on:boolean):void{reachableTilling=on;}
export const hasReachableTilling=(w:World)=>reachableTilling&&w.settings.dynamics==='rich'&&runsRulesVersion(w,118);
/** Negative, disjoint from entity IDs and the existing small negative generic failure keys. */
export const plotFailureKey=(w:World,x:number,y:number)=>-100000-y*w.W-x;
export function findPlotSpot(world: World, p: Person): { x: number; y: number; spotX?:number; spotY?:number } | null {
  const home = homeBuildingOf(world, p);
  const hub = nearestHub(world, p.x, p.y);
  const ax = home ? home.x + home.w / 2 : hub.x;
  const ay = home ? home.y + home.h / 2 : hub.y;
  const mine = world.plots.filter((pl) => pl.hhId === p.hhId);
  let best: { x: number; y: number; spotX?:number; spotY?:number } | null = null;
  let bs = -1e9;
  for (let y = Math.floor(ay - 13); y <= Math.ceil(ay + 13); y++) {
    for (let x = Math.floor(ax - 13); x <= Math.ceil(ax + 13); x++) {
      if (!isFreeLand(world, x, y)) continue;
      const i = y * world.W + x;
      if (world.terrain[i] !== T.GRASS) continue;
      if (p.explored[i] === 0) continue;
      if (world.waterDist[i] < 2) continue;
      const d = dist(x + 0.5, y + 0.5, ax, ay);
      if (d < 3 || d > 13) continue;
      // keep a walkway: avoid tiles whose door-front is occupied by building footprints
      let score = -d * 0.5 + hashUnit(p.id, x, y) * 1.4;
      let adj = 0;
      for (const pl of mine) {
        const dd = Math.abs(pl.x - x) + Math.abs(pl.y - y);
        if (dd === 1) adj += 1;
      }
      if (mine.length > 0) score += adj > 0 ? 4 + adj : -2;
      if (world.waterDist[i] < 9) score += 1.2;
      // not on top of other households' land
      for (const o of world.plots) if (o.hhId !== p.hhId && Math.abs(o.x - x) + Math.abs(o.y - y) < 3) score -= 3;
      if (score > bs) {
        if(hasReachableTilling(world)){
          if(recentFailure(world,p,plotFailureKey(world,x,y),800))continue;
          // Keep the former south-side position where reachable; otherwise try the other adjacent sides.
          const standing=[[x,y+1],[x+1,y],[x,y-1],[x-1,y]].find(([sx,sy])=>
            isWalkable(world,sx,sy)&&findPath(world,p.x,p.y,sx+0.5,sy+0.5,{exact:{x:sx+0.5,y:sy+0.5},cart:!!p.cartId,caller:'field standing'})!==null);
          if(!standing)continue;
          bs=score;best={x,y,spotX:standing[0]+0.5,spotY:standing[1]+0.5};continue;
        }
        bs = score;
        best = { x, y };
      }
    }
  }
  return best;
}
