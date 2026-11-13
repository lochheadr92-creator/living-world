// Rules 239: a spear wounds, and a wolf can be killed (src/sim/wolf_fight.ts; read in defence.ts, carcass.ts and world.ts).
// STAGED, as wolf_defence.test.ts is: a flat world, Ada with a spear, a wolf already stalking her. The engine offers the
// defence, ranks it, walks there and resolves it with a hash of the seed; no test writes an outcome. The seeds are fixed.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createBuilding } from '../src/sim/buildings';
import { hasRecoverableParts } from '../src/sim/carcass';
import { defProbe, defReset, defSnapshot, setWolfDefence } from '../src/sim/defence';
import { conservationReport } from '../src/sim/economy';
import { updateEnvironment } from '../src/sim/environment';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { RNG } from '../src/sim/rng';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { makeWolf } from '../src/sim/wildlife';
import { DAY } from '../src/sim/constants';
import { HEAL_EVERY, HELPER_WOUND, RETURN_CLEAR, SPEAR_WOUND, WOLF_FIGHT_PARTS, WOLF_RETURN, setWolfFight, updateWolfFight, woundWolf } from '../src/sim/wolf_fight';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';
import { give } from './helpers/kit';
import { settingsFor } from './helpers/util';

afterEach(() => {
  setWolfFight(true);
  setWolfDefence(true);
  defProbe.on = false;
  defReset();
});

/** Ada, fed and rested and armed, in the open at midday; a wolf three tiles off, stalking her, its own jaws held (staged). */
function scene(seed: string, version: number, health = 100) {
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich', rulesVersion: version }));
  const rng = new RNG(71);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92, traits: { caution: 0.1, generosity: 0.8 } });
  const home = createBuilding(w, 'hut', 30, 30, ada.hhId);
  const hh = w.households.find((h) => h.id === ada.hhId);
  if (hh) hh.homeId = home.id;
  const wolf = makeWolf(w, 43.5, 40.5);
  wolf.state = 'stalk';
  wolf.targetId = ada.id;
  wolf.until = 1e9;
  wolf.health = health;
  give(w, ada, 'spear');
  testKit.finish(w, 'natural');
  w.tick = 1000;
  updateEnvironment(w);
  wolf.cooldown = 100000;
  observe(w, ada, home);
  perceive(w, ada);
  return { w, ada, wolf };
}
const SEEDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];
/** The first fixed seed whose first settled stand was won; the engine does everything (as wolf_defence.test.ts `encounter`). */
function wonStand(version: number, health = 100) {
  for (const seed of SEEDS) {
    const sc = scene(`fight-${seed}`, version, health);
    defProbe.on = true;
    defReset();
    for (let n = 0; n < 2500; n++) {
      const seen = defSnapshot();
      if (seen.droveOff + seen.failed > 0) break;
      stepWorld(sc.w);
    }
    if (defSnapshot().droveOff > 0) return { ...sc, seen: defSnapshot() };
  }
  throw new Error('no seed produced a stand that was won');
}
const wolves = (w: World) => w.animals.filter((a) => a.type === 'wolf');
const bodies = (w: World) => w.piles.filter((b) => b.carcass?.species === 'wolf');

