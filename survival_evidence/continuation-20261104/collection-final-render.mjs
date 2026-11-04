import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='survival_evidence/continuation-20261104/render151-preservation-cold';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-collection-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9394,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5301/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 await browser.evaluate(`(async()=>{
 await import('/src/sim/world.ts');
 const {preservationScene}=await import('/tests/helpers/preservation.ts');
 const act=await import('/src/sim/activities.ts'),fac=await import('/src/sim/facilities.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts');
 const {RECIPE_BY_ID}=await import('/src/sim/recipes.ts'),{project}=await import('/src/render/iso.ts');
 const f=preservationScene();f.w.sceneLabel='STAGED - Collecting preserved meat';Object.assign(f,{act,fac,save,econ});window.__collection=f;
 f.w.weather.rain=0;f.b.store.items={meat:4};econ.snapshotInitial(f.w);
 fac.startJob(f.w,f.b,f.p,RECIPE_BY_ID.dry_meat,f.p.id,'preserve surplus meat');
 while(f.b.ops.job.phase==='work'){f.w.tick++;fac.workJob(f.w,f.b,f.p);}f.b.ops.job.burnLeft=40;
 act.startActivity(f.w,f.p,act.newActivity(f.w,f.p,{kind:'withdraw',label:'Collect dried meat',goal:'bring preserved meat for meals',targetId:f.b.id,here:true,maxTicks:500,data:{items:{dried_meat:2}}}));
 for(let i=0;i<15;i++){f.w.tick++;act.stepActivity(f.w,f.p);fac.facilityTick(f.w,f.b);}
 const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);const pt=project(41,41);g.fly=null;g.camera={x:pt.sx+120,y:pt.sy,zoom:2};g.select(f.p.id);f.saved=save.serializeWorld(f.w);window.__ui.update(1);
 })()`);
 await browser.sleep(200);await browser.shot(join(out,'waiting.png'));
 const before=await browser.evaluate(`({text:document.body.textContent,pure:__collection.saved===__collection.save.serializeWorld(__collection.w)})`);
 const completed=await browser.evaluate(`(()=>{const f=__collection;for(let i=0;i<100;i++){f.w.tick++;f.act.stepActivity(f.w,f.p);f.fac.facilityTick(f.w,f.b);}window.__ui.update(1);return {held:f.p.inv.dried_meat,conserved:f.econ.conservationReport(f.w).ok};})()`);
 await browser.sleep(200);await browser.shot(join(out,'collected.png'));
 const checks={visibleWait:/my preserved food is still processing/i.test(before.text),pure:before.pure,paidCollection:completed.held===2&&completed.conserved,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({staged:true,checks,before,completed},null,2));console.log(checks);if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
