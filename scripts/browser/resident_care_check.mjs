// Real page: staged household/injury/departure, followed by ordinary return and care.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/resident66-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Use a fresh output directory');
mkdirSync(out,{recursive:true});
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-resident-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9367/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port already in use');
const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,recipient=false)=>{
 await b.evaluate(`(()=>{const f=window.__resident,g=window.__game,p=${recipient?'f.elder':'f.helper'},pt=f.project(p.x,p.y);g.select(p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2.3};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(out+'/'+name+'.png');
};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});
 for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 await b.evaluate(`(async()=>{
  const {residentCareScene}=await import('/tests/helpers/resident_care.ts'),decision=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts'),{selectPrerequisite}=await import('/tests/helpers/tool_prerequisite.ts'),{solidChanged}=await import('/src/sim/registry.ts');
  window.__residentLoad=()=>{const f=residentCareScene();Object.assign(f,decision,{stepWorld,save,econ,project,selectPrerequisite,solidChanged});window.__resident=f;window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return f;};
 })()`);
 const journey=await b.evaluate(`(()=>{
  const f=window.__residentLoad(),{w,helper:p,elder:q}=f,before=f.save.serializeWorld(w),ctx=f.generateOptions(w,p,true,true),pure=before===f.save.serializeWorld(w);
  const option=ctx.options.find(o=>o.key==='give:'+q.id+':home'),memory=JSON.parse(JSON.stringify(p.whereabouts[q.id]));
  for(let n=0;n<80&&!p.activity?.data.residentCare;n++)f.stepWorld(w);
  f.act=p.activity;f.twin=f.save.deserializeWorld(f.save.serializeWorld(w));f.receipts=[];f.hunger=q.needs.hunger;
  w.hooks={onTransfer:t=>{if(t.reason==='given')f.receipts.push({tick:w.tick,n:t.n,item:t.item,giverInside:p.indoors??0,receiverInside:q.indoors??0});}};
  return {pure,memory,offered:!!option,kind:p.activity?.kind,care:p.activity?.data.residentCare,phase:p.activity?.phase,goal:p.activity?.goal,position:[p.x,p.y],seen:p.seen.some(s=>s.id===q.id)};
 })()`);
 check('remembered indoor need leads to an ordinary return journey',journey.pure&&journey.offered&&journey.care&&journey.phase==='travel'&&!journey.seen,journey);await shot('returning-to-help');
 const entered=await b.evaluate(`(()=>{const f=window.__resident;for(let n=0;n<600&&f.helper.activity?.id===f.act.id&&f.act.phase==='travel';n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {phase:f.helper.activity?.phase,giverInside:f.helper.indoors,receiverInside:f.elder.indoors,expected:f.home.id};})()`);
 check('helper enters the lawful home before handing anything over',entered.phase==='work'&&entered.giverInside===entered.expected&&entered.receiverInside===entered.expected,entered);await shot('inside-with-elder');
 const meal=await b.evaluate(`(()=>{const f=window.__resident;for(let n=0;n<800&&f.elder.needs.hunger<f.hunger+5;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const before=f.save.serializeWorld(f.w);window.__ui.update(1);return {tick:f.w.tick,receipts:f.receipts,home:f.home.id,hungerBefore:f.hunger,hunger:f.elder.needs.hunger,eaten:f.w.ledger.reasons['-eaten'],helperBread:f.helper.inv.bread,elderBread:f.elder.inv.bread,activity:f.elder.activity?.kind,conserved:f.econ.conservationReport(f.w).ok,equal:before===f.save.serializeWorld(f.twin),pure:before===f.save.serializeWorld(f.w)};})()`);
 check('real same-room receipt is followed by eating, with exact saved continuation',meal.receipts.length>0&&meal.receipts.every(t=>t.giverInside===meal.home&&t.receiverInside===meal.home)&&meal.hunger>meal.hungerBefore+5&&meal.eaten>0&&meal.conserved&&meal.equal&&meal.pure,meal);await shot('elder-eats',true);
 const blocked=await b.evaluate(`(()=>{
  const f=window.__residentLoad(),chosen=f.selectPrerequisite(f.w,f.helper,'give:'+f.elder.id+':home');
  f.w.sceneLabel='STAGED blocked entrance after legal care selection; actual return attempt and failure';
  f.w.solid[f.home.doorY*f.w.W+f.home.doorX]=1;f.solidChanged(f.w);
  try{for(let n=0;n<800&&f.helper.activity?.id===chosen.act.id;n++)f.stepWorld(f.w);}finally{chosen.restore();}
  return {result:f.helper.lastResult,helperBread:f.helper.inv.bread,elderBread:f.elder.inv.bread??0,inside:f.helper.indoors??0,conserved:f.econ.conservationReport(f.w).ok};
 })()`);
 check('blocked entrance reports failure and preserves the carried food',blocked.result?.outcome==='failed'&&blocked.result?.detail==='home entrance is blocked'&&blocked.helperBread===3&&blocked.elderBread===0&&!blocked.inside&&blocked.conserved,blocked);await shot('entrance-blocked');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/resident_contact.ts','src/sim/resident_care.ts','src/sim/perception.ts','src/sim/options_work.ts','src/sim/activities.ts','src/sim/social.ts','src/sim/types.ts','src/sim/rulesversion.ts','tests/helpers/resident_care.ts','scripts/browser/resident_care_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:66,evidence:'STAGED household, injury, food and initial legal departure. Return, entry, receipt and eating use ordinary choices. Negative case selects a legal care action and imposes a blocked entrance. Not evidence of ordinary adoption or welfare benefit.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
