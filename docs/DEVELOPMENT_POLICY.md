# One evolving Living World

Decision: 2026-10-17, at the owner's request. This supersedes the earlier requirement to maintain authored and rich as separate product modes.

## Product direction

Living World has one current simulation. New worlds use the integrated behavior previously offered as "Rich dynamics"; the world menu no longer asks people to enable it. Useful improvements belong permanently in that simulation after appropriate verification. Do not build a second product branch merely to preserve old behavior indefinitely.

The internal settings value remains `dynamics: 'rich'`. It is a compatibility identifier, not a new feature users must discover. `currentWorldSettings` in `src/sim/profiles.ts` is the product entry point for new worlds. The app controller also defaults to current rules. The older low-level `defaultSettings`, `settingsForProfile` and `restartSettings` helpers retain historical semantics for diagnostic scripts and fixtures; product callers must use the current entry point.

This transition promotes the existing integrated rules to the product default. It does not establish that every existing system improves outcomes. The measurements and outstanding limitations in EMERGENCE.md and RICH_WORLD.md still stand. No weights, survival rules or individual feature mechanisms are retuned by this decision.

## Saves and historical behavior

Loading is not a migration to a different simulation. A saved world's explicit `rich`, explicit `authored`, or absent dynamics value is preserved. Absent values retain their legacy meaning. Existing replay transcripts use their recorded settings. New worlds created after loading a legacy save use current rules, and the menu explains this distinction.

The old `rich` browser preference is retired and cannot silently keep a new installation on legacy rules. Inhabitant URLs default to current rules; an explicit `rich=0` remains available for reproducing a legacy experiment.

Keep legacy code only where it serves a concrete save, replay, test or experiment contract. Do not remove those paths without a separately tested migration/retirement plan. Likewise, do not turn this compatibility obligation into a ban on improving the current simulation. Historical Git revisions and retained artifacts provide older source baselines; the current compatibility branch is not a guarantee of replaying every historical release.

## When a change becomes standard

1. State the intended observable behavior and the subsystem that owns it.
2. Demonstrate the causal chain: local evidence, eligible decision, action, actual state mutation, saved consequence and inspectable result.
3. Run focused contract tests and relevant integration, deterministic replay, save and regression checks. Use rendered checks for user-facing changes.
4. For claims of effectiveness, use a bounded experiment against the same current baseline with the relevant mechanism disabled, plus the project's control/nudge reference. Report magnitude, uncertainty, adverse effects and null results. Component tests alone do not demonstrate aggregate benefit.
5. Integrate the accepted behavior into the current simulation. Update deliberate behavior baselines only with the reason and evidence; never adjust expectations merely to hide a defect. Existing features with incomplete evidence stay explicitly unverified for those claims.

Experimental controls belong in the lab or development configuration. Prefer narrowly scoped interventions over an ever-growing alternative "old world". Record compound interventions honestly: `rich-no-trades` disables trades and apprenticeship together, so it cannot establish the isolated effect of trades.

## Lab defaults and provenance

`lab_seed.ts`, the lab runner, inhabitant live/standard runs, replay-check fresh-world runs, activity-mix and cascade commands now default to current (`rich`) rules. Explicit `--dynamics authored` remains available for historical comparisons. Replay of an existing transcript retains its settings.

The lab runner defaults to `current_lab_out` and refuses to mix existing legacy rows with a current run. That guard checks dynamics only; it does not establish matching source revisions. Use a fresh output directory after a source/configuration change, record HEAD and any dirty diff, and retain the exact command and measurement script. Do not overwrite older reports or reinterpret old measurements as evidence for today's code. Historical commands that omitted dynamics may need explicit `--dynamics authored` to reproduce their original configuration.

Do not launch expensive ensembles just because a feature now runs by default. Define the question, metric, workload and interpretation first, and follow the repository's run-budget instructions.

## Verification of this transition

`tests/current_world.test.ts` covers new-world rules, all product profiles, retirement of the browser preference, inhabitant URL defaults, preserved save settings and full saved-state equality after continuation, and starting a new current world after loading a legacy save. Controller tests compare current app runs with current headless reference worlds. `tests/lab_defaults.test.ts` checks that the changed lab default rejects old outputs without modifying them or starting workers.

Historical goldens remain compatibility checks, not the definition of the current product. This transition does not re-record them or change the save format.
