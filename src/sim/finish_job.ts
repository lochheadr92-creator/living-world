// Rules 227 (the growth stream, `docs/GROWTH_PLAN.md`): a job begun is finished.
//
// While busy, a person looked again at everything they might do every 45 to 65 ticks (decision.ts reviewActivity), and switched
// when something scored a third better. A count over four ordinary worlds for eight days at rules 226 (`scripts/job_drops.ts`,
// 13 November 2026): 31,657 such second looks against 10,833 fresh choices, three in four of all the choosing done; a third of
// gathering trips were dropped at the work, on average 46% of the way through (866 of 2,664), as were 30% of spells of building,
// 36% of tilling and 55% of repairs, none of which was finished in one go; and "something better came up" was the reason for 77%
// of all work dropped. The owner's instruction of 13 November 2026 was that a person should finish certain jobs before doing
// anything else, unless a critical need says otherwise, and that walking somewhere is not such a job.
//
// From 227, three separately switched parts:
//
//   * HOLD. Somebody who has arrived and is at the work of a job (JOBS below: gathering, building, mending, making, field work,
//     work at a workplace, carrying in and out) takes no second look at it. It ends when the work ends, as it always did. Three
//     things still bring the full second look, exactly as before: a danger (a threat in sight, or one remembered close by), a
//     critical need (the same lines decision making uses, with the thirst line raised by the walk to the nearest known water),
//     and the job being stuck. So does a job done to ease hunger by somebody with food already in their pack (rules 158), and a job
//     that has run HOLD_MAX ticks since it was chosen, so that nothing holds a person for ever. Walking to the job is not held.
//   * ASLEEP. The same count showed where most second looks go: to people asleep (about 28% of them) and resting (21%), not to
//     people at a job (about 15%). A sleeper's second look could only ever do two things, wake them for a danger or for a need
//     more deadly than tiredness (decision.ts: "sleep has its own wake-up rules"), so somebody asleep with no critical need and
//     no danger known nearby takes none. Waking when rested, at daybreak or when spoken to is unchanged.
//   * QUIET. Nobody walks up to a person they can see is at work to chat, to ask for family time or to ask for a game. They
//     pick somebody else or another moment. Asking for something, warning, offering, teaching and being shown the work are not
//     this: those go on as before.
//
// Nothing is saved. Rich worlds at rules 227 and later only; rules 226 and earlier, authored worlds and a switch thrown keep the
// second look and the approach as they were.
import { CRITICAL } from './constants';
import { foodUnits } from './economy';
import { indoorHome } from './habitation';
import { thirstRate } from './metabolism';
import { moveSpeed } from './activities';
import { runsRulesVersion } from './rulesversion';
import { isThreat } from './wildlife';
import type { Activity, ActivityKind, Person, SeenEntity, World } from './types';
import { hyp } from './util';

/** a held job is looked at again once it has run this long since it was chosen (a third of a day) */
export const HOLD_MAX = 800;
/** the work that is finished once begun; resting, warming, wandering, company, exploring and sleep are not jobs */
export const JOBS: ReadonlySet<ActivityKind> = new Set<ActivityKind>([
  'gather', 'build', 'repair', 'craft', 'till', 'plant', 'tend', 'harvest', 'operate', 'tool_work', 'tree_work', 'animal_work', 'gear_work',
  'butcher', 'fuel_fire', 'plan_site', 'haul', 'deposit', 'withdraw', 'fetch_water',
]);

const on = { hold: true, asleep: true, quiet: true };
export type FinishJobPart = keyof typeof on;
export const FINISH_JOB_PARTS = Object.keys(on) as FinishJobPart[];
/** Lab switches (never saved or hashed). */
export const finishJobPartOn = (part: FinishJobPart): boolean => on[part];
export function setFinishJob(enabled: boolean, part?: FinishJobPart): void {
  if (part) on[part] = enabled;
  else for (const k of FINISH_JOB_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 227);

/**
 * Whether a need of this person's is critical, by the lines optutil.ts makeCtx draws (kept in step by tests/finish_job.test.ts):
 * hunger, energy, warmth and safety under their CRITICAL value, thirst under its value raised by the walk to the nearest water
 * the person knows of.
 */
export function hasCriticalNeed(world: World, p: Person): boolean {
  const n = p.needs;
  if (n.hunger < CRITICAL.hunger || n.energy < CRITICAL.energy || n.warmth < CRITICAL.warmth || n.safety < CRITICAL.safety) return true;
  if (n.thirst < CRITICAL.thirst) return true;
  if (n.thirst >= CRITICAL.thirst + 34) return false;
  let nearest = 1e9;
  for (const id of p.bykind.water ?? []) {
    const b = p.beliefs[id];
    const d = hyp(b.x - p.x, b.y - p.y);
    if (d < nearest) nearest = d;
  }
  if (nearest >= 1e8) return false;
  const lead = Math.min(34, thirstRate(world) * 1.3 * ((nearest * 1.18) / Math.max(0.03, moveSpeed(world, p))));
  return n.thirst < CRITICAL.thirst + lead;
}

/** a remembered danger this close could be fled from (optutil.ts fleeRadius is at most 12.5) */
export const DANGER_NEAR = 13;
/**
 * Whether a danger could move this person: a threat in sight, or a danger they remember close by, by the test decision making
 * uses for what it flees from (optutil.ts makeCtx `dangers`: seen within 700 ticks, and never when indoors at home).
 */
export function dangerKnownNear(world: World, p: Person): boolean {
  if (indoorHome(world, p)) return false;
  for (const s of p.seen) if (isThreat(world, s)) return true;
  for (const id of p.bykind.danger ?? []) {
    const b = p.beliefs[id];
    if (b.amount > 0 && world.tick - b.seen < 700 && hyp(b.x - p.x, b.y - p.y) < DANGER_NEAR) return true;
  }
  return false;
}

/** Whether this person, at this activity, takes no second look this time (rules 227, the hold and asleep parts). */
export function holdsJob(world: World, p: Person, a: Activity): boolean {
  if (!runs(world) || a.phase !== 'work') return false;
  if (a.kind === 'sleep') {
    if (!on.asleep) return false;
  } else {
    if (!on.hold || !JOBS.has(a.kind) || a.blocked) return false;
    if (world.tick - a.start >= HOLD_MAX) return false;
    // rules 158 (eat_in_hand.ts) stands: somebody easing hunger with food already in their pack is still looked at, and eats it
    if (a.need === 'hunger' && foodUnits(p.inv) > 0) return false;
  }
  return !hasCriticalNeed(world, p) && !dangerKnownNear(world, p);
}

/** Whether somebody seen like this is left to their work by a person looking for company (rules 227, the quiet part). */
export function leftToWork(world: World, s: SeenEntity): boolean {
  return on.quiet && runs(world) && s.work !== undefined && s.act !== '' && JOBS.has(s.act);
}
