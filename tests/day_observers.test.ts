// Contract tests for the three day observers landed in stage 1c of the plan of 17 November 2026
// (scripts/observers/day_shape.ts, trip_shape.ts, outdoor_company.ts). Each is read only: a world watched by all three must stay
// byte-identical to an unwatched twin, and each observer's own tallies must add up.
import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { DayShape } from '../scripts/observers/day_shape';
import { TripShape, storeLook } from '../scripts/observers/trip_shape';
import { ageYears } from '../src/sim/people';
import { AGE_CHILD, TICKS_PER_YEAR } from '../src/sim/constants';
import { setGatherDiagnostics } from '../src/sim/gather_diagnostics';
import { newActivity } from '../src/sim/activities';
import { WithdrawCheck } from '../scripts/observers/withdraw_check';
import { OutdoorCompany, DAY_PARTS } from '../scripts/observers/outdoor_company';

const world = (seed: string) => createWorld(currentWorldSettings('normal', seed, { immigration: false }));

it('counts a same-tick withdrawal ending without inventing sampled stock', () => {
  const w = world('river'), p = w.persons[0], observer = new WithdrawCheck();
  observer.attach(w);
  const a = newActivity(w,p,{kind:'withdraw',label:'Take',goal:'take',targetId:0,targetType:'building',tx:p.x,ty:p.y,spotX:p.x,spotY:p.y,data:{items:{wood:1}}});
  w.hooks!.onActivityStart!(p,a);
  a.phase='work';
  w.hooks!.onActivityEnd!(p,a,'failed','the cellar doorway is inaccessible');
  const report = observer.report(), rows = observer.rows();
  expect(report.counts.endedWithoutBeingSeen).toBe(0);
  expect(rows).toHaveLength(1);
  expect(rows[0].result).toBe('took_none_other');
  expect(rows[0].truthArr).toBeNull();
  expect(rows[0].truthLastWork).toBeNull();
});

it('chains withdrawal hooks, does not double count, and keeps unsampled stock unknown', () => {
  const w = world('river'), p = w.persons[0], calls: string[] = [];
  w.hooks = { onActivityStart: () => calls.push('start'), onActivityEnd: () => calls.push('end') };
  const prior = w.hooks, observer = new WithdrawCheck(), detach = observer.attach(w);
  const a = newActivity(w,p,{kind:'withdraw',label:'Take',goal:'take',targetId:0,targetType:'building',tx:p.x,ty:p.y,spotX:p.x,spotY:p.y,data:{items:{wood:1}}});
  w.hooks!.onActivityStart!(p,a);
  p.activity = a; observer.sampleTick(w);
  a.phase = 'work'; w.hooks!.onActivityEnd!(p,a,'failed','nothing to take');
  expect(calls).toEqual(['start', 'end']);
  expect(observer.rows()).toHaveLength(1);
  expect(observer.rows()[0].why).toBe('unobserved');
  detach(); expect(w.hooks).toBe(prior);
});

it('records a withdrawal already active when observation begins', () => {
  const w = world('river'), p = w.persons[0], observer = new WithdrawCheck();
  const a = newActivity(w,p,{kind:'withdraw',label:'Take',goal:'take',targetId:0,targetType:'building',tx:p.x,ty:p.y,spotX:p.x,spotY:p.y,data:{items:{wood:1}}});
  p.activity = a; observer.attach(w); observer.sampleTick(w);
  w.hooks!.onActivityEnd!(p,a,'failed','nothing to take');
  expect(observer.rows()).toHaveLength(1);
  expect(observer.report().counts.endedWithoutBeingSeen).toBe(0);
});

