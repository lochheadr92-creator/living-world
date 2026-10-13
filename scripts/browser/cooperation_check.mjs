// Stage D1 in a real (headless) Chrome page, through the DOM only: does the interface tell a promise from a delivery, and a
// delivery from a finished project?
//
//   npx vite --port 5182
//   node scripts/browser/cooperation_check.mjs "http://127.0.0.1:5182/"
//
// It starts a rich village (the preference the menu sets, written before the page loads), runs the app's own clock until somebody
// asks a neighbour for material for a project of their own, selects that person, and reads what the person card says at each stage.
// What it cannot show: how any of this looks to a human eye. A headless Chrome renders in software; this is a check on the text the
// interface puts on the page, not on its appearance.
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5182/';
const b = await launch({ port: 9338 });
const ev = (e) => b.evaluate(e);
const checks = [];
const check = (name, ok, note = '') => {
  checks.push({ name, ok: !!ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
};

/** the state of the world as the page holds it, plus whatever the person card is showing */
const look = () =>
  ev(`(() => {
    const g = window.__game;
    const w = g.world;
    const req = w.requests.filter((r) => r.planId !== undefined && r.planId !== null);
    const live = req.filter((r) => r.status === 'pending' || r.status === 'promised');
    const pick = live[0] ?? req[req.length - 1];
    const planRow = document.querySelector('.qa .q-plan') || document.querySelector('.q-plan');
    const tidy = (t) => (t || '').split('\\n').join(' ').split('\\t').join(' ').replace('  ', ' ').trim();
    const plan = planRow ? tidy(planRow.innerText) : '';
    const rows = [...document.querySelectorAll('.row.req')].map((e) => tidy(e.innerText));
    const promises = [...document.querySelectorAll('.row.cmt, .row.commitment')].map((e) => tidy(e.innerText));
    return {
      tick: w.tick,
      dynamics: w.settings.dynamics,
      people: w.persons.filter((p) => p.alive).length,
      projectRequests: req.map((r) => ({ id: r.id, from: r.from, to: r.to, item: r.item, amount: r.amount, status: r.status, delivered: r.delivered ?? 0, purpose: r.purpose ?? '' })),
      selectedId: g.selectedId,
      asker: pick ? pick.from : 0,
      planLine: plan,
      reqRows: rows,
      promiseRows: promises,
    };
  })()`);

const select = (id) => ev(`(() => { window.__game.selectedId = ${id}; return window.__game.selectedId; })()`);

/** the inspector fills a section only while it is open, so the check opens the ones it reads (by clicking, as a person would) */
const openSections = () =>
  ev(`(() => {
    const want = ['Requests', 'Promises', 'What are they up to?'];
    let clicked = [];
    for (const h of document.querySelectorAll('.sec-head, .upto-top .btn')) {
      const t = (h.innerText || '').trim();
      if (want.some((x) => t.startsWith(x)) && h.closest('.sec') && h.closest('.sec').dataset.open !== 'true') {
        h.click();
        clicked.push(t);
      }
    }
    const more = document.querySelector('.upto-top button');
    if (more && /more/i.test(more.innerText || '')) { more.click(); clicked.push('more'); }
    return clicked;
  })()`);

try {
  // a rich village, no immigration, the ordinary size: the same preferences the menu writes
  await b.send('Page.navigate', { url });
  await b.sleep(1500);
  await ev(`localStorage.setItem('living-world:prefs:v1', JSON.stringify({ seed: 'meadow', harsh: false, immigration: false, rich: true, size: 'normal', speed: 16, overlays: {}, debug: false, inspectorOpen: true, feedOpen: true }))`);
  await b.send('Page.reload');
  await b.sleep(4000);
  let s = await look();
  check('a rich village is running in the page', s.dynamics === 'rich' && s.people > 10, `${s.people} people, dynamics ${s.dynamics}`);

  // let it run until somebody asks a neighbour for material for their own project
  for (let i = 0; i < 150 && !s.projectRequests.length; i++) {
    await b.sleep(1000);
    s = await look();
  }
  check('somebody asked a neighbour for material for a project of their own', s.projectRequests.length > 0, s.projectRequests.map((r) => `${r.item}x${r.amount} ${r.status} (${r.purpose})`).join(', ') || `none by tick ${s.tick}`);
  if (!s.projectRequests.length) throw new Error('no project request appeared in the window');

  await select(s.asker);
  await b.sleep(400);
  await openSections();
  await b.sleep(600);
  s = await look();
  check('the asker’s card names the project and the step', /Step:/.test(s.planLine), s.planLine.slice(0, 240) || '(no plan row on the card)');
  const promised = s.projectRequests.find((r) => r.status === 'promised');
  const pending = s.projectRequests.find((r) => r.status === 'pending');
  const anyReqRow = s.reqRows.find((t) => /stone|wood|clay|ore/.test(t));
  check('the request is on the card, with what it is for', !!anyReqRow, anyReqRow ?? s.reqRows.join(' / '));
  if (promised) {
    check('a promise reads as a promise, not as a delivery', /promised/i.test(anyReqRow ?? '') && !/^.*\\b1 of 1\\b/.test(anyReqRow ?? ''), anyReqRow);
    check('the plan says help is on its way and still calls the material missing', /promised/.test(s.planLine) && /not yet delivered/.test(s.planLine), s.planLine.slice(0, 220));
  } else if (pending) {
    check('an unanswered ask reads as unanswered', /pending/i.test(anyReqRow ?? ''), anyReqRow);
  }

  // follow it to whatever it came to
  let seenDelivered = null;
  let seenRefused = null;
  for (let i = 0; i < 120; i++) {
    await b.sleep(1000);
    s = await look();
    const r = s.projectRequests[s.projectRequests.length - 1];
    if (!r) continue;
    await select(r.from);
    await b.sleep(200);
    await openSections();
    await b.sleep(250);
    s = await look();
    const row = s.reqRows.find((t) => /stone|wood|clay|ore/.test(t)) ?? '';
    if (r.delivered > 0 && !seenDelivered) seenDelivered = { row, plan: s.planLine, r };
    if (r.status === 'declined' && !seenRefused) seenRefused = { row, r };
    if (seenDelivered) break;
  }
  if (seenDelivered) {
    check('a delivery reads as material actually brought', /brought/.test(seenDelivered.row), seenDelivered.row);
    check('and the project is not finished by the delivery', !/made the|done/.test(seenDelivered.plan) || /Step:/.test(seenDelivered.plan), seenDelivered.plan.slice(0, 220));
  } else {
    check('a delivery was seen in the window', false, seenRefused ? `only a refusal: ${seenRefused.row}` : 'nothing arrived before the window closed');
  }
} catch (e) {
  check('the check ran to the end', false, String(e && e.message ? e.message : e));
} finally {
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed`);
  await b.close();
}
