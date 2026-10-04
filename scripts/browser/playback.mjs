// Playback measurements in a real (headless) Chrome page: the real requestAnimationFrame loop and real keyboard events.
//
//   npm run build && npm run preview          # serves dist/ at http://127.0.0.1:4173/
//   node scripts/browser/playback.mjs http://127.0.0.1:4173/ [result.json]
//
// It measures, against the app's own clock (window.__game):
//   1. the speed actually achieved at 1×, 2×, 4×, 8× and 16× over ten-odd seconds each, with frame times;
//   2. a deliberate stall (the page's main thread blocked for 3 s, then 8 s) at 4×: how many ticks ran, how many were given up and
//      counted, whether the world bursts to catch up afterwards, and what the on-screen speed readout says;
//   3. pause (the canvas must not change at all), single step (exactly one tick, by the real "." key) and resume.
// What it cannot show: how a particular machine's GPU, display or a foreground browser window behaves. A headless Chrome renders in
// software, so the frame rate here is a lower bound for the drawing, not a measurement of anyone's laptop.
import { writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const out = process.argv[3];
const result = { url, when: new Date().toISOString(), env: {} };
const b = await launch({ port: 9334 });
const ev = (e) => b.evaluate(e);
const readout = () =>
  ev(`(() => { const r = document.querySelector('.pb-rate'), n = document.querySelector('.pb-note'), pb = document.querySelector('.playback'); return { rate: r ? r.innerText : null, note: n && !n.hidden ? n.innerText : '', behind: pb ? pb.classList.contains('is-behind') : null, hidden: pb ? pb.hidden : null, paused: !!document.querySelector('.paused-tag:not([hidden])') }; })()`);
try {
  await b.send('Page.navigate', { url });
  await b.sleep(3500);
  result.env = await ev('({ ua: navigator.userAgent, visibility: document.visibilityState, w: innerWidth, h: innerHeight, cores: navigator.hardwareConcurrency })');
  if (result.env.visibility !== 'visible') throw new Error('the page is not visible: requestAnimationFrame would not run, so nothing here would mean anything');

  // an in-page recorder of frame intervals from the real rAF loop
  await ev(`(() => {
    window.__rec = { frames: [], last: performance.now() };
    const f = (t) => { const r = window.__rec; r.frames.push(t - r.last); r.last = t; if (r.frames.length > 20000) r.frames.shift(); requestAnimationFrame(f); };
    requestAnimationFrame(f);
    return true;
  })()`);

  const measure = async (label, ms) => {
    const a = await ev(`({ tick: window.__game.world.tick, t: performance.now(), dropped: window.__game.droppedTicks, n: window.__rec.frames.length })`);
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await b.sleep(1000);
      samples.push(await ev('(() => { const s = window.__game.playbackStats(); return { requested: s.requested, achieved: +s.achieved.toFixed(3), behind: s.behind, dropped: s.dropped, lastFrameTicks: s.lastFrameTicks, playing: s.playing }; })()'));
    }
    const z = await ev(`({ tick: window.__game.world.tick, t: performance.now(), dropped: window.__game.droppedTicks, n: window.__rec.frames.length })`);
    const frames = await ev(`window.__rec.frames.slice(${a.n}).sort((x, y) => x - y)`);
    const pct = (q) => (frames.length ? +frames[Math.min(frames.length - 1, Math.floor(frames.length * q))].toFixed(1) : null);
    const wall = (z.t - a.t) / 1000;
    const r = {
      label,
      wallSeconds: +wall.toFixed(2),
      ticks: z.tick - a.tick,
      achievedMultiplier: +((z.tick - a.tick) / wall / 10).toFixed(3),
      droppedTicks: Math.round(z.dropped - a.dropped),
      frames: frames.length,
      fps: +(frames.length / wall).toFixed(1),
      frameMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: frames.length ? +frames[frames.length - 1].toFixed(1) : null },
      statsSamples: samples,
    };
    r.readout = await readout();
    console.log(JSON.stringify({ ...r, statsSamples: samples.map((s) => `${s.requested}x→${s.achieved}${s.behind ? '(behind)' : ''}`).join(' ') }));
    return r;
  };

  result.runs = [];
  // 1. ordinary playback at 1×, then each speed up to the maximum
  await ev('(window.__game.setPlaying(true), window.__game.setSpeed(1), true)');
  await b.sleep(1500);
  result.runs.push(await measure('ordinary 1x', 15000));
  for (const sp of [2, 4, 8, 16]) {
    await ev(`(window.__game.setSpeed(${sp}), true)`);
    await b.sleep(2500);
    result.runs.push(await measure(`${sp}x`, 10000));
  }

  // 2. a deliberate stall at 4×
  await ev('(window.__game.setSpeed(4), true)');
  await b.sleep(3000);
  result.stalls = [];
  for (const stallMs of [3000, 8000]) {
    const before = await ev('({ tick: window.__game.world.tick, dropped: window.__game.droppedTicks })');
    await ev(`(() => { const t = performance.now(); while (performance.now() - t < ${stallMs}); return true; })()`);
    await b.sleep(120); // let the first frames after the stall happen
    const right = await ev('({ tick: window.__game.world.tick, dropped: window.__game.droppedTicks, lastFrameTicks: window.__game.lastFrameTicks, stats: window.__game.playbackStats() })');
    const burst = [];
    let readoutSoon = null;
    for (let i = 0; i < 12; i++) {
      await b.sleep(250);
      burst.push(await ev('window.__game.lastFrameTicks'));
      if (i === 3) readoutSoon = await readout(); // about a second after the stall
    }
    await b.sleep(2500);
    const after = await ev('({ tick: window.__game.world.tick, stats: window.__game.playbackStats() })');
    const later = await readout();
    const s = {
      stallMs,
      ticksWhileAndJustAfterStall: right.tick - before.tick,
      ticksThatWallTimeOwed: Math.round((stallMs / 1000) * 4 * 10),
      droppedByStall: Math.round(right.dropped - before.dropped),
      maxTicksInAFrameAfterwards: Math.max(...burst),
      readoutAboutASecondAfter: readoutSoon,
      readoutAboutFiveSecondsAfter: later,
      statsAfter: { requested: after.stats.requested, achieved: +after.stats.achieved.toFixed(3), behind: after.stats.behind },
    };
    console.log('stall', JSON.stringify(s));
    result.stalls.push(s);
  }

  // 3. pause, single step and resume through the real keyboard path, reading the canvas itself
  await ev('(window.__game.setSpeed(1), true)');
  await b.sleep(1500);
  const canvasHash = (region) =>
    ev(`(() => { const c = document.querySelector('canvas'); const x = c.getContext('2d'); const r = ${JSON.stringify(region)}; const d = x.getImageData(r[0], r[1], r[2], r[3]).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h = Math.imul(h ^ d[i], 16777619); h = Math.imul(h ^ d[i + 1], 16777619); h = Math.imul(h ^ d[i + 2], 16777619); } return (h >>> 0).toString(16); })()`);
  const REGION = [0, 0, result.env.w, result.env.h]; // the whole world canvas (the interface is DOM, not canvas)
  result.pause = {};
  const control = new Set(); // while playing, the picture must keep changing, or "unchanged while paused" would prove nothing
  for (let i = 0; i < 8; i++) {
    control.add(await canvasHash(REGION));
    await b.sleep(130);
  }
  result.pause.controlDistinctFramesWhilePlaying = control.size;
  console.log('control: distinct canvas frames in 8 samples while playing =', control.size);
  await b.key(' ', 'Space', 32);
  await b.sleep(400);
  const p0 = await ev('({ playing: window.__game.playing, tick: window.__game.world.tick })');
  const h0 = await canvasHash(REGION);
  await b.sleep(3000);
  const p1 = await ev('({ playing: window.__game.playing, tick: window.__game.world.tick })');
  const h1 = await canvasHash(REGION);
  result.pause.paused = { stateBefore: p0, stateAfter3s: p1, canvasSame: h0 === h1, h0, h1 };
  result.pause.readoutWhilePaused = await readout();
  console.log('paused', JSON.stringify(result.pause.paused), 'readout', JSON.stringify(result.pause.readoutWhilePaused));
  const stepResults = [];
  for (let i = 0; i < 5; i++) {
    const t0 = await ev('window.__game.world.tick');
    const hPrev = await canvasHash(REGION);
    await b.key('.', 'Period', 190);
    await b.sleep(450);
    const t1 = await ev('({ tick: window.__game.world.tick, playing: window.__game.playing })');
    const ha = await canvasHash(REGION);
    await b.sleep(1200);
    const hb = await canvasHash(REGION);
    stepResults.push({ tickBefore: t0, tickAfter: t1.tick, playingAfter: t1.playing, canvasChangedByStep: hPrev !== hb, canvasSettled: ha === hb });
  }
  result.pause.steps = stepResults;
  console.log('steps', JSON.stringify(stepResults));
  await b.key(' ', 'Space', 32);
  await b.sleep(3500);
  result.pause.resumed = await ev('(() => { const s = window.__game.playbackStats(); return { playing: s.playing, requested: s.requested, achieved: +s.achieved.toFixed(3), tick: window.__game.world.tick }; })()');
  console.log('resumed', JSON.stringify(result.pause.resumed));
  result.readoutAfterResume = await readout();
  console.log('readout after resume:', JSON.stringify(result.readoutAfterResume));
  result.pageErrors = b.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')).length;
  console.log('page errors', result.pageErrors);
} finally {
  if (out) writeFileSync(out, JSON.stringify(result, null, 1));
  await b.close();
}
