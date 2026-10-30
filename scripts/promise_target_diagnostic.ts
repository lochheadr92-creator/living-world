// Rules-82 baseline: actual accepted roof request; declared remote collapse through the real building lifecycle.
import {stage,addPerson,building,done,pin} from '../tests/helpers/kit';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {relOf} from '../src/sim/relations';
import {stepWorld} from '../src/sim/world';
import {generateOptions} from '../src/sim/decision';
import {startActivity} from '../src/sim/activities';
import {checkCommitments} from '../src/sim/social';
import {destroyBuilding} from '../src/sim/buildings';
import {personalRequests} from '../src/sim/promise_expectations';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const s=stage('reported-roof'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=82;
const parent=addPerson(s,'Edda',40,40,{age:72,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ned',42,40,{age:34,inv:{wood:4,fruit:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),hut=building(s,'hut',60,40,parent.hhId);
w.households.find(h=>h.id===parent.hhId)!.homeId=hut.id;hut.condition=38;done(s);for(const p of [parent,helper]){observe(w,p,hut);perceive(w,p);}relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;pin(helper);
const ask=generateOptions(w,parent,true,true).options.find(o=>o.key.endsWith(':request:repair'));if(!ask)throw new Error('Missing actual repair request');startActivity(w,parent,ask.make!()!);for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='repair'&&r.status!=='pending')&&!parent.convId)break;}
const request=w.requests.find(r=>r.kind==='repair')!,c=helper.commitments.find(c=>c.requestId===request.id)!;if(request.status!=='promised'||!c)throw new Error('No accepted repair');pin(parent);
const snapshot=()=>({tick:w.tick,helper:{x:helper.x,y:helper.y,belief:structuredClone(helper.beliefs[hut.id]),commitment:structuredClone(c),request:personalRequests(w,helper).find(r=>r.id===request.id)},requester:personalRequests(w,parent).find(r=>r.id===request.id),operational:structuredClone(request)});
const before=snapshot();destroyBuilding(w,hut,'collapsed in a staged knowledge diagnostic');checkCommitments(w,helper);const after=snapshot(),raw=serializeWorld(w);
console.log(JSON.stringify({rules:82,staged:true,before,after,saveEqual:serializeWorld(deserializeWorld(raw))===raw,conserved:conservationReport(w).ok},null,2));
