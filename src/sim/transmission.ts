// Stage 4 diagnostics: what actually passes between people, recorded where it actually happens.
//
// This module observes and nothing else. It follows the conventions of probe.ts: module-level, off by default, never part of
// `World`, a save or the state hash; it draws no random numbers, reads no clock, writes no log, bubble, event or relation, and
// changes no decision or belief. A run with it on and a run with it off are the same run to the last field of the saved state
// (tests/transmission.test.ts holds that, including the generator's own state).
//
// It records three things, at the boundaries named in the Stage 4 plan (docs/EMERGENCE.md):
//
//  * CONTACTS - the occasions on which two people were actually in company, by channel: a conversation that really opened, a
//    hall pair actually drawn for gossip, a meal invitation actually answered, a greeting actually exchanged, and the diners who
//    actually ate together. A proximity check is not a contact, an invitation is not attendance.
//  * OFFERS - a logical offer of one belief from one person to another. One offer per offer, whatever the API underneath does:
//    `ask_info` calls `tellBelief` AND then writes with `learn` itself, and that is ONE offer with two writes, not two offers.
//  * WHAT THE OFFER DID - classified from the listener's own belief before and after, not from the return value, because
//    `tellBelief` returns false for a refusal and `learn` returns false for a refresh. The five outcomes are distinguished:
//    inserted, refreshed, provenance (a same-timestamp rewrite that moved only `from`/`origin`/`hops`/`src`), redundant (a write
//    that changed nothing at all) and rejected (the offer was refused and nothing was written).
//
// Cohorts, camps, overlap and every rate live in the runner (scripts/stage4.ts), not here: this file knows only ids and ticks.
import type { Belief, Person, World } from './types';

/** the channel an offer came through: the six places that call `tellBelief` */
export type OfferChannel = 'news' | 'hall' | 'ask_info' | 'warn' | 'recruit' | 'invite';
/** the channel a contact came through */
export type ContactChannel = 'conversation' | 'hall' | 'invitation' | 'greeting' | 'meal';

/**
 * What an offer did to the listener's knowledge.
 * - `inserted`   they had no belief with that id and now have one
 * - `refreshed`  they had one and the stored copy is strictly fresher than it was
 * - `provenance` the stored copy has the same `seen` but different provenance (`from`/`origin`/`hops`/`src`): NOT new knowledge
 * - `redundant`  a write happened and changed nothing observable
 * - `rejected`   the offer was refused (too stale to pass the freshness rule) and nothing was written
 */
export type OfferOutcome = 'inserted' | 'refreshed' | 'provenance' | 'redundant' | 'rejected';

export interface OfferRecord {
  tick: number;
  channel: OfferChannel;
  from: number;
  to: number;
  beliefId: number;
  kind: Belief['kind'];
  /** how old the offered copy was, and how old the listener's own copy was before the offer (null: they had none) */
  offeredSeen: number;
  heldSeen: number | null;
  /** what `tellBelief` returned - the API's own verdict, which is not the same as what was written */
  api: boolean;
  outcome: OfferOutcome;
  /** the offer wrote new or fresher knowledge although the API said no: the `ask_info` direct-learn path */
  bypass: boolean;
  /** provenance of the listener's copy after the offer, for the lineage measures */
  origin: number | null;
  hops: number | null;
}

export interface ContactRecord {
  tick: number;
  channel: ContactChannel;
  /** the unordered pair, smaller id first */
  a: number;
  b: number;
}

interface Store {
  on: boolean;
  offers: OfferRecord[];
  contacts: ContactRecord[];
  /** dedup keys already counted, per the plan's per-channel rule (one per conversation id and pair, per meal id and pair, …) */
  seen: Set<string>;
  /** offers whose boundary was entered but not left (a throw in the middle); kept so a leak is visible rather than silent */
  openOffers: number;
  /** belief writes seen since the current offer began: the difference between a refusal and a write that changed nothing */
  writes: number;
}

const store: Store = { on: false, offers: [], contacts: [], seen: new Set(), openOffers: 0, writes: 0 };

