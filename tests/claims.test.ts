import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { newCart } from '../src/sim/carts';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { addEarmark, facilitySnapshot, facilityTick, noteWithdraw, startJob, takeableUnits, usableUnits, withdrawAllowance, workJob } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { relOf } from '../src/sim/relations';
import { toolReport } from '../src/sim/toolreg';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { addPerson, building, done, give, site, stage } from './helpers/kit';
import { run } from './helpers/util';

/**
 * Goods made at a workshop are held for whoever ordered them — and, when they were ordered for a building site, for that site.
 * These tests keep the rule honest in the places it used to leak: people walking to a shelf for goods they could not take, and a
 * claim "for the granary" that nobody delivering to the granary was allowed to honour.
 */
const NOW = 1000;
const claim = (item: 'planks' | 'bricks', n: number, owner: number, forSite = 0, until = NOW + 500) => ({ item, n, owner, until, site: forSite });

describe('what a person can count on from a shelf with claims on it (the shared arithmetic)', () => {
  const siteOf = (c: { site: number }) => c.site;
  it('is everything when nobody has a claim and the stock is open to them, and nothing when it is not', () => {
    expect(takeableUnits(5, 'planks', [], siteOf, NOW, 1, true, 0)).toBe(5);
    expect(takeableUnits(5, 'planks', [], siteOf, NOW, 1, false, 0)).toBe(0);
  });
  it('leaves out what is held for somebody else, and counts what is held for them', () => {
    const cs = [claim('planks', 2, 7), claim('planks', 1, 1)];
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 1, true, 0)).toBe(1 + 2); // theirs, and the two nobody claimed
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 2, true, 0)).toBe(2); // somebody else: only the unclaimed two
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 1, false, 0)).toBe(1); // a friend of the owners: only their own
  });
  it('lets someone bringing goods to the very site they are held for take them, and no other site’s', () => {
    const cs = [claim('planks', 2, 7, 90), claim('planks', 1, 8, 91)];
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 2, true, 90)).toBe(2 + 2); // two unclaimed, two held for site 90
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 2, true, 91)).toBe(2 + 1);
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 2, true, 92)).toBe(2); // another project: none of the claims
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 2, false, 90)).toBe(2); // not open to them: only the claim for the site
  });
  it('ignores claims that have lapsed, other items, and never promises more than is on the shelf', () => {
    const cs = [claim('planks', 4, 7, 90, NOW - 1), claim('bricks', 3, 7, 90)];
    expect(takeableUnits(5, 'planks', cs, siteOf, NOW, 2, true, 0)).toBe(5);
    expect(takeableUnits(2, 'planks', [claim('planks', 9, 7, 90)], siteOf, NOW, 2, true, 90)).toBe(2);
  });
});

function yardScene(name: string) {
  const s = stage(name);
  const vik = addPerson(s, 'Vik', 40, 44);
  const kaia = addPerson(s, 'Kaia', 44, 44);
  const yard = building(s, 'timber_yard', 50, 50, 0, { planks: 3 }); // a communal yard
  const granary = site(s, 'granary', 46, 36, 0, vik.id);
  const hall = site(s, 'hall', 58, 36, 0, vik.id);
  const w = done(s);
  // Vik ordered two planks for the granary; they are waiting for him
  addEarmark(w, yard, { kind: 'out', item: 'planks', n: 2, owner: vik.id, reason: 'for the shared granary', destSite: granary.id });
  return { w, vik, kaia, yard, granary, hall };
}

