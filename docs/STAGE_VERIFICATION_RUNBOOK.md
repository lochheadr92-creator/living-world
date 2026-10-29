# Stage verification runbook

## Rules 40 stored material connections — 29 October 2026

Use `C:\dev\Claude Experiment\living-world-integrate` and fresh output folders.
All commands below use the installed local runtime, require no model key and no push.
These bounded Normal probes take seconds; any future Large ensemble must use the
detached Windows workflow and a separate preregistration. Do not restart the stopped batch.

Focused contracts and predecessor continuity (89 tests at the recorded source):

```powershell
npx vitest run tests/stored_materials.test.ts tests/plan_reconsider.test.ts tests/inhabit_choice_identity.test.ts tests/work_tastes.test.ts tests/project_helpers.test.ts tests/project_cooperation.test.ts tests/social_memory.test.ts tests/v39_continuation.test.ts --maxWorkers=4
```

Staged independent on/off comparisons, restricted policies, helper failure path and full replay:

```powershell
node node_modules/vite-node/dist/cli.mjs scripts/stored_materials_inhabitant.ts inhabitant_evidence/stored-materials-new
```

Ordinary six-day occurrence (repeat with registered meadow, river, forest and a new
folder for each). This is not a population-effect ensemble:

```powershell
node node_modules/vite-node/dist/cli.mjs scripts/stored_materials_observe.ts inhabitant_evidence/stored-ordinary-meadow-new meadow
```

Reproduce prior rules-39 project-attempt endings without editing an inhabitant:

```powershell
node node_modules/vite-node/dist/cli.mjs scripts/project_attempts_trace.ts inhabitant_evidence/stored-before-river-new river
```

Bounded staged later-opportunity probe (5000 ticks, preserve an empty comparison):

```powershell
node node_modules/vite-node/dist/cli.mjs scripts/stored_materials_feedback.ts inhabitant_evidence/stored-materials-new/promise-enabled-final.json inhabitant_evidence/stored-feedback-new
```

Manual rendered check, using the existing local dev server or `npm run dev`:

1. Open `http://127.0.0.1:5273/scripts/browser/stored_materials_manual.html?start=/inhabitant_evidence/stored-materials-new/promise-start.json`.
2. Read Ada's own plan and offered actions. Ask Ben for stone, allow the promised
   trip by choosing offered nearby wander/rest actions, then make the offered pick.
   Do not count the promise as delivered; wait for actual handover and crafting.
3. Repeat from `plan-start.json`: collect stone, craft axe, use it in offered wood work.
   Repeat from `stale-start.json`: the same remembered-stock option fails physically
   and the plan is reconsidered. The competing transfer is explicit staging.
4. Save screenshots and visible panel text at the promise/delivery/result boundaries.
   Click **Stop**, then **Save verification bundle**. This includes the standard
   panel transcript, starting save and authoritative final state for exact comparison.
5. Replay the downloaded bundle into a fresh folder; inspect outcome/stock/plan fields
   as well as the full-state equality result:

```powershell
node node_modules/vite-node/dist/cli.mjs scripts/stored_materials_manual_replay.ts "C:\Users\RJLoc\Downloads\stored-materials-Ada-promise-start-bundle.json" inhabitant_evidence/stored-manual-replay-new
```

Full stable-source checks, each separately in PowerShell:

```powershell
npx vitest run --maxWorkers=4
```

```powershell
npm run typecheck
```

```powershell
npm run build
```

```powershell
git diff --check
```

Do not rerun `scripts/v39_reference.ts` to make a regression pass. The checked-in
reference is the pre-successor evidence. Results, source manifests and evidence
limits: [STORED_MATERIAL_CONNECTIONS.md](STORED_MATERIAL_CONNECTIONS.md).

## Rules 39 project-helper connection — 28 October 2026

Run from `C:\dev\Claude Experiment\living-world-integrate`; these checks need no
model key and must use new output directories. No push is needed. Full results,
staged prerequisites and the preserved ordinary nulls are in `MEANINGFUL_CONNECTIONS.md`.

Focused mechanism and compatibility:
`npx vitest run tests/project_helpers.test.ts tests/project_ask.test.ts tests/project_cooperation.test.ts tests/social_memory.test.ts tests/inhabitant_versions.test.ts tests/inhabitant_memory.test.ts tests/inhabit_manual.test.ts tests/inhabit_plans.test.ts --maxWorkers=2`

