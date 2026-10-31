// Staged finite one-adult collapse; all replacement work afterwards is autonomous.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5292/',out='autonomy_evidence/home108-rendered',versionArg='108']=process.argv.slice(2),version=Number(versionArg);
if(![108,109].includes(version))throw new Error('Supported diagnostic rules: 108 or 109');
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-home-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9372/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9372,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{
 const before=await b.evaluate('window.__home.save.serializeWorld(window.__home.w)');
 await b.evaluate(`(()=>{const f=window.__home,g=window.__game;g.select(f.p.id);g.fly=null;const q=f.project(f.p.x,f.p.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(join(out,name+'.png'));
 const text=await b.evaluate("document.querySelector('.insp-person')?.innerText||''");
 check(name+' inspection is pure',before===await b.evaluate('window.__home.save.serializeWorld(window.__home.w)'));
 return text;
};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const setup=await b.evaluate(`(async()=>{
  const {observedReplacementScene}=await import('/tests/helpers/home_replacement.ts'),{destroyBuilding}=await import('/src/sim/buildings.ts'),{refreshBeliefs}=await import('/src/sim/perception.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),econ=await import('/src/sim/economy.ts'),{shelterAt}=await import('/src/sim/needs.ts');
  const f=observedReplacementScene(${version});destroyBuilding(f.w,f.home,'collapsed in sight');refreshBeliefs(f.w,f.p);
  Object.assign(f,{save,stepWorld,project,econ,shelterAt,starts:[]});f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.p.id)f.starts.push({tick:f.w.tick,kind:a.kind,goal:a.goal});}};
  f.twin=save.deserializeWorld(save.serializeWorld(f.w));window.__home=f;const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  for(let n=0;n<3500&&!(f.p.activity?.kind==='build'&&f.p.activity.phase==='work'&&f.p.activity.progress>20);n++){stepWorld(f.w);stepWorld(f.twin);}
  return {tick:f.w.tick,activity:f.p.activity,starts:f.starts,wood:f.w.ledger.consumed.wood,same:save.serializeWorld(f.w)===save.serializeWorld(f.twin)};
 })()`);
 check('observed loss reaches real paid replacement work',setup.activity?.kind==='build'&&setup.activity.progress>20&&setup.same&&setup.starts.some(s=>s.kind==='gather')&&setup.starts.some(s=>s.kind==='haul'),setup);
 const text=await shot('replacement-under-construction');check('the inspector describes the real construction',/build/i.test(text)&&/lean-to/i.test(text),text);
 const built=await b.evaluate(`(()=>{const f=window.__home;for(let n=0;n<3500&&!f.hh.homeId;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,home:f.w.byId.get(f.hh.homeId),wood:f.w.ledger.consumed.wood,same:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('the finite material and labour produce an owned replacement',built.home?.type==='lean_to'&&built.wood>=4&&built.same&&built.conserved,built);
 const slept=await b.evaluate(`(()=>{const f=window.__home;f.twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));for(let n=0;n<2500&&!(f.p.activity?.kind==='sleep'&&f.p.activity.phase==='work'&&f.shelterAt(f.w,f.p.x,f.p.y,f.p).cover>0);n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const energy=f.p.needs.energy;for(let n=0;n<30;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,activity:f.p.activity,cover:f.shelterAt(f.w,f.p.x,f.p.y,f.p).cover,energyBefore:energy,energy:f.p.needs.energy,same:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('across a save the person uses shelter and restores energy',slept.activity?.kind==='sleep'&&slept.cover>0&&slept.energy>slept.energyBefore&&slept.same&&slept.conserved,slept);
 await shot('replacement-slept-in');const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:version,limits:'STAGED observed collapse, one adult, finite supplied inventory and known resources. Replacement choices autonomous. No ordinary activation or long-term survival claim; the retained five-day fixture is adverse.',checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
