import { expect, it } from 'vitest';
import { batchRecipeScene } from './helpers/batch_recipe';
import { selectPrerequisite } from './helpers/tool_prerequisite';
import { stepWorld } from '../src/sim/world';
import { describePerson } from '../src/sim/inspect';
import { serializeWorld, deserializeWorld } from '../src/app/save';

it('the person panel reports actual workshop progress, including after save, without changing state', () => {
  const f=batchRecipeScene(60);
  const {act,restore}=selectPrerequisite(f.w,f.p,`operate:${f.yard.id}:saw_planks`);
  try {
    for(let n=0;n<500&&act.phase==='travel';n++)stepWorld(f.w);
    for(let n=0;n<4;n++)stepWorld(f.w);
    const job=f.yard.ops!.job!;
    expect(job.progress).toBeGreaterThan(0);
    const before=serializeWorld(f.w),view=describePerson(f.w,f.p.id)!;
    expect(view.activity!.progress).toBe(job.progress/job.total);
    expect(serializeWorld(f.w)).toBe(before);
    const twin=deserializeWorld(before);
    expect(describePerson(twin,f.p.id)!.activity!.progress).toBe(view.activity!.progress);
  } finally { restore(); }
});
