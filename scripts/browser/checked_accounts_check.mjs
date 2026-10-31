import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5290/',out='autonomy_evidence/accounts107-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-accounts-'+randomUUID()));if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9375/json/version');occupied=true;}catch{}if(occupied)throw new Error('Browser port in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9375,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const show=async(who)=>b.evaluate(`(()=>{const f=window.__ca,g=window.__game;const e=f.${who};g.select(e.id);g.fly=null;const q=f.project(e.x,e.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);const m=document.querySelector('.insp-person .upto-top button');if(m&&m.getAttribute('aria-expanded')!=='true')m.click();for(const d of document.querySelectorAll('.insp-person details'))d.open=true;window.__ui.update(1);return document.querySelector('.insp-person')?.innerText||'';})()`);
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 await b.evaluate(`(async()=>{const {checkedAccountsScene}=await import('/tests/helpers/checked_accounts.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),decision=await import('/src/sim/decision.ts'),econ=await import('/src/sim/economy.ts');const f=checkedAccountsScene(107);Object.assign(f,{save,stepWorld,project,decision,econ});window.__ca=f;const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);})()`);
 const told=await b.evaluate(`(()=>{const f=window.__ca;return {belief:f.ada.beliefs[f.bush.id],trust:f.ada.relations[f.ben.id].trust,log:f.ada.log.slice(-1)[0]?.text};})()`);
 check("Ada holds Ben's first-hand account of the bush (told, one mouth, about 6) and nothing is held yet",told.belief?.src==='told'&&told.belief?.hops===1&&told.belief?.amount===6&&told.trust===10,told);
 const checked=await b.evaluate(`(()=>{const f=window.__ca;f.goCheck();const a=f.ada.relations[f.ben.id].accounts;return {accounts:a,trust:f.ada.relations[f.ben.id].trust,log:f.ada.log.filter(l=>/account of the berry bush/.test(l.text)).map(l=>l.text),cara:f.cara.relations[f.ben.id]?.accounts,valid:f.save.serializeWorld(f.save.deserializeWorld(f.save.serializeWorld(f.w)))===f.save.serializeWorld(f.w),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('she walks there on his word, finds it short, and holds the account to him once with a dated note; Cara holds nothing; the save is valid',checked.accounts?.checked===1&&checked.accounts?.borneOut===0&&checked.trust===7&&checked.log.length===1&&checked.cara===undefined&&checked.valid&&checked.conserved,checked);
 const panel=await show('ada');await b.sleep(150);await b.shot(join(out,'account-not-borne-out.png'));
 check("Ada's relationship history shows the checked account and its grounds",/Accounts of places checked: 1, borne out 0\./.test(panel)&&/Grounds are my own sight only/.test(panel),panel.slice(panel.indexOf('Relationship history'),panel.indexOf('Relationship history')+500));
 const asks=await b.evaluate(`(()=>{const f=window.__ca;const ctx=f.decision.generateOptions(f.w,f.ada,true,true);const o=w=>ctx.options.find(o=>o.label==='Ask '+w+' where to find wood');const ben=o('Ben'),cara=o('Cara');return {ben:ben&&{util:ben.util,parts:ben.parts},cara:cara&&{util:cara.util,parts:cara.parts}};})()`);
 check('whom to ask next is weighed by it: Cara over Ben by four, with the tally as the stated reason',asks.ben&&asks.cara&&Math.abs(asks.cara.util-asks.ben.util-4)<1e-6&&asks.ben.parts.some(([n,v])=>/0 of 1 of their accounts of places was borne out/.test(n)&&v===-4),asks);
 const decided=await b.evaluate(`(()=>{const f=window.__ca;f.ada.cooldowns.pause=0;f.ada.nextThink=f.w.tick;f.ada.cooldowns.talk=0;f.stepWorld(f.w);const d=f.ada.lastDecision;return {chosen:d?.chosen?.label,alternatives:d?.alternatives?.map(a=>a.label)};})()`);
 check('left to herself she asks Cara, with asking Ben passed over',decided.chosen==='Ask Cara where to find wood'&&(decided.alternatives??[]).includes('Ask Ben where to find wood'),decided);
 const after=await show('ada');await b.sleep(150);await b.shot(join(out,'asks-cara-not-ben.png'));check('the panel states the choice and the reason',/Ask(ing)? Cara where to find wood/i.test(after)&&/accounts of places/i.test(after),after.slice(0,400));
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:107,evidence:"STAGED first-hand account told by the engine's own telling, the bush declared stripped after the teller saw it; the walk, the check, the tally, the trust note and the later choice of whom to ask are the engine's own. No ordinary frequency claim." ,checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
