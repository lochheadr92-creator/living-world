import { conservationReport } from '../src/sim/economy';
import { stageOf } from '../src/sim/people';
import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 40);
const harsh = process.argv[4] === 'harsh';
const w = createWorld({ ...defaultSettings(seed), harsh });
const t0 = Date.now();
for (let d = 1; d <= days; d++) {
  for (let i = 0; i < 2400; i++) stepWorld(w);
  if (d % 5 === 0) {
    const r = conservationReport(w);
    let beliefs = 0; for (const p of w.persons) beliefs += Object.keys(p.beliefs).length;
    const mem = process.memoryUsage().heapUsed / 1e6;
    const ps = w.persons;
    console.log(`day ${String(d).padStart(2)} pop ${ps.length} (kids ${ps.filter(p => stageOf(w, p) === 'child').length}, elders ${ps.filter(p => stageOf(w, p) === 'elder').length}) hh ${w.households.length} bld ${w.buildings.length} sites ${w.sites.length} plots ${w.plots.length} piles ${w.piles.length} graves ${w.graves.length} trees ${w.stats.trees} beliefs ${beliefs} req ${w.requests.length} ev ${w.events.length} heap ${mem.toFixed(0)}MB ledger ${r.ok ? 'ok' : 'MISMATCH'} ${((Date.now() - t0) / (d * 2400)).toFixed(2)}ms/tick`);
  }
}
console.log('deaths:', w.deceased.map(d => `${d.name}(${d.cause},${d.age})`).join(', ') || 'none');
