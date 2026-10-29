import { afterEach, expect, it } from 'vitest';
import { foodHelpScene } from './helpers/food_help';
import { fetchableFood, setFoodFetch } from '../src/sim/food_help';
import { conservationReport } from '../src/sim/economy';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld, hashWorld } from '../src/sim/world';
import { endActivity, newActivity, startActivity } from '../src/sim/activities';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, pin, stage } from './helpers/kit';
import { perceive } from '../src/sim/perception';
import { makeSource } from '../src/sim/sources';
import { observe } from '../src/sim/knowledge';
import { generateOptions } from '../src/sim/decision';

afterEach(() => setFoodFetch(true));

it('rules 44 reproduces the defect: an empty-handed food helper who knows a fish spot still answers no item', () => {
  const f = foodHelpScene({ version: 44 });
  f.ask();
  const req = f.w.requests.find((r) => r.from === f.ada.id && r.to === f.ben.id)!;
  expect(req.kind).toBe('food');
  expect(req.status).toBe('declined');
  expect(req.note).toBe('no item');
  expect(f.ben.commitments).toHaveLength(0);
});

it('rules 45: the helper promises the food kind they personally know a source of, then fishes, delivers, and the recipient eats', () => {
  const f = foodHelpScene({ version: 45, source: 'fish_spot' });
  expect(fetchableFood(f.w, f.ben)).toBe('fish');
  f.ask();
  const req = f.w.requests.find((r) => r.from === f.ada.id && r.to === f.ben.id)!;
  expect(req.status).toBe('promised');
  const c = f.ben.commitments.find((x) => x.status === 'active')!;
  expect(c.kind).toBe('deliver');
  expect(c.item).toBe('fish');
  expect(c.delivered ?? 0).toBe(0);
  expect(req.delivered ?? 0).toBe(0); // a promise is not a delivery
  f.release();
  const hungerBefore = f.ada.needs.hunger;
  let fished = false;
  for (let i = 0; i < 2500 && (req.delivered ?? 0) < 1; i++) {
    stepWorld(f.w);
    if (f.ben.activity?.kind === 'gather' && f.ben.activity.targetId === f.source!.id) fished = true;
  }
  expect(fished).toBe(true);
  expect(req.delivered).toBeGreaterThanOrEqual(1);
  expect(c.delivered).toBe(req.delivered);
  // the recipient can actually eat what arrived (the staged hold that kept her in place is released first)
  if (f.ada.activity) endActivity(f.w, f.ada, 'interrupted', 'staged hold released');
  f.ada.cooldowns.pause = 0; // the staged pin, not just the activity, is what kept her from deciding to eat
  expect(f.ada.inv.fish ?? 0).toBeGreaterThanOrEqual(1);
  const hungerAtArrival = f.ada.needs.hunger;
  const eatenBefore = f.w.ledger.reasons['-eaten'] ?? 0;
  let ate = false;
  for (let i = 0; i < 400 && !ate; i++) {
    stepWorld(f.w);
    if (f.ada.activity?.kind === 'eat') ate = true;
  }
  for (let i = 0; i < 60 && f.ada.activity?.kind === 'eat'; i++) stepWorld(f.w);
  expect(ate).toBe(true);
  expect(f.ada.needs.hunger).toBeGreaterThan(hungerAtArrival + 5);
  expect((f.w.ledger.reasons['-eaten'] ?? 0)).toBeGreaterThan(eatenBefore);
  void hungerBefore;
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 45: a berry path works too, and a helper who knows no food source still answers no item', () => {
  const berry = foodHelpScene({ version: 45, source: 'berry_bush', amount: 6 });
  expect(fetchableFood(berry.w, berry.ben)).toBe('berries');
  berry.ask();
  expect(berry.w.requests.find((r) => r.from === berry.ada.id)!.status).toBe('promised');
  expect(berry.ben.commitments[0].item).toBe('berries');
  const none = foodHelpScene({ version: 45, source: null });
  expect(fetchableFood(none.w, none.ben)).toBeNull();
  none.ask();
  const req = none.w.requests.find((r) => r.from === none.ada.id)!;
  expect(req.status).toBe('declined');
  expect(req.note).toBe('no item');
});

