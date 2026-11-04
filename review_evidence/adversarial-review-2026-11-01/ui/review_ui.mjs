// Review-only browser inspection of the real page: an ORDINARY Normal forest world at current rules, run in the page,
// then three people inspected through the real inspector. Dumps panel text, view-models, purity results and screenshots.
// Nothing in the repository is modified. Output: this script's directory.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'file:///C:/dev/Claude%20Experiment/living-world-integrate/scripts/browser/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out-' + Date.now());
mkdirSync(out, { recursive: true });
const url = process.argv[2] ?? 'http://127.0.0.1:5299/';
const seed = process.argv[3] ?? 'forest';
const ticks = Number(process.argv[4] ?? 4800);
const b = await launch({ port: 9377, width: 1600, height: 1000 });
const log = [];
const note = (k, v) => { log.push({ k, v }); console.log(k, typeof v === 'string' ? v.slice(0, 300) : JSON.stringify(v).slice(0, 300)); };
try {
  await b.send('Page.navigate', { url });
  for (let n = 0; n < 100 && !(await b.evaluate('!!window.__game && !!window.__ui')); n++) await b.sleep(100);
  const t0 = Date.now();
  const made = await b.evaluate(`(async()=>{
    const {createWorld}=await import('/src/sim/factory.ts');
    const {currentWorldSettings}=await import('/src/sim/profiles.ts');
    const save=await import('/src/app/save.ts');
    const {stepWorld,hashWorld}=await import('/src/sim/world.ts');
    const {project}=await import('/src/render/iso.ts');
    const insp=await import('/src/sim/inspect.ts');
    const dec=await import('/src/sim/decision.ts');
    const eco=await import('/src/sim/economy.ts');
    const w=createWorld(currentWorldSettings('normal','${seed}',{immigration:false}));
    eco.snapshotInitial(w);
    for(let n=0;n<${ticks};n++)stepWorld(w);
    window.__rv={w,save,stepWorld,hashWorld,project,insp,dec,eco};
    const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);
    const alive=w.persons.filter(p=>p.alive);
    return {tick:w.tick,alive:alive.length,dead:w.persons.length-alive.length,rules:w.settings.rulesVersion,
      buildings:w.buildings.map(b=>b.type).reduce((m,t)=>(m[t]=(m[t]??0)+1,m),{}),
      sites:w.sites.map(s=>s.type),carts:w.carts.length,tools:w.tools.length,
      intentions:alive.flatMap(p=>p.intentions.filter(i=>i.status==='active').map(i=>({who:p.name,kind:i.kind,goal:i.goal,step:i.step,blocked:i.blocked,setAside:i.setAside}))),
      requests:w.requests.filter(r=>r.status==='pending'||r.status==='promised').length,
      commitments:alive.flatMap(p=>p.commitments.filter(c=>c.status==='active').map(c=>({who:p.name,kind:c.kind,item:c.item,amount:c.amount,delivered:c.delivered,blocked:c.blocked}))),
      conservation:eco.conservationReport(w).ok,
      needs:alive.map(p=>({name:p.name,id:p.id,hunger:Math.round(p.needs.hunger),thirst:Math.round(p.needs.thirst),warmth:Math.round(p.needs.warmth),energy:Math.round(p.needs.energy),act:p.activity?.kind,phase:p.activity?.phase,inv:p.inv})).sort((a,b)=>Math.min(a.hunger,a.thirst)-Math.min(b.hunger,b.thirst)).slice(0,8)};
  })()`);
  note('world', { ...made, msToBuild: Date.now() - t0 });
  writeFileSync(join(out, 'world.json'), JSON.stringify(made, null, 2));

  // choose three people: a plan holder, the neediest, a promiser
  const picks = await b.evaluate(`(()=>{const {w}=window.__rv;const alive=w.persons.filter(p=>p.alive);
    const planner=alive.find(p=>p.intentions.some(i=>i.status==='active'))??alive[0];
    const neediest=[...alive].sort((a,b)=>Math.min(a.needs.hunger,a.needs.thirst,a.needs.warmth)-Math.min(b.needs.hunger,b.needs.thirst,b.needs.warmth))[0];
    const promiser=alive.find(p=>p.commitments.some(c=>c.status==='active'))??alive.find(p=>w.requests.some(r=>(r.from===p.id)&&(r.status==='pending'||r.status==='promised')))??alive[1];
    return [planner.id,neediest.id,promiser.id];})()`);
  note('picks', picks);

  const inspect = async (id, tag) => {
    const r = await b.evaluate(`(()=>{const {w,save,hashWorld,project,insp}=window.__rv,g=window.__game;const p=w.persons.find(p=>p.id===${id});
      const before=save.serializeWorld(w),h0=hashWorld(w),rng0=JSON.stringify(w.rng.getState());
      g.select(p.id);g.fly=null;const q=project(p.x,p.y);g.camera={x:q.sx+120,y:q.sy,zoom:1.6};window.__ui.update(1);
      for(const d of document.querySelectorAll('.insp-person details'))d.open=true;
      for(const t of document.querySelectorAll('.insp-person .sec-tab'))if(t.getAttribute('aria-expanded')==='false')t.click();
      window.__ui.update(1);
      const text=document.querySelector('.insp-person')?.innerText||'';
      const view=insp.describePerson(w,p.id,{opportunities:true});
      const opps=insp.auditOpportunities(w,p);
      const after=save.serializeWorld(w),h1=hashWorld(w),rng1=JSON.stringify(w.rng.getState());
      let firstDiff=null;if(before!==after){for(let i=0;i<before.length;i++){if(before[i]!==after[i]){firstDiff=before.slice(Math.max(0,i-120),i+200);break;}}}
      return {name:p.name,id:p.id,text,view,opps,pure:before===after,hashSame:h0===h1,rngSame:rng0===rng1,firstDiff,
        raw:{activity:p.activity&&{kind:p.activity.kind,phase:p.activity.phase,goal:p.activity.goal,why:p.activity.data.why,forPlan:p.activity.data.forPlan,blocked:p.activity.blocked},
          intentions:p.intentions,lastDecision:p.lastDecision,commitments:p.commitments.filter(c=>c.status==='active'),inv:p.inv,needs:p.needs,
          concerns:p.concerns,beliefsKnown:Object.keys(p.beliefs).length}};})()`);
    await b.sleep(150);
    await b.shot(join(out, `${tag}-${r.name}.png`));
    writeFileSync(join(out, `${tag}-${r.name}.txt`), r.text);
    writeFileSync(join(out, `${tag}-${r.name}.json`), JSON.stringify(r, null, 2));
    note(`inspect:${tag}:${r.name}`, { pure: r.pure, hashSame: r.hashSame, rngSame: r.rngSame, textLen: r.text.length, firstDiff: r.firstDiff });
    return r;
  };
  const a = await inspect(picks[0], 'A-planner');
  const bN = await inspect(picks[1], 'B-neediest');
  const c = await inspect(picks[2], 'C-promiser');

  // feed text
  const feed = await b.evaluate(`(()=>{const el=document.querySelector('.feed');const btn=document.querySelector('.feed-toggle');if(el&&el.getAttribute('data-open')==='false'&&btn)btn.click();window.__ui.update(1);return document.querySelector('.feed-list')?.innerText||'(no feed list)';})()`);
  writeFileSync(join(out, 'feed.txt'), feed);
  await b.shot(join(out, 'feed.png'));
  note('feed', feed.slice(0, 200));

  // advance half a day and re-inspect the same three, to see whether the panel tells the aftermath
  const adv = await b.evaluate(`(()=>{const {w,stepWorld}=window.__rv;const h=new Set();for(let n=0;n<1200;n++)stepWorld(w);return {tick:w.tick,alive:w.persons.filter(p=>p.alive).length};})()`);
  note('advanced', adv);
  const a2 = await inspect(picks[0], 'A2-planner-later');
  const b2 = await inspect(picks[1], 'B2-neediest-later');
  const c2 = await inspect(picks[2], 'C2-promiser-later');

  // live playback check: let the real clock run at 8x for 3 real seconds and report achieved ticks
  const play = await b.evaluate(`(async()=>{const g=window.__game;const t0=g.world.tick;g.speed=8;g.setPlaying(true);await new Promise(r=>setTimeout(r,3000));g.setPlaying(false);const st=g.playbackStats();return {ticksRan:g.world.tick-t0,stats:st};})()`);
  note('playback', play);
  const errors = b.events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params?.exceptionDetails?.exception?.description ?? e.params?.exceptionDetails?.text);
  note('browserErrors', errors);
  writeFileSync(join(out, 'log.json'), JSON.stringify(log, null, 2));
  console.log('OUT', out);
} finally {
  await b.close();
}
