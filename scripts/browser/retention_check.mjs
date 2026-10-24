import {launch} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='civic_evidence/retention-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9371}),results=[];const check=(name,pass)=>{results.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url:process.argv[2]??'http://127.0.0.1:5291/'});await browser.sleep(1600);
 await browser.evaluate(`(async()=>{const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');const w=deserializeWorld(await(await fetch('/civic_evidence/retention-contract-save.json')).text());const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);const p=w.persons.find(p=>p.name==='Bea');g.select(p.id);g.flyTo(p.x,p.y);window.__before=serializeWorld(w);})()`);await browser.sleep(350);
 await browser.evaluate(`(()=>{const panel=[...document.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent==='Relationship history');if(panel){panel.open=true;panel.scrollIntoView({block:'center'});}})()`);await browser.sleep(200);
 const text=await browser.evaluate('document.body.textContent');check('parent identity retained',text.includes('Ada: trust')&&text.includes('; parent'));check('recorded cause retained',text.includes('Worked together on the household home'));check('staged label',text.includes('STAGED'));
 check('full state unchanged by rendered history',await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__before})()`));
 await browser.shot(`${out}/family-history.png`);check('no runtime exceptions',!browser.events.some(e=>e.method==='Runtime.exceptionThrown'));writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
