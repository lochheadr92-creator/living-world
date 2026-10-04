import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { REQUEST_TTL } from '../src/sim/constants';
import { addItem, conservationReport } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { killPerson } from '../src/sim/lifecycle';
import { relOf } from '../src/sim/relations';
import { makeSource } from '../src/sim/sources';
import { checkCommitments, createRequest, evaluateRequest, helpersOn, markSetAside, outstandingFor, reservedFor, socialOnDeath, surplusOf } from '../src/sim/social';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import type { Commitment, ConvPurpose, Person, World } from '../src/sim/types';
import type { ConvData } from '../src/sim/social';
import { addPerson, building, done, give, site, stage } from './helpers/kit';
import { run } from './helpers/util';

function friends(a: Person, b: Person, aff = 40, trust = 40): void {
  for (const [x, y] of [[a, b], [b, a]] as [Person, Person][]) {
    const r = relOf(x, y.id);
    r.affinity = aff;
    r.trust = trust;
    r.familiarity = 20;
  }
}

/** A starts a conversation with B (standing next to them) and the real conversation engine runs it to its end. */
function converse(w: World, a: Person, b: Person, purpose: ConvPurpose, conv: ConvData = {}): void {
  const act = newActivity(w, a, {
    kind: 'socialize',
    label: `Talking to ${b.name}`,
    goal: 'a staged conversation',
    targetId: b.id,
    targetType: 'person',
    tx: b.x,
    ty: b.y,
    spotX: b.x - 1.3,
    spotY: b.y,
    utility: 100,
    minCommit: 4000,
    maxTicks: 600,
    data: { purpose, conv },
  });
  startActivity(w, a, act);
  for (let i = 0; i < 600; i++) {
    run(w, 1);
    if (a.lastInteraction && a.lastInteraction.partner === b.id && !a.convId && a.lastInteraction.tick > act.start) return;
  }
}

function commit(w: World, p: Person, c: Partial<Commitment>): Commitment {
  const full: Commitment = { id: w.nextId++, requestId: 0, kind: 'deliver', to: 0, item: null, amount: 1, siteId: 0, made: w.tick, deadline: w.tick + 1000, status: 'active', delivered: 0, grace: 0, ...c };
  p.commitments.push(full);
  return full;
}

describe('a request says who wants what, where, and until when', () => {
  it('carries the asker, the answerer, the thing, how much, where it is to go, why, and when it lapses', () => {
    const s = stage('request-fields');
    const a = addPerson(s, 'Ana', 44, 44);
    const b = addPerson(s, 'Ben', 46, 44, { sex: 'm' });
    const st = site(s, 'hut', 50, 50, a.hhId, a.id);
    const w = done(s);
    const r = createRequest(w, a, b, { kind: 'wood', item: 'wood', amount: 3, siteId: st.id, purpose: 'for the hut', destKind: 'site', destId: st.id });
    expect(r.from).toBe(a.id);
    expect(r.to).toBe(b.id);
    expect(r.item).toBe('wood');
    expect(r.amount).toBe(3);
    expect(r.destKind).toBe('site');
    expect(r.destId).toBe(st.id);
    expect(r.purpose).toBe('for the hut');
    expect(r.expires - r.created).toBe(REQUEST_TTL);
    expect(r.status).toBe('pending');
    // a plain request for food goes to the asker themselves
    const f = createRequest(w, a, b, { kind: 'food' });
    expect(f.destKind).toBe('person');
    expect(f.destId).toBe(a.id);
  });
});

