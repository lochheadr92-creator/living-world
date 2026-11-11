// Rules 207: a workplace is open to everyone (src/sim/open_workplaces.ts; accessLevel in facilities.ts, mayUseBelief in production.ts,
// knownGranary in provision.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The
// ordinary-world origin is the census of rules 196 (about 8,100 blocked decisions a settlement that "do not know of a timber yard they
// may use"; no handcart in any settlement) and the owner's instruction of 11 November 2026. Each check has the rules-206 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { addItem } from '../src/sim/economy';
import { accessLevel, earnedAccess, mayUse, noteDeposit, startBlocker, usableUnits } from '../src/sim/facilities';
import { describeEntity } from '../src/sim/inspect';
import { openToAll, setOpenWorkplaces } from '../src/sim/open_workplaces';
import { facilitiesOf } from '../src/sim/production';
import { knownGranary } from '../src/sim/provision';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { addPerson, building, done, learn, stage } from './helpers/kit';
import type { BuildingType } from '../src/sim/types';

afterEach(() => setOpenWorkplaces(true));

/** Ada's household owns a workplace she raised alone; Ben is of another household and no friend of hers. Both know the building. */
function scene(version: number, type: BuildingType = 'timber_yard', opts: { dynamics?: 'rich' | 'authored'; tag?: string } = {}) {
  const s = stage(`open-workplaces-${version}-${type}-${opts.dynamics ?? 'rich'}-${opts.tag ?? ''}`);
  s.w.settings = { ...s.w.settings, dynamics: opts.dynamics ?? 'rich', rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 28.5, { age: 30, hunger: 95, thirst: 95, energy: 95 });
  const ben = addPerson(s, 'Ben', 44.5, 28.5, { age: 30, hunger: 95, thirst: 95, energy: 95 });
  const b = building(s, type, 40, 24, ada.hhId);
  const w = done(s);
  w.tick = 600;
  learn(w, ada, b);
  learn(w, ben, b);
  return { w, ada, ben, b };
}

describe('rules 207 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(207);
    expect(SUPPORTED_RULES_VERSIONS).toContain(207);
  });
});

describe('which buildings are open to everybody', () => {
  it('none at 206; every workplace at 207, never a home or a store; not in an authored world or with the switch off', () => {
    const old = scene(206).w, now = scene(207).w;
    for (const t of ['timber_yard', 'quarry', 'kiln', 'smithy', 'bakery', 'granary', 'food_rack', 'mine', 'mill', 'brewery', 'hall'] as BuildingType[]) {
      expect(openToAll(old, t), `${t} at 206`).toBe(false);
      expect(openToAll(now, t), `${t} at 207`).toBe(true);
    }
    for (const t of ['hut', 'lean_to', 'house', 'storehouse', 'cellar'] as BuildingType[]) expect(openToAll(now, t), `${t} at 207`).toBe(false);
    expect(openToAll(now, undefined)).toBe(false);
    expect(openToAll(scene(207, 'timber_yard', { dynamics: 'authored' }).w, 'timber_yard')).toBe(false);
    setOpenWorkplaces(false);
    expect(openToAll(now, 'timber_yard')).toBe(false);
  });
});

describe('a stranger at another household’s timber yard', () => {
  it('is shut out at 206 and admitted as a guest at 207; the owner is the owner at both; what was earned is unchanged', () => {
    const old = scene(206), now = scene(207);
    expect(accessLevel(old.w, old.ben, old.b)).toBe('none');
    expect(mayUse(old.w, old.ben, old.b)).toBe(false);
    expect(accessLevel(now.w, now.ben, now.b)).toBe('friend');
    expect(mayUse(now.w, now.ben, now.b)).toBe(true);
    expect(earnedAccess(now.w, now.ben, now.b)).toBe('none');
    for (const f of [old, now]) expect(accessLevel(f.w, f.ada, f.b)).toBe('owner');
    setOpenWorkplaces(false);
    expect(accessLevel(now.w, now.ben, now.b)).toBe('none');
  });

  it('knows of a yard he may use at 207 and of none at 206', () => {
    const old = scene(206), now = scene(207);
    expect(facilitiesOf(generateOptions(old.w, old.ben, true, true), 'timber_yard')).toHaveLength(0);
    expect(facilitiesOf(generateOptions(now.w, now.ben, true, true), 'timber_yard')).toHaveLength(1);
    expect(facilitiesOf(generateOptions(old.w, old.ada, true, true), 'timber_yard')).toHaveLength(1);
    setOpenWorkplaces(false);
    expect(facilitiesOf(generateOptions(now.w, now.ben, true, true), 'timber_yard')).toHaveLength(0);
  });

  it('starting a batch: refused as "not theirs to use" at 206, not refused for that at 207', () => {
    const old = scene(206), now = scene(207);
    const r = RECIPE_BY_ID.hew_planks;
    expect(startBlocker(old.w, old.b, old.ben, r)).toBe('not theirs to use');
    expect(startBlocker(now.w, now.b, now.ben, r)).not.toBe('not theirs to use');
  });

  it('what he brings is held for him, and the yard’s own stock stays its household’s', () => {
    const f = scene(207, 'timber_yard', { tag: 'stock' });
    // the household's own planks, and three wood he carried in
    addItem(f.b.store.items, 'planks', 4);
    addItem(f.b.store.items, 'wood', 3);
    noteDeposit(f.w, f.b, f.ben, 'wood', 3);
    expect(usableUnits(f.w, f.b, f.ben, 'wood')).toBe(3);
    expect(usableUnits(f.w, f.b, f.ben, 'planks')).toBe(0);
    expect(usableUnits(f.w, f.b, f.ada, 'planks')).toBe(4);
    // the wood is his: the owner does not count it as the yard's own
    expect(usableUnits(f.w, f.b, f.ada, 'wood')).toBe(0);
  });

  it('the viewer is told: the card says the yard is open to everyone at 207 and not at 206', () => {
    const old = scene(206), now = scene(207);
    const text = (f: typeof now) => JSON.stringify(describeEntity(f.w, f.b.id));
    expect(text(now)).toContain('Open to everyone: what a person brings and makes here is theirs.');
    expect(text(old)).not.toContain('Open to everyone');
    expect(text(old)).toContain('counts them a friend');
  });
});

describe('a granary', () => {
  it('another household’s granary is one he may use at 207 and not at 206', () => {
    const old = scene(206, 'granary'), now = scene(207, 'granary');
    expect(knownGranary(old.w, old.ben)).toBeNull();
    expect(knownGranary(now.w, now.ben)?.id).toBe(now.b.id);
    expect(knownGranary(old.w, old.ada)?.id).toBe(old.b.id);
  });
});
