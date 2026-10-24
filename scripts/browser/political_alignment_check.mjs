import {launch} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='civic_evidence/alignment-page';mkdirSync(out,{recursive:true});
const browser=await launch({port:9369}),results=[];const check=(name,pass)=>{results.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url:process.argv[2]??'http://127.0.0.1:5291/'});await browser.sleep(1600);
 for(const [stage,expected] of [['before','Faction supporting Ada'],['retained','after repeatedly choosing them on earlier projects'],['changed','Ben supports Cora coordinating']]){
  await browser.evaluate(`(async()=>{const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');const w=deserializeWorld(await(await fetch('/civic_evidence/alignment-${stage}-save.json')).text());const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);const p=w.persons.find(p=>p.name==='Ben');g.select(p.id);g.flyTo(p.x,p.y);window.__before=serializeWorld(w);})()`);await browser.sleep(350);
  await browser.evaluate(`(()=>{const panel=[...document.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent==='Township & shared work');if(panel){panel.open=true;panel.scrollIntoView({block:'center'});}})()`);await browser.sleep(200);
  const text=await browser.evaluate('document.body.textContent');check(`${stage}: choice explained`,text.includes(expected));check(`${stage}: coordinator`,text.includes('Coordinator: '+(stage==='changed'?'Cora':'Ada')));
  check(`${stage}: observer preserves full state`,await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__before})()`));
  await browser.evaluate(`(()=>{const line=[...document.querySelectorAll('details *')].find(e=>!e.children.length&&e.textContent.includes(${JSON.stringify(expected)}));line?.scrollIntoView({block:'center'});})()`);await browser.sleep(200);
  await browser.shot(`${out}/${stage}.png`);
 }
 check('no runtime exceptions',!browser.events.some(e=>e.method==='Runtime.exceptionThrown'));writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
