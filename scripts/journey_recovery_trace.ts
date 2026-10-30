import {journeyRecoveryScene,failJourneySource} from '../tests/helpers/journey_recovery';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
const f=journeyRecoveryScene(),i=failJourneySource(f),events:any[]=[];
f.w.hooks={onActivityStart:(p,a)=>events.push({tick:f.w.tick,kind:a.kind,key:a.data.optKey,inv:{...p.inv},needs:{...p.needs}}),onActivityEnd:(_p,a,outcome,detail)=>events.push({tick:f.w.tick,kind:a.kind,outcome,detail,cycle:a.cycle})};
for(let n=0;n<3600;n++)stepWorld(f.w);
console.log(JSON.stringify({events,trip:i,site:{delivered:f.target.delivered,used:f.target.used,work:f.target.work},conserved:conservationReport(f.w).ok},null,2));
