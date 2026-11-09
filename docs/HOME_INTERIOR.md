# The contents of a home are learned from inside or at the door: rules 184

Predecessor rules 183 is pinned by `tests/v183_continuation.expected.json`. Origin: gap ledger row G19 (`docs/GAP_LEDGER.md`), the remainder of rules 169. One rules version for one change
(decision D2).

## The gap (every version up to 183)

`observe` (`knowledge.ts`) copied a building's store into the observer's belief through `snapshotEntity` (kinds and a full flag since rules 169, not counts), plus the racked tools, the textile stock
and the gear stock, from anywhere inside sense radius. Only the hearth was held back until the observer was indoors. So a person nine tiles from another household's hut learned that it held grain
and a net.

## The rule (rules 184, rich worlds)

`src/sim/home_interior.ts`, called from `observe` after the sight is built. When the building is a solid home (`hut` or `house`) and the observer is neither inside it nor within two tiles of its
footprint, the sight keeps what they already believed of its contents (items, racked tools, textile stock, gear stock; nothing if they believed nothing) instead of copying the true store. The
building's existence, type, owner household and condition are still learned from outside. Stores and workplaces (storehouse, granary, kiln and the like) are open sheds and are not touched. Rules 183
and earlier, authored worlds and `setHomeInterior(false)` copy as before. The lab name for the removal is `rich-no-home-interior`; it is not registered in `scripts/lab/lab.ts`, which another session
holds with uncommitted edits.

## What it can change

A thief, a borrower or a carer no longer learns what is in another household's home from across the yard, and a household member learns their own home's stock only when inside or at the door, so
they may act on older figures. A limit: the belief's `seen` tick is still refreshed, so a kept figure can look fresher than it is. A successor could exempt a person's own household's home. No
benefit is claimed.

## Not changed

Hearsay of contents, the rules-169 glance (kinds and full flag), the hearth rule, stores and workplaces, accounting.

## Evidence

- Contract tests `tests/home_interior.test.ts` (8). Two fail with the rule disabled (the hut shows its contents from eight tiles; an earlier belief is not kept), and all eight pass at 184. The others
  cover the door and inside cases, a storehouse seen from outside, the switch and the authored gate.
- `npm run typecheck` passes. A focused set (51 files, knowledge, stock, shelter, care, hearth, gear): 479 tests pass and the 21 failures in it are all on the baseline list.
- The full suite found one real regression: `tool_plan_capacity` M1 staged an elder observing her hut from 2.5 tiles and relied on its stock being seen. The scene now looks at the hut from its door
  (`e4d4f431`); the scene's purpose is unchanged. A rerun of the full suite from a clean checkout of `45a0a8df` fails the same 65 baseline tests plus the observer-purity timeout, which passes alone
  with `lab_defaults` and the pins for rules 182, 183 and 184.
- Immutable pin `tests/v184_continuation.*` (Normal birch, arrivals on, 14,000 ticks then 120 after a save and load; from tick 12,176 somebody outdoors is in sight of a stocked hut and not at its door,
  sampled every 25 ticks), recorded from a clean checkout of `e137f697` (probe run twice, identical); the pin test passed there, 1 of 1 in 30 s. The predicate is a state condition, not a counted
  belief that was withheld.
- Twin, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 183 and at 184 from a clean checkout of `44e8af3b`, two processes at a time: the final world is identical in 0 of 12
  seeds; conservation and the tool registry hold in all 24 runs.
- Paired lab, same checkout, 10 November 2026: 12 seeds, Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 183 pinned against current rules 184,
  `scripts/lab_versions.ts` (the first attempt pinned both arms and was refused by the guard for the current version; only the 184 arm was rerun, unpinned, on the same worktree). Both arms finished 12 of 12
  seeds, three arms each; provenance head `44e8af3b`, `dirty` false, `modified` empty. It ends: nothing moved by more than a single draw moves it. People 23.6 against 22.8 (floor ±5.5), deaths 8.4 against
  9.2 (±5.2), mean hunger 46.2 against 48.7 (±6.2): not distinguishable from chance. Seven rows are systematic and inside their floors (workplaces +0.5, below critical -1.2, first yard day -1.4, mean
  mood +3.2, low mood -1.9, mean condition +2.3, home food per person +0.1); none is called larger than chance. No benefit or harm is claimed. `review_evidence/home-interior-20261109/`.

## Not done

Thefts and the beliefs about a home's stock were not counted. A person's own household's home is gated like any other. Workplaces and stores stay open to sight.
