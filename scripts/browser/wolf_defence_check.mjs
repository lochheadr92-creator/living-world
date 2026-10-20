// Real-page staged defence. Starting equipment is explicit; no outcome is forced.
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = process.argv[2] ?? 'http://127.0.0.1:5187/';
const out = process.argv[3] ?? 'integration_evidence/defence';
mkdirSync(out, { recursive: true });
const browser = await launch({ port: 9347 });
const results = [];
const check = (name, pass, detail) => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail ?? '')}`); };
try {
  await browser.send('Page.navigate', { url });
  await browser.sleep(1400);
  const initial = await browser.evaluate(`(async () => {
    const {testKit}=await import('/src/sim/scenes.ts');
    const {currentWorldSettings}=await import('/src/sim/profiles.ts');
    const {RNG}=await import('/src/sim/rng.ts');
    const {makeWolf}=await import('/src/sim/wildlife.ts');
    const {mintTool}=await import('/src/sim/tools.ts');
    const {perceive}=await import('/src/sim/perception.ts');
    const {decide}=await import('/src/sim/decision.ts');
    const {defProbe,defReset}=await import('/src/sim/defence.ts');
    const w=testKit.flatWorld(currentWorldSettings('normal','wolf-browser',{immigration:false}));
    const p=testKit.addPerson(w,new RNG(71),{name:'Ada',x:40.5,y:40.5,age:25,hunger:95,thirst:95,energy:95,traits:{caution:0.1}});
    const wolf=makeWolf(w,43.5,40.5);wolf.state='stalk';wolf.targetId=p.id;wolf.until=9999;
    mintTool(w,'spear',0,p.hhId,p.id,p.inv,p.id,'staged starting equipment',false);
    testKit.finish(w,'natural');w.tick=1000;perceive(w,p);defProbe.on=true;defReset();decide(w,p,'wolf seen');
    const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.select(p.id);g.flyTo(p.x,p.y);
    window.__def={who:p.id,wolf:wolf.id};
    return {activity:p.activity?.kind,why:p.lastDecision?.because,version:w.settings.rulesVersion};
  })()`);
  check('ordinary decision chooses active defence', initial.activity === 'defend', initial);
  await browser.sleep(400);
  const card = await browser.evaluate(`document.querySelector('.q-doing')?.textContent ?? ''`);
  check('inspector names the defence', /Driving a wolf|Drive the wolf/.test(card), card.slice(0, 650));
  await browser.shot(out + '/defending.png');
  const outcome = await browser.evaluate(`(async () => {
    const {stepWorld}=await import('/src/sim/world.ts');
    const {serializeWorld,deserializeWorld}=await import('/src/app/save.ts');
    const {defSnapshot}=await import('/src/sim/defence.ts');
    const {toolOf}=await import('/src/sim/tools.ts');
    const g=window.__game,w=g.world,p=w.byId.get(window.__def.who);
    for(let i=0;i<120;i++){stepWorld(w);if(defSnapshot().attempts)break;}
    const text=serializeWorld(w),loaded=deserializeWorld(text);
    const wolf=w.byId.get(window.__def.wolf);
    return {counters:defSnapshot(),health:p.health,wear:toolOf(w,p,'spear')?.wear,wolfState:wolf.state,result:p.lastResult,saveEqual:serializeWorld(loaded)===text};
  })()`);
  check('attempt resolves once and consumes spear durability', outcome.counters.attempts === 1 && outcome.counters.droveOff + outcome.counters.failed === 1 && outcome.wear > 0, outcome);
  check('defence outcome round-trips through save/load', outcome.saveEqual);
  await browser.sleep(400);
  await browser.shot(out + '/outcome.png');
  check('no uncaught page errors', !browser.events.some(e => e.method === 'Runtime.exceptionThrown'));
} finally {
  writeFileSync(out + '/report.json', JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
if (results.some(r => !r.pass)) process.exitCode = 1;
