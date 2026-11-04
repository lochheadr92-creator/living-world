# Living World: adversarial whole-repository review

## Strongest supported conclusions

1. **Ordinary suspended activities can disappear without entering the common ending path.** This is not only a staged corner case. In one unmodified current-rules river world, two ordinary activities vanished during five simulated days: a wood-gathering trip at tick 2,959 and a hut build at tick 7,645. Both targets were already absent, neither activity produced an ending, and both decision entries remained open. The same transition skips handler cleanup, promise-attempt evidence, route/learning outcomes and `lastResult`. This is **LW-01, P1**.

2. **Family lifecycle code bypasses the local-knowledge and physical-social chains used elsewhere.** A father 57.67 tiles away immediately received birth knowledge, two mood thoughts, a `new_parent` life event, relationship changes and later decision bonuses. Separately, an orphan 53.91 tiles from the selected carer changed household instantly, without contact, consent or movement. These are **LW-02 and LW-03, both P2**. The evidence is staged and establishes mechanism behaviour, not ordinary frequency.

3. **The strongest integrity checks are useful but answer narrower questions.** All-item conservation, exact save continuation, browser-storage round trips, sampled inspector purity and the corrected Windows process runner passed. They do not detect the activity-ending defect, and conservation remained true after both ordinary losses. No item duplication, save divergence or runner exit-code defect was found in the reviewed checks.

4. **The current capability register is generally candid about the larger product gaps.** Useful carts, winter food security, sustained social rhythm, home replacement and general goal composition remain incomplete or unmeasured. Current-rules mature Large performance is still unmeasured; the retained mature measurement is rules 109, not rules 115. This review does not convert those disclosed gaps into new runtime defects.

## Baseline, scope and provenance

- Review target: `C:\dev\Claude Experiment\living-world-integrate`.
- Branch and revision: `main`, `b2cf812` (`Refresh capability classifications and precise verified continuation state`).
- Current behaviour version: rules **115**, from `src/sim/rulesversion.ts:167`.
- `git diff --stat` and `git diff --cached --stat` were empty. The checkout contains extensive pre-existing untracked evidence and diagnostic work; it was not cleaned, moved or modified.
- The separate `living-world` checkout and other worktrees were not used as the review target.
- New artifacts from this review are confined to `review_evidence/whole_repo_b2cf812/`.
- Historical evidence is labelled below by rules version. New probes and the ordinary scan ran on the current checkout at rules 115.
- During final verification, separate untracked `tests/zz_review_*` files appeared outside this review's evidence directory. They were left untouched. Their provenance and a type-check limitation are recorded under “Verification commands”.

The review covered older foundational code as well as recent rules-113–115 work. It was risk-based, not a claim that every line received equal scrutiny. The coverage map explicitly separates deep, sampled and unexamined areas.

## Repository map: ownership, dependencies and contracts

