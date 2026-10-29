// STAGED contracts for customers: an unmet ask remembered, supplied later as a gift or a swap, the return read by the trade review (rules 51).
import { afterEach, expect, it } from 'vitest';
import { addPerson, building, done, pin, site, stage } from './helpers/kit';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { relOf } from '../src/sim/relations';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { startActivity, endActivity, newActivity } from '../src/sim/activities';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { createRequest } from '../src/sim/social';
import { reviewTrade } from '../src/sim/trade';
import { CUSTOMER_WINDOW, SERVED_BONUS, customerRecord, demandLapsed, describeCustomers, liveLeads, noteCustomer, pruneCustomers, servedBonus, setCustomers } from '../src/sim/customers';
import { observeNow } from './helpers/inhabit';
import { parseIntervention } from '../scripts/lab/lab';
import type { Commitment, Person, SkillKey } from '../src/sim/types';

afterEach(() => setCustomers(true));

/**
 * STAGED: Ada's house site wants planks; Ben carries four planks, every one promised to Cora's site; Cora's site is at the far end.
 * Ada asks Ben for planks and is turned down as committed; later the promise is moot and the planks are spare.
 */
function scene(version = 51, opts: { adaFish?: number; benKnowsAdaSite?: boolean } = {}) {
  const s = stage('customers-51');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 30, inv: opts.adaFish ? { fish: opts.adaFish } : {}, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1, diligence: 1, sociability: 1 } });
  const ben = addPerson(s, 'Ben', 42, 40.5, { age: 30, inv: { planks: 4 }, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1, diligence: 1, sociability: 1 } });
  const cora = addPerson(s, 'Cora', 43.5, 40.5, { age: 30, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1, diligence: 1, sociability: 1 } });
  const yard = building(s, 'timber_yard', 20, 35, 0, { wood: 9 });
  observe(w, ben, yard);
  const sites: Record<number, ReturnType<typeof site>> = {};
  for (const [p, x, y] of [[ada, 46, 43], [cora, 47, 51]] as const) {
    const st = site(s, 'house', x, y, p.hhId, p.id);
    sites[p.id] = st;
    observe(w, p, st);
  }
  if (opts.benKnowsAdaSite) observe(w, ben, sites[ada.id]);
  for (const p of [ada, ben, cora]) {
    pin(p);
    p.cooldowns.trade = 1e12;
    p.needs.warmth = 100;
    p.needs.safety = 100;
  }
  for (const p of [ada, cora]) {
    relOf(p, ben.id).affinity = 70;
    relOf(ben, p.id).affinity = 70;
  }
  for (const k of Object.keys(ben.skills) as SkillKey[]) ben.skills[k] = 1;
  done(s);
  w.sceneLabel = 'STAGED: an unmet ask for planks becomes a customer, supplied when the planks are spare';
  // the staged promise: Ben's four planks are for Cora's site (a real request, promised, with its commitment)
  const coraReq = createRequest(w, cora, ben, { kind: 'goods', item: 'planks', amount: 4, siteId: sites[cora.id].id, destKind: 'site', destId: sites[cora.id].id });
  const promise: Commitment = { id: w.nextId++, requestId: coraReq.id, kind: 'deliver', to: cora.id, item: 'planks', amount: 4, siteId: sites[cora.id].id, made: w.tick, deadline: w.tick + 6000, status: 'active', delivered: 0, destKind: 'site', destId: sites[cora.id].id };
  ben.commitments.push(promise);
  coraReq.status = 'promised';
  coraReq.commitmentId = promise.id;
  for (const p of [ada, ben, cora]) perceive(w, p);
  const ask = () => {
    perceive(w, ada);
    const o = rankOptions(generateOptions(w, ada, true, true)).find((x) => x.label === 'Ask Ben for planks');
    if (!o?.make) throw new Error('No ask for planks offered: ' + generateOptions(w, ada, true, true).options.map((x) => x.label).join('|'));
    const after = w.nextId;
    ada.cooldowns.pause = 0;
    startActivity(w, ada, o.make()!);
    for (let i = 0; i < 600; i++) {
      stepWorld(w);
      if (w.requests.some((r) => r.id >= after && r.from === ada.id && r.to === ben.id && r.status !== 'pending') && !ada.convId) break;
    }
    pin(ada);
    return w.requests.find((r) => r.id >= after && r.from === ada.id && r.to === ben.id)!;
  };
  /** the staged turn: Cora's site came by its planks another way, so Ben's promise is moot and his planks are his to spare */
  const free = () => {
    promise.status = 'moot';
    promise.reason = 'the site came by its planks some other way (staged)';
    coraReq.status = 'cancelled';
    ben.cooldowns.pause = 0;
    // the ask's own short talk cooldown has passed (staged: a little later the same day)
    w.tick += 500;
    perceive(w, ben);
  };
  return { w, ada, ben, cora, yard, sites, promise, ask, free };
}

