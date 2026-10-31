// One bounded private care purpose, acquired through a selected legal supply action.
import {runsRulesVersion} from './rulesversion';
import {knowsDeath} from './death_knowledge';
import {foodUnits} from './economy';
import type {Activity,ItemKind,Items,Person,World} from './types';
export interface CareJourney {to:number;name:string;seen:number;since:number;until:number;item:ItemKind;attempts:number;phase:'acquire'|'return'|'delivered'|'deposited'|'failed';reason:string;ended?:number;received?:number;}
export const activeCareJourney=(p:Person)=>p.careJourney&&['acquire','return'].includes(p.careJourney.phase)?p.careJourney:undefined;
export function startCareJourney(w:World,p:Person,a:Activity):void{
 const c=a.data.careSupply;if(!c||!runsRulesVersion(w,95))return;
 const item=a.kind==='fetch_water'?'water':a.data.stype==='wild_grain'?'grain':a.data.stype==='fruit_tree'?'fruit':a.data.stype==='fish_spot'?'fish':'berries';
 let j=activeCareJourney(p);
 if(!j){const room=p.whereabouts[c.to]?.room;if(!room)return;
  p.careJourney=j={to:c.to,name:room.name,seen:c.seen,since:w.tick,until:c.seen+700,item,attempts:0,phase:'acquire',reason:'selected a supply trip for personally observed care'};
 }
 if(j.to===c.to){j.attempts++;j.item=item;j.phase='acquire';}
}
export function reviewCareJourney(w:World,p:Person):string|undefined{
 const j=activeCareJourney(p);if(!j)return;
 const seen=p.seen.find(s=>s.ent==='person'&&s.id===j.to),room=p.whereabouts[j.to]?.room;
 const noNeed=seen?(j.item==='water'?!seen.thirsty:!seen.hungry):room&&(p.whereabouts[j.to].tick>j.seen)&&(j.item==='water'?!room.thirsty:!room.hungry);
 const why=!p.alive?'the carer died':w.tick>=j.until?'the observed need is too old to continue this journey':knowsDeath(p,j.to)?'I learned that the recipient died':!p.whereabouts[j.to]?'I no longer know where to find them':noNeed?'later personal contact no longer shows that need':'';
 if(why){j.phase='failed';j.reason=why;j.ended=w.tick;return why;}
}
export function endCareAcquisition(w:World,p:Person,a:Activity,outcome:string,detail:string):void{
 const j=activeCareJourney(p);if(!j||a.data.careSupply?.to!==j.to)return;
 if((a.data.careAcquired??0)>0&&(j.item==='water'?(p.inv.water??0):foodUnits(p.inv))>0){j.phase='return';j.reason='obtained supplies; return through an eligible care handoff';}
 else if(j.attempts>=2){j.phase='failed';j.reason=`two acquisition attempts ended without obtaining retained supplies: ${detail}`;j.ended=w.tick;}
 else{j.phase='acquire';j.reason=`acquisition ${outcome}: ${detail}; known alternatives remain subject to revalidation`;}
}
/** Called only with actual transferred quantities, never with a promised amount. */
export function careJourneyReceipt(w:World,p:Person,to:number,got:Items,deposited=false):void{
 const j=activeCareJourney(p),n=j?(j.item==='water'?(got.water??0):foodUnits(got)):0;if(!j||j.to!==to||n<=0)return;
 j.phase=deposited?'deposited':'delivered';j.received=n;j.ended=w.tick;j.reason=deposited?'actual supplies left in the lawful household store; consumption not yet known':'actual supplies received in physical contact; consumption is separate';
}
