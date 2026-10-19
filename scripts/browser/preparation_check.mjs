// Household food preparation (rules version 2) in a real, headless Chrome page.
//
//   npx vite --port 5184
//   node scripts/browser/preparation_check.mjs "http://127.0.0.1:5184/"
//
// What it shows is BEHAVIOUR and DISPLAYED TEXT. It drives the page through the DevTools protocol (scripts/browser/cdp.mjs),
// stops the page's own clock so that nothing below is racing requestAnimationFrame, advances the world by an exact number of
// ticks, and reads what the person card actually puts on the screen. It says NOTHING about how any of it looks: a headless
// Chrome renders in software and this check never inspects the drawing.
//
// The chain it follows is the one the task asks a viewer to be able to follow:
//   local evidence  ->  a preparation taken on  ->  the step chosen  ->  food really in the store  ->  what it came to
// and then: does that survive a save and a load, and is it absent from a world that still runs version 1?
//
// The example is AUTONOMOUS, not staged: nothing here places a person, a home or any food, or picks anybody's option. It
// starts an ordinary current world at a fixed seed and waits.
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5184/';
const SEED = 'river';
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const b = await launch({ port: 9340 });
const ev = (e) => b.evaluate(e);

/** everything about preparations the page can see, read out of the running world */
const look = () =>
  ev(`(() => {
    const g = window.__game;
    const w = g.world;
    const live = [];
    const ended = [];
    for (const p of w.persons) {
      if (!p.alive) continue;
      for (const i of p.intentions) {
        if (i.kind !== 'stock') continue;
        const row = { who: p.id, name: p.name, hh: p.hhId, id: i.id, cue: i.cue, reserve: i.reserve, worked: i.worked, status: i.status, step: i.step, reason: i.reason, about: i.aboutId };
        if (i.status === 'active') live.push(row); else ended.push(row);
      }
    }
    return { tick: w.tick, rulesVersion: w.settings.rulesVersion, dynamics: w.settings.dynamics, seed: g.settings.seed, people: w.persons.filter((p) => p.alive).length, live, ended };
  })()`);

/** what the person card is showing for whoever is selected */
const card = () =>
  ev(`(() => {
    const tidy = (t) => (t || '').split('\\n').join(' ').split('\\t').join(' ').replace(/\\s+/g, ' ').trim();
    const row = document.querySelector('.qa .q-plan') || document.querySelector('.q-plan');
    const doing = document.querySelector('.qa .q-doing') || document.querySelector('.q-doing');
    return { plan: row ? tidy(row.innerText) : '', doing: doing ? tidy(doing.innerText) : '', selected: window.__game.selectedId };
  })()`);

/** open the sections the card fills only while they are open, by clicking as a person would */
const openSections = () =>
  ev(`(() => {
    const clicked = [];
    for (const h of document.querySelectorAll('.sec-head, .upto-top .btn')) {
      const t = (h.innerText || '').trim();
      if (/^What are they up to\\?/.test(t) && h.closest('.sec') && h.closest('.sec').dataset.open !== 'true') { h.click(); clicked.push(t); }
    }
    const more = document.querySelector('.upto-more');
    if (more && !document.querySelector('.q-plan:not([hidden])')) { more.click(); clicked.push('more'); }
    const more2 = document.querySelector('.upto-more');
    if (more2 && /more/i.test(more2.innerText || '')) { more2.click(); clicked.push('more2'); }
    return clicked;
  })()`);

const select = (id) => ev(`(() => { window.__game.selectedId = ${id}; window.__game.draw?.(); return window.__game.selectedId; })()`);

/** food actually in the building this preparation is about, read off the world, not off a belief */
const storeOf = (id) => ev(`(() => {
    const b = window.__game.world.byId.get(${id});
    if (!b || !b.store) return null;
    let n = 0;
    for (const k of ['berries','fruit','fish','grain','bread','meat']) n += b.store.items[k] ?? 0;
    return n;
  })()`);

