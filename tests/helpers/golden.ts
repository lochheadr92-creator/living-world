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
import { serializeWorld } from '../../src/app/save';
import { createWorld, defaultSettings } from '../../src/sim/factory';
import type { Settings, World } from '../../src/sim/types';
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

export function deepHash(world: World): string {
  const json = serializeWorld(world);
  // drop the save-format version so a pure format bump does not read as a behaviour change
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
