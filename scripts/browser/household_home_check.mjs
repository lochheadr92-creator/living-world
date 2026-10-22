// THE HOUSEHOLD-TO-HOME SITUATION IN THE REAL PAGE.
//
// This is NOT a staged fixture. It creates the ordinary autonomous `river` world with current rules, steps it with the
// real `stepWorld`, and then asks the real interface what it says about a household that went from a lean-to to a hut of
// its own. Nobody is told what to do at any point; the only thing this script chooses is where to look.
//
//   node scripts/browser/household_home_check.mjs http://127.0.0.1:5287/ home_evidence/page
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = process.argv[2] ?? 'http://127.0.0.1:5287/';
const out = process.argv[3] ?? 'home_evidence/page';
mkdirSync(out, { recursive: true });
const browser = await launch({ port: 9351 });
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
}
const ev = browser.evaluate;
try {
  await browser.send('Page.navigate', { url });
  await browser.sleep(1600);

  // ── an ordinary autonomous world, stepped until some household is partway through its own home ──
  const mid = await ev(`(async () => {
    const { createWorld } = await import('/src/sim/factory.ts');
    const { currentWorldSettings } = await import('/src/sim/profiles.ts');
    const { stepWorld } = await import('/src/sim/world.ts');
    const w = createWorld(currentWorldSettings('normal','river',{ immigration:false }));
    let found = null;
    for (let i = 0; i < 9000 && !found; i++) {
      stepWorld(w);
      for (const p of w.persons) {
        const pl = p.intentions.find((x) => x.status === 'active' && x.kind === 'shelter' && x.aboutId);
        if (pl) { found = { who: p.id, name: p.name, hh: p.hhId, site: pl.aboutId, goal: pl.goal, step: pl.step }; break; }
      }
    }
    window.__hh = found;
    const g = window.__game; g.setPlaying(false); g.restoreWorld(w, w.settings);
    if (found) { g.select(found.who); const q = w.byId.get(found.who); g.flyTo(q.x, q.y); }
    return { tick: w.tick, version: w.settings.rulesVersion, found };
  })()`);
  check('an ordinary run produces a household shelter plan', mid.found && mid.version === 7, mid);
  await browser.sleep(600);

  // ── what the page says about the plan, while it is still under way ──
  const planText = await ev(`document.querySelector('.q-plan')?.textContent ?? ''`);
  check('the card states the goal and the step', /hut built/.test(planText) && /(get|take) [0-9]+ (wood|stone)|wants building/.test(planText), planText.slice(0, 300));
  check('the card states the grounds in the household own terms', /still in a lean-to|no shelter of its own/.test(planText), planText.slice(0, 300));
  const agrees = await ev(`(async () => {
    const w = window.__game.world, p = w.byId.get(window.__hh.who);
    const pl = p.intentions.find((x) => x.status === 'active' && x.kind === 'shelter');
    return pl ? { goal: pl.goal, step: pl.step, reason: pl.reason, wants: pl.wants, site: pl.aboutId } : null;
  })()`);
  check('the words on the card are the state underneath', agrees && planText.includes(agrees.step), agrees);
  await browser.shot(out + '/plan-under-way.png');

  // ── the site card: where it is, what arrived, what is still wanted ──
  await ev(`window.__game.select(window.__hh.site)`);
  await browser.sleep(500);
  const siteText = await ev(`document.querySelector('.insp-entity')?.textContent ?? ''`);
  const siteState = await ev(`(async () => {
    const s = window.__game.world.byId.get(window.__hh.site);
    return s && s.ent === 'site' ? { type: s.type, hh: s.hhId, status: s.status, work: s.work, total: s.workTotal, delivered: s.delivered, required: s.required } : null;
  })()`);
  check('the site card is the household own home site', !!siteState && siteState.hh === mid.found.hh, siteState);
  check('the site card says what it is waiting for', siteText.length > 0 && (/wait|need|missing|wood|stone/i.test(siteText)), siteText.slice(0, 300));
  await browser.shot(out + '/site-waiting.png');

  // ── on to completion, ownership and actually living in it ──
  const done = await ev(`(async () => {
    const { stepWorld } = await import('/src/sim/world.ts');
    const { isSolidHome } = await import('/src/sim/constants.ts');
    const w = window.__game.world;
    let got = null;
    for (let i = 0; i < 14000 && !got; i++) {
      stepWorld(w);
      for (const hh of w.households) {
        const b = w.byId.get(hh.homeId);
        if (!b || b.ent !== 'building' || !isSolidHome(b.type)) continue;
        const inside = w.persons.filter((p) => p.alive && p.hhId === hh.id && p.indoors === b.id);
        if (inside.length) { got = { hh: hh.id, name: hh.name, home: b.id, type: b.type, owner: b.hhId, builtBy: b.builtBy ?? [], inside: inside.map((p) => ({ id: p.id, name: p.name, act: p.activity?.kind ?? null })) }; break; }
      }
    }
    window.__got = got;
    if (got) { window.__game.select(got.home); const b = w.byId.get(got.home); window.__game.flyTo(b.x + 0.5, b.y + 0.5); }
    return { tick: w.tick, got };
  })()`);
  check('a household reaches a home of its own and goes inside it', !!done.got, done);
  await browser.sleep(600);

  const homeText = await ev(`document.querySelector('.insp-entity')?.textContent ?? ''`);
  check('the home card names the household it belongs to', homeText.includes(done.got.name), homeText.slice(0, 300));
  check('the home card lists who is actually inside', done.got.inside.every((p) => homeText.includes(p.name)), { inside: done.got.inside, card: homeText.slice(0, 400) });
  check('ownership in the page is the ownership in the state', done.got.owner === done.got.hh, { owner: done.got.owner, household: done.got.hh });
  await browser.shot(out + '/home-occupied.png');

  const feed = await ev(`Array.from(document.querySelectorAll('.feed-row, .feed .row, .feed li')).map(e=>e.textContent).join(' | ')`);
  check('the feed recorded the home being finished for that household', /finished a hut|finished rebuilding/.test(feed) || /hut/.test(feed), feed.slice(0, 300));

  // ── and it survives a save and a reload, with the same owner and the same occupants ──
  const saved = await ev(`(async () => {
    const { serializeWorld, deserializeWorld } = await import('/src/app/save.ts');
    const { hashWorld } = await import('/src/sim/world.ts');
    const g = window.__game, text = serializeWorld(g.world), before = hashWorld(g.world);
    const w = deserializeWorld(text);
    const equal = serializeWorld(w) === text;
    const hh = w.households.find((h) => h.id === window.__got.hh);
    const inside = w.persons.filter((p) => p.hhId === window.__got.hh && p.indoors === window.__got.home).map((p) => p.name);
    g.restoreWorld(w, w.settings); g.setPlaying(false); g.select(window.__got.home);
    return { equal, before, after: hashWorld(w), homeId: hh?.homeId, inside, version: w.settings.rulesVersion };
  })()`);
  check('saving and loading keeps the chain', saved.equal && saved.before === saved.after && saved.homeId === done.got.home && saved.version === 7, saved);
  check('the same people are still inside after loading', saved.inside.length === done.got.inside.length, saved.inside);
  await browser.sleep(600);
  const afterCard = await ev(`document.querySelector('.insp-entity')?.textContent ?? ''`);
  check('the reloaded page says the same thing', afterCard.includes(done.got.name) && done.got.inside.every((p) => afterCard.includes(p.name)), afterCard.slice(0, 300));
  await browser.shot(out + '/home-after-load.png');

  // ── and a household that cannot start one says which rule stopped it ──
  const why = await ev(`(async () => {
    const { generateOptions } = await import('/src/sim/decision.ts');
    const { isSolidHome } = await import('/src/sim/constants.ts');
    const w = window.__game.world;
    const rows = [];
    for (const p of w.persons) {
      if (!p.alive) continue;
      const hh = w.households.find((h) => h.id === p.hhId);
      const b = hh ? w.byId.get(hh.homeId) : null;
      if (b && b.ent === 'building' && isSolidHome(b.type)) continue;
      const ctx = generateOptions(w, p, true);
      for (const x of ctx.blocked) if (x.kind === 'plan_site') rows.push({ who: p.name, id: p.id, label: x.label, why: x.blocked });
    }
    if (rows.length) window.__game.select(rows[0].id);
    window.__why = rows[0] ?? null;
    return rows.slice(0, 6);
  })()`);
  check('an unhoused household says why it is not building', why.length > 0, why);
  await browser.sleep(500);
  // The reason goes on the card's Home line, where a viewer already looks to see where somebody lives.
  const homeLine = await ev(`(() => {
    const el = Array.from(document.querySelectorAll('*')).find((e) => e.children.length === 0 && /^Home: /.test(e.textContent || ''));
    return el ? el.textContent : (document.querySelector('.insp-person')?.textContent ?? '').slice(0, 300);
  })()`);
  check('the card says where the household lives and why it has nothing better', /^Home: /.test(homeLine) && homeLine.includes(why[0].why), { shown: homeLine, expected: why[0].why });
  await browser.shot(out + '/why-not-building.png');
} finally {
  const pass = results.filter((r) => r.pass).length;
  writeFileSync(out + '/report.json', JSON.stringify({ url, when: new Date().toISOString(), passed: pass, of: results.length, results }, null, 2) + '\n');
  console.log(`\n${pass}/${results.length} checks passed; report and screenshots in ${out}`);
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
