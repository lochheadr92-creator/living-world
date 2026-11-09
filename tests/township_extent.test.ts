// Rules 185: a township keeps a record of how far its building has reached (first slice of gap G150).
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { completeSite } from '../src/sim/buildings';
import { civicHistory } from '../src/sim/history';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { setTownshipExtent } from '../src/sim/township_extent';
import { addPerson, done, site, stage } from './helpers/kit';

afterEach(() => { setTownshipExtent(true); });

/** STAGED: one person in a township, on flat ground. Sites are placed by hand and finished by hand. */
function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`township-extent-${version}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const ann = addPerson(s, 'Ann', 40, 40, { age: 30 });
  const w = done(s);
  const hh = w.households.find((h) => h.id === ann.hhId)!;
  if (hh.townshipId === undefined) {
    (w.townships ??= []).push({ id: w.nextId++, name: 'Testford', x: 40, y: 40, founded: 0 });
    hh.townshipId = w.townships[w.townships.length - 1].id;
  }
  const town = w.townships!.find((t) => t.id === hh.townshipId)!;
  const finish = (type: 'hut' | 'storehouse', x: number, y: number, owner = hh.id) => completeSite(w, site(s, type, x, y, owner, ann.id), ann);
  return { s, w, ann, hh, town, finish };
}

describe('rules 185: a township records how far its building has reached', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(185);
    expect(SUPPORTED_RULES_VERSIONS).toContain(185);
  });

  it('at 184 a finished building leaves no extent on the township', () => {
    const { town, finish } = scene(184);
    finish('hut', 44, 44);
    expect(town.extent).toBeUndefined();
  });

  it('at 185 the first finished building sets the extent to its footprint', () => {
    const { w, town, finish } = scene(185);
    const b = finish('hut', 44, 44);
    expect(town.extent).toEqual({ x0: b.x, y0: b.y, x1: b.x + b.w - 1, y1: b.y + b.h - 1, finished: 1, updated: w.tick });
  });

  it('at 185 a second building grows the extent to cover both and counts two', () => {
    const { town, finish } = scene(185);
    const a = finish('hut', 44, 44);
    const b = finish('hut', 30, 52);
    expect(town.extent).toMatchObject({
      x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y),
      x1: Math.max(a.x + a.w, b.x + b.w) - 1, y1: Math.max(a.y + a.h, b.y + b.h) - 1, finished: 2,
    });
  });

  it('a public building with no project behind it is not attributed to any township', () => {
    const { town, finish } = scene(185);
    finish('storehouse', 50, 50, 0);
    expect(town.extent).toBeUndefined();
  });

  it('the civic history shows the record at 185 and has no such line at 184', () => {
    const now = scene(185);
    now.finish('hut', 44, 44);
    expect(civicHistory(now.w, now.ann).lines.some((l) => l.includes('recorded building reaches') && l.includes('not a border'))).toBe(true);
    const before = scene(184);
    before.finish('hut', 44, 44);
    expect(civicHistory(before.w, before.ann).lines.some((l) => l.includes('recorded building reaches'))).toBe(false);
  });

  it('the record survives a save and load', () => {
    const { w, town, finish } = scene(185);
    finish('hut', 44, 44);
    const copy = deserializeWorld(serializeWorld(w));
    expect(copy.townships!.find((t) => t.id === town.id)!.extent).toEqual(town.extent);
  });

  it('with the switch off, and in an authored world, nothing is recorded at 185', () => {
    const off = scene(185);
    setTownshipExtent(false);
    off.finish('hut', 44, 44);
    expect(off.town.extent).toBeUndefined();
    setTownshipExtent(true);
    const authored = scene(185, 'authored');
    authored.finish('hut', 44, 44);
    expect(authored.town.extent).toBeUndefined();
  });
});
