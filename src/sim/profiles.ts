// Larger worlds: the same natural world, on a bigger map, founded in several places at once.
//
// The ordinary world is 80x80 with one camp of 28 people. A larger world keeps the philosophy (a bare start: people, a fire, a few
// lean-tos, food in their packs, a handful of tools; everything else has to be found, made and built) and repeats the ordinary camp's
// recipe around each of several camps: its lake, food, stone, fish, wolves and deposits, its fire(s), its founders. Nobody starts out
// knowing another camp's surroundings, or its people. Whether the camps find each other, trade, compete or merge is up to them.
//
//   large  160x160, 100 founders in 4 camps of 25, about 44 tiles apart: one region whose camps can meet within the first days
//   huge   256x256, 250 founders in 6 camps of about 42, about 80 tiles apart: separate communities
//
// A world gets a profile through `settings.profile`; `settingsForProfile` builds the whole set of settings (the scaled rule set, the
// founders, the size of one settlement). The ordinary world has no profile and none of this runs for it.
import { hashString, RNG } from './rng';
import type { Settings } from './types';
import type { FoundingHub, Layout } from './worldgen';

export type ProfileName = 'normal' | 'large' | 'huge';

interface RegionDef {
  W: number;
  H: number;
  cols: number;
  rows: number;
  /** distance between neighbouring camps' centres before the scatter */
  spacing: number;
  /** each camp is moved up to this far in each direction, so that the map is not a grid */
  scatter: number;
  founders: number;
}

const REGIONS: Record<'large' | 'huge', RegionDef> = {
  large: { W: 160, H: 160, cols: 2, rows: 2, spacing: 44, scatter: 4, founders: 100 },
  huge: { W: 256, H: 256, cols: 3, rows: 2, spacing: 80, scatter: 8, founders: 250 },
};

/** the ordinary camp's size: what every per-camp quantity is measured against */
const ORDINARY_CAMP = 28;

/** the settings for a world of the given profile ('normal' is the ordinary world) */
export function settingsForProfile(profile: ProfileName, seed: string, base: Partial<Settings> = {}): Settings {
  const s: Settings = { seed, population: 28, harsh: false, immigration: true, scene: 'natural', ...base };
  if (profile === 'normal') return s;
  const def = REGIONS[profile];
  s.profile = profile;
  s.population = base.population ?? def.founders;
  s.ruleSet = 'scaled';
  s.settlementFounders = Math.ceil(s.population / (def.cols * def.rows));
  return s;
}

/** where the camps are and how many people each starts with, or null for the ordinary world */
export function layoutFor(settings: Settings): Layout | null {
  if (!settings.profile) return null;
  const def = REGIONS[settings.profile];
  const rng = new RNG(hashString(settings.seed + '|layout'));
  const n = def.cols * def.rows;
  const total = Math.max(n, settings.population);
  const hubs: FoundingHub[] = [];
  for (let j = 0; j < def.rows; j++) {
    for (let i = 0; i < def.cols; i++) {
      const k = j * def.cols + i;
      const founders = Math.floor(total / n) + (k < total % n ? 1 : 0);
      hubs.push({
        x: Math.round(def.W / 2 + (i - (def.cols - 1) / 2) * def.spacing + rng.range(-def.scatter, def.scatter)),
        y: Math.round(def.H / 2 + (j - (def.rows - 1) / 2) * def.spacing + rng.range(-def.scatter, def.scatter)),
        founders,
        scale: founders / ORDINARY_CAMP,
        fires: Math.max(1, Math.ceil(founders / ORDINARY_CAMP)),
      });
    }
  }
  return { W: def.W, H: def.H, hubs };
}
