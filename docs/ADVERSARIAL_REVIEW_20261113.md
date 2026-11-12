# Adversarial review — 13 November 2026

**Verdict: concrete corrections needed; no production fixes made by this review.** Five reproduced findings below. No critical security defect established. Severity is P2 (normal-priority correctness) for each; the save finding concerns malformed-input integrity, the entity/water collision concerns long-lived worlds, and the counter finding concerns measurement accuracy. They are not equally likely in ordinary play.

## Scope and provenance

Owner request: “can you perform an adversarial review on the repo and record it down in the appropriate places”. Reviewed `C:\dev\Claude Experiment\living-world-integrate`, branch `main`, HEAD `652c3b77a4d55a663981d054b440c5c160d350ec` (rules 228). Read WORKFLOW, AGENTS, HANDOFF and relevant development policy, growth/generation records and gap ledger; traced conversation suspension, family-time refusal, save loading/ID allocation, belief identity, news delivery and generation measurement.

The checkout is shared and dirty: existing modifications in `docs/RULES_RANGES.md`, `scripts/lab/lab.ts`, `scripts/supply_probe.ts`, `src/sim/production.ts`, `src/sim/rulesversion.ts`, plus untracked `src/sim/site_supply.ts`, `tests/site_supply.test.ts` and evidence folders. Those changes were preserved and are **not approved or validated as a completed feature by this review**. Probes explicitly use rules 228. This is a targeted adversarial source review, not an exhaustive audit of every subsystem, full-suite result, browser usability review or new ensemble measurement.

Reproduction: `npx vite-node review_evidence/adversarial-20261113/probe.ts`. Script and actual JSON output are retained together. Probes stage boundary conditions; they do not measure ordinary activation rates or population effects.

## AR-01 — Refusing family time still destroys the work being protected (P2)

**Sources:** `src/sim/social.ts:924`, `src/sim/activities.ts:557-573`, `src/sim/childhood.ts:71`, `src/sim/parent_decides.ts:workComesFirst`.

Conversation setup suspends the recipient's activity before the family-time answer is decided. Suspension of ordinary work changes its phase to travel and resets both progress fields. The work-first decision sees the suspended job and refuses, but cannot restore the progress that suspension already erased. Thus “Not now. I have to finish this first” does not actually preserve the work in hand.

**Reproduced:** staged gathering job, progress 39, duration 40, utility 999; suspension → work-first refusal → successful resume leaves progress 0 and phase travel. Output `refusedAsk`. Existing parent tests install an already-suspended job, bypassing the destructive transition. General conversation progress loss is already an open brain loop; this review establishes its interaction with rules 228, not its first introduction.

**Proposed correction:** preserve the work across a refused ask, using the existing activity/claim ownership and interruption rules. Test the complete conversation setup → refusal → resume path, with an almost-finished gathering/crafting job and checks that inputs, claims and progress remain coherent. Accepted family time and genuine interruptions need explicit contracts too. Do not globally retain progress without checking each handler.

## AR-02 — Save validation accepts an allocator that reuses a live ID (P2)

**Sources:** `src/app/save.ts:325-406`, `src/sim/registry.ts:56-57`, registration functions using `byId.set`.

The loader performs many subsystem validations but does not establish that `nextId` is a safe, fresh global allocation point before rebuilding the entity index. An otherwise valid world whose counter equals a living person's ID is accepted. The next `newId` returns that occupied ID. Later registration can replace the existing index entry while the original object remains in its owning collection.

**Reproduced:** serialized rules-228 aspen with only `nextId` changed to living person 1084. Deserialize accepts it; next allocation is 1084. Output `saveCounter`. This establishes a malformed-save acceptance defect, **not spontaneous corruption of ordinary saves** or a remote execution vulnerability. A full duplicate-ID validator audit was not performed.

**Proposed correction:** validate safe positive IDs, uniqueness in the global allocation namespace, and a counter beyond allocated IDs before accepting the world. Include IDs owned outside `byId` (activities, events, households, etc.), consistent with the actual allocator contract. Reject rather than silently renumber. Add malformed-save cases and verify failed loads preserve the running world.

## AR-03 — Telling cooldown keys alias different listeners and places (P2, known G227)

**Sources:** `src/sim/empty_news.ts:57-58,71-83`, `src/sim/social.ts:100`, corresponding arithmetic in `options_social.ts`.