| Subsystem | Principal ownership and dependencies | Contract and test coverage reviewed |
|---|---|---|
| Tick order, time and seasons | `world.ts` calls environment, ecology, sources, buildings, reservations, wildlife, people, conversations and lifecycle in a fixed order; `environment.ts`, `hardship.ts` own time/weather pressure | Deep inspection of person and slow-process ordering; sampled environment/needs tests. No broad seasonal ensemble run. |
| Needs, death and population | `needs.ts`, `life.ts`, `lifecycle.ts`; death calls activity abort, estate/tool cleanup, household removal and social consequences | Deep birth/adoption/death call paths; focused lifecycle and continuation tests. Mortality outcomes are not treated as defects by themselves. |
| Perception and personal knowledge | `perception.ts`, `knowledge.ts`, remembered-need/location and social-knowledge modules feed option generation | Sampled local-observation contracts and purity checks; deep comparison with family-event bypasses. |
| Decisions and planning | `decision.ts`, `options_survival.ts`, `options_work.ts`, `intent.ts`, project graph/revision modules; options create activities and ledger entries | Deep decision-to-activity-to-ending trace; bounded production revision and current goal-family register reviewed. General composition remains absent. |
| Movement, interruption and activity completion | `activities.ts`, `pathfinding.ts`, `social.ts`, activity handler modules | Deep suspension/resume/end inspection, paired staged controls and one ordinary five-day scan. This is the strongest defect area found. |
| Resources, ownership and obligations | `economy.ts`, reservations, tools, estate, commitments and promise outcome modules | Deep ending-boundary interaction; all-item conservation, promise and storage tests. No exhaustive fuzzing of every validator. |
| Production and transport | `production.ts`, `facilities.ts`, `act_production.ts`, `project_hand_inputs.ts`, `transport.ts`, `carts.ts` | Sampled physical handlers and current evidence. Rules-115 input retention is connected in a bounded family; ordinary cart usefulness remains unproven. |
| Construction and habitation | `act_build.ts`, `buildings.ts`, sites/layout claims, `habitation.ts`, home-replacement modules | Sampled access, completion and replacement contracts; deep ordinary build loss found at the suspension boundary. Sustained collapse recovery remains incomplete. |
| Households and relationships | `households.ts`, `relations.ts`, `lifechanges.ts`, `social.ts`, `lifecycle.ts` | Deep household mutation, birth and adoption paths; relationship effects measured in staged probes. |
| Learning and social consequences | `learning.ts`, route/source/helper experience, techniques, promise knowledge/outcomes | Deep dependence on `endActivity`; focused helper-learning tests passed. Ordinary activation of many advanced chains remains limited or unmeasured. |
| Persistence and compatibility | `src/app/save.ts`, rules-version/lineage modules, feature validators, IndexedDB/localStorage | Exact round trips and continuation, old-rules checks, storage fallback/quota/rejection tests. No claim that every malformed state was challenged. |
| Inspection, history and rendering | `inspect.ts`, `inspect_work.ts`, `history.ts`, UI/renderer interfaces | Code and pure-observer tests sampled. Decision-history loss is established from state. Actual rendered comprehensibility was not assessed in this review. |
| Verification tooling | `run_longruns.ps1`, long-run observers, immutable continuation tests, browser/performance scripts | Windows exit-code/horizon/integrity checks inspected and tested; source-diff and fresh-output safeguards reviewed. No broad ensemble rerun. |

# A. Actionable findings

## LW-01 — Ordinary suspended activities vanish without an ending or cleanup

**Severity: P1.** This is a serious core-correctness failure under plausible, observed ordinary conditions. It breaks the common completion boundary for gathering and construction and can affect any suspended activity with expiry or target loss. It is not P0: no catastrophic item loss or save corruption was demonstrated.

**Classification:** Runtime defect in activity lifecycle, with cross-system consequences for obligations, learning and inspection.

**Confidence and evidence type:** High. Two ordinary current-rules occurrences, plus paired staged reproductions and an active-activity control.

### Contract and expected behaviour

- `src/sim/activities.ts:405-430` describes `endActivity` as the single place where activities end. It releases claims and invokes handler `onEnd`, promise-attempt recording, route learning, result recording, decision closure and the ending hook.
- `docs/DECISION_LEDGER.md:24-25` says entries close where the activity ends, including a suspended and resumed activity.
- An invalid paused activity should therefore receive a real failed or interrupted ending and the same cleanup as an equivalent active activity.

### Trigger and earliest broken transition

1. A conversation or argument suspends an ordinary non-occasion activity (`src/sim/social.ts:891`, `1774-1775`; `src/sim/activities.ts:549-565`).
2. Its target disappears, or its deadline expires while paused.
3. `resumeSuspended` first clears `p.suspended`, then directly returns `false` at `src/sim/activities.ts:568-579`.
4. Unlike the rules-112 occasion branch at lines 573-575, the ordinary branch never restores the activity and never calls `endActivity`.

The earliest broken transition is therefore **physical target loss/expiry → silent removal of the suspended activity**, before outcome recording or handler cleanup. A related direct discard also exists for accepted request cancellation at `src/sim/social.ts:1117-1121`; that path was code-inspected but not separately reproduced here.

### Observed behaviour

The paired staged control used a real current-rules activity, decision entry and promise. When the same activity expired while active, it produced:

- `failed:took too long` through `onActivityEnd`;
- a failed `lastResult`;
- a failed closed decision;
- a promise attempt with reason `took too long`.

When suspended before the identical expiry, it produced no ending, no `lastResult`, no decision outcome and no promise attempt. Removing the target instead produced the same silent loss. See `cross-system-probes.log` and `cross_system_probes.test.ts`.

The unmodified ordinary scan then found:

| Tick | Activity | Target state | Promise id | Ending | Decision |
|---:|---|---|---|---|---|
| 2,959 | `gather`, “Chopping wood”, activity 2434 | Source already absent | none | none | open |
| 7,645 | `build`, “Building the hut”, activity 4127 | Site already absent | none | none | open |

