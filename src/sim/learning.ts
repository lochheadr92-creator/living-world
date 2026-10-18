// Stage 3, first piece: what has paid. A person keeps their own running estimate of how each kind of gathering has paid THEM -
// berries, fish, wood, stone and the rest - learned from nothing but their own finished activities, and lets it tilt their next
// choice by a bounded amount. Rich worlds only: an authored world records nothing and is tilted by nothing.
//
// What "paid" means here: when a gathering activity is chosen, the option says how many units it is for and how long it should
// take (walking plus the work). When it ends, for whatever reason, what was actually got in the time actually spent is compared
// with that: 1 means as planned, below 1 the trip paid worse (the source ran out, the pack filled, a wolf, hunger cut it short, the
// walk was long), above 1 better (skill and a good tool make the work quicker than the option's nominal pace). Skill is in the
// ratio on purpose: someone who has become quick at a thing finds that it pays, does more of it, and gets quicker still, which is
// the loop by which people come to differ. The estimate is an exponential running mean, one per kind, saved with the person.
//
// What it is NOT: it is not a scheduler and never makes anyone do anything. The engine still generates every option and ranks
// them; the tilt is at most PAY_NUDGE_MAX either way, smaller than a need, so hunger, thirst, cold and a wolf still win. Nothing is
// looked up in the world behind the person's back: the two numbers it reads are the activity's own plan and its own outcome.
import { SOURCE_SKILL } from './constants';
import { isRich } from './mood';
import type { Activity, Payoff, Person, SkillKey, SourceType, World } from './types';

/**
 * A switch beside the world, like the night-plans and mood switches: module-level, never saved, never hashed, on unless the lab
 * turns it off. It exists so a counterfactual run can hold everything else about a rich world steady and remove only this.
 */
let learning = true;
export function setLearning(on: boolean): void {
  learning = on;
}
export const learningOn = (): boolean => learning;

/** how much of each new outcome the running estimate takes on */
const ALPHA = 0.25;
/** a single outcome is clamped to this range before it is averaged in: a disaster or a windfall is one data point, not a verdict */
const R_MIN = 0.1;
const R_MAX = 4;
/** how much the estimate may tilt a choice, either way. Deliberately small: it is a preference, never an override. */
export const PAY_NUDGE_MAX = 6;
/** outcomes before the estimate is trusted in full (the tilt grows in from the first) */
const SETTLED_AFTER = 3;

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

/** the kind of work an activity at this source is, for the estimate: the same key the skills use */
export const payKeyOf = (type: SourceType): SkillKey | undefined => SOURCE_SKILL[type];

/**
 * What a finished gathering activity paid against what was expected when it was chosen. Both numbers are the activity's own:
 * `amount` and `data.eta` were written by the option that made it, `cycle` and `start` by the work. Null when the activity
 * carries no expectation (made by hand, or by an option that predates this).
 */
export function payRatio(world: World, a: Activity): number | null {
  const eta = a.data.eta as number | undefined;
  if (!(eta !== undefined && eta > 0) || !(a.amount > 0)) return null;
  const took = Math.max(1, world.tick - a.start);
  const r = a.cycle / a.amount / (took / eta);
  return Math.min(R_MAX, Math.max(R_MIN, r));
}

/** Called once, when a gathering activity ends for any reason. Rich only; a person without the field (an old save) gets one. */
export function recordPay(world: World, p: Person, a: Activity): void {
  if (!learning || a.kind !== 'gather' || !isRich(world)) return;
  const type = a.data.stype as SourceType | undefined;
  const k = type ? payKeyOf(type) : undefined;
  if (!k) return;
  const r = payRatio(world, a);
  if (r === null) return;
  const pay = (p.payoff ??= {});
  const e = pay[k];
  if (!e) pay[k] = { n: 1, r: round3(r) };
  else {
    e.n++;
    e.r = round3(e.r + ALPHA * (r - e.r));
  }
}

const fmtRatio = (r: number): string => `${Math.round(r * 10) / 10}×`;

/**
 * The bounded tilt a person's own experience gives this kind of gathering, for the option's scorer: positive when it has paid
 * them better than the plan, negative when worse, nothing before they have tried it. The label says which, so the decision record
 * carries it like any other reason.
 */
export function payNudge(world: World, p: Person, type: SourceType): { label: string; value: number } | null {
  if (!learning || !isRich(world)) return null;
  const k = payKeyOf(type);
  const e = k ? p.payoff?.[k] : undefined;
  if (!e || e.n < 1) return null;
  const settled = Math.min(1, e.n / SETTLED_AFTER);
  const v = Math.round(Math.max(-PAY_NUDGE_MAX, Math.min(PAY_NUDGE_MAX, 7 * Math.log(e.r))) * settled * 10) / 10;
  if (Math.abs(v) < 0.1) return null;
  return { label: v > 0 ? `has paid me well before (${fmtRatio(e.r)})` : `has paid me poorly before (${fmtRatio(e.r)})`, value: v };
}

/** The estimates as the inspector shows them, best-paying first: what this person has found to pay, in their own experience. */
export function describePay(p: Person): { key: SkillKey; ratio: number; n: number }[] {
  const pay = p.payoff ?? {};
  return (Object.keys(pay) as SkillKey[])
    .map((key) => ({ key, ratio: (pay[key] as Payoff).r, n: (pay[key] as Payoff).n }))
    .sort((a, b) => b.ratio - a.ratio);
}
