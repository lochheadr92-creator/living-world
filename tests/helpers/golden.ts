// Golden fingerprints of the ordinary world. These exist so that a change which is meant NOT to alter behaviour
// (instrumentation, refactors, optimisations, world profiles that must leave the normal world alone) can be proven not to.
//
// Two fingerprints are taken at each checkpoint:
//   hash  – hashWorld(): the compact state hash the game and the docs already use
//   deep  – everything the game would save (terrain, every belief, every relation, ids, …), minus the save-format version
//
// A golden mismatch is NOT automatically a bug: if behaviour was changed on purpose, regenerate with
//   npx vite-node scripts/golden.ts --write
// and say so in the commit. If behaviour was NOT meant to change, a mismatch is the signal that it did.
import { createWorld, defaultSettings } from '../../src/sim/factory';
import type { Settings, World } from '../../src/sim/types';
import { RNG } from '../../src/sim/rng';
import { hashWorld, stepWorld } from '../../src/sim/world';

export interface GoldenCase {
  name: string;
  settings: Partial<Settings> & { seed: string };
  /** ticks at which to fingerprint, ascending (0 = just generated) */
  ticks: number[];
}

export interface GoldenPoint {
  hash: string;
  deep: string;
}

export const GOLDEN_CASES: GoldenCase[] = [
  // ordinary worlds, default settings (28 people, arrivals on)
  { name: 'meadow', settings: { seed: 'meadow' }, ticks: [0, 600, 2400, 12000] },
  { name: 'river', settings: { seed: 'river' }, ticks: [0, 2400] },
  { name: 'fern', settings: { seed: 'fern' }, ticks: [0, 2400] },
  // harsh mode reads settings.harsh at run time in several places
  { name: 'aspen-harsh', settings: { seed: 'aspen', harsh: true }, ticks: [0, 2400] },
  // a larger founding population on the ordinary map: the generator already accepts it
  { name: 'meadow-pop60', settings: { seed: 'meadow', population: 60, immigration: false }, ticks: [0, 1200] },
  // staged scenes build on a flat world with fixed coordinates
  { name: 'scene-workshop', settings: { seed: 'scene-workshop', scene: 'workshop' }, ticks: [0, 1200] },
  { name: 'scene-haul', settings: { seed: 'scene-haul', scene: 'haul' }, ticks: [0, 1200] },
];

/** generation only: seeds whose terrain, resources, founders and starting knowledge must not drift */
export const GOLDEN_SEEDS = ['gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', 'meadow', 'river', 'fern', 'aspen', 'birch', 'cedar'];

/** two independent 32-bit FNV-style lanes: a 64-bit fingerprint of a (possibly very long) string */
export function fingerprint(s: string): string {
  let a = 2166136261;
  let b = 0x9747b28c;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b ^ c, 0x85ebca6b);
    b ^= b >>> 13;
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/**
 * The text the deep hash is taken of: everything the game would save, written the way save format 3 wrote it, with the indexes that are
 * rebuilt on load left out. It is deliberately NOT src/app/save.ts's serializeWorld: the golden fingerprints are of the world's
 * content, so changing how a save is stored (as format 4 did for the explored masks) must leave them as they were. A save's own
 * round trip is held by tests/save.test.ts, which also uses this text as a save file of the old format.
 */
export function legacySaveText(world: World): string {
  const b64 = (bytes: Uint8Array): string => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const replacer = (_key: string, value: unknown): unknown => {
    if (value instanceof Uint8Array) return { __ta: 'u8', d: b64(value) };
    if (value instanceof Int32Array) return { __ta: 'i32', d: b64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
    if (value instanceof Float32Array) return { __ta: 'f32', d: b64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
    if (value instanceof Map) return { __map: Array.from(value.entries()) };
    if (value instanceof Set) return { __set: Array.from(value.values()) };
    if (value instanceof RNG) return { __rng: value.getState() };
    return value;
  };
  const { byId: _b, grid: _g, pgrid: _p, hooks: _h, ...rest } = world as World & Record<string, unknown>;
  void _b;
  void _g;
  void _p;
  void _h;
  return JSON.stringify({ version: 3, world: rest }, replacer);
}

export function deepHash(world: World): string {
  const json = legacySaveText(world);
  return fingerprint(json.slice(json.indexOf('"world":')));
}

export function point(world: World): GoldenPoint {
  return { hash: hashWorld(world), deep: deepHash(world) };
}

export function computeCase(c: GoldenCase): Record<string, GoldenPoint> {
  const w = createWorld({ ...defaultSettings(c.settings.seed), ...c.settings });
  const out: Record<string, GoldenPoint> = {};
  for (const target of c.ticks) {
    while (w.tick < target) stepWorld(w);
    out[String(target)] = point(w);
  }
  return out;
}

export function computeGeneration(seed: string): GoldenPoint {
  return point(createWorld(defaultSettings(seed)));
}

export interface GoldenFile {
  note: string;
  cases: Record<string, Record<string, GoldenPoint>>;
  generation: Record<string, GoldenPoint>;
}
