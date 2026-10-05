// Presentation checks in a real (headless) Chrome page, against the app's own objects (window.__game, window.__renderer):
//
//   npm run build && npm run preview          # serves dist/ at http://127.0.0.1:4173/
//   node scripts/browser/presentation.mjs http://127.0.0.1:4173/ [result.json]
//
//   1. effects: how many cosmetic events the world logs, against how many the renderer turns into particles, at 1×, 4× and 16×;
//   2. the person card: how many ticks behind the picture it is, sampled every animation frame, at 1×, 4× and 16×;
//   3. drawing and the panels never change the world: the page's state hash equals that of a world stepped to the same tick
//      without ever being drawn.
// A headless Chrome renders in software, so frame rates here are a lower bound, not anyone's laptop. It shows nothing about
// how the page looks: no screenshot is judged.
import { writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const out = process.argv[3];
const b = await launch({ port: 9335 });
const ev = (e) => b.evaluate(e);
const result = { url, when: new Date().toISOString(), runs: [] };
try {
  await b.send('Page.navigate', { url });
  await b.sleep(3500);
  result.env = await ev('({ ua: navigator.userAgent, visibility: document.visibilityState, w: innerWidth, h: innerHeight })');
  if (result.env.visibility !== 'visible') throw new Error('the page is not visible: requestAnimationFrame would not run');

  // counters in the page: events logged by the world, events turned into particles, and each frame the card's tick against the world's
  await ev(`(() => {
    const g = window.__game, fx = window.__renderer.fx;
    const m = (window.__pm = { logged: 0, spawned: 0, ages: [], on: false });
    const push = g.world.fx.push.bind(g.world.fx);
    g.world.fx.push = (...e) => ((m.logged += e.length), push(...e));
    const spawn = fx.spawn.bind(fx);
    fx.spawn = (e) => ((m.spawned += 1), spawn(e));
    const card = document.querySelector('.insp-wrap');
    const f = () => {
      if (m.on && card && card.dataset.mode === 'person' && card.dataset.tick) m.ages.push(g.world.tick - Number(card.dataset.tick));
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    return true;
  })()`);
  // follow somebody who is busy, with their card open
  result.followed = await ev(`(() => { const g = window.__game; const p = g.world.persons.find((q) => q.alive && q.activity) ?? g.world.persons[0]; g.select(p.id); g.setFollow(true); return p.name; })()`);
  if (!result.followed) throw new Error('nobody to follow');

  for (const speed of [1, 4, 16]) {
    await ev(`(window.__game.setPlaying(true), window.__game.setSpeed(${speed}), true)`);
    await b.sleep(2000);
    const a = await ev(`(() => { const m = window.__pm; m.ages = []; m.on = true; return { tick: window.__game.world.tick, logged: m.logged, spawned: m.spawned, t: performance.now() }; })()`);
    await b.sleep(speed === 1 ? 20000 : 12000);
    const z = await ev(`(() => { const m = window.__pm; m.on = false; return { tick: window.__game.world.tick, logged: m.logged, spawned: m.spawned, t: performance.now(), ages: m.ages.slice() }; })()`);
    const ages = z.ages.sort((x, y) => x - y);
    const pct = (q) => (ages.length ? ages[Math.min(ages.length - 1, Math.floor(ages.length * q))] : null);
    const r = {
      speed,
      wallSeconds: +((z.t - a.t) / 1000).toFixed(1),
      ticks: z.tick - a.tick,
      effectsLogged: z.logged - a.logged,
      effectsDrawn: z.spawned - a.spawned,
      cardAgeTicks: { frames: ages.length, mean: ages.length ? +(ages.reduce((s, x) => s + x, 0) / ages.length).toFixed(1) : null, p50: pct(0.5), p95: pct(0.95), max: ages.length ? ages[ages.length - 1] : null },
    };
    result.runs.push(r);
    console.log(JSON.stringify(r));
  }

  // drawing never changed the world: an unseen copy stepped to the same tick has the same state hash
  result.hash = await ev(`(() => {
    const g = window.__game;
    g.setPlaying(false);
    const tick = g.world.tick;
    const unseen = new g.constructor({ ...g.settings });
    unseen.advanceTicks(tick);
    return { tick, page: g.stateHash, unseen: unseen.stateHash, same: g.stateHash === unseen.stateHash };
  })()`);
  console.log(JSON.stringify({ hash: result.hash }));
} finally {
  await b.close();
}
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
