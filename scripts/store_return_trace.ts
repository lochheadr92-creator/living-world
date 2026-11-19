// Replay one control day. At actual store switches, regenerate offers at two positions on the same tick.
import { readFileSync, writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { ageYears } from '../src/sim/people';
import type { Person } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { argsOf, worldFromArgs } from './world_args';

const {opt} = argsOf(process.argv);
const {w, loaded} = worldFromArgs(opt);
const ref = JSON.parse(readFileSync(opt('reference',''), 'utf8'));
const start = w.tick, initialHash = hashWorld(w);
if (!loaded || w.settings.rulesVersion !== 257 || ref.initialHash !== initialHash) throw Error('Wrong control');
type Position = {x:number,y:number};
type Entry = [event:string,item:string,goal:string,dest?:number,source?:number,quantity?:number];
const instrument = globalThis as typeof globalThis & {__storeTrace?: (...event:Entry)=>void};
function offers(p:Person, position:Position, stores:number[], goods:string[]) {
  const steps:Entry[] = [];
  instrument.__storeTrace = (...e) => {
    if (goods.includes(e[1]) && (e[4] === undefined || stores.includes(e[4]))) steps.push(e);
  };
  try {
    const ctx = generateOptions(w, {...p, x:position.x, y:position.y}, false, true);
    const keys = [...new Set(ctx.options.filter(o=>o.kind==='withdraw' && stores.includes(o.targetId)).map(o=>o.key))];
    return {position, keys, steps};
  } finally { delete instrument.__storeTrace; }
}
const starts = new Map<number,Position>();
const presence = new Map<number,string>();
let switches = 0;
function observeSwitch(p:Person,a:NonNullable<Person['activity']>,b:NonNullable<Person['activity']>) {
  const oldKey = String(a.data.optKey), newKey = String(b.data.optKey);
  const stores = [a.targetId,b.targetId], goods = [...Object.keys(a.data.items??{}),...Object.keys(b.data.items??{})];
  const actual = offers(p,{x:p.x,y:p.y},stores,goods);
  if ((presence.get(a.id)==='present') !== actual.keys.includes(oldKey) || !actual.keys.includes(newKey)) throw Error('Option replay mismatch '+a.id);
  const departure = starts.get(a.id);
  return {person:p.id,tick:w.tick,oldAct:a.id,newAct:b.id,oldKey,newKey,oldGoal:a.goal,newGoal:b.goal,actual,
    atDeparture:departure && offers(p,departure,stores,goods)};
}
type Switch = ReturnType<typeof observeSwitch>;
const previous = new Map<number,Switch>();
const chains:{first:Switch,second:Switch}[] = [];
w.hooks = {
  onActivityStart(p,a){ if(a.kind==='withdraw') starts.set(a.id,{x:p.x,y:p.y}); },
  onTravelReview(_p,a,result){ if(a.kind==='withdraw') presence.set(a.id,result); },
  onTravelReviewSwitch(p,a,b,reason){
    if(reason!=='something better came up'||ageYears(w,p)<12||a.kind!=='withdraw'||b.kind!=='withdraw'||a.targetId===b.targetId) return;
    const event=observeSwitch(p,a,b), last=previous.get(p.id);
    if(last && last.newAct===a.id && last.oldKey.split(':')[1]===b.data.optKey?.toString().split(':')[1]) chains.push({first:last,second:event});
    switches++; previous.set(p.id,event);
  }
};
const days = Number(opt('days','1'));
if (!Number.isInteger(days) || days < 1 || days > 13) throw Error('Expected 1 to 13 days');
while(w.tick<start+days*DAY) {
  stepWorld(w);
  if (w.tick===start+DAY && hashWorld(w)!==ref.sampleDay.endHash) throw Error('First-day hash mismatch');
}
const endHash=hashWorld(w);
if(!conservationReport(w).ok) throw Error('Control replay failed '+endHash);
if(!chains.some(c=>c.first.actual.steps.length || c.second.actual.steps.length) && chains.length) throw Error('Missing planner instrumentation');
writeFileSync(opt('out',''),JSON.stringify({days,start,initialHash,endHash,switches,chains}));

