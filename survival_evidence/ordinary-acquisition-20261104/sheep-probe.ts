// ORDINARY diagnostic (read-only probes; purity checked): Normal profile, current rules, arrivals on.
// Every 600 ticks: who personally knows a sheep, their free materials, and the acquire/fibre options they see.
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {foodUnits} from '../../src/sim/economy';
import {livestockMaterials} from '../../src/sim/livestock';
import {writeFileSync} from 'node:fs';
const [seed='forest',daysArg='6',out='survival_evidence/ordinary-acquisition-20261104']=process.argv.slice(2);
const w=createWorld(currentWorldSettings('normal',seed)),rows:unknown[]=[];
const sheepIds=w.animals.filter(a=>a.type==='sheep').map(a=>a.id);
const end=Number(daysArg)*2400;
let firstKnow:Record<number,number>={};
while(w.tick<end){
 if(w.tick%600===0){
  const before=serializeWorld(w);
  const knowers=w.persons.filter(p=>p.alive&&Object.values(p.beliefs).some(b=>b.kind==='livestock'));
  for(const p of knowers)firstKnow[p.id]??=w.tick;
  const detail=knowers.map(p=>{const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
   const rel=ctx.options.filter(o=>/sheep|fibre/.test(o.key+o.label+o.goal));
   return {id:p.id,age:p.age|0,hh:p.hhId,needs:Object.fromEntries(Object.entries(p.needs).map(([k,v])=>[k,Math.round(v as number)])),
    inv:{fibre:p.inv.fibre??0,wood:p.inv.wood??0,grain:p.inv.grain??0,food:foodUnits(p.inv)},mats:livestockMaterials(ctx),
    sheep:Object.values(p.beliefs).filter(b=>b.kind==='livestock').map(b=>({id:b.id,hh:b.sheep!.hhId,age:w.tick-b.seen,d:Math.round(Math.hypot(b.x-p.x,b.y-p.y))})),
    options:rel.map(o=>[o.key,+o.util.toFixed(1),ranked.indexOf(o)]),blocked:ctx.blocked.filter(o=>/sheep|fibre|tether/.test(o.key+o.label)).map(o=>[o.key,o.blocked]),
    top:ranked.slice(0,2).map(o=>[o.key,+o.util.toFixed(1)])};});
  rows.push({tick:w.tick,alive:w.persons.filter(p=>p.alive).length,sheep:w.animals.filter(a=>a.type==='sheep').map(a=>({id:a.id,hh:a.sheep!.hhId,x:Math.round(a.x),y:Math.round(a.y)})),knowers:detail});
  if(serializeWorld(w)!==before)throw Error('impure probe');
 }
 stepWorld(w);
}
writeFileSync(`${out}/sheep-probe-${seed}.json`,JSON.stringify({seed,rules:w.settings.rulesVersion,sheepIds,firstKnow,rows},null,1));
console.log(JSON.stringify({seed,sheepIds,knowersEver:Object.keys(firstKnow).length,firstKnow}));
