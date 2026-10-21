// Fatal injuries must not be undone by passive recovery before death is handled.
//
// Wildlife runs before people. A bite can set health to zero and record a cause.
// stepPerson then updates needs, and favourable hunger, thirst and warmth add health,
// before the existing death check. These scenes are staged. They step the real world.
import { afterEach, describe, expect, it } from 'vitest';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { parseIntervention } from '../scripts/lab/lab';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { defendsWolves } from '../src/sim/defence';
import { claimUnits } from '../src/sim/economy';
import { doorPoint, enterHome, hasHabitation, occupants } from '../src/sim/habitation';
import { setFatalHold } from '../src/sim/lifecycle';
import { currentWorldSettings } from '../src/sim/profiles';
import { preparesFood } from '../src/sim/provision';
import { RNG } from '../src/sim/rng';
import { EXPERIMENTAL_MOOD_RULES_VERSION, isSupportedRulesVersion, validateRulesVersion } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import type { World } from '../src/sim/types';
import { makeWolf } from '../src/sim/wildlife';
import { hashWorld, stepWorld } from '../src/sim/world';

afterEach(() => setFatalHold(true));

function worldAt(seed: string, rulesVersion?: number): World {
  const settings = currentWorldSettings('normal', seed, { immigration: false });
  if (rulesVersion !== undefined) settings.rulesVersion = rulesVersion;
  return testKit.flatWorld(settings);
}

/** Ada outdoors, fed and warm, with a wolf already in bite range. Staged. */
function biteScene(rulesVersion?: number) {
  const w = worldAt('fatal-bite', rulesVersion);
  const p = testKit.addPerson(w, new RNG(71), { name: 'Ada', x: 40.5, y: 40.5, age: 25, hunger: 92, thirst: 92, energy: 92 });
  testKit.finish(w, 'natural');
  w.tick = 1000;
  p.needs.hunger = 92;
  p.needs.thirst = 92;
  p.needs.warmth = 80;
  p.needs.energy = 92;
  p.immuneUntil = 1e9;
  p.pose = 'stand';
  p.activity = null;
  const wolf = makeWolf(w, 40.8, 40.5);
  wolf.state = 'stalk';
  wolf.targetId = p.id;
  wolf.until = 1e9;
  wolf.cooldown = 0;
  return { w, p, wolf };
}

function deathsOf(w: World, name: string) {
  return w.deceased.filter((d) => d.name === name);
}

function deathLines(w: World, name: string) {
  return w.events.filter((e) => e.text.includes(`${name} died`));
}

describe('a fatal bite is death, not a wound that passive recovery undoes', () => {
  it('reaches zero health during the tick and dies through the ordinary death path', () => {
    const { w, p } = biteScene();
    p.health = 1;
    const id = p.id;
    stepWorld(w);
    expect(w.events.some((e) => e.text.includes('A wolf bit Ada fatally'))).toBe(true);
    expect(w.persons.some((q) => q.id === id)).toBe(false);
    expect(w.byId.has(id)).toBe(false);
    expect(p.alive).toBe(false);
    const dead = deathsOf(w, 'Ada');
    expect(dead).toHaveLength(1);
    expect(dead[0].cause).toBe('wolf attack');
    expect(deathLines(w, 'Ada').map((e) => e.text)).toEqual([expect.stringContaining('Ada died (wolf attack)')]);
  });

  it('still lets a surviving bite take ordinary recovery', () => {
    const { w, p } = biteScene();
    p.health = 40;
    stepWorld(w);
    expect(p.alive).toBe(true);
    expect(w.persons).toContain(p);
    expect(w.deceased.some((d) => d.id === p.id)).toBe(false);
    expect(w.events.some((e) => e.text === 'A wolf bit Ada.')).toBe(true);
    expect(w.events.some((e) => e.text.includes('fatally'))).toBe(false);
    expect(p.health).toBeLessThan(40);
    expect(p.health).toBeGreaterThan(40 - 15);
    expect(p.health - Math.floor(p.health)).toBeCloseTo(0.009, 5);
  });
});

describe('death from a fatal injury happens once', () => {
  it('later ticks and a save/load continuation do not resurrect the person or repeat the death', () => {
    const { w, p } = biteScene();
    p.health = 1;
    const id = p.id;
    stepWorld(w);
    const afterDeath = {
      deceased: deathsOf(w, 'Ada').map((d) => ({ ...d })),
      lines: deathLines(w, 'Ada').map((e) => e.text),
      graves: w.graves.filter((g) => g.name === 'Ada').length,
    };
    expect(afterDeath.deceased).toHaveLength(1);
    for (let i = 0; i < 40; i++) stepWorld(w);
    expect(w.persons.some((q) => q.id === id)).toBe(false);
    expect(deathsOf(w, 'Ada')).toEqual(afterDeath.deceased);
    expect(deathLines(w, 'Ada').map((e) => e.text)).toEqual(afterDeath.lines);

    const text = serializeWorld(w);
    const back = deserializeWorld(text);
    expect(serializeWorld(back)).toBe(text);
    expect(back.persons.some((q) => q.id === id)).toBe(false);
    expect(back.deceased.filter((d) => d.name === 'Ada')).toEqual(afterDeath.deceased);
    for (let i = 0; i < 40; i++) stepWorld(back);
    expect(back.persons.some((q) => q.id === id)).toBe(false);
    expect(back.deceased.filter((d) => d.name === 'Ada')).toEqual(afterDeath.deceased);
    expect(deathLines(back, 'Ada').map((e) => e.text)).toEqual(afterDeath.lines);
    expect(back.graves.filter((g) => g.name === 'Ada')).toHaveLength(afterDeath.graves);
    expect(serializeWorld(back)).not.toBe(text);
  });
});

