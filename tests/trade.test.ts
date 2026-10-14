// A trade: the one kind of work somebody comes to think of as theirs (src/sim/trade.ts). Rich worlds only.
//
// What is held here: a trade is chosen from the person's own skills and what they can see other people doing, and from nothing
// else; it tilts the matching work by a bounded amount and never overrides a need; it can change and it can be given up; an
// authored world has none; the lab's switch removes it and puts it back; and a save carries it.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import { TRADE_NUDGE, TRADE_REVIEW, reviewTrade, setTrades, tradeNudge, tradeWord, tradesOn, visibleWork, workOfOption } from '../src/sim/trade';
import type { Activity, Person, SkillKey, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { settingsFor } from './helpers/util';

const SKILLS: SkillKey[] = ['forage', 'fish', 'wood', 'stone', 'build', 'farm', 'craft', 'carpentry', 'kiln', 'smith', 'bake'];

/** a flat corner with one person who is plainly better at one thing than at anything else, and trees and rocks to work */
function corner(seed: string, best: SkillKey, o: { dynamics?: 'rich' | 'authored'; others?: { at?: SkillKey; n: number } } = {}) {
  const w: World = testKit.flatWorld(settingsFor('trade-' + seed, { scene: 'natural', dynamics: o.dynamics ?? 'rich' }));
  const rng = new RNG(7);
  const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  for (const k of SKILLS) p.skills[k] = 1;
  p.skills[best] = 1.6;
  const tree = makeSource(w, 'tree', 42, 40, 9);
  const rock = makeSource(w, 'rock', 38, 40, 9);
  const bush = makeSource(w, 'berry_bush', 40, 42, 20);
  const others: Person[] = [];
  for (let i = 0; i < (o.others?.n ?? 0); i++) {
    const q = testKit.addPerson(w, rng, { name: 'Other' + i, x: 41.5 + i * 0.6, y: 41.5, hunger: 92, thirst: 92, energy: 92 });
    // what they are visibly at: perception reads the kind of the activity and what it is aimed at, nothing else
    if (o.others?.at) q.activity = { kind: 'gather', targetId: 0, data: { stype: o.others.at === 'wood' ? 'tree' : o.others.at === 'stone' ? 'rock' : 'berry_bush' } } as unknown as Activity;
    others.push(q);
  }
  for (const e of [tree, rock, bush]) observe(w, p, e);
  testKit.finish(w, 'natural');
  perceive(w, p);
  return { w, p, others, tree, rock };
}

const review = (w: World, p: Person) => {
  p.cooldowns.trade = 0;
  perceive(w, p);
  reviewTrade(generateOptions(w, p, true));
};

describe('settling on a trade', () => {
  it('is chosen from their own skills: what they are comparatively best at', () => {
    for (const best of ['wood', 'stone', 'forage', 'smith'] as SkillKey[]) {
      const { w, p } = corner('own-' + best, best);
      review(w, p);
      expect(p.trade?.key, best).toBe(best);
      expect(p.trade?.since).toBe(w.tick);
      expect(p.trade?.why).toBeTruthy();
    }
  });

  it('is not taken up at all by somebody who is no better at one thing than another', () => {
    const { w, p } = corner('flat', 'wood');
    for (const k of SKILLS) p.skills[k] = 1;
    review(w, p);
    expect(p.trade).toBeNull();
  });

  it('turns away from what the people in sight are already doing, and that is the only way sight enters it', () => {
    // Ada is best at wood; four people in front of her are visibly chopping. Her own skills have not changed, so if the trade
    // moves it is because of what she can see - and what she can see is only ever `p.seen`.
    const alone = corner('crowd-none', 'wood');
    review(alone.w, alone.p);
    expect(alone.p.trade?.key).toBe('wood');

    const crowded = corner('crowd-wood', 'wood', { others: { at: 'wood', n: 4 } });
    expect(crowded.p.seen.filter((s) => s.work === 'wood').length, 'she can see them chopping').toBeGreaterThanOrEqual(3);
    review(crowded.w, crowded.p);
    expect(crowded.p.trade?.key, 'wood is taken; she picks something else or nothing').not.toBe('wood');
  });

  it('is reconsidered only now and then, and stands in between', () => {
    const { w, p } = corner('sticky', 'wood');
    review(w, p);
    const first = p.trade!;
    expect(p.cooldowns.trade).toBe(w.tick + TRADE_REVIEW);
    // a review before its time changes nothing, even with everyone in sight at the same work
    p.skills.stone = 1.9;
    reviewTrade(generateOptions(w, p, true));
    expect(p.trade).toBe(first);
  });

  it('is given up when it has paid them badly over several outings', () => {
    const { w, p } = corner('poor', 'wood');
    review(w, p);
    expect(p.trade?.key).toBe('wood');
    // their own estimate of what that work has paid them (learning.ts), and nothing else, ends it
    p.payoff = { wood: { n: 5, r: 0.4 } };
    p.skills.wood = 1; // and it is no longer what they are best at either
    p.skills.stone = 1.6;
    review(w, p);
    expect(p.trade?.key).toBe('stone');
  });
});

describe('what a trade does, and what it may not do', () => {
  it('tilts the work that IS the trade, by a bounded amount, and nothing else at all', () => {
    const { w, p } = corner('tilt', 'forage');
    review(w, p);
    expect(p.trade?.key).toBe('forage');
    const ctx = generateOptions(w, p, true);
    const picking = ctx.options.find((o) => o.kind === 'gather' && workOfOption(p, o) === 'forage');
    expect(picking, 'picking berries is on offer').toBeTruthy();
    expect(tradeNudge(w, p, picking!)).toBe(TRADE_NUDGE);
    expect(TRADE_NUDGE).toBeLessThanOrEqual(6);
    // every option that is not their trade is untouched
    for (const o of ctx.options) if (workOfOption(p, o) !== 'forage') expect(tradeNudge(w, p, o), o.label).toBe(0);
    // and the tilt is applied where the ranking is made, never in the option's own utility
    const util = picking!.util;
    p.trade = null;
    expect(generateOptions(w, p, true).options.find((o) => o.key === picking!.key)!.util).toBe(util);
  });

  it('never overrides a need: with a need critical, the ranking comes out the same with the trade and without it', () => {
    const { w, p } = corner('need', 'forage');
    review(w, p);
    p.needs.thirst = 8;
    const withTrade = rankOptions(generateOptions(w, p, true)).map((o) => o.key);
    setTrades(false);
    const without = rankOptions(generateOptions(w, p, true)).map((o) => o.key);
    setTrades(true);
    expect(withTrade[0], 'what a critically thirsty person does is not a matter of trade').toBe(without[0]);
    expect(rankOptions(generateOptions(w, p, true))[0].need).toBe('thirst');
  });

  it('says in the decision record that the trade was part of why', () => {
    const { w, p } = corner('record', 'forage');
    review(w, p);
    p.needs.hunger = 35; // so that the berries are what she goes for, and the record is of that choice
    for (let i = 0; i < 200 && !(p.lastDecision?.chosen?.label ?? '').includes('berr'); i++) stepWorld(w);
    expect(p.lastDecision?.chosen?.label).toMatch(/berr/i);
    expect(p.lastDecision?.because, p.lastDecision?.chosen?.label).toContain(`${tradeWord('forage')} is my trade`);
  });
});

describe('what a watcher can see of somebody else\'s work', () => {
  it('is the kind of work, read off their own activity, and only in a rich world', () => {
    const { w, p, others } = corner('sight', 'wood', { others: { at: 'stone', n: 1 } });
    expect(visibleWork(w, others[0])).toBe('stone');
    expect(p.seen.find((s) => s.id === others[0].id)?.work).toBe('stone');
    const idle = corner('sight-idle', 'wood', { others: { n: 1 } });
    expect(visibleWork(idle.w, idle.others[0])).toBeNull();
    expect(idle.p.seen.find((s) => s.id === idle.others[0].id)?.work).toBeUndefined();
    const authored = corner('sight-authored', 'wood', { dynamics: 'authored', others: { at: 'stone', n: 1 } });
    expect(authored.p.seen.find((s) => s.id === authored.others[0].id)?.work, 'an authored world sees what it always saw').toBeUndefined();
  });
});

describe('an authored world, the lab switch, the save and the fingerprint', () => {
  it('an authored world has no trades, however long it runs', () => {
    const { w, p } = corner('authored', 'wood', { dynamics: 'authored' });
    review(w, p);
    expect(p.trade).toBeNull();
    for (let i = 0; i < 400; i++) stepWorld(w);
    expect(w.persons.every((q) => q.trade === null)).toBe(true);
  });

  it('rich-no-trades removes only the trade, and restores it', () => {
    const iv = parseIntervention('rich-no-trades');
    expect(iv.summary).toMatch(/trade/);
    const restore = iv.install!();
    expect(tradesOn()).toBe(false);
    const { w, p } = corner('switch', 'wood');
    review(w, p);
    expect(p.trade).toBeNull();
    restore();
    expect(tradesOn()).toBe(true);
    review(w, p);
    expect(p.trade?.key).toBe('wood');
    setTrades(true);
  });

  it('is saved with the person and told apart in the fingerprint', () => {
    const { w, p } = corner('save', 'wood');
    review(w, p);
    const before = hashWorld(w);
    const back = deserializeWorld(serializeWorld(w));
    expect(back.byId.get(p.id)).toMatchObject({ trade: p.trade });
    expect(hashWorld(back)).toBe(before);
    // and a world where the same person has settled on something else is a different world
    p.trade = { key: 'stone', since: p.trade!.since, why: p.trade!.why };
    expect(hashWorld(w)).not.toBe(before);
  });

  it('a save from before trades existed means nobody had one', () => {
    const { w, p } = corner('old-save', 'wood');
    review(w, p);
    const json = JSON.parse(serializeWorld(w)) as { world: { persons: { __cols?: string[]; d?: Record<string, unknown[]>; } } };
    const persons = json.world.persons as { __cols?: string[]; d?: Record<string, unknown[]> } & Record<string, unknown>;
    if (Array.isArray(persons)) for (const q of persons) delete (q as Record<string, unknown>).trade;
    else if (persons.__cols && persons.d) {
      persons.__cols = persons.__cols.filter((c) => c !== 'trade');
      delete persons.d.trade;
    }
    const old = deserializeWorld(JSON.stringify(json));
    expect(old.persons.every((q) => q.trade === null)).toBe(true);
  });
});
