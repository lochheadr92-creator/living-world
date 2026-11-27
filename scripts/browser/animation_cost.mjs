// What a frame costs on a big world: the real page, a real requestAnimationFrame loop, a Large-profile world of about 100 people.
//
// Made to be run against two dev servers (a checkout with the new animations and a clean checkout of main) and the two lines compared.
// It depends on nothing that exists only in one of them: the page's window.__game and window.__renderer, the sim's own
// currentWorldSettings and stepWorld, and the renderer's `chars` (CharacterRenderer) whose `draw` it wraps on the instance at run time.
//
// Same seed and same steps every run:
//  1. the world is the one frame_time_check.mjs uses (profile large, seed 'frame-time', no immigration), paused, run an exact number
//     of ticks (--ticks, default 1200: half a day, so people are spread over what they do), stepped by this script and not by the clock;
//  2. the camera goes to the middle of the densest knot of people (the person with most others within 10 tiles) at the page's default
//     zoom, which is what makes the character drawing a measurable share of the frame;
//  3. the page's own frame loop then runs --warm (120) unmeasured and --frames (600) measured frames. The world is still paused, and
//     this script advances it by one tick every sixth frame (the pace of 1x play at 60 frames a second) and sets the renderer's
//     interpolation to where in that tick the frame falls, so people move and animate as in play, the same on every run.
//
// Each measured frame records the renderer's own whole-frame time (Renderer.lastFrameMs: everything Renderer.frame does, not the
// stepping) and the time spent inside CharacterRenderer.draw (each call timed with performance.now(); Chrome's timer is coarse, about
// 0.1 ms, so one call is noisy but the mean over 600 frames is not). Prints ONE JSON line:
//   { url, charactersSha, profile, seed, ticks, people, zoom, frames, meanMs, p95Ms, maxMs, charDrawMeanMs, charDrawCallsPerFrame,
//     drawablesPerFrame, timerResolutionMs, pageErrors }
// The machine's other load moves the numbers: run each server a few times, alternately, and compare medians.
//
//   npx vite --port 5311 --strictPort        (in each checkout)
//   node scripts/browser/animation_cost.mjs --url http://127.0.0.1:5311/ [--frames 600] [--warm 120] [--ticks 1200] [--cdp 9394]
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { launch } from './cdp.mjs';

const { values: opt } = parseArgs({
  options: {
    url: { type: 'string' },
    cdp: { type: 'string', default: '9394' },
    profile: { type: 'string', default: 'large' },
    seed: { type: 'string', default: 'frame-time' },
    ticks: { type: 'string', default: '1200' },
    frames: { type: 'string', default: '600' },
    warm: { type: 'string', default: '120' },
    zoom: { type: 'string' },
    help: { type: 'boolean', default: false },
  },
});
if (opt.help || !opt.url) {
  console.log('usage: node scripts/browser/animation_cost.mjs --url http://127.0.0.1:<port>/ [--frames 600] [--warm 120] [--ticks 1200] [--profile large] [--seed frame-time] [--zoom <n>] [--cdp 9394]');
  process.exit(opt.help ? 0 : 2);
}
const url = new URL(opt.url).href;
const ticks = Math.max(0, Math.floor(Number(opt.ticks)));
const frames = Math.max(1, Math.floor(Number(opt.frames)));
const warm = Math.max(0, Math.floor(Number(opt.warm)));
const cdpPort = Number(opt.cdp);
const fail = (msg) => {
  console.error('animation_cost: ' + msg);
  process.exit(2);
};
if (![ticks, frames, warm].every(Number.isFinite)) fail('--ticks, --frames and --warm must be numbers');

const tmp = resolve(tmpdir());
const profile = resolve(join(tmp, 'living-world-animation-cost-' + randomUUID()));
if (!profile.startsWith(tmp + sep) || existsSync(profile)) fail('unsafe temporary profile');
let occupied = false;
try {
  await fetch(`http://127.0.0.1:${cdpPort}/json/version`, { signal: AbortSignal.timeout(3000) });
  occupied = true;
} catch {
  /* free */
}
if (occupied) fail('browser port in use: ' + cdpPort + ' (pass --cdp <free port>)');

// which source the server is serving, so two lines can be told apart (best effort)
async function charactersSha() {
  try {
    const res = await fetch(new URL('/src/render/characters.ts?raw', url), { signal: AbortSignal.timeout(240000) });
    const text = await res.text();
    const m = /^\s*export default ("(?:[^"\\]|\\.)*")\s*;?\s*$/s.exec(text);
    if (!res.ok || !m) return null;
    return createHash('sha256').update(JSON.parse(m[1]).replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
  } catch {
    return null;
  }
}