Both people retained only an earlier unrelated successful `lastResult`; neither gained a log at the loss. The world remained item-conserved. See `ordinary-suspension-scan.log` and `ordinary_suspension_scan.test.ts`.

### Practical consequence

- Decisions remain permanently without an outcome until compacted; `src/sim/history.ts:103-105` can only display **“ending not recorded.”**
- Promise deadlines can lack the actual failed-attempt evidence needed by `promise_outcomes.ts`.
- Source/route failure learning and anti-thrash cooldowns are skipped.
- Handler-specific cleanup is skipped. Examples include bench release in `act_production.ts:110-121`, exchange-journey conclusion in `exchange_journeys.ts:91`, and gathering failure handling in `act_resource.ts:216-231`.
- A viewer can follow a choice and then lose the activity without a failure, cancellation or completion explanation.

No double transfer or resource discrepancy was observed; claims had already been released at suspension.

### Why existing tests missed it

- `tests/occasion_recovery.test.ts` thoroughly covers the repaired occasion-specific branch, not these ordinary branches.
- `tests/decision_ledger.test.ts:20-23` checks that **closed** entries match actual endings; it never requires every started activity eventually to close.
- Save validators legitimately preserve open entries, so exact save/load cannot distinguish a running decision from a silently abandoned one.
- Layout-claim resume tests exercise a different branch that does call `endActivity`.

### Smallest proposed correction

Route every ordinary invalid-suspension discard through one ending helper. Temporarily restore `p.activity = a`, then call `endActivity` with a precise failed/interrupted reason before returning `false`. Use the same helper for the direct request-cancellation discard. Preserve the existing bounded-night-wait and occasion-specific conditions rather than broadening the change.

### Regression test needed

Add ordinary, non-occasion cases for expiry and missing target, with an active control. Assert exactly one ending, released claims, handler `onEnd`, `lastResult`, closed decision, promise attempt where applicable, and exact save continuation. Include a build and a gather, plus a deterministic ordinary scan asserting no silent suspended-activity loss.

### Compatibility and rules-version implications

This changes outcomes, learning, logs and possibly later choices. Under the repository policy it needs a new rules version, with old versions retaining their historical continuation behaviour. Do not rewrite existing continuation references.

### Counterevidence and limits

- The scan is one seed and five days; it establishes occurrence, not a rate or aggregate harm estimate.
- No resource-loss or duplication claim is made.
- The inspector's “ending not recorded” wording is honest about the missing record; the defect is the missing transition, not a fabricated success message.
- The separate cancellation path needs its own focused regression before its practical frequency is claimed.

## LW-02 — Birth instantly informs and motivates an absent father

**Severity: P2.** The effects are bounded to social knowledge, mood, relationships and later choices, but they violate a foundational causal rule and can redirect subsequent behaviour.

**Classification:** Runtime social-causality defect.

**Confidence and evidence type:** High for the mechanism; staged real-function reproduction. Ordinary frequency was not measured.

### Contract and expected behaviour

`PRODUCT_VISION.md:58-65` requires local knowledge, plausible inhabitant decisions and persistent consequences grounded in actual state; lines 68-71 prohibit hidden omniscience. Biological parentage can legitimately be recorded as world state, but the father's personal log, mood, life event and motivations should follow presence, observation or a communicated report.

### Trigger and earliest broken transition

A child is born while the father is alive but distant and has no sight or conversation with the mother. `giveBirth` directly calls `onBecameParent` for the father, adds his birth thought and writes his personal log at `src/sim/lifecycle.ts:179-187`. `onBecameParent` sets `new_parent` and adjusts the parental relationship at `src/sim/lifechanges.ts:79-84`.

The earliest broken transition is **physical birth → remote personal knowledge and motivation**, with no observation or communication transition. The same static issue exists for conception news at `src/sim/lifecycle.ts:111-113`; that related path was not separately reproduced.

### Observed behaviour

The staged rules-115 birth placed the father **57.67 tiles** away. Immediately afterward he had:

- a personal log saying the child was born;
- `parent` (+10) and `birth` (+20) thoughts;
- a `new_parent` life event lasting 12,000 ticks;
- affinity **82 → 88** and trust **78 → 81** toward the mother;
- partner company pull **5** and a close-helper willingness bonus **0.15**.

