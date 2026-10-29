// Read-only end-state diagnosis. Retained records are not a complete lifetime counter.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {generateOptions} from '../src/sim/decision';
import {weightOf} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {estimatedAmount} from '../src/sim/knowledge';
const [path,out]=process.argv.slice(2);if(!path||!out)throw new Error('input save and output report required');
const w=deserializeWorld(readFileSync(path,'utf8')),before=serializeWorld(w);
const people=w.persons.filter(p=>p.intentions.some(i=>i.kind==='tool'&&i.makes==='hammer')).map(p=>{
 const ctx=generateOptions(w,p,true,true);
 return {id:p.id,name:p.name,alive:p.alive,needs:p.needs,pack:p.inv,weight:weightOf(p.inv),capacity:carryCap(w,p),plans:p.intentions.filter(i=>i.kind==='tool'&&i.makes==='hammer'),required:ctx.toolWanted,
  relevantOffers:ctx.options.filter(o=>o.key==='craft:hammer'||o.yields==='stone'||o.key.startsWith('leave:')||o.label.includes('hammer')).map(({key,label,util,yields,parts})=>({key,label,util,yields,parts})),
  relevantBlocked:ctx.blocked.filter(o=>o.label.includes('hammer')||o.label.includes('stone')),
  rememberedStone:Object.values(p.beliefs).filter(b=>b.kind==='rock'||b.kind==='outcrop').map(b=>({id:b.id,x:b.x,y:b.y,remembered:b.amount,estimatedNow:estimatedAmount(w,b),seen:b.seen}))};
});
if(before!==serializeWorld(w))throw new Error('Snapshot observer mutation');
writeFileSync(out,JSON.stringify({input:path,inputSha256:createHash('sha256').update(readFileSync(path)).digest('hex'),rules:w.settings.rulesVersion,tick:w.tick,evidence:'Snapshot and retained histories only; not a full opportunity denominator or causal ablation.',people,craftedHammers:w.ledger.reasons['+crafted: hammer']??0,retainedHammers:w.tools.filter(t=>t.kind==='hammer')},null,2));
console.log(JSON.stringify(people.map(p=>({name:p.name,weight:p.weight,capacity:p.capacity,pack:p.pack,offers:p.relevantOffers,stone:p.rememberedStone.map(s=>s.estimatedNow)}))));
