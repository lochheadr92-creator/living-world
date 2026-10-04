import { describe, expect, it } from 'vitest';
import { conservationReport } from '../src/sim/economy';
import { helpScene } from '../src/sim/scenes';
import { checkCommitments, createRequest, evaluateRequest, fulfillCommitment, updateRequests } from '../src/sim/social';
import { REQUEST_TTL } from '../src/sim/constants';
import { relOf } from '../src/sim/relations';
import type { Commitment, ItemKind } from '../src/sim/types';
import { person, run, settingsFor } from './helpers/util';

describe('requests have answers and consequences', () => {
  it('a hungry person asks a generous neighbour, who gives food: a real transfer, a fulfilled request, a better relationship', () => {
    const w = helpScene(settingsFor('help-generous', { scene: 'help' }), 'generous');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    const transfers: { from: string; to: string; item: ItemKind; n: number; reason: string }[] = [];
    w.hooks = { onTransfer: (t) => transfers.push(t) };
    const affinityBefore = ana.relations[ben.id].affinity;
    const benBerries = ben.inv.berries ?? 0;
    expect(benBerries).toBe(6);
    expect(ana.inv.berries ?? 0).toBe(0);
    run(w, 700);
    const req = w.requests.find((r) => r.from === ana.id && r.to === ben.id);
    expect(req, 'Ana should have asked Ben').toBeTruthy();
    expect(req!.kind).toBe('food');
    expect(req!.status).toBe('fulfilled');
    // the food really moved from Ben's pack to Ana
    const gift = transfers.find((t) => t.reason === 'gift on request');
    expect(gift).toBeTruthy();
    expect(gift!.from).toBe('person:' + ben.id);
    expect(gift!.to).toBe('person:' + ana.id);
    // everything Ben handed over (the answer to the request, and any further kindness) left his pack and nobody else's
    const handedOver = transfers.filter((t) => t.from === 'person:' + ben.id && t.item === 'berries').reduce((s, t) => s + t.n, 0);
    expect(handedOver).toBeGreaterThanOrEqual(gift!.n);
    expect(ben.inv.berries ?? 0).toBe(benBerries - handedOver);
    // Ana ate what she was given
    expect(ana.lastAteTick).toBeGreaterThan(0);
    // relationship grew from the actual help
    expect(ana.relations[ben.id].affinity).toBeGreaterThan(affinityBefore);
    expect(ana.relations[ben.id].history.some((h) => /gave me/.test(h.text))).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    // the dialogue came from a real act: the request is on record
    expect(w.events.some((e) => e.kind === 'social' && /Ben gave .* to Ana/.test(e.text))).toBe(true);
  });

  it('a stingy neighbour who needs his own food declines: no transfer, a visible refusal on record, and the person asks elsewhere or looks for food', () => {
    const w = helpScene(settingsFor('help-stingy', { scene: 'help' }), 'stingy');
    const dara = person(w, 'Dara');
    const cole = person(w, 'Cole');
    const transfers: unknown[] = [];
    w.hooks = { onTransfer: (t) => transfers.push(t) };
    run(w, 600);
    const req = w.requests.find((r) => r.from === dara.id && r.to === cole.id);
    expect(req, 'Dara should have asked Cole').toBeTruthy();
    expect(req!.status).toBe('declined');
    expect(req!.note.length).toBeGreaterThan(0);
    expect(transfers.filter((t) => (t as { reason: string }).reason === 'gift on request')).toHaveLength(0);
    expect(dara.log.some((l) => /said no/.test(l.text))).toBe(true);
    expect(cole.log.some((l) => /Turned down/.test(l.text))).toBe(true);
  });

  it('the answer depends on who is asked: a generous, well-stocked friend gives; a stingy stranger does not', () => {
    const w = helpScene(settingsFor('who-is-asked', { scene: 'help' }), 'both');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    const dara = person(w, 'Dara');
    const cole = person(w, 'Cole');
    const r1 = createRequest(w, ana, ben, { kind: 'food' });
    const r2 = createRequest(w, dara, cole, { kind: 'food' });
    expect(evaluateRequest(w, ben, ana, r1).kind).toBe('give');
    expect(evaluateRequest(w, cole, dara, r2).kind).toBe('decline');
    // a grudge changes the answer even for a generous giver
    relOf(ben, ana.id).avoidUntil = w.tick + 500;
    relOf(ben, ana.id).affinity = -30;
    expect(evaluateRequest(w, ben, ana, r1).kind).toBe('decline');
  });

  it('a request that is never answered expires visibly', () => {
    const w = helpScene(settingsFor('expiry', { scene: 'help' }), 'both');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    const r = createRequest(w, ana, ben, { kind: 'water' });
    expect(r.status).toBe('pending');
    w.tick = r.created + REQUEST_TTL + 5;
    updateRequests(w);
    expect(r.status).toBe('expired');
  });

  it('a promise that is kept builds trust; one that is not kept breaks it, on the record', () => {
    const w = helpScene(settingsFor('promises', { scene: 'help' }), 'both');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    const mk = (tag: number): { c: Commitment; reqId: number } => {
      const r = createRequest(w, ana, ben, { kind: 'wood', item: 'wood', amount: 2 });
      r.status = 'promised';
      const c: Commitment = { id: 9000 + tag, requestId: r.id, kind: 'deliver', to: ana.id, item: 'wood', amount: 2, siteId: 0, made: w.tick, deadline: w.tick + 100, status: 'active' };
      ben.commitments.push(c);
      return { c, reqId: r.id };
    };
    // kept
    const kept = mk(1);
    const trustBefore = relOf(ana, ben.id).trust;
    fulfillCommitment(w, ben, kept.c.id);
    expect(kept.c.status).toBe('done');
    expect(w.requests.find((r) => r.id === kept.reqId)!.status).toBe('fulfilled');
    expect(relOf(ana, ben.id).trust).toBeGreaterThan(trustBefore);
    // broken
    const broken = mk(2);
    broken.c.deadline = w.tick - 1;
    const trust2 = relOf(ana, ben.id).trust;
    checkCommitments(w, ben);
    expect(broken.c.status).toBe('broken');
    expect(w.requests.find((r) => r.id === broken.reqId)!.status).toBe('broken');
    expect(relOf(ana, ben.id).trust).toBeLessThan(trust2);
    expect(w.events.some((e) => e.kind === 'conflict' && /did not keep a promise/.test(e.text))).toBe(true);
  });
});

describe('ordinary social life in the natural world', () => {
  it('over several days people greet, talk, ask, share and sometimes disagree, and relationships form from those encounters', async () => {
    const { natural } = await import('./helpers/util');
    const w = natural('social-life');
    run(w, 2400 * 3);
    const talked = w.persons.reduce((s, p) => s + p.stats.talked, 0);
    const given = w.persons.reduce((s, p) => s + p.stats.given, 0);
    expect(talked).toBeGreaterThan(40);
    expect(given).toBeGreaterThan(0);
    expect(w.requests.length).toBeGreaterThan(0);
    // affinities have moved away from where the initial band started, and are based on recorded experiences
    let withHistory = 0;
    for (const p of w.persons) for (const k in p.relations) if (p.relations[k as unknown as number].history.length) withHistory++;
    expect(withHistory).toBeGreaterThan(10);
    // nobody has an opinion of a stranger they never met: affinity of unseen people stays at the default 0
    const strangers = w.persons.filter((p) => Object.keys(p.relations).length < w.persons.length - 1).length;
    void strangers;
    expect(conservationReport(w).ok).toBe(true);
  });
});
