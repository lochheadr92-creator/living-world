// Rendered check for rules 157. ORDINARY world: the rules-157 Normal meadow world (arrivals on) is stepped in the page until
// a carer's own last decision withheld food from a dependant holding it; that carer is selected and the debug panel opened.
import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='review_evidence/carry-recovery-20261105/render';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-carry-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9406,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5305/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 const found=await browser.evaluate(`(async()=>{
  const {createWorld}=await import('/src/sim/factory.ts'),{currentWorldSettings}=await import('/src/sim/profiles.ts');
  const {stepWorld}=await import('/src/sim/world.ts'),{stageOf}=await import('/src/sim/people.ts'),save=await import('/src/app/save.ts');
  const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:true}),rulesVersion:157});
  const R=new Set(['is carrying food already','had food with them when I last reached them']);let hit=null,heavy=0,reason='';
  for(let i=0;i<7200&&!hit;i++){stepWorld(w);
   for(const p of w.persons){if(!p.alive)continue;
    const b=p.lastDecision&&p.lastDecision.blocked.find(b=>R.has(b.blocked));if(!hit&&b){hit=p;reason=b.label+': '+b.blocked;}}}
  if(!hit)return {tick:w.tick,heavy,hit:null};
  const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setDebug(true);g.select(hit.id);window.__ui.update(1);
  window.__c={w:g.world??w,save,saved:save.serializeWorld(g.world??w)};
  return {tick:w.tick,reason,hit:{id:hit.id,name:hit.name,stage:stageOf(w,hit)}};
 })()`);
 if(!found.hit)throw Error('No carer withheld food: '+JSON.stringify(found));
 await browser.sleep(300);
 await browser.evaluate(`(()=>{const t=document.querySelector('[aria-controls="lw-sec-debug"]');if(t&&t.getAttribute('aria-expanded')!=='true')t.click();window.__ui.update(1);})()`);
 await browser.sleep(300);await browser.evaluate('window.__ui.update(1)');await browser.sleep(200);
 await browser.evaluate(`(()=>{const e=[...document.querySelectorAll('.dbg-blocked')].find(x=>/carrying food already|had food with them/.test(x.innerText));if(e)e.scrollIntoView({block:'center'});})()`);
 await browser.sleep(200);await browser.shot(join(out,'carer-debug.png'));
 const r=await browser.evaluate(`(()=>({visible:[...document.querySelectorAll('.dbg-blocked')].some(x=>/carrying food already|had food with them/.test(x.innerText)),pure:__c.saved===__c.save.serializeWorld(__c.w)}))()`);
 const checks={ordinaryCarerWithheld:true,visibleInPanel:r.visible,pure:r.pure,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({ordinary:true,world:'Normal meadow, arrivals on, rules 157',found,checks},null,2));console.log(JSON.stringify({found,checks}));if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
