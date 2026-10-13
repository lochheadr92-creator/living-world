// Stage C: a tool someone means to make, and a roof they mean to mend. Both are projects — the last step (craft, repair) is only
// offered once the materials are in the pack, so the plan is what carries the want across the fetching. These hold that the thing
// is really made, that materials spoken for cannot also be given away, and that a project ends for a reason that is true.
import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding, createSite } from '../src/sim/buildings';
import { DAY, TOOL_RECIPE } from '../src/sim/constants';
import { decide, generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport, consume, produce } from '../src/sim/economy';
import { carryCap } from '../src/sim/people';
import { freeInv, freeOf, intentBonus, planOfActivity, plannedFor, reviewIntentions, servesIntent } from '../src/sim/intent';
import { dayFraction } from '../src/sim/environment';
import { noteFailure, observe, putBelief } from '../src/sim/knowledge';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { evaluateRequest, createRequest, surplusOf } from '../src/sim/social';
import { makeSource } from '../src/sim/sources';
import { lendTool, mintTool } from '../src/sim/tools';
import { wantedTool } from '../src/sim/options_work';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import { describePerson } from '../src/sim/inspect';
import type { Intention, Person, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';

/** a grown worker who has gathered enough to want a basket, with trees they know of and no wood in hand */
function worker(seed: string, dynamics: 'authored' | 'rich' = 'rich') {
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics }));
  const rng = new RNG(13);
  const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 90, thirst: 90, energy: 90 });
  const tree = makeSource(w, 'tree', 44, 40, 9);
  const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
  const hh = w.households.find((h) => h.id === p.hhId);
  if (hh) hh.homeId = home.id;
  testKit.finish(w, 'natural');
  observe(w, p, tree);
  observe(w, p, home);
  p.stats.gathered = 12; // they have been at it long enough to want a basket
  return { w, p, tree, home };
}

const ctxFor = (w: World, p: Person) => generateOptions(w, p, true);
const plan = (p: Person) => p.intentions.find((i) => i.status === 'active') ?? null;

describe('making a tool is a project, not a single action', () => {
  it('is taken on only when the materials are what stands in the way', () => {
    const a = worker('tool-wanted');
    reviewIntentions(ctxFor(a.w, a.p));
    const i = plan(a.p);
    expect(i, 'with no wood in hand, the want becomes a plan').toBeTruthy();
    expect(i!.kind).toBe('tool');
    expect(i!.makes).toBeTruthy();
    expect(i!.stepKind, 'the first step is to fetch what is missing').toBe('get');
    expect(i!.stepItem).toBe('wood');

    // with the makings already in the pack there is nothing for a plan to do: the ordinary option covers it
    const b = worker('tool-have-materials');
    const r = TOOL_RECIPE.basket;
    b.p.inv.wood = r.wood + 2;
    b.p.inv.stone = r.stone + 2;
    reviewIntentions(ctxFor(b.w, b.p));
    expect(plan(b.p)).toBeNull();
  });

  it('an authored world takes on no projects at all', () => {
    const { w, p } = worker('tool-authored', 'authored');
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions).toEqual([]);
  });

  it('the fetching step is served only by something that really yields that material', () => {
    const { w, p, tree } = worker('tool-serves');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    const opts = rankOptions(ctxFor(w, p));
    const wood = opts.find((o) => o.yields === 'wood');
    expect(wood, `a tree is known: ${opts.map((o) => o.key).join(', ')}`).toBeTruthy();
    expect(servesIntent(i, wood!)).toBe(true);
    // something that yields nothing, or the wrong thing, is not this step
    const other = { kind: 'wander', label: '', goal: '', need: null, util: 1, parts: [], eta: 0, key: 'wander', targetId: 0 } as never;
    expect(servesIntent(i, other)).toBe(false);
    const stoneish = { kind: 'gather', label: '', goal: '', need: null, util: 1, parts: [], eta: 0, key: 'gather:9', targetId: 9, yields: 'stone' } as never;
    expect(servesIntent(i, stoneish)).toBe(false);
    void tree;
  });

  it('once the materials are in the pack the step becomes making it, and making it really makes it', () => {
    const { w, p, home } = worker('tool-make');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    const tool = i.makes as 'basket';
    const r = TOOL_RECIPE[tool];
    produce(w, p.inv, carryCap(w, p), 'wood', r.wood, 'test: given to Ada');
    if (r.stone) produce(w, p.inv, carryCap(w, p), 'stone', r.stone, 'test: given to Ada');
    reviewIntentions(ctxFor(w, p));
    expect(i.stepKind).toBe('make');
    expect(i.stepKey).toBe(`craft:${tool}`);

    const before = { wood: p.inv.wood ?? 0, stone: p.inv.stone ?? 0, tool: p.inv[tool] ?? 0 };
    const act = newActivity(w, p, { kind: 'craft', label: 'Making', goal: 'to work faster', targetId: home.id, targetType: 'building', here: true, minCommit: 80, maxTicks: 900, data: { tool } });
    startActivity(w, p, act);
    for (let n = 0; n < 900 && p.activity === act; n++) stepWorld(w);

    expect(p.inv[tool] ?? 0, 'a real tool, through the ordinary recipe').toBe(before.tool + 1);
    expect(p.inv.wood ?? 0, 'the wood the recipe asks for, and no more').toBe(before.wood - r.wood);
    expect(p.inv.stone ?? 0).toBe(before.stone - r.stone);
    expect(conservationReport(w).ok, 'nothing was conjured or lost').toBe(true);

    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('done');
    expect(i.reason).toBe(`made the ${tool}`);
    expect(i.wants, 'what it had spoken for is spare again').toEqual({});
  });
});

