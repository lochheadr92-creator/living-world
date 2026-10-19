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

## Rules versions (Stage 0)

`settings.rulesVersion` says which generation of simulation BEHAVIOUR a world runs. `src/sim/rulesversion.ts` owns the whole
question - the current version, what is supported, validation, what a given world runs, and eligibility for behaviour added
later - and nothing else compares a version number to a literal (`tests/rules_version.test.ts` holds that).

Four version-like things exist here and they are not interchangeable:

| | what it says | where |
|---|---|---|
| **rules version** | which generation of behaviour a world runs | `settings.rulesVersion`, `src/sim/rulesversion.ts` |
| **save format** | how the bytes are written | `VERSION` in `src/app/save.ts` (currently 4) |
| **dynamics** | which family of rules: current (`rich`) or legacy (`authored`/absent) | `settings.dynamics` |
| **replay fingerprint / lab intervention** | that one run reproduced another; a deliberate experimental change | `scripts/statediff.ts`, `scripts/lab/lab.ts` |

**Version 1** is the integrated behaviour as it stood on 2026-10-18: mood, hardship, private plans, learning, trades and
apprenticeship, the second rich pass, the rich-only town corrections and the project ask as written then. It is the first
baseline this project can hold itself to; it is **not** a claim to reproduce any particular earlier release.

**Version 2** (2026-10-18) adds HOUSEHOLD FOOD PREPARATION and nothing else: an adult may take on a private plan to put a
modest food reserve into their own household's home store, set going either by what they can see of that household's food or
by the approach of winter, and carried out with the gathering and depositing that already existed. The whole of it is
`src/sim/provision.ts` and the `stock` plan kind in `src/sim/intent.ts`, every part gated on `runsRulesVersion(world, 2)`.
Nothing else was retuned: winter, lean seasons, hunger, yields, spoilage and starting resources are exactly version 1's. See
`docs/RICH_WORLD.md` for the contract and the measurement.

**How a version is proved not to have leaked.** A test that checks the version LABEL is not enough: a gate that leaked would
keep the label and change the world. Before version 2 was written, `scripts/v1_reference.ts --write` recorded
`tests/v1_continuation.expected.json` - two rich worlds stamped `rulesVersion: 1`, run, written out and read back through the
real save path, then continued, with the compact and deep hashes AND plain counts (people alive, live plans by kind, food in
home stores) at each checkpoint. One case ends in the window before winter, where a seasonal behaviour would be adopted.
`tests/v1_continuation.test.ts` compares against it on every pass. **Re-recording that file to make a change pass would
delete the only evidence of the leak**; a failure means the gate is wrong. Every later version should extend it the same way:
record the reference from the revision before the new behaviour exists.

**What carries it.** New product worlds get the current version at creation (`currentWorldSettings`, the app's constructor and
every restart, and inhabitant links that are not explicitly legacy). It is preserved by saving, loading, app restore, world
cloning and lab forks, and replay configuration, and it is part of the state fingerprint (`hashWorld`) so that two worlds
running different rules are not mistaken for the same world. Loading a supported version runs **that** version; nothing
substitutes the latest.

**Rejection.** A version this build does not support - a future one, a withdrawn one, or a value that is not a positive whole
number - is refused in `deserializeWorld`, before the active world is replaced, so a refused load leaves the running world
exactly as it was. `saveGame` refuses for the same reason rather than overwriting a good save with a world it could not read
back.

**Unversioned worlds.** Several historical implementations all carried `dynamics: 'rich'`, and which one made a given save
cannot be recovered from the file, from a timestamp or from which fields a person happens to have. So an absent rules version
stays absent: it is explicitly legacy, it is preserved through ordinary load and save, no original version is invented for it,
and it is never eligible for gameplay added at a later version. Its documented compatibility baseline is the implementation at
the introduction of versioning - which means **exact historical replay of such a world is not guaranteed**. Converting one to
current rules deliberately is a separate job; there is no automatic migration and no destructive one. Historical diagnostic
fixtures (the goldens, `defaultSettings`, `settingsForProfile`, `restartSettings`) stay unversioned on purpose.

