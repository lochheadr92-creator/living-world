// Cooperation and trades together, end to end, with trades ENABLED.
//
// The D1 chain (a project's shortfall becomes an ask, an answer, real material, a tool) is held by tests/project_cooperation.test.ts,
// and that corner holds its two people OUT of trades, because a woodcutter who has settled on hers fills her pack with wood and
// then has no room for the stone she asked for. So nothing covered the two mechanisms TOGETHER - and together is where a trade
// could quietly break cooperation: by filling the pack the gift has to land in, by pulling the asker away from the person they
// meant to ask, or by making the neighbour's own work look like a reason not to ask at all.
//
// This follows one project through with both in force: the trade each of them settles on for themselves, the ask the engine
// offers, the answer Ben gives for his own reasons, the stone actually moving from his pack to hers, and the hammer that exists
// at the end. Nothing here fabricates an option - the controller takes the ask only when the engine has offered it, and Ben
// answers entirely for himself.
//
// The corner is staged in two ways, and both are about keeping the subject in view rather than about making it succeed: Ben
// stands still with his stone (an ordinary staged bystander, kit.pin), and Ada's household has food in its store, so that she
// is not out filling her pack with berries. With a full pack she does not ask at all and the project stalls - that is real
// behaviour, held at the option layer by tests/project_ask.test.ts ("a yes they could not carry is not asked for at all"), and
// it is the reason this corner does not leave her foraging.
import { afterEach, describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { generateOptions } from '../src/sim/decision';
import { conservationReport, produce } from '../src/sim/economy';
import { setExternalController } from '../src/sim/external';
import type { ExternalChoice } from '../src/sim/external';
import { planHelp, reviewIntentions } from '../src/sim/intent';
import { observe } from '../src/sim/knowledge';
import { carryCap } from '../src/sim/people';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import { tradeWord } from '../src/sim/trade';
import type { Intention, Person, Request, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { pin } from './helpers/kit';
import { settingsFor } from './helpers/util';

/**
 * Ada is a builder, one stone short of the hammer she means to make and with no rock she knows of; Ben stands two tiles away with
 * stone in his hands and no project of his own. Nobody is held out of trades: each settles on one from their own skills and what
 * they can see, as they would in any rich world.
 */
function corner(seed: string) {
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
  const rng = new RNG(13);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 42.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const home = createBuilding(w, 'lean_to', 41, 40, ada.hhId);
  const hh = w.households.find((h) => h.id === ada.hhId);
  if (hh) hh.homeId = home.id;
  for (const [x, y] of [[44, 41], [45, 40], [43, 39]] as [number, number][]) observe(w, ada, makeSource(w, 'tree', x, y, 9));
  const bush = makeSource(w, 'berry_bush', 39, 41, 20);
  observe(w, ben, bush);
  observe(w, ada, home);
  testKit.finish(w, 'natural');
  testKit.befriend(ada, ben, 40, 40);
  pin(ben); // he stays where he is, with what he is carrying: the subject is the asking, not his errands
  produce(w, home.store.items, home.store.cap, 'berries', 8, 'test: the household has food in store');
  // a builder: the tool she would want for herself is the hammer, which takes wood and two stone
  ada.stats.gathered = 12;
  ada.stats.built = 1;
  ada.skills.build = 1.7;
  produce(w, ada.inv, carryCap(w, ada), 'wood', 2, 'test: given to Ada');
  produce(w, ada.inv, carryCap(w, ada), 'stone', 1, 'test: given to Ada');
  produce(w, ben.inv, carryCap(w, ben), 'stone', 3, 'test: given to Ben');
  reviewIntentions(generateOptions(w, ada, true));
  return { w, ada, ben, plan: ada.intentions.find((i) => i.kind === 'tool') as Intention };
}

/** takes one option the engine offered, by key, and leaves every other choice to the engine */
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

function until(w: World, ticks: number, done: () => boolean): number {
  for (let n = 0; n < ticks; n++) {
    if (done()) return n;
    stepWorld(w);
  }
  return done() ? ticks : -1;
}

const stone = (p: Person) => p.inv.stone ?? 0;
const planAsk = (w: World, plan: Intention): Request | undefined => w.requests.find((r) => r.planId === plan.id);

/** the whole corner, run once: the ask is taken when offered, then nobody is driven at all */
function run(seed: string, ticks = 6000) {
  const c = corner(seed);
  const before = { ada: stone(c.ada), ben: stone(c.ben) };
  const ctl = takesTheAsk(c.ada, ':plan:stone');
  let askedAt = -1;
  try {
    askedAt = until(c.w, 1500, () => planAsk(c.w, c.plan) !== undefined);
  } finally {
    ctl.restore();
  }
  const madeAt = until(c.w, ticks, () => (c.ada.inv.hammer ?? 0) > 0);
  return { ...c, before, askedAt, madeAt, req: planAsk(c.w, c.plan) };
}

afterEach(() => setExternalController(null));

describe('a project, an ask and a neighbour, with trades in force', () => {
  it('each settles on a trade of their own, and the project still knows what it lacks', () => {
    const { w, ada, ben, plan } = corner('coop-trade-a');
    until(w, 400, () => ada.trade !== null && ben.trade !== null);
    expect(ada.trade, 'Ada has settled on a trade of her own').not.toBeNull();
    expect(tradeWord(ada.trade!.key), 'and it is one of the ordinary kinds of work').toBeTruthy();
    expect(plan.makes).toBe('hammer');
    expect(plan.stepItem, 'the stone is what it is short of').toBe('stone');
    expect(plan.wants.stone).toBe(2);
  }, 60_000);

  it('the ask is offered, answered, and the stone really moves from his pack to hers', () => {
    const r = run('coop-trade-b');
    expect(r.askedAt, 'the engine offered the ask and it was taken').toBeGreaterThanOrEqual(0);
    const req = r.req!;
    expect(req.from).toBe(r.ada.id);
    expect(req.to, 'she asked the man she could see carrying stone').toBe(r.ben.id);
    expect(req.item).toBe('stone');
    expect(req.likely, 'under the rule that it would probably be answered yes').toBe(true);
    expect(r.ada.trade, 'with her trade settled all the while').not.toBeNull();
    expect(['fulfilled', 'partial'], `answer was ${req.status}`).toContain(req.status);
    expect(req.delivered ?? 0, 'and something really arrived').toBeGreaterThan(0);
    // the material itself, out of one pack and into the other, with the books balancing
    expect(r.before.ben - stone(r.ben), 'as much stone left Ben as the ask brought').toBeGreaterThanOrEqual(req.delivered ?? 0);
    expect(conservationReport(r.w).ok, 'nothing was conjured on the way').toBe(true);
    // and the project's own record names the neighbour who brought it
    const help = planHelp(r.w, r.ada, r.plan);
    expect(help.some((h) => h.who === r.ben.name && h.item === 'stone' && h.delivered > 0), JSON.stringify(help)).toBe(true);
  }, 180_000);

  it('the project ends in a tool really in her pack, and its ending says who helped', () => {
    const r = run('coop-trade-b');
    expect(r.madeAt, 'the hammer exists').toBeGreaterThanOrEqual(0);
    expect(r.ada.inv.hammer ?? 0).toBeGreaterThan(0);
    // a plan is finished where it is reviewed, which is the next time she thinks: the tool exists first, the ending follows
    expect(until(r.w, 300, () => r.plan.status !== 'active'), 'and the plan is reviewed and closed').toBeGreaterThanOrEqual(0);
    expect(r.plan.status, 'the plan it came from ended').toBe('done');
    expect(r.plan.reason, 'and says what it came to, and whose stone went into it').toMatch(/hammer/);
    expect(r.plan.reason).toContain(r.ben.name);
    expect(conservationReport(r.w).ok).toBe(true);
  }, 180_000);

  it('is reproducible: the same corner twice comes to the same world', () => {
    const a = run('coop-trade-b');
    const b = run('coop-trade-b');
    expect(b.askedAt).toBe(a.askedAt);
    expect(b.req?.status).toBe(a.req?.status);
    expect(b.req?.delivered).toBe(a.req?.delivered);
    expect(b.madeAt).toBe(a.madeAt);
    expect(hashWorld(b.w), 'the same state, to the hash').toBe(hashWorld(a.w));
  }, 300_000);
});
