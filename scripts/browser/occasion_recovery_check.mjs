import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5294/',out='autonomy_evidence/occasion112-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-occasion-resume-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9376/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port in use');mkdirSync(out,{recursive:true});
const b=await launch({port:9376,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{const before=await b.evaluate('window.__resume.save.serializeWorld(window.__resume.w)');await b.evaluate(`(()=>{const f=window.__resume,g=window.__game;g.select(f.p.id);g.fly=null;const q=f.project(f.p.x,f.p.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(join(out,name+'.png'));check(name+' inspection is pure',before===await b.evaluate('window.__resume.save.serializeWorld(window.__resume.w)'));return b.evaluate("document.querySelector('.insp-person')?.innerText||''");};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const start=await b.evaluate(`(async()=>{const {occasionConversationScene}=await import('/tests/helpers/occasion_recovery.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),econ=await import('/src/sim/economy.ts');const f=occasionConversationScene(),copy=save.deserializeWorld(save.serializeWorld(f.w));window.__resume={...f,copy,save,stepWorld,project,econ};window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return {kind:f.p.activity?.kind,paused:f.p.suspended?.id===f.a.id,paid:f.paid,deadline:f.a.expire,rules:f.w.settings.rulesVersion};})()`);
 check('accepted chat pauses a real visit with progress',start.kind==='converse'&&start.paused&&start.paid>0,start);
 const talk=await shot('talking-at-feast');check('inspector shows the conversation',talk.includes('Talking with Ben'),talk.slice(0,1000));
 const resumed=await b.evaluate(`(()=>{const f=window.__resume;for(let n=0;n<300&&f.p.convId;n++){if(f.p.suspended?.id===f.a.id&&f.p.suspended.progress!==f.paid)throw new Error('Conversation credited participation');f.stepWorld(f.w);f.stepWorld(f.copy);}return {kind:f.p.activity?.kind,id:f.p.activity?.id,expected:f.a.id,progress:f.a.progress,paid:f.paid,deadline:f.a.expire,twins:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.copy)};})()`);
 check('same visit resumes without losing progress or extending time',resumed.kind==='attend'&&resumed.id===resumed.expected&&resumed.progress>=resumed.paid&&resumed.deadline===start.deadline&&resumed.twins,resumed);
 const text=await shot('resumed-feast');check('inspector shows resumed participation',text.includes('At the feast'),text.slice(0,1000));
 const end=await b.evaluate(`(()=>{const f=window.__resume,endings=[];f.w.hooks={onActivityEnd:(_p,a,result,detail)=>{if(a.id===f.a.id)endings.push({result,detail,progress:a.progress,duration:a.duration});}};for(let n=0;n<500&&!endings.length;n++){f.stepWorld(f.w);f.stepWorld(f.copy);}delete f.w.hooks;return {endings,admissions:f.o.attended.filter(id=>id===f.p.id).length,twins:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.copy),reload:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.save.deserializeWorld(f.save.serializeWorld(f.w))),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('resumed visit completes once with exact saved continuation and accounting',end.endings.length===1&&end.endings[0].result==='success'&&end.admissions===1&&end.twins&&end.reload&&end.conserved,end);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(join(out,'report.json'),JSON.stringify({scene:'Staged familiar neighbour and supplied guest. Offered accepted chat, saved pause, real resumption and completion; no ordinary benefit claim.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