describe('materials a plan has spoken for are not spare', () => {
  it('they cannot be given away, and the reason given says so precisely', () => {
    const { w, p } = worker('tool-reserved');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    const want = i.wants.wood ?? 0;
    expect(want).toBeGreaterThan(0);

    produce(w, p.inv, carryCap(w, p), 'wood', want, 'test: given to Ada'); // exactly what the plan needs
    expect(plannedFor(p, 'wood')).toBe(want);
    expect(surplusOf(w, p, 'wood'), 'none of it is spare').toBe(0);

    // a neighbour asks for wood: they have some, but not to give
    const rng = new RNG(4);
    const asker = testKit.addPerson(w, rng, { name: 'Ben', x: 42.5, y: 40.5 });
    const req = createRequest(w, asker, p, { kind: 'repair', item: 'wood', amount: 1, destKind: 'building', destId: 0 });
    const resp = evaluateRequest(w, p, asker, req);
    expect(resp.kind).toBe('decline');
    expect((resp as { reason: string }).reason, 'not "nothing owned": they have it, it is spoken for').toBe('making');

    // and when the plan ends, it is spare again
    i.status = 'done';
    i.wants = {};
    expect(plannedFor(p, 'wood')).toBe(0);
    expect(surplusOf(w, p, 'wood')).toBeGreaterThan(0);
  });

  it('a plan cannot reserve its way past what is actually carried', () => {
    const { w, p } = worker('tool-nodupe');
    reviewIntentions(ctxFor(w, p));
    produce(w, p.inv, carryCap(w, p), 'wood', 1, 'test: given to Ada');
    // the claim is on what they have; it never invents stock
    expect(surplusOf(w, p, 'wood')).toBe(0);
    expect(p.inv.wood).toBe(1);
  });
});

describe('mending a roof', () => {
  /** a home that has gone to pieces, and someone of the household with nothing to mend it with */
  function failingRoof(seed: string) {
    const { w, p, home, tree } = worker(seed);
    home.condition = 40;
    delete p.inv.wood;
    observe(w, p, home);
    return { w, p, home, tree };
  }

  it('is taken on when the roof is going and there is nothing to hand', () => {
    const { w, p, home } = failingRoof('roof-adopt');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    expect(i.kind).toBe('repair');
    expect(i.aboutId).toBe(home.id);
    expect(i.stepKind).toBe('get');
    expect(i.stepItem).toBe('wood');
  });

  it('mending consumes the material, raises the condition, and only then counts as done', () => {
    const { w, p, home } = failingRoof('roof-mend');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    produce(w, p.inv, carryCap(w, p), 'wood', 2, 'test: given to Ada');
    reviewIntentions(ctxFor(w, p));
    expect(i.stepKind).toBe('mend');

    const cond0 = home.condition;
    const wood0 = p.inv.wood ?? 0;
    const act = newActivity(w, p, { kind: 'repair', label: 'Repairing', goal: 'to keep it sound', targetId: home.id, targetType: 'building', here: true, minCommit: 80, maxTicks: 900 });
    startActivity(w, p, act);
    for (let n = 0; n < 900 && p.activity === act; n++) stepWorld(w);

    expect(home.condition, 'a measurable improvement').toBeGreaterThan(cond0);
    expect(p.inv.wood ?? 0, 'paid for in material').toBeLessThan(wood0);
    expect(i.worked, 'the plan knows what their own hands put back').toBeGreaterThan(0);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a roof someone else mended is a reason to stop, not an achievement', () => {
    const { w, p, home } = failingRoof('roof-someone-else');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    expect(i.worked).toBe(0);
    home.condition = 95; // a neighbour saw to it
    observe(w, p, home); // and they notice
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('dropped');
    expect(i.reason).toMatch(/someone else saw to the roof/);
  });
});

describe('a project that keeps failing is given up, not retried for ever', () => {
  it('a step that fails again and again ends the plan with the reason on the record', () => {
    const { w, p, home } = worker('tool-failing');
    home.condition = 40;
    observe(w, p, home);
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    produce(w, p.inv, carryCap(w, p), 'wood', 2, 'test: given to Ada');
    reviewIntentions(ctxFor(w, p));
    expect(i.stepKind).toBe('mend');

    for (let n = 0; n < 3; n++) noteFailure(w, p, home.id, 'could not get at it');
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('dropped');
    expect(i.reason).toMatch(/gave it up after 3 tries: could not get at it/);
  });
});

describe('a project survives the ordinary interruptions', () => {
  it('a wolf sets it aside without ending it, and it is taken up again', () => {
    const { w, p } = worker('tool-interrupt');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    const wolf = { id: 870001, kind: 'danger' as const, x: p.x + 3, y: p.y, amount: 1, max: 1, seen: w.tick, src: 'seen' as const, from: 0, learned: w.tick };
    putBelief(p, wolf);
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('active');
    expect(i.blocked).toMatch(/wolf/);
    expect(i.setAside).toBeGreaterThan(0);
  });

  it('it comes back from a save with its materials, its workings and what it is about', () => {
    const { w, p, home } = worker('tool-save');
    home.condition = 40;
    observe(w, p, home);
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    i.worked = 12;
    const before = { ...i, wants: { ...i.wants } };
    const back = deserializeWorld(serializeWorld(w));
    const q = back.persons.find((x) => x.id === p.id)!;
    expect(q.intentions[0]).toEqual(before);
    expect(q.intentions[0].wants).toEqual(before.wants);
    expect(plannedFor(q, 'wood')).toBe(plannedFor(p, 'wood'));
  });
});

