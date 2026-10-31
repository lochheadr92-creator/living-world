// Follow the first ordinary cart undertaking at pinned rules 113, without adding state or decisions.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport} from '../src/sim/economy';
import {nextProjectStep} from '../src/sim/project_step';
const [out]=process.argv.slice(2).filter(a=>a!=='--');if(!out||existsSync(out))throw new Error('Fresh output required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/first_cart_trace.ts').sort(),manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:113}),twin=deserializeWorld(serializeWorld(w)),began=performance.now();let person=0,plan=0,until=15*2400,pureChecks=0,omitted=0;const events:unknown[]=[],samples:unknown[]=[];let adopted:unknown,finalPlan:unknown;
const event=(value:unknown)=>{if(events.length<5000)events.push(value);else omitted++;};
w.hooks={onActivityStart:(p,a)=>{if(p.id===person)event({tick:w.tick,event:'start',kind:a.kind,label:a.label,goal:a.goal,target:a.targetId,data:structuredClone(a.data)});},onActivityEnd:(p,a,outcome,detail)=>{if(p.id===person)event({tick:w.tick,event:'end',kind:a.kind,label:a.label,outcome,detail,progress:a.progress,data:structuredClone(a.data)});}};
let stop='horizon';
while(w.tick<until){
 stepWorld(w);stepWorld(twin);
 if(!plan){for(const p of w.persons){const i=p.intentions.find(i=>i.status==='active'&&i.makes==='cart'&&i.project);if(i){person=p.id;plan=i.id;adopted={tick:w.tick,person:p.id,name:p.name,plan:structuredClone(i)};until=Math.min(15*2400,i.until+120);mkdirSync(out,{recursive:true});writeFileSync(out+'/adopted.json',serializeWorld(w));break;}}}
 if(plan){const p=w.persons.find(p=>p.id===person)!,i=p.intentions.find(i=>i.id===plan);if(i)finalPlan=structuredClone(i);
  if(w.tick%60===0||i?.status!=='active'){const before=serializeWorld(w),ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);samples.push(structuredClone({tick:w.tick,alive:p.alive,needs:{...p.needs},inv:{...p.inv},activity:p.activity?{kind:p.activity.kind,label:p.activity.label,phase:p.activity.phase,progress:p.activity.progress,target:p.activity.targetId,data:structuredClone(p.activity.data)}:null,plan:structuredClone(i),next:i?.project?nextProjectStep(ctx,i.project,i):null,top:ranked.slice(0,5).map(o=>({key:o.key,label:o.label,util:o.util,need:o.need,parts:o.parts})),blocked:ctx.blocked.filter(o=>/cart|plank|handle|yard|wood|hammer/i.test(o.label+' '+o.goal)).map(o=>({label:o.label,reason:o.blocked})),knownYards:Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.btype==='timber_yard')}));if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
  if(!p.alive||!i||i.status!=='active'){stop=!p.alive?'person died':i?.status??'plan missing';break;}
 }
 if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Unbalanced items');if(w.tick%120===0&&performance.now()-began>600000){stop='budget';break;}
}
delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin)||final!==serializeWorld(deserializeWorld(final)))throw new Error('Twin/reload mismatch');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,tick:w.tick,seconds:(performance.now()-began)/1000,stop,adopted,finalPlan,pureChecks,continuationEqual:true,conservation:conservationReport(w),carts:w.carts.length,events,samples,omitted,limits:'One first ordinary forest cart plan at pinned rules 113. No injected knowledge, goods or decisions. Repeated samples are not independent opportunities; counters and histories are not evidence of hidden intent. Does not estimate all-world reliability or benefit.'};mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({tick:w.tick,seconds:report.seconds,stop,person,plan,pureChecks,events:events.length,samples:samples.length,carts:w.carts.length,conservation:report.conservation.ok}));if(stop==='budget')process.exitCode=1;
