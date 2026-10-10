// The `plant_tree` activity: a person sets a young tree on open ground near a forester's lodge (see forestry.ts).
import { faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { addFx, addLog } from './events';
import { FOREST_REACH, FOREST_MAX_SAPLINGS, PLANT_WORK, roomForTrees, saplingsAround, seedTreeNear } from './forestry';
import { delBelief, noteFailure, observe } from './knowledge';
import { isFreeLand } from './registry';
import { makeSource } from './sources';
import { hyp } from './util';
import type { Building, World } from './types';

function lodgeOf(world: World, id: number): Building | null {
  const e = world.byId.get(id);
  return e && e.ent === 'building' && e.type === 'forester' ? e : null;
}

registerHandler('plant_tree', {
  availability: 0.3,
  pose: () => 'plant',
  begin(world, p, a) {
    const b = lodgeOf(world, a.targetId);
    if (!b) {
      delBelief(p, a.targetId);
      return 'the lodge is gone';
    }
    observe(world, p, b);
    const no = (why: string): string => {
      noteFailure(world, p, b.id, why);
      return why;
    };
    if (b.condition < 12) return no('the lodge has fallen into disrepair');
    if (saplingsAround(world, b) >= FOREST_MAX_SAPLINGS) return no('the lodge already has all the young trees it can look after');
    if (!roomForTrees(world)) return no('the wood is as thick as it should be');
    if (!seedTreeNear(world, b)) return no('no grown tree near the lodge to raise a young one from');
    const x = Math.floor(a.tx);
    const y = Math.floor(a.ty);
    if (!isFreeLand(world, x, y)) return no('the ground there is taken');
    if (hyp(x + 0.5 - (b.x + b.w / 2), y + 0.5 - (b.y + b.h / 2)) > FOREST_REACH + 1) return no('that spot is too far from the lodge');
    if (hyp(x + 0.5 - p.x, y + 0.5 - p.y) > 2.5) return no('not at the planting spot');
    a.data.px = x;
    a.data.py = y;
    a.tx = x + 0.5;
    a.ty = y + 0.5;
    a.duration = Math.round(PLANT_WORK / p.skills.wood);
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress % 20 === 10) addFx(world, 'dust', a.tx, a.ty, 0);
    if (a.progress < a.duration) return 'continue';
    const x = a.data.px as number;
    const y = a.data.py as number;
    if (!isFreeLand(world, x, y)) return 'fail:something is in the way of the planting';
    makeSource(world, 'tree', x, y, 0, 0.02);
    p.skills.wood = Math.min(1.8, p.skills.wood + 0.01);
    return 'done';
  },
  onEnd(world, p, a, outcome) {
    if (outcome !== 'success') return;
    addLog(world, p, 'work', 'Planted a young tree near the forester\'s lodge.');
  },
});
