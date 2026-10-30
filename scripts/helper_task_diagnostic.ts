// Rules-76 physical request -> voluntary promise -> withdrawal -> receipt -> useful crafting, then inspect retained task evidence.
import {materialPromiseScene,materialChoice} from '../tests/helpers/stored_materials';
import {runLive,runReplay} from '../src/agent/run';
import {stubModel} from '../src/agent/model';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=materialPromiseScene(76),start=serializeWorld(f.w);
const model=stubModel('helper-task-diagnostic',req=>{const o=observationFromPrompt(req.user)!;return JSON.stringify({choose:materialChoice(o,'promise').key,why:'Select only the offered request, wait for the voluntary promise, and use the delivered material.'});});
const result=await runLive(f.w,f.ada.id,model,{until:2000}),p=result.world.persons.find(p=>p.id===f.ada.id)!,helper=result.world.persons.find(p=>p.id===f.ben.id)!,r=result.world.requests.find(r=>r.from===p.id&&r.to===helper.id)!;
const report={rules:76,staged:true,request:{id:r.id,kind:r.kind,item:r.item,amount:r.amount,offered:r.offered,delivered:r.delivered,status:r.status,note:r.note},asker:p.id,helper:helper.id,receipt:p.socialMemory?.find(m=>m.requestId===r.id),helperReceipt:helper.socialMemory?.find(m=>m.requestId===r.id),outsiderReceipt:result.world.persons.find(p=>p.id===f.outsider.id)!.socialMemory??[],pick:p.inv.pick,conserved:conservationReport(result.world).ok,replayEqual:serializeWorld(runReplay(deserializeWorld(start),result.transcript).world)===serializeWorld(result.world),interpretation:'The actual request retains a typed task, item and delivered amount, but its durable receipt has only generic outcome/reason/person/site/role. After operational expiry, there is no structured task-specific ability evidence in that receipt. This does not establish suitable selection weights or justify interpreting inability as bad faith.'};
if(r.status!=='fulfilled'||r.delivered!==2||p.inv.pick!==1||!report.conserved||!report.replayEqual)throw new Error('Invalid helper-task diagnostic');console.log(JSON.stringify(report,null,2));
