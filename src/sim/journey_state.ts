// Saved private journey state and evidence. Planning/options live in journey.ts.
import {ALL_ITEMS,DAY} from './constants';
import {hasJourneys,JOURNEY_LIMITS} from './journey_supplies';
import {runsRulesVersion} from './rulesversion';
import type {Activity,ActivityKind,Intention,ItemKind,Person,World} from './types';
import type {Ctx} from './optutil';
export interface Journey {
 key:string;label:string;kind:ActivityKind;target:number;item:ItemKind|null;quantity:number;
 water:number;food:number;expected:number;tries:number;completed?:number;
 history:{activity:number;tick:number;kind:ActivityKind;outcome:string;detail:string}[];
}
export function describeJourney(j:Journey):string{
 return `Retaining the work purpose: ${j.label}. Estimated trip ${Math.ceil(j.expected)} ticks; provisions require real eating or drinking. ${j.history.length} recorded action endings, ${j.tries} failed attempts.`;
}
export function journeyStep(ctx:Ctx,i:Intention){
 const j=i.journey!,prep=ctx.options.filter(o=>o.journeyFor?.key===j.key).sort((a,b)=>b.util-a.util)[0];
 const work=ctx.options.find(o=>o.key===j.key);
 const o=prep??work;
 return {kind:'none' as const,target:o?.targetId??j.target,item:null,step:o?o.label:'reconsider the trip and its provisions',key:o?.key??null,blocked:o?'':'no feasible preparation or work step currently known'};
}
export function journeyOutcome(w:World,p:Person,i:Intention):{status:'done'|'dropped';reason:string}|null{
 const j=i.journey;if(!j||!hasJourneys(w))return {status:'dropped',reason:'journey preparation is no longer available'};
 if(j.completed!==undefined)return {status:'done',reason:`performed the prepared work trip at tick ${j.completed}; ${i.worked} actual work/collection cycles, not the whole underlying project`};
 if(j.tries>=JOURNEY_LIMITS.retries)return {status:'dropped',reason:`gave up the trip after ${j.tries} failed attempts: ${j.history.at(-1)?.detail??'unknown cause'}`};
 if(!p.beliefs[j.target])return {status:'dropped',reason:'the intended work place is no longer personally known'};
 if(w.tick>i.until)return {status:'dropped',reason:'the preparation deadline passed without completing the work trip'};
 return null;
}
export function recordJourney(w:World,p:Person,a:Activity,outcome:string,detail:string):void{
 if(!hasJourneys(w)||a.data.journeyRecorded)return;
 const needBreak=a.data.optKey==='drink:inv'||a.data.optKey==='eat:0';
 const i=p.intentions.find(i=>i.status==='active'&&i.journey&&(a.data.journeyId===i.id||i.journey.key===a.data.optKey||needBreak));if(!i)return;
 a.data.journeyRecorded=true;const j=i.journey!;
 j.history.push({activity:a.id,tick:w.tick,kind:a.kind,outcome,detail:detail.slice(0,200)});j.history=j.history.slice(-JOURNEY_LIMITS.history);
 if(outcome==='failed'&&!needBreak)j.tries++;
 if(a.data.optKey===j.key&&a.cycle>0&&(outcome==='success'||outcome==='partial')){j.completed=w.tick;i.worked+=a.cycle;}
}
export function validateJourneys(w:World):void{
 const int=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 for(const p of w.persons){
  if((p.intentions??[]).filter(i=>i.status==='active'&&i.kind==='journey').length>1)throw new Error('Too many live journeys');
  for(const i of p.intentions??[]){const j=i.journey;if(i.kind==='journey'&&!j)throw new Error('Missing journey');if(!j)continue;
   if(!int(i.since,0,w.tick)||!int(i.until,i.since,i.since+2*DAY)||(j.item!==null&&!ALL_ITEMS.includes(j.item)))throw new Error('Invalid journey bounds');
   if(!runsRulesVersion(w,72)||w.settings.dynamics!=='rich'||i.kind!=='journey'||!['gather','build','operate'].includes(j.kind)||typeof j.key!=='string'||j.key.length>180||typeof j.label!=='string'||j.label.length>160||!int(j.target,1)||!int(j.quantity,1,24)||!int(j.water,0,2)||!int(j.food,0,2)||!Number.isFinite(j.expected)||j.expected<0||j.expected>1e7||!int(j.tries,0,3)||i.until-i.since>2*DAY||!Array.isArray(j.history)||j.history.length>8)throw new Error('Invalid journey');
   if(j.completed!==undefined&&!int(j.completed,0,w.tick))throw new Error('Invalid journey completion');
   if(j.history.some(h=>!h||!int(h.activity,1)||!int(h.tick,0,w.tick)||!['fetch_water','withdraw','gather','build','operate','drink','eat'].includes(h.kind)||!['success','partial','failed','interrupted'].includes(h.outcome)||typeof h.detail!=='string'||h.detail.length>200)||new Set(j.history.map(h=>h.activity)).size!==j.history.length)throw new Error('Invalid journey evidence');
  }
 }
}
