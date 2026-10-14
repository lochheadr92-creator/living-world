// Stories, traditions and rituals (rich worlds only). A community forms its own habits around what mattered: a harvest feast
// that many came to is held again the same day next year; a funeral that many came to becomes a remembrance at that day each
// year; the first winter lived through becomes a midwinter fire. A tradition is only a call to gather (occasions.ts): people
// join or ignore it by their own lights, and one that goes unattended twice falls out of use. Stories are the chronicle retold:
// in a conversation with nothing fresh to tell, a speaker may pass on something the settlement remembers, as hearsay.
//
// An authored world never creates `world.traditions`.
import { DAY, DAYS_PER_YEAR } from './constants';
import { WINTER_LENGTH } from './hardship';
import { addEvent } from './events';
import { isRich } from './mood';
import { callOccasion } from './occasions';
import type { Occasion, OccasionKind, Tradition, World } from './types';

/** how many must have come for an occasion to become a tradition, and how few for a holding to count as unattended */
const FOUNDING_ATTENDANCE = 8;
const LAPSE_BELOW = 3;
/** unattended this many times running and it falls out of use */
const LAPSE_AFTER = 2;

export const traditionsOf = (world: World): Tradition[] => world.traditions ?? [];

function add(world: World, kind: Tradition['kind'], name: string, dayOfYear: number, about: number): Tradition {
  const list = (world.traditions ??= []);
  const t: Tradition = { id: world.nextId++, kind, name, since: world.tick, dayOfYear, lastHeld: Math.floor(world.tick / DAY), held: 1, skipped: 0, about, status: 'kept' };
  list.push(t);
  addEvent(world, 'social', `${name[0].toUpperCase()}${name.slice(1)} has become a tradition here: to be held each year on this day.`, about ? [about] : []);
  return t;
}

/** An occasion has ended: was it the kind of thing that becomes a tradition, or the holding of one? */
export function noteOccasionOver(world: World, o: Occasion): void {
  if (!isRich(world)) return;
  const list = traditionsOf(world);
  const day = Math.floor(world.tick / DAY);
  const held = list.find((t) => t.status === 'kept' && t.lastHeld === day && t.kind === (o.kind === 'funeral' ? 'remembrance' : o.kind === 'harvest' ? 'harvest' : o.kind === 'feast' ? 'midwinter' : ''));
  if (held) {
    if (o.attended.length < LAPSE_BELOW) {
      held.skipped++;
      if (held.skipped >= LAPSE_AFTER) {
        held.status = 'lapsed';
        addEvent(world, 'social', `${held.name[0].toUpperCase()}${held.name.slice(1)} has fallen out of use: nobody came.`, held.about ? [held.about] : []);
      }
    } else {
      held.skipped = 0;
      held.held++;
    }
    return;
  }
  if (o.attended.length < FOUNDING_ATTENDANCE) return;
  const doy = day % DAYS_PER_YEAR;
  if (o.kind === 'harvest' && !list.some((t) => t.kind === 'harvest' && t.status === 'kept')) add(world, 'harvest', 'the harvest feast', doy, 0);
  else if (o.kind === 'funeral' && o.about.length && !list.some((t) => t.kind === 'remembrance' && t.about === o.about[0])) {
    const d = world.deceased.find((x) => x.id === o.about[0]);
    if (d) add(world, 'remembrance', `the remembrance of ${d.name}`, doy, d.id);
  }
}

/** Winter has ended: the first one lived through becomes a midwinter fire, held at the next winter's heart. */
export function noteWinterOver(world: World): void {
  if (!isRich(world)) return;
  const list = traditionsOf(world);
  if (list.some((t) => t.kind === 'midwinter')) return;
  const doy = (DAYS_PER_YEAR - WINTER_LENGTH + Math.floor(WINTER_LENGTH / 2)) % DAYS_PER_YEAR;
  add(world, 'midwinter', 'the midwinter fire', doy, 0);
}

/** Once a day: call the gatherings whose day it is. */
export function traditionsTick(world: World): void {
  if (!isRich(world) || world.tick % DAY !== 13) return;
  const list = world.traditions;
  if (!list) return;
  const day = Math.floor(world.tick / DAY);
  for (const t of list) {
    if (t.status !== 'kept' || t.lastHeld === day || day % DAYS_PER_YEAR !== t.dayOfYear) continue;
    const kind: OccasionKind = t.kind === 'remembrance' ? 'funeral' : t.kind === 'harvest' ? 'harvest' : 'feast';
    const o = callOccasion(world, kind, t.about ? [t.about] : [], 0.55);
    if (o) t.lastHeld = day;
  }
}

/** a chronicle entry worth retelling as a story: older than three days, about somebody, not the listener's own doing */
export function pickStory(world: World, speaker: number, listener: number): { about: number; text: string; tick: number } | null {
  const c = world.chronicle;
  if (!c || !c.length) return null;
  const now = world.tick;
  // the speaker's own choice among the older entries, by a hash of who is telling whom and the day
  let n = 0;
  for (const e of c) if (now - e.tick > 3 * DAY && e.ids.length && !e.ids.includes(listener) && !e.ids.includes(speaker)) n++;
  if (!n) return null;
  let k = Math.floor((((speaker * 7919 + listener * 104729 + Math.floor(now / DAY)) % 1000003) / 1000003) * n);
  for (const e of c) {
    if (!(now - e.tick > 3 * DAY && e.ids.length && !e.ids.includes(listener) && !e.ids.includes(speaker))) continue;
    if (k-- === 0) return { about: e.ids[0], text: `they still tell how ${e.text.replace(/\.$/, '')}`, tick: e.tick };
  }
  return null;
}
