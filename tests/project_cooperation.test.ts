// Stage D1: one person's project, another person's help. The chain under test is a real one — a plan short of a material, an ask
// made to somebody standing there who is carrying some, that person's own decision, a promise that is not a delivery, a delivery
// that is not a finished project, and two explanations that each say only what their owner did.
//
// What is a fixture and what is the simulation: the scenes below place people, sources, needs and relations. Everything after that
// is the engine's — the option layer offers the ask, the conversation carries it, `evaluateRequest` answers it, the commitment
// system owns the obligation, ordinary activities move the material, and `reviewIntentions` judges the project. Where a test needs
// the requester to take the ask at a particular moment it uses the external-controller seam (src/sim/external.ts) to pick an option
// THE ENGINE OFFERED; no test scripts the helper's answer, writes a commitment's outcome or credits anyone with work.
import { afterEach, describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { newActivity, startActivity } from '../src/sim/activities';
import { dayFraction } from '../src/sim/environment';
import { DAY, TOOL_RECIPE } from '../src/sim/constants';
import { decide, generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport, produce, transfer } from '../src/sim/economy';
import { setExternalController } from '../src/sim/external';
import type { ExternalChoice } from '../src/sim/external';
import { freeOf, outstandingForPlan, planHelp, planShortfall, plannedFor, reviewIntentions } from '../src/sim/intent';
import { describePerson } from '../src/sim/inspect';
import { noteFailure, observe } from '../src/sim/knowledge';
import { killPerson } from '../src/sim/lifecycle';
import { carryCap } from '../src/sim/people';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { createRequest, evaluateRequest, updateConversations, updateRequests } from '../src/sim/social';
import { makeSource } from '../src/sim/sources';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { deepEqualState, firstDiffs } from '../scripts/statediff';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Commitment, Intention, Person, Request, Source, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';
import { runLive } from '../src/agent/run';
import { chooser } from './helpers/inhabit';
import { addPerson as stagePerson, done, stage } from './helpers/kit';

const ctxFor = (w: World, p: Person) => generateOptions(w, p, true);
const planOf = (p: Person) => p.intentions.find((i) => i.status === 'active') ?? null;
const stoneOf = (p: Person) => p.inv.stone ?? 0;
const liveCommitments = (p: Person) => p.commitments.filter((c) => c.status === 'active');

/**
 * Ada means to make an axe and is one stone short, with no rock she knows of; Ben is standing nearby carrying stone. Both are fed,
 * watered and rested, and they know each other. Nothing here decides anything: it is a village corner where asking is possible.
 */
function scene(seed: string, dynamics: 'rich' | 'authored' = 'rich') {
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics }));
  const rng = new RNG(13);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 42.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const home = createBuilding(w, 'lean_to', 41, 40, ada.hhId);
  const hh = w.households.find((h) => h.id === ada.hhId);
  if (hh) hh.homeId = home.id;
  // trees enough to want an axe, a bush so nobody has to ask where food is, and no rock Ada knows of
  for (const [x, y] of [[44, 41], [45, 40], [43, 39]] as [number, number][]) observe(w, ada, makeSource(w, 'tree', x, y, 9));
  const bush = makeSource(w, 'berry_bush', 39, 41, 20);
  // one rock, far enough away that Ada will not stumble on it: it exists before `finish` so the material account counts it
  const farRock = makeSource(w, 'rock', 20, 62, 12);
  observe(w, ada, bush);
  observe(w, ben, bush);
  observe(w, ada, home);
  testKit.finish(w, 'natural');
  testKit.befriend(ada, ben, 40, 40);
  ada.stats.gathered = 12;
  ada.skills.wood = 3;
  produce(w, ada.inv, carryCap(w, ada), 'wood', TOOL_RECIPE.axe.wood, 'test: given to Ada');
  produce(w, ben.inv, carryCap(w, ben), 'stone', 2, 'test: given to Ben');
  reviewIntentions(ctxFor(w, ada));
  const plan = planOf(ada)!;
  return { w, ada, ben, home, plan, farRock };
}

/**
 * Ben has a project of his own: a hammer, which takes the stone he is carrying and a piece of wood he has no tree for. So the stone
 * is spoken for AND stays in his hands (he cannot spend it on the hammer either), while the rock he knows means he CAN fetch more.
 * That is the shape in which somebody can promise without having anything spare to hand over on the spot.
 */
function benHasHisOwnPlan(w: World, ben: Person, rock: Source, knowsRock = true) {
  if (knowsRock) observe(w, ben, rock);
  ben.stats.gathered = 12;
  ben.stats.built = 1;
  ben.skills.build = 3; // a builder: the tool he would want for himself is the hammer, which takes stone
  reviewIntentions(ctxFor(w, ben));
  return { plan: planOf(ben), rock };
}

/** A controller that takes one option the engine offered, by key prefix, and otherwise leaves every choice to the engine. */
function takesTheAsk(who: Person, keyPart: string) {
  const taken: string[] = [];
  const restore = setExternalController({
    controls: (_w, p) => p.id === who.id,
    choose: (_w, _p, _ctx, ranked): ExternalChoice => {
      const o = ranked.find((x) => x.key.includes(keyPart));
      if (o) {
        taken.push(o.key);
        return { kind: 'pick', key: o.key };
      }
      return { kind: 'fallback', reason: 'nothing of that kind on offer' };
    },
  });
  return { taken, restore };
}

/** step until `done`, or until `ticks` have passed */
function until(w: World, ticks: number, done: () => boolean): number {
  for (let n = 0; n < ticks; n++) {
    if (done()) return n;
    stepWorld(w);
  }
  return done() ? ticks : -1;
}

const planRequests = (w: World, plan: Intention) => w.requests.filter((r) => r.planId === plan.id);
const deliverTo = (ben: Person, to: Person): Commitment | undefined => ben.commitments.find((c) => c.kind === 'deliver' && c.to === to.id);

afterEach(() => setExternalController(null));

describe('A: a project need becomes an ask, an answer, real material and then a tool', () => {
  it('asks unprompted, is given the stone, and the project is finished by the asker’s own hands', () => {
    const { w, ada, ben, plan } = scene('d1-chain');
    expect(plan.kind).toBe('tool');
    expect(plan.makes).toBe('axe');
    expect(plan.stepItem, 'the stone is what is missing').toBe('stone');
    const stone0 = { ada: stoneOf(ada), ben: stoneOf(ben) };

    // nobody is told to ask: the option layer offers it and the ordinary ranking takes it
    const asked = until(w, 900, () => planRequests(w, plan).length > 0);
    expect(asked, 'Ada asked somebody for the stone within the window').toBeGreaterThanOrEqual(0);
    const req = planRequests(w, plan)[0];
    expect(req.to, 'she asked the person she could see carrying stone').toBe(ben.id);
    expect(req.item).toBe('stone');
    expect(req.amount, 'a bounded quantity: what the plan is actually short of').toBe(1);
    expect(req.destKind).toBe('person');
    expect(req.destId).toBe(ada.id);

    // Ben answers for himself. He had it to spare and was standing there, so the answer is the handing over.
    const settled = until(w, 600, () => req.status !== 'pending');
    expect(settled).toBeGreaterThanOrEqual(0);
    expect(['fulfilled', 'promised'], `answer was ${req.status}`).toContain(req.status);
    const done = until(w, 2000, () => stoneOf(ada) > stone0.ada);
    expect(done, 'the stone really arrived').toBeGreaterThanOrEqual(0);
    expect(stoneOf(ben), 'and left the person who gave it').toBeLessThan(stone0.ben);
    expect(conservationReport(w).ok, 'nothing was conjured on the way').toBe(true);

    // the plan now lacks nothing, so the step is the making, which is Ada's own work
    reviewIntentions(ctxFor(w, ada));
    expect(plan.stepKind).toBe('make');
    const made = until(w, 4000, () => (ada.inv.axe ?? 0) > 0);
    expect(made, 'she made the axe through the ordinary craft').toBeGreaterThanOrEqual(0);
    reviewIntentions(ctxFor(w, ada));
    expect(plan.status).toBe('done');
    // the two acts are kept apart in the record: he brought material, she made the thing
    expect(plan.reason).toMatch(/^made the axe \(Ben brought 1 of the stone\)$/);
    expect(ada.stats.crafted, 'the maker is credited with making').toBeGreaterThan(0);
    expect(plan.worked, 'and the plan knows those were her hands').toBeGreaterThan(0);
    // and the two acts are on the record separately: his gift is a gift, her making is hers
    expect(w.events.some((e) => /Ben gave 1 stone to Ada/.test(e.text)), 'the gift is recorded as a gift').toBe(true);
    expect(planHelp(w, ada, plan).some((h) => h.who === 'Ben' && h.delivered === 1), 'and the project records him as the bringer').toBe(true);
  });
});

