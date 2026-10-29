// Ordinary worlds and household relocation (rules 20 and, from 54, its extensions): who reaches sustained hardship, who of
// them remembers a destination, who has the household together, what was proposed and how each agreement ended; steps
// started by kind; townships founded; and from 54 the subgroup journeys, successions, returns and rescues.
// Rules 54 adds the subgroup gate (another member in contact) to the samples and the successions, searches and splits to the report.
// Usage: vite-node scripts/relocation_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {stageOf} from '../src/sim/people';
import {relocationDestination} from '../src/sim/relocation';
import {parseIntervention} from './lab/lab';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/relocation_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
const provenance={arm:arm||'current',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,days,budgetSeconds:300,observer:'activity-start hook, 240-tick eligibility samples (serialized before and after), household agreements'};
writeFileSync(`${out}/provenance.json`,JSON.stringify(provenance,null,2));
const steps:Record<string,number>={};
w.hooks={onActivityStart(_p,a){if(a.kind==='relocate')steps[String(a.data.step)]=(steps[String(a.data.step)]??0)+1;if(a.kind==='withdraw'&&a.data.relocation)steps.pack=(steps.pack??0)+1;}};
const exposure={adultSamples:0,hardshipNow:0,sustainedHardship:0,withDestination:0,withDestinationAndHouseholdTogether:0,withDestinationAndAnotherMemberInContact:0,withDestinationAndNoRecentAgreement:0};
const hardshipPeople=new Set<number>(),destinationPeople=new Set<number>();
const daily:unknown[]=[];
const began=Date.now();let stop='horizon';
while(w.tick<days*DAY){stepWorld(w);
 if(w.tick%240===0){const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive||stageOf(w,p)!=='adult')continue;exposure.adultSamples++;
   if(p.relocationHardship!==undefined){exposure.hardshipNow++;hardshipPeople.add(p.id);}
   if(p.relocationHardship===undefined||w.tick-p.relocationHardship<DAY)continue;exposure.sustainedHardship++;
   const d=relocationDestination(w,p);if(!d)continue;exposure.withDestination++;destinationPeople.add(p.id);
   const hh=w.households.find(h=>h.id===p.hhId);const members=w.persons.filter(q=>q.hhId===p.hhId&&q.alive);
   const inContact=(q:typeof p)=>!q.indoors&&!q.convId&&q.pose!=='sleep'&&Math.hypot(q.x-p.x,q.y-p.y)<=3;
   if(!p.indoors&&members.every(inContact))exposure.withDestinationAndHouseholdTogether++;
   if(!p.indoors&&(members.length===1||members.filter(inContact).length>=2))exposure.withDestinationAndAnotherMemberInContact++;
   if(!hh?.relocations?.some(r=>r.ended!==undefined&&w.tick-r.ended<DAY)&&(p.cooldowns['relocation:retry']??0)<=w.tick)exposure.withDestinationAndNoRecentAgreement++;}
  if(serializeWorld(w)!==before)throw new Error('Observer mutated state');}
 if(w.tick%DAY===0){if(!conservationReport(w).ok){stop='invariant';break;}
  daily.push({day:w.tick/DAY,alive:w.persons.filter(p=>p.alive).length,inHardship:w.persons.filter(p=>p.alive&&p.relocationHardship!==undefined).length,agreementsActive:w.households.reduce((n,h)=>n+(h.relocations??[]).filter(r=>r.phase!=='failed'&&r.phase!=='settled'&&r.phase!=='returned').length,0),townships:(w.townships??[]).length});}
 if(w.tick%2400===0&&Date.now()-began>300000){stop='budget';break;}}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const agreements=w.households.flatMap(h=>(h.relocations??[]).map(r=>({household:h.name,organiser:w.persons.find(p=>p.id===r.organiserId)?.name??w.deceased.find(d=>d.id===r.organiserId)?.name??r.organiserId,phase:r.phase,outcome:r.outcome,startedDay:Math.round(r.started/DAY*10)/10,endedDay:r.ended!==undefined?Math.round(r.ended/DAY*10)/10:null,members:r.members.map(m=>[m.response,m.reason]),successions:r.successions??null,rescues:r.rescues??null,newHousehold:r.newHouseholdId??null})));
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,
 exposure,peopleEverInHardship:hardshipPeople.size,peopleEverWithDestination:destinationPeople.size,stepsStarted:steps,agreements:agreements.length,agreementsByPhase:agreements.reduce<Record<string,number>>((m,a)=>{m[a.phase]=(m[a.phase]??0)+1;return m;},{}),agreementDetails:agreements,successions:agreements.reduce((n,a)=>n+(a.successions?.length??0),0),rescues:agreements.reduce((n,a)=>n+(a.rescues?.length??0),0),splits:agreements.filter(a=>a.newHousehold!==null).length,stayers:agreements.reduce((n,a)=>n+a.members.filter(m=>m[0]==='stays').length,0),townships:(w.townships??[]).map(t=>({name:t.name,founded:Math.round(t.founded/DAY*10)/10,origin:!!t.origin})),hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,daily}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify(report));if(stop!=='horizon')process.exitCode=1;
