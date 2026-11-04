// STAGED one-adult household with a collapsed home, known raw materials and finite supplies.
import {stage,addPerson,building,done} from '../tests/helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {destroyBuilding} from '../src/sim/buildings';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
const s=stage('observed-home-collapse'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=107;
const p=addPerson(s,'Ada',40,40,{age:35,hunger:95,thirst:95,energy:95,inv:{bread:3,water:3},traits:{diligence:0.8}});
const home=building(s,'hut',42,40,p.hhId,{grain:8});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
const resources=[makeSource(w,'tree',36,40,20),makeSource(w,'tree',39,46,20),makeSource(w,'tree',46,36,20),makeSource(w,'rock',38,44,20),makeSource(w,'berry',35,44,12)];
done(s);observe(w,p,home);for(const t of resources)observe(w,p,t);
destroyBuilding(w,home,'collapsed in sight');perceive(w,p);const twin=deserializeWorld(serializeWorld(w));
const events:unknown[]=[],samples:unknown[]=[];
w.hooks={onActivityEnd:(who,a,outcome,reason)=>{if(who.id===p.id&&events.length<80)events.push({tick:w.tick,kind:a.kind,goal:a.goal,outcome,reason});}};
for(let n=0;n<12000;n++){if(w.tick%1200===0){const ctx=generateOptions(w,p,true,true);samples.push({tick:w.tick,first:rankOptions(ctx).slice(0,3).map(o=>({key:o.key,util:o.util})),plans:p.intentions.map(i=>({kind:i.kind,status:i.status,reason:i.reason})),home:w.households.find(h=>h.id===p.hhId)?.homeId});}stepWorld(w);stepWorld(twin);}
delete w.hooks;console.log(JSON.stringify({staged:true,tick:w.tick,alive:p.alive,events,samples,buildings:w.buildings.map(b=>({id:b.id,type:b.type,condition:b.condition,hh:b.hhId})),consumed:w.ledger.consumed,conserved:conservationReport(w).ok,twin:serializeWorld(w)===serializeWorld(twin)},null,2));
