// DIAGNOSTIC: at a tick, print one person's active commitments with their requests, to see how two alike promises arose.
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <seed> <name> <tick>
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='gen-1',name='Una',tickS='27000']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const w:any=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:188});
const target=Number(tickS);
const seen=new Set<number>();
while(w.tick<target){
 stepWorld(w);
 if(w.tick%100===0){const p=w.persons.find((q:any)=>q.name===name);if(!p)break;
  for(const c of p.commitments){if(c.status!=='active'||seen.has(c.id))continue;seen.add(c.id);const r=w.requests.find((x:any)=>x.id===c.requestId);
   console.log(`t${w.tick} ${name} commitment#${c.id} ${c.kind} ${c.item}x${c.amount} to ${c.to} dest ${c.destKind}#${c.destId} made ${c.made} deadline ${c.deadline} | request#${r?.id} kind=${r?.kind} from=${r?.from} to=${r?.to} status=${r?.status} note="${r?.note??''}" planId=${r?.planId??''} amount=${r?.amount}`);}}
}
const p=w.persons.find((q:any)=>q.name===name);
console.log('final active:',JSON.stringify((p?.commitments??[]).filter((c:any)=>c.status==='active').map((c:any)=>[c.id,c.kind,c.item,c.to,c.destId,c.requestId,c.delivered])));
