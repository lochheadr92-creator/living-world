// Stage 4 diagnostics (src/sim/transmission.ts): they must see what really happened, and change nothing by looking.
//
// Two kinds of test here. The first is the inertness contract: a world run with the diagnostics on and the same world run with
// them off must be the same world, field for field, including the generator's own state - because an observation that perturbs
// the thing observed is worse than no observation. The second is the accounting contract, on staged corners where the answer is
// known by construction: what `tellBelief` says, what was actually written, and the `ask_info` path that writes twice for one
// offer and must be counted once.
import { afterEach, describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { learn, observe, putBelief } from '../src/sim/knowledge';
import { tellBelief } from '../src/sim/news';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import {
  noteContact,
  observeOffer,
  resetTransmissionProbe,
  setTransmissionProbe,
  teardownTransmissionProbe,
  transmissionData,
  transmissionOn,
} from '../src/sim/transmission';
import { currentWorldSettings } from '../src/sim/profiles';
import { createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import type { Belief, Person, World } from '../src/sim/types';
import { legacySaveText } from './helpers/golden';
import { settingsFor } from './helpers/util';

afterEach(() => teardownTransmissionProbe());

/** two people side by side, and a bush that only one of them has seen */
function pair(seed: string) {
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich' }));
  const rng = new RNG(5);
  const S = testKit.addPerson(w, rng, { name: 'Sal', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const L = testKit.addPerson(w, rng, { name: 'Lee', x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const bush = makeSource(w, 'berry_bush', 44, 44, 12);
  testKit.finish(w, 'natural');
  observe(w, S, bush);
  delete L.beliefs[bush.id];
  return { w, S, L, bush, belief: () => S.beliefs[bush.id] };
}

describe('the diagnostics change nothing by looking', () => {
  it('a world runs identically with them on and off, to the last field and the generator state', () => {
    const run = (on: boolean) => {
      setTransmissionProbe(on);
      const w = createWorld(currentWorldSettings('large', 'probe-inert', { immigration: false }));
      for (let i = 0; i < 600; i++) stepWorld(w);
      const text = legacySaveText(w);
      teardownTransmissionProbe();
      return text;
    };
    const off = run(false);
    const on = run(true);
    expect(on).toBe(off);
  }, 180_000);

  it('records nothing at all while off, and starts clean when switched on', () => {
    const { w, S, L, belief } = pair('probe-off');
    expect(transmissionOn()).toBe(false);
    observeOffer(w, 'news', S, L, belief(), () => tellBelief(w, S, L, belief()));
    noteContact(w, 'greeting', S.id, L.id, 1);
    expect(transmissionData().offers).toHaveLength(0);
    expect(transmissionData().contacts).toHaveLength(0);
    setTransmissionProbe(true);
    expect(transmissionData().offers).toHaveLength(0);
  });

  it('is torn down and reset between runs, so one run never shows up in the next', () => {
    const { w, S, L } = pair('probe-reset');
    setTransmissionProbe(true);
    noteContact(w, 'greeting', S.id, L.id, 1);
    expect(transmissionData().contacts).toHaveLength(1);
    resetTransmissionProbe();
    expect(transmissionData().contacts).toHaveLength(0);
    noteContact(w, 'greeting', S.id, L.id, 1);
    expect(transmissionData().contacts).toHaveLength(1);
    teardownTransmissionProbe();
    expect(transmissionOn()).toBe(false);
    expect(transmissionData().contacts).toHaveLength(0);
  });

  it('leaves no offer open, even when the telling throws', () => {
    const { w, S, L, belief } = pair('probe-throw');
    setTransmissionProbe(true);
    expect(() =>
      observeOffer(w, 'news', S, L, belief(), () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(transmissionData().openOffers).toBe(0);
    expect(transmissionData().offers, 'the attempt is still recorded, as a refusal').toHaveLength(1);
  });
});

describe('what an offer did, read from the listener and not from the return value', () => {
  it('a belief they did not have is an insertion, and the API agrees', () => {
    const { w, S, L, belief } = pair('probe-insert');
    setTransmissionProbe(true);
    const api = observeOffer(w, 'news', S, L, belief(), () => tellBelief(w, S, L, belief()));
    const [o] = transmissionData().offers;
    expect(api).toBe(true);
    expect(o).toMatchObject({ channel: 'news', from: S.id, to: L.id, api: true, outcome: 'inserted', bypass: false, heldSeen: null });
    expect(o.hops, 'and the copy they now hold is one hop from its observer').toBe(1);
  });

  it('a strictly fresher copy of what they have is a refresh', () => {
    const { w, S, L, bush, belief } = pair('probe-refresh');
    putBelief(L, { ...belief(), seen: belief().seen - 500 });
    setTransmissionProbe(true);
    const api = observeOffer(w, 'news', S, L, belief(), () => tellBelief(w, S, L, belief()));
    expect(api).toBe(true);
    expect(transmissionData().offers[0]).toMatchObject({ outcome: 'refreshed', api: true, bypass: false });
    expect(L.beliefs[bush.id].seen).toBe(belief().seen);
  });

  it('news they already have as fresh is rejected, and nothing is written', () => {
    const { w, S, L, bush, belief } = pair('probe-reject');
    putBelief(L, { ...belief() });
    const before = JSON.stringify(L.beliefs[bush.id]);
    setTransmissionProbe(true);
    const api = observeOffer(w, 'news', S, L, belief(), () => tellBelief(w, S, L, belief()));
    expect(api, 'tellBelief refuses: not fresh enough').toBe(false);
    expect(transmissionData().offers[0]).toMatchObject({ outcome: 'rejected', api: false, bypass: false });
    expect(JSON.stringify(L.beliefs[bush.id]), 'their copy is untouched').toBe(before);
  });

  it('a same-moment rewrite that moves only where it came from is provenance, never new knowledge', () => {
    const { w, S, L, bush, belief } = pair('probe-provenance');
    putBelief(L, { ...belief(), src: 'seen', from: L.id, origin: L.id, hops: 0 });
    setTransmissionProbe(true);
    // the same `seen`, so nothing is learned; only `from`/`origin`/`hops`/`src` move
    observeOffer(w, 'news', S, L, belief(), () => {
      learn(L, { ...belief(), src: 'told', from: S.id, learned: w.tick, origin: S.id, hops: 1 });
      return false;
    });
    const [o] = transmissionData().offers;
    expect(o.outcome).toBe('provenance');
    expect(o.bypass, 'provenance is not a new-or-fresher write').toBe(false);
    expect(L.beliefs[bush.id].seen).toBe(belief().seen);
  });

  it('a write that changes nothing at all is redundant', () => {
    const { w, S, L, belief } = pair('probe-redundant');
    putBelief(L, { ...belief(), src: 'told', from: S.id, origin: S.id, hops: 1 });
    setTransmissionProbe(true);
    observeOffer(w, 'news', S, L, belief(), () => {
      learn(L, { ...belief(), src: 'told', from: S.id, learned: w.tick, origin: S.id, hops: 1 });
      return false;
    });
    expect(transmissionData().offers[0]).toMatchObject({ outcome: 'redundant', bypass: false });
  });
});

describe('the ask_info path: one offer, two writes', () => {
  it('counts one offer and sees the write that happens past the API refusal', () => {
    const { w, S, L, bush, belief } = pair('probe-askinfo');
    // they hold a copy of the same age: tellBelief will refuse, and ask_info's own learn writes anyway
    putBelief(L, { ...belief(), src: 'seen', from: L.id, origin: L.id, hops: 0, seen: belief().seen - 100 });
    setTransmissionProbe(true);
    const api = observeOffer(w, 'ask_info', S, L, belief(), () => {
      const told = tellBelief(w, S, L, belief());
      learn(L, { ...belief(), src: 'told', from: S.id, learned: w.tick, origin: belief().origin ?? S.id, hops: (belief().hops ?? 0) + 1 });
      return told;
    });
    const offers = transmissionData().offers;
    expect(offers, 'two writes, one offer').toHaveLength(1);
    expect(api, 'the API refused: 100 ticks is inside its 200-tick threshold').toBe(false);
    expect(offers[0]).toMatchObject({ channel: 'ask_info', outcome: 'refreshed', api: false, bypass: true });
    expect(L.beliefs[bush.id].seen, 'and the listener really did get the fresher copy').toBe(belief().seen);
  });

  it('the real ask_info boundary is instrumented, not bypassed', async () => {
    // the module must route its two writes through one observed offer; this is a guard against the hook being dropped
    const src = await import('node:fs').then((fs) => fs.readFileSync('src/sim/social.ts', 'utf8'));
    // the branch that actually answers an ask_info request is the one that looks a belief up (there are other `ask_info` cases)
    const at = src.indexOf('answerInfo(world, B, A');
    expect(at, 'the branch that answers an information request exists').toBeGreaterThan(0);
    const block = src.slice(at, at + 900);
    expect(block).toContain("observeOffer(world, 'ask_info'");
    expect(block.indexOf('tellBelief(world'), 'the call is inside the observed offer').toBeGreaterThan(block.indexOf('observeOffer'));
    expect(block.indexOf('learn(A,'), 'and so is the direct learn').toBeGreaterThan(block.indexOf('observeOffer'));
    expect(block.indexOf('});'), 'both of them inside the one offer').toBeGreaterThan(block.indexOf('learn(A,'));
  });
});

describe('contacts are occasions, counted once', () => {
  it('the same occasion twice is one contact, a different occasion is another', () => {
    const { w, S, L } = pair('probe-contact');
    setTransmissionProbe(true);
    noteContact(w, 'conversation', S.id, L.id, 77);
    noteContact(w, 'conversation', L.id, S.id, 77); // the same conversation, the other way round
    expect(transmissionData().contacts).toHaveLength(1);
    noteContact(w, 'conversation', S.id, L.id, 78);
    expect(transmissionData().contacts).toHaveLength(2);
  });

  it('keeps the channels apart, and never counts somebody with themselves', () => {
    const { w, S, L } = pair('probe-channels');
    setTransmissionProbe(true);
    noteContact(w, 'conversation', S.id, L.id, 1);
    noteContact(w, 'meal', S.id, L.id, 1);
    noteContact(w, 'greeting', S.id, L.id, 1);
    noteContact(w, 'invitation', S.id, L.id, 1);
    noteContact(w, 'hall', S.id, L.id, 1);
    noteContact(w, 'meal', S.id, S.id, 1);
    const kinds = transmissionData().contacts.map((c) => c.channel).sort();
    expect(kinds).toEqual(['conversation', 'greeting', 'hall', 'invitation', 'meal']);
    expect(transmissionData().contacts.every((c) => c.a < c.b), 'pairs are unordered, smaller id first').toBe(true);
  });

  it('every delivery path the plan names is instrumented at its own boundary', async () => {
    const fs = await import('node:fs');
    const social = fs.readFileSync('src/sim/social.ts', 'utf8');
    const meals = fs.readFileSync('src/sim/meals.ts', 'utf8');
    // the six places that offer a belief
    for (const ch of ['news', 'ask_info', 'warn', 'recruit']) expect(social, ch).toContain(`observeOffer(world, '${ch}'`);
    for (const ch of ['hall', 'invite']) expect(meals, ch).toContain(`observeOffer(world, '${ch}'`);
    // the five contact channels
    expect(social).toContain("noteContact(world, 'conversation'");
    expect(social).toContain("noteContact(world, 'greeting'");
    expect(meals).toContain("noteContact(world, 'hall'");
    expect(meals).toContain("noteContact(world, 'invitation'");
    expect(meals).toContain("noteContact(world, 'meal'");
    // and no call to tellBelief anywhere is left outside an observed offer
    for (const src of [social, meals]) {
      for (const m of src.matchAll(/tellBelief\(world/g)) {
        const near = src.slice(Math.max(0, m.index - 320), m.index);
        expect(near.includes('observeOffer(world'), `an unobserved tellBelief at ${m.index}: ${src.slice(m.index - 80, m.index + 60)}`).toBe(true);
      }
    }
  });
});
