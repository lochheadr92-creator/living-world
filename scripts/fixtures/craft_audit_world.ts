import { testKit } from '../../src/sim/scenes';
import { currentWorldSettings } from '../../src/sim/profiles';
import { RNG } from '../../src/sim/rng';
import { createBuilding } from '../../src/sim/buildings';
import { makeSource } from '../../src/sim/sources';
import { observe } from '../../src/sim/knowledge';
import { updateEnvironment } from '../../src/sim/environment';
// Labelled initial conditions only: no resource grants during the manual session.
export function craftAuditWorld() {
  const w = testKit.flatWorld(currentWorldSettings('normal', 'staged-craft-audit', {immigration:false}));
  const p = testKit.addPerson(w, new RNG(7), {name:'Ada', x:40.5, y:40.5, hunger:48, thirst:95, energy:95});
  p.inv = {wood:2, stone:2, berries:2};
  p.skills.stone = 2; p.stats.gathered = 0;
  const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
  w.households.find(h => h.id === p.hhId)!.homeId = home.id;
  const sources = [makeSource(w, 'tree', 44, 40, 9), makeSource(w, 'tree', 45, 40, 9), makeSource(w, 'tree', 46, 40, 9), makeSource(w, 'rock', 38, 40, 9)];
  testKit.finish(w, 'natural'); w.tick = 300; updateEnvironment(w);
  for (const b of [home, ...sources]) observe(w, p, b);
  return w;
}
