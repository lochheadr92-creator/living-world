// STAGED simultaneous planks and cart demand, reusing the physical hammer/cart scene.
import {cartPrerequisiteScene} from './tool_prerequisite';
import {observe} from '../../src/sim/knowledge';
export function toolPrecedenceScene(version=64){
 const f=cartPrerequisiteScene(version);f.target.required.planks=8;observe(f.w,f.p,f.target);
 f.w.sceneLabel='STAGED simultaneous plank and cart demand; all selected steps use the legal engine offers';
 return f;
}