const supplyOption = (w: ReturnType<typeof scene>['w'], ben: Person) => rankOptions(generateOptions(w, ben, true, true)).find((o) => /^Bring Ada the planks/.test(o.label));

it('rules 51: an ask turned down for want of spare planks leaves a customer lead; rules 50 leaves none; a refusal by choice leaves none', () => {
  const old = scene(50);
  const r50 = old.ask();
  expect(r50.status).toBe('declined');
  expect(old.ben.customers).toBeUndefined();
  const f = scene(51);
  const req = f.ask();
  expect(req.status).toBe('declined');
  expect(req.note).toMatch(/promised|committed|spoken for/i);
  const leads = liveLeads(f.w, f.ben);
  expect(leads).toHaveLength(1);
  expect(leads[0]).toMatchObject({ requestId: req.id, personId: f.ada.id, item: 'planks', supplied: 0, repeat: false });
  expect(f.ben.log.some((l) => /Ada asked me for planks and I had none to spare; if I come by some, Ada is a customer/.test(l.text))).toBe(true);
  // a refusal by choice is not unmet demand: no lead
  const byChoice = createRequest(f.w, f.cora, f.ben, { kind: 'goods', item: 'planks', amount: 2 });
  noteCustomer(f.w, f.ben, f.cora, byChoice, 'unwilling');
  noteCustomer(f.w, f.ben, f.cora, byChoice, 'disliked');
  expect(liveLeads(f.w, f.ben)).toHaveLength(1);
  // "my own needs come first" while holding planks that are all spoken for is unmet demand: a lead (the commonest refusal in
  // the first ordinary worlds); the same words with planks to spare would not be
  noteCustomer(f.w, f.ben, f.cora, byChoice, 'own_need');
  expect(liveLeads(f.w, f.ben)).toHaveLength(2);
  expect(liveLeads(f.w, f.ben)[1].personId).toBe(f.cora.id);
  f.ben.customers!.pop();
  f.promise.status = 'moot';
  noteCustomer(f.w, f.ben, f.cora, { ...byChoice, id: f.w.nextId++ }, 'own_need');
  expect(liveLeads(f.w, f.ben)).toHaveLength(1);
  f.promise.status = 'active';
  // the supply is not offered while the planks are spoken for
  expect(supplyOption(f.w, f.ben)).toBeUndefined();
  expect(describeCustomers(f.w, f.ben)[0]).toMatch(/Ada asked me for \d planks .* days ago; none to spare yet/);
});

it('rules 51: the planks freed, Ben brings Ada what she asked for as a gift; the record says a favour is owed; the ledger is conserved', () => {
  const f = scene(51);
  const req = f.ask();
  f.free();
  const o = supplyOption(f.w, f.ben);
  expect(o?.label).toBe('Bring Ada the planks they asked for');
  expect(o?.parts.map((x) => x[0])).toContain('Ada asked me for planks');
  startActivity(f.w, f.ben, o!.make!()!);
  for (let i = 0; i < 600 && (f.ada.inv.planks ?? 0) < 1; i++) stepWorld(f.w);
  expect(f.ada.inv.planks).toBe(4);
  expect(f.ben.inv.planks ?? 0).toBe(0);
  const lead = f.ben.customers!.find((c) => c.requestId === req.id)!;
  expect(lead.supplied).toBeGreaterThan(0);
  expect(lead.units).toBe(4);
  expect(lead.back).toBeNull();
  expect(f.ben.log.some((l) => /Brought Ada the 4 planks they had asked me for; they owe me a favour/.test(l.text))).toBe(true);
  expect(f.ada.log.some((l) => /Ben brought me the 4 planks I had asked them for/.test(l.text))).toBe(true);
  // the ask had already been declined: it is left as it was; the goods still changed hands, and the favour debt is the ordinary one
  expect(req.status).toBe('declined');
  expect(relOf(f.ben, f.ada.id).debt).toBeGreaterThan(0);
  expect(describeCustomers(f.w, f.ben)[0]).toMatch(/I brought them 4 .* and they owe me a favour/);
  expect(conservationReport(f.w).ok).toBe(true);
  // no second supply for the same lead
  f.ben.cooldowns.pause = 0;
  perceive(f.w, f.ben);
  expect(supplyOption(f.w, f.ben)).toBeUndefined();
});

