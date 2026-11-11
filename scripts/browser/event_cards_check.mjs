// Event cards (src/ui/event_cards.ts) in the real page: a real requestAnimationFrame loop, real DOM, real CDP clicks.
//
// The world is an ORDINARY Normal river world run 600 ticks in the page. The occasions on the cards are STAGED: they are called
// with the simulation's own noteWedding / noteBirth / callOccasion (and a shared building with its own createBuilding), then
// opened by the world's own clock, because a wedding or a birth may take days of play to happen. The funeral card is a STAGED
// FIXTURE in a throwaway copy of the world (a record of the dead is added to it, so that a funeral has someone to be for). None
// of this is spontaneous runtime evidence; it shows how real records are presented.
//
// Records screenshots and PASS/FAIL checks for: the wedding (bells, petals, names, venue, pointer), other kinds, two open at most
// with a short queue, placement at a screen edge, beside an open inspector and on a narrow screen, dismiss, Watch, pause and
// resume, top speed, loading a save, reduced motion, and observer purity against an unwatched twin stepped in lockstep.
//
//   npx vite --port 5273 --strictPort        (in another shell)
//   node scripts/browser/event_cards_check.mjs http://127.0.0.1:5273/ viewer_evidence/event-cards-<date>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { launch } from './cdp.mjs';