it('attributes walking ticks to age at each tick when a twelfth birthday occurs mid-walk', () => {
  const w = world('river'), p = w.persons[0], trip = new TripShape();
  for (const person of w.persons) person.activity = null;
  p.birthTick = w.tick - AGE_CHILD * TICKS_PER_YEAR + 1;
  p.activity = newActivity(w,p,{kind:'wander',label:'Walk',goal:'walk',tx:p.x+3,ty:p.y,spotX:p.x+3,spotY:p.y});
  p.activity.phase='travel';
  trip.sampleTick(w); w.tick++; trip.sampleTick(w); trip.finish(w);
  const r = trip.report();
  expect(r.selfChecks.tripTicksByStageEqualOwnCounts).toBe(true);
  expect(r.counts.byStage.under_12.walkingTicks).toBe(1);
  expect(r.counts.byStage['12_and_over'].walkingTicks).toBe(1);
  expect(trip.tripRows()[0].walkingTicksByStage).toEqual({ under_12: 1, '12_and_over': 1 });
});

it('leaves a watched world byte-identical to an unwatched twin, on three seeds', () => {
  for (const seed of ['river', 'aspen', 'birch']) {
    const w = world(seed);
    const twin = deserializeWorld(serializeWorld(w));
    const day = new DayShape(), trip = new TripShape(), oc = new OutdoorCompany();
    const detach = trip.attach(w);
    for (let n = 0; n < 360; n++) {
      day.sampleTick(w); trip.sampleTick(w); oc.sampleTick(w);
      stepWorld(w); stepWorld(twin);
    }
    trip.finish(w);
    detach();
    expect(serializeWorld(w), seed).toBe(serializeWorld(twin));
    expect(day.report().sampledTicks, seed).toBe(360);
  }
}, 120000);

it('DayShape and TripShape: every self check in their own reports holds after 600 ticks', () => {
  const w = world('river');
  const day = new DayShape(), trip = new TripShape();
  const detach = trip.attach(w);
  for (let n = 0; n < 600; n++) { day.sampleTick(w); trip.sampleTick(w); stepWorld(w); }
  trip.finish(w);
  detach();
  const d: any = day.report(), t: any = trip.report();
  for (const [k, v] of Object.entries(d.selfChecks)) expect(v, 'DayShape ' + k).toBe(true);
  for (const [k, v] of Object.entries(t.selfChecks)) expect(v, 'TripShape ' + k).toBe(true);
  expect(d.walking.travelTicks).toBe(t.counts.walkingTicksAll);
  expect(d.hungryTime.hungryWakingTicks).toBeLessThanOrEqual(d.hungryTime.wakingTicks);
  expect(t.counts.walksAll).toBeGreaterThan(0);
  expect(trip.tripRows().length).toBe(t.counts.walksAll);
}, 60000);

it('TripShape snapshots tiny-gather pack claims without changing the world', () => {
  const w = world('aspen');
  const twin = deserializeWorld(serializeWorld(w));
  const trip = new TripShape();
  setGatherDiagnostics(true);
  const detach = trip.attach(w);
  for (let n = 0; n < 2400; n++) { trip.sampleTick(w); stepWorld(w); stepWorld(twin); }
  trip.finish(w);
  detach();
  setGatherDiagnostics(false);
  const rows = trip.tripRows().filter((r) => r.tinyGatherPackAudit !== null);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((r) => r.tinyGatherPackAudit!.wantedUnits !== null)).toBe(true);
  for (const row of rows) {
    const audit = row.tinyGatherPackAudit!;
    for (const item of Object.values(audit.items)) {
      expect(item.needed + item.reserved + item.errand + item.spare).toBe(item.carried);
    }
  }
  expect(serializeWorld(w)).toBe(serializeWorld(twin));
}, 120000);

