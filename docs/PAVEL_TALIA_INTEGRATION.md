# Pavel and Talia integrated after Stage 3 (rules 119-121)

Owner instruction, 2 November 2026: "merge all works into main". The owner then chose the
scope: Stage 3 plus Talia and Pavel, with old and superseded branches left unmerged. Push
is withheld until the owner says otherwise.

## What was integrated

| Line | Branch tip | Branch numbering | Main numbering |
|---|---|---|---|
| Stage 3 chain repairs | `stage-3-chain-fixes` `320c521` | 117, 118 | 117, 118 (unchanged; fast-forwarded first) |
| Pavel lived life | `feature/pavel-lived-life` `c3f1310` | 117 | **119** |
| Talia childhood | `feature/talia-lived-childhood` `57ffc48` (contains Pavel) | 119 | **120** |
| Resumed gathering credit (Talia) | `57ffc48` | 120 | **121** |

Both lines branched from `dbe229e` (rules 116), so they used overlapping numbers.

## How

1. `e97f192`: on the Talia tip, move every Pavel/Talia gate, registry entry and version-specific
   test from 117/119/120 to 119/120/121, highest first. Remove the branch-local 117/119
   continuation records, which were taken on pre-integration code under the old numbers.
2. `354db6b`: merge main (Stage 3). There were four conflicts:
   - `rulesversion.ts`: combined comments; current 121; 117 and 118 supported.
   - `production.ts`: Pavel `5d0bb78` and Stage 3 F1 `52ec833` made the **same** one-line
     project-acquisition fix. Kept Stage 3's `hasProjectAcquire` (rules 117+), which covers
     119+ identically. As a result, `rich-no-lived-life` no longer removes that fix;
     `rich-no-project-acquire` does.
   - `lab.ts`, `options_work.ts`: kept both sides' imports.
3. `b123187`: save provenance. Integrated 119/120 saves carry `RULES_119_GENERATION` /
   `RULES_120_GENERATION`. Unmarked or foreign 119/120 saves are refused unchanged, following
   the 27/29 precedent.
4. `cb90ea8`: new immutable continuation references for 119, 120 and 121, recorded once on
   `b123187`. They were recorded at the integration rather than before each successor,
   because the three versions arrived together already final and gated. Each
   `scripts/v1NN_reference.ts` refuses to re-record.

## Compatibility limits

- **Unmarked 117 stays Stage 3's.** Marking it would change the recorded Stage 3 rules-117
  save digests. A branch-built Pavel "117" save that already holds lived-life state is refused
  by the company/night validators (now gated at 119). One saved before any such state exists
  cannot be told apart, and would load as Stage 3's 117. Keep branch-built Pavel saves with
  their original build.
- Branch-built Talia 119/120 saves are refused as ambiguous. They are not migrated.
- The `pavel_evidence/` and `talia_evidence/` folders and the two feature records keep the
  branch numbering. They are historical evidence and are not re-run here.
- The 121 reference is an ordinary meadow continuation (24 childhood experiences). It does
  not stage a resumed gathering; `tests/resumed_gather_credit.test.ts` covers that at 120/121.

## Verification

Run on 2 November 2026 in the isolated worktree `living-world-pavel-talia-integration`, at
`cb90ea8`. This is the same runtime as this documentation commit.

- Full suite: **391 files, 2,412 tests passed**, no skips/todos, 284.49 s
  (`vitest run tests --maxWorkers=8`). Node's existing `TimeoutOverflowWarning` appeared and
  is not a failure. Stage 3 recorded the same warning.
- This includes Stage 3's immutable 117/118 references, every older reference and golden,
  the new 119/120/121 references and the 119/120 save-provenance tests. Stage 3's 117 and 118
  references also passed on the merged runtime before the new references were recorded.
- `tsc --noEmit -p tsconfig.json` clean; `vite build` succeeded (existing chunk-size notice only).
- Reference counts equal the branch records: 119 has company 14 and night experience 3;
  120 has 24 childhood experiences.

Not done at this point: no rendered check (added below), no long-run (added below) or ensemble measurement,
no re-run of the Pavel/Talia evidence screens. Combining Stage 3 with Pavel/Talia has no
measured benefit claim. The local log is `integration_evidence/` (not committed).

## Browser verification and push (2 November 2026)

**Tested commit:** `3f65f8c`, merged main, served by `vite` from the main checkout (no tracked
modifications) at `http://127.0.0.1:5273/`. **Method:** headless Chrome driven by the committed
`scripts/browser/cdp.mjs`. Claude in Chrome was not connected. Each check evaluates the running
page and reads the rendered inspector text.

| Check | Result |
|---|---|
| Committed `scripts/browser/current_world_check.mjs` | 15/15: save, load, page reload, legacy round trip, no page errors |
| Focused Pavel/Talia/rules-121 check | 13/13 (detail below) |
| Stored-save envelope check | 4/4 on rerun, after one corrected assertion (below) |

Observed in the focused check:
- A new ordinary meadow world runs rules 121. After 3,000 ticks, 20 people hold
  continuing-company records and 5 night-shelter accountings exist.
- Pavel's rendered relationship history shows "Spent time with Mona again: 1 day of
  continuing company."
