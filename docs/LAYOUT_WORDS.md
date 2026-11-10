# The feed line of a laid-out site says who it is for from the site that was made: rules 191

Predecessor rules 190 is pinned by `tests/v190_continuation.expected.json`. Origin: the end-to-end trace of 10 November 2026
(`docs/END_TO_END_TRACE.md`, link 4, one of its two wrong records), repaired in the diagnose-and-repair session of 11 November 2026
(`docs/REPAIRS_20261111.md`). Stream: repair.

## The defect (every version up to 190)

`plan_site` (`act_build.ts`) ended with "<name> marked out a <building> for the <household> household" unless the activity carried the
communal flag. A storehouse laid out through the ordinary option in a township world is public the moment it exists: `proposeProject`
(`townships.ts`) sets the site's household to 0 and the same tick's feed says "<name> proposed a shared storehouse for <town>". A well is
public from `createSite`. Both lines still named the actor's household, so ordinary aspen read "Dax marked out a storehouse for the Hazel
household" beside "Dax proposed a shared storehouse for Willowbank", and the inspector's site card said the site belonged to nobody.

## The rule (rules 191, rich worlds)

`src/sim/layout_words.ts layoutForWords`, asked by that one feed line. The ending follows the site: a communal layout reads "for shared use"
as it has since rules 144; a site that belongs to no household reads "for shared use"; a household's own site names the household. Text only;
nothing reads it, and the person's own log line ("Marked out a spot for a storehouse.") is unchanged.

Rules 190 and earlier, authored worlds and `setLayoutWords(false)` keep the old line.

## Evidence

- Contract tests `tests/layout_words.test.ts` (6), each with the rules-190 contrast: a storehouse laid out through the ordinary option in a
  township world is public and its line reads "for shared use" at 191 and "for the <household> household" at 190; a well's ending likewise; a
  cellar still names the household; a communal mill reads "for shared use" at both; the switch and an authored world keep the old words.
- `npm run typecheck` passed.
- Immutable pin `tests/v191_continuation.*` (Normal gen-2, arrivals on, 6,100 ticks then 120 after a save and load; the first storehouse is
  marked out through the ordinary option and worded for shared use by tick 6,025), recorded from a clean checkout of `bc9ab7f2`. In the same
  probe birch reached it at tick 12,050, cedar at 8,400 and river at 9,725; none of the four produced a household-named storehouse line at 191.
- Twin: 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 190 and at 191 from a clean checkout of `4a4d5823`:
  see `review_evidence/repairs-20261111/twins/r190-r191/`. The feed text is part of the hashed state, so a seed that lays out a public site
  inside 25 days is expected to differ by that text alone.

No benefit is claimed.