Staged gift → trust → offered request → physical transfer → completed axe, with
enabled/disabled forks from one checkpoint and exact serialized replays:
`npx vite-node scripts/project_helpers_inhabitant.ts -- inhabitant_evidence/project-helpers-new`

Ordinary observation (repeat once for each registered seed meadow, river, forest):
`npx vite-node scripts/project_helpers_observe.ts -- inhabitant_evidence/project-helpers-meadow-new meadow`
This is a six-day Normal occurrence probe with immigration off, no supply/relationship
edits, source manifest freeze and conservation checks. It compares options at the
same decision; it is not an independently evolved population ablation or benefit test.
The three registered seeds finished in 8–9 seconds each locally.

Rendered manual continuation:

1. Start a free local Vite port, e.g. `npx vite --port 5275 --strictPort`.
2. Open `http://127.0.0.1:5275/scripts/browser/project_helpers_manual.html?start=/inhabitant_evidence/project-helpers-new/comparison-start.json`.
3. This **staged verification bootstrap** reuses the production renderer, UI, clock
   and InhabitDriver. Inspect the restricted panel, select its offered stone request,
   wait for the actual outcome, then select the offered axe crafting action and wait
   for success. Save screenshots and the panel transcript. Do not choose from developer state.
4. After the journey, use **Save verification bundle** to export the start, exact
   browser final serialized state and transcript. This extra control is verification
   instrumentation only; it does not mutate the simulation or choose actions.
5. Replay: `npx vite-node scripts/project_helpers_manual_replay.ts -- <downloaded-bundle.json> inhabitant_evidence/project-helpers-manual-new`.
   Requires the full browser state to equal replay, the fulfilled stone request,
   finished axe, recorded success, matching hash and conservation. Do not regenerate
   a natural world in place of the recorded staged checkpoint.

## Manual inhabitant verification — no API key; browser-driven

`manual=1` drives the person with `manualModel()` (`src/app/inhabit.ts`), answered **by hand** in the inhabitant panel with no
API key and no external model call. The verification therefore needs a browser that can click the offered actions and read the
rendered panel, not a model key. The repo's `scripts/browser/cdp.mjs` (a minimal Chrome DevTools Protocol driver; Node 22+,
a local Chrome/Edge) provides exactly that.

1. Start the dev server: `npm run dev` (serves on 5273).
2. Open `http://127.0.0.1:5273/?inhabit=Pavel&manual=1&seed=meadow&from=1&days=1&noarrivals=1`.
3. The inhabitant panel (`src/ui/inhabit.ts` `manualBlock`) lists the offered options as buttons; click one of the offered keys.
   The restricted observation (including the Stage-1 plans and spoken-for/available split) is what the panel shows.
4. Inspect the rendered explanation: the decision "because", the observation, and the resulting scene.
5. Save the transcript, then replay it headlessly against the same build (no browser, no model):
   `npx vite-node scripts/inhabit.ts -- --mode replay --transcript <saved.json> --out inhabitant_evidence/stage1-replay`

## Gate / ensemble (policy checks)

The unversioned gate (authored Large 8 seeds, 12 days) is legacy regression evidence — it proves the versioned changes do not
leak into unversioned worlds; it does **not** exercise or establish the benefit of the new rich-rule mechanisms. The rich-rule
causal comparisons (ablation vs control vs nudge) are run separately in the lab. A current-rule rich baseline is recorded only
after integration, per DEVELOPMENT_POLICY ("the first change at a new version cannot be gated").

## Takeover verification, 28 October 2026

Continued in `living-world-integrate` from `9871662`, without touching the dirty
`deepseek-b1` checkout or pushing. See `docs/SIX_STAGE_COMPLETION.md` for findings,
version boundaries, evidence and limits. The prior `manual-stage1/` and `gate_v35/`
remain historical evidence. Takeover results use new directories.

The browser regression script again contains the comprehensive manual-panel check
(clock pauses, choice, result, stop), restored from `8cb03cf`. The takeover's
interactive checks use the actual rendered panel through the desktop browser.

Use a sufficiently long window to see a journey finish:
`http://127.0.0.1:5274/?inhabit=Pavel&manual=1&seed=meadow&from=1&days=0.75&noarrivals=1`.
Save using **Save transcript**, then replay with the existing inhabitant CLI. A window
ending during travel is an unfinished action, not a successful delivery.

