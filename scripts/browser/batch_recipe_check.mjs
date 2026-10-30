// STAGED, explicitly selected legal actions. Real rendering, physical work, conservation and same-browser continuation.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/batch60-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Use a fresh evidence directory');
mkdirSync(out,{recursive:true});
// cdp clears its disposable profile; verify this unique target is inside the temporary directory and absent first.
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-batch-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{
 await b.evaluate(`(()=>{const f=window.__batch,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(out+'/'+name+'.png');
};
try {
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const initial=await b.evaluate(`(async()=>{
  const {batchRecipeScene}=await import('/tests/helpers/batch_recipe.ts'),kit=await import('/tests/helpers/tool_prerequisite.ts'),decision=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts'),intent=await import('/src/sim/intent.ts'),activities=await import('/src/sim/activities.ts');
  const f=batchRecipeScene(60);f.p.needs.thirst=64;Object.assign(f,kit,decision,{stepWorld,save,econ,project,intent,activities});window.__batch=f;
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  const before=save.serializeWorld(f.w),plan=f.p.intentions.find(i=>i.makes==='cart'),ctx=decision.generateOptions(f.w,f.p,true,true);
  return {step:plan.step,key:plan.stepKey,offered:ctx.options.some(o=>o.key===plan.stepKey),pure:save.serializeWorld(f.w)===before};
 })()`);
 check('plan names the offered sawing action and observation is pure',initial.key.endsWith(':saw_planks')&&initial.offered&&initial.pure,initial);await shot('planned-sawing');
 const progress=await b.evaluate(`(async()=>{const {describePerson}=await import('/src/sim/inspect.ts'),f=window.__batch,{w,p}=f,key='operate:'+f.yard.id+':saw_planks';const selected=f.selectPrerequisite(w,p,key);f.restore=selected.restore;f.act=selected.act;for(let n=0;n<500&&f.act.phase==='travel';n++)f.stepWorld(w);for(let n=0;n<4;n++)f.stepWorld(w);return {phase:p.activity?.phase,pose:p.pose,recipe:f.yard.ops.job?.recipe,progress:f.yard.ops.job?.progress,held:f.yard.ops.job?.held,panelProgress:describePerson(w,p.id).activity.progress};})()`);
 check('real workshop holds inputs and panel progress follows actual sawing',progress.phase==='work'&&progress.pose==='saw'&&progress.recipe==='saw_planks'&&progress.progress>0&&progress.panelProgress>0,progress);await shot('sawing-in-progress');
 const resumed=await b.evaluate(`(()=>{const f=window.__batch,{w,p}=f;f.activities.endActivity(w,p,'interrupted','staged drink break');p.cooldowns.pause=1e12;f.restore();f.finishPrerequisite(w,p,'drink:inv');f.intent.reviewIntentions(f.generateOptions(w,p,true));const step=p.intentions.find(i=>i.makes==='cart').stepKey;const selected=f.selectPrerequisite(w,p,step);try{const twin=f.save.deserializeWorld(f.save.serializeWorld(w));for(let n=0;n<2000&&p.activity?.id===selected.act.id;n++){f.stepWorld(w);f.stepWorld(twin);}const equal=f.save.serializeWorld(w)===f.save.serializeWorld(twin);p.cooldowns.pause=1e12;return {equal,planks:f.yard.store.items.planks,water:p.inv.water??0,conserved:f.econ.conservationReport(w).ok};}finally{selected.restore();}})()`);
 check('drink costs water; resumed work and intermediate save produce identical state',resumed.equal&&resumed.planks===2&&resumed.water===0&&resumed.conserved,resumed);await shot('first-planks-after-drink');
 const cart=await b.evaluate(`(()=>{const f=window.__batch,{w,p}=f;f.finishPrerequisite(w,p,'operate:'+f.yard.id+':saw_planks');f.intent.reviewIntentions(f.generateOptions(w,p,true));const i=p.intentions.find(i=>i.makes==='cart');f.finishPrerequisite(w,p,i.stepKey);f.intent.reviewIntentions(f.generateOptions(w,p,true));return {status:i.status,carts:w.carts.map(c=>({id:c.id,hh:c.ownerHh,load:c.load})),stock:f.yard.store.items,conserved:f.econ.conservationReport(w).ok};})()`);
 check('two real batches supply a physically built household cart',cart.status==='done'&&cart.carts.length===1&&cart.conserved,cart);await shot('cart-built');
 const hauling=await b.evaluate(`(()=>{const f=window.__batch,{w,p}=f;f.finishPrerequisite(w,p,'sleep:'+f.home.id);const selected=f.selectPrerequisite(w,p,'cart:'+w.carts[0].id+':'+f.target.id);f.restore=selected.restore;f.act=selected.act;for(let n=0;n<1500&&!(w.carts[0].load.stone>0&&selected.act.phase==='travel');n++)f.stepWorld(w);return {load:w.carts[0].load,person:{x:p.x,y:p.y},cart:{x:w.carts[0].x,y:w.carts[0].y},phase:p.activity?.phase,conserved:f.econ.conservationReport(w).ok};})()`);
 check('the loaded cart travels with physical stone',hauling.load.stone>0&&hauling.phase==='travel'&&hauling.conserved,hauling);await shot('loaded-cart-travelling');
 const used=await b.evaluate(`(()=>{const f=window.__batch,{w,p}=f;try{for(let n=0;n<2000&&p.activity?.id===f.act.id;n++)f.stepWorld(w);p.cooldowns.pause=1e12;}finally{f.restore();}const delivered=f.target.delivered.stone;f.finishPrerequisite(w,p,'build:'+f.target.id);const before=f.save.serializeWorld(w);window.__ui.update(1);return {tick:w.tick,delivered,used:f.target.used.stone,work:f.target.work,cartLoad:w.carts[0].load,conserved:f.econ.conservationReport(w).ok,pure:f.save.serializeWorld(w)===before};})()`);
 check('unloaded stone is consumed by real construction and inspection stays pure',used.delivered>4&&used.used>0&&used.work>0&&used.conserved&&used.pure,used);await shot('delivered-stone-used');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/batch_plan.ts','src/sim/production.ts','src/sim/rulesversion.ts','src/sim/inspect.ts','src/sim/inspect_work.ts','tests/helpers/batch_recipe.ts','scripts/browser/batch_recipe_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:60,evidence:'STAGED supplied tools/raw inputs/site/load; explicitly selected legal actions. Forced interruption then actual drink, sleep, work and delivery. No ordinary-adoption or aggregate claim.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
} finally { await b.close(); }
