import {gitProvenance,sourceManifest} from './observers/provenance';
// Diagnose a retained ordinary food crisis without changing needs, resources, knowledge or rules.
import{existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{deserializeWorld,serializeWorld}from'../src/app/save';
import{stepWorld}from'../src/sim/world';
import{generateOptions,rankOptions}from'../src/sim/decision';
import{conservationReport,foodUnits,invWeight}from'../src/sim/economy';
import{carryCap,stageOf}from'../src/sim/people';
import{estimatedAmount}from'../src/sim/knowledge';
import{SOURCE_FOOD}from'../src/sim/food_help';
import{CRITICAL}from'../src/sim/constants';
import{TimeBudget}from'./observers/time_budget';
const[input,out,daysArg='6']=process.argv.slice(2).filter(x=>x!=='--'),days=Number(daysArg);
if(!input||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>10)throw new Error('Retained save, fresh output and 1..10 days required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/food_pressure_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>sourceManifest(files),source=manifest();
const raw=readFileSync(input,'utf8'),w=deserializeWorld(raw),twin=deserializeWorld(serializeWorld(w)),start=w.tick,began=performance.now(),counts:Record<string,number>={},people:Record<number,any>={},snapshots:any[]=[],stories:any[]=[],endings:any[]=[];
const bump=(r:Record<string,number>,k:string)=>r[k]=(r[k]??0)+1;
const targetNames=new Set(['Bram','Ada']);
w.hooks={onActivityEnd:(p,a,outcome,detail)=>{if(targetNames.has(p.name)&&endings.length<180)endings.push({tick:w.tick,person:p.id,name:p.name,kind:a.kind,phase:a.phase,need:a.need,goal:a.goal,outcome,detail,progress:a.progress,cycle:a.cycle,duration:a.duration,took:w.tick-a.start,food:foodUnits(p.inv),needs:{...p.needs}});}};
const time=new TimeBudget(),detach=time.attach(w);let pureChecks=0,samples=0;
while(w.tick<start+days*2400){
 time.sampleTick(w);
 if((w.tick-start)%2400===0)snapshots.push({tick:w.tick,alive:w.persons.filter(p=>p.alive).length,sourceFood:w.sources.filter(s=>SOURCE_FOOD[s.type]).reduce((n,s)=>n+s.amount,0),packFood:w.persons.filter(p=>p.alive).reduce((n,p)=>n+foodUnits(p.inv),0),storedFood:w.buildings.reduce((n,b)=>n+foodUnits(b.store.items),0),households:w.households.map(h=>({id:h.id,home:h.homeId,food:foodUnits(w.buildings.find(b=>b.id===h.homeId)?.store.items??{})}))});
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),food=ctx.options.filter(o=>o.need==='hunger'),eligible=ranked.filter(o=>o.need==='hunger'),critical=p.needs.hunger<CRITICAL.hunger;
  const row=people[p.id]??={name:p.name,stage:stageOf(w,p),samples:0,criticalHunger:0,criticalWithoutFoodOffer:0,criticalWithoutEligibleFood:0,criticalLeaders:{},criticalCurrent:{},criticalWithCarriedFood:0,criticalFullPack:0,criticalKnownFood:0};row.samples++;
  if(!critical)continue;row.criticalHunger++;bump(counts,'critical hunger samples');if(!food.length)row.criticalWithoutFoodOffer++;if(!eligible.length)row.criticalWithoutEligibleFood++;
  bump(row.criticalLeaders,ranked[0]?.kind??'none');bump(row.criticalCurrent,(p.activity?.kind??'none')+'|'+(p.activity?.phase??'none'));
  if(foodUnits(p.inv)>0)row.criticalWithCarriedFood++;if(invWeight(p)>=carryCap(w,p))row.criticalFullPack++;
  const known=Object.values(p.beliefs).filter(b=>SOURCE_FOOD[b.kind]&&estimatedAmount(w,b)>=1);if(known.length)row.criticalKnownFood++;
  if(targetNames.has(p.name)&&stories.length<160)stories.push({tick:w.tick,person:p.id,name:p.name,position:{x:p.x,y:p.y},health:p.health,needs:{...p.needs},critical:ctx.criticals,inventory:{...p.inv},room:carryCap(w,p)-invWeight(p),knownFood:known.length,foodOptions:food.map(o=>({kind:o.kind,label:o.label,eta:o.eta,util:o.util,parts:o.parts})),top:ranked.slice(0,2).map(o=>({kind:o.kind,label:o.label,need:o.need,eta:o.eta,util:o.util,parts:o.parts})),activity:p.activity&&{kind:p.activity.kind,phase:p.activity.phase,goal:p.activity.goal,target:p.activity.targetId},blocked:ctx.blocked.filter(o=>o.need==='hunger'||o.tag==='food').map(o=>({label:o.label,why:o.blocked}))});
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>600000)throw new Error('Ten-minute budget exceeded');
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin)||final!==serializeWorld(deserializeWorld(final)))throw new Error('Twin/reload differs');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');
const report={...gitProvenance(),input,inputHash:hash(raw),source,settings:w.settings,start,end:w.tick,days,seconds:(performance.now()-began)/1000,samples,pureChecks,counts,people,snapshots,stories,endings,deaths:w.deceased.filter(d=>d.tick>=start),timeBudget:time.report(),continuationEqual:true,conservation:conservationReport(w),limits:'Historical rules retained. Six days predeclared after inspecting the retained forest crisis. All living people counted. Bram/Ada are diagnostic leads; first 160 critical snapshots and 180 endings only. Global resource totals are observer facts, not knowledge given to anyone, and do not establish access or adequacy. Repeated samples are not independent decisions. No intervention or causal benefit estimate.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({start,end:w.tick,seconds:report.seconds,samples,pureChecks,counts,deaths:report.deaths.length,conserved:report.conservation.ok}));
