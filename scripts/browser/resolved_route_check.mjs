import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/resolved77-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-corrected-'+randomUUID()));if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9367/json/version');occupied=true;}catch{}if(occupied)throw new Error('Browser port already in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem('+JSON.stringify('living-world:prefs:v1')+','+JSON.stringify(JSON.stringify({inspectorOpen:true,feedOpen:true}))+');localStorage.setItem('+JSON.stringify('living-world:ui:v1')+','+JSON.stringify(JSON.stringify({hinted:true,sections:{uptoMore:true}}))+');'});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const result=await b.evaluate(`(async()=>{const {correctedRouteScene}=await import('/tests/helpers/resolved_route.ts'),save=await import('/src/app/save.ts'),{canObtain}=await import('/src/sim/social.ts'),{project}=await import('/src/render/iso.ts'),{conservationReport}=await import('/src/sim/economy.ts');const old=correctedRouteScene(76),f=correctedRouteScene(77);Object.assign(f,{save,project});f.raw=save.serializeWorld(f.w);window.__corrected=f;window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return {old:canObtain(old.w,old.p,'wood'),current:canObtain(f.w,f.p,'wood'),tick:f.w.tick,route:f.p.failures[f.tree.id].route,conserved:conservationReport(f.w).ok};})()`);
 check('actual corrective arrival restores the material promise check only in rules 77',!result.old&&result.current&&result.tick<520&&!!result.route.corrected&&result.conserved,result);
 await b.evaluate(`(()=>{const f=window.__corrected,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2};window.__ui.update(1);const tab=document.querySelector('[aria-controls="lw-sec-traits"]');if(tab?.getAttribute('aria-expanded')!=='true')tab?.click();window.__ui.update(1);document.querySelector('.route-experience-line')?.scrollIntoView({block:'center'});})()`);await b.sleep(250);await b.shot(join(out,'corrected-arrival.png'));
 const line=await b.evaluate(`document.querySelector('.route-experience-line')?.textContent||''`);check('rendered retained history names the personally reached destination',line.includes('personally reached at tick 136'),line);
 check('rendering preserves the full saved world and RNG',await b.evaluate(`window.__corrected.save.serializeWorld(window.__corrected.w)===window.__corrected.raw`));
 const reload=await b.evaluate(`(()=>{const f=window.__corrected,loaded=f.save.deserializeWorld(f.raw);window.__game.restoreWorld(loaded,loaded.settings);return f.save.serializeWorld(loaded)===f.raw;})()`);check('the corrected world survives save/load',reload);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:77,evidence:'Staged legally selected gather, actual blocked path and actual corrective arrival. Promise availability is an engine check, not evidence that a subsequent request was accepted or goods delivered.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
