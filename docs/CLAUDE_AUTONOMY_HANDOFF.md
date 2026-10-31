# Autonomy programme handoff — 31 October 2026 (Claude session, second checkpoint)

The owner asked for a stop, commit, push and handoff after the proposed-projects slice. This is a checkpoint, not
programme completion. Everything below the "Original Codex handoff" heading is the earlier provenance, kept unchanged.

## State at this handoff

- Branch `main` (also pushed to `ccr-ebf20163-236tsz`). Current rules version **107**. Find the exact HEAD with
  `git log -5 --oneline`; the last three slices are recorded in the register header of `docs/DEPENDENCY_CHAIN_PROGRAMME.md`.
- First command: `git status --short`. Do not reset, clean, bulk-stage evidence or merge historical branches.
- Read `AGENTS.md`, `CLAUDE.md`, `WORKFLOW.md`, `PRODUCT_VISION.md`, `docs/DEVELOPMENT_POLICY.md`,
  `docs/BRANCH_LIFECYCLE.md`, `docs/AUTONOMY_ENVIRONMENT_OWNER_PROMPT.txt` (the full owner scope, unedited) and the
  register before editing.

## Delivered in this session (all on main, each with tests, docs, register entry; 98–107 with immutable references)

| Slice | Runtime | Reference | Doc |
| --- | --- | --- | --- |
| Rules 98 roof duties verified and reviewed (one fix: stale roof refusal spoken as a fire) | `259f028` | `4cd6828` | `REPAIR_DUTY.md` |
| Rules 99 prepared project steps (cart chain completes from its own decisions) | see register | see register | `READY_STEP.md` |
| Rules 100 heard household supply defers a reserve, complements site materials | see register | see register | `HOUSEHOLD_SUPPLY.md` |
| Rules 101 promised material counts against own fetching until the spoken time | see register | see register | `PROMISED_SUPPLY.md` |
| Rules 102 no second roof promise for a building already promised | see register | see register | `REPAIR_DUTY.md` |
| Rules 103 bounded personal decision ledger for the inspector | see register | see register | `DECISION_LEDGER.md` |
| Rules 104 household undertakings told at a real shared supper | `69c391d` | `711ef2f` | `HOUSEHOLD_SUPPLY.md` |
| Rules 105 asking a present neighbour where a promised person is | `06d3963` | `3cab1e1` | `LOCATION_QUESTION.md` |
| Rules 106 care for an out-of-sight dependant decided from remembered signs | `fe28953` | `9879e96` | `REMEMBERED_NEED.md` |
| Rules 107 checked first-hand accounts of places held to their teller | `a430195` | `4bcbb9c` | `CHECKED_ACCOUNTS.md` |
| A16 proposed projects through the inhabitant seam (protocol 31/32, observation 17; no rules version) | this checkpoint | none (engine unchanged with nothing installed) | `PROPOSED_PROJECTS.md` |

Each slice's ordinary five-day screens (river, mostly also meadow or forest) are in `autonomy_evidence/r<N>-*` with
`report.json` committed; rendered checks in `autonomy_evidence/*-rendered`. Most ordinary screens are null or near-null
results and are recorded as such: no workshop operation, no cart, no spoken roof request, no location question started,
no weighed ask offered, within five ordinary days. Rules 107's ordinary checks (71 and 87 accounts checked in five river
and meadow days) are the one mechanism seen active ordinarily.

## Verification status of the last slice (A16 proposed projects)

Full regression on the final source (shared four-core container, 1,690.76 s): **339 files / 2,204 tests, 336 files passed; the six failures were the three protocol tests (`ecology_protocol`, `flood_protocol`, `water_protocol`) pinning the previous current protocol numbers 29/30 and observation 16**, updated to 31/32 and 17 in this checkpoint commit and passing 13/13 afterwards together with the proposals tests. No simulation test failed. Re-run in full after that correction at `056dbac`: **339 files / 2,204 tests passed, 1,702.99 s**.

