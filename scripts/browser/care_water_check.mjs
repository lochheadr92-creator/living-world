import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/water-care68-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-water-care-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9367/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port already in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,who='helper')=>{await b.evaluate(`(()=>{const f=window.__care,g=window.__game,p=f['${who}'],pt=f.project(p.x,p.y);g.select(p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2.3};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(out+'/'+name+'.png');};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 await b.evaluate(`(async()=>{
  const {careWaterScene}=await import('/tests/helpers/care_water.ts'),econ=await import('/src/sim/economy.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),decision=await import('/src/sim/decision.ts');
  window.__careLoad=()=>{const f=careWaterScene(68);Object.assign(f,{econ,save,stepWorld,project,...decision});f.load=econ.weightOf(f.elder.inv);f.failGift();f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;window.__care=f;window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return f;};
 })()`);
 const start=await b.evaluate(`(()=>{const f=window.__careLoad(),before=f.save.serializeWorld(f.w),ctx=f.generateOptions(f.w,f.helper,true,true),pure=before===f.save.serializeWorld(f.w);f.stepWorld(f.w);f.twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));return {offered:ctx.options.some(o=>o.key===f.key),pure,kind:f.helper.activity?.kind,care:f.helper.activity?.data.careWaterStore,reason:f.helper.failures[f.elder.id],fed:f.elder.cooldowns.fedUntil??0,tick:f.w.tick};})()`);
 check('actual failed water hand-over leads to an autonomous legal deposit',start.offered&&start.pure&&start.kind==='deposit'&&start.care&&start.fed<=start.tick,start);await shot('water-provision');
 const deposit=await b.evaluate(`(()=>{const f=window.__care;f.events=[];f.w.hooks={onTransfer:t=>f.events.push({...t}),onActivityStart:(p,a)=>{if(p.id===f.elder.id&&a.data.fromStore)f.drinkStarted=true;}};for(let n=0;n<300&&!f.events.some(e=>e.reason==='deposit'&&e.item==='water');n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {events:f.events,water:f.helper.inv.water,store:f.home.store.items.water,equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('ordinary transfer leaves actual water in the owned home and retains helper supplies',deposit.events.some(e=>e.reason==='deposit'&&e.item==='water'&&e.n===1)&&deposit.water>=1&&deposit.equal&&deposit.conserved,deposit);await shot('water-deposited');
 const used=await b.evaluate(`(()=>{const f=window.__care;for(let n=0;n<1000&&f.elder.needs.thirst<25;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const before=f.save.serializeWorld(f.w);window.__ui.update(1);return {started:f.drinkStarted,thirst:f.elder.needs.thirst,water:f.elder.inv.water??0,load:f.econ.weightOf(f.elder.inv),beforeLoad:f.load,drunk:f.w.ledger.reasons['-drunk'],equal:before===f.save.serializeWorld(f.twin),pure:before===f.save.serializeWorld(f.w),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('full-pack recipient later drinks stored water with exact saved continuation',used.started&&used.thirst>25&&used.water===0&&used.load===used.beforeLoad&&used.drunk>=1&&used.equal&&used.pure&&used.conserved,used);await shot('recipient-drinks','elder');
 const failed=await b.evaluate(`(()=>{const f=window.__careLoad();f.stepWorld(f.w);const a=f.helper.activity;f.econ.produce(f.w,f.home.store.items,f.home.store.cap,'seeds',1000,'staged competing storage');const held=f.helper.inv.water;for(let n=0;n<300&&f.helper.activity?.id===a.id;n++)f.stepWorld(f.w);return {result:f.helper.lastResult,held,water:f.helper.inv.water,stored:f.home.store.items.water??0,conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('store filling during the trip fails without losing carried water',failed.result?.outcome==='failed'&&failed.water===failed.held&&failed.stored===0&&failed.conserved,failed);await shot('store-full');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/care_capacity.ts','src/sim/act_resource.ts','src/sim/options_work.ts','src/sim/resident_care.ts','src/sim/rulesversion.ts','tests/helpers/care_water.ts','scripts/browser/care_water_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({rules:68,evidence:'Staged need, full pack and donor supplies; first offered gift explicitly selected. Recovery deposit and later stored drinking are autonomous. Competing storage is explicitly staged.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
