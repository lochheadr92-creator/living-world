import { afterEach, describe, expect, it } from 'vitest';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { setMoodEffects } from '../src/sim/mood';
import type { Option } from '../src/sim/optutil';
import { probe, probeReset, probeSnapshot } from '../src/sim/probe';
import { natural } from './helpers/util';

describe('mood and survival choice ranking', () => {
  afterEach(() => {
    setMoodEffects(true);
    probe.on = false;
    probeReset();
  });

  it('does not let low mood promote resting above an available warming action', () => {
    const w = natural('mood-survival-ranking', { dynamics: 'rich' });
    const p = w.persons.find((person) => person.alive)!;
    p.mood = { level: -30, thoughts: [] };
    const ctx = generateOptions(w, p, true);
    const option = (kind: Option['kind'], need: Option['need'], util: number, key: string): Option => ({
      kind,
      need,
      util,
      label: key,
      goal: key,
      parts: [],
      eta: 0,
      key,
      targetId: 0,
      make: () => null,
    });
    const warm = option('warm', 'warmth', 30, 'warm:test');
    const rest = option('rest', 'energy', 28, 'rest:test');
    ctx.options = [warm, rest];

    setMoodEffects(false);
    expect(rankOptions(ctx)[0].key, 'the unweighted ranking prefers warming').toBe(warm.key);
    setMoodEffects(true);
    probe.on = true;
    probeReset();
    expect(rankOptions(ctx, true)[0].key, 'mood must not demote warming below rest').toBe(warm.key);
    expect(probeSnapshot()).toMatchObject({ moodRankings: 1, moodFlips: 0 });
  });

  it('counts a real mood-driven top-choice change among ordinary options', () => {
    const w = natural('mood-choice-flip', { dynamics: 'rich' });
    const p = w.persons.find((person) => person.alive)!;
    p.mood = { level: -30, thoughts: [] };
    const ctx = generateOptions(w, p, true);
    const option = (kind: Option['kind'], util: number, key: string): Option => ({
      kind,
      need: null,
      util,
      label: key,
      goal: key,
      parts: [],
      eta: 0,
      key,
      targetId: 0,
      make: () => null,
    });
    const build = option('build', 30, 'build:test');
    const rest = option('rest', 28, 'rest:test');
    ctx.options = [build, rest];
    probe.on = true;
    probeReset();

    expect(rankOptions(ctx, true)[0].key).toBe(rest.key);
    expect(probeSnapshot()).toMatchObject({ moodRankings: 1, moodFlips: 1 });
  });
});
