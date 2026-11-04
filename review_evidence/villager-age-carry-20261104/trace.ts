import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {carryCap} from '../../src/sim/people';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {writeFileSync} from 'node:fs';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {weightOf,roomFor,conservationReport} from '../../src/sim/economy';
const w=createWorld({...currentWorldSettings('normal','meadow'),rulesVersion:154});
const twin=deserializeWorld(serializeWorld(w));
const rows:any[]=[];
const snap=(event:string)=>rows.push({event,tick:w.tick,people:w.persons.filter(p=>p.name==='Abel'||p.name==='Bea').map(p=>({id:p.id,name:p.name,inventory:{...p.inv},weight:weightOf(p.inv),berryRoom:roomFor(p.inv,carryCap(w,p),'berries'),cap:carryCap(w,p),needs:{...p.needs},intentions:JSON.parse(JSON.stringify(p.intentions)),commitments:JSON.parse(JSON.stringify(p.commitments)),homes:Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.hh===p.hhId),activity:p.activity?JSON.parse(JSON.stringify(p.activity)):null,log:JSON.parse(JSON.stringify(p.log)),options:rankOptions(generateOptions(w,p,true,true)).slice(0,12).map(o=>({key:o.key,label:o.label,kind:o.kind,tag:o.tag}))}))});
w.hooks={onActivityStart:(p,a)=>{if(p.name==='Abel'&&(a.kind==='gather'||a.goal.includes('Bea')))snap('start '+a.label)},onActivityEnd:(p,a,result,detail)=>{if(p.name==='Abel'&&(a.goal.includes('Bea')||a.kind==='gather'))snap('end '+a.label+' '+result+' '+detail)}};
for(let i=0;i<3450;i++){if(w.tick>=3280&&w.tick<=3420&&w.tick%5===0)snap('sample');stepWorld(w);stepWorld(twin);}
const equal=serializeWorld(w)===serializeWorld(twin),conserved=conservationReport(w).ok;
writeFileSync('review_evidence/villager-age-carry-20261104/trace-verified.json',JSON.stringify({rules:154,equal,conserved,rows},null,2));
console.log(JSON.stringify({rules:154,equal,conserved,offer:rows.find(r=>r.event==='start Offer berries to Bea')?.people.map((p:any)=>({name:p.name,inventory:p.inventory,weight:p.weight,cap:p.cap,berryRoom:p.berryRoom})),receipt:rows.flatMap(r=>r.people.flatMap((p:any)=>p.log)).find(l=>l.text.includes('No goods changed'))},null,2));
if(!equal||!conserved)throw Error('Observer equality or conservation failed');
