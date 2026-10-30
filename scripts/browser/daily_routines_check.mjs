import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/routine70-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-routine-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9367/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port already in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,scroll=false)=>{await b.evaluate(`(()=>{const f=window.__routine,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2.3};window.__ui.update(1);${scroll?"document.querySelector('.daily-routines')?.scrollIntoView({block:'center'});":"document.querySelector('.q-doing')?.scrollIntoView({block:'start'});"}})()`);await b.sleep(200);await b.shot(out+'/'+name+'.png');};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true,traits:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const learned=await b.evaluate(`(async()=>{
  const {dailyRoutineScene}=await import('/tests/helpers/daily_routine.ts'),econ=await import('/src/sim/economy.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),decision=await import('/src/sim/decision.ts');
  const f=dailyRoutineScene();Object.assign(f,{econ,save,stepWorld,project,...decision});window.__routine=f;for(let day=0;day<3;day++)f.practice(day);
  window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return {entries:f.p.dailyRoutines.entries,wood:f.p.inv.wood,remaining:f.a.amount,conserved:econ.conservationReport(f.w).ok};
 })()`);
 check('three physical trips on separate staged mornings earn personal evidence',learned.entries.some(e=>e.episodes.length===3)&&learned.remaining<6&&learned.conserved,learned);await shot('learned-history',true);
 const history=await b.evaluate(`document.querySelector('.daily-routines')?.textContent||''`);check('inspector exposes activity IDs, timestamps and the bounded preference',history.includes('3 successful days')&&history.includes('activity #')&&history.includes('tick'),history);
 const choice=await b.evaluate(`(()=>{const f=window.__routine;f.econ.consume(f.w,f.p.inv,'wood',f.p.inv.wood??0,'staged use after practice');f.p.x=40;f.p.y=40;const record=f.p.dailyRoutines;let before,after,found=false;for(let offset=0;offset<480;offset+=32){f.w.tick=7200+offset;delete f.p.dailyRoutines;before=f.rankOptions(f.generateOptions(f.w,f.p,true,true));f.p.dailyRoutines=record;after=f.rankOptions(f.generateOptions(f.w,f.p,true,true));if(before[0]?.key!==f.key&&after[0]?.key===f.key){found=true;break;}}const saved=f.save.serializeWorld(f.w);window.__ui.update(1);const pure=saved===f.save.serializeWorld(f.w);f.p.nextThink=f.w.tick;f.control=f.save.deserializeWorld(f.save.serializeWorld(f.w));const q=f.control.persons.find(p=>p.id===f.p.id);delete q.dailyRoutines;f.twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));f.stepWorld(f.w);f.stepWorld(f.control);f.stepWorld(f.twin);return {found,pure,before:before?.[0]?.key,after:after?.[0]?.key,target:f.p.activity?.targetId,control:q.activity?.targetId,learnedTarget:f.a.id,because:f.p.lastDecision?.because};})()`);
 check('earned preference changes an otherwise matched autonomous legal choice',choice.found&&choice.pure&&choice.target===choice.learnedTarget&&choice.control!==choice.target&&choice.because.includes('learned morning preference'),choice);await shot('learned-choice');
 const worked=await b.evaluate(`(()=>{const f=window.__routine,act=f.p.activity;for(let n=0;n<700&&f.p.activity?.id===act.id;n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {result:f.p.lastResult,wood:f.p.inv.wood,equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('chosen trip produces wood with exact continuation and accounting',worked.result?.outcome==='success'&&worked.wood>=1&&worked.equal&&worked.conserved,worked);await shot('completed-trip');
 const changed=await b.evaluate(`(()=>{const f=window.__routine;f.p.injury={kind:'sprain',since:f.w.tick,until:f.w.tick+2400,how:'staged changed context'};f.stepWorld(f.w);const before=f.save.serializeWorld(f.w),ranked=f.rankOptions(f.generateOptions(f.w,f.p,true,true));window.__ui.update(1);return {reason:document.querySelector('.daily-routines')?.textContent,offers:ranked.map(o=>o.routineReason).filter(Boolean),pure:before===f.save.serializeWorld(f.w)};})()`);
 check('new injury suppresses the preference with an inspectable reason',changed.reason.includes('health or injury changed')&&changed.offers.length===0&&changed.pure,changed);await shot('changed-context',true);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/daily_routines.ts','src/sim/activities.ts','src/sim/decision.ts','src/sim/inspect.ts','src/ui/person_sections.ts','tests/helpers/daily_routine.ts','scripts/browser/daily_routines_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({rules:70,evidence:'STAGED supplies, separate morning clocks, refreshed personal needs/positions and explicit selection of three legal practice trips. Each trip physically completes and preserves saves/accounting. A later otherwise matched autonomous choice differs only by earned routine state. Injury is staged. No ordinary time-budget or welfare claim.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
