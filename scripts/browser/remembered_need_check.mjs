import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5290/',out='autonomy_evidence/remembered106-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-remembered-'+randomUUID()));if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9375/json/version');occupied=true;}catch{}if(occupied)throw new Error('Browser port in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9375,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,who)=>{await b.evaluate(`(()=>{const f=window.__rn,g=window.__game;const e=f.${who};g.select(e.id);g.fly=null;const q=f.project(e.x,e.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(join(out,name+'.png'));return b.evaluate("document.querySelector('.insp-person')?.innerText||''");};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 await b.evaluate(`(async()=>{const {rememberedNeedScene}=await import('/tests/helpers/remembered_need.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),decision=await import('/src/sim/decision.ts'),econ=await import('/src/sim/economy.ts');const f=rememberedNeedScene(106);Object.assign(f,{save,stepWorld,project,decision,econ});window.__rn=f;const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);})()`);
 const care=`(ctx)=>ctx.options.find(o=>o.key.startsWith('give:'))`;
 const unseen=await b.evaluate(`(()=>{const f=window.__rn;f.away();f.cal.needs.hunger=30;const ctx=f.decision.generateOptions(f.w,f.ada,true,true);const o=(${care})(ctx);return {option:o?.label,blocked:ctx.blocked.filter(b=>b.label.startsWith('Care for')).map(b=>b.blocked),note:f.ada.whereabouts[f.cal.id]};})()`);
 check('a child grown hungry out of sight is not known to be: no care is offered and nothing is set aside',unseen.option===undefined&&unseen.blocked.length===0&&unseen.note?.seen?.hungry===false,unseen);
 const seen=await b.evaluate(`(()=>{const f=window.__rn;f.back();const ctx=f.decision.generateOptions(f.w,f.ada,true,true);const o=(${care})(ctx);return {option:o?.label,parts:o?.parts,note:f.ada.whereabouts[f.cal.id]};})()`);
 check('in sight he is seen hungry and bread is offered on what she sees',seen.option==='Bring bread to Cal'&&seen.note?.seen?.hungry===true&&!seen.parts.some(([n])=>/looked so/.test(n)),seen);
 const decided=await b.evaluate(`(()=>{const f=window.__rn;f.away();const tick=f.w.tick;f.ada.cooldowns.pause=0;f.ada.nextThink=f.w.tick;f.stepWorld(f.w);const d=f.ada.lastDecision;return {tick,chosen:d?.chosen?.label,parts:d?.chosen?.parts,activity:f.ada.activity?.label,valid:f.save.serializeWorld(f.save.deserializeWorld(f.save.serializeWorld(f.w)))===f.save.serializeWorld(f.w),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('out of sight again she sets out with bread on how he looked, dated to that sight, and the save is valid',decided.chosen==='Bring bread to Cal'&&decided.parts?.some(([n])=>n==='Cal needs bread (looked so when I last saw them, tick '+decided.tick+')')&&decided.valid&&decided.conserved,decided);
 await shot('care-decided-on-remembered-signs','ada');
 const panel=await b.evaluate(`(()=>{const b=document.querySelector('.insp-person .upto-top button');if(b&&b.getAttribute('aria-expanded')!=='true')b.click();for(const d of document.querySelectorAll('.insp-person details'))d.open=true;window.__ui.update(1);return document.querySelector('.insp-person')?.innerText||'';})()`);await b.sleep(150);await b.shot(join(out,'care-reason-expanded.png'));check("Ada's inspector shows the decision and its remembered-signs reason",/Bring bread to Cal/.test(panel)&&/looked so when I last saw them/.test(panel),panel.slice(0,400));
 await shot('cal-out-of-sight','cal');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:106,evidence:'STAGED parent and child; the child\'s position and needs are declared. The care offered, the decision and its stated reason are the engine\'s own. No ordinary frequency claim.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
