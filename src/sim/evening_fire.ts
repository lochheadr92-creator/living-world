// Rules 216 (the childhood stream): the evening fire and a story told. Phase 5 of docs/CHILDHOOD_AND_PLAY_PLAN.md, on the owner's
// instruction of 12 November 2026 ("do toys then stage 5"). The first thing in the plan for grown people and elders.
//
// What stood before: in the evening a person with nothing pressing had the spare-time walk (leisure.ts), with a small pull toward
// the square for the sociable; the fire was somewhere to keep warm, sleep and feed, never somewhere to sit together. Chats fell at
// rules 202 and have not come back; elders spent the evening as everyone else did.
//
// Two separately switched parts:
//
//   fire   From the evening (EVENING_FROM of the day) until their own bedtime, anyone fed and watered, not worn out, with no danger
//          about, who knows a lit fire within FIRE_REACH of home, may sit by it for a while, once an evening: the ordinary
//          spare-time activity ('wander') with a name and a set length. It is worth more the more people they can see already
//          sitting there, and to the sociable. When it is finished it is company: their want of company eases by FIRE_SOCIAL, and
//          FIRE_SOCIAL_EACH for each other person sitting there (up to FIRE_COMPANY_MAX of them), they come to know each of them a
//          little better, and they are a little glad of it.
//   story  Halfway through their sitting, somebody at the fire tells a story to those sitting there: an elder if one is there,
//          otherwise a grown person of STORY_AGE or more, no more than once a day for each teller. The story is one the settlement
//          remembers (pickStory, traditions.ts: the chronicle retold, chosen for the youngest listener). It goes in the feed; each
//          listener is glad of it (a child most: STORY_LIFT_CHILD) and a little fonder of the teller, and the teller is glad to have
//          told it. Children are told first: the story is chosen for the youngest there.
//
// Not in this version: a story carried on by a listener to others, songs, an instrument, a fire lit for the evening on purpose.
//
// Rich worlds at rules 216 and later only; rules 215 and earlier, authored worlds and a part switched off keep the old behaviour.
import { newActivity, standSpotFor } from './activities';
import { DAY } from './constants';
import { dayFraction } from './environment';
import { addEvent, say } from './events';
import { noteHaunt } from './leisure';
import { think } from './mood';
import { Scorer, addOption, beliefsByKind, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { ageYears, stageOf } from './people';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import { pickStory } from './traditions';
import type { Activity, Building, Person, World } from './types';
import { hyp } from './util';

const on = { fire: true, story: true };
export type EveningPart = keyof typeof on;
export const EVENING_PARTS = Object.keys(on) as EveningPart[];
/** Lab switches (never saved or hashed): one part, or with no part both. */
export const eveningPartOn = (part: EveningPart): boolean => on[part];
export function setEvening(enabled: boolean, part?: EveningPart): void {
  if (part) on[part] = enabled;
  else for (const k of EVENING_PARTS) on[k] = enabled;
}
export const hasEveningFire = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 216);
const partOn = (w: World, part: EveningPart): boolean => on[part] && hasEveningFire(w);

/** the evening begins at this fraction of the day (the square's evening pull begins here too, leisure.ts) */
export const EVENING_FROM = 0.62;
/** how far from home a fire may be to sit at of an evening */
export const FIRE_REACH = 14;
/** how long a sitting lasts once there, and how long they keep to it unless something presses */
export const FIRE_TICKS = 150;
export const FIRE_COMMIT = 90;
/** what sitting at the fire is worth before the company and the walk */
export const FIRE_BASE = 22;
/** what each person already sitting there adds, up to the most counted */
export const FIRE_DRAW_EACH = 3;
export const FIRE_COMPANY_MAX = 4;
/** how much a finished sitting eases the want of company, and how much more for each other person there */
export const FIRE_SOCIAL = 8;
export const FIRE_SOCIAL_EACH = 3;
/** how near the fire a person must be to count as sitting there */
export const AT_FIRE = 4;
/** who tells: an elder, or a grown person this old */
export const STORY_AGE = 30;
export const STORY_LIFT = 2;
export const STORY_LIFT_CHILD = 4;

/** Is it this person's evening: past EVENING_FROM and before their own bedtime (the same bedtime ctx.night uses)? */
export function isEveningFor(w: World, p: Person): boolean {
  const frac = dayFraction(w.tick);
  return frac >= EVENING_FROM && frac < 0.8 + p.chrono;
}

const sittingAt = (q: Person, fireId: number): boolean => q.alive && q.activity?.kind === 'wander' && q.activity.data.evening === 'fire' && q.activity.data.fireId === fireId;
/** The others sitting at this fire now, near enough to count. */
export function sittersAt(w: World, fire: Building, except: number): Person[] {
  const cx = fire.x + fire.w / 2, cy = fire.y + fire.h / 2;
  return w.persons.filter((q) => q.id !== except && sittingAt(q, fire.id) && hyp(q.x - cx, q.y - cy) <= AT_FIRE);
}

