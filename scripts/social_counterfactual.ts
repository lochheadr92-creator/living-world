// Experiment B: stipulated prior work histories, identical present material state.
// A contract counterfactual, not an autonomous or population-benefit measurement.
import { stage, addPerson, done } from '../tests/helpers/kit';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { relOf } from '../src/sim/relations';
import { checkCommitments, createRequest, evaluateRequest, willingness } from '../src/sim/social';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { whileObserving } from '../src/sim/lifechanges';
import { newActivity, startActivity } from '../src/sim/activities';
import { stepWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
const rows=[];
for(const generosity of [0.2,0.4,0.6])for(const affinity of [0,20,40]){
 const s=stage('promise-counterfactual');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=CURRENT_RULES_VERSION;
 const a=addPerson(s,'Ada',40.5,40.5,{hunger:98,thirst:98,inv:{berries:4}});
 const b=addPerson(s,'Ben',42,40.5,{hunger:98,thirst:98,inv:{wood:6,berries:4},traits:{generosity,sociability:1}});
 for(const p of [a,b]){p.needs.warmth=95;p.needs.safety=95;p.cooldowns.pause=1e9;}
 relOf(b,a.id).affinity=affinity;relOf(b,a.id).familiarity=20;relOf(b,a.id).trust=30;
 const past=createRequest(s.w,b,a,{kind:'help_build',amount:1});past.status='promised';
 a.commitments.push({id:s.w.nextId++,requestId:past.id,kind:'help_build',to:b.id,item:null,amount:1,siteId:0,made:0,deadline:90,status:'active',delivered:0,grace:0,contrib:0});
 done(s);s.w.tick=100;s.w.sceneLabel='STAGED COUNTERFACTUAL: one prior work promise';
 const initial=serializeWorld(s.w);
 for(const arm of ['kept','broken','nudge:1','nudge:2']){
  const w=deserializeWorld(initial), A=w.byId.get(a.id) as typeof a, B=w.byId.get(b.id) as typeof b;
  if(arm==='kept')A.commitments[0].contrib=40; // the single stipulated prior interaction
  if(arm.startsWith('nudge'))for(let i=0;i<Number(arm.at(-1));i++)w.rng.next();
  const before=willingness(w,B,A,0.3);checkCommitments(w,A);
  const after=willingness(w,B,A,0.3);
  const request=createRequest(w,A,B,{kind:'wood',item:'wood',amount:2});
  const response=evaluateRequest(w,B,A,request);
  request.status='cancelled';request.note='probe only; actual conversation follows';
  const ranked=whileObserving(()=>rankOptions(generateOptions(w,B,true,true)).slice(0,5).map(o=>({key:o.key,utility:o.util})));
  A.cooldowns.pause=0;B.cooldowns.pause=0;
  startActivity(w,A,newActivity(w,A,{kind:'socialize',label:'Ask for wood',goal:'staged present interaction',targetId:B.id,targetType:'person',tx:B.x,ty:B.y,spotX:B.x-1.3,spotY:B.y,utility:100,minCommit:4000,maxTicks:600,data:{purpose:'request',conv:{reqKind:'wood',item:'wood',amount:2}}}));
  for(let i=0;i<600&&!w.requests.some(r=>r.id>request.id&&r.status!=='pending');i++)stepWorld(w);
  const actual=w.requests.find(r=>r.id>request.id&&r.from===A.id&&r.to===B.id);
  if(generosity===0.2&&affinity===40&&(arm==='kept'||arm==='broken')){
   mkdirSync('civic_evidence',{recursive:true});writeFileSync(`civic_evidence/social-${arm}-save.json`,serializeWorld(w));
  }
  rows.push({generosity,affinity,arm,prior:A.commitments[0].status,before,after,response,ranked,actual:actual?{status:actual.status,note:actual.note,delivered:actual.delivered??0}:null,ledger:conservationReport(w)});
 }
}
const report={rulesVersion:CURRENT_RULES_VERSION,hypothesis:'one prior broken rather than completed work commitment reduces later cooperation',workload:'9 fixed personality/relationship contexts x 4 arms; identical present physical state; 40 prior work versus 0; two broken-history RNG nudges',metrics:'willingness, ranked options, evaluated response, actual conversation and transferred units',rows};
mkdirSync('civic_evidence',{recursive:true});
writeFileSync(`civic_evidence/social-counterfactual-v${CURRENT_RULES_VERSION}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(rows.map(({generosity,affinity,arm,after,response,actual})=>({generosity,affinity,arm,w:after,response:response.kind,actual})),null,2));
