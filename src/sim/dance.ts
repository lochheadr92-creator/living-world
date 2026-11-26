// Rules 262 (the social scenes stream, bundle C, part 7b of `docs/SOCIAL_SCENES_PLAN.md`): a dance at a feast. At a wedding, a feast or a harvest feast with four
// or more there, those in good spirits walk a small ring round the place for about 120 ticks, and then stand as before.
//
// What stood before: whoever went to an occasion (occasions.ts, the 'attend' handler) stood facing the place for 90 to 240 ticks. Nothing in the simulation
// moved a person round a point, and there is no dance pose: a dancer is drawn walking, which is what they are doing.
//
// One part, `dance` (switched in company_scenes.ts, with `song`, song.ts, and `reunion`, reunion.ts). From rules 262:
//
//   who      At a wedding, a feast (a naming feast too) or a harvest feast that has begun (never a funeral, never a market), when four or more are there at once (in
//            the place, in work at it: occasions.ts attend), each person there in good spirits (company_scenes.ts inGoodSpirits), fed, watered and not worn out or
//            hurt, who has not danced here yet, may begin. Looked at every fifth tick, so a person is in the ring a few ticks after the fourth arrives. Gatherings
//            are big (twenty and more at a wedding), and a ring two tiles across holds eight, so no more than DANCERS_MAX (8) dance at one occasion: of those there
//            who are fit to dance, the eight of the lowest ids, by a sort that reads nothing but their ids. The rest stand as they did.
//   daylight It is held only in daylight, or when the place is within the wolf's safe distance of a lit fire (hardship.ts wolfNerve `fire`, 4 tiles): after dark away from
//            a fire people outdoors and apart can be picked by a wolf. Looked at every tick: a dance under way stops when the light goes and no fire is near.
//   the ring A dancer keeps a count of their own steps in the activity's data (`dance`: ticks danced, the angle on the ring, its radius): it is NOT the attend activity's
//            progress, which is not touched, so the time they stay at the occasion is exactly what it was. The ring is round the place's centre at a radius of half the
//            footprint's diagonal and 0.8 more, and every point of it is within DANCE_REACH (2) tiles of the footprint. Each tick of six in ten they step along it
//            (DANCE_STEP tiles of ring, at a walking pace), every tick they are inside that reach on open ground, or the dance is over for them where they stand. They
//            are put there by direct steps, not by a path, so nothing resets: arriving at a spot would restart an activity (activities.ts beginWork). The activity's
//            label says "Dancing at the ..." while it lasts, and the pose is the walking one.
//   counts   After DANCE_LINE_AT ticks a person has "danced here": the want of company eased by DANCE_SOCIAL, glad for half a day (DANCE_GLAD), and fonder of and
//            better acquainted with each other dancer then in the ring within 6 tiles (as the song). Two unpartnered dancers who pass the conditions for walking out
//            together (courting.ts mayWalkOutTogether, both ways) gain the fondness, trust and familiarity of ONE counted walk (courting's GAIN_*), once, but it is not a
//            walk: `Relation.courted` is not touched. Only with the courting part on.
//   feed     One line for an occasion, when the second person has danced long enough here: "People danced at the wedding feast for A and B." (the occasion's own words).
//
// Nothing here reads anybody's true state: the dancers are those at the place, the mood their own. No draw from the shared stream is made. Saved: Occasion.dance (who
// has begun, at most 8, how many have danced long enough to count, and whether the line is written) and the dancer's own record in the activity's data (`dance`). Rich worlds at rules 262 and later only; rules
// 261 and earlier, authored worlds and a part switched off keep the old behaviour.
import { DAY } from './constants';
import { isDark } from './environment';
import { addEvent, addLog } from './events';
import { COMPANY_FROM, hasDance, inGoodSpirits } from './company_scenes';
import { GAIN_AFFINITY, GAIN_FAMILIARITY, GAIN_TRUST, mayWalkOutTogether } from './courting';
import { moveSpeed } from './activities';
import { hasCourting } from './meeting';
import { wolfNerve } from './hardship';
import { presentAt } from './market_contact';
import { think } from './mood';
import { nearLitFire } from './perception';
import { distToFootprint, isWalkable } from './registry';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import { T } from './types';
import type { Activity, Occasion, Person, World } from './types';
import { hyp } from './util';

