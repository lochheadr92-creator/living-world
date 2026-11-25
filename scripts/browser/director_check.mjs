// The story director (src/ui/director.ts) in the real page: a real requestAnimationFrame loop, real DOM, real CDP clicks, keys and drags.
//
// The world is an ORDINARY Normal river world started by the page. The director is first given up to 45 s of the world's own
// running at top speed to find a noteworthy event by itself (reported as natural, or as none). The two shots the checks depend on
// are then STAGED: a couple of living people are paired, and a person nobody knows is said to have died, each with the
// simulation's own addEvent and its own wording, so that one shot is about a person and one is about a place. Staged events are
// records the director reads exactly as it reads real ones; none of this is spontaneous runtime evidence, it shows how real
// records are presented.
//
// Records screenshots and PASS/FAIL checks for: off by default and the camera not moving by itself, the toggle button and the T
// key, a shot about a person (selected, followed, caption equal to the event's own text, a screen reader announcement), a shot
// about a place (the camera flies there and stays), Next, the director yielding when the viewer selects, drags the map (following
// and not following), or picks a row of the reel, the reel against highlights(), a new world, the stored preference across a
// reload, a 375 px screen, reduced motion and page errors.
//
//   npx vite --port 5391 --strictPort        (in another shell; use the worktree you are checking)
//   node scripts/browser/director_check.mjs --url http://127.0.0.1:5391/ --out <fresh folder>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { launch } from './cdp.mjs';

