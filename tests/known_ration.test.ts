// Rules 177: the granary's emergency ration for a hungry housemate reads what the person knows, not the housemate's live state.
import { afterEach, describe, expect, it } from 'vitest';
import { withdrawAllowance } from '../src/sim/facilities';
import { setKnownRation } from '../src/sim/known_ration';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { SeenEntity } from '../src/sim/types';
import { addItem } from '../src/sim/economy';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => { setKnownRation(true); });

/** A granary with grain in other households' shares only, a parent (full, no share) and a starving child of the same household. */
function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`known-ration-${version}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const parent = addPerson(s, 'Pat', 44, 44, { age: 30 });
  const child = addPerson(s, 'Kit', 30, 30, { age: 6 });
  const other = addPerson(s, 'Ora', 45, 44, { age: 30 });
  child.hhId = parent.hhId;
  other.hhId = 777777;
  const b = building(s, 'granary', 50, 50, 0);
  const w = done(s);
  addItem(b.store.items, 'grain', 9);
  b.ops!.shares[other.hhId] = { grain: 9 };
  parent.needs.hunger = 80;
  child.needs.hunger = 5;
  return { w, b, parent, child };
}
const sightOf = (c: { id: number; x: number; y: number }, extra: Partial<SeenEntity>): SeenEntity => ({
  id: c.id, ent: 'person', x: c.x, y: c.y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false,
  child: true, carrying: [], asleep: false, act: '', busyTalking: false, ...extra,
} as SeenEntity);

describe('rules 177: the emergency ration for a housemate follows what the person knows', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(177);
    expect(SUPPORTED_RULES_VERSIONS).toContain(177);
  });

  it('at 176 a starving child the parent cannot see still qualifies the parent, from the live figure', () => {
    const { w, b, parent } = scene(176);
    parent.seen = [];
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(3);
  });

  it('at 177 a starving child out of sight, with no note, does not', () => {
    const { w, b, parent } = scene(177);
    parent.seen = [];
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(0);
  });

  it('at 177 a child remembered as hungry (the note reads 41) does not qualify', () => {
    const { w, b, parent, child } = scene(177);
    parent.seen = [];
    parent.whereabouts[child.id] = { x: 30, y: 30, tick: w.tick, seen: { hungry: true, thirsty: false, cold: false } };
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(0);
  });

  it('at 177 a child in sight and visibly starving qualifies, and changing the live figure does not change that', () => {
    const { w, b, parent, child } = scene(177);
    parent.seen = [sightOf(child, { hungry: true, starving: true })];
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(3);
    child.needs.hunger = 90;
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(3);
  });

  it('at 177 a child in sight who looks only hungry does not qualify, whatever the live figure', () => {
    const { w, b, parent, child } = scene(177);
    parent.seen = [sightOf(child, { hungry: true })];
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(0);
  });

  it('at 177 an adult housemate counts only in sight and visibly hurt', () => {
    const { w, b, parent, child } = scene(177);
    child.birthTick = w.tick - 40 * 2400 * 16;
    parent.seen = [sightOf(child, { hungry: true, starving: true, child: false, hurt: false })];
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(0);
    parent.seen = [sightOf(child, { hungry: true, starving: true, child: false, hurt: true })];
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(3);
  });

  it('the person\'s own hunger is first-hand and still qualifies at 177', () => {
    const { w, b, parent } = scene(177);
    parent.seen = [];
    parent.needs.hunger = 12;
    expect(withdrawAllowance(w, b, parent, 'grain', 9)).toBe(3);
  });

  it('with the switch off, and in an authored world, the live read stays', () => {
    const off = scene(177);
    off.parent.seen = [];
    setKnownRation(false);
    expect(withdrawAllowance(off.w, off.b, off.parent, 'grain', 9)).toBe(3);
    setKnownRation(true);
    const authored = scene(177, 'authored');
    authored.parent.seen = [];
    expect(withdrawAllowance(authored.w, authored.b, authored.parent, 'grain', 9)).toBe(3);
  });
});
