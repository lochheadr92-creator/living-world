# A worry about someone out of sight follows what the worrier knows: rules 179

Predecessor rules 178 is pinned by `tests/v178_continuation.expected.json`, recorded before this behaviour existed. Origin: gap ledger row
G31 (`docs/GAP_LEDGER.md`), the part of review item 6 that rules 170 left in `welfare.ts`. One rules version for one change (decision D2).

## The defect (every version up to 178)

A person who worries about someone else (`Concern`, kinds hungry, thirsty, cold, hurt, bereaved) keeps the worry and may offer a visit. After rules 170
(dead or missing subject) `welfare.ts` still read the remote subject's live state in three places:

- `outOfDate`: a bereaved worry was dropped when the subject's live `lifeEvent` was no longer bereaved;
- `outOfDate`: a hungry, thirsty or cold worry about a grown person survived past `SELF_FIX_WINDOW` only if `isDependent`, which reads live health;
- `welfareOptions`: the visit offer took "someone who cannot manage alone" from the same live read.

Changing only the subject's private health therefore changed what the worrier did. The adversarial review recorded it at rules 115
(`tests/zz_review_d_welfare_truth.test.ts`, which pins rules 115 and is unaffected).

## The rule (rules 179, rich worlds)

`src/sim/known_welfare.ts`, called from those reads in `welfare.ts`. A subject counts as unable to manage alone when they are a child by age (age is no
secret) or the worry's own kind is `hurt` (the worrier saw them hurt). A bereaved worry ends by age alone: it already ends at `CONCERN_LIFE`, and the live
check could only end it sooner. Frailty is not guessed.

Rules 178 and earlier, authored worlds and `setKnownWelfare(false)` keep the live reads. The lab name for the removal is `rich-no-known-welfare`; it is not
registered in `scripts/lab/lab.ts`, which another session holds with uncommitted edits (the earlier rules are pinned with `--rules 178` instead).

## What it can change

A frail adult or elder the worrier last saw hungry, who has since been hurt out of sight, is no longer kept as a worry past `SELF_FIX_WINDOW`; age stands in
for dependency. The reverse also holds: a healthy adult the worrier once saw hurt keeps the worry. No benefit is claimed.

## Not changed

`ctx.dependents` (`optutil.ts:160`, the household's live-health dependants, shared with G94), the same-household tests in `welfare.ts` (G26), the dead or
missing path (rules 170), `whereIs`, the arrival check in the `visit` handler (first-hand, reads the person they stand next to), accounting.

## Evidence

- Contract tests `tests/known_welfare.test.ts` (9, staged as the review test is). Three fail on behaviour at 178 before the module existed (a hurt adult out
  of sight is kept and offered a visit at 178 and is out of date at 179; the bereaved check; the unable-to-manage read) and all nine pass at 179.
- `npm run typecheck` passes. Focused set (22 files, welfare, concern, visit, lifechanges and rules-version tests): 221 tests.
- Full suite from a clean checkout of `472e1ebb` (three shards, 12 workers): the same 65 tests in ten files fail as at the previous commit
  (`review_evidence/empty-food-landing-20261109/failing-tests-10d3adf2.txt`); no new failure beyond the observer-purity test, which timed out under shard
  load and passes alone (four files rerun alone, 14 of 14 tests, 199 s).
- Immutable pin `tests/v179_continuation.*` (Normal birch, arrivals on, 10,000 ticks then 120 after a save and load; from tick 9,501 a worry's subject is
  dependent on the live read and not on the known read, or the reverse, sampled every 50 ticks), recorded from a clean checkout of `eca3bb0a`; the pin test
  passed there, 1 of 1 in 15.9 s.
- Twin, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 178 and at 179 from a clean checkout of `472e1ebb`, two processes at a
  time: the final world differs in 11 of 12 seeds (gen-6 is identical); conservation and the tool registry hold in all 24 runs. One world per seed is one
  chaotic draw, so the per-seed columns are not evidence of an effect.
- Paired lab, same checkout, 2026-11-09: 12 seeds, Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 178 pinned with
  `--rules 178` against current rules 179, `scripts/lab_versions.ts`. Both arms finished 12 of 12 seeds, three arms each; provenance head `472e1ebb`,
  `dirty` false, `modified` empty. It ends: nothing moved by more than a single draw moves it. People 23.5 against 23.5, deaths 8.5 against 8.3
  (interval [-1.3, +0.8], floor ±4.4), mean hunger 50.7 against 49.3 (interval [-4.3, +1.5], floor ±8.0). Buildings -0.8 (down 10 of 12, floor ±3.6) and
  homeFoodPerPerson -0.1 are systematic and inside their floors; they are not called larger than chance. No benefit or harm is claimed.
  `review_evidence/known-welfare-20261109/`.

## Not done

G26 (other same-household reads), G94 (rules 180, who can mind the children), and `ctx.dependents` in `optutil.ts`.
