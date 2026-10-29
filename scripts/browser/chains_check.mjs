// Rendered examples of the dependency-chain lines (WS13) in a real (headless) Chrome page, through the DOM only: the staged saves
// from scripts/chains_demo.ts are loaded into the page, the person selected, and the lines read as the viewer would see them.
//
//   npx vite --port 5182
//   npx vite-node scripts/chains_demo.ts
//   node scripts/browser/chains_check.mjs "http://127.0.0.1:5182/" chain_evidence/rendered
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5182/';
const out = process.argv[3] ?? 'chain_evidence/rendered';
mkdirSync(out, { recursive: true });
const b = await launch({ port: 9343 });
const ev = (e) => b.evaluate(e);
const checks = [];
const check = (name, ok, note = '') => { checks.push({ name, ok: !!ok, note }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`); };

const load = (name, who) =>
  ev(`(async () => {
    const { deserializeWorld, serializeWorld } = await import('/src/app/save.ts');
    const w = deserializeWorld(await (await fetch('/chain_evidence/rendered-saves/${name}-save.json')).text());
    const g = window.__game; g.setPlaying(false); g.restoreWorld(w, w.settings); g.setPlaying(false);
    const p = w.persons.find((p) => p.name === ${JSON.stringify(who)}); g.select(p.id); g.flyTo(p.x, p.y);
    window.__before = serializeWorld(w);
    return { rules: w.settings.rulesVersion, tick: w.tick, who: p.name, label: w.sceneLabel };
  })()`);
const openAll = () =>
  ev(`(() => {
    for (const h of document.querySelectorAll('.sec-head')) { const sec = h.closest('.sec'); if (/^Traits/.test((h.innerText || '').trim()) && sec && sec.dataset.open !== 'true') h.click(); }
    const panel = [...document.querySelectorAll('details')].find((e) => e.querySelector('summary')?.textContent === 'Household history');
    if (panel) { panel.open = true; panel.scrollIntoView({ block: 'center' }); }
    const hauling = document.querySelector('.trait-sum.hauling');
    if (hauling && !hauling.hidden) hauling.scrollIntoView({ block: 'center' });
    return true;
  })()`);
const read = () =>
  ev(`(() => {
    const tidy = (t) => (t || '').split('\\n').join(' ').replace(/  +/g, ' ').trim();
    const panel = [...document.querySelectorAll('details')].find((e) => e.querySelector('summary')?.textContent === 'Household history');
    const history = panel ? [...panel.querySelectorAll('p')].map((e) => tidy(e.textContent)) : [];
    const hauling = document.querySelector('.trait-sum.hauling');
    return { history, hauling: hauling && !hauling.hidden ? tidy(hauling.textContent) : '' };
  })()`);
const pure = () => ev(`(async () => { const { serializeWorld } = await import('/src/app/save.ts'); return serializeWorld(window.__game.world) === window.__before; })()`);

try {
  await b.send('Page.navigate', { url });
  await b.sleep(1500);
  await ev(`localStorage.setItem('living-world:prefs:v1', JSON.stringify({ seed: 'meadow', harsh: false, immigration: false, rich: true, size: 'normal', speed: 16, overlays: {}, debug: false, inspectorOpen: true, feedOpen: true }))`);
  await b.send('Page.reload');
  await b.sleep(4000);

  const cases = [
    { name: 'continuity', who: 'Ben', test: (r) => r.history.find((t) => /^Ada left the household home unfinished [\d.]+ days ago\.$/.test(t)), what: 'household history: "Ada left the household home unfinished N days ago."' },
    { name: 'succession', who: 'Ben', test: (r) => r.history.find((t) => /^Ben took over the journey from Ada at tick \d+: died\.$/.test(t)), what: 'household history: "Ben took over the journey from Ada at tick N: died."' },
    { name: 'rescue', who: 'Ada', test: (r) => r.history.find((t) => /^Ada looked for Ben at \d+, \d+ \(tick \d+\): found nobody\.$/.test(t)), what: 'household history: "Ada looked for Ben at x, y (tick N): found nobody."' },
    { name: 'transport', who: 'Hana', test: (r) => /^Carried 84 weight of materials to building sites in 7 loads over the last \d+ day\(s\); enough to want a cart\.$/.test(r.hauling) ? r.hauling : '', what: 'person card: "Carried 84 weight … in 7 loads …; enough to want a cart."' },
  ];
  for (const c of cases) {
    const s = await load(c.name, c.who);
    await b.sleep(500);
    await openAll();
    await b.sleep(600);
    const r = await read();
    const hit = c.test(r);
    check(`${c.name} (rules ${s.rules}): ${c.what}`, !!hit, hit || `history: ${r.history.slice(0, 12).join(' | ')}; hauling: ${r.hauling}`);
    check(`${c.name}: reading the page leaves the state untouched`, await pure());
    await b.shot(`${out}/${c.name}.png`);
  }
} finally {
  writeFileSync(`${out}/checks.json`, JSON.stringify(checks, null, 2));
  await b.close();
}
const failed = checks.filter((c) => !c.ok).length;
console.log(`${checks.length - failed} / ${checks.length} checks passed`);
process.exitCode = failed ? 1 : 0;
