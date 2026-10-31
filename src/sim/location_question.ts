// Rules 105: somebody present can be asked where a person is, and answers from their own sight or dated memory.
//
// Diagnosed on the promise path (docs/LOCATION_QUESTION.md): a helper who promised to bring something to a person who
// has since moved loses the remembered place when the hand-over fails ("was not where I expected"), and from then on the
// promise is set aside for good with "does not know where to find them", however many neighbours who just saw the person
// are standing beside them. The existing `ask_info` conversation asks only about food, water, wood and stone. Here it can
// also ask where a person is. The answer is the answerer's own knowledge only: the person in sight now, or their own
// whereabouts note no older than a day; nothing is read from the world. The asker keeps it only if it is newer than what
// they had, with who told them, and the ordinary delivery option returns. A wrong or stale answer is discovered on arrival
// exactly as a stale memory of one's own would be.
import {DAY} from './constants';
import {addLog} from './events';
import {knowsDeath} from './death_knowledge';
import {promisedLocation} from './promise_expectations';
import {runsRulesVersion} from './rulesversion';
import type {Person,World} from './types';
let enabled=true;
export const locationQuestionsOn=()=>enabled;
export const setLocationQuestions=(on:boolean):void=>{enabled=on;};
export const hasLocationQuestions=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,105);
/** Pure. What B could truthfully say about where `id` is: in sight now, or B's own note no older than a day. */
export function knownWhereabouts(w:World,B:Person,id:number):{x:number;y:number;tick:number}|null{
 const seen=B.seen.find(s=>s.ent==='person'&&s.id===id);if(seen)return {x:seen.x,y:seen.y,tick:w.tick};
 const note=B.whereabouts[id];if(note&&w.tick-note.tick<=DAY)return {x:note.x,y:note.y,tick:note.tick};
 return null;
}
/** Conversation only: A keeps B's account if it is newer than A's own; the teller is recorded. Returns what was said. */
export function tellWhereabouts(w:World,B:Person,A:Person,id:number):{x:number;y:number;tick:number;kept:boolean}|null{
 if(!hasLocationQuestions(w))return null;
 const k=knownWhereabouts(w,B,id);if(!k)return null;
 const mine=A.whereabouts[id];const kept=!mine||mine.tick<k.tick;
 if(kept){const q=w.byId.get(id);A.whereabouts[id]={x:k.x,y:k.y,tick:k.tick,from:B.id};addLog(w,A,'social',`${B.name} told me where they last saw ${q?.ent==='person'?q.name:`person #${id}`}, at tick ${k.tick}. I have not seen them there myself.`);}
 return {...k,kept};
}
/** Pure. People this person promised to bring something to and cannot place: the ones worth asking after. */
export function peopleToAskAfter(w:World,p:Person):{id:number;name:string}[]{
 if(!hasLocationQuestions(w))return [];
 const out:{id:number;name:string}[]=[];
 for(const c of p.commitments){
  if(c.status!=='active'||(c.kind!=='deliver'&&c.kind!=='haul')||!c.to||c.siteId||out.some(o=>o.id===c.to)||knowsDeath(p,c.to))continue;
  if(promisedLocation(p,c.to))continue;
  const q=w.byId.get(c.to);out.push({id:c.to,name:q?.ent==='person'?q.name:'the person I promised'});
 }
 return out;
}
export function validateLocationQuestions(w:World):void{
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,105);
 for(const r of w.requests)if(r.kind==='info'&&r.infoKind==='person'&&(!allowed||!Number.isSafeInteger(r.destId)))throw new Error('Invalid location question');
 for(const p of w.persons)for(const [id,n] of Object.entries(p.whereabouts))if(n.from!==undefined&&(!allowed||!Number.isSafeInteger(n.from)||n.from===p.id||!Number.isSafeInteger(Number(id))))throw new Error('Invalid told whereabouts');
 if(!allowed&&(w.conversations.some(c=>c.purpose==='ask_info'&&(c.data as {infoKind?:string}).infoKind==='person')||w.persons.some(p=>[p.activity,p.suspended].some(a=>a?.data.purpose==='ask_info'&&(a.data as {infoKind?:string}).infoKind==='person'))))throw new Error('Unsupported location question');
}
