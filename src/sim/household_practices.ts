import { deceasedById } from './historical_index';
// One transmitted practice: sharing supper. Meal execution owns all food, travel and time.
import type { World, Person, Meal } from './types';
import { runsRulesVersion } from './rulesversion';
import { addLog } from './events';
import { hyp } from './util';
import { say } from './events';
import { workToTell, hearUndertaking } from './continuity_knowledge';
export interface SupperExperience {mealId:number; hostId:number; tick:number; role:'host'|'family'; root:number; generation:number}
export interface SharedSupper {experiences:SupperExperience[]; learned?:{source:'practice'|'family'; teacher:number; root:number; generation:number; tick:number; meals:number[]}}
export interface SupperContact {ate:number[]; guests:Record<number,{ticks:number;lastTick:number}>}
let enabled=true;
export const householdPracticesOn=():boolean=>enabled;
export function setHouseholdPractices(on:boolean):void{enabled=on;}
export const hasHouseholdPractices=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,24);
// Rules 104: a household supper is real contact, so what a member is working on is said at the table. Five- and ten-day
// screens at rules 100 showed the share_work conversation started 4-6 times in several hundred offers, so the heard
// account that rules 100 consults almost never existed ordinarily; the supper is where the same people already sit
// within arm's reach. The telling uses the rules-92 record and its once-a-day limit, carries the meal's id, and
// assigns nothing.
let telling=true;
export const supperTellingOn=():boolean=>telling;
export function setSupperTelling(on:boolean):void{telling=on;}
export const hasSupperTelling=(w:World):boolean=>telling&&w.settings.dynamics==='rich'&&runsRulesVersion(w,104);
const SUPPER_TELL_AT=20;
function tellAtTable(w:World,a:Person,b:Person,m:Meal):void{
 const work=workToTell(w,a,b.id);if(!work)return;
 const text=hearUndertaking(w,a,b,work.id,m.id,'meal');if(text)say(w,a,text,'say',70);
}
export function supperWeight(w:World,p:Person):number{return hasHouseholdPractices(w)&&p.sharedSupper?.learned?4:0;}
export function noteSupperPortion(w:World,m:Meal,p:Person):void{
 if(!hasHouseholdPractices(w))return;const record=m.supperContact??={ate:[],guests:{}};if(!record.ate.includes(p.id))record.ate.push(p.id);
}
/** Sample each actual guest work tick, not arrival records or a shared household address. */
export function supperContact(w:World,m:Meal,p:Person):void{
 if(!hasHouseholdPractices(w)||m.status!=='eating'||p.id===m.host)return;
 const host=w.byId.get(m.host);
 if(host?.ent!=='person'||!host.alive||host.activity?.kind!=='host_meal'||host.activity.data.mealId!==m.id||(host.indoors??0)!==(p.indoors??0)||hyp(host.x-p.x,host.y-p.y)>4)return;
 const record=m.supperContact??={ate:[],guests:{}};const guest=record.guests[p.id]??={ticks:0,lastTick:-1};
 if(guest.lastTick!==w.tick){guest.ticks++;guest.lastTick=w.tick;}
 // rules 104: once the two have really sat together a while, each tells the other what they are working on, at most once a day
 if(hasSupperTelling(w)&&guest.ticks===SUPPER_TELL_AT&&host.hhId===p.hhId){tellAtTable(w,host,p,m);tellAtTable(w,p,host,m);}
}
function remember(w:World,p:Person,e:SupperExperience):void{
 const practice=p.sharedSupper??={experiences:[]};if(practice.learned||practice.experiences.some(x=>x.mealId===e.mealId))return;
 practice.experiences.push(e);if(practice.experiences.length>4)practice.experiences.shift();
 const same=practice.experiences.filter(x=>x.role===e.role&&x.hostId===e.hostId);
 if(same.length<2)return;
 practice.learned={source:e.role==='host'?'practice':'family',teacher:e.role==='host'?0:e.hostId,root:e.root,generation:e.generation,tick:w.tick,meals:same.slice(-2).map(x=>x.mealId)};
 addLog(w,p,'social',e.role==='host'?'Sharing supper has become a practice after hosting meals together.':`Acquired the practice of sharing supper from parent #${e.hostId}, through two meals together.`);
}
export function finishSupperPractice(w:World,m:Meal):void{
 if(!hasHouseholdPractices(w)||m.status!=='done'||!m.supperContact?.ate.includes(m.host))return;
 const host=w.byId.get(m.host);if(host?.ent!=='person'||!host.alive)return;
 const teacher=host.sharedSupper?.learned; // learning at this meal cannot transmit in the same instant
 const diners=Object.entries(m.supperContact.guests).filter(([id,c])=>c.ticks>=20&&m.supperContact!.ate.includes(Number(id))).map(([id])=>w.byId.get(Number(id))).filter((p):p is Person=>p?.ent==='person'&&p.alive);
 if(!diners.length)return;
 remember(w,host,{mealId:m.id,hostId:host.id,tick:w.tick,role:'host',root:host.id,generation:0});
 if(!teacher||teacher.meals.includes(m.id))return; // replaying completion cannot turn the learning meal into instruction
 for(const p of diners){
  if(p.relations[host.id]?.kin!=='parent'||(p.relations[host.id]?.trust??0)<0)continue;
  remember(w,p,{mealId:m.id,hostId:host.id,tick:w.tick,role:'family',root:teacher.root,generation:teacher.generation+1});
 }
}
export function supperHistory(w:World,p:Person):string[]{
 if(!hasHouseholdPractices(w)||!p.sharedSupper)return [];
 const k=p.sharedSupper.learned;
 const name=(id:number)=>w.persons.find(q=>q.id===id)?.name??deceasedById(w,id)?.name??`person #${id}`;
 if(!k)return [`Learning the practice of sharing supper: ${p.sharedSupper.experiences.length} qualifying meals; two with the same role and host are needed.`];
 return [`Practice: sharing supper. ${k.source==='practice'?'Established through hosting':`Acquired from parent ${name(k.teacher)}`}, meals ${k.meals.map(id=>'#'+id).join(' and ')}, tick ${k.tick}. Transmission generation ${k.generation}, origin ${name(k.root)}. This encourages offering a meal when food, company and time allow.`];
}
export function validateHouseholdPractices(w:World):void{
 const valid=(n:number)=>Number.isInteger(n)&&n>=0;
 for(const p of w.persons){const s=p.sharedSupper;if(!s)continue;
  if(!runsRulesVersion(w,24)||!Array.isArray(s.experiences)||s.experiences.length>4||new Set(s.experiences.map(e=>e.mealId)).size!==s.experiences.length||s.experiences.some(e=>!valid(e.mealId)||!valid(e.hostId)||!valid(e.tick)||!['host','family'].includes(e.role)||!valid(e.root)||!valid(e.generation)))throw new Error('Invalid household practice');
  const k=s.learned;if(k&&(!['practice','family'].includes(k.source)||!valid(k.teacher)||!valid(k.root)||!valid(k.generation)||!valid(k.tick)||!Array.isArray(k.meals)||k.meals.length!==2||k.meals[0]===k.meals[1]||k.meals.some(id=>!valid(id))))throw new Error('Invalid household practice provenance');
 }
 for(const m of w.meals){const s=m.supperContact;if(s&&(!runsRulesVersion(w,24)||!Array.isArray(s.ate)||s.ate.length>5||s.ate.some(id=>!valid(id))||new Set(s.ate).size!==s.ate.length||!s.guests||Object.keys(s.guests).length>4||Object.entries(s.guests).some(([id,c])=>!valid(Number(id))||!c||!valid(c.ticks)||!valid(c.lastTick))))throw new Error('Invalid supper contact');}
}