describe('rules 239: a spear wounds, and a wolf can be killed', () => {
  it('is a supported version, and its removal and each part are lab arms', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(239);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(239);
    for (const arm of ['rich-no-wolf-fight', ...WOLF_FIGHT_PARTS.map((k) => 'rich-no-wolf-fight-' + k)]) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('a stand that is won wounds the wolf and still drives it off; before 239 it was never hurt', () => {
    const now = wonStand(239);
    expect(now.wolf.health).toBe(100 - SPEAR_WOUND);
    expect(now.wolf.state, 'it still breaks off').toBe('retreat');
    expect(now.wolf.wary, 'and keeps clear of her').toBeGreaterThan(now.w.tick);
    expect(now.seen.wounded).toBe(1);
    expect(now.seen.killed).toBe(0);
    expect(now.w.events.some((e) => /drove a wolf off with a spear, and wounded it/.test(e.text))).toBe(true);
    const before = wonStand(238);
    expect(before.wolf.health).toBe(100);
    expect(before.seen.wounded).toBe(0);
  });

  it('a wolf already badly wounded is killed by the next stand that is won, and leaves a body to butcher', () => {
    const { w, ada, wolf, seen } = wonStand(239, 30);
    expect(seen.killed).toBe(1);
    expect(w.animals).not.toContain(wolf);
    expect(w.byId.get(wolf.id)).toBeUndefined();
    const [body] = bodies(w);
    expect(body, 'its body lies where it fell').toBeTruthy();
    expect(body.carcass!.initial).toEqual({ meat: 2, hide: 1, fat: 0 });
    expect(body.carcass!.hhId, 'and is the household\'s of whoever killed it').toBe(ada.hhId);
    expect(hasRecoverableParts(w, body)).toBe(true);
    expect(w.events.some((e) => /killed a wolf with a spear/.test(e.text))).toBe(true);
    expect(ada.mood?.thoughts.some((t) => t.kind === 'killed_wolf')).toBe(true);
    expect(conservationReport(w).ok, 'the meat and hide are entered in the goods account').toBe(true);
    expect(ada.alive).toBe(true);
  });

  it('two stands won kill a sound wolf; help makes the wound deeper', () => {
    const alone = scene('fight-count', 239);
    expect(woundWolf(alone.w, alone.wolf, alone.ada, 0)).toBe('wounded');
    expect(alone.wolf.health).toBe(100 - SPEAR_WOUND);
    expect(woundWolf(alone.w, alone.wolf, alone.ada, 0)).toBe('killed');
    expect(wolves(alone.w)).toHaveLength(0);
    expect(woundWolf(alone.w, alone.wolf, alone.ada, 0), 'a dead wolf is not wounded again').toBe('none');
    const helped = scene('fight-count', 239);
    expect(woundWolf(helped.w, helped.wolf, helped.ada, 5), 'help counts for two people at most').toBe('wounded');
    expect(helped.wolf.health).toBe(100 - SPEAR_WOUND - 2 * HELPER_WOUND);
    expect(woundWolf(helped.w, helped.wolf, helped.ada, 2)).toBe('killed');
  });

  it('a wounded wolf mends a point every HEAL_EVERY ticks (five a day), and no further than sound', () => {
    const { w, wolf } = scene('fight-heal', 239, 50);
    for (let i = 0; i < 10 * HEAL_EVERY; i++) { w.tick++; updateWolfFight(w); }
    expect(wolf.health).toBe(60);
    expect(DAY / HEAL_EVERY).toBe(5);
    wolf.health = 99;
    for (let i = 0; i < 5 * HEAL_EVERY; i++) { w.tick++; updateWolfFight(w); }
    expect(wolf.health).toBe(100);
  });

  it('two years after a wolf is killed another comes in at the edge, away from the settlement', () => {
    const { w, ada, wolf } = scene('fight-back', 239, 20);
    expect(woundWolf(w, wolf, ada, 0)).toBe('killed');
    expect(w.wolfReturns).toEqual([w.tick + WOLF_RETURN]);
    w.tick += WOLF_RETURN - 100;
    w.tick -= w.tick % 100;
    updateWolfFight(w);
    expect(wolves(w), 'not before it is due').toHaveLength(0);
    for (let i = 0; i < 400 && wolves(w).length === 0; i++) { w.tick++; updateWolfFight(w); }
    const [back] = wolves(w);
    expect(back).toBeTruthy();
    expect(back.health).toBe(100);
    expect(Math.hypot(back.x - w.camp.x, back.y - w.camp.y)).toBeGreaterThanOrEqual(RETURN_CLEAR);
    expect(Math.min(back.x, back.y, w.W - back.x, w.H - back.y), 'at the edge of the map').toBeLessThan(6);
    expect(w.wolfReturns, 'and the debt is paid').toBeUndefined();
  });

  it('wounds and returns are saved, are part of the state hash, and an earlier version may not carry them', () => {
    const { w, ada, wolf } = scene('fight-save', 239);
    const sound = hashWorld(w);
    woundWolf(w, wolf, ada, 0);
    expect(hashWorld(w)).not.toBe(sound);
    const copy = deserializeWorld(serializeWorld(w));
    expect(wolves(copy)[0].health).toBe(100 - SPEAR_WOUND);
    expect(hashWorld(copy)).toBe(hashWorld(w));
    woundWolf(w, wolf, ada, 0);
    woundWolf(w, wolf, ada, 0);
    const after = deserializeWorld(serializeWorld(w));
    expect(after.wolfReturns).toEqual(w.wolfReturns);
    expect(bodies(after)).toHaveLength(1);
    expect(hashWorld(after)).toBe(hashWorld(w));
    w.settings.rulesVersion = 238;
    expect(() => deserializeWorld(serializeWorld(w))).toThrow();
  });

  it('each part can be removed: no wound, no death, no mending, no return', () => {
    setWolfFight(false, 'wound');
    const none = scene('fight-parts', 239);
    expect(woundWolf(none.w, none.wolf, none.ada, 0)).toBe('none');
    expect(none.wolf.health).toBe(100);
    setWolfFight(true);
    setWolfFight(false, 'kill');
    const lives = scene('fight-parts', 239, 10);
    expect(woundWolf(lives.w, lives.wolf, lives.ada, 0)).toBe('wounded');
    expect(lives.wolf.health, 'it is left with a point of health and does not die').toBe(1);
    expect(wolves(lives.w)).toHaveLength(1);
    setWolfFight(true);
    setWolfFight(false, 'heal');
    const hurt = scene('fight-parts', 239, 50);
    for (let i = 0; i < 3 * HEAL_EVERY; i++) { hurt.w.tick++; updateWolfFight(hurt.w); }
    expect(hurt.wolf.health).toBe(50);
    setWolfFight(true);
    setWolfFight(false, 'back');
    const gone = scene('fight-parts', 239, 10);
    expect(woundWolf(gone.w, gone.wolf, gone.ada, 0)).toBe('killed');
    expect(gone.w.wolfReturns).toBeUndefined();
  });

  it('with every part removed a won stand is what it was at rules 238', () => {
    setWolfFight(false);
    const off = wonStand(239);
    expect(off.wolf.health).toBe(100);
    expect(off.seen.wounded + off.seen.killed).toBe(0);
    expect(off.w.events.some((e) => /wounded it/.test(e.text))).toBe(false);
  });
});
