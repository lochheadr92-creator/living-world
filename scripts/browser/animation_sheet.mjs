// The animation contact sheet: every cell of scripts/browser/animation_specs.mjs, staged in the real page and drawn by the real renderer.
//
// What it does. It starts a headless Chrome (scripts/browser/cdp.mjs, so requestAnimationFrame is real), loads the dev server's page,
// and in the page replaces the world with a STAGED one: a flat, empty, all-grass map with calm weather, nothing in it but the figures
// of one spec at a time, drawn by the page's own Renderer (src/render/renderer.ts, called directly, frame by frame, with the game
// paused). Each spec is drawn at the page's default zoom and at twice it, once per frame value of the spec, and the cell around the
// figures is cut from the canvas. Nothing here is the simulation running: the people are made with the sim's own createPerson and
// newActivity and then set as the spec says, and a sheet shows how a state is DRAWN, never that it arises in an ordinary world.
//
//   npx vite --port 5311 --strictPort        (in another shell, in the worktree you are checking)
//   node scripts/browser/animation_sheet.mjs --url http://127.0.0.1:5311/ --out animation_evidence [--group B] [--only id1,id2]
//
// Before anything else it checks that the server serves THIS checkout: the source of a handful of files is fetched from the server
// (Vite's ?raw) and compared with the file on disk beside this script. Another checkout on the same port fails here, loudly.
//
// Writes, under --out: sheet_<group>_1x.png and sheet_<group>_2x.png for each group present, pairs_1x.png (each PAIRS entry side by
// side at the default zoom), sheet.json (each spec's id, label, group, cell size) and prints a short summary. A spec that cannot be
// staged is reported by id with the error, the rest carry on, and the exit status is non-zero at the end.
//
// How the staging works, for whoever changes a spec or this script:
//  - dx, dy are tile offsets on the WORLD axes from the cell centre (+x runs down and to the right on screen, +y down and to the left).
//  - Every figure i is the same person in every spec (same look, sex and name, made from a fixed seed), so two specs compare the
//    pose and not the person. Ages are written into birthTick against the tick drawn, so 'age: 6' is six whatever tick it is.
//  - The frames are the activity progress values the spec names; the world's tick moves with them (frame value = ticks), so the
//    renderer's simulation time (src/app/game.ts simTime) is consistent with the progress shown.
//  - 'moving' figures are walked forward a step at a time (the renderer's stride phase follows ground covered, characters.ts
//    updateAll) and, between two frames, until the renderer's own stride phase has advanced by 1 / (number of frames) of a cycle, so
//    two frames of a walker are half a stride apart, three are a third apart. The figure drifts a few pixels across the cell.
//  - The camera sits on the cell centre. The cell is the ground around it (about 144 by 120 pixels at the default zoom) widened
//    to hold whatever differs from the same render with the figures gone (a shadow, a speech bubble, a spread group).
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { launch } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const { values: opt } = parseArgs({
  options: {
    url: { type: 'string' },
    out: { type: 'string', default: 'animation_evidence' },
    group: { type: 'string' },
    only: { type: 'string' },
    cdp: { type: 'string', default: '9393' },
    chunk: { type: 'string', default: '0' },
    help: { type: 'boolean', default: false },
  },
});
if (opt.help || !opt.url) {
  console.log('usage: node scripts/browser/animation_sheet.mjs --url http://127.0.0.1:<port>/ [--out animation_evidence] [--group B] [--only id1,id2] [--cdp 9393] [--chunk 8]');
  process.exit(opt.help ? 0 : 2);
}
const url = new URL(opt.url).href;
const out = resolve(opt.out);
const chunk = Math.max(0, Math.floor(Number(opt.chunk) || 0)); // also write each sheet in parts of this many specs (a tall sheet is hard to look at whole)

const fail = (msg) => {
  console.error('animation_sheet: ' + msg);
  process.exit(2);
};

// ───────────────────────── the specs ─────────────────────────
const { SPECS: ALL_SPECS, PAIRS: ALL_PAIRS } = await import(new URL('./animation_specs.mjs', import.meta.url).href);
if (!Array.isArray(ALL_SPECS) || !ALL_SPECS.length) fail('animation_specs.mjs exports no SPECS');

/** the members of a string-literal union in src/sim/types.ts (for checking a spec's names), or null when it cannot be read */
function unionOf(name) {
  try {
    const src = readFileSync(join(root, 'src/sim/types.ts'), 'utf8');
    const m = new RegExp('export type ' + name + '\\s*=([^;]*);').exec(src);
    if (!m) return null;
    const names = [...m[1].matchAll(/'([A-Za-z_]+)'/g)].map((x) => x[1]);
    return names.length ? new Set(names) : null;
  } catch {
    return null;
  }
}
const POSES = unionOf('PoseKind');
const KINDS = unionOf('ActivityKind');
const SPEECH_KINDS = new Set(['say', 'ask', 'warn', 'angry', 'happy', 'think']);
const SPEC_FIELDS = new Set(['id', 'group', 'label', 'was', 'people', 'animals', 'frames', 'after']);
const FIG_FIELDS = new Set(['dx', 'dy', 'heading', 'face', 'pose', 'kind', 'phase', 'data', 'duration', 'age', 'inv', 'speech', 'moving', 'set', 'conv']);

