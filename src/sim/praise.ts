// Rules 260 (the social scenes stream, bundle A, part 3 of `docs/SOCIAL_SCENES_PLAN.md`): public praise. Somebody a wolf was driven off thanks
// their rescuer on the spot, and later speaks up for them in company; the builders of a shared building are thanked in company.
//
// What stood before: a rescue wrote a log line and a thought for the one rescued (defence.ts resolve), a finished building credited its finisher
// and gave the people who helped a thought (buildings.ts, achievement.ts). Nobody was ever thanked for either, in words or in company.
//
// One part, `praise` (switched in meeting.ts). From rules 260:
//
//   on the spot  A rescue, whichever way it ended (the wolf driven off or killed), of somebody who is alive and is not the rescuer: if they are
//                within 8 tiles they say a thanks at once; they become fonder of the rescuer (affinity +10, trust +6) and the rescuer a little
//                of them (+3); everybody awake who could see it holds it first-hand as a story of a `brave` deed (reputation.ts, weighted as a
//                `generous` one, the rules-183 sight of who could see); and the one rescued holds one thanks owed (`Person.thanksOwed`: whom,
//                since when, at most three, each lapsing three days after, a lapse written nowhere).
//   in company   At the half-way point of an evening fire sitting, and on arriving at an occasion that has begun (not a funeral), somebody
//                holding a thanks owed, whom it is owed to is there within 6 tiles with at least two others, says it aloud ("I would not be here
//                but for P"), and it is cleared. At the fire it takes the place of a story told by that person for that sitting. It is written
//                ("At the fire Q thanked P before 5 people for driving off a wolf") and kept by the chronicle. Each of the others hears it as a
//                story from Q (heard, one mouth on) and grows fonder of P by 2; P is glad of it for two days and Q and P each grow fonder by 2.
//   a building   When `completeSite` finishes a building that is for everyone (a workplace or hall with no owner) the building records
//                `thanksDue` (the tick), cleared when spoken or three days later. At the same two moments somebody who is not one of its builders,
//                and who holds a belief of it, with a builder there within 6 tiles and at least two others, thanks the builders who are present: up
//                to three by name, then "and the others who built it" if there are more. Written ("At the fire D thanked A, B and C for the new
//                kiln"), once for the building; each builder present is glad of it for two days; the others hear it as a `reliable` story about
//                each builder named, from the speaker, and grow fonder of them by 1.5.
//   which first  At one sitting or arrival a thanks owed for a rescue comes before one for a building, and only one is spoken.
//
// The simplification, plainly: the one who thanks the builders is taken to know who built a shared building they have seen. The builders
// are on the building's own record (`builtBy`), and a speaker is not asked how they came to know it. Only builders who are there are named.
//
// Nothing here reads anybody's true state beyond that record and the rescue itself. Rich worlds at rules 260 and later only; rules 257 and
// earlier, authored worlds and a part switched off keep the old behaviour. Saved: Person.thanksOwed, Building.thanksDue.
import { BUILD_DEF, DAY } from './constants';
import { addEvent, addLog, say } from './events';
import * as D from './dialogue';
import { sittersAt } from './evening_fire';
import { presentAt } from './market_contact';
import { MEETING_FROM, hasPraise } from './meeting';
import { think } from './mood';
import { adjustRel } from './relations';
import { hearStory, noteDeedNear } from './reputation';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Building, Occasion, Person, World } from './types';
import { hyp } from './util';

// ── on the spot ──
/** how near the one rescued must be to say a thanks at once */
export const SPOT_RANGE = 8;
export const SPOT_AFFINITY = 10;
export const SPOT_TRUST = 6;
export const RESCUER_AFFINITY = 3;
// ── a thanks owed ──
/** the most thanks one person holds owed, and how long each lasts */
export const OWED_MAX = 3;
export const OWED_LIFE = 3 * DAY;
// ── in company ──
/** how near the one thanked (or a builder) must be to the speaker, and the fewest others there */
export const COMPANY_NEAR = 6;
export const COMPANY_MIN = 2;
/** what saying it does: the pair each grow fonder by this, a listener grows fonder of the one rescued by this and of a builder named by this */
export const SPOKEN_AFFINITY = 2;
export const LISTENER_AFFINITY_RESCUE = 2;
export const LISTENER_AFFINITY_BUILDER = 1.5;
/** the glad thought of the one thanked in company, and how long it lasts */
export const GLAD = 5;
export const GLAD_FOR = 2 * DAY;
/** the most builders named */
export const NAMES_MAX = 3;

