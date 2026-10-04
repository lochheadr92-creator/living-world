import { conservationReport } from '../src/sim/economy';
import { stageOf } from '../src/sim/people';
import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
const seeds = (process.argv[2] ?? 'alpha,beta,gamma,delta,epsilon').split(',');
const days = Number(process.argv[3] ?? 4);
const harsh = process.argv[4] === 'harsh';
for (const seed of seeds) {
  const t0 = Date.now();
  const w = createWorld({ ...defaultSettings(seed), harsh });
  const pop0 = w.persons.length;
  let bad = '';
  for (let i = 0; i < days * 2400; i++) {
    stepWorld(w);
    if (i % 600 === 0) {
      const r = conservationReport(w);
      if (!r.ok) { bad = `LEDGER MISMATCH at ${i}: ${JSON.stringify(r.diffs)}`; break; }
    }
  }
  const ps = w.persons;
  const kinds: Record<string, number> = {};
  for (const e of w.events) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  console.log(`${seed.padEnd(8)} ${harsh ? 'HARSH' : '     '} pop ${pop0}->${ps.length} (kids ${ps.filter((p) => stageOf(w, p) === 'child').length}) deaths [${w.deceased.map((d) => d.name + ':' + d.cause).join(', ')}] bld ${w.buildings.length} plots ${w.plots.length} sources ${w.sources.length} events ${JSON.stringify(kinds)} ${((Date.now() - t0) / (days * 2400)).toFixed(2)}ms/tick ${bad}`);
}
