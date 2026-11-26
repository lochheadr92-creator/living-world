import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { activityOccupation, OUTPUTS } from '../src/sim/occupation';
import { stageOf } from '../src/sim/people';
import { currentWorldSettings } from '../src/sim/profiles';
import type { ItemKind } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';

const [seed, rules, outputDir] = process.argv.slice(2);
if (!seed || !['276','277'].includes(rules) || !outputDir) {
  throw Error('Expected seed, rules (276 or 277), and an existing output directory');
}
const world = createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:Number(rules)});
const jobsByPerson = new Map<number,Map<string,number>>();
const bins: Record<string,number> = {};
const days = [];
let ended = 0, done = 0, switched = 0, stored = 0, bulk = 0, ownTradeStored = 0;

world.hooks = {
  onActivityEnd(person, activity, outcome, reason) {
    if (stageOf(world,person)==='child') return;
    const role = activityOccupation(person,activity);
    if (!role) return;
    ended++;
    if (reason==='something better came up') switched++;
    if (outcome!=='success' && !(outcome==='partial' && activity.cycle>0)) return;
    done++;
    const counts = jobsByPerson.get(person.id) ?? new Map<string,number>();
    counts.set(role,(counts.get(role)??0)+1);
    jobsByPerson.set(person.id,counts);
  },
  onTransfer(transfer) {
    if (transfer.reason!=='deposit' || !transfer.to.startsWith('building:')) return;
    const dest = world.byId.get(Number(transfer.to.split(':')[1]));
    if (dest?.ent!=='building') return;
    stored += transfer.n;
    bins[dest.type] = (bins[dest.type]??0) + transfer.n;
    const carrier = world.byId.get(Number(transfer.from.split(':')[1]));
    if (carrier?.ent!=='person') return;
    if (carrier.activity?.data.occupationStore) bulk += transfer.n;
    const title = carrier.occupation?.title;
    if (title && (OUTPUTS[title] as readonly ItemKind[]).includes(transfer.item)) ownTradeStored += transfer.n;
  },
};
for (let d=1;d<=12;d++) {
  for (let i=0;i<DAY;i++) stepWorld(world);
  if (!conservationReport(world).ok) throw Error('Conservation failed on day '+d);
  const eligible = world.persons.filter(p=>p.alive && stageOf(world,p)!=='child');
  const titles: Record<string,number> = {};
  for (const p of eligible) {
    const role = p.occupation?.title;
    if (role) titles[role] = (titles[role]??0)+1;
  }
  const shares = [];
  for (const counts of jobsByPerson.values()) {
    const values = [...counts.values()];
    const total = values.reduce((a,b)=>a+b,0);
    if (total>=3) shares.push(Math.max(...values)/total);
  }
  days.push({d, hash:hashWorld(world), ended, done, switched, stored, bulk, ownTradeStored,
    bins:{...bins}, dead:world.deceased.length, titles, eligible:eligible.length, workers:shares.length,
    meanPrimaryShare:shares.length ? shares.reduce((a,b)=>a+b,0)/shares.length : null});
  writeFileSync(join(outputDir,seed+'-'+rules+'.json'),JSON.stringify(days,null,1)+'\n');
}