See `cross-system-probes.log` and `cross_system_probes.test.ts`.

### Consequence

A remote person can seek company, receive help consideration and display emotional history for an event he could not know occurred. This undermines the same local-causality principle that the current death-knowledge system deliberately implements.

### Why existing tests missed it

`tests/lifecycle.test.ts:16-35` checks birth, household and family ties, not distance or knowledge. Other birth tests check skills, accounting and indoor placement. None challenges an absent rich-world father.

### Smallest proposed correction

Keep physical parentage and kinship creation intact, but separate them from personal event knowledge. Apply the father's log, thoughts, life event and relationship/motivation effects only when he is present or later receives an actual local/typed birth report, reusing the provenance approach used for death news. The mother can retain immediate effects.

### Regression test needed

Cover distant, present and later-informed fathers. Assert no remote log/thought/life-event/relationship or option-score change, exactly one effect after eligible contact or report, and exact save continuation before and after learning. Add a corresponding conception-news contract if that path is also corrected.

### Compatibility and rules-version implications

Gate the changed social effects under a new rules version; older rich worlds need their prior continuation semantics. No change to newborn traits, parent ids or physical birth placement is required.

### Counterevidence and limits

This is staged evidence, not proof of how often distant births occur. Treating household events as automatically shared could be an intentional abstraction, but it is not documented as an exception and conflicts with the stated local-knowledge foundation. The finding does not challenge genetic/kinship records themselves.

## LW-03 — Orphan adoption is a global, instant household mutation

**Severity: P2.** It bypasses the core observation, consent and travel chain for a consequential household transition. No catastrophic integrity failure was found.

**Classification:** Runtime household/social-causality defect.

**Confidence and evidence type:** High for the transition; staged real-function reproduction. Ordinary occurrence and long-term welfare effects remain unmeasured.

### Contract and expected behaviour

The product foundations require local knowledge, plausible decisions, real travel/time costs and understandable persistent consequences (`PRODUCT_VISION.md:58-71`). A household adoption should require a known eligible carer, an actual acceptance and a physical move or co-present household transition.

### Trigger and earliest broken transition

Every 300 ticks, `world.ts:111` calls `adoptOrphans`. For a child without a non-child household carer, `src/sim/lifecycle.ts:293-329`:

- scans every living person globally;
- scores live position, household composition, kin and traits;
- instantly calls `addToHousehold` for the selected adult's household;
- immediately changes relationships and writes both parties' logs and the carer's life event.

`addToHousehold` mutates membership and ownership associations but does not move the person (`src/sim/households.ts:44-58`). The earliest break is before observation or decision: a world-level process selects using remote live state and directly writes the social outcome.

### Observed behaviour

The staged rules-115 case left a child without an adult household carer and placed all eligible adults remotely. The selected carer was **53.91 tiles** away. The child's household changed **911 → 920**, while the child's coordinates stayed exactly unchanged. Both immediately received “took me in” logs, and the remote carer received a `took_in` life event. See `family-orphan-probe.log` and `family_orphan_probe.test.ts`.

### Consequence

Household membership, home access, care eligibility and social memories can change while the child remains far from the new household. The viewer sees an accomplished adoption without the encounter, acceptance or journey that would make it causally coherent.

### Why existing tests missed it

`tests/lifecycle.test.ts:65-76` explicitly checks only that “someone” takes the child in and that an event exists. It does not assert knowledge, consent, distance, location or a later physical arrival.

### Smallest proposed correction

Replace the global mutation with a bounded local care opportunity. Candidates must be known and actually contacted; acceptance should use the existing social/request machinery; household transfer should occur only on co-present arrival using existing relocation/care travel. If nobody eligible is reached, retain the unresolved care state rather than guaranteeing a remote adoption.

### Regression test needed

Prove that a remote adult cannot adopt from live global state. Then cover a local offer, refusal, acceptance, physical travel and household transfer on arrival, including interruption and mid-journey save/load. Also retain a no-available-carer case without a fabricated success.

### Compatibility and rules-version implications

This changes household membership, care and later decisions and therefore needs a new rules version. Existing saves and references must retain their historical semantics.

### Counterevidence and limits

Automatic adoption may be intended as a child-survival safeguard. That would be a product abstraction requiring an explicit exception and honest presentation, not evidence that a social/physical chain occurred. This review did not measure adoption frequency or attribute deaths to it.

