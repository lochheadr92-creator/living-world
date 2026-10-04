import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { destroyBuilding } from '../src/sim/buildings';
import { conservationReport, totalItems, foodUnits } from '../src/sim/economy';
import { MAX_APOLOGIES, SETTLED_TRUCE, decayGrievances, easeGrievance, endGrievanceOnGift, openGrievance, quarrelDamper, wantsAmends } from '../src/sim/grievance';
import { generateOptions } from '../src/sim/decision';
import { killPerson } from '../src/sim/lifecycle';
import { INVITE_COOLDOWN, cancelMeal, mealOf, previousMealOf } from '../src/sim/meals';
import { observe } from '../src/sim/knowledge';
import { relOf } from '../src/sim/relations';
import { contestLost, onGift } from '../src/sim/social';
import { makeWolf } from '../src/sim/wildlife';
import { noteConcerns, shareConcerns } from '../src/sim/welfare';
import { DAY } from '../src/sim/constants';
import type { ConvPurpose, Person, World } from '../src/sim/types';
import type { ConvData } from '../src/sim/social';
import { perceive } from '../src/sim/perception';
import { addPerson, building, done, pin, stage } from './helpers/kit';
import { run } from './helpers/util';

function converse(w: World, a: Person, b: Person, purpose: ConvPurpose, conv: ConvData = {}): void {
  const act = newActivity(w, a, { kind: 'socialize', label: `Talking to ${b.name}`, goal: 'a staged conversation', targetId: b.id, targetType: 'person', tx: b.x, ty: b.y, spotX: b.x - 1.3, spotY: b.y, utility: 100, minCommit: 4000, maxTicks: 600, data: { purpose, conv } });
  startActivity(w, a, act);
  for (let i = 0; i < 600; i++) {
    run(w, 1);
    if (a.lastInteraction && a.lastInteraction.partner === b.id && !a.convId && a.lastInteraction.tick > act.start) return;
  }
}

function friends(a: Person, b: Person, aff = 40, trust = 40): void {
  for (const [x, y] of [[a, b], [b, a]] as [Person, Person][]) {
    const r = relOf(x, y.id);
    r.affinity = aff;
    r.trust = trust;
    r.familiarity = 20;
  }
}

/** a hall by the water, a host with food and a friend or two; it is the late afternoon */
function mealScene(name: string, food: Record<string, number> = { bread: 3, fish: 3 }, guests = 2) {
  const s = stage(name);
  const host = addPerson(s, 'Hosta', 42, 24, { inv: { ...food }, traits: { sociability: 0.9, generosity: 0.9 } });
  const gs: Person[] = [];
  for (let i = 0; i < guests; i++) gs.push(addPerson(s, ['Gus', 'Gwen', 'Gil'][i], 44 + i * 1.5, 24, { hunger: 55, inv: { fruit: 2 }, traits: { sociability: 0.95 } }));
  const hall = building(s, 'hall', 48, 26, 0);
  s.w.camp = { x: 45.5, y: 25.5 };
  s.w.tick = Math.round(DAY * 0.58 - 0.3 * DAY); // late afternoon
  const w = done(s);
  observe(w, host, hall);
  for (const g of gs) friends(host, g, 45, 45);
  return { w, host, gs, hall };
}

