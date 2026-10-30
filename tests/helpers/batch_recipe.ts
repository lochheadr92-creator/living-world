// STAGED inputs and equipment; all subsequent transformations and transfers use ordinary actions.
import { cartPrerequisiteScene } from './tool_prerequisite';
import { give, pin } from './kit';
import { consume, produce, ledgerCreate } from '../../src/sim/economy';
import { observe } from '../../src/sim/knowledge';
import { generateOptions } from '../../src/sim/decision';
import { reviewIntentions } from '../../src/sim/intent';
import { wantedTool } from '../../src/sim/options_work';
export function batchRecipeScene(version: number, saw = true) {
  const f = cartPrerequisiteScene(version);
  for (const tool of ['hammer', ...(saw ? ['saw'] as const : [])] as const) { give(f.w,f.p,tool);ledgerCreate(f.w,tool,1,'staged equipment'); }
  // Other hand-tool wants are already met in this narrow cart fixture.
  for (let n=0;n<8;n++) { const tool=wantedTool(generateOptions(f.w,f.p,true,true));if(!tool)break;give(f.w,f.p,tool);ledgerCreate(f.w,tool,1,'staged equipment'); }
  consume(f.w,f.yard.store.items,'planks',4,'staged absence of components');
  produce(f.w,f.yard.store.items,f.yard.store.cap,'wood',6,'staged raw inputs');
  observe(f.w,f.p,f.yard);pin(f.p);
  reviewIntentions(generateOptions(f.w,f.p,true));
  f.w.sceneLabel='STAGED: saw, raw timber, handles and load supplied; offered actions saw planks, assemble cart and deliver real stone';
  return f;
}
