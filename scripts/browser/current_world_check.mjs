// Does the real page do what the transition promises? This drives a HEADLESS Chrome through the DevTools protocol
// (scripts/browser/cdp.mjs): the app boots, renders and runs its own clock in a real browser, and every answer below is read
// out of the running page by evaluating JavaScript in it. What it therefore shows is BEHAVIOUR - what the app does with
// preferences, saves and restarts. It is not a check of appearance or usability: nothing here looks at the drawing.
//
//   npx vite --port 5179                      # or: npm run build && npm run preview
//   node scripts/browser/current_world_check.mjs http://localhost:5179/
//
// It checks, in the page:
//   1. a new world runs the current simulation;
//   2. an old `rich: false` browser preference cannot put it back on the legacy rules;
//   3. a world really survives a save and a load - including across a page reload - with its own recorded rules and its own
//      state, and carries on from where it was rather than starting again;
//   4. a legacy world loaded back keeps ITS rules, and a new world started afterwards uses the current ones;
//   5. the menu no longer asks anyone to switch the old mode on.
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const b = await launch({ port: 9336 });
const ev = (e) => b.evaluate(e);
/** the app's own save module, as the page itself loads it (the dev server serves the sources) */
const save = (fn) => ev(`(async () => { const m = await import('/src/app/save.ts'); return await (${fn})(m, window.__game); })()`);