it('rules 45: a remembered bare source does not support a promise, and a helper already holding spare food still gives at once', () => {
  const bare = foodHelpScene({ version: 45, source: 'fish_spot', amount: 1 });
  expect(fetchableFood(bare.w, bare.ben)).toBeNull();
  bare.ask();
  expect(bare.w.requests.find((r) => r.from === bare.ada.id)!.status).toBe('declined');
  const held = foodHelpScene({ version: 45, source: 'fish_spot', benInv: { fruit: 6 } });
  held.ask();
  const req = held.w.requests.find((r) => r.from === held.ada.id)!;
  expect(['fulfilled', 'partial']).toContain(req.status);
  expect(req.delivered).toBeGreaterThanOrEqual(1);
  expect(held.ben.commitments).toHaveLength(0);
});

it('rules 45: the ablation removes only the fetch promise, saves and replays deterministically, and observing changes nothing', () => {
  const restore = parseIntervention('rich-no-food-fetch').install!();
  const off = foodHelpScene({ version: 45 });
  expect(fetchableFood(off.w, off.ben)).toBeNull();
  off.ask();
  expect(off.w.requests.find((r) => r.from === off.ada.id)!.status).toBe('declined');
  restore();
  const f = foodHelpScene({ version: 45 });
  const before = serializeWorld(f.w);
  fetchableFood(f.w, f.ben);
  expect(serializeWorld(f.w)).toBe(before);
  f.ask();
  f.release();
  const saved = serializeWorld(f.w);
  const copy = deserializeWorld(saved);
  for (let i = 0; i < 1500; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(hashWorld(copy)).toBe(hashWorld(f.w));
  expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
});

it('rules 45: a carer holding only meat or bread can bring it to a hungry dependant; rules 44 could not', () => {
  for (const [version, expected] of [[44, false], [45, true]] as const) {
    const s = stage('care-kinds-' + version);
    const w = s.w;
    w.settings.dynamics = 'rich';
    w.settings.rulesVersion = version;
    const mum = addPerson(s, 'Mara', 40.5, 40.5, { age: 32, inv: { meat: 3, bread: 1 }, hunger: 100, thirst: 100, energy: 100 });
    const kit = addPerson(s, 'Kit', 42.5, 40.5, { age: 7, hh: mum.hhId, hunger: 50, thirst: 100, energy: 100 });
    done(s);
    for (const p of [mum, kit]) perceive(w, p);
    const o = generateOptions(w, mum, true, true).options.find((x) => /^Bring .* to Kit$/.test(x.label));
    expect(!!o, `rules ${version}`).toBe(expected);
    if (o) expect(o.label).toBe('Bring bread to Kit');
  }
});

it('rules 45: a hungry person carrying only meat is offered a meal from their pack and eats it; rules 44 was not', () => {
  for (const [version, expected] of [[44, false], [45, true]] as const) {
    const s = stage('eat-meat-' + version);
    const w = s.w;
    w.settings.dynamics = 'rich';
    w.settings.rulesVersion = version;
    const hal = addPerson(s, 'Hal', 40.5, 40.5, { age: 32, inv: { meat: 2 }, hunger: 40, thirst: 100, energy: 100 });
    done(s);
    perceive(w, hal);
    const o = generateOptions(w, hal, true, true).options.find((x) => x.kind === 'eat');
    expect(!!o, `rules ${version}`).toBe(expected);
    if (o?.make) {
      hal.cooldowns.pause = 0;
      startActivity(w, hal, o.make()!);
      for (let i = 0; i < 80 && (hal.inv.meat ?? 0) >= 2; i++) stepWorld(w);
      expect(hal.inv.meat ?? 0).toBeLessThan(2);
      expect(hal.needs.hunger).toBeGreaterThan(40);
      expect(conservationReport(w).ok).toBe(true);
    }
  }
});

it('rules 45: a hungry child with no food in reach goes to find a household adult they last saw, and is then fed; rules 44 stays put', () => {
  for (const [version, expected] of [[44, false], [45, true]] as const) {
    const s = stage('seek-carer-' + version);
    const w = s.w;
    w.settings.dynamics = 'rich';
    w.settings.rulesVersion = version;
    const abel = addPerson(s, 'Abel', 62.5, 40.5, { age: 34, inv: { fish: 4 }, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 0.9 } });
    const eli = addPerson(s, 'Eli', 40.5, 40.5, { age: 6, hh: abel.hhId, hunger: 32, thirst: 100, energy: 100 });
    done(s);
    eli.whereabouts[abel.id] = { x: 62.5, y: 40.5, tick: w.tick - 300 };
    for (const p of [abel, eli]) perceive(w, p);
    const ctx = generateOptions(w, eli, true, true);
    const o = ctx.options.find((x) => x.label === 'Go and find Abel');
    expect(!!o, `rules ${version}`).toBe(expected);
    if (!o?.make) continue;
    expect(o.need).toBe('hunger');
    eli.cooldowns.pause = 0;
    // Abel stays where Eli last saw him (a staged warmth wait; a pinned person could not be talked to or handed anything)
    abel.cooldowns.pause = 0;
    startActivity(w, abel, newActivity(w, abel, { kind: 'rest', label: 'Resting (staged)', goal: 'staged: staying put', need: 'warmth', targetId: 0, here: true, amount: 3000, utility: 100, minCommit: 3000, maxTicks: 3200, data: { sticky: true } }));
    startActivity(w, eli, o.make()!);
    const hunger0 = eli.needs.hunger;
    let found = false;
    let fed = false;
    for (let i = 0; i < 1500 && !fed; i++) {
      stepWorld(w);
      if (eli.log.some((l) => l.text === 'Found Abel.')) found = true;
      if ((eli.inv.fish ?? 0) > 0 || eli.needs.hunger > hunger0 + 8) fed = true;
    }
    expect(found).toBe(true);
    expect(fed).toBe(true);
    // the food came from Abel's pack and nowhere else
    expect((abel.inv.fish ?? 0) + (eli.inv.fish ?? 0) + (w.ledger.reasons['-eaten'] ?? 0)).toBe(4);
    expect(conservationReport(w).ok).toBe(true);
  }
});

