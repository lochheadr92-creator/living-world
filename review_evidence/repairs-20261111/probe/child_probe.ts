// DIAGNOSTIC: follow one household in an ordinary world over a window; who knows the child is starving, what the home holds, what the adults do.
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <seed> <childName> <fromTick> <toTick> [every]
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='gen-2',childName='Ivo',fromS='64800',toS='70600',everyS='200']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const {foodUnits}=await from('src/sim/economy.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const fromT=Number(fromS),toT=Number(toS),every=Number(everyS);
const hyp=(a:number,b:number)=>Math.hypot(a,b).toFixed(1);
while(w.tick<toT){
 stepWorld(w);
 if(w.tick>=fromT&&w.tick%every===0){
  const c=w.persons.find((p:any)=>p.name===childName);
  if(!c){console.log('t'+w.tick+' child gone');break;}
  const hh=w.households.find((h:any)=>h.id===c.hhId);const home=hh?.homeId?w.byId.get(hh.homeId):null;
  const homeFood=home?foodUnits(home.store.items):-1;
  const cb=home?c.beliefs[home.id]:null;
  console.log(`t${w.tick} d${(w.tick/2400).toFixed(2)} ${c.name} H${c.needs.hunger.toFixed(0)} T${c.needs.thirst.toFixed(0)} hp${c.health.toFixed(0)} at ${c.x.toFixed(0)},${c.y.toFixed(0)} indoors=${!!c.indoors} inv=${JSON.stringify(c.inv)} act=${c.activity?c.activity.kind+':'+c.activity.label+'['+c.activity.phase+']':'-'} | home ${home?.type}#${home?.id} food=${homeFood} dist=${home?hyp(home.x+1-c.x,home.y+1-c.y):'-'} believes=${cb?foodUnits(cb.items??{})+' seen '+(w.tick-cb.seen)+' ago':'none'} | because=${c.lastDecision?.because}`);
  for(const id of hh?.members??[]){const q=w.byId.get(id);if(!q||q===c||!q.alive)continue;
   const sight=q.seen?.find((s:any)=>s.id===c.id);const rel=q.relations?.[c.id];
   const qb=home?q.beliefs[home.id]:null;
   console.log(`    ${q.name}(${Math.floor(q.age)}) H${q.needs.hunger.toFixed(0)} at ${q.x.toFixed(0)},${q.y.toFixed(0)} indoors=${!!q.indoors} d(child)=${hyp(q.x-c.x,q.y-c.y)} inv=${JSON.stringify(q.inv)} sees child=${sight?JSON.stringify(sight.signs??sight.tags??sight.state??'yes'):'no'} believesHomeFood=${qb?foodUnits(qb.items??{}):'none'} act=${q.activity?q.activity.kind+':'+q.activity.label+(q.activity.blocked?' BLOCKED '+q.activity.blocked:''):'-'} | ${q.lastDecision?.because}`);
   const bl=(q.lastDecision?.blocked??[]).filter((o:any)=>/food|feed|care|bring|hand|Ivo|child/i.test(o.label+(o.reason??''))).slice(0,4).map((o:any)=>o.label+': '+(o.reason??''));if(bl.length)console.log('        blocked: '+bl.join(' | '));
  }
 }
}
