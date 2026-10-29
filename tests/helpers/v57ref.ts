// Recorded at d5eeadd before any rules-58 behavior. Never update expected hashes for a successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {settingsForProfile} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {cartPrerequisiteScene,finishPrerequisite,selectPrerequisite} from './tool_prerequisite';
export function v57Continuation(){
 const w=createWorld({...settingsForProfile('normal','river',{dynamics:'rich',immigration:false}),rulesVersion:57});
 const digest=(world:typeof w)=>createHash('sha256').update(serializeWorld(world)).digest('hex');
 while(w.tick<5680)stepWorld(w);
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 while(w.tick<9600){stepWorld(w);stepWorld(copy);}
 const f=cartPrerequisiteScene(57);
 finishPrerequisite(f.w,f.p,`gather:${f.tree.id}`);finishPrerequisite(f.w,f.p,`haul:${f.target.id}`);finishPrerequisite(f.w,f.p,`gather:${f.rock.id}`);
 const {restore}=selectPrerequisite(f.w,f.p,'craft:hammer');
 try{
  for(let i=0;i<8;i++)stepWorld(f.w);
  const craftSaved=digest(f.w),craftCopy=deserializeWorld(serializeWorld(f.w));
  for(let i=0;i<1000;i++){stepWorld(f.w);stepWorld(craftCopy);}
  return {saved,uninterrupted:digest(w),continued:digest(copy),craftSaved,craftUninterrupted:digest(f.w),craftContinued:digest(craftCopy)};
 }finally{restore();}
}