it('rules 51: when the customer carries something the supplier lacks, the supply is a swap through the ordinary barter, and the return is recorded', () => {
  const f = scene(51, { adaFish: 3 });
  const req = f.ask();
  f.free();
  const o = supplyOption(f.w, f.ben);
  expect(o?.label).toBe('Bring Ada the planks they asked for, for fish');
  startActivity(f.w, f.ben, o!.make!()!);
  for (let i = 0; i < 600 && (f.ada.inv.planks ?? 0) < 1; i++) stepWorld(f.w);
  // two for one at most: the barter's own bound, and what her pack can take on top of the fish
  expect(f.ada.inv.planks).toBe(2);
  expect(f.ben.inv.fish).toBe(1);
  const lead = f.ben.customers!.find((c) => c.requestId === req.id)!;
  expect(lead).toMatchObject({ units: 2, back: 'fish', backUnits: 1 });
  expect(f.ben.log.some((l) => /Brought Ada the 2 planks they had asked me for; they gave me 1 fish for it/.test(l.text))).toBe(true);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 51: a supplied customer holds the trade that made the goods; a demand-taken trade whose asks all lapsed is looked at again', () => {
  const f = scene(51);
  f.ask();
  f.free();
  startActivity(f.w, f.ben, supplyOption(f.w, f.ben)!.make!()!);
  for (let i = 0; i < 600 && (f.ada.inv.planks ?? 0) < 1; i++) stepWorld(f.w);
  expect(customerRecord(f.w, f.ben, 'carpentry')).toEqual({ served: 1, lapsed: 0, paid: 0 });
  expect(servedBonus(f.w, f.ben, 'carpentry')).toBe(SERVED_BONUS);
  expect(servedBonus(f.w, f.ben, 'kiln')).toBe(0);
  expect(demandLapsed(f.w, f.ben, 'carpentry')).toBe(false);
  // lapsed: two more asks heard and never supplied, a window later
  const g = scene(51);
  for (const who of [g.ada, g.cora]) noteCustomer(g.w, g.ben, who, createRequest(g.w, who, g.ben, { kind: 'goods', item: 'planks', amount: 2 }), 'no_item');
  g.ben.trade = { key: 'carpentry', since: g.w.tick, why: '2 people asked me for planks' };
  g.w.tick += CUSTOMER_WINDOW;
  pruneCustomers(g.w, g.ben);
  expect(customerRecord(g.w, g.ben, 'carpentry')).toEqual({ served: 0, lapsed: 2, paid: 0 });
  expect(demandLapsed(g.w, g.ben, 'carpentry')).toBe(true);
  g.ben.cooldowns.trade = 0;
  perceive(g.w, g.ben);
  reviewTrade(generateOptions(g.w, g.ben, true));
  // with equal skills and the demand gone, nothing stands out: the trade is given up rather than kept on asks that went nowhere
  expect(g.ben.trade).toBeNull();
  expect(describeCustomers(g.w, g.ben).every((t) => /too old to count now/.test(t))).toBe(true);
});

