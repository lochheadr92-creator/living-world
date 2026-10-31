// Reproduce the first retained river shore-drinking success and forest danger interruption.
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {sourceManifest} from './observers/provenance';
const out=process.argv.slice(2).filter(a=>a!=='--')[0];if(!out||existsSync(out))throw new Error('Fresh output required');
const source=sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).sort().map(f=>'src/'+f));
const stories=[];
for(const [seed,person] of [['river',1134],['forest',937]] as const){
 const w=createWorld({...currentWorldSettings('normal',seed,{immigration:false}),rulesVersion:87}),twin=deserializeWorld(serializeWorld(w)),records:unknown[]=[];
 w.hooks={onActivityStart:(p,a)=>{if(p.id===person)records.push({event:'start',tick:w.tick,kind:a.kind,target:a.targetId,why:a.data.why,thirst:p.needs.thirst,belief:p.beliefs[a.targetId]?structuredClone(p.beliefs[a.targetId]):undefined});},onActivityEnd:(p,a,outcome,detail)=>{if(p.id===person)records.push({event:'end',tick:w.tick,kind:a.kind,target:a.targetId,body:a.data.waterBody,cycles:a.cycle,outcome,detail,thirst:p.needs.thirst});}};
 while(w.tick<800){stepWorld(w);stepWorld(twin);}delete w.hooks;if(serializeWorld(w)!==serializeWorld(twin)||!conservationReport(w).ok)throw new Error('Invalid ordinary story');
 stories.push({seed,person,name:w.persons.find(p=>p.id===person)?.name,settings:w.settings,records,conservation:conservationReport(w),continuationEqual:true});
}
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify({source,stories,limits:'Fixed previously retained ordinary success/interruption, reproduced without intervention. Neither source depletion nor aggregate benefit is demonstrated.'},null,2));console.log(JSON.stringify(stories));
