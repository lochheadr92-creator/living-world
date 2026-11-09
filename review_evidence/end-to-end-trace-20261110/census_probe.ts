// Read-only census of one ordinary world (Normal, rich, arrivals on, current rules): steps it and writes what happened, to find multi-person, multi-week outcomes worth tracing.
// Run with the CLEAN pinned worktree as the working directory; the simulation is imported from process.cwd(), not from where this file sits.
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <seed> <days> <out.json>
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='aspen',days='45',out='census.json']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const {DAY}=await from('src/sim/constants.ts');
const {CURRENT_RULES_VERSION}=await from('src/sim/rulesversion.ts');
const {conservationReport}=await from('src/sim/economy.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const popByDay:number[]=[];const events:any[]=[];const seen=new Set<number>();
while(w.tick<Number(days)*DAY){
 stepWorld(w);
 if(w.tick%200===0)for(const e of w.events??[])if(e.id!==undefined&&!seen.has(e.id)){seen.add(e.id);events.push({id:e.id,tick:e.tick,kind:e.kind,text:e.text,ids:e.ids});}
 if(w.tick%DAY===0)popByDay.push(w.persons.filter((p:any)=>p.alive).length);
}
const name=(id:number)=>{const e=w.byId.get(id);return e?.ent==='person'?e.name:`#${id}`;};
const res={
 seed,days:Number(days),rules:CURRENT_RULES_VERSION,ticks:w.tick,conserved:conservationReport(w).ok,popByDay,
 people:w.persons.map((p:any)=>({id:p.id,name:p.name,alive:p.alive,age:Math.floor(p.age??0),hh:p.hhId,partner:p.partnerId||0,log:(p.log??[]).length})),
 deceased:(w.deceased??[]).map((d:any)=>({name:d.name,tick:d.tick,cause:d.cause,age:d.age})),
 households:w.households.map((h:any)=>({id:h.id,name:h.name,formed:h.formed,members:h.members,home:h.homeId,township:h.townshipId,relocations:h.relocations})),
 townships:w.townships??[],
 buildings:w.buildings.map((b:any)=>({id:b.id,type:b.type,hh:b.hhId,x:b.x,y:b.y,built:b.built,builtBy:(b.builtBy??[]).map(name)})),
 openSites:w.sites.map((s:any)=>({id:s.id,type:s.type,hh:s.hhId,created:s.createdTick})),
 civicProjects:(w.civicProjects??[]).map((q:any)=>({id:q.id,type:q.type??'storehouse',status:q.status,proposed:q.proposed,ended:q.ended,organiser:name(q.organiserId),outcome:q.outcome,reason:q.reason,participants:q.participants.map((m:any)=>({who:name(m.personId),status:m.status,work:m.work,materials:m.materials}))})),
 relocations:w.relocations??[],
 chronicle:w.chronicle??[],
 events,
};
writeFileSync(out,JSON.stringify(res));
console.log(`${seed}: day ${days} alive ${popByDay.at(-1)} deaths ${res.deceased.length} households ${res.households.length} buildings ${res.buildings.length} projects ${res.civicProjects.length} events ${events.length} conserved ${res.conserved}`);
