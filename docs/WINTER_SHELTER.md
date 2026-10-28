# Winter shelter preparation (rules version 34)

One bounded behaviour: a household that is going to need a roof over the winter does not leave getting it
to chance, and is not silently stopped by the settlement's other building work.

The problem it answers was measured (see `scripts/death_tally.ts`): in closed Normal worlds people who
lost their home to decay did not rebuild it, mostly because they were too hungry or thirsty to start, or
because their household's own workshop site and the open-site cap blocked a new home, and a home site left
idle for days was cancelled and had to be re-laid in the cold. The result was that most exposure deaths
fell in the open, in winter, in households with no home at all.

## What it adds

1. **A deterministic winter cue.** Winter is the last `WINTER_LENGTH` days of every `DAYS_PER_YEAR`-day year
   (`src/sim/hardship.ts`) - the one hardship that is not a roll of the dice. The cue is the **two days
   immediately before it**, the same window household food preparation already reads
   (`src/sim/provision.ts` `inPreWinter`). It never reads the random lean season and never reads hidden world
   state. While the cue is on, a fed adult's shelter work is nudged (the score boost below), so a home that
   needs laying out, finishing or mending is done in the days before winter, while people are still fed.

2. **A shelter-readiness nudge, while fed.** During the cue, laying out a home (`plan_site` for a lean-to or
   hut), delivering to and building a home site, and mending a worn home are each given a small score boost
   (`WINTER_SHELTER_BOOST = 12`, named "winter is coming" in the decision record). The boost only applies
   while the existing hunger/thirst gates already let building happen, so food still comes first. It builds
   on the seams that already exist: the `shelter` plan (fetch a site's materials, `src/sim/shelter.ts`) and
   the `repair` plan (mend a worn roof, `src/sim/intent.ts`).

3. **Three exemptions, and nothing else.** While the **window** is open (the cue plus winter itself):
   - a household's own home is not blocked from being laid out by **its own workshop site** (only a home it
     has already started counts against starting one);
   - a household's own home is not counted against the **open-site cap** by those workshops (the settlement
     can be at the cap of workshops and still let a homeless household start a home);
   - a household's **home site is not cancelled for idleness**, so a half-finished home waits for its
     materials and builders through the winter instead of being swept up.

The hunger/thirst gates are untouched (food first is a recorded owner decision, `docs/HOUSEHOLD_HOME.md`), and
no decay constant changes.

## What "worn" means

A home is **worn** when the person believes it is a solid home (hut or house) below 55 condition - the same
threshold the ordinary roof plan (`repairWanted` in `src/sim/intent.ts`) already uses. The winter cue nudges
mending such a home before winter deepens its decay.

## Where the exemptions live

| exemption | lives in | gated by |
|---|---|---|
| own workshop site does not block a home | `src/sim/options_work.ts` `optPlanBuild` (the `mySites` belief filter and the `world.sites` guard count only home types) | the winter window |
| open-site cap does not block a home | `src/sim/options_work.ts` `optPlanBuild` (the `openSitesNear >= maxOpenSites` check is skipped) | the winter window |
| home site not cancelled for idleness | `src/sim/world.ts` `clearStaleSites` | the winter window |

The cue and window themselves, the version gate and the lab switch are all in `src/sim/winter_shelter.ts`.
The version is `WINTER_SHELTER_FROM_VERSION = 34`; every part is gated on `runsRulesVersion(world, 34)` and a
world below 34 behaves exactly as it did before.

## What it reads, and what it refuses to read

Only the world's date and the person's own beliefs: their household's home and sites, as they remember them.
It never consults the true world state to plan, never predicts the lean season, and draws no random numbers.
The exemptions read the world's site list, because a cap and a stale-site sweep are settlement facts, not
personal knowledge - but they only ever relax a home site's own blockers.

## Evidence and limits

- **Mechanism** is pinned by `tests/winter_shelter.test.ts`: the cue and window are gated on version 34, the
  cap and own-workshop exemptions let a homeless household lay its home out (and are gone when the lab switch
  is off), a hungry household is still not pushed, a home site survives the stale-site sweep through the
  window, and determinism, resource conservation and save/replay hold.
- **Compatibility** is pinned by `tests/v33_continuation.expected.json`, recorded from `39c3027` before the
  behaviour existed: a rules-33 world continues bit-for-bit after this change, so nothing below 34 leaks.
- **The ablation** `rich-no-winter-shelter` removes only the cue, the nudges and the three exemptions; laying
  a site out, building, owning and living in a home are unchanged, and below version 34 it changes nothing.

**Not claimed here:** that any of this reduces deaths. That is an aggregate claim for measurement
(`scripts/death_tally.ts`, control vs `rich-no-winter-shelter`), not a fixture.

## Out of scope (noted, not built)

- A **second campfire**: nothing can lay one out today (only one exists, usually unlit), so "a fire in reach"
  for more households is a separate change.
- A **cheaper, more durable small solid home** for single people, with larger family homes (owner idea). As it
  stands lean-to/hut/house sleep 3/6/8 and `joinHouseholds` refuses a move-in past the host's sleepers
  (`src/sim/social.ts`), though homes at their limit were never above 1 in any measured row.
- A **founder mix** with more breeding-age adults and fewer children (`src/sim/worldgen.ts`); fertility is
  capped at about one birth per eligible woman per 24 days.
