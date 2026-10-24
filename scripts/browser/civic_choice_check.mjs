import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const url=process.argv[2]??'http://127.0.0.1:5291/';
const out='civic_evidence/choice-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9360});const results=[];
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url});await browser.sleep(1800);
 for(const arm of ['before','after']){
  await browser.evaluate(`(async()=>{
   const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');
   const w=deserializeWorld(await (await fetch('/civic_evidence/choice-${arm}-save.json')).text());
   const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);
   const p=w.persons.find(p=>p.name==='Ben');g.select(p.id);g.flyTo(p.x,p.y);
   window.__choiceBefore=serializeWorld(w);
  })()`);
  await browser.sleep(500);
  await browser.evaluate(`(()=>{const p=document.querySelector('.civic-panel');p.open=true;p.scrollIntoView({block:'center'});})()`);
  const text=await browser.evaluate(`document.querySelector('.civic-panel').textContent`);
  check(`${arm}: coordinator follows accepted support`,text.includes(`Coordinator: ${arm==='before'?'Ada':'Cora'}`),text);
  check(`${arm}: actual support is visible`,text.includes(arm==='before'?'Ben supported Ada':'Ben supported Cora'),text);
  check(`${arm}: full saved state unchanged by inspection`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__choiceBefore})()`));
  if(arm==='after')check('support decision spoken visibly',await browser.evaluate(`window.__game.world.persons.some(p=>p.speech?.text==='I support you coordinating it, Cora.')`));
  await browser.shot(`${out}/${arm}.png`);
 }
 const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no runtime exceptions',errors.length===0,errors);
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
