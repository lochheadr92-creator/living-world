// DIAGNOSTIC: first tick at which somebody's recorded reason carries the rules-192 why-now text, and when the first storehouse site appears.
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='river',days='14']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const {DAY}=await from('src/sim/constants.ts');
const w:any=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:192});
let first=-1,firstSite=-1;
while(w.tick<Number(days)*DAY){
 stepWorld(w);
 if(w.tick%25===0){
  if(first<0&&w.persons.some((p:any)=>p.lastDecision?.because?.includes('I know of no store')))first=w.tick;
  if(firstSite<0&&w.sites.some((s:any)=>s.type==='storehouse'))firstSite=w.tick;
  if(first>=0&&firstSite>=0)break;
 }
}
console.log(`${seed}: first why-now reason at tick ${first}; first storehouse site at ${firstSite}`);
