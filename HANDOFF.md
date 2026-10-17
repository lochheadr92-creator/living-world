# Living World Repository Handoff

Updated: 2026-10-18

A continuation guide for this checkout. The repository and the current Git state are authoritative; this is a map, not a
replacement for them.

## Where things stand

- Checkout: `C:\dev\Claude Experiment\living-world`, branch `claude/awesome-dirac-07f8q1`, in sync with its remote.
- Branch HEAD: `5c6a677`. The working tree is clean (one ignored artifact directory, `gates_rich_out/`, listed in
  `.gitignore`).
- Integration branch: `main` (`8a2b6e7`), the remote default. **The branch is NOT yet merged into it.**
- Pull request: [#17](https://github.com/lochheadr92-creator/living-world/pull/17), open, draft, base `main`, head
  `claude/awesome-dirac-07f8q1`, 45 commits, `mergeable_state: clean`.
- Everything described below is committed and pushed. Nothing of value is uncommitted, stashed or outside the repository.

**The remaining step is the merge of #17 into `main`.** It was attempted and refused by the development environment's review
policy, not by the repository or by a failing check. It needs a human decision: mark #17 ready and merge it on GitHub, or
grant the merge permission. Until then, `main` does not contain any of this work.

## What landed on the branch in the latest pass

Eight commits, each one problem:

| commit | what |
|---|---|
| `9df4f46` | One current simulation: new worlds are the integrated one, the old `rich` preference is retired, saves keep their recorded rules |
| `f78dfed` | The town corrections (wolves, fishing, shelter rings, workplace allowance) reach rich worlds only; authored profiled worlds proven unchanged against `3cb4547` |
| `db4175f` | Stage 4's observation half: transmission diagnostics, the runner, the cohort and coverage rules |
| `0696552` | The D1 cooperation chain followed through with trades enabled |
| `90f69f9` | A rendered save/load/page-reload check in headless Chrome |
| `d0e066e` | Stage 0: rules versioning |
| `ff03035` | Current-status documentation reconciled |
| `5c6a677` | The experiment outputs the documentation cites |

## Rules versions (Stage 0)

`settings.rulesVersion` says which generation of simulation BEHAVIOUR a world runs. `src/sim/rulesversion.ts` is the only
owner of the question: the current version, what is supported, validation, what a world runs, and eligibility for behaviour
added later. Full policy in `docs/DEVELOPMENT_POLICY.md`, "Rules versions (Stage 0)".

- **Version 1** is the integrated behaviour as it stood on 2026-10-18. It is the first baseline, **not** a claim to reproduce
  any earlier release.
- Four version-like things are distinct and must not be conflated: the rules version, the save format (`VERSION` 4 in
  `src/app/save.ts`), `dynamics` (which family of rules), and replay fingerprints / lab interventions.
- New product worlds are stamped at creation; the version is preserved through save, load, app restore, cloning and lab
  forks, and replay, and it is part of `hashWorld`. Loading a supported version runs that version — nothing substitutes the
  latest.
- Invalid, withdrawn and future versions are refused in `deserializeWorld` **before** the active world is replaced, and
  `saveGame` refuses rather than overwriting a good save.
- **Unversioned worlds stay unversioned.** Which historical implementation made such a save cannot be recovered, so none is
  guessed; it is never eligible for later versioned gameplay, and **exact historical replay of such a world is not
  guaranteed**. No automatic or destructive migration exists; a deliberate conversion is a separate job. Fixtures and the
  goldens are unversioned on purpose.
- A future behavioural change raises `CURRENT_RULES_VERSION`, adds it to `SUPPORTED_RULES_VERSIONS`, and gates the new
  behaviour on `runsRulesVersion(world, N)` while keeping the older branch.

## Verification of the integrated branch

`npm run typecheck` clean · `npm test` **722 tests / 76 files** · `npm run build` clean · `git diff --check` clean ·
`npx vite-node scripts/golden.ts` all fingerprints unchanged · `node scripts/browser/current_world_check.mjs` **15/15**
(headless Chrome through the repository's CDP driver: behaviour, not appearance).

Limits worth carrying forward:

- The Stage 4 pilots are **one seed, one day** each. Days 4, 8 and 12 are missing, not zero; `hall` and `ask_info` were never
  exercised; zero cross-camp contact means unexercised in that window, nothing more.
- Stage 4 known-cohort coverage is low: the plan's day-0 cohort rule leaves 38 of 100 people unknown in a Large world, so
  every cross-camp figure describes about 37% of the data. Whether to keep that rule is a decision to take **before** an
  ensemble.
- No ensemble was run in this pass. `rich-no-transmission` is unwritten.
- Apprenticeship is built but barely exercised (one start, no graduations across four 12-day worlds).
- Rules version 1 proves same-build continuity and preservation, not compatibility with historical rich releases.

## Map

- `docs/DEVELOPMENT_POLICY.md` — one evolving simulation, how a change becomes standard, lab defaults, rules versions.
- `docs/EMERGENCE.md` — staged plan, stop rules, every measured result, the Stage 4 plan and its first pilots.
- `docs/RICH_WORLD.md` — the rich systems and what each one actually does.
- `docs/AUTONOMY.md` — the R1–R14 requirement matrix with current status.
- `docs/SCALING.md` — profiles, rule sets, the rich-only town corrections.
- `src/sim/rulesversion.ts`, `src/sim/transmission.ts`, `scripts/stage4.ts`, `scripts/stage4/metrics.ts` — newest modules.
- Experiment outputs in `learn_out/`, `noask_out/`, `town_out/`, `stage4_pilot_out/`, `stage4_pilot2_out/`.

## Next

The next behavioural task is **household preparation for scarcity and winter**. It is not started. The fifteen proposed
gameplay stages remain a backlog in `docs/EMERGENCE.md`; nothing here commits to them.

Before starting it: merge #17, or state explicitly that work continues on an unmerged branch.
