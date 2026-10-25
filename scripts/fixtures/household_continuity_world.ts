// STAGED contract scene, not autonomous emergence evidence. Initial goods are fixture
// resources; every later transfer and conversation uses the production simulation.
import { testKit } from '../../src/sim/scenes';
import { currentWorldSettings } from '../../src/sim/profiles';
import { RNG } from '../../src/sim/rng';
import { createBuilding, createSite } from '../../src/sim/buildings';
import { decide } from '../../src/sim/decision';
import { newActivity, startActivity } from '../../src/sim/activities';
import { updateEnvironment } from '../../src/sim/environment';
import { stepWorld } from '../../src/sim/world';
import { relOf } from '../../src/sim/relations';

export function householdContinuityWorld(tick = 1024) {
  const w = testKit.flatWorld(currentWorldSettings('normal', 'home-conversation', { immigration: false }));
  const rng = new RNG(31);
  const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 95, thirst: 95, energy: 95, inv: { wood: 4 } });
  const q = testKit.addPerson(w, rng, { name: 'Ben', x: 40.5, y: 41.5, hunger: 95, thirst: 95, energy: 95 });
  const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
  w.households.find(h => h.id === p.hhId)!.homeId = home.id;
  home.store.items.berries = 10;
  const site = createSite(w, 'hut', 44, 40, p.hhId, p.id);
  p.traits.sociability = 1;
  // Established friends in this labelled fixture; acceptance still uses the normal rule.
  relOf(p, q.id).affinity = 80;
  relOf(q, p.id).affinity = 80;
  testKit.finish(w, 'natural');
  w.tick = tick;
  updateEnvironment(w);
  p.cooldowns.trade = 1e12;
  decide(w, p, 'staged home delivery');
  const plan = p.intentions.find(i => i.kind === 'shelter')!;
  if (!plan || p.activity?.kind !== 'haul' || p.activity.data.forPlan !== plan.id) throw new Error('Fixture did not choose its home delivery');
  return { w, p, q, site, plan, deliveryId: p.activity.id };
}

export function converseDuringDelivery(s: ReturnType<typeof householdContinuityWorld>) {
  startActivity(s.w, s.q, newActivity(s.w, s.q, {
    kind: 'socialize', label: 'Chat with Ada', goal: 'a chat', targetId: s.p.id,
    targetType: 'person', here: true, data: { purpose: 'chat' },
  }));
  for (let n = 0; n < 10 && !s.p.convId; n++) stepWorld(s.w);
  if (!s.p.convId || s.p.suspended?.id !== s.deliveryId) throw new Error(`Fixture conversation did not suspend the delivery: ${JSON.stringify({conv: s.p.convId, activity: s.p.activity, result: s.q.lastResult})}`);
}
