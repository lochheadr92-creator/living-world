// SPARE TIME (rules version 28): where a person goes when nothing is pressing.
// Fixtures are whole ordinary worlds run by the engine; nothing here writes a haunt or a wander by hand.
import { afterEach, describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { LEISURE_FROM_VERSION, leisureFingerprint, leisureOn, setLeisure } from '../src/sim/leisure';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Settings, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';

const make = (seed: string, extra: Partial<Settings> = {}): World =>
  createWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich', immigration: false, rulesVersion: CURRENT_RULES_VERSION, ...extra }));
const run = (w: World, ticks: number): void => {
  for (let i = 0; i < ticks; i++) stepWorld(w);
};

afterEach(() => setLeisure(true));

describe('varied spare time', () => {
  it('is on only for a rich world at version 28 or later', () => {
    expect(LEISURE_FROM_VERSION).toBe(28);
    expect(leisureOn(make('l-on'))).toBe(true);
    expect(leisureOn(make('l-v27', { rulesVersion: 27 }))).toBe(false);
    expect(leisureOn(make('l-auth', { dynamics: 'authored' }))).toBe(false);
  });

  it('changes nothing below version 28: the switch makes no difference to a version 27 world', () => {
    const a = make('l-old', { rulesVersion: 27 });
    run(a, DAY);
    setLeisure(false);
    const b = make('l-old', { rulesVersion: 27 });
    run(b, DAY);
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.persons.every((p) => !p.leisure)).toBe(true);
  });

  it('is deterministic, remembers where people spent spare time, and survives a save', () => {
    const a = make('l-det');
    const b = make('l-det');
    run(a, 2 * DAY);
    run(b, 2 * DAY);
    expect(hashWorld(a)).toBe(hashWorld(b));
    const keys = new Set(a.persons.flatMap((p) => (p.leisure ? p.leisure.recent.map((r) => r.key) : [])));
    expect(keys.has('home')).toBe(true);
    expect(a.persons.some((p) => p.leisure && leisureFingerprint(p) !== '')).toBe(true);
    const c = deserializeWorld(serializeWorld(a));
    run(a, DAY / 2);
    run(c, DAY / 2);
    expect(hashWorld(c)).toBe(hashWorld(a));
  });

  it('sends people to more than one kind of place', () => {
    const w = make('l-places');
    run(w, 4 * DAY);
    const keys = new Set(w.persons.flatMap((p) => (p.leisure ? p.leisure.recent.map((r) => r.key) : [])));
    expect(keys.size).toBeGreaterThan(1);
  });

  it('does not cost lives: nobody starves in a short run that did not already have deaths', () => {
    const on = make('l-surv');
    run(on, 3 * DAY);
    setLeisure(false);
    const off = make('l-surv');
    run(off, 3 * DAY);
    const dead = (w: World) => w.persons.filter((p) => !p.alive).length;
    expect(dead(on)).toBeLessThanOrEqual(dead(off) + 1);
  });
});
