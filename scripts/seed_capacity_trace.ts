// Bounded diagnosis from an existing, unmodified ordinary save. Observations never steer decisions.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {generateOptions} from '../src/sim/decision';
import {conservationReport,invRoom,weightOf} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {stepWorld} from '../src/sim/world';
import {isHomeType} from '../src/sim/constants';
const [input,out]=process.argv.slice(2);if(!input||!out)throw new Error('input and output required');
const raw=readFileSync(input,'utf8'),w=deserializeWorld(raw),twin=deserializeWorld(raw),until=w.tick+2400;
const ids=new Set(w.persons.filter(p=>p.alive&&p.intentions.some(i=>i.kind==='tool'&&i.makes==='hammer')).map(p=>p.id));
const samples:unknown[]=[],starts:unknown[]=[];let pure=true;
w.hooks={onActivityStart(p,a){if(ids.has(p.id))starts.push({tick:w.tick,person:p.name,kind:a.kind,label:a.label,goal:a.goal,items:a.data.items});}};
while(w.tick<until){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons.filter(p=>ids.has(p.id)&&p.alive)){
   const ctx=generateOptions(w,p,true,true);
   samples.push({tick:w.tick,person:p.name,pack:{...p.inv},weight:weightOf(p.inv),cap:carryCap(w,p),stoneRoom:invRoom(w,p,'stone'),needs:{...p.needs},
    activeHammer:p.intentions.some(i=>i.kind==='tool'&&i.makes==='hammer'&&i.status==='active'),
    rememberedHomes:Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.hh===p.hhId&&isHomeType(b.btype)).map(b=>({id:b.id,type:b.btype,seen:b.seen,stock:{...b.items}})),
    rememberedPlots:Object.values(p.beliefs).filter(b=>b.kind==='plot'&&b.hh===p.hhId).map(b=>({id:b.id,state:b.state})),
    materialOptions:ctx.options.filter(o=>o.yields==='stone'||o.key.startsWith('leave:')||o.key.startsWith('seed_stash:')||o.key==='craft:hammer').map(o=>({key:o.key,label:o.label,util:o.util})),
    activity:p.activity?.label});
  }
  pure&&=serializeWorld(w)===before;
 }
 stepWorld(w);stepWorld(twin);
}
const report={input,sha256:createHash('sha256').update(raw).digest('hex'),rules:w.settings.rulesVersion,from:until-2400,to:w.tick,pure,exactContinuation:serializeWorld(w)===serializeWorld(twin),conservation:conservationReport(w),samples,starts};
writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({pure,exactContinuation:report.exactContinuation,conserved:report.conservation.ok,samples:samples.length,starts:starts.length}));