describe('what a plan has spoken for cannot be spent twice', () => {
  /** a worker with a basket plan, exactly the wood it wants in the pack, and a site of their own household that needs wood */
  function withSite(seed: string) {
    const { w, p, home } = worker(seed);
    const site = createSite(w, 'hut', 38, 40, p.hhId, p.id);
    observe(w, p, site);
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    produce(w, p.inv, carryCap(w, p), 'wood', i.wants.wood ?? 0, 'test: given to Ada');
    return { w, p, home, site, i };
  }

  it('an unpromised errand of their own cannot take it, and can the moment the plan ends', () => {
    const { w, p, site, i } = withSite('plan-vs-site');
    expect(p.inv.wood, 'they are carrying wood').toBeGreaterThan(0);
    expect(freeOf(p, 'wood'), 'but none of it is free for anything else').toBe(0);
    const opts = ctxFor(w, p).options;
    expect(opts.find((o) => o.key === `haul:${site.id}`), 'nothing to deliver that is not spoken for').toBeUndefined();

    // the plan ends: the same wood is ordinary wood again, and the delivery is back on offer
    i.status = 'done';
    i.wants = {};
    expect(freeOf(p, 'wood')).toBe(p.inv.wood);
    expect(ctxFor(w, p).options.find((o) => o.key === `haul:${site.id}`), 'released, so the errand is possible again').toBeTruthy();
  });

  it('a promise outranks a plan of their own: a promised delivery may still use it', () => {
    const { w, p, site } = withSite('plan-vs-promise');
    p.commitments.push({
      id: w.nextId++,
      requestId: 0,
      kind: 'haul',
      to: p.id,
      item: 'wood',
      amount: 1,
      siteId: site.id,
      made: w.tick,
      deadline: w.tick + DAY,
      status: 'active',
    });
    expect(ctxFor(w, p).options.find((o) => o.key === `haul:${site.id}`), 'what was promised to someone else comes first').toBeTruthy();
  });

  it('the pack as other uses see it subtracts every live plan, and nothing when there are none', () => {
    const { p, i } = withSite('plan-freeinv');
    expect(freeInv(p).wood).toBe(0);
    expect(p.inv.wood, 'the real pack is untouched by the view of it').toBeGreaterThan(0);
    i.status = 'dropped';
    i.wants = {};
    expect(freeInv(p).wood).toBe(p.inv.wood);
    const authored = worker('plan-freeinv-authored', 'authored');
    produce(authored.w, authored.p.inv, carryCap(authored.w, authored.p), 'wood', 3, 'test: given to Ada');
    expect(freeInv(authored.p), 'an authored world has no plans, so it is the pack itself').toBe(authored.p.inv);
    expect(freeOf(authored.p, 'wood')).toBe(3);
  });
});

describe('three different things are explained separately', () => {
  it('choosing a step, having it under way, and what became of the project', () => {
    const { w, p, home } = worker('explain');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    const tool = i.makes as 'basket';

    // 1. CHOOSING the step: the record of the decision names the plan and the step, not just the scores
    decide(w, p, 'test');
    expect(p.lastDecision, 'a decision was recorded').toBeTruthy();
    expect(p.lastDecision!.because, `because: ${p.lastDecision!.because}`).toContain('a step toward');
    expect(p.lastDecision!.because).toContain(i.goal);

    // 2. EXECUTING it: while the activity the engine started IS the step, the plan reads as under way
    expect(p.activity, 'something was started').toBeTruthy();
    expect(p.activity!.data.forPlan, 'the activity carries which plan it serves').toBe(i.id);
    expect(describePerson(w, p.id)!.qa.plan).toMatch(/under way/);

    // the same step, while they are doing something else, reads as settled on but not started
    const other = newActivity(w, p, { kind: 'rest', label: 'Resting', goal: 'to catch my breath', here: true, minCommit: 10, maxTicks: 100 });
    startActivity(w, p, other);
    const mid = describePerson(w, p.id)!.qa.plan;
    expect(mid).toMatch(/settled on, not started/);
    expect(mid, 'and it still says which step').toContain(i.step);

    // 3. COMPLETING the project: only then is there an outcome, and it says what came of it
    const r = TOOL_RECIPE[tool];
    produce(w, p.inv, carryCap(w, p), 'wood', r.wood, 'test: given to Ada');
    if (r.stone) produce(w, p.inv, carryCap(w, p), 'stone', r.stone, 'test: given to Ada');
    const craft = newActivity(w, p, { kind: 'craft', label: 'Making', goal: 'to work faster', targetId: home.id, targetType: 'building', here: true, minCommit: 80, maxTicks: 900, data: { tool } });
    startActivity(w, p, craft);
    for (let n = 0; n < 900 && p.activity === craft; n++) stepWorld(w);
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('done');
    const after = describePerson(w, p.id)!.qa.plan;
    expect(after).toMatch(/done: made the basket/);
    expect(after, 'a finished project no longer claims to be doing anything').not.toMatch(/under way|settled on/);
  });

  it('a project given up says what was still missing', () => {
    const { w, p } = worker('explain-gaveup');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    w.tick = i.until + 1;
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('dropped');
    expect(i.reason, `reason: ${i.reason}`).toMatch(/still short \d+ wood/);
    // with the makings now in the pack there is nothing for a fresh plan to do, so the card reports the ending itself
    const r = TOOL_RECIPE[i.makes as 'basket'];
    produce(w, p.inv, carryCap(w, p), 'wood', r.wood, 'test: given to Ada');
    if (r.stone) produce(w, p.inv, carryCap(w, p), 'stone', r.stone, 'test: given to Ada');
    reviewIntentions(ctxFor(w, p));
    expect(plan(p), 'no new plan was needed').toBeNull();
    expect(describePerson(w, p.id)!.qa.plan).toMatch(/given up: never got round to/);
  });
});

describe('a world with projects in it replays exactly', () => {
  it('the same seed gives the same world, plans and all', () => {
    const a = worker('replay-same');
    const b = worker('replay-same');
    for (let n = 0; n < 1200; n++) {
      stepWorld(a.w);
      stepWorld(b.w);
    }
    expect(a.p.intentions.length, 'there were plans to replay').toBeGreaterThan(0);
    expect(hashWorld(a.w)).toBe(hashWorld(b.w));
    expect(a.p.intentions).toEqual(b.p.intentions);
    expect(a.w.events.map((e) => e.text)).toEqual(b.w.events.map((e) => e.text));
  });

  it('a save taken in the middle of a project carries on identically', () => {
    const straight = worker('replay-save');
    const forked = worker('replay-save');
    // run the two in lockstep until a project is actually under way, and save at that moment
    for (let n = 0; n < 3000 && !forked.p.intentions.some((i) => i.status === 'active'); n++) {
      stepWorld(straight.w);
      stepWorld(forked.w);
    }
    expect(forked.p.intentions.some((i) => i.status === 'active'), 'a project was under way at the save').toBe(true);
    expect(straight.w.tick).toBe(forked.w.tick);
    const reloaded = deserializeWorld(serializeWorld(forked.w));
    expect(hashWorld(reloaded), 'the save itself changes nothing').toBe(hashWorld(forked.w));
    for (let n = 0; n < 800; n++) {
      stepWorld(straight.w);
      stepWorld(reloaded);
    }
    expect(hashWorld(reloaded), 'and the rest of the run is the same run').toBe(hashWorld(straight.w));
    const back = reloaded.persons.find((x) => x.id === straight.p.id)!;
    expect(back.intentions).toEqual(straight.p.intentions);
  });

  it('the fingerprint notices a plan pressing for a different step', () => {
    const { w, p } = worker('replay-hash');
    reviewIntentions(ctxFor(w, p));
    const before = hashWorld(w);
    plan(p)!.stepKey = 'craft:basket';
    expect(hashWorld(w), 'what a plan is pressing for is part of the world').not.toBe(before);
  });
});

