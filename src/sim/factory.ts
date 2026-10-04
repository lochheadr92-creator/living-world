import { createSceneWorld } from './scenes';
import type { Settings, World } from './types';
import { defaultSettings, generateNatural } from './worldgen';

/** Build a world from settings: the ordinary seeded world, or one of the labelled test scenes. */
export function createWorld(settings: Settings): World {
  return settings.scene === 'natural' ? generateNatural(settings) : createSceneWorld(settings);
}

export { defaultSettings };
