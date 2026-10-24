// STAGED family meal contract. Ages are fixed, normal ages; advancing to the next
// invitation window is fixture setup, not a natural multigeneration claim.
import {stage,addPerson,building,done,pin} from './kit';
import {relOf} from '../../src/sim/relations';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import {newActivity,startActivity} from '../../src/sim/activities';
import {DAY} from '../../src/sim/constants';
import type {Person} from '../../src/sim/types';
export function supperFixture(){
 const s=stage('supper-practice-contract'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=24;w.tick=672;
 const a=addPerson(s,'Ada',42,24,{age:54,inv:{berries:8,water:2},hunger:98,thirst:98,energy:98,traits:{sociability:1,generosity:1}});
 const b=addPerson(s,'Bea',44,24,{age:32,hh:a.hhId,inv:{berries:2,water:2},hunger:98,thirst:98,energy:98,traits:{sociability:1,generosity:1}});
 const hall=building(s,'hall',48,26),home=building(s,'hut',45,22,a.hhId),pantry=building(s,'storehouse',42,22,a.hhId,{berries:40,water:20});w.households.find(h=>h.id===a.hhId)!.homeId=home.id;
 for(const p of [a,b])for(const q of [a,b])if(p!==q){relOf(p,q.id).affinity=80;relOf(p,q.id).trust=80;}
 relOf(b,a.id).kin='parent';relOf(a,b.id).kin='child';
 done(s);w.sceneLabel='STAGED: family supper practice transmitted through real meals';
 for(const p of [a,b]){pin(p);p.needs.warmth=98;p.needs.safety=98;observe(w,p,hall);observe(w,p,home);observe(w,p,pantry);}
 const choices=new Map<number,string>();setExternalController({controls:()=>true,choose:(_w,p)=>{const key=choices.get(p.id);if(!key)return {kind:'defer'};choices.delete(p.id);return {kind:'pick',key};}});
 const options=(p:Person)=>{perceive(w,p);return rankOptions(generateOptions(w,p,true,true));};
 function pick(p:Person,key:string,allowRefusal=false){const option=options(p).find(o=>o.key===key);if(!option)throw new Error(`No ${key}: ${options(p).map(o=>o.key).join(',')}`);choices.set(p.id,key);p.cooldowns.pause=0;p.nextThink=w.tick;stepWorld(w);if(!p.activity&&!allowRefusal)throw new Error('not selected '+key+': '+JSON.stringify(p.lastResult));return p.activity;}
 function finish(p:Person){for(let i=0;i<3000&&p.activity;i++)stepWorld(w);if(p.activity)throw new Error('still active '+p.activity.label);pin(p);}
 function prepare(host:Person){
  if((host.inv.berries??0)<8||(host.inv.water??0)<2){host.cooldowns.pause=0;startActivity(w,host,newActivity(w,host,{kind:'withdraw',label:'STAGED: take own supper supplies',goal:'fixture preparation',targetId:pantry.id,targetType:'building',spotX:pantry.x+2.5,spotY:pantry.y+1,tx:pantry.x,ty:pantry.y,utility:100,maxTicks:900,minCommit:900,data:{items:{berries:Math.max(0,8-(host.inv.berries??0)),water:Math.max(0,2-(host.inv.water??0))}}}));finish(host);}
  host.cooldowns.pause=0;startActivity(w,host,newActivity(w,host,{kind:'wander',label:'STAGED: return to the hall',goal:'fixture preparation',spotX:47,spotY:25,tx:47,ty:25,duration:1,maxTicks:900}));finish(host);
  w.tick=Math.max(Math.floor(w.tick/DAY)+1,Math.ceil(((host.cooldowns.hostMeal??0)-672)/DAY))*DAY+672; // labelled next-window fixture, no maturation change
 }
 function ready(host=a,guest=b){
  if([host,guest].some(p=>p.needs.energy<70)){
   w.tick=(Math.floor(w.tick/DAY)+1)*DAY+1400;stepWorld(w);
   for(const p of [host,guest]){const sleep=options(p).find(o=>o.kind==='sleep');if(sleep)pick(p,sleep.key);}
   for(let i=0;i<2500&&[host,guest].some(p=>p.activity);i++)stepWorld(w);
   for(const p of [host,guest]){if(p.activity)throw new Error('Fixture sleep unfinished');pin(p);}
  }
  for(const p of [guest,host]){
   if(p.needs.hunger<75){const eat=options(p).find(o=>o.kind==='eat_store')??options(p).find(o=>o.kind==='eat');if(eat){pick(p,eat.key);finish(p);}}
   prepare(p);const drink=options(p).find(o=>o.key==='drink:inv');if(drink){pick(p,drink.key);finish(p);}
  }
 }
 function begin(host=a,guest=b){
  ready(host,guest);
  // Select the offered invitation. Candidate preference is a fixture relationship, not a player control.
  const others=[a,b].filter(p=>p!==host&&p!==guest);for(const p of others)pin(p);
  for(const p of others)host.cooldowns['invite'+p.id]=w.tick+DAY;
  let m:typeof w.meals[number]|undefined;
  for(let attempt=0;attempt<3;attempt++){
   if(!options(host).some(o=>o.key===`socialize:${guest.id}:invite`))prepare(host);
   const started=w.tick;pick(host,`socialize:${guest.id}:invite`,true);finish(host);
   m=w.meals.find(m=>m.host===host.id&&m.created>=started&&m.accepted.includes(guest.id));if(m)break;
   // A real refusal remains recorded. Wait the ordinary conversation cooldown before retrying.
   for(let i=0;i<121;i++)stepWorld(w);
  }
  if(!m)throw new Error('Invitation not accepted after three offered attempts');
  for(let i=0;i<800&&(!options(host).some(o=>o.key===`host_meal:${m.id}`)||!options(guest).some(o=>o.key===`attend_meal:${m.id}`));i++)stepWorld(w);
  pick(host,`host_meal:${m.id}`);pick(guest,`attend_meal:${m.id}`);return m;
 }
 function meal(host=a,guest=b){const m=begin(host,guest);for(let i=0;i<1500&&m.status!=='done'&&m.status!=='cancelled';i++)stepWorld(w);finish(host);finish(guest);if(m.status!=='done')throw new Error('Meal '+m.end);return m;}
 return {w,a,b,hall,home,pantry,meal,begin,finish,pick,options,prepare,ready};
}
