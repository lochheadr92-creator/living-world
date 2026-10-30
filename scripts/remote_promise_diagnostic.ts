// Explicit rules-79 reproduction: actual accepted watch, distant parent, physical work, no later conversation.
import {practicalCareScene} from '../tests/helpers/practical_care';
import {pin} from '../tests/helpers/kit';
import {generateOptions} from '../src/sim/decision';
import {startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
const f=practicalCareScene(79),r=f.ask();if(r?.status!=='promised')throw new Error('No accepted watch');pin(f.parent);f.helper.cooldowns.pause=0;
const watch=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`watch:${f.child.id}`)?.make?.();if(!watch)throw new Error('No offered watch');startActivity(f.w,f.helper,watch);
const snapshot=()=>({tick:f.w.tick,status:r.status,distance:Math.hypot(f.parent.x-f.helper.x,f.parent.y-f.helper.y),parentPose:f.parent.pose,parentActivity:f.parent.activity?.kind,relation:structuredClone(f.parent.relations[f.helper.id]),heard:structuredClone(f.parent.heard??[]),receipt:f.parent.socialMemory?.find(m=>m.requestId===r.id)});
let before=snapshot();for(let n=0;n<1200&&r.status==='promised';n++){before=snapshot();stepWorld(f.w);}
console.log(JSON.stringify({rules:79,staged:true,before,after:snapshot(),work:r.helperWork,watchProgress:watch.progress,conserved:conservationReport(f.w).ok},null,2));
