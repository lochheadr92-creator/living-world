// Staged household, injury and food; real admission, perception, departure and offered care.
import {indoorCareScene} from '../tests/helpers/indoor_care';
import {leaveHome,canEnterHome} from '../src/sim/habitation';
import {generateOptions} from '../src/sim/decision';
import {startActivity} from '../src/sim/activities';
import {perceive} from '../src/sim/perception';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=indoorCareScene(65),{w,helper,elder,home}=f;
const sameRoom={seen:helper.seen.some(s=>s.id===elder.id),remembered:helper.whereabouts[elder.id]?{...helper.whereabouts[elder.id]}:null};
if(leaveHome(w,helper))throw new Error('Staged departure must be lawful');
perceive(w,helper);
const before=serializeWorld(w),ctx=generateOptions(w,helper,true,true),option=ctx.options.find(o=>o.key===`give:${elder.id}`);
const pure=serializeWorld(w)===before;
if(!option?.make)throw new Error('Expected the existing care option');
const admission=canEnterHome(w,helper,home),act=option.make();if(!act)throw new Error('Care builder failed');
helper.cooldowns.pause=0;startActivity(w,helper,act);stepWorld(w);
console.log(JSON.stringify({rules:w.settings.rulesVersion,sameRoom,afterDeparture:{seen:helper.seen.some(s=>s.id===elder.id),admission},option:{key:option.key,goal:option.goal},result:helper.lastResult,helperInside:helper.indoors??0,elderInside:elder.indoors??0,helperBread:helper.inv.bread,elderBread:elder.inv.bread??0,pure,conservation:conservationReport(w)},null,2));
