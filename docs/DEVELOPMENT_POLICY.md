# One evolving Living World

Decision: 2026-10-17, at the owner's request. This supersedes the earlier requirement to maintain authored and rich as separate product modes.

## Delivery workflow

The authoritative standing rules are in [WORKFLOW.md](../WORKFLOW.md), loaded by both
`AGENTS.md` and `CLAUDE.md`. Only an explicit owner instruction may change those rules.

Owner decision, 2026-10-21: PRs and repeated independent reviews are not mandatory project
steps. Implement the bounded change, inspect it, fix concrete findings, run appropriate
checks, and record the outcome. Once a finding is repaired and covered by relevant
regression evidence, close it; do not automatically impose another independent review.
Revisit it when relevant code changes, new evidence or an unresolved defect warrant it.

Use a branch when isolation helps. Commit logical changes and, when the owner authorizes
integration, integrate into main and push normally. Open a PR only when explicitly
requested by the owner. A review record is evidence, not an approval
gate. Do not fabricate independent approval, weaken tests, rewrite history, force-push,
expose secrets or bypass repository protections. If GitHub requires a PR, identify that
actual setting so the owner can decide whether to change it.

This supersedes the old branch-specific "draft PR; never merge" instruction and the
automatic re-review requirement added to the wolf-defence handoff. It does not change
simulation acceptance criteria, compatibility obligations or evidence limits.

## Product direction

The authoritative product brief is [PRODUCT_VISION.md](../PRODUCT_VISION.md) (owner decision,
2026-10-22): Living World is an autonomous world game with few direct controls, supported by a
causal, deterministic simulation. People live their own lives; the viewer follows individuals,
households, relationships, places and changes over time. The simulation is the foundation and the
observable experience is the product. That brief holds the product direction and the development
priorities; this file holds the engineering policy — acceptance, evidence, compatibility and rules
versions. The section below remains in force and is now one part of that wider brief.

Living World has one current simulation. New worlds use the integrated behavior previously offered as "Rich dynamics"; the world menu no longer asks people to enable it. Useful improvements belong permanently in that simulation after appropriate verification. Do not build a second product branch merely to preserve old behavior indefinitely.

The internal settings value remains `dynamics: 'rich'`. It is a compatibility identifier, not a new feature users must discover. `currentWorldSettings` in `src/sim/profiles.ts` is the product entry point for new worlds. The app controller also defaults to current rules. The older low-level `defaultSettings`, `settingsForProfile` and `restartSettings` helpers retain historical semantics for diagnostic scripts and fixtures; product callers must use the current entry point.

This transition promotes the existing integrated rules to the product default. It does not establish that every existing system improves outcomes. The measurements and outstanding limitations in EMERGENCE.md and RICH_WORLD.md still stand. No weights, survival rules or individual feature mechanisms are retuned by this decision.

## Saves and historical behavior

Loading is not a migration to a different simulation. A saved world's explicit `rich`, explicit `authored`, or absent dynamics value is preserved. Absent values retain their legacy meaning. Existing replay transcripts use their recorded settings. New worlds created after loading a legacy save use current rules, and the menu explains this distinction.

The old `rich` browser preference is retired and cannot silently keep a new installation on legacy rules. Inhabitant URLs default to current rules; an explicit `rich=0` remains available for reproducing a legacy experiment.

Keep legacy code only where it serves a concrete save, replay, test or experiment contract. Do not remove those paths without a separately tested migration/retirement plan. Likewise, do not turn this compatibility obligation into a ban on improving the current simulation. Historical Git revisions and retained artifacts provide older source baselines; the current compatibility branch is not a guarantee of replaying every historical release.

## Matching evidence to the claim

Different claims need different evidence. These are distinct purposes, not tiers of a new
approval process: identify what the change actually claims, bring the evidence that answers it,
and say which checks you ran.

| Claim | What answers it |
|---|---|
| **Correctness** | Reproduce the defect, then demonstrate the repaired contract with appropriate tests. |
| **Physical coherence** | Show that decisions, actions, resources, locations, ownership and saved state agree: the ledger balances, claims are released, the world saves and continues. |
| **Readability** | A rendered example showing what the interface actually communicates. |
| **Variety and watchability** | Concrete, meaningful situations and differences, named and reproducible. |
| **Aggregate effectiveness** | Comparative measurement with uncertainty, against the same baseline with the mechanism disabled, plus the project's relevant control/nudge reference and ablations. |