/** the occasions that dance: a wedding, a feast and a harvest feast; never a funeral, never a market */
export const DANCE_KINDS: readonly Occasion['kind'][] = ['wedding', 'feast', 'harvest'];
/** at least this many there at once; and at most this many dance at one occasion (gatherings are big, a ring two tiles across holds eight: the first eight in good spirits, lowest id first) */
export const DANCE_PRESENT_MIN = 4;
export const DANCERS_MAX = 8;
/** how long one person dances, and how many ticks of it make "has danced here" */
export const DANCE_TICKS = 120;
export const DANCE_LINE_AT = 24;
/** the ring stays this near the place's footprint, and is this much outside the footprint's half-diagonal */
export const DANCE_REACH = 2;
export const DANCE_RING_OUT = 0.8;
/** a stepping tick moves the dancer this far along the ring; they step on this many ticks of every DANCE_CYCLE (the rest they stand) */
export const DANCE_STEP = 0.06;
export const DANCE_STEP_TICKS = 6;
export const DANCE_CYCLE = 10;
/** a pace no faster than this share of a walk */
export const DANCE_PACE = 0.8;
/** how often a person who is not dancing yet looks at whether to begin (ticks) */
export const DANCE_LOOK = 5;
/** what the needs must be for a dance: fed, watered and not worn out; and the health */
export const DANCE_NEED_MIN = 30;
export const DANCE_ENERGY_MIN = 20;
export const DANCE_HEALTH_MIN = 60;
/** what it does for those who have danced: want of company eased, glad for half a day, fonder and better acquainted with each other dancer within DANCE_PAIR_NEAR */
export const DANCE_SOCIAL = 6;
export const DANCE_GLAD = 3;
export const DANCE_GLAD_FOR = DAY / 2;
export const DANCE_AFFINITY = 1.5;
export const DANCE_FAMILIARITY = 0.5;
export const DANCE_PAIR_NEAR = 6;

/** a dancer's own record, in the activity's data */
export interface DanceData {
  /** ticks danced so far */
  n: number;
  /** where on the ring they are (radians), and the ring's radius */
  ang: number;
  r: number;
  /** a stepping tick (the pose is the walking one); absent while they stand */
  moving?: true;
  /** over for them (their time, or they had to stop): they stand as before */
  done?: true;
}

const danceOf = (a: Activity | null | undefined): DanceData | undefined => (a && a.kind === 'attend' ? (a.data.dance as DanceData | undefined) : undefined);
export const isDancing = (a: Activity | null | undefined): boolean => {
  const d = danceOf(a);
  return !!d && !d.done;
};
/** the attend handler's pose: walking while stepping, standing otherwise */
export const dancePose = (a: Activity): 'walk' | 'stand' => (danceOf(a)?.moving ? 'walk' : 'stand');

/** daylight, or the place within the safe distance of a lit fire */
export function safeToDance(w: World, o: Occasion): boolean {
  return !isDark(w) || !!nearLitFire(w, o.x, o.y, wolfNerve(w).fire);
}

/** who is there now: at the place, in work at this occasion's attend, within its distance (occasions.ts presentAt) */
function thereNow(w: World, o: Occasion): Person[] {
  const out: Person[] = [];
  for (const id of o.attended) {
    const q = w.byId.get(id);
    if (!q || q.ent !== 'person' || !q.alive || q.activity?.kind !== 'attend' || q.activity.phase !== 'work' || q.activity.data.occasion !== o.id || !presentAt(w, q, o)) continue;
    out.push(q);
  }
  return out;
}

/** open ground a dancer may stand on, within reach of the place's footprint */
function standable(w: World, o: Occasion, x: number, y: number): boolean {
  const place = w.byId.get(o.placeId);
  if (!place || place.ent !== 'building') return false;
  const tx = Math.floor(x), ty = Math.floor(y);
  return isWalkable(w, tx, ty) && w.terrain[ty * w.W + tx] !== T.SHALLOW && distToFootprint(place, x, y) <= DANCE_REACH;
}