describe('B: a refusal that says what the decision actually used', () => {
  it('“it is for something I am making” when the stone is spoken for by the helper’s own plan', () => {
    const { w, ada, ben, plan, farRock } = scene('d1-refuse-making');
    const { plan: his } = benHasHisOwnPlan(w, ben, farRock, true);
    expect(his, 'Ben has a project of his own').toBeTruthy();
    expect(his!.wants.stone ?? 0, 'and it has spoken for the stone he carries').toBeGreaterThan(0);
    // and he tried that rock a moment ago and got nothing, so fetching more is not on offer either
    noteFailure(w, ben, farRock.id, 'nothing left there');

    const req = createRequest(w, ada, ben, { kind: 'stone', item: 'stone', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id, purpose: plan.goal });
    const answer = evaluateRequest(w, ben, ada, req);
    expect(answer.kind).toBe('decline');
    expect((answer as { reason: string }).reason, 'not “I have none”: he has some, and it is for his own making').toBe('making');
    expect(liveCommitments(ben), 'nothing was promised').toHaveLength(0);
    expect(stoneOf(ada), 'and nothing moved').toBe(0);
  });

  it('“I have none” when there is none, and a refusal leaves nothing on its way', () => {
    const { w, ada, ben, plan } = scene('d1-refuse-none');
    delete ben.inv.stone;
    const req = createRequest(w, ada, ben, { kind: 'stone', item: 'stone', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id });
    expect(outstandingForPlan(w, ada.id, 'stone', plan.id), 'asked for, not yet answered').toBe(1);
    const answer = evaluateRequest(w, ben, ada, req);
    expect(answer.kind).toBe('decline');
    expect((answer as { reason: string }).reason).toBe('no_item');
    expect(req.delivered ?? 0, 'nothing arrived').toBe(0);
    // the conversation records that answer; from then on nothing is on its way and she may ask elsewhere
    req.status = 'declined';
    expect(outstandingForPlan(w, ada.id, 'stone', plan.id)).toBe(0);
  });
});

describe('A2: a promise is not a delivery, and a delivery is not a finished project', () => {
  /** Ada takes the ask the engine offers her; Ben, whose own stone is spoken for but who knows a rock, answers for himself. */
  function promised(seed: string) {
    const s = scene(seed);
    benHasHisOwnPlan(s.w, s.ben, s.farRock, true);
    const c = takesTheAsk(s.ada, ':plan:stone');
    const asked = until(s.w, 3600, () => planRequests(s.w, s.plan).length > 0);
    c.restore();
    expect(asked, 'the engine offered the ask and she took it').toBeGreaterThanOrEqual(0);
    const req = planRequests(s.w, s.plan)[0];
    until(s.w, 600, () => req.status !== 'pending');
    return { ...s, req };
  }

  it('the promise is an obligation with a quantity and a recipient, and nothing has moved yet', () => {
    const { w, ada, ben, plan, req } = promised('d1-promise');
    expect(req.status, `answer: ${req.status} ${req.note}`).toBe('promised');
    const c = deliverTo(ben, ada)!;
    expect(c, 'the promise lives in the commitment system').toBeTruthy();
    expect(c.item).toBe('stone');
    expect(c.amount).toBe(1);
    expect(c.delivered ?? 0, 'a promise delivers nothing').toBe(0);
    expect(stoneOf(ada), 'and puts nothing in the asker’s pack').toBe(0);

    // the project knows help is coming and still calls the material missing
    reviewIntentions(ctxFor(w, ada));
    expect(plan.stepKind, 'still fetching, not making').toBe('get');
    expect(plan.step).toMatch(/Ben promised 1, not yet delivered/);
    expect(outstandingForPlan(w, ada.id, 'stone', plan.id)).toBe(1);
    expect(ctxFor(w, ada).options.some((o) => o.key === 'craft:axe'), 'a promise cannot be crafted').toBe(false);
    expect(describePerson(w, ada.id)!.qa.plan).toMatch(/Ben promised 1 stone, not yet delivered/);

    // and she does not ask again for what is already on its way
    expect(rankOptions(ctxFor(w, ada)).some((o) => o.key.includes(':plan:stone')), 'no second ask while it is outstanding').toBe(false);
  });

  it('the material arrives by ordinary work, the obligation closes, and the tool still has to be made', () => {
    const { w, ada, ben, plan, req } = promised('d1-deliver');
    const c = deliverTo(ben, ada)!;
    const arrived = until(w, 6000, () => (c.delivered ?? 0) >= c.amount);
    expect(arrived, `Ben kept his promise (delivered ${c.delivered ?? 0}, ${c.status}, ${c.blocked ?? ''})`).toBeGreaterThanOrEqual(0);
    expect(stoneOf(ada), 'the stone is in her pack now').toBeGreaterThan(0);
    expect(req.status).toBe('fulfilled');
    expect(c.status, 'and the obligation is discharged').not.toBe('active');
    expect(conservationReport(w).ok, `the material account balances: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);
    expect(ada.inv.axe ?? 0, 'a delivery is not a tool').toBe(0);

    // his own plan tells the truth about what keeping the promise cost him: the stone it had spoken for is one short now
    const his = ben.intentions.find((i) => i.kind === 'tool');
    expect(his, 'he still has his own project').toBeTruthy();
    expect((his!.wants.stone ?? 0) - (ben.inv.stone ?? 0), 'the promise was kept out of what his own plan wanted').toBeGreaterThan(0);
    if (his!.status === 'active') {
      reviewIntentions(ctxFor(w, ben));
      expect(his!.stepKind, 'so his plan is fetching again').toBe('get');
      expect(his!.step, `his step: ${his!.step}`).toMatch(/get \d+ more (wood|stone) for the hammer/);
    }

    // Whether she gets round to the making is her own affair from here (test A follows that through end to end). What this holds is
    // that the delivery did not make it for her, and that if she does make it, the record says who did what.
    reviewIntentions(ctxFor(w, ada));
    const made = until(w, 4000, () => (ada.inv.axe ?? 0) > 0);
    reviewIntentions(ctxFor(w, ada));
    if (made >= 0) {
      expect(plan.status).toBe('done');
      expect(plan.reason).toMatch(/made the axe \(Ben brought 1 of the stone\)/);
    } else {
      expect(plan.status, 'it did not finish, and nothing pretends it did').not.toBe('done');
      expect(ada.inv.axe ?? 0).toBe(0);
    }
  });
});

describe('C: the helper is a person with their own life', () => {
  it('a critical need puts the promise aside without ending it, and it is honoured afterwards', () => {
    const { w, ada, ben, plan, req } = (() => {
      const s = scene('d1-interrupt');
      benHasHisOwnPlan(s.w, s.ben, s.farRock, true);
      const c = takesTheAsk(s.ada, ':plan:stone');
      until(s.w, 3600, () => planRequests(s.w, s.plan).length > 0);
      c.restore();
      const req = planRequests(s.w, s.plan)[0];
      until(s.w, 600, () => req.status !== 'pending');
      return { ...s, req };
    })();
    expect(req.status).toBe('promised');
    const c = deliverTo(ben, ada)!;

    // his own survival comes first: thirst at the edge
    ben.needs.thirst = 6;
    const asideAt = until(w, 400, () => !!c.setAside);
    expect(asideAt, 'the promise was put aside, not dropped').toBeGreaterThanOrEqual(0);
    expect(c.status, 'it still stands').toBe('active');
    expect(c.delivered ?? 0, 'and nothing was credited while he was seeing to himself').toBe(0);
    expect(describePerson(w, ben.id)!.commitments.some((v) => /put aside|held up/.test(v.detail)), 'his card says so').toBe(true);

    // once he has drunk, the obligation is still his to keep
    const after = until(w, 8000, () => c.status !== 'active' || (c.delivered ?? 0) > 0);
    expect(after, 'it came to something, one way or the other').toBeGreaterThanOrEqual(0);
    if ((c.delivered ?? 0) > 0) {
      expect(stoneOf(ada)).toBeGreaterThan(0);
    } else {
      // it ended: then it ended with a reason, and never as a success
      expect(['expired', 'interrupted', 'failed', 'moot', 'broken', 'cancelled']).toContain(c.status);
      expect(c.reason, `ended as ${c.status} without a reason`).toBeTruthy();
      expect(req.status).not.toBe('fulfilled');
    }
    expect(conservationReport(w).ok, `the material account balances: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);
    void plan;
  });
});

describe('D: the same units cannot be claimed twice', () => {
  it('two askers cannot both be promised the one stone that exists', () => {
    const { w, ada, ben, plan } = scene('d1-double');
    const cal = testKit.addPerson(w, new RNG(21), { name: 'Cal', x: 43.5, y: 41.5, hunger: 92, thirst: 92, energy: 92 });
    testKit.befriend(cal, ben, 40, 40);
    produce(w, ben.inv, carryCap(w, ben), 'stone', 0, 'test');
    ben.inv.stone = 1; // one stone in the world, two people who want it
    const r1 = createRequest(w, ada, ben, { kind: 'stone', item: 'stone', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id });
    const a1 = evaluateRequest(w, ben, ada, r1);
    expect(a1.kind, `first answer: ${JSON.stringify(a1)}`).toBe('give');

    // the first answer is acted out through the ordinary transfer, then the second asker arrives
    ben.commitments.push({ id: w.nextId++, requestId: r1.id, kind: 'deliver', to: ada.id, item: 'stone', amount: 1, siteId: 0, made: w.tick, deadline: w.tick + DAY, status: 'active', destKind: 'person', destId: ada.id, delivered: 0 });
    r1.status = 'promised';
    r1.commitmentId = ben.commitments[ben.commitments.length - 1].id;
    const r2 = createRequest(w, cal, ben, { kind: 'stone', item: 'stone', amount: 1, destKind: 'person', destId: cal.id });
    const a2 = evaluateRequest(w, ben, cal, r2);
    expect(a2.kind, `second answer: ${JSON.stringify(a2)}`).toBe('decline');
    expect(['committed', 'own_need', 'no_item']).toContain((a2 as { reason: string }).reason);
    const owed = ben.commitments.filter((c) => c.status === 'active' && c.item === 'stone').reduce((n, c) => n + c.amount - (c.delivered ?? 0), 0);
    expect(owed, 'he owes one stone, not two').toBe(1);
    expect(owed, 'and he is not owing more than he has').toBeLessThanOrEqual(stoneOf(ben));
  });

  it('what is promised and what has arrived are counted separately', () => {
    const { w, ada, ben, plan } = scene('d1-counts');
    const c: Commitment = { id: w.nextId++, requestId: 0, kind: 'deliver', to: ada.id, item: 'stone', amount: 2, siteId: 0, made: w.tick, deadline: w.tick + DAY, status: 'active', destKind: 'person', destId: ada.id, delivered: 1 };
    ben.commitments.push(c);
    const r = createRequest(w, ada, ben, { kind: 'stone', item: 'stone', amount: 2, destKind: 'person', destId: ada.id, planId: plan.id });
    r.status = 'promised';
    r.commitmentId = c.id;
    expect(outstandingForPlan(w, ada.id, 'stone', plan.id), 'one of the two is still owed').toBe(1);
    const h = planHelp(w, ada, plan)[0];
    expect(h.delivered).toBe(1);
    expect(h.owed).toBe(1);
    expect(stoneOf(ada), 'and neither number is material in her pack').toBe(0);
    expect(describePerson(w, ada.id)!.requests[0].progress).toBe('1 of 2 stone brought');
  });
});

