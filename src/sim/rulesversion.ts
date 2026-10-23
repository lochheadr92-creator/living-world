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
export const CURRENT_RULES_VERSION = 8;

/** Every version this build can actually run. A save naming anything else is refused rather than quietly reinterpreted. */
export const SUPPORTED_RULES_VERSIONS: readonly number[] = [1, 2, 3, 4, 6, 7, 8];

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
