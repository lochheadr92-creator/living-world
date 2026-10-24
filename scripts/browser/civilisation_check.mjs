import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const url=process.argv[2]??'http://127.0.0.1:5291/';
const out='civic_evidence/page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9357});const results=[];
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url});await browser.sleep(1800);
 for(const phase of ['active','completed']){
  const state=await browser.evaluate(`(async()=>{
   const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');
   const w=deserializeWorld(await (await fetch('/civic_evidence/staged-${phase}.json')).text());
   const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);
   const q=w.civicProjects[0];g.select(q.organiserId);const p=w.byId.get(q.organiserId);const place=w.byId.get(q.buildingId??q.siteId);g.flyTo(place.x+1,place.y+1);
   window.__civicBefore=serializeWorld(w);
   return {status:q.status,site:q.siteId,organiser:q.organiserId,building:q.buildingId};
  })()`);
  await browser.sleep(500);
  const text=await browser.evaluate(`document.querySelector('.insp-person')?.textContent??''`);
  check(`${phase}: header rows do not overlap`, await browser.evaluate(`document.querySelector('.p-township').getBoundingClientRect().top >= document.querySelector('.p-home').getBoundingClientRect().bottom`));
  check(`${phase}: township and organiser visible`,text.includes('Willowbank')&&text.includes('Ada'),state);
  check(`${phase}: participant contribution and outcome visible`,text.includes('Ben: supporting')&&text.includes(phase==='completed'?'completed':'Still needed'),text.slice(-1800));
  await browser.evaluate(`document.querySelector('.civic-panel').scrollIntoView({block:'center'})`);
  await browser.shot(`${out}/${phase}.png`);
  check(`${phase}: viewing leaves saved state untouched`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__civicBefore})()`));
  if(phase==='active'){
   await browser.evaluate(`window.__game.select(${state.site})`);await browser.sleep(300);
   const siteText=await browser.evaluate(`document.querySelector('.insp-entity')?.textContent??''`);
   check('site exposes public ownership and missing inputs',siteText.includes('public use')&&siteText.includes('wood')&&siteText.includes('Township project'),siteText.slice(0,1800));
   await browser.shot(`${out}/site.png`);
  }
 }
 const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser runtime exceptions',errors.length===0,errors);
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
