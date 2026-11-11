// When does the first charcoal appear? The same staged world as tests/iron_chain_stall.test.ts ("adults who know a standing smithy
// and a kiln see charcoal made"): an ordinary Normal world without arrivals, a communal kiln and smithy beside the first home, two
// founders shown both and taught the charcoal procedure, fresh axes. A measurement, not a rule and not a test: it reports the day of
// the first charcoal for one seed at one rules version, up to a limit of days. That test's own comment records the same measurement
// at rules 105 and 106, when its window was last widened.
//   node node_modules/vite-node/dist/cli.mjs review_evidence/carrying-20261111/charcoal_window.ts -- <seed> <rules> [days=60]
import { createBuilding } from '../../src/sim/buildings';
import { DAY } from '../../src/sim/constants';
import { createWorld } from '../../src/sim/factory';
import { observe } from '../../src/sim/knowledge';
import { freshRunSettings, parseRunRules } from '../../src/sim/profiles';
import { mintTool } from '../../src/sim/tools';
import { stepWorld } from '../../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seed = args[0] ?? 'meadow';
const rules = Number(args[1] ?? 0);
const days = Number(args[2] ?? 60);
const w = createWorld(freshRunSettings(parseRunRules('rich'), 'normal', seed, { immigration: false }));
(w.settings as { rulesVersion?: number }).rulesVersion = rules;
const home = w.buildings.find((b) => b.type === 'hut' || b.type === 'lean_to') ?? w.buildings[0];
const hx = home?.x ?? 60, hy = home?.y ?? 60;
const kiln = createBuilding(w, 'kiln', hx + 3, hy + 5, 0);
const smithy = createBuilding(w, 'smithy', hx - 5, hy + 8, 0);
const pair = w.persons.filter((q) => q.alive).slice(0, 2);
for (const q of pair) {
  q.techniques = { charcoal: { source: 'initial', learned: w.tick, teacher: 0 } };
  observe(w, q, kiln);
  observe(w, q, smithy);
  const t = mintTool(w, 'axe', 0, q.hhId, q.id, q.inv, q.id, 'test equipment');
  t.wear = 0;
}
let first = -1;
for (let t = 0; t < DAY * days && first < 0; t++) {
  stepWorld(w);
  if (w.buildings.some((b) => (b.store?.items?.charcoal ?? 0) > 0) || w.persons.some((q) => (q.inv.charcoal ?? 0) > 0)) first = w.tick;
}
const alive = w.persons.filter((q) => q.alive).length;
console.log(JSON.stringify({ seed, rules, limitDays: days, firstCharcoalDay: first < 0 ? null : Math.round((first / DAY) * 10) / 10, pairAlive: pair.filter((q) => q.alive).length, peopleAlive: alive, kilnJob: kiln.ops?.job?.recipe ?? null }));
