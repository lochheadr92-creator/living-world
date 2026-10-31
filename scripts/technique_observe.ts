// Ordinary worlds and the technique tree (rules 52): who holds charcoal firing, smelting and forging over time, lessons by
// procedure, holders lost to death, trials attempted and worked out, wanted work blocked by a procedure, and iron made.
// Usage: vite-node scripts/technique_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {TECHNIQUE_KINDS} from '../src/sim/techniques';
import {parseIntervention} from './lab/lab';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/technique_observe.ts']).sort();
const manifest=()=>sourceManifest(paths);const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
const provenance={arm:arm||'current',...gitProvenance(),source,settings:w.settings,days,budgetSeconds:300,observer:'activity-start hook, daily option samples (serialized before and after), personal records'};
writeFileSync(`${out}/provenance.json`,JSON.stringify(provenance,null,2));
const holders=()=>Object.fromEntries(TECHNIQUE_KINDS.map(k=>[k,w.persons.filter(p=>p.alive&&p.techniques?.[k]).length]));
const starts={trialBatches:0,lessonOffers:0,lessonRequests:0};
w.hooks={onActivityStart(_p,a){
 if(a.kind==='operate'&&a.data.trial)starts.trialBatches++;
 if(a.kind==='socialize'&&a.data.purpose==='teach_technique')starts.lessonOffers++;
 if(a.kind==='socialize'&&a.data.purpose==='learn_technique')starts.lessonRequests++;
}};
const daily:unknown[]=[];const blockedBy:Record<string,number>={};const wantedKinds:Record<string,number>={};let samples=0;const lastKnown=new Map<number,string[]>();
const began=Date.now();let stop='horizon';
while(w.tick<days*DAY){stepWorld(w);
 if(w.tick%DAY===0){if(!conservationReport(w).ok){stop='invariant';break;}
  const before=serializeWorld(w);
  for(const p of w.persons)if(p.alive)lastKnown.set(p.id,Object.keys(p.techniques??{}));
  for(const p of w.persons){if(!p.alive||p.pose==='sleep')continue;const ctx=generateOptions(w,p,true,true);samples++;
   if(ctx.techniqueWanted)wantedKinds[ctx.techniqueWanted.kind]=(wantedKinds[ctx.techniqueWanted.kind]??0)+1;
   for(const b of ctx.blocked)if(/has not learned|must learn/.test(b.blocked??''))blockedBy[b.blocked!]=(blockedBy[b.blocked!]??0)+1;}
  daily.push({day:w.tick/DAY,alive:w.persons.filter(p=>p.alive).length,holders:holders(),trialsOpen:w.persons.filter(p=>p.alive&&p.trials).length,smithies:w.buildings.filter(b=>b.type==='smithy').length,iron:w.ledger?.created?.iron??0});
  if(serializeWorld(w)!==before)throw new Error('Observer mutated state');}
 if(w.tick%2400===0&&Date.now()-began>300000){stop='budget';break;}}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const everyone=w.persons;
const count=(re:RegExp)=>everyone.reduce((n,p)=>n+p.log.filter(l=>re.test(l.text)).length,0);
const lessons=w.conversations.filter(c=>c.lesson).map(c=>({kind:c.lesson!.kind??'charcoal',outcome:c.lesson!.outcome,reason:c.lesson!.reason}));
const byKind=(rows:{kind:string;outcome:string}[])=>rows.reduce<Record<string,Record<string,number>>>((m,r)=>{(m[r.kind]??={})[r.outcome]=(m[r.kind]![r.outcome]??0)+1;return m;},{});
const deadHolders=Object.fromEntries(TECHNIQUE_KINDS.map(k=>[k,w.deceased.filter(d=>(lastKnown.get(d.id)??[]).includes(k)).length]));
const learned=everyone.flatMap(p=>Object.entries(p.techniques??{}).filter(([,t])=>t&&t.source!=='initial').map(([k,t])=>({person:p.name,kind:k,source:t!.source,tick:t!.learned,teacher:everyone.find(q=>q.id===t!.teacher)?.name??null,attempts:t!.attempts??null})));
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:everyone.filter(p=>p.alive).length,deaths:w.deceased.length,
 holdersAtStart:(daily[0] as {holders:unknown})?.holders,holdersAtEnd:holders(),holdersDead:deadHolders,lessonsByKind:byKind(lessons),lessonOffersStarted:starts.lessonOffers,lessonRequestsStarted:starts.lessonRequests,learned,
 trialBatchesStarted:starts.trialBatches,trialAttemptsLogged:count(/without knowing how: the batch came to nothing/),trialsWorkedOut:count(/Worked out .* by trial/),trialsOpenAtEnd:everyone.filter(p=>p.alive&&p.trials).map(p=>({name:p.name,trials:p.trials})),
 optionSamples:samples,wantedKinds,blockedBy,smithies:w.buildings.filter(b=>b.type==='smithy').length,smithySites:w.sites.filter(s=>s.type==='smithy').length,firstSmithyDay:w.buildings.find(b=>b.type==='smithy')?.built!==undefined?(w.buildings.find(b=>b.type==='smithy')!.built as number)/DAY:null,
 ironMade:w.ledger?.created?.iron??0,charcoalMade:w.ledger?.created?.charcoal??0,oreTaken:w.ledger?.created?.ore??0,hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,daily,lessons}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify(report));if(stop!=='horizon')process.exitCode=1;
