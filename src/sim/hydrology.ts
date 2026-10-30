import { DAY } from './constants';
import { ledgerCreate, ledgerSpoil } from './economy';
import { runsRulesVersion } from './rulesversion';
import { T } from './types';
import type { World } from './types';

export type WaterSign = 'wet' | 'low' | 'dry';
export interface WaterBody {
  id: number;
  tiles: number[];
  capacity: number;
  amount: number;
  rainAcc: number;
  evaporationAcc: number;
  drawn: number;
  replenished: number;
  evaporated: number;
  lastDraw?: number;
}
let enabled = true;
export const setWaterBudget = (on: boolean): void => { enabled = on; };
export const waterBudgetEnabled = (): boolean => enabled;
export const hasWaterBudget = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 87);
const eligible = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 87);
const water = (w: World, i: number): boolean => w.terrain[i] === T.DEEP || w.terrain[i] === T.SHALLOW;
const lookup = new WeakMap<World, { bodies: WaterBody[]; index: Int32Array }>();

/** Finalized terrain components, ordered by their first tile. No random draws. */
function components(w: World): { tiles: number[]; capacity: number }[] {
  const seen = new Uint8Array(w.W * w.H), out: {tiles:number[];capacity:number}[] = [];
  for (let i = 0; i < seen.length; i++) {
    if (seen[i] || !water(w, i)) continue;
    seen[i] = 1;
    const tiles = [i]; let capacity = 0;
    for (let cursor = 0; cursor < tiles.length; cursor++) {
      const at = tiles[cursor], x = at % w.W, y = Math.floor(at / w.W);
      capacity += w.terrain[at] === T.DEEP ? 8 : 2;
      for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
        if (nx < 0 || nx >= w.W || ny < 0 || ny >= w.H) continue;
        const next = ny * w.W + nx;
        if (!seen[next] && water(w,next)) { seen[next] = 1; tiles.push(next); }
      }
    }
    tiles.sort((a,b)=>a-b); out.push({tiles,capacity});
  }
  return out;
}

/** Before initial accounting, also for lab ablations: the stock has one origin. */
export function initializeWater(w: World): void {
  if (!eligible(w) || w.waterBodies !== undefined) return;
  w.waterBodies = components(w).map(({tiles,capacity})=>({id:tiles[0],tiles,capacity,amount:capacity,rainAcc:0,evaporationAcc:0,drawn:0,replenished:0,evaporated:0}));
}
export function waterBodyAt(w: World, x: number, y: number): WaterBody | undefined {
  if (!hasWaterBudget(w) || !w.waterBodies) return;
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || tx >= w.W || ty < 0 || ty >= w.H) return;
  let cached = lookup.get(w);
  if (!cached || cached.bodies !== w.waterBodies) {
    const index = new Int32Array(w.W*w.H); index.fill(-1);
    for (let n=0;n<w.waterBodies.length;n++) for (const i of w.waterBodies[n].tiles) index[i]=n;
    cached={bodies:w.waterBodies,index};lookup.set(w,cached);
  }
  return w.waterBodies[cached.index[ty*w.W+tx]];
}
export const waterSign = (b: WaterBody): WaterSign => b.amount < 1 ? 'dry' : b.amount < b.capacity * 0.25 ? 'low' : 'wet';

/** Physical environmental dependence, never a distant planning shortcut. */
export function nearbyWaterFraction(w:World,x:number,y:number,radius=2):number|undefined {
  if(!hasWaterBudget(w))return;
  const own=waterBodyAt(w,x,y);if(own)return own.amount/own.capacity;
  let best:WaterBody|undefined,distance=Infinity;
  const tx=Math.floor(x),ty=Math.floor(y);
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const d=dx*dx+dy*dy;if(d>radius*radius||d>=distance)continue;
    const b=waterBodyAt(w,tx+dx,ty+dy);if(b){best=b;distance=d;}
  }
  return best?best.amount/best.capacity:undefined;
}

/** Actual extraction only; the caller owns the destination transfer or consumption entry. */
export function drawWater(w: World, body: WaterBody, requested: number): number {
  if (!hasWaterBudget(w) || !Number.isFinite(requested) || requested <= 0 || !w.waterBodies?.includes(body)) return 0;
  const n = Math.min(body.amount, Math.max(0,Math.floor(requested)));
  if (n > 0) { body.amount -= n; body.drawn += n; body.lastDraw = w.tick; }
  return n;
}

/** Captured rain and atmospheric loss every 60 ticks; fractional remainder never mints a unit. */
export function updateWater(w: World): void {
  if (!hasWaterBudget(w) || !w.waterBodies || w.tick % 60 !== 0) return;
  for (const b of w.waterBodies) {
    const interval = 60 / DAY;
    // Per tile and day: up to two units in full rain. No unbounded groundwater input.
    b.rainAcc += b.tiles.length * Math.max(0,w.weather.rain) * 2 * interval;
    const rain = Math.floor(b.rainAcc); b.rainAcc -= rain;
    const captured = Math.min(rain, b.capacity-b.amount);
    if (captured > 0) { b.amount += captured; b.replenished += captured; ledgerCreate(w,'water',captured,'rain captured in natural water'); }
    // Declared model rate: 0.04 units/tile/day at <=10C, increasing with heat and dry spells.
    const rate = (0.04 + Math.max(0,w.weather.temp-10)*0.004) * (w.hardship?.kind==='dry'?3:1);
    b.evaporationAcc += b.tiles.length * rate * interval;
    const potential = Math.floor(b.evaporationAcc); b.evaporationAcc -= potential;
    const lost = Math.min(b.amount,potential);
    if (lost > 0) { b.amount -= lost; b.evaporated += lost; ledgerSpoil(w,'water',lost,'natural water evaporation'); }
  }
}

export function validateWater(w: World): void {
  const fail=():never=>{throw new Error('invalid saved natural water budget');};
  for(const p of w.persons)for(const b of Object.values(p.beliefs))if(b.waterSupply!==undefined&&(!eligible(w)||b.kind!=='water'||!['wet','low','dry'].includes(b.waterSupply)||!Number.isSafeInteger(b.seen)||b.seen>w.tick))fail();
  if (w.waterBodies === undefined) { if (eligible(w)) fail(); return; }
  if (!eligible(w) || !Array.isArray(w.waterBodies) || w.waterBodies.length>w.W*w.H) fail();
  const expected=components(w);
  if (expected.length!==w.waterBodies.length) fail();
  for (let i=0;i<expected.length;i++) {
    const b=w.waterBodies[i], e=expected[i];
    if (!b || Object.keys(b).some(k=>!['id','tiles','capacity','amount','rainAcc','evaporationAcc','drawn','replenished','evaporated','lastDraw'].includes(k)) || b.id!==e.tiles[0] || b.capacity!==e.capacity || JSON.stringify(b.tiles)!==JSON.stringify(e.tiles)) fail();
    for (const n of [b.amount,b.drawn,b.replenished,b.evaporated]) if(!Number.isSafeInteger(n)||n<0)fail();
    if(b.amount>b.capacity || b.capacity+b.replenished-b.drawn-b.evaporated!==b.amount)fail();
    for(const n of [b.rainAcc,b.evaporationAcc])if(!Number.isFinite(n)||n<0||n>=1)fail();
    if(b.lastDraw!==undefined&&(!Number.isSafeInteger(b.lastDraw)||b.lastDraw<0||b.lastDraw>w.tick))fail();
  }
}
