// Rendered check for P1.1 (display only). STAGED scene: hearsay from a teller whose accounts were checked.
import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='review_evidence/p11-provenance-20261104/render';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-provenance-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9396,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5301/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 await browser.evaluate(`(async()=>{
  const kit=await import('/tests/helpers/kit.ts'),{makeSource}=await import('/src/sim/sources.ts'),{putBelief,observe}=await import('/src/sim/knowledge.ts');
  const {relOf}=await import('/src/sim/relations.ts'),save=await import('/src/app/save.ts');
  const s=kit.stage('belief-provenance');s.w.settings={...s.w.settings,dynamics:'rich'};
  const ada=kit.addPerson(s,'Ada',40.5,40.5),kai=kit.addPerson(s,'Kai',42.5,40.5),lin=kit.addPerson(s,'Lin',44.5,40.5);
  const bush=makeSource(s.w,'berry_bush',60,40,6),grain=makeSource(s.w,'wild_grain',62,44,6);kit.done(s);s.w.tick=4000;
  putBelief(ada,{id:bush.id,kind:bush.type,x:bush.x,y:bush.y,amount:6,max:bush.max,seen:3400,src:'told',from:kai.id,learned:3400});
  putBelief(ada,{id:grain.id,kind:grain.type,x:grain.x,y:grain.y,amount:6,max:grain.max,seen:1600,src:'told',from:lin.id,learned:1600});
  relOf(ada,kai.id).accounts={checked:3,borneOut:1,last:{tick:3000,id:bush.id,kind:'berry_bush',described:6,expected:6,found:0,borneOut:false,toldAt:2000}};
  s.w.sceneLabel='STAGED - Where hearsay came from';
  const g=window.__game;g.setPlaying(false);g.restoreWorld(s.w,s.w.settings);g.select(ada.id);window.__ui.update(1);
  window.__p11={w:g.world??s.w,save,saved:save.serializeWorld(g.world??s.w)};
 })()`);
 await browser.sleep(300);
 await browser.evaluate(`(()=>{for(const el of document.querySelectorAll('button,[role=tab],summary')){const t=el.textContent.trim();if(t==='Knows'||t.startsWith('What they know')){if(el.getAttribute('aria-expanded')!=='true')el.click();}}window.__ui.update(1);})()`);
 await browser.sleep(300);await browser.evaluate('window.__ui.update(1)');await browser.sleep(200);
 await browser.shot(join(out,'knowledge.png'));
 const r=await browser.evaluate(`(()=>{const rows=[...document.querySelectorAll('.know-told-row')].filter(e=>e.offsetParent).map(e=>({text:e.textContent,doubt:e.classList.contains('doubt')}));
  return {rows,pure:__p11.saved===__p11.save.serializeWorld(__p11.w)};})()`);
 const checks={visibleRows:r.rows.length===2,doubtedTeller:r.rows.some(x=>x.doubt&&/told by Kai.*wrong before \(1 of 3/.test(x.text)),oldNews:r.rows.some(x=>/told by Lin.*old news/.test(x.text)&&!x.doubt),pure:r.pure,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({staged:true,checks,rows:r.rows},null,2));console.log(JSON.stringify(checks));if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
