import {writeFileSync} from 'node:fs';
import {createWorld} from '../../../living-world-longruns-20261031-212947-395/source/src/sim/factory';
import {currentWorldSettings} from '../../../living-world-longruns-20261031-212947-395/source/src/sim/profiles';
import {stepWorld} from '../../../living-world-longruns-20261031-212947-395/source/src/sim/world';
import {validateHelperLearning} from '../../../living-world-longruns-20261031-212947-395/source/src/sim/helper_learning';
import {serializeWorld} from '../../../living-world-longruns-20261031-212947-395/source/src/app/save';
const out='verification_evidence/forest-save-20261031/';
const w=createWorld(currentWorldSettings('normal','forest',{immigration:false}));
const started=performance.now();
let before=serializeWorld(w);
while(w.tick<108000){
 if(w.tick%2400===0)before=serializeWorld(w);
 stepWorld(w);
 try{validateHelperLearning(w);}catch(error){
  writeFileSync(out+'before.json',before);writeFileSync(out+'rejected.json',serializeWorld(w));
  console.log(JSON.stringify({tick:w.tick,seconds:(performance.now()-started)/1000,error:String(error),receipts:w.requests.filter(r=>r.helperReceipt).map(r=>({id:r.id,from:r.from,to:r.to,delivered:r.delivered,receipt:r.helperReceipt}))}));
  process.exit(1);
 }
 if(w.tick%2400===0)console.log(JSON.stringify({day:w.tick/2400,seconds:(performance.now()-started)/1000}));
}
