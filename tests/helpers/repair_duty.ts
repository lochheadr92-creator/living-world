// Declared elder and damaged remote home; acceptance, acquisition and repair use actual offers.
import {stage,addPerson,building,done} from './kit';
import {observe} from '../../src/sim/knowledge';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {setExternalController} from '../../src/sim/external';
import {makeSource} from '../../src/sim/sources';
import type {Items} from '../../src/sim/types';
export function repairDutyScene(version=98,type:'hut'|'house'='house',inv:Items={bread:2,water:2},condition=35){
 const s=stage('heard-roof-repair'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const parent=addPerson(s,'Ada',40,40,{age:73,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ben',42,40,{age:33,inv,hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1}}),home=building(s,type,62,40,parent.hhId),tree=makeSource(w,'tree',46,40,12);home.condition=condition;w.households.find(h=>h.id===parent.hhId)!.homeId=home.id;done(s);observe(w,parent,home);observe(w,helper,tree);relOf(parent,helper.id).affinity=80;relOf(helper,parent.id).affinity=80;relOf(parent,helper.id).trust=80;relOf(helper,parent.id).trust=80;for(const p of [parent,helper])perceive(w,p);
 w.sceneLabel='STAGED elder and damaged remote home; actual accepted duty, physical wood patch and later shelter';return {s,w,parent,helper,home,tree};
}
export function requestRepair(f:ReturnType<typeof repairDutyScene>){
 const ask=generateOptions(f.w,f.parent,true,true).options.find(o=>o.key.endsWith(':repair'));if(!ask)throw new Error('No offered roof request');const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{startActivity(f.w,f.parent,ask.make!()!);for(let n=0;n<100;n++)stepWorld(f.w);}finally{release();}return f.w.requests.find(r=>r.kind==='repair')!;
}
