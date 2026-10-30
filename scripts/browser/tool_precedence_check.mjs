// STAGED competing wants. All work is selected explicitly from the ordinary legal options.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/tools64-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Use a fresh output directory');mkdirSync(out,{recursive:true});
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-precedence-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9367/json/version');occupied=true;}catch{}if(occupied)throw new Error('Browser port already in use');
const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{
 await b.evaluate(`(()=>{const f=window.__precedence,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(out+'/'+name+'.png');
};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const initial=await b.evaluate(`(async()=>{
  const {toolPrecedenceScene}=await import('/tests/helpers/tool_precedence.ts'),kit=await import('/tests/helpers/tool_prerequisite.ts'),decision=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts'),knowledge=await import('/src/sim/knowledge.ts');
  const f=toolPrecedenceScene();Object.assign(f,kit,decision,{stepWorld,save,econ,project,knowledge,toolPrecedenceScene});window.__precedence=f;
  f.w.sceneLabel='STAGED: plank and cart demand compete; known inputs and legal gathering, crafting and cart work selected externally';
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  const before=save.serializeWorld(f.w),ctx=decision.generateOptions(f.w,f.p,true,true);
  return {wanted:ctx.toolWanted,blockers:ctx.blocked.map(o=>o.blocked),craftOffered:ctx.options.some(o=>o.key==='craft:hammer'),pure:save.serializeWorld(f.w)===before};
 })()`);
 check('hammer required by the cart takes precedence without inventing its inputs',initial.wanted.kind==='hammer'&&initial.wanted.required&&!initial.craftOffered&&initial.pure,initial);await shot('required-hammer');
 const crafting=await b.evaluate(`(()=>{const f=window.__precedence,{w,p}=f;f.finishPrerequisite(w,p,'gather:'+f.tree.id);f.finishPrerequisite(w,p,'gather:'+f.rock.id);const inputs={...p.inv},selected=f.selectPrerequisite(w,p,'craft:hammer');f.act=selected.act;f.restore=selected.restore;for(let n=0;n<500&&f.act.phase==='travel';n++)f.stepWorld(w);for(let n=0;n<4;n++)f.stepWorld(w);return {tick:w.tick,inputs,phase:p.activity?.phase,goal:p.activity?.goal,plan:p.intentions.find(i=>i.kind==='tool'),conserved:f.econ.conservationReport(w).ok};})()`);
 check('real gathered wood and stone support a hammer plan and physical crafting',crafting.inputs.wood>=1&&crafting.inputs.stone>=2&&crafting.phase==='work'&&crafting.goal.includes('handcart')&&crafting.plan.makes==='hammer'&&crafting.conserved,crafting);await shot('making-required-hammer');
 const made=await b.evaluate(`(()=>{const f=window.__precedence,{w,p}=f,twin=f.save.deserializeWorld(f.save.serializeWorld(w));try{for(let n=0;n<1500&&p.activity?.id===f.act.id;n++){f.stepWorld(w);f.stepWorld(twin);}const equal=f.save.serializeWorld(w)===f.save.serializeWorld(twin);p.cooldowns.pause=1e12;return {equal,inventory:{...p.inv},result:p.lastResult,conserved:f.econ.conservationReport(w).ok};}finally{f.restore();}})()`);
 check('crafted hammer costs inputs and saved continuation is exact',made.equal&&made.inventory.hammer===1&&(made.inventory.wood??0)===crafting.inputs.wood-1&&(made.inventory.stone??0)===crafting.inputs.stone-2&&made.conserved,made);
 const working=await b.evaluate(`(()=>{const f=window.__precedence,{w,p}=f,selected=f.selectPrerequisite(w,p,'operate:'+f.yard.id+':build_cart');f.act=selected.act;f.restore=selected.restore;for(let n=0;n<500&&f.act.phase==='travel';n++)f.stepWorld(w);for(let n=0;n<4;n++)f.stepWorld(w);return {phase:p.activity?.phase,job:f.yard.ops.job?.recipe,progress:f.yard.ops.job?.progress,conserved:f.econ.conservationReport(w).ok};})()`);
 check('the new hammer is used on the actual cart batch',working.phase==='work'&&working.job==='build_cart'&&working.progress>0&&working.conserved,working);await shot('hammer-used-on-cart');
 const hauling=await b.evaluate(`(()=>{const f=window.__precedence,{w,p}=f;try{for(let n=0;n<2000&&p.activity?.id===f.act.id;n++)f.stepWorld(w);p.cooldowns.pause=1e12;}finally{f.restore();}f.finishPrerequisite(w,p,'sleep:'+f.home.id);if(f.generateOptions(w,p,true,true).options.some(o=>o.key==='drink:inv'))f.finishPrerequisite(w,p,'drink:inv');const eat=f.generateOptions(w,p,true,true).options.find(o=>o.kind==='eat');if(eat)f.finishPrerequisite(w,p,eat.key);f.stockBefore=f.stock.store.items.stone;const selected=f.selectPrerequisite(w,p,'cart:'+w.carts[0].id+':'+f.target.id);f.act=selected.act;f.restore=selected.restore;for(let n=0;n<1500&&!(w.carts[0].load.stone>0&&f.act.phase==='travel');n++)f.stepWorld(w);return {tick:w.tick,load:w.carts[0].load,phase:p.activity?.phase,carts:w.carts.length,conserved:f.econ.conservationReport(w).ok};})()`);
 check('the completed cart carries actual stone after needs are met',hauling.carts===1&&hauling.load.stone>4&&hauling.phase==='travel'&&hauling.conserved,hauling);await shot('loaded-cart');
 const delivered=await b.evaluate(`(()=>{const f=window.__precedence,{w,p}=f;try{for(let n=0;n<2000&&p.activity?.id===f.act.id;n++)f.stepWorld(w);p.cooldowns.pause=1e12;}finally{f.restore();}const before=f.save.serializeWorld(w);window.__ui.update(1);return {tick:w.tick,delivered:f.target.delivered.stone,withdrawn:f.stockBefore-f.stock.store.items.stone,result:p.lastResult,conserved:f.econ.conservationReport(w).ok,pure:f.save.serializeWorld(w)===before};})()`);
 check('useful delivered stone equals the real stock withdrawal; inspection is pure',delivered.delivered>4&&delivered.delivered===delivered.withdrawn&&delivered.conserved&&delivered.pure,delivered);await shot('stone-delivered');
 const impossible=await b.evaluate(`(()=>{const old=window.__precedence,f=old.toolPrecedenceScene();Object.assign(f,{project:old.project});window.__precedence=f;for(const id of [f.tree.id,f.rock.id,f.stock.id])old.knowledge.delBelief(f.p,id);f.w.sceneLabel='STAGED NEGATIVE: required hammer, no known raw input source; no tool or cart created';window.__game.restoreWorld(f.w,f.w.settings);const before=old.save.serializeWorld(f.w),ctx=old.generateOptions(f.w,f.p,true,true);return {wanted:ctx.toolWanted,craft:ctx.options.some(o=>o.key==='craft:hammer'),sourceTrip:ctx.options.some(o=>o.kind==='gather'&&o.tag==='craft'),carts:f.w.carts.length,pure:old.save.serializeWorld(f.w)===before};})()`);
 check('missing known inputs preserve an impossible case',impossible.wanted.kind==='hammer'&&!impossible.craft&&!impossible.sourceTrip&&impossible.carts===0&&impossible.pure,impossible);await shot('no-known-inputs');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/production.ts','src/sim/options_work.ts','src/sim/optutil.ts','src/sim/rulesversion.ts','tests/helpers/tool_precedence.ts','scripts/browser/tool_precedence_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:64,evidence:'STAGED known resources, stocked cart components and demand; every action explicitly selected through legal options. No ordinary-adoption claim.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
