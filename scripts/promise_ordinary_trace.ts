// Reproduce the fixed observed ordinary reporting attempts; no controller, changed needs or new seed search.
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
const seed=process.argv.slice(2).filter(a=>a!=='--')[0]??'river',until=seed==='river'?5300:3400,w=createWorld({...currentWorldSettings('normal',seed,{immigration:false}),rulesVersion:80});
const activities=new Set<number>(),trace:any[]=[];
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='socialize'&&a.data.purpose==='report'){activities.add(a.id);trace.push({event:'start',tick:w.tick,person:p.id,name:p.name,activity:a.id,data:structuredClone(a.data),x:p.x,y:p.y});}},onActivityEnd:(p,a,outcome,detail)=>{if(activities.has(a.id))trace.push({event:'end',tick:w.tick,person:p.id,activity:a.id,outcome,detail,interaction:p.lastInteraction,x:p.x,y:p.y});}};
const seen=new Set<string>();while(w.tick<until){for(const c of w.conversations)if(c.purpose==='report'){const key=c.id+':'+c.phase;if(!seen.has(key)){seen.add(key);trace.push({event:'conversation',tick:w.tick,conversation:structuredClone(c)});}}stepWorld(w);}
console.log(JSON.stringify({seed,rules:80,until,trace,conserved:conservationReport(w).ok},null,2));
