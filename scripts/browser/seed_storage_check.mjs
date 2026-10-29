import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5286/',out='viewer_evidence/seed58']=process.argv.slice(2);
mkdirSync(out,{recursive:true});const b=await launch({port:9352,width:1440,height:900}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{await b.evaluate(`(()=>{const f=window.__seed,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};window.__ui.update(1);})()`);await b.sleep(250);await b.shot(`${out}/${name}.png`);};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let i=0;i<80&&!await b.evaluate('!!window.__game');i++)await b.sleep(100);
 const offered=await b.evaluate(`(async()=>{
  const {seedStorageScene}=await import('/tests/helpers/seed_storage.ts'),kit=await import('/tests/helpers/tool_prerequisite.ts'),{generateOptions}=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),{conservationReport,invRoom}=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts');
  const f=seedStorageScene();Object.assign(f,{...kit,generateOptions,stepWorld,save,conservationReport,invRoom,project});window.__seed=f;window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);
  const before=save.serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);return {seeds:f.p.inv.seeds,stoneRoom:invRoom(f.w,f.p,'stone'),offered:ctx.options.some(o=>o.key==='seed_stash:'+f.home.id),blocked:ctx.blocked.filter(o=>o.blocked?.includes('pack')),pure:save.serializeWorld(f.w)===before};
 })()`);
 check('full pack, truthful material blocker and a physical home storage offer',offered.stoneRoom===0&&offered.offered&&offered.blocked.length>0&&offered.pure,offered);await shot('pack-blocked');
 const stored=await b.evaluate(`(()=>{const f=window.__seed,{w,p}=f,before=p.inv.seeds,{act,restore}=f.selectPrerequisite(w,p,'seed_stash:'+f.home.id);try{for(let i=0;i<4;i++)f.stepWorld(w);const copy=f.save.deserializeWorld(f.save.serializeWorld(w));for(let i=0;i<1000&&p.activity?.id===act.id;i++){f.stepWorld(w);f.stepWorld(copy);}const same=f.save.serializeWorld(w)===f.save.serializeWorld(copy);p.cooldowns.pause=1e12;return {before,kept:p.inv.seeds,stored:f.home.store.items.seeds,same,room:f.invRoom(w,p,'stone'),result:p.lastResult,conserved:f.conservationReport(w).ok};}finally{restore();}})()`);
 check('seed physically reaches the home, planting reserve remains, travelling continuation is exact',stored.kept===3&&stored.stored===stored.before-3&&stored.room>=1&&stored.same&&stored.conserved,stored);await shot('seed-stored');
 const made=await b.evaluate(`(()=>{const f=window.__seed,{w,p}=f;f.finishPrerequisite(w,p,'gather:'+f.tree.id);f.finishPrerequisite(w,p,'haul:'+f.target.id);f.finishPrerequisite(w,p,'gather:'+f.rock.id);const before={...p.inv};f.finishPrerequisite(w,p,'craft:hammer');return {before,after:{...p.inv},conserved:f.conservationReport(w).ok};})()`);
 check('freed space enables real acquisition and hammer crafting counts consumed inputs',made.after.hammer===1&&made.after.seeds===3&&made.conserved,made);await shot('hammer-from-freed-pack');
 const farming=await b.evaluate(`(async()=>{
  const {seedStorageScene}=await import('/tests/helpers/seed_storage.ts'),{addPerson,pin}=await import('/tests/helpers/kit.ts'),{createPlot}=await import('/src/sim/farming.ts'),{observe}=await import('/src/sim/knowledge.ts');
  const old=window.__seed,f=Object.assign(seedStorageScene(),Object.fromEntries(['finishPrerequisite','selectPrerequisite','generateOptions','stepWorld','save','conservationReport','invRoom','project'].map(k=>[k,old[k]])));window.__seed=f;
  for(let i=0;i<5;i++)pin(addPerson(f.s,'Family '+i,42.5+i,40.5,{hh:f.p.hhId,age:30,hunger:100,thirst:100,energy:100}));
  const plots=[36,38,40].map(x=>{const pl=createPlot(f.w,x,43,f.p.hhId);pl.state='tilled';observe(f.w,f.p,pl);return pl;});window.__game.restoreWorld(f.w,f.w.settings);
  f.finishPrerequisite(f.w,f.p,'seed_stash:'+f.home.id);const stored=f.home.store.items.seeds;
  for(const pl of plots)f.finishPrerequisite(f.w,f.p,'plant:'+pl.id);
  const usedUp=f.p.inv.seeds??0;f.finishPrerequisite(f.w,f.p,'withdraw:'+f.home.id+':seeds');const retrieved=f.p.inv.seeds;
  f.finishPrerequisite(f.w,f.p,'till:new');const more=f.w.plots.find(pl=>!plots.includes(pl));f.finishPrerequisite(f.w,f.p,'plant:'+more.id);
  return {stored,usedUp,retrieved,storeAfter:f.home.store.items.seeds,growing:f.w.plots.filter(pl=>pl.state==='growing').length,conserved:f.conservationReport(f.w).ok};
 })()`);
 check('stored seeds are physically retrieved after planting and used for another real crop',farming.usedUp===0&&farming.retrieved===3&&farming.storeAfter===farming.stored-3&&farming.growing===4&&farming.conserved,farming);await shot('retrieved-seed-planted');
 const pure=await b.evaluate(`(()=>{const f=window.__seed,before=f.save.serializeWorld(f.w);window.__ui.update(1);window.__game.setViewer({speech:'hidden'});window.__ui.update(1);window.__game.setViewer({speech:'automatic'});return f.save.serializeWorld(f.w)===before;})()`);check('viewing the outcome preserves the entire saved state',pure,pure);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['scripts/browser/seed_storage_check.mjs','tests/helpers/seed_storage.ts','src/sim/seed_storage.ts','src/sim/options_work.ts','src/sim/act_resource.ts','src/sim/act_build.ts','src/sim/rulesversion.ts'];
 writeFileSync(`${out}/report.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:58,sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),evidence:'STAGED full harvest pack, known home, workshop demand and farm plots/household. Explicit actual offered choices via the inhabitant boundary. Real storage, acquisition, crafting, sowing, withdrawal and second sowing; no claim of ordinary selection or aggregate benefit.',checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
