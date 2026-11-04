// Rendered check for rules 161. ORDINARY world: the rules-161 Normal river world (arrivals on) is stepped in the page until
// a gatherer's last result is a gather left because the place looked empty; that person is selected and the debug panel opened.
import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='review_evidence/found-empty-20261105/render';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-foundempty-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9417,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5316/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 const found=await browser.evaluate(`(async()=>{
  const {createWorld}=await import('/src/sim/factory.ts'),{currentWorldSettings}=await import('/src/sim/profiles.ts');
  const {stepWorld}=await import('/src/sim/world.ts'),{stageOf}=await import('/src/sim/people.ts'),save=await import('/src/app/save.ts');
  const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:161});
  const R='the place looked empty';let hit=null,heavy=0,reason='';
  for(let i=0;i<24000&&!hit;i++){stepWorld(w);
   for(const p of w.persons){if(!p.alive)continue;
    if(!hit&&p.lastResult&&p.lastResult.detail===R&&p.lastResult.outcome==='interrupted'){hit=p;reason=p.lastResult.label+': '+p.lastResult.detail;}}}
  if(!hit)return {tick:w.tick,heavy,hit:null};
  const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setDebug(true);g.select(hit.id);window.__ui.update(1);
  window.__c={w:g.world??w,save,saved:save.serializeWorld(g.world??w)};
  return {tick:w.tick,reason,hit:{id:hit.id,name:hit.name,stage:stageOf(w,hit)}};
 })()`);
 if(!found.hit)throw Error('No one left an empty place: '+JSON.stringify(found));
 await browser.sleep(300);
 await browser.evaluate(`(()=>{const b=[...document.querySelectorAll('button[aria-expanded]')].find(e=>/^(More|Less)$/.test(e.textContent.trim()));if(b&&b.getAttribute('aria-expanded')!=='true')b.click();window.__ui.update(1);})()`);
 await browser.sleep(300);await browser.evaluate('window.__ui.update(1)');await browser.sleep(200);
 await browser.evaluate(`(()=>{const hits=[...document.querySelectorAll('body *')].filter(x=>x.children.length===0&&/the place looked empty/i.test(x.textContent));const e=hits[0];if(e){e.scrollIntoView({block:'center'});e.style.outline='2px solid #d33';}return hits.length;})()`);
 await browser.sleep(200);await browser.shot(join(out,'person-panel.png'));
 const r=await browser.evaluate(`(()=>({visible:/the place looked empty/i.test(document.body.innerText),text:document.body.innerText.split('\\n').filter(l=>/looked empty|interrupted|Weighed/i.test(l)).slice(0,8),pure:__c.saved===__c.save.serializeWorld(__c.w)}))()`);
 const checks={ordinaryFoundEmpty:true,visibleInPanel:r.visible,pure:r.pure,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({ordinary:true,world:'Normal river, arrivals on, rules 161',found,checks},null,2));console.log(JSON.stringify({found,checks}));if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
