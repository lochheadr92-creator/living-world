// Concrete source experience lives inside the existing work-payoff record, not a second general memory store.
import {SOURCE_SKILL} from './constants';
import {runsRulesVersion} from './rulesversion';
import type {Activity,Person,SkillKey,SourceType,World} from './types';
export interface SourceExperience {
 target:number;kind:SourceType;n:number;r:number;last:number;
 empty?:{activity:number;tick:number;count:number;corrected?:number};
 events:{activity:number;tick:number;outcome:'yield'|'empty';units:number;took:number;expected:number}[];
}
let enabled=true;
export const sourceLearningOn=()=>enabled;
export function setSourceLearning(on:boolean):void{enabled=on;}
export const hasSourceLearning=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,74);
export const SOURCE_EXPERIENCE_LIMITS={places:8,events:4,count:1000000} as const;
/** Returns true only when the end establishes empty availability, which is not a category productivity sample. */
export function recordSourceExperience(w:World,p:Person,a:Activity,k:SkillKey,ratio:number,outcome?:string):boolean{
 if(!hasSourceLearning(w)||!Number.isSafeInteger(a.id)||a.id<1||!Number.isSafeInteger(a.targetId)||a.targetId<1)return false;
 const b=p.beliefs[a.targetId],kind=a.data.stype as SourceType;
 const empty=outcome==='failed'&&a.cycle===0&&b?.kind===kind&&b.origin===p.id&&b.hops===0&&b.seen>=a.start&&b.amount<=0;
 const yielded=(outcome==='success'||outcome==='partial')&&a.cycle>0;
 if(!empty&&!yielded)return false;
 const pay=(p.payoff[k]??={n:0,r:1}),places=(pay.sources??=[]);
 let e=places.find(e=>e.target===a.targetId);
 if(e?.events.some(e=>e.activity===a.id))return empty;
 if(!e){e={target:a.targetId,kind,n:0,r:1,last:w.tick,events:[]};places.push(e);}
 e.last=w.tick;
 if(empty)e.empty={activity:a.id,tick:w.tick,count:Math.min(3,e.empty&&e.empty.corrected===undefined?e.empty.count+1:1)};
 else{e.n=Math.min(SOURCE_EXPERIENCE_LIMITS.count,e.n+1);e.r=Math.round((e.n===1?ratio:e.r+0.25*(ratio-e.r))*1000)/1000;if(e.empty)e.empty.corrected=w.tick;}
 e.events.push({activity:a.id,tick:w.tick,outcome:empty?'empty':'yield',units:a.cycle,took:Math.max(1,w.tick-a.start),expected:a.data.eta});e.events=e.events.slice(-SOURCE_EXPERIENCE_LIMITS.events);
 places.sort((a,b)=>b.last-a.last||a.target-b.target);places.length=Math.min(places.length,SOURCE_EXPERIENCE_LIMITS.places);
 return empty;
}
/** Only direct sight uses this hook. A later rumour cannot undo the recorded correction. */
export function correctSourceExperience(w:World,p:Person,id:number,amount:number):void{
 if(!hasSourceLearning(w)||amount<=0)return;
 for(const pay of Object.values(p.payoff??{})){
  const e=pay.sources?.find(e=>e.target===id);
  if(e?.empty&&e.empty.corrected===undefined&&w.tick>=e.empty.tick)e.empty.corrected=w.tick;
 }
}
export function sourceExperience(w:World,p:Person,k:SkillKey,target:number):SourceExperience|undefined{
 if(!hasSourceLearning(w)||!p.beliefs[target])return;
 return p.payoff?.[k]?.sources?.find(e=>e.target===target);
}
export function describeSourceExperience(p:Person):string[]{
 return Object.values(p.payoff??{}).flatMap(pay=>pay.sources??[]).sort((a,b)=>b.last-a.last||a.target-b.target).slice(0,8).map(e=>{
  const place=e.kind.replaceAll('_',' '),known=p.beliefs[e.target]?'':' (location no longer known)';
  const empty=e.empty?`${e.empty.count} empty ${e.empty.count===1?'visit':'visits'}${e.empty.corrected!==undefined?'; later personally seen stocked':'; no later firsthand stock confirmation'}`:'';
  const yieldText=e.n?`${e.n} productive ${e.n===1?'visit':'visits'}, ${Math.round(e.r*100)}% of estimated return for time spent`:'';
  return `${place[0].toUpperCase()+place.slice(1)} #${e.target}${known}: ${[empty,yieldText].filter(Boolean).join('; ')}.`;
 });
}
export function validateSourceExperience(w:World):void{
 const integer=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 const finite=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 for(const p of w.persons){
  for(const [k,pay] of Object.entries(p.payoff??{}))if(pay.sources!==undefined){
   if(!runsRulesVersion(w,74)||w.settings.dynamics!=='rich'||!Array.isArray(pay.sources)||pay.sources.length>8||new Set(pay.sources.map(e=>e.target)).size!==pay.sources.length)throw new Error('Invalid source experience list');
   for(const e of pay.sources){
    if(!integer(e.target,1)||SOURCE_SKILL[e.kind]!==k||!integer(e.n,0,1000000)||!finite(e.r,0.1,4)||!integer(e.last,0,w.tick)||!Array.isArray(e.events)||e.events.length>4)throw new Error('Invalid source experience');
    if(e.events.some(h=>!integer(h.activity,1)||!integer(h.tick,0,w.tick)||!['yield','empty'].includes(h.outcome)||!integer(h.units,0,1000000)||!finite(h.took,1,1e7)||!finite(h.expected,0.001,1e7)||(h.outcome==='empty'&&h.units!==0)||(h.outcome==='yield'&&h.units<1))||new Set(e.events.map(h=>h.activity)).size!==e.events.length)throw new Error('Invalid source experience evidence');
    const empty=e.empty;if(empty&&(!integer(empty.activity,1)||!integer(empty.tick,0,w.tick)||!integer(empty.count,1,3)||(empty.corrected!==undefined&&!integer(empty.corrected,empty.tick,w.tick))))throw new Error('Invalid empty source experience');
   }
  }
  for(const a of [p.activity,p.suspended])if(a?.data.sourcePayRecorded!==undefined&&(!runsRulesVersion(w,74)||typeof a.data.sourcePayRecorded!=='boolean'))throw new Error('Invalid source experience marker');
 }
}
