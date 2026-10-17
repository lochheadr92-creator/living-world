# Living World Repository Handoff

> Superseding direction, 2026-10-17: see docs/DEVELOPMENT_POLICY.md. New worlds use the current integrated simulation; the old off-by-default policy below is historical. Refresh Git state before using this older handoff. Existing saves retain recorded rules.

Updated: 2026-10-16

This handoff is a continuation guide for the current checkout. It records the repository's purpose, core design choices, code map, current uncommitted state, evidence, and the safest next actions. The repository files and current Git checkout are authoritative; this document is a navigation aid, not a replacement for them.

## Project identity and Git state

- Project: Living World, a deterministic TypeScript/Vite village and society simulation.
- Checkout: `C:\dev\Claude Experiment\living-world`.
- Current branch: `claude/awesome-dirac-07f8q1`.
- Current commit: `ef453fe` — `A trade: each person settles on one kind of work as theirs, by what they are good at that few around them do`.
- Upstream shown by Git: `origin/claude/awesome-dirac-07f8q1`.
- The tree has unstaged tracked changes and three untracked experiment-output directories. No staged changes were reported. No changes have been committed or pushed as part of the current work.
- Branch instruction discrepancy: the supplied project instructions named `Codex/epic-franklin-469omp`; the checked-in `AGENTS.md` names that branch, `CLAUDE.md` names `claude/epic-franklin-469omp`, and this checkout is on `claude/awesome-dirac-07f8q1`. Do not switch branches or infer a target branch until the owner resolves this discrepancy. Preserve the current checkout and its work.

## Project goal and principles

The project aims to make an autonomous village whose people differ, remember, make plans, cooperate, and experience persistent consequences that can be watched and inspected. It is not a scripted story: buildings, goods, promises, meals, relationships, and deaths should arise from ordinary decisions and state changes.

Core design choices to preserve:

1. **Determinism.** Seeded randomness supports replay and comparison. Inspection/rendering must not perturb simulation state. Decision noise uses deterministic mechanisms; do not introduce `Math.random` into simulation rules.
2. **Authored behavior stays stable.** New behavior is normally gated by `settings.dynamics === 'rich'`, off unless opted in. Golden fingerprints, save compatibility, and determinism tests protect ordinary/authored worlds. If a behavior change intentionally affects those worlds, update the contract and fingerprints only as part of that change.
3. **Local knowledge.** People choose from their own needs, perceptions, beliefs, stale observations, and received news. Do not let planners use hidden global state to manufacture success.
4. **Actions have physical consequences.** Work takes time and occurs at a place. Goods are explicitly created, transferred, consumed, spoiled, reserved, held by activities, and recorded. A plan or promise is not evidence of delivery; inspect actual activity and inventory mutations.
5. **Conservation and claims.** The economy ledger accounts for items. Exclusive claims and reservations must be released on completion, interruption, and death. Keep tool-record state in step with inventory counts.
6. **Evidence discipline.** A focused unit test proves only its checked case. Separate source inspection, tests, headless experiment output, and visible browser behavior. Large ensembles are expensive and belong on the user's 24-core Windows machine according to `AGENTS.md`.
7. **Small, isolated changes.** One branch and one purpose; one commit per problem. Never merge or force-push. Do not erase or clean unrelated output directories.

`settings.ruleSet` and `settings.dynamics` are separate concerns: `ruleSet` chooses ordinary versus scaled population/settlement limits; `dynamics` enables richer behavior. The current fix explicitly keeps the larger scaled workplace allowance behind rich dynamics.

## Repository map

### Runtime

- `src/main.ts`: browser entry point and page setup.
- `src/sim/`: simulation state and rules, independent of DOM/rendering. The main flow is:

  ```text
  world tick -> local perception/beliefs -> eligible option generation -> deterministic ranking
      -> activity execution over time -> state/economy/social updates -> inspectable records
  ```

- `src/sim/world.ts`: tick orchestration and deterministic stepping.
- `src/sim/decision.ts`, `optutil.ts`, `options_*.ts`: option creation and ranking. Survival, work/production, and social choices have separate owners.
- `src/sim/perception.ts`, `knowledge.ts`, `news.ts`: local observations, beliefs, stale knowledge, and person-to-person transmission.
- `src/sim/activities.ts`, `act_*.ts`: multi-tick work execution and interruption/cleanup.
- `src/sim/economy.ts`, `facilities.ts`, `recipes.ts`, `buildings.ts`, `tools.ts`, `carts.ts`: ownership, accounting, production, workplaces, tools, and hauling.
- `src/sim/social.ts`, `options_social.ts`, `dialogue.ts`, `grievance.ts`, `meals.ts`, `welfare.ts`: requests, promises, exchanges, relationships, shared meals, and care.
- `src/sim/rules.ts`, `profiles.ts`, `settlements.ts`: ordinary/scaled rules, world profiles, and nearest-settlement behavior.
- Rich systems include `mood.ts`, `hardship.ts`, `intent.ts` (private plans), `learning.ts` (personal gathering payoff), and `trade.ts` (comparative-advantage work identity).
- `src/app/`: fixed-step game clock, selection/camera state, save/load, preferences, and AI inhabitant orchestration.
- `src/render/`: isometric canvas rendering, terrain, characters, buildings, effects, overlays, and picking. Rendering must remain observational only.
- `src/ui/`: DOM shell, controls, inspector, social/person cards, feed, minimap, help, and debug views.

