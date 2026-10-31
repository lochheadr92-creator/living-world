// Fixed ordinary personal-arrangement screen. No forced invitations, tables, supplies or decisions.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,foodUnits} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {TimeBudget} from './observers/time_budget';
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/meeting_arrangements_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],adverse:unknown[]=[],seenStarts=new Set<number>(),recovered=new Map<number,number>(),heldMeals=new Set<number>(),knowledgeEvents=new Set<string>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n;
const story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
w.hooks={
 onActivityStart:(p,a)=>{const pile=w.byId.get(a.targetId),related=a.kind==='socialize'&&['invite','cancel_meeting'].includes(a.data.purpose as string)||a.kind==='host_meal'||a.kind==='attend_meal'||pile?.ent==='pile'&&!!pile.mealFood&&['withdraw','eat_store'].includes(a.kind);
  if(related){count('started:'+a.kind);seenStarts.add(a.id);story({event:'start',tick:w.tick,person:p.id,activity:a.id,kind:a.kind,purpose:a.data.purpose,proposal:a.data.conv,target:a.targetId,inventory:{...p.inv}});}
  if(a.kind==='eat'&&recovered.has(p.id)){count('later pack meals by a collector');story({event:'later pack meal',tick:w.tick,person:p.id,previousRecovery:recovered.get(p.id),inventory:{...p.inv},hunger:p.needs.hunger});}
 },
 onActivityEnd:(p,a,outcome,detail)=>{if(seenStarts.has(a.id)){count('ended:'+a.kind+':'+outcome);const entry={event:'end',tick:w.tick,person:p.id,activity:a.id,kind:a.kind,target:a.targetId,cycles:a.cycle,outcome,detail,inventory:{...p.inv},needs:{...p.needs}};story(entry);if(outcome!=='success'&&adverse.length<50)adverse.push(entry);}},
 onTransfer:info=>{const from=w.byId.get(Number(info.from.split(':')[1]));if(info.reason==='set out for a shared meal'||info.reason==='left at the meal site'||from?.ent==='pile'&&from.mealFood){
   count('units:'+info.reason,info.n);story({event:'transfer',tick:w.tick,...info});
   if(from?.ent==='pile'&&from.mealFood&&info.to.startsWith('person:'))recovered.set(Number(info.to.split(':')[1]),w.tick);
  }}
};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);for(const m of w.meals)for(const [id,k] of Object.entries(m.heard??{})){for(const [event,value] of Object.entries({reply:k.reply,arrived:k.arrivedAt,ate:k.ateAt,ended:k.ended?.source,explanation:k.laterExplanation?.tick})){if(value===undefined)continue;const key=m.id+':'+id+':'+event+':'+value;if(!knowledgeEvents.has(key)){knowledgeEvents.add(key);count('knowledge:'+event+':'+(event==='reply'||event==='ended'?value:'recorded'));story({event:'personal knowledge',tick:w.tick,meal:m.id,person:Number(id),field:event,value,known:JSON.parse(JSON.stringify(k))});}}for(const [guest,u] of Object.entries(k.updates??{})){for(const [event,value] of Object.entries({heard:u.heardAt,acknowledged:u.acknowledgedAt})){if(value===undefined)continue;const key=m.id+':'+id+':'+guest+':update:'+event;if(!knowledgeEvents.has(key)){knowledgeEvents.add(key);count('update:'+event);story({event:'meeting update',tick:w.tick,meal:m.id,speaker:Number(id),guest:Number(guest),phase:event,value});}}}}for(const pile of w.piles)if(pile.mealFood){heldMeals.add(pile.mealFood.mealId);count('leftover holding ticks');}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
   const known=Object.values(p.beliefs).filter(b=>b.kind==='pile'&&b.hh===p.hhId&&foodUnits(b.items??{})>0);if(known.length)count('sampled known owned leftover food');
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);for(const o of ctx.options)if(o.tag==='meal'||o.key.includes('cancel_meeting')){const kind=o.key.includes(':reschedule:')?'replacement':o.key.includes('cancel_meeting')?'cancellation':o.kind;count('sampled offered:'+kind);if(ranked[0]?.key===o.key)count('sampled ranked first:'+kind);}for(const o of ctx.options)if(o.kind==='withdraw'&&o.tag==='meal'){count('sampled recovery offers');if(ranked[0]?.key===o.key)count('sampled recovery ranked first');}
   observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
  }for(const pile of w.piles)if(pile.mealFood)describeEntity(w,pile.id);if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,samples,pureChecks,counts,meals:w.meals,heldMeals:[...heldMeals],remaining:w.piles.filter(p=>p.mealFood).map(p=>({id:p.id,origin:p.mealFood,items:p.items})),stories,adverse,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence/adverse screen, not aggregate benefit or mature Large performance. Repeated samples are not independent opportunities. Later pack eating by a collector does not alone prove which fungible portions were consumed.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,meals:w.meals.map(m=>({id:m.id,status:m.status,ate:m.ate,missed:m.missed})),remaining:report.remaining,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
