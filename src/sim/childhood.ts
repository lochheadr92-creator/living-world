// Childhood owns invitations and paid shared experiences; social.ts owns contact and consent.
import {markShown} from './three_ages';
import {WORK_FIRST,workComesFirst} from './parent_decides';
import {DAY} from './constants';
import {hasChildhood} from './childhood_rules';
import {runsRulesVersion} from './rulesversion';
import {ageYears,stageOf} from './people';
import {CANNOT_TEACH,NO_TEACH_DAYS,lessonName,lessonSkill,lessonSkillWord,olderChildMayShow,olderChildrenShow,remembersNoTeach} from './shown';
import type {LessonSkill} from './shown';
import {gameAccept,gameName,gameTurn,hasGames,isGame,nextGame,notePlayed,playedToday} from './play';
import type {Game} from './play';
import {adjustRel} from './relations';
import {think} from './mood';
import {recordCompany} from './companionship';
import type {Conversation,ConvPurpose,Person,World} from './types';

export const CHILD_TIMES = ['family_time','play_together','learn_foraging'] as const;
export type ChildTime = typeof CHILD_TIMES[number];
export interface ChildhoodExperience {kind:ChildTime;last:number;times:number}
/** `skill` (rules 210, shown.ts): what a practice was about when it was not foraging; absent means foraging, as before 210. */
/** `game` (rules 211, play.ts): which game a play was when it was not the guessing game; absent means the guessing game, as before 211. */
export interface ChildhoodSession {since:number;until:number;outcome:'sharing'|'completed'|'declined'|'interrupted';reason:string;gain:number;skill?:'fish'|'farm';game?:'chase'|'hide'|'house'}
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
 // rules 211 (play.ts): a child with a game still unplayed today has something to ask for
 if(kind==='play_together')return stageOf(w,q)==='child'&&(!hasGames(w)||nextGame(w,p)!==null);
 // rules 210 (shown.ts): a child who was told "I cannot teach you more" does not ask that person again for a few days, and an older
 // child may be asked as a grown person may; both read only the asker's own memory and what the asker can see
 if(remembersNoTeach(w)&&(p.cooldowns['noteach:'+q.id]??0)>w.tick)return false;
 return (stageOf(w,q)!=='child'||olderChildMayShow(w,ageYears(w,p),ageYears(w,q)))&&(!!r?.kin||(r?.familiarity??0)>=2);
}

/** The skill a practice is about: the one fixed when it began, else what the teacher could show now. Null: nothing to show. */
function practiceSkill(w:World,c:Conversation,a:Person,b:Person):LessonSkill|null{
 if(c.childhood)return c.childhood.skill??'forage';
 return lessonSkill(w,a.skills,b.skills);
}

export function childTimeProblem(w:World,c:Conversation,a:Person,b:Person):string{
 if(!hasChildhood(w)||!isChildTime(c.purpose)||stageOf(w,a)!=='child')return 'this is no longer a childhood activity';
 if((a.indoors??0)!==(b.indoors??0)||Math.hypot(a.x-b.x,a.y-b.y)>3)return 'we were no longer together';
 if([a,b].some(p=>p.pose==='sleep'||Math.min(p.needs.hunger,p.needs.thirst,p.needs.energy,p.needs.warmth,p.needs.safety)<28))return 'someone needed to take care of themselves';
 if([a,b].some((p,i)=>(p.relations[[b,a][i].id]?.avoidUntil??0)>w.tick))return 'someone wanted space';
 if(c.purpose==='family_time'&&!a.relations[b.id]?.kin)return 'we are not family';
 if(c.purpose==='play_together'&&stageOf(w,b)!=='child')return 'they are no longer a child';
 if(c.purpose==='learn_foraging'){
  if(stageOf(w,b)==='child'&&!olderChildMayShow(w,ageYears(w,a),ageYears(w,b)))return CANNOT_TEACH;
  const k=practiceSkill(w,c,a,b);
  if(!k||b.skills[k]<=a.skills[k]+0.001)return CANNOT_TEACH;
 }
 return '';
}