const wolfStory = (P: Person, Q: Person, killed: boolean): string => (killed ? `${P.name} killed a wolf that was after ${Q.name}` : `${P.name} drove a wolf off ${Q.name}`);

/**
 * A rescue has been carried out (defence.ts resolve): P drove a wolf off Q, or killed one that was after Q. Q is thanked for nothing yet:
 * they say a thanks at once if they are near, grow fonder, and hold the rest owed; those who saw it hold it as a brave deed.
 */
export function thankRescuer(w: World, P: Person, Q: Person, killed: boolean): void {
  if (!hasPraise(w) || !Q.alive || Q.id === P.id) return;
  if (hyp(Q.x - P.x, Q.y - P.y) <= SPOT_RANGE) say(w, Q, D.saying(D.THANKS, Q.id, P.id, w.tick >> 5, { n: P.name }), 'happy', 56);
  adjustRel(Q, P.id, w.tick, { aff: SPOT_AFFINITY, trust: SPOT_TRUST, note: killed ? `${P.name} killed the wolf that was after me` : `${P.name} drove the wolf off me` });
  adjustRel(P, Q.id, w.tick, { aff: RESCUER_AFFINITY });
  noteDeedNear(w, P, 'brave', wolfStory(P, Q, killed), P.x, P.y);
  const owed = (Q.thanksOwed ?? []).filter((o) => o.to !== P.id);
  owed.push({ to: P.id, since: w.tick, ...(killed ? { killed: true as const } : {}) });
  while (owed.length > OWED_MAX) owed.shift();
  Q.thanksOwed = owed;
}

/** A finished building that is for everyone is due its builders' thanks (buildings.ts completeSite). */
export function noteThanksDue(w: World, b: Building, forEveryone: boolean): void {
  if (!hasPraise(w) || !forEveryone || !(b.builtBy?.length)) return;
  b.thanksDue = w.tick;
}

/** Clear what has lapsed: a thanks owed, or due, is kept three days. Writes nothing. */
export function praiseTick(w: World): void {
  if (w.settings.dynamics !== 'rich' || !runsRulesVersion(w, MEETING_FROM)) return;
  for (const p of w.persons) {
    if (!p.thanksOwed) continue;
    const kept = p.thanksOwed.filter((o) => w.tick - o.since < OWED_LIFE);
    if (kept.length) p.thanksOwed = kept;
    else delete p.thanksOwed;
  }
  for (const b of w.buildings) if (b.thanksDue !== undefined && w.tick - b.thanksDue >= OWED_LIFE) delete b.thanksDue;
}