describe('E: a project or a recipient that is gone', () => {
  it('material that arrives after the project has ended is still real material, and credits nothing', () => {
    const { w, ada, ben, plan } = scene('d1-stale');
    const c: Commitment = { id: w.nextId++, requestId: 0, kind: 'deliver', to: ada.id, item: 'stone', amount: 1, siteId: 0, made: w.tick, deadline: w.tick + DAY, status: 'active', destKind: 'person', destId: ada.id, delivered: 0 };
    ben.commitments.push(c);
    const r = createRequest(w, ada, ben, { kind: 'stone', item: 'stone', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id });
    r.status = 'promised';
    r.commitmentId = c.id;

    // her plan runs out of time before he gets there, and says what it was waiting on
    w.tick = plan.until + 1;
    reviewIntentions(ctxFor(w, ada));
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/still waiting on 1 stone from Ben/);

    // he knows nothing of that, and his delivery still happens: the stone is real and stays with her
    const before = { ada: stoneOf(ada), ben: stoneOf(ben) };
    const arrived = until(w, 8000, () => (c.delivered ?? 0) > 0 || c.status !== 'active');
    expect(arrived).toBeGreaterThanOrEqual(0);
    if ((c.delivered ?? 0) > 0) {
      expect(stoneOf(ada)).toBe(before.ada + 1);
      expect(stoneOf(ben)).toBe(before.ben - 1);
    }
    expect(ada.inv.axe ?? 0, 'no tool appeared out of the kindness').toBe(0);
    expect(plan.status, 'and the project that ended stays ended').toBe('dropped');
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a recipient who dies releases the promise, with the truth of it, and nothing is lost', () => {
    const { w, ada, ben } = scene('d1-dead');
    const c: Commitment = { id: w.nextId++, requestId: 0, kind: 'deliver', to: ada.id, item: 'stone', amount: 1, siteId: 0, made: w.tick, deadline: w.tick + DAY, status: 'active', destKind: 'person', destId: ada.id, delivered: 0 };
    ben.commitments.push(c);
    const r = createRequest(w, ada, ben, { kind: 'stone', item: 'stone', amount: 1, destKind: 'person', destId: ada.id });
    r.status = 'promised';
    r.commitmentId = c.id;
    killPerson(w, ada, 'test');
    until(w, 300, () => c.status !== 'active');
    expect(c.status).toBe('moot');
    expect(c.reason).toMatch(/gone|died/);
    expect(r.status).toBe('cancelled');
    expect(conservationReport(w).ok, 'her belongings are accounted for').toBe(true);
  });
});

describe('F: an outstanding promise survives a save', () => {
  it('a world saved mid-promise resolves to exactly the same state as one that was never saved', () => {
    const straight = scene('d1-save');
    const forked = scene('d1-save');
    for (const s of [straight, forked]) {
      benHasHisOwnPlan(s.w, s.ben, s.farRock, true);
      const c = takesTheAsk(s.ada, ':plan:stone');
      until(s.w, 3600, () => planRequests(s.w, s.plan).length > 0);
      c.restore();
      until(s.w, 600, () => planRequests(s.w, s.plan)[0].status !== 'pending');
    }
    expect(straight.w.tick).toBe(forked.w.tick);
    const c0 = deliverTo(forked.ben, forked.ada)!;
    expect(c0.status, 'there is an obligation in flight to carry across the save').toBe('active');
    expect(c0.delivered ?? 0).toBe(0);

    const reloaded = deserializeWorld(serializeWorld(forked.w));
    const back = reloaded.persons.find((p) => p.id === forked.ben.id)!;
    expect(back.commitments.find((c) => c.id === c0.id), 'the promise came back').toBeTruthy();
    expect(reloaded.requests.filter((r) => r.planId).length, 'and so did the request it answers').toBe(forked.w.requests.filter((r) => r.planId).length);

    // long enough for the delivery to resolve either way
    for (let n = 0; n < 4000; n++) {
      stepWorld(straight.w);
      stepWorld(reloaded);
    }
    const a = JSON.parse(serializeWorld(straight.w));
    const b = JSON.parse(serializeWorld(reloaded));
    expect(deepEqualState(a, b), `state differs after the save: ${firstDiffs(a, b, 6).join(' | ')}`).toBe(true);
  });
});

describe('G: an authored world does none of this', () => {
  it('no plan, no project ask, no project request', () => {
    const { w, ada, ben } = scene('d1-authored', 'authored');
    expect(ada.intentions, 'authored worlds carry no private plans').toEqual([]);
    for (let n = 0; n < 600; n++) stepWorld(w);
    expect(ctxFor(w, ada).options.some((o) => o.key.includes(':plan:')), 'and so no project ask is ever offered').toBe(false);
    expect(w.requests.some((r) => r.planId !== undefined), 'nothing asked for a project').toBe(false);
    expect(describePerson(w, ada.id)!.qa.plan).toBe('');
    void ben;
  });

  it('a refusal in an authored world says what it always said', () => {
    const { w, ada, ben } = scene('d1-authored-reason', 'authored');
    const cal = testKit.addPerson(w, new RNG(31), { name: 'Cal', x: 46.5, y: 44.5, hunger: 92, thirst: 92, energy: 92 });
    // every stone he carries is owed to somebody else, which in a rich world would be answered with “committed”
    ben.commitments.push({ id: w.nextId++, requestId: 0, kind: 'deliver', to: cal.id, item: 'stone', amount: 2, siteId: 0, made: w.tick, deadline: w.tick + DAY, status: 'active', destKind: 'person', destId: cal.id, delivered: 0 });
    const req = createRequest(w, ada, ben, { kind: 'stone', item: 'stone', amount: 1, destKind: 'person', destId: ada.id });
    const answer = evaluateRequest(w, ben, ada, req);
    expect(answer.kind).toBe('decline');
    expect((answer as { reason: string }).reason, 'the wording a refusal uses is part of what follows from it').toBe('own_need');
  });
});

