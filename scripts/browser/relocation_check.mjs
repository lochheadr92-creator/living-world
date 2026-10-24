import {launch} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='civic_evidence/relocation-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9366}),results=[];
const check=(name,pass)=>{results.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url:process.argv[2]??'http://127.0.0.1:5291/'});await browser.sleep(1600);
 for(const arm of ['proposal','packing','travel','building','settled','refused']){
  await browser.evaluate(`(async()=>{const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');const w=deserializeWorld(await(await fetch('/civic_evidence/relocation-${arm}-save.json')).text());const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);const p=w.persons.find(p=>p.name==='Ada');g.select(p.id);g.flyTo(p.x,p.y);window.__relocationBefore=serializeWorld(w);})()`);await browser.sleep(300);
  await browser.evaluate(`(()=>{const panel=[...document.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent==='Household history');if(panel){panel.open=true;panel.scrollIntoView({block:'center'});}})()`);await browser.sleep(300);
  const text=await browser.evaluate('document.body.textContent');
  check(`${arm}: real relocation history shown`,text.includes('Relocation #')&&text.includes('Organiser: Ada'));
  check(`${arm}: correct stage shown`,text.includes(arm==='proposal'?': asking.':arm==='refused'?': failed.':arm==='travel'?': travelling.':`: ${arm}.`));
  if(arm==='refused')check('refusal reason visible',text.includes('does not trust this organiser'));
  if(arm==='settled')check('persistent membership and property explanation visible',text.includes('Landing')&&text.includes('former property remains household-owned'));
  check(`${arm}: observer preserves complete state`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__relocationBefore})()`));
  await browser.shot(`${out}/${arm}.png`);
 }
 check('no browser runtime exceptions',!browser.events.some(e=>e.method==='Runtime.exceptionThrown'));
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
