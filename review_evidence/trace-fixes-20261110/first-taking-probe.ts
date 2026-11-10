// Read-only: first tick at which an ordinary Normal world (arrivals on, current rules) holds a remembered taking (rules 188), the first from a pile, and any salvage line. <seed> <maxTicks>
import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='river',max='12000']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');const {currentWorldSettings}=await from('src/sim/profiles.ts');const {stepWorld}=await from('src/sim/world.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));let first=-1,firstPile=-1,salv=-1;const ex:string[]=[];
for(let i=0;i<Number(max);i++){stepWorld(w);
 for(const p of w.persons){const t=p.lastTaken;if(!t)continue;if(first<0){first=w.tick;ex.push(`${p.name}: Took ${t.what} from ${t.place}`);}if(t.pile&&firstPile<0){firstPile=w.tick;ex.push(`${p.name}: Took ${t.what} from ${t.place}`);}}
 if(salv<0)for(const q of w.civicProjects??[])for(const m of q.participants)if(m.salvaged?.length){salv=w.tick;ex.push(`salvaged: ${m.salvaged.join('; ')}`);}
}
console.log(JSON.stringify({seed,first,firstPile,salvage:salv,examples:ex}));
