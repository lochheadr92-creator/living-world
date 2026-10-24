// Death knowledge belongs to the observer. The lifecycle still owns physical death,
// registry cleanup and inheritance. No global death list is queried by these decisions.
import type { DeathNotice, Person, World } from './types';
import { runsRulesVersion } from './rulesversion';
import { isRich, think } from './mood';
import { DAY } from './constants';
import { addLog } from './events';
import { relOf } from './relations';
import { onPartnerLost } from './lifechanges';
import { noteDeed } from './reputation';
import { hyp } from './util';
let enabled=true;
export const localDeathOn=()=>enabled;
export function setLocalDeath(on:boolean):void{enabled=on;}
export const hasLocalDeath=(w:World)=>enabled&&isRich(w)&&runsRulesVersion(w,14);
export const withinHearing=(a:Person,b:Person,r=3)=>a.indoors===b.indoors&&hyp(a.x-b.x,a.y-b.y)<=r;
export function knowsDeath(p:Person,id:number):boolean{
 return !!p.relations[id]?.deathKnown || !!p.heard?.some(r=>r.death?.id===id);
}
/** Caller must establish direct witness, a locally observed marker or a co-present telling. */
export function learnDeath(w:World,p:Person,d:DeathNotice,source:'witness'|'told'|'grave',via=0):void{
 if(!hasLocalDeath(w)||!p.alive)return;
 const r=p.relations[d.id] ?? (p.hhId===d.hhId ? relOf(p,d.id) : undefined);
 if(!r||r.deathKnown)return; // strangers can retain a bounded story without a permanent relation
 r.deathKnown={learned:w.tick,source,via};
 const kin=r.kin;
 const v=kin==='partner'||kin==='child'?-50:kin==='parent'?-35:kin==='sibling'?-25:p.hhId===d.hhId?-15:r.affinity>50?-8:0;
 if(v)think(w,p,'lost:'+d.id,v,Math.round(DAY*(v<=-35?5:3)),`${d.name} has died (${source==='told'?'heard from someone':source==='grave'?'saw their grave':'witnessed'})`);
 if(kin||r.affinity>=45){p.needs.social=Math.max(0,p.needs.social-24);p.needs.safety=Math.max(0,p.needs.safety-8);}
 addLog(w,p,'life',`${source==='told'?'Heard':source==='grave'?'Read at the grave':'Saw'} that ${d.name} died.`);
 if(p.partnerId===d.id){p.partnerId=0;onPartnerLost(w,p,d);}
}
export function deathStory(w:World,p:Person,d:DeathNotice,source:'witness'|'grave'):void{
 if(!hasLocalDeath(w))return;
 noteDeed(w,p,d,'news',`${d.name} died`,false,d);
 learnDeath(w,p,d,source);
}
/** Called before removing indoor occupancy: walls and sleeping exclude witnesses. */
export function witnessDeath(w:World,dead:Person):void{
 const d:DeathNotice={id:dead.id,name:dead.name,hhId:dead.hhId,tick:w.tick};
 for(const p of w.persons)if(p!==dead&&p.alive&&p.pose!=='sleep'&&withinHearing(p,dead,10))deathStory(w,p,d,'witness');
}
