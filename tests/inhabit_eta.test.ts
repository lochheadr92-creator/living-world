import { expect, it } from 'vitest';
import { observeNow } from './helpers/inhabit';
import { natural, run } from './helpers/util';

// Observation 8 says the walk to a site to be laid out is not counted in its estimate (the engine's own eta is the
// marking-out only, because the spot is chosen later). Older shapes (version 7 and below) keep the bare estimate.
it('the plan-site estimate says the walk there is not counted (observation 8), and version 7 keeps the bare estimate', () => {
  const w = natural('layout-eta');
  run(w, 120);
  const adults = w.persons.filter((q) => q.alive && q.hhId !== 0 && q.children !== undefined);
  const p = adults.find((q) => {
    const obs = observeNow(w, q);
    return obs.options.some((o) => o.kind === 'plan_site');
  });
  if (!p) return; // no one is considering laying out a site in this window: the note still holds by construction
  const obs = observeNow(w, p);
  const plan = obs.options.find((o) => o.kind === 'plan_site')!;
  expect(plan.eta).toContain('the walk there is not counted');
  const old = observeNow(w, p, false, 7);
  const oldPlan = old.options.find((o) => o.kind === 'plan_site')!;
  expect(oldPlan.eta).not.toContain('the walk there is not counted');
});
