# Meaningful connections — 28 October 2026

Successor increment (rules 40, 29 October): [remembered stores, plans and promises](STORED_MATERIAL_CONNECTIONS.md).
The record below remains the dated rules-39 evidence, including its ordinary nulls.

Implementation pass starting from `C:\dev\Claude Experiment\living-world-integrate`,
`main@4135461d167422a5693f2a4c27bc6622ec5dea7b`, rules 38. Tracked tree clean;
existing untracked evidence retained. Separate dirty `deepseek-b1` untouched. No push.
Authority: AGENTS, WORKFLOW, PRODUCT_VISION, DEVELOPMENT_POLICY, ECONOMY,
INHABITANT, SIX_STAGE_COMPLETION and STAGE_VERIFICATION_RUNBOOK; current call sites
take precedence over historical audit claims.

## Connection map before implementation

| Source event/state | Who can know | Owner and current consumer | Missing/weak link or decision | Verification |
|---|---|---|---|---|
| Hunger, cold, threat, mood | Own needs, perceived threat, personal thoughts | needs/hardship/mood → decision critical filters and moodWeight | Working; preserve survival priority | Existing needs/relief tests and new urgent-need negative |
| Seen resource / actual conversation | Witness or listener; beliefs retain source and age | perception/knowledge/news → option generators | Working; no global information bus needed | Knowledge and inhabitant locality tests |
| Plan shortages and promised goods | Plan owner and actual parties | intent/social/economy → reservations, outstandingForPlan, execution | Six-stage reconsideration/partial delivery already implemented | Existing plan/reservation regressions |
| Actual gift / kept or broken promise | Personal relationship; direct request receipts where co-present | social → adjustRel → bounded, drifting trust; food/tool lending/civic confidence already read it | **Selected:** personal tool-material asks in options_social choose first feasible visible candidate and ignore that trust | Actual request → transfer → trust → later offered helper → transfer/craft; ablation, refusals, save/replay |
| Side-by-side work | Nearby perceived worker | social.bondWorkers → relationships → crews/social choices | Already connected; do not duplicate work rewards | Current bondWorkers, crews and relationship call sites |
| Completed work / proficiency / techniques | Actual participant or taught learner | facilities/development/techniques/trade → capacity and work choices | Existing outcome and teaching consumers; no justified new reward | Existing work/technique contracts |
| Contribution, witnessed civic outcome, support | Contributor, local witness, actual recruit | townships/civic_decision/political_alignment → coordinator confidence, support, access | Already connected; ordinary storehouse use verified in prior programme | Preserve civic completion and accounting tests |
| Finished construction / fulfilled aspiration | Nearby awake contributor; personal goal owner | achievement/life → mood and next aspiration/goalNudge | Rules 38 already implement aftermath; do not repeat it | Immutable v38 continuation and achievement tests |
| Completed place and stock | Observed or communicated building belief | knowledge/production/options_work → real collect/deposit/operate | Ordinary storehouse chain already observed; no supply automation | Existing civic ordinary evidence; new ordinary observation |

Only one connection selected. The other candidates already have consumers; adding
parallel rewards would duplicate them. Crew work preference's direct activity lookup
and global goal-progress readers merit separate locality audits; neither is changed here.

## Pre-implementation contract

Rules 39 will choose the most personally trusted **otherwise eligible** helper for a
tool plan's missing material, retaining sight order on equal trust. The existing
asker-owned trust is already bounded to [-100,100] and drifts towards neutral through
relations.ts. No additional trust, receipt, reward, utility bonus or persistence field.
Only the helper-selection loop changes; actual supplies, capacity, cooldowns, known
reservations, urgent needs, request acceptance and physical execution retain control.
The offered action explains the personal trust used; it never guarantees cooperation.
Rules 38 and earlier, and `rich-no-project-helper-choice`, retain first-feasible choice.

Before the successor implementation, capture the full serialized v38 river/Normal
continuation at tick 5280 through 9600, including both uninterrupted and restored paths.
Never re-record it to fix a regression.

