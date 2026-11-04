import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='survival_evidence/continuation-20261104/render151-trap';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-trap-recovery-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9395,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5301/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 await browser.evaluate(`(async()=>{
 const {trapRecoveryScene}=await import('/tests/helpers/trap_recovery.ts'),{stepWorld}=await import('/src/sim/world.ts');
 const save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts');
 const f=trapRecoveryScene(151);f.w.sceneLabel='STAGED - Recovering a checked trap catch';Object.assign(f,{stepWorld,save,econ});window.__trap=f;
 for(let i=0;i<200;i++)stepWorld(f.w);
 const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);const pt=project(41,41);g.fly=null;g.camera={x:pt.sx+120,y:pt.sy,zoom:2};g.select(f.p.id);f.saved=save.serializeWorld(f.w);window.__ui.update(1);
 })()`);
 await browser.sleep(200);await browser.shot(join(out,'recovering.png'));
 const before=await browser.evaluate(`({text:document.body.textContent,pure:__trap.saved===__trap.save.serializeWorld(__trap.w),activity:__trap.p.activity?.kind})`);
 const completed=await browser.evaluate(`(()=>{const f=__trap;for(let i=0;i<2200;i++)f.stepWorld(f.w);window.__ui.update(1);return {eaten:f.w.ledger.reasons['-eaten']??null,meatConsumed:f.w.ledger.consumed.meat,cycles:f.gear.gear.cycle,conserved:f.econ.conservationReport(f.w).ok};})()`);
 await browser.sleep(200);await browser.shot(join(out,'after-meals.png'));
 const checks={visibleRecovery:/recovering.*meat/i.test(before.text)&&before.activity==='butcher',pure:before.pure,mealAndReset:completed.meatConsumed>0&&completed.cycles>=2&&completed.conserved,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({staged:true,autonomous:true,checks,before,completed},null,2));console.log(checks);if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
