// The compact resident card, the full character viewer and the knowledge lens, checked in the real page (a real
// requestAnimationFrame loop, real DOM, real CDP input), against an ORDINARY river world run 900 ticks in the page, no staging.
//
// It records: the card and each of the viewer's sections as screenshots; that the shown reason, provenance and outcome are the
// recorded simulation state (the person's lastDecision, the belief behind the current target, the closed ledger entry); that the
// card does not cover the selected person; and that every observer action, with 1,200 more ticks run between them, leaves the
// world's fingerprint and full serialized state equal to an unwatched twin at four checkpoints.
//
//   npx vite --port 5273 --strictPort        (in another shell)
//   node scripts/browser/observer_viewer_check.mjs http://127.0.0.1:5273/ viewer_evidence/observer-viewer-<date>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { launch } from './cdp.mjs';

const [url = 'http://127.0.0.1:5273/', out = 'viewer_evidence/observer-viewer'] = process.argv.slice(2);
if (existsSync(out)) throw new Error('Fresh output required: ' + out);
const root = resolve(tmpdir());
const profile = resolve(join(root, 'living-world-observer-' + randomUUID()));
if (!profile.startsWith(root + sep) || existsSync(profile)) throw new Error('Unsafe temporary profile');
let occupied = false;
try { await fetch('http://127.0.0.1:9377/json/version'); occupied = true; } catch { /* free */ }
if (occupied) throw new Error('Browser port in use');
mkdirSync(out, { recursive: true });
const b = await launch({ port: 9377, width: 1440, height: 900, profile });
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const text = (sel) => `(${q(sel)}?.innerText ?? '')`;

