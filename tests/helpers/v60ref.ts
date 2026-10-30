// Capture before rules 61. Includes the legacy required-tool-loss defect as recorded semantics.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { batchRecipeScene } from './batch_recipe';
import { selectPrerequisite } from './tool_prerequisite';
import { breakTool, toolOf } from '../../src/sim/tools';
import type { World } from '../../src/sim/types';
export function v60Continuation() {
  const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
  const w=createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:60});
  while(w.tick<5680)stepWorld(w);
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  while(w.tick<9600){stepWorld(w);stepWorld(copy);}
  const f=batchRecipeScene(60),selected=selectPrerequisite(f.w,f.p,`operate:${f.yard.id}:saw_planks`);
  try {
    for(let n=0;n<500&&selected.act.phase==='travel';n++)stepWorld(f.w);
    for(let n=0;n<4;n++)stepWorld(f.w);
    breakTool(f.w,toolOf(f.w,f.p,'saw')!,'reference mid-work loss');
    const toolSaved=digest(f.w),toolCopy=deserializeWorld(serializeWorld(f.w));
    for(let n=0;n<1200;n++){stepWorld(f.w);stepWorld(toolCopy);}
    return {saved,uninterrupted:digest(w),continued:digest(copy),toolSaved,toolUninterrupted:digest(f.w),toolContinued:digest(toolCopy)};
  } finally {selected.restore();}
}
