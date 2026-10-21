// STAGED fatal-injury fixture. One person, one wolf, health set to 1.
// This is not a natural village and it is not evidence that people survive longer.
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = process.argv[2] ?? 'http://127.0.0.1:5288/';
const out = process.argv[3] ?? 'fatal_evidence';
mkdirSync(out, { recursive: true });
const browser = await launch({ port: 9353 });
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail ?? '')}`);
};
try {
  await browser.send('Page.navigate', { url });
  await browser.sleep(1400);
  const staged = await browser.evaluate(`(async () => {
    const {testKit}=await import('/src/sim/scenes.ts');
    const {currentWorldSettings}=await import('/src/sim/profiles.ts');
    const {RNG}=await import('/src/sim/rng.ts');
    const {makeWolf}=await import('/src/sim/wildlife.ts');
    const w=testKit.flatWorld(currentWorldSettings('normal','fatal-browser',{immigration:false}));
    const p=testKit.addPerson(w,new RNG(71),{name:'Ada',x:40.5,y:40.5,age:25,hunger:92,thirst:92,energy:92});
    testKit.finish(w,'natural');
    w.tick=1000;
    p.needs.hunger=92; p.needs.thirst=92; p.needs.warmth=80; p.needs.energy=92;
    p.immuneUntil=1e9; p.pose='stand'; p.activity=null; p.health=1;
    const wolf=makeWolf(w,40.8,40.5);
    wolf.state='stalk'; wolf.targetId=p.id; wolf.until=1e9; wolf.cooldown=0;
    const g=window.__game;
    g.setPlaying(false);
    g.restoreWorld(w,w.settings);
    g.select(p.id);
    const banner=document.createElement('div');
    banner.id='staged-fatal';
    banner.textContent='STAGED fatal-injury fixture';
    banner.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9999;background:#3a1d1d;color:#fff;padding:6px 12px;font:600 16px sans-serif';
    document.body.appendChild(banner);
    return {version:w.settings.rulesVersion, selected:g.selectedId, who:p.id};
  })()`);
  check('staged fixture is labelled and uses the current rules', staged.version >= 6 && documentReady(staged), staged);
  await browser.sleep(300);
  const died = await browser.evaluate(`(async () => {
    const g=window.__game;
    g.advanceTicks(1);
    const toggle=document.querySelector('.feed-toggle');
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    document.querySelector('.fchip[data-cat="life"]')?.click();
    const w=g.world;
    const dead=w.deceased.filter(d=>d.name==='Ada');
    const lines=w.events.filter(e=>e.text.includes('Ada died')).map(e=>e.text);
    const bite=w.events.filter(e=>e.text.includes('A wolf bit Ada')).map(e=>e.text);
    const memorial=document.querySelector('.empty-memorial')?.textContent ?? '';
    const feed=document.querySelector('.feed-list')?.innerText ?? '';
    return {
      alive:w.persons.some(p=>p.name==='Ada'),
      cause:dead.map(d=>d.cause),
      age:dead[0]?.age ?? null,
      lines, bite, memorial, feed,
      expected: dead[0] ? dead[0].name+' has died ('+dead[0].cause+'), aged '+dead[0].age+'.' : ''
    };
  })()`);
  check('visible memorial matches the death record', died.memorial === died.expected && died.cause.length === 1 && died.cause[0] === 'wolf attack' && died.alive === false, { memorial: died.memorial, expected: died.expected, lines: died.lines, bite: died.bite });
  check('the feed shows that one death', died.feed.includes('Ada died (wolf attack)') && died.lines.length === 1, died.feed.slice(0, 500));
  await browser.shot(out + '/staged-death.png');
  const loaded = await browser.evaluate(`(async () => {
    const {serializeWorld,deserializeWorld}=await import('/src/app/save.ts');
    const g=window.__game;
    const text=serializeWorld(g.world);
    const back=deserializeWorld(text);
    g.restoreWorld(back, back.settings);
    g.advanceTicks(30);
    const w=g.world;
    const dead=w.deceased.filter(d=>d.name==='Ada');
    const lines=w.events.filter(e=>e.text.includes('Ada died')).map(e=>e.text);
    const feed=document.querySelector('.feed-list')?.innerText ?? '';
    const banner=document.getElementById('staged-fatal')?.textContent ?? '';
    return {alive:w.persons.some(p=>p.name==='Ada'), cause:dead.map(d=>d.cause), lines, feed, banner, count:dead.length};
  })()`);
  const feedDeaths = (loaded.feed.match(/Ada died \(wolf attack\)/g) ?? []).length;
  check('save/load keeps one death and does not bring Ada back', loaded.alive === false && loaded.count === 1 && loaded.cause[0] === 'wolf attack' && loaded.lines.length === 1 && feedDeaths === 1 && loaded.banner.includes('STAGED'), { lines: loaded.lines, feedDeaths, banner: loaded.banner });
  await browser.sleep(300);
  await browser.shot(out + '/after-load.png');
  check('no uncaught page errors', !browser.events.some(e => e.method === 'Runtime.exceptionThrown'));
} finally {
  writeFileSync(out + '/report.json', JSON.stringify({ staged: true, results }, null, 2) + '\n');
  await browser.close();
}
if (results.some(r => !r.pass)) process.exitCode = 1;

function documentReady(staged) {
  return staged.selected > 0;
}
