// WHY DO MEALS AT A STORE FAIL? A census of every finished `eat_store` activity over several seeds, by the rules version it ran
// under, classified at the moment each one finished.
//
//   npx vite-node scripts/store_meals.ts -- [seeds, comma separated] [days] [--rules N] [--profile normal|town] [--json out.json]
//
// This is the measurement behind rules version 9 (docs/TABLE_EATING.md). Run it with `--rules 8` for the failure and with
// `--rules 9` (the default) for the repair: it is the same seeds, the same code, and the only difference is the version the
// world is stamped with. Read-only: it installs `world.hooks.onActivityStart` (not saved, not hashed) and reads `p.lastResult`.
//
// The two arms diverge chaotically after the first meal, so they are not the same people in the same places. What does not
// depend on that: under version 8 a failure with food in the store and no room in the pack is POSSIBLE, and under version 9 it is
// not. The welfare question is answered by the paired lab, not here.
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import { emptyStoreMeals, watchStoreMeals } from '../tests/helpers/storewatch';
import type { StoreMeals } from '../tests/helpers/storewatch';

const args = process.argv.slice(2).filter((a) => a !== '--');
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !['--rules', '--profile', '--json'].includes(args[i - 1] ?? ''));
const seeds = (positional.find((a) => Number.isNaN(Number(a))) ?? 'river,brook,meadow,stone5').split(',');
const days = Number(positional.find((a) => !Number.isNaN(Number(a))) ?? 8);
const rules = flag('--rules') ? Number(flag('--rules')) : CURRENT_RULES_VERSION;
const profile = (flag('--profile') ?? 'normal') as ProfileName;

const total: StoreMeals = emptyStoreMeals();
const perSeed: Record<string, StoreMeals> = {};
const failedHunger: number[] = [];
const examples: string[] = [];
for (const seed of seeds) {
  const w = createWorld({ ...currentWorldSettings(profile, seed, { immigration: false }), rulesVersion: rules });
  const watch = watchStoreMeals((e) => {
    if (e.outcome !== 'failed') return;
    failedHunger.push(e.hunger);
    if (e.why === 'packFull' && examples.length < 5) {
      const p = w.byId.get(e.personId);
      examples.push(`${seed} t${e.tick}: ${p && p.ent === 'person' ? `${p.name} carrying ${JSON.stringify(p.inv)}` : e.personId} at store #${e.targetId}, hunger ${e.hunger}`);
    }
  });
  watch.attach(w);
  while (w.tick < days * 2400) {
    stepWorld(w);
    watch.scan(w);
  }
  perSeed[seed] = { ...watch.meals };
  for (const k of Object.keys(total) as (keyof StoreMeals)[]) total[k] += watch.meals[k];
}
const finished = total.ok + total.failed;
const sorted = failedHunger.slice().sort((a, b) => a - b);
const report = {
  what: 'finished eat_store activities by outcome, and why the failures failed',
  run: { seeds, days, profile, rulesVersion: rules, immigration: false },
  total,
  finished,
  failureRate: finished ? +(total.failed / finished).toFixed(3) : 0,
  shareOfFailuresWithFoodInTheStoreAndNoRoomInThePack: total.failed ? +(total.packFull / total.failed).toFixed(3) : 0,
  hungerAtFailure: sorted.length ? { lowest: sorted[0], median: sorted[Math.floor(sorted.length / 2)], highest: sorted[sorted.length - 1], below25: sorted.filter((x) => x < 25).length, note: '0 = starving' } : null,
  perSeed,
  examplesOfAFullPack: examples,
};
const out = flag('--json');
if (out) {
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`written ${out}`);
} else console.log(JSON.stringify(report, null, 2));
