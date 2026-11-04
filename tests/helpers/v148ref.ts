import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {projectInputsScene} from './project_inputs';
import type {Intention} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v148Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:148});
 for(let i=0;i<6000;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}
 const continued=serializeWorld(w);
 if(continued!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules148 ordinary continuation or conservation failed');
 const f=projectInputsScene(148),p=f.p;
 const younger:Intention={...f.plan,id:f.w.nextId++,kind:'tool',goal:'make a basket',makes:'basket',wants:{wood:3},project:undefined};
 p.intentions.push(younger);
 const option=generateOptions(f.w,p,true,true).options.find(o=>o.key==='craft:hammer');
 if(!option?.make)throw Error('Older project cannot craft');startActivity(f.w,p,option.make()!);
 for(let i=0;i<150&&!(p.activity?.kind==='craft'&&p.activity.progress>0);i++)stepWorld(f.w);
 if(p.activity?.kind!=='craft'||p.activity.progress<=0)throw Error('No mid-work checkpoint');
 const staged=serializeWorld(f.w),twin=deserializeWorld(staged);
 for(let i=0;i<300&&!(p.inv.hammer??0);i++){stepWorld(f.w);stepWorld(twin);}
 if(p.inv.hammer!==1||f.w.ledger.reasons['-crafting: hammer']!==3||!conservationReport(f.w).ok||serializeWorld(f.w)!==serializeWorld(twin))throw Error('Paid sibling-plan craft continuation failed');
 return {saved:digest(raw),continued:digest(continued),staged:digest(staged),stagedContinued:digest(serializeWorld(f.w))};
}
