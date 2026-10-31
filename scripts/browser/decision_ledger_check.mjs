import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5290/',out='autonomy_evidence/ledger103-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-ledger-'+randomUUID()));if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9373/json/version');occupied=true;}catch{}if(occupied)throw new Error('Browser port in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9373,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 await b.evaluate(`(async()=>{const {createWorld}=await import('/src/sim/factory.ts'),{currentWorldSettings}=await import('/src/sim/profiles.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),{describePerson}=await import('/src/sim/inspect.ts');const w=createWorld(currentWorldSettings('normal','river',{immigration:false}));for(let n=0;n<900;n++)stepWorld(w);const f={w,save,stepWorld,project,describePerson};window.__ledger=f;const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);})()`);
 const picked=await b.evaluate(`(()=>{const f=window.__ledger;const p=[...f.w.persons].filter(p=>p.alive&&p.decisions?.some(e=>e.outcome)).sort((a,b)=>(b.decisionsDropped??0)-(a.decisionsDropped??0))[0];f.p=p;return {name:p.name,entries:p.decisions.length,closed:p.decisions.filter(e=>e.outcome).length,dropped:p.decisionsDropped,sample:p.decisions.slice(-2)};})()`);
 check('an ordinary river person at rules 103 carries a bounded ledger with closed entries and a compaction count',picked.entries<=8&&picked.closed>=1&&picked.dropped>0,picked);
 const shown=await b.evaluate(`(()=>{const f=window.__ledger,g=window.__game;const before=f.save.serializeWorld(f.w);g.select(f.p.id);g.fly=null;const q=f.project(f.p.x,f.p.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);for(const d of document.querySelectorAll('.insp-person details.decision-history'))d.open=true;window.__ui.update(1);const text=document.querySelector('.insp-person details.decision-history')?.innerText||'';return {text,pure:before===f.save.serializeWorld(f.w),view:f.describePerson(f.w,f.p.id).decisionHistory};})()`);
 await b.sleep(200);await b.shot(join(out,'recent-decisions.png'));
 check('the Recent decisions panel shows choices with endings, what was passed over and what was set aside; inspection leaves the state unchanged',/Recent decisions/.test(shown.text)&&/chose “.+”; ended (success|failed|interrupted|partial) at tick \d+/.test(shown.text)&&/Passed over then:/.test(shown.text)&&/Set aside then:/.test(shown.text)&&/compacted/.test(shown.text)&&shown.pure&&shown.view.length>=2,{excerpt:shown.text.slice(0,700),pure:shown.pure});
 const reloaded=await b.evaluate(`(()=>{const f=window.__ledger;const text=f.save.serializeWorld(f.w);const w2=f.save.deserializeWorld(text);const same=f.save.serializeWorld(w2)===text;const p2=w2.persons.find(p=>p.id===f.p.id);return {same,entries:p2.decisions.length,history:f.describePerson(w2,p2.id).decisionHistory[0]};})()`);
 check('the ledger reloads exactly and reads the same from the loaded world',reloaded.same&&reloaded.entries===picked.entries&&reloaded.history===shown.view[0],reloaded);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:103,evidence:'ORDINARY river world (no staging) run 900 ticks in the page; the person shown is the one with the most compacted decisions. Panel text is the inspector view of recorded state.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
