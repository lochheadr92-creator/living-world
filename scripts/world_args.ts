// Save points for the measuring scripts. A long run writes the whole world to a file at chosen days; a probe that wants to
// look at year nine starts from the save of year eight in seconds, not from day one in an hour. A saved world read back
// carries on exactly as the world that wrote it (the same guarantee every `tests/vNNN_continuation` pin checks), so a probe
// started from a save measures the same run.
//
//   long run:  ... scripts/generation_trace.ts -- --seed aspen --days 240 --save-every 12 --save-dir C:\saves
//   probe:     ... scripts/famine_probe.ts -- --load C:\saves\aspen-day96.save.json --from 100 --to 108
//
// With --load the seed, the rules version and the arrivals setting are the save's own; --seed, --rules and --arrivals are ignored.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
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

/** The world a script is to measure: read from --load if given, otherwise made fresh from --seed, --rules and --arrivals. */
export function worldFromArgs(opt: Opt, seedDefault = 'aspen'): { w: World; loaded: string; startDay: number } {
  const load = opt('load', '');
  if (load) {
    if (!existsSync(load)) throw new Error(`--load: no such save: ${load}`);
    const w = deserializeWorld(readFileSync(load, 'utf8'));
    return { w, loaded: load, startDay: w.tick / DAY };
  }
  const settings = freshRunSettings(parseRunRules('rich'), 'normal', opt('seed', seedDefault), { immigration: opt('arrivals', 'on') === 'on' });
  const pinned = opt('rules', '');
  if (pinned) settings.rulesVersion = Number(pinned);
  // read back once, as every measuring script does, so a fresh world and a loaded one are the same kind of object
  return { w: deserializeWorld(serializeWorld(createWorld(settings))), loaded: '', startDay: 0 };
}

/** Write the world to `<dir>/<seed>-day<N>.save.json` and say where. The world is not changed. */
export function savePoint(w: World, dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `${w.settings.seed}-day${Math.round(w.tick / DAY)}.save.json`);
  writeFileSync(path, serializeWorld(w));
  return path;
}