/** problems that make a spec unstageable (errors) or probably not what its author meant (warnings) */
function checkSpec(s) {
  const errors = [];
  const warnings = [];
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  if (typeof s.id !== 'string' || !s.id) errors.push('id must be a non-empty string');
  if (typeof s.group !== 'string' || !s.group) errors.push('group must be a non-empty string');
  if (typeof s.label !== 'string') errors.push('label must be a string');
  if (!Array.isArray(s.people) || !s.people.length) {
    errors.push('people must be a non-empty array');
    return { errors, warnings };
  }
  for (const k of Object.keys(s)) if (!SPEC_FIELDS.has(k)) warnings.push(`unknown spec field '${k}'`);
  if (s.frames !== undefined && !(Array.isArray(s.frames) && s.frames.length && s.frames.every((v) => num(v) && v >= 0))) errors.push('frames must be a non-empty array of numbers >= 0');
  s.people.forEach((f, i) => {
    const at = `people[${i}]`;
    if (!f || typeof f !== 'object') return errors.push(`${at} is not an object`);
    for (const k of Object.keys(f)) if (!FIG_FIELDS.has(k)) warnings.push(`${at}: unknown field '${k}'`);
    for (const k of ['dx', 'dy', 'heading', 'age', 'duration', 'moving']) if (f[k] !== undefined && !num(f[k])) errors.push(`${at}.${k} must be a number`);
    if (f.age !== undefined && num(f.age) && f.age < 0) errors.push(`${at}.age must be >= 0`);
    if (f.pose !== undefined && POSES && !POSES.has(f.pose)) errors.push(`${at}.pose '${f.pose}' is not a PoseKind (src/sim/types.ts)`);
    if (f.kind !== undefined && KINDS && !KINDS.has(f.kind)) errors.push(`${at}.kind '${f.kind}' is not an ActivityKind (src/sim/types.ts)`);
    if (f.phase !== undefined && f.phase !== 'travel' && f.phase !== 'work') errors.push(`${at}.phase must be 'travel' or 'work'`);
    if (f.kind === undefined && (f.phase !== undefined || f.data !== undefined || f.duration !== undefined)) warnings.push(`${at}: phase/data/duration without a kind are ignored (no activity)`);
    if (f.face !== undefined && !(Number.isInteger(f.face) && f.face >= 0 && f.face < s.people.length && f.face !== i)) errors.push(`${at}.face must be the index of another figure`);
    if (f.speech !== undefined) {
      if (!f.speech || typeof f.speech.text !== 'string' || !f.speech.text) errors.push(`${at}.speech needs a text`);
      else if (f.speech.ticks !== undefined && !(num(f.speech.ticks) && f.speech.ticks > 0)) errors.push(`${at}.speech.ticks must be a number > 0`);
      else if (f.speech.kind !== undefined && !SPEECH_KINDS.has(f.speech.kind)) errors.push(`${at}.speech.kind '${f.speech.kind}' is not one of ${[...SPEECH_KINDS].join(', ')}`);
    }
    if (f.conv !== undefined) {
      if (!f.conv || !(Number.isInteger(f.conv.with) && f.conv.with >= 0 && f.conv.with < s.people.length && f.conv.with !== i)) errors.push(`${at}.conv.with must be the index of another figure`);
    }
    for (const k of ['data', 'inv', 'set']) if (f[k] !== undefined && (typeof f[k] !== 'object' || f[k] === null || Array.isArray(f[k]))) errors.push(`${at}.${k} must be an object`);
  });
  if (s.after !== undefined && typeof s.after !== 'function') errors.push('after must be a function');
  (s.animals ?? []).forEach((a, i) => {
    if (!a || (a.type !== 'wolf' && a.type !== 'deer' && a.type !== 'sheep')) errors.push(`animals[${i}].type must be 'wolf', 'deer' or 'sheep'`);
    for (const k of ['dx', 'dy', 'heading']) if (a && a[k] !== undefined && !(typeof a[k] === 'number' && Number.isFinite(a[k]))) errors.push(`animals[${i}].${k} must be a number`);
  });
  return { errors, warnings };
}

const problems = []; // { id, error } for the exit status and sheet.json
const seen = new Set();
let specs = [];
for (const s of ALL_SPECS) {
  const id = s && typeof s.id === 'string' ? s.id : '(no id)';
  const { errors, warnings } = checkSpec(s ?? {});
  for (const w of warnings) console.log(`warning ${id}: ${w}`);
  if (seen.has(id)) errors.push('duplicate id');
  seen.add(id);
  if (errors.length) {
    problems.push({ id, error: 'spec: ' + errors.join('; ') });
    console.error(`FAIL ${id}: spec: ${errors.join('; ')}`);
    continue;
  }
  specs.push(s);
}
if (opt.group) {
  const g = opt.group;
  if (!ALL_SPECS.some((s) => s && s.group === g)) fail(`no spec in group '${g}'`);
  specs = specs.filter((s) => s.group === g);
}
if (opt.only) {
  const ids = opt.only.split(',').map((x) => x.trim()).filter(Boolean);
  for (const id of ids) if (!ALL_SPECS.some((s) => s && s.id === id)) fail(`--only: no spec with id '${id}'`);
  specs = specs.filter((s) => ids.includes(s.id));
}
if (!specs.length && !problems.length) fail('nothing to stage');

