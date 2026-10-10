// Browser evidence for the village-economy expansion (docs/BUILDINGS.md): drive the real page in a headless Chrome to an ordinary rich
// world, let it run for some days, then select each new kind of building and read the inspector exactly as a person at the screen
// would, with a screenshot of each. Nothing is staged: the buildings are whatever the villagers decided to build.
//
//   npm run build && npx vite preview --port 4173     # serves dist/
//   node scripts/browser/stage_a.mjs http://127.0.0.1:4173/ [seed] [days] [outDir]
//
// Chrome is found from CHROME_PATH; in a container as root add CHROME_FLAGS=--no-sandbox.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const seed = process.argv[3] ?? 'meadow';
const days = Number(process.argv[4] ?? '14');
const outDir = process.argv[5] ?? 'docs/evidence/stage-a';
const DAY = 2400;
mkdirSync(outDir, { recursive: true });
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a checkout */
}
const result = { url, seed, dynamics: 'rich', days, commit, when: new Date().toISOString(), buildings: [], users: [], notes: [] };
const b = await launch({ port: 9335 });
const ev = (e) => b.evaluate(e);
try {
  await b.send('Page.navigate', { url });
  await b.sleep(3500);
  const ready = await ev('!!(window.__game && window.__game.world)');
  if (!ready) throw new Error('the page did not expose __game');
  // an ordinary rich world of this seed, paused so that only this script advances it
  await ev(`(() => { window.__game.setPlaying(false); window.__game.restart({ seed: ${JSON.stringify(seed)}, dynamics: 'rich', immigration: false, scene: 'natural' }); return true; })()`);
  await b.sleep(500);
  result.settings = await ev('JSON.stringify(window.__game.settings)');
  for (let t = 0; t < days * DAY; t += 600) {
    await ev('(() => { window.__game.advanceTicks(600); return window.__game.world.tick; })()');
  }
  result.tick = await ev('window.__game.world.tick');
  result.day = +(result.tick / DAY).toFixed(2);
  const list = JSON.parse(await ev(`JSON.stringify(window.__game.world.buildings.filter((x) => ['well', 'cellar', 'stockyard', 'forester', 'mine'].includes(x.type)).map((x) => ({ id: x.id, type: x.type, x: x.x, y: x.y, hhId: x.hhId, condition: Math.round(x.condition), items: x.store.items })))`));
  const sites = JSON.parse(await ev(`JSON.stringify(window.__game.world.sites.filter((x) => ['well', 'cellar', 'stockyard', 'forester', 'mine'].includes(x.type)).map((x) => ({ id: x.id, type: x.type, x: x.x, y: x.y, work: Math.round(100 * x.work / Math.max(1, x.workTotal)) })))`));
  result.sites = sites;
  const seen = new Set();
  for (const bl of list) {
    if (seen.has(bl.type)) continue;
    seen.add(bl.type);
    await ev(`(() => { window.__game.focusEntity(${bl.id}); window.__game.select(${bl.id}); return true; })()`);
    await b.sleep(900);
    const panel = await ev(`(() => { const t = document.querySelector('.e-title'); if (!t) return null; let el = t; for (let i = 0; i < 6 && el.parentElement; i++) el = el.parentElement; return { title: t.innerText, text: el.innerText.slice(0, 1600) }; })()`);
    const file = join(outDir, `${bl.type}.jpg`);
    await b.shot(file);
    result.buildings.push({ ...bl, inspector: panel, screenshot: file });
  }
  // somebody actually using one of them right now, if anyone is
  const usersExpr = `JSON.stringify((() => { const w = window.__game.world; const out = []; for (const p of w.persons) { if (!p.alive || !p.activity || !p.activity.targetId) continue; const e = w.byId.get(p.activity.targetId); if (e && e.ent === 'building' && ['well', 'cellar', 'stockyard', 'forester', 'mine'].includes(e.type)) out.push({ id: p.id, name: p.name, kind: p.activity.kind, label: p.activity.label, goal: p.activity.goal, phase: p.activity.phase, building: e.type, buildingId: e.id }); } return out; })())`;
  // (whoever is at one of them: looked for over a short while, the world advancing a little between looks)
  let users = [];
  for (let tries = 0; tries < 40 && !users.length; tries++) {
    users = JSON.parse(await ev(usersExpr));
    if (!users.length) await ev('(() => { window.__game.advanceTicks(40); return true; })()');
  }
  result.tickAtUsers = await ev('window.__game.world.tick');
  if (users.length) {
    const u = users[0];
    await ev(`(() => { window.__game.focusEntity(${u.id}); window.__game.select(${u.id}); return true; })()`);
    await b.sleep(900);
    const panel = await ev(`(() => { const t = document.querySelector('.e-title'); if (!t) return null; let el = t; for (let i = 0; i < 6 && el.parentElement; i++) el = el.parentElement; return { title: t.innerText, text: el.innerText.slice(0, 1200) }; })()`);
    const file = join(outDir, `person-${u.building}.jpg`);
    await b.shot(file);
    result.users.push({ ...u, inspector: panel, screenshot: file });
  } else result.notes.push('nobody was at one of the new buildings at the moment the script looked');
  result.users.push(...users.slice(1));
} catch (e) {
  result.error = String(e && e.stack ? e.stack : e);
}
// the record is written before the browser is closed: closing can hang, and a hung close must not lose the run
writeFileSync(join(outDir, `${seed}.json`), JSON.stringify(result, null, 1));
await Promise.race([b.close(), b.sleep(8000)]);
console.log(JSON.stringify({ seed, day: result.day, commit, built: result.buildings.map((x) => `${x.type}#${x.id}@${x.x},${x.y}`), sites: result.sites, users: result.users.map((u) => `${u.name}: ${u.label} (${u.building})`), error: result.error }, null, 1));
