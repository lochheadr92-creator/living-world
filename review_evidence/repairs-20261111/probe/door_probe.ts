// DIAGNOSTIC: step an ordinary world to a tick and report every home whose door tile is not walkable, what sits on it, and who is inside.
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <seed> <tick>
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='meadow',tickS='57600']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const {isWalkable}=await from('src/sim/registry.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const target=Number(tickS);
const firstBlocked=new Map<number,number>();
while(w.tick<target){
 stepWorld(w);
 if(w.tick%100===0)for(const b of w.buildings){if(['hut','house'].includes(b.type)&&!isWalkable(w,b.doorX,b.doorY)&&!firstBlocked.has(b.id))firstBlocked.set(b.id,w.tick);}
}
for(const b of w.buildings){
 if(!['hut','house'].includes(b.type))continue;
 const ok=isWalkable(w,b.doorX,b.doorY);
 const occId=w.occ[b.doorY*w.W+b.doorX];const occ=w.byId.get(occId);
 const inside=w.persons.filter((p:any)=>p.alive&&p.indoors===b.id).map((p:any)=>`${p.name}(${p.activity?.kind??'none'}${p.activity?.blocked?' BLOCKED '+p.activity.blocked:''} T${p.needs.thirst.toFixed(0)} H${p.needs.hunger.toFixed(0)})`);
 if(!ok||inside.some(s=>s.includes('BLOCKED')))console.log(`${b.type} ${b.id} hh${b.hhId} door (${b.doorX},${b.doorY}) walkable=${ok} solid=${w.solid[b.doorY*w.W+b.doorX]} occ=${occ?occ.ent+' '+(occ.name??occ.type??'')+' #'+occ.id+(occ.ent==='grave'?' died '+occ.died:''):occId} firstBlocked=${firstBlocked.get(b.id)??'-'} inside=${inside.join('; ')}`);
}
const graves=w.graves.filter((g:any)=>w.buildings.some((b:any)=>['hut','house'].includes(b.type)&&b.doorX===g.x&&b.doorY===g.y));
console.log('graves on door tiles:',graves.map((g:any)=>`${g.name} died t${g.died} at (${g.x},${g.y})`).join('; ')||'none');
console.log('deceased:',w.deceased.map((d:any)=>`${d.name}@${d.tick}(${d.cause})`).join(', '));
