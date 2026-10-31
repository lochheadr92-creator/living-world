import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5292/',out='autonomy_evidence/seed113-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-seed-input-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe profile');let occupied=false;try{await fetch('http://127.0.0.1:9377/json/version');occupied=true;}catch{}if(occupied)throw new Error('Port occupied');mkdirSync(out,{recursive:true});
const b=await launch({port:9377,width:1440,height:1000,profile}),checks=[];const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const result=await b.evaluate(`(async()=>{const fixture=await import('/tests/helpers/wild_seed.ts'),save=await import('/src/app/save.ts'),{project}=await import('/src/render/iso.ts'),econ=await import('/src/sim/economy.ts');const f=fixture.wildSeedScene(),old=fixture.wildSeedScene(112),copy=save.deserializeWorld(save.serializeWorld(f.w));fixture.finishWildHarvest(f.w,f.p,f.a.id);fixture.finishWildHarvest(old.w,old.p,old.a.id);fixture.finishWildHarvest(copy,copy.persons.find(p=>p.id===f.p.id),f.a.id);window.__seed={...f,save,project};window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return {rules:f.w.settings.rulesVersion,hunger:f.p.needs.hunger,source:f.source.amount,seeds:f.p.inv.seeds,oldSeeds:old.p.inv.seeds,created:f.w.ledger.created.seeds||0,paid:f.w.ledger.reasons['-saved as seed']||0,twins:save.serializeWorld(f.w)===save.serializeWorld(copy),reload:save.serializeWorld(f.w)===save.serializeWorld(save.deserializeWorld(save.serializeWorld(f.w))),conserved:econ.conservationReport(f.w).ok};})()`);
 check('source grain feeds the hungry full-pack gatherer',result.hunger===32&&result.source===1,result);
 check('no seed is created without grain payment; predecessor retained',result.rules===113&&result.seeds===6&&result.oldSeeds===7&&result.created===0&&result.paid===0,result);
 check('accepted harvest saves and continues exactly with balanced items',result.twins&&result.reload&&result.conserved,result);
 const before=await b.evaluate('window.__seed.save.serializeWorld(window.__seed.w)');await b.evaluate(`(()=>{const f=window.__seed,g=window.__game;g.select(f.p.id);g.fly=null;const q=f.project(f.p.x,f.p.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(join(out,'grain-eaten-without-free-seed.png'));const inspect=await b.evaluate("document.querySelector('.insp-person')?.innerText||''");
 check('rendered inspector identifies the staged gatherer',inspect.includes('Ada'),inspect.slice(0,1100));check('inspection is pure',before===await b.evaluate('window.__seed.save.serializeWorld(window.__seed.w)'));
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(join(out,'report.json'),JSON.stringify({scene:'STAGED supplied hunger, source, pack and accepted offered action; direct execution of its physical handler. This proves the input boundary, not ordinary adoption or welfare.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
