import {finishWitnessedWatch} from '../tests/helpers/watch_learning';
import {conservationReport} from '../src/sim/economy';
const f=finishWitnessedWatch(78);
console.log(JSON.stringify({rules:78,staged:true,tick:f.w.tick,request:f.request,activity:{id:f.watch.id,progress:f.watch.progress,phase:f.watch.phase},parent:{id:f.parent.id,x:f.parent.x,y:f.parent.y,pose:f.parent.pose,receipt:f.parent.socialMemory?.find(m=>m.requestId===f.request.id)},helper:{id:f.helper.id,x:f.helper.x,y:f.helper.y,receipt:f.helper.socialMemory?.find(m=>m.requestId===f.request.id)},child:{id:f.child.id,x:f.child.x,y:f.child.y,inventory:f.child.inv},outsiderReceipt:f.other.socialMemory??[],conserved:conservationReport(f.w).ok},null,2));
