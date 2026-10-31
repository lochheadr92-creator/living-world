import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5292/',out='autonomy_evidence/occasion111-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-occasion-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9375/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port in use');mkdirSync(out,{recursive:true});
const b=await launch({port:9375,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{
 const before=await b.evaluate('window.__occasion.save.serializeWorld(window.__occasion.w)');
 await b.evaluate(`(()=>{const f=window.__occasion,g=window.__game;g.select(f.p.id);g.fly=null;const q=f.project(f.p.x,f.p.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);})()`);
 await b.sleep(200);await b.shot(join(out,name+'.png'));
 check(name+' inspection is pure',before===await b.evaluate('window.__occasion.save.serializeWorld(window.__occasion.w)'));
 return b.evaluate("document.querySelector('.insp-person')?.innerText||''");
};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const start=await b.evaluate(`(async()=>{
 const {occasionParticipationScene}=await import('/tests/helpers/occasion_participation.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),econ=await import('/src/sim/economy.ts');
 const f=occasionParticipationScene();for(let i=0;i<30;i++)stepWorld(f.w);const copy=save.deserializeWorld(save.serializeWorld(f.w));window.__occasion={...f,copy,save,stepWorld,project,econ};window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);
 return {kind:f.p.activity?.kind,progress:f.p.activity?.progress,duration:f.a.duration,admitted:f.o.attended.includes(f.p.id),rules:f.w.settings.rulesVersion};})()`);
 check('physically admitted guest remains participating',start.kind==='attend'&&start.progress>0&&start.admitted,start);
 const text=await shot('participating-at-feast');check('inspector describes ongoing feast',text.includes('feast'),text.slice(0,1200));
 const end=await b.evaluate(`(()=>{const f=window.__occasion,endings=[];f.w.hooks={onActivityEnd:(_p,a,result,detail)=>{if(a.id===f.a.id)endings.push({result,detail,progress:a.progress,duration:a.duration});}};for(let i=0;i<500&&f.p.activity?.id===f.a.id;i++){f.stepWorld(f.w);f.stepWorld(f.copy);}delete f.w.hooks;return {endings,admissions:f.o.attended.filter(id=>id===f.p.id).length,twins:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.copy),reload:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.save.deserializeWorld(f.save.serializeWorld(f.w))),conserved:f.econ.conservationReport(f.w).ok,tick:f.w.tick};})()`);
 check('bounded participation finishes successfully',end.endings.length===1&&end.endings[0].result==='success'&&end.endings[0].progress>=end.endings[0].duration,end);
 check('one admission, exact saved continuation and conserved items',end.admissions===1&&end.twins&&end.reload&&end.conserved,end);
 await shot('finished-feast');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(join(out,'report.json'),JSON.stringify({scene:'Staged supplied adult physically admitted via an offered engine action. No ordinary-household benefit claim.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