it('storeLook reads a store against what a person believes, and changes nothing', () => {
  const w = world('river');
  for (let n = 0; n < 1200; n++) stepWorld(w);
  const person = w.persons.find((p) => p.alive && ageYears(w, p) >= AGE_CHILD);
  expect(person).toBeDefined();
  const stocked = [...w.byId.values()].flatMap((e) => (e.ent === 'building' && Object.values(e.store.items).some((n) => (n ?? 0) > 0) ? [e] : []));
  expect(stocked.length).toBeGreaterThan(0);
  const b = stocked[0];
  const kind = Object.keys(b.store.items).find((k) => ((b.store.items as Record<string, number>)[k] ?? 0) > 0)!;
  const have = (b.store.items as Record<string, number>)[kind];
  const before = serializeWorld(w);
  const look = storeLook(w, person!, b.id, { [kind]: 2 });
  expect(look.container).toBe('building');
  expect(look.buildingType).toBe(b.type);
  expect(look.wantedUnits).toBe(2);
  expect(look.trueUnits).toBe(have);
  expect(look.allowedUnits).not.toBeNull();
  expect(look.allowedUnits!).toBeGreaterThanOrEqual(0);
  expect(look.allowedUnits!).toBeLessThanOrEqual(Math.min(2, have));
  const belief = person!.beliefs[b.id];
  expect(look.hasBelief).toBe(belief !== undefined);
  if (belief) { expect(look.beliefSeen).toBe(belief.seen); expect(look.beliefAge).toBe(w.tick - belief.seen); }
  else { expect(look.beliefSeen).toBeNull(); expect(look.beliefAge).toBeNull(); expect(look.beliefUnits).toBe(0); }
  const gone = storeLook(w, person!, -1, { [kind]: 2 });
  expect(gone.container).toBe('gone');
  expect(gone.trueUnits).toBe(0);
  expect(gone.allowedUnits).toBeNull();
  expect(serializeWorld(w)).toBe(before);
}, 60000);

it('OutdoorCompany: the parts of the day add up and each count is inside the one before it', () => {
  const w = world('river');
  const oc = new OutdoorCompany();
  for (let n = 0; n < 600; n++) { oc.sampleTick(w); stepWorld(w); }
  const r: any = oc.report();
  expect(r.ticks).toBe(600);
  const all = r.counts.all;
  expect(DAY_PARTS.reduce((a, p) => a + r.counts[p].waking, 0)).toBe(all.waking);
  for (const key of [...DAY_PARTS, 'all'] as const) {
    const c = r.counts[key];
    expect(c.outdoors, key).toBeLessThanOrEqual(c.waking);
    expect(c.company, key).toBeLessThanOrEqual(c.outdoors);
    expect(c.companyVisible, key).toBeLessThanOrEqual(c.company);
    expect(c.hub, key).toBeLessThanOrEqual(c.company);
    expect(c.hubVisible, key).toBeLessThanOrEqual(c.hub);
  }
  expect(all.waking).toBeGreaterThan(0);
  expect(r.shares.all.company).toBeGreaterThanOrEqual(0);
  expect(r.shares.all.company).toBeLessThanOrEqual(1);
}, 60000);
import { newCart } from '../src/sim/carts';
import { transfer } from '../src/sim/economy';
it('records observed cart transfers against the last observed cart walk and chains the transfer hook', () => {
  const w = world('river'), p = w.persons[0], cart = newCart(w,p.x,p.y,p.hhId), trip = new TripShape(), calls: string[] = [];
  cart.puller=p.id; p.cartId=cart.id;
  const a = newActivity(w,p,{kind:'cart_haul',label:'Haul',goal:'haul',tx:p.x+3,ty:p.y,spotX:p.x+3,spotY:p.y,data:{cartId:cart.id}});
  p.activity=a; a.phase='travel'; w.hooks={onTransfer:i=>calls.push(i.reason)};
  const detach=trip.attach(w); a.phase='work';
  const source: {stone?:number} = {stone:4};
  expect(transfer(w,source,cart.load,99,'stone',4,'building:123',`cart:${cart.id}`,'load')).toBe(4);
  a.phase='travel'; trip.sampleTick(w);
  a.phase='work'; const delivered: {stone?:number} = {};
  expect(transfer(w,cart.load,delivered,99,'stone',4,`cart:${cart.id}`,'site:123','delivery')).toBe(4);
  expect(delivered.stone).toBe(4);
  trip.finish(w); detach(); const row=trip.tripRows().find(x=>x.actId===a.id)!;
  expect(calls).toEqual(['load','delivery']); expect(row.cartTransfers).toEqual([{tick:w.tick,from:'building:123',to:`cart:${cart.id}`,item:'stone',n:4,reason:'load'}, {tick:w.tick,from:`cart:${cart.id}`,to:'site:123',item:'stone',n:4,reason:'delivery'}]);
  expect(row.moved).toBeNull(); expect(row.goal).toBe('haul');
});
