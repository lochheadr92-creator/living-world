import { launch } from './cdp.mjs';
import { mkdirSync,writeFileSync } from 'node:fs';
const url=process.argv[2]??'http://127.0.0.1:5291/';
const out='civic_evidence/development-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9362});const results=[];
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url});await browser.sleep(1800);
 for(const arm of ['newborn','before','after']){
  await browser.evaluate(`(async()=>{
   const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');
   const w=deserializeWorld(await (await fetch('/civic_evidence/development-${arm}-save.json')).text());
   const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);
   const p=w.persons.at(-1);g.select(p.id);g.flyTo(p.x,p.y);window.__developmentBefore=serializeWorld(w);
  })()`);
  await browser.sleep(300);
  await browser.evaluate(`(()=>{const e=[...document.querySelectorAll('button.sec-head')].find(e=>e.textContent.includes('Traits & skills'));if(e&&e.getAttribute('aria-expanded')!=='true')e.click();})()`);
  await browser.sleep(300);
  const text=await browser.evaluate(`document.body.textContent`);
  check(`${arm}: developmental explanation visible`,text.includes('birthdays grant no experience'));
  check(`${arm}: actual proficiency visible`,text.includes(arm==='newborn'?'×0.20':arm==='before'?'×0.71':'×0.72'));
  check(`${arm}: inspection preserves complete state`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__developmentBefore})()`));
  await browser.evaluate(`document.querySelector('.skill-explanation').scrollIntoView({block:'start'})`);await browser.shot(`${out}/${arm}.png`);
 }
 const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no runtime exceptions',errors.length===0,errors);
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
