import {stage,addPerson,building,site,done,pin} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {CART_COST} from '../../src/sim/constants';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import type {Person,World} from '../../src/sim/types';

export function selectPrerequisite(w:World,p:Person,key:string){
 const option=rankOptions(generateOptions(w,p,true,true)).find(o=>o.key===key);
 if(!option)throw new Error(`Not offered: ${key}. ${JSON.stringify({inv:p.inv,needs:p.needs,plans:p.intentions,offered:generateOptions(w,p,true,true).options.map(o=>o.key),blocked:generateOptions(w,p,true,true).blocked})}`);
 let picked=false;
 const restore=setExternalController({controls:(_w,q)=>q.id===p.id,choose:()=>{if(picked)return {kind:'defer'};picked=true;return {kind:'pick',key};}});
 try{p.cooldowns.pause=0;p.nextThink=w.tick;stepWorld(w);
  if(!p.activity||p.lastDecision?.chosen?.label!==option.label)throw new Error(`Selection not accepted: ${key}`);
  return {act:p.activity,restore};
 }catch(e){restore();throw e;}
}
export function finishPrerequisite(w:World,p:Person,key:string){
 const {act,restore}=selectPrerequisite(w,p,key);
 try{for(let i=0;i<3000&&p.activity?.id===act.id;i++)stepWorld(w);
  if(p.activity?.id===act.id||!['success','partial'].includes(p.lastResult?.outcome??''))throw new Error(`Unfinished ${key}: ${JSON.stringify(p.lastResult)}`);
  pin(p);return act;
 }finally{restore();}
}
export function cartPrerequisiteScene(version=57,loaded=false){
 const s=stage('cart-hammer-prerequisite'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;w.tick=1000;
 const p=addPerson(s,'Hana',40.5,40.5,{age:32,hunger:100,thirst:100,energy:100,traits:{diligence:1},inv:{bread:loaded?3:1,water:loaded?3:1}});
 p.skills.build=1.1;p.skills.carpentry=1.4;p.stats.gathered=0;
 const home=building(s,'hut',36,36,p.hhId,{grain:8});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const yard=building(s,'timber_yard',50,36,0,{...CART_COST});
 const target=site(s,'storehouse',58,44,p.hhId,p.id);target.required.stone=40;
 const stock=building(s,'storehouse',54,36,0,{stone:30});
 const tree=makeSource(w,'tree',38,46,8),rock=makeSource(w,'rock',43,46,8);
 done(s);for(const e of [home,yard,target,stock,tree,rock])observe(w,p,e);perceive(w,p);pin(p);p.cooldowns.trade=1e12;
 w.sceneLabel='TEST SCENE: a wanted cart needs a hammer; known raw materials, workshop inputs and useful load are staged';
 return {s,w,p,home,yard,target,stock,tree,rock};
}
