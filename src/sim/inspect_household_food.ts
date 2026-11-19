import { nutritionOf } from './bread_feeds';
import { hasCellars } from './cellars';
import { DAY, isHomeType, NUTRITION } from './constants';
import { withdrawAllowance } from './facilities';
import { floodAt } from './flood';
import { membersOf } from './households';
import { hungerRate } from './metabolism';
import { demandMultiplier } from './needs';
import { stageOf } from './people';
import { runsPreservation } from './preservation';
import { hasWinterReserve } from './provision';
import { isFacilityType } from './recipes';
import { isWalkable } from './registry';
import { reservedFor } from './reserved_goods';
import type { Building, FoodKind, Person, World } from './types';

// A presentation boundary for a short trip on foot. Never used by the planner.
const LOCAL_STEPS = 12;
const foods = Object.keys(NUTRITION) as FoodKind[];
function fromMember(w: World, p: Person) {
  const room = p.indoors ? w.byId.get(p.indoors) : undefined;
  const x = room?.ent === 'building' ? room.doorX : Math.floor(p.x);
  const y = room?.ent === 'building' ? room.doorY : Math.floor(p.y);
  const canWalk = (x: number, y: number) => isWalkable(w,x,y) && floodAt(w,x,y) !== 'flooded';
  const reached = new Set<number>();
  let wave = [y*w.W+x];
  if (canWalk(x,y)) reached.add(wave[0]); else wave = [];
  for (let step = 0; step < LOCAL_STEPS && wave.length; step++) {
    const next: number[] = [];
    for (const i of wave) {
      const sx = i % w.W, sy = Math.floor(i / w.W);
      for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) {
        const nx=sx+dx, ny=sy+dy, tile=ny*w.W+nx;
        if (reached.has(tile) || !canWalk(nx,ny)) continue;
        if (dx && dy && (!canWalk(nx,sy) || !canWalk(sx,ny))) continue;
        reached.add(tile); next.push(tile);
      }
    }
    wave = next;
  }
  return {p,x,y,reached};
}

// Count common stock once and combine only the personal earmarks of eligible members.
function allowance(w: World, b: Building, hh: number, people: Person[], k: FoodKind, n: number): number {
  if (!people.length || b.condition <= 0) return 0;
  if (isHomeType(b.type) || b.type === 'cellar') return b.hhId === hh && (b.type !== 'cellar' || hasCellars(w)) ? n : 0;
  if (b.type === 'storehouse') return n;
  if (b.type === 'granary') return hasWinterReserve(w) ? Math.min(n, b.ops?.shares[hh]?.[k] ?? 0) : 0;
  if (b.type === 'food_rack' && (!runsPreservation(w) || b.hhId && b.hhId !== hh)) return 0;
  if (!isFacilityType(b.type) && b.type !== 'food_rack') return 0;
  let shared = 0, personal = 0;
  for (const p of people) {
    const allowed = withdrawAllowance(w,b,p,k,n);
    const marks = b.type === 'hall' ? [] : b.ops?.earmarks ?? [];
    const mine = Math.min(allowed, marks.reduce((sum,e) => sum + (e.item===k && e.owner===p.id && e.until>w.tick ? e.n : 0),0));
    shared = Math.max(shared, allowed-mine);
    personal += mine;
  }
  return Math.min(n, shared+personal);
}

export function householdFoodReserve(w: World, householdId: number) {
  const hh = w.households.find(h => h.id === householdId);
  if (!hh) return null;
  const members = [...new Set(membersOf(w,hh))].filter(p => p.hhId === hh.id);
  const missing = [...new Set(hh.members)].filter(id => !w.byId.has(id) && !w.deceased.some(p => p.id===id)).length;
  const positions = members.map(p => fromMember(w,p));
  const dailyDemand = members.reduce((sum,p) => sum + DAY * hungerRate(w) * demandMultiplier(w,stageOf(w,p)),0);
  let carried=0, reserved=0, nearbyStores=0, distant=0, blocked=0, inaccessible=0;
  for (const p of members) for (const k of foods) {
    const n = p.inv[k] ?? 0;
    if (!n) continue;
    const setAside = Math.min(n, reservedFor(w,p,k)), value = nutritionOf(w,k);
    reserved += setAside*value;
    carried += (n-setAside)*value;
  }
  const stores = [];
  for (const b of w.buildings) {
    const stocked = foods.filter(k => (b.store.items[k] ?? 0)>0);
    if (!stocked.length) continue;
    const close = positions.filter(s => s.p.indoors===b.id || Math.max(Math.abs(s.x-b.doorX),Math.abs(s.y-b.doorY))<=LOCAL_STEPS);
    const near = close.filter(s => s.p.indoors===b.id || s.reached.has(b.doorY*w.W+b.doorX)).map(s=>s.p);
    const closePeople = close.map(s=>s.p);
    const row = {id:b.id, type:b.type, nearby:0, distant:0, blocked:0, inaccessible:0};
    for (const k of stocked) {
      const n=b.store.items[k]!, value=nutritionOf(w,k);
      const all=allowance(w,b,hh.id,members,k,n);
      const local=allowance(w,b,hh.id,near,k,n);
      const closeAmount=allowance(w,b,hh.id,closePeople,k,n);
      row.nearby += local*value;
      row.blocked += (closeAmount-local)*value;
      row.distant += (all-closeAmount)*value;
      row.inaccessible += (n-all)*value;
    }
    nearbyStores+=row.nearby; distant+=row.distant; blocked+=row.blocked; inaccessible+=row.inaccessible;
    stores.push(row);
  }
  const demandKnown = dailyDemand>0 && missing===0;
  const usable=carried+nearbyStores;
  const plots=w.plots.filter(plot=>plot.hhId===hh.id);
  return {householdId, members:members.length, missing, dailyDemand, carried, reserved, nearbyStores, usable,
    foodDays:demandKnown ? usable/dailyDemand : null, oneDayShortfall:demandKnown ? Math.max(0,dailyDemand-usable) : null,
    distant, blocked, inaccessible, standingGrain:plots.reduce((sum,plot)=>sum+plot.stock,0),
    growingPlots:plots.filter(plot=>plot.state==='growing').length, stores};
}

export function foodReserveLines(r: ReturnType<typeof householdFoodReserve>): string[] {
  if (!r) return ['No household record.'];
  const f = (n:number) => n.toLocaleString('en-US',{maximumFractionDigits:1});
  return [
    r.foodDays===null ? `Food-days unknown · ${r.members} living members located, ${r.missing} member records missing.`
      : `${f(r.foodDays)} food-days for ${r.members} living ${r.members===1?'member':'members'} at ordinary waking demand (${f(r.dailyDemand)} nutrition/day).`,
    `${f(r.usable)} usable nutrition · ${f(r.carried)} in packs and ${f(r.nearbyStores)} in stores within 12 walking steps of a member. Shared food can also be taken by others.`,
    ...(r.oneDayShortfall===null ? [] : [`Shortfall for one ordinary waking day: ${f(r.oneDayShortfall)} nutrition.`]),
    `Outside the reserve: ${f(r.reserved)} set aside in packs, ${f(r.distant)} in distant stores, ${f(r.blocked)} without a short route to the door, ${f(r.inaccessible)} unavailable in building stores.`,
    `In the fields: ${r.standingGrain} unharvested grain and ${r.growingPlots} growing plots. Future harvests add to the reserve only after collection.`,
  ];
}
