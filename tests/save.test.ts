// A saved world must come back as the same world, in any size, from the current format and from the one before it.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { deepHash, legacySaveText } from './helpers/golden';

function stepped(w: World, ticks: number): World {
  for (let i = 0; i < ticks; i++) stepWorld(w);
  return w;
}

/** the same everywhere it can be looked at: the compact hash, the deep hash, and what the next hundred ticks do */
function expectSameWorld(a: World, b: World): void {
  expect(hashWorld(b)).toBe(hashWorld(a));
  expect(deepHash(b)).toBe(deepHash(a));
  stepped(a, 100);
  stepped(b, 100);
  expect(hashWorld(b)).toBe(hashWorld(a));
  expect(deepHash(b)).toBe(deepHash(a));
}

describe('saving and loading a world', () => {
  it('round-trips an ordinary world after a while', () => {
    const w = stepped(createWorld(defaultSettings('save-ordinary')), 600);
    expectSameWorld(w, deserializeWorld(serializeWorld(w)));
  });

  it('round-trips a Large world', () => {
    const w = stepped(createWorld(settingsForProfile('large', 'save-large', { immigration: false })), 200);
    expectSameWorld(w, deserializeWorld(serializeWorld(w)));
  });

  it('round-trips a Huge world', () => {
    const w = stepped(createWorld(settingsForProfile('huge', 'save-huge', { immigration: false })), 150);
    expectSameWorld(w, deserializeWorld(serializeWorld(w)));
  });

  it('still reads a save written in the previous format (3: byte-per-tile masks, people one by one)', () => {
    const w = stepped(createWorld(defaultSettings('save-old')), 500);
    const old = legacySaveText(w);
    expect(old.startsWith('{"version":3,')).toBe(true);
    expectSameWorld(w, deserializeWorld(old));
  });

  it('refuses a save from a format it does not know', () => {
    const json = serializeWorld(createWorld(defaultSettings('save-unknown')));
    expect(() => deserializeWorld(json.replace(/^\{"version":\d+/, '{"version":2'))).toThrow(/unsupported save version/);
    expect(() => deserializeWorld(json.replace(/^\{"version":\d+/, '{"version":99'))).toThrow(/unsupported save version/);
  });

  it('writes a Huge world in well under half the text the previous format needed', () => {
    const w = createWorld(settingsForProfile('huge', 'save-size', { immigration: false }));
    const now = serializeWorld(w).length;
    const before = legacySaveText(w).length;
    expect(now).toBeLessThan(before * 0.5);
  });

  it('keeps people in the old per-person form when they do not share the same fields, and still round-trips', () => {
    const w = stepped(createWorld(defaultSettings('save-ragged')), 300);
    const odd = w.persons[3] as unknown as Record<string, unknown>;
    const val = odd.stampX;
    delete odd.stampX; // one person lacks a field
    odd.stampX = val; // …and has it again, but last: a different order
    const text = serializeWorld(w);
    expect(text).not.toContain('"__cols"');
    expectSameWorld(w, deserializeWorld(text));
  });

  it('keeps one person\'s beliefs as they were when a belief has an undefined value or an id that is not its key', () => {
    const w = stepped(createWorld(defaultSettings('save-beliefs')), 300);
    const [first, second] = w.persons;
    const [k1] = Object.keys(first.beliefs);
    (first.beliefs[Number(k1)] as unknown as Record<string, unknown>).btype = undefined;
    const [k2] = Object.keys(second.beliefs);
    first.beliefs[Number(k2)] = { ...second.beliefs[Number(k2)], id: 424242 };
    const text = serializeWorld(w);
    expect(text).toContain('"__cols"'); // the people are still stored by field…
    expectSameWorld(w, deserializeWorld(text)); // …and the two odd belief records came back exactly
  });

  it('packs an explored mask that holds more than 0 and 1 without losing it', () => {
    const w = stepped(createWorld(defaultSettings('save-mask')), 50);
    w.persons[0].explored[10] = 7;
    const b = deserializeWorld(serializeWorld(w));
    expect(b.persons[0].explored[10]).toBe(7);
    expect(Array.from(b.persons[0].explored)).toEqual(Array.from(w.persons[0].explored));
  });
});
