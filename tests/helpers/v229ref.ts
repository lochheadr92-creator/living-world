import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V229_SEED='forest';
export const V229_TICK=20200;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:229});
/** Saws lying on the rack of a timber yard (before rules 229 a saw stays in its maker's pack). */
export const sawsAtYards=(w:World):number=>w.buildings.reduce((n,b)=>n+(b.type==='timber_yard'?b.store.items.saw??0:0),0);
const made=(w:World,k:'planks'|'bricks'):number=>(w.ledger.created as Record<string,number>)[k]??0;
/** The first multiples of 100 ticks at which a saw lies at a timber yard, and at which planks and bricks have been made, or 0
 * (how the pin's seed and tick were chosen). */
export function firstSupply229(seed:string,maxTicks:number):{seed:string;saw:number;planks:number;bricks:number}{
 const w=make(seed);const out={seed,saw:0,planks:0,bricks:0};
 while(w.tick<maxTicks&&!(out.saw&&out.planks&&out.bricks)){
  stepWorld(w);if(w.tick%100)continue;
  if(!out.saw&&sawsAtYards(w)>0)out.saw=w.tick;
  if(!out.planks&&made(w,'planks')>0)out.planks=w.tick;
  if(!out.bricks&&made(w,'bricks')>0)out.bricks=w.tick;
 }
 return out;
}
/** Rules 229 (site_supply.ts). Ordinary Normal forest (arrivals on) stepped to the tick by which planks have been made at the
 * timber yard and a saw has been left on its rack (found with firstSupply229: of six worlds tried, forest is the soonest, its
 * first planks by tick 17,500 and a saw at the yard by 20,100), then 120 more after a save and load. If no plank has been made
 * or no saw lies at a yard the function throws rather than recording a pin that does not exercise the rule. */
export function v229Continuation(){
 const w=make(V229_SEED);
 while(w.tick<V229_TICK)stepWorld(w);
 if(made(w,'planks')<1||sawsAtYards(w)<1)throw Error('Rules229 reference world has made no planks or has no saw at a timber yard');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules229 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,sawsAtYards:sawsAtYards(w),planksMade:made(w,'planks'),bricksMade:made(w,'bricks')};
}
