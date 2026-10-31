# Heard household supply — rules 100

Delivered 31 October 2026 on `main` after rules 99 (`779d581`, reference `87ad1f9`). Programme row A9 (voluntary
household coordination) of [DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Owner:
`src/sim/household_supply.ts`; lab removal `rich-no-household-supply`; rules 99 and earlier keep their recorded
behaviour and references.

## What existed and what was missing

The three records the owner's brief asks for already existed: a private intention (`Intention`), an accepted obligation
(`WorkHandover`, rules 94) and delivered contributions (`worked`, `creditStocked`). The channel existed too: since rules 92 a
member tells another, in a real `share_work` conversation offered within ten tiles once a day, which undertaking they are
working on, and the listener keeps a dated `workHeard` record with the teller's reported progress
(`continuity_knowledge.ts`). Nothing read that record when the listener decided what to take on. Two members of one
household could each set out to fill the same store, and `tests/household_preparation.test.ts` ("two members converge on
one store") says so; the home-site plan always picked the site's first missing material, so two members fetched the same
one (`shelter.ts shelterWanted`).

## Contract (rules 100)

- **A heard account is consulted, never the speaker's live state.** `heardSupply` reads only the listener's own `workHeard`
  records: same kind and target, the teller still of the listener's household as heard, heard within one day, the teller
  not known dead, and the work not already handed to the listener (`handover_state.ts`).
- **A season reserve is left to its teller.** When `preparationWanted` returns the season cue and such an account exists,
  no `stock` plan is adopted; the first deferral is logged in the listener's own words ("… said they are putting food by …
  I leave that reserve to them for now. I have promised nothing …") and recorded as `deferredAt` on the heard account,
  which the relationship history shows. Nothing is assigned; no commitment is created.
- **Hardship is never deferred.** A store the listener can see is nearly empty, or their own recent hunger, keeps the
  rules-2 hardship plan exactly as before: each member's own needs and dependants come first.
- **Complementary site material.** With a fresh heard `shelter` account naming the material the teller is fetching
  (`item`, recorded at 100 from the told plan's wants), the listener's own home-site plan takes the first *other* missing
  material; when it is the only one missing, they still fetch it (two trips for a large shortfall are parallel work, not
  duplication).
- **Reconsideration lapses on its own.** The account is stale after a day unless repeated through actual contact; a
  witnessed or told death, or an accepted handover, ends it; then the listener takes the reserve on exactly as before.
- Save validation accepts `item` and `deferredAt` only at rules 100; both are hashed with the heard records.

## Evidence

Focused contracts (`tests/household_supply.test.ts`, 8): real telling → deferral with log, history row, no commitment, no
duplicate log on re-review, hash change, exact reload, inspector/history/options purity; rules 99 and the ablation keep both
members on the same reserve; hardship never deferred; stale account and witnessed death restore the reserve; heard `wood`
makes the listener fetch `stone` at 100 and `wood` at 99, and the only missing material is still fetched; a deferral saved
under rules 99 is refused. Affected existing files pass **160 tests / 10 files**.

Rendered (`scripts/browser/household_supply_check.mjs`, **7/7**, `autonomy_evidence/supply100-rendered`, screenshots
inspected): Ada's inspector reads "Put 16 units of food by for the household"; Ada tells Ben with the bubble "I am
working to put 16 units of food by for the household; I have done 0 work so far"; Ben's panel carries no reserve plan and
his relationship history reads "Left that reserve to them since tick …; no promise made"; a day later with no fresh account
Ben takes the reserve on himself; the save reloads exactly. Staged household and offered-conversation selection; the plan,
the telling's content, the deferral and the take-up are engine decisions.

Ordinary river screen (`scripts/household_supply_observe.ts river … 5 300`, rules 100 and pinned 99, reports committed,
final saves local): five days / 12,000 ticks, 2,800 samples, 100 purity checks, exact twins, conserved, no deaths. The two
runs are **identical**: 341 sampled `share_work` offers, 4 started, 2 heard reserve accounts, 2 heard tool accounts, 24
reserve plans adopted, **all hardship-cued** (winter sets in on day 8, so no season window opens in five days), 206
samples of a household with two active plans for one store, **zero deferrals**. Of the 24 plans, 1 was dropped because
"the store came to hold 12 without their doing" (the duplicate-arrival signature), 3 finished, 9 were dropped for empty or
contested sources or the time limit; so the measured duplicate waste in this window is 1/24 and the dominant loss is food
scarcity at sources, not coordination. A ten-day river screen at rules 100 (`autonomy_evidence/r100-river10`, 24,000 ticks in 194.25 s, 5,618 samples, 200 purity checks, exact twin, conserved, no deaths) does reach the season window: 48 reserve plans, 5 season-cued and 43 hardship-cued, 604 sampled `share_work` offers with 6 started (one failed), 2 heard reserve accounts, 397 two-plans-for-one-store samples and **zero deferrals**. Ordinary season deferral did not occur in ten days; the telling is the scarce step.

## Rules 104 — told at supper (31 October 2026)

The five- and ten-day river screens above showed why rules 100 could not act ordinarily: the `share_work` conversation
started 4–6 times in several hundred offers, so the heard account almost never existed. A household supper is the place
where the same people already sit within arm's reach for a while (`household_practices.ts supperContact`, rules 24).
Rules 104 (`hasSupperTelling`, lab removal `rich-no-supper-telling`): once a guest has really sat with the host for
twenty eating ticks and both are of one household, each tells the other one shareable undertaking through the rules-92
record, with the meal's id and `via: 'meal'`, spoken at the table, bounded by the same once-a-day limit per listener;
nothing is assigned or promised. The relationship history reads "at supper #N". Validation accepts `via` only at 104.

Tests (`tests/supper_telling.test.ts`, 4): the staged family supper (the rules-24 practice fixture built at 104 with a
declared reserve plan) tells after twenty real table ticks with the meal id, logs and shows it, saves and reloads exactly,
conserves, and the fixture's next-day supper re-tells by replacing the one record; rules 103 and the ablation tell nothing;
a supper record is refused below 104. Rendered `scripts/browser/supper_telling_check.mjs` **5/5**
(`autonomy_evidence/supper104-rendered`). Ordinary river screens at 104 against pinned 103: (`scripts/household_supply_observe.ts`, reports committed, final saves local): river five days at 104 and at pinned 103 are identical (323 sampled `share_work` offers, 6 started, 22 hardship reserve plans, 228 two-plans-for-one-store samples, 1 reserve account heard in conversation, **zero** heard at supper), and so are forest five days (355 offers, 3 started, 17 plans) and forest ten days (653 offers, 4 started, 43 plans, 3 season-cued). The reason is the denominator: **no shared meal finished at all** in any of those windows (`meals done` 0), so the supper channel had no ordinary opportunity. Shared meals and the telling at them remain an ordinary-occurrence question for the longer owner-run horizons; the staged scene is the only direct evidence.

## Limits and what remains

- The season-only contract follows the owner's protection of each member's own needs; extending deferral to hardship is
  not warranted by this measurement (1/24) and would need its own evidence.
- The telling is rare ordinarily through conversation (4 of 341 offers in five river days at score 17); rules 104 adds the
  supper as a second real-contact channel (section above).
- No AI protocol change: the deferral is an adoption-time decision, not an offered action; the observation and transcript
  formats are unchanged. No aggregate benefit, fuller store or survival claim is made.
