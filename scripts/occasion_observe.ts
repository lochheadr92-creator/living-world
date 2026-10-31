// Fixed ordinary window, no supplied events/resources/decisions. Version is chosen at creation, never on a mature save.
import{existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{createWorld}from'../src/sim/factory';
import{currentWorldSettings}from'../src/sim/profiles';
import{stepWorld}from'../src/sim/world';
import{serializeWorld,deserializeWorld}from'../src/app/save';
import{conservationReport}from'../src/sim/economy';
import{generateOptions}from'../src/sim/decision';
import{stageOf}from'../src/sim/people';
import{TimeBudget}from'./observers/time_budget';
const[seed,out,versionArg='111',daysArg='20']=process.argv.slice(2).filter(x=>x!=='--'),version=Number(versionArg),days=Number(daysArg);
if(!seed||!out||existsSync(out)||![110,111].includes(version)||!Number.isInteger(days)||days<1||days>45)throw new Error('Seed, fresh output, rules 110/111 and 1..45 days required');
const hash=(x:string)=>createHash('sha256').update(x).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/occasion_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration:false}),rulesVersion:version}),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},arrived=new Set<number>(),stories:unknown[]=[],budget=new TimeBudget();
const count=(k:string,n=1)=>counts[k]=(counts[k]??0)+n;
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='attend')count('attendance started');},onActivityEnd:(p,a,result,detail)=>{if(a.kind!=='attend')return;count('attendance ending:'+result);const admitted=arrived.has(a.id);if(admitted)count('admitted ending:'+result);if(stories.length<160)stories.push({tick:w.tick,person:p.id,name:p.name,stage:stageOf(w,p),result,detail,admitted,progress:a.progress,duration:a.duration,phase:a.phase});}};
const detach=budget.attach(w);let samples=0,pureChecks=0;
while(w.tick<days*2400){
 budget.sampleTick(w);
 for(const p of w.persons){const a=p.activity;if(!p.alive||a?.kind!=='attend'||a.phase!=='work')continue;const o=w.occasions?.find(o=>o.id===a.data.occasion);if(o?.attended.includes(p.id)){count('admitted participation ticks');if(!arrived.has(a.id)){arrived.add(a.id);count('physically admitted');}}}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;const ctx=generateOptions(w,p,true,true),options=ctx.options.filter(o=>o.kind==='attend');if(options.length)count('attendance offered samples');if(p.activity?.kind==='attend'&&arrived.has(p.activity.id)){count('admitted ongoing samples');if(options.some(o=>o.key===p.activity?.data.optKey))count('admitted ongoing option retained samples');}}if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);
 if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 if(w.tick%120===0&&performance.now()-began>900000)throw new Error('15-minute budget exceeded');
}
detach();delete w.hooks;const final=serializeWorld(w);
if(final!==serializeWorld(twin)||final!==serializeWorld(deserializeWorld(final)))throw new Error('Twin or reload differs');
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,continuationEqual:true,conservation:conservationReport(w),timeBudget:budget.report(),limits:'Ordinary fixed 20-day (or explicit CLI day count) window. Versions chosen at world creation. No inserted occasions, goods or decisions. Counts describe divergent worlds, not paired event opportunities or general household benefit. Arrival already grants the existing meeting/mood/exchange consequences; completion means staying through the bounded activity. Repeated samples are not independent decisions. First 160 endings retained.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({...report,source:undefined,stories:undefined,timeBudget:undefined,conservation:report.conservation.ok}));
