import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { makeCtx } from '../src/sim/optutil';
import { reviewIntentions, setReconsider } from '../src/sim/intent';
import { putBelief } from '../src/sim/knowledge';
import { createRequest } from '../src/sim/social';
import type { Intention } from '../src/sim/types';

function toolIntent(w: { tick: number }): Intention {
  return { id: 1, kind: 'tool', goal: 'make a pick', since: w.tick, until: w.tick + 100000, status: 'active', step: 'get 2 wood', stepKind: 'get', stepItem: 'wood', stepTarget: 0, stepKey: null, aboutId: 0, wants: { wood: 2 }, makes: 'pick', sheltered: 0, worked: 0, blocked: '', reason: '', setAside: 0, ended: 0 };
}

function make(seed = 'reconsider') {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const p = w.persons[0];
  p.needs = { hunger: 100, thirst: 100, energy: 100, warmth: 100, safety: 100, social: 100 };
  p.intentions = [toolIntent(w)];
  p.inv = {};
  for (const k of Object.keys(p.beliefs)) if (p.beliefs[Number(k)].kind === 'tree') delete p.beliefs[Number(k)];
  if (p.bykind.tree) p.bykind.tree = [];
  return { w, p };
}

it('relinquishes a material-fetch plan with no known source and no promise (rules 34)', () => {
  const { w, p } = make();
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('dropped');
  expect(p.intentions[0].reason).toContain('no known source of wood');
  expect(p.intentions[0].wants).toEqual({});
});

it('retains the plan when a source of the material is known', () => {
  const { w, p } = make();
  const tree = w.sources.find((s) => s.type === 'tree');
  expect(tree).toBeTruthy();
  putBelief(p, { id: tree!.id, kind: 'tree', x: tree!.x, y: tree!.y, amount: 3, max: tree!.max, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('active');
});

it('retains the plan when the material is owed by a live promise', () => {
  const { w, p } = make();
  const other = w.persons[1];
  createRequest(w, p, other, { kind: 'wood', item: 'wood', amount: 2, planId: p.intentions[0].id });
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('active');
});

it('retains the plan below rules 34, and with the off-switch', () => {
  const w = createWorld({ ...currentWorldSettings('normal', 'river', { immigration: false }), rulesVersion: 33 });
  const p = w.persons[0];
  p.needs = { hunger: 100, thirst: 100, energy: 100, warmth: 100, safety: 100, social: 100 };
  p.intentions = [toolIntent(w)];
  p.inv = {};
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('active');
  const { w: w2, p: p2 } = make();
  setReconsider(false);
  try { reviewIntentions(makeCtx(w2, p2, true, true)); } finally { setReconsider(true); }
  expect(p2.intentions[0].status).toBe('active');
});
