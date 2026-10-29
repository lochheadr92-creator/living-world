import { techniqueFixture } from './technique';
import { generateOptions, rankOptions } from '../../src/sim/decision';
import { startActivity } from '../../src/sim/activities';
import { stepWorld } from '../../src/sim/world';

/** STAGED family, stocked kiln, nearby teacher and explicit initial proficiency.
 * The learner has no technique; all instruction and production must execute. */
export function learnerScene(version = 41) {
  const f = techniqueFixture('learner-instruction');
  f.w.settings.rulesVersion = version;
  f.w.sceneLabel = 'STAGED: learner requests instruction for charcoal work';
  f.b.cooldowns.pause = 0;
  const request = () => rankOptions(generateOptions(f.w, f.b, true, true)).find(o => o.key === `socialize:${f.a.id}:learn_technique`);
  const reach = () => {
    const o = request(); if (!o?.make) throw new Error('No offered learner request');
    const a = o.make(); if (!a) throw new Error('Request failed validation');
    startActivity(f.w, f.b, a);
    for (let i = 0; i < 300 && !f.w.conversations.some(c => c.lesson); i++) stepWorld(f.w);
    return f.w.conversations.find(c => c.lesson);
  };
  return { ...f, request, reach };
}
