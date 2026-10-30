import {materialPromiseScene,materialChoice} from './stored_materials';
import {observe} from '../../src/sim/knowledge';
import {transfer} from '../../src/sim/economy';
import {carryCap} from '../../src/sim/people';
import {generateOptions} from '../../src/sim/decision';
import {reviewIntentions} from '../../src/sim/intent';
import {createSite} from '../../src/sim/buildings';
import {perceive} from '../../src/sim/perception';
import {runLive,runReplay} from '../../src/agent/run';
import {stubModel} from '../../src/agent/model';
import {observationFromPrompt} from '../../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {rebuildMobileGrid} from '../../src/sim/registry';
/** Actual request/delivery/use, then a labelled staged second workload. No receipt or competence is assigned. */
export async function helperLearningScene(version=78){
 const f=materialPromiseScene(version);f.ada.relations[f.ben.id].trust=-2;
 // A deliberately nearer comparator makes the later choice sensitive to bounded evidence, not a distance tie.
 f.cora.x=39.5;f.cora.y=41.5;rebuildMobileGrid(f.w);
 const initial=serializeWorld(f.w),model=stubModel('helper-learning-scene',req=>{const o=observationFromPrompt(req.user)!;return JSON.stringify({choose:materialChoice(o,'promise').key,why:'Use offered material help and craft the pick.'});});
 const result=await runLive(f.w,f.ada.id,model,{until:2000}),w=result.world;
 if(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)!==serializeWorld(w))throw new Error('First helper exchange replay changed');
 const ada=w.persons.find(p=>p.id===f.ada.id)!,ben=w.persons.find(p=>p.id===f.ben.id)!,cora=w.persons.find(p=>p.id===f.cora.id)!,outsider=w.persons.find(p=>p.id===f.outsider.id)!,store=w.buildings.find(b=>b.id===f.store.id)!;
 const receipt=ada.socialMemory?.find(m=>m.otherId===ben.id);if(!receipt||ada.inv.pick!==1)throw new Error('Missing physical delivery and useful crafting');
 // Separate matched challenge: a known new home site and a competing helper's starting stock, conserved from the store.
 const target=createSite(w,'hut',46,42,ada.hhId,ada.id);observe(w,ada,target);
 transfer(w,store.store.items,cora.inv,carryCap(w,cora),'stone',2,'building:'+store.id,'person:'+cora.id,'staged second workload competing stock');
 perceive(w,ada);reviewIntentions(generateOptions(w,ada,true));
 w.sceneLabel='STAGED: an actual stone request, voluntary delivery and crafted pick, retained through a delay. A second known construction workload and conserved competing-helper stock are then staged to isolate later helper choice.';
 return {w,ada,ben,cora,outsider,store,target,receipt};
}
