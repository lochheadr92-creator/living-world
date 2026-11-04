// Paid instruction and modest extra learning while actually working beside a skilled peer.
import {DAY,SKILL_MAX} from './constants';
import {runsRulesVersion} from './rulesversion';
import {stageOf} from './people';
import {visibleWork,tradeWord} from './trade';
import {addLog} from './events';
import type {Conversation,Person,SkillKey,World} from './types';
export const COACH_TICKS=180;
export const COACH_SKILLS:SkillKey[]=['forage','fish','wood','stone','build','farm','craft','carpentry','kiln','smith','bake'];
export interface SkillExperience {skill:SkillKey;from:number;name:string;tick:number;gain:number;how:'coached'|'worked alongside';}
export interface SkillLesson {skill:SkillKey;since:number;until:number;outcome:'learning'|'learned'|'declined'|'interrupted';reason:string;gain:number;}
export const hasCoaching=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,142);
const skillOK=(k:unknown):k is SkillKey=>COACH_SKILLS.includes(k as SkillKey);
function remember(w:World,p:Person,q:Person,k:SkillKey,gain:number,how:SkillExperience['how']):void{const list=p.skillExperience??=[];list.push({skill:k,from:q.id,name:q.name,tick:w.tick,gain,how});if(list.length>8)list.shift();}
export function coachingProblem(w:World,c:Conversation,p:Person,q:Person):string{
 const k=c.skillLesson?.skill??c.data.skill;
 if(!hasCoaching(w)||!skillOK(k)||[p,q].some(x=>!x.alive||stageOf(w,x)==='child'))return 'adult skill instruction is unavailable';
 if(p.indoors!==q.indoors||Math.hypot(p.x-q.x,p.y-q.y)>3||[p,q].some(x=>x.pose==='sleep'))return 'we are not awake and together';
 if([p,q].some(x=>Math.min(x.needs.hunger,x.needs.thirst,x.needs.energy,x.needs.warmth,x.needs.safety)<30))return 'someone has an urgent need';
 if(q.skills[k]<1||q.skills[k]-p.skills[k]<.2)return 'I cannot show you enough new about that skill';
 return '';
}
export function beginCoaching(w:World,c:Conversation,p:Person,q:Person):string{
 if(c.skillLesson)return c.skillLesson.reason;const k=c.data.skill;
 if(!skillOK(k))return 'unknown skill';
 const why=coachingProblem(w,c,p,q)||((p.cooldowns.coached??0)>w.tick||(q.cooldowns.coach??0)>w.tick?'we have already spent time on instruction today':'')||((q.relations[p.id]?.affinity??0)<-5||(p.relations[q.id]?.trust??10)<0?'we do not want to learn together':'')||(q.commitments.some(x=>x.status==='active')?'I have promised work to do':'')||(q.traits.generosity<.3?'I would rather keep working':'');
 c.skillLesson={skill:k,since:w.tick,until:w.tick+COACH_TICKS,outcome:why?'declined':'learning',reason:why||'accepted skill instruction',gain:0};
 p.cooldowns.coached=w.tick+(why?DAY/4:DAY/2);if(why)return why;q.cooldowns.coach=w.tick+DAY/2;
 if(p.activity)p.activity.label=`Learning ${tradeWord(k)} from ${q.name}`;if(q.activity)q.activity.label=`Coaching ${p.name} in ${tradeWord(k)}`;return '';
}
export function finishCoaching(w:World,c:Conversation,p:Person,q:Person):boolean{
 const s=c.skillLesson;if(s?.outcome!=='learning'||w.tick<s.until)return false;const why=coachingProblem(w,c,p,q);if(why){s.outcome='interrupted';s.reason=why;return false;}
 const gain=Math.min(.04,(q.skills[s.skill]-p.skills[s.skill])*.06,SKILL_MAX-p.skills[s.skill]);p.skills[s.skill]+=gain;s.gain=gain;s.outcome='learned';s.reason=`Practised ${tradeWord(s.skill)} together for ${COACH_TICKS} ticks; gained ${gain.toFixed(3)} skill.`;remember(w,p,q,s.skill,gain,'coached');addLog(w,p,'work',`${q.name} coached me: ${s.reason}`);addLog(w,q,'work',`Coached ${p.name}: ${s.reason}`);return true;
}
export function interruptCoaching(c:Conversation):void{if(c.skillLesson?.outcome==='learning'){c.skillLesson.outcome='interrupted';c.skillLesson.reason='instruction ended before completion; no skill awarded';}}
/** Called only after the learner performed skill-bearing work. No passive skill minting. */
export function learnAlongside(w:World,p:Person,k:SkillKey,paidGain:number):void{
 if(!hasCoaching(w)||paidGain<=0||p.activity?.phase!=='work'||p.apprentice||p.pose==='sleep'||(p.cooldowns.peerLearning??0)>w.tick)return;
 for(const s of p.seen){if(s.ent!=='person'||s.work!==k||s.asleep||Math.hypot(s.x-p.x,s.y-p.y)>3)continue;const q=w.byId.get(s.id);
  if(q?.ent!=='person'||!q.alive||q.indoors!==p.indoors||q.activity?.phase!=='work'||q.pose==='sleep'||visibleWork(w,q)!==k||Math.hypot(q.x-p.x,q.y-p.y)>3||q.skills[k]<1||q.skills[k]-p.skills[k]<.2)continue;
  const gain=Math.min(.003,paidGain*.25,q.skills[k]-.05-p.skills[k],SKILL_MAX-p.skills[k]);if(gain<=0)return;p.skills[k]+=gain;p.cooldowns.peerLearning=w.tick+60;remember(w,p,q,k,gain,'worked alongside');return;
 }
}
export function describeCoaching(p:Person):string[]{return (p.skillExperience??[]).map(e=>`${e.how==='coached'?'Coached by':'Worked alongside'} ${e.name}: ${tradeWord(e.skill)}, +${e.gain.toFixed(3)} at tick ${e.tick}.`);}
export function validateCoaching(w:World):void{
 for(const p of w.persons)if(p.skillExperience!==undefined){if(!hasCoaching(w)||!Array.isArray(p.skillExperience)||p.skillExperience.length>8)throw Error('Invalid skill experience');for(const e of p.skillExperience)if(!skillOK(e.skill)||!Number.isSafeInteger(e.from)||e.from<=0||typeof e.name!=='string'||e.name.length>200||!Number.isSafeInteger(e.tick)||e.tick<0||e.tick>w.tick||!Number.isFinite(e.gain)||e.gain<=0||e.gain>.04||!['coached','worked alongside'].includes(e.how))throw Error('Invalid skill experience');}
 for(const c of w.conversations){const s=c.skillLesson;if(c.purpose==='learn_skill'&&(!hasCoaching(w)||!skillOK(c.data.skill)))throw Error('Invalid coaching request');if(s&&(!hasCoaching(w)||c.purpose!=='learn_skill'||!skillOK(s.skill)||s.skill!==c.data.skill||!Number.isSafeInteger(s.since)||s.since<0||s.since>w.tick||s.until!==s.since+COACH_TICKS||!['learning','learned','declined','interrupted'].includes(s.outcome)||typeof s.reason!=='string'||!Number.isFinite(s.gain)||s.gain<0||s.gain>.04||s.outcome!=='learned'&&s.gain!==0))throw Error('Invalid skill lesson');}
}

export function coachingProgress(w:World,p:Person):number|undefined{const s=w.conversations.find(c=>c.id===p.convId)?.skillLesson;return s?.outcome==='learning'?Math.max(0,Math.min(1,(w.tick-s.since)/COACH_TICKS)):undefined;}
