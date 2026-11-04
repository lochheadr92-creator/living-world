import type {World} from '../../src/sim/types';
import {stageOf} from '../../src/sim/people';
/** Nutrition-flow observation only. The engine never reads these counters. */
export function nourishmentObserver(w:World){
 const counts:Record<string,number>={},last=new Map<number,number>(),stories:unknown[]=[];
 const inc=(k:string,n=1)=>counts[k]=(counts[k]??0)+n;
 const initial=w.persons.filter(p=>p.alive).reduce((n,p)=>n+(p.nourishment??0),0);
 for(const p of w.persons)if(p.alive)last.set(p.id,p.nourishment??0);
 const previous=w.hooks;w.hooks={...previous,onNourishment(p,e){previous?.onNourishment?.(p,e);const age=stageOf(w,p);
  if(e.kind==='meal'){inc('portions');inc('nutrition eaten',e.input);inc('immediate hunger gain',e.immediate);inc('stored nutrition',e.stored);inc('conversion or capacity loss',e.lost);inc('stored nutrition:'+age,e.stored);}
  else{inc(e.kind+' spent',e.spent);inc(e.kind+' spent:'+age,e.spent);if(e.kind==='shortage')inc('ticks drawing reserves:'+age);}
  if(stories.length<120&&e.kind!=='capacity'&&(e.kind!=='meal'||e.stored>0))stories.push({tick:w.tick,person:p.id,age,...e});
  last.set(p.id,p.nourishment??0);
 }};
 function sync(){const alive=new Set(w.persons.filter(p=>p.alive).map(p=>p.id));for(const [id,n] of last)if(!alive.has(id)){inc('nutrition lost at death',n);last.delete(id);}for(const p of w.persons)if(p.alive)last.set(p.id,p.nourishment??0);}
 return {tick(){sync();for(const p of w.persons)if(p.alive&&(p.nourishment??0)>0)inc('ticks with reserves:'+stageOf(w,p));},report(){sync();const remaining=[...last.values()].reduce((a,b)=>a+b,0);return {counts,stories,initial,remaining,balanceError:initial+(counts['stored nutrition']??0)-(counts['shortage spent']??0)-(counts['recovery spent']??0)-(counts['capacity spent']??0)-(counts['nutrition lost at death']??0)-remaining,limits:'Actual paid intake and reserve debits; occupancy is start-of-tick. Stories are capped. Health recovery consumes reserves but does not add food. No survival attribution from these counters alone.'};}};
}