describe('a step that is actually under way is recognised as such', () => {
  it('the mark the choice left says which plan, and a plan that has ended claims nothing', () => {
    const { w, p } = worker('underway');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;

    // what the engine chose for the plan reads as under way; the same plan with something else running reads as settled on
    decide(w, p, 'test');
    expect(planOfActivity(p, p.activity!)?.id, 'the engine chose the plan’s step').toBe(i.id);
    expect(describePerson(w, p.id)!.qa.plan).toMatch(/under way/);

    const other = newActivity(w, p, { kind: 'rest', label: 'Resting', goal: 'to catch my breath', here: true, minCommit: 10, maxTicks: 100 });
    startActivity(w, p, other);
    expect(planOfActivity(p, other), 'an unrelated rest is nobody’s step').toBeNull();
    expect(describePerson(w, p.id)!.qa.plan).toMatch(/settled on, not started/);

    // a mark left by a plan that has since ended is not honoured
    const marked = newActivity(w, p, { kind: 'rest', label: 'Resting', goal: 'to catch my breath', here: true, minCommit: 10, maxTicks: 100, data: { forPlan: i.id } });
    startActivity(w, p, marked);
    expect(planOfActivity(p, marked)?.id).toBe(i.id);
    i.status = 'done';
    i.wants = {};
    expect(planOfActivity(p, marked)).toBeNull();
  });

  it('an authored world records no plan notes on an activity at all', () => {
    const { w, p } = worker('underway-authored', 'authored');
    decide(w, p, 'test');
    expect(p.intentions).toEqual([]);
    expect(p.activity, 'they are doing something').toBeTruthy();
    expect(p.activity!.data.forPlan).toBeUndefined();
    expect(describePerson(w, p.id)!.qa.plan).toBe('');
  });
});

describe('a plan is about one particular tool', () => {
  /**
   * Someone with a basket plan who has since become a good woodsman, so the tool they would want NOW is an axe. Both crafts are on
   * offer and both are affordable: exactly the case where "any crafting will do" would put the wrong tool in their hands.
   */
  function twoCrafts(seed: string) {
    const { w, p, home } = worker(seed);
    for (const [x, y] of [[44, 41], [45, 40], [43, 39]] as [number, number][]) observe(w, p, makeSource(w, 'tree', x, y, 9));
    observe(w, p, makeSource(w, 'rock', 38, 41, 9));
    p.skills.forage = 1;
    p.skills.wood = 0.5;
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    expect(i.makes, 'the plan is about the basket').toBe('basket');
    // enough to afford either tool (a pack holds 12 units, so this is what fits), and the skill that makes an axe the thing they
    // would want now
    produce(w, p.inv, carryCap(w, p), 'wood', Math.max(TOOL_RECIPE.basket.wood, TOOL_RECIPE.axe.wood), 'test: given to Ada');
    produce(w, p.inv, carryCap(w, p), 'stone', Math.max(TOOL_RECIPE.basket.stone, TOOL_RECIPE.axe.stone), 'test: given to Ada');
    expect(p.inv.wood ?? 0, 'both crafts are affordable').toBeGreaterThanOrEqual(TOOL_RECIPE.axe.wood);
    expect(p.inv.stone ?? 0).toBeGreaterThanOrEqual(TOOL_RECIPE.axe.stone);
    p.skills.wood = 3;
    reviewIntentions(ctxFor(w, p));
    expect(wantedTool(ctxFor(w, p)), 'what they would want now is not what the plan is about').toBe('axe');
    expect(i.stepKind).toBe('make');
    return { w, p, home, i };
  }

  it('a different craft is not the plan’s step, and gets none of its bonus', () => {
    const { w, p, i } = twoCrafts('craft-exact');
    const opts = ctxFor(w, p).options;
    const mine = opts.find((o) => o.key === 'craft:basket');
    expect(mine, `the plan’s craft is offered: ${opts.filter((o) => o.kind === 'craft').map((o) => o.key).join(', ')}`).toBeTruthy();
    // The other tool is NOT on offer, and for a reason worth naming: the wood is spoken for by the plan, and an unrelated craft may
    // not spend what a plan has claimed (options_work.ts craftOption, the F8 rule). So the axe option comes from the same scene
    // without that plan - a real option the engine generated, carried over here to be matched against this plan.
    expect(opts.some((o) => o.key === 'craft:axe'), 'an unrelated craft cannot have the plan’s material').toBe(false);
    const free = twoCrafts('craft-exact-free');
    free.i.status = 'done';
    free.i.wants = {}; // nothing claimed any more, so the tool they would want now is affordable and offered
    const other = ctxFor(free.w, free.p).options.find((o) => o.key === 'craft:axe');
    expect(other, 'with nothing claimed, the axe is on offer').toBeTruthy();

    expect(servesIntent(i, mine!)).toBe(true);
    expect(servesIntent(i, other!), 'making an axe is not a step toward making a basket').toBe(false);
    expect(intentBonus(i, mine!)).toBeGreaterThan(0);
    expect(intentBonus(i, other!), 'and it is not nudged either').toBe(0);

    // the same holds without the step's option key to match on, which is what "any craft will do" used to fall back to
    i.stepKey = null;
    expect(servesIntent(i, mine!), 'matched on the tool itself').toBe(true);
    expect(servesIntent(i, other!)).toBe(false);
  });

  it('the ordinary decision path starts the plan’s craft and attributes it to the plan', () => {
    const { w, p, i } = twoCrafts('craft-exact-decide');
    const ranked = rankOptions(ctxFor(w, p));
    const crafts = ranked.filter((o) => o.kind === 'craft').map((o) => o.key);
    expect(crafts, 'the only craft on offer is the plan’s own').toEqual(['craft:basket']);

    decide(w, p, 'test');
    const a = p.activity!;
    expect(a.kind, `started: ${a.label}`).toBe('craft');
    expect(a.data.tool, 'the tool the plan is about').toBe('basket');
    expect(a.data.forPlan).toBe(i.id);
    expect(p.lastDecision!.because).toContain('a step toward “make a basket”');

    // and it really makes that tool, not the other
    for (let n = 0; n < 1200 && p.activity === a; n++) stepWorld(w);
    expect(p.inv.basket ?? 0).toBe(1);
    expect(p.inv.axe ?? 0, 'the axe was never started').toBe(0);
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('done');
    expect(i.reason).toBe('made the basket');
  });
});

