import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
const out=process.argv.at(-1)!;if(existsSync(out))throw Error('fresh output');mkdirSync(out,{recursive:true});
const w=deserializeWorld(readFileSync('survival_evidence/gear-ownership-trace/final.json','utf8')),attempts:unknown[]=[];
for(;w.tick<60000;){
 for(const b of w.piles){const g=b.gear;if(g?.kind!=='trap'||g.state!=='armed'||g.readyAt>w.tick)continue;
  const distances=w.animals.filter(a=>a.type==='deer').map(a=>({id:a.id,distance:Math.hypot(a.x-b.x-.5,a.y-b.y-.5),x:a.x,y:a.y}));
  attempts.push({tick:w.tick,gear:b.id,x:b.x,y:b.y,distances,owner:g.owner,ownerSeen:w.persons.find(p=>p.id===g.owner)?.seen.filter(s=>s.ent==='animal')});
 }
 stepWorld(w);
}
writeFileSync(out+'/trace.json',JSON.stringify({attempts},null,2));writeFileSync(out+'/final.json',serializeWorld(w));console.log(JSON.stringify({attempts}));
