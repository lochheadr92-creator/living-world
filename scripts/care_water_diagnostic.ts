// Rules-66 staged diagnosis, not an ordinary-world or proposed-repair success.
import {writeFileSync,existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {indoorCareScene} from '../tests/helpers/indoor_care';
import {selectPrerequisite} from '../tests/helpers/tool_prerequisite';
import {generateOptions} from '../src/sim/decision';
import {perceive} from '../src/sim/perception';
import {leaveHome} from '../src/sim/habitation';
import {produce,conservationReport} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {serializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
const [out]=process.argv.slice(2).filter(a=>a!=='--');
if(out&&existsSync(out))throw new Error('Do not overwrite an existing diagnosis');
const {w,helper,elder,home}=indoorCareScene(66);
elder.needs.hunger=90;elder.needs.thirst=20;
produce(w,helper.inv,carryCap(w,helper),'water',2,'staged spare water');
produce(w,elder.inv,carryCap(w,elder),'grain',100,'staged full recipient pack');
perceive(w,helper);if(leaveHome(w,helper))throw new Error('Invalid fixture departure');perceive(w,helper);
const beforeWater=helper.inv.water,chosen=selectPrerequisite(w,helper,`give:${elder.id}:home`);
try{for(let n=0;n<200&&helper.activity?.id===chosen.act.id;n++)stepWorld(w);}finally{chosen.restore();}
const failed={tick:w.tick,result:helper.lastResult,waterBefore:beforeWater,waterAfter:helper.inv.water,recipientWater:elder.inv.water??0,recipientThirst:elder.needs.thirst,fedUntil:elder.cooldowns.fedUntil??0,rememberedFailure:helper.failures[elder.id]??null};
// A separate controlled availability probe: put actual accounted water in the owned store and observe it.
produce(w,home.store.items,home.store.cap,'water',2,'staged available home water');perceive(w,elder);
const before=serializeWorld(w),ctx=generateOptions(w,elder,true,true);
const report={rules:66,fixture:'STAGED injury, full pack and need; actual offered return and water hand-over; then staged accounted home water as a separate availability probe',failed,knownStoredWater:elder.beliefs[home.id]?.items?.water,waterOptions:ctx.options.filter(o=>o.kind==='drink'||o.kind==='fetch_water'||/water/i.test(o.label)).map(o=>({key:o.key,label:o.label})),pure:serializeWorld(w)===before,conservation:conservationReport(w),limit:'No claim that every household lacks an alternative: this fixture has no known shore. No water-capacity bypass or new drinking primitive is implemented.'};
const files=['src/sim/options_survival.ts','src/sim/act_resource.ts','src/sim/resident_care.ts','src/sim/resident_contact.ts','src/sim/care_capacity.ts','src/sim/perception.ts','src/sim/activities.ts','src/sim/social.ts','scripts/care_water_diagnostic.ts'];
Object.assign(report,{head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))});
if(out)writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
