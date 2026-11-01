// Childhood owns invitations and paid shared experiences; social.ts owns contact and consent.
import {DAY} from './constants';
import {hasChildhood} from './childhood_rules';
import {runsRulesVersion} from './rulesversion';
import {stageOf} from './people';
import {adjustRel} from './relations';
import {think} from './mood';
import {recordCompany} from './companionship';
import type {Conversation,ConvPurpose,Person,World} from './types';

export const CHILD_TIMES = ['family_time','play_together','learn_foraging'] as const;
export type ChildTime = typeof CHILD_TIMES[number];
export interface ChildhoodExperience {kind:ChildTime;last:number;times:number}
export interface ChildhoodSession {since:number;until:number;outcome:'sharing'|'completed'|'declined'|'interrupted';reason:string;gain:number}
export const isChildTime=(s:ConvPurpose):s is ChildTime=>(CHILD_TIMES as readonly string[]).includes(s);
export const childTimeTicks=(kind:ChildTime)=>kind==='learn_foraging'?160:120;
export const childTimeName=(kind:ChildTime)=>kind==='family_time'?'Family time':kind==='play_together'?'A guessing game':'Foraging practice';
export const childQuestion=(kind:ChildTime)=>kind==='family_time'?'Can we spend some time together and tell each other about our day?':kind==='play_together'?'Will you play a guessing game with me? We can take turns.':'Could you help me practise recognising food plants?';

/** Only the asker's own history sets the daily limit. Seeing somebody is handled by the caller. */
export function wantsChildTime(w:World,p:Person,q:Person,kind:ChildTime):boolean{
 if(!hasChildhood(w)||stageOf(w,p)!=='child'||(p.cooldowns['child:'+kind]??0)>w.tick)return false;
 const r=p.relations[q.id];
 if(r?.deathKnown||(r?.avoidUntil??0)>w.tick||(r?.affinity??0)<-10)return false;
 if(kind==='family_time')return !!r?.kin;
 if(kind==='play_together')return stageOf(w,q)==='child';
 return stageOf(w,q)!=='child'&&(!!r?.kin||(r?.familiarity??0)>=2);
}

export function childTimeProblem(w:World,c:Conversation,a:Person,b:Person):string{
 if(!hasChildhood(w)||!isChildTime(c.purpose)||stageOf(w,a)!=='child')return 'this is no longer a childhood activity';
 if((a.indoors??0)!==(b.indoors??0)||Math.hypot(a.x-b.x,a.y-b.y)>3)return 'we were no longer together';
 if([a,b].some(p=>p.pose==='sleep'||Math.min(p.needs.hunger,p.needs.thirst,p.needs.energy,p.needs.warmth,p.needs.safety)<28))return 'someone needed to take care of themselves';
 if([a,b].some((p,i)=>(p.relations[[b,a][i].id]?.avoidUntil??0)>w.tick))return 'someone wanted space';
 if(c.purpose==='family_time'&&!a.relations[b.id]?.kin)return 'we are not family';
 if(c.purpose==='play_together'&&stageOf(w,b)!=='child')return 'they are no longer a child';
 if(c.purpose==='learn_foraging'&&(stageOf(w,b)==='child'||b.skills.forage<=a.skills.forage+0.001))return 'I cannot teach you more about foraging yet';
 return '';
}

export function beginChildTime(w:World,c:Conversation,a:Person,b:Person):string{
 if(!isChildTime(c.purpose))return '';
 const why=childTimeProblem(w,c,a,b)||((stageOf(w,b)==='child'&&(b.cooldowns['child:'+c.purpose]??0)>w.tick)?'I have already had that time today; I want to do something else now':'');
 c.childhood={since:w.tick,until:w.tick+childTimeTicks(c.purpose),outcome:why?'declined':'sharing',reason:why||'we agreed to spend this time together',gain:0};
 a.cooldowns['child:'+c.purpose]=w.tick+(why?DAY/4:DAY);
 if(why)return why;
 // Both accepted participants actually stop their work. Labels persist in the ordinary inspector.
 for(const [p,q] of [[a,b],[b,a]])if(p.activity){p.activity.label=`${childTimeName(c.purpose)} with ${q.name}`;p.activity.goal=childQuestion(c.purpose);}
 return c.purpose==='play_together'?'Yes. You choose something you can see, and I will guess. Then we swap.':c.purpose==='learn_foraging'?'Yes. Let us practise the food-plant signs I know.':'Yes. I have time to sit with you and hear about your day.';
}