# B. Capability assessment

| Area | Classification | Evidence and earliest missing transition |
|---|---|---|
| Seeded generation, time and environment | **Implemented and connected within sampled scope** | Fixed tick ordering and environment/source updates were inspected; targeted lifecycle/weather tests passed. No full worldgen or seasonal ensemble certification. |
| Needs and immediate survival action | **Implemented but incomplete** | Needs, physical gathering/drinking/death and conservation are real. Durable winter provisioning and recovery remain unproven; rules-114 forest extinction is adverse evidence, not a single-cause diagnosis. |
| Local perception and personal knowledge | **Implemented but incomplete** | Many perception, remembered-need and death-knowledge contracts are local and pure. LW-02/03 bypass observation entirely for family events. |
| Decision, intentions and production revision | **Implemented but incomplete** | Decisions launch real activities; bounded production quantity revision is connected. Other general goal families and cross-goal composition are genuinely absent. |
| Movement, interruption and completion | **Implemented but incomplete; defective boundary** | Physical travel and ordinary endings work in the control, but LW-01 breaks suspended target-loss/expiry completion. |
| Resource accounting and ownership | **Implemented and connected within reviewed scope** | All-item conservation and transfer/estate tests passed. This does not prove viability or validate activity/social outcomes. |
| Production prerequisites and useful carts | **Implemented but incomplete** | Rules-115 hand-input retention has physical/staged support; six current ordinary windows have no current prerequisite activation and zero carts/trips. The missing transition is ordinary feasible activation through useful hauling. |
| Construction and home replacement | **Implemented but incomplete** | Physical sites/building and staged replacement exist. LW-01 loses an ordinary suspended build outcome; sustained ordinary collapse recovery remains unproven. |
| Household and social rhythm | **Implemented but incomplete** | Occasion admission/recovery works in its specific branch; sustained rhythm remains unproven. LW-02/03 bypass family social causality. |
| Learning and obligations | **Implemented but incomplete** | Helper learning and promise contracts passed focused tests. LW-01 skips outcome learning and promise-attempt evidence on the silent-drop path. |
| Birth, death and generational continuity | **Implemented but incomplete** | Physical birth/death, ageing, estates and households exist. Family knowledge/adoption defects and unresolved population viability prevent a connected-continuity classification. |
| Save/load and rules compatibility | **Implemented and connected within reviewed scope** | Exact current/old continuation, format round trips, IndexedDB/localStorage and rejection paths passed. No exhaustive validator fuzzing. |
| Inspector and causal history | **Implemented but incomplete** | Sampled inspection is pure and blocker history is careful. LW-01 leaves “ending not recorded”; observation→belief→later-consequence links remain open. |
| Rendering and viewer readability | **Uncertain** | Renderer/view-model code and historical rendered evidence were sampled, but this review did not inspect the live UI. No comprehensibility claim is made. |
| Long-run behaviour and performance | **Uncertain pending current measurement** | Genuine mature Large exists only at frozen rules 109 in the reviewed evidence. Current rules-115 mature Large cost, rendering and inspection remain unmeasured. |
| Verification pipeline | **Implemented and connected for reviewed machinery** | Native Windows exit codes, horizon/integrity checks, fresh output roots, source diffs and immutable continuations passed targeted review. This is not certification of every script or historical artifact. |

# C. Claims that exceed the evidence

## Decision → activity → ending is stated too universally

- `docs/DECISION_LEDGER.md:59` says, “The ledger links decision → activity → ending.” The programme register at `docs/DEPENDENCY_CHAIN_PROGRAMME.md:231` similarly describes recent decisions “with the activity each launched and how it ended.”
- The implementation and tests establish this only for activities that reach `endActivity`. LW-01 supplies two ordinary counterexamples with no ending.
- The test at `tests/decision_ledger.test.ts:20-23` validates closed entries but never asserts closure for every started activity, so its breadth does not close that gap.

**Defensible replacement wording:** “The ledger links each recorded decision to its launched activity and records the outcome whenever that activity reaches the common ending path. Activities discarded without an ending are shown as ‘ending not recorded’; eliminating those discards remains open until LW-01 is fixed.”

The current top-level capability overlay is otherwise notably careful: it labels carts, winter food, social rhythm, replacement and mature Large as incomplete or uncertain. Those cautious statements should not be rewritten as successes based on staged mechanisms or passing focused tests.

