import {nourishmentObserver} from './observers/nourishment';
// A whole-life cost observation using the existing lab's control/nudge operation.
// One process = one declared draw. This never assigns jobs or supplies resources.
import {existsSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld,hashWorld} from '../src/sim/world';
import {stageOf} from '../src/sim/people';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import {parseIntervention} from './lab/lab';
import {TimeBudget} from './observers/time_budget';
import {sourceManifest,gitProvenance} from './observers/provenance';
const [seed,out,forkArg,nudgeArg,daysArg='25']=process.argv.slice(2).filter(x=>x!=='--');
const fork=Number(forkArg),nudge=Number(nudgeArg),days=Number(daysArg);
if(!seed||!out||existsSync(out)||![fork,nudge,days].every(Number.isSafeInteger)||fork<0||fork>=days||nudge<0||nudge>100||days<25)throw Error('Fresh output and seed, fork day, nudge draws, horizon >=25 days required');
const files=['src','scripts'].flatMap(dir=>readdirSync(dir,{recursive:true}).map(String).filter(f=>/\.(ts|mjs)$/.test(f)).map(f=>dir+'/'+f.replaceAll('\\','/'))).concat(['package.json','package-lock.json','tsconfig.json','vite.config.ts']).sort();
const source=sourceManifest(files),provenance=gitProvenance();
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
let w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const initialHash=sha(serializeWorld(w)),began=performance.now(),time=new TimeBudget();
let nourishment=nourishmentObserver(w),detach=time.attach(w),forked=false;
const nourishmentSegments:ReturnType<typeof nourishment.report>[]=[];
const ageTicks:Record<string,number>={},popByDay:number[]=[],inc=(k:string)=>ageTicks[k]=(ageTicks[k]??0)+1;
mkdirSync(out,{recursive:true});
while(w.tick<days*DAY){
  if(!forked&&w.tick===fork*DAY){
    nourishmentSegments.push(nourishment.report());detach();w=deserializeWorld(serializeWorld(w));nourishment=nourishmentObserver(w);detach=time.attach(w);
    parseIntervention(nudge?`nudge:${nudge}`:'control').apply?.(w);forked=true;
  }
  time.sampleTick(w);
  nourishment.tick();
  for(const p of w.persons)if(p.alive){
    const age=stageOf(w,p);inc('alive:'+age);
    if(p.needs.hunger<=0)inc('empty immediate hunger:'+age);
    if(p.needs.warmth<=6)inc('exposure:'+age);
    if(p.needs.thirst<=0)inc('empty thirst:'+age);
    if(p.needs.energy<=0)inc('exhaustion:'+age);
  }
  stepWorld(w);
  if(w.tick%DAY===0){
    if(!conservationReport(w).ok)throw Error('Conservation failed');
    popByDay.push(w.persons.filter(p=>p.alive).length);
    writeFileSync(out+'/progress.json',JSON.stringify({seed,fork,nudge,tick:w.tick,seconds:(performance.now()-began)/1000}));
  }
}
detach();delete w.hooks;
const final=serializeWorld(w),restored=deserializeWorld(final);
if(final!==serializeWorld(restored))throw Error('Final save is not exact');
if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw Error('Source changed');
const report={...provenance,source,seed,fork,nudge,days,settings:w.settings,initialHash,finalHash:hashWorld(w),finalSaveHash:sha(final),tick:w.tick,popByDay,
  nourishment:[...nourishmentSegments,nourishment.report()],
  population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,ageTicks,ledger:w.ledger,timeBudget:time.report(),
  unfinishedSites:w.sites.map(s=>({id:s.id,type:s.type,work:s.work,total:s.workTotal,delivered:s.delivered,used:s.used})),
  unfinishedBatches:w.buildings.filter(b=>b.ops?.job).map(b=>({id:b.id,type:b.type,job:b.ops!.job})),
  materialOnGround:w.piles.map(p=>({id:p.id,items:p.items,...(p.carcass?{carcass:{remaining:p.carcass.remaining,recovered:p.carcass.recovered,lost:p.carcass.lost}}:{})})),conservation:conservationReport(w),exactSave:true,continuationEqual:true,
  seconds:(performance.now()-began)/1000,limits:'One seeded control/nudge draw; occupancy is not causal attribution. Fork dates share a prefix and draws are not independent worlds. No universal survival inference.'};
const recorded=JSON.stringify(report,null,2);
for(let n=0;n<120;n++){stepWorld(w);stepWorld(restored);}
if(serializeWorld(restored)!==serializeWorld(w))throw Error('Continuation differs');
writeFileSync(out+'/final.json',final);writeFileSync(out+'/report.json',recorded);
console.log(JSON.stringify({seed,fork,nudge,tick:report.tick,population:report.population,finalHash:report.finalHash,seconds:report.seconds}));
