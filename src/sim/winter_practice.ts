// KEEPING WINTER STORES, AS A PRACTICE (rules version 53, rich worlds only).
//
// Rules 24 let a practice pass between people through real meals: sharing supper. This is the second practice, and it is
// about the one seasonal preparation the simulation really has: the winter reserve (rules 2 and 46). A household that laid
// a reserve before winter and ate from it through the winter has done something its members can learn from, and the
// learning is read off what actually happened to each of them, never off the household as a label:
//
//   * THE WINTER'S RECORD. A season stock plan that reached its target marks the household's reserve as laid for that year,
//     by whom (`Household.reserveLaid`). Each meal a member eats from their own household's store or from a granary while it
//     is winter is counted on that member for that year (`Person.winterMeals`; the eat_store handler, at the meal's end, by
//     what actually left the store); a dependant fed in winter by a member of a household whose reserve is laid counts the
//     feeding the same way (the care gift, social.ts onGift).
//   * LEARNING, AT WINTER'S END. On the first day of the new year (hardship.ts, where winter ends), in a household whose
//     reserve was laid that year: the one who laid it, having eaten PRACTICE_MEALS from it, holds the practice as their own
//     ("laid"); any other member, child or adult, who ate PRACTICE_MEALS from it holds it from the layer ("family"), the
//     transmission the brief asks for, through the same meals, across generations when the eater is a child who grows.
//     Nobody learns it from a label, from being in the household, or from a winter they did not eat through.
//   * WHAT IT CHANGES. A holder's season cue opens PRACTICE_LEAD days earlier than the ordinary window
//     (provision.ts preparationWanted), and their plan says why in their own words. Nothing else: the target, the cap, the
//     plan's steps and its outcome are the rules-46 ones.
//
// A holder who dies takes it with them; a child holder keeps it into adulthood, where the cue first applies to them.
import type { Building, Person, World } from './types';
import { DAY, DAYS_PER_YEAR } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import { addLog, addEvent } from './events';
import { householdById, membersOf } from './households';
import { deceasedById } from './historical_index';

export interface WinterPractice {
  learned: number;
  source: 'laid' | 'family';
  from: number;
  year: number;
  meals: number;
}

/** meals eaten from the laid reserve through the winter before the practice is theirs */
export const PRACTICE_MEALS = 3;
/** how many days earlier a holder's season cue opens */
export const PRACTICE_LEAD = 2;

let enabled = true;
export const winterPracticeOn = (): boolean => enabled;
/** Lab switch `rich-no-winter-practice`: nothing is counted or learned and no cue opens earlier; no effect below rules 53. */
export function setWinterPractice(on: boolean): void {
  enabled = on;
}
export const hasWinterPractice = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, 53);

export const yearOf = (world: World): number => Math.floor(world.tick / (DAY * DAYS_PER_YEAR));
const WINTER_FROM = 8; // hardship.ts: the last WINTER_LENGTH (4) of DAYS_PER_YEAR (12) days
export const isWinter = (world: World): boolean => Math.floor(world.tick / DAY) % DAYS_PER_YEAR >= WINTER_FROM;

/** A season stock plan reached its target (intent.ts): the household's reserve is laid for this year, by this person. */
export function noteReserveLaid(world: World, p: Person): void {
  if (!hasWinterPractice(world)) return;
  const hh = householdById(world, p.hhId);
  if (!hh) return;
  const year = yearOf(world);
  if (hh.reserveLaid?.year === year) return;
  hh.reserveLaid = { year, by: p.id, tick: world.tick };
}

/** A meal from the household's own store or a granary, in winter, by what left the store (act_resource.ts eat_store). */
export function noteWinterMeal(world: World, p: Person, b: Building, units: number): void {
  if (!hasWinterPractice(world) || units <= 0 || !isWinter(world)) return;
  if (b.hhId !== p.hhId && b.type !== 'granary') return;
  const year = yearOf(world);
  if (!p.winterMeals || p.winterMeals.year !== year) p.winterMeals = { year, meals: 0 };
  p.winterMeals.meals++;
}

