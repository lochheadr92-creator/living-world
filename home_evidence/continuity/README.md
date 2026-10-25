# Household interruption display evidence — 2026-10-25

Base: main e3e1a93. Implementation branch: codex/household-continuity.
Rules 27, presentation only. No simulation or protocol changes.

## Contract evidence

`tests/household_continuity_view.test.ts` uses the production decision, accepted
conversation, suspension, resumption and haul paths. The scene starts with four wood
in Ada's pack, a hut requiring eight wood/four stone, stocked lean-to and friendship.
It is explicitly staged. Normal chat acceptance refused at tick 1000; that case is
retained. Tick 1024 accepts, preserving a distinct refusal contract rather than
forcing acceptance or weakening thresholds. No goods are added after setup.

Before the observer fix, the accepted conversation reproduced state `waiting` where
the contract requires `paused`; the card called the suspended activity "not started".
Afterwards the same activity resumes and transfers four wood from pack to site.
A save made inside the conversation continues identically, compared as full serialized
state. Inspector reads are also compared against complete pre-read saved state.

## Browser evidence

Edge, actual default 716 x 489 viewport. Vite on 127.0.0.1:5294, this worktree.
Development-only entry `/scripts/fixtures/household-continuity.html` uses the real
Game, Renderer and person inspector; no new product controls or simulated screenshots.

- `paused.jpg`: accepted conversation and a paused hut delivery; known requirements
  eight wood and four stone, no credited deliveries yet.
- `resumed.jpg`, `resumed-dom.txt`: same journey under way again. Browser review found
  the false "stuck" label caused by the old elapsed-start heuristic; the saved image
  is after correction and reload. Normal travel no longer claims a recorded stall.
- `delivered.jpg`, `delivered-dom.txt`: four units actually delivered, empty pack,
  remaining known requirements four wood and four stone. The old planned delivery
  step remains until the next normal decision, as the simulation records it.
- `next-step.jpg`, `next-step-dom.txt`: the ordinary Step button was clicked; the next
  decision updates the material step to obtaining four wood, while ordinary partial
  construction is under way. No action was assigned through a new control.

Snapshots use `?phase=resumed` and `?phase=delivered` to advance the same production
chain before pausing. They are labelled staged and do not prove natural frequencies,
home completion, long-term survival, human usability or aggregate benefit. At this
small viewport the existing inspector needs scrolling; this slice does not redesign it.

## Verification

- New contracts first reproduced the display defect (after correcting fixture setup).
- Focused final command: `npx --no-install vitest run tests/household_continuity_view.test.ts tests/household_home.test.ts tests/night_wait_interruption.test.ts`:
  **66 tests / 3 files passed**.
- Initial full suite: **1192 tests / 142 files passed**, 96.06 seconds; before the final
  false-stall correction. `full-tests.txt` preserves this run.
- `npx --no-install vite-node scripts/golden.ts`: **all fingerprints match**. No
  historical reference was regenerated. This preceded only the observer stall fix.
- Final `npm test`: **1193 tests / 142 files passed**, 112.21 seconds, including the
  false-stall regression and existing continuation/replay contracts. `final-tests.txt`.
- Final `npm run typecheck` and `npm run build`: passed. `git diff --check`: passed.
- The final foreign-household belief assertion was added after the full run; the
  unchanged production code and all **8 focused contracts passed again**.
- Existing Vite future-config warnings and the intentional timeout-overflow test warning
  appeared. No new build/test failure remains. No expensive ensemble was launched.

Verification verdict: **TURN_INTEGRATION_VERIFIED** for this bounded observer slice,
supported by real conversation/delivery/save continuation and rendered person-card
inspection. No required check is outstanding for this slice. Deferred civilisation
ensembles and human usability studies are outside the claims made here.

## Diff review

The production diff is confined to derived observer code. Simulation state ownership,
conversation acceptance and activity execution are unchanged. A fresh check confirmed
that inhabitant observations do not consume these view-models, so historical transcript
wording is unchanged. The wrong-site/unknown-belief and no-recorded-cause contracts
guard against fabricated information. The resumed stall finding was fixed and retested.
