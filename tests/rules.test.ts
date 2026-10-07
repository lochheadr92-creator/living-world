// The limits on how big a settlement may get (src/sim/rules.ts): the ordinary values are the original numbers, scaled values are
// ratios of the founding population, and workplaces and open sites are counted per settlement only when a world asks for that.
import { describe, expect, it } from 'vitest';
import { createSite } from '../src/sim/buildings';
import { conservationReport } from '../src/sim/economy';
import { openSitesNear, projectLimit, projectsUnderWay, siteConflict } from '../src/sim/act_build';
import { makeCtx } from '../src/sim/optutil';
import { knowsOfAny } from '../src/sim/production';
import { ORDINARY_RULES, SETTLEMENT_RADIUS, rulesFor, rulesOf, scaledRules, within } from '../src/sim/rules';
import { toolReport } from '../src/sim/toolreg';
import { hashWorld } from '../src/sim/world';
import { addPerson, building, done, learn, stage } from './helpers/kit';
import { natural, run } from './helpers/util';

describe('rule sets', () => {
  it('the ordinary rules are the numbers the world was tuned with', () => {
    expect({ ...ORDINARY_RULES }).toEqual({
      immigrationCap: 54,
      conceptionCap: 64,
      arrivalGroupCap: 56,
      maxBasicSites: 4,
      maxOpenSites: 4,
      projectsBase: 2,
      projectsRaised: 3,
      projectsRaisedAt: 55,
      facilityRadius: Infinity,
      siteRadius: Infinity,
      arrivalSpacing: 6000,
    });
  });

  it('a world uses the ordinary rules unless it asks for scaled ones (older saves and staged scenes never do)', () => {
    expect(rulesOf(natural('rules-a'))).toBe(ORDINARY_RULES);
    expect(rulesOf(natural('rules-b', { ruleSet: 'ordinary', population: 100 }))).toBe(ORDINARY_RULES);
    expect(rulesFor(undefined, 250)).toBe(ORDINARY_RULES);
    expect(rulesOf(natural('rules-c', { ruleSet: 'scaled', population: 100 })).immigrationCap).toBeGreaterThan(54);
  });

  it('scaled rules at the ordinary founding population are the ordinary limits, made local', () => {
    const r = scaledRules(28);
    expect({ ...r, facilityRadius: 0, siteRadius: 0 }).toEqual({ ...ORDINARY_RULES, facilityRadius: 0, siteRadius: 0 });
    expect(r.facilityRadius).toBe(SETTLEMENT_RADIUS);
    expect(r.siteRadius).toBe(SETTLEMENT_RADIUS);
  });

  it('scaled limits are ratios of the founders: population limits of the whole world, building limits of a settlement', () => {
    expect(scaledRules(100)).toMatchObject({ immigrationCap: 193, conceptionCap: 229, arrivalGroupCap: 200, projectsRaisedAt: 196, maxBasicSites: 14, maxOpenSites: 14, projectsBase: 7, projectsRaised: 11 });
    expect(scaledRules(250)).toMatchObject({ immigrationCap: 482, conceptionCap: 571, arrivalGroupCap: 500, projectsRaisedAt: 491, maxBasicSites: 36, maxOpenSites: 36, projectsBase: 18, projectsRaised: 27 });
    // several settlements: the world's population limits follow all the founders, the building limits only one settlement's
    expect(scaledRules(250, 42)).toMatchObject({ immigrationCap: 482, conceptionCap: 571, maxBasicSites: 6, maxOpenSites: 6, projectsBase: 3 });
    // never below the ordinary value, however few founders
    for (const f of [1, 5, 14, 27]) for (const k of Object.keys(ORDINARY_RULES) as (keyof typeof ORDINARY_RULES)[]) if (k !== 'facilityRadius' && k !== 'siteRadius') expect(scaledRules(f)[k], `${k} at ${f}`).toBeGreaterThanOrEqual(ORDINARY_RULES[k]);
  });

  it('travellers may arrive more often the more settlements a world has, and no more often than the ordinary village at one camp', () => {
    expect(ORDINARY_RULES.arrivalSpacing).toBe(6000);
    expect(scaledRules(28).arrivalSpacing).toBe(6000);
    expect(scaledRules(100, 25).arrivalSpacing).toBe(1500); // Large: four camps of 25
    expect(scaledRules(250, 42).arrivalSpacing).toBe(1008); // Huge: six camps of about 42
    expect(scaledRules(100).arrivalSpacing).toBe(6000); // one settlement of 100: as before
    expect(scaledRules(1000, 5).arrivalSpacing).toBe(400); // never faster than they are considered
  });

  it('an infinite radius covers everything; a finite one only what is near', () => {
    expect(within(Infinity, 0, 0, 1e9, 1e9)).toBe(true);
    expect(within(40, 10, 10, 40, 10)).toBe(true);
    expect(within(40, 10, 10, 51, 10)).toBe(false);
  });
});

