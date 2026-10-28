import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const out = 'inhabitant_evidence/manual-stage1';
mkdirSync(out, { recursive: true });
const browser = await launch({ port: 9365 });
const results = [];
const check = (name, pass) => { results.push({ name, pass: !!pass }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); };
try {
  await browser.send('Page.navigate', { url: 'http://127.0.0.1:5273/?inhabit=Pavel&manual=1&seed=meadow&from=1&days=1&noarrivals=1' });
  let sawTurn = false;
  for (let i = 0; i < 200; i++) {
    await browser.sleep(500);
    const n = await browser.evaluate(`document.querySelectorAll('.inhabit-take').length`);
    if (n > 0) { sawTurn = true; break; }
  }
  check('a manual decision is offered', sawTurn);
  let obs = null;
  if (sawTurn) {
    const raw = await browser.evaluate(`document.querySelector('.inhabit-obs')?.value ?? ''`);
    const m = raw.match(/<observation>\n([\s\S]*?)\n<\/observation>/);
    try { obs = m ? JSON.parse(m[1]) : null; } catch {}
    check('observation has plans', !!(obs && Array.isArray(obs.plans)));
    check('observation has spokenFor', !!(obs && obs.self && 'spokenFor' in obs.self));
    check('observation has available', !!(obs && obs.self && 'available' in obs.self));
    check('observation version is 8', obs && obs.version === 8);
    const plansText = await browser.evaluate(`document.querySelector('.inhabit-plans')?.textContent ?? ''`);
    check('panel shows a compact plans summary', plansText.includes('Plans:') && plansText.includes('spoken for'));
    writeFileSync(`${out}/observation.json`, JSON.stringify(obs, null, 2));
    writeFileSync(`${out}/plans-summary.txt`, plansText);
    await browser.shot(`${out}/manual-turn.png`);
    await browser.evaluate(`document.querySelector('.inhabit-take')?.click()`);
    await browser.sleep(1500);
    await browser.shot(`${out}/manual-after.png`);
  }
  check('no runtime errors', !browser.events.some(e => e.method === 'Runtime.exceptionThrown'));
  writeFileSync(`${out}/report.json`, JSON.stringify({ results, sawTurn, obsVersion: obs ? obs.version : null }, null, 2));
  if (results.some(r => !r.pass)) process.exitCode = 1;
} finally { await browser.close(); }
