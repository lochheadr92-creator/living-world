// Staged injury, relationship, supplies and child remaining at the remembered place.
// The actual request/conversation, voluntary answer, travel, watch, transfers and eating all run in the engine.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5286/',out='viewer_evidence/watch56']=process.argv.slice(2);
mkdirSync(out,{recursive:true});const b=await launch({port:9350,width:1440,height:900}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async(name,who)=>{await b.evaluate(`(()=>{const f=window.__watch,p=f.${who},g=window.__game,pt=f.project(p.x,p.y);g.select(p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};window.__ui.update(1);})()`);await b.sleep(250);await b.shot(`${out}/${name}.png`);};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true}));`});
 await b.send('Page.navigate',{url});for(let i=0;i<80&&!await b.evaluate('!!window.__game');i++)await b.sleep(100);
 await b.evaluate(`(async()=>{
  const {practicalCareScene}=await import('/tests/helpers/practical_care.ts'),act=await import('/src/sim/activities.ts'),{generateOptions}=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),{conservationReport}=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts');
  const f=practicalCareScene();Object.assign(f,{act,generateOptions,stepWorld,save,conservationReport,project});window.__watch=f;
  const g=window.__game;g.setPlaying(false);g.restoreWorld(f.w,f.w.settings);return f.w.settings.rulesVersion;
 })()`);
 await shot('before-request','parent');
 const agreed=await b.evaluate(`(()=>{const f=window.__watch;f.before=f.save.serializeWorld(f.w);const unknown=!f.helper.whereabouts[f.child.id];f.req=f.ask();return {unknown,status:f.req?.status,communicated:f.helper.whereabouts[f.child.id],actualChild:{x:f.child.x,y:f.child.y},notes:f.helper.log.filter(l=>l.text.includes('told me where'))};})()`);
 check('accepted conversation communicates an aged location to a helper who did not know it',agreed.unknown&&agreed.status==='promised'&&agreed.communicated?.tick===0&&agreed.notes.length===1,agreed);
 await shot('accepted-request','helper');
 const travel=await b.evaluate(`(()=>{const f=window.__watch,{w,helper,child}=f;helper.cooldowns.pause=0;const before=f.save.serializeWorld(w),o=f.generateOptions(w,helper,true,true).options.find(o=>o.key==='watch:'+child.id);const pure=before===f.save.serializeWorld(w);if(!o)return {offered:false,pure};const start={x:helper.x,y:helper.y};f.act.startActivity(w,helper,o.make());for(let i=0;i<15;i++)f.stepWorld(w);f.copy=f.save.deserializeWorld(f.save.serializeWorld(w));f.c=helper.commitments.find(c=>c.milestone==='watched');f.transfers=[];w.hooks={onTransfer:t=>{if(t.reason==='watched over')f.transfers.push({...t});}};return {offered:true,pure,start,now:{x:helper.x,y:helper.y},phase:helper.activity?.phase};})()`);
 check('offered watch physically travels and option inspection is pure',travel.offered&&travel.pure&&(travel.start.x!==travel.now.x||travel.start.y!==travel.now.y),travel);
 await shot('travelling','helper');
 const finished=await b.evaluate(`(()=>{const f=window.__watch;for(let i=0;i<1400&&f.c.status==='active';i++){f.stepWorld(f.w);f.stepWorld(f.copy);}return {status:f.c.status,request:f.req.status,contribution:f.c.contrib,delivered:f.transfers,childBread:f.child.inv.bread,continued:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.copy),conserved:f.conservationReport(f.w).ok,tick:f.w.tick};})()`);
 check('physical care finishes the time promise, delivers food and survives an intermediate save exactly',finished.status==='done'&&finished.request==='fulfilled'&&finished.contribution===40&&finished.delivered.some(t=>t.item==='bread'&&t.n>0)&&finished.continued&&finished.conserved,finished);
 await shot('watch-completed','helper');
 const eaten=await b.evaluate(`(()=>{const f=window.__watch,{w,child}=f,o=f.generateOptions(w,child,true,true).options.find(o=>o.kind==='eat'),before=child.needs.hunger;if(!o)return {offered:false};f.act.startActivity(w,child,o.make());for(let i=0;i<120&&child.activity?.kind==='eat';i++)f.stepWorld(w);return {offered:true,before,after:child.needs.hunger,conserved:f.conservationReport(w).ok};})()`);
 check('the child eats physically delivered bread',eaten.offered&&eaten.after>eaten.before+5&&eaten.conserved,eaten);
 await shot('child-eaten','child');
 const pure=await b.evaluate(`(()=>{const f=window.__watch,g=window.__game,before=f.save.serializeWorld(f.w);g.setViewer({speech:'hidden'});window.__ui.update(1);g.setViewer({speech:'automatic'});window.__ui.update(1);return before===f.save.serializeWorld(f.w);})()`);
 check('viewer mode changes and inspectors preserve complete world state',pure,pure);
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['scripts/browser/practical_watch_check.mjs','tests/helpers/practical_care.ts','src/sim/responsibilities.ts','src/sim/welfare.ts','src/sim/options_work.ts','src/sim/social.ts','src/sim/inspect.ts','src/ui/person.ts'];
 writeFileSync(`${out}/report.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:56,sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),evidence:'STAGED prerequisites and explicit selections of offered request, watch and eat actions. Recipient remaining in place is staged. No claim of ordinary selection, sustained childcare coverage, full injury recovery or aggregate benefit.',checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
