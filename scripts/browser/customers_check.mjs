// Rules 51 customers in a real (headless) Chrome page, through the DOM only: does a person's card say who asked them for a material
// they had none of, and later what they brought and what came back?
//
//   npx vite --port 5182
//   node scripts/browser/customers_check.mjs "http://127.0.0.1:5182/" customers_evidence/rendered
//
// It starts an ordinary current-rules village (the preference the menu sets, written before the page loads), runs the app's own clock
// until somebody holds a customer lead, selects them, opens the Traits & skills section and reads the "Their customers" rows at the
// lead and again when a lead has been supplied. Nothing is staged; the world is the page's own.
import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5182/';
const out = process.argv[3] ?? 'customers_evidence/rendered';
const seed = process.argv[4] ?? 'meadow';
mkdirSync(out, { recursive: true });
const b = await launch({ port: 9342 });
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
    const holders = w.persons.filter((p) => p.alive && p.customers && p.customers.length).map((p) => ({ id: p.id, name: p.name, leads: p.customers.map((c) => ({ name: c.name, item: c.item, amount: c.amount, supplied: c.supplied, units: c.units, back: c.back, backUnits: c.backUnits, siteId: c.siteId || 0, repeat: c.repeat })) }));
    const tidy = (t) => (t || '').split('\\n').join(' ').split('\\t').join(' ').replace(/  +/g, ' ').trim();
    const box = document.querySelector('.list.customers');
    const rows = box ? [...box.querySelectorAll('.row')].map((e) => tidy(e.innerText)) : [];
    const head = [...document.querySelectorAll('.sub-h')].find((e) => tidy(e.textContent) === 'Their customers');
    const headShown = !!head && !head.hidden;
    return { tick: w.tick, rules: w.settings.rulesVersion, dynamics: w.settings.dynamics, people: w.persons.filter((p) => p.alive).length, holders, selectedId: g.selectedId, rows, headShown };
  })()`);

const select = (id) => ev(`(() => { window.__game.selectedId = ${id}; return window.__game.selectedId; })()`);
const openSections = () =>
  ev(`(() => {
    let clicked = [];
    for (const h of document.querySelectorAll('.sec-head')) {
      const t = (h.innerText || '').trim();
      if (/^Traits/.test(t) && h.closest('.sec') && h.closest('.sec').dataset.open !== 'true') { h.click(); clicked.push(t); }
    }
    return clicked;
  })()`);

try {
  await b.send('Page.navigate', { url });
  await b.sleep(1500);
  await ev(`localStorage.setItem('living-world:prefs:v1', JSON.stringify({ seed: ${JSON.stringify(seed)}, harsh: false, immigration: false, rich: true, size: 'normal', speed: 16, overlays: {}, debug: false, inspectorOpen: true, feedOpen: true }))`);
  await b.send('Page.reload');
  await b.sleep(4000);
  let s = await look();
  check('a current-rules village is running in the page', s.dynamics === 'rich' && s.rules >= 51 && s.people > 10, `${s.people} people, rules ${s.rules}`);

  for (let i = 0; i < 300 && !s.holders.length; i++) {
    await b.sleep(1000);
    s = await look();
  }
  check('somebody holds a customer lead (asked for a material they had none of)', s.holders.length > 0, s.holders.map((h) => `${h.name}: ${h.leads.map((l) => `${l.name} ${l.item}x${l.amount}`).join(', ')}`).join(' | ') || `none by tick ${s.tick}`);
  if (!s.holders.length) throw new Error('no customer lead appeared in the window');
  const h = s.holders[0];
  await select(h.id);
  await b.sleep(400);
  await openSections();
  await b.sleep(600);
  s = await look();
  const lead = h.leads[0];
  const leadRow = s.rows.find((t) => t.startsWith(`${lead.name} asked me for`)) ?? '';
  check('the card shows the lead in the person’s own words, with what is spare now', s.headShown && new RegExp(`^${lead.name} asked me for ${lead.amount} ${lead.item} [\\d.]+ days ago; (none to spare yet|I have some to spare now)`).test(leadRow), leadRow || s.rows.join(' / '));
  await b.shot(`${out}/lead.png`);

  let supplied = null;
  for (let i = 0; i < 300 && !supplied; i++) {
    await b.sleep(1000);
    s = await look();
    const anyone = s.holders.find((x) => x.leads.some((l) => l.supplied > 0));
    if (anyone) {
      await select(anyone.id);
      await b.sleep(200);
      await openSections();
      await b.sleep(300);
      s = await look();
      const l = anyone.leads.find((x) => x.supplied > 0);
      supplied = { who: anyone.name, l, row: s.rows.find((t) => t.startsWith(`${l.name} asked me for ${l.item}`) && /brought|took/.test(t)) ?? '' };
    }
  }
  if (supplied) {
    const { l, row } = supplied;
    const expect = l.siteId ? `I took them ${l.units} [\\d.]+ days ago to their site, and nothing came back for it` : l.back ? `I brought them ${l.units} [\\d.]+ days ago and got ${l.backUnits} ${l.back} back` : `I brought them ${l.units} [\\d.]+ days ago and they owe me a favour`;
    check('a supplied lead reads with what moved and what came back, matching the record', new RegExp(expect).test(row), `${supplied.who}: ${row || s.rows.join(' / ')}`);
    await b.shot(`${out}/supplied.png`);
  } else {
    check('a lead was supplied in the window', false, `none by tick ${s.tick}; leads live: ${s.holders.reduce((n, x) => n + x.leads.filter((l) => !l.supplied).length, 0)}`);
  }
} catch (e) {
  check('the check ran to the end', false, String(e && e.message ? e.message : e));
} finally {
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed`);
  await b.close();
}