/** installed in the page: the world's setup, stepping, aiming and the measuring loop */
async function pageSide(cfg) {
  const g = window.__game;
  const r = window.__renderer;
  if (!g || !r) throw new Error('the page has no window.__game / window.__renderer');
  const [prof, wld, iso] = await Promise.all([import('/src/sim/profiles.ts'), import('/src/sim/world.ts'), import('/src/render/iso.ts')]);
  const defaultZoom = g.camera.zoom;
  g.setPlaying(false);
  Object.assign(g.overlays, { perception: false, paths: false, intentions: false, knowledge: false, labels: false });
  g.restart(prof.currentWorldSettings(cfg.profile, cfg.seed, { immigration: false }));
  g.setPlaying(false);
  g.alpha = 0;
  const people = () => g.world.persons.filter((p) => p.alive);

  return {
    defaultZoom,
    start: () => ({ people: people().length, W: g.world.W, H: g.world.H, tick: g.world.tick, rules: g.world.settings.rulesVersion }),
    step: (n) => {
      for (let i = 0; i < n; i++) wld.stepWorld(g.world);
      g.alpha = 0;
      return g.world.tick;
    },
    /** the camera to the middle of the densest knot of people */
    aim: (zoom) => {
      const live = people();
      let best = null;
      let bestN = -1;
      for (const p of live) {
        let n = 0;
        for (const q of live) if (Math.hypot(p.x - q.x, p.y - q.y) <= 10) n++;
        if (n > bestN) {
          bestN = n;
          best = p;
        }
      }
      const q = iso.project(best.x, best.y);
      g.fly = null;
      g.following = false;
      if (g.selectedId) g.select(0);
      g.camera = { x: q.sx, y: q.sy, zoom };
      return { aimedAt: best.id, neighbours: bestN };
    },
    /** the smallest step performance.now() takes (Chrome rounds it) */
    timer: () => {
      let min = Infinity;
      for (let i = 0; i < 20000; i++) {
        const a = performance.now();
        let b = performance.now();
        while (b === a) b = performance.now();
        if (b - a < min) min = b - a;
      }
      return min;
    },
    measure: (warmFrames, measuredFrames) =>
      new Promise((resolve, reject) => {
        const proto = Object.getPrototypeOf(r);
        const origFrame = proto.frame;
        const chars = r.chars;
        const origDraw = chars && typeof chars.draw === 'function' ? chars.draw : null;
        let charAcc = 0;
        let charCalls = 0;
        if (origDraw) {
          chars.draw = function (...args) {
            const t = performance.now();
            const v = origDraw.apply(this, args);
            charAcc += performance.now() - t;
            charCalls++;
            return v;
          };
        }
        const rec = { frame: [], chars: [], calls: [], drawn: [] };
        let j = 0;
        const total = warmFrames + measuredFrames;
        const finish = (err) => {
          delete r.frame;
          if (origDraw) delete chars.draw;
          g.stepEase = 1;
          if (err) reject(err);
          else resolve({ rec, hasChars: !!origDraw, zoom: g.camera.zoom, fault: g.fault ? g.fault.message : null });
        };
        r.frame = function (dt) {
          try {
            const sub = j % 6;
            if (sub === 0) wld.stepWorld(g.world);
            g.stepEase = sub / 6;
            charAcc = 0;
            charCalls = 0;
            origFrame.call(r, dt);
            if (j >= warmFrames) {
              rec.frame.push(r.lastFrameMs);
              rec.chars.push(charAcc);
              rec.calls.push(charCalls);
              rec.drawn.push(r.drawnCount);
            }
            j++;
            if (j >= total) finish();
          } catch (err) {
            finish(err);
          }
        };
      }),
  };
}

const b = await launch({ port: cdpPort, width: 1440, height: 900, profile });
let exit = 0;
try {
  await b.send('Page.navigate', { url });
  let ready = false;
  for (let n = 0; n < 720 && !ready; n++) {
    try {
      ready = await b.evaluate('!!(window.__game && window.__renderer)');
    } catch {
      /* still loading */
    }
    if (!ready) await b.sleep(250);
  }
  if (!ready) throw new Error('the page did not start (no window.__game within three minutes)');
  await b.sleep(1500);
  await b.evaluate(`(async () => { window.__cost = await (${pageSide.toString()})(${JSON.stringify({ profile: opt.profile, seed: opt.seed })}); return true; })()`);
  const start = await b.evaluate('window.__cost.start()');
  const defaultZoom = await b.evaluate('window.__cost.defaultZoom');
  for (let done = 0; done < ticks; ) {
    const n = Math.min(100, ticks - done);
    await b.evaluate(`window.__cost.step(${n})`);
    done += n;
  }
  const aim = await b.evaluate(`window.__cost.aim(${opt.zoom ? Number(opt.zoom) : defaultZoom})`);
  await b.sleep(500);
  const timerResolutionMs = await b.evaluate('window.__cost.timer()');
  const limit = 600000 + (warm + frames) * 400;
  const got = await Promise.race([
    b.evaluate(`window.__cost.measure(${warm}, ${frames})`),
    new Promise((_, rej) => setTimeout(() => rej(new Error('the measuring loop did not finish in ' + Math.round(limit / 1000) + ' s')), limit)),
  ]);
  const people = await b.evaluate('window.__game.world.persons.filter((p) => p.alive).length');
  const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const pct = (a, q) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(s.length * q))] ?? 0;
  };
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const pageErrors = b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length;
  const line = {
    url,
    charactersSha: await charactersSha(),
    profile: opt.profile,
    seed: opt.seed,
    ticks,
    people,
    startPeople: start.people,
    zoom: r3(got.zoom),
    aimedNeighbours: aim.neighbours,
    frames: got.rec.frame.length,
    meanMs: r3(mean(got.rec.frame)),
    p95Ms: r3(pct(got.rec.frame, 0.95)),
    maxMs: r3(Math.max(...got.rec.frame)),
    charDrawMeanMs: got.hasChars ? r3(mean(got.rec.chars)) : null,
    charDrawCallsPerFrame: got.hasChars ? r3(mean(got.rec.calls)) : null,
    drawablesPerFrame: r3(mean(got.rec.drawn)),
    timerResolutionMs: r3(timerResolutionMs),
    pageErrors,
  };
  if (got.fault) line.fault = got.fault;
  console.log(JSON.stringify(line));
  if (got.fault || pageErrors) exit = 1;
} catch (err) {
  console.error('animation_cost: ' + (err && err.stack ? err.stack : err));
  exit = 1;
} finally {
  await b.close();
}
// let the event loop drain (a hard exit with Chrome's socket still closing trips a libuv assertion on Windows); the timer is the backstop
process.exitCode = exit;
setTimeout(() => process.exit(exit), 5000).unref();
