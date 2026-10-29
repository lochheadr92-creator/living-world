// Rules 45 food help in a real (headless) Chrome page, through the DOM only: does the person card tell a promise to fetch food from
// a delivery, name the kind promised, and show the delivery once it has actually happened?
//
//   npx vite --port 5182
//   node scripts/browser/food_help_check.mjs "http://127.0.0.1:5182/" food_help_evidence/rendered
//
// It starts an ordinary current-rules village (the preference the menu sets, written before the page loads), runs the app's own clock
// until somebody answers a food or care ask with a promise to fetch (a `deliver` commitment naming a food kind), selects the helper,
// opens the Requests and Promises sections and reads the rows at the promise and again when something has been brought. Nothing is
// staged; the world is the page's own. What it cannot show: how any of this looks to a human eye.
import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5182/';
const out = process.argv[3] ?? 'food_help_evidence/rendered';
mkdirSync(out, { recursive: true });
const b = await launch({ port: 9341 });
const ev = (e) => b.evaluate(e);
const checks = [];
const check = (name, ok, note = '') => {
  checks.push({ name, ok: !!ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
};
const FOOD = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat'];

const look = () =>
  ev(`(() => {
    const g = window.__game;
    const w = g.world;
    const foods = ${JSON.stringify(FOOD)};
    const reqs = w.requests.filter((r) => r.kind === 'food' || r.kind === 'care');
    const fetches = reqs.filter((r) => r.commitmentId).map((r) => {
      const helper = w.byId.get(r.to);
      const c = helper && helper.ent === 'person' ? helper.commitments.find((x) => x.id === r.commitmentId) : null;
      return { id: r.id, from: r.from, to: r.to, status: r.status, note: r.note, delivered: r.delivered ?? 0, item: c ? c.item : null, amount: c ? c.amount : 0, cDelivered: c ? (c.delivered ?? 0) : 0, cStatus: c ? c.status : '' };
    }).filter((f) => f.item && foods.includes(f.item));
    const tidy = (t) => (t || '').split('\\n').join(' ').split('\\t').join(' ').replace(/  +/g, ' ').trim();
    const rows = [...document.querySelectorAll('.row.req')].map((e) => tidy(e.innerText));
    const secs = [...document.querySelectorAll('.sec')];
    const prom = secs.find((s) => /^Promises/.test(tidy(s.innerText)));
    const promises = prom ? [...prom.querySelectorAll('.row')].map((e) => tidy(e.innerText)) : [];
    const name = tidy((document.querySelector('.insp-wrap h2, .insp-wrap .name, .person-name') || {}).innerText || '');
    const names = Object.fromEntries(w.persons.map((p) => [p.id, p.name]));
    return { tick: w.tick, rules: w.settings.rulesVersion, dynamics: w.settings.dynamics, people: w.persons.filter((p) => p.alive).length, foodRequests: reqs.length, noItem: reqs.filter((r) => r.status === 'declined' && r.note === 'no item').length, fetches, selectedId: g.selectedId, reqRows: rows, promiseRows: promises, name, names };
  })()`);

const select = (id) => ev(`(() => { window.__game.selectedId = ${id}; return window.__game.selectedId; })()`);
const openSections = () =>
  ev(`(() => {
    const want = ['Requests', 'Promises', 'What are they up to?'];
    let clicked = [];
    for (const h of document.querySelectorAll('.sec-head, .upto-top .btn')) {
      const t = (h.innerText || '').trim();
      if (want.some((x) => t.startsWith(x)) && h.closest('.sec') && h.closest('.sec').dataset.open !== 'true') { h.click(); clicked.push(t); }
    }
    return clicked;
  })()`);

try {
  await b.send('Page.navigate', { url });
  await b.sleep(1500);
  await ev(`localStorage.setItem('living-world:prefs:v1', JSON.stringify({ seed: 'river', harsh: false, immigration: false, rich: true, size: 'normal', speed: 16, overlays: {}, debug: false, inspectorOpen: true, feedOpen: true }))`);
  await b.send('Page.reload');
  await b.sleep(4000);
  let s = await look();
  check('a current-rules village is running in the page', s.dynamics === 'rich' && s.rules >= 45 && s.people > 10, `${s.people} people, rules ${s.rules}`);

  for (let i = 0; i < 240 && !s.fetches.length; i++) {
    await b.sleep(1000);
    s = await look();
  }
  check('somebody promised to fetch food for a neighbour (a deliver commitment naming a food kind)', s.fetches.length > 0, s.fetches.map((f) => `${f.item}x${f.amount} ${f.status}`).join(', ') || `none by tick ${s.tick}; ${s.foodRequests} food asks, ${s.noItem} no-item refusals`);
  if (!s.fetches.length) throw new Error('no fetch promise appeared in the window');
  const f = s.fetches[0];
  await select(f.to);
  await b.sleep(400);
  await openSections();
  await b.sleep(600);
  s = await look();
  const asker = s.names[f.from];
  const rowFor = (rows) => rows.find((t) => t.startsWith(`${asker} asked them for food`)) ?? '';
  const reqRow = rowFor(s.reqRows);
  const promRow = s.promiseRows.find((t) => new RegExp(`Bring \\d+ ${f.item} to ${asker}`).test(t)) ?? '';
  check('the helper’s card shows the ask and names the kind promised', /food/.test(reqRow) && new RegExp(`will bring \\d+ (of the \\d+ )?${f.item}`).test(reqRow), reqRow || s.reqRows.join(' / '));
  // the page runs at its own speed, so by the first look part of the promise may already have been kept: either way the promise
  // row must say how much has actually been delivered and the ask must still read PROMISED, never as fulfilled
  const nowF = s.fetches.find((x) => x.id === f.id) ?? f;
  check('the promise reads as a promise, with exactly what has been delivered so far', new RegExp(`${nowF.cDelivered} of ${nowF.amount} delivered`).test(promRow) && /PROMISED/.test(reqRow) && (nowF.cDelivered === 0 ? !/brought/.test(reqRow) : new RegExp(`${nowF.cDelivered} of ${nowF.amount} ${f.item} brought`).test(reqRow)), `${reqRow} | ${promRow}`);
  await b.shot(`${out}/promise.png`);

  let seen = null;
  for (let i = 0; i < 240 && !seen; i++) {
    await b.sleep(1000);
    s = await look();
    const now = s.fetches.find((x) => x.id === f.id);
    if (!now) break;
    if (now.delivered > 0 || (now.status !== 'promised')) {
      await select(f.to);
      await b.sleep(200);
      await openSections();
      await b.sleep(300);
      s = await look();
      seen = { now, reqRow: rowFor(s.reqRows), promRow: s.promiseRows.find((t) => new RegExp(`Bring \\d+ ${f.item} to ${asker}`).test(t)) ?? '' };
    }
  }
  if (seen && seen.now.delivered > 0) {
    check('a delivery reads as food actually brought, counted once', new RegExp(`${seen.now.delivered} of \\d+ ${f.item} brought`).test(seen.reqRow) && seen.now.cDelivered === seen.now.delivered, `${seen.reqRow} | ${seen.promRow}`);
    await b.shot(`${out}/delivered.png`);
  } else if (seen) {
    check('a promise that came to nothing reads as that, not as a delivery', /expired|interrupted|failed|broken|cancelled/.test(seen.reqRow) && !/brought/.test(seen.reqRow), `${seen.reqRow} | ${seen.promRow}`);
    await b.shot(`${out}/ended.png`);
  } else {
    check('the promise reached an outcome in the window', false, 'still promised when the window closed');
  }
} catch (e) {
  check('the check ran to the end', false, String(e && e.message ? e.message : e));
} finally {
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed`);
  await b.close();
}
