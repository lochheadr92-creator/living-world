// Rules 191: the feed line for a laid-out site says who it is for from the site that was made (src/sim/layout_words.ts). Every situation
// here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the ordinary-world origin is the end-to-end trace of
// 10 November 2026 (docs/END_TO_END_TRACE.md, link 4). Each check has the rules-190 contrast so the older line is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity, stepActivity } from '../src/sim/activities';
import { layoutForWords, setLayoutWords } from '../src/sim/layout_words';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { foundMembership } from '../src/sim/townships';
import { addPerson, building, done, stage } from './helpers/kit';
import type { BuildingType, Person, World } from '../src/sim/types';

afterEach(() => setLayoutWords(true));

/** Ada, in a township with a hut of her own, marks out a site through the ordinary (not communal) layout action. */
function scene(version: number, type: BuildingType, communal = false, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`layout-words-${version}-${type}-${communal}-${dynamics}`);
  s.w.settings = { ...s.w.settings, dynamics, rulesVersion: version };
  const ada = addPerson(s, 'Ada', 42.5, 45.5, { traits: { generosity: 1, diligence: 1, sociability: 1 }, hunger: 98, thirst: 98, energy: 98 });
  const hut = building(s, 'hut', 35, 39, ada.hhId);
  const hh = s.w.households.find((h) => h.id === ada.hhId)!;
  hh.homeId = hut.id;
  done(s);
  if (dynamics === 'rich') foundMembership(s.w, hh, hut.x, hut.y);
  ada.cooldowns.pause = 1e9;
  return { w: s.w, ada, hh };
}
function layOut(w: World, p: Person, type: BuildingType, communal: boolean) {
  startActivity(w, p, newActivity(w, p, { kind: 'plan_site', label: `Mark a ${type}`, goal: 'staged layout', tx: 44, ty: 44, spotX: 42.5, spotY: 45.5, data: { type, sx: 43, sy: 43, hh: p.hhId, ...(communal ? { communal: true } : {}) } }));
  for (let i = 0; i < 100 && p.activity; i++) { w.tick++; stepActivity(w, p); }
  const site = w.sites.find((s) => s.type === type);
  const line = w.events.find((e) => e.kind === 'build' && e.text.startsWith(`${p.name} marked out`))?.text ?? '';
  return { site, line };
}

describe('rules 191 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(191);
    expect(SUPPORTED_RULES_VERSIONS).toContain(191);
  });
});

describe('the feed line of a laid-out site', () => {
  it('a storehouse made public by its township: at 190 the line names the household the site does not belong to; at 191 it reads for shared use', () => {
    for (const version of [190, 191]) {
      const f = scene(version, 'storehouse');
      const { site, line } = layOut(f.w, f.ada, 'storehouse', false);
      expect(site, `a site exists at rules ${version}`).toBeTruthy();
      expect(site!.hhId, `the site is public at rules ${version}`).toBe(0);
      expect(f.w.events.some((e) => e.text.includes('proposed a shared storehouse')), `proposed at rules ${version}`).toBe(true);
      expect(line, `feed line at rules ${version}`).toBe(version < 191 ? `Ada marked out a storehouse for the ${f.hh.name} household.` : 'Ada marked out a storehouse for shared use.');
    }
  });

  it('a well is public from the start: at 191 its line reads for shared use, at 190 it named the household', () => {
    for (const version of [190, 191]) {
      const f = scene(version, 'well');
      const well = { ent: 'site', type: 'well', hhId: 0 } as never;
      expect(layoutForWords(f.w, well, f.hh, false)).toBe(version < 191 ? ` for the ${f.hh.name} household` : ' for shared use');
    }
  });

  it("a household's own site still names the household at 191", () => {
    const f = scene(191, 'cellar');
    const { site, line } = layOut(f.w, f.ada, 'cellar', false);
    expect(site!.hhId).toBe(f.ada.hhId);
    expect(line).toBe(`Ada marked out a cellar for the ${f.hh.name} household.`);
  });

  it('a communal layout reads for shared use at both versions, as since rules 144', () => {
    for (const version of [190, 191]) {
      const f = scene(version, 'mill', true);
      const { line } = layOut(f.w, f.ada, 'mill', true);
      expect(line).toBe('Ada marked out a grain mill for shared use.');
    }
  });

  it('with the switch off, and in an authored world, the old words are kept', () => {
    setLayoutWords(false);
    const f = scene(191, 'storehouse');
    const site = { ent: 'site', hhId: 0 } as never;
    expect(layoutForWords(f.w, site, f.hh, false)).toBe(` for the ${f.hh.name} household`);
    setLayoutWords(true);
    const g = scene(191, 'storehouse', false, 'authored');
    expect(layoutForWords(g.w, site, g.hh, false)).toBe(` for the ${g.hh.name} household`);
  });
});
