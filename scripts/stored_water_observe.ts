// Predeclared five-day fixed-seed occurrence check; observation never chooses actions.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport,weightOf} from '../src/sim/economy';
import {DAY,isSolidHome} from '../src/sim/constants';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/stored_water_observe.ts').sort();
const manifest=()=>sourceManifest(files);
const source=manifest(),until=5*DAY,began=performance.now(),starts:any[]=[],uses:any[]=[],endings:Record<string,number>={};
let livingSamples=0,knownWaterSamples=0,offered=0,eligible=0,first=0,pureChecks=0,startCount=0,portions=0,omitted=0,stop='horizon';
const retain=(rows:any[],row:any)=>{if(rows.length<2000)rows.push(row);else omitted++;};
w.hooks={onActivityStart:(p,a)=>{if(!a.data.fromStore||a.kind!=='drink')return;startCount++;retain(starts,{tick:w.tick,person:p.id,name:p.name,home:a.targetId,activity:a.id,thirst:p.needs.thirst,load:weightOf(p.inv)});},onActivityEnd:(p,a,outcome,detail)=>{if(a.kind==='drink'&&a.data.fromStore)endings[outcome+'|'+detail]=(endings[outcome+'|'+detail]??0)+1;}};
while(w.tick<until){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;livingSamples++;
   if(!Object.values(p.beliefs).some(b=>b.kind==='building'&&b.hh===p.hhId&&isSolidHome(b.btype)&&(b.items?.water??0)>=1))continue;
   knownWaterSamples++;const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),matches=(key:string)=>key.startsWith('drink:store:');
   if(ctx.options.some(o=>matches(o.key)))offered++;if(ranked.some(o=>matches(o.key)))eligible++;if(ranked[0]&&matches(ranked[0].key))first++;
  }
  if(serializeWorld(w)!==before)throw new Error('Observer changed full state');pureChecks++;
 }
 const drinking=w.persons.filter(p=>p.activity?.kind==='drink'&&p.activity.data.fromStore).map(p=>({p,a:p.activity!,cycle:p.activity!.cycle,thirst:p.needs.thirst,load:weightOf(p.inv)}));
 stepWorld(w);stepWorld(twin);
 for(const d of drinking)if(d.a.cycle>d.cycle){portions+=d.a.cycle-d.cycle;retain(uses,{tick:w.tick,person:d.p.id,home:d.a.targetId,portions:d.a.cycle-d.cycle,thirstBefore:d.thirst,thirstAfter:d.p.needs.thirst,loadBefore:d.load,loadAfter:weightOf(d.p.inv)});}
 if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}
}
delete w.hooks;
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observed continuation differs');
const report={...gitProvenance(),source,initialHash:hash(initial),settings:w.settings,until,tick:w.tick,stop,seconds:(performance.now()-began)/1000,livingSamples,knownWaterSamples,offered,eligible,first,startCount,portions,starts,uses,endings,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),limits:'120-tick living-person samples are not independent opportunities. Five days do not establish mature-world use or benefit. No water was staged.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,livingSamples,knownWaterSamples,offered,eligible,first,startCount,portions,endings,omitted,pureChecks,continuationEqual:true,conserved:report.conservation.ok}));
if(stop!=='horizon')process.exitCode=1;
