import { defaultSettings } from '../../src/sim/factory';
import { createWorld } from '../../src/sim/factory';
import type { SceneId, Settings, World } from '../../src/sim/types';
import { stepWorld } from '../../src/sim/world';

export function settingsFor(seed: string, extra: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(seed), ...extra };
}

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
