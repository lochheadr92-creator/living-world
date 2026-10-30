// Explicit rules-81 baseline: actual accepted watch and failed journey, then staged remote death through the real lifecycle.
import {failedPromiseScene} from '../tests/helpers/promise_outcomes';
import {killPerson} from '../src/sim/lifecycle';
import {knowsDeath} from '../src/sim/death_knowledge';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
const f=failedPromiseScene(81),before={tick:f.w.tick,commitment:structuredClone(f.commitment),request:f.request.status,knowsDeath:knowsDeath(f.helper,f.parent.id),relation:structuredClone(f.helper.relations[f.parent.id]),distance:Math.hypot(f.helper.x-f.parent.x,f.helper.y-f.parent.y)};
killPerson(f.w,f.parent,'staged death for knowledge-boundary diagnostic');
const after={tick:f.w.tick,commitment:structuredClone(f.commitment),request:f.request.status,requestReason:f.request.note,knowsDeath:knowsDeath(f.helper,f.parent.id),relation:structuredClone(f.helper.relations[f.parent.id]),helperMemory:f.helper.socialMemory??[]};
const raw=serializeWorld(f.w);console.log(JSON.stringify({rules:81,staged:true,before,after,saveEqual:serializeWorld(deserializeWorld(raw))===raw,conserved:conservationReport(f.w).ok},null,2));