`listener * 1_000_000 + beliefId` is not injective because water belief IDs already include 1,000,000. Telling listener 100 about water cell 12 writes key 101000012, identical to telling listener 101 about entity 12. This can suppress a telling that never occurred to that listener, without the world first allocating a million real entities.

**Reproduced:** set the first telling, then call `tellingSuppressed` for the second listener's berry-bush belief: true. Output `deliveryCollision`. Existing ledger G227 already identifies this defect; it remains unresolved in the reviewed source.

**Proposed correction:** use an unambiguous pair representation consistently in delivery, suppression and observation, with a versioned compatibility strategy for recorded old numeric keys. Test cross-listener water/entity collisions and save continuation.

## AR-04 — Real entities cross into the water-belief namespace (P2, known G226)

**Sources:** `src/sim/knowledge.ts:22-30,267-268`, `src/sim/registry.ts:56-57`; consumers in `src/agent/observe.ts:242,273`, `src/sim/optutil.ts:241`.

All IDs at or above 1,000,000 are classified as water, while the shared allocator is monotonically increasing with no corresponding boundary. IDs are also spent on non-entity records, so the threshold is not a million simultaneously living people or standing structures. Real entity beliefs then alias water cells and are misclassified by inspector, stale-belief and water-failure logic.

**Reproduced boundary:** a source with ID 1000012 observed as a tree is simultaneously classified as a water belief. Output `entityWaterCollision`. This stages the threshold; no new long run was performed to establish the time at which a normal world reaches it. Existing ledger G226 already records the namespace defect.

**Proposed correction:** separate identity domains with a versioned saved representation; audit all threshold predicates and literal water-ID arithmetic. Do not merely move the positive base upward and call the namespace disjoint. Preserve old saved-world behavior deliberately.

## AR-05 — “Households ever” is the current surviving array length (P2, measurement)

**Sources:** `scripts/generation_trace.ts:140`, `src/sim/households.ts:42`; historical output `review_evidence/generation-20261113/summary.txt:78,211`.

The trace labels `w.households.length` as `householdsEver`, but dissolution removes entries from that array. The field cannot measure cumulative formations. The recorded arrivals-off summary already decreases from 11.4 to 8.7 under “households ever”.

**Reproduced:** staged dissolution changes this supposed lifetime count from 10 to 9. Output `householdsEver`. Population, death and birth counters are not thereby disproved; no numerical recalculation of those outcomes was needed or performed.

**Proposed correction:** rename the existing field to its true meaning, or maintain an observer-owned set/counter of formed household IDs with adequate sampling. Retain the old JSON as historical evidence and annotate its interpretation rather than rewriting it silently. Any lifetime-formation conclusions require new measurement or recovery from sufficient retained records.

## Verification, limits and disposition

- Probe command exits 0 and prints all five reproductions: `review_evidence/adversarial-20261113/probe.json`. It is an observational reproducer, not a regression test that asserts corrected behavior.
- `npx vitest run tests/parent_decides.test.ts tests/finish_job.test.ts tests/lean_years.test.ts tests/save.test.ts --maxWorkers 2`: **4 files, 38 tests passed**, 51.61 seconds. Output `focused-tests.txt`; Vite emits extension/config-loader compatibility warnings. No valid tests were changed or excluded from that command.
- `npm run typecheck`: **exit 0**, output `typecheck.txt`. These commands ran against the shared working tree, including existing unfinished edits, rather than a clean frozen checkout. No claim that those edits are independently verified follows.
- No full suite, long lab, throughput benchmark, UI inspection, dependency vulnerability audit or proof of absence of other defects. Historical test failures remain historical until reproduced. The water-collapse and food-capacity observations in the growth records are not converted into causal bug diagnoses by this review.
- No simulation, test expectation, rules version or historical measurement output was changed. New files are this report and its evidence. Brain checkpoint and open-loop records link these findings; existing G226/G227 entries remain the canonical older gap records.
- Brain checkpoint and loops were checksum-guarded and read back. `python C:\dev\brain\tools\check_frontmatter.py` exits 1: 58 filename/permalink problems across 163 notes, all reported under `ai/daily`; neither edited note was reported. The vault-wide check therefore remains failed. Review evidence text files were normalized to UTF-8/LF; `git diff --cached --check` passes.

**Proposed order:** AR-01 (ordinary work interruption), AR-02 (save integrity), AR-03 (immediate news alias), AR-04 (long-world identity), AR-05 (measurement naming). These are recommendations, not owner approval to implement them or revise behavior. Further review should target additional subsystems rather than treating this limited pass as a whole-repo clean bill of health.
