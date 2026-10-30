// Personally failed approaches extend the existing failure owner; no terrain epoch or hidden map is consulted.
import {SOURCE_SKILL,DAY} from './constants';
import {runsRulesVersion} from './rulesversion';
import {addLog} from './events';
import type {Activity,ActivityKind,Person,World} from './types';
import type {Ctx,Option} from './optutil';
export interface RouteAttempt {target:number;x:number;y:number;gx:number;gy:number;kind:ActivityKind;cart:boolean}
export interface RouteExperience {approach:RouteAttempt;last:number;streak:number;retryAt:number;corrected?:{activity:number;tick:number};events:{activity:number;tick:number;outcome:'failed'|'arrived';detail:string}[]}
let enabled=true;
export const routeLearningOn=()=>enabled;
export function setRouteLearning(on:boolean):void{enabled=on;}
export const hasRouteLearning=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,76);
const stationary=(kind:string)=>Object.hasOwn(SOURCE_SKILL,kind)||['water','building','site','plot','pile','grave'].includes(kind);
const near=(ax:number,ay:number,bx:number,by:number,r:number)=>Math.hypot(ax-bx,ay-by)<=r;
const same=(a:RouteAttempt,b:RouteAttempt)=>a.target===b.target&&a.kind===b.kind&&a.cart===b.cart&&near(a.x,a.y,b.x,b.y,8)&&near(a.gx,a.gy,b.gx,b.gy,2);
export function recordRouteDeparture(w:World,p:Person,a:Activity):void{
 if(!hasRouteLearning(w)||a.phase!=='travel')return;const b=p.beliefs[a.targetId];if(!b||!stationary(b.kind))return;
 a.data.routeAttempt={target:a.targetId,x:p.x,y:p.y,gx:b.x,gy:b.y,kind:a.kind,cart:!!p.cartId} satisfies RouteAttempt;
}
function trim(p:Person):void{
 const entries=Object.entries(p.failures).filter(([,f])=>f.route).sort((a,b)=>b[1].route!.last-a[1].route!.last||Number(a[0])-Number(b[0]));
 for(const [key,f] of entries.slice(8)){delete f.route;if(f.resolved)delete p.failures[Number(key)];}
}
export function recordRouteFailure(w:World,p:Person,a:Activity,outcome:string,detail:string):void{
 if(!hasRouteLearning(w)||outcome!=='failed'||a.phase!=='travel'||!['no way to get there','path blocked'].includes(detail))return;
 const attempt=a.data.routeAttempt as RouteAttempt|undefined;if(!attempt||attempt.target!==a.targetId)return;
 const old=p.failures[a.targetId]?.route;if(old?.events.some(e=>e.activity===a.id))return;
 const streak=old&&old.streak>0&&w.tick-old.last<2*DAY&&same(old.approach,attempt)?Math.min(3,old.streak+1):1;
 const f=p.failures[a.targetId]??={tick:w.tick,reason:detail,count:0};if(f.tick!==w.tick||f.reason!==detail||f.count===0){f.tick=w.tick;f.reason=detail;f.count++;}delete f.resolved;
 f.route={approach:{...attempt},last:w.tick,streak,retryAt:w.tick+(streak===1?80:streak===2?240:600),events:[...(old?.events??[]),{activity:a.id,tick:w.tick,outcome:'failed' as const,detail}].slice(-4)};trim(p);
}
/** Arrival proves the approach, not stock, permission or successful work. */
export function recordRouteArrival(w:World,p:Person,a:Activity):void{
 if(!hasRouteLearning(w)||a.data.routeArrivalRecorded)return;const attempt=a.data.routeAttempt as RouteAttempt|undefined,r=p.failures[a.targetId]?.route;
 if(!attempt||attempt.target!==a.targetId||!r||r.streak===0||attempt.cart!==r.approach.cart||!near(attempt.gx,attempt.gy,r.approach.gx,r.approach.gy,2))return;
 a.data.routeArrivalRecorded=true;if(r.events.some(e=>e.activity===a.id))return;r.last=w.tick;r.streak=0;r.retryAt=0;r.corrected={activity:a.id,tick:w.tick};r.events=[...r.events,{activity:a.id,tick:w.tick,outcome:'arrived' as const,detail:'personally reached the destination'}].slice(-4);
 const f=p.failures[a.targetId];if(['no way to get there','path blocked'].includes(f.reason))f.resolved=true;
 addLog(w,p,'work',`Reached the destination of “${a.label}” after earlier route failures (activity #${a.id}).`);
}
export function routeBlock(w:World,p:Person,o:Pick<Option,'targetId'|'kind'>):string|undefined{
 if(!hasRouteLearning(w))return;const b=p.beliefs[o.targetId],r=p.failures[o.targetId]?.route;if(!b||!r||r.streak<2||w.tick>=r.retryAt)return;
 const now:RouteAttempt={target:o.targetId,x:p.x,y:p.y,gx:b.x,gy:b.y,kind:o.kind,cart:!!p.cartId};if(!same(r.approach,now))return;
 return `I failed to reach this place from this area ${r.streak===3?'at least ':''}${r.streak} times; reconsider in ${r.retryAt-w.tick} ticks (last actual attempt #${r.events.filter(e=>e.outcome==='failed').at(-1)?.activity}).`;
}
export function applyRouteExperience(ctx:Ctx):void{
 if(!hasRouteLearning(ctx.world))return;ctx.options=ctx.options.filter(o=>{const reason=routeBlock(ctx.world,ctx.p,o);if(!reason)return true;if(ctx.collect)ctx.blocked.push({...o,util:0,make:undefined,blocked:reason});return false;});
}
export function describeRouteExperience(w:World,p:Person):string[]{
 return Object.entries(p.failures).filter(([,f])=>f.route).sort((a,b)=>b[1].route!.last-a[1].route!.last||Number(a[0])-Number(b[0])).map(([id,f])=>{const r=f.route!;return `Route to #${id}${p.beliefs[Number(id)]?'':' (location no longer known)'}: ${r.corrected?`personally reached at tick ${r.corrected.tick}`:`${r.streak===3?'at least ':''}${r.streak} failed ${r.streak===1?'attempt':'attempts'} from the recorded area; ${r.streak===1?'ordinary retry handling applies':w.tick<r.retryAt?`retry interval ends in ${r.retryAt-w.tick} ticks`:'retry interval elapsed'}`}. Last recorded activity #${r.events.at(-1)?.activity}.`;});
}
export function validateRouteExperience(w:World):void{
 const int=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 const coord=(n:unknown,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 const attempt=(a:RouteAttempt)=>a&&int(a.target,1)&&typeof a.kind==='string'&&a.kind.length<40&&typeof a.cart==='boolean'&&coord(a.x,w.W)&&coord(a.y,w.H)&&coord(a.gx,w.W)&&coord(a.gy,w.H);
 for(const p of w.persons){const entries=Object.entries(p.failures).filter(([,f])=>f.route!==undefined);if(entries.length>8)throw new Error('Invalid route experience count');
  for(const [key,f] of entries){const r=f.route!;if(!runsRulesVersion(w,76)||w.settings.dynamics!=='rich'||!attempt(r.approach)||r.approach.target!==Number(key)||!int(r.last,0,w.tick)||!int(r.streak,0,3)||!int(r.retryAt,0,w.tick+600)||!Array.isArray(r.events)||r.events.length<1||r.events.length>4)throw new Error('Invalid route experience');
   if(r.events.some(e=>!int(e.activity,1)||!int(e.tick,0,w.tick)||!['failed','arrived'].includes(e.outcome)||typeof e.detail!=='string'||e.detail.length>120)||new Set(r.events.map(e=>e.activity)).size!==r.events.length)throw new Error('Invalid route experience event');
   if(r.events.at(-1)!.tick!==r.last||r.events.some((e,i)=>i>0&&e.tick<r.events[i-1].tick)||(r.streak===0?(!r.corrected||r.retryAt!==0):(r.retryAt<r.last||r.retryAt>r.last+600)))throw new Error('Invalid route experience chronology');
   if(r.corrected&&(!int(r.corrected.activity,1)||!int(r.corrected.tick,0,w.tick)||r.streak!==0||r.retryAt!==0))throw new Error('Invalid route experience correction');
  }
  for(const f of Object.values(p.failures))if(f.resolved!==undefined&&(!runsRulesVersion(w,76)||!f.route||f.resolved!==true))throw new Error('Invalid resolved route failure');
  for(const a of [p.activity,p.suspended])if(a){if(a.data.routeAttempt!==undefined&&(!runsRulesVersion(w,76)||w.settings.dynamics!=='rich'||!attempt(a.data.routeAttempt)))throw new Error('Invalid route attempt');if(a.data.routeArrivalRecorded!==undefined&&(!runsRulesVersion(w,76)||w.settings.dynamics!=='rich'||a.data.routeArrivalRecorded!==true))throw new Error('Invalid route arrival');}
 }
}
