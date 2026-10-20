// Render the autonomous observation saved by defence_story.ts. No encounter is authored here.
import { launch } from './cdp.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const url = process.argv[2] ?? 'http://127.0.0.1:5188/';
const source = process.argv[3] ?? 'wolf_evidence/natural-meadow';
const out = process.argv[4] ?? 'wolf_evidence/browser-natural';
const report = JSON.parse(readFileSync(join(source, 'report.json'), 'utf8'));
const start = report.starts[0];
if (!start) throw new Error('No autonomous defence in this observation');
const saved = readFileSync(join(source, 'first-defence.json'), 'utf8');
mkdirSync(out, { recursive: true });
const browser = await launch({ port: 9348 });
const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail ?? '')}`); };
try {
  await browser.send('Page.navigate', { url }); await browser.sleep(1400);
  const initial = await browser.evaluate(`(async () => {
    const {deserializeWorld}=await import('/src/app/save.ts');
    const w=deserializeWorld(${JSON.stringify(saved)}),p=w.byId.get(${start.person});
    const g=window.__game;g.setPlaying(false);g.restoreWorld(w,w.settings);g.select(p.id);g.flyTo(p.x,p.y);
    return {name:p.name,activity:p.activity?.kind,forWhom:p.activity?.data.forWhom,why:p.lastDecision?.because};
  })()`);
  check('autonomous saved scene restores the named defender and beneficiary', initial.name === start.name && initial.activity === 'defend' && initial.forWhom === start.forWhom, initial);
  await browser.sleep(500);
  const card = await browser.evaluate(`document.querySelector('.q-doing')?.textContent ?? ''`);
  check('person inspector names the beneficiary', /wolf off Abel/i.test(card), card);
  await browser.shot(join(out, 'sofia-protects-abel.png'));
  const outcome = await browser.evaluate(`(async () => {
    const {stepWorld}=await import('/src/sim/world.ts');
    const {toolOf}=await import('/src/sim/tools.ts');
    const w=window.__game.world,p=w.byId.get(${start.person}),wear=toolOf(w,p,'spear').wear;
    for(let i=0;i<120 && p.activity?.kind==='defend';i++)stepWorld(w);
    return {result:p.lastResult,wearBefore:wear,wearAfter:toolOf(w,p,'spear').wear};
  })()`);
  check('a wolf leaving on its own is not credited as a successful defence', outcome.result?.outcome === 'partial' && outcome.result?.detail === 'it was already going' && outcome.wearBefore === outcome.wearAfter, outcome);
  check('no uncaught page errors', !browser.events.some(e => e.method === 'Runtime.exceptionThrown'));
} finally {
  writeFileSync(join(out, 'report.json'), JSON.stringify(checks, null, 2) + '\n');
  await browser.close();
}
if (checks.some(c => !c.pass)) process.exitCode = 1;
