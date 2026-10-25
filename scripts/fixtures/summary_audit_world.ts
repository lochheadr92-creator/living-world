import { craftAuditWorld } from './craft_audit_world';
import { testKit } from '../../src/sim/scenes';
import { RNG } from '../../src/sim/rng';
// Staged available neighbour. All player choices and exchanges use the ordinary seam.
export function summaryAuditWorld() {
  const w=craftAuditWorld(); w.settings.seed='staged-summary-audit';
  const p=w.persons[0];
  const q=testKit.addPerson(w,new RNG(9),{name:'Ben',x:40.5,y:41.5,hunger:95,thirst:95,energy:95,traits:{sociability:1}});
  q.nextThink=100000; p.needs.social=30; p.traits.sociability=1;
  testKit.befriend(p,q,60,60);
  return w;
}
