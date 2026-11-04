import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='survival_evidence/continuation-20261104/render151';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-lamb-birth-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9393,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5301/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 await browser.evaluate(`(async()=>{
 const {lambBirthScene}=await import('/tests/helpers/lamb_birth.ts'),{stepWorld}=await import('/src/sim/world.ts');
 const save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts');
 const f=lambBirthScene(151);f.w.sceneLabel='STAGED - Autonomous sheep care and lamb birth';Object.assign(f,{stepWorld,save,econ});window.__lamb=f;
 for(let i=0;i<10360;i++)stepWorld(f.w);
 const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);const pt=project(41,16);g.fly=null;g.camera={x:pt.sx+120,y:pt.sy,zoom:2};g.select(f.p.id);f.saved=save.serializeWorld(f.w);window.__ui.update(1);
 })()`);
 await browser.sleep(200);await browser.shot(join(out,'birth.png'));
 const observed=await browser.evaluate(`(()=>{const f=__lamb;return {text:document.body.textContent,pure:f.saved===f.save.serializeWorld(f.w),animals:f.w.animals.filter(a=>a.sheep).map(a=>({id:a.id,origin:a.sheep.origin,parents:a.sheep.parents,born:a.sheep.born,owner:a.sheep.hhId})),conserved:f.econ.conservationReport(f.w).ok};})()`);
 const checks={visibleBirth:/lamb was born/i.test(observed.text),pure:observed.pure,realParentage:observed.animals.some(a=>a.origin==='birth'&&a.parents.length===2&&a.owner>0),conserved:observed.conserved,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({staged:true,autonomous:true,checks,observed},null,2));console.log(checks);if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
