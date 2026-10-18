// Larger worlds: the same natural world, on a bigger map, founded in several places at once.
//
// The ordinary world is 80x80 with one camp of 28 people. A larger world keeps the philosophy (a bare start: people, a fire, a few
// lean-tos, food in their packs, a handful of tools; everything else has to be found, made and built) and repeats the ordinary camp's
// recipe around each of several camps: its lake, food, stone, fish, wolves and deposits, its fire(s), its founders. Nobody starts out
// knowing another camp's surroundings, or its people. Whether the camps find each other, trade, compete or merge is up to them.
//
//   large  160x160, 100 founders in 4 camps of 25, about 44 tiles apart: one region whose camps can meet within the first days
//   huge   256x256, 250 founders in 6 camps of about 42, about 80 tiles apart: separate communities
//   town   80x80, 100 founders in ONE camp: the Large population on the ordinary map, with nowhere to spread. The camp's recipe is
//          scaled by its people like any other camp's (3.6 times the ordinary fires, food, fish, deposits and wolves), so the same
//          map is 3.6 times as crowded: a density experiment, not a bigger village.
//
// A world gets a profile through `settings.profile`; `settingsForProfile` builds the whole set of settings (the scaled rule set, the
// founders, the size of one settlement). The ordinary world has no profile and none of this runs for it.
import { hashString, RNG } from './rng';
import { CURRENT_RULES_VERSION } from './rulesversion';
import type { Settings } from './types';
import type { FoundingHub, Layout } from './worldgen';

export type ProfileName = 'normal' | 'large' | 'huge' | 'town';

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

const REGIONS: Record<'large' | 'huge' | 'town', RegionDef> = {
  large: { W: 160, H: 160, cols: 2, rows: 2, spacing: 44, scatter: 4, founders: 100 },
  huge: { W: 256, H: 256, cols: 3, rows: 2, spacing: 80, scatter: 8, founders: 250 },
  // one camp, so spacing is moot; the scatter keeps the camp off the exact centre, as the ordinary world's is
  town: { W: 80, H: 80, cols: 1, rows: 1, spacing: 0, scatter: 5, founders: 100 },
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

/**
 * The settings to hand to Game.restart for a world of this profile. restart merges into the settings of the world being left, so all three
 * profile keys are always present here (undefined for the ordinary world): going back to it clears what a larger world set.
 */
export function restartSettings(profile: ProfileName, seed: string, base: Partial<Settings> = {}): Settings {
  const s = settingsForProfile(profile, seed, base);
  return { ...s, profile: s.profile, ruleSet: s.ruleSet, settlementFounders: s.settlementFounders };
}

/** Product entry point: new worlds use the current integrated rules, including after loading a legacy save.
 * The older helpers keep their historical defaults for existing lab scripts, fixtures and replay compatibility.
 */
export function currentWorldSettings(profile: ProfileName, seed: string, base: Pick<Partial<Settings>, 'harsh' | 'immigration'> = {}): Settings {
  // the current rules generation is stamped here, where a new product world is defined; `restartSettings` and the older
  // low-level helpers stay unversioned, because diagnostics and fixtures deliberately make legacy worlds with them
  return restartSettings(profile, seed, { ...base, dynamics: 'rich', rulesVersion: CURRENT_RULES_VERSION });
}

// ───────────────────────── what a command line asks a fresh world to run ─────────────────────────
/**
 * The three things a run can mean by `--dynamics`, and why the third exists.
 *
 *   'rich'              the current simulation: the integrated rules AND the current rules version, exactly what a new
 *                       product world gets. This is the default everywhere.
 *   'authored'          a legacy diagnostic world: the old rules, unversioned, as those worlds have always been.
 *   'rich-unversioned'  a rich world deliberately left on the legacy compatibility baseline. It exists because "rich" and
 *                       "this generation of the rules" are not the same question: a measurement made before rules versions
 *                       existed is reproduced with this, and it must not claim to be the current version.
 *
 * `settingsForProfile`, `restartSettings` and `defaultSettings` stay unversioned whatever this says: they are the low-level
 * helpers that fixtures and historical diagnostics are built on.
 */
export type RunRules = 'rich' | 'authored' | 'rich-unversioned';
export const RUN_RULES: readonly RunRules[] = ['rich', 'authored', 'rich-unversioned'];

/** Read a `--dynamics` value, refusing anything else by name rather than silently defaulting. */
export function parseRunRules(value: string | undefined, flag = '--dynamics'): RunRules {
  const v = value ?? 'rich';
  if ((RUN_RULES as readonly string[]).includes(v)) return v as RunRules;
  throw new Error(`${flag} must be one of ${RUN_RULES.join(', ')}`);
}

/**
 * The settings for a FRESH world a command line asked for. A current run is stamped with the current rules version, exactly
 * as a new world in the app is, so a script and the product cannot drift apart; the two legacy cases stay unversioned.
 * Loading, forking or replaying an existing world does not come through here: those keep the settings they were recorded
 * with.
 */
export function freshRunSettings(rules: RunRules, profile: ProfileName, seed: string, base: Pick<Partial<Settings>, 'harsh' | 'immigration'> = {}): Settings {
  if (rules === 'rich') return currentWorldSettings(profile, seed, base);
  return settingsForProfile(profile, seed, { ...base, dynamics: rules === 'authored' ? 'authored' : 'rich' });
}

/** The rules version such a run actually runs under, for recording beside its results. `null` means explicitly unversioned. */
export const runRulesVersion = (rules: RunRules): number | null => (rules === 'rich' ? CURRENT_RULES_VERSION : null);

/** what a world of this profile is, for a menu to say: the size of the map, how many people start, in how many camps */
export function profileFacts(profile: ProfileName): { W: number; H: number; founders: number; camps: number } {
  if (profile === 'normal') return { W: 80, H: 80, founders: ORDINARY_CAMP, camps: 1 };
  const d = REGIONS[profile];
  return { W: d.W, H: d.H, founders: d.founders, camps: d.cols * d.rows };
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
