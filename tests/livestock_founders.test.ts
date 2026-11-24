import { expect, it } from 'vitest';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { seedSheep } from '../src/sim/livestock';
import { currentWorldSettings } from '../src/sim/profiles';
import { makeSource } from '../src/sim/sources';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, stage } from './helpers/kit';

it.each([
  { rulesVersion: 268, x: 46.5, drank: false },
  { rulesVersion: 269, x: 47.5, drank: true },
])('Forest founding sheep at rules $rulesVersion', ({ rulesVersion, x, drank }) => {
  const w = createWorld({ ...currentWorldSettings('normal', 'forest', { immigration: false }), rulesVersion });
  const sheep = w.animals.filter(a => a.type === 'sheep');
  expect(sheep.map(a => [a.x, a.y])).toEqual([[x, 51.5], [x, 51.5]]);
  const drinkers = new Set<number>();
  while (w.tick < 400) {
    stepWorld(w);
    for (const a of sheep) if (a.sheep!.water > 0) drinkers.add(a.id);
  }
  expect(drinkers.size).toBe(drank ? 2 : 0);
  expect(conservationReport(w).ok).toBe(true);
});

it('skips a founder tile separated from the lake until a route opens', () => {
  const s = stage('founder-water-barrier');
  const w = s.w;
  w.settings = { ...w.settings, dynamics: 'rich', rulesVersion: 269 };
  addPerson(s, 'Ada', 40.5, 19.5);
  makeSource(w, 'wild_grain', 39, 19, 5);
  done(s);

  const candidate = new Uint8Array(w.W * w.H);
  candidate[19 * w.W + 40] = 1;
  w.solid.fill(1, 16 * w.W, 17 * w.W);
  seedSheep(w, candidate);
  expect(w.animals.filter(a => a.sheep)).toHaveLength(0);

  w.solid[16 * w.W + 40] = 0;
  seedSheep(w, candidate);
  expect(w.animals.filter(a => a.type === 'sheep').map(a => [a.x, a.y]))
    .toEqual([[40.5, 19.5], [40.5, 19.5]]);
});
