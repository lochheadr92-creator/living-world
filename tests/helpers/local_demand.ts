import {addPerson,building,done,pin,site,stage} from './kit';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {relOf} from '../../src/sim/relations';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import type {Person,SkillKey} from '../../src/sim/types';
/** STAGED equal skills, real construction wants, visible planks and distant known yard. */
export function localDemandScene(version=43){
 const s=stage('heard-local-demand'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const a=addPerson(s,'Ada',40.5,40.5,{age:30,hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1,sociability:1}});
 const b=addPerson(s,'Ben',42,40.5,{age:30,inv:{planks:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1,sociability:1}});
 const c=addPerson(s,'Cora',43.5,40.5,{age:30,hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1,sociability:1}});
 const yard=building(s,'timber_yard',20,35,0,{wood:9});observe(w,b,yard);
 for(const [p,x,y]of [[a,46,43],[b,55,43],[c,47,51]] as const){const st=site(s,'house',x,y,p.hhId,p.id);observe(w,p,st);pin(p);p.cooldowns.trade=1e12;p.needs.warmth=100;p.needs.safety=100;}
 for(const p of [a,c]){relOf(p,b.id).affinity=70;relOf(b,p.id).affinity=70;}
 for(const k of Object.keys(b.skills) as SkillKey[])b.skills[k]=1;
 done(s);w.sceneLabel='STAGED: two personally heard material requests inform a trade';for(const p of [a,b,c])perceive(w,p);
 const talk=(p:Person)=>{
  perceive(w,p);const o=rankOptions(generateOptions(w,p,true,true)).find(o=>o.label==='Ask Ben for planks');
  if(!o?.make)throw new Error('No offered request for planks: '+generateOptions(w,p,true,true).options.map(o=>o.label).join('|'));
  const after=w.nextId;p.cooldowns.pause=0;startActivity(w,p,o.make()!);
  for(let i=0;i<600;i++){stepWorld(w);if(w.requests.some(r=>r.id>=after&&r.from===p.id&&r.to===b.id&&r.status!=='pending')&&!p.convId)break;}
  pin(p);
 };
 const release=()=>{b.cooldowns.pause=0;b.cooldowns.trade=0;perceive(w,b);};
 return {w,a,b,c,yard,talk,release};
}
