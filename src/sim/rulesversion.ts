// Which generation of simulation BEHAVIOUR a world runs under.
//
// Three different version numbers live in this repository and they are not interchangeable:
//
//   * the SAVE FORMAT version (`src/app/save.ts`, currently 4) says how the bytes are written. It changes when the storage
//     changes and says nothing about how anybody behaves.
//   * `settings.dynamics` ('rich' | 'authored' | absent) is a compatibility and configuration distinction: which family of
//     rules a world belongs to. It is not a generation: every rich world since the first has carried the same label while the
//     behaviour underneath it changed many times. That is exactly the problem this module exists to fix.
//   * the RULES VERSION here is the generation of the behaviour itself. Version 1 is the integrated behaviour as it stood when
//     versioning was introduced. A later change to a decision rule or a tuned parameter that is meant to alter outcomes gets
//     version 2, and a world saved as version 1 keeps running version 1's rules.
//
// This module is the only owner of all of that: what the current version is, whether a value is valid, what version a given
// world actually runs, and whether a world is eligible for behaviour introduced at some later version. Nothing else should
// compare a version number to a literal.
import type { Settings, World } from './types';

/**
 * The generation of behaviour new worlds are created with.
 *
 * VERSION 1 is the integrated simulation as it stood on 2026-10-18: mood, hardship, private plans, learning, trades and
 * apprenticeship, the second rich pass (occasions, reputation, illness, theft and barter, the land, the settlement record,
 * temperament, life changes, stories and traditions, crews, mediation, shared responsibilities), the rich-only town
 * corrections, and the project ask as it was written then.
 *
 * VERSION 2 (2026-10-18) adds HOUSEHOLD FOOD PREPARATION and nothing else: an adult may take on a private plan to put a
 * modest food reserve into their own household's home store, set going either by what they can see of their own household's
 * food or by the approach of winter, and carried out with the gathering and depositing that already existed. The whole of it
 * is `src/sim/provision.ts` plus the `stock` plan kind in `src/sim/intent.ts`, and every part of it is gated on
 * `runsRulesVersion(world, 2)`. Nothing else was retuned: winter, lean seasons, hunger, yields, spoilage and starting
 * resources are exactly what version 1 had. A version-1 world continues as version 1, which
 * `tests/v1_continuation.test.ts` holds against a reference recorded before version 2 was written.
 *
 * Raising this number is how a behavioural change is declared. See docs/DEVELOPMENT_POLICY.md, "Rules versions".
 */
