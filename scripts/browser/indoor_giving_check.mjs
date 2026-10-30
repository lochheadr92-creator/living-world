// Staged residents, injury and provisions; positive response uses autonomous decisions, without external picks.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/care62-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');mkdirSync(out,{recursive:true});
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-care-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,who='helper')=>{
 await b.evaluate(`(()=>{const f=window.__care,g=window.__game,pt=f.project(f.home.x+f.home.w/2,f.home.y+f.home.h/2);g.select(f.${who}.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(out+'/'+name+'.png');
};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const initial=await b.evaluate(`(async()=>{
  const {indoorCareScene}=await import('/tests/helpers/indoor_care.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts');
  const f=indoorCareScene(62);Object.assign(f,{stepWorld,save,econ,project});window.__care=f;
  f.w.sceneLabel='STAGED residents, injury and bread; the hand-over and later eating are chosen autonomously';
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);f.transfers=[];
  f.w.hooks={onTransfer:t=>{if(t.reason==='given')f.transfers.push({...t,tick:f.w.tick,helperRoom:f.helper.indoors,elderRoom:f.elder.indoors});}};
  f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;stepWorld(f.w);f.hunger=f.elder.needs.hunger;f.twin=save.deserializeWorld(save.serializeWorld(f.w));
  return {tick:f.w.tick,chosen:f.helper.lastDecision,activity:f.helper.activity?.kind,phase:f.helper.activity?.phase,helperRoom:f.helper.indoors,elderRoom:f.elder.indoors,home:f.home.id};
 })()`);
 check('resident autonomously chooses the local care action and remains in the same room',initial.activity==='give'&&initial.phase==='work'&&initial.helperRoom===initial.home&&initial.elderRoom===initial.home,initial);await shot('autonomous-indoor-hand-over');
 const receipt=await b.evaluate(`(()=>{const f=window.__care;for(let n=0;n<30&&!f.transfers.length;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,transfers:f.transfers,helper:f.helper.inv,elder:f.elder.inv,equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('real bread passes inside the home, with exact intermediate continuation',receipt.transfers.length>0&&receipt.transfers.every(t=>t.helperRoom===initial.home&&t.elderRoom===initial.home)&&receipt.elder.bread>0&&receipt.equal&&receipt.conserved,receipt);await shot('elder-received-bread','elder');
 const meal=await b.evaluate(`(()=>{const f=window.__care;for(let n=0;n<600&&f.elder.needs.hunger<f.hunger+5;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const before=f.save.serializeWorld(f.w);window.__ui.update(1);return {tick:f.w.tick,hungerBefore:f.hunger,hungerAfter:f.elder.needs.hunger,elder:f.elder.inv,activity:f.elder.activity?.kind,pose:f.elder.pose,inside:f.elder.indoors,eaten:f.w.ledger.reasons['-eaten'],equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),pure:f.save.serializeWorld(f.w)===before,conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('elder later chooses to eat the received food, paying ordinary rest and review time',meal.hungerAfter>meal.hungerBefore+5&&meal.eaten>0&&meal.inside===initial.home&&meal.equal&&meal.pure&&meal.conserved,meal);await shot('elder-eating-inside','elder');
 const full=await b.evaluate(`(async()=>{
  const f0=window.__care,{indoorCareScene}=await import('/tests/helpers/indoor_care.ts'),{carryCap}=await import('/src/sim/people.ts'),kit=await import('/tests/helpers/tool_prerequisite.ts');
  const f=indoorCareScene(62);Object.assign(f,{stepWorld:f0.stepWorld,save:f0.save,econ:f0.econ,project:f0.project});window.__care=f;f.w.sceneLabel='STAGED full recipient pack; the legal care action is selected externally for this negative case';window.__game.restoreWorld(f.w,f.w.settings);
  const cap=carryCap(f.w,f.elder);f.econ.produce(f.w,f.elder.inv,cap,'wood',100,'staged full pack');f.econ.produce(f.w,f.elder.inv,cap,'seeds',100,'staged full pack');
  const selected=kit.selectPrerequisite(f.w,f.helper,'give:'+f.elder.id);try{for(let n=0;n<100&&f.helper.activity?.id===selected.act.id;n++)f.stepWorld(f.w);}finally{selected.restore();}
  return {result:f.helper.lastResult,helper:f.helper.inv,elder:f.elder.inv,fedUntil:f.elder.cooldowns.fedUntil??0,conserved:f.econ.conservationReport(f.w).ok};
 })()`);
 check('full-pack failure neither transfers food nor marks an unfed person as fed',full.result.detail==='they had no room to carry it'&&full.helper.bread===3&&!(full.elder.bread>0)&&full.fedUntil===0&&full.conserved,full);await shot('full-pack-preserved-failure');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/local_giving.ts','src/sim/habitation.ts','src/sim/activities.ts','src/sim/social.ts','src/sim/rulesversion.ts','src/render/renderer.ts','tests/helpers/indoor_care.ts','scripts/browser/indoor_giving_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:62,evidence:'STAGED residents admitted through their real door, injury and initial food. Positive actions chosen autonomously; full-pack negative selects an offered action externally. Not an ordinary-world frequency claim.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
