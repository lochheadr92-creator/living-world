// Ordinary worlds, shelter through the seasons: homes laid out, finished, mended, abandoned and lost; who is without a roof at
// each winter; what a poor roof costs in stored food. Hooks, events and pure samples observe; nobody is controlled.
// Usage: vite-node scripts/shelter_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY,DAYS_PER_YEAR,isHomeType} from '../src/sim/constants';
import {WINTER_LENGTH} from '../src/sim/hardship';
import {generateOptions} from '../src/sim/decision';
import {conservationReport,foodUnits} from '../src/sim/economy';
import {membersOf} from '../src/sim/households';
import {stageOf} from '../src/sim/people';
import {parseIntervention} from './lab/lab';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/shelter_observe.ts']).sort();
const manifest=()=>sourceManifest(paths);const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
writeFileSync(`${out}/provenance.json`,JSON.stringify({arm:arm||'current',...gitProvenance(),source,settings:w.settings,days,budgetSeconds:240,observer:'activity hook (why text), events, pure 240-tick samples, household rows at winter boundaries'},null,2));
const winterStart=(d:number)=>d%DAYS_PER_YEAR===DAYS_PER_YEAR-WINTER_LENGTH;
const starts:Record<string,number>={};const winterNudged:Record<string,number>={};const started:unknown[]=[];
w.hooks={onActivityStart(p,a){if(!['plan_site','build','haul','repair'].includes(a.kind))return;const home=a.kind==='plan_site'?isHomeType(a.data.type as never):true;const key=`${a.kind}${a.kind==='plan_site'?':'+String(a.data.type):''}`;starts[key]=(starts[key]??0)+1;const why=String(a.data.why??'');if(/winter is coming/.test(why)){winterNudged[key]=(winterNudged[key]??0)+1;started.push({tick:w.tick,person:p.id,name:p.name,kind:a.kind,label:a.label,why});}void home;}};
let seenEvents=0;const eventCounts:Record<string,number>={};const eventsKept:unknown[]=[];
const samples:unknown[]=[],winters:unknown[]=[],deaths:{tick:number;name:string;cause:string;home:string|null;cond:number|null}[]=[];let seenDeceased=0;
const totals:Record<string,number>={samples:0,homePlanOffers:0,homePlanBlocked:0,homePlanBlockedCap:0,homePlanBlockedWorkshop:0,repairOffers:0,winterNudgeOffers:0};
const began=Date.now();let stop='horizon';
const homeOf=(hhId:number)=>{const hh=w.households.find(h=>h.id===hhId);return hh?.homeId?w.buildings.find(b=>b.id===hh.homeId):undefined;};
const householdRows=(label:string)=>w.households.map(hh=>{const ms=membersOf(w,hh).filter(m=>m.alive);const home=hh.homeId?w.buildings.find(b=>b.id===hh.homeId):undefined;const site=w.sites.find(s=>s.hhId===hh.id&&isHomeType(s.type));return{label,tick:w.tick,hh:hh.id,name:hh.name,members:ms.length,adults:ms.filter(m=>stageOf(w,m)==='adult').length,home:home?.type??null,homeCond:home?Math.round(home.condition):null,homeFood:home?foodUnits(home.store.items):null,site:site?`${site.type} ${Math.round(100*site.work/site.workTotal)}%`:null};});
while(w.tick<days*DAY){stepWorld(w);
 for(;seenEvents<w.events.length;seenEvents++){const e=w.events[seenEvents];const t=e.text;let k:string|null=null;
  if(/collapsed/.test(t))k='collapse';else if(/site was abandoned/.test(t))k='site abandoned';else if(/finished a (lean-to|hut|house)/.test(t))k='home finished';else if(/marked out a (lean-to|hut|house)/.test(t))k='home laid out';else if(/mended|repaired/.test(t))k='repair';
  if(k){eventCounts[k]=(eventCounts[k]??0)+1;if(k!=='home laid out')eventsKept.push({tick:w.tick,day:+(w.tick/DAY).toFixed(2),kind:k,text:t});}}
 if(w.deceased.length>seenDeceased){for(const d of w.deceased.slice(seenDeceased)){const p=w.persons.find(q=>q.id===d.id);const home=p?homeOf(p.hhId):undefined;deaths.push({tick:w.tick,name:d.name,cause:d.cause,home:home?.type??null,cond:home?Math.round(home.condition):null});}seenDeceased=w.deceased.length;}
 if(w.tick%DAY===0){const day=w.tick/DAY;if(winterStart(day))winters.push(...householdRows(`winter start day ${day}`));if(day%DAYS_PER_YEAR===0&&day>0)winters.push(...householdRows(`winter end day ${day}`));if(!conservationReport(w).ok){stop='invariant';break;}}
 if(w.tick%240===0){const before=serializeWorld(w),sample:Record<string,number>={tick:w.tick};const count=(key:string,n=1)=>{totals[key]=(totals[key]??0)+n;sample[key]=(sample[key]??0)+n;};
  for(const p of w.persons.filter(p=>p.alive)){count('samples');const ctx=generateOptions(w,p,true,true);
   count('homePlanOffers',ctx.options.filter(o=>o.kind==='plan_site'&&/lean-to|hut/.test(o.label)).length);
   const blocked=ctx.blocked.filter(o=>o.kind==='plan_site'&&/lean-to|hut/.test(o.label));count('homePlanBlocked',blocked.length);
   count('homePlanBlockedCap',blocked.filter(o=>/too much already being built/.test(o.blocked??'')).length);count('homePlanBlockedWorkshop',blocked.filter(o=>/already laid out a (kiln|timber|quarry|smithy|bakery|storehouse|hall|granary)/.test(o.blocked??'')).length);
   count('repairOffers',ctx.options.filter(o=>o.kind==='repair').length);count('winterNudgeOffers',ctx.options.filter(o=>o.parts.some(([n])=>n==='winter is coming')).length);}
  const homes=w.buildings.filter(b=>isHomeType(b.type));sample.homes=homes.length;sample.homesBelow40=homes.filter(b=>b.condition<40).length;sample.homeless=w.households.filter(h=>!h.homeId&&membersOf(w,h).some(m=>m.alive)).length;sample.homeSites=w.sites.filter(s=>isHomeType(s.type)).length;
  samples.push(sample);if(serializeWorld(w)!==before){writeFileSync(`${out}/failure.json`,JSON.stringify({tick:w.tick,reason:'observer mutated state'}));throw new Error(`Observer mutated state at tick ${w.tick}`);}
  if(Date.now()-began>240000){stop='budget';break;}}
}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:deaths.length,
 deathCauses:deaths.reduce((m:Record<string,number>,d)=>{m[d.cause]=(m[d.cause]??0)+1;return m;},{}),exposureDeathsWithoutHome:deaths.filter(d=>d.cause==='exposure'&&!d.home).length,exposureDeathsHomeBelow40:deaths.filter(d=>d.cause==='exposure'&&d.home&&(d.cond??100)<40).length,
 starts,winterNudged,events:eventCounts,totals,homesAtEnd:w.buildings.filter(b=>isHomeType(b.type)).map(b=>`${b.type}:${Math.round(b.condition)}`),homelessAtEnd:w.households.filter(h=>!h.homeId&&membersOf(w,h).some(m=>m.alive)).length,spoiledInStores:w.ledger.reasons['xstored food spoiled']??0,hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,samples,winters,deaths,events:eventsKept,started}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify({...report,homesAtEnd:report.homesAtEnd.length}));if(stop!=='horizon')process.exitCode=1;
