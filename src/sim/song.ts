// Rules 262 (the social scenes stream, bundle C, part 7a of `docs/SOCIAL_SCENES_PLAN.md`): a song at the fire. Somebody sitting by the evening
// fire starts a song and those sitting there who are in good spirits join in.
//
// What stood before: an evening sitting (evening_fire.ts) is company by being there; at its half-way point a thanks is spoken (praise.ts) or a story
// is told, and the module's own header named songs as "not in this version". Nothing was ever sung.
//
// One part, `song` (switched in company_scenes.ts, with `dance`, dance.ts, and `reunion`, reunion.ts). From rules 262:
//
//   when      At a sitter's half-way point (the same point a thanks or a story comes at, act_misc.ts), and only if neither of those was done at this sitting:
//             a thanks owed comes first, then a story, and the song is last. Whether this fire has a song this evening is a hash of the fire's id and the
//             day (one evening in three, SONG_CHANCE: no draw from the shared stream), and a fire that has had one in the last half day has none.
//   who       Three or more people sitting at the fire (the sitters evening_fire.ts counts: within AT_FIRE of it), the one who starts it a sociable grown sitter
//             (sociability SONG_SOCIABLE or more) in good spirits (company_scenes.ts inGoodSpirits); if several, the most sociable, then the lowest id. The
//             others who sit there in good spirits join, each with a line of their own. With nobody to join, or nobody to start it, nothing happens and nothing
//             is written.
//   effect    Each singer's want of company eases by SONG_SOCIAL (on top of what the sitting itself gives when it ends), each is a little fonder of, and
//             better acquainted with, every other singer (SONG_AFFINITY, SONG_FAMILIARITY, each way: about the story's listener value of 1.5), and is glad
//             of it for half a day (SONG_GLAD). Those who only sat there are not changed.
//   feed      One line, "A started a song at the fire and N joined in.", ranked low by the story director (a filler) because it happens often.
//
// Nothing here reads anybody's true state: the sitters are those at the fire, the mood is their own, the sociability is how they carry themselves. No draw
// from the shared stream is made. Saved: Building.sung, the tick of the last song at that fire (one song per fire per evening). Rich worlds at rules 262 and
// later only; rules 261 and earlier, authored worlds and a part switched off keep the old behaviour.
import { DAY } from './constants';
import { dayNumber } from './environment';
import { addEvent, addLog, say } from './events';
import { sittersAt } from './evening_fire';
import { COMPANY_FROM, hasSong, inGoodSpirits } from './company_scenes';
import { think } from './mood';
import { stageOf } from './people';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Person, World } from './types';

/** the share of evenings at which a fire has a song: decided by a hash of the fire and the day */
export const SONG_CHANCE = 1 / 3;
/** at least this many sitting there, the starter among them */
export const SONG_SITTERS_MIN = 3;
/** how sociable the starter must be (traits.sociability, 0 to 1) */
export const SONG_SOCIABLE = 0.5;
/** a fire that has had a song is quiet for this long (one evening) */
export const SONG_QUIET = DAY / 2;
/** what a song does for each singer: want of company eased, fonder and better acquainted with every other singer, glad for half a day */
export const SONG_SOCIAL = 6;
export const SONG_AFFINITY = 1.5;
export const SONG_FAMILIARITY = 0.5;
export const SONG_GLAD = 3;
export const SONG_GLAD_FOR = DAY / 2;

/** what the one who starts says, and what each joiner says (chosen by a hash of who and when, never by the shared stream) */
export const SONG_STARTS = ['Here is one we all know.', 'Come, sing this one with me.', 'Who knows the one about the river?', 'This one is for the fire.'];
export const SONG_JOINS = ['La, la, down by the water.', 'And home again by morning!', 'Hey, ho, the fire is warm.', 'Sing it round once more.', 'I know this one!', 'Louder, so the hills hear!'];

/** the hash that says whether this fire sings this evening */
export const fireSings = (w: World, fireId: number): boolean => hashUnit(fireId, dayNumber(w.tick), 0x736f6e67) < SONG_CHANCE;

/**
 * The half-way point of an evening sitting, with neither a thanks nor a story done at it (act_misc.ts): a song may be started here. Returns true if one was.
 */
export function songAtFire(w: World, p: Person, a: Activity): boolean {
  if (!hasSong(w) || a.progress !== Math.floor(a.duration / 2)) return false;
  const fire = w.byId.get(a.data.fireId as number);
  if (!fire || fire.ent !== 'building' || !fireSings(w, fire.id)) return false;
  if (fire.sung !== undefined && w.tick - fire.sung < SONG_QUIET) return false;
  const sitting = [p, ...sittersAt(w, fire, p.id)];
  if (sitting.length < SONG_SITTERS_MIN) return false;
  // who starts it: the most sociable grown sitter in good spirits, the lowest id on a tie
  let starter: Person | null = null;
  for (const q of sitting) {
    if (!inGoodSpirits(q) || q.traits.sociability < SONG_SOCIABLE) continue;
    const st = stageOf(w, q);
    if (st !== 'adult' && st !== 'elder') continue;
    if (!starter || q.traits.sociability > starter.traits.sociability || (q.traits.sociability === starter.traits.sociability && q.id < starter.id)) starter = q;
  }
  if (!starter) return false;
  const joiners = sitting.filter((q) => q !== starter && inGoodSpirits(q));
  if (!joiners.length) return false;
  fire.sung = w.tick;
  const singers = [starter, ...joiners];
  say(w, starter, SONG_STARTS[Math.floor(hashUnit(starter.id, w.tick, 0x73) * SONG_STARTS.length)], 'happy', 120);
  for (const q of joiners) say(w, q, SONG_JOINS[Math.floor(hashUnit(q.id, w.tick, 0x6a) * SONG_JOINS.length)], 'happy', 120);
  addEvent(w, 'social', `${starter.name} started a song at the fire and ${joiners.length} joined in.`, singers.map((q) => q.id), fire.x, fire.y);
  for (const q of singers) {
    q.needs.social = Math.min(100, q.needs.social + SONG_SOCIAL);
    for (const r of singers) if (r !== q) adjustRel(q, r.id, w.tick, { aff: SONG_AFFINITY, fam: SONG_FAMILIARITY });
    think(w, q, 'sang', SONG_GLAD, SONG_GLAD_FOR, 'sang at the fire');
    addLog(w, q, 'social', q === starter ? `Started a song at the fire; ${joiners.length} joined in.` : `Joined ${starter.name}'s song at the fire.`);
  }
  return true;
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 262, rich only); anything else is refused on loading. */
export function validateSong(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, COMPANY_FROM);
  for (const b of w.buildings) {
    if (b.sung === undefined) continue;
    if (!allowed || b.type !== 'fire' || !Number.isSafeInteger(b.sung) || b.sung < 0 || b.sung > w.tick) throw new Error('Invalid song record');
  }
}
