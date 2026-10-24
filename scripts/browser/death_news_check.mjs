import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const url=process.argv[2]??'http://127.0.0.1:5291/';
const out='civic_evidence/death-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9359});const results=[];
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url});await browser.sleep(1800);
 for(const arm of ['before','after']){
  await browser.evaluate(`(async()=>{
   const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');
   const w=deserializeWorld(await (await fetch('/civic_evidence/death-${arm}-save.json')).text());
   const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);
   const p=w.persons.find(p=>p.name==='Cora');g.select(p.id);g.flyTo(p.x,p.y);
   window.__deathBefore=serializeWorld(w);
  })()`);
  await browser.sleep(500);
  await browser.evaluate(`(()=>{const p=document.querySelector('.relationship-history');p.open=true;p.scrollIntoView({block:'center'});})()`);
  const text=await browser.evaluate(`document.querySelector('.relationship-history').textContent`);
  check(`${arm}: learned death only after contact`,text.includes('Death learned')===(arm==='after'),text);
  check(`${arm}: identity and source visible`,text.includes('Ada: trust')&&(arm==='before'||text.includes('told from Ben')),text);
  check(`${arm}: full saved state unchanged by inspection`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__deathBefore})()`));
  if(arm==='after')check('death story spoken visibly',await browser.evaluate(`window.__game.world.persons.some(p=>p.speech?.text==='Ada has died.')`));
  await browser.shot(`${out}/${arm}.png`);
 }
 const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no runtime exceptions',errors.length===0,errors);
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
