// Staged physical contract in the real page. The fixture supplies a home and fatigue;
// the simulation chooses sleep, routes to its door, enters, and exits for outside work.
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = process.argv[2] ?? 'http://127.0.0.1:5186/';
const out = process.argv[3] ?? 'habitation_evidence';
mkdirSync(out, { recursive: true });
const browser = await launch({ port: 9346 });
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail) : ''));
}
const ev = browser.evaluate;
try {
  await browser.send('Page.navigate', { url });
  await browser.sleep(1400);
  const initial = await ev(`(async () => {
    const { testKit } = await import('/src/sim/scenes.ts');
    const { defaultSettings } = await import('/src/sim/factory.ts');
    const { RNG } = await import('/src/sim/rng.ts');
    const { createBuilding } = await import('/src/sim/buildings.ts');
    const { observe } = await import('/src/sim/knowledge.ts');
    const { CURRENT_RULES_VERSION } = await import('/src/sim/rulesversion.ts');
    const w = testKit.flatWorld({...defaultSettings('habitation-browser'), dynamics:'rich', rulesVersion: CURRENT_RULES_VERSION, immigration:false});
    const p = testKit.addPerson(w, new RNG(32), {name:'Ada', x:36.5, y:42.5, hunger:95, thirst:95, energy:10, age:25});
    const b = createBuilding(w, 'hut',40,40,p.hhId);
    w.households.find(h=>h.id===p.hhId).homeId=b.id;
    testKit.finish(w,'natural');
    observe(w,p,b);
    window.__hab = {who:p.id,home:b.id};
    const g=window.__game; g.setPlaying(false); g.restoreWorld(w,w.settings); g.select(p.id); g.flyTo(40.5,41.5);
    return {who:p.id,home:b.id,indoors:p.indoors??null,version:w.settings.rulesVersion};
  })()`);
  check('starts outdoors in current rules', initial.indoors === null, initial);
  const arrival = await ev(`(async () => {
    const {stepWorld}=await import('/src/sim/world.ts');
    const w=window.__game.world, p=w.byId.get(window.__hab.who);
    for(let i=0;i<600&&!p.indoors;i++) stepWorld(w);
    return {tick:w.tick, indoors:p.indoors??null, activity:p.activity?.kind, phase:p.activity?.phase,x:p.x,y:p.y};
  })()`);
  check('chooses sleep, reaches entrance and enters', arrival.indoors === initial.home && arrival.activity === 'sleep' && arrival.phase === 'work', arrival);
  await browser.sleep(500);
  const card = await ev(`document.querySelector('.q-doing')?.textContent ?? ''`);
  check('person card reports the actual indoor location', card.includes('Inside Hut'), card);
  await browser.shot(out + '/person-inside.png');
  await ev(`window.__game.select(window.__hab.home)`);
  await browser.sleep(400);
  const homeCard = await ev(`document.querySelector('.insp-entity')?.textContent ?? ''`);
  check('home inspector lists its occupant', homeCard.includes('Ada') && homeCard.includes('Indoors'), homeCard.slice(0,500));
  await browser.shot(out + '/home-occupants.png');
  await ev(`document.querySelector('.home-occupants button')?.click()`);
  check('occupant chip selects the person', await ev(`window.__game.selectedId===window.__hab.who`));
  const saved = await ev(`(async () => {
    const {serializeWorld,deserializeWorld}=await import('/src/app/save.ts');
    const {stepWorld,hashWorld}=await import('/src/sim/world.ts');
    const g=window.__game, text=serializeWorld(g.world), before=hashWorld(g.world);
    const w=deserializeWorld(text);
    const equal=serializeWorld(w)===text, indoors=w.byId.get(window.__hab.who).indoors;
    g.restoreWorld(w,w.settings); g.setPlaying(false);
    for(let i=0;i<30;i++)stepWorld(w);
    return {equal,indoors,before,after:hashWorld(w),tick:w.tick};
  })()`);
  check('save/load keeps indoor state and continues', saved.equal && saved.indoors === initial.home, saved);
  const protection = await ev(`(async () => {
    const {shelterAt}=await import('/src/sim/needs.ts');
    const {safeFromWolf}=await import('/src/sim/wildlife.ts');
    const {leaveHome,enterHome}=await import('/src/sim/habitation.ts');
    const w=window.__game.world,p=w.byId.get(window.__hab.who),b=w.byId.get(window.__hab.home);
    const inside={cover:shelterAt(w,p.x,p.y,p).cover,safe:safeFromWolf(w,p)};
    leaveHome(w,p);
    const outside={cover:shelterAt(w,p.x,p.y,p).cover,safe:safeFromWolf(w,p)};
    enterHome(w,p,b);
    return {inside,outside};
  })()`);
  check('the same doorstep is protected only when actually indoors', protection.inside.cover===1 && protection.inside.safe && protection.outside.cover===0 && !protection.outside.safe, protection);
  const exit = await ev(`(async () => {
    const {newActivity,startActivity,stepActivity}=await import('/src/sim/activities.ts');
    const w=window.__game.world,p=w.byId.get(window.__hab.who);
    p.needs.energy=95; stepActivity(w,p); // ordinary sleep completion
    const awake=p.activity===null;
    startActivity(w,p,newActivity(w,p,{kind:'search',label:'Looking outside',goal:'look around',spotX:37.5,spotY:43.5,maxTicks:500}));
    for(let i=0;i<150;i++){w.tick++;stepActivity(w,p);}
    window.__game.select(p.id);
    return {awake,indoors:p.indoors??null,x:p.x,y:p.y,result:p.lastResult};
  })()`);
  check('wakes, exits and executes an outside activity', exit.awake && exit.indoors===null && exit.x < 40, exit);
  await browser.sleep(400);
  await browser.shot(out + '/outside-again.png');
  const natural = await ev(`(async () => {
    const {stepWorld}=await import('/src/sim/world.ts');
    const g=window.__game; g.restart({seed:'river',immigration:false}); g.setPlaying(false);
    const w=g.world; let subject;
    while(w.tick<7200) {
      stepWorld(w);
      subject=w.persons.find(p=>p.alive&&p.indoors);
      if(subject)break;
    }
    if(!subject)return null;
    const home=w.byId.get(subject.indoors);
    g.select(home.id); g.flyTo(home.x+home.w/2,home.y+home.h/2);
    return {tick:w.tick,name:subject.name,person:subject.id,home:home.id,builtTick:home.builtTick,activity:subject.activity?.kind};
  })()`);
  check('an autonomous inhabitant uses a home in an ordinary world', natural?.activity==='sleep', natural);
  await browser.sleep(500);
  await browser.shot(out + '/autonomous-home.png');
  check('no uncaught page errors', !browser.events.some(e=>e.method==='Runtime.exceptionThrown'));
} finally {
  writeFileSync(out+'/report.json', JSON.stringify(results,null,2)+'\n');
  await browser.close();
}
if(results.some(r=>!r.pass)) process.exitCode=1;
