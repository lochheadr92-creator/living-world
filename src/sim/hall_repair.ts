// Rules 281 (the hall repair, `docs/HALL.md`): the hall made worth going to. Ryan's word of 27 November 2026 ("build hall fix"), after the count of
// 26 and 27 November (C:\dev\lw_labs\community_use\summary.txt; C:\dev\lw_labs\free_time\r279): at rules 279 people of 12 and over spent 0.1% of waking
// time at or going to a hall; in aspen-day96 31 shared meals were called at a hall and none eaten; nobody went there outside a called gathering.
//
// Three separately switched parts (`rich-no-hall`, `rich-no-hall-news`, `rich-no-hall-table`, `rich-no-hall-evening`):
//
//   news     News is passed among those at a hall (meals.ts hallGossip): one telling every 90 ticks between two people within 4 tiles of its middle.
//            Before 281 its guard was tick % 90 === 17 inside mealTick, which runs only when tick % 10 === 3, so it could never run. From 281 the
//            guard is tick % 90 === 3, a tick mealTick does run on.
//   table    The spot a host or guest of a shared meal walks to is a tile they can stand on. The spot is the meal place's point with a spread (meals.ts
//            mealSpot), and at a hall it could fall on a tile nobody can stand on (a probe of aspen-day96 at 279: the host's spot (31,42) was not
//            walkable, the host "had to leave (no way to get there)", the guest waited out the window). From 281, when the spot's tile is not
//            walkable the nearest walkable tile within MEAL_SPOT_REACH is taken (rings in a fixed order; no draw).
//   evening  Beside the evening at the fire (evening_fire.ts, rules 216), an evening at a sound hall near home: the same free evening, once an evening
//            (the same cooldown, so one or the other), worth what the fire is worth, more for each person seen already there, and more again in
//            rain, storm or cold, as a gathering at the hall is (occasions.ts "out of the weather at the hall"). When it is finished it is company,
//            as at the fire. News passes there (part news); no story or song is told at the hall in this version.
//
// Nothing here reads what a person could not know but the walkability of the ground they would walk to, which the path-finder reads already. No draw;
// nothing saved but the sitting's own activity data. Rich worlds at rules 281 and later only.
import { newActivity, standSpotFor } from './activities';
import { DAY } from './constants';
import { FIRE_COMMIT, FIRE_COMPANY_MAX, FIRE_DRAW_EACH, FIRE_REACH, FIRE_SOCIAL, FIRE_SOCIAL_EACH, FIRE_TICKS, isEveningFor } from './evening_fire';
import { think } from './mood';
import { Scorer, addOption, beliefsByKind, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { isWalkable } from './registry';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Building, Person, World } from './types';
import { hyp } from './util';

export const HALL_FROM = 281;
const on = { news: true, table: true, evening: true };
export type HallPart = keyof typeof on;
export const HALL_PARTS = Object.keys(on) as HallPart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const hallPartOn = (part: HallPart): boolean => on[part];
export function setHall(enabled: boolean, part?: HallPart): void {
  if (part) on[part] = enabled;
  else for (const k of HALL_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: HallPart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, HALL_FROM);
export const hasHallNews = (w: World): boolean => partOn(w, 'news');
export const hasHallTable = (w: World): boolean => partOn(w, 'table');
export const hasHallEvening = (w: World): boolean => partOn(w, 'evening');

// ── news ──
/** The tick of each 90 on which news passes at a hall: 17 before 281 (never reached inside mealTick, which runs at tick % 10 === 3), 3 from 281. */
export const hallNewsPhase = (w: World): number => (hasHallNews(w) ? 3 : 17);

// ── table ──
/** how far (tiles) from a meal spot that cannot be stood on a walkable tile is looked for */
export const MEAL_SPOT_REACH = 3;
/** The meal spot, or (part table) the nearest walkable tile's middle within MEAL_SPOT_REACH, rings in a fixed order; the spot itself when none. */
export function standableMealSpot(w: World, spot: { x: number; y: number }): { x: number; y: number } {
  if (!hasHallTable(w)) return spot;
  const tx = Math.floor(spot.x), ty = Math.floor(spot.y);
  if (isWalkable(w, tx, ty)) return spot;
  for (let r = 1; r <= MEAL_SPOT_REACH; r++) {
    let best: { x: number; y: number; d: number } | null = null;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !isWalkable(w, tx + dx, ty + dy)) continue;
      const d = hyp(tx + dx + 0.5 - spot.x, ty + dy + 0.5 - spot.y);
      if (!best || d < best.d) best = { x: tx + dx + 0.5, y: ty + dy + 0.5, d };
    }
    if (best) return { x: best.x, y: best.y };
  }
  return spot;
}