Stated explicitly, because these are the substitutions that are easiest to make by accident:

- A feature can be valuable without improving survival or another aggregate metric.
- A null aggregate result does not automatically make a feature worthless.
- A successful scene does not prove an aggregate benefit.
- Visual activity alone does not prove autonomous behaviour.
- A staged fixture must be labelled staged.
- Mechanism tests, rendered evidence, human usability evidence and ensemble results answer
  different questions, and none of them substitutes for another.

Automated browser evidence shows that the page renders real state and that a path through it
works. It does not by itself prove human comprehension or usability; a claim about what a person
understands or finds usable needs evidence from people. Likewise, do not claim that a change is
more engaging to people without evidence appropriate to that claim. Claims such as fewer deaths,
better food security, more productivity or stronger specialisation are aggregate claims and need
the measurement in the last row above, not a scene.

This section sharpens how the existing checks are read and discards none of them. The regression
suite, the resource-conservation contracts, the historical goldens, the version continuation
references and every rules-version requirement in this file apply exactly as written. Where
broader acceptance wording elsewhere reads as "one kind of evidence covers every claim", it is
revised by this section rather than by quietly dropping a check.

## When a change becomes standard

1. State the intended observable behavior and the subsystem that owns it.
2. Demonstrate the causal chain: local evidence, eligible decision, action, actual state mutation, saved consequence and inspectable result.
3. Run focused contract tests and relevant integration, deterministic replay, save and regression checks. Use rendered checks for user-facing changes.
4. For claims of effectiveness, use a bounded experiment against the same current baseline with the relevant mechanism disabled, plus the project's control/nudge reference. Report magnitude, uncertainty, adverse effects and null results. Component tests alone do not demonstrate aggregate benefit. Match the evidence to the claim (see the section above): a change that claims no aggregate benefit does not need an ensemble, and a change that claims one cannot substitute a scene for it.
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

**Version 3** (2026-10-19) adds actual hut/house occupancy: entry through the
door, indoor sleep/rest/refuge, exit before outdoor work, and physical indoor protection and perception.
See `docs/HABITATION.md`. The owner chose habitation first. Version-2 continuation is pinned by `tests/v2_continuation.expected.json`,
captured from `1a13408` before habitation was implemented.

**Version 4** (implemented 2026-10-20; integration into main verified 2026-10-21 at `9a082d6`) adds owned spears and active
responses to visible wolves while preserving indoor safety. Version-3 continuation is pinned
by `tests/v3_continuation.expected.json`, captured from main `a5530cf` before defence was imported.
The parallel experimental wolf-v3 branch used a conflicting number: its saves must stay with
that revision, not be silently interpreted as habitation. See `docs/WOLF_DEFENCE.md`.

**Version 5 is not a generation of this build.** The unintegrated `codex/wolf-habitation-integration`
candidate used 5 for a mood-ranking correction. That correction is not in main. A save stamped 5 is
refused. It is not run as version 4 and not run as version 6. There is no migration and no
provenance field that could tell those experimental saves apart from a later product version, so
the number stays unsupported.

**Version 6** (2026-10-22) holds a fatal injury. If health is already zero when a person is stepped,
death is settled by the existing `killPerson` path before passive recovery in `updateNeeds` can
raise it. The cause already recorded, including `wolf attack`, is the cause that is kept. People
still above zero keep the old recovery. Versions 1–4 keep the old order, in which a favourable
body can undo a bite that had already reached zero. Version-4 continuation is pinned by
`tests/v4_continuation.expected.json`, captured from main `0d39350` before this repair. The lab
switch `rich-no-fatal-hold` removes only this hold. It does not change wolf damage, healing rates,
defence, habitation or preparation, and it changes nothing on an earlier rules version.

