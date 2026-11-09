# A recruit candidate refuses for hands they know of: rules 178

Predecessor rules 177 is pinned by `tests/v177_continuation.expected.json`, recorded before this behaviour existed. Origin: gap ledger row
G30 (`docs/GAP_LEDGER.md`), the second half of the recruit-cap leak that rules 172 left. One rules version for one change (decision D2).

## The defect (every version up to 177)

In `social.ts` (`case 'recruit'`) the person being asked refuses with "enough hands already" when `helpersOn(world, siteId)` reaches the site's
`maxWorkers + 1`. `helpersOn` walks every living person's active help_build, haul or work commitment to the site. A candidate across the
settlement therefore refused because of crews they could not know of. Rules 172 had closed the asker's side only (`heard_helpers.ts`) and
said accepting "still uses that true count".

## The rule (rules 178, rich worlds)

`src/sim/known_hands.ts`, called from that one refusal. The candidate counts distinct hands they know of:

- their own active help on the site;
- people they remember as having promised them help there (the rules-172 reading of the social memory, `role: 'asker'`);
- people they currently see building or hauling (`SeenEntity.act`) within 4 tiles of the site.

That count replaces `helpersOn` in the refusal and nowhere else. The council branch, the active-commitment cap, acceptance, commitments and
accounting are untouched. Rules 177 and earlier, authored worlds and `setKnownHands(false)` keep the register count. The lab name for the
removal is `rich-no-known-hands`; it is not registered in `scripts/lab/lab.ts`, which another session holds with uncommitted edits.

## What it can change

A candidate who knows of no one is no longer refused on the true count, so a site can collect more helpers than `maxWorkers + 1`. A candidate
at the site who sees a full crew still refuses. No benefit is claimed.

## Evidence

- Contract tests `tests/known_hands.test.ts` (7). Two fail on the 178 behaviour before the wiring: a staged recruit conversation (pinned
  bystanders, four true commitments out of sight) is refused "enough hands already" at 177 and is not at 178. The others cover the count
  (own help, remembered promises, workers seen near the site, each person once, not far workers, not idle ones), the switch, and the
  version/authored gate.
- `npm run typecheck` passes. Focused set (18 files, recruit, promise, commitment, social and rules-version tests): 236 tests.
- Full suite from a clean checkout of `df14f8cf` (three shards, 12 workers): the same 65 tests in ten files fail as at the previous commit
  (`review_evidence/empty-food-landing-20261109/failing-tests-10d3adf2.txt`); no new failure. The observer-purity test timed out under shard
  load and passes alone. The 8 new tests pass.
- Immutable pin `tests/v178_continuation.*` (Normal river, arrivals on, 2,400 ticks then 120 after a save and load; from tick 801 a site has
  helpers and someone knows of a different number than the register holds, sampled every 50 ticks), recorded from a clean checkout of
  `79b35d6d`; the pin test passed there, 1 of 1 in 5.7 s. In birch, forest and river no site holds more than 2 helpers in 12,000 ticks, against a
  cap of about 4, so no ordinary world reaches the refusal there and the pin does not reach it either; the unit tests do.
- Paired comparison, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at rules 177 and at 178 from a clean checkout of
  `df14f8cf`, two processes at a time: the final world (rules number masked) is identical in 12 of 12 seeds, and conservation and the tool
  registry hold in all 24 runs. `review_evidence/known-hands-20261109/`. The lab's nudge arms were not run because identical worlds cannot differ.

## Not done

G26 (other same-household reads), G31 (welfare), G94 (who can mind the children).
