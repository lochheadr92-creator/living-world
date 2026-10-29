import {cartPrerequisiteScene} from './tool_prerequisite';
import {ledgerCreate} from '../../src/sim/economy';
import {carryCap} from '../../src/sim/people';
import {weightOf} from '../../src/sim/economy';
export function seedStorageScene(version=58){
 const f=cartPrerequisiteScene(version);
 // Fill this feasible person's remaining pack with a harvest's seed surplus.
 const n=Math.floor((carryCap(f.w,f.p)-weightOf(f.p.inv))/0.25);
 f.p.inv.seeds=n;ledgerCreate(f.w,'seeds',n,'staged harvest surplus');
 f.w.sceneLabel='TEST SCENE: real material need, full pack of seed, known home storage';
 return f;
}