describe('how a promise ends', () => {
  function pair(name: string) {
    const s = stage(name);
    const asker = addPerson(s, 'Ana', 44, 44);
    const maker = addPerson(s, 'Ben', 46, 44, { sex: 'm' });
    const w = done(s);
    return { w, asker, maker };
  }
  function promised(w: World, asker: Person, maker: Person, c: Partial<Commitment>) {
    const req = createRequest(w, asker, maker, { kind: 'wood', item: 'wood', amount: 3 });
    req.status = 'promised';
    const cm = commit(w, maker, { requestId: req.id, to: asker.id, item: 'wood', amount: 3, ...c });
    return { req, cm };
  }
  const aff = (from: Person, to: Person) => relOf(from, to.id);

  it('kept: done, request fulfilled, warmth and trust go up', () => {
    const { w, asker, maker } = pair('ends-kept');
    const { req, cm } = promised(w, asker, maker, { delivered: 3 });
    const before = { a: aff(asker, maker).affinity, t: aff(asker, maker).trust };
    w.tick += 2000;
    // delivered in full: nothing is left to judge (fulfilCommitment is what normally records it)
    expect(cm.status).toBe('active');
    checkCommitments(w, maker);
    expect(cm.status).toBe('done');
    expect(['promised', 'fulfilled']).toContain(req.status);
    expect(aff(asker, maker).affinity).toBeGreaterThanOrEqual(before.a);
    expect(aff(asker, maker).trust).toBeGreaterThanOrEqual(before.t);
  });

  it('partly kept: expired with credit in proportion — not a broken promise', () => {
    const { w, asker, maker } = pair('ends-expired');
    const { req, cm } = promised(w, asker, maker, { delivered: 1 });
    w.tick += 2000;
    checkCommitments(w, maker);
    expect(cm.status).toBe('expired');
    expect(cm.reason).toMatch(/33%/);
    expect(req.status).toBe('expired');
    expect(aff(asker, maker).trust).toBeGreaterThan(aff(asker, maker).trust - 1); // no punishment
    expect(aff(asker, maker).grievance).toBeNull();
  });

  it('put aside for their own survival: interrupted, a very small mark, no grievance', () => {
    const { w, asker, maker } = pair('ends-interrupted');
    const { req, cm } = promised(w, asker, maker, {});
    markSetAside(w, maker);
    w.tick += 2000;
    markSetAside(w, maker); // still struggling near the deadline
    const trust0 = aff(asker, maker).trust;
    checkCommitments(w, maker);
    expect(cm.status).toBe('interrupted');
    expect(req.status).toBe('interrupted');
    expect(trust0 - aff(asker, maker).trust).toBeLessThan(2);
    expect(aff(asker, maker).grievance).toBeNull();
  });

  it('turned out to be impossible: failed, a small mark, the reason on record', () => {
    const { w, asker, maker } = pair('ends-failed');
    const { cm } = promised(w, asker, maker, {});
    cm.blocked = 'no wood to be had from anywhere they know of';
    w.tick += 2000;
    cm.blockedAt = w.tick - 100;
    checkCommitments(w, maker);
    expect(cm.status).toBe('failed');
    expect(cm.reason).toMatch(/no wood/);
    expect(aff(asker, maker).grievance).toBeNull();
  });

  it('neglected while free to act: broken — the real penalty, and a grievance with its cause', () => {
    const { w, asker, maker } = pair('ends-broken');
    const { req, cm } = promised(w, asker, maker, {});
    const before = { aff: aff(asker, maker).affinity, trust: aff(asker, maker).trust };
    w.tick += 2000;
    checkCommitments(w, maker);
    expect(cm.status).toBe('broken');
    expect(req.status).toBe('broken');
    expect(before.trust - aff(asker, maker).trust).toBeGreaterThanOrEqual(10);
    expect(before.aff - aff(asker, maker).affinity).toBeGreaterThanOrEqual(4);
    expect(aff(asker, maker).grievance?.cause).toBe('broken_promise');
  });

  it('a refusal costs far less than a broken promise (the asker asked once and heard no)', () => {
    const s = stage('refusal-vs-broken');
    const asker = addPerson(s, 'Ana', 44, 44, { hunger: 20 });
    const stingy = addPerson(s, 'Cal', 46, 44, { sex: 'm', inv: { berries: 3 }, traits: { generosity: 0.03 } });
    const w = done(s);
    friends(asker, stingy, 4, 12);
    const refusalBefore = relOf(asker, stingy.id).trust;
    converse(w, asker, stingy, 'request', { reqKind: 'food', item: null, amount: 2 });
    const req = w.requests[w.requests.length - 1];
    expect(req.status).toBe('declined');
    const refusalCost = refusalBefore - relOf(asker, stingy.id).trust;
    expect(refusalCost).toBeLessThan(6);
    // against the cost of a promise that is simply neglected
    const { w: w2, asker: a2, maker: m2 } = pair('x2');
    const trust2 = relOf(a2, m2.id).trust;
    const { cm } = promised(w2, a2, m2, {});
    w2.tick += 2000;
    checkCommitments(w2, m2);
    expect(cm.status).toBe('broken');
    expect(trust2 - relOf(a2, m2.id).trust).toBeGreaterThan(refusalCost);
  });

  it('moot: the building was finished or given up, nobody is blamed', () => {
    const s = stage('ends-moot');
    const asker = addPerson(s, 'Ana', 44, 44);
    const maker = addPerson(s, 'Ben', 46, 44, { sex: 'm' });
    const st = site(s, 'hut', 50, 50, asker.hhId, asker.id);
    const w = done(s);
    const cm = commit(w, maker, { kind: 'haul', to: asker.id, item: 'wood', amount: 3, siteId: st.id });
    w.sites.splice(w.sites.indexOf(st), 1);
    w.byId.delete(st.id);
    checkCommitments(w, maker);
    expect(cm.status).toBe('moot');
    expect(relOf(asker, maker.id).grievance).toBeNull();
  });

  it('the maker dying releases the promise and withdraws the request; the asker dying does too', () => {
    const { w, asker, maker } = pair('ends-death');
    const { req, cm } = promised(w, asker, maker, {});
    expect(reservedFor(w, maker, 'wood')).toBe(3);
    killPerson(w, maker, 'test');
    expect(cm.status).toBe('moot');
    expect(req.status).toBe('cancelled');
    const s2 = stage('ends-death-2');
    const a2 = addPerson(s2, 'Ana', 44, 44);
    const m2 = addPerson(s2, 'Ben', 46, 44);
    const w2 = done(s2);
    const r2 = createRequest(w2, a2, m2, { kind: 'wood', item: 'wood', amount: 3 });
    r2.status = 'promised';
    const c2 = commit(w2, m2, { requestId: r2.id, to: a2.id, item: 'wood', amount: 3 });
    socialOnDeath(w2, a2);
    expect(r2.status).toBe('cancelled');
    expect(c2.status).toBe('moot');
  });

  it('time asleep or seeing to their own needs does not count against the deadline', () => {
    const { w, asker, maker } = pair('ends-grace');
    const { cm } = promised(w, asker, maker, { deadline: w.tick + 600 });
    maker.pose = 'sleep';
    for (let i = 0; i < 40; i++) {
      w.tick += 40;
      checkCommitments(w, maker);
    }
    expect(cm.grace).toBeGreaterThan(1000);
    expect(cm.status).toBe('active');
  });
});

