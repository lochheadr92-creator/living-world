// STAGED contract household. Prior hardship and remembered destination are fixture inputs.
import {stage,addPerson,building,done,pin} from './kit';
import {observe,putBelief} from '../../src/sim/knowledge';
import {makeSource} from '../../src/sim/sources';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {DAY} from '../../src/sim/constants';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import type {Person} from '../../src/sim/types';
export function relocationFixture(two=true,child=false){
 const s=stage('relocation-contract'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=20;w.tick=DAY+600;
 const a=addPerson(s,'Ada',40.5,40.5,{hunger:40,thirst:98,energy:98,inv:{water:2}});
 const b=two?addPerson(s,'Ben',41.5,40.5,{hh:a.hhId,hunger:98,thirst:98,energy:98,inv:{berries:2,water:2}}):undefined;
 const c=child?addPerson(s,'Cora',40.5,41.5,{hh:a.hhId,age:6,hunger:98,thirst:98,energy:98,inv:{berries:2,water:2}}):undefined;
 const hh=w.households.find(h=>h.id===a.hhId)!;const home=building(s,'lean_to',37,39,hh.id,{berries:10,water:6,wood:6});hh.homeId=home.id;
 const bush=makeSource(w,'berry_bush',43,15,12);
 const tree=makeSource(w,'tree',46,17,10);
 done(s);w.sceneLabel='STAGED: household relocation agreement, journey and founding';
 for(const p of w.persons){pin(p);p.needs.warmth=98;p.needs.safety=98;observe(w,p,home);}
 a.relocationHardship=600;
 observe(w,a,bush);putBelief(a,{id:1009999,kind:'water',x:43.5,y:14.5,amount:0,max:0,seen:w.tick,src:'seen',from:0,learned:w.tick});
 if(b){relOf(b,a.id).trust=70;relOf(b,a.id).affinity=70;}
 perceive(w,a);
 function choose(p:Person,key:string){
  const o=rankOptions(generateOptions(w,p,true,true)).find(o=>o.key.includes(key));
  if(!o?.make)throw new Error(`No offered ${key}; inventory: ${JSON.stringify(p.inv)}; sites: ${JSON.stringify(w.sites.map(s=>({work:s.work,need:s.required,delivered:s.delivered,used:s.used})))}; options: ${rankOptions(generateOptions(w,p,true,true)).map(o=>o.key).join(', ')}`);
  // Staged choice through the actual external boundary; physical work and urgent overrides stay live.
  let picked=false;
  setExternalController({controls:(_w,q)=>q.id===p.id,choose:()=>{if(picked)return {kind:'defer'};picked=true;return {kind:'pick',key:o.key};}});
  p.cooldowns.pause=0;p.nextThink=w.tick;stepWorld(w);
  if(!p.activity)throw new Error(`Selection did not start ${key}`);
  return p.activity;
 }
 function run(p:Person,key:string,max=1600){
  const act=choose(p,key);
  for(let i=0;i<max&&p.activity?.id===act.id;i++)stepWorld(w);
  pin(p);
  if(p.activity?.id===act.id)throw new Error(`Still running ${key}: ${JSON.stringify(p.activity)}`);
  if(p.lastResult?.outcome!=='success')throw new Error(`Did not finish ${key}: ${JSON.stringify({result:p.lastResult,now:p.activity?.label,needs:p.needs,inv:p.inv})}`);
  return act;
 }
 return {w,a,b,c,hh,home,bush,tree,choose,run};
}