it('rules 51: a customer out of sight is gone to where they were last known, and supplied on arrival', () => {
  const f = scene(51);
  f.ask();
  // Ada goes off out of sight (a staged move: resting far away), and Ben remembers where
  if (f.ada.activity) endActivity(f.w, f.ada, 'interrupted', 'staged');
  f.ada.x = 30.5;
  f.ada.y = 52.5;
  f.ada.cooldowns.pause = 0;
  startActivity(f.w, f.ada, newActivity(f.w, f.ada, { kind: 'rest', label: 'Resting (staged)', goal: 'staged: away from the camp', need: 'warmth', targetId: 0, here: true, amount: 3000, utility: 100, minCommit: 3000, maxTicks: 3200, data: { sticky: true } }));
  f.ben.whereabouts[f.ada.id] = { x: 30.5, y: 52.5, tick: f.w.tick };
  f.free();
  const o = rankOptions(generateOptions(f.w, f.ben, true, true)).find((x) => x.label === 'Take planks to Ada');
  expect(o?.kind).toBe('visit');
  startActivity(f.w, f.ben, o!.make!()!);
  const lead = () => f.ben.customers!.find((c) => c.personId === f.ada.id)!;
  for (let i = 0; i < 3000 && !lead().supplied; i++) stepWorld(f.w);
  expect(f.ben.log.some((l) => /^Found Ada\./.test(l.text))).toBe(true);
  // having found her, the planks reach her one of two honest ways: into her hands, or (when a rules-50 batch plan for her
  // house site has spoken for them) hauled to that site, which the lead records as supplied at the site
  expect(lead().supplied).toBeGreaterThan(0);
  expect((f.ada.inv.planks ?? 0) + (f.sites[f.ada.id].delivered.planks ?? 0)).toBeGreaterThanOrEqual(lead().units);
  expect(lead().units).toBeGreaterThanOrEqual(1);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 51: switch, exact replay, observer purity, and rules 50 unchanged', () => {
  const f = scene(51);
  f.ask();
  f.free();
  const saved = serializeWorld(f.w);
  const hash = hashWorld(f.w);
  for (let i = 0; i < 4; i++) {
    observeNow(f.w, f.ben);
    describeCustomers(f.w, f.ben);
    liveLeads(f.w, f.ben);
    customerRecord(f.w, f.ben, 'carpentry');
  }
  expect(serializeWorld(f.w)).toBe(saved);
  const copy = deserializeWorld(saved);
  for (let i = 0; i < 200; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
  const restore = parseIntervention('rich-no-customers').install!();
  const before = deserializeWorld(saved);
  const benBefore = before.persons.find((p) => p.id === f.ben.id)!;
  expect(liveLeads(before, benBefore)).toHaveLength(0);
  expect(rankOptions(generateOptions(before, benBefore, true, true)).find((o) => /^Bring Ada the planks/.test(o.label))).toBeUndefined();
  restore();
  expect(liveLeads(before, benBefore)).toHaveLength(1);
  const changed = deserializeWorld(saved);
  changed.persons.find((p) => p.id === f.ben.id)!.customers!.pop();
  expect(hashWorld(changed)).not.toBe(hash);
  // a rules-50 world: no leads, no supply, the trade review reads no bonus
  const old = scene(50);
  old.ask();
  old.free();
  expect(old.ben.customers).toBeUndefined();
  expect(supplyOption(old.w, old.ben)).toBeUndefined();
  expect(servedBonus(old.w, old.ben, 'carpentry')).toBe(0);
});

it('rules 51: a haul of the planks to the customer’s own house site supplies the ask too, with nothing back and the site named', () => {
  const f = scene(51, { benKnowsAdaSite: true });
  const req = f.ask();
  f.free();
  const o = rankOptions(generateOptions(f.w, f.ben, true, true)).find((x) => x.kind === 'haul' && x.targetId === f.sites[f.ada.id].id);
  expect(o).toBeDefined();
  startActivity(f.w, f.ben, o!.make!()!);
  for (let i = 0; i < 900 && (f.sites[f.ada.id].delivered.planks ?? 0) < 1; i++) stepWorld(f.w);
  expect(f.sites[f.ada.id].delivered.planks).toBeGreaterThanOrEqual(1);
  const lead = f.ben.customers!.find((c) => c.requestId === req.id)!;
  expect(lead.supplied).toBeGreaterThan(0);
  expect(lead.siteId).toBe(f.sites[f.ada.id].id);
  expect(lead.back).toBeNull();
  expect(f.ben.log.some((l) => /Took \d planks to Ada's site, as they had asked me for; nothing came back for it/.test(l.text))).toBe(true);
  expect(describeCustomers(f.w, f.ben)[0]).toMatch(/I took them \d .* to their site, and nothing came back for it/);
  expect(conservationReport(f.w).ok).toBe(true);
});
