import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5294/',out='survival_evidence/preservation-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
mkdirSync(out,{recursive:true});
const profileRoot=resolve(tmpdir());
const profile=resolve(profileRoot,'living-world-preservation-'+randomUUID());
if(!profile.startsWith(profileRoot+sep)||existsSync(profile))throw new Error('Unsafe browser profile path');
const browser=await launch({port:9374,width:1440,height:1000,profile});
const checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{await browser.evaluate('window.__ui.update(1)');await browser.sleep(200);await browser.shot(join(out,name+'.png'));return browser.evaluate("document.querySelector('.insp-entity')?.textContent||''");};
try{
  await browser.send('Page.navigate',{url});
  for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
  await browser.evaluate(`(async()=>{
    const fixture=await import('/tests/helpers/preservation.ts');
    const activity=await import('/src/sim/activities.ts'),facility=await import('/src/sim/facilities.ts');
    const save=await import('/src/app/save.ts'),decision=await import('/src/sim/decision.ts'),econ=await import('/src/sim/economy.ts');
    const {project}=await import('/src/render/iso.ts');
    const f=fixture.preservationScene();Object.assign(f,{fixture,activity,facility,save,decision,econ});window.__preserve=f;
    const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);const pt=project(41,41);g.fly=null;g.camera={x:pt.sx+120,y:pt.sy,zoom:2};g.select(f.b.id);
    f.w.weather.rain=1;
    const o=decision.generateOptions(f.w,f.p,true,true).options.find(o=>o.key==='operate:'+f.b.id+':smoke_fish');
    if(!o)throw new Error('Missing ordinary offered smoke activity in staged fixture');activity.startActivity(f.w,f.p,o.make());
    for(let i=0;i<300&&(!f.b.ops.job||f.b.ops.job.progress<10);i++){f.w.tick++;activity.stepActivity(f.w,f.p);}
  })()`);
  const paidText=await shot('paid-smoking-work');
  check('paid batch shows real contents and work',paidText.includes('fish')&&paidText.includes('Inside the batch'),paidText);
  const made=await browser.evaluate(`(()=>{const f=window.__preserve;for(let i=0;i<600&&f.b.ops.job;i++){f.w.tick++;if(f.p.activity)f.activity.stepActivity(f.w,f.p);f.facility.facilityTick(f.w,f.b);}return {stock:f.b.store.items,conserved:f.econ.conservationReport(f.w).ok};})()`);
  const madeText=await shot('smoked-fish-stored');
  check('smoking made two paid stored portions',made.stock.smoked_fish===2&&made.conserved&&madeText.includes('smoked fish'),{...made,text:madeText});
  await browser.evaluate(`(()=>{const f=window.__preserve,fresh=f.fixture.preservationScene();Object.assign(f,fresh);window.__game.restoreWorld(f.w,f.w.settings);window.__game.select(f.b.id);f.w.weather.rain=0;const o=f.decision.generateOptions(f.w,f.p,true,true).options.find(o=>o.key==='operate:'+f.b.id+':dry_fish');f.activity.startActivity(f.w,f.p,o.make());for(let i=0;i<300&&f.b.ops.job?.phase!=='burn';i++){f.w.tick++;f.activity.stepActivity(f.w,f.p);}f.w.weather.rain=1;f.w.tick++;f.facility.facilityTick(f.w,f.b);f.saved=f.save.serializeWorld(f.w);})()`);
  const rainText=await shot('rain-pauses-drying');
  check('rain failure state explains the physical pause',rainText.includes('rain pauses drying')&&rainText.includes('(paused)')&&!rainText.includes('fire is burning')&&rainText.includes('Nobody at work'),rainText);
  check('render and inspection preserve full saved state',await browser.evaluate('window.__preserve.saved===window.__preserve.save.serializeWorld(window.__preserve.w)'));
  const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');
  check('no browser exceptions',errors.length===0,errors);
  writeFileSync(join(out,'report.json'),JSON.stringify({evidence:'STAGED equipment and stock; selected offered activities and physical handlers. Ordinary activation is measured separately.',checks},null,2));
  if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await browser.close();}
