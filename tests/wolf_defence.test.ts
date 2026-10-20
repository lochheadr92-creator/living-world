// DEFENCE AGAINST WOLVES (rules version 3). The contract the task brief asks for, one `describe` group per requirement.
//
// What is a fixture and what is the simulation: the scenes below place a person, a wolf, some materials and a workspace,
// and call `perceive` so that what the person can see is what perception really gives them. Everything after that is the
// engine's - the option layer offers the defence, the ordinary ranking picks it, the ordinary activity walks there, and
// `defence.ts` resolves the attempt with a hash of the seed. No test writes an outcome, moves a wolf by hand, or puts a
// spear in anybody's pack except as starting equipment.
//
// Everything here is STAGED. It proves the chain works and the gates hold. It says nothing at all about how often a
// defence happens on its own, which is a question for the encounter runs, not for a fixture.
import { afterEach, describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { DAY, TOOL_DEFS, TOOL_RECIPE } from '../src/sim/constants';
import { decide, generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport, produce } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { updateEnvironment } from '../src/sim/environment';
import { currentWorldSettings, settingsForProfile } from '../src/sim/profiles';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import { toolOf } from '../src/sim/tools';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import { makeWolf } from '../src/sim/wildlife';
import {
  ATTEMPT_TICKS,
  COME_FROM,
  DEFENCE_FROM_VERSION,
  GIVE_UP,
  MAX_WEAR,
  MIN_ENERGY,
  MIN_HEALTH,
  REACH,
  THREAT_NEAR,
  WARY_TICKS,
  defProbe,
  defReset,
  defSnapshot,
  defendsWolves,
  driveChance,
  makesSpears,
  setWolfDefence,
  spearOf,
  unfitPerson,
  waryOf,
  facingWolf,
} from '../src/sim/defence';
import { metAWolfLately, wantedTool } from '../src/sim/options_work';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { give } from './helpers/kit';
import { settingsFor } from './helpers/util';
import type { Person, World } from '../src/sim/types';

const ctxFor = (w: World, p: Person) => generateOptions(w, p, true);
const defendOpt = (w: World, p: Person) => ctxFor(w, p).options.find((o) => o.kind === 'defend') ?? null;

interface SceneOpts {
  rulesVersion?: number;
  unversioned?: boolean;
  dynamics?: 'rich' | 'authored';
  /** give the defender a spear as starting equipment */
  armed?: boolean;
  /** where the wolf stands */
  wolfAt?: [number, number];
  /** a second person for the wolf to threaten */
  bystanderAt?: [number, number];
  /** wood and stone in the defender's pack */
  materials?: boolean;
  /** how timid the defender is (0 = bold, 1 = will always run). Explicit, so these tests are about the rule and not the draw. */
  caution?: number;
  generosity?: number;
  /**
   * Hold the wolf's own jaws off for the duration. A wolf bites at 1.2 tiles the moment its cooldown is 0, and would
   * often bite and break off by its own rules before any defence resolved - which is the engine working, but it is not
   * what these tests are about. Every test that needs an ATTEMPT to reach its end sets this; the ones about whether an
   * option appears do not need it.
   */
  wolfHeld?: boolean;
}

/**
 * Ada, fed and rested, in the open. A wolf stands where the scene puts it, already stalking somebody, so there is a real
 * threat rather than an animal wandering past. `perceive` is called last, so everything the options read about the wolf
 * came out of perception.
 */
function scene(seed: string, o: SceneOpts = {}) {
  const version = o.unversioned ? undefined : (o.rulesVersion ?? CURRENT_RULES_VERSION);
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: o.dynamics ?? 'rich', rulesVersion: version }));
  const rng = new RNG(71);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92, traits: { caution: o.caution ?? 0.1, generosity: o.generosity ?? 0.8 } });
  const bea = o.bystanderAt ? testKit.addPerson(w, rng, { name: 'Bea', x: o.bystanderAt[0], y: o.bystanderAt[1], hunger: 92, thirst: 92, energy: 92 }) : null;
  const home = createBuilding(w, 'hut', 30, 30, ada.hhId); // far off: a workspace, not a refuge at her elbow
  const hh = w.households.find((h) => h.id === ada.hhId);
  if (hh) hh.homeId = home.id;
  const [wx, wy] = o.wolfAt ?? [43.5, 40.5];
  const wolf = makeWolf(w, wx, wy);
  wolf.state = 'stalk';
  wolf.targetId = (bea ?? ada).id;
  wolf.until = 1e9;
  // starting equipment goes in BEFORE `finish`, which takes the ledger snapshot: a spear minted afterwards would be a
  // spear the goods account never saw, and `conservationReport` would rightly call it out
  if (o.armed) give(w, ada, 'spear');
  testKit.finish(w, 'natural');
  // midday: `senseRadius` is SENSE_RADIUS x (0.5 + 0.5 x light), so at tick 0 nobody can see far enough for any of this
  w.tick = 1000;
  updateEnvironment(w);
  if (o.wolfHeld) wolf.cooldown = 100000;
  if (o.materials) {
    produce(w, ada.inv, 99, 'wood', TOOL_RECIPE.spear.wood, 'test: given to Ada');
    produce(w, ada.inv, 99, 'stone', TOOL_RECIPE.spear.stone, 'test: given to Ada');
  }
  observe(w, ada, home);
  perceive(w, ada);
  if (bea) perceive(w, bea);
  return { w, ada, bea, wolf, home };
}

