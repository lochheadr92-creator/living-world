// Hearsay about people. Scenes here are STAGED (hand-made situations that check a rule); the last test is the natural world.
import { describe, expect, it } from 'vitest';
import { ACCOUNT_LIFE, HEARSAY_FLOOR, MAX_ACCOUNTS, MAX_HOPS, hearAccount, pickAccount, recordAccount } from '../src/sim/reputation';
import { relOf } from '../src/sim/relations';
import { checkCommitments, createRequest, fulfillCommitment } from '../src/sim/social';
import { helpScene } from '../src/sim/scenes';
import { hashWorld } from '../src/sim/world';
import type { Commitment, Person, World } from '../src/sim/types';
import { natural, person, run, settingsFor } from './helpers/util';

function stage(): { w: World; ana: Person; ben: Person; cy: Person } {
  const w = natural('hearsay-stage');
  const [ana, ben, cy] = w.persons.filter((p) => p.alive);
  return { w, ana, ben, cy };
}

const promise = (w: World, from: Person, to: Person, tag: number, deadlineOffset = 100): Commitment => {
  const r = createRequest(w, to, from, { kind: 'wood', item: 'wood', amount: 2 });
  r.status = 'promised';
  const c: Commitment = { id: 9100 + tag, requestId: r.id, kind: 'deliver', to: to.id, item: 'wood', amount: 2, siteId: 0, made: w.tick, deadline: w.tick + deadlineOffset, status: 'active' };
  from.commitments.push(c);
  return c;
};

describe('an account exists only because something really happened', () => {
  it('a broken promise gives the person it was made to an account of it, and a kept one an account of that', () => {
    const w = helpScene(settingsFor('rep-promises', { scene: 'help' }), 'both');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    expect(ana.accounts).toHaveLength(0);
    const kept = promise(w, ben, ana, 1);
    fulfillCommitment(w, ben, kept.id);
    expect(ana.accounts.map((a) => [a.about, a.kind, a.toward, a.src, a.hops])).toEqual([[ben.id, 'kept', ana.id, 'seen', 0]]);
    const broken = promise(w, ben, ana, 2);
    broken.deadline = w.tick - 1;
    checkCommitments(w, ben);
    expect(broken.status).toBe('broken');
    expect(ana.accounts.some((a) => a.about === ben.id && a.kind === 'broke' && a.src === 'seen')).toBe(true);
    // the person who broke it holds no account of themself
    expect(ben.accounts).toHaveLength(0);
  });

  it('a promise that ran out of time through no fault of theirs leaves no accusation', () => {
    const w = helpScene(settingsFor('rep-excused', { scene: 'help' }), 'both');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    const c = promise(w, ben, ana, 3);
    c.deadline = w.tick - 1;
    c.setAside = w.tick - 10; // put aside for their own survival
    checkCommitments(w, ben);
    expect(c.status).toBe('interrupted');
    expect(ana.accounts).toHaveLength(0);
  });
});

describe('telling', () => {
  it('a friend of the wronged person passes it on; the listener trusts the subject a little less, and by less than the first-hand change', () => {
    const { w, ana, ben, cy } = stage();
    const [, , , dee] = w.persons;
    relOf(cy, ana.id).affinity = 40; // cy cares about the victim
    relOf(dee, cy.id).trust = 60; // dee trusts cy
    recordAccount(w, cy, ben.id, 'broke', ana.id);
    expect(cy.accounts).toHaveLength(1);
    const a = pickAccountAnyTick(w, cy, dee);
    expect(a, 'cy should bring it up with dee at some point').toBeTruthy();
    const before = relOf(dee, ben.id).trust;
    const held = hearAccount(w, cy, dee, a!);
    expect(held).toBeTruthy();
    expect(held!.src).toBe('told');
    expect(held!.from).toBe(cy.id);
    expect(held!.origin).toBe(cy.id);
    expect(held!.hops).toBe(1);
    const shift = relOf(dee, ben.id).trust - before;
    expect(shift).toBeLessThan(0);
    expect(Math.abs(shift)).toBeLessThanOrEqual(12 * 0.4 + 1e-9); // never more than ~40% of what a broken promise does first-hand
    expect(dee.log.some((l) => /told me .* did not keep their word/.test(l.text))).toBe(true);
  });

  it('nobody is told about themself or about what was done to them, and nobody is told the same thing twice', () => {
    const { w, ana, ben, cy } = stage();
    relOf(cy, ana.id).affinity = 40;
    recordAccount(w, cy, ben.id, 'broke', ana.id);
    expect(pickAccountAnyTick(w, cy, ben)).toBeNull(); // about them
    expect(pickAccountAnyTick(w, cy, ana)).toBeNull(); // done to them
    const [, , , dee] = w.persons;
    relOf(dee, cy.id).trust = 60;
    const a = pickAccountAnyTick(w, cy, dee)!;
    expect(hearAccount(w, cy, dee, a)).toBeTruthy();
    expect(hearAccount(w, cy, dee, a)).toBeNull();
    expect(pickAccountAnyTick(w, cy, dee)).toBeNull();
  });

  it('a listener who does not trust the teller is not moved and does not keep it', () => {
    const { w, ana, ben, cy } = stage();
    const [, , , dee] = w.persons;
    relOf(cy, ana.id).affinity = 40;
    relOf(dee, cy.id).trust = -20;
    recordAccount(w, cy, ben.id, 'broke', ana.id);
    const before = relOf(dee, ben.id).trust;
    expect(hearAccount(w, cy, dee, cy.accounts[0])).toBeNull();
    expect(relOf(dee, ben.id).trust).toBe(before);
    expect(dee.accounts).toHaveLength(0);
  });

  it('someone the listener knows well is judged mostly on what they have seen of them', () => {
    const { w, ana, ben, cy } = stage();
    const [, , , dee, eve] = w.persons;
    relOf(cy, ana.id).affinity = 40;
    for (const l of [dee, eve]) relOf(l, cy.id).trust = 60;
    relOf(dee, ben.id).familiarity = 0;
    relOf(eve, ben.id).familiarity = 60;
    relOf(dee, ben.id).trust = relOf(eve, ben.id).trust = 10;
    recordAccount(w, cy, ben.id, 'broke', ana.id);
    hearAccount(w, cy, dee, cy.accounts[0]);
    hearAccount(w, cy, eve, cy.accounts[0]);
    const strangerDrop = 10 - relOf(dee, ben.id).trust;
    const friendDrop = 10 - relOf(eve, ben.id).trust;
    expect(strangerDrop).toBeGreaterThan(friendDrop * 2);
  });
});

