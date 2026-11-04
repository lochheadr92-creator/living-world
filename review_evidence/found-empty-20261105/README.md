# Rules 161: a gatherer who turns away from an empty place says so (5 November 2026)

Brain priority findings, item 3. Diagnosis: `../interrupted-work-20261105/README.md`. In four 25-day ordinary worlds at rules 160,
the review ended 2,074 hunger gathers with "something better came up"; in 1,270 of them (61%) the person's own target had dropped out
of their options because they now believed it empty. Only the reason text was wrong.

## Rules 161 (`src/sim/found_empty.ts`, wired in `decision.ts reviewActivity`)

- When the review switches away from a gather whose own option is no longer offered because the person believes the source empty
  (`sourceUsable` says not usable with an estimate under 1), the ending reads "the place looked empty".
- The outcome stays `interrupted`, so failure memory, cooldowns, pay learning and every other consumer of the ending behave exactly as
  before. Danger and a deadlier need keep their own reasons. It applies to any gather of a source (the rendered case is stone).
- Lab removal: `rich-no-found-empty`. Below 161 the old text is kept.
- Nothing is moved, created or lost by the rule.

## Evidence

- **Contract tests:** `tests/found_empty.test.ts`, 5 tests: names an empty place and takes up the other bush; keeps the old reason where
  the place is not believed empty (including a place removed from the options by a recent failure); rules 160 and the lab removal keep the
  old reason; the same next activity, failures and cooldowns follow with and without the rule; the check is pure and a saved world
  continues exactly.
- **Immutable v161 reference:** river, 7,200 ticks then 120 after a save and load (`tests/v161_continuation.*`, `0698be37`).
- **Same world, 160 against 161** (`same-but-words.ts`, `same-*.json`): four ordinary Normal worlds, 25 days, same seed, a behaviour digest
  (positions, needs, packs, activity kind, target and phase) compared every 60 ticks, 1,000 samples each.

  | World | Behaviour identical | Alive 160 / 161 | Endings renamed (hunger gather / other gather) | Gathers still "something better" |
  |---|---|---|---|---|
  | forest | yes | 12 / 12 | 526 (357 / 169) | 798 |
  | river | yes | 20 / 20 | 441 (279 / 162) | 758 |
  | meadow | yes | 35 / 35 | 540 (333 / 207) | 881 |
  | life-stages-6 | yes | 34 / 34 | 501 (327 / 174) | 683 |

  Conservation holds in all eight worlds.
- **Full suite** (`../agent-20261105-161/suite/`): 2,914 tests, 2,901 pass, 10 fail, 3 pending. The failures are the known load-only
  timeouts: `lab_defaults` (3), `lab_report` (2), `zz_review_g_observer_purity` (2), `zz_review_main_toolreport_saves` (1), a 10 s hook
  timeout in `zz_review_h_retention`, and two files that did not fail at 160: `lab_provenance` (1, a killed child process) and
  `leisure` (1, a 400 s timeout).
- **Isolated rerun** (`../agent-20261105-161/isolated/rerun-quiet.log`): those eight files plus `found_empty` and `v161_continuation`:
  9 of 10 files pass. `lab_defaults` (3 tests) failed again in that grouped run (its child process is killed at 10 s) and passes alone:
  3 of 3 in 20.6 s, twice (`rerun-lab_defaults-alone.log`, and once in the rules-160 worktree in 16.2 s). It is a load-sensitive test
  that spawns a child, not a rules-161 effect.
- **25-day screens** (`../agent-20261105-161/{forest,river,meadow}`): each reaches the horizon with 500 pure checks, exact continuation
  and conservation. Deaths 16, 9 and 1; these worlds behave identically to rules 160, so they are not a 161 outcome. The reports record
  `dirty: true` for an uncommitted edit to `docs/DEPENDENCY_CHAIN_PROGRAMME.md`; no source differs.
- **Rendered check, ordinary world** (`render.mjs`, `render/`): the rules-161 Normal river world, Milo (elder, 70) at tick 2,840:
  "What happened after their last attempt? Breaking stone → interrupted: the place looked empty (1 world min ago)". Pure, no exceptions.
  `render-attempt1-reason-not-in-view/` is the first run, whose screenshot did not scroll to the line.

## Not claimed

No benefit. This changes what a viewer reads, not what anyone does. The hungry gatherer who walks to one picked-over patch after another is
still doing so; the diagnosis's other findings (stale, optimistic food beliefs in a famine; others walking to a place just found empty)
are queued, not repaired.
