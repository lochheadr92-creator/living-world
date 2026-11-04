// Compare complete declared cohorts; read-only with respect to all retained runs.
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const [beforeArg,afterArg,outArg]=process.argv.slice(2);
if(!beforeArg||!afterArg||!outArg||existsSync(outArg))throw Error('Two complete cohorts and a fresh output filename required');
const sha=b=>createHash('sha256').update(b).digest('hex');
const design=[[4,0],...Array.from({length:8},(_,n)=>[4,n+1]),...[2,3,5,6].flatMap(f=>Array.from({length:4},(_,n)=>[f,n+1]))];
function cohort(path){
 const rows=new Map(),manifests=new Set(),rules=new Set(),initial=new Map();
 for(const d of readdirSync(path,{withFileTypes:true}).filter(d=>d.isDirectory())){
  const report=join(path,d.name,'report.json');if(!existsSync(report))continue;
  const r=JSON.parse(readFileSync(report,'utf8')),s=r.settings;
  if(!['forest','river','meadow'].includes(r.seed))continue;
  if(r.days!==25||r.tick!==60000||s.population!==28||s.immigration!==true||s.harsh!==false||s.scene!=='natural'||s.dynamics!=='rich'||s.seed!==r.seed||!r.conservation.ok||!r.exactSave||!r.continuationEqual)throw Error('Invalid completed draw '+report);
  if(sha(readFileSync(join(path,d.name,'final.json')))!==r.finalSaveHash)throw Error('Final save mismatch '+report);
  const key=`${r.seed}:${r.fork}:${r.nudge}`;if(rows.has(key))throw Error('Duplicate draw '+key);rows.set(key,r);
  manifests.add(JSON.stringify(Object.entries(r.source).sort(([a],[b])=>a.localeCompare(b))));rules.add(s.rulesVersion);
  if(initial.has(r.seed)&&initial.get(r.seed)!==r.initialHash)throw Error('Different starting worlds within seed '+r.seed);initial.set(r.seed,r.initialHash);
 }
 if(rows.size!==75||manifests.size!==1||rules.size!==1)throw Error('Cohort must have 75 draws and one source/rules version');
 for(const seed of ['forest','river','meadow'])for(const [f,n] of design)if(!rows.has(`${seed}:${f}:${n}`))throw Error('Missing declared draw');
 return {path:resolve(path),rows,rules:[...rules][0],sourceHash:sha([...manifests][0])};
}
function metrics(r){
 const m={population:r.population,deaths:r.deaths.length,unfinishedSites:r.unfinishedSites.length,unfinishedBatches:r.unfinishedBatches.length};
 for(const [k,v] of Object.entries(r.ageTicks))m['ageTicks:'+k]=v;
 for(const age of ['child','youth','adult','elder'])for(const kind of ['empty immediate hunger','exposure','empty thirst','exhaustion']){
  const alive=r.ageTicks['alive:'+age]??0;m[`per1000AliveTicks:${kind}:${age}`]=alive?1000*(r.ageTicks[kind+':'+age]??0)/alive:null;
 }
 for(const [k,v] of Object.entries(r.timeBudget.totals))m['time:'+k]=v;
 for(const field of ['created','consumed','spoiled','reasons'])for(const [k,v] of Object.entries(r.ledger[field]))m[`ledger:${field}:${k}`]=v;
 for(const site of r.unfinishedSites){m.unfinishedWork=(m.unfinishedWork??0)+Math.max(0,site.total-site.work);for(const [k,v] of Object.entries(site.delivered))m['unfinishedDelivered:'+k]=(m['unfinishedDelivered:'+k]??0)+v;}
 for(const {job} of r.unfinishedBatches){
  m.unfinishedBatchWork=(m.unfinishedBatchWork??0)+Math.max(0,job.total-job.progress);
  m.unfinishedBatchBurn=(m.unfinishedBatchBurn??0)+(job.burnLeft??0);
  for(const [k,v] of Object.entries(job.held??{}))m['unfinishedBatchHeld:'+k]=(m['unfinishedBatchHeld:'+k]??0)+v;
 }
 for(const pile of r.materialOnGround){for(const [k,v] of Object.entries(pile.items))m['ground:'+k]=(m['ground:'+k]??0)+v;
  for(const [k,v] of Object.entries(pile.carcass?.remaining??{}))m['unrecoveredBody:'+k]=(m['unrecoveredBody:'+k]??0)+v;
 }
 for(const [k,v] of Object.entries(r.timeBudget.starts))m['starts:'+k]=v;
 for(const [k,v] of Object.entries(r.timeBudget.endings))m['endings:'+k]=v;
 for(const [k,v] of Object.entries(r.timeBudget.failedTravel))m['interruptedOrFailedTravel:'+k]=v.travelTicks;
 for(const death of r.deaths)m['deathsByRecordedCause:'+death.cause]=(m['deathsByRecordedCause:'+death.cause]??0)+1;
 return m;
}
function stats(values){const a=values.filter(v=>v!==null).sort((a,b)=>a-b);return a.length?{n:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,median:a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2,min:a[0],max:a.at(-1)}:null;}
const before=cohort(beforeArg),after=cohort(afterArg),seeds={};
const comparableSettings=r=>Object.fromEntries(Object.entries(r.settings).filter(([k])=>k!=='rulesVersion').sort(([a],[b])=>a.localeCompare(b)));
for(const [key,r] of before.rows)if(JSON.stringify(comparableSettings(r))!==JSON.stringify(comparableSettings(after.rows.get(key))))throw Error('Settings differ beyond the declared rules version: '+key);
function nutrition(c,seed){
 const rows=[...c.rows.values()].filter(r=>r.seed===seed);
 if(rows.some(r=>!Array.isArray(r.nourishment)))return null;
 const totals=rows.map(r=>{
  const counts={};for(const segment of r.nourishment){if(Math.abs(segment.balanceError)>1e-6)throw Error('Unbalanced nutrition '+r.seed+':'+r.fork+':'+r.nudge);for(const [k,v] of Object.entries(segment.counts))counts[k]=(counts[k]??0)+v;}
  return counts;
 });
 return Object.fromEntries([...new Set(totals.flatMap(Object.keys))].sort().map(k=>[k,stats(totals.map(r=>r[k]??0))]));
}
for(const seed of ['forest','river','meadow']){
 const pairs=design.map(([f,n])=>{const key=`${seed}:${f}:${n}`;return {fork:f,nudge:n,before:metrics(before.rows.get(key)),after:metrics(after.rows.get(key))};});
 const keys=[...new Set(pairs.flatMap(p=>[...Object.keys(p.before),...Object.keys(p.after)]))].sort(),summary={};
 for(const key of keys){const a=pairs.map(p=>Object.hasOwn(p.before,key)?p.before[key]:0),b=pairs.map(p=>Object.hasOwn(p.after,key)?p.after[key]:0);summary[key]={before:stats(a),after:stats(b),pairedDifference:stats(a.map((v,i)=>v===null||b[i]===null?null:b[i]-v))};}
 seeds[seed]={summary,nourishmentAccounting:{before:nutrition(before,seed),after:nutrition(after,seed)},populationPairs:pairs.map(p=>({fork:p.fork,nudge:p.nudge,before:p.before.population,after:p.after.population,difference:p.after.population-p.before.population}))};
}
writeFileSync(outArg,JSON.stringify({before:{path:before.path,rules:before.rules,sourceHash:before.sourceHash},after:{path:after.path,rules:after.rules,sourceHash:after.sourceHash},design,seeds,
 limits:'Descriptive matched seed/nudge summaries, not independent-world inference. Draws share prefixes; trajectories diverge across rules. Per-age rates omit draws with zero alive ticks for that age. Care starts/endings and total work/travel do not isolate displaced care time. Ground items and remaining body contents are separate; ledger spoilage records body losses. The rules121 baseline has no carcass mechanic. Null nutrition accounting means the flow observer was absent, not zero intake. Empty immediate hunger is not necessarily starvation damage when paid reserves cover the deficit. No universal benefit claim.'},null,2)+'\n');
console.log(JSON.stringify({before:before.rules,after:after.rules,seeds:Object.fromEntries(Object.entries(seeds).map(([s,v])=>[s,v.summary.population]))}));
