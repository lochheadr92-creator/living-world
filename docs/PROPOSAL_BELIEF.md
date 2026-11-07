# A proposal is made from the proposer's own feelings and beliefs — rules 164

Predecessor rules 163 is pinned by `tests/v163_continuation.expected.json`, recorded before this
behaviour existed. Origin: the 7 November 2026 whole-project adversarial review, item 6 (omniscience
leaks), the leak at `src/sim/options_social.ts` `optPropose`, re-verified against source first. One
leak, one rules version (decision D2); the others in item 6 are listed under "Not touched".

## The defect (rules 115 to 163)

`optPropose` decides whether Ada is offered "Ask Ben to move in together" (or "about sharing a
home"). Besides her own regard for him (`p.relations[q.id]` affinity, trust, familiarity) it read:

- `q.relations[p.id]`, **Ben's own private relation toward her**, and offered the ask only when it
  existed and his affinity was at least 26 (a couple) or 32 (roommates). Nothing Ada can see or
  remember carries that figure. Changing only Ben's private affinity changed Ada's options; the
  review's staged test (`tests/zz_review_d_propose_truth.test.ts`, kept as it was, at rules 115) shows it.
- `world.households.find(h => h.id === q.hhId)?.homeId` and the type of that building, the **true**
  household home and how many it sleeps, even if Ada had never seen it.

The effect was that almost every proposal that was made would be accepted (the acceptance test in
`social.ts`, affinity at least 28 or 32 with a draw, uses the same figure): a person could not misjudge
whether they were wanted.

## The rule

`src/sim/proposal_belief.ts` (`hasProposalBelief`: rich, rules 164 or later, switch on), read in
`optPropose`:

- the other's private regard is not read. Ada asks on her own feelings, with her own thresholds
  unchanged (couple: affinity 30, trust 20 and the pair's spark; roommates: affinity 38, trust 26);
  she finds out by asking. `social.ts` already answered from Ben's own figure and, on a refusal,
  already set a 2,400-tick cooldown on that ask (1,500 when nobody could move); nothing there changed;
- the room for a roommate is a building Ada **believes** belongs to Ben's household and sleeps at least
  one (`beliefsByKind(p, ['building'])`, `b.hh`, `BUILD_DEF[type].sleepers`), seen or told, never the
  true household home. She must have seen or heard of it; a stale belief stays as stale as it is.

Unchanged and not part of this rule: whether Ben is a candidate at all (in sight and not busy),
`spark(p, q)` (a seeded pair attraction, symmetric by construction), the partner status of both, the
hunger and thirst gates, and `ctx.members.length` (the proposer's own household count).

Rules 163 and earlier keep their recorded behaviour. The module switch `setProposalBelief`
(`proposalBeliefOn`) restores the rules-163 reads inside a rules-164 world.

## Evidence

- **Contract tests** `tests/proposal_belief.test.ts` (8; the commit message of `6737465b` says 7): the
  review's own method, change one hidden fact and diff Ada's options. Ben's private affinity toward
  her is set to 10, 30 and -50: at 163 the proposal option appears only at 30; at 164 it is offered in
  all three and the whole option list is identical; a person with no relation of his own toward her is
  asked at 164 and not at 163; a person with no regard of their own (affinity 10) does not propose at
  either version; a roommate offer for a home Ada has never seen is made at 163 and not at 164 until
  she has observed a hut of his household, and a hut of some other household does not count; a
  proposal to a lukewarm neighbour is made, refused (the existing 2,400-tick cooldown) and not
  repeated during it, with conservation and an exact save/load round trip; the module switch restores
  the 163 reads. The 6 tests that do not import the new module were run against a `git archive`
  export of `25ee4147` (the commit before the change): 4 fail on behaviour, the other 2 (no regard of
  their own; a hut of another household) are guards that hold at both versions
  (`review_evidence/proposal-belief-20261107/test-before-at-25ee4147.txt`). The review's staged
  test `tests/zz_review_d_propose_truth.test.ts` still passes unchanged: it runs at rules 115.
- **Earlier rules unchanged:** 18 files, 114 tests (the pins 93, 161, 162 and 163, the goldens, rules
  version, social, lifechanges, temperament, cooperation, inhabit proposals, estate release and
  shared stone): all pass (`test-related-after.txt`). Immutable rules-164 continuation
  `tests/v164_continuation.*`, recorded in `0d963f23` from a clean checkout before any successor:
  the Normal birch world with arrivals on, 18,000 ticks (a couple proposal at tick 16,251), then 120
  more after a save and load.
- **Ordinary worlds**, read-only probe `review_evidence/proposal-belief-20261107/proposals.ts`
  (steps the world, and every 120 ticks reads every adult's options through the observer entry
  point), from a clean checkout of `6737465b`, Normal profile, arrivals on, 25 days:
  - four seeds (econ-cc3, forest, meadow, river) at 163 and 164: one proposal option is ever offered
    (forest, one pair, in 5 of 8,752 adult samples), no proposal is made, the worlds are identical;
  - the twelve lab seeds (aspen, birch, cedar, fern, gen-1 to gen-6, meadow, river) at 163 and 164,
    final-state hash with the rules number masked: **identical in 12 of 12**. The option is offered in
    5 of the 12 seeds (14 pairs: birch 4, cedar 1, fern 2, gen-3 4, gen-4 3; at most 22 of 7,920
    adult samples in any one world, fern), 5 proposals are made (all to share a life; birch 1, fern 1, gen-3 2, gen-4 1),
    1 is refused (gen-3, at both versions), and **every pair offered at 164 was also offered at 163**:
    the other person's private affinity already met the old threshold in all of them, so dropping the
    read removed no offer and added none. Why offers are so rare (two unpartnered adults with a
    mutual spark, in sight, fed, with the proposer's own affinity at least 30 and trust at least 20) is
    not investigated here.
  - conservation and the tool registry hold in all 32 runs (8 + 24).
- **Full suite**, clean checkout of `0d963f23` (`suite_run.ps1`, `suite-run.txt`): 516 of 520 files,
  2,982 of 2,989 tests with 3 skipped, in one parallel run of 403 s. The four files that failed
  (`lab_defaults`, `zz_review_g_observer_purity`, `zz_review_h_retention`,
  `zz_review_main_toolreport_saves`) are the load-sensitive ones that failed in the same way for rules
  163; one at a time on an idle machine all pass, 10 of 10 tests in 223 s
  (`rerun_failed_alone.ps1`, `suite-failed-rerun-alone.txt`).

**What this does and does not show.** A knowledge-boundary leak is closed and the closing is
demonstrated by the differential test, which is the claim being made. In ordinary 25-day Normal worlds
it changes nothing, so no effect on households, couples, survival or mood is claimed or measured; the
12-seed paired lab with a nudge floor was not run (below). The leak could matter where affinity is
asymmetric, in longer worlds, or in a world that offers many more proposals; none of that is
measured.

## Not touched, and open

- **The paired lab.** The lab's removal arm needs `rich-no-proposal-belief` registered in
  `scripts/lab/lab.ts`, which holds another session's uncommitted edits; the registration (an import
  and one branch line) and a test that it installs the switch await the owner's decision. The
  twelve-seed twin above is the substitute, and it shows no divergence to measure.
- **The other item-6 leaks** (adversarial review, `daily/2026-11-07-living-world-adversarial-review`):
  a housemate's death known at once (`friendlyTo`, `repairStake` in `options_work.ts`; `membersOf`
  in `households.ts`), "the settlement has a storehouse" judged from the true world
  (`noStorehouseNear` in `shared_stone.ts`; its callers in `options_work.ts`), `optClaimHome` and
  `optWaterRun` (`options_work.ts`), the `setAside` model text (`options_work.ts`, observation or
  protocol, not rules), exact hunger and thirst of someone in sight (`optOffer` in `options_social.ts`,
  `knownNeeds` in `remembered_need.ts`), and exact store contents copied at sight
  (`knowledge.ts` `snapshotEntity`). Five of these sit in files that another session has modified and
  not committed (`options_work.ts`, `shared_stone.ts`).