- Family time, play and foraging practice all occurred. Talia's rendered panel shows "A
  guessing game together for 120 ticks. With Wes."
- A rules-121 save loads back to tick 3000, hash `65d4a72c`, survives a page reload, and
  continues 120 ticks.
- In the page, a rules-120 save is marked and roundtrips, and an unmarked one is refused as
  ambiguous.
- With a decision waiting in Talia's by-hand session, Load ends it ("the previous session ended
  before the swap") and nothing is left waiting.
- No page exceptions.

The focused check's own envelope assertion (D2) checked nothing, because the save is in
IndexedDB, not localStorage. The separate stored-save check covers it. It decompresses the
IndexedDB record and finds rules 121 in both the settings and the envelope, no generation
marker, the main lineage, and the same hash `65d4a72c` in a fresh browser launch. Its earlier
attempts:
- The first errored because the headless profile does not persist across launches. Its log was
  overwritten and its empty output folder removed.
- The second failed 1 of 4 checks, because the assertion wrongly expected an empty `scene`
  where natural worlds store `"natural"`. That log is retained.
- The rerun, with only that assertion corrected, passed 4/4.

**Evidence locations.** None of this is committed.
- Logs, screenshots and `report.json` files are local, untracked evidence in
  `C:\dev\Claude Experiment\living-world-pavel-talia-integration\integration_evidence\`:
  `browser-current-world.log`, `browser-pavel-talia-121.log` and folder,
  `browser-stored-save-121.log` (the failed run), and `browser-stored-save-121-rerun.log`
  and folder.
- The focused and stored-save scripts were session scratch files outside the repository.
- The only committed files involved are `scripts/browser/cdp.mjs` and
  `current_world_check.mjs`.

**Limits.**
- The screenshots show the top of each inspector panel. The relationship-history notes were
  confirmed in the rendered page text.
- One seed, about 3,000 ticks. No long run, ensemble, mature-world viability or benefit claim.
- No interactive visit with a real (non-headless) user browser.

**Push.** All checks passed and the 26 outgoing commits matched this record, so main was pushed
without force: `dbe229e..3f65f8c`. The integration worktree, its branch and all untracked
evidence were kept.

## 25-day long runs at rules 121 (2 November 2026)

Owner instruction: run the three-seed long-run check on merged 121, make immigration on the
standard, then run immigration off as well. From `df9757d` the long-run observers
(`ready_step_observe.ts`, `household_supply_observe.ts`, `promised_supply_observe.ts`) use
`currentWorldSettings('normal', seed)`, the settings of a new product world, so arrivals are on.
Earlier evidence recorded with arrivals off keeps its dated description.

Both runs: `scripts/run_longruns.ps1 -Checks production -Seeds forest,river,meadow -Days 25
-BudgetSeconds 1800`, Normal profile, 28 founders, rules 121. Arrivals on ran from the main
checkout at `df9757d`. Arrivals off ran from the integration worktree at `3f65f8c`, whose `src/`
is identical to `df9757d` and whose observers still force arrivals off. Both sources were clean.
Every run reached tick 60,000 with conservation, an exact unobserved-twin continuation and 500
observer-purity checks passing. One earlier arrivals-off attempt at `ef1e528` was stopped
unfinished when the standard changed; its partial folder is kept.

| Seed | Rules 118, arrivals off (Stage 3) | Rules 121, arrivals off | Rules 121, arrivals on |
|---|---|---|---|
| forest | 21 alive, 10 deaths | **1 alive, 28 deaths** | **4 alive, 29 deaths** (4 arrivals) |
| river | 23 alive, 7 deaths | 24 alive, 6 deaths | 19 alive, 21 deaths (10 arrivals) |
| meadow | 26 alive, 2 deaths | 28 alive, 2 deaths | 33 alive, 8 deaths (11 arrivals) |

Arrivals are derived as everyone who lived, less 28 founders and recorded births (1-2 per run).
No run built or held a cart.

Observed:
- Forest collapses at rules 121 with or without arrivals. Arrivals off: hunger 16 (days
  18.9-23.2), wolf 4, thirst 4, exposure 3, fever 1. Arrivals on: hunger 14 (days 21.9-23.1),
  exposure 6, fever 4, thirst 3, wolf 1, injuries 1. Stage 3's rules-118 forest also had a
  late hunger cluster (6 deaths, days 23.1-23.7), but far smaller.
- River and meadow at rules 121 with arrivals off are close to Stage 3's rules 118.
- With arrivals on, river loses more people (hunger 13, days 22.7-24.9) and meadow ends larger.

Limits. One run per seed and setting; each world is chaotic, and 118 and 121 differ in several
rules and their whole trajectories. These runs do not establish that the Pavel/Talia rules cause
the forest collapse, nor that arrivals cause the river losses; they show where to look. A paired
ablation (`rich-no-lived-life`, `rich-no-childhood` against control and nudges over many seeds)
would be needed for attribution. No survival target is claimed or failed.

Evidence (local, untracked, in the main checkout): `integration121_evidence/longrun-25days-arrivals/`,
`integration121_evidence/longrun-25days-noarrivals/`, their `.log` files, and the stopped
`integration121_evidence/longrun-25days/`. Stage 3 figures are from
`stage3_evidence/part-b-25days/reports/`.