it('rules 45: the seek switch removes only the seek step, reversibly', () => {
  const s = stage('seek-carer-switch');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 45;
  const abel = addPerson(s, 'Abel', 62.5, 40.5, { age: 34, inv: { fish: 4 }, hunger: 100, thirst: 100, energy: 100 });
  const eli = addPerson(s, 'Eli', 40.5, 40.5, { age: 6, hh: abel.hhId, hunger: 32, thirst: 100, energy: 100 });
  done(s);
  eli.whereabouts[abel.id] = { x: 62.5, y: 40.5, tick: w.tick - 300 };
  perceive(w, eli);
  const restore = parseIntervention('rich-no-seek-carer').install!();
  expect(generateOptions(w, eli, true, true).options.find((x) => x.label === 'Go and find Abel')).toBeUndefined();
  restore();
  expect(generateOptions(w, eli, true, true).options.find((x) => x.label === 'Go and find Abel')).toBeDefined();
});

it('rules 45: going to where the adult was last seen and not finding them fails honestly and is not retried at once', () => {
  const s = stage('seek-carer-miss');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 45;
  const abel = addPerson(s, 'Abel', 62.5, 70.5, { age: 34, inv: { fish: 4 }, hunger: 100, thirst: 100, energy: 100 });
  const eli = addPerson(s, 'Eli', 40.5, 40.5, { age: 6, hh: abel.hhId, hunger: 32, thirst: 100, energy: 100 });
  done(s);
  pin(abel);
  eli.whereabouts[abel.id] = { x: 62.5, y: 40.5, tick: w.tick - 300 }; // where Abel was, not where he is
  perceive(w, eli);
  const o = generateOptions(w, eli, true, true).options.find((x) => x.label === 'Go and find Abel')!;
  expect(o).toBeDefined();
  eli.cooldowns.pause = 0;
  startActivity(w, eli, o.make!()!);
  for (let i = 0; i < 600 && eli.activity?.data.seek; i++) stepWorld(w);
  expect(eli.whereabouts[abel.id]).toBeUndefined();
  expect(eli.log.some((l) => /Abel was not where I expected/.test(l.text))).toBe(true);
  expect((eli.cooldowns['seek' + abel.id] ?? 0)).toBeGreaterThan(w.tick);
  perceive(w, eli);
  const again = generateOptions(w, eli, true, true);
  expect(again.options.find((x) => x.label === 'Go and find Abel')).toBeUndefined();
  expect(again.blocked.find((x) => x.label === 'Go and find Abel')?.blocked).toMatch(/looked for them lately|does not know/);
});

it('rules 45: a small child who knows a source still answers no item rather than promising to fetch', () => {
  const s = stage('child-helper');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 45;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 30, hunger: 40, thirst: 100, energy: 100 });
  const tot = addPerson(s, 'Tot', 42, 40.5, { age: 3, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1 } });
  const spot = makeSource(w, 'fish_spot', 64, 38, 8);
  observe(w, tot, spot);
  done(s);
  perceive(w, tot);
  expect(fetchableFood(w, tot)).toBeNull();
  void ada;
});