// ───────────────────────── is the server this checkout? ─────────────────────────
// Files whose served source must equal the file on disk. characters.ts is the one a person is editing most often, so a mismatch there
// is retried (the dev server and this read can straddle a save); the specs file exists only where it was written, which separates
// this checkout from a sibling that has the same sources.
const IDENTITY_FILES = ['src/main.ts', 'src/render/renderer.ts', 'src/render/camera.ts', 'src/render/characters.ts', 'scripts/browser/animation_specs.mjs'];
const norm = (t) => t.replace(/^﻿/, '').replace(/\r\n/g, '\n');

async function servedSource(rel) {
  const res = await fetch(new URL('/' + rel + '?raw', url), { signal: AbortSignal.timeout(240000) });
  const text = await res.text();
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const m = /^\s*export default ("(?:[^"\\]|\\.)*")\s*;?\s*$/s.exec(text);
  if (!m) return { error: 'not a raw source module (the server does not have this file at that path)' };
  return { text: JSON.parse(m[1]) };
}

async function verifyServer() {
  let reached = false;
  for (let t = 0; t < 60 && !reached; t++) {
    try {
      await fetch(new URL('/', url), { signal: AbortSignal.timeout(30000) });
      reached = true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!reached) fail(`no server answers at ${url}`);
  for (const rel of IDENTITY_FILES) {
    const disk = norm(readFileSync(join(root, rel), 'utf8'));
    let last = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      const got = await servedSource(rel);
      if (got.text !== undefined && norm(got.text) === disk) {
        last = '';
        break;
      }
      last = got.error ?? 'the served source differs from the file on disk';
      await new Promise((r) => setTimeout(r, 700));
      if (attempt < 3) continue;
    }
    if (last) fail(`the server at ${url} is not serving this checkout (${root}): ${rel}: ${last}.\nStart Vite from this folder: npx vite --port <port> --strictPort`);
  }
}
await verifyServer();
const shaOf = (rel) => createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
const charactersShaBefore = shaOf('src/render/characters.ts');
console.log(`server ${url} serves this checkout (${root}); ${IDENTITY_FILES.length} files compared`);

