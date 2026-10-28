import { expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { putBelief } from '../src/sim/knowledge';
import { observeNow } from './helpers/inhabit';
import { natural, run } from './helpers/util';

// Observation 8 says the walk to a site to be laid out is not counted in its estimate. The scenario is made deterministic by
// giving the person every prerequisite for the offer (a lean-to home, no hunger, known trees and rock, no site yet), so the
// absence of a plan_site offer is a real failure rather than a silent pass.
it('the plan-site estimate says the walk there is not counted (observation 8), and version 7 keeps the bare estimate', () => {
  const w = natural('layout-eta');
  run(w, 1600);
  const p = w.persons.find((q) => q.alive && q.hhId !== 0 && q.children !== undefined);
  expect(p).toBeTruthy();
  p!.needs = { hunger: 100, thirst: 100, energy: 100, warmth: 100, safety: 100, social: 100 }; p!.inv.berries = 20;
  for (const s of w.sources) if (s.type === 'tree' || s.type === 'rock') putBelief(p!, { id: s.id, kind: s.type, x: s.x, y: s.y, amount: s.amount, max: s.max, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
  const ctx = generateOptions(w, p!, true, true);
  const plan = ctx.options.find((o) => o.kind === 'plan_site');
  expect(plan).toBeTruthy(); // the prerequisites must establish the offer
  const obs = observeNow(w, p!);
  const oplan = obs.options.find((o) => o.kind === 'plan_site')!;
  expect(oplan.eta).toContain('the walk there is not counted');
  const old = observeNow(w, p!, false, 7);
  const oold = old.options.find((o) => o.kind === 'plan_site')!;
  expect(oold.eta).not.toContain('the walk there is not counted');
});
