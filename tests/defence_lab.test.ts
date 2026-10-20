import { expect, it } from 'vitest';
import { parseIntervention, runBranch } from '../scripts/lab/lab';
import { serializeWorld } from '../src/app/save';
import { testKit } from '../src/sim/scenes';
import { RNG } from '../src/sim/rng';
import { currentWorldSettings } from '../src/sim/profiles';
import { makeWolf } from '../src/sim/wildlife';
import { stepWorld } from '../src/sim/world';
import { defProbe } from '../src/sim/defence';
import { DAY } from '../src/sim/constants';

function scene() {
  const w = testKit.flatWorld(currentWorldSettings('normal', 'bite-counter', { immigration: false }));
  const p = testKit.addPerson(w, new RNG(71), { name: 'Ada', x: 40.5, y: 40.5, age: 25 });
  testKit.finish(w, 'natural'); w.tick = 1000;
  return { w, p };
}
it('counts no bites for untouched people or hurt cooldowns predating the fork, and restores probe ownership', () => {
  const { w, p } = scene();
  p.cooldowns.hurt = 500;
  const before = { ...defProbe };
  const r = runBranch(serializeWorld(w), parseIntervention('control'), 0.01, 1);
  expect(r.outcome.bitesTaken).toBe(0);
  expect(defProbe).toEqual(before);
});
it('observes a fatal bite before the victim leaves the live registry and reports it in the lab', () => {
  const { w, p } = scene();
  p.health = 1;
  // Below the existing passive-healing threshold, so a zero-health victim is removed this tick.
  p.needs.hunger = 35;
  const wolf = makeWolf(w, 40.8, 40.5);
  wolf.state = 'stalk'; wolf.targetId = p.id; wolf.until = 9999;
  const saved = serializeWorld(w);
  let bites = 0; w.hooks = { onWolfBite: () => bites++ };
  stepWorld(w);
  expect(bites).toBe(1);
  expect(w.persons.some(q => q.id === p.id)).toBe(false);
  const r = runBranch(saved, parseIntervention('control'), 1 / DAY, 1);
  expect(r.outcome.bitesTaken).toBe(1);
});