### Experiments, tools, tests, and documents

- `scripts/lab.mjs`, `scripts/lab/`, `scripts/lab_report.ts`: paired simulation branches and reporting. Compare an intervention to the mean of control and one-draw nudges; a single chaotic control is not a reliable baseline.
- `scripts/gates.ts`, `docs/gates.json`: ensemble acceptance gates for behavior changes.
- `scripts/cascade.ts`, `scripts/coupling.ts`, `scripts/activity_mix.ts`, `scripts/bench.ts`, `scripts/regions.ts`, `scripts/invariants.ts`: causal traces, static audits, activity accounting, performance, profile inspection, and runtime invariants.
- `scripts/inhabit.ts`, `scripts/inhabit_*`, `scripts/inhabit/`, `src/agent/`, `src/app/inhabit.ts`, `src/ui/inhabit.ts`: optional external-model inhabitant. The model sees a restricted observation and offered choices; the model call is outside core simulation rules, can be replayed from a transcript, and the provider key stays in the dev-server shell. See `docs/INHABITANT.md`.
- `tests/`: Vitest contract and regression coverage; `tests/golden.test.ts` and `tests/golden.expected.json` cover authored fingerprints.
- `docs/ECONOMY.md`: ownership, recipes, conservation, tools/carts, promises, and production rules. `docs/recipes.generated.md` is generated from code with `npm run docs`.
- `docs/EMERGENCE.md`: staged behavior plan, stop rules, evidence, and current Stage 4 proposal.
- `docs/SCALING.md`: profiles, rule sets, scale/performance measurements, and lab methods.
- `docs/BASELINE.md`, `docs/OBSERVED.md`, `docs/AUTONOMY.md`: baseline results, watched causal chains, and private-plan contracts.

### Profiles

- Ordinary village: roughly 28 founders on the original 80×80 map.
- `large`: 100 founders in four camps of about 25, on 160×160.
- `huge`: 250 founders in six camps of about 42, on 256×256.
- `town`: 100 founders in one camp on 80×80, used as a density experiment.

Scaled population caps follow the whole world; local building/open-site limits follow one settlement's founders. Facilities are counted within the scaled settlement radius. The effective multi-facility allowance is now rich-only; authored worlds retain one per kind.

## Current work and uncommitted state

### Focus of the latest code change

Two confirmed review findings were addressed:

1. `src/sim/rules.ts`: `scaledRules()` computes a candidate facility allowance by settlement size. `rulesOf(world)` now caps that allowance at one unless `world.settings.dynamics === 'rich'`. The cap is cached by the base rule object. Other scaled caps/radii remain in effect. A regression checks Huge (250 total, 42 per settlement): authored allowance 1, rich allowance 2.
2. `src/sim/trade.ts`: comments now state the actual scope: payoff-based trade release only works for gathering-aligned trade keys, since recorded pay comes from gathering outcomes. Non-gathering trades may still change through crowding or skill, but have no payoff estimate yet. No speculative payoff estimator was added.

The town allowance test fixtures in `tests/rules.test.ts` and `tests/regions.test.ts` explicitly opt into rich dynamics so their four-facility expectations remain intentional.

### Current modified files

- `src/sim/rules.ts` — rich-only effective facility expansion.
- `src/sim/trade.ts` — accurate scope comments for poor-pay release.
- `tests/rules.test.ts` — authored/rich Huge regression and explicit rich fixture.
- `tests/regions.test.ts` — town/large comparison fixture opts into rich dynamics.
- `docs/SCALING.md` — clarifies authored versus rich workplace allowance.
- `docs/EMERGENCE.md` — includes the trade limitation and the rich-only allowance wording. It also contains broader working-tree edits described below.

`HANDOFF.md` itself is newly created for this request and is not committed.

### Other working-tree content to preserve and verify separately

The current `docs/EMERGENCE.md` diff is broader than the latest allowance/trade fix. It also changes the Stage 3 first-piece heading from “not yet measured” to “measured: 24 seeds, Large, 12 days,” adds a `learn_out/` result table and interpretation, and adds a proposed Stage 4 social-transmission measurement plan. These sections are present in the shared working tree; their authorship/intent is not established by this handoff task. Preserve them, and do not fold, rewrite, or discard them without confirming their intended history and evidence.

Untracked experiment-output folders are present and must be preserved:

- `learn_out/` — 24-seed learning JSONL files and `report.txt`, referenced by the Stage 3 addition.
- `noask_out/` — 24-seed project-ask experiment output and report.
- `town_out/` — town experiment output and report.