// Version 3: actual home occupancy. Version 4: spears and active wolf defence, respecting occupancy.
// Version 5 is not a generation of this build. The unintegrated wolf-habitation-integration candidate used it for a
// mood-ranking correction. Those saves stay with that revision; this build refuses them rather than running them as
// version 4 or as version 6.
// Version 6: a person already at zero health dies through the ordinary death path before passive recovery can undo it.
// Version 7: HOUSEHOLD SHELTER PLANS. An adult whose household they believe has no proper home, and which has already laid
// a site out for one, may take on an ordinary private plan to fetch that site's missing material and carry it there. The
// whole of it is `src/sim/shelter.ts` plus the `shelter` plan kind in `src/sim/intent.ts`, every part gated on
// `runsRulesVersion(world, 7)`. Laying out a site, building, ownership and habitation are unchanged; what changes is that
// the material is now fetched on purpose instead of arriving by chance. Nothing else was retuned.
// Version 8: THE ORE HUNT REACHES ORE. Worldgen places ore veins 24-46 tiles out under stony ground; exploration sampled
// radius 11 -> 24 + 10*curiosity for every reason, so a hunt bent on finding ore never reached the band and an ordinary
// world smelted no iron (measured: a 160-day run builds a kiln, a bakery and a yard but no smithy). In `src/sim/options_work.ts`
// an ore hunt (depositLead's lead) now samples the band itself (radius 24 -> 44 + 6*curiosity) and leans toward stony
// ground. Nothing else was retuned; idle wander, water hunts and timber hunts sample exactly where they always did.
// Version 9: WARMTH AND SHELTER. A household of one may lay out a hut, not just a household of two or more: the labour
// and the materials never needed a crew, only the rule did (src/sim/options_work.ts). And the cold presses less hard on
// everyone: the warmth drive starts at 46 instead of 52 (so a person working outside in a light cold lets themselves sit
// a little colder instead of interrupting the work to warm up), and a fire at close range warms like a hut wall (13
// degrees at the peak instead of 9, src/sim/needs.ts). Drives and the fire both take their version-9 readings only in a
// version-9 world; a version-8 world keeps the same pressure and the same fires.
// Version 10: THE SMITHY'S FUEL. A standing smithy is a standing want for charcoal. Before this, charcoal was only ever
// wanted as the transitive ingredient of a personal iron-tool plan - a worn tool in the hand, a hammer, a forge plan,
// then the fuelled batch - and in an ordinary world that personal chain never completed end to end (measured: a 160-day
// run builds a kiln and a smithy but never makes charcoal, iron_batch 0). In `demandsOf` (src/sim/production.ts),
// somebody who knows a standing smithy now wants charcoal kept stocked, so the kiln's idle time goes to firing it and
// smelting and forging are not blocked on the fuel. Nothing else was retuned, and the want is only in a version-10
// world: a version-9 world keeps the same demands as before.
// Version 28: SPARE TIME. A person with nothing pressing had one fallback, potter about near their own door at a fixed score, so
// free time was the same few steps from home every time. From version 28 it is several places they know (their door, the
// square, the water's edge, a stand of trees), tilted a little by a change of scene, a personal favourite spot, the evening
// gathering for the sociable, and the walk. Only the idle fallback changed (src/sim/leisure.ts); survival, work, plans,
// moods and every other option are exactly version 27's, and a version-27 world keeps its single fallback.
// Version 29: event participants are snapshots. Later crew membership changes no longer
// rewrite formation events or change historical story eligibility after save/load.
// Version 30: pending layout claims, one home layout per household, and bounded
// waiting for a temporary footprint occupant without relaxing access validation.
// Version 31: personal work tastes settle close work choices, integrated after layout coordination.
// Version 32: observer-facing truth. A stalled site's "waiting for materials" reason is derived from the
// ledger (required minus delivered minus used), and a person logs it when a source they believed held
// 2+ units is re-sighted bare or at most half full (src/sim/knowledge.ts).
// Version 33: leave the heaviest left-over. A person whose hands are too full of wood or stone for a gather they want to start
// may go and leave the heaviest such left-over (nothing of theirs asks for it) at a storehouse or shared workplace they know,
// through the ordinary deposit (src/sim/leave_heaviest.ts). No other option, score or threshold changes.
// Version 34: reconsider a private plan when it cannot be fed. A material-fetch plan whose material the person knows no source
// of, and no one has promised to bring, is relinquished with that reason instead of being retried forever (src/sim/intent.ts).
// Version 35: a member who left a crew over a grievance against one of its members is not readmitted while that grievance
// persists, so departure and re-entry no longer contradict each other in the same maintenance cycle (src/sim/crews.ts).
// Version 36: unfinished tool plans yield carried material to the known household home after a day.
// Version 37: a full pack can deliver a partial household shelter batch through ordinary hauling.
// Version 38: witnessed construction satisfaction and a new unfulfilled hope after three days of fulfilment.
// Version 39: personal trust selects among feasible helpers for a tool plan's material ask.
// Version 40: remembered own/shared raw-material stores support plans and delivery promises.
// Version 41: a wanted technique can prompt a learner to request timed instruction.
// Version 42: one personally received benefit per witnessed public storehouse project.
// Version 43: repeated personally heard material demand informs feasible trade choices.
// Version 44: varied starting skill backgrounds and non-universal adult technique knowledge.
// Version 45: an empty-handed food helper may promise the food kind they personally know a source of (src/sim/food_help.ts).
// Version 46: a winter reserve of two days' eating put by in what keeps, and the granary's bins feed the households that filled them (src/sim/provision.ts).
// Version 47: a pre-winter cue nudges laying out, finishing and mending the household's own home, and a home is not blocked by
// the household's workshop site, the open-site cap or the stale-site sweep while the window is open (src/sim/winter_shelter.ts).
// Version 48: a promise to a person names the asker's home as the agreed place to leave it, and a kept promise leans the next ask (src/sim/delivery_place.ts).
// Version 49: a meal from a witnessed public storehouse is a personal benefit received, counted once by what left the store (src/sim/civic_benefit.ts).
// Version 50: a private batch plan sees a wanted workshop product through from input to use (src/sim/batch_plan.ts).
// Version 51: an unmet ask for a material is remembered as a customer, supplied later as a swap or gift, and the return read by the trade review (src/sim/customers.ts).
// Version 52: smelting and forging are held procedures after charcoal, taught the same way, and worked out by costly trial when nobody is there to teach them (src/sim/techniques.ts).
// Version 53: a dead member's unfinished undertaking may be taken up by a survivor who knows of the death, and keeping winter stores is a practice learned through the winter's meals (src/sim/succession.ts, src/sim/winter_practice.ts).
// Version 54: relocation by the consenting part of a household (stayers keep the old home; the travellers found a new household), succession of a dead or departed organiser, a return when the destination fails, and a bounded search for a traveller out of contact (src/sim/relocation.ts).
// Version 55: what a person has carried to sites is the ground for wanting a cart, a cart serves the household's food reserve and batch plans beyond the building site, and a loaded cart left standing is recovered (src/sim/transport.ts).
// Version 56: childcare promises use communicated or personally known locations; watching keeps physical contact and revalidates the helper's food/water reserves (responsibilities.ts).
// Version 57: a required tool exposed by wanted workshop work connects to ordinary hand-tool materials, plans and crafting (options_work.ts).
// Version 58: spare seed can be physically stored at a remembered household home to free a blocked material trip (seed_storage.ts); hand-tool capacity counts consumed inputs (act_build.ts).
// Version 59: a wanted handcart its maker can build is the batch taken on before the site materials it is wanted to haul (src/sim/cart_priority.ts).
// Version 60: batch plans choose the same held/rack-tool recipe as their offered production steps, including precursors.
// Version 61: required workshop tools are revalidated every work tick; paused owned batches request replacement tools.
// Version 62: same-room gifts remain indoors, contact is revalidated during hand-over, and zero receipt grants no fed cooldown.
// Version 63: a personally failed full-pack food hand-over can use a known household store, preserving reserves and access.
// Version 64: a required workshop tool takes precedence over a missing convenience tool.
// Version 65: retain a still-eligible running source, stock or drinking destination beyond
// the short candidate list so ordinary activity review can score it honestly.
// Version 66: personally remembered indoor need can lead a resident back through their own entrance for care.
// Version 67: residents drink actual stored household water without loading their packs.
// Version 68: a failed water hand-over can lead to physical household-store provision.
// Version 69: bounded personally derived prerequisite projects span workshops.
// Version 70: personal daily preferences earned by repeated completed activities.
// Version 71: personally estimated work amounts and spells preserve return/duty margins.
// Version 72: bounded personal trip provisioning and retained work purpose across need breaks.
// Version 73: personally failed material trips can retain their purpose at bounded legal alternative sources.
// Version 74: bounded source-specific gathering experience and firsthand correction of empty-source expectations.
// Version 75: failed gathering travel cannot observe remote stock or blame a remote last taker.
// Version 76: bounded personally experienced route failures and successful-arrival correction.
// Version 77: corrected route history no longer blocks promises or adds water/depletion-news penalties.
// Version 78: direct material receipts retain task evidence and influence eligible later project-helper choices.
// Version 79: witnessed completion of an agreed watch informs eligible later childcare requests.
// Version 80: promise completion knowledge requires local observation or an acknowledged personal report.
// Version 81: failed promise attempts retain personal evidence; deadline outcomes require a real report.
// Version 82: heard agreements and personal outcomes govern expectations; remote death is not personal knowledge.
// Version 83: local target evidence ends impossible promises and is explained through actual contact.
// Version 84: requester-observed target changes support actual cancellation and acknowledgement.
// Version 85: settle supplied building shares promptly; explain remaining failed attempts and negotiate one bounded extension.
// Rules 86: persistent local productive condition, observed source choice and physical field rest/care.
// Rules 87: finite natural water, actual draws, weather recharge/loss and personal access memories.
// Rules 88: durable flood ground, dated local warnings and physical access recovery.
// Rules 89: newly paid timber offcuts become owned, collectable fire fuel.
// Rules 90: ended meals retain owned food at the site for actual, capacity-limited recovery.
// Rules 91: private heard meeting arrangements and actual update conversations.
// Rules 92: personally communicated work informs succession without remote state disclosure.
// Rules 93: physically held estates preserve household and registered tool custody.
// Rules 94: explicit living-worker handover, personal continuation and agreed handback.
// Rules 95: acquire real supplies for personally observed resident care.
// Rules 96: heard fire duties obtain uncommitted fuel through ordinary work.
// Rules 97: actual recovery handback and retained paid watch progress.
// Rules 98: heard repair destinations and lawful wood-fallback preparation.
// Rules 99: prepared project steps are finished; same-workshop output counts as stock.
// Rules 100: heard household supply leaves a reserve to its teller and picks complementary site materials.
// Rules 101: personally heard promises count against the asker's own fetching until the spoken time.
// Rules 102: a roof already promised is not promised again; one patch keeps one promise.
// Rules 103: a bounded personal ledger of recent decisions and what became of them, for the inspector.
// Rules 104: household undertakings are told at a real shared supper.
// Rules 105: a present neighbour can be asked where a promised person is.
// Rules 106: care for a dependant out of sight is decided from how they looked when last seen.
// Rules 107: a first-hand account of a place, checked in person, is grounds about its teller.
// Rules 108: home layout follows personal housing knowledge; physical allocation rejects duplicates.
// Rules 109: known fully supplied construction remains available through its final work.
// Rules 110: water searches retain their need, explore from the searcher's position and may answer critical thirst after dark.
// Rules 111: a physically admitted guest retains the option to finish the gathering already underway.
export const CURRENT_RULES_VERSION = 111;