// ───────────────────────── the page side ─────────────────────────
// Runs inside the page (it is sent as text by .toString(), so it may use nothing from this file). Returns the staging API.
async function pageSide() {
  const g = window.__game;
  const r = window.__renderer;
  if (!g || !r) throw new Error('the page has no window.__game / window.__renderer');
  const canvas = document.getElementById('world');
  const [wg, prof, ppl, hhs, rngm, acts, wild, iso, cons, live] = await Promise.all([
    import('/src/sim/worldgen.ts'),
    import('/src/sim/profiles.ts'),
    import('/src/sim/people.ts'),
    import('/src/sim/households.ts'),
    import('/src/sim/rng.ts'),
    import('/src/sim/activities.ts'),
    import('/src/sim/wildlife.ts'),
    import('/src/render/iso.ts'),
    import('/src/sim/constants.ts'),
    import('/src/sim/livestock.ts'),
  ]);
  const { RNG, hashString } = rngm;
  const DZ = g.camera.zoom; // the zoom a fresh page starts at (src/main.ts), read before anything moves the camera
  const C = { x: 40.5, y: 40.5 }; // the cell centre, in tiles
  const BASE = 20000; // the world's tick for every spec; it does not move while a spec is captured (speech and other records compare against it)
  let simTick = BASE; // the renderer's simulation time, in ticks: moves with the frame values (see pass)

  // ── the staged world: flat, all grass, no weather, nobody ──
  g.setPlaying(false);
  const w = wg.blankWorld(prof.currentWorldSettings('normal', 'animation-sheet', { immigration: false }));
  w.weather.wind = 0; // the grass does not sway, so a render with the figures gone is the same ground
  w.weather.cloud = 0;
  w.weather.rain = 0;
  w.weather.storm = 0;
  w.weather.nextChange = 1e9;
  w.light = 1;
  w.camp = { x: w.W - 3, y: w.H - 3 }; // butterflies live within thirty-four tiles of the camp (effects.ts Critters): the far corner keeps them out of the cell
  const hh = hhs.createHousehold(w, new RNG(hashString('animation-sheet|household')));
  g.restoreWorld(w, w.settings);
  const pristine = new Set(Object.keys(w)); // what a spec's `after` adds to the world (occasions, civic projects ...) is taken away again before the next spec
  Object.assign(g.overlays, { perception: false, paths: false, intentions: false, knowledge: false, labels: false });
  g.setViewer({ speech: 'automatic', textSize: 'normal', contrast: 'standard', reducedMotion: false });

  const chars = r.chars;
  const states = chars && chars.states;
  const canReset = !!(states && typeof states.clear === 'function' && typeof states.get === 'function');
  let passes = 0;
  const store = {};

  const render = () => r.frame(1 / 60);
  const setCamera = (z) => {
    const c = iso.project(C.x, C.y);
    g.camera = { x: c.sx, y: c.sy, zoom: z };
    g.fly = null;
    g.following = false;
    g.hover = null;
    g.viewInsetRight = 0;
    g.viewOcclusions = [];
    if (g.selectedId) g.select(0);
  };
  const deepAssign = (target, src) => {
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) deepAssign(target[k], v);
      else target[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    }
  };
  const phaseOf = (p) => {
    const s = canReset ? states.get(p.id) : null;
    return s && typeof s.phase === 'number' ? s.phase : null;
  };

  const compileAfter = (src) => {
    try {
      return (0, eval)('(' + src + ')');
    } catch (e1) {
      try {
        const o = (0, eval)('({' + src + '})'); // a method written as after(world, people) { ... }
        if (typeof o.after === 'function') return o.after;
      } catch (e2) {
        /* fall through */
      }
      throw new Error('after: its source cannot be compiled here (' + e1.message + ')');
    }
  };

  /** build everything one spec shows, at the world's fixed tick */
  function stage(spec, idBase, frames) {
    w.persons.length = 0;
    w.animals.length = 0;
    w.conversations.length = 0;
    w.events.length = 0;
    w.fx.length = 0;
    w.delayed.length = 0;
    w.byId.clear();
    for (const k of Object.keys(w)) if (!pristine.has(k)) delete w[k];
    hh.members = [];
    hh.headId = 0;
    w.tick = BASE;
    w.nextId = idBase;
    const figs = spec.people;
    const pos = figs.map((f) => ({ x: C.x + (f.dx || 0), y: C.y + (f.dy || 0) }));
    const heading = figs.map((f, i) => {
      if (typeof f.heading === 'number') return f.heading; // an explicit heading beats a face the helper that built the spec gave
      if (f.face !== undefined && f.face !== null) {
        if (!pos[f.face]) throw new Error(`people[${i}].face: no figure ${f.face}`);
        return Math.atan2(pos[f.face].y - pos[i].y, pos[f.face].x - pos[i].x);
      }
      return f.heading || 0;
    });
    const persons = figs.map((f, i) => {
      const rng = new RNG(hashString('animation-sheet|figure|' + i));
      const p = ppl.createPerson(w, rng, { name: 'Figure ' + (i + 1), sex: i % 2 === 0 ? 'm' : 'f', age: f.age === undefined ? 30 : f.age, hhId: hh.id, x: pos[i].x, y: pos[i].y });
      w.persons.push(p);
      w.byId.set(p.id, p);
      hh.members.push(p.id);
      if (!hh.headId) hh.headId = p.id;
      if (!p.mood) p.mood = { level: 0, thoughts: [] }; // a rich world's people all have one (src/sim/types.ts Mood); specs' `after` may add thoughts to it
      return p;
    });
    // walking: where each walker starts, so that the walk ends about as far past its spec position as it began before it
    const move = figs.map((f) => (typeof f.moving === 'number' ? f.moving : 0));
    const lead = move.reduce((best, m, i) => (m > (best < 0 ? 0 : move[best]) ? i : best), -1);
    const PRE = 4;
    let estPerGap = 0;
    if (lead >= 0) {
      estPerGap = Math.max(1, Math.ceil(1 / frames.length / (move[lead] * 1.55)));
      const total = PRE + (frames.length - 1) * estPerGap;
      persons.forEach((p, i) => {
        pos[i].x -= Math.cos(heading[i]) * move[i] * total / 2;
        pos[i].y -= Math.sin(heading[i]) * move[i] * total / 2;
      });
    }
    persons.forEach((p, i) => {
      const f = figs[i];
      p.x = p.px = pos[i].x;
      p.y = p.py = pos[i].y;
      p.heading = p.pheading = heading[i];
      p.pose = f.pose || 'stand';
      p.inv = f.inv ? JSON.parse(JSON.stringify(f.inv)) : {};
      p.speech = f.speech ? { text: f.speech.text, kind: f.speech.kind || 'say', until: w.tick + (f.speech.ticks === undefined ? 60 : f.speech.ticks) } : null;
      p.birthTick = w.tick - Math.round((f.age === undefined ? 30 : f.age) * cons.TICKS_PER_YEAR);
      if (f.kind) {
        const a = acts.newActivity(w, p, { kind: f.kind, label: f.kind, goal: f.kind, here: true, duration: f.duration === undefined ? 120 : f.duration, data: f.data ? JSON.parse(JSON.stringify(f.data)) : {} });
        a.phase = f.phase || 'work';
        p.activity = a;
      }
      if (f.set) deepAssign(p, f.set);
    });
    figs.forEach((f, i) => {
      if (!f.conv) return;
      const p = persons[i];
      const q = persons[f.conv.with];
      if (p.convId && p.convId === q.convId) return; // the other figure already made it
      const c = { id: w.nextId++, a: p.id, b: q.id, purpose: f.conv.purpose || 'chat', start: w.tick, phase: 0, nextAt: BASE + 1e6, end: BASE + 1e6, requestId: 0, data: f.conv.data ? JSON.parse(JSON.stringify(f.conv.data)) : {} };
      w.conversations.push(c);
      p.convId = q.convId = c.id;
    });
    const skipped = [];
    const animals = [];
    (spec.animals || []).forEach((s, i) => {
      try {
        const x = C.x + (s.dx || 0);
        const y = C.y + (s.dy || 0);
        const a = s.type === 'sheep' ? live.makeSheep(w, x, y, 'f') : wild.makeWolf(w, x, y, s.type);
        a.heading = a.pheading = s.heading || 0;
        animals.push(a);
      } catch (err) {
        skipped.push('animals[' + i + '] (' + s.type + ') skipped: ' + (err && err.message ? err.message : err));
      }
    });
    const after = spec.afterSrc ? compileAfter(spec.afterSrc) : null;
    const S = { persons, animals, move, lead, heading, estPerGap, PRE, after, skipped };
    if (after) runAfter(S);
    return S;
  }

  const runAfter = (S) => {
    try {
      S.after(w, S.persons, S.animals);
    } catch (err) {
      throw new Error('after: ' + (err && err.message ? err.message : err));
    }
  };
  /** the state that follows the frame value: the activity progress and the renderer's simulation time (the world's tick stays put) */
  function setFrame(spec, S, P, P0) {
    simTick = BASE + (P - P0);
    S.persons.forEach((p) => {
      if (p.activity) {
        p.activity.progress = P;
        p.activity.pprogress = Math.max(0, P - 1);
      }
    });
    if (S.after) runAfter(S);
  }
  const stepMove = (S) => {
    S.persons.forEach((p, i) => {
      const m = S.move[i];
      if (!m) return;
      p.px = p.x;
      p.py = p.y;
      p.x += Math.cos(S.heading[i]) * m;
      p.y += Math.sin(S.heading[i]) * m;
    });
  };

  // the part of the canvas kept for each frame (the cell is cut from it afterwards)
  const region = () => {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const x0 = Math.max(0, Math.floor(cx - 560));
    const y0 = Math.max(0, Math.floor(cy - 460));
    return { x0, y0, x1: Math.min(canvas.width, Math.ceil(cx + 560)), y1: Math.min(canvas.height, Math.ceil(cy + 300)) };
  };
  const grab = (R) => {
    const c = document.createElement('canvas');
    c.width = R.x1 - R.x0;
    c.height = R.y1 - R.y0;
    c.getContext('2d').drawImage(canvas, R.x0, R.y0, c.width, c.height, 0, 0, c.width, c.height);
    return c;
  };
  const pixels = (c) => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  /** the box of pixels that differ between two grabs, or null */
  const diffBox = (a, b, W, H) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
  };

  /** one spec at one zoom: its cells, kept under `key`; returns the cell size */
  function pass(spec, tag) {
    // the renderer reads the game's simulation time (tick + alpha); it follows the frame values here while the world's tick stays put
    g.simTime = () => (simTick + g.renderAlpha) / cons.TPS;
    try {
      return passInner(spec, tag);
    } finally {
      delete g.simTime;
    }
  }
  function passInner(spec, tag) {
    const z = tag === '2x' ? DZ * 2 : DZ;
    const frames = spec.frames && spec.frames.length ? spec.frames : [5, 17];
    const n = frames.length;
    passes++;
    if (canReset) states.clear();
    const S = stage(spec, canReset ? 1000 : 1000 + passes * 64, frames);
    setCamera(z);
    const R = region();
    const snaps = [];
    const notes = S.skipped.slice();
    const drawnAs = [];
    for (let k = 0; k < n; k++) {
      setFrame(spec, S, frames[k], frames[0]);
      if (k === 0) {
        // a change of animation is blended in over about a quarter of a second of simulation time: draw once well before the
        // first capture, so the first frame shows the animation and not the blend from standing
        const keep = simTick;
        simTick = keep - 60;
        render();
        simTick = keep;
      }
      if (S.lead < 0) render();
      else if (k === 0) {
        for (let s = 0; s < S.PRE; s++) {
          stepMove(S);
          render();
        }
      } else {
        // walk on until the lead walker's stride phase has advanced by 1/n of a cycle (or, without the renderer's phase, by the planned steps)
        const lp = S.persons[S.lead];
        let gained = 0;
        let steps = 0;
        while (steps < 400) {
          const before = phaseOf(lp);
          stepMove(S);
          render();
          steps++;
          const after = phaseOf(lp);
          if (before === null || after === null) {
            if (steps >= S.estPerGap) break;
            continue;
          }
          gained += (((after - before) % 1) + 1) % 1;
          if (gained >= 1 / n - 1e-9) break;
        }
        notes.push(`frame ${k}: ${steps} steps, stride +${gained.toFixed(2)}`);
      }
      snaps.push(grab(R));
      // the pose name the renderer settled on per figure (it can differ from the one staged: the animation layer refines poses)
      drawnAs.push(S.persons.map((p) => (canReset && states.get(p.id) ? states.get(p.id).pose : null)));
    }
    // the same render with everyone gone: what differs is the figures (and what they cast or say)
    S.persons.forEach((p, i) => {
      p.x = p.px = 2 + i * 0.01;
      p.y = p.py = 2;
    });
    S.animals.forEach((a) => {
      a.x = a.px = 2;
      a.y = a.py = 3;
    });
    render();
    const empty = grab(R);
    const W = empty.width;
    const H = empty.height;
    const ep = pixels(empty);
    let box = null;
    snaps.forEach((s, k) => {
      const d = diffBox(pixels(s), ep, W, H);
      if (!d) throw new Error(`nothing is drawn in frame ${k} (progress ${frames[k]}): the figures are not in view`);
      box = box ? { x0: Math.min(box.x0, d.x0), y0: Math.min(box.y0, d.y0), x1: Math.max(box.x1, d.x1), y1: Math.max(box.y1, d.y1) } : d;
    });
    // the cell: the base ground around the centre, widened to hold the box
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const M = 8;
    const cell = {
      x0: Math.max(R.x0, Math.floor(Math.min(cx - 72 * z, box.x0 + R.x0 - M))),
      y0: Math.max(R.y0, Math.floor(Math.min(cy - 84 * z, box.y0 + R.y0 - M))),
      x1: Math.min(R.x1, Math.ceil(Math.max(cx + 72 * z, box.x1 + R.x0 + M))),
      y1: Math.min(R.y1, Math.ceil(Math.max(cy + 36 * z, box.y1 + R.y0 + M))),
    };
    const cw = cell.x1 - cell.x0;
    const ch = cell.y1 - cell.y0;
    const cells = snaps.map((s) => {
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      c.getContext('2d').drawImage(s, cell.x0 - R.x0, cell.y0 - R.y0, cw, ch, 0, 0, cw, ch);
      return c;
    });
    store[spec.id + '@' + tag] = { cells, w: cw, h: ch, frames };
    return { id: spec.id, tag, w: cw, h: ch, zoom: z, frames, box, notes, drawnAs };
  }

  // ── composing ──
  const fit = (ctx, text, maxW) => {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  };
  /** rows: [{ subs: [{ key, label, id, note }] }] (one sub per figure cell group; a pair has two); returns a PNG data URL */
  function compose(rows, o) {
    const s = o.scale;
    const GAP = 5;
    const PAIR_GAP = 34 * s;
    const ROW_GAP = 16;
    const PAD = 14;
    const HEAD = 28;
    const FOOT = 26;
    const LABEL_H = 17 * s + 14 * s + 13 * s + 8;
    const subW = (sub) => {
      const e = store[sub.key];
      return Math.max(e.cells.length * e.w + (e.cells.length - 1) * GAP, 130 * s);
    };
    const items = rows.map((row) => {
      const widths = row.subs.map(subW);
      const heights = row.subs.map((sub) => store[sub.key].h + LABEL_H);
      return { row, widths, w: widths.reduce((a, b) => a + b, 0) + (row.subs.length - 1) * PAIR_GAP, h: Math.max(...heights) };
    });
    let x = PAD;
    let y = PAD + HEAD;
    let rowH = 0;
    let right = 0;
    for (const it of items) {
      if (x > PAD && x + it.w > o.maxW - PAD) {
        y += rowH + ROW_GAP;
        x = PAD;
        rowH = 0;
      }
      it.x = x;
      it.y = y;
      x += it.w + ROW_GAP;
      rowH = Math.max(rowH, it.h);
      right = Math.max(right, it.x + it.w);
    }
    const W = Math.max(right + PAD, 520 * Math.max(1, s * 0.7));
    const H = y + rowH + FOOT + PAD;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W);
    c.height = Math.ceil(H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#12161b';
    ctx.fillRect(0, 0, c.width, c.height);
    const sans = '"Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#c9d4de';
    ctx.font = 'bold ' + 15 * Math.max(1, s * 0.85) + 'px ' + sans;
    ctx.fillText(o.title, PAD, PAD + 14);
    for (const it of items) {
      let sx = it.x;
      it.row.subs.forEach((sub, j) => {
        const e = store[sub.key];
        const sw = it.widths[j];
        let fx = sx + (sw - (e.cells.length * e.w + (e.cells.length - 1) * GAP)) / 2;
        e.cells.forEach((cell, k) => {
          ctx.drawImage(cell, fx, it.y);
          ctx.strokeStyle = 'rgba(255,255,255,0.22)';
          ctx.lineWidth = 1;
          ctx.strokeRect(fx + 0.5, it.y + 0.5, e.w - 1, e.h - 1);
          fx += e.w + GAP;
        });
        const ty = it.y + e.h;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f2f5f8';
        ctx.font = 'bold ' + 14 * s + 'px ' + sans;
        ctx.fillText(fit(ctx, sub.label, sw), sx, ty + 16 * s);
        ctx.fillStyle = '#8fb4d9';
        ctx.font = 12 * s + 'px Consolas, "Cascadia Mono", monospace';
        ctx.fillText(fit(ctx, sub.id, sw), sx, ty + 16 * s + 14 * s);
        ctx.fillStyle = '#8a97a3';
        ctx.font = 11 * s + 'px ' + sans;
        ctx.fillText(fit(ctx, sub.note, sw), sx, ty + 16 * s + 14 * s + 13 * s);
        if (j > 0) {
          ctx.fillStyle = '#c9d4de';
          ctx.font = 'bold ' + 13 * s + 'px ' + sans;
          ctx.textAlign = 'center';
          ctx.fillText('vs', sx - PAIR_GAP / 2, it.y + e.h / 2);
        }
        sx += sw + PAIR_GAP;
      });
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7d8995';
    ctx.font = 'italic ' + 12 * Math.max(1, s * 0.85) + 'px ' + sans;
    ctx.fillText('staged figures, not an ordinary world', PAD, c.height - PAD);
    return c.toDataURL('image/png');
  }

  return {
    defaultZoom: DZ,
    canvasSize: { w: canvas.width, h: canvas.height, css: canvas.getBoundingClientRect().width },
    canReset,
    pass: (spec, tag) => pass(spec, tag),
    compose,
    keys: () => Object.keys(store),
  };
}

