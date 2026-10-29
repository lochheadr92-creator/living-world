// Rules 52 technique tree in a real (headless) Chrome page, through the DOM only: does a person's card say which of the three
// procedures they hold and which they lack, in their own words, matching the record?
//
//   npx vite --port 5182
//   node scripts/browser/technique_tree_check.mjs "http://127.0.0.1:5182/" technique_evidence/rendered
//
// It starts an ordinary current-rules village, finds one person who holds smelting and one who lacks it, selects each, opens the
// Traits & skills section and reads the technique lines. Nothing is staged; the world is the page's own.
import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5182/';
const out = process.argv[3] ?? 'technique_evidence/rendered';
const seed = process.argv[4] ?? 'meadow';
mkdirSync(out, { recursive: true });
const b = await launch({ port: 9343 });
const ev = (e) => b.evaluate(e);
const checks = [];
const check = (name, ok, note = '') => {
  checks.push({ name, ok: !!ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
};
const look = () =>
  ev(`(() => {
    const g = window.__game;
    const w = g.world;
    const people = w.persons.filter((p) => p.alive).map((p) => ({ id: p.id, name: p.name, t: Object.fromEntries(Object.entries(p.techniques || {}).map(([k, v]) => [k, v.source])), trials: p.trials || null }));
    const tidy = (t) => (t || '').split('\\n').join(' ').replace(/  +/g, ' ').trim();
    const el = document.querySelector('.technique-knowledge');
    return { tick: w.tick, rules: w.settings.rulesVersion, dynamics: w.settings.dynamics, people, selectedId: g.selectedId, text: el ? tidy(el.textContent) : '' };
  })()`);
const select = (id) => ev(`(() => { window.__game.selectedId = ${id}; return window.__game.selectedId; })()`);
const openSections = () => ev(`(() => { let n = 0; for (const h of document.querySelectorAll('.sec-head')) { const t = (h.textContent || '').trim(); if (/^Traits/.test(t) && h.closest('.sec') && h.closest('.sec').dataset.open !== 'true') { h.click(); n++; } } return n; })()`);

try {
  await b.send('Page.navigate', { url });
  await b.sleep(1500);
  await ev(`localStorage.setItem('living-world:prefs:v1', JSON.stringify({ seed: ${JSON.stringify(seed)}, harsh: false, immigration: false, rich: true, size: 'normal', speed: 16, overlays: {}, debug: false, inspectorOpen: true, feedOpen: true }))`);
  await b.send('Page.reload');
  await b.sleep(4000);
  let s = await look();
  check('a current-rules village is running in the page', s.dynamics === 'rich' && s.rules >= 52 && s.people.length > 10, `${s.people.length} people, rules ${s.rules}`);
  const holder = s.people.find((p) => p.t.smelting);
  const lacking = s.people.find((p) => p.t.charcoal && !p.t.smelting);
  check('the page world has a smelting holder and a charcoal-only person', !!holder && !!lacking, `${holder ? holder.name : 'nobody'} holds smelting; ${lacking ? lacking.name : 'nobody'} holds charcoal only`);
  if (holder) {
    await select(holder.id);
    await b.sleep(400);
    await openSections();
    await b.sleep(500);
    s = await look();
    check('the holder’s card says smelting is known on arrival, and forging as the record has it', /Iron smelting: known on arrival/.test(s.text) && (holder.t.forging ? /Iron forging: known on arrival/.test(s.text) : /Iron forging: not learned/.test(s.text)), s.text);
    await b.shot(`${out}/holder.png`);
  }
  if (lacking) {
    await select(lacking.id);
    await b.sleep(400);
    await openSections();
    await b.sleep(500);
    s = await look();
    check('the other’s card says smelting is not learned and forging waits on it', /Iron smelting: not learned\. Smithy proficiency alone does not supply this technique\./.test(s.text) && /Iron forging: not learned \(must learn iron smelting first\)\./.test(s.text), s.text);
    await b.shot(`${out}/lacking.png`);
  }
} catch (e) {
  check('the check ran to the end', false, String(e && e.message ? e.message : e));
} finally {
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed`);
  await b.close();
}