/**
 * A child (or anyone who cannot eat at the store) fed in winter by a member of their own household whose reserve is laid this
 * year (social.ts onGift, mode 'care'): the winter's meals as a dependant lives them.
 */
export function noteWinterCare(world: World, receiver: Person, giver: Person, units: number): void {
  if (!hasWinterPractice(world) || units <= 0 || !isWinter(world) || giver.hhId !== receiver.hhId) return;
  const hh = householdById(world, receiver.hhId);
  const year = yearOf(world);
  if (hh?.reserveLaid?.year !== year) return;
  if (!receiver.winterMeals || receiver.winterMeals.year !== year) receiver.winterMeals = { year, meals: 0 };
  receiver.winterMeals.meals++;
}

/** Winter has ended (hardship.ts, the first day of the year): the practice is learned by those who lived it. */
export function winterEnded(world: World): void {
  if (!hasWinterPractice(world)) return;
  const year = yearOf(world) - 1;
  for (const hh of world.households) {
    if (hh.reserveLaid?.year !== year) continue;
    const layer = world.persons.find((q) => q.id === hh.reserveLaid!.by);
    for (const m of membersOf(world, hh)) {
      if (!m.alive || m.winterPractice) continue;
      const meals = m.winterMeals?.year === year ? m.winterMeals.meals : 0;
      if (meals < PRACTICE_MEALS) continue;
      const laid = m.id === hh.reserveLaid.by;
      m.winterPractice = { learned: world.tick, source: laid ? 'laid' : 'family', from: laid ? 0 : hh.reserveLaid.by, year, meals };
      const who = layer?.name ?? deceasedById(world, hh.reserveLaid.by)?.name ?? `person #${hh.reserveLaid.by}`;
      addLog(world, m, 'need', laid ? `Keeping winter stores has become a practice: laid the reserve and ate ${meals} meals from it through the winter.` : `Learned to keep winter stores from ${who}: ate ${meals} meals from the reserve they laid, through the winter.`);
      addEvent(world, 'life', `${m.name} ${laid ? 'made a practice of keeping winter stores' : `learned to keep winter stores from ${who}`}.`, [m.id], m.x, m.y);
    }
  }
  // the counts are for one winter only
  for (const p of world.persons) if (p.winterMeals && p.winterMeals.year <= year) delete p.winterMeals;
}

/** How many days earlier this person's season cue opens: PRACTICE_LEAD for a holder, 0 otherwise. Pure. */
export function winterPracticeLead(world: World, p: Person): number {
  return hasWinterPractice(world) && p.winterPractice ? PRACTICE_LEAD : 0;
}

export function describeWinterPractice(world: World, p: Person): string[] {
  if (!hasWinterPractice(world)) return [];
  const k = p.winterPractice;
  if (!k) return p.winterMeals && isWinter(world) ? [`Eating from the household's winter stores: ${p.winterMeals.meals} meal${p.winterMeals.meals === 1 ? '' : 's'} this winter.`] : [];
  const who = world.persons.find((q) => q.id === k.from)?.name ?? deceasedById(world, k.from)?.name ?? `person #${k.from}`;
  return [`Practice: keeping winter stores. ${k.source === 'laid' ? 'Established by laying the reserve' : `Learned from ${who}`} and eating ${k.meals} meals from it through the winter of year ${k.year + 1}. The season cue opens ${PRACTICE_LEAD} days earlier for them.`];
}

export function validateWinterPractice(world: World): void {
  for (const hh of world.households) if (hh.reserveLaid && (!runsRulesVersion(world, 53) || !Number.isFinite(hh.reserveLaid.year) || !Number.isFinite(hh.reserveLaid.by))) throw new Error('Invalid reserve record');
  for (const p of world.persons) {
    if (p.winterMeals && (!runsRulesVersion(world, 53) || !Number.isFinite(p.winterMeals.year) || !(p.winterMeals.meals >= 1))) throw new Error('Invalid winter meal count');
    if (p.winterPractice && (!runsRulesVersion(world, 53) || !['laid', 'family'].includes(p.winterPractice.source) || !Number.isFinite(p.winterPractice.learned))) throw new Error('Invalid winter practice');
  }
}
