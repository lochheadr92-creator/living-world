// The figures of the two ages of childhood (src/render/characters.ts), in the real page. Screenshots only, for a person to look at.
//
// 1. An ORDINARY Normal river world run 600 ticks in the page: the camera goes close to a little one (under seven) and to a child
//    (seven to eleven) as they are, whatever they are doing.
// 2. A STAGED LINE-UP in a throwaway copy of that world: a little one, a child, a youth, a grown person and an elder are moved to
//    stand side by side and then walk east together, so the sizes and gaits can be compared. Moving them is staging; nothing
//    about it is runtime evidence.
//
//   npx vite --port 5291 --strictPort        (in another shell)
//   node scripts/browser/child_figures_check.mjs http://127.0.0.1:5291/ viewer_evidence/child-figures-<date>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './cdp.mjs';

const [url = 'http://127.0.0.1:5291/', out = 'viewer_evidence/child-figures'] = process.argv.slice(2);
if (existsSync(out)) throw new Error('Fresh output required: ' + out);
mkdirSync(out, { recursive: true });
const W = 1200, H = 760;
const b = await launch({ port: 9379, width: W, height: H });
const notes = [];
try {
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await b.send('Page.navigate', { url });
  for (let n = 0; n < 100 && !(await b.evaluate('!!window.__game')); n++) await b.sleep(100);
  const found = await b.evaluate(`(async () => {
    const { createWorld } = await import('/src/sim/factory.ts');
    const { currentWorldSettings } = await import('/src/sim/profiles.ts');
    const { stepWorld } = await import('/src/sim/world.ts');
    const { ageYears } = await import('/src/sim/people.ts');
    const { project } = await import('/src/render/iso.ts');
    const save = await import('/src/app/save.ts');
    const w = createWorld(currentWorldSettings('normal', 'river', { immigration: true }));
    for (let n = 0; n < 600; n++) stepWorld(w);
    window.__cf = { ageYears, project, save };
    const g = window.__game; g.setPlaying(false); g.restoreWorld(w, w.settings);
    const alive = w.persons.filter((p) => p.alive);
    const pick = (lo, hi) => alive.filter((p) => { const a = ageYears(w, p); return a >= lo && a < hi; }).map((p) => ({ id: p.id, name: p.name, age: Math.floor(ageYears(w, p)) }));
    return { rules: w.settings.rulesVersion, little: pick(0, 7), child: pick(7, 12), youth: pick(12, 16), adult: pick(16, 62), elder: pick(62, 200) };
  })()`);
  notes.push({ ordinary: found });
  console.log(JSON.stringify(found));
  const close = async (id, file) => {
    await b.evaluate(`(() => { const g = window.__game, p = g.world.byId.get(${id}); g.fly = null; const q = window.__cf.project(p.x, p.y); g.camera = { x: q.sx, y: q.sy - 10, zoom: 3.2 }; g.select(0); })()`);
    await b.sleep(250);
    await b.shot(join(out, file));
  };
  if (found.little[0]) await close(found.little[0].id, '01_little_one_ordinary.png');
  if (found.child[0]) await close(found.child[0].id, '02_child_ordinary.png');

  // the staged line-up, in a copy
  const lineup = await b.evaluate(`(() => {
    const g = window.__game, f = window.__cf;
    const w = f.save.deserializeWorld(f.save.serializeWorld(g.world));
    g.restoreWorld(w, w.settings);
    const alive = w.persons.filter((p) => p.alive);
    const band = (lo, hi) => alive.find((p) => { const a = f.ageYears(w, p); return a >= lo && a < hi; });
    const row = [band(0, 4), band(4, 7), band(7, 10), band(10, 12), band(12, 16), band(16, 62), band(62, 200)].filter(Boolean);
    // open ground near the camp's fire, a row running straight across the screen (x up, y down by the same step)
    const fire = w.buildings.find((b) => b.type === 'fire') ?? w.buildings[0];
    const clear = (x, y) => x > 1 && y > 1 && x < w.W - 2 && y < w.H - 2 && !w.solid[Math.floor(y) * w.W + Math.floor(x)];
    const step = 0.42;
    let x0 = 0, y0 = 0;
    search: for (let r = 3; r < 30; r++) for (let dx = -r; dx <= r; dx++) for (const dy of [-r, r]) {
      const x = fire.x + dx + 0.5, y = fire.y + dy + 0.5;
      let ok = true;
      for (let i = -1; i <= row.length; i++) for (let j = -2; j <= 2; j++) if (!clear(x + i * step + j * 0.5, y - i * step + j * 0.5)) ok = false;
      if (ok) { x0 = x; y0 = y; break search; }
    }
    row.forEach((p, i) => { p.x = p.px = x0 + i * step; p.y = p.py = y0 - i * step; p.activity = null; p.pose = 'stand'; p.speech = null; p.heading = p.pheading = Math.PI * 0.75; });
    const q = f.project(x0 + (row.length - 1) * step / 2, y0 - (row.length - 1) * step / 2);
    g.fly = null; g.camera = { x: q.sx, y: q.sy - 12, zoom: 4.6 };
    window.__cf.row = row.map((p) => p.id);
    return row.map((p) => ({ name: p.name, age: Math.floor(f.ageYears(w, p)) }));
  })()`);
  notes.push({ lineup });
  console.log(JSON.stringify(lineup));
  await b.sleep(300);
  await b.shot(join(out, '03_lineup_standing.png'));
  // walking: each is walked east by hand, one frame at a time, at their own pace from the simulation's moveSpeed
  await b.evaluate(`(async () => {
    const { moveSpeed } = await import('/src/sim/activities.ts');
    window.__cf.moveSpeed = moveSpeed;
  })()`);
  for (let k = 0; k < 3; k++) {
    for (let t = 0; t < 14; t++) {
      await b.evaluate(`(() => { const g = window.__game, f = window.__cf; for (const id of f.row) { const p = g.world.byId.get(id); p.px = p.x; p.py = p.y; p.pose = 'walk'; p.heading = p.pheading = Math.PI * 0.75; const d = f.moveSpeed(g.world, p) * 0.18; p.x -= d; p.y += d; } })()`);
      await b.sleep(45);
    }
    await b.shot(join(out, `04_lineup_walking_${k + 1}.png`));
  }
  const paces = await b.evaluate(`(() => { const g = window.__game, f = window.__cf; return f.row.map((id) => { const p = g.world.byId.get(id); return { name: p.name, age: Math.floor(f.ageYears(g.world, p)), pace: +(f.moveSpeed(g.world, p) / 0.13).toFixed(3) }; }); })()`);
  notes.push({ paces });
  console.log(JSON.stringify(paces));
} finally {
  writeFileSync(join(out, 'notes.json'), JSON.stringify(notes, null, 2));
  await b.close();
}
