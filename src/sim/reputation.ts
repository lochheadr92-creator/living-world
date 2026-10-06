import { DAY } from './constants';
import { addLog } from './events';
import { hashUnit } from './rng';
import { peekRel, relOf, trustOf } from './relations';
import type { Account, AccountKind, Person, World } from './types';
import { clamp } from './util';

/**
 * Hearsay about people.
 *
 * An account exists only because the holder was the person it happened to, watched it happen, or was told by someone who had an
 * account of it. It keeps the original event's time, who it was about, who it was done to, who first had it and how many mouths it
 * has passed through. Nothing is invented: every account comes from a promise that was really kept or broken, or a gift that
 * really changed hands.
 *
 * A listener who believes the teller shifts their trust in the subject a little. Hearsay is deliberately weaker than experience
 * (never more than ~40% of the matching first-hand change), is discounted by how well the listener already knows the subject and
 * by how little they trust the teller, stops after two retellings, ages out, and is capped per pair so gossip cannot snowball.
 */

export const MAX_ACCOUNTS = 10;
export const ACCOUNT_LIFE = DAY * 3;
/** an account is passed on at most this many times (the witness is hop 0; a listener who heard it at hop 2 keeps it to themself) */
export const MAX_HOPS = 2;
/** how far hearsay can have moved one person's trust in another, summed (negative = darkened) */
export const HEARSAY_FLOOR = -15;
export const HEARSAY_CEIL = 9;

interface Effect {
  trust: number;
  aff: number;
}
const EFFECT: Record<AccountKind, Effect> = {
  broke: { trust: -4.5, aff: -1.8 },
  kept: { trust: 1.2, aff: 0.4 },
  gave: { trust: 1.8, aff: 0.8 },
  // a quarrel is less clear-cut than a broken promise: each side tells it their way, so it counts for less
  quarreled: { trust: -2.5, aff: -1.2 },
};

const VERB: Record<AccountKind, string> = { broke: 'did not keep their word', kept: 'kept their word', gave: 'was generous', quarreled: 'quarrelled' };

function personOf(world: World, id: number): Person | null {
  const e = world.byId.get(id);
  return e && e.ent === 'person' && e.alive ? e : null;
}

const sameEvent = (a: Account, b: { about: number; kind: AccountKind; toward: number; at: number }): boolean =>
  a.about === b.about && a.kind === b.kind && a.toward === b.toward && a.at === b.at;

function keep(p: Person, a: Account): void {
  p.accounts.push(a);
  if (p.accounts.length > MAX_ACCOUNTS) {
    p.accounts.sort((x, y) => y.at - x.at);
    p.accounts.length = MAX_ACCOUNTS;
  }
}

/** The holder lived through, or watched, something `about` did to `toward`. */
export function recordAccount(world: World, holder: Person, about: number, kind: AccountKind, toward: number, at = world.tick): void {
  if (holder.id === about) return;
  const ev = { about, kind, toward, at };
  if (holder.accounts.some((a) => sameEvent(a, ev))) return;
  keep(holder, { ...ev, src: 'seen', from: holder.id, origin: holder.id, hops: 0 });
}

/** What would the speaker say about someone, to this listener? Null when there is nothing they would bring up. */
export function pickAccount(world: World, S: Person, L: Person): Account | null {
  let best: Account | null = null;
  let bestScore = 0;
  for (const a of S.accounts) {
    if (a.hops >= MAX_HOPS) continue;
    if (world.tick - a.at > ACCOUNT_LIFE) continue;
    if (a.about === L.id || a.toward === L.id || a.about === S.id) continue; // they know their own part
    if (L.accounts.some((x) => sameEvent(x, a))) continue;
    if (!personOf(world, a.about)) continue;
    const toSubject = peekRel(S, a.about)?.affinity ?? 0;
    const toVictim = a.toward === S.id ? 100 : (peekRel(S, a.toward)?.affinity ?? 0);
    const victimKin = a.toward === S.id || !!peekRel(S, a.toward)?.kin || personOf(world, a.toward)?.hhId === S.hhId;
    // a grievance is brought up by someone who cares about who was wronged, or who already thinks ill of the subject;
    // praise is brought up by someone who likes the subject
    let motive = 0;
    if (a.kind === 'broke' || a.kind === 'quarreled') motive = (victimKin || toVictim >= 12 ? 2 : 0) + (toSubject <= -10 ? 1.5 : 0);
    else motive = toSubject >= 15 ? 2 : 0;
    if (motive <= 0) continue;
    const fresh = 1 - (world.tick - a.at) / ACCOUNT_LIFE;
    const score = motive + fresh + hashUnit(S.id, a.about, a.at) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  if (!best) return null;
  // not every conversation touches on it
  if (hashUnit(S.id, L.id, (world.tick >> 6) + best.at) >= 0.55) return null;
  return best;
}

/**
 * The listener hears it. Returns the account as the listener now holds it, or null if they did not take it in
 * (already knew it, did not trust the teller enough to be moved by it, or it would push the pair past the hearsay cap).
 */
export function hearAccount(world: World, S: Person, L: Person, a: Account): Account | null {
  if (L.accounts.some((x) => sameEvent(x, a))) return null;
  const subject = personOf(world, a.about);
  if (!subject) return null;
  const credibility = clamp((trustOf(L, S.id) - 8) / 52, 0, 1);
  if (credibility < 0.15) return null; // they do not take it from someone they do not trust
  const r = relOf(L, a.about);
  const know = 1 - clamp(r.familiarity / 40, 0, 0.7); // someone they know well is judged on what they have seen of them
  const fresh = 1 - 0.5 * ((world.tick - a.at) / ACCOUNT_LIFE);
  const e = EFFECT[a.kind];
  const scale = credibility * know * fresh;
  const want = e.trust * scale;
  const room = clamp(r.hearsay + want, HEARSAY_FLOOR, HEARSAY_CEIL) - r.hearsay;
  if (Math.abs(room) < 0.05) return null; // already as far as hearsay can push them
  const share = want === 0 ? 0 : room / want;
  r.trust = clamp(r.trust + room, -100, 100);
  r.affinity = clamp(r.affinity + e.aff * scale * share, -100, 100);
  r.hearsay += room;
  r.history.push({ tick: world.tick, text: `${S.name} said ${subject.name} ${VERB[a.kind]}` });
  if (r.history.length > 24) r.history.shift();
  const held: Account = { about: a.about, kind: a.kind, toward: a.toward, at: a.at, src: 'told', from: S.id, origin: a.origin, hops: a.hops + 1 };
  keep(L, held);
  const victim = a.toward === S.id ? 'them' : (personOf(world, a.toward)?.name ?? 'someone');
  const what =
    a.kind === 'broke' ? `did not keep their word to ${victim}` : a.kind === 'kept' ? `kept their word to ${victim}` : a.kind === 'quarreled' ? `had words with ${victim}` : `was generous to ${victim}`;
  addLog(world, L, 'social', `${S.name} told me ${subject.name} ${what}.`);
  return held;
}

export const accountWords = (kind: AccountKind): string => VERB[kind];
