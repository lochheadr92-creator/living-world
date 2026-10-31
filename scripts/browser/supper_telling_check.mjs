import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5290/',out='autonomy_evidence/supper104-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-supper-'+randomUUID()));if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9374/json/version');occupied=true;}catch{}if(occupied)throw new Error('Browser port in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9374,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,who)=>{await b.evaluate(`(()=>{const f=window.__supper,g=window.__game;const e=f.${who};g.select(e.id);g.fly=null;const q=f.project(e.x,e.y);g.camera={x:q.sx+100,y:q.sy,zoom:1.8};window.__ui.update(1);for(const d of document.querySelectorAll('.insp-person details.relationship-history'))d.open=true;window.__ui.update(1);})()`);await b.sleep(200);await b.shot(join(out,name+'.png'));return b.evaluate("document.querySelector('.insp-person')?.innerText||''");};
try{
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 await b.evaluate(`(async()=>{const {supperFixture}=await import('/tests/helpers/household_practices.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),{DAY}=await import('/src/sim/constants.ts');const f=supperFixture(104);const m=f.begin();const i={id:f.w.nextId++,kind:'stock',goal:'put 12 units of food by for the household',since:f.w.tick,until:f.w.tick+DAY*3,status:'active',reason:'declared staged reserve plan',setAside:0,aboutId:f.pantry.id,wants:{},makes:'',sheltered:0,worked:3,ended:0,reserve:12,cue:'season',step:'',stepKind:'none',stepTarget:0,stepItem:null,stepKey:null,blocked:''};f.a.intentions.push(i);Object.assign(f,{m,i,save,stepWorld,project});window.__supper=f;const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);})()`);
 const told=await b.evaluate(`(()=>{const f=window.__supper;for(let n=0;n<1500&&!(f.b.relations[f.a.id]?.workHeard?.length);n++)f.stepWorld(f.w);const k=f.b.relations[f.a.id]?.workHeard?.[0];return {tick:f.w.tick,status:f.m.status,ticks:f.m.supperContact?.guests[f.b.id]?.ticks,heard:k,speech:f.a.speech?.text,dist:Math.hypot(f.a.x-f.b.x,f.a.y-f.b.y)};})()`);
 check('at the shared supper, after real time at the table, the host tells the guest what she is working on, with the meal id',told.heard?.via==='meal'&&told.ticks>=20&&told.status==='eating'&&/working to put 12 units/.test(told.speech??''),told);
 const text=await shot('told-at-supper','a');check('the table scene shows the host at the meal with the undertaking spoken',/Hosting|meal|supper/i.test(text),text.slice(0,300));
 const guestText=await shot('guest-heard-at-supper','b');check("the guest's relationship history records it as heard at supper, information not a promise",/at supper #\d+/.test(guestText)&&/No takeover was promised/.test(guestText),guestText.slice(guestText.indexOf('Heard'),guestText.indexOf('Heard')+300));
 const after=await b.evaluate(`(()=>{const f=window.__supper;for(let n=0;n<1500&&f.m.status!=='done'&&f.m.status!=='cancelled';n++)f.stepWorld(f.w);const text=f.save.serializeWorld(f.w);return {status:f.m.status,ate:f.m.ate,valid:f.save.serializeWorld(f.save.deserializeWorld(text))===text};})()`);
 check('the meal finishes as before and the world reloads exactly',after.status==='done'&&after.ate.length===2&&after.valid,after);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 writeFileSync(out+'/report.json',JSON.stringify({rules:104,evidence:'STAGED family supper fixture (rules-24 practice scene built at 104) with a declared reserve plan; invitation, hosting, attendance and eating are the offered options the fixture selects; the telling is autonomous. No ordinary frequency claim.',checks},null,2));if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