export function beginChildTime(w:World,c:Conversation,a:Person,b:Person):string{
 if(!isChildTime(c.purpose))return '';
 // rules 210: an older child giving practice is not spending their own turn at it, so their own daily limit does not refuse it
 const teaching=c.purpose==='learn_foraging'&&olderChildrenShow(w);
 // rules 211 (play.ts): the game proposed travels with the ask; the one asked declines only if they have played THAT game today
 const game:Game|null=c.purpose==='play_together'&&hasGames(w)?(isGame(c.data.game)?c.data.game:'guess'):null;
 const hadIt=game?playedToday(w,b,game):(b.cooldowns['child:'+c.purpose]??0)>w.tick;
 // rules 228 (parent_decides.ts): a grown person asked for family time with a job in hand weighs the two, and may say not now
 const why=childTimeProblem(w,c,a,b)||((stageOf(w,b)==='child'&&!teaching&&hadIt)?'I have already had that time today; I want to do something else now':'')||(c.purpose==='family_time'?workComesFirst(w,b,a):'');
 const skill=!why&&c.purpose==='learn_foraging'?lessonSkill(w,a.skills,b.skills):null;
 c.childhood={since:w.tick,until:w.tick+childTimeTicks(c.purpose),outcome:why?'declined':'sharing',reason:why||'we agreed to spend this time together',gain:0,...(skill&&skill!=='forage'?{skill}:{}),...(game&&game!=='guess'?{game}:{})};
 a.cooldowns['child:'+c.purpose]=w.tick+(why?DAY/4:DAY);
 if(why===CANNOT_TEACH&&remembersNoTeach(w))a.cooldowns['noteach:'+b.id]=w.tick+NO_TEACH_DAYS*DAY;
 if(why)return why.startsWith(WORK_FIRST)?'Not now. I have to finish this first. Ask me again later.':why;
 if(skill&&skill!=='forage'){
  for(const [p,q] of [[a,b],[b,a]])if(p.activity){p.activity.label=`${lessonName(skill)} with ${q.name}`;p.activity.goal=childQuestion(c.purpose);}
  return skill==='fish'?'I cannot teach you more about foraging, but come: I will show you how I fish.':'I cannot teach you more about foraging, but come: I will show you how I work a plot.';
 }
 if(game&&game!=='guess'){
  for(const [p,q] of [[a,b],[b,a]])if(p.activity){p.activity.label=`${gameName(game)} with ${q.name}`;p.activity.goal=childQuestion(c.purpose);}
  return gameAccept(game);
 }
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
 if(s.game)return {p,text:gameTurn(s.game,elapsed%40===0)};
 return {p,text:elapsed%40===0?'Your turn to choose. I will guess.':'My turn to guess. Is it something near us?'};
}