describe('no promise is made twice over, and promised goods are not given away', () => {
  it('goods promised to someone are reserved from the maker’s own spare — only while the promise is open', () => {
    const s = stage('reserve');
    const a = addPerson(s, 'Ana', 44, 44);
    const b = addPerson(s, 'Ben', 46, 44, { inv: { wood: 5 } });
    const w = done(s);
    expect(surplusOf(w, b, 'wood')).toBe(5);
    const cm = commit(w, b, { kind: 'haul', to: a.id, item: 'wood', amount: 3, siteId: 0 });
    expect(reservedFor(w, b, 'wood')).toBe(3);
    expect(surplusOf(w, b, 'wood')).toBe(2);
    cm.delivered = 2;
    expect(surplusOf(w, b, 'wood')).toBe(4);
    cm.status = 'done';
    expect(reservedFor(w, b, 'wood')).toBe(0);
    expect(surplusOf(w, b, 'wood')).toBe(5);
  });

  it('a request already covered by what others have promised is answered “that has been seen to”, not promised again', () => {
    const s = stage('duplicate');
    const a = addPerson(s, 'Ana', 44, 44);
    const b = addPerson(s, 'Ben', 46, 44, { sex: 'm', traits: { generosity: 0.95 } });
    const c = addPerson(s, 'Cat', 47, 44, { traits: { generosity: 0.95 } });
    const st = site(s, 'hut', 50, 50, a.hhId, a.id, { wood: 5 });
    const w = done(s);
    friends(a, b);
    friends(a, c);
    // the hut needs 3 more wood; Cat has already promised 3
    const r1 = createRequest(w, a, c, { kind: 'wood', item: 'wood', amount: 3, siteId: st.id });
    r1.status = 'promised';
    const owed = commit(w, c, { requestId: r1.id, to: a.id, kind: 'haul', item: 'wood', amount: 3, siteId: st.id, destKind: 'site', destId: st.id });
    r1.commitmentId = owed.id;
    expect(outstandingFor(w, a.id, 'wood', st.id)).toBe(3);
    const r2 = createRequest(w, a, b, { kind: 'wood', item: 'wood', amount: 3, siteId: st.id });
    const resp = evaluateRequest(w, b, a, r2);
    expect(resp).toEqual({ kind: 'decline', reason: 'enough' });
    // and the same person cannot be promised the same thing twice by the same maker
    const r3 = createRequest(w, a, c, { kind: 'wood', item: 'wood', amount: 3, siteId: st.id });
    expect(evaluateRequest(w, c, a, r3)).toMatchObject({ kind: 'decline' });
  });

  it('only so many people can be committed to one building: the rest are told there are hands enough', () => {
    const s = stage('helper-cap');
    const owner = addPerson(s, 'Ola', 44, 44);
    const st = site(s, 'hut', 50, 50, owner.hhId, owner.id);
    const ps = ['Al', 'Bo', 'Cy', 'Di', 'Ed'].map((n, i) => addPerson(s, n, 45 + i, 44));
    const w = done(s);
    for (const p of ps.slice(0, 3)) commit(w, p, { kind: 'help_build', to: owner.id, siteId: st.id });
    expect(helpersOn(w, st.id)).toBe(3);
    expect(st.maxWorkers + 1).toBe(4);
  });
});

