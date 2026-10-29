// Continue untouched old-rule worlds and observe the actual public-food transfer seam.
import {readFileSync,writeFileSync} from 'node:fs';
import {deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
const reports=[];
for(const seed of ['meadow','river','forest']){
 const w=deserializeWorld(readFileSync(`inhabitant_evidence/connections-natural-30-${seed}/final.json`,'utf8')),until=w.tick+3*DAY,uses:unknown[]=[];
 w.hooks={onTransfer(t){if(t.reason!=='eat from store'||!t.from.startsWith('building:')||!t.to.startsWith('person:'))return;
  const b=w.buildings.find(b=>b.id===Number(t.from.slice(9))),p=w.persons.find(p=>p.id===Number(t.to.slice(7)));
  if(b?.hhId===0&&b.type==='storehouse')uses.push({tick:w.tick,person:p?.id,name:p?.name,...t,attributed:!!p?.civicOutcomes?.some(m=>m.success&&m.buildingId===b.id)});
 }};
 while(w.tick<until)stepWorld(w);
 reports.push({seed,fromDay:30,toDay:33,uses,conservation:conservationReport(w)});
}
writeFileSync('connection-civic-food-diagnosis.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(r=>({...r,uses:r.uses.length,attributed:r.uses.filter((u:any)=>u.attributed).length}))));
