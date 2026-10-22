// Founding-camp cohort capture (option A of the Stage 4 cohort decision): the camp is captured at household formation,
// so freezing the cohort knows every household's camp even before it has a home. This is the verification of the initial
// capture in a real world, the priority of the founding camp over a later home, and the inertness of the capture itself.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { addSettlement } from '../src/sim/settlements';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { stepWorld } from '../src/sim/world';
import {
  UNKNOWN,
  campOfHousehold,
  captureHouseholdCamp,
  captureNearestCamp,
  resetCohortCapture,
  setCohortCapture,
} from '../src/sim/cohortcapture';
import { freezeCohorts } from '../scripts/stage4/metrics';
import { legacySaveText } from './helpers/golden';
import { settingsFor } from './helpers/util';

afterEach(() => {
  resetCohortCapture();
  setCohortCapture(undefined);
});

beforeEach(() => setCohortCapture(captureNearestCamp));

describe('the founding-camp capture (option A)', () => {
  it('captures every initial household in a real Large world and knows all 100 founders at day 0', () => {
    resetCohortCapture();
    const w = createWorld(currentWorldSettings('large', 'coh-founding', { immigration: false }));
    const cohort = freezeCohorts(w);
    expect(cohort.size, 'every living founder gets a cohort').toBe(w.persons.length);
    const unknown = [...cohort.values()].filter((c) => c === UNKNOWN).length;
    expect(unknown, 'no founder is left without a camp').toBe(0);
    const camps = new Set(cohort.values());
    expect(camps.size, 'the four camps are all present').toBe(4);
    expect(w.households.every((h) => campOfHousehold(h.id) !== UNKNOWN), 'every initial household has a captured founding camp').toBe(true);
  }, 180_000);

  it('knows even the households that have no home yet at day 0, instead of leaving them unknown', () => {
    resetCohortCapture();
    const w = createWorld(currentWorldSettings('large', 'coh-homeless', { immigration: false }));
    const cohort = freezeCohorts(w);
    const houseless = w.households.filter((h) => !h.homeId || !w.byId.has(h.homeId));
    expect(houseless.length, 'a Large world starts with some households without a lean-to').toBeGreaterThan(0);
    for (const h of houseless) {
      for (const p of w.persons) {
        if (p.hhId === h.id) expect(cohort.get(p.id), `member of the houseless household ${h.id} is known`).not.toBe(UNKNOWN);
      }
    }
  }, 180_000);

  it('uses the founding camp over the household home, which is the rule for someone who has since built elsewhere', () => {
    const w = testKit.flatWorld(settingsFor('coh-priority', { scene: 'natural', dynamics: 'rich' }));
    w.camp = { x: 20.5, y: 20.5 };
    addSettlement(w, 60.5, 60.5);
    const p = testKit.addPerson(w, new RNG(4), { name: 'Fleur', x: 60.5, y: 61.5 });
    const hh = w.households.find((h) => h.id === p.hhId);
    if (!hh) throw new Error('no household');
    captureHouseholdCamp(w, hh, 61, 61); // founded at camp 1
    testKit.finish(w, 'natural');
    const cohort = freezeCohorts(w);
    expect(cohort.get(p.id), 'the founding camp is used').toBe(1);
  });

  it('keeps capturing households formed by later arrivals, at the camp they arrive at', () => {
    const w = testKit.flatWorld(settingsFor('coh-arrival', { scene: 'natural', dynamics: 'rich' }));
    w.camp = { x: 20.5, y: 20.5 };
    addSettlement(w, 60.5, 60.5);
    const p = testKit.addPerson(w, new RNG(6), { name: 'Rita', x: 20.5, y: 21.5 });
    const hh = w.households.find((h) => h.id === p.hhId);
    if (!hh) throw new Error('no household');
    captureHouseholdCamp(w, hh, 61, 61); // the arrival point at camp 1
    expect(campOfHousehold(hh.id)).toBe(1);
  });

  it('resets between runs, so one seed never leaks its founding camps into the next', () => {
    const w = testKit.flatWorld(settingsFor('coh-reset', { scene: 'natural', dynamics: 'rich' }));
    w.camp = { x: 20.5, y: 20.5 };
    addSettlement(w, 60.5, 60.5);
    const p = testKit.addPerson(w, new RNG(7), { name: 'Reed', x: 60.5, y: 61.5 });
    const hh = w.households.find((h) => h.id === p.hhId);
    if (!hh) throw new Error('no household');
    captureHouseholdCamp(w, hh, 61, 61);
    expect(campOfHousehold(hh.id)).toBe(1);
    resetCohortCapture();
    expect(campOfHousehold(hh.id), 'a reset run starts empty').toBe(UNKNOWN);
  });

  it('changes nothing by looking: a world runs identically with the capture on and off, to the last field', () => {
    const run = (on: boolean) => {
      setCohortCapture(on ? captureNearestCamp : undefined);
      resetCohortCapture();
      const w = createWorld(currentWorldSettings('normal', 'coh-inert', {}));
      for (let i = 0; i < 300; i++) stepWorld(w);
      const text = legacySaveText(w);
      resetCohortCapture();
      return text;
    };
    const off = run(false);
    const on = run(true);
    expect(on).toBe(off);
  }, 180_000);
});
