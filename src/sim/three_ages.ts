// Rules 213 (the childhood stream, phase 3 of `docs/CHILDHOOD_AND_PLAY_PLAN.md`): the three ages of childhood.
//
// Before 213 everyone under twelve gathered food like a grown person (about four hours a day, a quarter of all the food a
// settlement took in the child's-day probe). From 213 four separately switched parts apply to gathering food (berries, fruit,
// wild grain, fish); wood and stone were already closed to children (rules 156) and farm work, building and crafting earlier still.
//
//   little    a little one (under seven) gathers no food: others bring it. Eating, drinking and asking for food are not work.
//   shown     a child of seven to eleven gathers only a kind of food somebody has shown them: a completed practice (childhood.ts,
//             foraging, or fishing and farming since rules 210) is recorded in `p.shown`, a small saved list, from rules 213.
//   bounded   after a stretch of gathering a child of seven to eleven rests from it six times as long (a cooldown, `childwork`),
//             which holds their gathering near two hours of a waking day.
//   practice  what gathering teaches is scaled by age: a little one learns at 0.4 of a grown person's rate, a child from 0.5 at
//             seven to 1 at twelve. A lesson (childhood.ts) is not scaled.
//
// Not a rule against a starving child: when a child's hunger is critical (`CRITICAL.hunger`) none of little, shown or bounded
// applies, so a child with nobody bringing food still feeds themselves. Who feeds a little one is not changed (the care system
// already carries food to dependants); it is measured.
//
// Rich worlds at rules 213 and later only. Rules 212 and earlier, authored worlds and a switch thrown keep the old behaviour.
import { CRITICAL, SKILL_MAX, SOURCE_SKILL } from './constants';
import { LITTLE_AGE } from './child_pace';
import { addBlocked } from './optutil';
import type { Ctx, Option } from './optutil';
import { ageYears, stageOf } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Person, SkillKey, SourceType, World } from './types';

const on = { little: true, shown: true, bounded: true, practice: true };
export type ThreeAgesPart = keyof typeof on;
export const THREE_AGES_PARTS = Object.keys(on) as ThreeAgesPart[];
/** Lab switches (never saved or hashed): one part, or with no part all four. */
export const threeAgesPartOn = (part: ThreeAgesPart): boolean => on[part];
export function setThreeAges(enabled: boolean, part?: ThreeAgesPart): void {
  if (part) on[part] = enabled;
  else for (const k of THREE_AGES_PARTS) on[k] = enabled;
}
export const hasThreeAges = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 213);

/** the tasks a child can be shown (the three practices of childhood.ts) */
export type ShownTask = 'forage' | 'fish' | 'farm';
const SHOWN_TASKS: readonly ShownTask[] = ['forage', 'fish', 'farm'];

/** a child of seven to eleven rests from gathering this many times as long as they gathered */
export const CHILD_REST = 6;
export const LITTLE_REASON = 'too little to gather food; the grown-ups bring it';
export const HELPED_ENOUGH = 'I have helped enough for now';
export const notShownReason = (k: ShownTask): string => `nobody has shown me how to ${k === 'fish' ? 'fish' : k === 'farm' ? 'farm' : 'forage'} yet`;

export type Band = 'little' | 'child' | null;
export function bandOf(w: World, p: Person): Band {
  if (stageOf(w, p) !== 'child') return null;
  return ageYears(w, p) < LITTLE_AGE ? 'little' : 'child';
}

const foodTask = (type: SourceType | string | undefined): ShownTask | null => {
  const sk = type ? SOURCE_SKILL[type as SourceType] : undefined;
  return sk === 'forage' || sk === 'fish' ? sk : null;
};
const starving = (p: Person): boolean => p.needs.hunger < CRITICAL.hunger;

/** Why this person may not gather food at a source of this type under rules 213, or null. */
export function childWorkBlock(w: World, p: Person, sourceType: SourceType | string | undefined): string | null {
  if (!hasThreeAges(w)) return null;
  const task = foodTask(sourceType);
  if (!task || starving(p)) return null;
  const band = bandOf(w, p);
  if (band === 'little') return on.little ? LITTLE_REASON : null;
  if (band !== 'child') return null;
  if (on.shown && !(p.shown ?? []).includes(task)) return notShownReason(task);
  if (on.bounded && (p.cooldowns.childwork ?? 0) > w.tick) return HELPED_ENOUGH;
  return null;
}

/** Withhold the food gathering a child may not do, recording why. Other options pass unchanged. */
export function threeAgesFilter(ctx: Ctx, opts: Option[]): Option[] {
  if (ctx.stage !== 'child' || !hasThreeAges(ctx.world)) return opts;
  return opts.filter((o) => {
    if (o.kind !== 'gather') return true;
    const real = ctx.world.byId.get(o.targetId);
    const type = ctx.p.beliefs[o.targetId]?.kind ?? (real?.ent === 'source' ? real.type : undefined);
    const why = childWorkBlock(ctx.world, ctx.p, type);
    if (!why) return true;
    addBlocked(ctx, 'gather', o.label, o.targetId, why, o.tag);
    return false;
  });
}

/** A gather has ended: a child of seven to eleven rests from gathering for CHILD_REST times as long as it took. */
export function noteChildWork(w: World, p: Person, a: Activity): void {
  if (!on.bounded || !hasThreeAges(w) || bandOf(w, p) !== 'child' || !foodTask(a.data.stype as string | undefined)) return;
  const spent = Math.max(0, w.tick - a.start);
  if (spent > 0) p.cooldowns.childwork = Math.max(p.cooldowns.childwork ?? 0, w.tick + CHILD_REST * spent);
}

/** A practice was completed: the child has now been shown that task. */
export function markShown(w: World, p: Person, task: ShownTask): void {
  if (!hasThreeAges(w) || stageOf(w, p) !== 'child') return;
  const list = (p.shown ??= []);
  if (!list.includes(task)) list.push(task);
}

/** What gathering teaches this person, as a share of a grown person's rate. */
export function practiceScale(w: World, p: Person): number {
  if (!on.practice || !hasThreeAges(w)) return 1;
  const band = bandOf(w, p);
  if (band === 'little') return 0.4;
  if (band === 'child') return Math.min(1, 0.5 + (0.5 * (ageYears(w, p) - LITTLE_AGE)) / (12 - LITTLE_AGE));
  return 1;
}
/** skill after a gathering's practice, scaled (rounded so a save and load continue exactly) */
export const practiced = (w: World, p: Person, sk: SkillKey, base: number): number => Math.min(SKILL_MAX, p.skills[sk] + base * practiceScale(w, p));

/** Load check: `shown` exists only from rules 213, holds known tasks once each. */
export function validateShown(w: World): void {
  for (const p of w.persons) {
    if (p.shown === undefined) continue;
    if (!hasThreeAges(w) || !Array.isArray(p.shown) || p.shown.length > SHOWN_TASKS.length || new Set(p.shown).size !== p.shown.length || p.shown.some((k) => !SHOWN_TASKS.includes(k))) throw new Error('Invalid shown tasks');
  }
}
