import { afterEach, expect, it } from 'vitest';
import { generateOptions, rankOptions, setOptionChooser } from '../src/sim/decision';
import { setMoodEffects } from '../src/sim/mood';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { setMoodSurvivalGuard } from '../src/sim/moodranking';
import { hashWorld } from '../src/sim/world';
import type { Option } from '../src/sim/optutil';

afterEach(() => { setMoodEffects(true); setMoodSurvivalGuard(true); setOptionChooser('utility'); });
const option = (kind: Option['kind'], need: Option['need'], util: number): Option => ({ kind, need, util, key: kind + ':test', label: kind, goal: kind, parts: [], eta: 0, targetId: 0, make: () => null });

it('does not let mood alone lift idle rest above already preferred warming', () => {
  const w = createWorld(currentWorldSettings('normal', 'mood-warm-regression'));
  const p = w.persons[0];
  p.mood = { level: -30, thoughts: [] };
  p.intentions = [];
  delete p.goal;
  const ctx = generateOptions(w, p, true);
  ctx.criticals = [];
  ctx.options = [option('warm', 'warmth', 30), option('rest', 'energy', 28)];
  setMoodEffects(false);
  expect(rankOptions(ctx)[0].kind).toBe('warm');
  setMoodEffects(true);
  expect(rankOptions(ctx)[0].kind).toBe('warm');
});

function context(version = 5) {
  const w = createWorld({ ...currentWorldSettings('normal', 'mood-warm-regression'), rulesVersion: version });
  const p = w.persons[0];
  p.mood = { level: -30, thoughts: [] }; p.intentions = []; delete p.goal;
  const ctx = generateOptions(w, p, true); ctx.criticals = [];
  return ctx;
}
it('preserves the historical reversal in version 4 and with the ablation', () => {
  for (const version of [1, 2, 3, 4, 5]) {
    const ctx = context(version);
    ctx.options = [option('warm', 'warmth', 30), option('rest', 'energy', 28)];
    setMoodSurvivalGuard(version !== 5);
    expect(rankOptions(ctx)[0].kind).toBe('rest');
  }
});
it('retains mood-driven ordinary choices and neutrally preferred rest', () => {
  const ctx = context();
  ctx.options = [option('craft', null, 30), option('rest', 'energy', 28)];
  expect(rankOptions(ctx)[0].kind).toBe('rest');
  ctx.options = [option('warm', 'warmth', 20), option('rest', 'energy', 28)];
  expect(rankOptions(ctx)[0].kind).toBe('rest');
});
it('protects food gathering and real shelter, and keeps every option without mutating the world', () => {
  const ctx = context();
  ctx.options = [option('gather', 'hunger', 30), option('rest', 'energy', 28), option('wander', null, 27)];
  const before = hashWorld(ctx.world);
  expect(rankOptions(ctx).map(o => o.kind)).toEqual(['gather', 'rest', 'wander']);
  expect(ctx.moodProtected?.has(ctx.options[0])).toBe(true);
  expect(hashWorld(ctx.world)).toBe(before);
  ctx.options = [option('rest', 'warmth', 30), option('wander', null, 27)];
  expect(rankOptions(ctx)[0].need).toBe('warmth');
});
it('includes non-mood nudges in the neutral ranking', () => {
  const ctx = context();
  ctx.p.goal = { kind: 'stocked', since: 0, progress: 0, done: 0 };
  ctx.options = [option('gather', 'hunger', 27), option('rest', 'energy', 28)];
  setMoodEffects(false); const neutral = rankOptions(ctx)[0];
  expect(neutral.kind).toBe('gather');
  setMoodEffects(true);
  expect(rankOptions(ctx)[0]).toBe(neutral);
});
it('does not change random-choice experiments and clears stale explanations', () => {
  const ctx = context();
  ctx.options = [option('warm', 'warmth', 30), option('rest', 'energy', 28)];
  rankOptions(ctx); expect(ctx.moodProtected?.size).toBe(1);
  setOptionChooser('random'); const on = rankOptions(ctx);
  expect(ctx.moodProtected).toBeUndefined();
  setMoodSurvivalGuard(false); expect(rankOptions(ctx)).toEqual(on);
});
