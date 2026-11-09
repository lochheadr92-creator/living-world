// Rules 184: the contents of a home are learned from inside or at the door.
import { afterEach, describe, expect, it } from 'vitest';
import { observe } from '../src/sim/knowledge';
import { setHomeInterior } from '../src/sim/home_interior';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Person } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => { setHomeInterior(true); });

/** A hut with grain and a net in it at (40,40); Watcher stands `gap` tiles east of its footprint. */
function scene(version: number, gap: number, type: 'hut' | 'storehouse' = 'hut', dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`home-interior-${version}-${gap}-${type}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const owner = addPerson(s, 'Olly', 30, 30, { age: 40 });
  const home = building(s, type, 40, 40, owner.hhId, { grain: 5 });
  const watcher = addPerson(s, 'Wen', 40 + home.w + gap, 40 + home.h / 2, { age: 30 });
  const w = done(s);
  return { w, home, watcher };
}

const grainBelieved = (p: Person, id: number) => p.beliefs[id]?.items?.grain ?? 0;

describe('rules 184: the contents of a home are learned from inside or at the door', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(184);
    expect(SUPPORTED_RULES_VERSIONS).toContain(184);
  });

  it('at 183 a hut seen from eight tiles shows its grain', () => {
    const { w, home, watcher } = scene(183, 8);
    observe(w, watcher, home);
    expect(grainBelieved(watcher, home.id)).toBeGreaterThan(0);
  });

  it('at 184 the same sight shows the hut and not its contents', () => {
    const { w, home, watcher } = scene(184, 8);
    observe(w, watcher, home);
    expect(watcher.beliefs[home.id]).toBeTruthy();
    expect(watcher.beliefs[home.id].btype).toBe('hut');
    expect(watcher.beliefs[home.id].items).toBeUndefined();
  });

  it('at 184 the contents are seen from the door and from inside', () => {
    const door = scene(184, 1.5);
    observe(door.w, door.watcher, door.home);
    expect(grainBelieved(door.watcher, door.home.id)).toBeGreaterThan(0);
    const inside = scene(184, 8);
    inside.watcher.indoors = inside.home.id;
    observe(inside.w, inside.watcher, inside.home);
    expect(grainBelieved(inside.watcher, inside.home.id)).toBeGreaterThan(0);
  });

  it('at 184 what was believed before is kept when the hut is seen again from outside', () => {
    const { w, home, watcher } = scene(184, 1.5);
    observe(w, watcher, home);
    const before = grainBelieved(watcher, home.id);
    expect(before).toBeGreaterThan(0);
    home.store.items.grain = 0;
    watcher.x = home.x + home.w + 8;
    w.tick += 50;
    observe(w, watcher, home);
    expect(grainBelieved(watcher, home.id)).toBe(before);
  });

  it('at 184 a storehouse seen from outside still shows its contents', () => {
    const { w, home, watcher } = scene(184, 8, 'storehouse');
    observe(w, watcher, home);
    expect(grainBelieved(watcher, home.id)).toBeGreaterThan(0);
  });

  it('with the switch off the sight from outside stays at 184', () => {
    const { w, home, watcher } = scene(184, 8);
    setHomeInterior(false);
    observe(w, watcher, home);
    expect(grainBelieved(watcher, home.id)).toBeGreaterThan(0);
  });

  it('an authored world still copies the contents', () => {
    const { w, home, watcher } = scene(184, 8, 'hut', 'authored');
    observe(w, watcher, home);
    expect(grainBelieved(watcher, home.id)).toBeGreaterThan(0);
  });
});
