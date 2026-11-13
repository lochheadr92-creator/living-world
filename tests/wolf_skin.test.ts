// Rules 241: a wolf's skin is hung where everybody gathers (src/sim/wolf_skin.ts; read in carcass.ts, options_survival.ts
// and world.ts).
// STAGED: a flat world, Ada with a spear, a badly wounded wolf stalking her, and a hall and a camp fire a little way off.
// The engine does the stand, the kill, the offer of the hide, the cutting, the offer to hang it and the hanging; the tests
// choose which offered option she takes and step that activity alone. Where a test starts from a skin already held, that is
// starting state, said so.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { startActivity, stepActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { defProbe, defReset, defSnapshot, setWolfDefence } from '../src/sim/defence';
import { conservationReport } from '../src/sim/economy';
import { updateEnvironment } from '../src/sim/environment';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { RNG } from '../src/sim/rng';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { makeWolf } from '../src/sim/wildlife';
import { setWolfFight } from '../src/sim/wolf_fight';
import { SKIN_CAP, SKIN_SAFETY, SKIN_SIGHT, SKIN_WORTH, WOLF_SKIN_PARTS, setWolfSkin, skinsHung, updateWolfSkin, wolfSkinWorth } from '../src/sim/wolf_skin';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Building, Person, World } from '../src/sim/types';
import { give } from './helpers/kit';
import { settingsFor } from './helpers/util';

afterEach(() => {
  setWolfSkin(true);
  setWolfFight(true);
  setWolfDefence(true);
  defProbe.on = false;
  defReset();
});

/** Ada, fed and rested and armed, at midday; a hall and a camp fire she has seen; a wolf (if asked) three tiles off, stalking
 * her at the health given, its own jaws held (staged). */
function scene(seed: string, version: number, o: { wolf?: number; hall?: boolean; fire?: boolean } = {}) {
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich', rulesVersion: version }));
  const rng = new RNG(71);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92, traits: { caution: 0.1, generosity: 0.8 } });
  const home = createBuilding(w, 'hut', 30, 30, ada.hhId);
  const hh = w.households.find((h) => h.id === ada.hhId);
  if (hh) hh.homeId = home.id;
  const hall = o.hall === false ? null : createBuilding(w, 'hall', 46, 46, 0);
  const fire = o.fire === false ? null : createBuilding(w, 'fire', 36, 46, 0, { fuel: 2000 });
  const wolf = o.wolf === undefined ? null : makeWolf(w, 43.5, 40.5);
  if (wolf) { wolf.state = 'stalk'; wolf.targetId = ada.id; wolf.until = 1e9; wolf.health = o.wolf!; }
  give(w, ada, 'spear');
  testKit.finish(w, 'natural');
  w.tick = 1000;
  updateEnvironment(w);
  if (wolf) wolf.cooldown = 100000;
  for (const b of [home, hall, fire]) if (b) observe(w, ada, b);
  perceive(w, ada);
  return { w, ada, wolf, hall, fire, home };
}
const SEEDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];
/** The first fixed seed in which Ada's first settled stand kills the wounded wolf; the engine does everything. */
function killedWolf(version: number, o: { hall?: boolean; fire?: boolean } = {}) {
  for (const seed of SEEDS) {
    const sc = scene(`skin-${seed}`, version, { ...o, wolf: 30 });
    defProbe.on = true;
    defReset();
    for (let n = 0; n < 2500; n++) {
      const seen = defSnapshot();
      if (seen.droveOff + seen.failed > 0) break;
      stepWorld(sc.w);
    }
    if (defSnapshot().killed > 0) return sc;
  }
  throw new Error('no seed produced a stand that killed the wolf');
}
const option = (w: World, p: Person, key: RegExp) => generateOptions(w, p, true).options.find((o) => key.test(o.key ?? '')) ?? null;
/** Start the offered option and step that activity alone until it ends (the choice is the test's; the doing is the engine's). */
function carryOut(w: World, p: Person, key: RegExp): string {
  const opt = option(w, p, key);
  if (!opt) return 'not offered';
  const act = opt.make!()!;
  startActivity(w, p, act);
  for (let n = 0; n < 3000 && p.activity === act; n++) { w.tick++; stepActivity(w, p); }
  return p.lastResult?.outcome ?? 'unfinished';
}
const body = (w: World) => w.piles.find((b) => b.carcass?.species === 'wolf')!;
/** Where the killer is not told the wolf is dead (before rules 241), the world runs on until she has looked and stopped fearing the place. */
function untilSheHasLooked(w: World, p: Person): void {
  for (let n = 0; n < 1200 && generateOptions(w, p, true).dangers.length; n++) stepWorld(w);
}