export function finishChildTime(w:World,c:Conversation,a:Person,b:Person):void{
 const s=c.childhood;if(!isChildTime(c.purpose)||s?.outcome!=='sharing'||w.tick<s.until)return;
 const why=childTimeProblem(w,c,a,b);if(why){s.outcome='interrupted';s.reason=why;return;}
 s.outcome='completed';
 const k:LessonSkill=s.skill??'forage';
 if(c.purpose==='learn_foraging'){
  markShown(w,a,k); // rules 213 (three_ages.ts): the child has now been shown this task
  const before=a.skills[k];a.skills[k]=Math.min(b.skills[k],Math.round((before+0.025)*10000)/10000);
  s.gain=Math.round((a.skills[k]-before)*10000)/10000;
 }
 const named=s.skill?lessonName(k):s.game?gameName(s.game):childTimeName(c.purpose);
 s.reason=`${named} together for ${childTimeTicks(c.purpose)} ticks${s.gain?`; ${lessonSkillWord(k)} skill improved by ${s.gain}`:''}.`;
 for(const [p,q] of [[a,b],[b,a]]){
  const r=adjustRel(p,q.id,w.tick,{aff:3,fam:1,trust:0.5,note:`${s.reason} With ${q.name}.`});
  const old=r.childhood?.find(e=>e.kind===c.purpose);
  r.childhood=[...(r.childhood??[]).filter(e=>e.kind!==c.purpose),{kind:c.purpose,last:w.tick,times:Math.min(3,(old?.times??0)+1)}];
  const held=Object.values(p.relations).filter(r=>r.childhood).sort((a,b)=>Math.max(...b.childhood!.map(e=>e.last))-Math.max(...a.childhood!.map(e=>e.last)));
  for(const r of held.slice(4))delete r.childhood;
  p.needs.social=Math.min(100,p.needs.social+12);
  // rules 210: an older child who gave the practice keeps their own turn at it for the day
  // rules 211: a game uses up that game for the day for each player, and a short pause, not every game
  if(c.purpose==='play_together'&&hasGames(w))notePlayed(w,p,s.game??'guess');
  else if(!(p===b&&c.purpose==='learn_foraging'&&olderChildrenShow(w)&&stageOf(w,b)==='child'))p.cooldowns['child:'+c.purpose]=w.tick+DAY;
  think(w,p,'child:'+c.purpose,4,DAY/2,`${named} with ${q.name}`);
  recordCompany(w,p,q,c.purpose==='learn_foraging'&&p===b);
 }
}

export function childTimeReport(c:Conversation,interrupted:boolean,w?:World):{text:string;detail:string}|null{
 if(!isChildTime(c.purpose))return null;
 const s=c.childhood;
 if(s?.outcome==='sharing'&&interrupted){s.outcome='interrupted';s.reason='our time together was cut short; no completed experience or skill awarded';}
 // rules 211: what was completed is named for what it was (a game of chase, fishing practice), not only for its kind
 const named=s?.game?gameName(s.game):s?.skill&&w&&runsRulesVersion(w,211)?lessonName(s.skill):childTimeName(c.purpose);
 return {text:s?.outcome==='completed'?`${named} completed`:s?.outcome==='declined'?'invitation declined':'time together unfinished',detail:s?.reason??'we did not get to spend the requested time together'};
}

export function validateChildhood(w:World):void{
 const allowed=()=>w.settings.dynamics==='rich'&&runsRulesVersion(w,120);
 for(const p of w.persons){let count=0;
  for(const r of Object.values(p.relations)){if(!r.childhood)continue;count++;
   if(!allowed()||!Array.isArray(r.childhood)||r.childhood.length>3||new Set(r.childhood.map(e=>e.kind)).size!==r.childhood.length||r.childhood.some(e=>!isChildTime(e.kind)||!Number.isSafeInteger(e.last)||e.last<0||e.last>w.tick||!Number.isSafeInteger(e.times)||e.times<1||e.times>3))throw new Error('Invalid childhood experience');
  }if(count>4)throw new Error('Too many childhood relationships');
 }
 for(const c of w.conversations){const s=c.childhood;if(!s)continue;
  if(!allowed()||!isChildTime(c.purpose)||!Number.isSafeInteger(s.since)||s.since<0||s.since>w.tick||s.until!==s.since+childTimeTicks(c.purpose)||!['sharing','completed','declined','interrupted'].includes(s.outcome)||typeof s.reason!=='string'||(s.skill!==undefined&&(c.purpose!=='learn_foraging'||!runsRulesVersion(w,210)||(s.skill!=='fish'&&s.skill!=='farm')))||(s.game!==undefined&&(c.purpose!=='play_together'||!runsRulesVersion(w,211)||!['chase','hide','house'].includes(s.game)))||!Number.isFinite(s.gain)||s.gain<0||s.gain>0.026)throw new Error('Invalid childhood session');
 }
}