# D. Disconfirmed suspicions and counterevidence

- **The ordinary suspension defect is not the repaired rules-112 occasion defect.** Occasion recovery correctly routes invalid pauses through `endActivity`; its 11 focused tests passed. The defect is in the ordinary branch.
- **No item-accounting failure accompanied the activity losses.** All-item conservation passed in the baseline economy tests and after the ordinary scan.
- **The earlier meat-receipt save problem is corrected.** Six focused meat/validation tests passed, including positive meat delivery receipt round trips.
- **The earlier Windows runner exit-code problem is corrected.** The platform regression actually ran and passed; the wrapper retains native handles, requires horizon plus integrity, rejects reused output roots and records source diffs.
- **Persistence is stronger than the initial suspicion.** Nine save tests, 15 storage tests and 28 rules-version tests passed, including IndexedDB, localStorage fallback, quota handling and rejected invalid loads.
- **Sampled inspection is pure.** The work-inspector twin test and blocker-history tests passed. This supports purity, not complete causal content or rendered readability.
- **A full-pack ripe-crop block is not automatically fatal.** The retained rules-114 trace recovered through alternatives and later fishing. It does not establish that the block caused a later death.
- **The rules-114 forest extinction does not prove a rules-114 regression.** All 31 inhabitants died by tick 55,958 despite 18 successful hunger harvests, but this is one divergent seed without a controlled causal comparison.
- **Current cart and production limitations are disclosed, not newly discovered defects.** The rules-113 cart plan diverted hammer inputs and expired; rules-115 protects the bounded hand-tool inputs, but current ordinary windows still show zero activations and carts.
- **No current mature Large performance defect is asserted.** The retained day-45 Large measurement is rules 109; current rules-115 evidence is missing, not negative.

# E. Coverage and limits

## Examined deeply

- Repository/rules provenance and the current capability register.
- Tick and person ordering around perception, decisions, activities, conversations and lifecycle.
- Activity start, suspend, resume, end and handler cleanup; decision and promise outcome linkage.
- Birth, death, orphan adoption and household membership mutation.
- One ordinary current-rules river world for 12,000 ticks, tracking every suspended activity loss and item conservation.
- Save serialization, storage backends, rules rejection, current and old immutable continuation.
- Windows long-run process and report acceptance boundaries.

## Sampled

- World generation, time/weather/seasons, needs, pathfinding and movement.
- Production, projects, transport, construction, habitation and winter mechanisms.
- Social occasions, relationships, learning, care and local knowledge.
- Inspector/history view models and purity tests; renderer interfaces and historical rendered evidence.
- Existing reports for rules 107–115, used as leads rather than independent proof.

## Not examined or not established

- No full test-suite run was performed. Historical full-suite counts belong to their recorded revisions, not this review.
- No broad seed ensemble, matched benefit estimate or new winter/cart long run.
- No genuine current-rules mature Large generation or benchmark.
- No live rendered UI inspection, GPU measurement or viewer-comprehensibility assessment.
- No real-model inhabitant run and no exhaustive agent-protocol review.
- No exhaustive malformed-save fuzzing, every-recipe execution or proof that all runtime states validate correctly.
- Ordinary frequency of remote birth/adoption and the practical frequency of the related request-cancellation discard remain unknown.

## Verification commands

All commands ran from `C:\dev\Claude Experiment\living-world-integrate` at `b2cf812`, rules 115. Logs are in this evidence directory.