const { values: opt } = parseArgs({ options: { url: { type: 'string', default: 'http://127.0.0.1:5273/' }, out: { type: 'string' }, cdp: { type: 'string', default: '9391' } } });
if (!opt.out) throw new Error('--out <folder> is required: screenshots and checks.json are written there, not into the repo');
const out = resolve(opt.out);
if (existsSync(out)) throw new Error('Fresh output required: ' + out);
const url = opt.url;
const port = Number(opt.cdp);
const tmp = resolve(tmpdir());
const profile = resolve(join(tmp, 'living-world-director-' + randomUUID()));
if (!profile.startsWith(tmp + sep) || existsSync(profile)) throw new Error('Unsafe temporary profile');
let occupied = false;
try { await fetch(`http://127.0.0.1:${port}/json/version`); occupied = true; } catch { /* free */ }
if (occupied) throw new Error('Browser port in use: ' + port);
mkdirSync(out, { recursive: true });
const W = 1440, H = 900;
const b = await launch({ port, width: W, height: H, profile });
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(detail)}`); };
const note = (text) => { console.log(`NOTE ${text}`); checks.push({ name: 'note', ok: true, detail: text }); };
const shot = (name) => b.shot(join(out, name));

// what the director shows now, read in one go so the pieces agree with each other
const STATE = `(() => {
  const g = window.__game, d = window.__director;
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cap = document.querySelector('.dir-caption');
  const tog = document.querySelector('.dir-toggle');
  const next = document.querySelector('.dir-next');
  const s = d.shot ? { id: d.shot.ev.id, text: d.shot.ev.text, tick: d.shot.ev.tick, subjectId: d.shot.subjectId, x: d.shot.x, y: d.shot.y, age: d.shot.age, rev: d.shot.rev, ambient: d.shot.ambient } : null;
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('living-world:prefs:v1') || '{}'); } catch { return {}; } })();
  return {
    on: tog.getAttribute('aria-pressed') === 'true', shot: s, fresh: d.captionFresh(),
    captionShown: !cap.hidden, captionText: cap.hidden ? null : cap.querySelector('.dir-says').innerText, captionWhen: cap.hidden ? null : cap.querySelector('.dir-when').innerText,
    captionRect: cap.hidden ? null : rect(cap), live: document.querySelector('.dir-layer [role=status]').textContent,
    captionAmbient: cap.classList.contains('is-ambient'), iconColor: getComputedStyle(cap.querySelector('.dir-ico')).color,
    nextDisabled: next.disabled, waiting: d.waiting().length, hasNext: d.hasNext(), counts: { ...d.counts },
    following: g.following, selectedId: g.selectedId, fly: !!g.fly, cam: { ...g.camera }, tick: g.world.tick, playing: g.playing, speed: g.speed,
    prefDirector: prefs.director === true, groupRect: rect(document.querySelector('.dir-ctl')),
  };
})()`;
const state = () => b.evaluate(STATE);
const overlap = (a, c) => Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
const inside = (r, w = W, h = H) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h;
const until = async (fn, ms = 8000, step = 100) => { for (let t = 0; t < ms; t += step) { const v = await fn(); if (v) return v; await b.sleep(step); } return null; };
const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const rectOf = (sel) => b.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
const clickSel = async (sel) => { const r = await rectOf(sel); if (!r) throw new Error('nothing to click: ' + sel); const c = center(r); await b.click(c.x, c.y); };
/** a real press, drag and release on the map, away from every panel */
const dragMap = async (x = 620, y = 380) => {
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 6; i++) await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 12 * i, y: y + 5 * i, button: 'left' });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 72, y: y + 30, button: 'left', clickCount: 1 });
};
/** a real turn of the wheel at a point off the middle of the view, which zooms in toward the cursor and so moves the view's centre */
const wheelMap = async (x = 300, y = 300) => { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: -240 }); };
const pressT = () => b.key('t', 'KeyT', 84);
/** stage a record with the simulation's own addEvent, in the shown world (STAGED; see the head of this file) */
const stage = (what, n = 0) => b.evaluate(`(() => {
  const f = window.__dc, w = window.__game.world;
  if (${JSON.stringify(what)} === 'ambient') {
    // an ordinary social event the settlement's record would not keep (nobody's wedding, peace or tradition), about two living people
    const live = w.persons.filter((p) => p.alive).sort((a, c) => a.id - c.id);
    const p = live[7 + ${n}], q = live[8 + ${n}];
    const text = p.name + ' gave 2 berries to ' + q.name + '.';
    f.addEvent(w, 'social', text, [p.id, q.id], p.x, p.y);
    return { id: w.events[w.events.length - 1].id, person: p.id, text };
  }
  if (${JSON.stringify(what)} === 'couple') {
    const live = w.persons.filter((p) => p.alive).sort((a, c) => a.id - c.id);
    const p = live[3], q = live[4];
    f.addEvent(w, 'life', p.name + ' and ' + q.name + ' became a couple.', [p.id, q.id], p.x, p.y);
    return { id: w.events[w.events.length - 1].id, person: p.id };
  }
  if (${JSON.stringify(what)} === 'builds') {
    const p = w.persons.filter((p) => p.alive).sort((a, c) => a.id - c.id)[5];
    const ids = [];
    for (let i = 0; i < 2; i++) { f.addEvent(w, 'build', p.name + ' finished a hut.', [p.id], p.x, p.y); ids.push(w.events[w.events.length - 1].id); }
    return { ids, person: p.id };
  }
  const x = Math.round(w.camp.x) + 9, y = Math.round(w.camp.y) - 7;
  f.addEvent(w, 'life', 'Orla (fixture) died (fixture), aged 70.', [999001], x, y);
  return { id: w.events[w.events.length - 1].id, x, y };
})()`);
const waitShot = (id, ms = 6000) => until(async () => { const s = await state(); return s.shot?.id === id ? s : null; }, ms, 50);
/** a toast (the first-run tip lasts eight seconds, the director's own about three) is a transient panel over the bottom of the map: let it go before clicking there */
const quiet = () => until(async () => (await b.evaluate(`document.querySelectorAll('.dock-toasts .toast').length`)) === 0, 15000, 200);
const toastRects = () => b.evaluate(`[...document.querySelectorAll('.dock-toasts .toast')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, text: el.innerText }; })`);

try {
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await b.send('Page.navigate', { url });
  for (let n = 0; n < 150 && !(await b.evaluate('!!window.__game && !!window.__ui && !!window.__director')); n++) await b.sleep(100);
  await b.evaluate(`(async () => {
    const events = await import('/src/sim/events.ts');
    const model = await import('/src/ui/director_model.ts');
    const env = await import('/src/sim/environment.ts');
    const { project } = await import('/src/render/iso.ts');
    window.__dc = { addEvent: events.addEvent, model, env, project };
  })()`);
  await b.sleep(2000);

  // ── 1. off by default; the camera does not move by itself ──
  const s0 = await state();
  check('the director is off by default (button not pressed, no caption, nothing stored)', !s0.on && !s0.captionShown && !s0.prefDirector && s0.shot === null, s0);
  await b.evaluate('window.__game.setSpeed(4); window.__game.setPlaying(true)');
  const camA = (await state()).cam;
  await b.sleep(2500);
  const s1 = await state();
  check('with it off the world runs and the camera, the selection and the follow stay where they were', Math.hypot(s1.cam.x - camA.x, s1.cam.y - camA.y) < 0.5 && s1.selectedId === 0 && !s1.following && s1.tick > s0.tick, { camA, cam: s1.cam, selected: s1.selectedId, following: s1.following, ticks: s1.tick - s0.tick });
  const ctl = await b.evaluate(`(() => { const t = document.querySelector('.dir-toggle'); const r = document.querySelector('.dir-reel-btn'); return { toggle: t.getAttribute('aria-label'), pressed: t.getAttribute('aria-pressed'), tip: t.getAttribute('data-tip'), reel: r.getAttribute('aria-label'), reelTip: r.getAttribute('data-tip'), tag: t.tagName }; })()`);
  check('the controls are labelled buttons with a tip, and the reel button is there with the director off', ctl.tag === 'BUTTON' && ctl.toggle === 'Director' && ctl.pressed === 'false' && /camera/i.test(ctl.tip) && ctl.reel === 'What happened' && /three days/.test(ctl.reelTip), ctl);
  await shot('01_off.png');

  // ── 2. turn it on with the button; wait for a shot from the world's own running ──
  await clickSel('.dir-toggle');
  await b.sleep(350);
  const on1 = await state();
  check('the button turns it on (pressed, remembered in the stored preferences)', on1.on && on1.prefDirector, on1);
  await b.evaluate('window.__game.setSpeed(16)');
  const natural = await until(async () => { const s = await state(); return s.counts.shown >= 1 ? s : null; }, 45000, 100);
  if (natural) {
    const kind = natural.shot.subjectId ? 'about a person' : natural.shot.x || natural.shot.y ? 'about a place' : 'with no place (caption only)';
    note(`a natural shot arrived from the world's own running: "${natural.shot.text}" ${kind}`);
    check('a natural shot: the caption is exactly the event\'s own text, announced to screen readers', natural.captionShown && natural.captionText === natural.shot.text && natural.live === natural.shot.text, { caption: natural.captionText, text: natural.shot.text, live: natural.live });
    if (natural.shot.subjectId) check('a natural shot about a person: that person is selected and followed', natural.following && natural.selectedId === natural.shot.subjectId, { following: natural.following, selected: natural.selectedId, subject: natural.shot.subjectId });
    await shot('02_natural_shot.png');
  } else note('no noteworthy event arrived by itself within 45 s at 16x; the shots below are staged');
  await b.evaluate('window.__game.setSpeed(1)');
  // let any shot from the running world finish its hold, then start clean
  await b.evaluate('window.__game.setPlaying(false)');
  await b.sleep(300);

  // ── 3. a shot about a person (STAGED couple) ──
  const couple = await stage('couple');
  await b.sleep(120);
  // a natural shot may still be up (MIN_HOLD, and a heavier event cuts in after MIN_CUT): wait for ours
  const ps = await waitShot(couple.id, 12000);
  const wantText = ps ? await b.evaluate(`window.__game.world.events.find((e) => e.id === ${couple.id}).text`) : null;
  check('the staged couple becomes the shot, about the first of them', !!ps && ps.shot.subjectId === couple.person, { ps: ps && ps.shot, couple });
  if (ps) {
    check('the camera is on them: selected and following', ps.following && ps.selectedId === ps.shot.subjectId, { following: ps.following, selected: ps.selectedId });
    check('the caption is exactly the event\'s own text, with when it happened, and the screen reader hears it', ps.captionShown && ps.captionText === wantText && ps.live === wantText && /^Day \d+, /.test(ps.captionWhen), { caption: ps.captionText, want: wantText, live: ps.live, when: ps.captionWhen });
    const panels = await b.evaluate(`[...document.querySelectorAll('#ui .glass')].filter((el) => !el.closest('.dir-layer') && !el.closest('.dir-ctl') && !el.classList.contains('toast') && el.getBoundingClientRect().width > 4 && el.getBoundingClientRect().height > 4).map((el) => { const r = el.getBoundingClientRect(); return { cls: el.className.slice(0, 30), x: r.left, y: r.top, w: r.width, h: r.height }; })`);
    const hits = panels.filter((p) => overlap(ps.captionRect, p) > 0);
    check('the caption covers neither the feed nor the inspector nor any other panel', hits.length === 0 && inside(ps.captionRect), { caption: ps.captionRect, hits });
    const both = await b.evaluate(`(() => { const c = document.querySelector('.dir-caption').getBoundingClientRect(); return { c: { x: c.left, y: c.top, w: c.width, h: c.height } }; })()`);
    const toasts = await toastRects();
    if (toasts.length) check('a toast stacks above the caption, not over its buttons', toasts.every((t) => overlap(both.c, t) === 0), { caption: both.c, toasts });
    else note('no toast was showing when the caption was checked');
    await b.sleep(500);
    await shot('03_person_shot.png');
  }

  // ── 4. Next: two lighter events at once (STAGED), so one is the shot and one waits ──
  await quiet();
  const pre = await state();
  const nxt = await b.evaluate(`(() => { const n = document.querySelector('.dir-next'); return { disabled: n.disabled, label: n.getAttribute('aria-label') }; })()`);
  check('Next is a labelled button, disabled when there is nothing to go to (no worthy event waiting and no ordinary candidate)', /^Next/.test(nxt.label) && nxt.disabled === !pre.hasNext, { nxt, waiting: pre.waiting, hasNext: pre.hasNext });
  // the shot up now has held for MIN_HOLD (6 s), so the first of the two takes its place at once
  await until(async () => { const s = await state(); return !s.shot || s.shot.age >= 6.2 ? s : null; }, 12000, 100);
  const builds = await stage('builds');
  await b.sleep(300);
  const pre2 = await state();
  check('two events at once: the heavier-or-older is the shot, the other waits, and Next is enabled', pre2.shot?.id === builds.ids[0] && pre2.waiting === 1 && !pre2.nextDisabled, { shot: pre2.shot && pre2.shot.id, ids: builds.ids, waiting: pre2.waiting, nextDisabled: pre2.nextDisabled });
  await clickSel('.dir-next');
  await b.sleep(300);
  const post = await state();
  check('Next takes the waiting event at once', post.shot?.id === builds.ids[1] && post.counts.shown === pre2.counts.shown + 1 && post.nextDisabled === !post.hasNext, { before: pre2.counts, after: post.counts, shot: post.shot && post.shot.id });

  // ── 5. a shot about a place (STAGED death of someone not in the world): the camera flies there and stays ──
  const second = await stage('place');
  const place = await waitShot(second.id, 14000);
  check('a death of someone who is not here becomes a shot of the place (no subject)', !!place && place.shot.subjectId === 0, place && place.shot);
  if (place) {
    const aim = await b.evaluate(`(() => { const p = window.__dc.project(${second.x}, ${second.y}); return { x: p.sx, y: p.sy }; })()`);
    const landed = await until(async () => { const s = await state(); return !s.fly && Math.hypot(s.cam.x - aim.x, s.cam.y - aim.y) < 6 ? s : null; }, 6000, 100);
    check('the camera flew to the place and is on it', !!landed, { cam: (await state()).cam, aim });
    check('the selection is cleared and the camera is not following anybody', !!landed && landed.selectedId === 0 && !landed.following, landed && { selected: landed.selectedId, following: landed.following });
    check('the caption is that event\'s own words', place.captionText === 'Orla (fixture) died (fixture), aged 70.', place.captionText);
    await shot('04_place_shot.png');
    const still = await state();
    check('the director is still on while holding the place', still.on, still.on);
    // a turn of the wheel with the cursor off the middle moves the view; with no follow and no game event, that is read from where the camera is
    await wheelMap();
    await b.sleep(400);
    const wheeled = await state();
    check('a wheel turn at the cursor over a place shot moves the view, which turns the director off', !wheeled.on && !wheeled.prefDirector && wheeled.cam.zoom > still.cam.zoom, { on: wheeled.on, zoom: [still.cam.zoom, wheeled.cam.zoom] });
    // and a drag, the same way, on a fresh place shot
    await pressT();
    await b.sleep(350);
    const third = await stage('place');
    const place2 = await waitShot(third.id, 14000);
    const aim2 = await b.evaluate(`(() => { const p = window.__dc.project(${third.x}, ${third.y}); return { x: p.sx, y: p.sy }; })()`);
    const landed2 = await until(async () => { const s = await state(); return !s.fly && Math.hypot(s.cam.x - aim2.x, s.cam.y - aim2.y) < 6 ? s : null; }, 6000, 100);
    check('a second place shot: the camera flies there again', !!place2 && !!landed2 && landed2.on, { on: landed2 && landed2.on });
    // a drag while NOT following clears the fly without a game event: read from where the camera is
    await dragMap();
    await b.sleep(400);
    const dragged = await state();
    check('the viewer dragging the map off a place shot turns the director off', !dragged.on && !dragged.prefDirector, { on: dragged.on, pref: dragged.prefDirector });
  }

  // ── 6. the T key turns it on; a drag while following turns it off ──
  await b.evaluate('window.__game.setPlaying(false)');
  await pressT();
  await b.sleep(350);
  const t1 = await state();
  check('the T key turns the director on', t1.on && t1.prefDirector, t1);
  const couple2 = await stage('couple');
  await b.sleep(120);
  const f1 = await waitShot(couple2.id, 8000);
  check('a new shot about a person: followed again', !!f1 && f1.following && f1.selectedId === f1.shot.subjectId, f1 && { following: f1.following, selected: f1.selectedId });
  // zooming while following leaves the camera on the person: not the viewer taking it
  await wheelMap();
  await b.sleep(400);
  const z1 = await state();
  check('a wheel turn while it follows does not end it: the camera is still on the person', z1.on && z1.following && z1.selectedId === f1?.shot?.subjectId && z1.cam.zoom > (f1?.cam.zoom ?? 99), { on: z1.on, following: z1.following, zoom: [f1 && f1.cam.zoom, z1.cam.zoom] });
  await dragMap(560, 330);
  await b.sleep(400);
  const d1 = await state();
  check('the viewer dragging the map while it follows turns the director off and the follow stops', !d1.on && !d1.following && !d1.captionShown, { on: d1.on, following: d1.following, caption: d1.captionShown });
  const toast = await b.evaluate(`document.querySelector('.dock-toasts')?.innerText ?? ''`);
  check('it says so: the camera is the viewer\'s', /Director off/.test(toast), toast);
  await pressT();
  await b.sleep(250);
  await pressT();
  await b.sleep(500);
  const tt = await state();
  check('the T key toggles both ways', !tt.on && !tt.prefDirector, tt);

  // ── 7. a selection by the viewer turns it off; Esc and the minimap are the viewer too ──
  await pressT();
  await b.sleep(250);
  const couple3 = await stage('couple');
  await b.sleep(120);
  const f2 = await waitShot(couple3.id, 8000);
  const other = await b.evaluate(`(() => { const g = window.__game; return g.world.persons.filter((p) => p.alive && p.id !== ${f2?.shot?.subjectId ?? 0})[0].id; })()`);
  await b.evaluate(`window.__game.select(${other})`);
  await b.sleep(300);
  const sel = await state();
  check('the viewer selecting someone else turns the director off, and keeps their selection', !!f2 && !sel.on && sel.selectedId === other, { on: sel.on, selected: sel.selectedId, other });

  // ── 7b. quiet stretches: an ordinary event the record would not keep gives the director someone to follow ──
  await b.evaluate('window.__game.setPlaying(false); window.__game.select(0)');
  await b.sleep(200);
  await pressT();
  await b.sleep(500);
  const amb = await stage('ambient', 0);
  const a1 = await waitShot(amb.id, 4000);
  check('with no shot up, an ordinary event about a living person is the shot at once, flagged ambient', !!a1 && a1.shot.ambient && a1.shot.subjectId === amb.person && a1.counts.ambient === 1 && a1.counts.shown === 1, a1 && { shot: a1.shot, counts: a1.counts });
  check('its caption is the event\'s own words, on the quieter style (a muted icon), with the camera on that person', !!a1 && a1.captionShown && a1.captionText === amb.text && a1.captionAmbient && !!ps && a1.iconColor !== ps.iconColor && a1.following && a1.selectedId === amb.person, a1 && { caption: a1.captionText, text: amb.text, ambientClass: a1.captionAmbient, icon: [ps && ps.iconColor, a1.iconColor], following: a1.following, selected: a1.selectedId });
  await shot('03b_ambient_shot.png');
  const amb2 = await stage('ambient', 1);
  await b.sleep(2500);
  const hold = await state();
  check('a second ordinary event does not replace the shot while it is young, and Next has it to go to', hold.shot?.id === amb.id && hold.hasNext && !hold.nextDisabled, { shot: hold.shot && hold.shot.id, hasNext: hold.hasNext, nextDisabled: hold.nextDisabled });
  let lastAge = 0;
  let swapped = null;
  for (let t = 0; t < 30000 && !swapped; t += 100) {
    const s = await state();
    if (s.shot?.id === amb2.id) swapped = s;
    else { lastAge = s.shot?.age ?? lastAge; await b.sleep(100); }
  }
  check('it takes over once the shot has been up IDLE_SECONDS (20 s of UI time)', !!swapped && swapped.shot.ambient && lastAge >= 19 && lastAge <= 20.5 && swapped.counts.ambient === 2, { lastAge, counts: swapped && swapped.counts });
  // a worthy event takes an ambient shot after MIN_CUT (3 s), not after the whole of MIN_HOLD (6 s)
  const cut = await stage('couple');
  const t0 = Date.now();
  const cutState = await waitShot(cut.id, 8000);
  const took = Date.now() - t0;
  check('a worthy event cuts an ambient shot after about MIN_CUT (3 s), not MIN_HOLD (6 s)', !!cutState && !cutState.shot.ambient && took >= 2500 && took < 5500, { took });
  await pressT();
  await b.sleep(500);
  await b.evaluate('window.__game.select(0)');

  // ── 8. the reel, with the director off ──
  await b.evaluate('window.__game.setPlaying(false); window.__game.select(0)');
  await quiet();
  await clickSel('.dir-reel-btn');
  await b.sleep(300);
  const reel = await b.evaluate(`(() => {
    const g = window.__game, f = window.__dc, w = g.world;
    const want = f.model.highlights(w, w.tick - 3 * 2400, 8);
    const pop = document.querySelector('.dir-reel');
    const rows = [...document.querySelectorAll('.dir-row')].map((r) => ({ text: r.querySelector('.dir-row-text').innerText, day: r.querySelector('.dir-row-day').innerText, label: r.getAttribute('aria-label') }));
    const r = pop.getBoundingClientRect();
    return { open: !pop.hidden, expanded: document.querySelector('.dir-reel-btn').getAttribute('aria-expanded'), rows, want: want.map((e) => ({ text: e.text, day: 'Day ' + window.__dc.env.dayNumber(e.tick) })), rect: { x: r.left, y: r.top, w: r.width, h: r.height }, empty: !document.querySelector('.dir-empty').hidden, same: want.length === rows.length && want.every((e, i) => e.text === rows[i].text) };
  })()`);
  check('the reel opens with the director off and lists exactly highlights(world, tick - 3 days, 8), each with its day', reel.open && reel.expanded === 'true' && reel.rows.length > 0 && reel.same && reel.rows.every((r, i) => r.day === reel.want[i].day) && reel.rows.length <= 8, reel);
  check('the reel stays inside the view', inside(reel.rect), reel.rect);
  await shot('05_reel.png');
  await b.key('Escape', 'Escape', 27);
  await b.sleep(200);
  const esc = await b.evaluate(`({ hidden: document.querySelector('.dir-reel').hidden, expanded: document.querySelector('.dir-reel-btn').getAttribute('aria-expanded') })`);
  check('Esc closes the reel', esc.hidden && esc.expanded === 'false', esc);

  // ── 9. a row of the reel is the viewer taking the camera: the director turns off, and the camera goes there ──
  await pressT();
  await b.sleep(250);
  const on9 = await state();
  await quiet();
  await clickSel('.dir-reel-btn');
  await b.sleep(300);
  const row = await b.evaluate(`(() => {
    const g = window.__game, f = window.__dc, w = g.world;
    const want = f.model.highlights(w, w.tick - 3 * 2400, 8);
    const last = want[want.length - 1];
    const target = last.ids.find((id) => w.byId.has(id)) ?? 0;
    return { text: last.text, target, x: last.x, y: last.y, rows: document.querySelectorAll('.dir-row').length };
  })()`);
  const lastRow = await rectOf('.dir-list li:last-child .dir-row');
  const lc = center(lastRow);
  await b.click(lc.x, lc.y);
  await b.sleep(500);
  const jumped = await state();
  check('choosing a row of the reel while the director is on turns it off and closes the reel', on9.on && !jumped.on && !(await b.evaluate(`!document.querySelector('.dir-reel').hidden`)), { was: on9.on, now: jumped.on });
  check('and takes the camera to it, the way a row of the feed does (the person selected, or a fly to the place)', row.target ? jumped.selectedId === row.target : jumped.fly || jumped.cam.x !== on9.cam.x, { row, selected: jumped.selectedId, fly: jumped.fly });

  // ── 10. a new world: the director stays on, shows nothing from history, and the empty reel says so ──
  await pressT();
  await b.sleep(250);
  await b.evaluate(`window.__game.restart({ seed: 'director-empty' })`);
  await b.sleep(900);
  const nw = await state();
  check('a new world: still on (the game\'s own selection change is not the viewer), no shot from history', nw.on && nw.shot === null && !nw.captionShown && nw.counts.shown === 0, nw);
  await quiet();
  await clickSel('.dir-reel-btn');
  await b.sleep(300);
  const empty = await b.evaluate(`(() => { const w = window.__game.world; const n = window.__dc.model.reelOf(w).length; const e = document.querySelector('.dir-empty'); return { n, shown: !e.hidden, text: e.innerText, rows: document.querySelectorAll('.dir-row').length }; })()`);
  check('with nothing notable the reel says "Nothing notable in the last three days."', empty.n === 0 ? empty.shown && empty.text === 'Nothing notable in the last three days.' && empty.rows === 0 : empty.rows === empty.n, empty);
  await b.key('Escape', 'Escape', 27);
  const live2 = await stage('couple');
  await b.sleep(120);
  const fresh = await waitShot(live2.id, 8000);
  check('and it watches the new world', !!fresh && fresh.on, fresh && fresh.shot);

  // ── 11. a narrow screen: controls, caption and reel stay inside; the caption is clear of the inspector ──
  await b.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 740, deviceScaleFactor: 1, mobile: true });
  await b.sleep(500);
  const live3 = await stage('couple');
  await b.sleep(120);
  const nr = await waitShot(live3.id, 14000);
  await b.sleep(500);
  const nrs = await state();
  const nrPanels = await b.evaluate(`[...document.querySelectorAll('#ui .glass')].filter((el) => !el.closest('.dir-layer') && !el.closest('.dir-ctl') && !el.classList.contains('toast') && el.getBoundingClientRect().width > 4 && el.getBoundingClientRect().height > 4).map((el) => { const r = el.getBoundingClientRect(); return { cls: el.className.slice(0, 30), x: r.left, y: r.top, w: r.width, h: r.height }; })`);
  await b.send('Page.captureScreenshot', { format: 'png' }).then((r) => writeFileSync(join(out, '06_narrow_375.png'), Buffer.from(r.data, 'base64')));
  check('on a 375 px screen the caption and the controls are inside the view', !!nr && nrs.captionShown && !!nrs.captionRect && inside(nrs.captionRect, 375, 740) && inside(nrs.groupRect, 375, 740), { caption: nrs.captionRect, group: nrs.groupRect });
  check('and the caption covers no other panel (the inspector stops above it)', !!nr && !!nrs.captionRect && nrPanels.every((p) => overlap(nrs.captionRect, p) === 0), nrs.captionRect && nrPanels.filter((p) => overlap(nrs.captionRect, p) > 0));
  const nbtns = await b.evaluate(`[...document.querySelectorAll('.dock-bottom button, .dock-bottom summary')].map((el) => { const r = el.getBoundingClientRect(); return { name: el.getAttribute('aria-label') || el.innerText, x: Math.round(r.left), w: Math.round(r.width), y: Math.round(r.top), h: Math.round(r.height) }; })`);
  check('every control along the bottom edge is inside a 375 px view', nbtns.every((r) => r.x >= 0 && r.x + r.w <= 375 && r.y >= 0 && r.y + r.h <= 740), nbtns.filter((r) => r.x < 0 || r.x + r.w > 375));
  await quiet();
  await clickSel('.dir-reel-btn');
  await b.sleep(300);
  const nrReel = await rectOf('.dir-reel');
  await b.send('Page.captureScreenshot', { format: 'png' }).then((r) => writeFileSync(join(out, '07_narrow_reel.png'), Buffer.from(r.data, 'base64')));
  check('the reel fits a 375 px view', nrReel && inside(nrReel, 375, 740), nrReel);
  await b.key('Escape', 'Escape', 27);
  await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await b.sleep(400);

  // ── 12. reduced motion: the caption has no entrance animation ──
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const live4 = await stage('couple');
  await b.sleep(120);
  const rmState = await waitShot(live4.id, 14000);
  const anim = await b.evaluate(`getComputedStyle(document.querySelector('.dir-caption')).animationName`);
  check('reduced motion: the caption shows without its entrance animation', !!rmState && rmState.captionShown && anim === 'none', { anim });
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  // ── 13. the preference is remembered across a reload; the help and shortcuts mention it ──
  await b.evaluate('window.__game.setPlaying(false)');
  await b.sleep(400);
  const before = await state();
  await b.send('Page.reload');
  for (let n = 0; n < 150 && !(await b.evaluate('!!window.__game && !!window.__ui && !!window.__director')); n++) await b.sleep(100);
  await b.sleep(800);
  const reloaded = await state();
  check('on when it was left on: the stored preference is restored on reload, with no shot from history', before.on && reloaded.on && reloaded.shot === null, { before: before.on, after: reloaded.on, shot: reloaded.shot });
  await pressT();
  await b.sleep(400);
  await b.send('Page.reload');
  for (let n = 0; n < 150 && !(await b.evaluate('!!window.__game && !!window.__ui && !!window.__director')); n++) await b.sleep(100);
  await b.sleep(600);
  const reloaded2 = await state();
  check('and off when it was left off', !reloaded2.on && !reloaded2.prefDirector, reloaded2.on);
  await b.key('?', 'Slash', 191);
  await b.sleep(300);
  const help = await b.evaluate(`[...document.querySelectorAll('.help-row')].map((r) => r.innerText.replace(/\\s+/g, ' ')).find((t) => /director/i.test(t)) ?? null`);
  check('the help panel lists the T key for the director', !!help && /^T /.test(help), help);
  await b.key('Escape', 'Escape', 27);

  const errors = b.events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description?.slice(0, 200));
  const logged = b.events.filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error').map((e) => (e.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  check('no page errors and no interface part logged a failure', errors.length === 0 && !logged.some((t) => /\[ui\]/.test(t)), { errors, logged: logged.slice(0, 5) });
} finally {
  writeFileSync(join(out, 'checks.json'), JSON.stringify(checks, null, 2));
  await b.close();
}
const failed = checks.filter((c) => !c.ok).length;
console.log(`${checks.length - failed} of ${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