describe('a shared meal, from invitation to the last mouthful', () => {
  it('is one interaction: invitation, acceptance, a physical table of real food, eating one serving at a time, and an ending that is recorded', () => {
    const { w, host, gs, hall } = mealScene('meal-full');
    let placed = 0;
    let returned = 0;
    w.hooks = {
      onTransfer: (t: { from: string; to: string; n: number; reason: string }) => {
        if (t.reason === 'set out for a shared meal') placed += t.n;
        if (t.reason === 'table cleared') returned += t.n;
      },
    } as never;
    converse(w, host, gs[0], 'invite', { mealPlan: { placeId: hall.id, placeName: 'the communal hall', x: 49.5, y: 29.4 } });
    const m = w.meals[0];
    expect(m, 'the invitation created a meal').toBeTruthy();
    expect(m.status).toBe('inviting');
    expect(m.invited).toContain(gs[0].id);
    expect(m.accepted).toContain(gs[0].id);
    expect(m.reserved).toBe(1);
    // the guest knows where the hall is: from the invitation if they had never seen it, and either way before they set out
    expect(gs[0].beliefs[hall.id]).toBeTruthy();
    let sawTable = false;
    for (let i = 0; i < 2500 && m.status !== 'done' && m.status !== 'cancelled'; i++) {
      run(w, 1);
      if (foodUnits(m.table) > 0) sawTable = true;
    }
    expect(m.status, m.end).toBe('done');
    expect(sawTable).toBe(true);
    expect(m.ate).toContain(host.id);
    expect(m.ate).toContain(gs[0].id);
    // every serving eaten came off the table and out of the ledger exactly once
    expect(w.ledger.reasons['-eaten at a shared meal']).toBe(m.ate.length);
    // what was not eaten went back to the host, not into thin air
    expect(foodUnits(m.table)).toBe(0);
    expect(placed - returned).toBe(m.ate.length);
    expect(placed).toBeGreaterThanOrEqual(m.ate.length);
    expect(conservationReport(w).ok).toBe(true);
    // the meal belongs to both people's records afterwards, and neither is mistaken for the other’s
    expect(previousMealOf(w, host)?.id).toBe(m.id);
    expect(mealOf(w, host)).toBeNull();
  });

  it('never promises more servings than the host has: the second guest is turned away at the table, politely and on the record', () => {
    const { w, host, gs, hall } = mealScene('meal-room', { bread: 2 }, 2);
    converse(w, host, gs[0], 'invite', { mealPlan: { placeId: hall.id, placeName: 'the communal hall', x: 49.5, y: 29.4 } });
    converse(w, host, gs[1], 'invite', { mealId: w.meals[0].id });
    const m = w.meals[0];
    expect(m.accepted).toEqual([gs[0].id]);
    expect(m.missed[gs[1].id]).toMatch(/no room at the table/);
    expect(m.reserved).toBeLessThanOrEqual(foodUnits(host.inv));
  });

  it('if the host has nothing left to put on the table when the time comes, the meal is called off with that as the reason, and the guest is released', () => {
    const { w, host, gs, hall } = mealScene('meal-nofood');
    converse(w, host, gs[0], 'invite', { mealPlan: { placeId: hall.id, placeName: 'the communal hall', x: 49.5, y: 29.4 } });
    const m = w.meals[0];
    host.inv = {}; // the food is gone (eaten, given away, spoiled)
    for (let i = 0; i < 2500 && m.status !== 'done' && m.status !== 'cancelled'; i++) run(w, 1);
    expect(m.status).toBe('cancelled');
    expect(m.end).toMatch(/food|table/);
    expect(mealOf(w, gs[0])).toBeNull(); // not left waiting for a meal that will not happen
    expect(host.cooldowns.hostMeal).toBeGreaterThan(w.tick); // and the host does not try again at once
  });

  it('a guest who never turns up is marked missed and the meal is not held for them for ever', () => {
    const { w, host, gs, hall } = mealScene('meal-noshow');
    converse(w, host, gs[0], 'invite', { mealPlan: { placeId: hall.id, placeName: 'the communal hall', x: 49.5, y: 29.4 } });
    const m = w.meals[0];
    // the guest becomes absorbed in something else for hours
    pin(gs[0]);
    for (let i = 0; i < 2500 && m.status !== 'done' && m.status !== 'cancelled'; i++) run(w, 1);
    expect(['cancelled', 'done']).toContain(m.status);
    expect(m.missed[gs[0].id]).toBeTruthy();
    expect(m.ate).not.toContain(gs[0].id);
  });

  it('a wolf by the hall, the host’s death, or the loss of the place each end it, each with its own reason; the table food is not lost', () => {
    const reasons: string[] = [];
    for (const kind of ['wolf', 'death', 'place'] as const) {
      const { w, host, gs, hall } = mealScene('meal-end-' + kind);
      converse(w, host, gs[0], 'invite', { mealPlan: { placeId: hall.id, placeName: 'the communal hall', x: 49.5, y: 29.4 } });
      const m = w.meals[0];
      for (let i = 0; i < 2500 && foodUnits(m.table) === 0 && m.status !== 'cancelled'; i++) run(w, 1);
      expect(foodUnits(m.table)).toBeGreaterThan(0);
      const total = totalItems(w);
      if (kind === 'wolf') makeWolf(w, m.x + 2, m.y);
      if (kind === 'death') killPerson(w, host, 'test');
      if (kind === 'place') destroyBuilding(w, hall, 'burned down');
      run(w, 40);
      expect(m.status).toBe('cancelled');
      reasons.push(m.end);
      expect(foodUnits(m.table)).toBe(0);
      const after = totalItems(w);
      expect(after.bread ?? 0).toBe(total.bread ?? 0);
      expect(conservationReport(w).ok).toBe(true);
    }
    expect(new Set(reasons).size).toBe(3);
  });

  it('an invitation that is turned down is not repeated: that person is not asked again for a long while', () => {
    const { w, host, gs, hall } = mealScene('meal-decline');
    gs[0].needs.energy = 30; // too worn out to go anywhere
    gs[0].traits.sociability = 0.05;
    converse(w, host, gs[0], 'invite', { mealPlan: { placeId: hall.id, placeName: 'the communal hall', x: 49.5, y: 29.4 } });
    const m = w.meals[0];
    expect(m.accepted).not.toContain(gs[0].id);
    expect(host.cooldowns['invite' + gs[0].id]).toBeGreaterThan(w.tick + INVITE_COOLDOWN * 0.8);
    cancelMeal(w, m, 'test');
    host.cooldowns.hostMeal = 0;
    const ctx = generateOptions(w, host, true);
    expect(ctx.options.some((o) => o.key === `socialize:${gs[0].id}:invite`)).toBe(false);
  });
});

