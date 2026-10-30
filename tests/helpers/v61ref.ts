// Captured before rules 62: ordinary state, required-tool interruption and the historical indoor-care failure.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { batchRecipeScene } from './batch_recipe';
import { indoorCareScene } from './indoor_care';
import { selectPrerequisite } from './tool_prerequisite';
import { breakTool, toolOf } from '../../src/sim/tools';
import { generateOptions } from '../../src/sim/decision';
import { startActivity } from '../../src/sim/activities';
import type { World } from '../../src/sim/types';
export function v61Continuation() {
  const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
  const w=createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:61});
  while(w.tick<5680)stepWorld(w);
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  while(w.tick<9600){stepWorld(w);stepWorld(copy);}
  const f=batchRecipeScene(61),selected=selectPrerequisite(f.w,f.p,`operate:${f.yard.id}:saw_planks`);
  let tool;
  try{
    for(let n=0;n<500&&selected.act.phase==='travel';n++)stepWorld(f.w);
    for(let n=0;n<4;n++)stepWorld(f.w);
    breakTool(f.w,toolOf(f.w,f.p,'saw')!,'reference mid-work loss');
    const toolSaved=digest(f.w),toolCopy=deserializeWorld(serializeWorld(f.w));
    for(let n=0;n<1200;n++){stepWorld(f.w);stepWorld(toolCopy);}
    tool={toolSaved,toolUninterrupted:digest(f.w),toolContinued:digest(toolCopy)};
  }finally{selected.restore();}
  const c=indoorCareScene(61),option=generateOptions(c.w,c.helper,true,true).options.find(o=>o.kind==='give'&&o.targetId===c.elder.id&&o.tag==='care')!;
  startActivity(c.w,c.helper,option.make!()!);
  const careSaved=digest(c.w),careCopy=deserializeWorld(serializeWorld(c.w));
  for(let n=0;n<400;n++){stepWorld(c.w);stepWorld(careCopy);}
  return {saved,uninterrupted:digest(w),continued:digest(copy),...tool,careSaved,careUninterrupted:digest(c.w),careContinued:digest(careCopy)};
}