// ───────────────────────── run ─────────────────────────
const tmp = resolve(tmpdir());
const profile = resolve(join(tmp, 'living-world-animation-sheet-' + randomUUID()));
if (!profile.startsWith(tmp + sep) || existsSync(profile)) fail('unsafe temporary profile');
const cdpPort = Number(opt.cdp);
let occupied = false;
try {
  await fetch(`http://127.0.0.1:${cdpPort}/json/version`, { signal: AbortSignal.timeout(3000) });
  occupied = true;
} catch {
  /* free */
}
if (occupied) fail('browser port in use: ' + cdpPort + ' (pass --cdp <free port>)');
mkdirSync(out, { recursive: true });

const W = 1440;
const H = 900;
const b = await launch({ port: cdpPort, width: W, height: H, profile });
const results = new Map(); // id -> { spec, t1, t2 }
const written = [];
let info = null;
try {
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await b.send('Page.navigate', { url });
  let ready = false;
  for (let n = 0; n < 720 && !ready; n++) {
    try {
      ready = await b.evaluate('!!(window.__game && window.__renderer)');
    } catch {
      /* the page is still loading */
    }
    if (!ready) await b.sleep(250);
  }
  if (!ready) throw new Error('the page did not start (no window.__game within three minutes)');
  await b.evaluate(`(async () => { window.__sheet = await (${pageSide.toString()})(); return true; })()`);
  info = await b.evaluate('({ defaultZoom: window.__sheet.defaultZoom, canvasSize: window.__sheet.canvasSize, canReset: window.__sheet.canReset })');
  if (info.canvasSize.w !== Math.floor(info.canvasSize.css)) throw new Error(`the canvas is not at device scale 1 (${info.canvasSize.w} px for ${info.canvasSize.css} css px)`);
  console.log(`page ready: default zoom ${info.defaultZoom}, canvas ${info.canvasSize.w}x${info.canvasSize.h}${info.canReset ? '' : ' (renderer state not reachable: figure ids differ per pass, walk phases use the planned steps)'}`);

  for (const spec of specs) {
    try {
      const wire = JSON.stringify({ ...spec, after: undefined, afterSrc: typeof spec.after === 'function' ? spec.after.toString() : undefined });
      const t1 = await b.evaluate(`window.__sheet.pass(${wire}, '1x')`);
      const t2 = await b.evaluate(`window.__sheet.pass(${wire}, '2x')`);
      results.set(spec.id, { spec, t1, t2 });
      console.log(`ok   ${spec.id}  group ${spec.group}  cell ${t1.w}x${t1.h} at 1x${t1.notes.length ? '  [' + t1.notes.join('; ') + ']' : ''}`);
    } catch (err) {
      const msg = String(err && err.message ? err.message : err).replace(/^page error: /, '');
      problems.push({ id: spec.id, error: msg });
      console.error(`FAIL ${spec.id}: ${msg}`);
    }
  }

  const noteOf = (spec) => (spec.was ? `was: ${spec.was}  ` : '') + 'progress ' + (spec.frames && spec.frames.length ? spec.frames : [5, 17]).join(', ');
  const sub = (spec, tag) => ({ key: `${spec.id}@${tag}`, label: spec.label, id: spec.id, note: noteOf(spec) });
  const save = (name, dataUrl) => {
    const file = join(out, name);
    writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
    written.push(file);
  };

  const groups = [...new Set([...results.values()].map((r) => r.spec.group))].sort();
  for (const group of groups) {
    const here = [...results.values()].filter((r) => r.spec.group === group).map((r) => r.spec);
    for (const [tag, scale, maxW] of [['1x', 1, 1700], ['2x', 1.15, 2000]]) {
      try {
        const rows = here.map((spec) => ({ subs: [sub(spec, tag)] }));
        const title = `Group ${group} - ${tag} (zoom ${tag === '1x' ? info.defaultZoom : info.defaultZoom * 2}) - ${here.length} specs`;
        const data = await b.evaluate(`window.__sheet.compose(${JSON.stringify(rows)}, ${JSON.stringify({ title, scale, maxW })})`);
        save(`sheet_${group}_${tag}.png`, data);
        if (chunk > 0 && rows.length > chunk) {
          const parts = Math.ceil(rows.length / chunk);
          for (let k = 0; k < parts; k++) {
            const part = await b.evaluate(`window.__sheet.compose(${JSON.stringify(rows.slice(k * chunk, (k + 1) * chunk))}, ${JSON.stringify({ title: title + ` - part ${k + 1} of ${parts}`, scale, maxW })})`);
            save(`sheet_${group}_${tag}_part${k + 1}.png`, part);
          }
        }
      } catch (err) {
        problems.push({ id: `sheet_${group}_${tag}`, error: String(err.message ?? err) });
        console.error(`FAIL sheet_${group}_${tag}: ${err.message ?? err}`);
      }
    }
  }

  // pairs: each entry's two specs side by side at the default zoom
  const pairRecords = [];
  const rows = [];
  for (const pair of ALL_PAIRS ?? []) {
    const [ia, ib] = Array.isArray(pair) ? pair : [];
    const a = results.get(ia);
    const c = results.get(ib);
    if (!a || !c) {
      const named = [ia, ib].filter((id) => !ALL_SPECS.some((s) => s && s.id === id));
      const why = named.length ? `no spec with id ${named.join(', ')}` : 'not staged in this run (filtered out or failed)';
      pairRecords.push({ a: ia, b: ib, ok: false, why });
      if (named.length) {
        problems.push({ id: `pair ${ia}/${ib}`, error: why });
        console.error(`FAIL pair ${ia}/${ib}: ${why}`);
      } else console.log(`skip pair ${ia}/${ib}: ${why}`);
      continue;
    }
    rows.push({ subs: [sub(a.spec, '1x'), sub(c.spec, '1x')] });
    pairRecords.push({ a: ia, b: ib, ok: true });
  }
  if (rows.length) {
    try {
      const data = await b.evaluate(`window.__sheet.compose(${JSON.stringify(rows)}, ${JSON.stringify({ title: `Tell-apart pairs - 1x (zoom ${info.defaultZoom}) - ${rows.length} pairs`, scale: 1, maxW: 2600 })})`);
      save('pairs_1x.png', data);
      if (chunk > 0 && rows.length > chunk) {
        const parts = Math.ceil(rows.length / chunk);
        for (let k = 0; k < parts; k++) {
          const part = await b.evaluate(`window.__sheet.compose(${JSON.stringify(rows.slice(k * chunk, (k + 1) * chunk))}, ${JSON.stringify({ title: `Tell-apart pairs - 1x - part ${k + 1} of ${parts}`, scale: 1, maxW: 2600 })})`);
          save(`pairs_1x_part${k + 1}.png`, part);
        }
      }
    } catch (err) {
      problems.push({ id: 'pairs_1x', error: String(err.message ?? err) });
      console.error(`FAIL pairs_1x: ${err.message ?? err}`);
    }
  }

  const charactersShaAfter = shaOf('src/render/characters.ts');
  if (charactersShaAfter !== charactersShaBefore) console.log('warning: src/render/characters.ts changed on disk during the run; the sheet may mix two versions (run again)');
  let head = '';
  try {
    head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    /* not a git checkout */
  }
  const sheet = {
    generated: new Date().toISOString(),
    url,
    worktree: root,
    head,
    note: 'staged figures, not an ordinary world',
    defaultZoom: info.defaultZoom,
    zooms: { '1x': info.defaultZoom, '2x': info.defaultZoom * 2 },
    charactersSha256: charactersShaAfter,
    specs: [...results.values()].map(({ spec, t1, t2 }) => ({ id: spec.id, label: spec.label, group: spec.group, was: spec.was ?? null, frames: t1.frames, cell1x: { w: t1.w, h: t1.h }, cell2x: { w: t2.w, h: t2.h }, drawnAs: t1.drawnAs, notes: t1.notes })),
    pairs: pairRecords,
    failures: problems,
    files: written.map((f) => f.slice(out.length + 1)),
  };
  writeFileSync(join(out, 'sheet.json'), JSON.stringify(sheet, null, 2));
  written.push(join(out, 'sheet.json'));
} catch (err) {
  problems.push({ id: '(run)', error: String(err && err.message ? err.message : err) });
  console.error('animation_sheet: ' + (err && err.stack ? err.stack : err));
} finally {
  await b.close();
}

console.log(`\n${results.size} of ${specs.length + problems.filter((p) => p.error.startsWith('spec:')).length} specs staged, ${written.length} files in ${out}`);
for (const f of written) console.log('  ' + f);
if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p.id}: ${p.error}`);
  process.exitCode = 1;
}
// let the event loop drain (a hard exit with Chrome's socket still closing trips a libuv assertion on Windows); the timer is the backstop
setTimeout(() => process.exit(process.exitCode ?? 0), 5000).unref();