describe('having the tool is not the same as having made it', () => {
  it('a tool crafted by their own hands finishes the project', () => {
    const { w, p, home } = worker('made-by-hand');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    const tool = i.makes as 'basket';
    produce(w, p.inv, carryCap(w, p), 'wood', TOOL_RECIPE[tool].wood, 'test: given to Ada');
    if (TOOL_RECIPE[tool].stone) produce(w, p.inv, carryCap(w, p), 'stone', TOOL_RECIPE[tool].stone, 'test: given to Ada');
    const act = newActivity(w, p, { kind: 'craft', label: 'Making', goal: 'to work faster', targetId: home.id, targetType: 'building', here: true, minCommit: 80, maxTicks: 900, data: { tool } });
    startActivity(w, p, act);
    for (let n = 0; n < 900 && p.activity === act; n++) stepWorld(w);
    expect(i.worked, 'the making was credited where it happened').toBeGreaterThan(0);
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('done');
    expect(i.reason).toBe(`made the ${tool}`);
  });

  it('one borrowed from a neighbour ends the plan, and says only what happened', () => {
    const { w, p } = worker('borrowed');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    const tool = i.makes as 'basket';

    // a neighbour who owns one lends it: the same kind of tool is now in the pack, by a path that is not crafting
    const rng = new RNG(5);
    const lender = testKit.addPerson(w, rng, { name: 'Ben', x: 42.5, y: 40.5 });
    mintTool(w, tool, 0, lender.hhId, lender.id, lender.inv, lender.id, 'test: Ben owns one');
    const t = w.tools.find((x) => x.kind === tool && x.holder === lender.id)!;
    expect(lendTool(w, t, lender, p, w.tick + DAY)).toBe(true);
    expect(p.inv[tool] ?? 0, 'it is in their pack').toBe(1);
    expect(i.worked, 'but nothing was credited to their hands').toBe(0);

    reviewIntentions(ctxFor(w, p));
    expect(i.status, 'the want is met, so the plan ends').toBe('dropped');
    expect(i.reason).toBe(`came by a ${tool} without making it`);
    expect(describePerson(w, p.id)!.qa.plan).toMatch(new RegExp(`given up: came by a ${tool} without making it`));
  });
});