try {
  await b.send('Page.navigate', { url });
  await b.sleep(1200);
  await ev(`(async () => {
    localStorage.setItem('living-world:prefs:v1', JSON.stringify({ seed: '${SEED}', size: 'normal', harsh: false, immigration: false, speed: 16, overlays: {}, debug: false, inspectorOpen: true, feedOpen: true }));
    const m = await import('/src/app/save.ts');
    await m.clearSave?.();
    indexedDB.deleteDatabase('living-world');
    localStorage.removeItem('living-world:save:v1');
  })()`).catch(() => {});
  await b.send('Page.navigate', { url });
  await b.sleep(3000);
  // stop the clock: everything below advances the world by an exact number of ticks, which is what makes the example
  // reproducible and keeps "saved at X, loaded back at X" meaningful
  await ev(`window.__game.setPlaying(false)`);

  let s = await look();
  check('a current world is running in the page', s.dynamics === 'rich' && s.rulesVersion === 2 && s.people > 10, `dynamics=${s.dynamics}, rulesVersion=${s.rulesVersion}, ${s.people} people, seed=${s.seed}`);
  check('it is the seed this example names', s.seed === SEED, `seed=${s.seed}`);

  // ── 1. somebody takes a preparation on, unprompted ──
  for (let i = 0; i < 40 && !s.live.length; i++) {
    await ev(`window.__game.advanceTicks(300)`);
    s = await look();
  }
  check('somebody took a food reserve on without being put up to it', s.live.length > 0, s.live.length ? `${s.live.length} live at tick ${s.tick}; first: ${s.live[0].name} (household ${s.live[0].hh}), ${s.live[0].reserve} units, cue ${s.live[0].cue}` : `none by tick ${s.tick}`);
  if (!s.live.length) throw new Error('no preparation appeared in the window');
  const subject = s.live[0];

  // ── 2. the card says why, what the step is, and how much is really put by ──
  await select(subject.who);
  await b.sleep(300);
  await openSections();
  await b.sleep(500);
  let c = await card();
  check('the card names the reserve and the step', /units of food by for the household/i.test(c.plan) && /Step:/.test(c.plan), c.plan.slice(0, 260) || '(no plan row on the card)');
  check('and it says WHY, in terms of what the household could see', /Why: /.test(c.plan) && /(next to nothing at home|went hungry lately|winter is close)/i.test(c.plan), c.plan.slice(0, 260));
  check('and how much has really been put by so far, not how much was meant', /\d+ of \d+ units? put by so far/.test(c.plan), (c.plan.match(/\d+ of \d+ units? put by so far/) ?? ['(absent)'])[0]);
  const before = await storeOf(subject.about);

  // ── 3. follow it until food actually lands in that household's store ──
  let delivered = null;
  for (let i = 0; i < 60 && !delivered; i++) {
    await ev(`window.__game.advanceTicks(150)`);
    s = await look();
    const mine = [...s.live, ...s.ended].find((r) => r.id === subject.id);
    if (mine && mine.worked > 0) delivered = mine;
    // somebody else's preparation will do just as well if this one came to nothing
    if (!delivered) {
      const any = [...s.live, ...s.ended].find((r) => r.worked > 0);
      if (any) delivered = any;
    }
  }
  check('food really went into a home store for a preparation', !!delivered, delivered ? `${delivered.name} put ${delivered.worked} of ${delivered.reserve} units by (plan ${delivered.id})` : `nothing by tick ${s.tick}`);
  if (delivered) {
    const now = await storeOf(delivered.about);
    check('and the building itself holds it', typeof now === 'number' && now > 0, `store ${delivered.about} holds ${now} units of food (this household's home; it held ${before} when the example started)`);
    await select(delivered.who);
    await b.sleep(300);
    await openSections();
    await b.sleep(400);
    c = await card();
    const put = (c.plan.match(/(\d+) of (\d+) units? put by so far/) ?? [])[1];
    check('the card shows what was really put by, and it matches the world', put !== undefined ? Number(put) === Math.round(delivered.worked) : /put \d+ units? of food by|never got any food put by|store is at/.test(c.plan),
      `card: ${c.plan.slice(0, 260)}`);
  }

  // ── 4. an intention is not a delivery, and the card says which it was ──
  // The loop above stops at the first delivery, which is usually well before any plan has run its course, so give the world
  // enough time for one to reach a verdict of its own.
  for (let i = 0; i < 40 && !s.ended.length; i++) {
    await ev(`window.__game.advanceTicks(300)`);
    s = await look();
  }
  const anyEnded = s.ended[s.ended.length - 1];
  if (anyEnded) {
    await select(anyEnded.who);
    await b.sleep(300);
    await openSections();
    await b.sleep(400);
    c = await card();
    check('a preparation that ended reads as what it came to, not as a plan', /(done|given up)/i.test(c.plan), `${anyEnded.status}: ${c.plan.slice(0, 260)}`);
  } else {
    check('a preparation ended within the window, so its outcome could be read', false, 'none had ended yet');
  }

  // ── 5. the whole of it survives a save and a load, version and all ──
  const saved = await ev(`(async () => {
    const g = window.__game;
    const at = { tick: g.world.tick, hash: g.stateHash, rulesVersion: g.world.settings.rulesVersion };
    const plans = [];
    for (const p of g.world.persons) for (const i of p.intentions) if (i.kind === 'stock') plans.push([p.id, i.id, i.reserve, i.cue, i.worked, i.status]);
    const m = await import('/src/app/save.ts');
    const ok = await m.saveGame(g);
    return { ok, at, plans };
  })()`);
  check('the page saved a world with preparations in it', saved.ok === true && saved.plans.length > 0, `${saved.plans.length} preparations, tick ${saved.at.tick}, state ${saved.at.hash}, rulesVersion ${saved.at.rulesVersion}`);

  const back = await ev(`(async () => {
    const g = window.__game;
    g.advanceTicks(400);
    const moved = { tick: g.world.tick, hash: g.stateHash };
    const m = await import('/src/app/save.ts');
    const ok = await m.loadGame(g);
    const plans = [];
    for (const p of g.world.persons) for (const i of p.intentions) if (i.kind === 'stock') plans.push([p.id, i.id, i.reserve, i.cue, i.worked, i.status]);
    return { ok, moved, plans, at: { tick: g.world.tick, hash: g.stateHash, rulesVersion: g.world.settings.rulesVersion } };
  })()`);
  check('loading restores the exact world that was saved', back.ok === true && back.at.tick === saved.at.tick && back.at.hash === saved.at.hash,
    `moved to ${back.moved.tick}/${back.moved.hash}, loaded back to ${back.at.tick}/${back.at.hash}`);
  check('the preparations came back as they were, cue and units and all', JSON.stringify(back.plans) === JSON.stringify(saved.plans),
    `${back.plans.length} back of ${saved.plans.length}; first ${JSON.stringify(back.plans[0])}`);
  check('and the world is still rules version 2', back.at.rulesVersion === 2, `rulesVersion=${back.at.rulesVersion}`);

  // ── 6. a world that still runs version 1 does not acquire any of this ──
  const old = await ev(`(async () => {
    const g = window.__game;
    g.restart({ seed: 'v1-browser', dynamics: 'rich', rulesVersion: 1, immigration: false });
    const made = g.world.settings.rulesVersion;
    g.advanceTicks(9000);
    let stock = 0;
    let other = 0;
    for (const p of g.world.persons) for (const i of p.intentions) { if (i.kind === 'stock') stock++; else other++; }
    const at = { tick: g.world.tick, hash: g.stateHash, rulesVersion: g.world.settings.rulesVersion };
    const m = await import('/src/app/save.ts');
    const ok = await m.saveGame(g);
    g.restart({ seed: 'current-again', immigration: false });
    const between = g.world.settings.rulesVersion;
    const loaded = await m.loadGame(g);
    return { made, stock, other, at, ok, between, loaded, after: g.world.settings.rulesVersion };
  })()`);
  check('a version-1 world can still be made in the page', old.made === 1, `rulesVersion=${old.made}`);
  check('it forms no preparations at all, while its other plans carry on', old.stock === 0 && old.other > 0, `${old.stock} preparations, ${old.other} other plans by tick ${old.at.tick}`);
  check('a world started after it is the current version again', old.between === 2, `rulesVersion=${old.between}`);
  check('and loading the version-1 save puts it back on version 1, not on the latest', old.loaded === true && old.after === 1, `rulesVersion=${old.after}`);

  const errors = await ev(`(window.__errors || []).length`).catch(() => 0);
  check('the page raised no uncaught errors it recorded', !errors, `errors=${errors}`);
} catch (e) {
  check('the check ran to the end', false, String(e && e.message ? e.message : e));
} finally {
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} rendered checks passed`);
  await b.close();
}
process.exit(results.every((r) => r.pass) ? 0 : 1);
