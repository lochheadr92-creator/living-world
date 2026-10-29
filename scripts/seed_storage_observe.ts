// Fixed ordinary river/Normal, no immigration; 45 days, 300 seconds maximum.
// Counts offered storage, actual selection, physical transfer and later work separately.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {stageOf} from '../src/sim/people';
import {generateOptions} from '../src/sim/decision';
import {demandsOf} from '../src/sim/production';
import type {Activity,Person} from '../src/sim/types';
const [out]=process.argv.slice(2);if(!out||existsSync(out))throw new Error('A fresh output directory is required');mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/seed_storage_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),source=manifest();
const w=createWorld(currentWorldSettings('normal','river',{immigration:false}));
writeFileSync(`${out}/provenance.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,question:'Does bounded seed storage offer and physically complete in a fixed ordinary world, and what subsequent work occurs? No causal aggregate claim.',ticks:108000,budgetSeconds:300},null,2));
const samples={adults:0,storageOffered:0,cartDemand:0,cartBlockedByHammer:0},pending=new Map<number,{p:Person;a:Activity;start:number;seedBefore:number}>(),ends:unknown[]=[],laterWork:unknown[]=[];
const storers=new Set<number>();let starts=0,seedTransferred=0,cartTrips=0,pure=true;
w.hooks={onActivityStart(p,a){
 if(a.data.seedStash){starts++;pending.set(a.id,{p,a,start:w.tick,seedBefore:p.inv.seeds??0});}
 else if(storers.has(p.id)&&['gather','craft','plant','withdraw','operate','cart_haul'].includes(a.kind))pending.set(a.id,{p,a,start:w.tick,seedBefore:p.inv.seeds??0});
 if(a.kind==='cart_haul')cartTrips++;
},onTransfer(i){if(i.item==='seeds'&&i.reason==='deposit'){const id=Number(i.from.split(':')[1]),p=w.persons.find(p=>p.id===id);if(p?.activity?.data.seedStash)seedTransferred+=i.n;}}};
const began=performance.now();let stop='horizon';
while(w.tick<108000){
 if(w.tick%240===0){const before=serializeWorld(w);
  for(const p of w.persons.filter(p=>p.alive&&stageOf(w,p)!=='child')){samples.adults++;const ctx=generateOptions(w,p,true,true);
   if(ctx.options.some(o=>o.key.startsWith('seed_stash:')))samples.storageOffered++;
   if(demandsOf(ctx).some(d=>d.item==='cart'))samples.cartDemand++;
   if(ctx.blocked.some(o=>o.label.includes('handcart')&&o.blocked?.includes('hammer')))samples.cartBlockedByHammer++;
  }pure&&=serializeWorld(w)===before;if(!pure)throw new Error('Observer mutation');
 }
 stepWorld(w);
 for(const [id,j] of pending){if(j.p.activity?.id===id||j.p.suspended?.id===id)continue;pending.delete(id);
  const row={person:j.p.name,start:j.start,end:w.tick,kind:j.a.kind,label:j.a.label,goal:j.a.goal,seedBefore:j.seedBefore,seedAfter:j.p.inv.seeds??0,moved:j.a.data.moved,cycle:j.a.cycle,result:j.p.lastResult};
  if(j.a.data.seedStash){ends.push(row);if(j.a.cycle>0)storers.add(j.p.id);}else laterWork.push(row);
 }
 if(w.tick%2400===0&&performance.now()-began>300000){stop='budget';break;}
}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={rules:w.settings.rulesVersion,seed:'river',profile:'normal',immigration:false,tick:w.tick,stop,seconds:(performance.now()-began)/1000,pure,conservation:conservationReport(w),samples,starts,seedTransferred,storers:storers.size,ends,laterWork,cartTrips,carts:w.carts.length,craftedHammers:w.ledger.reasons['+crafted: hammer']??0,alive:w.persons.filter(p=>p.alive).length};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify({...report,ends:ends.length,laterWork:laterWork.length}));if(stop!=='horizon'||!report.conservation.ok)process.exitCode=1;