Focused: `tests/inhabit_proposals.test.ts` 4/4, with `inhabitant*.test.ts`, `inhabit_*.test.ts`, `golden.test.ts`,
`v107_continuation.test.ts`, `ready_step.test.ts`, `batch_plan.test.ts` passing after the protocol-number updates;
typecheck clean. No rendered check and no ordinary screen were made for it: the seam runs only with a controller
installed, and no real-model run was made.

## What remains (the whole owner programme is incomplete)

Follow the register's capability map (`docs/DEPENDENCY_CHAIN_PROGRAMME.md`, "Capability / classification" table) and
the owner prompt's order. Known open items, in rough priority:

1. **Owner-run long validation.** `docs/AUTONOMY_VALIDATION.md` holds runnable 45-day commands for rules 99, 100 and
   101 that were never run (too costly for the container). The WS6/WS7 ordinary production and cart evidence at the
   current rules needs them: workshops are laid out around days 6–15, so five-day screens cannot show ordinary use.
2. **A3 general contingent goals**: other goal families, revision of an adopted goal, composition across goals; A16
   covers production goals only, and a real-model run with proposals was not made.
3. **WS16/WS4** replacement after collapse, limited adult labour; **WS19** disputes attribution audit; **WS9** customers
   and trade; **WS3** winter food flow; **WS10/20** knowledge continuity and population viability.
4. **A7 leftovers**: rumour correction (`reputation.ts`) and accounts of promises, work and whereabouts are not graded.
5. **A8 leftover**: the pre-56 watch fallback reads a child's true position; legacy only, preserved by the references,
   recorded as open (a change would alter recorded behaviour below 56).
6. **WS17** sustained care and cover duties after recovery; ordinary care reliability unproven.
7. The `fedUntil` live read (a 120-tick window set only by an actual hand-over) remains, recorded in `REMEMBERED_NEED.md`.

Conventions that held throughout: one slice per rules version, owner module at `src/sim/<name>.ts` with a lab switch
`rich-no-<name>`, tests with a STAGED fixture under `tests/helpers/`, a rendered check under `scripts/browser/`, an
observer under `scripts/<name>_observe.ts` run five days at the new version and at the pinned predecessor, docs under
`docs/<NAME>.md`, then commit runtime → pin `scripts/vN_reference.ts --write` (never regenerate an older one) → record
the register/AGENTS/CLAUDE entry → push `ccr-ebf20163-236tsz` and fast-forward `main`. Full regression takes about
1,700–1,900 s on the shared four-core container; run it in the background and keep the session active.

## Original Codex handoff (kept as provenance)


The owner stopped implementation and requested committing/pushing the work **as is**,
then a continuation prompt for Claude. This is a checkpoint, not programme completion.
No additional simulation behaviour was changed for the handoff.

## Resumed by Claude — 31 October 2026

Steps 1–3 of "Exact next task" are done on `main`: full regression on the checkpoint
(318 files / 2,142 tests), build, rendered 8/8 and the river screen were reproduced in
a fresh clone; one review finding (a stale roof refusal spoken as a fire) was fixed with
a test in `259f028`; the immutable rules-98 continuation is `4cd6828`. The next unused
rules number was confirmed as 99 (no branch, tag or source uses it). Results:
`REPAIR_DUTY.md` and the programme register. The rest of this file is the original
Codex handoff, kept as provenance.

## Start here

- Repository: https://github.com/lochheadr92-creator/living-world
- Active integration checkout: `C:\dev\Claude Experiment\living-world-integrate`, branch `main`.
- Implementation/evidence checkout: `C:\dev\Claude Experiment\living-world-autonomy`, branch `codex/autonomy-environment`.
- Previous published checkpoint: `3bf3e04f21ca3260fbd4579d86d603aa26fa36d0`, rules 97.
- This checkpoint commits rules 98 as implemented; find its exact commit with `git log -5 --oneline`.
- Original full scope, copied without editing: `docs/AUTONOMY_ENVIRONMENT_OWNER_PROMPT.txt`.
- Authoritative progress register: `docs/DEPENDENCY_CHAIN_PROGRAMME.md`.
- Read `AGENTS.md`, `CLAUDE.md`, `WORKFLOW.md`, `PRODUCT_VISION.md`,
  `docs/DEVELOPMENT_POLICY.md`, and `docs/BRANCH_LIFECYCLE.md` before editing.

