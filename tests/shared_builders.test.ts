// Rules 186: a shared building remembers everyone who built it.
import { afterEach, describe, expect, it } from 'vitest';
import { completeSite } from '../src/sim/buildings';
import { describeEntity } from '../src/sim/inspect';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { setSharedBuilders } from '../src/sim/shared_builders';
import { creditProject } from '../src/sim/townships';
import { addPerson, done, site as kitSite, stage } from './helpers/kit';
import { civicFixture, civicTalk } from './helpers/civic';

afterEach(() => { setSharedBuilders(true); });

/** STAGED: Ada proposes a shared storehouse, Ben agrees in conversation, both are credited by hand, Ben strikes the last blow. */
function shared(version: number) {
  const f = civicFixture();
  civicTalk(f.w, f.a, f.b, f.site.id);
  f.w.settings.rulesVersion = version;
  creditProject(f.w, f.a, f.site.id, 'wood', 6);
  creditProject(f.w, f.b, f.site.id, null, 120);
  const b = completeSite(f.w, f.site, f.b);
  return { ...f, building: b };
}
const row = (w: ReturnType<typeof shared>['w'], id: number) => (describeEntity(w, id) as { rows: [string, string][] }).rows.find(([k]) => k === 'Built by' || k === 'Finished by');

describe('rules 186: a shared building remembers everyone who built it', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(186);
    expect(SUPPORTED_RULES_VERSIONS).toContain(186);
  });

  it('at 185 a shared storehouse two people built names the finisher alone', () => {
    const { b, building } = shared(185);
    expect(building.builtBy).toEqual([b.id]);
    expect(building.builtAll).toBeUndefined();
  });

  it('at 186 it names both, in the order they joined, and marks the list complete', () => {
    const { a, b, building } = shared(186);
    expect(building.builtBy).toEqual([a.id, b.id]);
    expect(building.builtAll).toBe(true);
  });

  it('a participant who gave neither work nor materials is not named', () => {
    const f = civicFixture();
    civicTalk(f.w, f.a, f.b, f.site.id);
    f.w.settings.rulesVersion = 186;
    // whatever Ada carried over during the staged talk is cleared, so she has given nothing
    const ada = f.w.civicProjects![0].participants.find((m) => m.personId === f.a.id)!;
    ada.materials = {}; ada.work = 0;
    creditProject(f.w, f.b, f.site.id, null, 120);
    const building = completeSite(f.w, f.site, f.b);
    expect(building.builtBy).toEqual([f.b.id]);
    expect(building.builtAll).toBe(true);
  });

  it('a finisher who gave nothing recorded is still named, last', () => {
    const f = civicFixture();
    civicTalk(f.w, f.a, f.b, f.site.id);
    f.w.settings.rulesVersion = 186;
    creditProject(f.w, f.a, f.site.id, 'wood', 6);
    const building = completeSite(f.w, f.site, f.b);
    expect(building.builtBy).toEqual([f.a.id, f.b.id]);
  });

  it('a building with no project behind it records the finisher only at 186, and the card says "Finished by"', () => {
    const s = stage('shared-builders-home');
    s.w.settings.dynamics = 'rich';
    s.w.settings.rulesVersion = 186;
    const ann = addPerson(s, 'Ann', 40, 40, { age: 30 });
    const w = done(s);
    const hut = completeSite(w, kitSite(s, 'hut', 44, 44, ann.hhId, ann.id), ann);
    expect(hut.builtBy).toEqual([ann.id]);
    expect(hut.builtAll).toBeUndefined();
    expect(row(w, hut.id)?.[0]).toBe('Finished by');
  });

  it('the card says "Built by" with both names at 186 and "Finished by" at 185', () => {
    const now = shared(186);
    expect(row(now.w, now.building.id)?.[0]).toBe('Built by');
    expect(row(now.w, now.building.id)?.[1]).toContain('Ada, Ben');
    const before = shared(185);
    expect(row(before.w, before.building.id)?.[0]).toBe('Finished by');
  });

  it('the switch restores the finisher alone (save and load is covered by the rules-186 pin, whose world holds such a building)', () => {
    setSharedBuilders(false);
    const off = shared(186);
    expect(off.building.builtBy).toEqual([off.b.id]);
  });
});