Prediction: from the same staged state, after an ordinary helpful exchange makes Cora
more trusted than Ben, the next feasible project ask targets Cora with the connection
enabled and Ben with it disabled. Goods still transfer through social/economy execution;
refusal, interrupted travel and urgent needs can prevent success. No population benefit
is predicted or claimed. Equal trust, unseen helpers, occupied helpers and reserved
goods must not gain special eligibility.

Ordinary observation pre-registration: fresh current-rule Normal worlds, seeds meadow,
river and forest, 6 days each, immigration off, no staged resources/relationships/actions.
Observe every actual project-request selection and compare its eligible offer with the
isolated switch disabled at that same decision, read-only. Record changed partners,
actual requests/outcomes and conservation. This measures opportunities/occurrence only,
not aggregate benefit. Budget 3 minutes per seed, stop at day 6 or a failed invariant;
preserve zero and adverse counts. No parameter retuning or seed substitution. If broader
aggregate measurement becomes justified, preregister control/nudge/ablation separately.

## Implementation and evidence

**VERIFIED mechanism:** an actual offered gift improves the receiver's existing
personal trust; that trust changes the later offered material-request recipient;
ordinary conversation transfers the stone; ordinary crafting consumes the material;
the saved completed plan names the person who supplied it. Only recipient selection
is new. Gifts, trust, request responses, crafting and contribution history already
existed and were reused. This is one new connection composing with existing ones.

Ownership and files:

- `src/sim/options_social.ts`: order only the tool-plan material request candidates
  by the asker's personal trust; stable ties retain the previous visible order.
  Existing candidate filters, distance cost and execution authority remain in place.
- `src/sim/optutil.ts`, `decision.ts`: optional derived `selectionReason`, reused by
  the existing decision explanation. It is not a score modifier or persistent schema.
- `src/sim/rulesversion.ts`: current **39**, with historical rules unchanged.
- `scripts/lab/lab.ts`: `rich-no-project-helper-choice` disables only this selection
  and its explanation; install/restore works and has no effect before rules 39.
- `src/agent/observe.ts`, `protocol.ts`, `src/ui/inhabit.ts`: observation **12**,
  protocols **21/22**. The option and actual manual button explain the personal trust
  without promising success. Observation 11 and protocols 19/20 retain their wording
  and mapping; earlier protocol mappings are retained too.

Cost is one stable sort of the already local candidate list per missing tool material,
O(k log k), with transient O(k) storage. There is no new per-person stored state,
remote lookup, random draw, trust increment, event subscription or reward loop.
Existing relationship limits and drift bound the input. This does not establish a
Large/Huge performance benchmark.

### Contract and negative evidence

`tests/project_helpers.test.ts` has 11 tests. The original failing contract selected
Ben instead of Cora after setting only the asker's trust at the decision boundary
(`project-helpers-red.log`). Separate execution tests earn that trust through an
offered physical gift, with no assigned success or trust increase. The absent person
does not learn the interaction. Reprocessing the completed conversation/request
does not change serialized state.

Coverage includes the actual fulfilled request, material delivery, completed axe
plan, save/load after the gift, full serialized transcript replay, ledger balance,
interrupted gift without credit, trusted helper declining because of two live
obligations/reserved stock, helper leaving after selection, unseen/busy/asleep helpers,
recent asks, communicated own work, urgent thirst, already-covered requests, equal
trust ordering, existing trust drift, repeated pure observation, legacy rules and
isolated ablation restore. Tests use explicit staged setups for negative conditions;
they do not claim those conditions arose spontaneously.

### Staged deterministic comparison and restricted inhabitant

Final evidence: `inhabitant_evidence/project-helpers-r39-final/`.
`scripts/project_helpers_inhabitant.ts` records before/after restricted observations,
the initial gift transfer, start and comparison checkpoints, all decisions, final
saves and replays. Supplies, generous helpers, positions, initial skill and paused
bystanders are **staged**. The gift, ask, response, transfer and craft are real engine
actions. The scripted receiver sees only the restricted observation and selects
offered actions; this is not external-model intelligence evidence.