/**
 * One tick of an attender's time at an occasion that has begun (occasions.ts attend work; `label` is the occasion's own words for itself, `namesOf` gives who it is
 * for). A dancer under way steps; anybody else may begin. Writes nothing unless the second dancer has danced long enough.
 */
export function danceStep(w: World, p: Person, a: Activity, o: Occasion, label: string, namesOf: () => string): void {
  if (!hasDance(w) || !DANCE_KINDS.includes(o.kind)) return;
  const d = danceOf(a);
  if (d) {
    if (!d.done) keepDancing(w, p, a, o, d, label, namesOf);
    return;
  }
  if ((w.tick + p.id) % DANCE_LOOK === 0 && a.phase === 'work' && a.progress >= 3) begin(w, p, a, o, label);
}

function begin(w: World, p: Person, a: Activity, o: Occasion, label: string): boolean {
  if (o.status !== 'gathering' || !safeToDance(w, o) || !fitToDance(w, p, o)) return false;
  const by = o.dance?.by ?? [];
  if (by.includes(p.id) || by.length >= DANCERS_MAX) return false;
  const place = w.byId.get(o.placeId);
  const there = thereNow(w, o);
  if (!place || place.ent !== 'building' || there.length < DANCE_PRESENT_MIN) return false;
  // the ring holds eight: of those there who are fit to dance, the eight of the lowest ids (those who have begun are counted in `by`, and the ring is closed at eight)
  const fit = there.filter((q) => fitToDance(w, q, o)).sort((x, y) => x.id - y.id).slice(0, DANCERS_MAX);
  if (!fit.includes(p)) return false;
  (o.dance ??= { by: [] }).by.push(p.id);
  a.data.dance = { n: 0, ang: Math.atan2(p.y - o.y, p.x - o.x), r: hyp(place.w, place.h) / 2 + DANCE_RING_OUT } as DanceData;
  a.label = `Dancing at the ${label}`;
  return true;
}

/** in good spirits, fed, watered, not worn out or hurt, at the place and on open ground within reach of it */
function fitToDance(w: World, p: Person, o: Occasion): boolean {
  const n = p.needs;
  return presentAt(w, p, o) && inGoodSpirits(p) && n.hunger >= DANCE_NEED_MIN && n.thirst >= DANCE_NEED_MIN && n.energy >= DANCE_ENERGY_MIN && p.health >= DANCE_HEALTH_MIN && !p.injury && standable(w, o, p.x, p.y);
}

function stop(a: Activity, d: DanceData, label: string): void {
  d.done = true;
  delete d.moving;
  a.label = `At the ${label}`;
}

function keepDancing(w: World, p: Person, a: Activity, o: Occasion, d: DanceData, label: string, namesOf: () => string): void {
  // the light, the place, their own state: any of them gone and the dance is over where they stand
  const n = p.needs;
  if (!safeToDance(w, o) || o.status !== 'gathering' || p.pose === 'sleep' || p.indoors || n.hunger < DANCE_NEED_MIN || n.thirst < DANCE_NEED_MIN || n.energy < DANCE_ENERGY_MIN || p.health < DANCE_HEALTH_MIN) {
    stop(a, d, label);
    return;
  }
  d.n++;
  if (d.n % DANCE_CYCLE < DANCE_STEP_TICKS) {
    d.ang += DANCE_STEP / d.r;
    if (d.ang > Math.PI) d.ang -= 2 * Math.PI;
    const tx = o.x + Math.cos(d.ang) * d.r, ty = o.y + Math.sin(d.ang) * d.r;
    const dist = hyp(tx - p.x, ty - p.y);
    const step = Math.min(dist, moveSpeed(w, p) * DANCE_PACE);
    const nx = dist > 1e-6 ? p.x + ((tx - p.x) / dist) * step : p.x;
    const ny = dist > 1e-6 ? p.y + ((ty - p.y) / dist) * step : p.y;
    if (!standable(w, o, nx, ny)) {
      stop(a, d, label);
      return;
    }
    if (dist > 1e-6) p.heading = Math.atan2(ty - p.y, tx - p.x);
    p.x = nx;
    p.y = ny;
    d.moving = true;
  } else delete d.moving;
  if (d.n === DANCE_LINE_AT) danced(w, p, o, label, namesOf);
  if (d.n >= DANCE_TICKS) stop(a, d, label);
}

