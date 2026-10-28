// Hand control in a real (headless) Chrome page: the panel a person actually uses (src/ui/inhabit.ts manualBlock).
//
//   npx vite --port 5181
//   node scripts/browser/manual_check.mjs "http://127.0.0.1:5181/?inhabit=Pavel&manual=1&seed=meadow&from=1&days=0.25"
//
// It checks, through the DOM only (no test hooks): the panel appears; the clock stops while a decision waits; the observation and the
// offered options are shown, with the limits an option declares; clicking an option applies it and the world goes on; the decision and
// its outcome are reported; and Stop hands the person back to the engine.
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5181/?inhabit=Pavel&manual=1&seed=meadow&from=1&days=0.25';
const b = await launch({ port: 9336 });
const ev = (e) => b.evaluate(e);
const checks = [];
const check = (name, ok, note = '') => {
  checks.push({ name, ok: !!ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
};

const panel = () =>
  ev(`(() => {
    const p = document.querySelector('.inhabit');
    if (!p) return { panel: false };
    const man = p.querySelector('.inhabit-manual');
    const obs = p.querySelector('.inhabit-obs');
    const opts = [...p.querySelectorAll('.inhabit-opt')].map((o) => ({
      label: o.querySelector('.btn') ? o.querySelector('.btn').innerText : '',
      limits: [...o.querySelectorAll('.inhabit-n')].map((i) => i.title),
    }));
    return {
      panel: true,
      status: (p.querySelector('.inhabit-status') || {}).innerText || '',
      head: (p.querySelector('.inhabit-manual .inhabit-turn-line') || {}).innerText || '',
      manualShown: !!man && !man.hidden,
      obsChars: obs ? obs.value.length : 0,
      obsHasObservation: obs ? obs.value.includes('<observation>') : false,
      opts,
      decision: (p.querySelector('.inhabit-chosen') || {}).innerText || '',
      tick: window.__game.world.tick,
      playing: window.__game.playing,
    };
  })()`);

try {
  await b.send('Page.navigate', { url });
  await b.sleep(4000);

  // wait for a decision to be waiting
  let s = null;
  for (let i = 0; i < 60; i++) {
    s = await panel();
    if (s.panel && s.manualShown && s.opts.length) break;
    await b.sleep(500);
  }
  check('the inhabitant panel is on the page', s.panel, `status "${s.status}"`);
  check('the hand-control block is shown', s.manualShown, s.head);
  check('the observation this person can see is shown', s.obsHasObservation && s.obsChars > 500, `${s.obsChars} characters`);
  check('the offered options are listed', s.opts.length > 0, `${s.opts.length} options: ${s.opts.slice(0, 3).map((o) => o.label.replace(/\s+/g, ' ')).join(' | ')}`);
  // Only some actions take limits (eat, gather), so they are not on offer at every moment: walk a few decisions to find one.
  let limitsSeen = null;
  for (let d = 0; d < 16 && !limitsSeen; d++) {
    const cur = await panel();
    if (!cur.manualShown || !cur.opts.length) {
      await b.sleep(500);
      continue;
    }
    const found = cur.opts.find((o) => o.limits.length);
    if (found) {
      limitsSeen = found;
      break;
    }
    await ev(`document.querySelectorAll('.inhabit-opt .btn')[0].click()`);
    await b.sleep(1800);
  }
  check('an option that takes limits shows their range', !!limitsSeen, limitsSeen ? `${limitsSeen.label.replace(/\s+/g, ' ')}: ${limitsSeen.limits.join(', ')}` : 'no bounded action came on offer within 16 decisions');
  // re-read, so the checks below start from whatever moment we are now at
  for (let i = 0; i < 40; i++) {
    s = await panel();
    if (s.manualShown && s.opts.length && s.playing === false) break;
    await b.sleep(500);
  }

  // the clock must be stopped, and must not move while nobody has answered
  check('the clock is stopped while a decision waits', s.playing === false, `playing=${s.playing}`);
  const t0 = s.tick;
  await b.sleep(2500);
  const s2 = await panel();
  check('no time passes while the operator thinks', s2.tick === t0, `tick ${t0} -> ${s2.tick} over 2.5s`);

  // choose by hand, through the real button
  const before = s2.tick;
  const picked = s2.opts[0].label;
  await ev(`document.querySelectorAll('.inhabit-opt .btn')[0].click()`);
  await b.sleep(2500);
  const s3 = await panel();
  check('clicking an option applies it and the world goes on', s3.tick > before, `tick ${before} -> ${s3.tick} after choosing "${picked.replace(/\s+/g, ' ')}"`);
  check('the decision and its result are reported', s3.decision.length > 0, s3.decision);

  // a second decision, to show successive control
  let s4 = s3;
  for (let i = 0; i < 40; i++) {
    s4 = await panel();
    if (s4.manualShown && s4.opts.length && s4.playing === false) break;
    await b.sleep(500);
  }
  check('the next decision comes back to the operator', s4.opts.length > 0 && s4.playing === false, `asked again at tick ${s4.tick}`);
  await ev(`document.querySelectorAll('.inhabit-opt .btn')[0].click()`);
  await b.sleep(2000);
  const s5 = await panel();
  check('a second hand-made decision is applied', s5.tick > s4.tick, `tick ${s4.tick} -> ${s5.tick}`);

  // hand back
  await ev(`[...document.querySelectorAll('.inhabit button')].find((x) => x.innerText.trim() === 'Stop').click()`);
  await b.sleep(1500);
  const s6 = await panel();
  const t6 = s6.tick;
  await ev(`window.__game.setPlaying(true)`);
  await b.sleep(2500);
  const s7 = await panel();
  check('Stop hands the person back and the world runs on by itself', s7.tick > t6 && s7.status.includes('finished'), `status "${s7.status}", tick ${t6} -> ${s7.tick}`);
  check('nothing is waiting to be answered after handing back', !s7.opts.length, `${s7.opts.length} options shown`);

  const bad = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - bad.length}/${checks.length} checks passed`);
  process.exitCode = bad.length ? 1 : 0;
} finally {
  await b.close();
}