| Same comparison checkpoint | Enabled | Only helper selection disabled |
|---|---|---|
| Offered / executed stone request | Cora | Ben |
| Ordinary stone transfer to Ada | 1, at tick 765 | 1, at tick 771 |
| Completed axe | 1, tick 884 | 1, tick 897 |
| Saved completed-plan credit | Cora brought 1 stone | Ben brought 1 stone |
| Final / replay hash | `dc6906a2` | `24155980` |
| Full serialized replay equality / conservation | PASS / PASS | PASS / PASS |

The longer restricted chain from immediately after the helpful gift has final and
replay hash `57593a1a`, with full serialized equality. Both arms succeed: the demonstrated
effect is whom Ada cooperates with and credits, not an increase in completion rate.
The disabled arm uses the same offered-action policy and removes only this connection.

### Ordinary-world observations

No person, relationship, supply, intention or cooperation was assigned. All three
pre-registered six-day Normal runs completed, source manifests stayed unchanged,
and daily/final conservation passed. The observation counterfactual regenerates
options with only the switch disabled at each actual project-request activity start;
it checks serialization is unchanged. It is **not** a separately evolved ablation
population and cannot establish a population effect.

| Seed | Actual project-ask activity starts | Different recipient with switch off | Requests created | Delivered project material | Final hash |
|---|---:|---:|---:|---:|---|
| meadow | 0 | 0 | 0 | 0 | `20abb63d` |
| river | 2 | 1 | 1 declined | 0 | `a1c11972` |
| forest | 4 | 1 | 1 declined | 0 | `11fb4353` |

Final directories: `inhabitant_evidence/project-helpers-{meadow,river,forest}-final/`.
Each took 8–9 seconds, well within the 180-second budget. Requests require actual
contact, so activity starts and created requests are deliberately separate counts.
Other food/tool transfers in `choices.json` are not attributed to this connection.

River's changed choice is Mira asking Emre at tick 1952, with personal trust 78.8
and two already-recorded co-work experiences (ticks 44 and 744). Existing starting
relationships also contribute; this run does not isolate how much those experiences
changed the preference. Forest's changed choice has no prior relationship-history
entry, so it is evidence of a trust-based choice, not earned-help attribution.

**UNKNOWN:** long-run frequency, improved cooperation/completion/survival, population
benefit, or whether this outweighs longer travel to a trusted person. No control/nudge
ensemble or parameter retuning was performed. No broad emergence claim is made.

### Fresh review and preserved failures

Reviewed after implementation: the new link reads only the asker's relationship
among existing visible candidates, awards nothing, cannot duplicate help credit,
does not relax urgent-need/eligibility/reservation/execution rules, and is version
gated. Save/replay, observer purity and visible explanations have direct evidence.
No unresolved defect in the selected link was found; the aggregate-benefit and
scale-performance claims remain untested.

Concrete findings fixed once, with relevant verification:

1. The restricted observation explained trust but the actual manual button hid it.
   Added the same derived explanation to that button and checked it in the rendered app.
2. The ordinary recorder retained a live relationship-history array, allowing later
   events to appear in an earlier record. It now copies each entry. Repeated exactly
   the same seeds/durations in fresh `-final` directories: counts and hashes identical.
3. Live inhabitant rewinds discard developer hooks. The staged transfer recorder now
   matches both ends of inventory movement on committed ticks, backed by the ordinary
   request record, craft outcome and conservation, instead of claiming missing hook
   callbacks meant no movement.
4. The first refusal fixture expected decline with one obligation. The existing engine
   legitimately offered a promise. The explicit conflicting-obligations case now has
   two live commitments (the existing capacity limit); no engine rule was changed.
5. The full suite found one current-observation assertion still expecting 11. Updated
   it to the deliberate current version 12; historical assertions and mappings retained.