Other historical output directories are already in the checkout. Do not run cleanup commands such as `git clean`.

## Verification evidence and limits

Commands run for the allowance/trade fix:

```text
npx vitest run tests/rules.test.ts tests/regions.test.ts tests/trade.test.ts tests/learning.test.ts --no-cache --configLoader runner
4 test files passed; 61 tests passed.

npx tsc --noEmit
passed (exit 0).

git diff --check
passed.
```

The first focused run caught an existing fixture expectation that needed an explicit `dynamics: 'rich'`; the fixture was corrected and the rerun passed. The full test suite, production build, browser behavior, and full profile/lab ensembles have not been run for this change. No claim is made here about rendered behavior or a new full-day simulation.

**Verification classification:** focused regression and typecheck pass for the facility gate and trade-comment edits. The wider working-tree experiment claims are documented in `docs/EMERGENCE.md` and backed by output folders, but they were not re-audited as part of this handoff. Their result files are untracked and should stay with the working tree.

## Open stages and risks

- `docs/EMERGENCE.md` labels Stage 4 social transmission as planned. The stop condition recorded here earlier - "stop if no meaningful transmission crosses camps" - is **not** what that plan says, and was obsolete when written. The plan's own reading is the opposite: "no cross-camp contacts: the mechanism is unexercised within the window, not impossible", and "zero cross-camp transfers is not a new stop rule". The historical stop condition for the differentiation objective is "all camps identical", operationalised as every valid camp pair at Jaccard 1 on day 12 with complete coverage. Do not implement a new contact mechanic (travel, caravans, arrivals) before the measurement and a decision; the observation-only diagnostics (`src/sim/transmission.ts`, `scripts/stage4.ts`, added 2026-10-17) are not such a mechanic.
- Stage 3 trade is built but only measured on one headless Large run; its effect on welfare and cross-seed stability remains open. Its poor-pay rule is gathering-only.
- Learning has a 24-seed result recorded in the current documentation diff; the documented metrics show a small specialization increase, while random choice is more concentrated. The per-seed kind variation question is left open in that document.
- Current branch naming conflicts with the checked-in/supplied branch instructions. Resolve before branch/PR operations.
- The test command used `--configLoader runner` because Vite's native loader can emit unsupported-import warnings in this setup; this is a test runner configuration detail, not a product behavior result.
- `facilityAllowance` directly returned by `scaledRules()` or `rulesFor()` remains the un-gated candidate; `rulesOf(world)` is the effective runtime API and applies the rich gate. Check callers before changing this contract.

## Protected areas and rules for the next agent

- Preserve all existing dirty files and lab output directories. Do not reset, clean, or switch branches.
- Do not weaken tests or change test inputs to manufacture a pass. Preserve ordinary/authored behavior and golden fingerprints.
- Do not claim promises, plans, or model decisions succeeded unless the corresponding physical action/state mutation is recorded.
- Do not launch large 24-seed or multi-day Large-profile ensembles in this environment; follow `AGENTS.md` for PowerShell runs on the user's machine.
- Do not start Stage 4 implementation unless explicitly authorized after the measurement question is settled.
- Do not commit, push, merge, or force-push without explicit task direction and branch-policy reconciliation.

## Exact next actions

1. Start with `git status --short --branch` and preserve the current state.
2. Review the full working diff, separating the rich facility gate/trade documentation from the broader Stage 3/Stage 4 emergence edits. Confirm the `learn_out/` results against its `report.txt` and JSONL files before treating the newly added claims as accepted project evidence.
3. Resolve the branch-name discrepancy before any branch or PR operation.
4. Once provenance and scope are clear, continue only the user's next requested simulation work. The current documented forward question is Stage 4's read-only contact/knowledge measurement design, not a built behavior.

First recommended command:

```powershell
git status --short --branch
```

## Paste-ready continuation prompt

```text
Continue work in C:\dev\Claude Experiment\living-world using HANDOFF.md as a map, then verify details against AGENTS.md, CLAUDE.md, docs/EMERGENCE.md, and the current Git diff. Begin with `git status --short --branch`. Preserve all existing tracked edits and the untracked learn_out/, noask_out/, and town_out/ experiment outputs; do not clean, reset, or switch branches. The latest focused work gates the scaled facilityAllowance in rulesOf(world) behind dynamics === 'rich' and clarifies that trade payoff release currently applies only to gathering-aligned trades. Focused tests (61), tsc, and diff-check passed, but the full suite/build/browser behavior were not checked. The working docs also include broader 24-seed learning findings and a planned Stage 4 measurement proposal; verify the report artifacts before relying on them and do not overwrite them. Resolve the branch naming conflict between the supplied instructions, checked-in instructions, and current branch before any Git branch/PR action. Do not implement Stage 4 or launch expensive ensembles unless explicitly requested. Ask for the next concrete simulation objective if none is supplied.
```
