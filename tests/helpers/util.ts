import { defaultSettings } from '../../src/sim/factory';
import { createWorld } from '../../src/sim/factory';
import { CURRENT_RULES_VERSION } from '../../src/sim/rulesversion';
import { testKit } from '../../src/sim/scenes';
import { foundMembership, hasTownships } from '../../src/sim/townships';
import type { Household, SceneId, Settings, World } from '../../src/sim/types';
import { stepWorld } from '../../src/sim/world';

/**
 * A test world runs the CURRENT rules (rich dynamics at the current rules version), exactly as a new product world does, so
 * every rich-only and version-gated mechanic is on. A test that gives `dynamics` or `rulesVersion` itself keeps exactly what it
 * asked for: that is how the compatibility and continuation tests hold an older generation. Before this default a world from
 * here was a legacy, unversioned 'authored' world with all of those mechanics switched off.
 */
export function settingsFor(seed: string, extra: Partial<Settings> = {}): Settings {
  const pinned = 'dynamics' in extra || 'rulesVersion' in extra;
  const base: Settings = pinned ? defaultSettings(seed) : { ...defaultSettings(seed), dynamics: 'rich', rulesVersion: CURRENT_RULES_VERSION };
  return { ...base, ...extra };
}

/**
 * The hand-made flat world every staged fixture starts from. On township rules the township is founded here, under a reserved id,
 * as a real world has it from the start. Founded lazily it would take the next entity id when the first person is added, and a
 * hand-made scenario is tuned to the ids its people get: an id moved by one, with no rule changed, is enough to flip an outcome
 * that depends on a per-entity draw (shifting ids alone broke 9 of the staged tests).
 */
export function flatWorld(settings: Settings): World {
  const w = testKit.flatWorld(settings);
  if (hasTownships(w)) {
    const next = w.nextId;
    w.nextId = 1_000_000;
    foundMembership(w, { townshipId: undefined } as unknown as Household, w.camp.x, w.camp.y);
    w.nextId = next;
  }
  return w;
}

/**
 * The legacy world: unversioned 'authored' dynamics, with every rich-only and version-gated mechanic off. A test whose subject is
 * that world itself (a compatibility reference, a recorded experiment, the "off" side of an on/off comparison), or one that has not
 * yet been made to work on the current rules, says so with this and gives the reason where it is used. Search for LEGACY_WORLD to
 * see everything that still runs with mechanics off.
 */
export const LEGACY_WORLD: Partial<Settings> = { dynamics: 'authored' };

export function natural(seed = 'test-seed', extra: Partial<Settings> = {}): World {
  return createWorld(settingsFor(seed, extra));
}

export function scene(scene: SceneId, seed = 'scene-' + scene): World {
  return createWorld(settingsFor(seed, { scene }));
}

export function run(world: World, ticks: number, each?: (w: World, i: number) => void): void {
  for (let i = 0; i < ticks; i++) {
    stepWorld(world);
    if (each) each(world, i);
  }
}

export function person(world: World, name: string) {
  const p = world.persons.find((q) => q.name === name);
  if (!p) throw new Error('no such person: ' + name);
  return p;
}
