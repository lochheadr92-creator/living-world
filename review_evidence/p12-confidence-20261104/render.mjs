// Rendered check for P1.2 (rules 154). STAGED scene: the only known food is a doubted teller's told bush.
import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='review_evidence/p12-confidence-20261104/render6';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-confidence-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9403,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5302/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 await browser.evaluate(`(async()=>{
  const kit=await import('/tests/helpers/kit.ts'),{makeSource}=await import('/src/sim/sources.ts'),{putBelief}=await import('/src/sim/knowledge.ts');
  const {relOf}=await import('/src/sim/relations.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts');
  const s=kit.stage('teller-confidence');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:154};
  const ada=kit.addPerson(s,'Ada',40.5,40.5,{hunger:40,thirst:95,energy:90}),kai=kit.addPerson(s,'Kai',30.5,30.5);
  const bush=makeSource(s.w,'berry_bush',55,40,6);kit.done(s);s.w.tick=4000;
  putBelief(ada,{id:bush.id,kind:bush.type,x:bush.x+0.5,y:bush.y+0.5,amount:6,max:bush.max,seen:3990,src:'told',from:kai.id,learned:3990,hops:1});
  relOf(ada,kai.id).accounts={checked:3,borneOut:1,last:{tick:3000,id:bush.id,kind:'berry_bush',described:6,expected:6,found:0,borneOut:false,toldAt:2000}};
  s.w.sceneLabel='STAGED - Going on the word of a doubted teller';
  for(let i=0;i<40&&!(ada.activity&&ada.activity.kind==='gather');i++)stepWorld(s.w);
  const g=window.__game;g.setPlaying(false);g.restoreWorld(s.w,s.w.settings);g.select(ada.id);window.__ui.update(1);
  const w=g.world??s.w;window.__p11={w,save,saved:save.serializeWorld(w),why:(w.persons.find(p=>p.name==='Ada').activity||{}).data?.why??''};
 })()`);
 await browser.sleep(300);
 await browser.evaluate(`(()=>{const b=[...document.querySelectorAll('button[aria-expanded]')].find(e=>/^(More|Less)$/.test(e.textContent.trim()));if(b&&b.getAttribute('aria-expanded')!=='true')b.click();window.__ui.update(1);})()`);
 await browser.sleep(300);await browser.evaluate('window.__ui.update(1)');await browser.sleep(200);
 await browser.shot(join(out,'gathering.png'));
 const r=await browser.evaluate(`(()=>{return {why:__p11.why,visible:document.body.innerText.includes("Kai's word"),pure:__p11.saved===__p11.save.serializeWorld(__p11.w)};})()`);
 const checks={gathering:/won't go on Kai's word alone \(1 of 3/.test(r.why),visibleInPanel:r.visible,pure:r.pure,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({staged:true,checks,why:r.why,visible:r.visible},null,2));console.log(JSON.stringify(checks));if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
