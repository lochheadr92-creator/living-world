// Personal preferences earned by completed actions on separate days, never a timetable or an action grant.
import {DAY,START_FRAC,isHomeType} from './constants';
import {winterDepth} from './hardship';
import {runsRulesVersion} from './rulesversion';
import type {Activity,ActivityKind,Person,World} from './types';
import type {Ctx,Option} from './optutil';

export const ROUTINE_LIMITS={entries:8,episodes:4,days:3,maxAge:8*DAY,tilt:3} as const;
const KINDS:ActivityKind[]=['fetch_water','gather','withdraw','deposit','haul','operate','craft','build','repair','tool_work','till','plant','tend','harvest','rest','wander','alone'];
const PHASES=['night','morning','afternoon','evening'];
let enabled=true;
export const routinesOn=()=>enabled;
export function setRoutines(on:boolean):void{enabled=on;}
export const hasRoutines=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,70);
export interface RoutineContext {winter:boolean;household:number;home:number;injury:string;family:string;contact:string;losses:string;}
export interface RoutineEpisode {id:number;day:number;tick:number;took:number;eta:number;}
export interface DailyPreference {key:string;label:string;kind:ActivityKind;target:number;phase:number;context:RoutineContext;episodes:RoutineEpisode[];failures:number;last:number;outcome:string;}
export interface DailyRoutines {entries:DailyPreference[];}
interface RoutineStart {key:string;label:string;kind:ActivityKind;target:number;phase:number;context:RoutineContext;eta:number;energy:number;warmth:number;recorded?:boolean;}
const phase=(tick:number)=>Math.floor(((tick/DAY+START_FRAC)%1)*4);
const day=(tick:number)=>Math.floor(tick/DAY+START_FRAC);
const ids=(a:number[])=>a.length+':'+a.sort((a,b)=>a-b).slice(0,8).join(',');
/** Only personal records and the visible season: no other person's live inventory, needs or whereabouts. */
export function routineContext(w:World,p:Person):RoutineContext{
 const kin=Object.entries(p.relations).filter(([,r])=>r.kin);
 const care=Object.entries(p.whereabouts).filter(([,v])=>v.room?.household&&v.room.needsCare&&w.tick-v.tick<2*DAY).map(([id])=>Number(id));
 return {winter:winterDepth(w)>0,household:p.hhId,
  home:Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.hh===p.hhId&&isHomeType(b.btype)).sort((a,b)=>a.id-b.id)[0]?.id??0,
  injury:p.injury?`${p.injury.kind}:${p.injury.since}`:p.health<60?'unwell':'well',
  family:ids([...new Set([...p.children,...care])]),
  contact:ids(kin.filter(([,r])=>!r.deathKnown&&w.tick-r.lastMet<2*DAY).map(([id])=>Number(id))),
  losses:ids(kin.filter(([,r])=>r.deathKnown).map(([id])=>Number(id)))};
}
function changed(a:RoutineContext,b:RoutineContext):string{
 if(a.winter!==b.winter)return 'the season changed';
 if(a.household!==b.household||a.home!==b.home)return 'the known household or home changed';
 if(a.injury!==b.injury)return 'health or injury changed';
 if(a.family!==b.family)return 'known family care changed';
 if(a.losses!==b.losses)return 'a family loss became known';
 if(a.contact!==b.contact)return 'recent family contact changed';
 return '';
}
/** Called only for an accepted choice, before the ordinary activity starts. */
export function prepareRoutine(w:World,p:Person,a:Activity,o:Option):void{
 if(!hasRoutines(w)||!KINDS.includes(a.kind)||!Number.isFinite(o.eta)||o.eta<=0||o.key.length>160)return;
 if(a.data.projectWait||a.data.daylightAt||a.data.layoutWait||a.kind==='wander'&&!a.data.haunt)return;
 a.data.dailyRoutine={key:o.key,label:o.label.slice(0,120),kind:a.kind,target:o.targetId,phase:phase(w.tick),context:routineContext(w,p),eta:o.eta,energy:p.needs.energy,warmth:p.needs.warmth} satisfies RoutineStart;
}
function achieved(p:Person,a:Activity,s:RoutineStart,outcome:string):boolean{
 if(outcome!=='success')return false;
 if(['fetch_water','gather','withdraw','deposit','haul'].includes(a.kind))return a.cycle>0;
 if(a.kind==='rest')return a.progress>=20&&(p.needs.energy-s.energy>=5||p.needs.warmth-s.warmth>=5);
 if(a.kind==='wander'||a.kind==='alone')return a.progress>=a.duration&&a.duration>=18;
 return a.progress>0;
}
/** Activity ending is the only learning boundary. A repeated callback cannot add a second episode. */
export function recordRoutine(w:World,p:Person,a:Activity,outcome:string,detail:string):void{
 const s=a.data.dailyRoutine as RoutineStart|undefined;
 if(!hasRoutines(w)||!s||s.recorded)return;s.recorded=true;
 const took=w.tick-a.start;if(took<1||took>DAY/2)return;
 const old=p.dailyRoutines?.entries.find(e=>e.key===s.key&&e.target===s.target&&e.phase===s.phase&&(e.kind!=='wander'||e.label===s.label)&&!changed(e.context,s.context));
 const difference=changed(s.context,routineContext(w,p));
 if(difference){if(old){old.last=w.tick;old.outcome=difference;}return;}
 const good=achieved(p,a,s,outcome),failed=outcome==='failed'||outcome==='partial'&&a.cycle===0;
 if(!good&&!old)return;
 const state=p.dailyRoutines??={entries:[]};
 state.entries=state.entries.filter(e=>w.tick-e.last<=ROUTINE_LIMITS.maxAge);
 let e=state.entries.find(e=>e===old);
 if(!e){e={key:s.key,label:s.label,kind:s.kind,target:s.target,phase:s.phase,context:s.context,episodes:[],failures:0,last:w.tick,outcome:''};state.entries.push(e);}
 e.last=w.tick;e.outcome=(good?'completed':`${outcome}: ${detail}`).slice(0,180);
 if(good){
  if(!e.episodes.some(x=>x.id===a.id||x.day===day(a.start)))e.episodes.push({id:a.id,day:day(a.start),tick:w.tick,took,eta:s.eta});
  e.episodes=e.episodes.filter(x=>w.tick-x.tick<=ROUTINE_LIMITS.maxAge).slice(-ROUTINE_LIMITS.episodes);e.failures=Math.max(0,e.failures-1);
 }else if(failed)e.failures=Math.min(3,e.failures+1);
 state.entries.sort((a,b)=>a.last-b.last||(a.key<b.key?-1:a.key>b.key?1:0));if(state.entries.length>ROUTINE_LIMITS.entries)state.entries.splice(0,state.entries.length-ROUTINE_LIMITS.entries);
}
export function routineReason(w:World,p:Person,e:DailyPreference):string{
 const difference=changed(e.context,routineContext(w,p));if(difference)return difference;
 if(w.tick-e.last>ROUTINE_LIMITS.maxAge)return 'experience has grown old';
 if(e.failures)return 'a recent attempt failed';
 if(e.episodes.filter(x=>w.tick-x.tick<=ROUTINE_LIMITS.maxAge).length<ROUTINE_LIMITS.days)return 'still learning from separate days';
 if(e.target&&!p.beliefs[e.target])return 'the place is no longer personally known';
 return '';
}
/** A small preference after the engine's hard filters. It neither creates an option nor changes the world. */
export function tiltRoutineChoices(ctx:Ctx,scored:{o:Option;s:number}[]):void{
 for(const x of scored)delete x.o.routineReason;
 if(!hasRoutines(ctx.world)||ctx.criticals.length||ctx.dangers.length||ctx.drives.hunger>30||ctx.drives.thirst>30||ctx.drives.warmth>30)return;
 for(const x of scored){
  const e=ctx.p.dailyRoutines?.entries.find(e=>e.key===x.o.key&&e.target===x.o.targetId&&e.phase===phase(ctx.world.tick)&&(e.kind!=='wander'||e.label===x.o.label)&&!routineReason(ctx.world,ctx.p,e));if(!e)continue;
  const expected=e.episodes.reduce((n,e)=>n+e.eta,0)/e.episodes.length;
  if(x.o.eta>expected*1.5+60)continue;
  const quiet=['rest','wander','alone'].includes(e.kind),taste=quiet?1-ctx.p.traits.diligence/2:0.5+ctx.p.traits.diligence/2;
  const amount=Math.round(ROUTINE_LIMITS.tilt*taste*10)/10;x.s+=amount;
  x.o.routineReason=`learned ${PHASES[e.phase]} preference: ${e.episodes.length} successful days at this place (+${amount})`;
 }
}
export function describeRoutines(w:World,p:Person):string[]{
 if(!hasRoutines(w))return [];
 return (p.dailyRoutines?.entries??[]).map(e=>`${PHASES[e.phase]}: ${e.label}. ${e.episodes.length} successful days (${e.episodes.map(x=>`activity #${x.id} at tick ${x.tick}`).join('; ')}). ${routineReason(w,p,e)||'A small preference when this legal choice fits current needs and travel cost'}. Last outcome: ${e.outcome}.`);
}
export function validateRoutines(w:World):void{
 const integer=(x:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&Number(x)>=min&&Number(x)<=max;
 const context=(c:RoutineContext)=>c&&typeof c.winter==='boolean'&&integer(c.household)&&integer(c.home)&&['injury','family','contact','losses'].every(k=>typeof c[k as keyof RoutineContext]==='string'&&String(c[k as keyof RoutineContext]).length<=180);
 for(const p of w.persons){
  const r=p.dailyRoutines;if(r&&(!runsRulesVersion(w,70)||w.settings.dynamics!=='rich'||!Array.isArray(r.entries)||r.entries.length>8))throw new Error('Invalid daily routine state');
  for(const e of r?.entries??[]){
   if(!e||typeof e.key!=='string'||e.key.length>160||typeof e.label!=='string'||e.label.length>120||!KINDS.includes(e.kind)||!integer(e.target)||!integer(e.phase,0,3)||!context(e.context)||!integer(e.last)||!integer(e.failures,0,3)||typeof e.outcome!=='string'||e.outcome.length>180||!Array.isArray(e.episodes)||e.episodes.length>4)throw new Error('Invalid daily preference');
   if(e.episodes.some(x=>!x||!integer(x.id,1)||!integer(x.day,0,day(w.tick))||!integer(x.tick,0,w.tick)||!integer(x.took,1,DAY/2)||!Number.isFinite(x.eta)||x.eta<=0||x.eta>1e7)||new Set(e.episodes.map(x=>x.day)).size!==e.episodes.length||new Set(e.episodes.map(x=>x.id)).size!==e.episodes.length)throw new Error('Invalid daily preference evidence');
  }
  for(const a of [p.activity,p.suspended])if(a?.data.dailyRoutine){const s=a.data.dailyRoutine as RoutineStart;if(!runsRulesVersion(w,70)||typeof s.key!=='string'||s.key.length>160||typeof s.label!=='string'||s.label.length>120||s.kind!==a.kind||!KINDS.includes(s.kind)||!integer(s.target)||!integer(s.phase,0,3)||!context(s.context)||!Number.isFinite(s.eta)||s.eta<=0||s.eta>1e7||![s.energy,s.warmth].every(n=>Number.isFinite(n)&&n>=0&&n<=100)||(s.recorded!==undefined&&typeof s.recorded!=='boolean'))throw new Error('Invalid daily routine activity');}
 }
}
