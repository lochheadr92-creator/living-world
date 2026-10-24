import {launch} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='civic_evidence/access-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9364});const results=[];
const check=(name,pass)=>{results.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url:process.argv[2]??'http://127.0.0.1:5291/'});await browser.sleep(1800);
 for(const arm of ['before','after']){
  await browser.evaluate(`(async()=>{const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');const w=deserializeWorld(await(await fetch('/civic_evidence/access-${arm}-save.json')).text());const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);const p=w.persons.find(p=>p.name==='Ada');g.select(p.id);g.flyTo(44,44);window.__accessBefore=serializeWorld(w)})()`);await browser.sleep(300);
  await browser.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='More');if(b)b.click()})()`);await browser.sleep(200);
  const text=await browser.evaluate(`document.body.textContent`);check(`${arm}: refusal appears only after actual attempt`,text.includes('footprint would obstruct access')===(arm==='after'));
  check(`${arm}: observer does not change complete save`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__accessBefore})()`));
  await browser.shot(`${out}/${arm}.png`);
 }
 check('no runtime errors',!browser.events.some(e=>e.method==='Runtime.exceptionThrown'));writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