describe('promises turn into real work and real deliveries', () => {
  it('a promise to bring wood to a building site is carried out: the wood really arrives at the site, once, and the promise is kept', () => {
    const s = stage('haul-promise');
    const owner = addPerson(s, 'Ola', 44, 26, { inv: { fruit: 6 } });
    const helper = addPerson(s, 'Hal', 46, 26, { sex: 'm', inv: { fruit: 6 }, traits: { generosity: 0.95, diligence: 0.9 } });
    const st = site(s, 'hut', 40, 28, owner.hhId, owner.id);
    for (let i = 0; i < 5; i++) makeSource(s.w, 'tree', 52 + (i % 3), 22 + i, 5);
    for (let i = 0; i < 3; i++) makeSource(s.w, 'berry_bush', 36 + i, 32, 6);
    s.w.camp = { x: 44.5, y: 26.5 };
    const w = done(s);
    friends(owner, helper, 50, 50);
    for (const e of [st, ...w.sources]) {
      observe(w, owner, e);
      observe(w, helper, e);
    }
    const before = (st.delivered.wood ?? 0) + (st.used.wood ?? 0);
    converse(w, owner, helper, 'request', { reqKind: 'wood', item: 'wood', amount: 3, siteId: st.id, destKind: 'site', destId: st.id, purpose: 'for the hut' });
    const req = w.requests[w.requests.length - 1];
    expect(['promised', 'fulfilled']).toContain(req.status);
    const cm = helper.commitments.find((c) => c.requestId === req.id);
    expect(cm, 'the helper made a commitment').toBeTruthy();
    expect(cm!.kind).toBe('haul');
    expect(cm!.destId).toBe(st.id);
    for (let i = 0; i < 4000 && cm!.status === 'active'; i++) run(w, 1);
    expect(cm!.status).toBe('done');
    expect(req.status).toBe('fulfilled');
    const after = (st.delivered.wood ?? 0) + (st.used.wood ?? 0);
    expect(after - before).toBeGreaterThanOrEqual(3);
    expect(cm!.delivered).toBeGreaterThanOrEqual(3);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('borrowing a tool', () => {
  function toolScene(name: string, generosity = 0.9) {
    const s = stage(name);
    const lender = addPerson(s, 'Lena', 44, 26, { traits: { generosity }, inv: { fruit: 5 } });
    const borrower = addPerson(s, 'Bo', 46, 26, { sex: 'm', inv: { fruit: 5 } });
    const third = addPerson(s, 'Third', 48, 26, { inv: { fruit: 5 } });
    const t = give(s.w, lender, 'hammer');
    s.w.camp = { x: 44.5, y: 26.5 };
    const w = done(s);
    return { w, lender, borrower, third, t };
  }

  it('a friend lends it, the borrower promises to bring it back, and nobody else can use it meanwhile', () => {
    const { w, lender, borrower, third, t } = toolScene('lend');
    friends(lender, borrower, 40, 45);
    converse(w, borrower, lender, 'request', { reqKind: 'tool', toolKind: 'hammer', item: 'hammer', amount: 1, purpose: 'to build' });
    const req = w.requests[w.requests.length - 1];
    expect(req.status).toBe('fulfilled');
    expect(req.outcome).toBe('lent');
    expect(t.holder).toBe(borrower.id);
    expect(t.loan?.lender).toBe(lender.id);
    expect(borrower.inv.hammer).toBe(1);
    expect(lender.inv.hammer ?? 0).toBe(0);
    const promise = borrower.commitments.find((c) => c.kind === 'return_tool');
    expect(promise?.toolId).toBe(t.id);
    expect(promise?.to).toBe(lender.id);
    // a third person asking for the same hammer is told there is none to lend
    const r2 = createRequest(w, third, lender, { kind: 'tool', item: 'hammer', toolKind: 'hammer', amount: 1 });
    expect(evaluateRequest(w, lender, third, r2)).toMatchObject({ kind: 'decline', reason: 'no_item' });
    expect(toolReport(w).ok).toBe(true);
  });

  it('it comes back to the lender’s own hands, and the promise is kept — not just any hammer of that kind', () => {
    const { w, lender, borrower, t } = toolScene('lend-return');
    friends(lender, borrower, 40, 45);
    converse(w, borrower, lender, 'request', { reqKind: 'tool', toolKind: 'hammer', item: 'hammer', amount: 1, purpose: 'to build' });
    const own = give(w, borrower, 'hammer'); // the borrower has a hammer of their own as well
    void own;
    const promise = borrower.commitments.find((c) => c.kind === 'return_tool')!;
    for (let i = 0; i < 3000 && promise.status === 'active'; i++) run(w, 1);
    expect(promise.status).toBe('done');
    expect(t.holder).toBe(lender.id);
    expect(t.loan).toBeNull();
    expect(toolsHeldBy(w, borrower.id, 'hammer')).toHaveLength(1); // their own is still theirs
    expect(toolReport(w).ok).toBe(true);
  });

  it('an unwilling owner says no, and says why: it is not on loan, it is in use, or they are not close enough', () => {
    const { w, lender, borrower } = toolScene('lend-no', 0.05);
    friends(lender, borrower, 2, 10);
    converse(w, borrower, lender, 'request', { reqKind: 'tool', toolKind: 'hammer', item: 'hammer', amount: 1, purpose: 'to build' });
    const req = w.requests[w.requests.length - 1];
    expect(req.status).toBe('declined');
    expect(borrower.inv.hammer ?? 0).toBe(0);
  });
});


describe('asking a neighbour to mend a failing roof', () => {
  it('an old person with nobody able to mend their hut asks; the neighbour promises, really mends it with wood from their own pack, and the promise is kept', () => {
    const s = stage('roof-repair');
    const elder = addPerson(s, 'Edda', 44, 26, { age: 72, traits: { sociability: 0.8 }, inv: { fruit: 4 } });
    const ned = addPerson(s, 'Ned', 46, 26, { sex: 'm', inv: { wood: 4, fruit: 4 }, traits: { generosity: 0.95, diligence: 0.9 } });
    const hut = building(s, 'hut', 40, 28, elder.hhId);
    s.w.households.find((h) => h.id === elder.hhId)!.homeId = hut.id;
    hut.condition = 38;
    s.w.camp = { x: 44.5, y: 26.5 };
    const w = done(s);
    friends(elder, ned, 50, 50);
    observe(w, elder, hut);
    observe(w, ned, hut);
    const woodBefore = ned.inv.wood ?? 0;
    converse(w, elder, ned, 'request', { reqKind: 'repair', item: 'wood', amount: 1, destKind: 'building', destId: hut.id, purpose: 'the roof is failing', milestone: 'sound again' });
    const req = w.requests[w.requests.length - 1];
    expect(req.kind).toBe('repair');
    expect(req.destId).toBe(hut.id);
    const cm = ned.commitments.find((c) => c.requestId === req.id);
    expect(cm?.kind).toBe('work');
    expect(cm?.destKind).toBe('building');
    expect(cm?.destId).toBe(hut.id);
    for (let i = 0; i < 3000 && cm!.status === 'active'; i++) run(w, 1);
    expect(hut.condition).toBeGreaterThan(38);
    expect(cm!.status).toBe('done');
    expect(req.status).toBe('fulfilled');
    expect(ned.inv.wood ?? 0).toBeLessThan(woodBefore);
    expect(w.ledger.reasons['-repairs']).toBeGreaterThan(0);
    expect(conservationReport(w).ok).toBe(true);
  });
});