// ───────────────────────── in company ─────────────────────────
const names = (list: string[]): string => (list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

/**
 * `speaker` is in company at `label` ("the fire", "the wedding feast") with `present` (everybody else there, alive). If they hold a thanks owed to
 * somebody who is there, or the builders of a shared building they know are, and there are enough others to say it before, they say it. One
 * thanks at most; a rescue before a building. Returns true if one was spoken.
 */
export function speakThanks(w: World, speaker: Person, label: string, present: Person[]): boolean {
  if (!hasPraise(w) || !speaker.alive) return false;
  const near = (q: Person): boolean => hyp(q.x - speaker.x, q.y - speaker.y) <= COMPANY_NEAR;
  // a thanks for a rescue
  for (const o of speaker.thanksOwed ?? []) {
    if (w.tick - o.since >= OWED_LIFE) continue;
    const P = present.find((x) => x.id === o.to);
    if (!P || !near(P)) continue;
    const listeners = present.filter((x) => x.id !== P.id);
    if (listeners.length < COMPANY_MIN) continue;
    const story = wolfStory(P, speaker, !!o.killed);
    say(w, speaker, `I would not be here but for ${P.name}.`, 'say', 120);
    addEvent(w, 'social', `At ${label} ${speaker.name} thanked ${P.name} before ${listeners.length} people for ${o.killed ? 'killing' : 'driving off'} a wolf.`, [speaker.id, P.id, ...listeners.map((l) => l.id)], speaker.x, speaker.y);
    for (const l of listeners) {
      adjustRel(l, P.id, w.tick, { aff: LISTENER_AFFINITY_RESCUE, note: `${speaker.name} thanked ${P.name} before us` });
      hearStory(w, speaker, l, P, 'brave', story, o.since);
    }
    think(w, P, 'thanked', GLAD, GLAD_FOR, `${speaker.name} thanked me before everyone`);
    adjustRel(P, speaker.id, w.tick, { aff: SPOKEN_AFFINITY });
    adjustRel(speaker, P.id, w.tick, { aff: SPOKEN_AFFINITY });
    addLog(w, speaker, 'social', `Thanked ${P.name} before ${listeners.length} people for the wolf.`);
    addLog(w, P, 'social', `${speaker.name} thanked me before ${listeners.length} people.`);
    const kept = (speaker.thanksOwed ?? []).filter((x) => x !== o);
    if (kept.length) speaker.thanksOwed = kept;
    else delete speaker.thanksOwed;
    return true;
  }
  // a thanks for a building
  const due = w.buildings.filter((b) => b.thanksDue !== undefined && w.tick - b.thanksDue < OWED_LIFE).sort((a, b) => a.thanksDue! - b.thanksDue! || a.id - b.id);
  for (const b of due) {
    const builders = b.builtBy ?? [];
    if (builders.includes(speaker.id) || !speaker.beliefs[b.id]) continue;
    const there = present.filter((x) => builders.includes(x.id) && near(x));
    if (!there.length) continue;
    const listeners = present.filter((x) => !there.includes(x));
    if (listeners.length < COMPANY_MIN) continue;
    const named = there.slice(0, NAMES_MAX);
    const who = names([...named.map((x) => x.name), ...(builders.length > named.length ? ['the others who built it'] : [])]);
    const label2 = BUILD_DEF[b.type].label;
    say(w, speaker, `Thank you, ${who}, for the ${label2}.`, 'say', 120);
    addEvent(w, 'social', `At ${label} ${speaker.name} thanked ${who} for the new ${label2}.`, [speaker.id, ...there.map((x) => x.id), ...listeners.map((l) => l.id)], speaker.x, speaker.y);
    for (const x of there) think(w, x, 'thanked', GLAD, GLAD_FOR, `${speaker.name} thanked the builders of the ${label2}`);
    for (const l of listeners) for (const x of named) {
      adjustRel(l, x.id, w.tick, { aff: LISTENER_AFFINITY_BUILDER, note: `${speaker.name} thanked ${x.name} for the ${label2}` });
      hearStory(w, speaker, l, x, 'reliable', `${x.name} helped build the ${label2}`, b.built ?? b.thanksDue!);
    }
    addLog(w, speaker, 'social', `Thanked ${who} for the new ${label2}.`);
    delete b.thanksDue;
    return true;
  }
  return false;
}

/** The half-way point of an evening fire sitting: a thanks owed or due is spoken here, and that is the sitting's story (evening_fire.ts tellStory is not told). */
export function praiseAtFire(w: World, p: Person, a: Activity): boolean {
  if (!hasPraise(w) || a.progress !== Math.floor(a.duration / 2) || (!p.thanksOwed && !w.buildings.some((b) => b.thanksDue !== undefined))) return false;
  const fire = w.byId.get(a.data.fireId as number);
  if (!fire || fire.ent !== 'building') return false;
  return speakThanks(w, p, 'the fire', sittersAt(w, fire, p.id));
}

/** Somebody has just arrived at an occasion that has begun (occasions.ts arrive): those there, in the place, are who they speak before. */
export function praiseAtOccasion(w: World, p: Person, o: Occasion, label: string): boolean {
  if (!hasPraise(w) || o.kind === 'funeral' || o.status !== 'gathering' || (!p.thanksOwed && !w.buildings.some((b) => b.thanksDue !== undefined))) return false;
  if (!presentAt(w, p, o)) return false;
  const present: Person[] = [];
  for (const id of o.attended) {
    const q = w.byId.get(id);
    if (id !== p.id && q && q.ent === 'person' && q.alive && presentAt(w, q, o)) present.push(q);
  }
  return speakThanks(w, p, label, present);
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 260, rich only); anything else is refused on loading. */
export function validatePraise(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, MEETING_FROM);
  const fresh = (since: unknown): boolean => Number.isSafeInteger(since) && (since as number) >= 0 && (since as number) <= w.tick && w.tick - (since as number) <= OWED_LIFE + 600;
  for (const p of w.persons) {
    if (p.thanksOwed === undefined) continue;
    const list = p.thanksOwed;
    if (!allowed || !Array.isArray(list) || list.length < 1 || list.length > OWED_MAX || list.some((o) => !o || !Number.isSafeInteger(o.to) || o.to <= 0 || !fresh(o.since) || (o.killed !== undefined && o.killed !== true)) || new Set(list.map((o) => o.to)).size !== list.length) throw new Error('Invalid thanks owed');
  }
  for (const b of w.buildings) if (b.thanksDue !== undefined && (!allowed || !fresh(b.thanksDue) || !(b.builtBy?.length))) throw new Error('Invalid thanks due');
}