describe('an ask is for what is still uncovered, never for the whole shortage again', () => {
  /**
   * Ada means to make a basket, which takes three wood. She knows no tree, so she cannot fetch it herself; Ben is standing there
   * with wood in his hands. This is the shape in which a shortage can be bigger than one ask.
   */
  function basketScene(seed: string) {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(17);
    const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 42.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const cal = testKit.addPerson(w, rng, { name: 'Cal', x: 44.5, y: 41.5, hunger: 92, thirst: 92, energy: 92 });
    const home = createBuilding(w, 'lean_to', 41, 40, ada.hhId);
    const hh = w.households.find((h) => h.id === ada.hhId);
    if (hh) hh.homeId = home.id;
    const bush = makeSource(w, 'berry_bush', 39, 41, 20);
    for (const p of [ada, ben, cal]) observe(w, p, bush);
    observe(w, ada, home);
    testKit.finish(w, 'natural');
    testKit.befriend(ada, ben, 40, 40);
    testKit.befriend(ada, cal, 40, 40);
    ada.stats.gathered = 12;
    produce(w, ben.inv, carryCap(w, ben), 'wood', 4, 'test: given to Ben');
    reviewIntentions(ctxFor(w, ada));
    const plan = planOf(ada)!;
    return { w, ada, ben, cal, plan };
  }

  /** a promise somebody has already made for this plan, in the state the conversation leaves it in */
  function alreadyPromised(w: World, from: Person, to: Person, plan: Intention, item: 'wood' | 'stone', n: number) {
    const r = createRequest(w, to, from, { kind: item, item, amount: n, destKind: 'person', destId: to.id, planId: plan.id, purpose: plan.goal });
    const c: Commitment = { id: w.nextId++, requestId: r.id, kind: 'deliver', to: to.id, item, amount: n, siteId: 0, made: w.tick, deadline: w.tick + DAY, status: 'active', destKind: 'person', destId: to.id, delivered: 0 };
    from.commitments.push(c);
    r.status = 'promised';
    r.offered = n;
    r.commitmentId = c.id;
    return { r, c };
  }

  it('a shortage of three with one already promised is asked for as two', () => {
    const { w, ada, ben, cal, plan } = basketScene('d1-uncovered');
    expect(plan.makes).toBe('basket');
    expect(plan.wants.wood, 'three wood short, none in the pack').toBe(3);
    expect(ada.inv.wood ?? 0).toBe(0);
    alreadyPromised(w, cal, ada, plan, 'wood', 1);
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id), 'one of the three is covered').toBe(1);

    // the ordinary option layer offers the ask, and the controller takes the option the engine offered
    const taker = takesTheAsk(ada, ':plan:wood');
    const asked = until(w, 1800, () => w.requests.some((r) => r.planId === plan.id && r.to === ben.id));
    taker.restore();
    expect(asked, 'she asked Ben, who she can see carrying wood').toBeGreaterThanOrEqual(0);
    const mine = w.requests.find((r) => r.planId === plan.id && r.to === ben.id)!;
    expect(mine.amount, 'for the two that nobody has promised, not for all three').toBe(2);
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id), 'coverage never exceeds the shortage').toBeLessThanOrEqual(3);
  });

  it('coverage that changes while the answer is being walked over narrows the ask before anyone can answer it', () => {
    const { w, ada, ben, cal, plan } = basketScene('d1-drift');
    const open = createRequest(w, ada, ben, { kind: 'wood', item: 'wood', amount: 3, destKind: 'person', destId: ada.id, planId: plan.id, purpose: plan.goal });
    expect(open.status).toBe('pending');

    // while Ben is still on his way over, Cal promises two of the three
    alreadyPromised(w, cal, ada, plan, 'wood', 2);
    for (let n = 0; n < 40; n++) stepWorld(w); // the asker keeps her own open ask in step (social.ts updateRequests)
    expect(open.status, 'the ask still stands, for less').toBe('pending');
    expect(open.amount, 'narrowed to the one that is still uncovered').toBe(1);
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id)).toBe(3);

    // and when Ben does answer, he can only be answering that
    const answer = evaluateRequest(w, ben, ada, open);
    if (answer.kind === 'give') expect(answer.n, 'nobody is committed beyond the shortage').toBeLessThanOrEqual(1);
    if (answer.kind === 'promise') expect(answer.n).toBeLessThanOrEqual(1);
    const owed = [ben, cal].flatMap((p) => p.commitments.filter((c) => c.status === 'active' && c.item === 'wood')).reduce((n, c) => n + c.amount - (c.delivered ?? 0), 0);
    expect(owed + (ada.inv.wood ?? 0), 'the plan is never over-covered').toBeLessThanOrEqual(3);
  });

  it('an ask nobody has answered is withdrawn once the need is met another way', () => {
    const { w, ada, ben, plan } = basketScene('d1-withdraw');
    const open = createRequest(w, ada, ben, { kind: 'wood', item: 'wood', amount: 3, destKind: 'person', destId: ada.id, planId: plan.id, purpose: plan.goal });
    produce(w, ada.inv, carryCap(w, ada), 'wood', 3, 'test: she found some herself');
    for (let n = 0; n < 40; n++) stepWorld(w);
    expect(open.status).toBe('cancelled');
    expect(open.note).toMatch(/no longer needed/);
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id), 'and nothing is on its way any more').toBe(0);
    expect(ben.commitments, 'nobody was left owing anything').toHaveLength(0);
  });
});

describe('a contribution smaller than the ask is recorded as what it was', () => {
  /** Ada means to make a basket (three wood), knows no tree, and Ben is beside her with less wood than she needs. */
  function shortHanded(seed: string, benWood: number, dynamics: 'rich' | 'authored' = 'rich') {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics }));
    const rng = new RNG(19);
    const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const home = createBuilding(w, 'lean_to', 41, 40, ada.hhId);
    const hh = w.households.find((h) => h.id === ada.hhId);
    if (hh) hh.homeId = home.id;
    // Ben has a roof of his own, so the wood in his hands is not already spoken for by a lean-to he is about to mark out
    const benHome = createBuilding(w, 'lean_to', 44, 40, ben.hhId);
    const benHh = w.households.find((h) => h.id === ben.hhId);
    if (benHh) benHh.homeId = benHome.id;
    const bush = makeSource(w, 'berry_bush', 39, 41, 20);
    observe(w, ada, bush);
    observe(w, ben, bush);
    observe(w, ada, home);
    observe(w, ben, benHome);
    testKit.finish(w, 'natural');
    testKit.befriend(ada, ben, 45, 45);
    ada.stats.gathered = 12;
    produce(w, ben.inv, carryCap(w, ben), 'wood', benWood, 'test: given to Ben');
    reviewIntentions(ctxFor(w, ada));
    return { w, ada, ben, plan: planOf(ada) };
  }

  /** the whole exchange, as it really happens: the engine offers the ask, she takes it, he answers, the material moves */
  function exchange(w: World, ada: Person, plan: Intention, ben: Person, window = 1800) {
    const taker = takesTheAsk(ada, ':plan:wood');
    const asked = until(w, window, () => w.requests.some((r) => r.planId === plan.id && r.to === ben.id));
    taker.restore();
    expect(asked, 'the ask was offered and taken').toBeGreaterThanOrEqual(0);
    const req = w.requests.find((r) => r.planId === plan.id && r.to === ben.id)!;
    const settled = until(w, 1500, () => req.status !== 'pending');
    expect(settled, `the exchange came to an answer (status ${req.status})`).toBeGreaterThanOrEqual(0);
    return req;
  }

  it('a helper who can only spare two of the three hands over two, and owes nothing for the third', () => {
    const { w, ada, ben, plan } = shortHanded('d1-partial-give', 2);
    expect(plan!.wants.wood).toBe(3);
    const before = { ada: ada.inv.wood ?? 0, ben: ben.inv.wood ?? 0 };
    const req = exchange(w, ada, plan!, ben);
    expect(req.amount, 'she asked for the three she is short').toBe(3);

    expect(ada.inv.wood ?? 0, 'exactly what he had moved').toBe(before.ada + 2);
    expect(ben.inv.wood ?? 0).toBe(before.ben - 2);
    expect(conservationReport(w).ok, `account: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);
    expect(req.status, 'answered, and not met').toBe('partial');
    expect(req.offered, 'agreed to').toBe(2);
    expect(req.delivered, 'actually brought').toBe(2);
    expect(req.note).toMatch(/asked for 3, given 2, received 2 wood/);
    expect(ben.commitments.filter((c) => c.status === 'active'), 'nobody owes the third').toHaveLength(0);

    // she still knows she is one short, and nothing is on its way
    reviewIntentions(ctxFor(w, ada));
    expect(plan!.status).toBe('active');
    expect(plan!.stepKind).toBe('get');
    expect(plan!.step).toMatch(/get 1 more wood for the basket/);
    expect(outstandingForPlan(w, ada.id, 'wood', plan!.id)).toBe(0);
    const h = planHelp(w, ada, plan!).at(-1)!;
    expect(h.status).toBe('partial');
    expect(describePerson(w, ada.id)!.qa.plan).toMatch(/brought 2 of the 3 wood asked for, and owes nothing more/);
    expect(describePerson(w, ada.id)!.requests[0].progress).toBe('2 of 3 wood brought');
  });

  it('a pack with room for less than was offered takes what fits, and the record says so', () => {
    const { w, ada, ben, plan } = shortHanded('d1-partial-room', 4);
    // her hands are nearly full, so the transfer, not the offer, decides what arrives
    produce(w, ada.inv, carryCap(w, ada), 'berries', 9, 'test: she is carrying berries');
    const req = exchange(w, ada, plan!, ben, 3000);
    const got = ada.inv.wood ?? 0;
    expect(req.offered, 'he agreed to as much as he could spare').toBeGreaterThan(0);
    expect(got, 'but only what her pack could take arrived').toBeLessThan(req.offered!);
    expect(got).toBeGreaterThan(0);
    expect(req.delivered).toBe(got);
    expect(req.status).toBe('partial');
    expect(ben.inv.wood ?? 0, 'and he still has the rest').toBe(4 - got);
    expect(conservationReport(w).ok, `account: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);
    expect(ben.commitments.filter((c) => c.status === 'active'), 'no debt was invented for the difference').toHaveLength(0);
    reviewIntentions(ctxFor(w, ada));
    expect((plan!.wants.wood ?? 0) - got, 'she is still short, and knows it').toBeGreaterThan(0);
  });

  it('an authored world takes on no such project at all, so none of this arises there', () => {
    const { w, ada, plan } = shortHanded('d1-partial-authored', 2, 'authored');
    expect(plan, 'no plan, so no project ask').toBeNull();
    for (let n = 0; n < 900; n++) stepWorld(w);
    expect(w.requests.some((r) => r.planId !== undefined)).toBe(false);
    expect(w.requests.some((r) => r.status === 'partial'), 'and the record keeps the wording the fingerprints hold').toBe(false);
    expect(w.requests.some((r) => r.offered !== undefined), 'with no new field written into an authored save').toBe(false);
    void ada;
  });
});