Earlier `project-helpers-r39-first`, `project-helpers-r39-verified`, and ordinary
directories without `-final` are preserved as superseded development evidence. Use
the final directories for claims. Initial failures remain in local logs; no historical
expected JSON, acceptance threshold, owner policy or unrelated source was rewritten.

### Continuity and verification record

Commit `13b0241` captured the **pre-successor** rules-38 full serialized reference
from `4135461`: River/Normal, no immigration, save tick 5280, continue to 9600.
Saved SHA256 `ac12524c58c723b84dae9abc59a1c5c42a016075b9b2601f94b458d6dd749a05`;
both uninterrupted/continued SHA256
`7b8d5eb7390c49b85c25e4543c491ed6124b9fd8b97d24b7af546ce8b05280e4`.
The reference has not been regenerated after the successor.

The first full run passed 1,305 tests and exposed only the current-observation
assertion above. After that correction, the final frozen simulation-source run
(`npx vitest run --maxWorkers=4`) passed **1,306 tests in 171 files**, 204.61 seconds,
including all historical continuations/goldens and the new v38 reference. After adding
explicit current-rule uninterrupted-versus-loaded equality and repeated-input bounds
assertions (no production changes), the final focused run passed **86 tests in 8 files**.
The affected observation/version tests separately passed 7/7. `npm run typecheck`,
`npm run build`, and `git diff --check` passed. Local logs are
`project-helpers-full-final.log`, `project-helpers-observation-final.log`, and
`project-helpers-focused-complete.log`, `project-helpers-build.log`. Existing Vite native-config extension warnings
and a timeout-overflow warning in the broader tests were retained, not suppressed.

### Actual rendered manual panel

The verification HTML loads the recorded comparison checkpoint and mounts the real
Game, InhabitDriver, renderer and UI. This is a **staged** scenario, not a natural
world. The completed earlier berry gift is in Ada's own memory/observation before
the manual choices; the manual journey covers the request and crafting decisions.
No hidden state was read to choose those actions.

The button says: “I trust Cora; they may still need it themselves.” Clicked the
offered **Ask Cora for stone**, waited until “success: received 1 stone”, then clicked
the offered **Make an axe**, waited until “success: done”. The inspector's completed
plan names Cora's contribution. Two manual choices, zero engine fallback/rejection.
The standard **Save transcript** button produced the saved panel transcript.

A second identical two-choice journey added a verification-only export button so
the exact authoritative browser state could be compared too, after the choices.
`scripts/project_helpers_manual_replay.ts` replayed that bundle: tick **885**, browser
and replay hash **`36b6d3c1`**, **full serialized equality**, one fulfilled stone request,
one completed axe, both recorded successful outcomes and conservation PASS.
This is manual/scripted offered-action evidence; no external language model was used.

- Original screenshots and standard panel transcript: `inhabitant_evidence/project-helpers-manual-final/`.
  `02-trust-choice.png`, `04-delivery.png`, `06-finished-axe.png` show preference,
  actual delivery and completed work respectively.
- Second journey screenshots/panel text: `inhabitant_evidence/project-helpers-manual-bundle-ui/`.
- Exact replay bundle, transcript, both full final saves and result:
  `inhabitant_evidence/project-helpers-manual-replay/report.json` and adjacent files.

Reproduction commands and the saved-checkpoint requirement are in
[STAGE_VERIFICATION_RUNBOOK.md](STAGE_VERIFICATION_RUNBOOK.md).

Final verification-gate verdict: **TURN_INTEGRATION_VERIFIED**, limited to the
selected connection, compatibility and described rendered experience. All required
checks for that scope ran; no outstanding blocker. Large/Huge performance, a broad
control/nudge ensemble and external-model intelligence are not verified or claimed.
No promotion to a population-level effectiveness claim is justified by this evidence.
Generated evidence and logs remain local; the focused commit contains implementation,
tests, reproducible verification scripts and this record. The separate deepseek work
and pre-existing untracked evidence are preserved. No push.
