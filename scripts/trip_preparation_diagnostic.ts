// Read-only staged planning diagnostic at the pinned predecessor; no ordinary occurrence claim.
import {stage,addPerson,building,site,done,give} from '../tests/helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const s=stage('trip-preparation-gap'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=71;
const p=addPerson(s,'Mara',40,17,{age:35,inv:{bread:1},hunger:100,thirst:70,energy:100,traits:{diligence:0.8,caution:0.5}});
const home=building(s,'hut',36,20,p.hhId,{grain:12}),target=site(s,'storehouse',52,42,p.hhId,p.id),tree=makeSource(w,'tree',65,55,12);give(w,p,'axe');w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
done(s);for(const e of [home,target,tree])observe(w,p,e);perceive(w,p);
const before=serializeWorld(w),ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
if(serializeWorld(w)!==before)throw new Error('Diagnostic mutated state');
console.log(JSON.stringify({rules:71,staged:true,person:p.id,tick:w.tick,needs:p.needs,carried:p.inv,knownWater:p.bykind.water,source:tree.id,offered:ranked.map(o=>({key:o.key,label:o.label,reason:o.selectionReason})),blocked:ctx.blocked.filter(o=>o.key===`gather:${tree.id}`),conserved:conservationReport(w).ok,pure:true},null,2));
