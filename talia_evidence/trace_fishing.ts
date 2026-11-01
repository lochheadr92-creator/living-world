import {readFileSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {stepWorld} from '../src/sim/world';
import {runReplay} from '../src/agent/run';
const t=JSON.parse(readFileSync(process.argv[2]??'talia_evidence/life119-transcript.json','utf8'));
const w=createWorld(t.header.settings);while(w.tick<t.header.startTick)stepWorld(w);
const events:any[]=[];
w.hooks={onActivityEnd(p,a,outcome,detail){if(p.id===1029&&w.tick>=7330&&w.tick<=7634)events.push({tick:w.tick,kind:a.kind,cycle:a.cycle,amount:a.amount,outcome,detail,inventory:structuredClone(p.inv),data:structuredClone(a.data)});}};
runReplay(w,t);writeFileSync('talia_evidence/fishing-trace.json',JSON.stringify(events,null,2));console.log(JSON.stringify(events));
