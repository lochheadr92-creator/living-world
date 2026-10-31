import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5293/',out='autonomy_evidence/finish109-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-finish-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9373/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9373,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,id)=>{
 const before=await b.evaluate('window.__finish.save.serializeWorld(window.__finish.w)');
 await b.evaluate(`(()=>{const f=window.__finish,g=window.__game,e=f.w.byId.get(${id});g.select(e.id);g.fly=null;const q=f.project(e.x,e.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(join(out,name+'.png'));
 check(name+' inspection is pure',before===await b.evaluate('window.__finish.save.serializeWorld(window.__finish.w)'));
};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const setup=await b.evaluate(`(async()=>{
  const {constructionFinishScene}=await import('/tests/helpers/construction_finish.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),econ=await import('/src/sim/economy.ts'),{generateOptions}=await import('/src/sim/decision.ts');
  const f=constructionFinishScene(109);f.w.sceneLabel='STAGED 199 of 200 work already done, all four wood explicitly consumed. A rested adult chooses and performs the remaining work. Not a spontaneous recovery claim.';
  Object.assign(f,{save,stepWorld,project,econ});f.twin=save.deserializeWorld(save.serializeWorld(f.w));window.__finish=f;
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  return {site:f.target.id,offered:generateOptions(f.w,f.p,true,true).options.some(o=>o.key==='build:'+f.target.id),work:f.target.work,total:f.target.workTotal,wood:f.w.ledger.consumed.wood,conserved:econ.conservationReport(f.w).ok};
 })()`);
 check('known last work is actually offered with accounted prior materials',setup.offered&&setup.work===199&&setup.total===200&&setup.wood===4&&setup.conserved,setup);
 await shot('unfinished-before-choice',setup.site);
 const completed=await b.evaluate(`(()=>{const f=window.__finish;for(let n=0;n<120&&!f.hh.homeId;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,home:f.hh.homeId,building:f.w.byId.get(f.hh.homeId)?.type,built:f.p.stats.built,wood:f.w.ledger.consumed.wood,same:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),valid:f.save.serializeWorld(f.save.deserializeWorld(f.save.serializeWorld(f.w)))===f.save.serializeWorld(f.w),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('autonomous final labour completes an owned lean-to exactly across a save',completed.home>0&&completed.building==='lean_to'&&completed.built===1&&completed.wood===4&&completed.same&&completed.valid&&completed.conserved,completed);
 if(completed.home)await shot('completed-after-work',completed.home);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:109,limits:'STAGED boundary case: prior 199 work and consumed materials staged and accounted; remaining work selected and executed autonomously. No full recovery, survival or ordinary-frequency claim.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