Focused checks:
`npx vitest run tests/inhabit_plans.test.ts tests/inhabit_eta.test.ts tests/plan_reconsider.test.ts tests/crews_rejoin.test.ts tests/achievement.test.ts --maxWorkers=2`

Full checks: `npx vitest run --maxWorkers=4`, `npm run typecheck`, `npm run build`,
`git diff --check`. The final frozen-source run passed with four workers, avoiding the overload observed at
default concurrency; no deadlines or expectations were weakened.

Ordinary civic observation, with a fresh output directory:
`node node_modules/vite-node/dist/cli.mjs scripts/civic_observe.ts inhabitant_evidence/civic-new meadow 20`
This records ordinary choices and physical transfer hooks. It does not assign support,
create supplies, preselect actions or change scores. Daily offer samples do not cover
every decision. It writes proposal/completion checkpoints, transfers, conservation
checks and a final save. Immigration is disabled explicitly; births still occur.

Restricted civic inhabitant verification:
`node node_modules/vite-node/dist/cli.mjs scripts/civic_inhabitant.ts <checkpoint.json> <fresh-output> <person-id> <start-tick>`
This chooses an offered storehouse withdrawal from the restricted observation and
requires subsequent success, conservation and exact replay. The saved start is needed
to replay a checkpoint continuation; do not substitute a regenerated world.

Staged achievement and next-hope verification:
`node node_modules/vite-node/dist/cli.mjs scripts/achievement_inhabitant.ts <fresh-output>`
Materials are initial fixture stock. Construction uses offered build actions. Separate
transcripts cover witnessed satisfaction and a later hope, requiring replay and
conservation. These are mechanism evidence, not ordinary frequency or aggregate benefit.

For long local runs, use detached `Start-Process node` with separate output/error logs,
`-WindowStyle Hidden`, `-PassThru`, the integration working directory and the installed
`node_modules/vite-node/dist/cli.mjs` entry point. Check the PID and completion file.
These observation scripts refuse an existing output directory; unlike lab ensembles,
they do not resume unfinished seeds.

## Rules 41–44 experience connections

Contract, all nulls, budget stop and exact-replay scope: [EXPERIENCE_CONNECTIONS.md](EXPERIENCE_CONNECTIONS.md).
Use the integration checkout and a fresh evidence directory for each invocation.

- Mechanism scripts: `scripts/learner_instruction_inhabitant.ts`,
  `scripts/civic_benefit_inhabitant.ts`, `scripts/local_demand_inhabitant.ts`.
  Each takes a fresh output directory and labels its staged state.
- Ordinary observation: `node node_modules/vite-node/dist/cli.mjs scripts/experience_connections_observe.ts inhabitant_evidence/connections-new-meadow meadow 45 arrivals`.
  Seeds are meadow/river/forest, Normal profile, maximum 45 days and 180 seconds per
  seed. Omitting `arrivals` disables immigration for that diagnostic only. Sampled
  offers, actual selected actions, heard requests, new people, receipts, source hashes,
  conservation, initial snapshot and final save are separate evidence. A budget stop
  is partial, not a completed horizon. Do not silently retry it or replace its seed.
- Reconstruct a previously observed natural interval (at most three days):
  `node node_modules/vite-node/dist/cli.mjs scripts/experience_connections_natural_trace.ts inhabitant_evidence/connections-background-45-meadow/natural-lesson-start.json inhabitant_evidence/connections-pia-new-trace 1013 94477`.
  No controller or action selection; final tick 94477 includes execution tick 94476.
- Manual browser harness: `/scripts/browser/experience_connections_manual.html?start=/inhabitant_evidence/connections-.../start.json&actor=Name`.
  Uses actual Game, Renderer, inspector and manual InhabitDriver. Stop and export via
  **Save verification bundle**. Natural checkpoints retain their arrival setting;
  manual continuation is labelled separately from natural simulation evidence.
- Exact Node replay: `node node_modules/vite-node/dist/cli.mjs scripts/experience_connections_manual_replay.ts <downloaded-bundle.json> <fresh-output>`.
  A matching simulation hash is insufficient when the serialized comparison fails.
  Same-browser replay is separately available at
  `/scripts/browser/experience_connections_replay.html?bundle=/inhabitant_evidence/connections-.../bundle.json`.
  Export its result and report cross-runtime heading differences honestly.

New worlds use 44. Existing saves do not receive reassigned skills or erased knowledge.
Current held-technique variation concerns charcoal firing; all eleven proficiency
skills vary. Long-run balance and population-level benefit remain unmeasured.