First recommended command: `git status --short`. Verify checkout, branch, HEAD,
remote relationship, active work and current rules before proceeding. Do not treat
old AUTONOMY.md/RICH_WORLD.md gap tables as the current backlog.

## Completed before this checkpoint

38 implementation slices, rules 60–97, were already integrated and pushed. They
cover production prerequisites/recovery, household care and actual consumption,
bounded production projects, routines, action scope, journeys, learning, promise
communication/cancellation/delays, ecology, finite water, floods, material reuse,
meals/meetings, continuity, work handover, care supplies, warmth and care handback.
Each slice's evidence and limits are in the register and linked documents.

The capability map has 30 broad rows: one connected existing private-plan baseline
and 29 rows retaining implementation and/or evidence gaps. Most are partial, not
untouched. Completed slices are not equivalent to closed capability rows.

Rules 97's final regression passed 315 files / 2,124 tests in 437.41 seconds;
its immutable predecessor continuation is `543be3f`, generated from `745a92d`.

## Rules 98 implementation being handed over

`docs/REPAIR_DUTY.md` records the original rules-97 failures and contract.
Actual roof requests accepted a distant home without communicating its location;
empty-handed helpers could accept on known wood but then only seek planks.

Implemented in rules 98:

- Accepted repair requests communicate only the asker's dated home belief;
  newer helper observations win. The note describes work, not delivered wood.
- An accepted roof duty can obtain one physical wood patch through the existing
  acquisition path when appropriate unreserved material is absent.
- Already held appropriate material is preferred; capacity and reservations remain.
- Physical repair rechecks lawful supplies and changed condition, preserving
  partial paid work and protecting other deliveries/plans.
- The existing condition-62 contribution settlement is retained. This is not a
  promise of a fully restored 100% building.
- Lab removal: `rich-no-repair-duty`. Rules <=97 retain predecessor behaviour.

Existing modules touched, and why: `social.ts` acceptance/knowledge, `options_work.ts`
acquisition and repair choices, `act_build.ts` physical material checks,
`rulesversion.ts` behaviour boundary, and `scripts/lab/lab.ts` isolated removal.
New owner: `src/sim/repair_duty.ts`.
Tests: `tests/repair_duty.test.ts`, `tests/repair_duty_protocol.test.ts`,
`tests/helpers/repair_duty.ts`.
Reproduction tools: `scripts/repair_duty_observe.ts` and
`scripts/browser/repair_duty_check.mjs`.

## Verification classification: partially verified checkpoint

- Focused run: 45 tests / 5 files passed in 2.70 seconds. Local log:
  `autonomy-repair98-focused2.log`. Covers roof tests, protocol replay, practical
  care/upkeep, promise targets and the rules-97 reference. A subsequent test-only
  correction made a reservation recipient a separate neighbour; the full run
  includes that correction.
- Typecheck/build passed: `autonomy-repair98-final-build.log`. Existing bundle-size
  warning remains; it was not suppressed or fixed as unrelated work.
- Rendered browser run: 8/8 checks passed, screenshots actually inspected.
  `autonomy_evidence/repair98-rendered/report.json`,
  `autonomy-repair98-browser.log`. Staged damaged home and offered request;
  subsequent acquisition/repair and resident sleep were autonomous. Three wood
  patches restored condition from 20 to about 73; Ada then slept inside with full
  shelter and increasing energy. No ordinary frequency or survival claim.
- Three ordinary five-day observations completed to tick 12,000, with exact twins,
  100 pure inspections each, valid final saves and balanced resources. River:
  46.667s, six repair starts; forest: 41.276s, three; meadow: 43.792s, six.
  River sampled one roof-request offer; no actual new requested-repair chain was
  observed. Ordinary repair starts are not proof of the new duty mechanism.
  Meadow retained Talia's thirst death at tick 8,746, age eight.
  Local folders: `autonomy_evidence/r98-{river,forest,meadow}`; corresponding
  logs: `autonomy-repair98-{river,forest,meadow}.log`.
