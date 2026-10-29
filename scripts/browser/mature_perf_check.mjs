// Paused real saved worlds: frame submission, overlays and UI measured separately from simulation.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5286/',out='viewer_evidence/performance']=process.argv.slice(2);
const b=await launch({port:9348,width:1440,height:900}),results=[];
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {count:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],max:s.at(-1)};};
try {
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({feedOpen:true,inspectorOpen:true,overlays:{labels:true,intentions:true}}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true}));`});
  await b.send('Page.navigate',{url});
  for(let i=0;i<100&&!await b.evaluate('!!window.__game');i++)await b.sleep(100);
  await b.send('Performance.enable');
  for(const name of ['normal-new','large-new','normal-day45','staged-speech-crowd']) {
    const save=readFileSync(name==='staged-speech-crowd'?'viewer_evidence/after/fixture.json':`${out}/${name}-save.json`,'utf8');
    const setup=await b.evaluate(`(async()=>{const {deserializeWorld,serializeWorld}=await import('/src/app/save.ts');const {project}=await import('/src/render/iso.ts');const g=window.__game,w=deserializeWorld(${JSON.stringify(save)});g.setPlaying(false);g.restoreWorld(w,w.settings);g.select(w.persons.find(p=>p.alive).id);g.setFollow(true);const p=w.persons.find(p=>p.id===g.selectedId),pt=project(p.x,p.y);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.2};window.__perfOriginal=serializeWorld(w);window.__ui.update(1);return {tick:w.tick,rules:w.settings.rulesVersion,alive:w.persons.filter(p=>p.alive).length};})()`);
    await b.sleep(300);
    const samples=await b.evaluate(`(async()=>{const r=window.__renderer,g=window.__game,frame=[],overlay=[],ui=[],raf=[];let last=performance.now();for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>=30){raf.push(now-last);frame.push(r.lastFrameMs);overlay.push(r.lastOverlayMs);}last=now;}for(let i=0;i<60;i++){const t=performance.now();window.__ui.update(1);ui.push(performance.now()-t);}const {serializeWorld}=await import('/src/app/save.ts');return {frame,overlay,ui,raf,pure:serializeWorld(g.world)===window.__perfOriginal,visibleSpeech:r.lastOverlayLayout.filter(x=>x.type==='speech').length};})()`);
    // A separate GC observation avoids presenting transient allocation as retained page memory.
    await b.send('HeapProfiler.collectGarbage');
    const metrics=(await b.send('Performance.getMetrics')).metrics;
    results.push({name,...setup,pure:samples.pure,visibleSpeech:samples.visibleSpeech,frameSubmissionMs:stats(samples.frame),overlayLayoutMs:stats(samples.overlay),forcedUIRefreshMs:stats(samples.ui),rafIntervalMs:stats(samples.raf),heapUsedBytes:metrics.find(m=>m.name==='JSHeapUsedSize')?.value});
    await b.shot(`${out}/${name}.png`);
    console.log(JSON.stringify(results.at(-1)));
  }
  const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');
  const sourceHashes=Object.fromEntries(['scripts/browser/mature_perf_check.mjs','src/render/renderer.ts','src/render/speech_layout.ts','src/ui/index.ts'].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
  writeFileSync(`${out}/browser.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,browser:await b.send('Browser.getVersion'),viewport:{width:1440,height:900,dpr:1},
    method:'Observe 180 paused normal app rAF iterations; discard 30 warmups. Read existing renderer CPU timers without drawing an extra frame. Afterwards separately time 60 forced UI refreshes. Frame submission is CPU cost, not GPU completion. Staged speech crowd reuses the labelled acceptance fixture; other states are unmodified saves.',results,errors},null,2));
  if(errors.length||results.some(r=>!r.pure))process.exitCode=1;
}finally{await b.close();}