const [url = 'http://127.0.0.1:5273/', out = 'viewer_evidence/event-cards'] = process.argv.slice(2);
if (existsSync(out)) throw new Error('Fresh output required: ' + out);
const root = resolve(tmpdir());
const profile = resolve(join(root, 'living-world-eventcards-' + randomUUID()));
if (!profile.startsWith(root + sep) || existsSync(profile)) throw new Error('Unsafe temporary profile');
let occupied = false;
try { await fetch('http://127.0.0.1:9378/json/version'); occupied = true; } catch { /* free */ }
if (occupied) throw new Error('Browser port in use');
mkdirSync(out, { recursive: true });
const W = 1440, H = 900;
const b = await launch({ port: 9378, width: W, height: H, profile });
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(detail)}`); };
const clip = async (file, r, pad = 70) => {
  const x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
  const res = await b.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: Math.min(W - x, r.w + 2 * pad), height: Math.min(H - y, r.h + 2 * pad), scale: 1.5 } });
  writeFileSync(file, Buffer.from(res.data, 'base64'));
};

// what the cards show now: open cards with their rects and text, markers, the model's counts, the venue on screen
const STATE = `(() => {
  const g = window.__game, m = window.__eventCards, ui = document.getElementById('ui').getBoundingClientRect();
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cards = [...document.querySelectorAll('.ev-card:not(.leaving)')].map((el) => ({
    key: el.dataset.key, look: [...el.classList].find((c) => c.startsWith('look-')), title: el.querySelector('.ev-title')?.innerText,
    lines: [...el.querySelectorAll('.ev-line')].map((l) => l.innerText), tail: el.dataset.tail, r: rect(el),
    bits: el.querySelectorAll('.ev-bit').length, bells: el.querySelectorAll('.ev-bell').length,
    swing: el.querySelector('.ev-bell-l') ? getComputedStyle(el.querySelector('.ev-bell-l')).animationName : null,
  }));
  const markers = [...document.querySelectorAll('.ev-marker:not(.leaving)')].map((el) => ({ key: el.dataset.key, r: rect(el) }));
  const venues = {};
  for (const e of m.entries.values()) { const { worldToScreen } = window.__ec.cam; const v = worldToScreen(g.camera, ui.width, ui.height, e.notice.x, e.notice.y); venues[e.notice.key] = { x: Math.round(v.x), y: Math.round(v.y) }; }
  const panels = [...document.querySelectorAll('#ui .glass')].filter((el) => !el.closest('.ev-layer')).map(rect).filter((r) => r.w > 4 && r.h > 4);
  const occ = (g.world.occasions ?? []).map((o) => [o.id, o.kind, o.status, o.at - g.world.tick].join(':'));
  return { occ, cards, markers, venues, panels, counts: { ...m.counts }, open: m.open().length, waiting: m.waiting().length, tick: g.world.tick, cam: { ...g.camera } };
})()`;
const state = () => b.evaluate(STATE);
const overlap = (a, c) => Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
const inside = (r, w = W, h = H) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h;
/** advance the shown world and its twin by the same ticks, with the page's frames running between steps */
const advance = (n) => b.evaluate(`(() => { const f = window.__ec; window.__game.advanceTicks(${n}); for (let i = 0; i < ${n}; i++) f.stepWorld(f.twin); return window.__game.world.tick; })()`);
/** stage on both worlds alike: the same call on the shown world and on the twin */
const stageBoth = (body) => b.evaluate(`(() => { const f = window.__ec; const r = []; for (const w of [window.__game.world, f.twin]) r.push((${body})(w, f)); return r[0]; })()`);
const untilBegun = async (kind) => {
  const due = await b.evaluate(`(() => { const o = (window.__game.world.occasions ?? []).find((o) => o.kind === '${kind}' && o.status === 'called'); return o ? o.at - window.__game.world.tick : -1; })()`);
  if (due >= 0) await advance(due + 1);
  for (let i = 0; i < 5 && (await b.evaluate(`(window.__game.world.occasions ?? []).some((o) => o.kind === '${kind}' && o.status === 'called')`)); i++) await advance(1);
};
const centreOn = (key, zoom) => b.evaluate(`(() => { const g = window.__game, e = window.__eventCards.entries.get('${key}') ?? null; const at = e ? e.notice : window.__ec.pending; const p = window.__ec.project(at.x, at.y); g.fly = null; g.camera = { x: p.sx, y: p.sy, zoom: ${zoom} }; })()`);

try {
  const sys = await b.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
  console.log(`this machine's browser reports prefers-reduced-motion: ${sys ? 'reduce' : 'no-preference'}; the check sets no-preference, then reduce in step 11`);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await b.send('Page.navigate', { url });
  for (let n = 0; n < 100 && !(await b.evaluate('!!window.__game && !!window.__ui && !!window.__eventCards')); n++) await b.sleep(100);

  const world = await b.evaluate(`(async () => {
    const { createWorld } = await import('/src/sim/factory.ts');
    const { currentWorldSettings } = await import('/src/sim/profiles.ts');
    const save = await import('/src/app/save.ts');
    const { stepWorld, hashWorld } = await import('/src/sim/world.ts');
    const occ = await import('/src/sim/occasions.ts');
    const { createBuilding } = await import('/src/sim/buildings.ts');
    const { project } = await import('/src/render/iso.ts');
    const cam = await import('/src/render/camera.ts');
    const settings = currentWorldSettings('normal', 'river', { immigration: true });
    const w = createWorld(settings);
    for (let n = 0; n < 600; n++) stepWorld(w);
    const twin = save.deserializeWorld(save.serializeWorld(w));
    window.__ec = { twin, save, stepWorld, hashWorld, occ, createBuilding, project, cam };
    const g = window.__game; g.setPlaying(false); g.restoreWorld(w, w.settings);
    return { width: w.W, height: w.H, people: w.persons.filter((p) => p.alive).length, fire: w.buildings.some((b) => b.type === 'fire' || b.type === 'hall') };
  })()`);
  check('an ordinary Normal river world is shown, with a fire or hall to hold an occasion', world.fire, world);
  await b.sleep(300);
  const s0 = await state();
  check('loading the world announces nothing', s0.cards.length === 0 && s0.counts.announced === 0, s0.counts);

  // ── 1. the wedding (STAGED call, opened by the world's own clock) ──
  const couple = await stageBoth(`(w, f) => { const a = w.persons.filter((p) => p.alive).sort((x, y) => x.birthTick - y.birthTick || x.id - y.id); f.occ.noteWedding(w, a[0], a[1]); return [a[0].name, a[1].name]; }`);
  await b.evaluate(`(() => { const o = window.__game.world.occasions.find((o) => o.kind === 'wedding'); window.__ec.pending = { x: o.x, y: o.y }; })()`);
  await centreOn('none', 0.45);
  await b.sleep(200);
  const called = await state();
  check('a wedding that is only called has no card', called.cards.length === 0, called.cards);
  await untilBegun('wedding');
  await b.sleep(380);
  await b.shot(join(out, '01_wedding_zoomed_out.png'));
  const wed = await state();
  const wc = wed.cards[0];
  if (wc) await clip(join(out, '01_wedding_card.png'), wc.r);
  check('the wedding card opens when the wedding begins', wed.cards.length === 1 && wc?.look === 'look-wedding', wed.cards);
  check('it says "A wedding has begun!" with the couple and the venue from the record', wc?.title === 'A wedding has begun!' && wc?.lines[0] === `${couple[0]} & ${couple[1]}` && /^At the (fire|hall)$/.test(wc?.lines[1] ?? ''), { title: wc?.title, lines: wc?.lines, couple });
  check('two bells, swinging', wc?.bells === 2 && wc?.swing === 'evSwing', { bells: wc?.bells, swing: wc?.swing });
  check('a burst of petals and blossoms from the card', (wc?.bits ?? 0) >= 12, wc?.bits);
  check('the card is about 220-260 px wide and inside the view', wc && wc.r.w >= 220 && wc.r.w <= 260 && inside(wc.r), wc?.r);
  const v = wed.venues[wc?.key];
  check('it points down at the venue and does not cover it (zoomed out over the whole map)', wc?.tail === 'down' && v && overlap(wc.r, { x: v.x - 15, y: v.y - 15, w: 30, h: 30 }) === 0, { r: wc?.r, venue: v, zoom: wed.cam.zoom, map: `${world.width}x${world.height}` });
  await b.sleep(2200);
  const after = await state();
  check('the petals are gone within about two seconds', after.cards[0]?.bits === 0, after.cards[0]?.bits);

  // ── 2. pause and resume, top speed: no repeat ──
  for (let i = 0; i < 4; i++) { await b.evaluate('window.__game.setPlaying(true)'); await b.sleep(60); await b.evaluate('window.__game.setPlaying(false)'); await b.sleep(60); }
  // the shown world ran for those moments; the twin is stepped the same number of ticks
  await b.evaluate(`(() => { const f = window.__ec; while (f.twin.tick < window.__game.world.tick) f.stepWorld(f.twin); })()`);
  const pr = await state();
  check('pausing and resuming does not announce it again', pr.counts.announced === 1 && pr.cards.length <= 1, pr.counts);

  // ── 3. dismiss, then the marker, then Watch ──
  const close = await b.evaluate(`(() => { const r = document.querySelector('.ev-card .ev-close').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: document.querySelector('.ev-card .ev-close').getAttribute('aria-label') }; })()`);
  await b.click(close.x, close.y);
  await b.sleep(400);
  const dm = await state();
  check('the dismiss button (labelled) folds the wedding to its venue marker', dm.cards.length === 0 && dm.markers.length === 1 && /^Dismiss: /.test(close.label), { close, markers: dm.markers });
  await b.shot(join(out, '02_marker.png'));
  // move the camera away, then Watch from the marker
  await b.evaluate(`(() => { const g = window.__game; g.fly = null; g.camera = { ...g.camera, x: g.camera.x + 600, y: g.camera.y + 300 }; })()`);
  await b.sleep(150);
  const mk = (await state()).markers[0];
  await b.click(mk.r.x + mk.r.w / 2, mk.r.y + mk.r.h / 2);
  await b.sleep(1500);
  const wt = await state();
  const wv = wt.venues[mk.key];
  check('the marker\'s Watch centres the camera on the venue (camera moved only on the click)', wv && Math.abs(wv.x - W / 2) < 40 && Math.abs(wv.y - H / 2) < 40, { venue: wv });

  // ── 4. other kinds (STAGED calls), several at once: at most two open, a short queue ──
  await stageBoth(`(w, f) => {
    const kids = w.persons.filter((p) => p.alive && p.parents?.length).sort((x, y) => y.birthTick - x.birthTick);
    const kid = kids.find((k) => k.parents.some((id) => w.byId.get(id)?.alive));
    if (kid) f.occ.noteBirth(w, kid, w.byId.get(kid.parents.find((id) => w.byId.get(id)?.alive)));
    f.occ.callOccasion(w, 'harvest', []);
    f.occ.callOccasion(w, 'market', []);
    for (const o of w.occasions) if (o.status === 'called') (o.until = w.tick + 1 + (o.until - o.at), o.at = w.tick + 1);
    return !!kid;
  }`);
  await advance(2);
  await b.sleep(400);
  const q = await state();
  await b.shot(join(out, '03_two_open_queue.png'));
  const [c1, c2] = q.cards;
  check('several begin together: two cards open, the rest wait', q.cards.length === 2 && q.open === 2 && q.waiting >= 1, { cards: q.cards.map((c) => c.title), waiting: q.waiting });
  check('the two open cards do not overlap', c1 && c2 && overlap(c1.r, c2.r) === 0, { a: c1?.r, b: c2?.r });
  for (const c of q.cards) await clip(join(out, `04_${c.look}.png`), c.r, 40);
  await b.sleep(6400);
  const q2 = await state();
  for (const c of q2.cards) await clip(join(out, `04_${c.look}.png`), c.r, 40);
  check('six UI seconds later the next waiting card opens', q2.cards.length >= 1 && q2.cards.every((c) => !q.cards.some((o) => o.key === c.key)), q2.cards.map((c) => c.title));
  const looks = new Set([...q.cards, ...q2.cards].map((c) => c.look));
  check('distinct looks for the other kinds (birth, harvest, market)', looks.size >= 3, [...looks]);

  // ── 5. a shared building finished (STAGED createBuilding on both worlds) ──
  await b.sleep(6500);
  await stageBoth(`(w, f) => { const fire = w.buildings.find((b) => b.type === 'fire' || b.type === 'hall'); const b = f.createBuilding(w, 'granary', fire.x + 5, fire.y - 4, 0); b.builtBy = w.persons.filter((p) => p.alive).slice(0, 3).map((p) => p.id); return b.id; }`);
  await b.sleep(400);
  const civ = await state();
  const cc = civ.cards.find((c) => c.look === 'look-civic');
  if (cc) await clip(join(out, '05_civic.png'), cc.r, 40);
  check('a shared granary finished gets a card with the builders', cc && cc.title === 'A granary is finished!' && cc.lines[0] === 'For everyone to use' && /^Built by /.test(cc.lines[1] ?? ''), cc);
  await b.sleep(6500);
  const civ2 = await state();
  check('a building has no lasting marker', !civ2.cards.some((c) => c.look === 'look-civic') && !civ2.markers.some((m) => m.key === cc?.key), civ2.markers);

  // ── 6. purity: the shown world and its twin, after every step above ──
  const pure = await b.evaluate(`(() => { const f = window.__ec, w = window.__game.world; return { tick: w.tick, twinTick: f.twin.tick, same: f.hashWorld(w) === f.hashWorld(f.twin), state: f.save.serializeWorld(w) === f.save.serializeWorld(f.twin) }; })()`);
  check('observer purity: the watched world equals its unwatched twin (fingerprint and full state)', pure.same && pure.state && pure.tick === pure.twinTick, pure);

  // ── 7. screen edge, open inspector ──
  // every occasion staged so far runs to its end first, on both worlds, so a kind can be called afresh
  await advance(700);
  await b.sleep(200);
  await stageBoth(`(w, f) => { f.occ.callOccasion(w, 'feast', []); for (const o of w.occasions) if (o.status === 'called') (o.until = w.tick + 1 + (o.until - o.at), o.at = w.tick + 1); return 0; }`);
  await b.evaluate(`(() => { const o = window.__game.world.occasions.find((o) => o.kind === 'feast' && o.status !== 'done'); window.__ec.pending = { x: o.x, y: o.y }; const g = window.__game; const p = window.__ec.project(o.x, o.y); g.fly = null; g.camera = { x: p.sx + ${W / 2 - 30} / 1.2, y: p.sy + ${H / 2 - 30} / 1.2, zoom: 1.2 }; })()`);
  await advance(2);
  await b.sleep(400);
  const edge = await state();
  await b.shot(join(out, '06_screen_edge.png'));
  const ec = edge.cards.find((c) => c.look === 'look-feast');
  check('a venue at the top-left corner: the card stays inside the view', ec && inside(ec.r), { r: ec?.r, venue: edge.venues[ec?.key], occ: edge.occ, cards: edge.cards.map((c) => c.title), open: edge.open, waiting: edge.waiting });
  // the inspector: select someone so the panel opens, with an occasion venue beneath where it sits
  await b.sleep(6500);
  await stageBoth(`(w, f) => { f.occ.callOccasion(w, 'market', []); for (const o of w.occasions) if (o.status === 'called') (o.until = w.tick + 1 + (o.until - o.at), o.at = w.tick + 1); return 0; }`);
  const panelSide = await b.evaluate(`(() => { const g = window.__game; const p = g.world.persons.find((p) => p.alive); g.select(p.id); return p.id; })()`);
  await b.sleep(300);
  const before = await state();
  const insp = before.panels.sort((a, c) => c.w * c.h - a.w * a.h)[0];
  await b.evaluate(`(() => { const o = window.__game.world.occasions.find((o) => o.kind === 'market' && o.status !== 'done'); const g = window.__game; const p = window.__ec.project(o.x, o.y); const ui = document.getElementById('ui').getBoundingClientRect(); const tx = ${insp ? insp.x + insp.w / 2 : W - 200}, ty = ${insp ? insp.y + insp.h / 2 : H / 2}; g.fly = null; g.camera = { x: p.sx - (tx - ui.width / 2) / g.camera.zoom, y: p.sy - (ty - ui.height / 2) / g.camera.zoom, zoom: g.camera.zoom }; })()`);
  await advance(2);
  await b.sleep(700);
  const ip = await state();
  await b.shot(join(out, '07_inspector_open.png'));
  const mc = ip.cards.find((c) => c.look === 'look-market');
  const covered = mc ? ip.panels.reduce((s, p) => s + overlap(mc.r, p), 0) : -1;
  check('with the inspector open over the venue the card sits clear of the panels', mc && covered === 0, { card: mc?.r, panels: ip.panels, selected: panelSide });
  await b.evaluate('window.__game.select(0)');

  // ── 8. narrow screen ──
  await b.sleep(6500);
  await b.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 740, deviceScaleFactor: 1, mobile: true });
  await stageBoth(`(w, f) => { f.occ.callOccasion(w, 'harvest', []); for (const o of w.occasions) if (o.status === 'called') (o.until = w.tick + 1 + (o.until - o.at), o.at = w.tick + 1); return 0; }`);
  await b.evaluate(`(() => { const o = window.__game.world.occasions.find((o) => o.kind === 'harvest' && o.status !== 'done'); const g = window.__game; const p = window.__ec.project(o.x, o.y); g.fly = null; g.camera = { x: p.sx, y: p.sy, zoom: 0.8 }; })()`);
  await advance(2);
  await b.sleep(500);
  const nr = await state();
  await b.send('Page.captureScreenshot', { format: 'png' }).then((r) => writeFileSync(join(out, '08_narrow_375.png'), Buffer.from(r.data, 'base64')));
  const hc = nr.cards.find((c) => c.look === 'look-harvest');
  check('on a 375 px screen the card fits inside the view', hc && hc.r.w <= 375 - 16 && inside(hc.r, 375, 740), hc?.r);
  await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  // ── 9. a flood at top speed: never more than two open, a short queue ──
  await b.sleep(6500);
  await b.evaluate(`(() => { window.__game.setSpeed(16); window.__game.setPlaying(true); })()`);
  await stageBoth(`(w, f) => { const fire = w.buildings.find((b) => b.type === 'fire' || b.type === 'hall'); for (let i = 0; i < 6; i++) f.createBuilding(w, 'storehouse', fire.x - 12 + 4 * i, fire.y + 8, 0); return 0; }`);
  let worst = 0, worstWaiting = 0;
  for (let i = 0; i < 20; i++) { const s = await state(); worst = Math.max(worst, s.cards.length); worstWaiting = Math.max(worstWaiting, s.waiting); await b.sleep(100); }
  check('six buildings at once at top speed: at most two cards open and at most two waiting', worst <= 2 && worstWaiting <= 2, { worst, worstWaiting });
  await b.evaluate('window.__game.setPlaying(false); window.__game.setSpeed(1)');

  // ── 10. loading a save: nothing replayed ──
  const ld = await b.evaluate(`(() => { const f = window.__ec, g = window.__game; const before = { ...window.__eventCards.counts }; const copy = f.save.deserializeWorld(f.save.serializeWorld(g.world)); g.restoreWorld(copy, copy.settings); return before; })()`);
  await b.sleep(500);
  const la = await state();
  check('loading a save replays nothing: no card opens, an occasion under way keeps its marker only', la.cards.length === 0 && la.counts.announced === 0, { before: ld, after: la.counts, markers: la.markers.length });

  // ── 11. reduced motion: the card and icon stay, nothing moves ──
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.evaluate(`(() => { const w = window.__game.world; const a = w.persons.filter((p) => p.alive && !p.partnerId).sort((x, y) => x.birthTick - y.birthTick); window.__ec.occ.noteWedding(w, a[0], a[1]); const o = w.occasions.find((o) => o.kind === 'wedding' && o.status === 'called'); (o.until = w.tick + 1 + (o.until - o.at), o.at = w.tick + 1); const p = window.__ec.project(o.x, o.y); window.__game.fly = null; window.__game.camera = { x: p.sx, y: p.sy, zoom: 1 }; window.__game.advanceTicks(2); })()`);
  await b.sleep(400);
  const rm = await state();
  const rc = rm.cards.find((c) => c.look === 'look-wedding');
  if (rc) await clip(join(out, '09_reduced_motion.png'), rc.r, 40);
  check('reduced motion: the wedding card and its bells show, the bells do not swing and nothing flies', rc && rc.bells === 2 && rc.swing === 'none' && rc.bits === 0, rc);

  // ── 12. the STAGED FIXTURE funeral, in a throwaway copy ──
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await b.evaluate(`(() => { const f = window.__ec, g = window.__game; const copy = f.save.deserializeWorld(f.save.serializeWorld(g.world)); g.restoreWorld(copy, copy.settings); })()`);
  await b.sleep(200);
  await b.evaluate(`(() => { const w = window.__game.world; const dead = { id: 990001, name: 'Orla (fixture)', tick: w.tick - 10, cause: 'fixture', age: 70 }; w.deceased.push(dead); window.__ec.occ.callOccasion(w, 'funeral', [dead.id]); const o = w.occasions.find((o) => o.kind === 'funeral' && o.status === 'called'); (o.until = w.tick + 1 + (o.until - o.at), o.at = w.tick + 1); const p = window.__ec.project(o.x, o.y); window.__game.fly = null; window.__game.camera = { x: p.sx, y: p.sy, zoom: 1 }; window.__game.advanceTicks(2); })()`);
  await b.sleep(500);
  const fu = await state();
  const fc = fu.cards.find((c) => c.look === 'look-funeral');
  if (fc) await clip(join(out, '10_funeral_fixture.png'), fc.r, 40);
  check('a funeral (staged fixture) is quiet: no burst', fc && fc.title === 'A funeral has begun' && fc.bits === 0, fc);

  // ── 13. keyboard: the buttons take focus and Enter works ──
  const kb = await b.evaluate(`(() => { const btn = document.querySelector('.ev-card .ev-watch'); if (!btn) return null; btn.focus(); return { focused: document.activeElement === btn, label: btn.getAttribute('aria-label') }; })()`);
  if (kb) await b.key('Enter', 'Enter', 13);
  await b.sleep(300);
  check('Watch is a labelled button that takes keyboard focus', kb?.focused && /^Watch: /.test(kb?.label ?? ''), kb);
  const pe = await b.evaluate(`(() => ({ layer: getComputedStyle(document.querySelector('.ev-layer')).pointerEvents, tail: document.querySelector('.ev-tail') ? getComputedStyle(document.querySelector('.ev-tail')).pointerEvents : 'none', card: document.querySelector('.ev-card') ? getComputedStyle(document.querySelector('.ev-card')).pointerEvents : null }))()`);
  check('decoration passes clicks through to the map; the card itself takes them', pe.layer === 'none' && pe.tail === 'none' && pe.card === 'auto', pe);
  const errors = b.events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description?.slice(0, 200));
  check('no page errors', errors.length === 0, errors);
} finally {
  writeFileSync(join(out, 'checks.json'), JSON.stringify(checks, null, 2));
  await b.close();
}
const failed = checks.filter((c) => !c.ok).length;
console.log(`${checks.length - failed} of ${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
