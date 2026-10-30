// STAGED full recipient pack. First legal hand-over is selected; recovery and eating are autonomous.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/care63-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');mkdirSync(out,{recursive:true});
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-care-capacity-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,who='helper')=>{
 await b.evaluate(`(()=>{const f=window.__capacity,g=window.__game,pt=f.project(f.home.x+f.home.w/2,f.home.y+f.home.h/2);g.select(f.${who}.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(out+'/'+name+'.png');
};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const failed=await b.evaluate(`(async()=>{
  const {careCapacityScene}=await import('/tests/helpers/care_capacity.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts'),decision=await import('/src/sim/decision.ts');
  const f=careCapacityScene(63);Object.assign(f,{stepWorld,save,econ,project,decision,careCapacityScene});window.__capacity=f;
  window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);f.failGift();f.load=econ.weightOf(f.elder.inv);
  return {tick:f.w.tick,result:f.helper.lastResult,failure:f.helper.failures[f.elder.id],held:f.helper.inv,elder:f.elder.inv,fedUntil:f.elder.cooldowns.fedUntil??0,conserved:econ.conservationReport(f.w).ok};
 })()`);
 check('actual failed hand-over creates personal capacity memory without claiming receipt',failed.result.detail==='they had no room to carry it'&&failed.failure.reason==='recipient could not carry the food'&&failed.held.bread===3&&!failed.elder.bread&&failed.fedUntil===0&&failed.conserved,failed);await shot('remembered-full-pack');
 const chose=await b.evaluate(`(()=>{const f=window.__capacity;f.events=[];f.w.hooks={onTransfer:t=>f.events.push({...t,tick:f.w.tick})};f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;f.stepWorld(f.w);f.twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));return {tick:f.w.tick,decision:f.helper.lastDecision,activity:f.helper.activity,home:f.home.id};})()`);
 check('autonomous recovery selects the known household store for the recorded capacity reason',chose.activity.kind==='deposit'&&chose.activity.data.careStore&&chose.activity.targetId===chose.home&&chose.decision.because.includes('pack was full'),chose);await shot('autonomous-home-store-trip');
 const left=await b.evaluate(`(()=>{const f=window.__capacity;for(let n=0;n<200&&!f.events.some(e=>e.reason==='deposit');n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,events:f.events,store:f.home.store.items,held:f.helper.inv,equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('ordinary physical deposit leaves two bread and preserves one for the helper',left.store.bread===2&&left.held.bread===1&&left.events.some(e=>e.reason==='deposit'&&e.n===2)&&left.equal&&left.conserved,left);await shot('food-physically-left-at-home');
 const meal=await b.evaluate(`(()=>{const f=window.__capacity,hunger=f.elder.needs.hunger;for(let n=0;n<800&&f.elder.needs.hunger<hunger+5;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const before=f.save.serializeWorld(f.w);window.__ui.update(1);return {tick:f.w.tick,hungerBefore:hunger,hungerAfter:f.elder.needs.hunger,activity:f.elder.activity?.kind,table:!!f.elder.activity?.data.table,load:f.econ.weightOf(f.elder.inv),originalLoad:f.load,held:f.elder.inv,home:f.elder.indoors,eaten:f.w.ledger.reasons['-eaten'],equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),pure:f.save.serializeWorld(f.w)===before,conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('elder autonomously eats from the store while carrying the same full load',meal.hungerAfter>meal.hungerBefore+5&&meal.activity==='eat_store'&&meal.table&&meal.load===meal.originalLoad&&!meal.held.bread&&meal.equal&&meal.pure&&meal.conserved,meal);await shot('elder-eats-at-home-with-full-pack','elder');
 const full=await b.evaluate(`(()=>{const old=window.__capacity,f=old.careCapacityScene(63);Object.assign(f,{stepWorld:old.stepWorld,save:old.save,econ:old.econ,project:old.project,decision:old.decision});window.__capacity=f;f.w.sceneLabel='STAGED store fills after the helper sets out; no capacity is invented';window.__game.restoreWorld(f.w,f.w.settings);f.failGift();f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;f.stepWorld(f.w);const id=f.helper.activity.id;f.econ.produce(f.w,f.home.store.items,f.home.store.cap,'seeds',1000,'staged competing storage');for(let n=0;n<200&&f.helper.activity?.id===id;n++)f.stepWorld(f.w);return {tick:f.w.tick,result:f.helper.lastResult,held:f.helper.inv,store:f.home.store.items,conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('a store that fills during the trip still fails and leaves the bread with the helper',full.result.outcome==='failed'&&full.result.detail==='no room'&&full.held.bread===3&&!full.store.bread&&full.conserved,full);await shot('full-store-preserved-failure');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/care_capacity.ts','src/sim/options_work.ts','src/sim/options_survival.ts','src/sim/act_resource.ts','src/sim/social.ts','src/sim/rulesversion.ts','src/render/renderer.ts','tests/helpers/care_capacity.ts','scripts/browser/care_capacity_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:63,evidence:'STAGED injured resident, full pack, home and initial food; initial legal gift selected externally, recovery deposit and meal chosen autonomously. Negative store change is imposed after departure.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
