// Ordinary worlds and continuity (rules 53): what dying members left unfinished and who took it up; reserves laid, winter meals,
// the practice of keeping winter stores learned and passed on, and whether holders' households prepared earlier the next year.
// Usage: vite-node scripts/continuity_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY,DAYS_PER_YEAR} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from './lab/lab';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/continuity_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
const provenance={arm:arm||'current',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,days,budgetSeconds:300,observer:'daily snapshots (serialized before and after) and personal records'};
writeFileSync(`${out}/provenance.json`,JSON.stringify(provenance,null,2));
const daily:unknown[]=[];const seenUnfinished=new Map<number,{by:string;kind:string;tick:number}>();const stockAdoptions:{person:number;day:number;why:string;holder:boolean}[]=[];const seenPlans=new Set<number>();
const began=Date.now();let stop='horizon';
while(w.tick<days*DAY){stepWorld(w);
 if(w.tick%240===0){for(const p of w.persons)for(const i of p.intentions)if(i.kind==='stock'&&i.cue==='season'&&!seenPlans.has(i.id)){seenPlans.add(i.id);stockAdoptions.push({person:p.id,day:Math.round(i.since/DAY*100)/100,why:i.reason,holder:!!p.winterPractice});}}
 if(w.tick%DAY===0){if(!conservationReport(w).ok){stop='invariant';break;}
  const before=serializeWorld(w);
  for(const hh of w.households)for(const u of hh.unfinished??[])if(!seenUnfinished.has(u.id))seenUnfinished.set(u.id,{by:u.name,kind:u.kind,tick:u.tick});
  const ps=w.persons.filter(p=>p.alive);
  daily.push({day:w.tick/DAY,dayOfYear:Math.floor(w.tick/DAY)%DAYS_PER_YEAR,alive:ps.length,holders:ps.filter(p=>p.winterPractice).length,holdersLaid:ps.filter(p=>p.winterPractice?.source==='laid').length,holdersFamily:ps.filter(p=>p.winterPractice?.source==='family').length,eatingWinterMeals:ps.filter(p=>p.winterMeals).length,reservesLaidThisYear:w.households.filter(h=>h.reserveLaid?.year===Math.floor(w.tick/(DAY*DAYS_PER_YEAR))).length,unfinishedOpen:w.households.reduce((n,h)=>n+(h.unfinished?.length??0),0),succeedingPlans:ps.reduce((n,p)=>n+p.intentions.filter(i=>i.status==='active'&&i.succeeding).length,0)});
  if(serializeWorld(w)!==before)throw new Error('Observer mutated state');}
 if(w.tick%2400===0&&Date.now()-began>300000){stop='budget';break;}}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const everyone=w.persons;
const count=(re:RegExp)=>everyone.reduce((n,p)=>n+p.log.filter(l=>re.test(l.text)).length,0);
const succeeded=everyone.flatMap(p=>p.intentions.filter(i=>i.succeeding).map(i=>({person:p.name,from:i.succeeding!.name,kind:i.kind,goal:i.goal,status:i.status,reason:i.reason,since:Math.round(i.since/DAY*10)/10})));
const practice=everyone.filter(p=>p.winterPractice).map(p=>({person:p.name,alive:p.alive,...p.winterPractice!,fromName:everyone.find(q=>q.id===p.winterPractice!.from)?.name??null}));
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:everyone.filter(p=>p.alive).length,deaths:w.deceased.length,
 unfinishedRecorded:seenUnfinished.size,unfinishedByKind:[...seenUnfinished.values()].reduce<Record<string,number>>((m,u)=>{m[u.kind]=(m[u.kind]??0)+1;return m;},{}),takenUp:succeeded.length,takenUpByKindAndStatus:succeeded.reduce<Record<string,number>>((m,s)=>{const k=s.kind+':'+s.status;m[k]=(m[k]??0)+1;return m;},{}),succeeded,
 cancelledUnfinished:count(/cannot be taken up/),finishedWhatBegan:count(/^Finished what .* began\.$/),unfinishedOpenAtEnd:w.households.reduce((n,h)=>n+(h.unfinished?.length??0),0),
 reservesLaid:w.households.filter(h=>h.reserveLaid).length,reserveLaidYears:w.households.filter(h=>h.reserveLaid).map(h=>h.reserveLaid!.year),peopleWithWinterMeals:count(/Ate a meal from the stores/),practiceHolders:practice.length,practiceByeSource:practice.reduce<Record<string,number>>((m,p)=>{m[p.source]=(m[p.source]??0)+1;return m;},{}),practice,
 seasonStockPlans:stockAdoptions.length,seasonStockPlansByHolder:stockAdoptions.reduce<Record<string,number>>((m,a)=>{m[a.holder?'holder':'other']=(m[a.holder?'holder':'other']??0)+1;return m;},{}),earlyCueAdoptions:stockAdoptions.filter(a=>/we keep stores/.test(a.why)).length,
 hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,daily,stockAdoptions}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify(report));if(stop!=='horizon')process.exitCode=1;