/** the seeds the branch searches walk through; fixed, so every run of this file does the same thing */
const SEEDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];

/**
 * An encounter that really ended the wanted way. Each candidate world is an ordinary one - the engine offers, ranks,
 * walks and resolves - and this simply takes the first seed whose first settled attempt came out as asked. It does not
 * force the outcome, and because the seed list is fixed it picks the same world every run.
 */
function encounter(want: 'won' | 'lost', o: SceneOpts, ticks = 2500) {
  for (const seed of SEEDS) {
    const sc = scene(`def-${want}-${seed}`, o);
    defProbe.on = true;
    defReset();
    for (let n = 0; n < ticks; n++) {
      const seen = defSnapshot();
      if (seen.droveOff + seen.failed > 0) break;
      stepWorld(sc.w);
    }
    const seen = defSnapshot();
    if (want === 'won' && seen.droveOff > 0) return { ...sc, seen, seed };
    if (want === 'lost' && seen.failed > 0) return { ...sc, seen, seed };
  }
  throw new Error(`no seed produced a defence that was ${want}`);
}

/** step until `done`, or until `ticks` have passed; returns the ticks taken */
function until(w: World, ticks: number, done: () => boolean): number {
  for (let n = 0; n < ticks; n++) {
    if (done()) return n;
    stepWorld(w);
  }
  return ticks;
}

afterEach(() => {
  setWolfDefence(true);
  defProbe.on = false;
  defReset();
});

// ───────────────────────── 1. the spear is a real thing that has to be made ─────────────────────────

