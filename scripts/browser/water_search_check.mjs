import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5292/',out='autonomy_evidence/water110-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-water-search-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9374/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port in use');mkdirSync(out,{recursive:true});
const b=await launch({port:9374,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{
 const before=await b.evaluate('window.__water.save.serializeWorld(window.__water.w)');
 await b.evaluate(`(()=>{const f=window.__water,g=window.__game;g.select(f.p.id);g.fly=null;const q=f.project(f.p.x,f.p.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(join(out,name+'.png'));check(name+' inspection is pure',before===await b.evaluate('window.__water.save.serializeWorld(window.__water.w)'));
 return b.evaluate("document.querySelector('.insp-person')?.innerText||''");
};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const start=await b.evaluate(`(async()=>{
  const {waterSearchScene}=await import('/tests/helpers/water_search.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),econ=await import('/src/sim/economy.ts');
  const f=waterSearchScene(true,true,110);Object.assign(f,{save,stepWorld,project,econ,drank:false});stepWorld(f.w);f.twin=save.deserializeWorld(save.serializeWorld(f.w));
  f.w.hooks={onActivityEnd:(p,a,result)=>{if(p.id===f.p.id&&a.kind==='drink'&&result==='success')f.drank=true;}};window.__water=f;
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  return {tick:f.w.tick,activity:f.p.activity,waterKnown:Object.values(f.p.beliefs).filter(b=>b.kind==='water').length,conserved:econ.conservationReport(f.w).ok};
 })()`);
 check('critical night search starts with a truthful purpose and no supplied water knowledge',start.activity?.kind==='explore'&&start.activity.need==='thirst'&&start.activity.goal==='to find water'&&start.waterKnown===0&&start.conserved,start);
 const text=await shot('searching-after-dark');check('the inspector shows Searching for water',text.includes('Searching for water'),text);
 const drink=await b.evaluate(`(()=>{const f=window.__water;for(let n=0;n<600&&f.p.activity?.kind!=='drink';n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,activity:f.p.activity,waterKnown:Object.values(f.p.beliefs).filter(b=>b.kind==='water').length,same:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin)};})()`);
 check('actual travel discovers a shore and produces a drinking activity',drink.activity?.kind==='drink'&&drink.waterKnown>0&&drink.same,drink);await shot('discovered-shore');
 const result=await b.evaluate(`(()=>{const f=window.__water;for(let n=0;n<300&&!f.drank;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}delete f.w.hooks;const raw=f.save.serializeWorld(f.w);return {tick:f.w.tick,drank:f.drank,thirst:f.p.needs.thirst,waterCreated:f.w.ledger.created.water,waterConsumed:f.w.ledger.consumed.water,same:raw===f.save.serializeWorld(f.twin),valid:raw===f.save.serializeWorld(f.save.deserializeWorld(raw)),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('real drinking restores thirst with exact continuation and accounting',result.drank&&result.thirst>60&&result.same&&result.valid&&result.conserved,result);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:110,limits:'STAGED depleted carried water and critical thirst after dark, no inserted water knowledge. Autonomous search, perception, travel and drinking. Old rules also eventually find water in this scene; no general survival benefit claimed.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