describe('claims on a workshop’s stock', () => {
  it('hold against everyone except the claim holder — and whoever is taking the goods to the site they were ordered for', () => {
    const { w, vik, kaia, yard, granary, hall } = yardScene('claims-rule');
    expect(withdrawAllowance(w, yard, kaia, 'planks', 3)).toBe(1); // the one plank nobody has claimed
    expect(withdrawAllowance(w, yard, kaia, 'planks', 3, hall.id)).toBe(1); // a different project does not get Vik's planks
    expect(withdrawAllowance(w, yard, kaia, 'planks', 3, granary.id)).toBe(3); // bringing them to the granary: that is what they were held for
    expect(withdrawAllowance(w, yard, vik, 'planks', 3)).toBe(3); // his two and the free one
    expect(usableUnits(w, yard, kaia, 'planks')).toBe(1);
    expect(usableUnits(w, yard, kaia, 'planks', granary.id)).toBe(3);
  });

  it('lapse after a day and a half: then the goods are the workplace’s own stock again', () => {
    const { w, kaia, yard, granary } = yardScene('claims-lapse');
    expect(withdrawAllowance(w, yard, kaia, 'planks', 3)).toBe(1);
    w.tick += DAY * 2;
    expect(withdrawAllowance(w, yard, kaia, 'planks', 3)).toBe(3);
    expect(withdrawAllowance(w, yard, kaia, 'planks', 3, granary.id)).toBe(3);
  });

  it('a person who walks to the yard for the granary comes away with the planks held for it, and the claim is used up with them', () => {
    const { w, vik, kaia, yard, granary } = yardScene('claims-withdraw');
    const act = newActivity(w, kaia, { kind: 'withdraw', label: 'Collecting 3 planks', goal: 'for the shared granary', targetId: yard.id, targetType: 'building', tx: yard.x, ty: yard.y, spotX: 50.5, spotY: 52.5, utility: 50, minCommit: 30, maxTicks: 700, data: { items: { planks: 3 }, forSite: granary.id } });
    startActivity(w, kaia, act);
    run(w, 400);
    expect(kaia.inv.planks).toBe(3);
    expect(yard.store.items.planks ?? 0).toBe(0);
    expect(yard.ops!.earmarks.filter((e) => e.owner === vik.id && e.n > 0)).toEqual([]); // Vik’s claim went with the planks
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });

  it('the same walk for some other purpose gets only the plank nobody had claimed, and the claim is untouched', () => {
    const { w, vik, kaia, yard } = yardScene('claims-other-purpose');
    const act = newActivity(w, kaia, { kind: 'withdraw', label: 'Collecting 3 planks', goal: 'for a fence', targetId: yard.id, targetType: 'building', tx: yard.x, ty: yard.y, spotX: 50.5, spotY: 52.5, utility: 50, minCommit: 30, maxTicks: 700, data: { items: { planks: 3 } } });
    startActivity(w, kaia, act);
    run(w, 400);
    expect(kaia.inv.planks).toBe(1);
    expect(yard.store.items.planks).toBe(2);
    expect(yard.ops!.earmarks.find((e) => e.owner === vik.id)?.n).toBe(2);
  });

  it('taking claimed goods to their site comes out of the claim, owner’s own units first', () => {
    const { w, vik, kaia, yard, granary } = yardScene('claims-order');
    addEarmark(w, yard, { kind: 'out', item: 'planks', n: 1, owner: kaia.id, reason: 'her own order' });
    yard.store.items.planks = 4; // three claimed for others/herself plus one free
    noteWithdraw(w, yard, kaia, 'planks', 2, granary.id);
    yard.store.items.planks = 2;
    // her own claim of one was used first, then one of Vik’s two
    expect(yard.ops!.earmarks.find((e) => e.owner === kaia.id)).toBeUndefined();
    expect(yard.ops!.earmarks.find((e) => e.owner === vik.id)?.n).toBe(1);
  });

  it('claims for different sites are kept apart, even for the same person and the same goods', () => {
    const { w, vik, yard, granary, hall } = yardScene('claims-apart');
    addEarmark(w, yard, { kind: 'out', item: 'planks', n: 1, owner: vik.id, reason: 'for the hall', destSite: hall.id });
    const mine = yard.ops!.earmarks.filter((e) => e.owner === vik.id);
    expect(mine.map((e) => [e.destSite, e.n]).sort()).toEqual([[granary.id, 2], [hall.id, 1]].sort());
  });

  it('a batch ordered for a site is held for that site when it finishes', () => {
    const s = stage('claims-batch');
    const vik = addPerson(s, 'Vik', 44, 44, { traits: { diligence: 0.9 } });
    const yard = building(s, 'timber_yard', 50, 50, 0, { wood: 3 });
    const granary = site(s, 'granary', 46, 36, 0, vik.id);
    give(s.w, vik, 'axe');
    const w = done(s);
    expect(startJob(w, yard, vik, RECIPE_BY_ID.hew_planks, vik.id, 'for the shared granary', granary.id)).toBeNull();
    for (let i = 0; i < 1500 && yard.ops!.job; i++) {
      w.tick++;
      if (yard.ops!.job!.phase === 'work') workJob(w, yard, vik);
      else facilityTick(w, yard);
    }
    const mark = yard.ops!.earmarks.find((e) => e.item === 'planks');
    expect(mark?.owner).toBe(vik.id);
    expect(mark?.destSite).toBe(granary.id);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('what people believe about a shelf with claims on it', () => {
  it('a belief records who holds claims, and a belief from before the claim existed records none', () => {
    const { w, vik, kaia, yard, granary } = yardScene('claims-belief');
    const snap = facilitySnapshot(w, yard)!;
    expect(snap.claims).toEqual([{ item: 'planks', n: 2, owner: vik.id, until: expect.any(Number), site: granary.id }]);
    observe(w, kaia, yard);
    expect(kaia.beliefs[yard.id].ops!.claims?.length).toBe(1);
  });

  it('nobody is sent to collect goods that are held for another project; whoever is supplying that project is', () => {
    const { w, kaia, yard, granary, hall } = yardScene('claims-planner');
    observe(w, kaia, yard);
    observe(w, kaia, granary);
    observe(w, kaia, hall);
    const picks = (ctx: ReturnType<typeof generateOptions>) =>
      ctx.options
        .filter((o) => o.kind === 'withdraw' && o.targetId === yard.id && o.make)
        .map((o) => o.make!()!)
        .filter(Boolean)
        .map((a) => ({ planks: (a.data.items as Record<string, number>).planks ?? 0, forSite: (a.data.forSite as number | undefined) ?? 0 }));
    const got = picks(generateOptions(w, kaia));
    // she knows two projects that want planks: for the granary she may take all three, for the hall only the unclaimed one
    expect(got.find((g) => g.forSite === granary.id)?.planks).toBe(3);
    const hallOnly = got.find((g) => g.forSite === hall.id);
    if (hallOnly) expect(hallOnly.planks).toBe(1);
  });

  it('a friend of the owners, who may work at a private workshop but not carry its stock away, is no longer sent to collect it', () => {
    const s = stage('claims-friend');
    const owner = addPerson(s, 'Owen', 40, 44);
    const friend = addPerson(s, 'Fay', 44, 44);
    const yard = building(s, 'timber_yard', 50, 50, owner.hhId, { planks: 3 });
    const granary = site(s, 'granary', 46, 36, 0, owner.id);
    relOf(friend, owner.id).affinity = 20;
    relOf(owner, friend.id).affinity = 12;
    const w = done(s);
    observe(w, friend, yard);
    observe(w, friend, granary);
    expect(withdrawAllowance(w, yard, friend, 'planks', 3)).toBe(0); // the rule, as before
    const trips = generateOptions(w, friend).options.filter((o) => o.kind === 'withdraw' && o.targetId === yard.id);
    expect(trips).toEqual([]); // the plan agrees with the rule
  });

  it('old beliefs and old saves, which know of no claims, still work', () => {
    const { w, kaia, yard, granary } = yardScene('claims-old');
    observe(w, kaia, yard);
    observe(w, kaia, granary);
    delete kaia.beliefs[yard.id].ops!.claims; // a belief saved before claims were recorded
    expect(() => generateOptions(w, kaia)).not.toThrow();
    const back = deserializeWorld(serializeWorld(w));
    const mark = back.buildings.find((b) => b.id === yard.id)!.ops!.earmarks[0];
    expect(mark.destSite).toBe(granary.id);
  });
});

describe('carrying claimed goods with a handcart', () => {
  it('a cart loaded at the yard for a site may carry the goods held for that site', () => {
    const { w, kaia, yard, granary } = yardScene('claims-cart');
    const cart = newCart(w, 46.5, 52.5, kaia.hhId);
    observe(w, kaia, yard);
    observe(w, kaia, granary);
    observe(w, kaia, cart);
    const act = newActivity(w, kaia, { kind: 'cart_haul', label: 'Hauling', goal: 'test', targetId: cart.id, targetType: 'cart', tx: cart.x, ty: cart.y, spotX: cart.x, spotY: cart.y, utility: 100, minCommit: 4000, maxTicks: 3000, data: { cartId: cart.id, fromId: yard.id, toId: granary.id, items: { planks: 3 }, leg: 0 } });
    startActivity(w, kaia, act);
    run(w, 2500);
    // all three reached the site (someone may already have built a plank into it)
    expect((granary.delivered.planks ?? 0) + (granary.used.planks ?? 0)).toBe(3);
    expect(yard.store.items.planks ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
  });
});
