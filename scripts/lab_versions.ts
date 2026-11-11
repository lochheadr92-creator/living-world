// Compares two lab runs of the SAME seeds at two rules versions: the earlier version pinned with `lab.mjs --rules N`, the later one current, each with a control
// and the same nudge arms. For every metric the lab reports, the per-seed difference is (mean of the later version's arms) minus (mean of the earlier
// version's arms), bootstrapped across seeds as lab_report.ts does. The noise floor is the lab's own: how far one arm lands from the mean of the other arms of
// its run, pooled over both versions. An effect smaller than that floor is never called larger than chance, so "not distinguishable" over a dozen seeds is
// weak evidence of no effect (stats.ts says the same). It reads files and prints; nothing is written but the optional report path.
//   npx vite-node scripts/lab_versions.ts -- <earlier-dir> <later-dir> [report.txt] [--arms control,nudge:1,nudge:2]
// Only arms that BOTH runs carry are compared (by default every arm they share; `--arms` names them), so a run that also holds removal
// arms can be compared with a plain one: a removal arm is a different world, and averaging it in would misstate the version.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {METRICS} from './lab/lab';
import type {BranchResult,Metric} from './lab/lab';
import {mean,paired,sd,verdict} from './lab/stats';
const args=process.argv.slice(2).filter((a,i,all)=>a!=='--'&&a!=='--arms'&&all[i-1]!=='--arms');
const [dirA,dirB,reportPath]=args;
type Row=BranchResult&{seed:string;rulesVersion?:number|null;rulesPinned?:boolean;profile:string;days:number;provenance?:unknown};
function load(dir:string){
 const bySeed=new Map<string,Row[]>();
 for(const f of readdirSync(dir)){
  if(!/^lab_.+\.jsonl$/.test(f))continue;
  for(const line of readFileSync(join(dir,f),'utf8').split('\n')){
   if(!line.trim())continue;const r=JSON.parse(line) as Row;if(!r.spec)continue;
   (bySeed.get(r.seed)??bySeed.set(r.seed,[]).get(r.seed)!).push(r);
  }
 }
 return bySeed;
}
const A0=load(dirA),B0=load(dirB);
// the arms compared: named with --arms, else every arm both runs carry (read off the first seed they share); the rest are left out
const armsAt=process.argv.indexOf('--arms');
const firstShared=[...A0.keys()].find(s=>B0.has(s));
const named=armsAt>=0&&process.argv[armsAt+1]?process.argv[armsAt+1].split(',').filter(Boolean):null;
const armsUsed=named??(firstShared?A0.get(firstShared)!.map(r=>r.spec).filter(spec=>B0.get(firstShared)!.some(r=>r.spec===spec)):[]);
const keep=(m:Map<string,Row[]>)=>new Map([...m].map(([s,rows])=>[s,rows.filter(r=>armsUsed.includes(r.spec))] as [string,Row[]]));
if(armsUsed.length<3){console.log(`the two runs share ${armsUsed.length} arm(s) [${armsUsed.join(', ')}]; a comparison needs at least three (a control and two nudges) for its noise floor`);process.exit(1);}
const A=keep(A0),B=keep(B0);
const leftOut=(m:Map<string,Row[]>)=>firstShared?m.get(firstShared)!.map(r=>r.spec).filter(spec=>!armsUsed.includes(spec)):[];
const seeds=[...A.keys()].filter(s=>B.has(s)&&A.get(s)!.length>=3&&B.get(s)!.length>=3).sort();
const out:string[]=[];const say=(s:string)=>{out.push(s);console.log(s);};
if(!seeds.length){console.log('no seed has both runs complete');process.exit(1);}
const va=A.get(seeds[0])![0].rulesVersion,vb=B.get(seeds[0])![0].rulesVersion;
say(`Version comparison: rules ${va}${A.get(seeds[0])![0].rulesPinned?' (pinned)':''} against rules ${vb}${B.get(seeds[0])![0].rulesPinned?' (pinned)':''}; ${seeds.length} seeds (${seeds.join(', ')}); ${A.get(seeds[0])![0].profile} profile, ${A.get(seeds[0])![0].days} days; arms per version: ${A.get(seeds[0])!.map(r=>r.spec).join(', ')}.`);
{const a=leftOut(A0),b=leftOut(B0);if(a.length||b.length)say(`Arms left out because the other run does not carry them or --arms did not name them: earlier run [${a.join(', ')||'none'}], later run [${b.join(', ')||'none'}].`);}
const metrics=METRICS.filter(m=>[...A.values(),...B.values()].every(rows=>rows.every(r=>typeof r.outcome[m]==='number')));
// noise floor: one arm minus the mean of the other arms of its run, pooled over both versions
const noise={} as Record<Metric,number>;
for(const m of metrics){const d:number[]=[];for(const runs of [A,B])for(const s of seeds){const rows=runs.get(s)!;rows.forEach((r,i)=>d.push(r.outcome[m]-mean(rows.filter((_,j)=>j!==i).map(x=>x.outcome[m]))));}noise[m]=sd(d);}
say('Noise floor (sd of one arm against the mean of the other arms of its own run): '+metrics.map(m=>`${m} ±${noise[m].toFixed(1)}`).join('   '));
const num=(v:number,d=1)=>(Math.abs(v)<10**-d/2?'0':(v>0?'+':'')+v.toFixed(d));
const w=Math.max(15,...metrics.map(m=>m.length+1));
say('\n'+'metric'.padEnd(w)+String(va).padStart(9)+String(vb).padStart(9)+'diff'.padStart(8)+'   95% interval'.padEnd(18)+'up/down'.padStart(8)+'  verdict');
const words:string[]=[];
for(const m of metrics){
 const a=seeds.map(s=>mean(A.get(s)!.map(r=>r.outcome[m]))),b=seeds.map(s=>mean(B.get(s)!.map(r=>r.outcome[m])));
 const st=paired(b.map((x,i)=>x-a[i]));
 const v=verdict(st,noise[m],false);
 say(m.padEnd(w)+mean(a).toFixed(1).padStart(9)+mean(b).toFixed(1).padStart(9)+num(st.meanDiff).padStart(8)+`   [${num(st.lo)}, ${num(st.hi)}]`.padEnd(18)+`${st.higher}/${st.lower}`.padStart(8)+'  '+v);
 if(v==='larger than chance')words.push(`${m} ${mean(a).toFixed(1)} -> ${mean(b).toFixed(1)} (${num(st.meanDiff)}, higher in ${st.higher} and lower in ${st.lower} of ${seeds.length})`);
}
say('\n'+(words.length?'In words, beyond chance: '+words.join('; ')+'.':'In words: nothing moved by more than a single draw moves it.'));
if(reportPath)writeFileSync(reportPath,out.join('\n')+'\n');
