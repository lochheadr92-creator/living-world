// Stage D1, second slice: WHEN a project's shortfall becomes an ask (src/sim/options_social.ts).
//
// The first version asked whenever somebody could be seen carrying the thing, and the measured result was that it was correct and
// useless: 143 asks a village brought 37 units, because nearly everyone asked had the thing and had it spoken for. The rule now is
// that an ask is made only when, by the asker's OWN sight and OWN memory, it should be answered yes - and that fetching it
// themselves is weighed against asking rather than ruling the ask out before it is considered.
//
// Everything below looks at the option layer directly: what the engine offers Ada, and what it says it will not offer and why.
// Nothing here chooses anything, so none of it depends on the ranking.
import { describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { TOOL_RECIPE } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { produce } from '../src/sim/economy';
import { reviewIntentions } from '../src/sim/intent';
import { observe } from '../src/sim/knowledge';
import { carryCap } from '../src/sim/people';
import { perceive } from '../src/sim/perception';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { MAKING_NOTE } from '../src/sim/social';
import { makeSource } from '../src/sim/sources';
import type { Option } from '../src/sim/optutil';
import type { Activity, ActivityKind, Person, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';

interface Corner {
  w: World;
  ada: Person;
  ben: Person;
}

/**
 * Ada means to make an axe and is one stone short, with no rock she knows of; Ben is standing two tiles away with stone in his
 * hands. `benStone` is how much, `benAct` what he is visibly doing, `nearRock` whether Ada knows a rock she could work herself.
 */
function corner(seed: string, o: { benStone?: number; benAct?: ActivityKind; nearRock?: boolean; dynamics?: 'rich' | 'authored' } = {}): Corner {
  const w: World = testKit.flatWorld(settingsFor('ask-' + seed, { scene: 'natural', dynamics: o.dynamics ?? 'rich' }));
  const rng = new RNG(13);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 42.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const home = createBuilding(w, 'lean_to', 41, 40, ada.hhId);
  const hh = w.households.find((h) => h.id === ada.hhId);
  if (hh) hh.homeId = home.id;
  for (const [x, y] of [[44, 41], [45, 40], [43, 39]] as [number, number][]) observe(w, ada, makeSource(w, 'tree', x, y, 9));
  const bush = makeSource(w, 'berry_bush', 39, 41, 20);
  const rock = makeSource(w, 'rock', 38, 41, 12);
  observe(w, ada, bush);
  observe(w, ben, bush);
  observe(w, ada, home);
  if (o.nearRock) observe(w, ada, rock);
  testKit.finish(w, 'natural');
  testKit.befriend(ada, ben, 40, 40);
  ada.stats.gathered = 12;
  ada.skills.wood = 3;
  produce(w, ada.inv, carryCap(w, ada), 'wood', TOOL_RECIPE.axe.wood, 'test: given to Ada');
  produce(w, ben.inv, carryCap(w, ben), 'stone', o.benStone ?? 2, 'test: given to Ben');
  // what Ben is visibly doing: perception reads the kind of his activity and nothing else about it
  if (o.benAct) ben.activity = { kind: o.benAct, data: {} } as unknown as Activity;
  perceive(w, ada);
  reviewIntentions(generateOptions(w, ada, true));
  return { w, ada, ben };
}

const askFor = (ctx: { options: Option[] }, item: string): Option | undefined => ctx.options.find((o) => o.key.endsWith(':plan:' + item));
const refusedAsk = (ctx: { blocked: Option[] }): Option | undefined => ctx.blocked.find((o) => o.label.includes('for stone'));
const look = (w: World, p: Person) => {
  perceive(w, p);
  return generateOptions(w, p, true);
};

describe('an ask is made when the asker has reason to expect a yes', () => {
  it('somebody carrying more than one of it is asked', () => {
    const { w, ada, ben } = corner('plenty', { benStone: 2 });
    expect(ada.intentions[0].stepItem, 'the stone is what the plan lacks').toBe('stone');
    const ctx = look(w, ada);
    expect(ada.seen.find((s) => s.id === ben.id)?.plenty, 'she can see he has more than one').toContain('stone');
    const ask = askFor(ctx, 'stone');
    expect(ask, 'the ask is on offer').toBeTruthy();
    expect(ask!.parts.map((part) => part[0]).join(' | ')).toContain('more than one stone');
  });

  it('somebody with only one of it, busy with it, is not asked — and the record says why', () => {
    const { w, ada, ben } = corner('one', { benStone: 1, benAct: 'gather' });
    const ctx = look(w, ada);
    expect(ada.seen.find((s) => s.id === ben.id)?.plenty, 'one is not an armful').toBeUndefined();
    expect(askFor(ctx, 'stone'), 'no ask').toBeUndefined();
    expect(refusedAsk(ctx)?.blocked).toMatch(/only the one stone/);
  });

  it('somebody with only one of it who is idle IS asked: they are not in the middle of anything', () => {
    const { w, ada } = corner('idle', { benStone: 1 });
    const ctx = look(w, ada);
    const ask = askFor(ctx, 'stone');
    expect(ask).toBeTruthy();
    expect(ask!.parts.map((part) => part[0]).join(' | ')).toContain('not busy');
  });

  it('somebody visibly making or building something is not asked for what is in their hands', () => {
    for (const act of ['craft', 'build', 'repair', 'operate'] as ActivityKind[]) {
      const { w, ada } = corner('atwork-' + act, { benStone: 3, benAct: act });
      const ctx = look(w, ada);
      expect(askFor(ctx, 'stone'), act).toBeUndefined();
      expect(refusedAsk(ctx)?.blocked, act).toMatch(/working with what they carry/);
    }
  });

  it('somebody who has said their stone is for something they are making is not asked again while that stands', () => {
    const { w, ada, ben } = corner('making', { benStone: 3 });
    expect(askFor(look(w, ada), 'stone'), 'asked before he said so').toBeTruthy();
    // the asker's own record of an answer they were given (social.ts writes it when the refusal is 'making')
    ada.cooldowns[MAKING_NOTE + ben.id] = w.tick + 1200;
    const ctx = look(w, ada);
    expect(askFor(ctx, 'stone')).toBeUndefined();
    expect(refusedAsk(ctx)?.blocked).toMatch(/for something they are making/);
    // and once it has run out, asking is possible again
    ada.cooldowns[MAKING_NOTE + ben.id] = w.tick - 1;
    expect(askFor(look(w, ada), 'stone')).toBeTruthy();
  });

  it('a yes they could not carry is not asked for at all', () => {
    const { w, ada } = corner('full', { benStone: 3 });
    produce(w, ada.inv, carryCap(w, ada), 'wood', 20, 'test: a full pack');
    const ctx = look(w, ada);
    expect(askFor(ctx, 'stone')).toBeUndefined();
    expect(refusedAsk(ctx)?.blocked).toMatch(/no room in my pack/);
  });
});

describe('asking is weighed against fetching, not ruled out by it', () => {
  it('the ask is still offered when there is a rock she could work herself, and carries the cost of that', () => {
    const { w, ada } = corner('quick', { benStone: 2, nearRock: true });
    const ctx = look(w, ada);
    const own = ctx.options.find((o) => o.yields === 'stone' && o.kind === 'gather');
    expect(own, 'she can fetch stone herself, and quickly').toBeTruthy();
    expect(own!.eta).toBeLessThan(260);
    const ask = askFor(ctx, 'stone');
    expect(ask, 'the ask is considered all the same').toBeTruthy();
    const part = ask!.parts.find((x) => x[0].includes('fetch stone myself'));
    expect(part, 'and says what the alternative is worth').toBeTruthy();
    expect(part![1]).toBeLessThan(0);
    // Neither rules the other out any more: the two come out within a point or two of each other, so the ranking decides (and its
    // own tiebreak is larger than the gap). Without the cost of the alternative the ask would simply have won.
    expect(Math.abs(own!.util - ask!.util)).toBeLessThan(4);
    expect(ask!.util + Math.abs(part![1])).toBeGreaterThan(own!.util);
  });

  it('the ask records that it was made under that rule, so the yes rate of such asks can be read off the requests', () => {
    const { w, ada } = corner('likely', { benStone: 2 });
    const ask = askFor(look(w, ada), 'stone')!;
    const act = ask.make!()!;
    expect((act.data.conv as { planId?: number; likely?: boolean }).likely).toBe(true);
    expect((act.data.conv as { planId?: number }).planId).toBe(ada.intentions[0].id);
  });
});

describe('an authored world has none of this', () => {
  it('nobody carries a project, so nobody asks for a project', () => {
    const { w, ada } = corner('authored', { benStone: 3, dynamics: 'authored' });
    expect(ada.intentions).toHaveLength(0);
    const ctx = look(w, ada);
    expect(askFor(ctx, 'stone')).toBeUndefined();
    expect(refusedAsk(ctx)).toBeUndefined();
    // and sight itself is unchanged: an authored world records nothing about armfuls
    expect(ada.seen.every((s) => s.plenty === undefined)).toBe(true);
  });
});
