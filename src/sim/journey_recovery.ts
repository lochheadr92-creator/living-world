// Source alternatives are existing legal offers, chosen only after personal failure.
import {SOURCE_ITEM} from './constants';
import {runsRulesVersion} from './rulesversion';
import type {Ctx,Option} from './optutil';
import type {Intention,Person,SourceType,World} from './types';
export interface JourneyRecovery {
 tag:string;site:number;
 failures:{activity:number;target:number;tick:number;detail:string}[];
 changes:{from:number;to:number;tick:number;reason:string}[];
}
let enabled=true;
export const journeyRecoveryOn=()=>enabled;
export function setJourneyRecovery(on:boolean):void{enabled=on;}
export const hasJourneyRecovery=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,73);
export function recoveryOption(ctx:Ctx,i:Intention):Option|undefined{
 const j=i.journey!,r=j.recovery;if(!hasJourneyRecovery(ctx.world)||!r||j.kind!=='gather'||!j.item||r.changes.length>=2)return;
 const failed=r.failures.at(-1);if(!failed||failed.target!==j.target)return;
 if(r.changes.length&&ctx.world.tick-r.changes.at(-1)!.tick<120)return;
 return ctx.options.filter(o=>o.make&&o.kind==='gather'&&o.need===null&&o.util>0&&o.scopeEstimate?.item===j.item&&(o.tag??'')===r.tag&&(o.purposeSite??0)===r.site&&ctx.p.beliefs[o.targetId]&&o.targetId!==j.target&&!r.failures.some(f=>f.target===o.targetId)).slice(0,32).sort((a,b)=>b.util-a.util||a.targetId-b.targetId)[0];
}
export function reviewJourneyRecovery(ctx:Ctx,i:Intention):void{
 const o=recoveryOption(ctx,i);if(!o)return;
 const j=i.journey!,r=j.recovery!,last=r.failures.at(-1)!;
 const reason=`after the failed source #${j.target} (${last.detail}), chose personally known source #${o.targetId} for the same ${j.item} work`;
 r.changes.push({from:j.target,to:o.targetId,tick:ctx.world.tick,reason});
 j.key=o.key;j.target=o.targetId;j.label=o.label;j.quantity=Math.max(1,o.scopeEstimate!.amount??1);j.expected=o.eta;i.aboutId=o.targetId;i.reason=reason;
}
export function recoveryOutcome(w:World,p:Person,i:Intention):string|null{
 const j=i.journey!,r=j.recovery;if(!hasJourneyRecovery(w)||!r||!r.failures.length||!j.item)return null;
 if(r.changes.length>=2&&r.failures.at(-1)!.target===j.target)return 'the two allowed source replacements also failed; released the trip provisions';
 // Positive personally remembered stock can still support a retry after a temporary obstruction.
 const known=Object.values(p.beliefs).some(b=>SOURCE_ITEM[b.kind as SourceType]===j.item&&(b.amount??0)>0);
 return known?null:`no personally known source of ${j.item} remains after the failed trip; released its provisions`;
}
