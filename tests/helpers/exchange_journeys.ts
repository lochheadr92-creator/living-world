// STAGED opportunity: two residents of different townships meet, talk, and separate.
import {stage,addPerson,site,done,pin} from './kit';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {observe} from '../../src/sim/knowledge';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import {newActivity,startActivity} from '../../src/sim/activities';
export function exchangeFixture(){
 const s=stage('exchange-contract'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=22;w.tick=600;
 const a=addPerson(s,'Ada',40.5,40.5,{inv:{berries:5,water:2},hunger:98,thirst:98,energy:98});
 const b=addPerson(s,'Ben',41.5,40.5,{inv:{wood:2,berries:1,water:2},hunger:98,thirst:98,energy:98,traits:{sociability:1}});
 const second={id:w.nextId++,name:'Stoneford',x:40,y:40,founded:0};w.townships!.push(second);w.households.find(h=>h.id===b.hhId)!.townshipId=second.id;
 const buildingSite=site(s,'lean_to',59,42,a.hhId,a.id);
 done(s);w.sceneLabel='STAGED: a heard trade lead and physical barter journey';
 for(const p of w.persons){pin(p);p.needs.warmth=98;p.needs.safety=98;relOf(p,p===a?b.id:a.id).affinity=90;}
 a.needs.social=30;perceive(w,a);
 function choose(key:string){
  perceive(w,a);const o=rankOptions(generateOptions(w,a,true,true)).find(o=>o.key.includes(key));if(!o)throw new Error('No '+key+': '+rankOptions(generateOptions(w,a,true,true)).map(o=>o.key).join(','));
  let picked=false;setExternalController({controls:(_w,p)=>p.id===a.id,choose:()=>{if(picked)return {kind:'defer'};picked=true;return {kind:'pick',key:o.key};}});
  a.cooldowns.pause=0;a.nextThink=w.tick;stepWorld(w);if(!a.activity)throw new Error('Did not select '+key);return a.activity;
 }
 function finish(max=1000){for(let i=0;i<max&&a.activity;i++)stepWorld(w);if(a.activity)throw new Error('Still active '+a.activity.label);pin(a);}
 function learnAndSeparate(){
  choose(`socialize:${b.id}:chat`);finish();if(!a.tradeLeads?.length)throw new Error('No personally heard lead');
  // Staged setup travel uses the ordinary movement handler; no position or goods teleport.
  a.cooldowns.pause=0;startActivity(w,a,newActivity(w,a,{kind:'wander',label:'STAGED: returning to own site',goal:'fixture setup',tx:60.5,ty:40.5,spotX:60.5,spotY:40.5,duration:1,maxTicks:900}));finish();
  observe(w,a,buildingSite);perceive(w,a);
 }
 return {w,a,b,buildingSite,choose,finish,learnAndSeparate};
}