/** a person has now danced here for DANCE_LINE_AT ticks: what it does for them, for the others in the ring, and the one line when it is the second */
function danced(w: World, p: Person, o: Occasion, label: string, namesOf: () => string): void {
  const rec = (o.dance ??= { by: [p.id] });
  // the others in the ring who have already danced long enough (so each pair is seen once, by the later of the two) and are near
  const ring = rec.by.map((id) => w.byId.get(id)).filter((q): q is Person => !!q && q.ent === 'person' && q !== p && q.alive && isDancing(q.activity) && (danceOf(q.activity)?.n ?? 0) >= DANCE_LINE_AT && hyp(q.x - p.x, q.y - p.y) <= DANCE_PAIR_NEAR);
  rec.steady = (rec.steady ?? 0) + 1;
  p.needs.social = Math.min(100, p.needs.social + DANCE_SOCIAL);
  think(w, p, 'danced', DANCE_GLAD, DANCE_GLAD_FOR, `danced at the ${label}`);
  addLog(w, p, 'social', `Danced at the ${label}.`);
  for (const q of ring) {
    adjustRel(p, q.id, w.tick, { aff: DANCE_AFFINITY, fam: DANCE_FAMILIARITY });
    adjustRel(q, p.id, w.tick, { aff: DANCE_AFFINITY, fam: DANCE_FAMILIARITY });
    // two who might walk out together gain what one walk gives, and no walk is counted (Relation.courted is not touched)
    if (hasCourting(w) && mayWalkOutTogether(w, p, q)) {
      adjustRel(p, q.id, w.tick, { aff: GAIN_AFFINITY, trust: GAIN_TRUST, fam: GAIN_FAMILIARITY, note: `danced with ${q.name}` });
      adjustRel(q, p.id, w.tick, { aff: GAIN_AFFINITY, trust: GAIN_TRUST, fam: GAIN_FAMILIARITY, note: `danced with ${p.name}` });
    }
  }
  if (!rec.line && rec.steady >= 2) {
    rec.line = true;
    const names = namesOf();
    addEvent(w, 'social', `People danced at the ${label}${names ? ` for ${names}` : ''}.`, [...rec.by, ...o.about.filter((id) => !rec.by.includes(id))], o.x, o.y);
  }
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 262, rich only); anything else is refused on loading. */
export function validateDance(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, COMPANY_FROM);
  for (const o of w.occasions ?? []) {
    const r = o.dance;
    if (r === undefined) continue;
    if (!allowed || !DANCE_KINDS.includes(o.kind) || !r || !Array.isArray(r.by) || r.by.length < 1 || r.by.length > DANCERS_MAX || r.by.some((n) => !Number.isSafeInteger(n) || n <= 0) || new Set(r.by).size !== r.by.length || (r.steady !== undefined && (!Number.isSafeInteger(r.steady) || r.steady < 1 || r.steady > r.by.length)) || (r.line !== undefined && (r.line !== true || (r.steady ?? 0) < 2))) throw new Error('Invalid dance record');
  }
  for (const p of w.persons) {
    for (const a of [p.activity, p.suspended]) {
      if (!a || a.data.dance === undefined) continue;
      const d = a.data.dance as DanceData;
      if (!allowed || a.kind !== 'attend' || !d || !Number.isSafeInteger(d.n) || d.n < 0 || d.n > DANCE_TICKS || !Number.isFinite(d.ang) || Math.abs(d.ang) > 7 || !Number.isFinite(d.r) || d.r < 0.5 || d.r > 8 || (d.moving !== undefined && d.moving !== true) || (d.done !== undefined && d.done !== true)) throw new Error('Invalid dance');
    }
  }
}
