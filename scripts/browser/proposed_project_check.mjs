// STAGED controller proposal through the real protocol, followed by actual work.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';

const [url='http://127.0.0.1:5291/',out='autonomy_evidence/proposals107-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-proposal-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9371/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port in use');
mkdirSync(out,{recursive:true});
const b=await launch({port:9371,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,id)=>{
 await b.evaluate(`(()=>{const f=window.__proposal,g=window.__game,e=f.w.byId.get(${id});g.select(e.id);g.fly=null;const q=f.project(e.x,e.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(join(out,name+'.png'));
 return b.evaluate("document.querySelector('.insp-person')?.innerText||document.querySelector('.insp-entity')?.innerText||''");
};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const adopted=await b.evaluate(`(async()=>{
  const {cartProjectScene}=await import('/tests/helpers/cart_project.ts'),save=await import('/src/app/save.ts'),
  run=await import('/src/agent/run.ts'),{proposerModel}=await import('/src/agent/stubs.ts'),
  {observe}=await import('/src/sim/knowledge.ts'),{project}=await import('/src/render/iso.ts'),
  {stepWorld}=await import('/src/sim/world.ts'),econ=await import('/src/sim/economy.ts');
  const f=cartProjectScene(107);f.target.required.stone=6;observe(f.w,f.p,f.target);
  f.w.sceneLabel='STAGED proposed cart: supplied yard and tools, reduced site demand; one scripted proposal, then autonomous work. No real-model claim.';
  const start=save.serializeWorld(f.w),r=await run.runLive(f.w,f.p.id,proposerModel({item:'cart',quantity:1,tier:0},{once:true}),{until:f.w.tick+1});
  Object.assign(f,{w:r.world,p:r.world.byId.get(f.p.id),save,run,project,stepWorld,econ,start,transcript:r.transcript});
  const plan=f.p.intentions.find(i=>i.kind==='batch'&&i.status==='active');
  f.twin=save.deserializeWorld(save.serializeWorld(f.w));window.__proposal=f;
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);
  return {person:f.p.id,tick:f.w.tick,plan,protocol:r.transcript.header.protocol,observation:r.transcript.header.observationVersion,
   proposed:r.transcript.calls.filter(c=>c.result?.status==='proposed').length,carts:f.w.carts.length,
   replay:save.serializeWorld(run.runReplay(save.deserializeWorld(start),r.transcript).world)===save.serializeWorld(f.w),conserved:econ.conservationReport(f.w).ok};
 })()`);
 check('actual protocol adopts a bounded plan without creating the cart',adopted.proposed===1&&adopted.plan?.makes==='cart'&&adopted.carts===0&&adopted.observation===17&&adopted.conserved,adopted);
 check('the proposal transcript replays to the exact saved state',adopted.replay);
 const before=await b.evaluate('window.__proposal.save.serializeWorld(window.__proposal.w)');
 const personText=await shot('proposed-plan',adopted.person);
 check('the inspector shows the real cart plan',/cart/i.test(personText)&&/plan/i.test(personText),personText);
 check('rendering does not mutate the world',before===await b.evaluate('window.__proposal.save.serializeWorld(window.__proposal.w)'));
 const work=await b.evaluate(`(()=>{const f=window.__proposal;for(let n=0;n<2400&&!(f.p.activity?.data.recipe==='build_cart'&&f.p.activity.phase==='work'&&f.p.activity.progress>30);n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,activity:f.p.activity,same:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin)};})()`);
 check('after the proposal the autonomous person reaches paid cart assembly',work.activity?.data.recipe==='build_cart'&&work.activity.phase==='work'&&work.activity.progress>30&&work.same,work);
 await shot('physical-cart-assembly',adopted.person);
 const built=await b.evaluate(`(()=>{const f=window.__proposal;for(let n=0;n<2400&&!f.w.carts.length;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,carts:f.w.carts.map(c=>({id:c.id,ownerHh:c.ownerHh})),household:f.p.hhId,planks:f.w.ledger.consumed.planks,same:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok,valid:f.save.serializeWorld(f.save.deserializeWorld(f.save.serializeWorld(f.w)))===f.save.serializeWorld(f.w)};})()`);
 check('real inputs produce the owned cart with exact continuation and conservation',built.carts.length===1&&built.carts[0].ownerHh===built.household&&built.planks>=4&&built.same&&built.valid&&built.conserved,built);
 if(built.carts.length)await shot('completed-proposed-cart',built.carts[0].id);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:107,evidence:'STAGED supplied yard and tools, reduced site demand, one scripted protocol proposal then autonomous decisions. No real-model, ordinary frequency or aggregate benefit claim.',checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
