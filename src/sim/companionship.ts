// Continuing company grows from actual shared time, not from proximity or a promised visit.
import {DAY} from './constants';
import {hasLivedLife} from './lived_life';
import {runsRulesVersion} from './rulesversion';
import {stageOf} from './people';
import {adjustRel} from './relations';
import type {Person,World} from './types';
export interface CompanyExperience {first:number;last:number;days:number;helped:number}

export function recordCompany(w:World,p:Person,q:Person,helped:boolean):void{
 if(!hasLivedLife(w)||!p.alive||!q.alive||(p.indoors??0)!==(q.indoors??0)||Math.hypot(p.x-q.x,p.y-q.y)>3)return;
 const r=p.relations[q.id];if(!r||r.affinity<20||r.avoidUntil>w.tick)return;
 const old=r.company;
 if(old&&w.tick-old.last<DAY){
  if(helped&&old.helped===0){old.helped=1;adjustRel(p,q.id,w.tick,{note:`My help was received during time with ${q.name}.`});}
  return;
 }
 const days=old&&w.tick-old.last<=3*DAY?Math.min(3,old.days+1):1;
 r.company={first:old?.first??w.tick,last:w.tick,days,helped:Math.min(3,(old?.helped??0)+(helped?1:0))};
 adjustRel(p,q.id,w.tick,{note:`Spent time with ${q.name} again: ${days} day${days===1?'':'s'} of continuing company${helped?'; my help was actually received':''}.`});
 // At most four existing relationships carry an operational company record.
 const held=Object.entries(p.relations).filter(([,r])=>r.company).sort((a,b)=>b[1].company!.last-a[1].company!.last||Number(a[0])-Number(b[0]));
 for(const [,rel] of held.slice(4))delete rel.company;
}
/** A modest daily reason to seek familiar company while free to do so. No remote need or affinity read. */
export function companyReason(w:World,p:Person,id:number):number{
 if(!hasLivedLife(w)||stageOf(w,p)!=='elder'||p.commitments.some(c=>c.status==='active')||Math.min(p.needs.hunger,p.needs.thirst,p.needs.energy)<50)return 0;
 const r=p.relations[id];if(!r||r.affinity<20||r.deathKnown||r.avoidUntil>w.tick)return 0;
 if(r.company&&w.tick-r.company.last<DAY)return 0;
 return 12+(r.company?Math.min(3,r.company.days):0);
}
export function companyProgress(w:World,p:Person):number{
 let best=0;
 for(const r of Object.values(p.relations))if(r.company&&!r.deathKnown&&r.avoidUntil<=w.tick&&r.affinity>=20&&w.tick-r.company.last<=3*DAY)
  best=Math.max(best,0.5*Math.min(1,r.company.days/3)+0.5*Math.min(1,r.company.helped));
 return best;
}
export function validateCompany(w:World):void{
 for(const p of w.persons){let count=0;
  for(const r of Object.values(p.relations)){const c=r.company;if(!c)continue;count++;
   if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,119)||![c.first,c.last,c.days,c.helped].every(Number.isSafeInteger)||c.first<0||c.last<c.first||c.last>w.tick||c.days<1||c.days>3||c.helped<0||c.helped>3)throw new Error('Invalid continuing-company experience');
  }
  if(count>4)throw new Error('Too many continuing-company records');
  const h=p.goal?.companyHope;
  if(h&&(w.settings.dynamics!=='rich'||!runsRulesVersion(w,119)||p.goal?.kind!=='family'||!Number.isSafeInteger(h.since)||h.since<0||h.since>w.tick||!Number.isSafeInteger(h.from)||h.from<=0))throw new Error('Invalid company hope');
 }
}
