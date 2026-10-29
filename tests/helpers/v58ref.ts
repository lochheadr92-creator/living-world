// Recorded at 7b2a680 (rules 58, seed storage and craft capacity) before any rules-59 behaviour. Never update expected hashes for a successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {settingsForProfile} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {seedStorageScene} from './seed_storage';
import {selectPrerequisite} from './tool_prerequisite';
export function v58Continuation(){
 const w=createWorld({...settingsForProfile('normal','river',{dynamics:'rich',immigration:false}),rulesVersion:58});
 const digest=(world:typeof w)=>createHash('sha256').update(serializeWorld(world)).digest('hex');
 while(w.tick<5680)stepWorld(w);
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 while(w.tick<9600){stepWorld(w);stepWorld(copy);}
 // Also pin the rules-58 seed storage trip while travelling, beyond the ordinary reference's opportunities.
 const f=seedStorageScene(58);
 const {restore}=selectPrerequisite(f.w,f.p,`seed_stash:${f.home.id}`);
 try{
  for(let i=0;i<4;i++)stepWorld(f.w);
  const stashSaved=digest(f.w),stashCopy=deserializeWorld(serializeWorld(f.w));
  for(let i=0;i<1000;i++){stepWorld(f.w);stepWorld(stashCopy);}
  return {saved,uninterrupted:digest(w),continued:digest(copy),stashSaved,stashUninterrupted:digest(f.w),stashContinued:digest(stashCopy)};
 }finally{restore();}
}
