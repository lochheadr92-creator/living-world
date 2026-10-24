import {launch} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='civic_evidence/settlement-economy-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9367}),results=[];
const check=(name,pass)=>{results.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url:process.argv[2]??'http://127.0.0.1:5291/'});await browser.sleep(1600);
 await browser.evaluate(`(async()=>{const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');const w=deserializeWorld(await(await fetch('/civic_evidence/settlement-economy-save.json')).text());const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);window.__economyBefore=serializeWorld(w);})()`);
 for(const name of ['Ada','Ben']){
  await browser.evaluate(`(()=>{const g=window.__game,p=g.world.persons.find(p=>p.name==='${name}');g.select(p.id);g.flyTo(p.x,p.y);})()`);await browser.sleep(300);
  await browser.evaluate(`(()=>{const panel=[...document.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent==='Township & shared work');if(panel){panel.open=true;panel.scrollIntoView({block:'center'});}})()`);await browser.sleep(250);
  const text=await browser.evaluate('document.body.textContent');check(`${name}: activity shown`,text.includes('Recent recorded production and resource flows'));
  check(`${name}: output scope accurate`,text.includes(name==='Ada'?'workshop: planks on 3 days':'No production recorded in the recent window'));
  check(`${name}: gross flow not called trade`,text.includes('not net trade')&&text.includes('2 wood, given'));
  check(`${name}: observer preserves complete state`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__economyBefore})()`));
  await browser.shot(`${out}/${name}.png`);
 }
 check('no runtime exceptions',!browser.events.some(e=>e.method==='Runtime.exceptionThrown'));
 writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
