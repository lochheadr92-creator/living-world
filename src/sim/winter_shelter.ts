// WINTER SHELTER PREPARATION (rules version 47, rich worlds only).
//
// Adapted under current rules from the unmerged candidate `claude/winter-shelter-v34` (f33cd0b), whose number "34" collides
// with main's plan reconsideration. One bounded behaviour, closing one named gap: a household that is going to need a roof
// over the winter does not leave getting it to chance, and is not silently stopped by the settlement's other building work.
//
//   * a deterministic WINTER CUE. Winter is the last WINTER_LENGTH days of every DAYS_PER_YEAR-day year (hardship.ts), the one
//     hardship that is not a roll of the dice. The cue is the pre-winter window household food preparation already reads
//     (provision.ts inPreWinter: three days at rules 46 and later), and it never reads the random lean season or any hidden world
//     state. While the cue is on, a fed adult gives the household's shelter work a nudge (the score boost below), so a home that
//     needs laying out, finishing or mending is done in the days before winter, while people are still fed, instead of being
//     outranked by lesser work and left until the cold and the hunger arrive together.
//
//   * three EXEMPTIONS that remove the specific blockers the candidate's death tally measured, and nothing else. While the window
//     is open (the cue plus winter itself): a household's own home is not blocked from being laid out by its own workshop site,
//     is not counted against the open-site cap by those workshops, and its own home site is not cancelled for idleness. The
//     hunger/thirst gates are untouched (food first is a recorded owner decision, docs/HOUSEHOLD_HOME.md), and no decay constant
//     changes.
//
// It builds on the seams that already exist: laying a site out and building it (options_work.ts optPlanBuild, act_build.ts),
// fetching a site's materials on purpose (shelter.ts, the `shelter` plan), and mending a worn roof (intent.ts, the `repair`
// plan). This module only decides WHEN the winter gives them a push, and WHICH blockers the winter overrides. It reads only
// the world's date and the person's own beliefs, and draws no random numbers. Whether it prevents deaths is an aggregate
// claim for the lab (`rich-no-winter-shelter` against control and nudge), not something this module asserts.
import { inPreWinter } from './provision';
import { winterDepth } from './hardship';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** the rules version at which winter shelter preparation starts; nothing here applies to a world below it */
export const WINTER_SHELTER_FROM_VERSION = 47;

/** how much the winter cue tilts laying out, building and mending a home; small enough that food and danger still win */
export const WINTER_SHELTER_BOOST = 12;

let winterShelter = true;
/** Lab switch `rich-no-winter-shelter`: no cue, no nudge, no exemptions; nothing else changes, and nothing below 47. */
export function setWinterShelter(on: boolean): void {
  winterShelter = on;
}
export const winterShelterOn = (): boolean => winterShelter;

/** Does this world run winter shelter preparation at all? Rich, at least version 47, and not switched off by the lab. */
export const runsWinterShelter = (world: World): boolean => winterShelter && isRich(world) && runsRulesVersion(world, WINTER_SHELTER_FROM_VERSION);

/** Is the "winter is coming" cue live right now? The days before winter sets in. */
export const winterCue = (world: World): boolean => runsWinterShelter(world) && inPreWinter(world);

/** Is the window open in which a home site is not cancelled for idleness? The cue plus winter itself. */
export const winterShelterWindow = (world: World): boolean => runsWinterShelter(world) && (inPreWinter(world) || winterDepth(world) > 0);
