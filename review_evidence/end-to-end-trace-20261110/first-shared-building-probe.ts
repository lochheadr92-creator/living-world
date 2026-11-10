// Read-only: first tick at which an ordinary Normal world (arrivals on, current rules) holds a building whose builders are all recorded (rules 186). <seed> <maxTicks>
import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='fern',max='30000']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');const {currentWorldSettings}=await from('src/sim/profiles.ts');const {stepWorld}=await from('src/sim/world.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));let first=-1;
for(let i=0;i<Number(max);i++){stepWorld(w);const b=w.buildings.find((x:any)=>x.builtAll);if(b){first=w.tick;console.log(JSON.stringify({seed,first,type:b.type,builtBy:b.builtBy.map((id:number)=>w.byId.get(id)?.name)}));break;}}
if(first<0)console.log(JSON.stringify({seed,first}));
