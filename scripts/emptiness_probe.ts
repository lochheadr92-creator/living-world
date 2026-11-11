// The remembered-emptiness question of the mechanism census (docs/MECHANISM_CENSUS_20261111.md, plan item 9): when a person is
// blocked from gathering because they "believe it is empty", or from eating at a store because they "remember it being empty", is the
// place really empty at that moment? A measurement, not a rule; nothing in the simulation reads it. Every 100 ticks each living
// person's options are generated in observer mode (which leaves the world as it was) and every such block is compared with the truth:
// what the source or the store holds at that tick, and how old the belief is. Printed as one JSON line per seed.
//   node node_modules/vite-node/dist/cli.mjs scripts/emptiness_probe.ts -- <seed> [days=25] [out.json]
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seed = args[0] ?? 'meadow';
const days = Number(args[1] ?? 25);
const out = args[2];
const w = createWorld(currentWorldSettings('normal', seed, { immigration: true }));
interface Row { blocks: number; trulyEmpty: number; wrong: number; heldWhenWrong: number; ageWhenWrong: number; ageWhenRight: number }
const rows: Record<string, Row> = {};
const row = (k: string): Row => (rows[k] ??= { blocks: 0, trulyEmpty: 0, wrong: 0, heldWhenWrong: 0, ageWhenWrong: 0, ageWhenRight: 0 });
while (w.tick < days * DAY) {
  stepWorld(w);
  if (w.tick % 100 !== 0) continue;
  for (const p of w.persons) {
    if (!p.alive) continue;
    const ctx = generateOptions(w, p, true, true);
    for (const b of ctx.blocked) {
      const reason = b.blocked ?? '';
      const isSource = reason === 'believes it is empty';
      const isStore = reason === 'remembers it being empty';
      if (!isSource && !isStore) continue;
      const truth = w.byId.get(b.targetId);
      const belief = p.beliefs[b.targetId];
      if (!truth || !belief) continue;
      let held = 0;
      let kind = '';
      if (truth.ent === 'source') { held = truth.amount; kind = truth.type; }
      else if (truth.ent === 'building') { held = foodUnits(truth.store.items); kind = 'store:' + truth.type; }
      else continue;
      const r = row(kind);
      const age = w.tick - belief.seen;
      r.blocks++;
      if (held >= 1) { r.wrong++; r.heldWhenWrong += held; r.ageWhenWrong += age; }
      else { r.trulyEmpty++; r.ageWhenRight += age; }
    }
  }
}
const summary = Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, {
  blocks: r.blocks,
  trulyEmpty: r.trulyEmpty,
  wrong: r.wrong,
  wrongShare: r.blocks ? Math.round((r.wrong / r.blocks) * 1000) / 1000 : 0,
  meanHeldWhenWrong: r.wrong ? Math.round((r.heldWhenWrong / r.wrong) * 10) / 10 : 0,
  meanBeliefAgeWhenWrong: r.wrong ? Math.round(r.ageWhenWrong / r.wrong) : 0,
  meanBeliefAgeWhenRight: r.trulyEmpty ? Math.round(r.ageWhenRight / r.trulyEmpty) : 0,
}]));
const result = { seed, days, rules: w.settings.rulesVersion, sampledEvery: 100, summary };
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result));
