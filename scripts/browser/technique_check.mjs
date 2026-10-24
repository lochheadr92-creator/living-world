import { launch } from './cdp.mjs';
import { mkdirSync,writeFileSync } from 'node:fs';
const url=process.argv[2]??'http://127.0.0.1:5291/';
const out='civic_evidence/technique-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9363});const results=[];
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url});await browser.sleep(1800);
 for(const arm of ['before','during','learned','after']){
  await browser.evaluate(`(async()=>{
   const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');
   const w=deserializeWorld(await (await fetch('/civic_evidence/technique-${arm}-save.json')).text());
   const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);
   const p=w.persons.find(p=>p.name==='Ben');g.select(p.id);g.flyTo(p.x,p.y);window.__techniqueBefore=serializeWorld(w);
  })()`);await browser.sleep(300);
  await browser.evaluate(`(()=>{const e=[...document.querySelectorAll('button.sec-head')].find(e=>e.textContent.includes('Traits & skills'));if(e&&e.getAttribute('aria-expanded')!=='true')e.click();})()`);await browser.sleep(300);
  const text=await browser.evaluate(`document.body.textContent`);
  check(`${arm}: held technique accurately described`,text.includes(arm==='before'||arm==='during'?'Charcoal firing: not learned':'Charcoal firing: learned from Ada'));
  if(arm==='during'){check('instruction visibly costs time',text.includes('180 ticks together'));check('lesson progress reflects elapsed time',text.includes('45%'));}
  if(arm==='after')check('finished batch visible in event feed',text.includes('charcoal'));
  check(`${arm}: observer preserves complete save`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__techniqueBefore})()`));
  await browser.evaluate(`document.querySelector('.technique-knowledge').scrollIntoView({block:'center'})`);await browser.shot(`${out}/${arm}.png`);
  if(arm==='during'){await browser.evaluate(`document.querySelector('.q-doing').scrollIntoView({block:'center'})`);await browser.shot(`${out}/instruction.png`);}
  if(arm==='after'){
   await browser.evaluate(`(()=>{const g=window.__game;const k=g.world.buildings.find(b=>b.type==='kiln');g.select(k.id);g.flyTo(k.x,k.y)})()`);await browser.sleep(300);await browser.shot(`${out}/kiln.png`);
  }
 }
 const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no runtime exceptions',errors.length===0,errors);
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