/** Every version this build can actually run. A save naming anything else is refused rather than quietly reinterpreted. */
export const SUPPORTED_RULES_VERSIONS: readonly number[] = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111];

/**
 * The rules-version number of the unintegrated experimental mood-ranking candidate. Not supported here.
 * Do not treat a save stamped with it as version 4 or as version 6.
 */
export const EXPERIMENTAL_MOOD_RULES_VERSION = 5;

/**
 * What a world made before versioning existed is. It is NOT version 0 and not "probably 1": several different implementations
 * were all labelled `dynamics: 'rich'`, and which one a given save was made by cannot be recovered from the file, from the
 * fields a person happens to have, or from a timestamp. Such a world stays explicitly unversioned, for ever, unless somebody
 * converts it deliberately (a separate job, not a load-time migration).
 */
export const UNVERSIONED = undefined;

export interface VersionVerdict {
  ok: boolean;
  /** the version to run under, or undefined for a legacy world */
  version: number | undefined;
  /** why a value was refused, in words a loader can show */
  reason?: string;
}

/** Is this a version this build knows how to run? (`undefined` is the legacy case and is handled separately.) */
export const isSupportedRulesVersion = (v: unknown): v is number => typeof v === 'number' && SUPPORTED_RULES_VERSIONS.includes(v);

