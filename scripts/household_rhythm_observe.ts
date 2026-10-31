// Read-only continuation of a real retained world. No supplies, decisions, rules upgrades or quotas.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {ageYears,stageOf} from '../src/sim/people';
import {TimeBudget} from './observers/time_budget';

const [input,out,daysArg='5',householdArg='1025']=process.argv.slice(2).filter(a=>a!=='--');
const days=Number(daysArg),household=Number(householdArg);
if(!input||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>10||!Number.isInteger(household))throw new Error('Retained save, fresh output, 1..10 days and household id required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/household_rhythm_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const raw=readFileSync(input,'utf8'),w=deserializeWorld(raw),initial=serializeWorld(w),twin=deserializeWorld(initial),start=w.tick,began=performance.now();
const budget=new TimeBudget(),detach=budget.attach(w);
const rows:Record<number,any>={},stories:unknown[]=[];
const bump=(r:Record<string,number>,k:string)=>r[k]=(r[k]??0)+1;
const brief=(o:any)=>o&&({kind:o.kind,label:o.label,goal:o.goal,need:o.need,util:o.util,parts:o.parts,target:o.targetId});
let pureChecks=0;
while(w.tick<start+days*2400){
  budget.sampleTick(w);
  if(w.tick%120===0){
    const before=serializeWorld(w);
    for(const p of w.persons){
      if(!p.alive)continue;
      const stage=stageOf(w,p),ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),best=ranked[0];
      const r=rows[p.id]??={name:p.name,hh:p.hhId,ageAtFirstSample:ageYears(w,p),stage,samples:0,criticalSamples:0,noCriticalSamples:0,leaders:{},unpressuredLeaders:{},currentKinds:{},leisureOffered:0,leisureEligible:0,leisureFirst:0,leisureTravelSamples:0,initialNeeds:{...p.needs},lastNeeds:{}};
      r.samples++;r.lastNeeds={...p.needs};bump(r.currentKinds,(p.activity?.kind??'none')+'|'+(p.activity?.phase??'none'));
      bump(r.leaders,best?.label??'none');
      if(ctx.criticals.length)r.criticalSamples++;else{r.noCriticalSamples++;bump(r.unpressuredLeaders,best?.label??'none');}
      const leisure=(o:any)=>o.kind==='wander'||o.kind==='alone';
      if(ctx.options.some(leisure))r.leisureOffered++;
      if(ranked.some(leisure))r.leisureEligible++;
      if(best&&leisure(best))r.leisureFirst++;
      if(p.activity&&leisure(p.activity)&&p.activity.phase==='travel')r.leisureTravelSamples++;
      if(p.hhId===household&&(stage==='adult'||stage==='elder')&&!ctx.criticals.length&&stories.length<120){
        stories.push({tick:w.tick,person:p.id,name:p.name,needs:{...p.needs},activity:p.activity&&{kind:p.activity.kind,phase:p.activity.phase,goal:p.activity.goal},inventory:{...p.inv},home:ctx.home?.id,householdStore:ctx.home ? JSON.parse(JSON.stringify(ctx.home.store)) : undefined,plans:p.intentions.map(i=>({kind:i.kind,status:i.status,step:i.step,reason:i.reason})),top:ranked.slice(0,3).map(brief),leisure:ranked.filter(leisure).map(brief)});
      }
    }
    if(serializeWorld(w)!==before)throw new Error('Observer mutated saved state');pureChecks++;
  }
  stepWorld(w);stepWorld(twin);
  if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
  if(w.tick%120===0&&performance.now()-began>600000)throw new Error('Ten-minute budget exceeded');
}
detach();const final=serializeWorld(w);
if(final!==serializeWorld(twin))throw new Error('Observed and unobserved continuations differ');
if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Save reload differs');
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),input,inputHash:hash(raw),source,settings:w.settings,start,end:w.tick,days,household,seconds:(performance.now()-began)/1000,pureChecks,continuationEqual:true,conservation:conservationReport(w),population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,rows,stories,timeBudget:budget.report(),limits:'Historical saved rules retained. All living people reported. Household 1025 selected from the earlier meadow day-45 lead; not a random household. Five-day window predeclared. No-critical samples do not establish adequate supply. Leisure travel is secondary sampled purpose, not extra occupancy. Samples are repeated states, not independent decisions; option leaders need not replace a committed activity. No intervention or causal-benefit claim.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);
console.log(JSON.stringify({start,end:w.tick,pureChecks,people:Object.keys(rows).length,population:report.population,seconds:report.seconds,conserved:report.conservation.ok}));
