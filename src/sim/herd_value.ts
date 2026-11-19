import {foodUnits} from './economy';
import {farmEnabled,houses,housingCapacity} from './farm_species';
import type {Ctx} from './optutil';
import type {Belief,BuildingType} from './types';

let enabled=true;
export const herdValueOn=()=>enabled;
export const valuesHerd=(w:Ctx['world'])=>enabled&&farmEnabled(w);
export function setHerdValue(value:boolean){enabled=value;}

/** The expected return and cost of ONE additional animal, using only the keeper's own observations. */
export function stockedForAnother(station:Belief,species:string,residents:number){
  const feed=species==='pig'||species==='chicken'?'grain':'hay';
  const portions=(residents+1)*(species==='chicken'?1:2);
  return (station.items?.[feed]??0)+(station.items?.stock_feed??0)/2>=portions && (station.items?.water??0)>=portions;
}

export function herdReasons(ctx:Ctx,target:Belief):[string,number][] {
  const animal=target.sheep;
  if(!enabled||!farmEnabled(ctx.world)||!animal?.species||ctx.critical)return [];
  const species=animal.species;
  const known=Object.values(ctx.p.beliefs);
  const owned=known.filter(b=>b.id!==target.id&&b.sheep?.hhId===ctx.p.hhId);
  const same=owned.filter(b=>b.sheep!.species===species);
  const buildings=known.filter(b=>b.kind==='building'&&b.hh===ctx.p.hhId);
  const food=ctx.food+buildings.filter(b=>b.id===ctx.hh?.homeId).reduce((sum,b)=>sum+foodUnits(b.items??{}),0);
  const reasons:[string,number][]=[];
  const hasFeed=known.some(b=>(b.kind==='wild_grain'||b.kind==='hay_meadow'&&species!=='pig'&&species!=='chicken')&&(b.amount??0)>0)
    || buildings.some(b=>(b.items?.grain??0)+(b.items?.stock_feed??0)/2+(species==='pig'||species==='chicken'?0:b.items?.hay??0)>0);
  const hasWater=known.some(b=>b.kind==='water'||b.btype==='well')||ctx.water>0;
  if(!hasFeed||!hasWater)return [['feed or water supply uncertain',-12]];
  const female=same.some(b=>b.sheep!.sex==='f'),male=same.some(b=>b.sheep!.sex==='m');
  if(animal.sex==='f'&&!female){
    if(species==='chicken')reasons.push(['a hen can lay eggs without a rooster',18]);
    if(['goat','cow','sheep'].includes(species))reasons.push(['milk after the first birth',male?16:8]);
  }
  if(animal.sex==='m'&&female&&!male||animal.sex==='f'&&male&&!female)reasons.push(['completes a breeding pair',16]);
  if(species==='sheep'&&!same.length&&!(ctx.p.inv.garment??0))reasons.push(['a first fleece for warm clothing',10]);
  if(species==='pig'&&!same.length&&food>=2)reasons.push(['pork to preserve for later',9]);
  if(buildings.some(b=>houses(b.btype as BuildingType,species)&&owned.filter(a=>a.sheep!.housing===b.id).length<housingCapacity(b.btype as BuildingType)))reasons.push(['room in household livestock housing',8]);
  if(same.length>=2)reasons.push(['another mouth of a kind we already keep',-Math.min(18,4*same.length)]);
  if(owned.some(b=>b.sheep!.tether>0&&(b.sheep!.hungry||b.sheep!.thirsty)))reasons.push(['existing stock needs care first',-12]);
  return reasons;
}