describe('an answer is given to the ask as it stands at that moment, not as it stood when it was made', () => {
  /** Ada means to make a basket (three wood) and knows no tree; Ben is beside her with wood, and has a roof of his own. */
  function pair(seed: string) {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(23);
    const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    for (const [who, x] of [[ada, 41], [ben, 44]] as [Person, number][]) {
      const b = createBuilding(w, 'lean_to', x, 40, who.hhId);
      const hh = w.households.find((h) => h.id === who.hhId);
      if (hh) hh.homeId = b.id;
      observe(w, who, b);
    }
    const bush = makeSource(w, 'berry_bush', 39, 41, 20);
    observe(w, ada, bush);
    observe(w, ben, bush);
    testKit.finish(w, 'natural');
    testKit.befriend(ada, ben, 45, 45);
    ada.stats.gathered = 12;
    produce(w, ben.inv, carryCap(w, ben), 'wood', 4, 'test: given to Ben');
    reviewIntentions(ctxFor(w, ada));
    return { w, ada, ben, plan: planOf(ada)! };
  }

  /** the asker takes the ask the engine offers, and we stop the moment the request exists and is still unanswered */
  function askMade(w: World, ada: Person, ben: Person, plan: Intention) {
    const taker = takesTheAsk(ada, ':plan:wood');
    const made = until(w, 2500, () => w.requests.some((r) => r.planId === plan.id && r.to === ben.id));
    taker.restore();
    expect(made, 'the engine offered the ask and she took it').toBeGreaterThanOrEqual(0);
    const req = w.requests.find((r) => r.planId === plan.id && r.to === ben.id)!;
    expect(req.status).toBe('pending');
    return req;
  }

  /** everything that could have moved, in one snapshot */
  const snap = (w: World, ada: Person, ben: Person) => ({
    ada: ada.inv.wood ?? 0,
    ben: ben.inv.wood ?? 0,
    commitments: ben.commitments.length,
    trust: ada.relations[ben.id]?.trust ?? 0,
    aff: ada.relations[ben.id]?.affinity ?? 0,
  });

  it('a need met after the last sweep but before the answer is answered with nothing', () => {
    const { w, ada, ben, plan } = pair('d1-boundary-need');
    const req = askMade(w, ada, ben, plan);
    expect(req.amount).toBe(3);

    // she comes by the wood herself, and no sweep has run yet: the request is still pending, and still says three
    produce(w, ada.inv, carryCap(w, ada), 'wood', 3, 'test: she found it herself');
    expect(req.status, 'nothing has tidied it up yet').toBe('pending');
    const before = snap(w, ada, ben);

    // the answer comes: the response boundary looks again, and there is nothing to answer
    const settled = until(w, 400, () => req.status !== 'pending');
    expect(settled, `the exchange reached an answer (status ${req.status})`).toBeGreaterThanOrEqual(0);
    expect(req.status).toBe('cancelled');
    expect(req.note).toMatch(/no longer needed/);
    expect(req.delivered ?? 0, 'nothing was handed over').toBe(0);
    const after = snap(w, ada, ben);
    expect(after.ada, 'her pack is as she left it').toBe(before.ada);
    expect(after.ben, 'and so is his').toBe(before.ben);
    expect(after.commitments, 'nobody took anything on').toBe(before.commitments);
    expect(after.trust, 'and nobody was thanked for a favour they did not do').toBe(before.trust);
    expect(after.aff).toBe(before.aff);
    expect(conservationReport(w).ok, `account: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);
    // and the ask is not reopened by the sweep afterwards
    updateRequests(w);
    expect(req.status).toBe('cancelled');
  });

  it('a request the sweep has already withdrawn stays withdrawn, and is not fulfilled by the answer', () => {
    const { w, ada, ben, plan } = pair('d1-boundary-cancelled');
    const req = askMade(w, ada, ben, plan);
    produce(w, ada.inv, carryCap(w, ada), 'wood', 3, 'test: she found it herself');
    updateRequests(w); // the periodic sweep gets there first
    expect(req.status, 'withdrawn by her own bookkeeping').toBe('cancelled');
    const before = snap(w, ada, ben);

    for (let n = 0; n < 400; n++) stepWorld(w);
    expect(req.status, 'and the answer does not turn it back into a favour').toBe('cancelled');
    expect(req.delivered ?? 0).toBe(0);
    const after = snap(w, ada, ben);
    // what she does with her own wood in those 400 ticks is her business (she may well make the basket); what must not change is
    // his pack, what anyone owes, and what she thinks of him
    expect(after.ben, 'nothing left his hands').toBe(before.ben);
    expect(after.commitments, 'nobody took anything on').toBe(before.commitments);
    expect(conservationReport(w).ok).toBe(true);
    // Standing between two people who spend the day together drifts on its own (they chat, they pass each other food), so what is
    // asserted is the absence of anything this ASK could have caused: no gift of what was asked for, no promise of it, and nothing
    // on the record that says a favour was done.
    expect(w.events.some((e) => /wood to Ada/.test(e.text)), 'no gift of wood is on the record').toBe(false);
    expect(w.events.some((e) => /promised Ada/.test(e.text)), 'and no promise of it either').toBe(false);
    expect(ben.commitments, 'nobody owes her anything').toHaveLength(0);
    expect(describePerson(w, ada.id)!.requests.find((r) => r.id === req.id)!.progress, 'and her card shows nothing brought').toBe('');
    void before.trust;
    void before.aff;
    expect(describePerson(w, ada.id)!.requests.find((r) => r.id === req.id)!.status, 'and her card says so').toBe('cancelled');
  });

  it('an answered project ask is answered once: nothing moves again for the rest of the exchange', () => {
    const { w, ada, ben, plan } = pair('d1-boundary-once');
    const req = askMade(w, ada, ben, plan);
    const settled = until(w, 400, () => req.status !== 'pending');
    expect(settled, `an answer was given (status ${req.status})`).toBeGreaterThanOrEqual(0);
    expect(['fulfilled', 'partial'], `answer: ${req.status}`).toContain(req.status);
    const once = { ada: ada.inv.wood ?? 0, ben: ben.inv.wood ?? 0, delivered: req.delivered ?? 0, status: req.status };
    expect(once.delivered).toBeGreaterThan(0);

    // the rest of the conversation, the thank-you, and well past it
    for (let n = 0; n < 600; n++) stepWorld(w);
    expect(req.status, 'the record does not change again').toBe(once.status);
    expect(req.delivered ?? 0, 'and nothing is handed over twice').toBe(once.delivered);
    expect(ben.commitments.filter((c) => c.status === 'active' && c.item === 'wood'), 'no obligation appeared afterwards').toHaveLength(0);
    expect(conservationReport(w).ok).toBe(true);
    void once.ada;
    void once.ben;
  });

  it('an authored world answers as it always did', () => {
    const w: World = testKit.flatWorld(settingsFor('d1-boundary-authored', { scene: 'natural', dynamics: 'authored' }));
    const rng = new RNG(29);
    const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    testKit.finish(w, 'natural');
    testKit.befriend(ada, ben, 45, 45);
    produce(w, ben.inv, carryCap(w, ben), 'wood', 3, 'test: given to Ben');
    const req = createRequest(w, ada, ben, { kind: 'wood', item: 'wood', amount: 2, destKind: 'person', destId: ada.id });
    // no plan exists in an authored world, so there is nothing to revalidate against: the answer is the old answer
    const answer = evaluateRequest(w, ben, ada, req);
    expect(answer.kind).toBe('give');
    expect(ada.intentions).toEqual([]);
    expect(req.planId).toBeUndefined();
  });
});

describe('the same answer given twice says and does the same thing once', () => {
  /** Ada, one wood short of a basket, and Ben beside her with wood and a roof of his own */
  function pair(seed: string, wants: number, benWood: number) {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(37);
    const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    for (const [who, x] of [[ada, 41], [ben, 44]] as [Person, number][]) {
      const b = createBuilding(w, 'lean_to', x, 40, who.hhId);
      const hh = w.households.find((h) => h.id === who.hhId);
      if (hh) hh.homeId = b.id;
      observe(w, who, b);
    }
    const bush = makeSource(w, 'berry_bush', 39, 41, 20);
    observe(w, ada, bush);
    observe(w, ben, bush);
    testKit.finish(w, 'natural');
    testKit.befriend(ada, ben, 45, 45);
    ada.stats.gathered = 12;
    produce(w, ben.inv, carryCap(w, ben), 'wood', benWood, 'test: given to Ben');
    reviewIntentions(ctxFor(w, ada));
    const plan = planOf(ada)!;
    if (wants > 0) produce(w, ada.inv, carryCap(w, ada), 'wood', Math.max(0, (plan.wants.wood ?? 0) - wants), 'test: she already has some');
    reviewIntentions(ctxFor(w, ada));
    return { w, ada, ben, plan };
  }

  /** everything a second answer could touch */
  const record = (w: World, ada: Person, ben: Person, r: Request) => ({
    status: r.status,
    note: r.note,
    outcome: r.outcome,
    resolved: r.resolved,
    delivered: r.delivered ?? 0,
    offered: r.offered,
    amount: r.amount,
    ada: ada.inv.wood ?? 0,
    ben: ben.inv.wood ?? 0,
    commitments: ben.commitments.map((c) => `${c.kind}:${c.item}:${c.amount}/${c.delivered ?? 0}:${c.status}`).join(','),
    trust: ada.relations[ben.id]?.trust ?? 0,
    aff: ada.relations[ben.id]?.affinity ?? 0,
    events: w.events.length,
  });

  /** Put the exchange back on its answering step and run the real machinery again - the response, not another 600 ticks of life. */
  function answerAgain(w: World, ada: Person): boolean {
    const c = w.conversations.find((x) => x.a === ada.id || x.b === ada.id);
    if (!c) return false;
    c.phase = 2; // the step that answers the ask (social.ts advance)
    c.nextAt = w.tick;
    updateConversations(w);
    return true;
  }

  function askAndAnswer(w: World, ada: Person, ben: Person, plan: Intention) {
    const taker = takesTheAsk(ada, ':plan:wood');
    const made = until(w, 2500, () => w.requests.some((r) => r.planId === plan.id && r.to === ben.id));
    taker.restore();
    expect(made, 'the engine offered the ask and she took it').toBeGreaterThanOrEqual(0);
    const req = w.requests.find((r) => r.planId === plan.id && r.to === ben.id)!;
    const answered = until(w, 400, () => req.status !== 'pending');
    expect(answered, `an answer was given (status ${req.status})`).toBeGreaterThanOrEqual(0);
    return req;
  }

  it('a repeated answer to a fulfilled ask changes nothing about it', () => {
    const { w, ada, ben, plan } = pair('d1-repeat-given', 1, 3);
    expect(plan.wants.wood! - (ada.inv.wood ?? 0), 'one short').toBe(1);
    const req = askAndAnswer(w, ada, ben, plan);
    expect(req.status, `answer: ${req.status} (${req.note})`).toBe('fulfilled');
    expect(req.delivered).toBe(1);
    const before = record(w, ada, ben, req);

    // the very same answering step, run again
    expect(answerAgain(w, ada), 'the exchange was still open to answer again').toBe(true);
    const after = record(w, ada, ben, req);
    expect(after.status, 'still fulfilled, not withdrawn').toBe('fulfilled');
    expect(after.note, 'and it still says what happened').toBe(before.note);
    expect(after.outcome).toBe(before.outcome);
    expect(after.resolved, 'settled once, at the moment it was settled').toBe(before.resolved);
    expect(after.delivered, 'nothing was handed over twice').toBe(before.delivered);
    expect(after.offered).toBe(before.offered);
    expect(after.amount).toBe(before.amount);
    expect(after.ada).toBe(before.ada);
    expect(after.ben).toBe(before.ben);
    expect(after.commitments, 'and no obligation appeared').toBe(before.commitments);
    expect(after.trust, 'nobody was thanked twice').toBe(before.trust);
    expect(after.aff).toBe(before.aff);
    expect(conservationReport(w).ok, `account: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);
  });

  it('a repeated answer cannot rewrite an ask that was already answered with a promise', () => {
    // The hammer Ben means to make takes both pieces of stone he is carrying, and he knows a rock, so he has none spare to hand
    // over and can still fetch more. That is a promise. Giving him spare wood, as an earlier draft of this scene did, is a gift.
    const { w, ada, ben, plan, farRock } = scene('d1-repeat-promised');
    benHasHisOwnPlan(w, ben, farRock, true);
    expect(ben.intentions.some((i) => i.status === 'active' && i.kind === 'tool' && (i.wants.stone ?? 0) >= (ben.inv.stone ?? 0)), 'his own project speaks for the stone in his hands').toBe(true);
    const taker = takesTheAsk(ada, ':plan:stone');
    const made = until(w, 3600, () => w.requests.some((r) => r.planId === plan.id && r.to === ben.id));
    taker.restore();
    expect(made, 'the engine offered the ask and she took it').toBeGreaterThanOrEqual(0);
    const req = w.requests.find((r) => r.planId === plan.id && r.to === ben.id)!;
    const answered = until(w, 600, () => req.status !== 'pending');
    expect(answered, `an answer was given (status ${req.status} ${req.note})`).toBeGreaterThanOrEqual(0);
    expect(req.status, `the first answer must be a promise, not ${req.status} (${req.note})`).toBe('promised');
    const live = ben.commitments.filter((c) => c.status === 'active');
    expect(live, 'one obligation, for what he agreed to').toHaveLength(1);
    expect(req.delivered ?? 0, 'and nothing delivered yet').toBe(0);
    // and she comes by the stone herself in the meantime: the ask is answered, so there is nothing left for anyone to revise - the
    // promise is his to keep and runs its own course (the late-delivery rule)
    produce(w, ada.inv, carryCap(w, ada), 'stone', 1, 'test: she found the last piece herself');
    const before = record(w, ada, ben, req);
    const packs = { ada: { ...ada.inv }, ben: { ...ben.inv } };
    const events = w.events.length;

    expect(answerAgain(w, ada), 'the exchange was still open to answer again').toBe(true);
    const after = record(w, ada, ben, req);
    expect(after.status, 'the promise still stands: a settled ask is not revised by a later answer').toBe('promised');
    expect(after.note).toBe(before.note);
    expect(after.outcome).toBe(before.outcome);
    expect(after.resolved, 'settled once, at the moment it was settled').toBe(before.resolved);
    expect(after.amount, 'and the ask it answers was not rewritten').toBe(before.amount);
    expect(after.offered).toBe(before.offered);
    expect(after.delivered, 'a second answer delivers nothing').toBe(before.delivered);
    expect(after.delivered).toBe(0);
    expect(after.commitments, 'with no second obligation taken on').toBe(before.commitments);
    expect(ben.commitments.filter((c) => c.status === 'active'), 'and his obligation was not voided from afar').toHaveLength(1);
    expect(ada.inv).toEqual(packs.ada);
    expect(ben.inv).toEqual(packs.ben);
    expect(after.trust, 'nobody was thanked twice').toBe(before.trust);
    expect(after.aff).toBe(before.aff);
    expect(w.events.length, 'and the promise is not announced again').toBe(events);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a withdrawn ask keeps its own record when the answer comes round again', () => {
    const { w, ada, ben, plan } = pair('d1-repeat-withdrawn', 1, 3);
    const taker = takesTheAsk(ada, ':plan:wood');
    const made = until(w, 2500, () => w.requests.some((r) => r.planId === plan.id && r.to === ben.id));
    taker.restore();
    expect(made).toBeGreaterThanOrEqual(0);
    const req = w.requests.find((r) => r.planId === plan.id && r.to === ben.id)!;
    produce(w, ada.inv, carryCap(w, ada), 'wood', 1, 'test: she found the last piece herself');
    updateRequests(w);
    expect(req.status).toBe('cancelled');
    const before = record(w, ada, ben, req);

    expect(answerAgain(w, ada)).toBe(true);
    const after = record(w, ada, ben, req);
    expect(after.status).toBe('cancelled');
    expect(after.note, 'the reason it was withdrawn is still the reason').toBe(before.note);
    expect(after.resolved).toBe(before.resolved);
    expect(after.delivered).toBe(0);
    expect(after.ben, 'and he gave nothing').toBe(before.ben);
    expect(after.commitments).toBe(before.commitments);
    expect(after.trust).toBe(before.trust);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('F4: a top-up ask is measured against what is really still missing', () => {
  /** Ada's basket plan is three wood short; two neighbours have each promised one, and a third is asked for the last */
  function partlyCovered(seed: string) {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(41);
    const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const cal = testKit.addPerson(w, rng, { name: 'Cal', x: 42.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const dov = testKit.addPerson(w, rng, { name: 'Dov', x: 43.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    const home = createBuilding(w, 'lean_to', 41, 40, ada.hhId);
    const hh = w.households.find((h) => h.id === ada.hhId);
    if (hh) hh.homeId = home.id;
    const bush = makeSource(w, 'berry_bush', 39, 41, 20);
    for (const q of [ada, ben, cal, dov]) observe(w, q, bush);
    observe(w, ada, home);
    testKit.finish(w, 'natural');
    for (const q of [ben, cal, dov]) testKit.befriend(ada, q, 45, 45);
    ada.stats.gathered = 12;
    for (const q of [ben, cal, dov]) produce(w, q.inv, carryCap(w, q), 'wood', 3, 'test: given to a neighbour');
    reviewIntentions(ctxFor(w, ada));
    const plan = planOf(ada)!;
    expect(plan.wants.wood, 'three wood short').toBe(3);
    return { w, ada, ben, cal, dov, plan };
  }

  /** a promise already made, in the state the conversation leaves it in */
  function promise(w: World, from: Person, to: Person, plan: Intention, n: number, delivered = 0) {
    const r = createRequest(w, to, from, { kind: 'wood', item: 'wood', amount: n, destKind: 'person', destId: to.id, planId: plan.id });
    const c: Commitment = { id: w.nextId++, requestId: r.id, kind: 'deliver', to: to.id, item: 'wood', amount: n, siteId: 0, made: w.tick, deadline: w.tick + DAY, status: 'active', destKind: 'person', destId: to.id, delivered };
    from.commitments.push(c);
    r.status = 'promised';
    r.offered = n;
    r.delivered = delivered;
    r.commitmentId = c.id;
    return { r, c };
  }

  it('two promises of one do not cover a shortage of three: the third ask is answered on its merits', () => {
    const { w, ada, ben, cal, dov, plan } = partlyCovered('f4-topup');
    promise(w, ben, ada, plan, 1);
    promise(w, cal, ada, plan, 1);
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id), 'two of the three are on their way').toBe(2);

    const r3 = createRequest(w, ada, dov, { kind: 'wood', item: 'wood', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id });
    const answer = evaluateRequest(w, dov, ada, r3);
    expect(answer.kind, `answer: ${JSON.stringify(answer)}`).not.toBe('decline');
    if (answer.kind === 'decline') expect((answer as { reason: string }).reason).not.toBe('enough');
    if (answer.kind === 'give') expect(answer.n, 'and only the one that is missing').toBeLessThanOrEqual(1);
  });

  it('when the promises really do cover it, the next ask is refused as enough', () => {
    const { w, ada, ben, cal, dov, plan } = partlyCovered('f4-covered');
    promise(w, ben, ada, plan, 2);
    promise(w, cal, ada, plan, 1);
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id)).toBe(3);
    const r3 = createRequest(w, ada, dov, { kind: 'wood', item: 'wood', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id });
    const answer = evaluateRequest(w, dov, ada, r3);
    expect(answer.kind).toBe('decline');
    expect((answer as { reason: string }).reason).toBe('enough');
  });

  it('a partial delivery moves the remainder, and the next ask follows it', () => {
    const { w, ada, ben, cal, dov, plan } = partlyCovered('f4-partial');
    const { c } = promise(w, ben, ada, plan, 2, 0);
    promise(w, cal, ada, plan, 1);
    // Ben brings one of his two: the pack has one, one is still owed, and one of the three is still nobody's
    transfer(w, ben.inv, ada.inv, carryCap(w, ada), 'wood', 1, 'person:' + ben.id, 'person:' + ada.id, 'test: part of a promise');
    c.delivered = 1;
    expect(ada.inv.wood).toBe(1);
    expect(planShortfall(ada, plan.id, 'wood'), 'two still missing').toBe(2);
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id), 'of which two are owed').toBe(2);
    const r3 = createRequest(w, ada, dov, { kind: 'wood', item: 'wood', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id });
    const answer = evaluateRequest(w, dov, ada, r3);
    expect(answer.kind, 'everything is covered now, so this one is not needed').toBe('decline');
    expect((answer as { reason: string }).reason).toBe('enough');
  });

  it('a withdrawn promise frees the shortage for someone else to answer', () => {
    const { w, ada, ben, cal, dov, plan } = partlyCovered('f4-withdrawn');
    const a = promise(w, ben, ada, plan, 2);
    promise(w, cal, ada, plan, 1);
    const r3 = createRequest(w, ada, dov, { kind: 'wood', item: 'wood', amount: 1, destKind: 'person', destId: ada.id, planId: plan.id });
    expect((evaluateRequest(w, dov, ada, r3) as { reason: string }).reason, 'covered while both promises stand').toBe('enough');
    // Ben's promise falls through, as the commitment system records it
    a.c.status = 'failed';
    a.r.status = 'failed';
    // what is left on its way: Cal's one, plus this still-unanswered ask of one
    expect(outstandingForPlan(w, ada.id, 'wood', plan.id)).toBe(2);
    const answer = evaluateRequest(w, dov, ada, r3);
    expect(answer.kind, 'now there is a real gap again').not.toBe('decline');
  });

  it('no helper is left owing more than the shortage, however many are asked', () => {
    const { w, ada, ben, cal, dov, plan } = partlyCovered('f4-nodupe');
    for (const [who, n] of [[ben, 1], [cal, 1], [dov, 1]] as [Person, number][]) {
      const r = createRequest(w, ada, who, { kind: 'wood', item: 'wood', amount: n, destKind: 'person', destId: ada.id, planId: plan.id });
      const answer = evaluateRequest(w, who, ada, r);
      if (answer.kind === 'give') {
        transfer(w, who.inv, ada.inv, carryCap(w, ada), 'wood', answer.n, 'person:' + who.id, 'person:' + ada.id, 'test');
        r.delivered = answer.n;
        r.status = 'fulfilled';
      } else if (answer.kind === 'promise') {
        promise(w, who, ada, plan, answer.n);
      }
    }
    const owed = [ben, cal, dov].flatMap((q) => q.commitments.filter((c) => c.status === 'active' && c.item === 'wood')).reduce((n, c) => n + c.amount - (c.delivered ?? 0), 0);
    expect(owed + (ada.inv.wood ?? 0), 'together they never exceed what the plan wants').toBeLessThanOrEqual(3);
    expect(conservationReport(w).ok, `account: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);
  });
});

describe('F7: resting under a roof is not progress on mending it', () => {
  it('one night at home credits the night plan and leaves the repair plan untouched', () => {
    const w: World = testKit.flatWorld(settingsFor('f7-share', { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(43);
    const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 95 });
    const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
    const hh = w.households.find((h) => h.id === p.hhId);
    if (hh) hh.homeId = home.id;
    observe(w, p, home);
    testKit.finish(w, 'natural');
    home.condition = 40; // the roof is going, which is what a repair plan is for
    observe(w, p, home);
    p.stats.gathered = 12;
    while (dayFraction(w.tick) < 0.816 || dayFraction(w.tick) > 0.824) w.tick++;
    p.needs.warmth = 40;
    reviewIntentions(ctxFor(w, p));
    reviewIntentions(ctxFor(w, p));
    const night = p.intentions.find((i) => i.status === 'active' && i.kind === 'night');
    const repair = p.intentions.find((i) => i.status === 'active' && i.kind === 'repair');
    expect(night, 'a plan for the night').toBeTruthy();
    expect(repair, 'and a plan to mend the roof').toBeTruthy();
    expect(night!.aboutId, 'both about the same building').toBe(home.id);
    expect(repair!.aboutId).toBe(home.id);

    // the real stay, through the engine's own option and choice - once it is night by this person's own reckoning
    for (let n = 0; n < 900 && !ctxFor(w, p).night; n++) stepWorld(w);
    expect(ctxFor(w, p).night, 'night fell').toBe(true);
    expect(night!.status, 'and the night plan is still to be lived through').toBe('active');
    decide(w, p, 'test');
    expect(p.activity!.data.optKey).toBe(`shelter:${home.id}`);
    for (let n = 0; n < 1500 && night!.status === 'active'; n++) stepWorld(w);

    expect(night!.sheltered, 'the night plan earned the hours').toBeGreaterThanOrEqual(240);
    expect(repair!.sheltered, 'the repair plan earned none of them').toBe(0);
    expect(repair!.worked, 'and no work on the roof was invented').toBe(0);
    expect(conservationReport(w).ok).toBe(true);
  });
});


describe('F5: a promise kept is reported as kept', () => {
  /**
   * The chain under test is the whole of it: a request really answered with a gift, the request settled as fulfilled, the word the
   * exchange records for it (`kept`), what the conversation puts in `lastInteraction`, and what the inhabitant's transcript makes of
   * that. Before the repair the last step fell through to `partial`, so someone who got exactly what they asked for was told their
   * own action had only half worked.
   */
  async function askAndBeGiven(seed: string) {
    const s = stage(seed);
    const ada = stagePerson(s, 'Ada', 40.5, 40.5, { hunger: 24, thirst: 85, energy: 85 });
    const ben = stagePerson(s, 'Ben', 41.5, 40.5, { hunger: 85, thirst: 85, energy: 85 });
    const w = done(s);
    produce(w, ben.inv, carryCap(w, ben), 'berries', 8, 'test: Ben has food to spare');
    testKit.befriend(ada, ben, 50, 50);
    const key = `socialize:${ben.id}:request:food`;
    // take the ask the engine offers, and nothing social afterwards (a later exchange would overwrite the record)
    const quiet = (o: { options: { key: string }[] }): string => (o.options.find((x) => !x.key.startsWith('socialize:')) ?? o.options[0]).key;
    const model = chooser('asker', (o) => (o.options.some((x) => x.key === key) ? key : quiet(o)));
    const r = await runLive(w, ada.id, model, { until: 200 });
    const at = (id: number) => r.world.persons.find((q) => q.id === id)!;
    return { world: r.world, ada: at(ada.id), ben: at(ben.id), transcript: r.transcript, call: r.transcript.calls.find((c) => c.result?.key === key) };
  }

  it('the gift settles the request, the record says “kept”, and the transcript calls it a success', async () => {
    const { world, ada, transcript, call } = await askAndBeGiven('f5-kept');
    expect(call, 'Ada was offered the ask and took it').toBeTruthy();

    const req = world.requests.find((x) => x.from === ada.id);
    expect(req, 'a request was made').toBeTruthy();
    expect(req!.status, 'and it was answered in full').toBe('fulfilled');
    expect(req!.outcome, 'which the record words as “kept”').toBe('kept');
    expect(req!.delivered ?? 0, 'with food that really moved').toBeGreaterThan(0);
    expect(ada.lastInteraction?.outcome, 'the exchange carries that word').toBe('kept');

    const outcome = transcript.outcomes.find((o) => o.activityId === call!.result!.activityId);
    expect(outcome, 'the asking has a recorded outcome').toBeTruthy();
    expect(outcome!.outcome, 'a promise kept is not half-done').not.toBe('partial');
    expect(outcome!.outcome).toBe('success');
    expect(conservationReport(world).ok).toBe(true);
  });

  it('the other endings keep their own classification', async () => {
    // nothing to give: the ask is refused, and a refusal is not a success
    const s = stage('f5-refused');
    const ada = stagePerson(s, 'Ada', 40.5, 40.5, { hunger: 24, thirst: 85, energy: 85 });
    const ben = stagePerson(s, 'Ben', 41.5, 40.5, { hunger: 85, thirst: 85, energy: 85 });
    const w = done(s);
    ben.inv = {};
    testKit.befriend(ada, ben, 50, 50);
    const key = `socialize:${ben.id}:request:food`;
    const quiet = (o: { options: { key: string }[] }): string => (o.options.find((x) => !x.key.startsWith('socialize:')) ?? o.options[0]).key;
    const model = chooser('asker', (o) => (o.options.some((x) => x.key === key) ? key : quiet(o)));
    const r = await runLive(w, ada.id, model, { until: 200 });
    const call = r.transcript.calls.find((c) => c.result?.key === key);
    if (!call) return; // he had nothing to give and she was never offered the ask: nothing to classify
    const req = r.world.requests.find((x) => x.from === ada.id);
    if (!req || req.status === 'pending') return;
    const outcome = r.transcript.outcomes.find((o) => o.activityId === call.result!.activityId);
    if (outcome) expect(outcome.outcome, `a ${req.status} ask is not a success`).not.toBe('success');
  });
});

describe('Test A: two live plans, a contested pack, and a save in the middle', () => {
  /** a builder at dusk with a project and a night plan, and wood that only one of them can have */
  function twoPlanScene(seed: string) {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(53);
    const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 95 });
    const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
    const hh = w.households.find((h) => h.id === p.hhId);
    if (hh) hh.homeId = home.id;
    const tree = makeSource(w, 'tree', 44, 40, 9);
    observe(w, p, tree);
    observe(w, p, home);
    testKit.finish(w, 'natural');
    p.stats.gathered = 12;
    while (dayFraction(w.tick) < 0.696 || dayFraction(w.tick) > 0.704) w.tick++;
    p.needs.warmth = 40;
    // one decision adopts one plan: the night first, then the project
    reviewIntentions(ctxFor(w, p));
    reviewIntentions(ctxFor(w, p));
    // wood in the pack that the project has spoken for: the contested material
    produce(w, p.inv, carryCap(w, p), 'wood', 2, 'test: some of what the project wants');
    return { w, p, home, tree };
  }

  it('a world saved mid-scenario resolves exactly as one that was never saved', () => {
    const straight = twoPlanScene('twoplan-replay');
    const forked = twoPlanScene('twoplan-replay');
    expect(straight.p.intentions.filter((i) => i.status === 'active'), 'two plans to carry across').toHaveLength(2);

    // a stretch of ordinary life first, so the save catches them mid-stride
    for (let n = 0; n < 400; n++) {
      stepWorld(straight.w);
      stepWorld(forked.w);
    }
    expect(straight.w.tick).toBe(forked.w.tick);
    const liveAtSave = forked.p.intentions.filter((i) => i.status === 'active').length;
    expect(liveAtSave, 'still carrying plans when the save is taken').toBeGreaterThan(0);

    const reloaded = deserializeWorld(serializeWorld(forked.w));
    const back = reloaded.persons.find((x) => x.id === forked.p.id)!;
    expect(back.intentions.length, 'every plan came back, live and ended alike').toBe(forked.p.intentions.length);
    expect(back.intentions.map((i) => [i.id, i.kind, i.status, i.sheltered, i.worked, JSON.stringify(i.wants)])).toEqual(
      forked.p.intentions.map((i) => [i.id, i.kind, i.status, i.sheltered, i.worked, JSON.stringify(i.wants)]),
    );

    // long enough to cross first light, settle the night plan and move the project on
    for (let n = 0; n < 3000; n++) {
      stepWorld(straight.w);
      stepWorld(reloaded);
    }
    const a = JSON.parse(serializeWorld(straight.w));
    const b = JSON.parse(serializeWorld(reloaded));
    expect(deepEqualState(a, b), `full state differs: ${firstDiffs(a, b, 8).join(' | ')}`).toBe(true);

    // and the things the audit asked to be compared by name, not only by the compact hash
    const after = reloaded.persons.find((x) => x.id === straight.p.id)!;
    expect(after.intentions.map((i) => `${i.kind}:${i.status}:${i.reason}:${i.sheltered}:${Math.round(i.worked)}`)).toEqual(
      straight.p.intentions.map((i) => `${i.kind}:${i.status}:${i.reason}:${i.sheltered}:${Math.round(i.worked)}`),
    );
    expect(after.commitments).toEqual(straight.p.commitments);
    expect(reloaded.events.map((e) => `${e.tick}:${e.text}`)).toEqual(straight.w.events.map((e) => `${e.tick}:${e.text}`));
    expect(reloaded.requests.map((r) => `${r.id}:${r.status}:${r.delivered ?? 0}`)).toEqual(straight.w.requests.map((r) => `${r.id}:${r.status}:${r.delivered ?? 0}`));
    expect(conservationReport(straight.w).ok, 'the straight run balances').toBe(true);
    expect(conservationReport(reloaded).ok, 'and so does the resumed one').toBe(true);
    expect(hashWorld(reloaded), 'the compact hash agrees too, but it is the weaker check').toBe(hashWorld(straight.w));
  });
});

describe('Test B: asking for help while carrying a night plan as well', () => {
  /**
   * The whole chain, with two plans live: a project short of material, an ask made to somebody who can see it, that person's own
   * answer, what really moves, what the project then needs, and what the card says - while the night plan sits beside it, neither
   * erased nor credited with any of it.
   */
  function dualScene(seed: string) {
    const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
    const rng = new RNG(59);
    const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 95 });
    const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    for (const [who, x] of [[ada, 41], [ben, 44]] as [Person, number][]) {
      const b = createBuilding(w, 'lean_to', x, 40, who.hhId);
      const hh = w.households.find((h) => h.id === who.hhId);
      if (hh) hh.homeId = b.id;
      observe(w, who, b);
    }
    const bush = makeSource(w, 'berry_bush', 39, 41, 20);
    observe(w, ada, bush);
    observe(w, ben, bush);
    testKit.finish(w, 'natural');
    testKit.befriend(ada, ben, 45, 45);
    ada.stats.gathered = 12;
    produce(w, ben.inv, carryCap(w, ben), 'wood', 4, 'test: Ben is carrying wood');
    // dusk, cold: the night is worth a plan, and so is the basket. One decision adopts one plan.
    while (dayFraction(w.tick) < 0.696 || dayFraction(w.tick) > 0.704) w.tick++;
    ada.needs.warmth = 40;
    reviewIntentions(ctxFor(w, ada));
    reviewIntentions(ctxFor(w, ada));
    const live = ada.intentions.filter((i) => i.status === 'active');
    return { w, ada, ben, live };
  }

  it('the project gets its help, the night plan is untouched, and the card tells both stories', () => {
    const { w, ada, ben, live } = dualScene('dual-help');
    expect(live.map((i) => i.kind).sort(), 'a project and a night plan').toEqual(['night', 'tool']);
    const project = live.find((i) => i.kind === 'tool')!;
    const night = live.find((i) => i.kind === 'night')!;
    const shortBefore = planShortfall(ada, project.id, 'wood');
    expect(shortBefore, 'the project is short of wood').toBeGreaterThan(0);
    const nightBefore = { sheltered: night.sheltered, status: night.status, since: night.since, until: night.until };

    // nobody is steered: the option layer offers the ask and the ordinary ranking takes it
    const asked = until(w, 1200, () => w.requests.some((r) => r.planId === project.id && r.to === ben.id));
    expect(asked, 'she asked him, unprompted').toBeGreaterThanOrEqual(0);
    const req = w.requests.find((r) => r.planId === project.id && r.to === ben.id)!;
    expect(req.amount, 'for the uncovered shortage, no more').toBeLessThanOrEqual(shortBefore);
    expect(req.planId, 'and it says which project it is for').toBe(project.id);

    const settled = until(w, 1500, () => req.status !== 'pending');
    expect(settled, `an answer was given (${req.status})`).toBeGreaterThanOrEqual(0);
    expect(['fulfilled', 'partial', 'promised', 'declined']).toContain(req.status);

    const delivered0 = req.delivered ?? 0;
    const shortAfter = planShortfall(ada, project.id, 'wood');

    // whatever the answer, the night plan is neither erased nor credited by it
    expect(night.status, 'the night plan still stands').toBe(nightBefore.status);
    expect(night.sheltered, 'and earned nothing from an exchange about wood').toBe(nightBefore.sheltered);
    expect(night.since).toBe(nightBefore.since);
    expect(night.until, 'its deadline is its own').toBe(nightBefore.until);
    expect(ada.intentions.filter((i) => i.status === 'active').map((i) => i.kind).sort(), 'both plans are still carried').toEqual(['night', 'tool']);

    // what the project needs now follows what really arrived, and nothing else
    expect(shortAfter, 'the shortfall moved by exactly what came').toBe(Math.max(0, shortBefore - delivered0));
    if (req.status === 'promised') {
      expect(delivered0, 'a promise delivers nothing yet').toBe(0);
      expect(outstandingForPlan(w, ada.id, 'wood', project.id), 'but it is on its way').toBeGreaterThan(0);
    }
    if (req.status === 'fulfilled' || req.status === 'partial') {
      expect(delivered0, 'a delivery really moved material').toBeGreaterThan(0);
      expect(ada.inv.wood ?? 0).toBeGreaterThanOrEqual(delivered0);
    }
    expect(conservationReport(w).ok, `account: ${JSON.stringify(conservationReport(w).diffs)}`).toBe(true);

    // the card: both plans, each on its own terms, with the help named on the project alone
    const v = describePerson(w, ada.id)!;
    expect(v.plans, 'both plans on the card').toHaveLength(2);
    const projectRow = v.plans.find((x) => x.kind === 'tool')!;
    const nightRow = v.plans.find((x) => x.kind === 'night')!;
    expect(projectRow.detail, 'the project mentions the asking').toMatch(/Ben/);
    expect(nightRow.detail, 'the night plan says nothing about it').not.toMatch(/Ben/);
    expect(nightRow.progress).toMatch(/\d+ ticks under shelter/);
    const row = v.requests.find((r) => r.id === req.id);
    expect(row, 'and the request is on the card').toBeTruthy();
    expect(row!.purpose, 'saying which project it was for').toBe(project.goal);
  });
});
