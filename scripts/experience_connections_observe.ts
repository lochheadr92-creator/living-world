// Ordinary worlds. Hooks and pure samples observe; nobody is controlled or repositioned.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {generateOptions} from '../src/sim/decision';
import {conservationReport} from '../src/sim/economy';
import {stageOf} from '../src/sim/people';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [out,seed,daysArg,arrivalsArg]=process.argv.slice(2),days=Number(daysArg??6),immigration=arrivalsArg==='arrivals';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>45)throw new Error('Fresh output, registered seed and 1-45 days required');
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/experience_connections_observe.ts']).sort();
const manifest=()=>sourceManifest(paths);const source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration}));
const initialIds=new Set(w.persons.map(p=>p.id));
const initial=JSON.parse(JSON.stringify(w.persons.map(p=>({id:p.id,name:p.name,stage:stageOf(w,p),background:p.background,skills:p.skills,techniques:p.techniques}))));
writeFileSync(`${out}/provenance.json`,JSON.stringify({...gitProvenance(),source,settings:w.settings,days,budgetSeconds:180,observer:'activity/transfer hooks and pure 240-tick snapshots'},null,2));
const selected:unknown[]=[],transfers:unknown[]=[],samples:unknown[]=[],requests=new Map<number,unknown>(),heard=new Set<string>(),benefits=new Set<string>(),learned=new Set<number>(),trades=new Set<string>();
const totals:Record<string,number>={samples:0,peopleWithoutCharcoal:0,adultOrYouthWithoutCharcoal:0,wantedTechnique:0,learnerOffers:0,teacherOffers:0,materialRequestOffers:0,materialBlocked:0,knownNeedySites:0,nearbyPeople:0,nearbyWoodCarriers:0,nearbyStoneCarriers:0,nearbyPlankCarriers:0,workshopOptions:0};
let pendingLesson:unknown=null,savedLesson=false;
w.hooks={onActivityStart(p,a){if(a.kind==='socialize'&&a.data.purpose==='learn_technique'&&!savedLesson)pendingLesson={tick:w.tick,person:p.id,name:p.name,activity:a.id};if(a.kind==='socialize'&&['request','learn_technique','teach_technique','recruit'].includes(a.data.purpose)||a.kind==='operate'||a.kind==='withdraw')selected.push({tick:w.tick,person:p.id,name:p.name,activity:a.id,kind:a.kind,label:a.label,target:a.targetId,purpose:a.data.purpose,recipe:a.data.recipe});},onTransfer(t){if(t.reason==='withdraw'||t.reason==='gift on request'||t.reason==='eat from store')transfers.push({tick:w.tick,...t});}};
const began=Date.now();let stop='horizon';
while(w.tick<days*DAY){stepWorld(w);
 if(pendingLesson&&!savedLesson){writeFileSync(`${out}/natural-lesson-start.json`,serializeWorld(w));writeFileSync(`${out}/natural-lesson-person.json`,JSON.stringify(pendingLesson,null,2));savedLesson=true;}
 for(const r of w.requests)requests.set(r.id,{...r});
 for(const p of w.persons){if(p.techniques?.charcoal?.source==='taught')learned.add(p.id);for(const m of p.heardDemand??[])heard.add(`${p.id}:${m.requestId}`);for(const m of p.civicOutcomes??[])if(m.benefit)benefits.add(`${p.id}:${m.projectId}`);if(p.trade?.why.includes('people asked me'))trades.add(`${p.id}:${p.trade.since}`);}
 if(w.tick%240===0){const before=serializeWorld(w),sample:Record<string,number>={tick:w.tick};
  const count=(key:string,n=1)=>{totals[key]=(totals[key]??0)+n;sample[key]=(sample[key]??0)+n;};
  for(const p of w.persons.filter(p=>p.alive)){count('samples');const ctx=generateOptions(w,p,true,true);
   if(!p.techniques?.charcoal){count('peopleWithoutCharcoal');if(stageOf(w,p)!=='child')count('adultOrYouthWithoutCharcoal');}
   if(ctx.techniqueWanted)count('wantedTechnique');
   count('learnerOffers',ctx.options.filter(o=>o.key.endsWith(':learn_technique')).length);count('teacherOffers',ctx.options.filter(o=>o.key.endsWith(':teach_technique')).length);
   count('materialRequestOffers',ctx.options.filter(o=>o.kind==='socialize'&&o.tag==='request'&&/wood|stone|planks|bricks|charcoal/.test(o.label)).length);
   count('materialBlocked',ctx.blocked.filter(o=>o.tag==='request').length);count('workshopOptions',ctx.options.filter(o=>o.kind==='operate').length);
   count('knownNeedySites',Object.values(p.beliefs).filter(b=>b.kind==='site'&&b.hh===p.hhId&&Object.values(b.need??{}).some(n=>n>0)).length);
   const near=p.seen.filter(s=>s.ent==='person');count('nearbyPeople',near.length);for(const item of ['wood','stone','planks'] as const)count('nearby'+({wood:'Wood',stone:'Stone',planks:'Plank'}[item])+'Carriers',near.filter(s=>s.carrying.includes(item)).length);
  }samples.push(sample);if(serializeWorld(w)!==before){writeFileSync(`${out}/observer-before.json`,before);writeFileSync(`${out}/observer-after.json`,serializeWorld(w));writeFileSync(`${out}/failure.json`,JSON.stringify({tick:w.tick,reason:'observer mutated state'}));throw new Error(`Observer mutated state at tick ${w.tick}`);}if(Date.now()-began>180000){stop='budget';break;}}
 if(w.tick%DAY===0&&!conservationReport(w).ok){stop='invariant';break;}
}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const report={seed,days,immigration,tick:w.tick,stop,seconds:(Date.now()-began)/1000,totals,selected:selected.length,requests:requests.size,heardRequests:heard.size,demandTrades:trades.size,benefits:benefits.size,learned:learned.size,newPeople:w.persons.filter(p=>!initialIds.has(p.id)).map(p=>({id:p.id,name:p.name,stage:stageOf(w,p),background:p.background,techniques:p.techniques})),buildings:w.buildings.map(b=>({id:b.id,type:b.type,items:b.store.items})),projects:w.civicProjects,hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,initial,selected,transfers,samples,requests:[...requests.values()]}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify({...report,buildings:report.buildings.map(b=>b.type),projects:report.projects?.map(q=>q.status)}));if(stop!=='horizon')process.exitCode=1;