/** Turn the diagnostics on or off. Turning them on clears whatever was recorded before, so runs never bleed into each other. */
export function setTransmissionProbe(on: boolean): void {
  store.on = on;
  resetTransmissionProbe();
}

/** Forget everything recorded so far, leaving the switch as it is. */
export function resetTransmissionProbe(): void {
  store.offers = [];
  store.contacts = [];
  store.seen = new Set();
  store.openOffers = 0;
  store.writes = 0;
}

/** Switch off and clear: the teardown a runner or a test calls when it is done. */
export function teardownTransmissionProbe(): void {
  setTransmissionProbe(false);
}

export const transmissionOn = (): boolean => store.on;

/** What has been recorded. The arrays are the live ones: a reader that keeps them should copy. */
export function transmissionData(): { offers: OfferRecord[]; contacts: ContactRecord[]; openOffers: number } {
  return { offers: store.offers, contacts: store.contacts, openOffers: store.openOffers };
}

/**
 * Every actual write of a belief, reported by the one funnel they all go through (knowledge.ts putBelief). It is what tells a
 * refusal - where nothing was written at all - from a write that happened and changed nothing.
 */
export function noteBeliefWrite(): void {
  if (store.on) store.writes++;
}

/**
 * One occasion on which two people were actually in company. `key` is what makes it one occasion rather than many: the
 * conversation's id, the hall and the tick, the meal's id. The same key twice is the same occasion and is not counted again.
 */
export function noteContact(world: World, channel: ContactChannel, aId: number, bId: number, key: string | number): void {
  if (!store.on || aId === bId) return;
  const a = Math.min(aId, bId);
  const b = Math.max(aId, bId);
  const k = `${channel}|${key}|${a}|${b}`;
  if (store.seen.has(k)) return;
  store.seen.add(k);
  store.contacts.push({ tick: world.tick, channel, a, b });
}

interface Held {
  seen: number;
  src: Belief['src'];
  from: number | undefined;
  origin: number | undefined;
  hops: number | undefined;
}
const snapshot = (p: Person, id: number): Held | null => {
  const b = p.beliefs[id];
  return b ? { seen: b.seen, src: b.src, from: b.from, origin: b.origin, hops: b.hops } : null;
};

function classify(before: Held | null, after: Held | null, writes: number): OfferOutcome {
  if (writes === 0) return 'rejected'; // the offer was refused: no copy was written at all
  if (!after) return 'rejected'; // nothing there afterwards either
  if (!before) return 'inserted';
  if (after.seen > before.seen) return 'refreshed';
  if (after.seen < before.seen) return 'redundant'; // an older copy cannot overwrite a newer one; recorded, never expected
  const moved = after.src !== before.src || after.from !== before.from || after.origin !== before.origin || after.hops !== before.hops;
  return moved ? 'provenance' : 'redundant';
}

/**
 * One logical offer of one belief, around the call (or calls) that carry it. `run` does the actual telling and returns what the
 * API said; everything else is read from the listener's own beliefs before and after, so a write that happens outside the API's
 * verdict - the `ask_info` path, which calls `learn` itself whatever `tellBelief` returned - is seen for what it is.
 *
 * With the diagnostics off this is `return run()` and nothing else.
 */
export function observeOffer(world: World, channel: OfferChannel, S: Person, L: Person, b: Belief, run: () => boolean): boolean {
  if (!store.on) return run();
  const before = snapshot(L, b.id);
  const offeredSeen = b.seen;
  const kind = b.kind;
  const id = b.id;
  store.openOffers++;
  const writesBefore = store.writes;
  let api = false;
  try {
    api = run();
  } finally {
    const after = snapshot(L, id);
    const outcome = classify(before, after, store.writes - writesBefore);
    store.offers.push({
      tick: world.tick,
      channel,
      from: S.id,
      to: L.id,
      beliefId: id,
      kind,
      offeredSeen,
      heldSeen: before ? before.seen : null,
      api,
      outcome,
      bypass: !api && (outcome === 'inserted' || outcome === 'refreshed'),
      origin: after ? (after.origin ?? null) : null,
      hops: after ? (after.hops ?? null) : null,
    });
    store.openOffers--;
  }
  return api;
}
