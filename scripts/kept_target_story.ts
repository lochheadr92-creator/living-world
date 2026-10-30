// Reproduce two early ordinary rules-65 meadow events, without choosing an action.
import {existsSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {keptTargetOn,setKeptTarget} from '../src/sim/kept_target';
import {conservationReport} from '../src/sim/economy';
const [out]=process.argv.slice(2).filter(a=>a!=='--');
if(!out||existsSync(out))throw new Error('Fresh output file required');
const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:65}),twin=deserializeWorld(serializeWorld(w));
const people=new Set([1019,1031]),samples:any[]=[],endings:any[]=[];
w.hooks={onActivityEnd:(p,a,outcome,detail)=>{
 if(!people.has(p.id)||a.kind!=='gather')return;
 const target=w.byId.get(a.targetId);
 endings.push({tick:w.tick,person:p.id,name:p.name,activity:a.id,target:a.targetId,targetKind:target?.ent==='source'?target.type:target?.ent,cycle:a.cycle,outcome,detail,inventory:{...p.inv}});
}};
while(w.tick<180){
 if(w.tick===120){
  const before=serializeWorld(w),enabled=keptTargetOn();
  try{for(const p of w.persons.filter(p=>people.has(p.id))){
   const key=p.activity?.data.optKey;setKeptTarget(true);const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
   setKeptTarget(false);const without=generateOptions(w,p,true,true);
   samples.push({tick:w.tick,person:p.id,name:p.name,activity:p.activity?.id,key,phase:p.activity?.phase,withRetention:ctx.options.some(o=>o.key===key),withoutRetention:without.options.some(o=>o.key===key),eligible:ranked.some(o=>o.key===key),best:ranked[0]?.key,inventory:{...p.inv}});
  }}finally{setKeptTarget(enabled);}
  if(serializeWorld(w)!==before)throw new Error('Story sampling changed state');
 }
 stepWorld(w);stepWorld(twin);
}
delete w.hooks;
if(serializeWorld(w)!==serializeWorld(twin)||!conservationReport(w).ok)throw new Error('Invalid story continuation');
const report={settings:w.settings,until:w.tick,samples,endings,continuationEqual:true,conservation:conservationReport(w),limit:'Short exact replay of the retained ordinary rules-65 seed. Retention was sampled against disabled alternatives without enacting the ablation. Subsequent success does not prove retention caused it or improved aggregate outcomes.'};
writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
