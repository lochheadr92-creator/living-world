// Save points for the measuring scripts. A long run writes the whole world to a file at chosen days; a probe that wants to
// look at year nine starts from the save of year eight in seconds, not from day one in an hour. A saved world read back
// carries on exactly as the world that wrote it (the same guarantee every `tests/vNNN_continuation` pin checks), so a probe
// started from a save measures the same run.
//
//   long run:  ... scripts/generation_trace.ts -- --seed aspen --days 240 --save-every 12 --save-dir C:\saves
//   probe:     ... scripts/famine_probe.ts -- --load C:\saves\aspen-day96.save.json --from 100 --to 108
//
// With --load the seed, the rules version and the arrivals setting are the save's own; --seed, --rules and --arrivals are ignored.
//
// --rules-up <N> (only with --load; NOT --rules, which pins an older version when a world is made from a seed) raises the loaded
// world's rules version to N, so a rules-244 save can be continued at 245 or later, with a switch thrown or not, to measure a rule
// from a settlement that already exists. N must be a version this build runs and above the save's own; it prints a warning, since
// the world is then reinterpreted and no longer a pure continuation of the version that saved it. Nothing else of the world changes
// (state that a version in between would have made at the start of a world is not made), with one fit: a kept animal grown past the
// raised version's age of maturity is set to that age, still an adult. Rules 267 made a sheep mature at 18,937 ticks where it had been
// 8 days (19,200), so an adult sheep of a rules-256 save raised to 267 or later broke the save check ("invalid sheep state") and the
// raised world could not be read back or forked by the lab. The livestock check runs at the raise, so any other mismatch is reported
// there and not halfway through a lab.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { maturity } from '../src/sim/farm_species';
import { validateLivestock } from '../src/sim/livestock';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION, isSupportedRulesVersion } from '../src/sim/rulesversion';
import type { World } from '../src/sim/types';

export type Opt = (name: string, dflt: string) => string;
export function argsOf(argv: string[]): { args: string[]; opt: Opt } {
  const args = argv.slice(2).filter((a) => a !== '--');
  const opt: Opt = (name, dflt) => {
    const i = args.indexOf('--' + name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
  };
  return { args, opt };
}

/**
 * `--rules-up <N>`: raise a loaded world's rules version to `wanted` (the option's text; empty means not given, and nothing happens).
 * `loaded` is the save's path, or empty for a world not read from a save, which is refused. Throws, leaving the world as it was, unless
 * `wanted` is a version this build runs and is above the version the save was made at.
 */
export function raiseRulesVersion(w: World, wanted: string, loaded: string): void {
  if (!wanted) return;
  if (!loaded) throw new Error(`--rules-up ${wanted}: it raises the version of a world read with --load; a fresh world is pinned at an older version with --rules`);
  const was = w.settings.rulesVersion;
  const n = Number(wanted);
  if (!isSupportedRulesVersion(n)) throw new Error(`--rules-up ${wanted}: not a rules version this build runs (the newest is ${CURRENT_RULES_VERSION})`);
  if (was === undefined) throw new Error(`--rules-up ${n}: ${loaded} is an unversioned world (its original rules are unknown), which cannot be raised`);
  if (n <= was) throw new Error(`--rules-up ${n}: ${loaded} is already at rules ${was}; --rules-up only raises a save above its own version (--rules pins an older one when a world is made from a seed)`);
  w.settings.rulesVersion = n;
  const fitted: { s: NonNullable<World['animals'][number]['sheep']>; growth: number }[] = [];
  for (const a of w.animals) {
    const s = a.sheep;
    if (!s) continue;
    const grown = Math.floor(maturity(w, a));
    if (s.growth > grown) { fitted.push({ s, growth: s.growth }); s.growth = grown; }
  }
  try {
    validateLivestock(w);
  } catch (e) {
    for (const f of fitted) f.s.growth = f.growth;
    w.settings.rulesVersion = was;
    throw new Error(`--rules-up ${n}: ${loaded} does not fit rules ${n} (${(e as Error).message}); the world is left as it was, at rules ${was}`);
  }
  if (fitted.length) console.error(`--rules-up ${n}: ${fitted.length} kept animal(s) grown past rules ${n}'s age of maturity set to it (still adults)`);
  console.error(`WARNING --rules-up: ${loaded} was saved at rules ${was} and now runs rules ${n}; it is reinterpreted for measurement and is no longer a pure continuation of its own version`);
}

/** The world a script is to measure: read from --load if given (and raised by --rules-up if given), otherwise made fresh from --seed, --rules and --arrivals. */
export function worldFromArgs(opt: Opt, seedDefault = 'aspen'): { w: World; loaded: string; startDay: number } {
  const load = opt('load', '');
  const rulesUp = opt('rules-up', '');
  if (load) {
    if (!existsSync(load)) throw new Error(`--load: no such save: ${load}`);
    const w = deserializeWorld(readFileSync(load, 'utf8'));
    raiseRulesVersion(w, rulesUp, load);
    return { w, loaded: load, startDay: w.tick / DAY };
  }
  const settings = freshRunSettings(parseRunRules('rich'), 'normal', opt('seed', seedDefault), { immigration: opt('arrivals', 'on') === 'on' });
  const pinned = opt('rules', '');
  if (pinned) settings.rulesVersion = Number(pinned);
  // read back once, as every measuring script does, so a fresh world and a loaded one are the same kind of object
  const w = deserializeWorld(serializeWorld(createWorld(settings)));
  raiseRulesVersion(w, rulesUp, ''); // refused if given: there is no save to raise
  return { w, loaded: '', startDay: 0 };
}

/** Write the world to `<dir>/<seed>-day<N>.save.json` and say where. The world is not changed. */
export function savePoint(w: World, dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `${w.settings.seed}-day${Math.round(w.tick / DAY)}.save.json`);
  writeFileSync(path, serializeWorld(w));
  return path;
}