/**
 * Check a `rulesVersion` as it came out of a save or a configuration, without changing it. An absent value is accepted as the
 * legacy case; anything else must be a version this build supports. A version from the future is refused by name, because
 * running it under today's rules would be a silent downgrade of somebody else's world.
 */
export function validateRulesVersion(v: unknown): VersionVerdict {
  if (v === undefined || v === null) return { ok: true, version: UNVERSIONED };
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) {
    return { ok: false, version: undefined, reason: `rulesVersion must be a positive whole number or absent, not ${JSON.stringify(v)}` };
  }
  if (isSupportedRulesVersion(v)) return { ok: true, version: v };
  if (v === EXPERIMENTAL_MOOD_RULES_VERSION) {
    return {
      ok: false,
      version: undefined,
      reason:
        `rules version ${v} is the unintegrated experimental mood-ranking generation. This build does not run it, and it is not loaded as version 4 or as version 6.`,
    };
  }
  const latest = Math.max(...SUPPORTED_RULES_VERSIONS);
  return {
    ok: false,
    version: undefined,
    reason:
      v > latest
        ? `this world was made by a newer build (rules version ${v}); this build runs ${SUPPORTED_RULES_VERSIONS.join(', ')}. It is not loaded, rather than being run under older rules.`
        : `rules version ${v} is no longer supported by this build (it runs ${SUPPORTED_RULES_VERSIONS.join(', ')}).`,
  };
}

