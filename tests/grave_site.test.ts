// Rules 190: a grave is never dug in a doorway (src/sim/grave_site.ts). Every situation here is STAGED: it checks a rule, it is not an
// example of spontaneous behaviour; the ordinary-world origin is review_evidence/grave-site-20261111 (meadow and birch, a death at a
// hut door shutting the household in). Each check has the rules-189 contrast so the older placement is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { createSite } from '../src/sim/buildings';
import { canEnterHome, doorPoint, enterHome, leaveHome } from '../src/sim/habitation';
import { graveMayTake, isDoorTile, setGraveSite } from '../src/sim/grave_site';
import { killPerson } from '../src/sim/lifecycle';
import { isWalkable } from '../src/sim/registry';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { addPerson, building, done, pin, stage } from './helpers/kit';
import type { Building, Person, World } from '../src/sim/types';

afterEach(() => setGraveSite(true));

/** Ada is inside her household's hut; Ben, of another household, dies on its door tile. */
function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`grave-site-${version}-${dynamics}`);
  s.w.settings = { ...s.w.settings, dynamics, rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 43.5, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  const hut = building(s, 'hut', 40, 40, ada.hhId);
  s.w.households.find((h) => h.id === ada.hhId)!.homeId = hut.id;
  const ben = addPerson(s, 'Ben', 40.5, 42.5, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  done(s);
  pin(ada); pin(ben);
  if (dynamics === 'rich') { Object.assign(ada, doorPoint(hut)); expect(enterHome(s.w, ada, hut)).toBeNull(); }
  Object.assign(ben, doorPoint(hut));
  return { w: s.w, ada, ben, hut };
}
const graveOf = (w: World, p: Person) => w.graves.find((g) => g.name === p.name)!;
const onDoor = (b: Building, g: { x: number; y: number }) => g.x === b.doorX && g.y === b.doorY;

describe('rules 190 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(190);
    expect(SUPPORTED_RULES_VERSIONS).toContain(190);
  });
});

describe('a death on a doorstep', () => {
  it('at 189 the grave takes the door tile and the person inside is shut in; at 190 the grave is beside it and the door stays open', () => {
    for (const version of [189, 190]) {
      const f = scene(version);
      killPerson(f.w, f.ben, 'declared staged loss');
      const g = graveOf(f.w, f.ben);
      expect(g, `a grave is marked at rules ${version}`).toBeTruthy();
      expect(onDoor(f.hut, g), `on the door tile at rules ${version}`).toBe(version < 190);
      expect(isWalkable(f.w, f.hut.doorX, f.hut.doorY), `door walkable at rules ${version}`).toBe(version >= 190);
      expect(leaveHome(f.w, f.ada), `Ada leaving at rules ${version}`).toBe(version < 190 ? 'home exit is blocked' : null);
      expect(Math.abs(g.x - f.hut.doorX) + Math.abs(g.y - f.hut.doorY), 'still within a step or two of where he fell').toBeLessThanOrEqual(2);
      expect(conservationReport(f.w).ok).toBe(true);
    }
  });

  it('at 189 nobody can enter the home again either; at 190 a housemate at the door walks in', () => {
    for (const version of [189, 190]) {
      const f = scene(version);
      expect(leaveHome(f.w, f.ada)).toBeNull();
      killPerson(f.w, f.ben, 'declared staged loss');
      Object.assign(f.ada, doorPoint(f.hut));
      expect(canEnterHome(f.w, f.ada, f.hut), `entering at rules ${version}`).toBe(version < 190 ? 'home entrance is blocked' : null);
    }
  });

  it('the door of a site that is still being built is kept clear too', () => {
    const f = scene(190);
    const site = createSite(f.w, 'hut', 46, 40, f.ada.hhId, f.ada.id);
    expect(isDoorTile(f.w, site.x, site.y + site.h)).toBe(true);
    f.ben.x = site.x + 0.5; f.ben.y = site.y + site.h + 0.5;
    killPerson(f.w, f.ben, 'declared staged loss');
    const g = graveOf(f.w, f.ben);
    expect(g.x === site.x && g.y === site.y + site.h).toBe(false);
    expect(isWalkable(f.w, site.x, site.y + site.h)).toBe(true);
  });

  it('with the switch off a rules-190 world digs the grave in the doorway as before', () => {
    setGraveSite(false);
    const f = scene(190);
    expect(graveMayTake(f.w, f.hut.doorX, f.hut.doorY)).toBe(true);
    killPerson(f.w, f.ben, 'declared staged loss');
    expect(onDoor(f.hut, graveOf(f.w, f.ben))).toBe(true);
  });

  it('an authored world keeps the old placement (it has no indoor habitation to shut in)', () => {
    const f = scene(190, 'authored');
    killPerson(f.w, f.ben, 'declared staged loss');
    expect(onDoor(f.hut, graveOf(f.w, f.ben))).toBe(true);
  });

  it('a tile that is not a doorway is placed as before, and the world saves and loads with the grave', () => {
    const f = scene(190);
    f.ben.x = 50.5; f.ben.y = 50.5;
    killPerson(f.w, f.ben, 'declared staged loss');
    const g = graveOf(f.w, f.ben);
    expect([g.x, g.y]).toEqual([50, 50]);
    const raw = serializeWorld(f.w);
    expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
  });
});
