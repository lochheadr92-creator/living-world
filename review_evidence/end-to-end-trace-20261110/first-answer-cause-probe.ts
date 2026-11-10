// Read-only: first tick at which an ordinary Normal world (arrivals on, current rules) holds a help-build answer with its cause (rules 187). <seed> <maxTicks>
import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='gen-2',max='20000']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');const {currentWorldSettings}=await from('src/sim/profiles.ts');const {stepWorld}=await from('src/sim/world.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));let first=-1;const seen:string[]=[];
for(let i=0;i<Number(max);i++){stepWorld(w);for(const q of w.civicProjects??[])for(const m of q.participants)if(m.answerWhy&&!seen.includes(m.personId+m.answerWhy)){seen.push(m.personId+m.answerWhy);if(first<0)first=w.tick;console.log(JSON.stringify({tick:w.tick,who:w.byId.get(m.personId)?.name,status:m.status,reason:m.reason,answerWhy:m.answerWhy}));}}
console.log(JSON.stringify({seed,first,answers:seen.length}));
