import {launch} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='civic_evidence/geology-page';mkdirSync(out,{recursive:true});const browser=await launch({port:9372}),results=[];
const check=(name,pass)=>{results.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try{
 await browser.send('Page.navigate',{url:process.argv[2]??'http://127.0.0.1:5291/'});await browser.sleep(1600);
 const deposits=await browser.evaluate(`(async()=>{const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');const w=deserializeWorld(await(await fetch('/civic_evidence/geology-initial-save.json')).text());const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.setPlaying(false);window.__before=serializeWorld(w);const ds=w.sources.filter(s=>s.type==='ore_vein').sort((a,b)=>a.amount-b.amount);return [ds[0],ds.at(-1)].map(s=>({id:s.id,x:s.x,y:s.y,amount:s.amount,item:s.item}));})()`);
 check('distinct finite deposits',deposits[0].amount!==deposits[1].amount);
 for(const [i,s] of deposits.entries()){
  await browser.evaluate(`window.__game.select(${s.id});window.__game.flyTo(${s.x},${s.y})`);await browser.sleep(300);const text=await browser.evaluate('document.body.textContent');check(`deposit ${i}: actual quantity visible`,text.includes(`${s.amount} ${s.item}`));check(`deposit ${i}: finite cost explained`,text.includes('whatever is taken out is gone for good'));await browser.shot(`${out}/ore-${i}.png`);
 }
 check('inspection preserves complete state',await browser.evaluate(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__before})()`));
 await browser.evaluate(`(async()=>{const {deserializeWorld}=await import('/src/app/save.ts');const w=deserializeWorld(await(await fetch('/civic_evidence/geology-observed-save.json')).text());const g=window.__game;g.restoreWorld(w,w.settings);g.setPlaying(false);const p=w.persons[0];g.select(p.id);g.flyTo(p.x,p.y);})()`);await browser.sleep(300);
 await browser.evaluate(`(()=>{const panel=[...document.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent==='Township & shared work');if(panel){panel.open=true;panel.scrollIntoView({block:'center'});}})()`);await browser.sleep(200);
 const text=await browser.evaluate('document.body.textContent');check('actual production shown',text.includes('Recent recorded production and resource flows'));check('short-run limits stated',text.includes('Too little repeated activity recorded to describe a specialisation'));await browser.shot(`${out}/observed-production.png`);
 check('no runtime exceptions',!browser.events.some(e=>e.method==='Runtime.exceptionThrown'));writeFileSync(`${out}/report.json`,JSON.stringify({deposits,results},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await browser.close();}