- Full regression was running at the owner stop request and was explicitly
  interrupted for handoff (session 12658 exited 1 after Ctrl-C). The incomplete
  `autonomy-repair98-full-tests.log` is preserved. This is neither a passing run
  nor an observed assertion failure. Run the full suite once when resuming.
- Rules-98 immutable continuation has **not** been generated or verified.
  Final fresh review and programme reconciliation remain outstanding.

Useful commands (run from the repository; use the existing dependency installation):

```text
npm run typecheck
npm run build
npm test -- --maxWorkers=4 --reporter=default
npx vite-node scripts/repair_duty_observe.ts river autonomy_evidence/r98-river-fresh 5 170
node scripts/browser/repair_duty_check.mjs http://127.0.0.1:5290/ autonomy_evidence/repair98-rendered-fresh
```

The browser command requires the development server and an unused output directory.
Full unit regression normally takes about 437 seconds; this is distinct from the
owner's bounded simulation-run policy. Preserve existing evidence, including failed
diagnostics. Do not chunk expensive simulations to evade that policy.

## Exact next task

1. Finish review and verification of this rules-98 checkpoint, including the full
   regression result and final diff. Fix only concrete findings, with evidence.
2. Record honest final status in REPAIR_DUTY.md and the existing programme register.
3. Pin the immutable rules-98 continuation from the actual accepted runtime before
   implementing any successor behaviour. Follow `scripts/v97_reference.ts` and
   `tests/helpers/v97ref.ts`; include ordinary, active-duty, paid repair and saved
   interruption paths as appropriate. Never regenerate an old reference to make a
   successor pass. Verify the next unused rules number rather than assuming 99.
4. Continue the entire original programme through dependency-sized slices. Do not
   stop after roof repair or silently narrow scope to another nearby care fix.

Read-only investigation of A3/A16 began, with **no implementation or allocated
successor version**. Current external choices only pick offered actions/defer/fall
back; protocols are 29/30 and observation 16. Production graph compilation already
exists. Inspect `src/sim/external.ts`, `decision.ts`, `project_compile.ts`,
`project_graph.ts`, `project_step.ts`, `batch_plan.ts` and `src/agent/protocol.ts`,
`observe.ts`, `transcript.ts` before designing bounded goal proposals. Reuse the
existing planner and validate before mutation. This is a possible next substantial
dependency, not a settled design or authorization to skip other rows.

Remaining scope includes household rhythm/coordination; broader contingent goals,
waits and recovery; memory/competence/conflicting reports; cooperation speech;
sustained care and shared upkeep; ordinary production/carts/customers/trade;
winter food and civic feedback; relocation/population/knowledge continuity;
longer ecology/water/hazard response; disputes; causal inspection; AI goal proposals;
and combined ordinary/mature Large acceptance. Follow the register's individual
completion conditions. Expensive owner-run validation in AUTONOMY_VALIDATION.md
remains unrun unless actual returned evidence establishes otherwise.

## Protected work and delivery rules

Main had 989 existing untracked evidence files, verified unchanged before this
checkpoint. The autonomy checkout contains substantial local evidence/diagnostics;
these are intentionally not swept into Git. Source/tests/tools for rules 98 are
committed, but local logs/screenshots are not guaranteed in a fresh clone. Preserve
the separate dirty `living-world` / `deepseek-b1` checkout and every other worktree.
Never reset, clean, bulk-stage evidence, rewrite history or merge retired branches.

Preserve local knowledge, resource accounting, observer purity, deterministic
ordering, save/replay and predecessor semantics. Separate staged mechanism proof,
ordinary occurrence, later influence and aggregate/mature benefit. Zero activation
is evidence, not permission to tune until it appears. Keep adversity and uncertainty.

The owner authorizes continuation through the full prompt, focused commits,
integration and normal pushes under WORKFLOW.md; no mandatory PR or extra approval
loop. The Codex implementation is stopped for handoff. Claude resumes only when
the owner supplies the continuation prompt.