describe('two plans of one person never count the same stone twice', () => {
  /** a worker with a plan, to which a second plan can be added by hand for the accounting tests below */
  function twoPlans(seed: string, firstWants: Partial<Record<'wood' | 'stone', number>>, secondWants: Partial<Record<'wood' | 'stone', number>>) {
    const { w, p } = worker(seed);
    reviewIntentions(ctxFor(w, p));
    const a = plan(p)!;
    a.wants = { ...firstWants };
    // a second plan in the list, adopted after the first: the allocator's order is this list's order
    const b: Intention = { ...a, id: w.nextId++, since: w.tick + 1, wants: { ...secondWants }, makes: 'pick', goal: 'make a pick' };
    p.intentions.push(b);
    return { w, p, a, b };
  }

  const stepOf = (w: World, p: Person, i: Intention) => {
    reviewIntentions(ctxFor(w, p));
    return { kind: i.stepKind, item: i.stepItem, text: i.step };
  };

  it('the older plan is served first, and the younger one sees only what is left', () => {
    const { w, p, a, b } = twoPlans('alloc-order', { wood: 2 }, { wood: 2 });
    produce(w, p.inv, carryCap(w, p), 'wood', 2, 'test: two pieces for two plans');

    // the first plan has what it needs; the second is short of the whole of its own want
    expect(stepOf(w, p, a).kind, 'the older plan can get on with it').toBe('make');
    expect(stepOf(w, p, b).item, 'the younger plan is still fetching').toBe('wood');
    expect(b.step).toMatch(/get 2 more wood/);
    expect(plannedFor(p, 'wood'), 'between them they have spoken for four').toBe(4);
    expect(freeOf(p, 'wood'), 'and nothing is spare for anyone else').toBe(0);
  });

  it('what the two of them are allotted never exceeds what is in the pack', () => {
    for (const held of [0, 1, 2, 3, 4]) {
      const { w, p, a, b } = twoPlans(`alloc-sum-${held}`, { wood: 2 }, { wood: 2 });
      if (held) produce(w, p.inv, carryCap(w, p), 'wood', held, 'test');
      reviewIntentions(ctxFor(w, p));
      const shortA = Number((/get (\d+) more wood/.exec(a.step) ?? [0, 0])[1]);
      const shortB = Number((/get (\d+) more wood/.exec(b.step) ?? [0, 0])[1]);
      const allotted = (2 - shortA) + (2 - shortB);
      expect(allotted, `holding ${held}: allotted ${allotted}`).toBeLessThanOrEqual(held);
      expect(allotted, 'and never negative').toBeGreaterThanOrEqual(0);
    }
  });

  it('an allotment follows the pack: what is spent stops being anyone’s', () => {
    const { w, p, a, b } = twoPlans('alloc-spend', { wood: 2 }, { wood: 2 });
    produce(w, p.inv, carryCap(w, p), 'wood', 3, 'test');
    expect(stepOf(w, p, a).kind).toBe('make');
    expect(stepOf(w, p, b).text).toMatch(/get 1 more wood/);

    // the older plan's work consumes two, through the ordinary accounting
    consume(w, p.inv, 'wood', 2, 'test: the older plan made its thing');
    expect(p.inv.wood).toBe(1);
    // one piece left: the older plan's claim takes it, and is short the other one
    expect(stepOf(w, p, a).text, 'the older plan is short again').toMatch(/get 1 more wood/);
    expect(stepOf(w, p, b).text, 'and the younger one has nothing at all').toMatch(/get 2 more wood/);
  });

  it('a plan that ends releases its claim at once', () => {
    const { w, p, a, b } = twoPlans('alloc-release', { wood: 2 }, { wood: 2 });
    produce(w, p.inv, carryCap(w, p), 'wood', 2, 'test');
    expect(stepOf(w, p, b).text).toMatch(/get 2 more wood/);
    a.status = 'done';
    a.wants = {}; // as every ending does (intent.ts settleIntentions)
    expect(plannedFor(p, 'wood')).toBe(2);
    expect(stepOf(w, p, b).kind, 'the younger plan inherits what the older one let go of').toBe('make');
    expect(freeOf(p, 'wood')).toBe(0);
  });

  it('the allocation is the same whoever is executing, and the same after a save', () => {
    const { w, p, a, b } = twoPlans('alloc-replay', { wood: 2 }, { wood: 2 });
    produce(w, p.inv, carryCap(w, p), 'wood', 3, 'test');
    reviewIntentions(ctxFor(w, p));
    const before = { a: a.step, b: b.step, planned: plannedFor(p, 'wood'), free: freeOf(p, 'wood') };
    // the order in the list is the only thing the allocation depends on, so a save carries it
    const back = deserializeWorld(serializeWorld(w));
    const q = back.persons.find((x) => x.id === p.id)!;
    reviewIntentions(ctxFor(back, q));
    expect({ a: q.intentions[0].step, b: q.intentions[1].step, planned: plannedFor(q, 'wood'), free: freeOf(q, 'wood') }).toEqual(before);
  });

  it('housekeeping never throws away a live plan', () => {
    const { w, p } = worker('alloc-prune');
    reviewIntentions(ctxFor(w, p));
    const live = plan(p)!;
    // a long history of plans that have ended, more than the record keeps
    for (let n = 0; n < 12; n++) p.intentions.unshift({ ...live, id: w.nextId++, status: 'dropped', reason: 'old', ended: w.tick - 1000 });
    expect(p.intentions.length).toBeGreaterThan(8);
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions.length, 'the record is trimmed').toBeLessThanOrEqual(8);
    expect(p.intentions.includes(live), 'but the live plan is still there').toBe(true);
    expect(p.intentions.filter((i) => i.status === 'active')).toHaveLength(1);
  });
});

