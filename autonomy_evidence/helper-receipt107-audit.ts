// Reproduce the ordinary forest save rejection; retain the first invalid state.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {validateHelperLearning} from '../src/sim/helper_learning';
import {conservationReport} from '../src/sim/economy';
const out='autonomy_evidence/helper-receipt107-first-invalid';if(existsSync(out))throw new Error('Fresh output required');
const w=createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:107}),began=performance.now();
for(let n=0;n<108000;n++){
 stepWorld(w);
 if(w.tick%120===0){try{validateHelperLearning(w);if(w.tick%2400===0)deserializeWorld(serializeWorld(w));}catch(e){
  mkdirSync(out,{recursive:true});writeFileSync(out+'/final.json',serializeWorld(w));
  const report={tick:w.tick,seconds:(performance.now()-began)/1000,error:String(e),requests:w.requests.filter(r=>r.helperReceipt),memories:w.persons.filter(p=>p.socialMemory?.some(m=>m.task?.receipt)).map(p=>({id:p.id,name:p.name,memories:p.socialMemory?.filter(m=>m.task?.receipt)})),conservation:conservationReport(w)};
  writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exitCode=1;break;
 }}
 if(performance.now()-began>1200000)throw new Error('Audit budget exceeded');
}
