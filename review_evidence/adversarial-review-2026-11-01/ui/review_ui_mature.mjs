// Review-only: load the retained rules-109 day-45 Large save in the real page and inspect mature people through the UI.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'file:///C:/dev/Claude%20Experiment/living-world-integrate/scripts/browser/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'mature-' + Date.now());
mkdirSync(out, { recursive: true });
const url = process.argv[2] ?? 'http://127.0.0.1:5299/';
const b = await launch({ port: 9378, width: 1600, height: 1000 });
const log = [];
const note = (k, v) => { log.push({ k, v }); console.log(k, typeof v === 'string' ? v.slice(0, 300) : JSON.stringify(v).slice(0, 400)); };
try {
  await b.send('Page.navigate', { url });
  for (let n = 0; n < 100 && !(await b.evaluate('!!window.__game && !!window.__ui')); n++) await b.sleep(100);
  const loaded = await b.evaluate(`(async()=>{
    const save=await import('/src/app/save.ts');const {stepWorld,hashWorld}=await import('/src/sim/world.ts');const {project}=await import('/src/render/iso.ts');const insp=await import('/src/sim/inspect.ts');
    const t0=performance.now();const text=await (await fetch('/review_tmp/mature109.json')).text();const tf=performance.now();
    const w=save.deserializeWorld(text);const tl=performance.now();
    window.__rv={w,save,stepWorld,hashWorld,project,insp};
    const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);
    const alive=w.persons.filter(p=>p.alive);
    return {fetchMs:tf-t0,loadMs:tl-tf,tick:w.tick,alive:alive.length,rules:w.settings.rulesVersion,buildings:w.buildings.map(b=>b.type).reduce((m,t)=>(m[t]=(m[t]??0)+1,m),{}),carts:w.carts.length};
  })()`);
  note('loaded', loaded);
  const picks = await b.evaluate(`(()=>{const {w}=window.__rv;const alive=w.persons.filter(p=>p.alive);
    const mostRel=[...alive].sort((a,b)=>Object.keys(b.relations).length-Object.keys(a.relations).length)[0];
    const planner=alive.find(p=>p.intentions.some(i=>i.status==='active'&&i.kind==='batch'))??alive.find(p=>p.intentions.some(i=>i.status==='active'))??alive[1];
    const promiser=alive.find(p=>p.commitments.some(c=>c.status==='active'))??alive[2];
    return [mostRel.id,planner.id,promiser.id];})()`);
  note('picks', picks);
  const inspect = async (id, tag) => {
    const r = await b.evaluate(`(()=>{const {w,save,hashWorld,project,insp}=window.__rv,g=window.__game;const p=w.persons.find(p=>p.id===${id});
      const before=save.serializeWorld(w),h0=hashWorld(w);
      const t0=performance.now();g.select(p.id);g.fly=null;const q=project(p.x,p.y);g.camera={x:q.sx+120,y:q.sy,zoom:1.6};window.__ui.update(1);const t1=performance.now();
      for(const d of document.querySelectorAll('.insp-person details'))d.open=true;
      for(const t of document.querySelectorAll('.insp-person .sec-tab'))if(t.getAttribute('aria-expanded')==='false')t.click();
      const t2=performance.now();window.__ui.update(1);const t3=performance.now();
      const text=document.querySelector('.insp-person')?.innerText||'';
      const after=save.serializeWorld(w),h1=hashWorld(w);
      return {name:p.name,id:p.id,textLen:text.length,text,selectUpdateMs:t1-t0,fullUpdateMs:t3-t2,pure:before===after,hashSame:h0===h1,relations:Object.keys(p.relations).length,intentions:p.intentions.filter(i=>i.status==='active').map(i=>({kind:i.kind,goal:i.goal,step:i.step,blocked:i.blocked,since:i.since,until:i.until})),commitments:p.commitments.filter(c=>c.status==='active').length,age:Math.floor((w.tick-p.birthTick)/28800)};})()`);
    await b.sleep(150);
    await b.shot(join(out, `${tag}-${r.name}.png`));
    writeFileSync(join(out, `${tag}-${r.name}.txt`), r.text);
    const { text, ...rest } = r; writeFileSync(join(out, `${tag}-${r.name}.json`), JSON.stringify(rest, null, 2));
    note(`inspect:${tag}:${r.name}`, rest);
    return r;
  };
  await inspect(picks[0], 'M-mostRelations');
  await inspect(picks[1], 'M-planner');
  await inspect(picks[2], 'M-promiser');
  const play = await b.evaluate(`(async()=>{const g=window.__game;const t0=g.world.tick;const f0=performance.now();g.speed=1;g.setPlaying(true);await new Promise(r=>setTimeout(r,4000));g.setPlaying(false);const st=g.playbackStats();return {ticksRan:g.world.tick-t0,wallMs:performance.now()-f0,stats:st};})()`);
  note('playback1x', play);
  const play8 = await b.evaluate(`(async()=>{const g=window.__game;const t0=g.world.tick;g.speed=8;g.setPlaying(true);await new Promise(r=>setTimeout(r,4000));g.setPlaying(false);const st=g.playbackStats();return {ticksRan:g.world.tick-t0,stats:st};})()`);
  note('playback8x', play8);
  await b.shot(join(out, 'overview.png'));
  const errors = b.events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params?.exceptionDetails?.exception?.description ?? e.params?.exceptionDetails?.text);
  note('browserErrors', errors);
  writeFileSync(join(out, 'log.json'), JSON.stringify(log, null, 2));
  console.log('OUT', out);
} finally {
  await b.close();
}
