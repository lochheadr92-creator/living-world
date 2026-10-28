// STAGED supplies and positions. Choices, responses, transfers and crafting use the engine.
import { addPerson, building, done, pin, stage } from './kit';
import { CURRENT_RULES_VERSION } from '../../src/sim/rulesversion';
import { perceive } from '../../src/sim/perception';
import { observe } from '../../src/sim/knowledge';
import { makeSource } from '../../src/sim/sources';
import { reviewIntentions } from '../../src/sim/intent';
import { generateOptions } from '../../src/sim/decision';
import { relOf } from '../../src/sim/relations';
import { setExternalController } from '../../src/sim/external';
import { stepWorld } from '../../src/sim/world';

export function projectHelperScene(version = CURRENT_RULES_VERSION) {
  const s = stage('project-helper-choice');
  s.w.settings.dynamics = 'rich'; s.w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 30, inv: { wood: 2 }, hunger: 92, thirst: 100, energy: 92 });
  const ben = addPerson(s, 'Ben', 42.5, 40.5, { age: 30, inv: { stone: 3 }, traits: { generosity: 1 }, hunger: 100, thirst: 100, energy: 100 });
  const cora = addPerson(s, 'Cora', 42.5, 41.5, { age: 30, inv: { stone: 3, berries: 6 }, traits: { generosity: 1 }, hunger: 100, thirst: 100, energy: 100 });
  const outsider = addPerson(s, 'Dara', 70.5, 70.5, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  const home = building(s, 'lean_to', 39, 39, ada.hhId, { berries: 6 });
  s.w.households.find(h => h.id === ada.hhId)!.homeId = home.id;
  for (const p of [ada, ben, cora]) { p.needs.warmth = 100; p.needs.safety = 100; observe(s.w, p, home); }
  for (const [x, y] of [[44, 41], [45, 40], [43, 39]]) observe(s.w, ada, makeSource(s.w, 'tree', x, y, 9));
  // Distant known stone keeps the material plan viable without a quick self-supply trip.
  observe(s.w, ada, makeSource(s.w, 'rock', 60, 40, 12));
  ada.stats.gathered = 12; ada.skills.wood = 1.8;
  // Equal initial personal opinions: no helper has earned an advantage in the fixture.
  for (const q of [ben, cora]) { relOf(ada, q.id); relOf(q, ada.id); }
  pin(ben); pin(cora); pin(outsider);
  done(s); s.w.tick = 100;
  perceive(s.w, ada);
  reviewIntentions(generateOptions(s.w, ada, true));
  return { w: s.w, ada, ben, cora, outsider };
}

/** A staged hungry neighbour receives an OFFERED gift, through normal conversation.
 * Bystanders are pinned, as in other contract scenes. No outcome or trust is assigned. */
export function earnHelp(f: ReturnType<typeof projectHelperScene>): void {
  const { w, ada, cora } = f;
  ada.needs.hunger = 35;
  pin(ada); delete cora.cooldowns.pause;
  perceive(w, cora);
  let offered = false;
  const restore = setExternalController({
    controls: (_w, p) => p.id === cora.id,
    choose: (_w, _p, _ctx, ranked) => {
      const option = ranked.find(o => o.tag === 'offer' && o.targetId === ada.id);
      if (!option) throw new Error('The gift must be an offered ordinary action');
      offered = true;
      return { kind: 'pick', key: option.key };
    },
  });
  try {
    const deadline = w.tick + 500;
    while (w.tick < deadline) {
      stepWorld(w);
      if (cora.stats.given > 0 && !cora.convId && !cora.activity) break;
    }
    if (!offered || !cora.stats.given || cora.convId) throw new Error('Offered gift did not finish');
  } finally { restore(); }
  pin(cora); delete ada.cooldowns.pause;
  perceive(w, ada);
}
