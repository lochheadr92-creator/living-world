// Bounded measurements of real accumulated state. Reuses bench.ts's external timing approach.
// No invented history, rule upgrades, balance tuning, or long simulation generation.
// npx vite-node scripts/mature_perf.ts -- <mature-save> <output-directory>
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { cpus, platform } from 'node:os';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { describePerson } from '../src/sim/inspect';
import { householdHistory, relationshipHistory, civicHistory } from '../src/sim/history';
import { conservationReport } from '../src/sim/economy';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import type { World } from '../src/sim/types';

const args=process.argv.slice(2).filter(a=>a!=='--');
const currentLarge=args.includes('--current-large');
const [maturePath, out = 'viewer_evidence/performance'] = args.filter(a=>a!=='--current-large');
if (!maturePath) throw new Error('Pass a real saved mature world; this script does not manufacture one.');
if(existsSync(out))throw new Error('Use a fresh output directory; preserve earlier measurements.');
const matureRaw=readFileSync(maturePath,'utf8'),mature=deserializeWorld(matureRaw);
if(currentLarge&&(mature.settings.rulesVersion!==CURRENT_RULES_VERSION||mature.settings.profile!=='large'||mature.W!==160||mature.H!==160||mature.tick<45*2400))throw new Error('Current Large requires its actual current rules, the 160 x 160 Large profile and at least 45 accumulated days.');
const matureName=currentLarge?'large-mature':'retained-mature';
mkdirSync(out, { recursive: true });
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const stats = (a: number[]) => {
  const sorted = [...a].sort((a,b)=>a-b);
  return { count:a.length, mean:a.reduce((s,v)=>s+v,0)/Math.max(1,a.length), p50:sorted[Math.floor(a.length*.5)]??0, p95:sorted[Math.min(a.length-1,Math.floor(a.length*.95))]??0, max:sorted.at(-1)??0 };
};
const time = (fn:()=>unknown, n:number) => Array.from({length:n},()=>{const t=performance.now();fn();return performance.now()-t;});
function census(w: World) {
  return { tick:w.tick,day:w.tick/2400,persons:w.persons.length,alive:w.persons.filter(p=>p.alive).length,buildings:w.buildings.length,households:w.households.length,sites:w.sites.length,
    events:w.events.length,relations:w.persons.reduce((n,p)=>n+Object.keys(p.relations).length,0),beliefs:w.persons.reduce((n,p)=>n+Object.keys(p.beliefs).length,0),
    arrays:Object.fromEntries(Object.entries(w).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,(v as unknown[]).length])) };
}
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/mature_perf.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,sha(readFileSync(f,'utf8'))]));
const sourceHashes=manifest();
const cases: {name:string;create:()=>World;source:string}[] = [
  {name:'normal-new',create:()=>createWorld(currentWorldSettings('normal','meadow',{immigration:false})),source:'fresh current product world'},
  {name:'large-new',create:()=>createWorld(currentWorldSettings('large','meadow',{immigration:false})),source:'fresh current product world'},
  {name:matureName,create:()=>deserializeWorld(matureRaw),source:resolve(maturePath)},
];
const results=[];
for(const c of cases) {
  const w=c.create(), original=serializeWorld(w), before=census(w);
  writeFileSync(join(out,`${c.name}-save.json`),original);
  const ids=w.persons.filter(p=>p.alive).slice(0,12).map(p=>p.id);
  let i=0;
  const inspectMs=ids.length?time(()=>describePerson(w,ids[i++%ids.length]),60):[];
  i=0;
  const historyMs=ids.length?time(()=>{const id=ids[i++%ids.length],p=w.persons.find(p=>p.id===id)!;householdHistory(w,p);relationshipHistory(w,p);civicHistory(w,p);},60):[];
  const observerPure=serializeWorld(w)===original;
  const saveMs=time(()=>serializeWorld(w),5),loadMs=time(()=>deserializeWorld(original),5);
  const loaded=deserializeWorld(original), stepMs:number[]=[];
  const stopAt=performance.now()+20_000;
  for(let n=0;n<240&&performance.now()<stopAt;n++) {
    const t=performance.now();stepWorld(w);stepMs.push(performance.now()-t);stepWorld(loaded);
  }
  const continuationEqual=serializeWorld(w)===serializeWorld(loaded);
  const result={name:c.name,source:c.source,settings:w.settings,snapshotHash:sha(original),before,after:census(w),saveBytes:Buffer.byteLength(original),
    inspectMs:stats(inspectMs),historyMs:stats(historyMs),saveMs:stats(saveMs),loadMs:stats(loadMs),stepMs:stats(stepMs),
    budgetStop:stepMs.length<240,observerPure,continuationEqual,conservation:conservationReport(w),heapUsedBytes:process.memoryUsage().heapUsed};
  results.push(result);console.log(JSON.stringify({name:c.name,stepMs:result.stepMs.p95,inspectMs:result.inspectMs.p95,saveBytes:result.saveBytes,observerPure,continuationEqual,conserved:result.conservation.ok}));
}
if(JSON.stringify(sourceHashes)!==JSON.stringify(manifest()))throw new Error('Source changed during the measurement.');
const report={question:'What do current fresh Normal/Large and the supplied genuine accumulated world cost to step, inspect, save and load?',
  workload:'240 ticks maximum and 20 seconds per case, including exact same-runtime restored continuation; 60 inspector/history queries, five save/load repetitions. No ensemble.',
  limitations:[...(currentLarge?[]:['Retained input is measured under its own rules; no current mature Large claim.']),'Timing on an active development machine, not a controlled speed comparison.','Node heap is process heap at sample time, including transient allocations; not retained world size.','An extinct input has no person inspector/history samples; zero samples are not zero cost.'],
  head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,node:process.version,platform:platform(),cpu:cpus()[0]?.model,cores:cpus().length,
  matureFileHash:sha(matureRaw),results};
writeFileSync(join(out,'headless.json'),JSON.stringify(report,null,2));
if(results.some(r=>!r.observerPure||!r.continuationEqual||!r.conservation.ok))process.exitCode=1;