/** A person with a free evening may sit by a lit fire they know near home. Derivation is pure; the activity is built if chosen. */
export function eveningFireOptions(ctx: Ctx): void {
  const { world: w, p } = ctx;
  if (!partOn(w, 'fire') || ctx.critical || ctx.dangers.length || !isEveningFor(w, p)) return;
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 60) return;
  if ((p.cooldowns['fire:evening'] ?? 0) > w.tick) return;
  const homeX = ctx.home ? ctx.home.doorX + 0.5 : p.x, homeY = ctx.home ? ctx.home.doorY + 0.5 : p.y;
  let fire: Building | null = null;
  let bd = FIRE_REACH;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype !== 'fire') continue;
    const e = w.byId.get(b.id);
    if (!e || e.ent !== 'building' || e.type !== 'fire' || e.fuel <= 0) continue;
    const d = hyp(b.x - homeX, b.y - homeY);
    if (d <= bd) { bd = d; fire = e; }
  }
  if (!fire) return;
  const f = fire;
  const walk = eta(ctx, f.x + f.w / 2, f.y + f.h / 2);
  // the company they can see already there
  let there = 0;
  for (const s of ctx.seenPersons) {
    const q = w.byId.get(s.id);
    if (q && q.ent === 'person' && sittingAt(q, f.id)) there++;
  }
  // the walk counts half, as for the other spare-time places: it is a stroll home's way, not an errand
  const sc = new Scorer().add('an evening by the fire', FIRE_BASE + 4 * p.traits.sociability).add('walking', -pen(walk) * 0.5);
  if (there > 0) sc.add(there === 1 ? 'somebody is sitting there' : 'people are sitting there', FIRE_DRAW_EACH * Math.min(there, FIRE_COMPANY_MAX));
  addOption(ctx, {
    kind: 'wander', label: 'Sit by the fire for the evening', goal: 'to sit in company', need: null, util: sc.total, parts: sc.parts, eta: walk + FIRE_TICKS,
    key: 'evening:fire', targetId: f.id, tag: 'leisure',
    make: () => {
      const spot = standSpotFor(w, p, f);
      if (!spot) return null;
      const a = newActivity(w, p, { kind: 'wander', label: 'Sitting by the fire', goal: 'to sit in company', spotX: spot.x, spotY: spot.y, tx: spot.x, ty: spot.y, utility: sc.total, minCommit: FIRE_COMMIT, maxTicks: 600 });
      if (a) { a.data.evening = 'fire'; a.data.fireId = f.id; }
      return a;
    },
  });
}

export const isEveningSit = (a: Activity): boolean => a.data.evening === 'fire';

/** Each tick of a sitting: halfway through, a story may be told. */
export function eveningFireWork(w: World, p: Person, a: Activity): void {
  if (a.progress !== Math.floor(a.duration / 2)) return;
  tellStory(w, p, a);
}

function tellStory(w: World, p: Person, a: Activity): void {
  if (!partOn(w, 'story') || (p.cooldowns.story ?? 0) > w.tick) return;
  const fire = w.byId.get(a.data.fireId as number);
  if (!fire || fire.ent !== 'building') return;
  const st = stageOf(w, p);
  if (st === 'child' || st === 'youth' || (st !== 'elder' && ageYears(w, p) < STORY_AGE)) return;
  const listeners = sittersAt(w, fire, p.id);
  if (!listeners.length) return;
  // an elder there tells it, not a younger grown person
  if (st !== 'elder' && listeners.some((q) => stageOf(w, q) === 'elder')) return;
  // the story is chosen for the youngest listener: children are told first
  const youngest = listeners.reduce((x, y) => (ageYears(w, y) < ageYears(w, x) ? y : x));
  const story = pickStory(w, p.id, youngest.id);
  if (!story) return;
  p.cooldowns.story = w.tick + DAY;
  const tale = story.text.replace(/^they still tell how /, '');
  say(w, p, `Listen. They still tell how ${tale}.`, 'say', 90);
  addEvent(w, 'social', `${p.name} told a story at the fire: how ${tale}.`, [p.id, ...listeners.map((q) => q.id)], fire.x, fire.y);
  for (const q of listeners) {
    const child = stageOf(w, q) === 'child';
    think(w, q, 'story', child ? STORY_LIFT_CHILD : STORY_LIFT, DAY / 2, `${p.name}'s story at the fire`);
    adjustRel(q, p.id, w.tick, { aff: 1.5, note: `${p.name} told a story at the fire` });
  }
  think(w, p, 'told_story', STORY_LIFT, DAY / 2, 'told a story at the fire');
}

/** A sitting is finished: had for this evening, and it was company. */
export function finishEveningSit(w: World, p: Person, a: Activity): void {
  p.cooldowns['fire:evening'] = w.tick + DAY / 2;
  const fire = w.byId.get(a.data.fireId as number);
  const others = fire && fire.ent === 'building' ? sittersAt(w, fire, p.id) : [];
  const n = Math.min(others.length, FIRE_COMPANY_MAX);
  p.needs.social = Math.min(100, p.needs.social + FIRE_SOCIAL + FIRE_SOCIAL_EACH * n);
  for (const q of others) adjustRel(p, q.id, w.tick, { fam: 1 });
  think(w, p, 'fire', n > 0 ? 2 : 1, DAY / 2, n > 0 ? 'an evening by the fire in company' : 'an evening by the fire');
  noteHaunt(w, p, 'fire');
}
