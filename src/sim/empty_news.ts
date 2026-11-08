// Rules 174: a strictly newer empty sighting of a food place can correct a positive belief without the
// ordinary 200-tick gap. An older or equal-time empty report cannot. A received report stays hearsay.
// Direct regrowth still replaces a stale empty memory through observe/learn, which already accepts an
// equal or newer personal sighting.
import { runsRulesVersion } from './rulesversion';
import type { Belief, Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed). Off restores the 200-tick gap inside a rules-174 rich world. */
export const emptyCorrectionOn = (): boolean => enabled;
export function setEmptyCorrection(on: boolean): void { enabled = on; }
export const hasEmptyCorrection = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 174);

export function isFoodKind(kind: Belief['kind']): boolean {
  return kind === 'berry_bush' || kind === 'fruit_tree' || kind === 'wild_grain' || kind === 'fish_spot';
}

export function isEmptyFood(b: Belief): boolean {
  return isFoodKind(b.kind) && b.amount <= 0;
}

/** Whether a report should replace an existing belief. The comparison is the original observation time, not when it was received. */
export function acceptsToldReport(world: World, incoming: Belief, old: Belief): boolean {
  if (hasEmptyCorrection(world) && isEmptyFood(incoming) && old.amount > 0 && incoming.seen > old.seen) return true;
  return incoming.seen > old.seen + 200;
}

/** How long a successful telling, or one rejected empty attempt, keeps that report from being offered again. */
export const TELL_COOLDOWN = 3500;

let deliveryEnabled = true;
/** Lab switch (never saved or hashed). Off restores the plain telling cooldown inside a rules-175 rich world. */
export const correctionDeliveryOn = (): boolean => deliveryEnabled;
export function setCorrectionDelivery(on: boolean): void { deliveryEnabled = on; }
export const hasCorrectionDelivery = (w: World): boolean => deliveryEnabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 175);

export function toldKey(listenerId: number, beliefId: number): number {
  return listenerId * 1_000_000 + beliefId;
}

export function tracksFoodDelivery(world: World, b: Belief): boolean {
  return hasCorrectionDelivery(world) && isFoodKind(b.kind);
}

/**
 * Speaker-side selection. The listener's beliefs are not readable here.
 * A newer empty observation can pass the cooldown of an older successful telling of that place.
 * The same rejected observation cannot be offered again inside the cooldown.
 * A telling recorded before this record existed cannot prove that the observation is newer, so its cooldown stands.
 */
export function tellingSuppressed(world: World, speaker: Person, listenerId: number, b: Belief): boolean {
  const key = toldKey(listenerId, b.id);
  if (!hasCorrectionDelivery(world)) {
    const at = speaker.told[key];
    return at !== undefined && world.tick - at < TELL_COOLDOWN;
  }
  const held = speaker.newsHeld?.[key];
  if (held && held.seen === b.seen && world.tick - held.tick < TELL_COOLDOWN) return true;
  const at = speaker.told[key];
  if (at !== undefined && world.tick - at < TELL_COOLDOWN) {
    const toldSeen = speaker.newsTold?.[key];
    if (isEmptyFood(b) && toldSeen !== undefined && b.seen > toldSeen) return false;
    return true;
  }
  return false;
}

function clearHeld(speaker: Person, key: number): void {
  if (!speaker.newsHeld || speaker.newsHeld[key] === undefined) return;
  delete speaker.newsHeld[key];
  if (Object.keys(speaker.newsHeld).length === 0) delete speaker.newsHeld;
}

/** Record a food report that the listener accepted. The observation time is what a later correction has to beat. */
export function noteFoodAccepted(world: World, speaker: Person, listenerId: number, b: Belief): void {
  if (!tracksFoodDelivery(world, b)) return;
  const key = toldKey(listenerId, b.id);
  speaker.told[key] = world.tick;
  (speaker.newsTold ??= {})[key] = b.seen;
  clearHeld(speaker, key);
}

/** A refused empty report is not a successful delivery. Remembering the attempt stops it filling the news again at once. */
export function noteEmptyRejected(world: World, speaker: Person, listenerId: number, b: Belief): void {
  if (!tracksFoodDelivery(world, b) || !isEmptyFood(b)) return;
  const key = toldKey(listenerId, b.id);
  (speaker.newsHeld ??= {})[key] = { tick: world.tick, seen: b.seen };
}

export function validateEmptyNews(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, 175);
  const whole = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
  const keyOk = (k: string) => /^\d+$/.test(k) && whole(Number(k), 0, Number.MAX_SAFE_INTEGER);
  const check = (rec: unknown, valueOk: (v: unknown) => boolean) => {
    if (rec === undefined) return;
    if (!allowed || rec === null || typeof rec !== 'object' || Array.isArray(rec)) throw new Error('Invalid empty-food telling record');
    const keys = Object.keys(rec as object);
    if (keys.length === 0) throw new Error('Invalid empty-food telling record');
    for (const k of keys) {
      if (!keyOk(k) || !valueOk((rec as Record<string, unknown>)[k])) throw new Error('Invalid empty-food telling record');
    }
  };
  for (const p of w.persons) {
    check(p.newsTold, (v) => whole(v, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER));
    check(p.newsHeld, (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
      const o = v as Record<string, unknown>;
      return Object.keys(o).length === 2 && whole(o.tick, 0, w.tick) && whole(o.seen, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    });
  }
}