describe('1. a spear takes materials and work, like any other tool', () => {
  it('has a recipe of its own, and it is not free', () => {
    expect(TOOL_RECIPE.spear.wood).toBeGreaterThan(0);
    expect(TOOL_RECIPE.spear.stone).toBeGreaterThan(0);
    expect(TOOL_RECIPE.spear.work).toBeGreaterThan(0);
    expect(TOOL_DEFS.spear.hand, 'it is made by hand, not fired at a kiln').toBeTruthy();
  });

  it('nobody is offered one without the materials in hand', () => {
    const { w, ada } = scene('def-nomats');
    expect(metAWolfLately(ctxFor(w, ada)), 'she has met one, so she would want one').toBe(true);
    expect(wantedTool(ctxFor(w, ada))).toBe('spear');
    expect(ctxFor(w, ada).options.some((o) => o.key === 'craft:spear'), 'but there is nothing to make it from').toBe(false);
  });

  it('with the materials the craft is offered, and making it really consumes them', () => {
    const { w, ada } = scene('def-craft', { materials: true });
    const opt = ctxFor(w, ada).options.find((o) => o.key === 'craft:spear');
    expect(opt, 'the engine offers the craft').toBeTruthy();
    expect(opt!.goal).toMatch(/face a wolf with/);
    const before = { wood: ada.inv.wood ?? 0, stone: ada.inv.stone ?? 0 };
    const act = opt!.make!();
    expect(act).toBeTruthy();
    const report = conservationReport(w);
    expect(report.ok, JSON.stringify(report.diffs)).toBe(true);
    expect(before.wood).toBe(TOOL_RECIPE.spear.wood);
    expect(before.stone).toBe(TOOL_RECIPE.spear.stone);
  });

  it('a spear made by hand is an owned, worn-tracked tool record, not just a count', () => {
    const { w, ada } = scene('def-record', { armed: true });
    const t = toolOf(w, ada, 'spear')!;
    expect(t.kind).toBe('spear');
    expect(t.holder).toBe(ada.id);
    expect(t.ownerHh).toBe(ada.hhId);
    expect(t.wear).toBe(0);
    expect(ada.inv.spear).toBe(1);
  });

  it('a wolf nobody has met is no reason to want one', () => {
    const w: World = testKit.flatWorld(settingsFor('def-quiet', { scene: 'natural', dynamics: 'rich', rulesVersion: CURRENT_RULES_VERSION }));
    const ada = testKit.addPerson(w, new RNG(5), { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const home = createBuilding(w, 'hut', 41, 40, ada.hhId);
    for (const [x, y] of [[44, 41], [45, 40], [43, 39]] as [number, number][]) observe(w, ada, makeSource(w, 'tree', x, y, 9));
    testKit.finish(w, 'natural');
    observe(w, ada, home);
    perceive(w, ada);
    expect(metAWolfLately(ctxFor(w, ada))).toBe(false);
    expect(wantedTool(ctxFor(w, ada))).not.toBe('spear');
  });

  it('a wolf seen yesterday and remembered is a reason; one remembered from last week is not', () => {
    const { w, ada } = scene('def-remember');
    // take the wolf out of sight entirely, leaving only the memory of it
    ada.seen.length = 0;
    const danger = Object.values(ada.beliefs).find((b) => b.kind === 'danger');
    expect(danger, 'seeing it left a danger belief').toBeTruthy();
    w.tick = danger!.seen + Math.round(DAY * 0.5);
    expect(metAWolfLately(ctxFor(w, ada)), 'half a day ago still counts').toBe(true);
    w.tick = danger!.seen + DAY * 7;
    expect(metAWolfLately(ctxFor(w, ada)), 'a week ago does not').toBe(false);
  });
});

// ───────────────────────── 2. who may not defend ─────────────────────────

describe('2. the unarmed and the unfit get no defensive benefit', () => {
  const reasons: [string, (p: Person, w: World) => void, RegExp][] = [
    ['nothing in hand', () => {}, /nothing to face it with/],
    ['too badly hurt', (p) => void (p.health = MIN_HEALTH - 1), /too badly hurt/],
    ['too worn out', (p) => void (p.needs.energy = MIN_ENERGY - 1), /too worn out/],
    ['carrying an injury', (p, w) => void (p.injury = { kind: 'sprain', since: w.tick, until: w.tick + DAY, how: 'test' }), /injury/],
    ['in a fever', (p, w) => void (p.illness = { since: w.tick, severity: 0.9, rested: 0, course: DAY, how: 'test' }), /too ill/],
  ];
  for (const [name, hobble, why] of reasons) {
    it(`${name}: no defence is offered, and the reason says so`, () => {
      const armed = name !== 'nothing in hand';
      const { w, ada } = scene('def-unfit-' + name.replace(/\s+/g, '-'), { armed });
      hobble(ada, w);
      const unfit = unfitPerson(w, ada);
      expect(unfit, 'they are unfit').toBeTruthy();
      expect(unfit!.why).toMatch(why);
      expect(defendOpt(w, ada), 'and nothing is on offer').toBeNull();
    });
  }

  it('a child never defends, armed or not', () => {
    const w: World = testKit.flatWorld(settingsFor('def-child', { scene: 'natural', dynamics: 'rich', rulesVersion: CURRENT_RULES_VERSION }));
    const kid = testKit.addPerson(w, new RNG(9), { name: 'Pip', x: 40.5, y: 40.5, age: 7, hunger: 92, thirst: 92, energy: 92 });
    const wolf = makeWolf(w, 42.5, 40.5);
    wolf.state = 'stalk';
    wolf.targetId = kid.id;
    testKit.finish(w, 'natural');
    give(w, kid, 'spear');
    perceive(w, kid);
    expect(unfitPerson(w, kid)!.why).toMatch(/child/);
    expect(defendOpt(w, kid)).toBeNull();
    // and the central filter forbids the activity kind to a child besides
    expect(rankOptions(ctxFor(w, kid)).some((o) => o.kind === 'defend')).toBe(false);
  });

  it('a spear worn past use is no spear at all', () => {
    const { w, ada } = scene('def-worn', { armed: true });
    const t = toolOf(w, ada, 'spear')!;
    t.wear = MAX_WEAR + 1;
    expect(spearOf(w, ada)).toBeNull();
    expect(unfitPerson(w, ada)!.why).toMatch(/worn past use/);
    expect(defendOpt(w, ada)).toBeNull();
  });

  it('a spear in a store is not a spear in your hand', () => {
    const { w, ada, home } = scene('def-instore', { armed: true });
    const t = toolOf(w, ada, 'spear')!;
    // put it down at home, the ordinary way: the record follows the count
    ada.inv.spear = 0;
    home.store.items.spear = 1;
    t.holder = home.id;
    expect(spearOf(w, ada)).toBeNull();
    expect(defendOpt(w, ada)).toBeNull();
  });
});

// ───────────────────────── 3. a defence can be chosen despite the flee filter ─────────────────────────

describe('3. a defence competes with fleeing instead of being filtered out', () => {
  it('both are on the table, and the filter lets both through', () => {
    const { w, ada } = scene('def-compete', { armed: true });
    const ctx = ctxFor(w, ada);
    expect(ctx.options.some((o) => o.kind === 'flee'), 'fleeing is still offered').toBe(true);
    expect(ctx.options.some((o) => o.kind === 'defend'), 'and so is standing').toBe(true);
    const ranked = rankOptions(ctx);
    expect(ranked.length, 'the wolf still clears everything else off the list').toBeGreaterThan(0);
    expect(ranked.every((o) => o.kind === 'flee' || o.kind === 'defend'), ranked.map((o) => o.kind).join(',')).toBe(true);
    expect(ranked.some((o) => o.kind === 'defend')).toBe(true);
  });

  it('an unarmed person facing the same wolf is left with fleeing alone', () => {
    const { w, ada } = scene('def-compete-unarmed');
    const ranked = rankOptions(ctxFor(w, ada));
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((o) => o.kind === 'flee')).toBe(true);
  });

  it('a defence really gets chosen and started by the ordinary decision', () => {
    const { w, ada, wolf } = scene('def-chosen', { armed: true });
    const ranked = rankOptions(ctxFor(w, ada));
    expect(ranked[0].kind, ranked.map((o) => `${o.kind}:${o.util.toFixed(0)}`).join(' ')).toBe('defend');
    decide(w, ada, 'test');
    expect(ada.activity?.kind).toBe('defend');
    expect(ada.activity?.targetId).toBe(wolf.id);
  });
});

// ───────────────────────── 4. nothing happens to what cannot be seen or reached ─────────────────────────

describe('4. no action against an unseen or distant wolf', () => {
  it('a wolf nobody can see is not attacked, however close the memory of it is', () => {
    const { w, ada } = scene('def-unseen', { armed: true });
    expect(defendOpt(w, ada), 'while she can see it, there is an option').toBeTruthy();
    ada.seen.length = 0; // out of sight; the danger belief remains
    expect(Object.values(ada.beliefs).some((b) => b.kind === 'danger'), 'she still remembers it').toBe(true);
    expect(defendOpt(w, ada), 'but a memory is not something to go at').toBeNull();
  });

  it('a wolf too far off to walk to is not an option', () => {
    const { w, ada } = scene('def-far', { wolfAt: [40.5 + COME_FROM + 6, 40.5], armed: true });
    expect(defendOpt(w, ada)).toBeNull();
  });

  it('a wolf already leaving is not driven off again', () => {
    const { w, ada, wolf } = scene('def-leaving', { armed: true });
    wolf.state = 'retreat';
    expect(defendOpt(w, ada)).toBeNull();
  });

  it('the attempt gives up rather than chasing a wolf across the map', () => {
    const { w, ada, wolf } = scene('def-chase', { armed: true });
    decide(w, ada, 'test');
    expect(ada.activity?.kind).toBe('defend');
    // it bolts far beyond the chase limit
    wolf.x = ada.x + GIVE_UP + 20;
    wolf.y = ada.y;
    until(w, 600, () => ada.activity?.kind !== 'defend');
    expect(ada.activity?.kind, 'she is not still after it').not.toBe('defend');
    expect(w.tick, 'and neither of them is frozen').toBeGreaterThan(0);
    expect(wolf.health).toBeGreaterThan(0);
  });
});

// ───────────────────────── 5. a success really changes the wolf ─────────────────────────

describe('5. driving a wolf off changes the real wolf', () => {
  it('a successful attempt ends the stalk, sends it home, and leaves it wary of that person', () => {
    const { w, ada, wolf } = encounter('won', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    expect(wolf.state, 'it broke off').toBe('retreat');
    expect(wolf.targetId, 'and is after nobody').toBe(0);
    expect(wolf.wary, 'and remembers to keep clear').toBeGreaterThan(w.tick);
    expect(wolf.waryOf).toBe(ada.id);
    expect(waryOf(w, wolf, ada)).toBe(true);
    expect(wolf.health, 'nothing was killed or wounded').toBe(100);
  });

  it('the wariness is bounded and really keeps it off that person while it lasts', () => {
    const { w, ada, wolf } = encounter('won', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    const set = wolf.wary!;
    expect(set - w.tick).toBeLessThanOrEqual(WARY_TICKS);
    expect(waryOf(w, wolf, ada)).toBe(true);
    const later = { ...w, tick: set + 1 } as World;
    expect(waryOf(later, wolf, ada), 'and it wears off; this is not permanent safety').toBe(false);
  });

  it('a failed attempt leaves the wolf where it was, and nobody frozen', () => {
    const { ada, wolf, seen } = encounter('lost', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    expect(seen.failed).toBeGreaterThan(0);
    expect(seen.droveOff, 'this one really is the failing branch').toBe(0);
    expect(wolf.wary, 'it was not driven off').toBeUndefined();
    expect(wolf.state, 'and it is still after her').toBe('stalk');
    expect(ada.alive).toBe(true);
    expect(wolf.health).toBe(100);
    expect(ada.lastResult?.outcome, 'and the failure is on her record').toBeTruthy();
  });

  it('both branches really happen across seeds: a spear is neither useless nor a certainty', () => {
    let won = 0;
    let lost = 0;
    for (const seed of SEEDS) {
      const { w } = scene('def-both-' + seed, { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
      defProbe.on = true;
      defReset();
      for (let n = 0; n < 2500; n++) {
        if (defSnapshot().droveOff + defSnapshot().failed > 0) break;
        stepWorld(w);
      }
      won += defSnapshot().droveOff;
      lost += defSnapshot().failed;
    }
    expect(won, `${won} driven off, ${lost} not, over ${SEEDS.length} worlds`).toBeGreaterThan(0);
    expect(lost, `${won} driven off, ${lost} not, over ${SEEDS.length} worlds`).toBeGreaterThan(0);
  });

  it('the chance is bounded on both sides: a spear is never a certainty and never useless', () => {
    const { w, ada } = scene('def-chance', { armed: true });
    const spear = toolOf(w, ada, 'spear')!;
    ada.skills.forage = 1.8;
    ada.health = 100;
    ada.needs.energy = 100;
    expect(driveChance(w, ada, spear, 5)).toBeLessThanOrEqual(0.82);
    ada.skills.forage = 0.5;
    ada.health = MIN_HEALTH;
    ada.needs.energy = MIN_ENERGY;
    spear.wear = MAX_WEAR - 1;
    expect(driveChance(w, ada, spear, 0)).toBeGreaterThanOrEqual(0.15);
  });
});

// ───────────────────────── 6. protecting somebody else ─────────────────────────

describe('6. standing in for somebody else needs a threat you can see', () => {
  it('a wolf close to a visible neighbour is a reason to go, and the option names them', () => {
    const { w, ada, bea } = scene('def-other', { armed: true, wolfAt: [46.3, 40.5], bystanderAt: [47.5, 40.5] });
    const opt = defendOpt(w, ada);
    expect(opt, 'she can see both and goes').toBeTruthy();
    expect(opt!.label).toContain(bea!.name);
    expect(opt!.goal).toContain(bea!.name);
  });

  it('a neighbour she cannot see is nobody to protect', () => {
    const { w, ada } = scene('def-other-unseen', { armed: true, wolfAt: [46.3, 40.5], bystanderAt: [47.5, 40.5] });
    expect(defendOpt(w, ada)).toBeTruthy();
    ada.seen = ada.seen.filter((s) => s.ent !== 'person');
    expect(defendOpt(w, ada), 'with nobody visible in danger, and the wolf far from her, there is nothing to answer').toBeNull();
  });

  it('a wolf well away from everybody is nobody being threatened', () => {
    const { w, ada } = scene('def-other-far', { armed: true, wolfAt: [46.3, 40.5], bystanderAt: [46.3 + THREAT_NEAR + 2, 40.5] });
    expect(defendOpt(w, ada)).toBeNull();
  });

  it('it stops when the person it was for is out of danger, without claiming to have saved anybody', () => {
    const { w, ada, bea, wolf } = scene('def-other-stop', { armed: true, wolfAt: [46.3, 40.5], bystanderAt: [47.5, 40.5], wolfHeld: true });
    decide(w, ada, 'test');
    expect(ada.activity?.kind).toBe('defend');
    expect(ada.activity?.data.forWhom).toBe(bea!.id);
    const events = w.events.length;
    bea!.x = 20;
    bea!.y = 20;
    wolf.targetId = 0;
    until(w, 300, () => ada.activity?.kind !== 'defend');
    expect(ada.activity?.kind).not.toBe('defend');
    const said = w.events.slice(events).map((e) => e.text).join(' | ');
    expect(said, 'nothing says she drove anything off').not.toMatch(/drove a wolf off/);
  });
});

// ───────────────────────── 7. wear and accounting ─────────────────────────

describe('7. the spear wears, and nothing is created or lost', () => {
  it('a failed attempt still costs the spear something', () => {
    const { w, ada } = encounter('lost', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    expect(toolOf(w, ada, 'spear')!.wear, 'win or lose, it was used').toBeGreaterThan(0);
  });

  it('a successful one costs it too', () => {
    const { w, ada } = encounter('won', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    expect(toolOf(w, ada, 'spear')!.wear).toBeGreaterThan(0);
  });

  it('a spear worn past use retires: its owner can no longer face a wolf with it', () => {
    // one attempt short of the line. A defending spear is retired, not snapped (defence.ts MAX_WEAR), so what hard use
    // costs is having to make another.
    const { w, ada } = scene('def-retire', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    const spear = toolOf(w, ada, 'spear')!;
    spear.wear = MAX_WEAR - 1;
    expect(unfitPerson(w, ada), 'still usable, just').toBeNull();
    defProbe.on = true;
    defReset();
    until(w, 2500, () => defSnapshot().attempts > 0 && !ada.activity);
    expect(defSnapshot().attempts, 'she made one last attempt with it').toBeGreaterThan(0);
    expect(spear.wear, 'and it is past use now').toBeGreaterThanOrEqual(MAX_WEAR);
    expect(defSnapshot().spearsRetired).toBeGreaterThan(0);
    expect(spearOf(w, ada), 'she will not face another wolf with it').toBeNull();
    expect(unfitPerson(w, ada)!.why).toMatch(/worn past use/);
    expect(ada.inv.spear, 'but it is still hers, and still in the accounts').toBe(1);
    const report = conservationReport(w);
    expect(report.ok, JSON.stringify(report.diffs)).toBe(true);
  });

  it('the whole encounter leaves the goods account balanced', () => {
    const { w } = encounter('won', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    const report = conservationReport(w);
    expect(report.ok, JSON.stringify(report.diffs)).toBe(true);
  });
});

// ───────────────────────── 8. save, load and determinism ─────────────────────────

describe('8. an encounter survives a save and runs the same twice', () => {
  it('two runs of the same world are the same run', () => {
    const a = createWorld(currentWorldSettings('normal', 'def-det', { immigration: false }));
    const b = createWorld(currentWorldSettings('normal', 'def-det', { immigration: false }));
    for (let n = 0; n < 2000; n++) {
      stepWorld(a);
      stepWorld(b);
    }
    expect(hashWorld(a)).toBe(hashWorld(b));
  });

  it('a defence in progress reads back and carries on identically', () => {
    const { w, ada, wolf } = scene('def-save', { armed: true, wolfAt: [43.5, 40.5] });
    decide(w, ada, 'test');
    expect(ada.activity?.kind).toBe('defend');
    const text = serializeWorld(w);
    const back = deserializeWorld(text);
    const adaBack = back.persons.find((p) => p.name === 'Ada')!;
    expect(adaBack.activity?.kind, 'the attempt came back').toBe('defend');
    expect(adaBack.activity?.targetId).toBe(wolf.id);
    expect(adaBack.inv.spear).toBe(1);
    expect(back.tools.some((t) => t.kind === 'spear' && t.holder === adaBack.id)).toBe(true);
    for (let n = 0; n < 300; n++) {
      stepWorld(w);
      stepWorld(back);
    }
    expect(hashWorld(back)).toBe(hashWorld(w));
  });

  it("a wolf's memory of being driven off survives the save, and is part of the state hash", () => {
    const { w, wolf } = encounter('won', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    expect(wolf.wary).toBeDefined();
    // the same world with that one memory erased is a different world to the hash
    const withIt = hashWorld(w);
    const kept = { wary: wolf.wary, waryOf: wolf.waryOf };
    delete wolf.wary;
    delete wolf.waryOf;
    expect(hashWorld(w), 'being driven off is part of what the world is').not.toBe(withIt);
    wolf.wary = kept.wary;
    wolf.waryOf = kept.waryOf;
    expect(hashWorld(w)).toBe(withIt);
    const back = deserializeWorld(serializeWorld(w));
    const wolfBack = back.animals.find((a) => a.id === wolf.id)!;
    expect(wolfBack.wary).toBe(wolf.wary);
    expect(wolfBack.waryOf).toBe(wolf.waryOf);
    expect(hashWorld(back)).toBe(hashWorld(w));
  });

  it('the observation counters change nothing', () => {
    defReset();
    defProbe.on = false;
    const off = createWorld(currentWorldSettings('normal', 'def-probe', { immigration: false }));
    for (let n = 0; n < 2000; n++) stepWorld(off);
    const quiet = { hash: hashWorld(off), text: serializeWorld(off) };
    defProbe.on = true;
    const on = createWorld(currentWorldSettings('normal', 'def-probe', { immigration: false }));
    for (let n = 0; n < 2000; n++) stepWorld(on);
    expect(hashWorld(on)).toBe(quiet.hash);
    expect(serializeWorld(on)).toBe(quiet.text);
  });
});

// ───────────────────────── 9. older versions ─────────────────────────

describe('9. versions below 3 have none of it', () => {
  it.each([
    ['version 1', { rulesVersion: 1 }],
    ['version 2', { rulesVersion: 2 }],
    ['unversioned', { unversioned: true }],
    ['authored', { dynamics: 'authored' as const, rulesVersion: CURRENT_RULES_VERSION }],
  ])('%s: no spear is wanted and no defence is offered', (_name, opts) => {
    const { w, ada } = scene('def-old-' + _name.replace(/\s+/g, '-'), { ...opts, armed: true });
    expect(makesSpears(w)).toBe(false);
    expect(defendsWolves(w)).toBe(false);
    expect(wantedTool(ctxFor(w, ada))).not.toBe('spear');
    expect(defendOpt(w, ada)).toBeNull();
    // and the filter in decision.ts leaves such a world with fleeing alone, exactly as before
    const ranked = rankOptions(ctxFor(w, ada));
    expect(ranked.every((o) => o.kind !== 'defend')).toBe(true);
  });

  it('a whole version-2 run makes no spear and drives nothing off', () => {
    const w = createWorld({ ...settingsForProfile('normal', 'def-v2-run', { dynamics: 'rich', immigration: false }), rulesVersion: 2 });
    for (let n = 0; n < 6000; n++) stepWorld(w);
    expect(w.tools.some((t) => t.kind === 'spear')).toBe(false);
    expect(w.animals.some((a) => a.wary !== undefined)).toBe(false);
  });

  it('the version this feature starts at is below the current one, so it is actually on', () => {
    expect(DEFENCE_FROM_VERSION).toBe(3);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(DEFENCE_FROM_VERSION);
  });
});

// ───────────────────────── 10. the lab switch ─────────────────────────

describe('10. the lab switch removes the action and leaves the rest', () => {
  it('with it off nobody defends, but spears are still made and carried', () => {
    setWolfDefence(false);
    const { w, ada } = scene('def-off', { armed: true, materials: true });
    expect(defendsWolves(w), 'the action is off').toBe(false);
    expect(makesSpears(w), 'the spear is not').toBe(true);
    expect(defendOpt(w, ada)).toBeNull();
    expect(unfitPerson(w, ada)!.why).toMatch(/no such thing/);
  });

  it('with it off fleeing, fire and shelter are untouched', () => {
    setWolfDefence(false);
    const { w, ada } = scene('def-off-flee', { armed: true });
    const ranked = rankOptions(ctxFor(w, ada));
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((o) => o.kind === 'flee'), 'fleeing is exactly what it was').toBe(true);
  });

  it('it ends an attempt that was already running at a fork', () => {
    const { w, ada } = scene('def-off-fork', { armed: true });
    decide(w, ada, 'test');
    expect(ada.activity?.kind).toBe('defend');
    setWolfDefence(false);
    until(w, 200, () => ada.activity?.kind !== 'defend');
    expect(ada.activity?.kind, 'it does not carry on invisibly').not.toBe('defend');
  });

  it('it is reset between runs', () => {
    setWolfDefence(false);
    expect(defendOpt(...Object.values(((): [World, Person] => { const s = scene('def-reset-a', { armed: true }); return [s.w, s.ada]; })()) as [World, Person])).toBeNull();
    setWolfDefence(true);
    const b = scene('def-reset-b', { armed: true });
    expect(defendOpt(b.w, b.ada)).toBeTruthy();
  });
});

// ───────────────────────── 11. the chain, end to end ─────────────────────────

describe('11. the whole chain, staged', () => {
  it('sees a wolf, wants a spear, makes one, and then has something to face it with', () => {
    const { w, ada } = scene('def-chain', { materials: true });
    expect(unfitPerson(w, ada)!.why).toMatch(/nothing to face it with/);
    expect(wantedTool(ctxFor(w, ada))).toBe('spear');
    const craft = ctxFor(w, ada).options.find((o) => o.key === 'craft:spear')!;
    expect(craft).toBeTruthy();
    const act = craft.make!();
    expect(act).toBeTruthy();
    ada.activity = act;
    until(w, 2000, () => (ada.inv.spear ?? 0) > 0);
    expect(ada.inv.spear ?? 0, 'she made it, from her own wood and stone').toBe(1);
    expect(ada.inv.wood ?? 0).toBe(0);
    expect(ada.inv.stone ?? 0).toBe(0);
    expect(unfitPerson(w, ada), 'and is now fit to face it').toBeNull();
  });

  it('the counters see the attempt and its outcome, and say nothing until it happens', () => {
    defReset();
    defProbe.on = true;
    const { seen } = encounter('won', { armed: true, wolfAt: [43.5, 40.5], wolfHeld: true });
    expect(seen.attempts).toBeGreaterThan(0);
    expect(seen.droveOff).toBe(1);
    expect(seen.offered, 'and the option was put on the table before it was taken').toBeGreaterThan(0);
  });

  it('the attempt takes real time and ends within a spear of the wolf, not at range', () => {
    const { w, ada, wolf } = scene('def-time', { armed: true, wolfAt: [45, 40.5] });
    decide(w, ada, 'test');
    expect(ada.activity?.kind, 'she set off').toBe('defend');
    const took = until(w, 900, () => ada.activity?.kind !== 'defend');
    expect(took, 'it is not instantaneous').toBeGreaterThan(ATTEMPT_TICKS);
    expect(hyp(ada.x - wolf.x, ada.y - wolf.y), 'she was beside it, not throwing anything').toBeLessThan(GIVE_UP);
  });

  it('she holds her ground when it is coming to her, rather than walking out to meet it', () => {
    // Walking at a wolf that is already on its way means meeting it in the open, mid-stride; standing and facing it is
    // the whole action. The wolf here is stalking her, so it closes and she waits.
    const { w, ada, wolf } = scene('def-stand', { armed: true, wolfAt: [45, 40.5] });
    const startX = ada.x;
    const startD = hyp(ada.x - wolf.x, ada.y - wolf.y);
    decide(w, ada, 'test');
    expect(ada.activity?.kind).toBe('defend');
    until(w, 200, () => hyp(ada.x - wolf.x, ada.y - wolf.y) <= REACH);
    expect(Math.abs(ada.x - startX), 'she barely moved').toBeLessThan(1);
    expect(hyp(ada.x - wolf.x, ada.y - wolf.y), 'because it came to her').toBeLessThan(startD);
  });

  it('a wolf hesitates before somebody squared up to it, and the hesitation is bounded', () => {
    // Without this a wolf closes faster than anybody can set themselves, bites, and breaks off by its own rule, so no
    // defence could ever resolve. It is a standoff with an outcome, not protection: the attempt settles within
    // ATTEMPT_TICKS, and a failure leaves her standing next to a wolf that is free to bite again.
    const { w, ada, wolf } = scene('def-standoff', { armed: true, wolfAt: [42.2, 40.5] });
    expect(facingWolf(w, wolf, ada), 'not yet: she has not started').toBe(false);
    decide(w, ada, 'test');
    until(w, 120, () => ada.activity?.phase === 'work' && hyp(ada.x - wolf.x, ada.y - wolf.y) <= REACH);
    expect(facingWolf(w, wolf, ada), 'squared up').toBe(true);
    defProbe.on = true;
    defReset();
    const settled = until(w, 400, () => defSnapshot().droveOff + defSnapshot().failed > 0);
    expect(settled, 'the hesitation lasts an attempt, not for ever').toBeLessThan(ATTEMPT_TICKS * 8);
    expect(facingWolf(w, wolf, ada), 'and it is over').toBe(false);
  });

  it('the hesitation needs a spear, this wolf, and an attempt actually under way', () => {
    const { w, ada, wolf } = scene('def-facing', { armed: true, wolfAt: [42.2, 40.5] });
    expect(facingWolf(w, wolf, ada), 'standing there doing nothing is not facing it').toBe(false);
    decide(w, ada, 'test');
    until(w, 120, () => ada.activity?.phase === 'work');
    expect(facingWolf(w, wolf, ada)).toBe(true);
    const other = makeWolf(w, 60, 60);
    expect(facingWolf(w, other, ada), 'she is not squared up to every wolf in the world').toBe(false);
    toolOf(w, ada, 'spear')!.wear = MAX_WEAR + 1;
    expect(facingWolf(w, wolf, ada), 'and not with a spear worn past use').toBe(false);
  });
});

function hyp(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}
