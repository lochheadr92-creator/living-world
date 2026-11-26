// Rules 263 (the social scenes stream, bundle D, part 11 of `docs/SOCIAL_SCENES_PLAN.md`): coming of age. When somebody turns sixteen a feast is called for them, a
// parent (or the eldest there) says a few words at it, and the young person says what they hope for.
//
// What stood before: lifecycle.ts lifeTick wrote one line in the feed at sixteen, "X has come of age and joins the work." Nothing gathered and nobody spoke. The
// young person's hope (`Person.goal`) was picked up to half a day later (life.ts lifeTickRich, twice a day for each person) and showed only in their own log.
// Occasions are called by the engine, not by people (occasions.ts): a birth calls a feast, a wedding a wedding feast; a second event of a kind joins the one open.
// The people an occasion is about get no option to attend it (attendOptions), except the mother of a child being named (naming.ts), and children under twelve
// cannot attend any.
//
// One part, `age` (switched in kin_scenes.ts, with `grief`, grief_sit.ts, and `settle`, settle_child.ts). From rules 263:
//
//   the call     In the same `lifeTick` that writes the line at sixteen (lifecycle.ts), a feast is called for them through the engine's own call (occasions.ts
//                noteComingOfAge, callOccasion), flagged `Occasion.comingOfAge` (the young people whose it is, at most four, as `Occasion.naming`), and labelled
//                "coming-of-age feast". If a feast is already open (a naming feast, say) the two purposes share it: neither flag is lost, and the label names both
//                ("naming and coming-of-age feast"). The young person is in the feast's `about` and goes to it all the same (as the mother of a child being named
//                does): attendOptions and `closeness` let them. Children under twelve still cannot attend, so younger brothers and sisters are not there.
//   the words    When the feast opens (occasions.ts, at the tick it begins) and the young person has come for it and is there, with at least one other person who is not
//                a child, a parent of theirs who has come for it and is there says a few words (if none is there, the eldest of those there does), and the young
//                person says what they hope for. The hope is chosen THEN, by the rule life.ts has always used (`takeUpHope`, the same function the half-day check calls:
//                the hope depends on the person's traits and id alone, never on when it is asked, so the result is the one it would have given). One line in the
//                feed, "D came of age before 7 people and hopes for a solid home of their own." (the hope's own words in life.ts, GOAL_TEXT), those there come to know
//                the young person a little better, and the young person is glad. Spoken lines are the speaker's and the young person's own (dialogue.ts).
//   failure      If the young person is not there, or nobody else is, nothing is said and nothing is written: the feast goes on as any feast, "nobody came" is still
//                the line of an empty one, and the hope is picked as before, up to half a day after sixteen, and told to nobody.
//
// Nothing here reads anybody's true state: "there" is the physical place and "has come for it" is the attend activity, as naming.ts reads them. No draw is made. Saved:
// `Occasion.comingOfAge`, in the fingerprint (world.ts) and checked on loading (validateComingOfAge). Rich worlds at rules 263 and later only; rules 262 and earlier,
// authored worlds and a part switched off keep the old behaviour. About one person in six settlements in 25 days turned sixteen (8 in all): this is rare, and is
// not tuned.
import { addEvent, addLog, say } from './events';
import { KIN_FROM, hasComingOfAge } from './kin_scenes';
import { GOAL_TEXT, takeUpHope } from './life';
import { comeAndThere } from './naming';
import { think } from './mood';
import { COMING_OF_AGE_ELDER, COMING_OF_AGE_PARENT, saying } from './dialogue';
import { ageYears, stageOf } from './people';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import type { GoalKind, Occasion, Person, World } from './types';
import { DAY } from './constants';

/** the most young people one feast is the coming of age of */
export const COMING_MAX = 4;
/** at least this many others (not children) must have come and be there when it opens, for the words to be said before them */
export const COMING_LISTENERS_MIN = 1;
/** what hearing them say what they hope for does: those who came come to know them, and they are glad of it */
export const COMING_FAMILIARITY = 3;
export const COMING_AFFINITY = 1.5;
export const COMING_GLAD = 8;
export const COMING_GLAD_FOR = DAY;

