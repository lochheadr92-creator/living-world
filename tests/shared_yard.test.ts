// Rules 201: the first timber yard a person knows of is laid out as a shared project (src/sim/shared_yard.ts; the workshop planner,
// production.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the ordinary-world
// origin is docs/MECHANISM_CENSUS_20261111.md (about 8,100 blocked decisions per settlement, "does not know of a timber yard they may
// use"). Each check has the rules-200 contrast so the private layout is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { mayUse } from '../src/sim/facilities';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { firstYardShared, setSharedYard } from '../src/sim/shared_yard';
import { makeSource } from '../src/sim/sources';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, learn, pin, site, stage } from './helpers/kit';
import type { Activity, Person, World } from '../src/sim/types';

afterEach(() => setSharedYard(true));

/** Fay, diligent, curious and generous, owns a hut, knows a neighbour's hut, three trees and a rock, on a cold day after day 5; Gus is a neighbour. */
function scene(version: number, dynamics: 'rich' | 'authored' = 'rich', tag = '') {
  const s = stage(`shared-yard-${version}-${dynamics}-${tag}`);
  s.w.settings = { ...s.w.settings, dynamics, rulesVersion: version };
  const fay = addPerson(s, 'Fay', 40.5, 42.5, { age: 30, hunger: 98, thirst: 98, energy: 95, traits: { diligence: 1, curiosity: 1, generosity: 1 } });
  const gus = addPerson(s, 'Gus', 52.5, 42.5, { age: 30, hunger: 98, thirst: 98, energy: 95 });
  const mine = building(s, 'hut', 40, 39, fay.hhId);
  const theirs = building(s, 'hut', 52, 39, gus.hhId);
  s.w.households.find((h) => h.id === fay.hhId)!.homeId = mine.id;
  s.w.households.find((h) => h.id === gus.hhId)!.homeId = theirs.id;
  const trees = [0, 1, 2].map((i) => makeSource(s.w, 'tree', 46 + i, 30, 8));
  const rock = makeSource(s.w, 'rock', 50, 31, 6);
  const w = done(s);
  pin(gus);
  fay.needs.warmth = 95; fay.needs.safety = 95;
  w.weather.temp = 5; w.weather.rain = 0;
  learn(w, fay, mine, theirs, ...trees, rock);
  return { s, w, fay, gus, mine, theirs };
}
/** The yard layout the workshop planner offers Fay, as the activity it would start; the improvement hash is per 500 ticks, so several are tried. */
function yardLayout(w: World, fay: Person): Activity | null {
  for (let i = 0; i < 40; i++) {
    w.tick = 6 * DAY + 600 + 500 * i;
    const o = generateOptions(w, fay, true, true).options.find((x) => x.key === 'plan_site:timber_yard');
    const a = o?.make?.();
    if (a) return a;
  }
  return null;
}

describe('rules 201 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(201);
    expect(SUPPORTED_RULES_VERSIONS).toContain(201);
  });
});

describe('the first timber yard a person knows of', () => {
  it('the rule: shared at 201 for somebody who believes in no yard; private at 200, for another building, with the switch off and in an authored world', () => {
    const old = scene(200), now = scene(201);
    expect(firstYardShared(old.w, old.fay, 'timber_yard')).toBe(false);
    expect(firstYardShared(now.w, now.fay, 'timber_yard')).toBe(true);
    expect(firstYardShared(now.w, now.fay, 'kiln')).toBe(false);
    setSharedYard(false);
    expect(firstYardShared(now.w, now.fay, 'timber_yard')).toBe(false);
    setSharedYard(true);
    const authored = scene(201, 'authored');
    expect(firstYardShared(authored.w, authored.fay, 'timber_yard')).toBe(false);
  });

  it('somebody who already believes in a yard, standing or laid out, lays the next one out privately at 201', () => {
    const a = scene(201, 'rich', 'knows-building');
    learn(a.w, a.fay, building(a.s, 'timber_yard', 60, 50, a.gus.hhId));
    expect(firstYardShared(a.w, a.fay, 'timber_yard')).toBe(false);
    const b = scene(201, 'rich', 'knows-site');
    learn(b.w, b.fay, site(b.s, 'timber_yard', 60, 50, b.gus.hhId, b.gus.id));
    expect(firstYardShared(b.w, b.fay, 'timber_yard')).toBe(false);
  });

  it('through the planner: the layout it offers is the private one at 200 and the shared one at 201, and the site it marks out belongs to nobody at 201', () => {
    const old = scene(200, 'rich', 'plan'), now = scene(201, 'rich', 'plan');
    const before = yardLayout(old.w, old.fay), after = yardLayout(now.w, now.fay);
    expect(before, 'the staging gets a yard layout from the planner at 200').toBeTruthy();
    expect(after, 'and at 201').toBeTruthy();
    expect(before!.data.communal).toBeUndefined();
    expect(after!.data.communal).toBe(true);
    for (const [f, a] of [[old, before!], [now, after!]] as const) {
      f.fay.cooldowns.pause = 0;
      a.minCommit = f.w.tick + 4000; // staged: she sees the layout through, as the test is about what is marked out
      startActivity(f.w, f.fay, a);
      for (let i = 0; i < 900 && !f.w.sites.some((x) => x.type === 'timber_yard'); i++) stepWorld(f.w);
      expect(f.w.sites.some((x) => x.type === 'timber_yard'), `the site is marked out (last result: ${JSON.stringify(f.fay.lastResult)})`).toBe(true);
    }
    const privateSite = old.w.sites.find((x) => x.type === 'timber_yard');
    const sharedSite = now.w.sites.find((x) => x.type === 'timber_yard');
    expect(privateSite?.hhId).toBe(old.fay.hhId);
    expect((old.w.civicProjects ?? []).length).toBe(0);
    expect(sharedSite?.hhId).toBe(0);
    expect((now.w.civicProjects ?? []).some((q) => q.siteId === sharedSite!.id && q.type === 'timber_yard' && q.organiserId === now.fay.id)).toBe(true);
  });

  it('what it is for: a yard that belongs to nobody may be used by a stranger, a household’s yard may not (unchanged access rule)', () => {
    const f = scene(201, 'rich', 'access');
    const shared = building(f.s, 'timber_yard', 60, 50, 0);
    const owned = building(f.s, 'timber_yard', 66, 50, f.gus.hhId);
    expect(mayUse(f.w, f.fay, shared)).toBe(true);
    expect(mayUse(f.w, f.fay, owned)).toBe(false);
  });
});
