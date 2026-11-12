// Rules 228 (the growth stream, `docs/GROWTH_PLAN.md`): a child may ask, and the grown person decides.
//
// Rules 227 left somebody seen at work alone: nobody walked up for a chat, family time or a game. The lab found what that cost:
// family time 94 a settlement against 120, in twelve of twelve seeds, and nothing gained for it. The owner's instruction of
// 13 November 2026: let children ask, but the parent must make a real decision. Children always want time; work is usually
// important; the parent should be able to choose properly.
//
// Before 228 there was no such decision. A grown person asked for family time said yes unless somebody needed food, water, rest
// or warmth, or they were no longer together (childhood.ts childTimeProblem): whatever they were doing was put aside.
//
// From 228, two separately switched parts:
//
//   * ASK. A child may ask a grown relative for family time even when they can see them at work (the quiet part of rules 227
//     keeps chats and games away from somebody working, as before).
//   * WEIGH. A grown person asked for family time who had a job in hand (finish_job.ts JOBS: on the way to it or at it) weighs
//     the two. The job counts for what it was worth to them when they chose it (its recorded utility). The child counts for
//     ASK_BASE, more for a sociable and a generous person, and ASK_PER_DAY more for each day since the two last had family time
//     together, to at most ASK_DAYS days (their own memory of it; never is the most). If the job counts for more they say so,
//     "not now", and go back to it; the child may ask again after a quarter of a day, as after any refusal. Otherwise they put
//     the job aside as before. Somebody resting, warming, wandering or with nothing in hand says yes as before.
//
// Measured before choosing the numbers (one ordinary world, six days, rules 227): the jobs grown people do are worth 22 at the
// tenth part, 32 at the middle and 44 at the ninetieth; building and carrying to a site about 40, gathering about 31, making
// things by hand about 25. With these numbers a parent of middling nature a day after their last time together weighs the child
// at 32, at the middle of their work; three days on, at 40, above all but building.
//
// Nothing is saved. Rich worlds at rules 228 and later only; rules 227 and earlier, authored worlds and a switch thrown keep the
// approach and the answer as they were.
import { DAY } from './constants';
import { JOBS, leftToWork } from './finish_job';
import { stageOf } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Person, SeenEntity, World } from './types';

export const ASK_BASE = 20;
export const ASK_SOCIABLE = 10;
export const ASK_GENEROUS = 6;
export const ASK_PER_DAY = 4;
export const ASK_DAYS = 3;
/** how the refusal's reason begins (the conversation's record and the child's log carry it) */
export const WORK_FIRST = 'not now, there was work to finish first';

const on = { ask: true, weigh: true };
export type ParentDecidesPart = keyof typeof on;
export const PARENT_DECIDES_PARTS = Object.keys(on) as ParentDecidesPart[];
/** Lab switches (never saved or hashed). */
export const parentDecidesPartOn = (part: ParentDecidesPart): boolean => on[part];
export function setParentDecides(enabled: boolean, part?: ParentDecidesPart): void {
  if (part) on[part] = enabled;
  else for (const k of PARENT_DECIDES_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 228);

/**
 * Whether a child leaves this person alone for this kind of time because they can see them at work. Being shown the work is
 * never held back (rules 227); family time is asked for all the same from rules 228; a game still waits.
 */
export function childLeavesToWork(world: World, kind: string, s: SeenEntity): boolean {
  if (kind === 'learn_foraging' || !leftToWork(world, s)) return false;
  return !(kind === 'family_time' && on.ask && runs(world));
}

/** What the child's ask counts for with this grown person: their nature, and how long since the two last had family time. */
export function askWeight(world: World, grown: Person, child: Person): number {
  const last = grown.relations[child.id]?.childhood?.find((e) => e.kind === 'family_time')?.last;
  const days = last === undefined ? ASK_DAYS : Math.min(ASK_DAYS, Math.max(0, Math.floor((world.tick - last) / DAY)));
  return ASK_BASE + ASK_SOCIABLE * grown.traits.sociability + ASK_GENEROUS * grown.traits.generosity + ASK_PER_DAY * days;
}

/** The job this person had in hand when they were spoken to (activities.ts suspendActivity keeps it), if it is a job. */
export function jobInHand(p: Person): Activity | null {
  const a = p.suspended;
  return a && JOBS.has(a.kind) ? a : null;
}

/**
 * The grown person's answer to a child's ask for family time, where there is a decision to make: the reason they say "not now",
 * or the empty string when they agree or there is nothing to weigh.
 */
export function workComesFirst(world: World, grown: Person, child: Person): string {
  if (!on.weigh || !runs(world) || stageOf(world, grown) === 'child') return '';
  const job = jobInHand(grown);
  if (!job) return '';
  return job.utility > askWeight(world, grown, child) ? `${WORK_FIRST} (${job.label.charAt(0).toLowerCase()}${job.label.slice(1)})` : '';
}
