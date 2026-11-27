import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V283_SEED='gen-2';
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:283});
/** Tick 48000 (day 20), the seed and tick of the rules 260 to 264 pins and of the rules 277 and 278 pins. This is the one pin for rules 283 (a night's sleep, 27 November 2026): the same world and tick as the rules 278 pin, so the two can be compared digest by digest. */
export const V283_TICK=48000;
const FARM_ITEMS=['milk','cheese','egg','pork','bacon','hay','stock_feed','leather','gloves','shoes','wool','hide'] as const;
/** Plain counts of the saved state, the same kind as the rules 278 pin's: farm animals by kind and how many are housed, farm buildings by kind, farm goods held anywhere (packs, buildings, piles), people with an earned occupation record, withdrawals that carry a workshop errand, and beliefs that hold remembered builders' shares. Rules 283 adds no saved field; these are kept for comparison with the 278 pin. */
export function v283State(w:World){
 const animals:Record<string,number>={};let housed=0,owned=0;
 for(const a of w.animals){animals[a.type]=(animals[a.type]??0)+1;if(a.sheep?.housing!==undefined)housed++;if(a.sheep?.hhId)owned++;}
 const farmBuildings:Record<string,number>={};
 for(const b of w.buildings)if(b.type==='barn'||b.type==='paddock'||b.type==='chicken_cage')farmBuildings[b.type]=(farmBuildings[b.type]??0)+1;
 const goods:Record<string,number>={};
 const add=(items:Record<string,number|undefined>|undefined)=>{if(!items)return;for(const k of FARM_ITEMS){const n=items[k]??0;if(n>0)goods[k]=(goods[k]??0)+n;}};
 for(const p of w.persons)add(p.inv as Record<string,number|undefined>);
 for(const b of w.buildings)add(b.store?.items as Record<string,number|undefined>|undefined);
 for(const pile of w.piles)add(pile.items as Record<string,number|undefined>);
 let occupations=0,errands=0,seenBuilders=0;
 for(const p of w.persons){
  if(p.occupation!==undefined)occupations++;
  for(const a of [p.activity,p.suspended])if(a?.data.inputWorkshop!==undefined)errands++;
  for(const b of Object.values(p.beliefs))if(b.ops?.seenBuilders!==undefined)seenBuilders++;
 }
 const sorted=(o:Record<string,number>)=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a<b?-1:1));
 return {animals:sorted(animals),ownedAnimals:owned,housedAnimals:housed,farmBuildings:sorted(farmBuildings),farmGoods:sorted(goods),occupations,workshopErrands:errands,beliefsWithSeenBuilders:seenBuilders};
}
/** Rules 283. An ordinary Normal gen-2 (arrivals on), run to `tick`, saved there and continued 120 ticks; the counts are of the saved world. */
export function v283Continuation(tick:number){
 const w=make(V283_SEED);
 while(w.tick<tick)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw),state=v283State(w);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules283 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,arrivals:w.stats.arrivals??0,alive:w.persons.filter(p=>p.alive).length,...state};
}