describe('a project and a plan for the night can be carried at once', () => {
  /** an adult with trees, a home and a cold evening: the makings of a project, and a reason to think about the night */
  function builderAtDusk(seed: string, atFrac = 0.70) {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(11);
    const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 90, thirst: 90, energy: 95 });
    const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
    const hh = w.households.find((h) => h.id === p.hhId);
    if (hh) hh.homeId = home.id;
    const tree = makeSource(w, 'tree', 44, 40, 9);
    observe(w, p, tree);
    observe(w, p, home);
    testKit.finish(w, 'natural');
    p.stats.gathered = 12;
    while (dayFraction(w.tick) < atFrac - 0.004 || dayFraction(w.tick) > atFrac + 0.004) w.tick++;
    return { w, p, home, tree };
  }

  const live = (p: Person) => p.intentions.filter((i) => i.status === 'active');

  it('the project is taken on by day, the night plan joins it at dusk, and neither resets the other', () => {
    const { w, p } = builderAtDusk('both-adopt', 0.50);
    reviewIntentions(ctxFor(w, p));
    const project = live(p)[0];
    expect(project.kind, 'a project in the afternoon').toBe('tool');
    const since = project.since;
    const wants = { ...project.wants };

    // dusk, and a cold one: the night is worth a plan of its own
    while (dayFraction(w.tick) < 0.70) w.tick++;
    p.needs.warmth = 40;
    reviewIntentions(ctxFor(w, p));
    const both = live(p);
    expect(both.map((i) => i.kind).sort(), 'both plans are live').toEqual(['night', 'tool']);
    expect(project.status, 'the project is untouched by the new plan').toBe('active');
    expect(project.since).toBe(since);
    expect(project.wants).toEqual(wants);
    expect(project.setAside, 'and nothing was set aside merely by adopting another plan').toBe(0);
  });

  it('a third plan, or a second of a kind, is refused', () => {
    const { w, p } = builderAtDusk('both-cap', 0.70);
    p.needs.warmth = 40;
    reviewIntentions(ctxFor(w, p));
    reviewIntentions(ctxFor(w, p));
    expect(live(p).length, 'two at most').toBeLessThanOrEqual(2);
    const kinds = live(p).map((i) => i.kind);
    expect(new Set(kinds).size, 'and no two of a kind').toBe(kinds.length);

    // ask again and again: nothing is added
    for (let n = 0; n < 20; n++) reviewIntentions(ctxFor(w, p));
    expect(live(p).length).toBeLessThanOrEqual(2);
    expect(live(p).filter((i) => i.kind === 'night').length).toBeLessThanOrEqual(1);
    expect(live(p).filter((i) => i.kind === 'tool' || i.kind === 'repair').length).toBeLessThanOrEqual(1);
  });

  it('each plan keeps its own step, and the engine’s ranking picks between them', () => {
    const { w, p, home } = builderAtDusk('both-steps', 0.70);
    p.needs.warmth = 40;
    // one decision adopts one plan, so two reviews: the night plan first, the project next
    reviewIntentions(ctxFor(w, p));
    reviewIntentions(ctxFor(w, p));
    const night = live(p).find((i) => i.kind === 'night')!;
    const project = live(p).find((i) => i.kind !== 'night')!;
    expect(night.stepKind, 'the night plan means to be at the shelter').toBe('stay');
    expect(night.stepTarget).toBe(home.id);
    expect(project.stepKind, 'the project means to fetch its material').toBe('get');

    // At dusk the project's step is on offer and the night's is not yet (waiting out the night is a night-time action), which is
    // one plan active and one waiting - and each step belongs to its own plan only.
    const atDusk = rankOptions(ctxFor(w, p));
    const gather = atDusk.find((o) => o.yields === project.stepItem);
    expect(gather, `offered at dusk: ${atDusk.map((o) => o.key).join(', ')}`).toBeTruthy();
    expect(servesIntent(project, gather!)).toBe(true);
    expect(servesIntent(night, gather!), 'fetching wood is not the night’s step').toBe(false);
    expect(atDusk.some((o) => o.key === `shelter:${home.id}`), 'the night’s own step is not possible yet').toBe(false);

    // once it is really night by this person's own reckoning (their body clock and the failing light decide it, not the clock
    // alone), the shelter is on offer and belongs to the night plan alone
    for (let n = 0; n < 1500 && !ctxFor(w, p).night; n++) stepWorld(w);
    expect(ctxFor(w, p).night, 'night fell').toBe(true);
    const stillNight = live(p).find((i) => i.kind === 'night');
    if (!stillNight) return; // the night plan was already settled by the time night fell: nothing left to attribute
    const atNight = rankOptions(ctxFor(w, p));
    const shelter = atNight.find((o) => o.key === `shelter:${home.id}`);
    expect(shelter, `offered at night: ${atNight.map((o) => o.key).join(', ')}`).toBeTruthy();
    expect(servesIntent(stillNight, shelter!)).toBe(true);
    expect(servesIntent(project, shelter!), 'the shelter is not the project’s step').toBe(false);
    // the engine chooses; whichever it picks is attributed to the plan it serves and to no other
    decide(w, p, 'test');
    const a = p.activity!;
    const owner = planOfActivity(p, a);
    if (owner) expect([night.id, project.id]).toContain(owner.id);
    expect(live(p).length, 'and both plans are still live either way').toBe(2);
  });

  it('a builder caught by nightfall shelters, and the project is still there the next day', () => {
    const { w, p, home } = builderAtDusk('both-sequence', 0.70);
    p.needs.warmth = 40;
    // one decision adopts one plan, so two reviews: the night plan first, the project next
    reviewIntentions(ctxFor(w, p));
    reviewIntentions(ctxFor(w, p));
    const project = live(p).find((i) => i.kind !== 'night')!;
    const projectWants = { ...project.wants };
    expect(live(p).length).toBe(2);

    // the night passes: the engine does what it ranks best, and the night plan is settled at first light
    const night = live(p).find((i) => i.kind === 'night')!;
    for (let n = 0; n < 3000 && night.status === 'active'; n++) stepWorld(w);
    expect(night.status, 'the night plan came to a conclusion').not.toBe('active');
    expect(dayFraction(w.tick), 'in the morning').toBeGreaterThan(0.24);

    // and the project is where it was left, with its own step and its own wants
    expect(project.status, 'the project survived the night').toBe('active');
    expect(project.wants).toEqual(projectWants);
    reviewIntentions(ctxFor(w, p));
    expect(project.stepKind, 'ready to be got on with').toBe(project.wants.wood && (p.inv.wood ?? 0) < (project.wants.wood ?? 0) ? 'get' : 'make');
    expect(conservationReport(w).ok).toBe(true);
    void home;
  });

  it('two live plans cannot both claim the same wood, and outsiders see the sum', () => {
    const { w, p } = builderAtDusk('both-claims', 0.70);
    p.needs.warmth = 40;
    // one decision adopts one plan, so two reviews: the night plan first, the project next
    reviewIntentions(ctxFor(w, p));
    reviewIntentions(ctxFor(w, p));
    expect(live(p).length).toBe(2);
    const project = live(p).find((i) => i.kind !== 'night')!;
    const want = project.wants.wood ?? 0;
    expect(want, 'the project wants wood').toBeGreaterThan(0);
    produce(w, p.inv, carryCap(w, p), 'wood', want, 'test: exactly what the project wants');
    // the night plan wants no materials, so the whole claim is the project's, and none of it is spare
    expect(plannedFor(p, 'wood')).toBe(want);
    expect(freeOf(p, 'wood')).toBe(0);
    expect(surplusOf(w, p, 'wood'), 'nothing to give away').toBe(0);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('the card shows every plan, and ranks none of them', () => {
  it('two live plans appear independently, each with its own step and state', () => {
    const w: World = testKit.flatWorld(settingsFor('card-two', { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(11);
    const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 90, thirst: 90, energy: 95 });
    const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
    const hh = w.households.find((h) => h.id === p.hhId);
    if (hh) hh.homeId = home.id;
    observe(w, p, makeSource(w, 'tree', 44, 40, 9));
    observe(w, p, home);
    testKit.finish(w, 'natural');
    p.stats.gathered = 12;
    while (dayFraction(w.tick) < 0.696 || dayFraction(w.tick) > 0.704) w.tick++;
    p.needs.warmth = 40;
    reviewIntentions(ctxFor(w, p));
    reviewIntentions(ctxFor(w, p));
    const live = p.intentions.filter((i) => i.status === 'active');
    expect(live.length, 'two plans').toBe(2);

    const v = describePerson(w, p.id)!;
    expect(v.plans, 'both are on the card').toHaveLength(2);
    expect(new Set(v.plans.map((x) => x.id)), 'and they are the two live ones').toEqual(new Set(live.map((i) => i.id)));
    for (const row of v.plans) {
      expect(row.goal).toBeTruthy();
      expect(row.detail).toContain(row.goal[0].toUpperCase() + row.goal.slice(1));
      expect(['under way', 'waiting', 'blocked']).toContain(row.state);
      expect(row.due, 'a deadline of its own').toMatch(/by tick \d+/);
      expect(row.outcome, 'and no outcome while it stands').toBe('');
    }
    expect(new Set(v.plans.map((x) => x.kind)), 'one of each kind').toEqual(new Set(['night', 'tool']));
    // the project says what it still lacks; the night plan counts its hours
    const project = v.plans.find((x) => x.kind === 'tool')!;
    const night = v.plans.find((x) => x.kind === 'night')!;
    expect(project.missing, 'the project names its shortfall').toMatch(/\d+ (wood|stone)/);
    expect(night.progress).toMatch(/\d+ ticks under shelter/);
    // nothing on the card calls either of them the leading plan
    expect(JSON.stringify(v.plans)).not.toMatch(/leader|leading|primary/i);
    // and the one-line summary mentions both
    expect(v.qa.plan).toContain(project.goal[0].toUpperCase() + project.goal.slice(1));
    expect(v.qa.plan).toContain(night.goal[0].toUpperCase() + night.goal.slice(1));
  });

  it('the plan whose step is being worked on is the one that reads “under way”', () => {
    const { w, p } = worker('card-underway');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    decide(w, p, 'test');
    const rows = describePerson(w, p.id)!.plans;
    expect(rows).toHaveLength(1);
    const served = planOfActivity(p, p.activity!)?.id === i.id;
    expect(rows[0].state, served ? 'the engine chose its step' : 'the engine chose something else').toBe(served ? 'under way' : 'waiting');
  });

  it('a plan that has ended shows its outcome, and an authored world shows nothing at all', () => {
    const { w, p } = worker('card-ended');
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    w.tick = i.until + 1;
    reviewIntentions(ctxFor(w, p));
    const rows = describePerson(w, p.id)!.plans;
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe('ended');
    expect(rows[0].outcome).toBe(i.reason);
    expect(rows[0].due, 'and when it ended').toBeTruthy();

    const authored = worker('card-authored', 'authored');
    reviewIntentions(ctxFor(authored.w, authored.p));
    expect(describePerson(authored.w, authored.p.id)!.plans, 'authored worlds carry no plans').toEqual([]);
    expect(describePerson(authored.w, authored.p.id)!.qa.plan).toBe('');
  });
});

describe('F8: a plan’s material is not spent on something else', () => {
  it('an unrelated craft cannot take claimed wood, while spare wood is still ordinary wood', () => {
    const { w, p } = worker('f8-claim');
    // places they know of, holding nothing: they exist to make an axe the tool this person would want, not to add stock (sources
    // made after the scene is finished are outside the ledger's opening snapshot)
    for (const [x, y] of [[44, 41], [45, 40], [43, 39]] as [number, number][]) observe(w, p, makeSource(w, 'tree', x, y, 0));
    observe(w, p, makeSource(w, 'rock', 38, 41, 0));
    p.skills.forage = 1;
    reviewIntentions(ctxFor(w, p));
    const i = plan(p)!;
    expect(i.makes).toBe('basket');
    expect(i.wants.wood).toBe(3);
    produce(w, p.inv, carryCap(w, p), 'wood', 3, 'test: exactly what the plan wants');
    produce(w, p.inv, carryCap(w, p), 'stone', 1, 'test');
    p.skills.wood = 3; // the tool they would want now is an axe (2 wood, 1 stone) - affordable only out of the plan's claim

    const crafts = ctxFor(w, p).options.filter((o) => o.kind === 'craft').map((o) => o.key);
    expect(crafts, 'only the plan’s own craft').toEqual(['craft:basket']);
    expect(freeOf(p, 'wood'), 'nothing is spare').toBe(0);

    // the plan's own craft may of course use its allocation, and really does
    decide(w, p, 'test');
    const a = p.activity!;
    expect(a.data.tool).toBe('basket');
    for (let n = 0; n < 1200 && p.activity === a; n++) stepWorld(w);
    expect(p.inv.basket ?? 0).toBe(1);
    expect(p.inv.axe ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);

    // the plan is finished, so what is left is ordinary wood again and an ordinary craft may use it
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('done');
    produce(w, p.inv, carryCap(w, p), 'wood', 2, 'test: spare wood now');
    expect(freeOf(p, 'wood'), 'spare, because no plan has spoken for it').toBeGreaterThan(0);
    expect(plannedFor(p, 'wood')).toBe(0);
  });

  it('a craft already under way keeps its materials, and the plan adopted afterwards says what it really lacks', () => {
    const { w, p, home } = worker('f8-inflight');
    produce(w, p.inv, carryCap(w, p), 'wood', 3, 'test');
    // a craft chosen before any plan claimed the wood
    const act = newActivity(w, p, { kind: 'craft', label: 'Making', goal: 'to work faster', targetId: home.id, targetType: 'building', here: true, minCommit: 80, maxTicks: 900, data: { tool: 'basket' } });
    startActivity(w, p, act);
    expect(p.activity).toBe(act);
    // and a plan taken on while it runs: it counts only what is spare, which is what the craft has not used
    reviewIntentions(ctxFor(w, p));
    for (let n = 0; n < 900 && p.activity === act; n++) stepWorld(w);
    expect(p.inv.basket ?? 0, 'the craft finished, as it was entitled to').toBe(1);
    const i = plan(p);
    if (i) {
      reviewIntentions(ctxFor(w, p));
      expect(i.status === 'active' ? i.stepKind : 'ended', 'the plan reports the real state of the pack').toBeTruthy();
      expect((i.wants.wood ?? 0) - (p.inv.wood ?? 0), 'and never claims wood that was spent').toBeGreaterThanOrEqual(0);
    }
    expect(conservationReport(w).ok).toBe(true);
  });
});