try {
  // an old installation that had switched the legacy mode off, so the retirement is actually exercised
  await b.send('Page.navigate', { url });
  await b.sleep(1200);
  await ev(`(async () => {
    localStorage.setItem('living-world:prefs:v1', JSON.stringify({ seed: 'browser-check', size: 'normal', harsh: false, immigration: true, rich: false }));
    // start from no saved game at all, so a save found later is this run's
    const m = await import('/src/app/save.ts');
    await m.clearSave?.();
    indexedDB.deleteDatabase('living-world');
    localStorage.removeItem('living-world:save:v1');
  })()`).catch(() => {});
  await b.send('Page.navigate', { url });
  await b.sleep(3000);

  // The page's clock runs on requestAnimationFrame. A check that reads a tick, then saves, is racing it - so stop the clock
  // first: everything below advances the world explicitly, which is what makes "saved at X, loaded back at X" meaningful.
  await ev(`window.__game.setPlaying(false)`);
  const first = await ev(`({ dynamics: window.__game.world.settings.dynamics, seed: window.__game.settings.seed, playing: window.__game.playing })`);
  check('the clock can be stopped, so the measurement is not racing it', first.playing === false, `playing=${first.playing}`);
  check('a new world in the page runs the current simulation', first.dynamics === 'rich', `dynamics=${first.dynamics}, seed=${first.seed}`);
  check('the old preferences were actually read by the page', first.seed === 'browser-check', `seed=${first.seed}`);
  check('the retired rich=false preference cannot hold a new world on legacy rules', first.dynamics === 'rich', `dynamics=${first.dynamics} with rich=false stored`);

  // ── 3. persistence, actually checked: save a known state, move past it, load, and compare ──
  const saved = await ev(`(async () => {
    window.__game.advanceTicks(300);
    const at = { tick: window.__game.world.tick, hash: window.__game.stateHash, dynamics: window.__game.world.settings.dynamics, seed: window.__game.settings.seed };
    const m = await import('/src/app/save.ts');
    const ok = await m.saveGame(window.__game);
    return { ok, at };
  })()`);
  check('the page saved the running world', saved.ok === true, `saved at tick ${saved.at.tick}, state ${saved.at.hash}`);

  const reloaded = await ev(`(async () => {
    window.__game.advanceTicks(200);            // move well past the saved moment
    const moved = { tick: window.__game.world.tick, hash: window.__game.stateHash };
    const m = await import('/src/app/save.ts');
    const ok = await m.loadGame(window.__game);
    const back = { tick: window.__game.world.tick, hash: window.__game.stateHash, dynamics: window.__game.world.settings.dynamics, seed: window.__game.settings.seed };
    window.__game.advanceTicks(50);
    return { ok, moved, back, after: { tick: window.__game.world.tick } };
  })()`);
  check('loading really restores the saved world', reloaded.ok === true && reloaded.back.tick === saved.at.tick && reloaded.back.hash === saved.at.hash,
    `moved to ${reloaded.moved.tick}/${reloaded.moved.hash}, loaded back to ${reloaded.back.tick}/${reloaded.back.hash} (saved ${saved.at.tick}/${saved.at.hash})`);
  check('the loaded world keeps its own recorded rules and seed', reloaded.back.dynamics === saved.at.dynamics && reloaded.back.seed === saved.at.seed,
    `dynamics=${reloaded.back.dynamics}, seed=${reloaded.back.seed}`);
  check('and it carries on from there rather than starting again', reloaded.after.tick === saved.at.tick + 50, `${reloaded.back.tick} → ${reloaded.after.tick}`);

  // the strongest form: the save survives the page itself going away
  await b.send('Page.navigate', { url });
  await b.sleep(3000);
  await ev(`window.__game.setPlaying(false)`);
  const acrossReload = await ev(`(async () => {
    const fresh = { tick: window.__game.world.tick };
    const m = await import('/src/app/save.ts');
    const ok = await m.loadGame(window.__game);
    return { ok, fresh, loaded: { tick: window.__game.world.tick, hash: window.__game.stateHash, dynamics: window.__game.world.settings.dynamics } };
  })()`);
  check('the save survives a page reload', acrossReload.ok === true && acrossReload.loaded.hash === saved.at.hash,
    `a fresh page started at tick ${acrossReload.fresh.tick}, loaded back to ${acrossReload.loaded.tick}/${acrossReload.loaded.hash}`);

  // ── 4. a legacy world keeps its rules through the same round trip; a new one afterwards does not inherit them ──
  const legacy = await ev(`(async () => {
    window.__game.restart({ seed: 'legacy-browser', dynamics: 'authored' });
    window.__game.advanceTicks(120);
    const at = { tick: window.__game.world.tick, hash: window.__game.stateHash, dynamics: window.__game.world.settings.dynamics };
    const m = await import('/src/app/save.ts');
    await m.saveGame(window.__game);
    window.__game.restart({ seed: 'something-else' });   // a current world in between
    const between = window.__game.world.settings.dynamics;
    const ok = await m.loadGame(window.__game);
    const back = { tick: window.__game.world.tick, hash: window.__game.stateHash, dynamics: window.__game.world.settings.dynamics };
    return { at, between, ok, back };
  })()`);
  check('a legacy world can still be made for a diagnostic', legacy.at.dynamics === 'authored', `dynamics=${legacy.at.dynamics}, tick=${legacy.at.tick}`);
  check('loading a legacy save restores its legacy rules and its state', legacy.ok === true && legacy.back.dynamics === 'authored' && legacy.back.hash === legacy.at.hash,
    `dynamics=${legacy.back.dynamics}, ${legacy.back.tick}/${legacy.back.hash} (saved ${legacy.at.tick}/${legacy.at.hash})`);
  check('a world started between the two was current, not legacy', legacy.between === 'rich', `dynamics=${legacy.between}`);

  const after = await ev(`(() => { window.__game.restart({ seed: 'after-legacy' }); return { dynamics: window.__game.world.settings.dynamics, tick: window.__game.world.tick }; })()`);
  check('a new world started after loading a legacy save uses the current simulation', after.dynamics === 'rich' && after.tick === 0, `dynamics=${after.dynamics}, tick=${after.tick}`);

  // ── 5. the menu ──
  const menu = await ev(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /seed|world/i.test(b.getAttribute('aria-label') || b.className || ''));
    if (btn) btn.click();
    return { offersRichToggle: /rich dynamics/i.test(document.body.innerText), opened: !!btn };
  })()`);
  check('the world menu no longer asks anyone to switch rich dynamics on', !menu.offersRichToggle && menu.opened, `menu opened=${menu.opened}`);

  const errors = await ev(`(window.__errors || []).length`).catch(() => 0);
  check('the page raised no uncaught errors it recorded', !errors, `errors=${errors}`);
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} rendered checks passed`);
} finally {
  await b.close();
}
process.exit(results.every((r) => r.pass) ? 0 : 1);
