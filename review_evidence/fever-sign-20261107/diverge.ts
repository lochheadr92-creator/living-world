// Runs one ordinary Normal world at two rules versions side by side and reports the first tick (checked every STEP ticks) at which the serialized
// states differ once the rules number is masked, and what a person in the first differing record was doing. Read-only.
//   vite-node review_evidence/fever-sign-20261107/diverge.ts -- <seed> <before> <after> [days]
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
import {DAY} from '../../src/sim/constants';
const args=process.argv.slice(2).filter(a=>a!=='--');
const [seed='gen-6',before='164',after='165',days='25']=args;
const mk=(r:string)=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:Number(r)});
const a=mk(before),b=mk(after);
const mask=(s:string)=>s.replace(/"rulesVersion":\d+/g,'"rulesVersion":0');
const STEP=60;
let first=-1;
while(a.tick<Number(days)*DAY){
 stepWorld(a);stepWorld(b);
 if(a.tick%STEP===0&&mask(serializeWorld(a))!==mask(serializeWorld(b))){first=a.tick;break;}
}
const ill=(w:typeof a)=>w.persons.filter(p=>p.alive&&p.illness).map(p=>`${p.name}:${p.illness!.severity}`);
console.log(JSON.stringify({seed,before:Number(before),after:Number(after),firstDifferentAtTick:first,day:first<0?null:Number((first/DAY).toFixed(2)),illBefore:ill(a),illAfter:ill(b)}));
