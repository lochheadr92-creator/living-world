// The real page keeps its animation loop after the world throws (src/app/frameloop.ts): the world pauses, the fault ribbon says so,
// and a new world plays on. Usage: node scripts/browser/frame_loop_check.mjs [url] [outdir]   (start `npx vite` first)
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.argv[2] ?? 'http://127.0.0.1:5273/';
const out = process.argv[3] ?? 'frame_loop_check_out';
mkdirSync(out, { recursive: true });
const browser = await launch({ port: 9371 });
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` (${JSON.stringify(detail)})` : ''}`);
};
try {
  await browser.send('Page.navigate', { url });
  await browser.sleep(2500);
  const t0 = await browser.evaluate(`window.__game.world.tick`);
  await browser.sleep(800);
  check('the world is playing before the fault', (await browser.evaluate(`window.__game.world.tick`)) > t0);
  // a world the rules cannot run (no random state; the picture never reads it): its next tick throws inside requestAnimationFrame
  await browser.evaluate(`(()=>{const g=window.__game;g.setSpeed(1);g.setPlaying(true);g.world.rng=null})()`);
  await browser.sleep(800);
  const after = await browser.evaluate(`(()=>{const g=window.__game;const b=document.querySelector('.fault-banner');return {playing:g.playing,stage:g.fault&&g.fault.stage,worldFaulted:g.worldFaulted,shown:!!b&&!b.hidden,text:b?b.textContent:''}})()`);
  check('the world paused at the fault', after.playing === false, after.playing);
  check('the fault is recorded as the world stage', after.stage === 'world' && after.worldFaulted, after.stage);
  check('the fault ribbon is shown and names the error', after.shown && /stopped with an error/.test(after.text) && /null/.test(after.text), after.text.slice(0, 160));
  await browser.shot(`${out}/fault.png`);
  // the loop is still alive: a new world plays on, and the ribbon goes
  await browser.evaluate(`(()=>{const g=window.__game;g.restart({seed:'frame-loop-after'});g.setPlaying(true)})()`);
  const t1 = await browser.evaluate(`window.__game.world.tick`);
  await browser.sleep(1200);
  const t2 = await browser.evaluate(`window.__game.world.tick`);
  check('the animation loop survived: a new world advances', t2 > t1, { t1, t2 });
  check('the ribbon is gone with the new world', await browser.evaluate(`document.querySelector('.fault-banner').hidden`));
  // the autosave in the browser's own database: kept apart from the hand-made save, offered in the world menu, and loaded back
  const auto = await browser.evaluate(`(async()=>{const s=await import('/src/app/save.ts');const g=window.__game;g.setPlaying(false);const tick=g.world.tick;const kept=await s.autosaveGame(g);const info=s.autosaveInfo();g.restart({seed:'frame-loop-other'});const loaded=await s.loadAutosave(g);return {kept,loaded,tick,infoTick:info&&info.tick,now:g.world.tick,seed:g.settings.seed,hand:s.savedGameInfo()}})()`);
  check('an autosave is kept and loads back the same moment', auto.kept && auto.loaded && auto.infoTick === auto.tick && auto.now === auto.tick && auto.seed === 'frame-loop-after', auto);
  check('the hand-made save slot is untouched by it', auto.hand === null, auto.hand);
  await browser.evaluate(`document.querySelector('[aria-controls="lw-world-menu"], .seedchip, .topbar .chip')?.click()`);
  await browser.sleep(300);
  const menuAuto = await browser.evaluate(`(()=>{const b=[...document.querySelectorAll('#lw-world-menu button')].find(b=>b.textContent.trim()==='Autosave');return b?{visible:!b.parentElement.hidden,label:b.getAttribute('aria-label')}:null})()`);
  check('the world menu offers the autosave', menuAuto && menuAuto.visible, menuAuto);
  await browser.shot(`${out}/after.png`);
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  if (results.some((r) => !r.pass)) process.exitCode = 1;
} finally {
  await browser.close();
}
