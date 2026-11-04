// P1.2 measurement (rules 154): wasted trips to told food places per 100 food trips.
// Usage: vite-node scripts/hearsay_trips.ts <seed> <arm> <out.json> [forkDays=5] [days=20]
// Arms: control | nudge:N | rich-no-confidence. Every arm forks the same ordinary Normal arrivals-on world at the same
// tick; a nudge changes one random draw (the noise floor), the removal changes only rules-154 weighing.
// Observation only: hooks record activity starts/ends; nothing is written to the world.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {tellerDoubt} from '../src/sim/teller_confidence';
import {parseIntervention} from './lab/lab';

const [seed='river',arm='control',out='hearsay.json',forkArg='5',daysArg='20']=process.argv.slice(2);
const FOOD=new Set(['berry_bush','fruit_tree','wild_grain','fish_spot']);
const w=createWorld(currentWorldSettings('normal',seed));
while(w.tick<Number(forkArg)*DAY)stepWorld(w);
const intervention=parseIntervention(arm),restore=intervention.install?.(),applied=intervention.apply?.(w);
const open=new Map<number,{told:boolean;doubted:boolean}>();
const c={foodTrips:0,toldTrips:0,doubtedTrips:0,oldToldTrips:0,wastedTold:0,wastedDoubted:0,wastedFirstHand:0};
w.hooks={
 onActivityStart(p,a){
  if(a.kind!=='gather'||!FOOD.has(String(a.data.stype??p.beliefs[a.targetId]?.kind)))return;
  const b=p.beliefs[a.targetId];if(!b)return;
  const told=b.src==='told',doubted=told&&!!b.from&&tellerDoubt(p,b.from)>0;
  c.foodTrips++;if(told)c.toldTrips++;if(doubted)c.doubtedTrips++;if(told&&w.tick-b.seen>1800)c.oldToldTrips++;
  open.set(a.id,{told,doubted});
 },
 onActivityEnd(_p,a,outcome){
  const t=open.get(a.id);if(!t)return;open.delete(a.id);
  if(outcome!=='failed'||a.cycle>0)return;
  if(t.told)c.wastedTold++;else c.wastedFirstHand++;if(t.doubted)c.wastedDoubted++;
 },
};
const end=w.tick+Number(daysArg)*DAY;
while(w.tick<end)stepWorld(w);
delete w.hooks;restore?.();
const alive=w.persons.filter(p=>p.alive).length,G=c.foodTrips?100*c.wastedTold/c.foodTrips:0;
const report={seed,arm,applied:applied??null,rules:w.settings.rulesVersion,forkDay:Number(forkArg),days:Number(daysArg),tick:w.tick,alive,conserved:conservationReport(w).ok,counts:c,G};
writeFileSync(out,JSON.stringify(report,null,1));console.log(JSON.stringify(report));