export const comingOf = (o: Occasion): number[] => o.comingOfAge ?? [];
/** a feast called for a young person's coming of age (alone, or sharing a naming feast) */
export const isComingOfAgeFeast = (o: Occasion): boolean => o.kind === 'feast' && comingOf(o).length > 0;
/** the young person whose coming of age this feast is: they are in its `about` and go to it all the same */
export function isComingOfAge(world: World, o: Occasion, p: Person): boolean {
  return hasComingOfAge(world) && isComingOfAgeFeast(o) && comingOf(o).includes(p.id);
}

/** what they say of the hope, in the first person; the same hope as life.ts GOAL_TEXT says of them in the third */
const HOPE_SAID: Record<GoalKind, string> = {
  home: 'a solid home of my own',
  family: 'a family',
  trade: 'a trade of my own',
  stocked: 'a store that would see me through a lean season',
  respected: 'a good name among my neighbours',
};

/**
 * The feast has just opened (occasions.ts occasionsTick): each young person whose coming of age it is, who is there with at least one other grown person, has their
 * parent (or the eldest there) say a few words and says what they hope for. Written once for each young person that is, and never otherwise.
 */
export function comeOfAgeAtOpening(world: World, o: Occasion): void {
  if (!hasComingOfAge(world) || !isComingOfAgeFeast(o)) return;
  const there = comeAndThere(world, o);
  for (const id of comingOf(o)) {
    const young = world.byId.get(id);
    if (!young || young.ent !== 'person' || !young.alive || !there.includes(young)) continue;
    const others = there.filter((q) => q !== young && stageOf(world, q) !== 'child');
    if (others.length < COMING_LISTENERS_MIN) continue;
    // a parent of theirs who is there speaks; failing one, the eldest there (the lower id if two are of an age)
    const parents = others.filter((q) => young.parents.includes(q.id));
    const eldest = [...others].sort((a, b) => ageYears(world, b) - ageYears(world, a) || a.id - b.id)[0];
    const speaker = parents[0] ?? eldest;
    // the hope, chosen now by the rule life.ts always used (their own hope, if they somehow already have one)
    const g = young.goal ?? takeUpHope(world, young);
    const n = others.length;
    const people = `${n} ${n === 1 ? 'person' : 'people'}`;
    // a speaker still holding the floor from the naming a moment ago does not speak over it (the line in the feed is written all the same)
    if (!(speaker.speech && speaker.speech.until > world.tick + 60)) say(world, speaker, saying(parents.length ? COMING_OF_AGE_PARENT : COMING_OF_AGE_ELDER, speaker.id, young.id, world.tick, { n: young.name }), 'happy', 150);
    say(world, young, `I hope for ${HOPE_SAID[g.kind]}.`, 'happy', 150);
    addEvent(world, 'social', `${young.name} came of age before ${people} and hopes for ${GOAL_TEXT[g.kind]}.`, [young.id, ...others.map((q) => q.id)], o.x, o.y);
    think(world, young, 'came_of_age', COMING_GLAD, COMING_GLAD_FOR, `came of age before ${people}`);
    addLog(world, young, 'social', `Came of age before ${people} and said what I hope for.`);
    for (const q of others) {
      adjustRel(q, young.id, world.tick, { fam: COMING_FAMILIARITY, aff: COMING_AFFINITY, note: `heard ${young.name} say what ${young.sex === 'f' ? 'she' : 'he'} hopes for at ${young.sex === 'f' ? 'her' : 'his'} coming of age` });
      addLog(world, q, 'social', `Heard ${young.name} say what ${young.sex === 'f' ? 'she' : 'he'} hopes for at the coming-of-age feast.`);
    }
  }
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 263, rich only); anything else is refused on loading. */
export function validateComingOfAge(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, KIN_FROM);
  for (const o of w.occasions ?? []) {
    const list = o.comingOfAge;
    if (list === undefined) continue;
    if (!allowed || o.kind !== 'feast' || !Array.isArray(list) || list.length < 1 || list.length > COMING_MAX || !list.every((n) => Number.isSafeInteger(n) && n > 0) || new Set(list).size !== list.length) throw new Error('Invalid coming-of-age feast');
  }
}
