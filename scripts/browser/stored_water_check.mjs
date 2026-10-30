import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/water67-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-water-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9367/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port already in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{await b.evaluate(`(()=>{const f=window.__water,g=window.__game,pt=f.project(f.elder.x,f.elder.y);g.select(f.elder.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2.3};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(out+'/'+name+'.png');};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 await b.evaluate(`(async()=>{
  const {indoorCareScene}=await import('/tests/helpers/indoor_care.ts'),{perceive}=await import('/src/sim/perception.ts'),{abortActivity}=await import('/src/sim/activities.ts'),{carryCap}=await import('/src/sim/people.ts'),econ=await import('/src/sim/economy.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),decision=await import('/src/sim/decision.ts');
  window.__waterLoad=()=>{const f=indoorCareScene(67);Object.assign(f,{perceive,abortActivity,carryCap,econ,save,stepWorld,project,...decision});f.elder.needs.hunger=90;f.elder.needs.thirst=20;econ.produce(f.w,f.elder.inv,carryCap(f.w,f.elder),'grain',100,'staged full pack');econ.produce(f.w,f.home.store.items,f.home.store.cap,'water',2,'staged water reserve');perceive(f.w,f.elder);abortActivity(f.w,f.elder,'staged rest ended');f.elder.nextThink=f.w.tick;f.load=econ.weightOf(f.elder.inv);f.w.sceneLabel='STAGED full pack and household water; ordinary drinking choice and physical consumption';window.__water=f;window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return f;};
 })()`);
 const start=await b.evaluate(`(()=>{const f=window.__waterLoad(),before=f.save.serializeWorld(f.w),ctx=f.generateOptions(f.w,f.elder,true,true),pure=before===f.save.serializeWorld(f.w);f.stepWorld(f.w);f.twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));return {offered:ctx.options.some(o=>o.key==='drink:store:'+f.home.id),pure,kind:f.elder.activity?.kind,stored:f.elder.activity?.data.fromStore,inside:f.elder.indoors,home:f.home.id,load:f.load};})()`);
 check('full-pack resident autonomously starts drinking actual stored water indoors',start.offered&&start.pure&&start.kind==='drink'&&start.stored&&start.inside===start.home,start);await shot('drinking-stored-water');
 const used=await b.evaluate(`(()=>{const f=window.__water;for(let n=0;n<30&&f.home.store.items.water===2;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const before=f.save.serializeWorld(f.w);window.__ui.update(1);return {store:f.home.store.items.water,thirst:f.elder.needs.thirst,water:f.elder.inv.water??0,load:f.econ.weightOf(f.elder.inv),beforeLoad:f.load,drunk:f.w.ledger.reasons['-drunk'],equal:before===f.save.serializeWorld(f.twin),pure:before===f.save.serializeWorld(f.w),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('one accounted unit relieves thirst without adding pack space',used.store===1&&used.thirst>25&&used.water===0&&used.load===used.beforeLoad&&used.drunk===1&&used.equal&&used.pure&&used.conserved,used);await shot('water-consumed');
 const failed=await b.evaluate(`(()=>{const f=window.__waterLoad();f.stepWorld(f.w);f.act=f.elder.activity;f.econ.consume(f.w,f.home.store.items,'water',2,'staged competing use');for(let n=0;n<30&&f.elder.activity?.id===f.act.id;n++)f.stepWorld(f.w);return {result:f.elder.lastResult,thirst:f.elder.needs.thirst,known:f.elder.beliefs[f.home.id]?.items?.water??0,drunk:f.w.ledger.reasons['-drunk']??0,conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('competing consumption stops drinking and revises known stock',failed.result?.outcome==='failed'&&failed.thirst<20&&failed.known===0&&failed.drunk===0&&failed.conserved,failed);await shot('store-empty');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/stored_water.ts','src/sim/stored_water_access.ts','src/sim/act_resource.ts','src/sim/habitation.ts','src/sim/activities.ts','src/sim/options_survival.ts','scripts/browser/stored_water_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({rules:67,evidence:'Staged need, full pack, water reserve and ended rest; ordinary selection and actual consumption. Competing water loss is explicitly staged.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