/** Called every shared tick; turn-taking is visible while the existing conversation holds both people. */
export function childTurn(w:World,c:Conversation,a:Person,b:Person):{p:Person;text:string}|null{
 const s=c.childhood;if(s?.outcome!=='sharing'||c.purpose!=='play_together')return null;
 const elapsed=w.tick-s.since;
 if(elapsed<=0||elapsed>=120||elapsed%20)return null;
 const p=elapsed%40===0?a:b;p.wave=w.tick+12;
 return {p,text:elapsed%40===0?'Your turn to choose. I will guess.':'My turn to guess. Is it something near us?'};
}

export function finishChildTime(w:World,c:Conversation,a:Person,b:Person):void{
 const s=c.childhood;if(!isChildTime(c.purpose)||s?.outcome!=='sharing'||w.tick<s.until)return;
 const why=childTimeProblem(w,c,a,b);if(why){s.outcome='interrupted';s.reason=why;return;}
 s.outcome='completed';
 if(c.purpose==='learn_foraging'){
  const before=a.skills.forage;a.skills.forage=Math.min(b.skills.forage,Math.round((before+0.025)*10000)/10000);
  s.gain=Math.round((a.skills.forage-before)*10000)/10000;
 }
 s.reason=`${childTimeName(c.purpose)} together for ${childTimeTicks(c.purpose)} ticks${s.gain?`; foraging skill improved by ${s.gain}`:''}.`;
 for(const [p,q] of [[a,b],[b,a]]){
  const r=adjustRel(p,q.id,w.tick,{aff:3,fam:1,trust:0.5,note:`${s.reason} With ${q.name}.`});
  const old=r.childhood?.find(e=>e.kind===c.purpose);
  r.childhood=[...(r.childhood??[]).filter(e=>e.kind!==c.purpose),{kind:c.purpose,last:w.tick,times:Math.min(3,(old?.times??0)+1)}];
  const held=Object.values(p.relations).filter(r=>r.childhood).sort((a,b)=>Math.max(...b.childhood!.map(e=>e.last))-Math.max(...a.childhood!.map(e=>e.last)));
  for(const r of held.slice(4))delete r.childhood;
  p.needs.social=Math.min(100,p.needs.social+12);
  p.cooldowns['child:'+c.purpose]=w.tick+DAY;
  think(w,p,'child:'+c.purpose,4,DAY/2,`${childTimeName(c.purpose)} with ${q.name}`);
  recordCompany(w,p,q,c.purpose==='learn_foraging'&&p===b);
 }
}

export function childTimeReport(c:Conversation,interrupted:boolean):{text:string;detail:string}|null{
 if(!isChildTime(c.purpose))return null;
 const s=c.childhood;
 if(s?.outcome==='sharing'&&interrupted){s.outcome='interrupted';s.reason='our time together was cut short; no completed experience or skill awarded';}
 return {text:s?.outcome==='completed'?`${childTimeName(c.purpose)} completed`:s?.outcome==='declined'?'invitation declined':'time together unfinished',detail:s?.reason??'we did not get to spend the requested time together'};
}

export function validateChildhood(w:World):void{
 const allowed=()=>w.settings.dynamics==='rich'&&runsRulesVersion(w,119);
 for(const p of w.persons){let count=0;
  for(const r of Object.values(p.relations)){if(!r.childhood)continue;count++;
   if(!allowed()||!Array.isArray(r.childhood)||r.childhood.length>3||new Set(r.childhood.map(e=>e.kind)).size!==r.childhood.length||r.childhood.some(e=>!isChildTime(e.kind)||!Number.isSafeInteger(e.last)||e.last<0||e.last>w.tick||!Number.isSafeInteger(e.times)||e.times<1||e.times>3))throw new Error('Invalid childhood experience');
  }if(count>4)throw new Error('Too many childhood relationships');
 }
 for(const c of w.conversations){const s=c.childhood;if(!s)continue;
  if(!allowed()||!isChildTime(c.purpose)||!Number.isSafeInteger(s.since)||s.since<0||s.since>w.tick||s.until!==s.since+childTimeTicks(c.purpose)||!['sharing','completed','declined','interrupted'].includes(s.outcome)||typeof s.reason!=='string'||!Number.isFinite(s.gain)||s.gain<0||s.gain>0.026)throw new Error('Invalid childhood session');
 }
}
