// ORDINARY occurrence (hooks only): hand-overs that fail "they had no room to carry it" at rules >= 157 (so the recipient is
// not already holding food: a real full pack), with the recipient's pack, hunger and stage, and whether they die within 3000
// ticks. Large profile, arrivals on, harsh off. Usage: vite-node <this> <seed> <rules> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,weightOf} from '../../src/sim/economy';
import {carryCap,stageOf} from '../../src/sim/people';
import {DAY} from '../../src/sim/constants';
import type {Person} from '../../src/sim/types';
const [seed='life-stages-6',rules='158',days='30',out='noroom.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('large',seed),rulesVersion:Number(rules)});
const byId=(id:number)=>w.persons.find(p=>p.id===id);
const rows:any[]=[];const count:Record<string,number>={};const inc=(k:string)=>{count[k]=(count[k]??0)+1;};
const snap=(p:Person)=>({id:p.id,name:p.name,stage:stageOf(w,p),inv:{...p.inv},weight:weightOf(p.inv),cap:carryCap(w,p),hunger:Math.round(p.needs.hunger)});
w.hooks={onActivityEnd(p,a,outcome,detail){
 if(a.kind!=='give')return;inc(`give(${a.data.mode??'give'}):${outcome}`);
 if(outcome==='failed'&&detail==='they had no room to carry it'){const to=byId(a.targetId);if(!to)return;
  rows.push({tick:w.tick,mode:a.data.mode??'give',giver:snap(p),to:snap(to),sameHh:p.hhId===to.hhId,items:a.data.items,died:null});}}};
const end=Number(days)*DAY;while(w.tick<end)stepWorld(w);delete w.hooks;
for(const r of rows){const d=w.deceased.find(x=>x.id===r.to.id);r.died=d&&d.tick-r.tick<=3000&&d.tick>=r.tick?{tick:d.tick,cause:d.cause}:null;}
const res={seed,rules:Number(rules),days:Number(days),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,count,noRoomFailures:rows.length,starvingRecipients:rows.filter(r=>r.to.hunger<30).length,diedWithin3000:rows.filter(r=>r.died).length,rows:rows.slice(0,60)};
writeFileSync(out,JSON.stringify(res,null,1));console.log(JSON.stringify({seed,rules,conserved:res.conserved,alive:res.alive,noRoom:rows.length,starving:res.starvingRecipients,died:res.diedWithin3000,count}));
