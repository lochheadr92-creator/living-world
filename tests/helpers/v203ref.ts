import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const BASIC=new Set(['hut','lean_to','cellar','well']);
/** More than four ordinary sites are open at once and one of them is a home: what the cap of rules 202 and earlier never allowed. */
export function aHomeLaidOutPastTheCap(w:World):boolean{
 const open=w.sites.filter(s=>BASIC.has(s.type));
 return open.length>4&&open.some(s=>s.type==='hut'||s.type==='lean_to');
}
/** Rules 203 (home_first.ts). Ordinary Normal gen-2 (arrivals on), stepped until a home is laid out past the four-site cap (checked
 * every 25 ticks, at most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world
 * never shows it the function throws rather than recording a pin that does not exercise the rule. */
export function v203Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:203});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&aHomeLaidOutPastTheCap(w))reached=true;}
 if(!reached)throw Error('Rules203 reference world never lays a home out past the site cap');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules203 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
