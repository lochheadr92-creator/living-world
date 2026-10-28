// WINTER SHELTER PREPARATION (rules version 34, rich worlds only).
//
// One bounded behaviour, and it closes one named gap: a household that is going to need a roof over the winter does not leave
// getting it to chance, and is not silently stopped by the settlement's other building work.
//
// WHAT THIS ADDS, AND WHAT IT DELIBERATELY DOES NOT.
//
//   * a deterministic WINTER CUE. Winter is the last WINTER_LENGTH days of every DAYS_PER_YEAR-day year (hardship.ts), the one
//     hardship that is not a roll of the dice. The cue is the two days immediately before it - the same window household food
//     preparation already reads (provision.ts inPreWinter) - and it never reads the random lean season or any hidden world state.
//     While the cue is on, a fed adult gives the household's shelter work a nudge (the score boost below), so a home that needs
//     laying out, finishing or mending is done in the days before winter, while people are still fed, instead of being outranked
//     by lesser work and left until the cold and the hunger arrive together.
//
//   * three EXEMPTIONS that remove the specific blockers the death-tally probe measured, and nothing else. While the window is
//     on (the cue plus winter itself): a household's own home is not blocked from being laid out by its own workshop site, is
//     not counted against the open-site cap by those workshops, and its own home site is not cancelled for idleness. The
//     hunger/thirst gates are untouched (food first is a recorded owner decision, docs/HOUSEHOLD_HOME.md), and no decay constant
//     changes.
//
// It builds on the seams that already exist: laying a site out and building it (options_work.ts optPlanBuild, act_build.ts),
// fetching a site's materials on purpose (shelter.ts, the `shelter` plan), and mending a worn roof (intent.ts, the `repair`
// plan). This module only decides WHEN the winter gives them a push, and WHICH blockers the winter overrides.
//
// WHAT IT READS, AND WHAT IT REFUSES TO READ. Only the world's date and the person's own beliefs (their household's home and
// sites, as they remember them). It never consults the true world state to plan, and it draws no random numbers.
import { inPreWinter } from './provision';
import { winterDepth } from './hardship';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** the rules version at which winter shelter preparation starts; nothing here applies to a world below it */
export const WINTER_SHELTER_FROM_VERSION = 34;

/** how much the winter cue tilts laying out, building and mending a home; small enough that food and danger still win */
export const WINTER_SHELTER_BOOST = 12;

/**
 * The lab switch, beside the world like the mood, stakes, plans, ask, learning, trade and shelter switches: module-level, never
 * saved, never hashed, on unless the lab turns it off. With it off a version-34 world is a version-34 world in every other
 * respect and simply has no winter cue or exemptions, which is what `rich-no-winter-shelter` is for.
 */
let winterShelter = true;
export function setWinterShelter(on: boolean): void {
  winterShelter = on;
}
export const winterShelterOn = (): boolean => winterShelter;

/** Does this world run winter shelter preparation at all? Rich, at least version 34, and not switched off by the lab. */
export const runsWinterShelter = (world: World): boolean =>
  winterShelter && isRich(world) && runsRulesVersion(world, WINTER_SHELTER_FROM_VERSION);

/** Is the "winter is coming" cue live right now? The two days before winter sets in. */
export const winterCue = (world: World): boolean => runsWinterShelter(world) && inPreWinter(world);

/** Is the window open in which a home site is not cancelled for idleness? The cue plus winter itself. */
export const winterShelterWindow = (world: World): boolean =>
  runsWinterShelter(world) && (inPreWinter(world) || winterDepth(world) > 0);
