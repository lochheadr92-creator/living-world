// DIAGNOSTIC: over an ordinary 45-day world, every grave that lands on a home's door tile, who was inside at the time, who was later
// refused at that door, and what became of the people inside.
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <seed> <days>
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='meadow',days='45']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const {DAY}=await from('src/sim/constants.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const seenGraves=new Set<number>();
const incidents:any[]=[];
const refused=new Map<string,number>();
while(w.tick<Number(days)*DAY){
 stepWorld(w);
 for(const g of w.graves){
  if(seenGraves.has(g.id))continue;seenGraves.add(g.id);
  const b=w.buildings.find((b:any)=>['hut','house'].includes(b.type)&&b.doorX===g.x&&b.doorY===g.y);
  if(!b)continue;
  const inside=w.persons.filter((p:any)=>p.alive&&p.indoors===b.id).map((p:any)=>({id:p.id,name:p.name}));
  incidents.push({tick:g.died,day:+(g.died/DAY).toFixed(2),who:g.name,building:b.id,type:b.type,hh:b.hhId,members:w.households.find((h:any)=>h.id===b.hhId)?.members?.length,inside});
 }
 if(w.tick%50===0)for(const p of w.persons){const bl=p.activity?.blocked;if(bl==='home exit is blocked'||bl==='home entrance is blocked'){const k=p.id+'|'+bl;if(!refused.has(k))refused.set(k,w.tick);}}
}
for(const inc of incidents){
 inc.fate=inc.inside.map((m:any)=>{const d=w.deceased.find((d:any)=>d.id===m.id);const alive=w.persons.find((p:any)=>p.id===m.id&&p.alive);return `${m.name}: ${d?`died t${d.tick} (${d.cause})`:alive?`alive day45${alive.indoors===inc.building?' still inside':''}`:'gone'}`;});
}
const exits=[...refused.entries()].filter(([k])=>k.endsWith('exit is blocked')).length;
const entries=[...refused.entries()].filter(([k])=>k.endsWith('entrance is blocked')).length;
console.log(JSON.stringify({seed,doorGraves:incidents,peopleRefusedExit:exits,peopleRefusedEntry:entries,deaths:w.deceased.length,alive:w.persons.filter((p:any)=>p.alive).length}));
