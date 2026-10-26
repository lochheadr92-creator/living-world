# Bounded verification — 26 October 2026

Source: main `d84e5eaa828e86ea01b9847809875acd4259cf3a`, current rules 28.
Purpose: check observation neutrality, follow one natural inhabitant for two days,
and check exact replay/save continuity before proposing more features.

## Results

**Partial pass; a concrete save-continuation defect remains.**

- Ordinary meadow / Normal / 28 founders / immigration off / 4,800 ticks.
  First living founder selected before running: Pavel #997. No commands, model,
  staged supplies, altered needs or forced successes in this natural trace.
- 111 personal observation/card checks leave the complete serialized state unchanged.
  The independently generated unobserved twin matches every serialized field at all
  21 checkpoints, including the final tick. Ledger and tool checks pass at each.
- Pavel lives, health 82 → 100; all 28 founders survive. Recorded activities include
  gathering, drinking, eating, rest, sleep, social interaction and fire feeding.
  At ticks 2249 and 2668 wolf warnings fail because the recipient is already talking;
  other warnings are interrupted. This is actual failure, not scripted completion.
  At 4680 the shelter wait succeeds because daylight arrives.
- Restoring at tick 2400 matches initially, but diverges by checkpoint 3120:
  event #1115, originally at tick 17, has five IDs uninterrupted versus four restored.
  It says “Jonas, Isla, Eli, Lena have become a crew: Jonas's crew.” The extra ID is
  1001. Both feed and chronicle differ. At this first mismatching checkpoint,
  exhaustive comparison excluding only events and chronicle finds no other difference.
  The mismatch persists through the final checkpoint. The run exits nonzero honestly.
- Separate existing regression command:
  `npx --no-install vitest run tests/purity.test.ts tests/inhabitant.test.ts tests/inhabit_choice_identity.test.ts`
  passes 21 tests / 3 files, including every living person's card on meadow and river
  every 250 ticks through tick 5000. Typecheck passes.
- Separate scripted-controller replay:
  `npx --no-install vite-node scripts/replay_check.ts -- --seed meadow --from-day 1 --days 0.5 --no-arrivals`
  passes 4/4 checks, including exhaustive reconstructed saved-state equality;
  10 applied decisions, zero engine fallbacks, end hash `15132359`.
  This shorter, controlled run does not override the natural continuation failure.

## Root cause and next repair

`src/sim/crews.ts` passes `c.members` directly to the formation event.
`src/sim/events.ts:addEvent` stores `ids` by reference. Later `c.members.push`
retroactively edits the old event. JSON serialization loses the alias, so restored
history behaves differently. Both the diagnosis and serialized counterexample are
preserved here. No production simulation modules were changed by this verification.

Highest-value next repair: make event participant lists historical snapshots, cover
formation → save/load → later join with a regression, and follow the repository's
version/compatibility policy before changing historical semantics. Then repeat this
same bounded workload. Do not silently rewrite old references or relabel saves.

## Evidence and limits

`report.json` contains settings, source identity, activity counts, checkpoints and
failures. `trace.json.gz` holds the 111 personal observations. The two compressed
first-mismatch saves preserve the counterexample. Reproduce with
`npx --no-install vite-node scripts/bounded_verification.ts`.

One seed and two days do not establish long-term civilisation, broad survival benefit,
universal knowledge provenance or rendered usability/watchability. This is a headless
trace of autonomous choices, not a live AI inhabitation session or a browser review.

Existing modules touched, and why: none. Added one verification runner and its
evidence; simulation, UI, rules and historical fixtures remain unchanged.
