// Mechanism check for rules 33, leave the heaviest left-over (docs/LEAVE_HEAVIEST.md). Measures, in an ordinary Normal-profile run:
//   stalled   decisions taken while a raw material was short, the pack had no room for one more, a source was believed worth
//             the walk, and a left-over nothing they do wants was carried (the situation the rule acts on)
//   offered   stalled decisions at which the leave option was on offer (a place was known, with room, and the score cleared 8)
//   begun     leave trips started;  done  trips that put something down;  left  units put down, by material
//   resolved  stalled people who started a gather of the material they were short of within 1200 ticks of the stall
// It is mechanism evidence only. It claims nothing about deaths, food or output.
//
//   npx vite-node scripts/leave_heaviest_check.ts -- <seed> <days> [off]
// `off` installs the lab arm (rich-no-leave-heaviest), so the same seed gives the "before" row.
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { invRoom } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { freeOf } from '../src/sim/intent';
import { heaviestLeftover, setLeaveHeaviest } from '../src/sim/leave_heaviest';
import { freshRunSettings } from '../src/sim/profiles';
import { makeCtx, beliefsByKind, sourceUsable } from '../src/sim/optutil';
import { RAW_KINDS, materialNeeds } from '../src/sim/options_work';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import type { Activity, ItemKind, Person } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';

const argv = process.argv.slice(2).filter((a) => a !== '--');
const seed = argv[0] ?? 'meadow';
const days = Number(argv[1] ?? 14);
const off = argv[2] === 'off';
setLeaveHeaviest(!off);

const RAW = ['wood', 'stone', 'clay', 'ore'] as const;
const WINDOW = 1200;
const world = createWorld(freshRunSettings('rich', 'normal', seed));

let decisions = 0;
let stalled = 0;
let offered = 0;
let begun = 0;
let done = 0;
let resolved = 0;
const left: Record<string, number> = {};
const waiting = new Map<string, number>();
const trips: { p: Person; a: Activity }[] = [];

world.hooks = {
  onActivityStart(p, a) {
    decisions++;
    if (a.kind === 'deposit' && typeof a.data.leftAt === 'string') {
      begun++;
      trips.push({ p, a });
    }
    if (a.kind === 'gather') {
      const src = world.byId.get(a.targetId);
      const k = src && 'item' in src ? String((src as { item: string }).item) : '';
      const t = waiting.get(p.id + ':' + k);
      if (t !== undefined) {
        waiting.delete(p.id + ':' + k);
        if (world.tick - t <= WINDOW) resolved++;
      }
    }
    const ctx = makeCtx(world, p, false, true);
    if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30) return;
    const needs = materialNeeds(ctx);
    if (!needs.length) return;
    const short: Record<string, number> = {};
    for (const n of needs) short[n.item] = (short[n.item] ?? 0) + n.n;
    const wanted = new Set(Object.keys(short) as ItemKind[]);
    for (const item of RAW) {
      if (!short[item] || short[item] - freeOf(p, item) <= 0 || invRoom(world, p, item) >= 1) continue;
      if (!beliefsByKind(p, RAW_KINDS[item]).some((b) => sourceUsable(ctx, b, 1).ok)) continue;
      if (!heaviestLeftover(p, wanted)) continue;
      stalled++;
      if (generateOptions(world, p, false, true).options.some((o) => o.key.startsWith('leave:'))) offered++;
      waiting.set(p.id + ':' + item, world.tick);
      break;
    }
  },
};

for (let i = 0; i < days * DAY; i++) {
  stepWorld(world);
  for (let j = trips.length - 1; j >= 0; j--) {
    const { p, a } = trips[j];
    if (p.activity === a) continue;
    trips.splice(j, 1);
    if (a.cycle > 0) {
      done++;
      for (const [k, n] of Object.entries((a.data.moved ?? {}) as Record<string, number>)) left[k] = (left[k] ?? 0) + n;
    }
  }
}
console.log(JSON.stringify({ seed, days, arm: off ? 'rich-no-leave-heaviest' : 'rules-33', rulesVersion: CURRENT_RULES_VERSION, decisions, stalled, offered, begun, done, left, resolved }));
