// STAGED saw loss, supplied initial equipment/materials. Every response is selected from legal engine offers.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/tool61-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Use a fresh output directory');
mkdirSync(out,{recursive:true});
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-tools-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{
 await b.evaluate(`(()=>{const f=window.__recovery,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(out+'/'+name+'.png');
};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const stopped=await b.evaluate(`(async()=>{
  const {batchRecipeScene}=await import('/tests/helpers/batch_recipe.ts'),kit=await import('/tests/helpers/tool_prerequisite.ts'),decision=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts'),intent=await import('/src/sim/intent.ts'),tools=await import('/src/sim/tools.ts');
  const f=batchRecipeScene(61);Object.assign(f,kit,decision,{stepWorld,save,econ,project,intent,tools});window.__recovery=f;
  f.w.sceneLabel='STAGED: required saw lost during work; legal gathering, rest, drinking, crafting and resumption selected externally';
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  const selected=f.selectPrerequisite(f.w,f.p,'operate:'+f.yard.id+':saw_planks');
  try{for(let n=0;n<500&&selected.act.phase==='travel';n++)stepWorld(f.w);for(let n=0;n<4;n++)stepWorld(f.w);
   f.job=f.yard.ops.job;f.progress=f.job.progress;f.held={...f.job.held};f.stockWood=f.yard.store.items.wood;
   tools.breakTool(f.w,tools.toolOf(f.w,f.p,'saw'),'staged mid-work loss');stepWorld(f.w);f.p.cooldowns.pause=1e12;
  }finally{selected.restore();}
  const before=save.serializeWorld(f.w),ctx=decision.generateOptions(f.w,f.p,true,true);
  return {tick:f.w.tick,person:f.p.id,yard:f.yard.id,progressBefore:f.progress,progressAfter:f.job.progress,held:f.job.held,result:f.p.lastResult,wanted:ctx.toolWanted,illegalOffer:ctx.options.some(o=>o.key==='operate:'+f.yard.id+':saw_planks'),pure:save.serializeWorld(f.w)===before,conserved:econ.conservationReport(f.w).ok};
 })()`);
 check('missing saw stops before unpaid work, retains inputs and explains replacement',stopped.progressBefore===stopped.progressAfter&&stopped.result.outcome==='partial'&&stopped.wanted.kind==='saw'&&!stopped.illegalOffer&&stopped.pure&&stopped.conserved,stopped);await shot('broken-saw-retained-batch');
 const waiting=await b.evaluate(`(()=>{const f=window.__recovery,twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));for(let n=0;n<20;n++){f.stepWorld(f.w);f.stepWorld(twin);}return {equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(twin),progress:f.job.progress};})()`);
 check('waiting save continuation is exact and adds no workshop progress',waiting.equal&&waiting.progress===stopped.progressAfter,waiting);
 const gathered=await b.evaluate(`(()=>{const f=window.__recovery,{w,p}=f;f.intent.reviewIntentions(f.generateOptions(w,p,true));f.finishPrerequisite(w,p,'gather:'+f.tree.id);f.finishPrerequisite(w,p,'haul:'+f.target.id);f.finishPrerequisite(w,p,'gather:'+f.rock.id);return {tick:w.tick,inv:{...p.inv},result:p.lastResult,jobProgress:f.job.progress,conserved:f.econ.conservationReport(w).ok};})()`);
 check('gathering pays travel and reaches the real pack limit',gathered.inv.stone===1&&gathered.jobProgress===stopped.progressAfter&&gathered.conserved,gathered);await shot('one-stone-pack-full');
 const made=await b.evaluate(`(()=>{const f=window.__recovery,{w,p}=f;f.finishPrerequisite(w,p,'sleep:'+f.home.id);f.finishPrerequisite(w,p,'drink:inv');f.finishPrerequisite(w,p,'gather:'+f.rock.id);const inputs={...p.inv};f.finishPrerequisite(w,p,'craft:saw');return {tick:w.tick,inputs,inv:{...p.inv},sameJob:f.yard.ops.job===f.job,held:f.job.held,progress:f.job.progress,conserved:f.econ.conservationReport(w).ok};})()`);
 check('sleep, drink, gathering and crafting make a real replacement without advancing the batch',made.inv.saw===1&&made.inputs.wood-(made.inv.wood??0)===2&&made.inputs.stone-(made.inv.stone??0)===2&&made.sameJob&&made.progress===stopped.progressAfter&&made.conserved,made);await shot('replacement-saw-crafted');
 const resumed=await b.evaluate(`(()=>{const f=window.__recovery,{w,p}=f,selected=f.selectPrerequisite(w,p,'operate:'+f.yard.id+':saw_planks');try{const twin=f.save.deserializeWorld(f.save.serializeWorld(w));for(let n=0;n<2000&&p.activity?.id===selected.act.id;n++){f.stepWorld(w);f.stepWorld(twin);}const equal=f.save.serializeWorld(w)===f.save.serializeWorld(twin);p.cooldowns.pause=1e12;return {tick:w.tick,equal,planks:f.yard.store.items.planks,wood:f.yard.store.items.wood,woodBefore:f.stockWood,job:f.yard.ops.job,conserved:f.econ.conservationReport(w).ok};}finally{selected.restore();}})()`);
 check('same-job resumption produces planks with exact save continuation and no repeated input charge',resumed.equal&&resumed.planks===2&&resumed.wood===resumed.woodBefore&&!resumed.job&&resumed.conserved,resumed);await shot('recovered-batch-produced-planks');
 const failure=await b.evaluate(`(()=>{const f=window.__recovery,{w,p}=f;f.finishPrerequisite(w,p,'operate:'+f.yard.id+':saw_planks');f.intent.reviewIntentions(f.generateOptions(w,p,true));const meal=f.generateOptions(w,p,true,true).options.find(o=>o.kind==='eat');f.finishPrerequisite(w,p,meal.key);const before=f.save.serializeWorld(w),ctx=f.generateOptions(w,p,true,true),key='operate:'+f.yard.id+':build_cart',offered=ctx.options.some(o=>o.key===key),eligible=f.rankOptions(ctx).some(o=>o.key===key);window.__ui.update(1);return {tick:w.tick,offered,eligible,blockers:ctx.blocked.filter(o=>o.key===key).map(o=>o.blocked),planks:f.yard.store.items.planks,carts:w.carts.length,pure:f.save.serializeWorld(w)===before,conserved:f.econ.conservationReport(w).ok};})()`);
 check('preserved downstream failure: no known water prevents the longer cart job',failure.offered&&!failure.eligible&&failure.blockers.some(s=>s.includes('no water known'))&&failure.carts===0&&failure.pure&&failure.conserved,failure);await shot('cart-waits-for-feasible-water');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/facilities.ts','src/sim/production.ts','src/sim/act_production.ts','src/sim/rulesversion.ts','tests/helpers/batch_recipe.ts','scripts/browser/tool_recovery_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:61,evidence:'STAGED initial tools/raw inputs, explicit saw loss, externally selected legal actions and 20 ticks of waiting. No ordinary-adoption claim. Preserved no-known-water cart failure.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
