// One autonomous village observation. No equipment, choices or outcomes are supplied.
// This is an activation example, not an ensemble or a claim about survival benefit.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { defProbe, defReset, defSnapshot } from '../src/sim/defence';
import { toolOf } from '../src/sim/tools';
import { DAY } from '../src/sim/constants';

const args = process.argv.slice(2);
const value = (key: string, fallback: string) => { const n = args.indexOf(key); return n >= 0 ? args[n + 1] : fallback; };
const seed = value('--seed', 'meadow');
const out = value('--out', 'integration_evidence/defence-story');
if (existsSync(out)) throw new Error(`Keep prior evidence: choose a fresh output directory instead of ${out}`);
mkdirSync(out, { recursive: true });
const world = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
const before = { ...defProbe };
const crafts: unknown[] = [], starts: unknown[] = [], results: unknown[] = [];
const known = new Set(world.tools.map(t => t.id));
let pendingSave = false, saved = false, bites = 0;
world.hooks = {
  onWolfBite: () => bites++,
  onActivityStart: (p, a) => {
    if (a.kind !== 'defend') return;
    const spear = toolOf(world, p, 'spear');
    starts.push({ tick: world.tick, person: p.id, name: p.name, wolf: a.targetId,
      forWhom: a.data.forWhom, why: p.lastDecision?.because, spear: spear ? { ...spear } : null });
    if (!saved) pendingSave = true;
  },
};
defReset(); defProbe.on = true;
try {
  while (world.tick < 12 * DAY) {
    const attempts = defProbe.attempts;
    stepWorld(world);
    for (const t of world.tools) if (!known.has(t.id)) {
      known.add(t.id);
      if (t.kind === 'spear') crafts.push({ ...t, makerName: world.persons.find(p => p.id === t.maker)?.name });
    }
    if (defProbe.attempts > attempts) {
      for (const p of world.persons) if (p.lastResult?.tick === world.tick && /wolf/i.test(p.lastResult.label)) {
        results.push({ person: p.id, name: p.name, ...p.lastResult });
      }
    }
    if (pendingSave && !saved) {
      writeFileSync(join(out, 'first-defence.json'), serializeWorld(world));
      saved = true; pendingSave = false;
    }
  }
  const text = serializeWorld(world);
  const report = { seed, profile: 'normal', days: 12, rulesVersion: world.settings.rulesVersion,
    staged: false, counters: defSnapshot(), bites, crafts, starts, results,
    alive: world.persons.length, hash: hashWorld(world), saveRoundTrip: serializeWorld(deserializeWorld(text)) === text };
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { Object.assign(defProbe, before); }
