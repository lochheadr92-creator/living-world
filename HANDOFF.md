# Living World Repository Handoff

Updated: 2026-10-18

A continuation guide for this checkout. The repository and the current Git state are authoritative; this is a map, not a
replacement for them.

## Where things stand

**The work is merged.** `main` is the integrated branch and carries everything described below.

- Checkout: `C:\dev\Claude Experiment\living-world`, on `main`, in sync with `origin/main`. The working tree is clean
  (one ignored artifact directory, `gates_rich_out/`, listed in `.gitignore`).
- Integration commit: **`e81aad4ed5e08facf7e438f88aad33705d13fab8`**, the merge of `claude/awesome-dirac-07f8q1`.
- Pull request [#17](https://github.com/lochheadr92-creator/living-world/pull/17): **closed and merged** on 2026-10-18,
  base `main`, head `f1e93b2`, merge commit `e81aad4`.
- `main` contains the feature head `f1e93b2` and the CLI rules-version fix `eada793` (both checked with
  `git merge-base --is-ancestor`).
- The feature branch still exists and has not been deleted.

### Verification of the merged result

Run by the owner on the merge commit itself, and reported as successful: `npm run typecheck`; `npm test` - **747 tests
across 77 files**; `npm run build`; `git diff --check`; `npx vite-node scripts/golden.ts` - all fingerprints matched;
`git merge-base --is-ancestor` against the feature head; `git push origin main`.

Run here on merged `main` (`e81aad4`), against a temporary Vite dev server on port 5183:

```
node scripts/browser/current_world_check.mjs http://localhost:5183/      →  15/15 passed
```

That is headless Chrome integration evidence through the repository's own CDP driver (`scripts/browser/cdp.mjs`): the app
boots, renders and runs its own clock in a real browser, and each answer is read out of the running page. It evidences
BEHAVIOUR - a new world runs the current rules; a stale `rich: false` preference cannot hold it on the legacy ones; a
paused world saved at tick 329 is restored to tick 329 and the same state hash after the world has moved on to 529, keeps
its settings, carries on to 379, and survives a page reload; an authored legacy save keeps `dynamics: 'authored'` and its
own state; and a new world started afterwards is current again. It says nothing about visual quality or usability, and
nothing is asserted about the drawing.

What that check does **not** cover: it reads `settings.dynamics`, not `settings.rulesVersion`. The rules-version
guarantees - stamping, preservation through save, load, restore, fork and replay, rejection of unsupported and future
versions, and the unversioned policy - rest on `tests/rules_version.test.ts` (28) and `tests/run_rules.test.ts` (25), not
on this browser run.

## What landed, each commit one problem

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
| `e4fcc86` | Handoff refreshed |
| `eada793` | **A command-line run is the current simulation too, version and all** |

## The CLI rules-version gap, found and fixed (`eada793`)

The app stamped `rulesVersion` on new worlds; the scripts did not. `lab_seed`, `inhabit`, `replay_check`, `activity_mix`
and `cascade` built their "current" worlds through `settingsForProfile`, which is deliberately unversioned - so a default
lab run measuring "the current simulation" was on the legacy baseline, and would have stayed there as the app moved to a
later version. The existing lab-fork test could not catch it: it serialises an already-versioned world and never touches
the configuration path.

Fixed by one shared helper, `freshRunSettings` in `src/sim/profiles.ts`, used by all five. `--dynamics` now takes `rich`
(current rules and version), `authored` (legacy, unversioned) and `rich-unversioned` (a rich world deliberately on the
legacy baseline, for reproducing a pre-version measurement). Lab rows carry `rulesVersion` beside `dynamics`, explicitly
null when unversioned; the resume guard moved to `scripts/lab/guard.ts` so it reads the version constant instead of
copying the number, and runs before anything is created or any worker starts; `scripts/gates.ts` compares the version too,
so one generation is never gated against a baseline from another. `tests/run_rules.test.ts` (25) exercises the real
argument path by running the scripts.

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

## Limits worth carrying forward

These stand after the merge. None of them is fixed by it.

- The Stage 4 pilots are **one seed, one day** each. Days 4, 8 and 12 are missing, not zero; `hall` and `ask_info` were never
  exercised; zero cross-camp contact means unexercised in that window, nothing more.
- Stage 4 known-cohort coverage is low: the plan's day-0 cohort rule leaves 38 of 100 people unknown in a Large world, so
  every cross-camp figure describes about 37% of the data. Whether to keep that rule is a decision to take **before** an
  ensemble.
- No ensemble was run in this pass. `rich-no-transmission` is unwritten.
- Apprenticeship is built but barely exercised (one start, no graduations across four 12-day worlds).
- Rules version 1 establishes the supported baseline. It does not reconstruct unidentified historical rich releases, and it
  does not prove compatibility with any of them. What IS verified across revisions: saves produced by pre-merge `main`
  (`8a2b6e7`) load into this build, keep their dynamics, stay explicitly unversioned, run on, and survive a re-save with a
  matching hash.
- Household preparation for scarcity and winter has **not** started. It is the next behavioural task, and nothing here
  anticipates it.

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

It starts from merged `main` (`e81aad4`): there is nothing outstanding to integrate first.
