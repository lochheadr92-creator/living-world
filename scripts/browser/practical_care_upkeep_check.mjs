// Staged prerequisites; only offered actions selected, all travel/work/transfers use the real simulation.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5286/',out='viewer_evidence/practical']=process.argv.slice(2);
mkdirSync(out,{recursive:true});const b=await launch({port:9349,width:1440,height:900}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const show=async(name,id)=>{await b.evaluate(`(()=>{const g=window.__game;g.select(${id});g.camera.zoom=1.8;window.__ui.update(1);})()`);await b.sleep(300);await b.shot(`${out}/${name}.png`);};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true}));`});
 await b.send('Page.navigate',{url});for(let i=0;i<80&&!await b.evaluate('!!window.__game');i++)await b.sleep(100);
 const setup=await b.evaluate(`(async()=>{
  const kit=await import('/tests/helpers/kit.ts'),act=await import('/src/sim/activities.ts'),{observe}=await import('/src/sim/knowledge.ts'),{perceive}=await import('/src/sim/perception.ts'),{generateOptions}=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),{conservationReport}=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts');
  const s=kit.stage('repair-then-use');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=54;
  const p=kit.addPerson(s,'Ada',40,40,{inv:{wood:10},age:35,hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),kiln=kit.building(s,'kiln',43,40,0,{clay:4,wood:2});kiln.condition=8;
  const house=kit.site(s,'house',36,36,p.hhId,p.id,{wood:6,planks:8}),w=kit.done(s);w.sceneLabel='TEST SCENE: repair a shared kiln, then fire bricks; staged materials and demand';observe(w,p,kiln);observe(w,p,house);perceive(w,p);
  const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);const pt=project(43,40);g.camera={x:pt.sx,y:pt.sy,zoom:1.8};g.fly=null;
  window.__practical={kit,act,observe,perceive,generateOptions,stepWorld,save,conservationReport,project,w,p,kiln,house};return {person:p.id,kiln:kiln.id,condition:kiln.condition};
 })()`);
 await show('kiln-before',setup.kiln);
 const repair=await b.evaluate(`(()=>{const f=window.__practical,{w,p,kiln}=f;const o=f.generateOptions(w,p,true,true).options.find(o=>o.kind==='repair'&&o.targetId===kiln.id);if(!o)return {offered:false};f.act.startActivity(w,p,o.make());for(let i=0;i<300&&p.activity?.phase!=='work';i++)f.stepWorld(w);f.copy=f.save.deserializeWorld(f.save.serializeWorld(w));let ticks=0;while(ticks<1000&&p.activity?.kind==='repair'){f.stepWorld(w);f.stepWorld(f.copy);ticks++;}return {offered:true,condition:kiln.condition,repairUnits:w.ledger.reasons['-repairs'],continued:f.save.serializeWorld(w)===f.save.serializeWorld(f.copy),conserved:f.conservationReport(w).ok};})()`);
 check('shared repair is offered, consumes materials and continues exactly',repair.offered&&repair.repairUnits>0&&repair.condition>12&&repair.continued&&repair.conserved,repair);
 await show('kiln-repaired',setup.kiln);
 const fired=await b.evaluate(`(()=>{const f=window.__practical,{w,p,kiln}=f;f.observe(w,p,kiln);f.perceive(w,p);const o=f.generateOptions(w,p,true,true).options.find(o=>o.kind==='operate'&&o.targetId===kiln.id&&o.label.toLowerCase().includes('brick'));if(!o)return {offered:false};f.act.startActivity(w,p,o.make());for(let i=0;i<1200&&!kiln.ops.produced.bricks;i++)f.stepWorld(w);return {offered:true,bricks:kiln.ops.produced.bricks,conserved:f.conservationReport(w).ok,job:kiln.ops.job?.phase};})()`);
 check('repaired kiln produces useful construction material',fired.offered&&fired.bricks===3&&fired.conserved,fired);
 await show('kiln-used',setup.kiln);
 const care=await b.evaluate(`(()=>{const f=window.__practical,s=f.kit.stage('care-elder');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=54;
  const helper=f.kit.addPerson(s,'Ada',40,40,{age:35,inv:{bread:5,water:3},hunger:100,thirst:100,energy:100}),elder=f.kit.addPerson(s,'Eli',46,40,{age:72,hh:helper.hhId,hunger:20,thirst:70,energy:70});elder.health=30;elder.injury={kind:'sprain',since:0,until:5000,how:'staged injury'};
  const w=f.kit.done(s);w.sceneLabel='TEST SCENE: household bread delivered to a resting injured elder, then eaten';f.act.startActivity(w,elder,f.act.newActivity(w,elder,{kind:'rest',label:'Resting with an injury',goal:'to recover',here:true,minCommit:500,maxTicks:1000}));f.perceive(w,helper);
  Object.assign(f,{w,helper,elder});const g=window.__game;g.restoreWorld(w,w.settings);const pt=f.project(43,40);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};return {helper:helper.id,elder:elder.id};})()`);
 await show('care-before',care.elder);
 const delivered=await b.evaluate(`(()=>{const f=window.__practical,{w,helper,elder}=f;const before=f.save.serializeWorld(w),o=f.generateOptions(w,helper,true,true).options.find(o=>o.kind==='give'&&o.targetId===elder.id&&o.tag==='care');const pure=before===f.save.serializeWorld(w);if(!o)return {offered:false};f.act.startActivity(w,helper,o.make());f.stepWorld(w);const copy=f.save.deserializeWorld(f.save.serializeWorld(w));for(let i=0;i<400&&!elder.inv.bread;i++){f.stepWorld(w);f.stepWorld(copy);}return {offered:true,pure,bread:elder.inv.bread,continued:f.save.serializeWorld(w)===f.save.serializeWorld(copy),conserved:f.conservationReport(w).ok,log:elder.log.slice(-3)};})()`);
 check('informed household care physically delivers bread without observer or replay changes',delivered.offered&&delivered.bread>0&&delivered.pure&&delivered.continued&&delivered.conserved,delivered);
 await show('care-delivered',care.elder);
 const eaten=await b.evaluate(`(()=>{const f=window.__practical,{w,elder}=f,hunger=elder.needs.hunger,o=f.generateOptions(w,elder,true,true).options.find(o=>o.kind==='eat');if(!o)return {offered:false};elder.cooldowns.pause=0;f.act.startActivity(w,elder,o.make());for(let i=0;i<120&&elder.activity;i++)f.stepWorld(w);return {offered:true,before:hunger,after:elder.needs.hunger,eaten:w.ledger.reasons['-eaten'],conserved:f.conservationReport(w).ok};})()`);
 check('recipient actually eats delivered bread',eaten.offered&&eaten.after>eaten.before+5&&eaten.eaten>0&&eaten.conserved,eaten);
 await show('care-eaten',care.elder);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',!errors.length,errors);
 const files=['scripts/browser/practical_care_upkeep_check.mjs','tests/practical_care_upkeep.test.ts','src/sim/welfare.ts','src/sim/options_work.ts','src/sim/social.ts','src/sim/act_build.ts'];
 writeFileSync(`${out}/report.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:54,sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),evidence:'STAGED prerequisites and action selections from actual offered options. Physical travel, work, consumption and same-runtime save continuation. No claim of ordinary activation, full medical recovery, completed house, or aggregate benefit.',checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
