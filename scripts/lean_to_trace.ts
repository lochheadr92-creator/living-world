import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';

const rulesVersion = Number(process.argv[2]);
const days = Number(process.argv[3] ?? 15);
const w = createWorld({ ...currentWorldSettings('normal', 'aspen', { immigration: true }), rulesVersion });
let obsoleteRepairs = 0, obsoleteDeposits = 0, cleared = 0;
const obsolete = (id: number) => {
  const b = w.byId.get(id);
  if (b?.ent !== 'building' || b.type !== 'lean_to') return false;
  const hh = w.households.find(h => h.id === b.hhId);
  const home = hh && w.byId.get(hh.homeId);
  return home?.ent === 'building' && (home.type === 'house' || home.type === 'hut');
};
w.hooks = {
  onActivityStart(_p, a) {
    if (a.kind !== 'repair' && a.kind !== 'deposit') return;
    if (obsolete(a.targetId)) {
      if (a.kind === 'repair') obsoleteRepairs++;
      else obsoleteDeposits++;
    }
  },
  onActivityEnd(p, a, outcome, detail) {
    if (!a.data.clearLeanTo) return;
    const removed = outcome === 'success' && !w.byId.has(a.targetId);
    if (removed) cleared++;
    console.log(JSON.stringify({ tick: w.tick, person: p.name, shelter: a.targetId, outcome, detail, moved: a.cycle, removed }));
  },
};
for (let i = 0; i < days * DAY; i++) stepWorld(w);
console.log(JSON.stringify({ seed: 'aspen', rulesVersion, days, obsoleteRepairs, obsoleteDeposits, cleared,
  remainingObsolete: w.buildings.filter(b => obsolete(b.id)).map(b => b.id),
  conservation: conservationReport(w).ok }));