/** The version a world is actually running: what its settings say, with no substitution of the current version. */
export const rulesVersionOf = (world: World): number | undefined => world.settings.rulesVersion;

/** The same question of a bare settings object (before a world exists). */
export const settingsRulesVersion = (s: Pick<Settings, 'rulesVersion'>): number | undefined => s.rulesVersion;

/**
 * Is this world eligible for behaviour introduced at version `from`? This is the one place future versioned rules should ask,
 * instead of comparing numbers at the call site:
 *
 *     if (runsRulesVersion(world, 2)) { ...the new rule... } else { ...what version 1 did... }
 *
 * A legacy (unversioned) world is never eligible: its original rules are unknown, so it keeps the behaviour it loads with and
 * no later gameplay addition is applied to it.
 */
export function runsRulesVersion(world: World, from: number): boolean {
  const v = rulesVersionOf(world);
  return v !== undefined && v >= from;
}

/** How to say it in a report, a menu or a save description. */
export function describeRulesVersion(v: number | undefined): string {
  if (v === undefined) return 'unversioned (made before rules versions; its original rules are unknown)';
  return `rules version ${v}${v === CURRENT_RULES_VERSION ? ' (current)' : ''}`;
}

// Save-envelope provenance: the numeric generations 8 and 9 collided on two branches.
export const RULES_LINEAGE = 'main-iron-warmth-smithy';
// Concurrent unmerged 007b9d5 used 27 for leisure, before rebasing that work as 28.
// Neither the shared lineage nor the absence of leisure state proves which 27 made a save.
export const RULES_27_GENERATION = 'main-night-wait-boundary-27';
// Unmerged e415b4b used 29 for work tastes without main's event snapshot fix.
export const RULES_29_GENERATION = 'main-event-participant-snapshots-29';
export function saveRulesGeneration(version: unknown): string | undefined {
 return version === 27 ? RULES_27_GENERATION : version === 29 ? RULES_29_GENERATION : undefined;
}
export function validateSaveLineage(version: unknown, lineage: unknown, generation?: unknown): void {
 if (lineage !== undefined && lineage !== RULES_LINEAGE) throw new Error('Unknown rules lineage; keep this save with its original build.');
 if ((version === 8 || version === 9) && lineage !== RULES_LINEAGE)
  throw new Error('Ambiguous rules version 8/9: two incompatible branches used this number. Original save preserved; open with its original build.');
 if (version === 27 && generation !== RULES_27_GENERATION)
  throw new Error('Ambiguous rules version 27: night-wait and unmerged leisure branches used this number. Original save preserved; open with its original build. No automatic migration is safe.');
 if (version === 29 && generation !== RULES_29_GENERATION)
  throw new Error('Ambiguous rules version 29: event snapshots and unmerged work tastes used this number. Original save preserved; open with its original build. No automatic migration is safe.');
}