// ── evening ──
/** a hall counts as sound enough to spend the evening in above this condition (the condition meals and occasions use) */
export const HALL_SOUND = 15;
/** how near a hall's middle a person must be to count as there (hallGossip's reach) */
export const AT_HALL = 4;
const sittingIn = (q: Person, hallId: number): boolean => q.alive && q.activity?.kind === 'wander' && q.activity.data.evening === 'hall' && q.activity.data.hallId === hallId;
export const isHallEvening = (a: Activity): boolean => a.data.evening === 'hall';
export function hallSitters(w: World, hall: Building, except: number): Person[] {
  const cx = hall.x + hall.w / 2, cy = hall.y + hall.h / 2;
  return w.persons.filter((q) => q.id !== except && sittingIn(q, hall.id) && hyp(q.x - cx, q.y - cy) <= AT_HALL);
}

/** A person with a free evening may spend it at a sound hall they know near home (beside the fire: evening_fire.ts). */
export function hallEveningOptions(ctx: Ctx): void {
  const { world: w, p } = ctx;
  if (!hasHallEvening(w) || ctx.critical || ctx.dangers.length || !isEveningFor(w, p)) return;
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 60) return;
  if ((p.cooldowns['fire:evening'] ?? 0) > w.tick) return;
  const homeX = ctx.home ? ctx.home.doorX + 0.5 : p.x, homeY = ctx.home ? ctx.home.doorY + 0.5 : p.y;
  let hall: Building | null = null;
  let bd = FIRE_REACH;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype !== 'hall' || (b.cond ?? 100) <= HALL_SOUND) continue;
    const e = w.byId.get(b.id);
    if (!e || e.ent !== 'building' || e.type !== 'hall') continue;
    const d = hyp(b.x - homeX, b.y - homeY);
    if (d <= bd) { bd = d; hall = e; }
  }
  if (!hall) return;
  const h = hall;
  const walk = eta(ctx, h.x + h.w / 2, h.y + h.h / 2);
  let there = 0;
  for (const s of ctx.seenPersons) {
    const q = w.byId.get(s.id);
    if (q && q.ent === 'person' && sittingIn(q, h.id)) there++;
  }
  const sc = new Scorer().add('an evening at the hall', 22 + 4 * p.traits.sociability).add('walking', -pen(walk) * 0.5);
  if (there > 0) sc.add(there === 1 ? 'somebody is there' : 'people are there', FIRE_DRAW_EACH * Math.min(there, FIRE_COMPANY_MAX));
  const wet = (34 * w.weather.storm + 16 * w.weather.rain) * 0.5 + Math.max(0, 60 - p.needs.warmth) * 0.5;
  if (wet > 0) sc.add('out of the weather at the hall', wet);
  addOption(ctx, {
    kind: 'wander', label: 'Spend the evening at the hall', goal: 'to sit in company', need: null, util: sc.total, parts: sc.parts, eta: walk + FIRE_TICKS,
    key: 'evening:hall', targetId: h.id, tag: 'leisure',
    make: () => {
      const spot = standSpotFor(w, p, h);
      if (!spot) return null;
      const a = newActivity(w, p, { kind: 'wander', label: 'Spending the evening at the hall', goal: 'to sit in company', spotX: spot.x, spotY: spot.y, tx: spot.x, ty: spot.y, utility: sc.total, minCommit: FIRE_COMMIT, maxTicks: 600 });
      if (a) { a.data.evening = 'hall'; a.data.hallId = h.id; }
      return a;
    },
  });
}

/** An evening at the hall is finished: had for this evening, and it was company, as at the fire. */
export function finishHallEvening(w: World, p: Person, a: Activity): void {
  p.cooldowns['fire:evening'] = w.tick + DAY / 2;
  const hall = w.byId.get(a.data.hallId as number);
  const others = hall && hall.ent === 'building' ? hallSitters(w, hall, p.id) : [];
  const n = Math.min(others.length, FIRE_COMPANY_MAX);
  p.needs.social = Math.min(100, p.needs.social + FIRE_SOCIAL + FIRE_SOCIAL_EACH * n);
  for (const q of others) adjustRel(p, q.id, w.tick, { fam: 1 });
  think(w, p, 'fire', n > 0 ? 2 : 1, DAY / 2, n > 0 ? 'an evening at the hall in company' : 'an evening at the hall');
}