| Command | Exit | Result and limit |
|---|---:|---|
| `node node_modules/typescript/bin/tsc --noEmit` | 0 | Baseline source/test typecheck passed; empty `typecheck.log`. |
| `node node_modules/vitest/vitest.mjs run tests/meat_item_validation.test.ts tests/helper_learning.test.ts tests/longrun_runner.test.ts` | 0 | 3 files, 15 tests passed, including the Windows runner regression. |
| `node node_modules/vitest/vitest.mjs run tests/save.test.ts tests/economy.test.ts tests/v107_continuation.test.ts tests/v115_continuation.test.ts` | 0 | 4 files, 19 tests passed; all-item conservation and exact continuations. |
| `node node_modules/vitest/vitest.mjs run --config review_evidence/whole_repo_b2cf812/vitest.review.config.ts` (when only `cross_system_probes.test.ts` existed) | 0 | 4 staged probes passed: active control, two silent-drop cases and remote birth. |
| `node node_modules/vitest/vitest.mjs run --config review_evidence/whole_repo_b2cf812/vitest.review.config.ts review_evidence/whole_repo_b2cf812/family_orphan_probe.test.ts` | 0 | 1 staged orphan probe passed. |
| `node node_modules/vitest/vitest.mjs run --config review_evidence/whole_repo_b2cf812/vitest.review.config.ts review_evidence/whole_repo_b2cf812/ordinary_suspension_scan.test.ts` | 0 | Five-day current river scan passed conservation and recorded two silent losses. |
| `node node_modules/vitest/vitest.mjs run tests/decision_ledger.test.ts tests/occasion_recovery.test.ts tests/request_cancellation.test.ts tests/care_handback.test.ts tests/offcuts.test.ts tests/inspect_work_purity.test.ts tests/inspector_blocker_age.test.ts tests/lifecycle.test.ts` | 0 | 8 files, 78 tests passed; existing tests do not cover the new counterexamples. |
| `node node_modules/vitest/vitest.mjs run tests/save_storage.test.ts tests/rules_version.test.ts` | 0 | 2 files, 43 tests passed. |
| Final repeat of `node node_modules/typescript/bin/tsc --noEmit` | 2 | Failed on newly appeared, separate untracked `tests/zz_review_main_mature_large.test.ts:23` (`v` possibly null). Another `zz_review_*` file appeared during scoped checking. Neither was modified or run. |
| `node node_modules/typescript/bin/tsc --noEmit -p review_evidence/whole_repo_b2cf812/tsconfig.review.json` | 0 | Tracked source/tests/scripts plus this review's probes passed, excluding the separate `tests/zz_review_*` files. This is a scoped check, not a replacement for a clean future full typecheck. |

# F. Repair order

1. **Restore one unavoidable activity-ending boundary (LW-01).** This is first because ordinary actions already occur and their outcomes feed obligations, learning, cleanup and inspection. It is a small, high-value correctness repair with a focused regression surface.
2. **Separate family facts from personal knowledge (LW-02).** Reuse local witness/report provenance rather than adding another special-case mood or score adjustment. This establishes a reusable birth-news contract before more family behaviour depends on it.
3. **Make orphan care a physical, accepted transition (LW-03).** Build on the existing contact/care/relocation machinery. Do this after the local-knowledge rule is clear so adoption does not acquire another bespoke remote-notification path.
4. **Then resume the already-disclosed product measurements.** Ordinary cart activation/use, winter provisioning/consumption, social rhythm and home replacement need outcome evidence, not more staged-only closure claims.
5. **Only after those repairs, run the combined current-rules mature Large and rendered inspection check.** Otherwise expensive performance evidence will certify smoother but still causally incomplete behaviour.

# G. Explicit verdicts

| Question | Verdict | Justification |
|---|---|---|
| Simulation integrity within the reviewed scope | **CONTRADICTED** | LW-01 is an ordinary runtime loss of activity outcome and cleanup. Resource and save integrity passed the narrower checks, but they do not rescue activity lifecycle integrity. |
| Connected autonomous behaviour | **CONTRADICTED** | Ordinary gather/build chains break at suspended completion, and family transitions bypass observation/contact/travel. Larger cart, winter and household chains also remain incomplete. |
| Viewer-facing causal clarity | **CONTRADICTED** | Some choices cannot be followed to an outcome because no ending is recorded; family events can claim consequences without a knowable cause. Visual layout and readability were not assessed and remain unverified. |
| Long-run evidence and performance | **INSUFFICIENT EVIDENCE** | Older adverse and mature runs are useful but do not establish current rules-115 mature Large viability, cost or rendering. |
| Reliability of the verification pipeline | **SUPPORTED** within the reviewed machinery | Current targeted runner, storage, conservation, continuation and purity checks behaved as claimed. Coverage gaps remain: existing tests missed all three findings, and no full suite or broad ensemble was run. |

## Three highest-value next actions

1. **Fix and version the ordinary suspended-activity ending path**, including request-cancellation disposal, with gather/build/promise regressions and an ordinary no-silent-loss scan.
2. **Introduce provenance-based birth knowledge**, proving distant silence and later local/report-driven effects without changing biological family records.
3. **Replace global instant adoption with contacted consent and physical arrival**, preserving save continuation and an explicit unresolved state when no carer is available.