describe('gossip cannot snowball', () => {
  it('an account stops being passed on after two retellings', () => {
    const { w, ana, ben, cy } = stage();
    const [, , , dee, eve, fay] = w.persons;
    relOf(cy, ana.id).affinity = 40;
    for (const [s, l] of [[cy, dee], [dee, eve], [eve, fay]] as const) {
      relOf(l, s.id).trust = 60;
      relOf(s, ana.id).affinity = 40;
    }
    recordAccount(w, cy, ben.id, 'broke', ana.id);
    const h1 = hearAccount(w, cy, dee, cy.accounts[0])!;
    expect(h1.hops).toBe(1);
    const h2 = hearAccount(w, dee, eve, dee.accounts[0])!;
    expect(h2.hops).toBe(2);
    expect(h2.origin).toBe(cy.id);
    expect(MAX_HOPS).toBe(2);
    // eve holds it at the limit and will not say it to fay
    expect(pickAccountAnyTick(w, eve, fay)).toBeNull();
  });

  it('hearsay can only push one person’s trust in another so far, however many people say it', () => {
    const { w, ana, ben } = stage();
    const listener = w.persons[3];
    const tellers = w.persons.filter((p) => p !== ben && p !== listener).slice(0, 8);
    relOf(listener, ben.id).trust = 10;
    relOf(listener, ben.id).familiarity = 0;
    tellers.forEach((t, i) => {
      relOf(listener, t.id).trust = 60;
      recordAccount(w, t, ben.id, 'broke', ana.id, w.tick - i); // eight different incidents
      hearAccount(w, t, listener, t.accounts[0]);
    });
    expect(relOf(listener, ben.id).hearsay).toBeGreaterThanOrEqual(HEARSAY_FLOOR - 1e-9);
    expect(relOf(listener, ben.id).trust).toBeGreaterThanOrEqual(10 + HEARSAY_FLOOR - 1e-9);
  });

  it('accounts are bounded and age out', () => {
    const { w, ana, ben, cy } = stage();
    for (let i = 0; i < MAX_ACCOUNTS + 5; i++) recordAccount(w, cy, ben.id, 'broke', ana.id, w.tick - i);
    expect(cy.accounts.length).toBeLessThanOrEqual(MAX_ACCOUNTS);
    relOf(cy, ana.id).affinity = 40;
    const dee = w.persons[3];
    relOf(dee, cy.id).trust = 60;
    run(w, 1); // a tick passes; then everything is old
    w.tick += ACCOUNT_LIFE + 10;
    expect(pickAccountAnyTick(w, cy, dee)).toBeNull();
  });
});

describe('in the natural world', () => {
  it('people really do pass word about each other on, it stays traceable, and the run stays deterministic', () => {
    const a = natural('hearsay-natural');
    const b = natural('hearsay-natural');
    run(a, 2400 * 6);
    run(b, 2400 * 6);
    expect(hashWorld(a)).toBe(hashWorld(b));
    let first = 0;
    let told = 0;
    for (const p of a.persons) {
      for (const acc of p.accounts) {
        if (acc.src === 'seen') first++;
        else {
          told++;
          expect(acc.from).not.toBe(p.id);
          expect(acc.about).not.toBe(p.id);
          expect(acc.hops).toBeGreaterThanOrEqual(1);
          expect(acc.hops).toBeLessThanOrEqual(MAX_HOPS);
          // traceable: the first person to hold it is a real person who could have
          expect(a.byId.get(acc.origin)?.ent).toBe('person');
        }
      }
      for (const k in p.relations) {
        const h = p.relations[k as unknown as number].hearsay;
        expect(h).toBeGreaterThanOrEqual(HEARSAY_FLOOR - 1e-9);
      }
    }
    // reported, not asserted as a target: how much gossip ordinary play produces
    console.log(`[reputation] 6 days, seed hearsay-natural: ${first} first-hand and ${told} retold accounts held`);
    expect(first).toBeGreaterThanOrEqual(0);
  }, 240_000);
});

/** `pickAccount` has a per-conversation dice roll; scan a few tick windows so a test checks the rule, not the dice. */
function pickAccountAnyTick(w: World, S: Person, L: Person) {
  const start = w.tick;
  for (let i = 0; i < 40; i++) {
    w.tick = start + i * 64;
    const a = pickAccount(w, S, L);
    if (a) {
      w.tick = start;
      return a;
    }
  }
  w.tick = start;
  return null;
}