describe('looking after each other', () => {
  function welfareScene(name: string) {
    const s = stage(name);
    const helper = addPerson(s, 'Hilda', 44, 25, { inv: { fruit: 6, bread: 2 }, traits: { generosity: 0.9 } });
    const kin = addPerson(s, 'Kit', 47, 25, { hh: helper.hhId, hunger: 20, inv: {} });
    const far = addPerson(s, 'Faraway', 70, 70, { hunger: 12 });
    const friend = addPerson(s, 'Fay', 60, 25, { hunger: 85, thirst: 90 });
    s.w.camp = { x: 45.5, y: 25.5 };
    const w = done(s);
    return { w, helper, kin, far, friend };
  }

  it('a worry is formed only from what was seen or told: nobody hears of the hungry person who is out of sight and out of mind', () => {
    const { w, helper, kin, far } = welfareScene('welfare-sight');
    run(w, 30);
    noteConcerns(w, helper);
    expect(helper.concerns.some((c) => c.about === kin.id)).toBe(true);
    expect(helper.concerns.some((c) => c.about === far.id)).toBe(false);
    const c = helper.concerns.find((x) => x.about === kin.id)!;
    expect(c.src).toBe('seen');
    expect(c.kind).toBe('hungry');
  });

  it('when a worry is passed on it keeps the time it was first seen and who told it', () => {
    const { w, helper, kin, friend } = welfareScene('welfare-told');
    friends(helper, kin, 70, 70);
    friends(friend, kin, 40, 40);
    run(w, 30);
    noteConcerns(w, helper);
    run(w, 90);
    // the most recent time she actually saw Kit hungry is what she passes on — not the moment she is telling it
    const sightedAt = helper.concerns.find((c) => c.about === kin.id)!.seen;
    expect(sightedAt).toBeLessThan(w.tick);
    expect(shareConcerns(w, helper, friend)).toBe(1);
    const told = friend.concerns.find((c) => c.about === kin.id)!;
    expect(told.src).toBe('told');
    expect(told.from).toBe(helper.id);
    expect(told.seen).toBe(sightedAt);
  });

  it('someone with food goes to the hungry one out of sight, and the food really changes hands; the worry is then dropped and they are not fussed over again at once', () => {
    const { w, helper, kin } = welfareScene('welfare-help');
    friends(helper, kin, 70, 70);
    // Kit has gone off round the corner; Hilda remembers seeing them hungry and roughly where they went
    kin.x = 58;
    kin.y = 28;
    kin.needs.hunger = 22;
    pin(kin);
    perceive(w, helper);
    helper.concerns.push({ about: kin.id, kind: 'hungry', seen: w.tick - 60, src: 'seen', from: helper.id, checked: -99999 });
    helper.whereabouts[kin.id] = { x: 57, y: 28, tick: w.tick - 30 };
    const ctx = generateOptions(w, helper, true);
    const visit = ctx.options.find((o) => o.kind === 'visit' && o.targetId === kin.id);
    expect(visit, 'a visit is offered').toBeTruthy();
    expect(visit!.label).toMatch(/Bring .* to Kit/);
    const hungerBefore = kin.needs.hunger;
    const foodHeld = foodUnits(helper.inv);
    const act = visit!.make!()!;
    startActivity(w, helper, act);
    for (let i = 0; i < 900 && helper.activity === act; i++) run(w, 1);
    expect(foodUnits(helper.inv)).toBeLessThan(foodHeld);
    expect(foodUnits(kin.inv) > 0 || kin.needs.hunger > hungerBefore + 5).toBe(true);
    expect(helper.concerns.some((c) => c.about === kin.id)).toBe(false);
    expect((helper.cooldowns['check' + kin.id] ?? 0) - w.tick).toBeGreaterThan(0);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('someone boxed in between three lean-tos can still be reached: the visitor finds open ground beside them instead of giving up', () => {
    const s = stage('welfare-pocket');
    const helper = addPerson(s, 'Hilda', 44, 25, { inv: { fruit: 6, bread: 2 }, traits: { generosity: 0.9 } });
    const kin = addPerson(s, 'Kit', 58.6, 25.6, { hunger: 22, inv: {} });
    // the side facing the visitor, and the two beside it, are lean-tos; the only way in is from the east
    building(s, 'lean_to', 57, 25);
    building(s, 'lean_to', 58, 24);
    building(s, 'lean_to', 58, 26);
    s.w.camp = { x: 50.5, y: 25.5 };
    const w = done(s);
    friends(helper, kin, 70, 70);
    pin(kin);
    perceive(w, helper);
    helper.concerns.push({ about: kin.id, kind: 'hungry', seen: w.tick - 60, src: 'seen', from: helper.id, checked: -99999 });
    helper.whereabouts[kin.id] = { x: 58.6, y: 25.6, tick: w.tick - 30 };
    const act = newActivity(w, helper, { kind: 'visit', label: 'Taking fruit to Kit', goal: 'test', targetId: kin.id, targetType: 'person', tx: 58.6, ty: 25.6, spotX: 57.4, spotY: 25.6, utility: 100, minCommit: 4000, maxTicks: 900, data: { about: kin.id, concern: 'hungry', items: { fruit: 3 }, since: w.tick - 60, from: 'seen' } });
    startActivity(w, helper, act);
    for (let i = 0; i < 900 && helper.activity === act; i++) run(w, 1);
    expect(helper.lastResult?.outcome, helper.lastResult?.detail).toBe('success');
    expect(foodUnits(kin.inv) > 0 || kin.needs.hunger > 22 + 5).toBe(true);
    expect(helper.concerns.some((c) => c.about === kin.id)).toBe(false);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('with nothing to give a visit to the hungry is not offered: the blocker is named instead', () => {
    const { w, helper, kin } = welfareScene('welfare-empty');
    friends(helper, kin, 70, 70);
    helper.inv = {};
    kin.x = 58;
    pin(kin);
    perceive(w, helper);
    helper.concerns.push({ about: kin.id, kind: 'hungry', seen: w.tick - 60, src: 'seen', from: helper.id, checked: -99999 });
    helper.whereabouts[kin.id] = { x: 57, y: 25, tick: w.tick - 30 };
    const ctx = generateOptions(w, helper, true);
    expect(ctx.options.some((o) => o.kind === 'visit')).toBe(false);
    expect(ctx.blocked.some((o) => o.kind === 'visit' && /nothing to spare/.test(o.blocked ?? ''))).toBe(true);
  });

  it('looking in on someone who turns out to be fine drops the worry and sets a cooldown, so healthy people are not checked on again and again', () => {
    const { w, helper, friend } = welfareScene('welfare-fine');
    friends(helper, friend, 60, 60);
    pin(friend); // Fay stays put, well fed, out of sight
    helper.concerns.push({ about: friend.id, kind: 'hungry', seen: w.tick - 100, src: 'seen', from: helper.id, checked: -99999 });
    helper.whereabouts[friend.id] = { x: friend.x, y: friend.y, tick: w.tick - 20 };
    const act = newActivity(w, helper, { kind: 'visit', label: 'Looking in', goal: 'test', targetId: friend.id, targetType: 'person', tx: friend.x, ty: friend.y, spotX: friend.x - 1.2, spotY: friend.y, utility: 100, minCommit: 4000, maxTicks: 900, data: { about: friend.id, concern: 'hungry', items: { fruit: 2 }, since: w.tick - 100, from: 'seen' } });
    startActivity(w, helper, act);
    for (let i = 0; i < 900 && helper.activity === act; i++) run(w, 1);
    expect(helper.concerns.some((c) => c.about === friend.id)).toBe(false);
    expect((helper.cooldowns['check' + friend.id] ?? 0) - w.tick).toBeGreaterThan(DAY * 0.6);
    expect(foodUnits(friend.inv)).toBe(0); // nothing was pressed on someone who did not need it
    // and with the cooldown in force no new visit is offered
    helper.concerns.push({ about: friend.id, kind: 'hungry', seen: w.tick - 10, src: 'seen', from: helper.id, checked: -99999 });
    const ctx = generateOptions(w, helper, true);
    expect(ctx.options.some((o) => o.kind === 'visit' && o.targetId === friend.id)).toBe(false);
  });

  it('a helper who is hungry or thirsty themself does not go off to look after anyone else', () => {
    const { w, helper, kin } = welfareScene('welfare-self');
    helper.concerns.push({ about: kin.id, kind: 'hungry', seen: w.tick - 50, src: 'seen', from: helper.id, checked: -99999 });
    helper.whereabouts[kin.id] = { x: kin.x + 20, y: kin.y, tick: w.tick - 20 };
    helper.needs.thirst = 22;
    const ctx = generateOptions(w, helper, true);
    expect(ctx.options.some((o) => o.kind === 'visit')).toBe(false);
  });
});

describe('quarrels, their causes, and the way back', () => {
  function pairScene(name: string) {
    const s = stage(name);
    const a = addPerson(s, 'Ana', 44, 26, { inv: { fruit: 4 } });
    const b = addPerson(s, 'Ben', 46, 26, { sex: 'm', inv: { fruit: 4 } });
    s.w.camp = { x: 45.5, y: 26.5 };
    const w = done(s);
    return { w, a, b };
  }

  it('a lost last berry is a grievance over competition — or over scarcity when the loser is going hungry — with the cause in words', () => {
    const { w, a, b } = pairScene('quarrel-cause');
    a.needs.hunger = 70;
    contestLost(w, a, b.id, { item: 'berries', x: 45, y: 26 });
    expect(relOf(a, b.id).grievance?.cause).toBe('competition');
    expect(relOf(a, b.id).grievance?.detail).toMatch(/last berries/);
    const { w: w2, a: a2, b: b2 } = pairScene('quarrel-cause-2');
    a2.needs.hunger = 20;
    contestLost(w2, a2, b2.id, { item: 'berries', x: 45, y: 26 });
    expect(relOf(a2, b2.id).grievance?.cause).toBe('scarcity');
  });

  it('an apology that works ends the grievance on both sides, is remembered as settled, and is never offered again over the same thing', () => {
    const { w, a, b } = pairScene('quarrel-peace');
    friends(a, b, 5, 30);
    b.traits.generosity = 0.95;
    openGrievance(w, a, b, 'competition', 'Ben got the last berries before me', 30);
    openGrievance(w, b, a, 'competition', 'Ben got the last berries before me', 20);
    w.tick += 400;
    expect(wantsAmends(w, a, b)).toBe(true);
    for (let k = 0; k < 4 && relOf(a, b.id).grievance; k++) {
      converse(w, a, b, 'apologize', {});
      a.cooldowns['sorry' + b.id] = 0;
      w.tick += 50;
    }
    expect(relOf(a, b.id).grievance).toBeNull();
    expect(relOf(b, a.id).grievance).toBeNull();
    expect(relOf(a, b.id).settledAt).toBeGreaterThan(0);
    expect(wantsAmends(w, a, b)).toBe(false);
    const ctx = generateOptions(w, a, true);
    expect(ctx.options.some((o) => o.key === `socialize:${b.id}:apologize`)).toBe(false);
  });

  it('apologies are bounded: after a few that are not accepted the person stops trying until something new happens', () => {
    const { w, a, b } = pairScene('quarrel-bounded');
    openGrievance(w, a, b, 'broken_promise', 'Ben never came through', 40);
    relOf(a, b.id).grievance!.apologies = MAX_APOLOGIES;
    w.tick += 1000;
    expect(wantsAmends(w, a, b)).toBe(false);
    // a fresh incident of a different kind is a fresh grievance, and the count starts again
    openGrievance(w, a, b, 'refusal', 'Ben would not help when I needed it', 30);
    expect(relOf(a, b.id).grievance!.cause).toBe('refusal');
    expect(relOf(a, b.id).grievance!.apologies).toBe(0);
  });

  it('time alone eases a grievance and eventually closes it, with no further apologising needed', () => {
    const { w, a, b } = pairScene('quarrel-fades');
    openGrievance(w, a, b, 'competition', 'x', 30);
    for (let i = 0; i < 40 && relOf(a, b.id).grievance; i++) {
      w.tick += 240;
      decayGrievances(w, a);
    }
    expect(relOf(a, b.id).grievance).toBeNull();
    expect(relOf(a, b.id).settledAt).toBeGreaterThan(0);
  });

  it('a gift eases a grievance in proportion to what it meant, and a large enough one closes it', () => {
    const { w, a, b } = pairScene('quarrel-gift');
    openGrievance(w, a, b, 'refusal', 'would not help', 18);
    const w0 = relOf(a, b.id).grievance!.weight;
    endGrievanceOnGift(w, b, a, 0.1);
    expect(relOf(a, b.id).grievance!.weight).toBeLessThan(w0);
    endGrievanceOnGift(w, b, a, 1);
    expect(relOf(a, b.id).grievance).toBeNull();
    // the gift in the real engine does the same
    openGrievance(w, a, b, 'refusal', 'again', 9);
    onGift(w, b, a, { fruit: 2 }, 'offer');
    expect(relOf(a, b.id).grievance).toBeNull();
  });

  it('having just made peace, the same pair is much less likely to fall out again over the same sort of thing', () => {
    const { w, a, b } = pairScene('quarrel-truce');
    openGrievance(w, a, b, 'competition', 'x', 10);
    easeGrievance(w, a, b, 50, 'a talk');
    expect(relOf(a, b.id).grievance).toBeNull();
    expect(quarrelDamper(w, a, b)).toBeLessThan(0.5);
    w.tick += SETTLED_TRUCE + 10;
    expect(quarrelDamper(w, a, b)).toBe(1);
  });
});
