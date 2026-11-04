// Rendered check for rules 156. ORDINARY world: the rules-156 Normal meadow world (arrivals on) is stepped in the page
// until a child's own last decision withheld wood or stone with the rule's reason; that child is selected and the
// debug decision panel is opened. Also confirms no child has started heavy gathering by then.
import {launch} from '../../scripts/browser/cdp.mjs';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const out='review_evidence/child-tasks-20261104/render';
if(existsSync(out))throw Error('Fresh output required');mkdirSync(out,{recursive:true});
const base=resolve(tmpdir()),profile=resolve(base,'living-world-child-'+randomUUID());
if(!profile.startsWith(base+sep)||existsSync(profile))throw Error('Unsafe profile');
const browser=await launch({port:9405,width:1440,height:1000,profile});
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:5304/'});
 for(let i=0;i<100&&!await browser.evaluate('!!window.__game');i++)await browser.sleep(100);
 const found=await browser.evaluate(`(async()=>{
  const {createWorld}=await import('/src/sim/factory.ts'),{currentWorldSettings}=await import('/src/sim/profiles.ts');
  const {stepWorld}=await import('/src/sim/world.ts'),{stageOf}=await import('/src/sim/people.ts'),save=await import('/src/app/save.ts');
  const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:true}),rulesVersion:156});
  const R='too young to chop wood or break stone';let hit=null,heavy=0;
  for(let i=0;i<7200&&!hit;i++){stepWorld(w);
   for(const p of w.persons){if(!p.alive||stageOf(w,p)!=='child')continue;
    const a=p.activity;if(a&&a.kind==='gather'){const s=w.byId.get(a.targetId);if(s&&(s.type==='tree'||s.type==='rock'))heavy++;}
    if(!hit&&p.lastDecision&&p.lastDecision.blocked.some(b=>b.blocked===R))hit=p;}}
  if(!hit)return {tick:w.tick,heavy,hit:null};
  const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setDebug(true);g.select(hit.id);window.__ui.update(1);
  window.__c={w:g.world??w,save,saved:save.serializeWorld(g.world??w)};
  return {tick:w.tick,heavy,hit:{id:hit.id,name:hit.name,age:hit.age}};
 })()`);
 if(!found.hit)throw Error('No child decision withheld heavy work: '+JSON.stringify(found));
 await browser.sleep(300);
 await browser.evaluate(`(()=>{const t=document.querySelector('[aria-controls="lw-sec-debug"]');if(t&&t.getAttribute('aria-expanded')!=='true')t.click();window.__ui.update(1);})()`);
 await browser.sleep(300);await browser.evaluate('window.__ui.update(1)');await browser.sleep(200);
 await browser.evaluate(`(()=>{const e=[...document.querySelectorAll('.dbg-blocked')].find(x=>x.innerText.includes('too young'));if(e)e.scrollIntoView({block:'center'});})()`);
 await browser.sleep(200);await browser.shot(join(out,'child-debug.png'));
 const r=await browser.evaluate(`(()=>({visible:[...document.querySelectorAll('.dbg-blocked')].some(x=>x.innerText.includes('too young to chop wood or break stone')),pure:__c.saved===__c.save.serializeWorld(__c.w)}))()`);
 const checks={ordinaryChildWithheld:true,noHeavyStarts:found.heavy===0,visibleInPanel:r.visible,pure:r.pure,noExceptions:!browser.events.some(e=>e.method==='Runtime.exceptionThrown')};
 writeFileSync(join(out,'report.json'),JSON.stringify({ordinary:true,world:'Normal meadow, arrivals on, rules 156',found,checks},null,2));console.log(JSON.stringify({found,checks}));if(Object.values(checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}
