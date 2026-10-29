import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5286/',out='viewer_evidence/tool57']=process.argv.slice(2);
mkdirSync(out,{recursive:true});const b=await launch({port:9351,width:1440,height:900}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{await b.evaluate(`(()=>{const f=window.__tool,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};window.__ui.update(1);})()`);await b.sleep(250);await b.shot(`${out}/${name}.png`);};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let i=0;i<80&&!await b.evaluate('!!window.__game');i++)await b.sleep(100);
 const offered=await b.evaluate(`(async()=>{
  const kit=await import('/tests/helpers/tool_prerequisite.ts'),{generateOptions}=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),{conservationReport}=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts'),{demandsOf}=await import('/src/sim/production.ts');
  const f=kit.cartPrerequisiteScene();Object.assign(f,{...kit,generateOptions,stepWorld,save,conservationReport,project});window.__tool=f;
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  const before=save.serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);return {demand:demandsOf(ctx).filter(d=>d.item==='cart'),required:ctx.toolWanted,pure:save.serializeWorld(f.w)===before};
 })()`);
 check('actual offered workshop demand requires the missing hammer; inspection is pure',offered.demand.length>0&&offered.required?.kind==='hammer'&&offered.pure,offered);
 await shot('missing-hammer');
 const materials=await b.evaluate(`(()=>{const f=window.__tool,{w,p}=f;f.finishPrerequisite(w,p,'gather:'+f.tree.id);f.finishPrerequisite(w,p,'haul:'+f.target.id);const reservedWood=p.inv.wood;f.finishPrerequisite(w,p,'gather:'+f.rock.id);return {reservedWood,inv:{...p.inv},siteWood:f.target.delivered.wood,plan:p.intentions.find(i=>i.kind==='tool'),conserved:f.conservationReport(w).ok};})()`);
 check('physical acquisition and delivery preserve the tool plan reservation',materials.reservedWood===1&&materials.inv.stone>=2&&materials.siteWood>0&&materials.conserved,materials);
 await shot('materials-ready');
 const hammer=await b.evaluate(`(()=>{const f=window.__tool,{w,p}=f;const {act,restore}=f.selectPrerequisite(w,p,'craft:hammer');try{for(let i=0;i<8;i++)f.stepWorld(w);const copy=f.save.deserializeWorld(f.save.serializeWorld(w));for(let i=0;i<1500&&p.activity?.id===act.id;i++){f.stepWorld(w);f.stepWorld(copy);}const same=f.save.serializeWorld(w)===f.save.serializeWorld(copy);p.cooldowns.pause=1e12;return {held:p.inv.hammer,continued:same,conserved:f.conservationReport(w).ok,decision:p.lastDecision};}finally{restore();}})()`);
 check('real hammer crafting and intermediate save continuation succeed',hammer.held===1&&hammer.continued&&hammer.conserved,hammer);
 await shot('hammer-made');
 const built=await b.evaluate(`(()=>{const f=window.__tool,{w,p}=f,o=f.generateOptions(w,p,true,true).options.find(o=>o.kind==='operate'&&o.label.toLowerCase().includes('handcart'));if(!o)return {offered:false};f.finishPrerequisite(w,p,o.key);return {offered:true,carts:w.carts.map(c=>({id:c.id,ownerHh:c.ownerHh,load:c.load})),workshopStock:f.yard.store.items,conserved:f.conservationReport(w).ok};})()`);
 check('an offered workshop activity consumes staged components and creates the owned cart',built.offered&&built.carts.length===1&&built.conserved,built);
 await shot('cart-built');
 const delivered=await b.evaluate(`(()=>{const f=window.__tool,{w,p}=f;f.finishPrerequisite(w,p,'drink:inv');f.finishPrerequisite(w,p,'sleep:'+f.home.id);const eat=f.generateOptions(w,p,true,true).options.find(o=>o.kind==='eat');if(eat)f.finishPrerequisite(w,p,eat.key);const before=f.stock.store.items.stone??0,key='cart:'+w.carts[0].id+':'+f.target.id;f.finishPrerequisite(w,p,key);return {siteStone:f.target.delivered.stone,stockBefore:before,stockAfter:f.stock.store.items.stone??0,cartLoad:w.carts[0].load,decision:p.lastDecision,result:p.lastResult,tick:w.tick,conserved:f.conservationReport(w).ok};})()`);
 check('after real drink and sleep, the offered cart trip physically delivers useful stone',delivered.siteStone>4&&delivered.stockAfter<delivered.stockBefore&&delivered.conserved,delivered);
 await shot('stone-delivered');
 const pure=await b.evaluate(`(()=>{const f=window.__tool,before=f.save.serializeWorld(f.w);window.__ui.update(1);window.__game.setViewer({speech:'hidden'});window.__ui.update(1);window.__game.setViewer({speech:'automatic'});return f.save.serializeWorld(f.w)===before;})()`);check('viewing the outcome preserves world state',pure,pure);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['scripts/browser/tool_prerequisite_check.mjs','tests/helpers/tool_prerequisite.ts','src/sim/options_work.ts','src/sim/decision.ts','src/sim/rulesversion.ts'];
 writeFileSync(`${out}/report.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:57,sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),evidence:'STAGED workshop, component stock, raw sources and heavy site demand. Explicit actual offered choices through the inhabitant selection boundary; physical acquisition, work, survival costs, cart use and exact same-browser continuation. No claim of natural activation or aggregate benefit.',checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
