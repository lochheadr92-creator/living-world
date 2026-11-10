// DIAGNOSTIC: first tick at which an ordinary world's feed carries "marked out a storehouse for shared use" (rules 191), sampled every 25 ticks.
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='river',days='14']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const {DAY}=await from('src/sim/constants.ts');
const w:any=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:191});
let first=-1,firstOld=-1;
while(w.tick<Number(days)*DAY){
 stepWorld(w);
 if(w.tick%25===0){
  if(first<0&&w.events.some((e:any)=>e.kind==='build'&&e.text.includes('marked out a storehouse for shared use')))first=w.tick;
  if(firstOld<0&&w.events.some((e:any)=>e.kind==='build'&&/marked out a storehouse for the .* household/.test(e.text)))firstOld=w.tick;
  if(first>=0)break;
 }
}
console.log(`${seed}: first shared-use storehouse line at tick ${first} (household-named storehouse line at ${firstOld})`);
