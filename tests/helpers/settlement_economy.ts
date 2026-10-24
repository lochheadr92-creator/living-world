// Labelled accounting fixture: actual extraction, processing and transfer boundaries.
import {stage,addPerson,building,done} from './kit';
import {makeSource} from '../../src/sim/sources';
import {gatherFromSource,transfer} from '../../src/sim/economy';
import {startJob,workJob} from '../../src/sim/facilities';
import {RECIPE_BY_ID} from '../../src/sim/recipes';
import {DAY} from '../../src/sim/constants';
export function economyFixture(){
 const s=stage('settlement-economy-contract'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=21;
 const a=addPerson(s,'Ada',40.5,40.5),b=addPerson(s,'Ben',41.5,40.5);
 const second={id:w.nextId++,name:'Stoneford',x:60,y:40,founded:0};w.townships!.push(second);
 w.households.find(h=>h.id===b.hhId)!.townshipId=second.id;
 const source=makeSource(w,'tree',42,42,10),yard=building(s,'timber_yard',44,43,0,{wood:9});
 done(s);w.sceneLabel='STAGED: actual settlement output and cross-township transfers';
 const batch=()=>{const error=startJob(w,yard,a,RECIPE_BY_ID.hew_planks,0,'staged accounting contract');if(error)throw new Error(error);for(let i=0;i<900&&yard.ops!.job;i++){w.tick++;workJob(w,yard,a);}if(yard.ops!.job)throw new Error('batch unfinished');};
 const demonstrate=()=>{for(let i=0;i<3;i++){w.tick=i*DAY;gatherFromSource(w,source,a,1);batch();}transfer(w,a.inv,b.inv,100,'wood',2,`person:${a.id}`,`person:${b.id}`,'given');};
 return {w,a,b,source,yard,batch,demonstrate};
}