describe('workplaces and open sites, ordinary against scaled', () => {
  const FAR = { x: 10, y: 30 };
  const NEAR = { x: 45, y: 50 };

  function yardWorld(ruleSet: 'ordinary' | 'scaled', population = 28) {
    const s = stage('rules-yard-' + ruleSet);
    const a = addPerson(s, 'Ann', 44, 44);
    building(s, 'timber_yard', 60, 60, 0);
    const w = done(s);
    w.settings.ruleSet = ruleSet;
    w.settings.population = population;
    return { w, a };
  }

  it('ordinary: one timber yard in the whole world, wherever the new one would stand', () => {
    const { w, a } = yardWorld('ordinary');
    expect(siteConflict(w, 'timber_yard', a.hhId)).toMatch(/already a timber yard/);
    expect(siteConflict(w, 'timber_yard', a.hhId, 0, 0, NEAR)).toMatch(/already a timber yard/);
    expect(siteConflict(w, 'timber_yard', a.hhId, 0, 0, FAR)).toMatch(/already a timber yard/);
  });

  it('scaled: one per settlement — blocked near an existing one, free far from it', () => {
    const { w, a } = yardWorld('scaled');
    expect(siteConflict(w, 'timber_yard', a.hhId, 0, 0, NEAR)).toMatch(/already a timber yard/);
    expect(siteConflict(w, 'timber_yard', a.hhId, 0, 0, FAR)).toBeNull();
    // a site being laid out blocks its neighbourhood in the same way
    createSite(w, 'kiln', 20, 60, a.hhId, a.id);
    expect(siteConflict(w, 'kiln', a.hhId + 1, 0, 0, { x: 22, y: 62 })).toMatch(/already being built/);
    expect(siteConflict(w, 'kiln', a.hhId + 1, 0, 0, { x: 70, y: 20 })).toBeNull();
  });

  it('home sites: a global ceiling when ordinary, a per-settlement one that grows with the founders when scaled', () => {
    const open = (ruleSet: 'ordinary' | 'scaled', population: number) => {
      const s = stage(`rules-sites-${ruleSet}-${population}`);
      const a = addPerson(s, 'Ann', 44, 44);
      const w = done(s);
      w.settings.ruleSet = ruleSet;
      w.settings.population = population;
      for (let i = 0; i < 4; i++) createSite(w, 'hut', 8 + i * 3, 30, 900 + i, a.id);
      return { w, a };
    };
    const ord = open('ordinary', 28);
    expect(siteConflict(ord.w, 'hut', 1)).toMatch(/too many projects/);
    expect(siteConflict(ord.w, 'hut', 1, 0, 0, { x: 70, y: 70 })).toMatch(/too many projects/); // far away makes no difference
    const sc28 = open('scaled', 28);
    expect(siteConflict(sc28.w, 'hut', 1, 0, 0, { x: 12, y: 32 })).toMatch(/too many projects/);
    expect(siteConflict(sc28.w, 'hut', 1, 0, 0, { x: 70, y: 70 })).toBeNull(); // a different settlement has room of its own
    const sc100 = open('scaled', 100);
    expect(siteConflict(sc100.w, 'hut', 1, 0, 0, { x: 12, y: 32 })).toBeNull(); // 14 may be open at once, only 4 are
    expect(openSitesNear(sc28.w, { x: 12, y: 32 })).toBe(4);
    expect(openSitesNear(sc28.w, { x: 70, y: 70 })).toBe(0);
    expect(openSitesNear(ord.w, { x: 70, y: 70 })).toBe(4);
  });

  it('improvement projects: counted where the new one would go, limit follows the settlement', () => {
    const s = stage('rules-projects');
    const a = addPerson(s, 'Ann', 44, 44);
    const w = done(s);
    createSite(w, 'kiln', 20, 60, a.hhId, a.id);
    createSite(w, 'hall', 30, 60, a.hhId, a.id);
    expect(projectLimit(w)).toBe(2);
    expect(projectsUnderWay(w, false)).toBe(2);
    expect(siteConflict(w, 'smithy', a.hhId, 0, 0, { x: 70, y: 70 })).toMatch(/enough improvement projects/);
    w.settings.ruleSet = 'scaled';
    w.settings.population = 28;
    expect(siteConflict(w, 'smithy', a.hhId, 0, 0, { x: 25, y: 62 })).toMatch(/enough improvement projects/);
    expect(siteConflict(w, 'smithy', a.hhId, 0, 0, { x: 70, y: 20 })).toBeNull();
    w.settings.population = 100;
    expect(projectLimit(w)).toBe(7);
    expect(siteConflict(w, 'smithy', a.hhId, 0, 0, { x: 25, y: 62 })).toBeNull();
  });

  it('what a person counts as a means to plan around is their own settlement: a distant kiln does not count when scaled', () => {
    const make = (ruleSet: 'ordinary' | 'scaled') => {
      const s = stage('rules-knows-' + ruleSet);
      const a = addPerson(s, 'Ann', 44, 44);
      const far = building(s, 'kiln', 75, 75, 0);
      const w = done(s);
      w.settings.ruleSet = ruleSet;
      learn(w, a, far);
      return { s, w, a };
    };
    const ord = make('ordinary');
    expect(knowsOfAny(makeCtx(ord.w, ord.a, false), 'kiln')).toBe(true);
    const sc = make('scaled');
    expect(knowsOfAny(makeCtx(sc.w, sc.a, false), 'kiln')).toBe(false);
    const near = building(sc.s, 'kiln', 50, 50, 0);
    learn(sc.w, sc.a, near);
    expect(knowsOfAny(makeCtx(sc.w, sc.a, false), 'kiln')).toBe(true);
  });
});

describe('the ordinary world does not notice', () => {
  it('naming the ordinary rules explicitly changes nothing', () => {
    const a = natural('rules-neutral');
    const b = natural('rules-neutral', { ruleSet: 'ordinary' });
    run(a, 1200);
    run(b, 1200);
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it('a scaled world runs, keeps its books, and is not the ordinary world', () => {
    const w = natural('rules-scaled-smoke', { population: 60, ruleSet: 'scaled', immigration: false });
    run(w, 1500);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
    expect(w.persons.length).toBeGreaterThanOrEqual(60);
  }, 120_000);
});