**Runs from the command line.** A script that builds a FRESH world uses `freshRunSettings` (`src/sim/profiles.ts`), so a
current run is stamped exactly as a new world in the app is. `--dynamics` takes three values: `rich` (the current
simulation, current version), `authored` (the legacy rules, unversioned) and `rich-unversioned` (a rich world deliberately
left on the legacy baseline, for reproducing a measurement made before versions existed). Loading, forking or replaying an
existing world keeps the settings it was recorded with. `settingsForProfile`, `restartSettings` and `defaultSettings` stay
unversioned whatever is asked for: fixtures and historical diagnostics are built on them.

Lab rows carry `rulesVersion` beside `dynamics`, explicitly `null` when unversioned - a version is never inferred from the
word "rich". The resume guard (`scripts/lab/guard.ts`, run by `scripts/lab.mjs` before it creates anything or starts a
worker) refuses a directory whose rows were run under different rules, including two runs that are both rich but of
different generations, and it reads the existing files without rewriting or relabelling them. `scripts/gates.ts` compares
the rules version as well, so a gate cannot silently check one generation against a baseline from another. None of this is
source provenance: two runs of the same version from different revisions are still different experiments, so use a fresh
directory after any source change and record HEAD and the diff.

**The first change at a new rules version cannot be gated, and the policy should say so.** `scripts/gates.ts` compares
like with like and refuses otherwise, rules version included. Every recorded baseline (`docs/gates.json`,
`docs/gates-rich.json`) is unversioned, so the first run at a new version is refused by name - correctly, since "both
rich" has never meant "the same rules". Recording a baseline from the candidate and then checking the candidate against
it is not acceptance; it is a comparison with itself. What stands in its place, and what was actually done for version 2
(`gate_v2_unversioned/FINDING.md`): the older generation proved unchanged by the goldens, the version-1 continuation
reference and an unversioned ensemble at the gated profile; the test suite; a bounded ablation of the new behaviour
against a nudge floor; and the browser checks. A baseline for the new version is recorded AFTER the merge, so that the
next change at that version can be gated properly.

**Changing behaviour from here on.** A change that is meant to alter outcomes - a new decision rule, or a tuned parameter that
moves them - raises `CURRENT_RULES_VERSION` and adds the new number to `SUPPORTED_RULES_VERSIONS`. The new behaviour is gated
by `runsRulesVersion(world, N)` at the point where it is decided, with the previous branch kept for worlds that run an earlier
version, so a version-1 save still behaves as version 1. Keeping the number while dropping the old branch is not versioning;
it is a relabelled breaking change. A change that cannot alter outcomes - instrumentation, rendering, a refactor - does not
raise the version. Bug fixes that change behaviour are behavioural changes.

## Lab defaults and provenance

`lab_seed.ts`, the lab runner, inhabitant live/standard runs, replay-check fresh-world runs, activity-mix and cascade commands now default to current (`rich`) rules. Explicit `--dynamics authored` remains available for historical comparisons. Replay of an existing transcript retains its settings.

The lab runner defaults to `current_lab_out` and refuses to mix existing legacy rows with a current run. That guard checks dynamics only; it does not establish matching source revisions. Use a fresh output directory after a source/configuration change, record HEAD and any dirty diff, and retain the exact command and measurement script. Do not overwrite older reports or reinterpret old measurements as evidence for today's code. Historical commands that omitted dynamics may need explicit `--dynamics authored` to reproduce their original configuration.

Do not launch expensive ensembles just because a feature now runs by default. Define the question, metric, workload and interpretation first, and follow the repository's run-budget instructions.

## Verification of this transition

`tests/current_world.test.ts` covers new-world rules, all product profiles, retirement of the browser preference, inhabitant URL defaults, preserved save settings and full saved-state equality after continuation, and starting a new current world after loading a legacy save. Controller tests compare current app runs with current headless reference worlds. `tests/lab_defaults.test.ts` checks that the changed lab default rejects old outputs without modifying them or starting workers.

Historical goldens remain compatibility checks, not the definition of the current product. This transition does not re-record them or change the save format.
