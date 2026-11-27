import { readFileSync, writeFileSync } from 'node:fs';
import { createWorld } from './src/sim/factory';
import { currentWorldSettings } from './src/sim/profiles';
import { stepWorld, hashWorld } from './src/sim/world';
import { conservationReport, totalItems } from './src/sim/economy';
import { DAY } from './src/sim/constants';
import { setGrainBoost } from './src/sim/plenty';
import type { Activity, Person, World } from './src/sim/types';

const [seed, version, arm, output] = process.argv.slice(2);
setGrainBoost(arm !== 'base');
globalThis.fieldTarget = ({wild:21,t18:18,t24:24})[arm] ?? 0;
const world = createWorld({...currentWorldSettings('normal', seed, {immigration:true}), rulesVersion:Number(version)});
const items = ['grain','seeds','flour','bread','stock_feed'];
type Counts = Record<string, number>;
const add = (counts:Counts, key:string, n:number) => { counts[key] = (counts[key] ?? 0) + n; };
const ledger:Record<string,Counts> = Object.fromEntries(items.map(k=>[k,{}]));
const routes:Record<string,Counts> = Object.fromEntries(items.map(k=>[k,{}]));
const labour:Record<string,{travel:number,work:number,distance:number}> = {};
const seen = new Set<string>();
let harvestVisits=0, partialVisits=0, repeatVisits=0;
function stock() {
  const total = totalItems(world);
  const result = {};
  for (const k of items) {
    const field = world.plots.reduce((s,p)=>s+(k==='grain'?p.stock:k==='seeds'?p.seedStock:0),0);
    const wild = world.sources.reduce((s,v)=>s+(v.item===k?v.amount:0),0);
    const stores = world.buildings.reduce((s,b)=>s+(b.store.items[k]??0),0);
    const packs = world.persons.reduce((s,p)=>s+(p.alive?p.inv[k]??0:0),0);
    result[k]={total:total[k]??0,field,wild,stores,packs,other:(total[k]??0)-field-wild-stores-packs};
  }
  return result;
}
function category(w:World, a:Activity) {
  if (['plant','till','tend','harvest'].includes(a.kind)) return a.kind;
  if (a.kind==='gather' && w.byId.get(a.targetId)?.item==='grain') return 'wild gather';
  if (a.data.op==='mix_feed') return 'mix feed';
  if (a.kind==='operate' && String(a.data.running ?? a.data.recipe).startsWith('mill_flour')) return 'mill';
  if (['deposit','withdraw','haul','cart_haul'].includes(a.kind) && a.data.items?.grain>0) return 'grain transport';
  return 'other';
}
globalThis.grainLabour = (w:World,p:Person,a:Activity,phase:'travel'|'work',distance:number) => {
  const key = category(w,a);
  const row = labour[key] ??= {travel:0,work:0,distance:0};
  row[phase]++; row.distance+=distance;
};
globalThis.grainLedger = (prefix:string,k:string,why:string,n:number) => {
  if(ledger[k]) add(ledger[k],prefix+why,n);
};
world.hooks={...world.hooks,onTransfer(e) {
  if(!routes[e.item]) return;
  add(routes[e.item],e.from.split(':')[0]+'>'+e.to.split(':')[0]+' | '+e.reason,e.n);
  if(e.item==='grain' && e.reason==='harvest') {
    const plot=world.byId.get(Number(e.from.split(':')[1]));
    const crop=plot.id+':'+plot.ripeTick;
    harvestVisits++;
    if(plot.stock>0) partialVisits++;
    if(seen.has(crop)) repeatVisits++;
    seen.add(crop);
  }
}};
const opening=stock(), days=[];
for(let day=1;day<=12;day++){
  for(let t=0;t<DAY;t++) stepWorld(world);
  const ending=stock();
  const residuals=Object.fromEntries(items.map(k=>[k,opening[k].total+
    Object.entries(ledger[k]).reduce((s,[reason,n])=>s+(reason.startsWith('+')?n:-n),0)-ending[k].total]));
  const fieldResidual=opening.grain.field+(ledger.grain['+crop growth']??0)-(routes.grain['plot>person | harvest']??0)-
    (ledger.grain['xcrop left to rot']??0)-ending.grain.field;
  days.push({day,hash:hashWorld(world),conserved:conservationReport(world).ok,residuals,fieldResidual});
}
writeFileSync(output,JSON.stringify({seed,version,arm,source:readFileSync('source.sha256','utf8'),immigration:world.settings.immigration,
 opening,closing:stock(),ledger,routes,labour,harvestVisits,partialVisits,repeatVisits,days},null,2)+'\n');