describe('rules 241: a wolf\'s skin is hung where everybody gathers', () => {
  it('is a supported version, and its removal and each part are lab arms', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(241);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(241);
    for (const arm of ['rich-no-wolf-skin', ...WOLF_SKIN_PARTS.map((k) => 'rich-no-wolf-skin-' + k)]) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('whoever killed the wolf values its hide, and the hide cut from it is a skin she holds, not a hide in her pack', () => {
    const { w, ada } = killedWolf(241);
    expect(wolfSkinWorth(w, ada, ada.hhId)).toBe(SKIN_WORTH);
    expect(generateOptions(w, ada, true).dangers, 'she saw it die, and does not run from where it was').toHaveLength(0);
    expect(wolfSkinWorth(w, ada, ada.hhId + 99), 'not for a body that is another household\'s').toBe(0);
    expect(carryOut(w, ada, new RegExp(`^butcher:${body(w).id}:hide`))).toBe('success');
    expect(ada.wolfSkins).toBe(1);
    expect(ada.inv.hide ?? 0).toBe(0);
    expect(body(w).carcass!.recovered.hide).toBe(1);
    expect(conservationReport(w).ok, 'the hide is entered as used, kept whole as a skin').toBe(true);
  });

  it('before 241 the same hide is an ordinary hide', () => {
    const { w, ada } = killedWolf(240);
    expect(wolfSkinWorth(w, ada, ada.hhId)).toBe(0);
    expect(generateOptions(w, ada, true).dangers.length, 'and she still fears where it was until she looks').toBeGreaterThan(0);
    untilSheHasLooked(w, ada);
    expect(carryOut(w, ada, new RegExp(`^butcher:${body(w).id}:hide`))).toBe('success');
    expect(ada.wolfSkins).toBeUndefined();
    expect(ada.inv.hide ?? 0).toBe(1);
  });

  it('she hangs it at the hall she knows, and it is there for everybody', () => {
    const { w, ada, hall } = killedWolf(241);
    carryOut(w, ada, new RegExp(`^butcher:${body(w).id}:hide`));
    const opt = option(w, ada, /^hang_skin:/);
    expect(opt?.label).toMatch(/at the hall/);
    expect(carryOut(w, ada, /^hang_skin:/)).toBe('success');
    expect(hall!.wolfSkins).toBe(1);
    expect(ada.wolfSkins).toBeUndefined();
    expect(skinsHung(w)).toBe(1);
    expect(w.events.some((e) => /hung a wolf's skin at the hall/.test(e.text))).toBe(true);
    expect(ada.mood?.thoughts.some((t) => t.kind === 'hung_skin')).toBe(true);
    expect(option(w, ada, /^hang_skin:/), 'with nothing left to hang there is nothing to offer').toBeNull();
    expect(conservationReport(w).ok).toBe(true);
  });

  it('where there is no hall it goes to the camp fire; a place found full is left and another tried', () => {
    const noHall = scene('skin-fire', 241, { hall: false });
    noHall.ada.wolfSkins = 1; // starting state: a skin already cut
    expect(option(noHall.w, noHall.ada, /^hang_skin:/)?.label).toMatch(/at the camp fire/);
    expect(carryOut(noHall.w, noHall.ada, /^hang_skin:/)).toBe('success');
    expect(noHall.fire!.wolfSkins).toBe(1);

    const full = scene('skin-full', 241);
    full.ada.wolfSkins = 1; // starting state
    full.hall!.wolfSkins = SKIN_CAP; // starting state: the hall already shows all it can
    expect(carryOut(full.w, full.ada, /^hang_skin:/)).not.toBe('success');
    expect(full.hall!.wolfSkins).toBe(SKIN_CAP);
    expect(full.ada.wolfSkins, 'she still has it').toBe(1);
    expect(option(full.w, full.ada, /^hang_skin:/)?.label, 'and next she thinks of the fire').toMatch(/at the camp fire/);
  });

  it('nobody without a skin is offered it, and a household\'s own roof is no place for one', () => {
    const { w, ada, home } = scene('skin-none', 241);
    expect(option(w, ada, /^hang_skin:/)).toBeNull();
    ada.wolfSkins = 1; // starting state
    const opt = option(w, ada, /^hang_skin:/);
    expect(opt?.targetId).not.toBe(home.id);
  });

  it('once a day somebody near a hung skin takes heart from it; somebody far off does not', () => {
    const { w, ada, hall } = scene('skin-heart', 241);
    hall!.wolfSkins = 2; // starting state: two skins hang at the hall
    const rng = new RNG(5);
    const near = testKit.addPerson(w, rng, { name: 'Bea', x: hall!.x + 1.5, y: hall!.y + hall!.h + 1.5, hunger: 92, thirst: 92, energy: 92 });
    near.needs.safety = 50;
    ada.x = hall!.x + SKIN_SIGHT + 12;
    w.tick = 1200;
    updateWolfSkin(w);
    const t = near.mood?.thoughts.find((x) => x.kind === 'wolf_skin');
    expect(t?.value, 'two for the first skin and one for the second').toBe(3);
    expect(near.needs.safety).toBe(50 + SKIN_SAFETY);
    expect(ada.mood?.thoughts.some((x) => x.kind === 'wolf_skin') ?? false).toBe(false);
    w.tick = 1400;
    updateWolfSkin(w);
    expect(near.needs.safety, 'once a day, not every time').toBe(50 + SKIN_SAFETY);
    w.tick = 1200 + DAY;
    updateWolfSkin(w);
    expect(near.needs.safety).toBe(50 + 2 * SKIN_SAFETY);
  });

  it('skins held and hung are saved, are part of the state hash, and are refused where they cannot be', () => {
    const { w, ada, hall, home } = scene('skin-save', 241);
    const bare = hashWorld(w);
    ada.wolfSkins = 1;
    hall!.wolfSkins = 2;
    expect(hashWorld(w)).not.toBe(bare);
    const copy = deserializeWorld(serializeWorld(w));
    expect(copy.persons.find((p) => p.id === ada.id)!.wolfSkins).toBe(1);
    expect((copy.byId.get(hall!.id) as Building).wolfSkins).toBe(2);
    expect(hashWorld(copy)).toBe(hashWorld(w));
    hall!.wolfSkins = SKIN_CAP + 1;
    expect(() => deserializeWorld(serializeWorld(w)), 'more than a building shows').toThrow(/wolf skin/);
    hall!.wolfSkins = 2;
    home.wolfSkins = 1;
    expect(() => deserializeWorld(serializeWorld(w)), 'on a household\'s own roof').toThrow(/wolf skin/);
    delete home.wolfSkins;
    w.settings.rulesVersion = 240;
    expect(() => deserializeWorld(serializeWorld(w)), 'in a world before the rule').toThrow(/wolf skin/);
  });

  it('each part can be removed: an ordinary hide, a skin never hung, a skin that gives no heart', () => {
    setWolfSkin(false, 'keep');
    const plain = killedWolf(241);
    expect(wolfSkinWorth(plain.w, plain.ada, plain.ada.hhId)).toBe(0);
    untilSheHasLooked(plain.w, plain.ada);
    carryOut(plain.w, plain.ada, new RegExp(`^butcher:${body(plain.w).id}:hide`));
    expect(plain.ada.wolfSkins).toBeUndefined();
    expect(plain.ada.inv.hide ?? 0).toBe(1);
    setWolfSkin(true);
    setWolfSkin(false, 'hang');
    const kept = scene('skin-parts', 241);
    kept.ada.wolfSkins = 1; // starting state
    expect(option(kept.w, kept.ada, /^hang_skin:/)).toBeNull();
    setWolfSkin(true);
    setWolfSkin(false, 'heart');
    const cold = scene('skin-parts', 241);
    cold.hall!.wolfSkins = 1; // starting state
    cold.ada.x = cold.hall!.x + 1.5;
    cold.ada.y = cold.hall!.y + cold.hall!.h + 1.5;
    cold.w.tick = 1200;
    updateWolfSkin(cold.w);
    expect(cold.ada.mood?.thoughts.some((x) => x.kind === 'wolf_skin') ?? false).toBe(false);
  });
});
