import { planPackSummary } from '../src/ui/inhabit_summary';
import { expect, it } from 'vitest';
import { observeNow } from './helpers/inhabit';
import { adult } from './helpers/inhabit';
import { natural, run } from './helpers/util';
import type { Intention } from '../src/sim/types';

function toolIntent(w: { tick: number }, wants: Intention['wants']): Intention {
  return {
    id: 1, kind: 'tool', goal: 'make a pick', since: w.tick, until: w.tick + 10000, status: 'active',
    step: 'get wood', stepKind: 'get', stepItem: 'wood', stepTarget: 0, stepKey: null, aboutId: 0,
    wants, makes: 'pick', sheltered: 0, worked: 0, blocked: '', reason: '', setAside: 0, ended: 0,
  };
}

it('exposes the active plan and the carried/spoken-for/available split of the pack', () => {
  const w = natural('reserve');
  run(w, 60);
  const p = adult(w);
  p.intentions = [toolIntent(w, { wood: 2 })];
  p.commitments = [];
  p.inv = { wood: 2 };
  const obs = observeNow(w, p);
  expect(obs.version).toBe(17);
  expect(obs.plans).toHaveLength(1);
  expect(obs.plans![0].goal).toBe('make a pick');
  expect(obs.plans![0].wants).toEqual({ wood: 2 });
  expect(obs.self.spokenFor).toEqual({ wood: 2 });
  expect(obs.self.available ?? {}).toEqual({});
});

it('shows no plan when there is none, and no spoken-for split below version 7', () => {
  const w = natural('reserve');
  run(w, 60);
  const p = adult(w);
  p.intentions = [];
  p.commitments = [];
  p.inv = { wood: 3 };
  const obs = observeNow(w, p);
  expect(obs.plans).toEqual([]);
  expect(obs.self.spokenFor).toEqual({});
  expect(obs.self.available).toEqual({ wood: 3 });
  // an older shape (as a transcript recorded before the change would name it) has neither field
  const old = observeNow(w, p, false, 6);
  expect(old.plans).toBeUndefined();
  expect(old.self.spokenFor).toBeUndefined();
  expect(old.self.available).toBeUndefined();
});

it('separates carried reservation from unmet demand in the readable panel', () => {
  const w = natural('reserve'); run(w, 60); const p = adult(w);
  p.intentions = [toolIntent(w, { wood: 2, stone: 2 })]; p.commitments = [];
  p.inv = { wood: 2, berries: 2 };
  const text = planPackSummary(observeNow(w, p));
  expect(text).toContain('wood: 2 carried and reserved, 0 still missing');
  expect(text).toContain('stone: 0 carried and reserved, 2 still missing');
  expect(text).toContain('next: get wood');
  expect(text).toContain('Unreserved: 2 berries');
  expect(text).toContain('each offered action has its own limits');
});
it('does not present an old shortage as a current obstacle after stone is acquired', () => {
  const w = natural('obstacle'); run(w, 60); const p = adult(w);
  p.inv.stone = 3;
  p.commitments = [{ id: 987, requestId: 0, kind: 'deliver', to: w.persons[1].id, item: 'stone', amount: 2, siteId: 0, made: 1, deadline: 1000, status: 'active', blocked: 'no stone to be had', blockedAt: 20 }];
  const before = JSON.stringify(p.commitments);
  expect(observeNow(w, p).people.promises[0].detail).toMatch(/last reported obstacle .*no stone/);
  expect(observeNow(w, p, false, 9).people.promises[0].detail).toContain('held up: no stone');
  expect(JSON.stringify(p.commitments)).toBe(before);
});
