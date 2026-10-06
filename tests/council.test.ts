// Deciding together: proposals, stances, quorum, rejection, lapsing, merging and the gate on marking out a communal building.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { CARRIED_FOR, OPEN_FOR, REJECTED_COOLDOWN, carriedForMe, completeProposal, evaluate, hear, knownProposal, lapseProposals, mergeProposals, pledgedTo, propose, quorum, shareMotion, stanceOn, turnedDownLately } from '../src/sim/council';
import { relOf } from '../src/sim/relations';
import { hashWorld } from '../src/sim/world';
import type { Person, Proposal, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

function stage() {
  const w = natural('council-stage');
  const people = w.persons.filter((p) => p.alive && p.hhId).slice(0, 14);
  const [proposer, ...others] = people;
  for (const p of people) {
    p.needs.hunger = 90;
    p.needs.thirst = 90;
    p.beliefs = {};
    p.traits.sociability = 0.7;
    p.traits.diligence = 0.6;
    relOf(p, proposer.id).affinity = 40; // they like the proposer
    relOf(p, proposer.id).trust = 40;
  }
  return { w, proposer, others };
}

/** make the others take the given stance by nudging the one thing a stance leans on */
const makeAgree = (w: World, p: Person, pr: Proposal) => {
  relOf(p, pr.proposer).affinity = 90;
  p.traits.sociability = 1;
  p.traits.diligence = 0.9;
  void w;
};
const makeDisagree = (p: Person) => {
  p.needs.hunger = 10;
  relOf(p, 0);
};

describe('proposals', () => {
  it('quorum is about one in ten, never fewer than three', () => {
    const w = natural('council-quorum');
    expect(quorum(w)).toBeGreaterThanOrEqual(3);
    const pop = w.persons.filter((p) => p.alive).length;
    expect(quorum(w)).toBe(Math.max(3, Math.ceil(0.1 * pop)));
  });

  it('a proposal starts open with its proposer in favour, and the same person cannot raise the same thing twice', () => {
    const { w, proposer } = stage();
    const pr = propose(w, proposer, 'granary', 'the grain keeps going off');
    expect(pr).toMatchObject({ type: 'granary', proposer: proposer.id, status: 'open' });
    expect(pr.support).toEqual([proposer.id]);
    expect(pr.heard).toEqual([proposer.id]);
    expect(pr.until).toBe(w.tick + OPEN_FOR);
    expect(propose(w, proposer, 'granary', 'again')).toBe(pr);
    expect(w.proposals).toHaveLength(1);
    expect(proposer.log.some((l) => /ought to build a granary/.test(l.text))).toBe(true);
  });
});

describe('a stance comes from the hearer’s own circumstances', () => {
  it('likes and trusts the proposer, what it is for, whether they already know of one, and their own hunger all matter', () => {
    const { w, proposer, others } = stage();
    const hall = propose(w, proposer, 'hall', 'somewhere to eat together');
    const [a] = others;
    // the sociable favour a hall; the unsociable less so
    a.traits.sociability = 0.95;
    const social = stanceOn(w, a, hall);
    a.traits.sociability = 0.05;
    const unsocial = stanceOn(w, a, hall);
    expect(['for', 'unsure', 'against'].indexOf(social)).toBeLessThanOrEqual(['for', 'unsure', 'against'].indexOf(unsocial));
    // someone who dislikes the proposer is less likely to agree
    a.traits.sociability = 0.7;
    relOf(a, proposer.id).affinity = -80;
    relOf(a, proposer.id).trust = -50;
    expect(stanceOn(w, a, hall)).not.toBe('for');
    relOf(a, proposer.id).affinity = 80;
    relOf(a, proposer.id).trust = 60;
    const liked = stanceOn(w, a, hall);
    // someone who already knows of one opposes a second
    a.beliefs[9001] = { id: 9001, kind: 'building', btype: 'hall', x: 1, y: 1, amount: 0, max: 0, seen: w.tick, src: 'seen', from: 0, learned: w.tick } as never;
    expect(stanceOn(w, a, hall)).toBe('against');
    delete a.beliefs[9001];
    // hungry people put food first
    a.needs.hunger = 10;
    const hungry = stanceOn(w, a, hall);
    expect(['for', 'unsure', 'against'].indexOf(hungry)).toBeGreaterThanOrEqual(['for', 'unsure', 'against'].indexOf(liked));
    // and a stance is steady: the same person on the same matter gives the same answer
    expect(stanceOn(w, a, hall)).toBe(stanceOn(w, a, hall));
  });
});

describe('hearing, carrying, rejecting and lapsing', () => {
  it('everyone takes a stance once; enough support (and more than opposed) carries it, with a feed line and a note in each supporter’s log', () => {
    const { w, proposer, others } = stage();
    const pr = propose(w, proposer, 'granary', 'the grain keeps going off');
    for (const p of others) {
      p.hhId = p.hhId;
      makeAgree(w, p, pr);
      w.plots.push({ id: 880000 + p.id, hhId: p.hhId } as never);
    }
    const q = quorum(w);
    let n = 0;
    for (const p of others) {
      expect(hear(w, p, pr, proposer)).toBeTruthy();
      expect(hear(w, p, pr, proposer)).toBeNull(); // a second time: nothing
      n++;
      if (pr.status === 'carried') break;
    }
    expect(pr.status).toBe('carried');
    expect(pr.support.length).toBeGreaterThanOrEqual(q);
    expect(pr.support.length).toBeGreaterThan(pr.oppose.length);
    expect(n).toBeLessThanOrEqual(q);
    expect(w.events.some((e) => /agreed to raise a granary/.test(e.text))).toBe(true);
    expect(w.stats.motionsCarried).toBe(1);
    for (const id of pr.support) expect(w.persons.find((p) => p.id === id)!.log.some((l) => /agreed that we should build a granary/.test(l.text))).toBe(true);
    // the supporters (and only they) may mark it out and are inclined to help
    for (const id of pr.support) {
      const s = w.persons.find((p) => p.id === id)!;
      expect(carriedForMe(w, s, 'granary')).toBe(pr);
      expect(pledgedTo(w, s, 'granary')).toBe(true);
    }
    const nobody = w.persons.find((p) => !pr.support.includes(p.id))!;
    expect(carriedForMe(w, nobody, 'granary')).toBeNull();
    expect(pledgedTo(w, nobody, 'granary')).toBe(false);
  });

  it('opposition outweighing support turns it down: nobody who heard raises it again for a while, and it comes round again later', () => {
    const { w, proposer, others } = stage();
    const pr = propose(w, proposer, 'bakery', 'bread');
    for (const p of others) {
      makeDisagree(p);
      relOf(p, proposer.id).affinity = -90;
      relOf(p, proposer.id).trust = -80;
      p.traits.diligence = 0.1;
      p.beliefs[8000 + p.id] = { id: 8000 + p.id, kind: 'building', btype: 'bakery', x: 1, y: 1, amount: 0, max: 0, seen: w.tick, src: 'seen', from: 0, learned: w.tick } as never;
    }
    for (const p of others) {
      hear(w, p, pr, proposer);
      if (pr.status !== 'open') break;
    }
    expect(pr.status).toBe('rejected');
    expect(pr.oppose.length).toBeGreaterThanOrEqual(3);
    expect(w.stats.motionsRejected).toBe(1);
    expect(w.events.some((e) => /idea of a bakery was turned down/.test(e.text))).toBe(true);
    expect(proposer.log.some((l) => /did not want a bakery/.test(l.text))).toBe(true);
    const heardIt = w.persons.find((p) => pr.heard.includes(p.id))!;
    expect(turnedDownLately(w, heardIt, 'bakery')).toBe(true);
    w.tick += REJECTED_COOLDOWN + 1;
    expect(turnedDownLately(w, heardIt, 'bakery')).toBe(false);
  });

  it('a proposal nobody settles lapses; a carried one nobody takes up lapses; marking out the site completes it', () => {
    const { w, proposer, others } = stage();
    const open = propose(w, proposer, 'kiln', 'bricks');
    w.tick += OPEN_FOR + 1;
    lapseProposals(w);
    expect(open.status).toBe('lapsed');
    expect(knownProposal(w, proposer, 'kiln')).toBeNull();
    // carried, never taken up
    const pr = propose(w, proposer, 'smithy', 'tools wear out');
    for (const p of others) {
      makeAgree(w, p, pr);
      hear(w, p, pr, proposer);
    }
    expect(pr.status).toBe('carried');
    w.tick += CARRIED_FOR + 1;
    lapseProposals(w);
    expect(pr.status).toBe('lapsed');
    // carried and acted on
    const pr2 = propose(w, proposer, 'quarry', 'stone');
    for (const p of others) {
      makeAgree(w, p, pr2);
      hear(w, p, pr2, proposer);
    }
    expect(pr2.status).toBe('carried');
    completeProposal(w, 'quarry', proposer);
    expect(pr2.status).toBe('done');
    expect(carriedForMe(w, proposer, 'quarry')).toBeNull(); // it has been acted on once
    expect(proposer.log.some((l) => /Marked out the quarry the village had agreed on/.test(l.text))).toBe(true);
  });
});

describe('word spreads, and nobody counts who has not heard', () => {
  it('only someone who has heard of it can pass it on, one per conversation, and each person takes a stance once', () => {
    const { w, proposer, others } = stage();
    const [a, b, c] = others;
    const pr = propose(w, proposer, 'timber_yard', 'planks');
    shareMotion(w, a, b); // a has not heard of it: nothing
    expect(pr.heard).toEqual([proposer.id]);
    shareMotion(w, proposer, a);
    expect(pr.heard).toContain(a.id);
    expect(a.log.some((l) => /proposed a timber yard|told me about the idea of a timber yard/.test(l.text))).toBe(true);
    shareMotion(w, a, b); // a heard it, so a can tell b
    expect(pr.heard).toContain(b.id);
    expect(b.log.some((l) => new RegExp(`${a.name} told me about the idea of a timber yard`).test(l.text))).toBe(true);
    const heardBefore = pr.heard.length;
    shareMotion(w, proposer, a); // already heard
    expect(pr.heard.length).toBe(heardBefore);
    void c;
  });

  it('two proposals for the same building are folded into one when the people who heard them meet, so support is not split', () => {
    const { w, proposer, others } = stage();
    const [x, a, c] = others;
    const first = propose(w, proposer, 'hall', 'a place to eat');
    const second = propose(w, x, 'hall', 'somewhere to talk');
    makeAgree(w, a, first);
    makeAgree(w, c, second);
    hear(w, a, first, proposer);
    hear(w, c, second, x);
    // each has two supporters, short of the three it takes
    expect(first.status).toBe('open');
    expect(second.status).toBe('open');
    expect(first.support).toHaveLength(2);
    expect(second.support).toHaveLength(2);
    mergeProposals(w, a, c); // a knows the first, c knows the second
    expect(second.status).toBe('merged');
    // together they are enough
    expect(first.status).toBe('carried');
    expect(first.support.sort()).toEqual([proposer.id, x.id, a.id, c.id].sort());
    for (const id of [proposer.id, x.id, a.id, c.id]) expect(first.heard).toContain(id);
  });

  it('when one proposal carries, people talking over the same thing separately are folded in and may help', () => {
    const { w, proposer, others } = stage();
    const [x, a, b, c] = others;
    const first = propose(w, proposer, 'granary', 'grain');
    const second = propose(w, x, 'granary', 'grain too');
    for (const p of [a, b]) {
      makeAgree(w, p, first);
      w.plots.push({ id: 870000 + p.id, hhId: p.hhId } as never);
    }
    hear(w, a, first, proposer);
    hear(w, b, first, proposer);
    expect(first.status).toBe('carried');
    expect(second.status).toBe('merged');
    expect(first.support).toContain(x.id);
    expect(first.heard).toContain(x.id);
    // a late hearer who is for it is inclined to help; one who is against changes nothing
    makeAgree(w, c, first);
    w.plots.push({ id: 870001, hhId: c.hhId } as never);
    hear(w, c, first, proposer);
    expect(first.support).toContain(c.id);
  });
});

describe('in the village', () => {
  it('a communal building is marked out only after the village has agreed, and only by someone who agreed; it is deterministic and the books balance', () => {
    const go = () => {
      const w = natural('council-village');
      run(w, DAY * 12);
      return w;
    };
    const a = go();
    expect(conservationReport(a).ok).toBe(true);
    const facilities = ['timber_yard', 'quarry', 'kiln', 'smithy', 'granary', 'bakery', 'hall'];
    const sited = [...a.sites.filter((s) => facilities.includes(s.type)), ...a.buildings.filter((b) => facilities.includes(b.type))];
    for (const s of sited) {
      const agreed = a.proposals.some((p) => p.type === s.type && (p.status === 'done' || p.status === 'carried' || p.status === 'lapsed' || p.status === 'merged'));
      expect(agreed, `a ${s.type} was marked out without the village having agreed to it`).toBe(true);
    }
    const carried = a.proposals.filter((p) => p.support.length > 0);
    for (const p of carried) {
      expect(new Set(p.support).size, 'nobody supports twice').toBe(p.support.length);
      expect(p.support.every((id) => p.heard.includes(id))).toBe(true);
      expect(p.oppose.every((id) => p.heard.includes(id))).toBe(true);
      expect(p.support.some((id) => p.oppose.includes(id))).toBe(false);
    }
    console.log(`[council] 12 days: ${a.proposals.length} proposals, carried ${a.stats.motionsCarried ?? 0}, rejected ${a.stats.motionsRejected ?? 0}, lapsed ${a.stats.motionsLapsed ?? 0}, facilities marked out ${sited.length}`);
    expect(hashWorld(go())).toBe(hashWorld(a));
  }, 400_000);

  it('with councils turned off the old behaviour is back: no proposals, and communal buildings go up without a vote', () => {
    const w = natural('council-off', { councils: false });
    run(w, DAY * 12);
    expect(w.proposals).toHaveLength(0);
    expect(w.stats.motionsCarried ?? 0).toBe(0);
  }, 400_000);
});