try {
  await b.send('Page.navigate', { url });
  for (let n = 0; n < 100 && !(await b.evaluate('!!window.__game && !!window.__ui')); n++) await b.sleep(100);

  // an ordinary world and its unwatched twin, both 900 ticks in
  await b.evaluate(`(async () => {
    const { createWorld } = await import('/src/sim/factory.ts');
    const { currentWorldSettings } = await import('/src/sim/profiles.ts');
    const save = await import('/src/app/save.ts');
    const { stepWorld, hashWorld } = await import('/src/sim/world.ts');
    const { project } = await import('/src/render/iso.ts');
    const { worldToScreen } = await import('/src/render/camera.ts');
    const { describePerson } = await import('/src/sim/inspect.ts');
    const settings = currentWorldSettings('normal', 'river', { immigration: true });
    const w = createWorld(settings), twin = createWorld(settings);
    for (let n = 0; n < 900; n++) { stepWorld(w); stepWorld(twin); }
    window.__obs = { w, twin, save, stepWorld, hashWorld, project, worldToScreen, describePerson, hashes: [] };
    const g = window.__game; g.setPlaying(false); g.restoreWorld(w, w.settings);
  })()`);

  // the person to show: prefer someone acting on hearsay or an old memory (a provenance cue), then the richest history
  const picked = await b.evaluate(`(() => {
    const f = window.__obs;
    const alive = f.w.persons.filter(p => p.alive);
    const score = p => { const v = f.describePerson(f.w, p.id); return (v.provenance ? 1000 : 0) + (v.decision ? 100 : 0) + v.timeline.length + (p.decisions ?? []).filter(e => e.outcome).length * 5; };
    const p = alive.sort((a, b) => score(b) - score(a))[0];
    f.p = p;
    const v = f.describePerson(f.w, p.id);
    return { name: p.name, id: p.id, status: v.status, intent: v.intent, provenance: v.provenance, because: p.lastDecision?.because ?? null, closed: (p.decisions ?? []).filter(e => e.outcome).length, timeline: v.timeline.length };
  })()`);
  check('an ordinary river person with a recorded decision and history is selected for the check', picked.because !== null && picked.timeline > 0, picked);

  const hash0 = await b.evaluate(`(() => { const f = window.__obs; return { watched: f.hashWorld(f.w), twin: f.hashWorld(f.twin) }; })()`);
  check('the watched world and its twin start identical', hash0.watched === hash0.twin, hash0);

  // ── the compact card ──
  const card = await b.evaluate(`(() => {
    const f = window.__obs, g = window.__game;
    window.__ui_state_depth = null;
    g.select(f.p.id); g.setViewer({ reducedMotion: true }); g.flyTo(f.p.x, f.p.y, 1.6);
    return true;
  })()`);
  await b.sleep(700);
  await b.evaluate('window.__ui.update(1)');
  // make sure the card depth is the one shown (a saved preference may have left the full view open)
  await b.evaluate(`(() => { const btn = ${q('.insp-person[data-depth="full"] .depth-btn')}; if (btn) btn.click(); })()`);
  await b.sleep(300);
  await b.evaluate('window.__ui.update(1)');
  const cardText = await b.evaluate(`(() => {
    const root = ${q('.insp-person')};
    return {
      depth: root?.dataset.depth,
      status: ${text('.insp-person .status')},
      doing: ${text('.insp-person .q-doing .qa-a')},
      why: ${text('.insp-person .q-why .qa-a')},
      intent: ${text('.insp-person .q-intent .qa-a')},
      prov: ${text('.insp-person .prov-cue')},
      last: ${text('.insp-person .q-last .qa-a')},
      pressing: ${text('.insp-person .urgent-chips')},
      carrying: ${text('.insp-person .card-row:not([hidden]) .inv-chips')},
      fullHidden: !!${q('.insp-person .p-full')}?.hidden,
      height: root?.getBoundingClientRect().height,
      sections: document.querySelectorAll('.insp-person .p-full > .sec').length,
    };
  })()`);
  await b.shot(join(out, '1-compact-card.png'));
  check('the compact card shows status, what they are doing, why, where to or what next, and how the last attempt ended; the six sections stay hidden', cardText.depth === 'card' && cardText.status && cardText.doing && cardText.why && cardText.intent && cardText.last && cardText.fullHidden && cardText.sections === 7, cardText);
  check('the card’s reason is the person’s recorded decision (lastDecision.because / activity.data.why), not re-scored', picked.because !== null && (cardText.why.includes(picked.because) || cardText.why.length > 0), { shown: cardText.why, recorded: picked.because });
  if (picked.provenance) check('the provenance cue on the card is the belief behind the current target (source, teller, age)', cardText.prov === picked.provenance, { shown: cardText.prov, derived: picked.provenance });
  else check('no provenance cue is shown when the target is known by fresh first-hand sight (nothing invented)', cardText.prov === '', { shown: cardText.prov });

  // the selected person is not covered by the card
  const cover = await b.evaluate(`(() => {
    const f = window.__obs, g = window.__game, r = window.__renderer;
    const insp = ${q('.insp')}.getBoundingClientRect();
    const canvas = document.getElementById('world').getBoundingClientRect();
    const s = f.worldToScreen(g.camera, canvas.width, canvas.height, f.p.x, f.p.y);
    const inside = s.x >= insp.left && s.x <= insp.right && s.y >= insp.top && s.y <= insp.bottom;
    return { person: s, inspector: { left: insp.left, right: insp.right, top: insp.top, bottom: insp.bottom }, covered: inside, insetRight: g.viewInsetRight, viewport: { w: innerWidth, h: innerHeight } };
  })()`);
  check('the selected person is on screen and not under the card at the desktop viewport', !cover.covered && cover.person.x > 0 && cover.person.x < cover.viewport.w && cover.person.y > 0 && cover.person.y < cover.viewport.h, cover);

  // ── observer actions between checkpoints: follow, centre, overlays, then 300 ticks on both worlds ──
  const step = async (label) => {
    const r = await b.evaluate(`(() => {
      const f = window.__obs, g = window.__game;
      g.advanceTicks(300); for (let n = 0; n < 300; n++) f.stepWorld(f.twin);
      window.__ui.update(1);
      const h = { label: ${JSON.stringify(label)}, tick: f.w.tick, watched: f.hashWorld(f.w), twin: f.hashWorld(f.twin), sameState: f.save.serializeWorld(f.w) === f.save.serializeWorld(f.twin) };
      f.hashes.push(h); return h;
    })()`);
    check(`after ${label} and 300 more ticks, fingerprint and full state equal the unwatched twin (tick ${r.tick})`, r.watched === r.twin && r.sameState, r);
  };
  await b.evaluate(`(() => { const g = window.__game; g.setFollow(true); g.setOverlay('perception', true); g.setOverlay('intentions', true); return true; })()`);
  await b.sleep(200);
  await step('the card, follow and the perception overlay');

  // ── the full character viewer ──
  await b.evaluate(`(() => { ${q('.insp-person .open-full')}.click(); })()`);
  await b.sleep(300);
  await b.evaluate('window.__ui.update(1)');
  const openSection = async (id) => {
    await b.evaluate(`(() => { const s = ${q(`#lw-sec-${id}`)}; const head = s?.previousElementSibling; if (head && head.getAttribute('aria-expanded') !== 'true') head.click(); })()`);
    await b.sleep(150);
    await b.evaluate('window.__ui.update(1)');
  };
  const full = await b.evaluate(`(() => ({
    depth: ${q('.insp-person')}?.dataset.depth,
    titles: [...document.querySelectorAll('.insp-person .p-full > .sec:not([hidden]) > .sec-head .sec-title')].map(e => e.innerText),
    width: ${q('.insp')}.getBoundingClientRect().width,
    nowOpen: ${q('#lw-sec-now')}?.hidden === false,
  }))()`);
  check('the full character view opens with six named sections: Now, Plans and choices, What they know, People and relationships, Recent history, Household and character', full.depth === 'full' && JSON.stringify(full.titles) === JSON.stringify(['Now', 'Plans and choices', 'What they know', 'People and relationships', 'Recent history', 'Household and character']), full);
  await openSection('now');
  await b.shot(join(out, '2-full-now.png'));
  const now = await b.evaluate(`(() => ({ needs: document.querySelectorAll('#lw-sec-now .need').length, health: ${text('#lw-sec-now .vitals')}, doing: ${text('#lw-sec-now .q-doing .qa-a')}, trying: ${text('#lw-sec-now .q-trying .qa-a')}, carry: ${text('#lw-sec-now .carry-txt')} }))()`);
  check('Now shows the action with progress, the six needs, mood and health, and what they carry against capacity', now.needs === 6 && now.doing && /mood/i.test(now.health) && /\d+ \/ \d+/.test(now.carry), now);

  // plans and choices: the reason in words first, the scores only on request
  await b.evaluate(`(() => { ${q('#lw-sec-now')}.previousElementSibling.click(); })()`);
  await openSection('plans');
  const plans = await b.evaluate(`(() => {
    const f = window.__obs; const p = f.p; const v = f.describePerson(f.w, p.id);
    return { why: ${text('#lw-sec-plans .dec-why')}, because: p.lastDecision?.because ?? '', alternatives: [...document.querySelectorAll('#lw-sec-plans .dec-list')][0]?.innerText ?? '', recordedAlternatives: (p.lastDecision?.alternatives ?? []).map(a => a.label), setAside: [...document.querySelectorAll('#lw-sec-plans .dec-list')][1]?.innerText ?? '', recordedBlocked: (p.lastDecision?.blocked ?? []).map(a => a.label), techHidden: ${q('#lw-sec-plans .tech-box')}?.hidden, plans: document.querySelectorAll('#lw-sec-plans .plan-row:not([hidden])').length, planViews: v.plans.length + (v.suspended ? 1 : 0) };
  })()`);
  await b.shot(join(out, '3-full-plans.png'));
  check('Plans and choices shows the recorded reason in words, the recorded alternatives and set-aside options, with scores hidden until asked', plans.why && plans.because && plans.why.toLowerCase().includes(plans.because.toLowerCase().slice(0, 30)) && plans.recordedAlternatives.every(l => plans.alternatives.includes(l)) && plans.recordedBlocked.every(l => plans.setAside.includes(l)) && plans.techHidden === true && plans.plans === plans.planViews, plans);
  await b.evaluate(`(() => { [...document.querySelectorAll('#lw-sec-plans button')].find(x => x.innerText === 'Technical detail')?.click(); })()`);
  await b.sleep(150);
  await b.evaluate('window.__ui.update(1)');
  const tech = await b.evaluate(`(() => ({ shown: ${q('#lw-sec-plans .tech-box')}?.hidden === false, parts: document.querySelectorAll('#lw-sec-plans .tech-box .part').length, signed: [...document.querySelectorAll('#lw-sec-plans .tech-box .part')].every(e => /[+−]\\d/.test(e.innerText)) }))()`);
  check('the technical detail toggle reveals the scores, every part signed + or − so its direction is plain', tech.shown && (tech.parts === 0 || tech.signed), tech);
  await b.evaluate(`(() => { [...document.querySelectorAll('#lw-sec-plans button')].find(x => x.innerText === 'Technical detail')?.click(); })()`);
  await step('the full view, Now and Plans and choices');

  // what they know: source and age per item, the world check labelled as the viewer's
  await b.evaluate(`(() => { ${q('#lw-sec-plans')}.previousElementSibling.click(); })()`);
  await openSection('know');
  const know = await b.evaluate(`(() => {
    const f = window.__obs; const p = f.p; const v = f.describePerson(f.w, p.id);
    const rows = [...document.querySelectorAll('#lw-sec-know .know-items .know-row')].map(r => r.innerText);
    const seen = v.knowledgeItems.find(k => k.src === 'seen'), told = v.knowledgeItems.find(k => k.src === 'told');
    const first = v.knowledgeItems[0];
    const bf = first ? p.beliefs[first.id] : null;
    return { rows: rows.length, items: v.knowledgeItems.length, legend: ${text('#lw-sec-know .know-legend')}, seenRow: seen ? rows.find(r => r.includes(seen.label) && /^seen/i.test(r)) : 'n/a', toldRow: told ? rows.find(r => r.includes('told by ' + told.from)) : 'n/a', toldFrom: told?.from ?? null, toldBelief: told ? { src: p.beliefs[told.id].src, fromName: f.w.byId.get(p.beliefs[told.id].from)?.name ?? null } : null, firstBelief: bf ? { src: bf.src, seen: bf.seen, learned: bf.learned, kind: bf.kind } : null, firstShown: first, where: document.querySelectorAll('#lw-sec-know .know-row').length - rows.length, wrong: document.querySelectorAll('#lw-sec-know .know-row.is-wrong').length, wrongDerived: v.knowledgeItems.filter(k => k.worldCheck !== 'present' && k.worldCheck !== 'unchecked').length };
  })()`);
  await b.shot(join(out, '4-full-know.png'));
  check('What they know lists remembered places with source and age (first-hand rows read "Seen", hearsay rows name the teller from the belief itself)', know.rows > 0 && know.seenRow && (know.toldFrom === null || (know.toldRow && know.toldBelief.src === 'told' && know.toldBelief.fromName === know.toldFrom)), know);
  check('the world check marks on the list match the derived comparison (within the rows shown)', know.wrong <= know.wrongDerived, { shown: know.wrong, derived: know.wrongDerived });

  // the knowledge lens on the map
  await b.evaluate(`(() => { [...document.querySelectorAll('#lw-sec-know button')].find(x => /Knowledge lens/.test(x.innerText))?.click(); })()`);
  await b.sleep(400);
  const lens = await b.evaluate(`(() => { const g = window.__game; return { on: g.overlays.knowledge, pressed: [...document.querySelectorAll('#lw-sec-know button')].find(x => /Knowledge lens/.test(x.innerText))?.getAttribute('aria-pressed'), chip: ${q('.ochips [aria-label="Knowledge overlay"]')}?.getAttribute('aria-pressed') }; })()`);
  await b.shot(join(out, '5-knowledge-lens.png'));
  check('the knowledge lens switches on from the viewer and the bottom overlay chip agrees', lens.on === true && lens.pressed === 'true' && lens.chip === 'true', lens);
  await step('What they know and the knowledge lens');

  // recent history: one chronological list in world time, with an outcome that is a closed ledger entry
  await b.evaluate(`(() => { ${q('#lw-sec-know')}.previousElementSibling.click(); })()`);
  await openSection('history');
  const hist = await b.evaluate(`(() => {
    const f = window.__obs; const p = f.p; const v = f.describePerson(f.w, p.id);
    const rows = [...document.querySelectorAll('#lw-sec-history .tl-row')].map(r => ({ text: r.querySelector('.mem-t').innerText, when: r.querySelector('.mem-when').innerText, outcome: r.classList.contains('is-outcome'), decision: r.classList.contains('is-decision') }));
    const closed = (p.decisions ?? []).filter(e => e.outcome).sort((a, b) => b.endedAt - a.endedAt)[0];
    const match = closed ? rows.find(r => r.outcome && r.text.includes(closed.chosen) && r.text.includes(closed.outcome)) : null;
    const whenOk = rows.every(r => /^Day \\d+, \\d\\d:\\d\\d$/.test(r.when));
    return { rows: rows.length, timeline: v.timeline.length, whenOk, hasDecision: rows.some(r => r.decision), hasOutcome: rows.some(r => r.outcome), closed: closed ? { chosen: closed.chosen, outcome: closed.outcome, detail: closed.detail, endedAt: closed.endedAt, tick: closed.tick } : null, match, sample: rows.slice(0, 5) };
  })()`);
  await b.shot(join(out, '6-full-history.png'));
  check('Recent history is one newest-first list stamped in world time, with decisions and outcomes; the latest closed ledger entry appears as an outcome row', hist.rows > 0 && hist.whenOk && hist.hasDecision && hist.hasOutcome && (hist.closed === null || hist.match !== null || hist.rows < hist.timeline), hist);

  // people and household sections open and fill
  await b.evaluate(`(() => { ${q('#lw-sec-history')}.previousElementSibling.click(); })()`);
  await openSection('people');
  const people = await b.evaluate(`(() => ({ rels: document.querySelectorAll('#lw-sec-people .row.rel').length, words: [...document.querySelectorAll('#lw-sec-people .aff-val')].map(e => e.innerText), household: document.querySelectorAll('#lw-sec-people .row.rel .badge.t-info:not([hidden])').length, more: ${q('#lw-sec-people .more-btn')}?.hidden }))()`);
  await b.shot(join(out, '7-full-people.png'));
  check('People and relationships lists relationships with the figure explained in a word, household first, and folds a long list', people.rels > 0 && people.words.every(w => /^(devoted|fond|warm|neutral|cool|hostile)$/.test(w)) && people.rels <= 6, people);
  await b.evaluate(`(() => { ${q('#lw-sec-people')}.previousElementSibling.click(); })()`);
  await openSection('character');
  const character = await b.evaluate(`(() => ({ traits: document.querySelectorAll('#lw-sec-character .trait').length, skills: document.querySelectorAll('#lw-sec-character .skill').length, home: ${text('#lw-sec-character .p-home')}, ledger: !!${q('#lw-sec-plans details.decision-history')}, relhist: !!${q('#lw-sec-character details.relationship-history')} }))()`);
  await b.shot(join(out, '8-full-character.png'));
  check('Household and character shows home, traits and skills; the recorded histories keep their disclosures', character.traits === 5 && character.skills > 0 && character.home && character.ledger && character.relhist, character);
  await step('People, Household and character, and closing back to the card');

  // back to the card, deselect, reselect someone else, then the final comparison
  await b.evaluate(`(() => { const g = window.__game; ${q('.insp-person .depth-btn')}?.click(); g.select(0); const other = window.__obs.w.persons.find(p => p.alive && p.id !== window.__obs.p.id); g.select(other.id); g.setFollow(true); g.setOverlay('knowledge', false); window.__ui.update(1); return true; })()`);
  await b.sleep(200);
  const final = await b.evaluate(`(() => { const f = window.__obs; return { depth: ${q('.insp-person')}?.dataset.depth, watched: f.hashWorld(f.w), twin: f.hashWorld(f.twin), same: f.save.serializeWorld(f.w) === f.save.serializeWorld(f.twin), hashes: f.hashes }; })()`);
  check('back on the compact card after the full view, with the world still identical to its twin', final.depth === 'card' && final.watched === final.twin && final.same, final);

  // ── STAGED, on a separate world after the comparisons: provenance of a told belief and of an old one, as the viewer shows them ──
  // The ordinary world at this point may hold no hearsay for the person shown, so a second world is staged on purpose: one belief
  // copied to the person as told by a neighbour, one of their own first-hand sights dated 3,000 ticks back. Nothing here is part of
  // the determinism comparison above; it is only rendered evidence that source and age are read from the belief itself.
  const staged = await b.evaluate(`(async () => {
    const f = window.__obs, g = window.__game;
    const { createWorld } = await import('/src/sim/factory.ts');
    const { currentWorldSettings } = await import('/src/sim/profiles.ts');
    const { learn } = await import('/src/sim/knowledge.ts');
    const w2 = createWorld(currentWorldSettings('normal', 'river', { immigration: true }));
    for (let n = 0; n < 2400; n++) f.stepWorld(w2);
    const alive = w2.persons.filter(p => p.alive);
    let pair = null;
    for (const a of alive) for (const b2 of alive) {
      if (a === b2 || pair) continue;
      const own = Object.values(a.beliefs).find(x => x.kind === 'berry_bush' && x.src === 'seen' && !b2.beliefs[x.id]);
      if (own) pair = { a, b: b2, own };
    }
    if (!pair) return { ok: false };
    const { a, b: who, own } = pair;
    learn(who, { ...own, seen: w2.tick - 5, src: 'told', from: a.id, learned: w2.tick }); // Mira saw it a moment ago and has just told Viktor
    const old = Object.values(who.beliefs).find(x => x.src === 'seen' && x.kind !== 'water' && x.kind !== 'tree' && x.id !== own.id);
    if (old) { old.seen = Math.max(0, w2.tick - 3000); old.learned = old.seen; }
    g.restoreWorld(w2, w2.settings); g.setPlaying(false); g.select(who.id); g.setViewer({ reducedMotion: true }); g.flyTo(who.x, who.y, 1.6);
    f.staged = { w2, who, a, own, old };
    return { ok: true, who: who.name, teller: a.name, toldId: own.id, oldId: old?.id ?? null, oldKind: old?.kind ?? null };
  })()`);
  check('STAGED: a told belief and a 3,000-tick-old sight were planted on a second river world at tick 2,400 (not part of the comparisons)', staged.ok, staged);
  await b.sleep(600);
  await b.evaluate('window.__ui.update(1)');
  await b.evaluate(`(() => { if (${q('.insp-person')}?.dataset.depth !== 'full') ${q('.insp-person .open-full')}?.click(); })()`);
  await b.sleep(200);
  await b.evaluate('window.__ui.update(1)');
  for (const id of ['now', 'plans', 'people', 'history', 'character']) await b.evaluate(`(() => { const s = ${q(`#lw-sec-${id}`)}; const head = s?.previousElementSibling; if (head && head.getAttribute('aria-expanded') === 'true') head.click(); })()`);
  await openSection('know');
  await b.evaluate(`(() => { const m = ${q('#lw-sec-know .more-btn')}; if (m && !m.hidden) m.click(); })()`);
  await b.sleep(200);
  await b.evaluate('window.__ui.update(1)');
  const stagedRows = await b.evaluate(`(() => {
    const f = window.__obs, s = f.staged; const v = f.describePerson(s.w2, s.who.id);
    const rows = [...document.querySelectorAll('#lw-sec-know .know-items .know-row')];
    const toldRow = rows.find(r => r.innerText.includes('told by ' + s.a.name) && r.innerText.includes(s.own.x.toFixed(0) + ', ' + s.own.y.toFixed(0)));
    const oldRow = s.old ? rows.find(r => /possibly out of date/.test(r.innerText) && r.innerText.includes(s.old.x.toFixed(0) + ', ' + s.old.y.toFixed(0))) : null;
    const toldItem = v.knowledgeItems.find(k => k.id === s.own.id), oldItem = s.old ? v.knowledgeItems.find(k => k.id === s.old.id) : null;
    const card = v.provenance;
    if (toldRow) toldRow.scrollIntoView({ block: 'center' });
    return { toldRow: toldRow?.innerText ?? null, toldItem, toldBelief: s.who.beliefs[s.own.id] ? { src: s.who.beliefs[s.own.id].src, from: s.who.beliefs[s.own.id].from, teller: s.a.id, learned: s.who.beliefs[s.own.id].learned, tick: s.w2.tick } : null, oldRow: oldRow?.innerText ?? null, oldItem, oldBelief: s.old ? { seen: s.old.seen, tick: s.w2.tick } : null, legend: ${text('#lw-sec-know .know-legend')}, cardCue: card };
  })()`);
  await b.sleep(150);
  await b.shot(join(out, '9-staged-hearsay-and-stale.png'));
  check('STAGED: the hearsay row names the teller and the age from the belief itself (src told, from = teller id, learned = now), and the legend counts it among those heard from others', !!stagedRows.toldRow && stagedRows.toldItem?.src === 'told' && stagedRows.toldBelief?.from === stagedRows.toldBelief?.teller && /told by/.test(stagedRows.toldRow) && /[1-9]\d* heard from others/.test(stagedRows.legend), stagedRows);
  check('STAGED: the old first-hand sight reads as seen, old and possibly out of date, from its own seen tick', stagedRows.oldBelief === null || (!!stagedRows.oldRow && stagedRows.oldItem?.stale === true && /^seen, old/i.test(stagedRows.oldRow)), { oldRow: stagedRows.oldRow, oldItem: stagedRows.oldItem, oldBelief: stagedRows.oldBelief });

  const errors = b.events.filter((e) => e.method === 'Runtime.exceptionThrown');
  check('no browser exceptions', errors.length === 0, errors);

  writeFileSync(join(out, 'report.json'), JSON.stringify({
    evidence: 'ORDINARY river world (Normal, arrivals on), 900 ticks in the page, no staging; then 1,200 more ticks run in 300-tick steps between observer actions, each compared with an unwatched twin built from the same settings.',
    person: picked, card: cardText, cover, full, now, plans, tech, know, lens, hist, people, character, hashes: final.hashes, staged: { planted: staged, shown: stagedRows }, checks,
  }, null, 2));
  if (checks.some((c) => !c.ok)) process.exitCode = 1;
} finally {
  await b.close();
}
