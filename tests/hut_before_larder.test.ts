// Rules 193: a hut is not held back by the larder (src/sim/hut_before_larder.ts; the hut gate in optPlanBuild, options_work.ts). Every
// situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the ordinary-world origin is
// docs/REPAIRS_20261111.md (the store empty at 169 of 174 deaths, 107 of 201 deaths in lean-to households). Each check has the
// rules-192 contrast so the older food-first gate is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { LARDER_PER_MEMBER, larderHoldsHut, setHutBeforeLarder } from '../src/sim/hut_before_larder';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import { addPerson, building, done, learn, stage } from './helpers/kit';
import type { Items, Person, World } from '../src/sim/types';

afterEach(() => setHutBeforeLarder(true));

/** Ada and Ben, one household in a lean-to with the given store, who know three trees and a rock; the settlement is old enough. */
function scene(version: number, store: Items = {}, opts: { hunger?: number; dynamics?: 'rich' | 'authored'; carried?: Items } = {}) {
  const s = stage(`hut-before-larder-${version}-${Object.keys(store).join(',') || 'empty'}-${opts.hunger ?? 95}-${opts.dynamics ?? 'rich'}`);
  s.w.settings = { ...s.w.settings, dynamics: opts.dynamics ?? 'rich', rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 26.5, { age: 30, hunger: opts.hunger ?? 95, thirst: 95, energy: 95, inv: opts.carried });
  const ben = addPerson(s, 'Ben', 41.5, 26.5, { age: 30, hh: ada.hhId, hunger: 95, thirst: 95, energy: 95 });
  const home = building(s, 'lean_to', 40, 24, ada.hhId, store);
  s.w.households.find((h) => h.id === ada.hhId)!.homeId = home.id;
  const trees = [0, 1, 2].map((i) => makeSource(s.w, 'tree', 48 + i, 30, 8));
  const rock = makeSource(s.w, 'rock', 50, 33, 6);
  done(s);
  s.w.tick = 2000;
  learn(s.w, ada, home, ...trees, rock);
  ben.cooldowns.pause = 1e9;
  return { w: s.w, ada, ben, home };
}
const hutOption = (w: World, p: Person) => generateOptions(w, p, true, true).options.find((o) => o.key === 'plan_site:hut');
const hutBlock = (w: World, p: Person) => generateOptions(w, p, true, true).blocked.find((o) => o.kind === 'plan_site' && o.label === 'Lay out a hut')?.blocked ?? '';

describe('rules 193 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(193);
    expect(SUPPORTED_RULES_VERSIONS).toContain(193);
    expect(LARDER_PER_MEMBER).toBe(3);
  });
});

describe('a household in a lean-to with an empty store', () => {
  it('at 192 is held back by the larder and the card says so; at 193 it is offered the hut', () => {
    const old = scene(192);
    expect(hutOption(old.w, old.ada)).toBeUndefined();
    expect(hutBlock(old.w, old.ada)).toBe('the household has only 0 food to hand and wants 6 before starting a hut');
    const f = scene(193);
    expect(hutOption(f.w, f.ada)).toBeTruthy();
    expect(hutBlock(f.w, f.ada)).toBe('');
  });

  it('a household with three food per member in hand was offered the hut at 192 already, and still is at 193', () => {
    // in the pack: since rules 169 a sight of the store remembers a glance, not the count, so a stocked store reads as 1
    for (const version of [192, 193]) {
      const f = scene(version, {}, { carried: { berries: 6 } });
      expect(hutOption(f.w, f.ada), `offered at rules ${version}`).toBeTruthy();
    }
  });

  it("the person's own hunger still comes first at 193: a starving adult is told to eat before building", () => {
    const f = scene(193, {}, { hunger: 10 });
    expect(hutOption(f.w, f.ada)).toBeUndefined();
    expect(hutBlock(f.w, f.ada)).toBe('too hungry to start a building');
  });

  it('with the switch off a rules-193 world wants the larder again, and an authored world keeps it too', () => {
    setHutBeforeLarder(false);
    const f = scene(193);
    expect(larderHoldsHut(f.w, 0, 2)).toBe(true);
    expect(hutOption(f.w, f.ada)).toBeUndefined();
    setHutBeforeLarder(true);
    const g = scene(193, {}, { dynamics: 'authored' });
    expect(larderHoldsHut(g.w, 0, 2)).toBe(true);
    expect(larderHoldsHut(g.w, 6, 2)).toBe(false);
  });

  it('the pure test: below three per member holds before 193 and never at 193', () => {
    const old = scene(192);
    expect(larderHoldsHut(old.w, 5, 2)).toBe(true);
    expect(larderHoldsHut(old.w, 6, 2)).toBe(false);
    const f = scene(193);
    expect(larderHoldsHut(f.w, 0, 2)).toBe(false);
  });
});