**Version 7** (2026-10-22) adds HOUSEHOLD SHELTER PLANS and nothing else: an adult whose household they believe has no
proper home, and which has already laid a site out for one, may take on an ordinary private plan to fetch that site's
missing material and carry it there. The whole of it is `src/sim/shelter.ts` plus the `shelter` plan kind in
`src/sim/intent.ts`, every part gated on `runsRulesVersion(world, 7)`. Laying out a site, building it, owning it and
living in it are unchanged; what changes is that the material is now fetched on purpose instead of arriving by chance.
The recorded explanation of why a household is NOT building (`options_work.ts noteHousingBlock`, and the ordering of the
recorded blocked list in `decision.ts`) is gated on the same version, because the decision record is serialized and
deep-hashed: an entry that changes nothing anybody does still changes saved state. Version-6 continuation is pinned by
`tests/v6_continuation.expected.json`, captured from `b050816` before any of it existed. The lab switch
`rich-no-shelter` removes only the plan. Nothing else was retuned. See `docs/HOUSEHOLD_HOME.md`.

**Version 8** (2026-10-23) recovers the full-pack construction-material courier fallback. An accepted gift can become an ordinary haul promise if the recipient has no room, the helper remembers a site needing that material, and needs/commitment capacity allow. Only rich worlds running version 8 or later use it. `tests/v7_continuation.expected.json` was recorded from `fb6e8a5` before the behavior was added. The save format, historical references and all other rules remain unchanged. See [COURIER_RECOVERY.md](COURIER_RECOVERY.md).

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

## Civilisation reconciliation (2026-10-24)

Versions 8/9 collided across divergent branches. Local-main meanings (ore search,
warmth and single-adult shelter) and version 10 smithy fuel are preserved. Version
11 adds courier recovery and full-pack store eating. Save envelopes identify
`main-iron-warmth-smithy`; untagged 8/9 saves are rejected as ambiguous, preserved
in their original form, and must be opened with their original build. No guessed
migration is supported. See CIVILISATION_IMPLEMENTATION.md for source provenance.

Version 12: persistent household township membership and public storehouse coordination,
with explicit conversation, voluntary support, recorded physical contributions, bounded
witnessed organiser outcomes, and conservative public-footprint access validation.
Version 11 continuation was pinned before this stage. See CIVILISATION_IMPLEMENTATION.md.

**Version 20** adds household relocation agreements and runtime founding. Locally remembered
opportunities and sustained hunger can lead to co-present consent, real packing/travel,
ordinary shelter construction and explicit establishment. Old property remains owned;
refusal, separation, urgent needs and failure remain possible. `relocation.ts` owns the
records and options; [RELOCATION.md](RELOCATION.md) defines the bounded contract. Version-19
continuation was pinned in `801123e` before this change. `rich-no-relocation` is lab-only.

**Version 21** records bounded settlement production and gross resource-flow observations
at actual extraction, harvest, completed-workshop and transfer boundaries. No decision,
inventory, RNG or timing rule changes. The new state is versioned because it is saved and
hashed. See ECONOMY.md. Immutable v20 continuation reference: `05cf09e`.

### Rules version 22 — personally informed exchange journeys

A co-present conversation can transmit a bounded trade lead. A voluntary physical
journey follows that remembered place and hands off to the existing barter conversation;
urgent needs still interrupt, missing counterparties and refusals are recorded. Receipt
history records actual completed swaps. See ECONOMY.md for ownership, alternatives and
retention. Immutable version-21 continuation reference: `ee822f3`. No historical save
is migrated; the lab can disable the new mechanism with `rich-no-exchange-journeys`.

### Rules version 23 — remembered political alignment

Actual proposals and accepted support retain bounded personal choices across projects.
Repeated prior support affects the existing comparison of rival coordinators; derived
factions describe those choices without granting an office or reading private histories
for other inhabitants' decisions. See RICH_WORLD.md. `rich-no-political-alignment` is
the lab ablation. Rules-22 reference `f6496e5` was captured before implementation.

### Rules version 24 — transmitted household practice

Two completed shared meals establish the host's practice of sharing supper. A child
(including an adult child) acquires it through two later meals with a knowledgeable
parent, actual portions and at least 20 co-present work ticks per meal. Knowledge
encourages a later invitation without bypassing needs, food, capacity or acceptance.
No initial holders or automatic inheritance. Existing meal execution owns the costs;
`household_practices.ts` owns bounded provenance. Lab: `rich-no-household-practices`.
Rules-23 continuation was committed at `0878bf4` before this behaviour. Older worlds
retain their rules and acquire no practice records. See HOUSEHOLD_HOME.md.
