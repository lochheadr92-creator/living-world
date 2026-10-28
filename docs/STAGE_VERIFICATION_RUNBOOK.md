# Stage verification runbook

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