describe('the ordinary death path still clears activity, claims and occupancy', () => {
  it('does so when zero health is settled by a world tick, without a wolf biting indoors', () => {
    const w = worldAt('fatal-cleanup');
    const p = testKit.addPerson(w, new RNG(32), { name: 'Ada', x: 36.5, y: 42.5, age: 25, hunger: 92, thirst: 92, energy: 92 });
    const home = createBuilding(w, 'hut', 40, 40, p.hhId);
    w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
    testKit.finish(w, 'natural');
    Object.assign(p, doorPoint(home));
    expect(enterHome(w, p, home)).toBeNull();
    expect(w.animals.some((a) => a.type === 'wolf')).toBe(false);
    const bush = makeSource(w, 'berry_bush', 20, 30, 8);
    w.tick = 1000;
    const claim = claimUnits(w, p.id, bush, 1, 5000);
    expect(claim).toBeGreaterThan(0);
    const activity = newActivity(w, p, {
      kind: 'sleep',
      label: 'Sleep at home',
      goal: 'rest',
      targetType: 'building',
      targetId: home.id,
      here: true,
      maxTicks: 2000,
    });
    startActivity(w, p, activity);
    activity.claims.push(claim);
    p.needs.hunger = 92;
    p.needs.thirst = 92;
    p.needs.warmth = 80;
    p.immuneUntil = 1e9;
    p.health = 0;
    p.deathCause = 'wolf attack';
    expect(p.activity).toBe(activity);
    expect(occupants(w, home).map((q) => q.id)).toEqual([p.id]);

    stepWorld(w);

    expect(w.persons.includes(p)).toBe(false);
    expect(p.alive).toBe(false);
    expect(p.activity).toBeNull();
    expect(p.indoors).toBeUndefined();
    expect(occupants(w, home)).toEqual([]);
    expect([...w.reservations.values()].filter((r) => r.owner === p.id)).toEqual([]);
    expect(bush.reserved).toBe(0);
    expect(deathsOf(w, 'Ada')).toEqual([expect.objectContaining({ id: p.id, cause: 'wolf attack' })]);
    expect(deathLines(w, 'Ada')).toHaveLength(1);
  });
});

describe('rules version 4 keeps the old order', () => {
  it('a fatal bite with favourable needs is still undone by passive recovery', () => {
    const { w, p } = biteScene(4);
    p.health = 1;
    stepWorld(w);
    expect(w.settings.rulesVersion).toBe(4);
    expect(w.events.some((e) => e.text.includes('A wolf bit Ada fatally'))).toBe(true);
    expect(p.alive).toBe(true);
    expect(w.persons).toContain(p);
    expect(w.deceased).toEqual([]);
    expect(p.health).toBeCloseTo(0.009, 5);
  });
});

function runBite(rulesVersion: number | undefined, health: number, hold: boolean) {
  const restore = hold ? undefined : parseIntervention('rich-no-fatal-hold').install!();
  try {
    const scene = biteScene(rulesVersion);
    scene.p.health = health;
    stepWorld(scene.w);
    return { alive: scene.p.alive, health: scene.p.health, hash: hashWorld(scene.w), world: scene.w };
  } finally {
    restore?.();
  }
}

describe('the lab can turn the correction off and nothing else', () => {
  it('reproduces the old order on the fatal bite, and leaves a nonfatal bite unchanged', () => {
    const held = runBite(undefined, 40, true);
    const open = runBite(undefined, 40, false);
    expect(open.alive).toBe(true);
    expect(open.health).toBeCloseTo(held.health, 5);
    expect(open.hash).toBe(held.hash);

    const fatal = runBite(undefined, 1, false);
    expect(fatal.alive).toBe(true);
    expect(fatal.health).toBeCloseTo(0.009, 5);
    expect(fatal.world.events.some((e) => e.text.includes('A wolf bit Ada fatally'))).toBe(true);
    expect(defendsWolves(fatal.world)).toBe(true);
    expect(preparesFood(fatal.world)).toBe(true);
    expect(hasHabitation(fatal.world)).toBe(true);

    const oldOn = runBite(4, 1, true);
    const oldOff = runBite(4, 1, false);
    expect(oldOn.alive).toBe(true);
    expect(oldOff.alive).toBe(true);
    expect(oldOff.health).toBeCloseTo(oldOn.health, 5);
    expect(oldOff.hash).toBe(oldOn.hash);
    expect(fatalHoldStillOn()).toBe(true);
  });
});

function fatalHoldStillOn(): boolean {
  const scene = biteScene();
  scene.p.health = 1;
  stepWorld(scene.w);
  return !scene.p.alive;
}

describe('an experimental version-5 save is refused', () => {
  it('is not loaded as version 4 or as the fatal-injury rules', () => {
    expect(isSupportedRulesVersion(EXPERIMENTAL_MOOD_RULES_VERSION)).toBe(false);
    const verdict = validateRulesVersion(EXPERIMENTAL_MOOD_RULES_VERSION);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/mood-ranking/);
    expect(verdict.reason).toMatch(/not loaded as version 4 or as version 6/);
    const scene = biteScene();
    const saved = JSON.parse(serializeWorld(scene.w)) as { world: { settings: { rulesVersion?: number } } };
    saved.world.settings.rulesVersion = EXPERIMENTAL_MOOD_RULES_VERSION;
    expect(() => deserializeWorld(JSON.stringify(saved))).toThrow(/cannot load this world: rules version 5 is the unintegrated experimental mood-ranking/);
  });
});
