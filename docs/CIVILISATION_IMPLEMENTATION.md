# Civilisation implementation register

**Current audit refresh, 2026-10-25:** published main `d84e5ea`, rules 28.
See [CIVILISATION_AUDIT.md](CIVILISATION_AUDIT.md) for the updated capability
matrix, fresh bounded natural evidence and recommended next slice. The full
suite now passes 1,200 tests in 144 files. Earlier branch, version and queue
statements below are dated history; they do not supersede this checkpoint.

Owner programme: 2026-10-24. Audit source: `claude/civilisation-phase1` at `3f6ec66`.
This is the continuation record; the audit remains dated evidence, not current acceptance.

## Pending layout claims and recovery — 2026-10-26

Owner authorised the identified layout repair. Rules 30 adds execution-boundary
claims derived from accepted active activities: one home layout per household,
non-overlapping footprints with the normal one-tile gap, and deterministic release
on cancellation, death, expiry, household change or suspension. Resume must reacquire.
The final access check can wait at most 90 ticks for a footprint occupant, under the
original activity expiry. It never places a site under someone or relaxes access.
Architecture and compatibility: `LAYOUT_CLAIMS.md`. No material or site-cap retuning.

Before changing production code, recorded complete serialized rules-29 river
continuation (save 5280, continue 9600) in the new immutable v29 reference. It passes
unchanged under the repair. Final relevant tests: 81 tests / eight files pass;
an additional observer regression plus the layout set pass 18/18. Build/typecheck
and diff checks pass. Full suite was attempted alone with four workers under an
explicit 175-second cloud budget; it timed out without a summary and is **not passed**.
Desktop full-suite instructions are retained with the evidence; no current full-suite
acceptance claim is made. Earlier 1207-test results belong to rules 29.

Repeated the same preselected Briar household on river, Normal/28, no arrivals,
four days. Corrected read-only runner: 164 pure observations, 41 exact unobserved
twin checkpoints, 31 exact save-continuation checkpoints from the day-one fallback,
9617 claim-invariant checks, no conflicting accepted layouts, ledger/tools pass,
zero failures and 28 survivors. Six real deliveries supply eight wood and four stone.
Mira creates site #2886 (44,36) at tick 3623; hut #3528 completes at 5516; first
physical entry is observed at 5929. All four household members enter by observed
tick 6154. This is one seed, not a general housing-benefit result.

The first v30 measurement exposed an instrumentation mistake: `generateOptions`
argument three collects options; observer mode is argument four. A genuine decision
planner can restamp promise blockers. Corrected both verification runners, added a
sensitive blocked-promise regression, and repeated into a fresh output directory.
The game inspector already uses observer mode; no production promise rule changed.
The invalid run is explicitly labelled and preserved, not counted as pure evidence.

Accepted evidence: `home_evidence/2026-10-26-layout-v30-observer/README.md`.
The earlier v29 stalled journey remains separate. Source code has been published on
`nova/layout-claims-recovery`; integration status is recorded in the final delivery.

## Event-history continuation repair — 2026-10-26

On isolated branch `nova/bounded-verification-2026-10-26`, rules 29 snapshots event
participant IDs. A natural rules-28 two-day trace exposed crew formation history
changing after a later join only in the uninterrupted world: `addEvent` retained
the crew's mutable members array, while JSON loading broke that alias. `pickStory`
reads those IDs, so the repair is versioned. Rules 28 and earlier retain their
recorded behaviour; no migration, save relabelling or historical-reference rewrite.

The new rules-28 full-state reference was recorded before the production change.
Two new history regressions failed on original code, then all 39 focused checks
passed. Repeated rules-29 meadow/Normal/28-founder autonomous two-day run: 111 pure
observations, 21 exact unobserved-twin checkpoints, ten exact post-load continuation
checkpoints, balanced ledgers/tool registries, zero failures, 28 survivors. Pavel's
activity counts match the original run. Separate scripted-controller strict replay
passes 4/4 with exhaustive saved-state equality. Build/typecheck pass.
Full suite: **1,207 tests / 146 files passed**, including historical references,
exit 0. The duplicate two-worker attempt was interrupted and adds no result.

Evidence and full-suite result: `verification_evidence/2026-10-26-fixed-v29/`;
original failed run and counterexample saves: `verification_evidence/2026-10-26/`.
No long-run civilisation measurement or rendered usability claim is added. The
bounded repair does not restart the stopped ensemble or reopen the completed F1-F5 queue.
Owner authorised integration on 2026-10-26: main was fast-forwarded from `d84e5ea`
to `810d32f`, with no intervening changes or conflicts. The already-verified tree
was integrated unchanged; no repeated full-suite run was needed for that ref move.

## Natural household shelter journey — 2026-10-26

After merging rules 29, followed the preselected Briar household #1103 on river,
Normal, arrivals off, four days. Selection was fixed before stepping: first household
by ID with two adults and no solid home. Mira #1106 and Emre #1107, with children
Viktor #1108 and Theo #1109, started and ended in lean-to #1105.

Both adults genuinely selected a hut: activity starts 5307 and 5366, same footprint
(47,37), two by two. Layout failed at 5406 and 5409: the footprint would obstruct
access. The first captured refusal has Ivy #1137 physically in that footprint.
An offline function-only counterfactual on a fresh saved copy confirms that excluding
that occupant changes the access check from refusal to acceptance. No person was
removed, commanded or moved in the natural run. The household never created a home
site, adopted a shelter-material plan, delivered to its own site, built or moved in.
This is an explained stalled journey, not a successful construction demonstration.

At tick 9600, four other unfinished huts fill the four-open-site allowance. Their
actual required-minus-delivered-minus-used totals are eight wood and fourteen stone
short; raw status strings are not treated as current material accounting. The
household's recorded decisions also expose food and thirst gates. One other household
has a completed hut; this observation is not a general housing-success estimate.

Detailed trace: 164 pure personal inspections, 41 exact unobserved-twin checkpoints,
31 exact save-continuation checkpoints from the day-one fallback, ledger/tool checks
all pass; zero failures, all 28 residents alive. A first pass and detailed repeat have
identical final household state. No household site appeared, so there was no mid-site
save or later construction/occupation claim. Typecheck and diff checks pass.

Evidence: `home_evidence/2026-10-26-journey-detailed/README.md`; first pass retained in
`home_evidence/2026-10-26-journey/`. Only observer scripts, diagnostics and records
were added; no behaviour, thresholds, safety or rules version changed. Highest-value
next verification: a bounded recovery contract after transient footprint occupation,
with an alternative safe location and ordinary construction-cap/need constraints.

## Household follow-up — 2026-10-25

The owner authorised household/settlement continuation after the delivered F1-F5 queue.
First bounded slice: home-plan interruption readability, based on main e3e1a93 in
`codex/household-continuity`, worktree
`C:/Users/RJLoc/.codex/worktrees/household-continuity/living-world`.

- **Implemented and verified in focused contracts/rendered app:** real conversation
  suspension is shown as paused; resumption retains the delivery; actual hauled units
  and the site's remembered outstanding materials are distinct. Refusals, urgent
  needs, unknown causes and failed plans remain honest. Existing plan continuity itself
  needed no behavioural repair. Browser review also repaired a false stall label on
  resumption; the label now requires the travel engine's recorded stall counter.
- **Rules/compatibility:** presentation only, current 27 unchanged, protocols 9/10 and
  observation 6 unchanged. No new saved state, RNG, rules number or historical reference.
  Unmerged leisure 28 remains separate and its number remains occupied. Remote refresh
  during this slice found it advanced from 1d2c54b to 54a45d9 (merged main's inhabitant
  fixes and adjusted provenance tests); it was preserved, not integrated or approved here.
- **Evidence:** HOUSEHOLD_HOME.md follow-up and `home_evidence/continuity/README.md`.
  Final full suite: 1193 tests / 142 files, 112.21 seconds. Focused 66 / 3 files;
  typecheck/build/diff-check passed, historical golden fingerprints unchanged. Real
  accepted conversation, resumed delivery and contribution views inspected in Edge.
  Full serialized save continuation/purity passed. Implementation **d3a4378** was
  fast-forward integrated into main and pushed normally; branch was also pushed.
  This follow-up record adds no simulation changes. The two protected main-worktree
  probes remain untouched; the household worktree has no unfinished source changes.
- **Next executable step:** trace existing household helper requests, fulfilled/broken
  commitments, trust and grievance weights through actual accepted/refused choices;
  use a paired prior-interaction contract before adding any weight. Recheck current
  authority and leisure integration/version provenance first. Do not rebuild F1-F5 or
  restart the stopped large ensemble. Long-run civilisation claims remain deferred.

## Owner sequencing update — 2026-10-25

The owner stopped the full validation batch and explicitly authorised a smaller run,
then proceeding to queued inhabitant fixes. This supersedes the earlier prerequisite
below; it does not establish long-run civilisation completion.

Short run source b402f3d, rules 26, four seeds (meadow/river/fern/aspen): A/C/DEF two
days, GH four days; controls plus both nudges and the original ablations. All configured
outputs completed. One-day meadow benchmarks at 28/100/250 people passed all recorded
ledger/tool checks; no invariant failures. Costs: 0.54/2.59/10.42 ms per tick.
Started 09:44:49 and combined report completed 09:51:09 Brisbane time. Four seeds and
short windows cannot support aggregate benefit or natural multigeneration claims.
D12/A long-term benefit, natural C-H emergence and mature-world cost remain deferred.
Original large-run partial files are preserved, marked interrupted, never accepted.

Evidence: C:/dev/Claude Experiment/living-world-validation-v26/civ_validation_small_v26/report.txt;
manifest.json alongside it; SMALL_VALIDATION_SCOPE.md in that checkout. The simulation
source was unchanged; the reduced launcher and its hash are preserved there.

Active follow-up: branch codex/inhabitant-fixes in
C:/Users/RJLoc/.codex/worktrees/inhabitant-fixes/living-world. Ordered queue is F1, F3,
F2, F4, F5. All five are now fixed and verified; see INHABITANT_FIXES.md.
Delivered behavioural/presentation code through 18285b1 is integrated and pushed to main.
Current product rules remain 27; current inhabitant protocols are 9/10 (observation 6).
Version 28 belongs to the separate unmerged leisure candidate; do not reuse it.
The full civilisation measurements above remain deferred, not silently completed.
Next authorised recommendation: continue household/settlement work after this queue report.

## Historical continuation snapshot — after version 26 (superseded sequencing above)

## Version 28 note (varied spare time, branch `claude/leisure-rhythm-v28`)

Rules 28 is a separate, small behavioural change (spare-time places, `src/sim/leisure.ts`) on main after rules 27 (night wait). It was first
made as 27 off `bc9e3c8`, found to collide with main's own 27, and renumbered to 28. Rules-27 continuation pinned at the commit before it
(`tests/v27_continuation.expected.json`). Ensemble measurement unrun; see DEVELOPMENT_POLICY.md and EMERGENCE.md.


- Current product rules **26**: spatial finite-deposit geology after operational retention and indexed history after transmitted household supper practice after persistent political alignment after personally informed exchange journeys (22), following v21 settlement production and resource-flow observations,
  following relocation/founding (20, integrated at a7473c4) and construction access (19). Implementation is on `codex/civilisation-programme` in
  `C:/Users/RJLoc/.codex/worktrees/civilisation-programme/living-world`. Read Git HEAD
  for the commit containing this snapshot. Immutable v25 reference: **5ba25f9**; v24 reference: **7444c80**; v23 reference: **0878bf4**; v22 reference: **f6496e5**; v21 reference: **ee822f3**; v20 reference: **05cf09e**; v19 reference: **801123e**.
- Completed scope: S0/S1; S2 history, deduplicated social consequences, local death news,
  birth counter, competing project coordinators and persistent alignment factions; physical-market prerequisite;
  S5 novice child proficiency, one held technique with instruction and one transmitted household practice; general D3;
  **S3 first complete relocation/founding slice** (contract in RELOCATION.md); S4a actual
  production/flow observations, S4b physical exchange journeys and S4c spatial geology
  (contract in ECONOMY.md); S6 bounded operational retention and indexed history.
- Relocation checks: `npm test` **1108 tests / 121 files**; `npm run typecheck`;
  `npm run build`; `npx --no-install vite-node scripts/golden.ts` (all historical values
  unchanged); 14 relocation contracts; focused township/housing/rules/v19 continuation
  checks; `node scripts/browser/relocation_check.mjs` **21 passing rendered checks**.
  Travel and settlement screenshots inspected. No human usability or aggregate benefit
  claim. New evidence is in `civic_evidence/relocation-page/`, including labelled scenes.
- Natural smoke: meadow/Normal/28, four days, control + nudge + no-relocation: no sustained
  hardship or proposals; conserved goods and 28 survivors in each. This is not an ensemble.
- Protected original/candidate work and main-worktree untracked `_find_moments_rich.ts`
  and `_warmth_probe2.ts` remain untouched. Never rewrite v1-v25 references or silently
  reinterpret ambiguous candidate v8/v9 saves. No ensemble is running.
- Vite for rendered checks: port 5291, served from this worktree. Verify liveness if reused.

**Next executable task: run and interpret the pinned validation workloads.** Measurement
support is implemented at **b402f3d44bf3919b82982b6c66d37cd8d0e74873**. Exact Windows
preparation, detached launch, estimates, resume and the one result file are in
[CIVILISATION_VALIDATION.md](CIVILISATION_VALIDATION.md). No long ensemble is running.
The full programme remains open pending D12/A, natural C-H and mature-world measurements.
B/F controlled causal demonstrations exist; they are not natural emergence claims.
Keep F1-F5 queued until the required programme verification is satisfied. Any further
behaviour change needs a v26 reference and fresh generation (27 is next candidate;
recheck concurrent work). Do not spend another session rebuilding delivered mechanisms.

Current verification classification: coherent mechanisms, contracts, historical
compatibility and representative rendered scenes verified; aggregate welfare,
long-run persistence and natural multigeneration emergence unverified. Latest executable
source is b402f3d; this record's later commit is documentation only. The implementation
worktree will be clean after this handoff commit. Main retains only the two unrelated
untracked probes listed above. No source work is intentionally left uncommitted.

First recommended read: `Get-Content docs/CIVILISATION_VALIDATION.md` in the civilisation
worktree. If a validation run has been launched, read its manifest, process state and
`civ_validation_v26/report.txt` before doing anything else. Never use file mtime as the
liveness test. The validation checkout is a proposed separate detached directory, not
yet created by this session.

Paste-ready continuation:
> Continue Living World from docs/CIVILISATION_IMPLEMENTATION.md and
> docs/CIVILISATION_VALIDATION.md. Executable checkpoint b402f3d, current rules 26,
> branch codex/civilisation-programme, protected original/candidate/audit work unchanged.
> Implementation and browser contracts are delivered through geology and retention.
> Check whether pinned validation runs exist; read exact results, preserve failures and
> accept valid nulls. Do not claim an unrun ensemble or natural generation. Complete
> required programme verification, then implement the queued inhabitant fixes in order
> F1, F3, F2, F4, F5, including real conversation interruption, manual browser session,
> transcript/replay and screenshots. Never rewrite historical references. After those
> fixes are delivered, stop/report and recommend household and settlement continuation.

S3 limits: unanimous whole-household agreement; no forced split, automatic organiser
succession, rescue or return expedition. Separation prevents founding, urgent needs can
interrupt, known deadlines permit failure. Old property remains owned. Natural migration
frequency/benefit remains unmeasured. The full programme is still incomplete: enduring
natural specialisation/exchange/faction/practice evidence; D12/A and natural C-H
measurement; mature-world retention/performance. Long ensembles still follow dispatcher/detached-launch policy.

## Owner queued priority after this programme

Owner instruction, 2026-10-24: finish the current civilisation implementation programme
and its required verification first, then address the five inhabitant audit findings
before unrelated new features. Do not interrupt or truncate this programme for this queue.

The committed [ordered queue and acceptance criteria](https://github.com/lochheadr92-creator/living-world/blob/030d62d/docs/audits/2026-10-24-odette/NEXT_PRIORITIES.md)
are: F1 shelter timeout after conversation; F3 ambiguous duplicate choice keys;
F2 missing crafting-block explanation; F4 stale post-conversation summary; F5 mixed
time labels. Status: queued, not started. Reproduce against the finished current
implementation before changing it; the original evidence is from version 13, not a
claim about the completed programme. Preserve historical save/replay semantics and
record current evidence if implementation work has already resolved a finding.

## Authority and reconciliation

Starting checkout `359bce9` is retired wolf defence. Local main `4ad23f1` and remote main
`3d93180` diverged from `287c12b`. Work: `codex/civilisation-programme` in
`C:/Users/RJLoc/.codex/worktrees/civilisation-programme/living-world`.
Untracked files in the original and home-habitation worktrees were left untouched.
WORKFLOW.md permits direct verified integration, no mandatory PR.

Local main owns ore search (8), warmth/single-adult homes (9), smithy fuel (10).
Remote/candidate used 8 for courier recovery and 9 for store eating. Those fixes are
reapplied at **11**; no candidate save is relabelled. Save envelopes now identify the
local-main lineage. Untagged 8/9 saves are ambiguous and rejected without modifying
originals. Open these with their original revision. Earlier continuations remain
unchanged; candidate reference values are retained as `candidate-v*-continuation.json`
and their executable sources remain in Git. Version-10 reference was recorded first.

## Execution map

Stages: S0 reconciliation; S1 township/shared storehouse; S2 history/social consequences/
politics; S3 relocation and route safety; S4 production differences/trade; S5 knowledge/
generations; S6 long-run retention/performance. Status means evidence, not aspiration.

| Audit item | Current source finding / implementation | Stage; acceptance | Status |
|---|---|---|---|
| Roadmap 1 / D1 / A1 eating | Candidate full-pack meal imported at 11, ordinary consumption ledger | S0; table_eating tests, conservation, continuation | verified |
| Roadmap 2 / D2 / A9 observer | Candidate observer flags + life-event read guard imported | S0; purity + full state checks | verified |
| Roadmap 3 / A9 typed history, household/relationship views | Household/project views plus relationship history and bounded known request receipts | S1/S2 panels, full state purity, typed links; missing causes labelled | verified |
| Roadmap 4 / B | B fixture measured at v12 and v13; one prior promise changes willingness and one v13 actual transfer | S2; 9 contexts, control + 2 nudges; see evidence below | verified: controlled mechanism only |
| Roadmap 5 / D5 | Local-main 9 already allows one adult to lay out hut | S0 preserve; existing housing contracts | implemented |
| Roadmap 6 / A3 / D8 | Duplicate direct/reputation and hearsay/scalar effects reproduced and removed at 13 | S2; direct/told/expiry/legacy contracts and B | verified |
| Roadmap 7 / A6 / D | V20 co-present household agreement, physical packing/travel/shelter and explicit founding | S3; 14 contracts, mid-travel save equality, 21 rendered checks; natural smoke null | verified: bounded mechanism; natural migration/benefit unresolved |
| Roadmap 8 / A2 | Persistent township membership now saved at 12; v21 bounded actual production/flow observations | S1 membership; S4a action-derived statistics and nine rendered checks | verified: bounded observations; wider specialisation evidence unresolved |
| Roadmap 9 / A7 / G | V18 charcoal technique held by people, voluntary timed instruction, provenance and loss | S5; contact/time, real kiln use, interrupted/save/purity contracts and staged G | verified: one technique |
| Roadmap 10 / A5 / F | V15 rival coordinators; v23 persistent accepted choices and derived factions affect later support | S2 real conversation counterfactual, mandate, death/departure/purity/save/browser | verified: bounded political mechanism; natural F ensemble unresolved |
| A1 other survival/cooperation capabilities | Existing needs/gathering/food/reserves/habitation/defence/requests | Preserve and regression test; aggregate survival separate | implemented |
| A4 economy / E | V22 personally heard lead, physical exchange journey, existing barter and receipt history | S4b contracts, rendered journey/swap/return/failure; one-day control/nudge/ablation null | implemented and verified first slice; natural exchange/dependence unresolved |
| A6 environment / C | V26 seeded spatial finite-mineral quantities; source positions/food/knowledge unchanged; v21 actual production views | S4; generation/save/conservation contracts, rendered quantities, two-day control/nudge/ablation null for production effect | verified local differences; sustained causal C unresolved |
| A8 generations / H | V24 sharing-supper practice has personal holders, meal contact, provenance and later invitation effect | S5; eight contracts, mid-meal continuation and rendered history; natural generation timing unchanged | verified bounded transmission; natural H unresolved |
| A9 replay/AI | Existing seeded stepping, replay, legal-option model boundary | Every stage continuation/save/load/purity; preserve seam | implemented |
| D3 route blocking | V18 private site reproduced over a living occupant; v19 extends access protection to all new footprints | S3 prerequisite; corridor, door, delayed occupant, upgrade and mid-layout continuation | verified |
| D4 death news | Confirmed global mood/need/partner notification; replaced at 14 with witness, grave or co-present typed news | S2; isolated bereaved, indoor/sleep, repeated story, mid-journey continuation | verified |
| D6 births | Confirmed regex count; v14 lifetime counter incremented at actual birth, legacy scope labelled | S2 prerequisite; rollover/death/save fixtures | verified |
| D7 market | V15 historical attendance enables remote trades; v16 validates physical venue/contact and local knowledge | S4 prerequisite; rejection, conserved barter, mid-walk save and rendered arrival | verified |
| D9 passive decay | Accepted observation, no demonstrated defect | No change unless new evidence | not applicable: accepted |
| D10 historical growth | V25 bounds cosmetic marks and expired pair deadlines; historical lookup indexed; graves spatially bounded; meaningful archives/relations retained intentionally | S6; five contracts, full continuation, synthetic lookup and browser history; SCALING retention policy | verified bounded repair; total causal history still grows, mature-world cost unresolved |
| D11 newborn skills | Confirmed same adult generator at birth; v17 starts newborns at 0.20 and age-scales younger entrants | S5 prerequisite; real birth, work gains, save/load, historical reference and rendered inspector | verified |
| D12 / A aggregate reserve/shelter benefit | Historical null/mixed evidence is not failure of mechanism | S6; town paired controls/nudges/ablations, accept null | unresolved |
| B dependency map | Migration is not required for organisation within a settlement | Owner programme supersedes audit ordering; S1 before S3 | superseded |
| A9 performance | V16 and current v19 one-day 28/100/250 measurements recorded below; mature-world cost still unmeasured | S6; startup profiles verified, long-run retention unresolved | verified: bounded startup only |
| H docs: CLAUDE rules summary | Current civilisation section names current generation and reconciliation | S0-S2 agent guidance corrected | verified |
| H docs: README/ECONOMY population, animals, markets | Corrected obsolete one-settlement/one-species/no-market claims from current source; no purposeful intertown trade claimed | S4 market prerequisite | verified |
| H docs: RICH_WORLD traditionsTick, fish/dry spell | Audit leads, no behavioural repair inferred | S5 | unresolved |
| H docs: AUTONOMY R5/R6 | Source already has trust/debt/heard; obsolete absence claims corrected | S2 | verified |
| H docs: INHABITANT missing AGENTS | Old AGENTS absence statement marked superseded | S2 | verified |
| H docs: midwinter calendar vs inherited tradition | Calendar is not transmission | S5 | unresolved |
| H docs: grievance side-by-side easing | No side-by-side easing call; unsupported module comment corrected, no new effect invented | S2 | verified |
| H dead-code list | No programme dependency established | No unrelated cleanup | not applicable |

## Experiment contracts (not results)

A: town household survival; paired current/control/nudge and reserve/shelter ablations;
alive, housed, food shortage; null is valid. B: same saved interpersonal state with one
broken versus kept promise; willingness, ranked options, accepted action. C: same seeds
with measured local opportunity contrasts; sustained per-settlement production/flows.
D: locally perceived hardship versus matched control/nudge; preparation, departures,
arrivals, failed moves. E: complementary known resources versus control/nudge; physical
cross-settlement quantities and recurring counterparties. F: matched organiser histories
of actual completed/failed projects; later voluntary support and choices. G: one technique
holder with/without contact; transmission time, provenance, loss. H: naturally timed
multi-generation runs with/without transmission; holder lineage and changed actions.
Workloads for C-H must be fixed before running once their mechanisms exist. No long
ensemble is launched here; use dispatcher/detached-launch skills for user-machine runs.

## Delivered stage S0 and S1 (2026-10-24)

**S0 verified:** 1013 tests / 103 files passed before version 12. Candidate D1/D2
and courier fixes integrated; candidate tests retained, gates moved to 11. Local-main
continuation values and historical goldens unchanged. Save lineage tests reject
ambiguous 8/9 bytes before replacing any world. D5 already implemented on local main.

**S1 implemented and verified at the contract/runtime level:** version 12 creates
persistent township identities at household formation. A household retains membership
while walking. Public storehouse proposals use the existing decision, siting and
construction activities, with a recorded organiser and an explicit voluntary recruit
conversation. Support, refusal, urgent withdrawal, supplied items, actual work and
completion/failure persist. Organiser death conveys no inherited office; volunteers
may continue. Only participants near an outcome record personal civic experience;
that bounded memory nudges later recruitment acceptance. Public title confers no
access to private stock. At S1 product entrypoints used 12; lab ablation is
`rich-no-townships`. Existing worlds are not migrated. Civic references are validated
on load and included in compact hashes as well as complete saves.

Owner: `townships.ts` owns identity/project/participation/outcome records. Existing
social conversation, work options, resource transfer and construction own execution.
Alternative considered: new group planner/action language; rejected because it would
duplicate navigation, reservations and physical work. Selected: attach the civic
contract to existing public storehouse work and existing promises. Tradeoff: only
storehouses and first-response participation in this slice, not rival proposals,
elected offices, rejoining, factions, taxes or coercion. A township can disagree and
leave its project unfinished. Recent closed project detail is bounded to 24; personal
witnessed outcomes to 24; a project has at most 12 respondents including organiser.
Buildings and ownership remain authoritative after old project detail expires.

`history.ts` derives household/project views from typed records; missing formation
causes say unknown. Relationship history was subsequently delivered in S2a. Inspector shows township,
organiser, support, refusals, missing materials/work and contributions/outcome.
`construction_access.ts` conservatively protects connectivity around **new public
storehouse footprints**, rechecked at placement; D3 for other buildings remains open.

Verification: typecheck; build; full suite 1027 tests / 105 files; standalone golden
script all matches; diff whitespace check. After review repairs, township contracts
expanded to 16 passing tests and focused v10/v11 continuation checks passed. Contract
covers stable membership, local-home trigger and actual site marking, explicit
accept/refuse, withdrawal, public ownership, conservation, exact work, observer full
state purity, mid-promise and mid-haul save/load, invalid membership rejection,
organiser death and corridor obstruction. Browser script passed 10 checks; active,
site and completed screenshots were visually inspected. Initial header overlap was
found by image inspection and repaired with a measured layout assertion.

Staged physical outcome (`scripts/civilisation_scene.ts`): Ada delivered 6 wood,
Ben 4 wood + 4 stone, total actual work 640; public storehouse completed, balanced
ledger. Offered-option controller selects legal build/haul options; this is NOT an
autonomous emergence claim. Script/fixture are labelled staged in the app.
Unmodified `river`, Normal, arrivals off, 14400 ticks: final candidate had one
persistent township and **no civic proposal** in this window, ledger balanced.
An earlier pre-access-check candidate had a proposal/refusal; do not attribute it
to the final candidate. No aggregate benefit, completion frequency or performance
claim. A-H ensembles remain unrun. `civic_evidence` contains small reports/screenshots;
large local saved snapshots are reproducible and ignored.

S1 review findings closed: original courier call signature mismatch; candidate store
meal constant leaked to v10 (caught by immutable reference); private-plan reservations
hid volunteered material; full work credit could overcount the final tick; missing
civic hash fields; saved civic reference checks; public-owner wording; overlapping
header grid rows. Each repaired with the relevant contract/build/browser checks.

## Delivered S2a: social history and single counting (2026-10-24)

Version 13 preserves v12 continuation; no general social weights were raised. Social
execution owns outcomes; `social_memory.ts` retains at most 32 typed receipts per
person after requests expire. Absent askers do not receive remote receipts. History
views derive current relations and receipts, exposing unknown event links honestly.
The alternative of an unlimited event graph was rejected: it would duplicate truth
and grow indefinitely. The bounded view is not a complete lifelong biography.

D8: marked directly applied deeds retain their provenance but do not add reputation
again; retold stories affect reputation without a second permanent scalar adjustment.
An already known story is also marked if a direct consequence follows. Legacy rules
remain unchanged; `rich-no-reputation-dedup` restores old weighting for lab comparison.
Memory markers and receipts are saved/hashed. No currency, offices or factions added.

B contract: 9 fixed generosity/affinity contexts, same present physical state, one
stipulated prior work commitment (40 work versus 0), broken control plus nudge:1/2.
Before correction v12 willingness differences were .113/.134; at v13 .0255/.0465.
At v13 one of the six contexts with an actual conversation changed 2-wood fulfilment
into refusal. Three contexts had no answered conversation, not observed refusals.
All top-five work rankings remained identical; all broken nudges matched the broken
control action. Every ledger balanced. This demonstrates a mechanism; it is not
population benefit or spontaneous emergence. Raw reports retain both rule versions.

Verification: full suite 1037 tests / 107 files; build and typecheck passed. Final
small review repairs (counted-story hash, loaded-person test) passed 7 focused tests
including unchanged v12 continuation. Historical golden script matched. Browser
script passed 7 checks; kept/broken screenshots visually inspected: real conversation,
wood transfer/refusal, typed receipts and grievance visible. Whole saved state stays
identical during inspection. Review found and fixed repeat-story marker handling;
no failing tests were weakened. Faction/rival organiser politics remains S2b.

## S2 lifecycle correction: version 14

`death_knowledge.ts` owns personal learning of a death. The lifecycle owns death,
registry removal, inventory drops and operational obligation cleanup; those remain
immediate. Existing relations retain one typed learned-death marker, bounded stories
carry an identity/timestamp, and graves link to that identity. Alternative: consult
the global deceased list during decisions; rejected because that recreates omniscience.
No new unbounded death-news journal is introduced and no old ancestry is deleted.

Awake nearby witnesses in the same indoor/outdoor space learn first. A distant partner
keeps their believed partnership until hearing or observing evidence, then grief,
needs and bereavement change once. Grief starts at learning, not the unseen death.
Conversations require co-presence; prose containing "died" is not a typed death fact.
Funeral options require known death and a nearby visible gathering at a known place;
there is no remote invitation system yet. Automatic grave/funeral creation remains
legacy physical behavior; this slice does not implement burial labor or mourning culture.

D6: fresh v14 worlds start birthCount at zero; actual births increment it once, and
neither feed rollover nor child death erases the total. Historical worlds retain the
old calculation, with the tooltip explicitly calling it a surviving-feed count.
No historical lifetime total is invented. New fields are saved and hashed. The v13
reference was pinned at 078150b before changing rules; `rich-global-death-news`
provides the cheap knowledge ablation, not a product mode.

The staged runtime scene has Ben physically walk from x42 to x64.7, then tell Cora
(at x66) about Ada. At tick 340 she first learns the death from Ben. It takes 241
simulation steps; the ledger balances. Save/load 100 steps into the journey gives
identical complete final state. Viewer sees the actual "Ada has died" speech and
Cora's learned-tick/source in relationship history. Before contact she has no such
record or grief. This is a controlled fixture, not spontaneous discovery evidence.

Verification: stable full suite 1045 tests / 109 files passed. Initial full run overlapped the
last test/implementation edits and reported two failures in death news (speech and
same-day story identity); preserve `life-full-suite.log`. The stable focused rerun
passes 13 tests, including v13 continuation and legacy reputation. The passing stable full
rerun is `life-full-final.log`. Review caught a typed death story colliding with an
unrelated same-day news story; identity-based dedup and its regression fix that.
Rendered before/after screens are inspected; eight browser checks include full saved
state purity. Build/typecheck and historical standalone golden script pass.

Next executable work: S2b competing proposals/organisers; D7 co-present market repair
before cross-settlement trade. General route safety, relocation, knowledge/generations,
and current-rule performance/ensemble measurements remain open. Do not infer these
from the staged scenes.

## S2b: competing project coordinators (version 15)

Architecture: `civic_decision.ts` owns bounded candidate/support rules attached to the
existing civic project. Alternatives considered: duplicate rival physical buildings,
or alternate coordination proposals for the same public storehouse. Selected the
latter: preserves existing materials/site and creates meaningful disagreement without
speculative budgets, offices, property seizure or wasteful duplicate construction.
`organiserId` retains the original proposer; the council records the current coordinator.

A proposal begins without a mandate. At least two actual supporters and a strict lead
in support permit their coalition to work. Ties, withdrawal, death or household departure
remove the mandate; materials already supplied remain on the public site. Candidate
identity is never assigned from age or wealth. A respondent who knows the site may
propose an alternative coordinator after a personal grievance, distrust, witnessed
failure or known organiser death. The proposal is made in the ordinary co-present
recruit conversation. A resident may retain prior support or switch based on their
own affinity, trust, grievance and witnessed organising outcomes; the same outcome
is not added as another reputation story. Existing willingness/survival gates remain.

Four candidates, twelve participants, one response per person/candidate, twelve recent
coordinator transitions per retained project. No second civic truth store: accepted
conversation responses update the participation record. Switching releases the old
work promise as interrupted, without a fabricated moral failure. A failed tied project
is not attributed to an invented coordinator. Lab ablation: `rich-no-civic-choice`.
Version 14 continuation was pinned in 4c597b9 before implementation.

Contract evidence includes one-person blocking, physical accepted support, offered
challenge option, actual switch from Ada to Cora, tied support, urgent withdrawal,
coordinator death, private inventory conservation, complete observer purity, save/load,
and v14 continuation. A current-rule construction fixture still physically finishes
with exactly 10 wood, 4 stone, 640 work. Staged runtime shows Ben support Ada, Cora
refuse Ada, then Ben switch to Cora in an actual conversation. Mid-response save/load
produces identical complete final state. Eight browser checks pass; screenshots were
visually inspected. This demonstrates project-level collective decisions, not natural
leadership frequency or enduring factions. Experiment F remains unrun.

Review: the first fixture inadvertently allowed a different autonomous conversation
while waiting, so it did not isolate the requested interaction. The corrected labelled
fixture holds bystanders idle and waits for the exact asker/respondent request; it does
not force acceptance or alter probabilities. Other contracts retain autonomous stepping.
The challenge reads the person's last heard/supported organiser, not unseen current votes.

Remaining S2c: repeated alignments with persistent decision consequences and rival
investment priorities. S3-S6 remain as registered. Do not label a one-project coalition
an inherited faction or the whole civilisation programme complete.

S2b boundary checks: full suite 1052 tests / 111 files; build and typecheck passed;
historical golden script matched. Final review repaired the lab ablation's outcome
credit (work access already reverted); eight focused checks including v14 continuation
passed afterward. No product behavior or earlier reference was changed by that repair.

## S4 prerequisite: physical markets (version 16)

Confirmed D7: a v15 market attendee retained in the historical attendance list can
trade from x75 with someone near x40. V16 rejects that transfer before reading the
counterparty's pack/needs. `market_contact.ts` owns the physical boundary; `occasions.ts`
still owns attendance and barter; inventory transfer/ledger stay in economy.ts.
Alternatives: maintain a second live attendance roster, or validate actual presence
at each exchange. Selected validation avoids stale duplicate state. Both must be
awake, outside, within 3 tiles of each other and within 8 tiles of the active, existing
venue. The attendance list remains a history. Arrival relationship effects likewise
require local presence. A person must know the venue before generating attendance.

Both parties still evaluate their own surplus and valuation; no remote counterparty
inventory is consulted. Whole equal barter quantities are capacity-checked before
transfers; a capacity-limited fixture exchanges exactly one wood for one fish and
reports those quantities. Gifts preserve food already promised/reserved. A full pack
can honestly prevent a trade; simultaneous pack unloading is not added. No currency,
merchant role, invented goods, long-distance journey intent or new production labels.
`rich-remote-markets` restores the legacy path; v15 continuation pinned at 00fb9dd.

Staged rendered scene: Ada starts at x65; distant barter leaves complete state unchanged.
After 226 steps of the normal attendance activity she is at x40.5, Ben at x42, and
2 wood exchange for 2 fish. Both packs and the feed show the real quantities, ledger
balances. Saving 50 steps into travel produces identical complete continuation.
Eleven market contracts pass, including legacy reproduction, distant/indoor/asleep/
closed/wrong-place rejection, limited/full capacity, reservations and venue knowledge.
Seven rendered checks pass; final screenshots visually inspected with carrying visible.
Boundary checks: full suite 1065 tests / 113 files, build/typecheck and standalone
historical golden script pass; diff whitespace check clean. Broader S4
purposeful intertown exchange and measured dependence remain unresolved.

## Current-rule performance checkpoint (version 16)

The benchmark now accepts `--current`, selecting `currentWorldSettings`; omission
preserves historical runner semantics. No simulation rule changed. Run serially on
this Windows host, seed river, arrivals off, 2,400 ticks (one first day), samples every
240 ticks, ledger/tool/id checks every 600 ticks. Node and actual settings are in
`civic_evidence/performance-v16-day-{normal,large,huge}.json`. The earlier 600-tick
pilot files are retained separately. No tests or other agent CPU tasks overlapped
these measurements; unrelated host load was not controlled.

| Profile | Starting people | Wall seconds | Mean ms/tick | Invariant checks / failures |
|---|---:|---:|---:|---:|
| normal | 28 | 1.37 | 0.57 | 6 / 0 |
| large | 100 | 5.37 | 2.24 | 6 / 0 |
| huge | 250 | 20.08 | 8.37 | 6 / 0 |

Command (substitute profile):
`npx --no-install vite-node scripts/bench.ts --current --profile huge --seed river --days 1 --arrivals off --sample 240 --check 600 --quiet --out civic_evidence/performance-v16-day-huge.json`

These are short headless startup workloads, not mature civilisations, rendered frame
rates, an optimisation comparison, or evidence of long-run bounded memory. Existing
250-person profiling suffices for this checkpoint; no synthetic 300-person workload
was needed. D10 retention and mature-world cost remain unresolved. All three exited
successfully with balanced invariants. Typecheck covers the runner change.

## S5 prerequisite: developmental starting proficiency (version 17)

Confirmed D11: `giveBirth` calls `createPerson`, which previously assigned the same
random adult-range skills at every age. `development.ts` now owns initial proficiency.
Alternatives: continuously raise skills with age, or adjust creation once and retain
actual-work learning. Selected creation-only: no unearned birthday experience or
second skill store. Newborns start every skill at 0.20; people entering below 16 have
an age-proportional background between that baseline and their adult draw. This is
initial background, not fabricated practice history. Adults and elders retain the
same draws. Draws are still consumed for children, preserving RNG use and unrelated
birth traits/look. Once created, saved skills improve only through existing practice.
The 0.20 floor keeps existing work-time divisions finite. No time/age constants or
practice rates changed. Historical worlds keep their original starting proficiency.

Version 16 continuation pinned in 01d4439 before implementation. Lab intervention
`rich-adult-newborn-skills` changes subsequent creation only; it deliberately does
not rewrite existing skills in a fork. No save migration or new saved schema needed.
Inspector text explains this; skill bars now represent 0 to 1.8, displaying novices.
This is proficiency, not yet held-technique knowledge, infant development, or proof
that children naturally mature into competent adults. Those S5 questions remain open.

Controlled evidence: real birth creates Dax with all eleven skills at 0.20. Separately,
a labelled 12-year-old entrant Cora gathers three real berries in 91 ticks; foraging
rises from 0.707309 to 0.719309; all other skills stay fixed. This fixture does not age
a newborn rapidly. Mid-work save/load gives identical complete continuation and the
ledger balances. Aborting before completion grants no skill or goods. Adults, legacy
births, random-stream preservation and lab switch restoration have explicit contracts.
Ten browser checks pass; newborn and post-practice screens visually inspected with
proficiency and explanation readable. Observer comparisons use the complete save.

Review findings: initial practice fixture incorrectly pinned the worker, freezing
her activity; removed the pin at activity start. An invalid RNG accessor in the test
was caught by typecheck; the corrected assertion compares the RNG's actual state.
The first browser selector targeted native summaries instead of the existing section
button; corrected to exercise the real control. Original failures remain in local
logs; none were product-path fixes or acceptance-threshold changes.

S5 proficiency boundary: full suite 1072 tests / 115 files passed; typecheck, build,
standalone historical golden script, seven focused development/continuation checks,
and diff whitespace checks passed. No historical expected file was rewritten.

## S5 first technique: pre-run G contract (version 18)

Hypothesis: continued physical contact during an accepted instruction session, not
kiln proficiency or a public building, transfers charcoal-firing knowledge. Workload:
three labelled family/known-kiln fixtures, fork immediately after acceptance. Compare
contact control, one-draw nudge, two-draw nudge, and isolation (learner moved away at
the fork). Run 240 ticks after the fork. Metrics: learned holder/provenance, lesson
outcome, kiln proficiency, invariant balance. Compare isolation with the mean of
control plus nudges; this is a necessary-contact contract, not natural transmission
frequency, an aggregate welfare effect or multigeneration evidence. No maturation,
life expectancy or skill-gain rates change. Planned raw file: technique-contact.json.

## S5 first technique: implementation and observed contract

`techniques.ts` owns one bounded knowledge record per person and instruction rules.
Alternatives: settlement-global recipe unlock, or person-held technique with explicit
instruction. Selected person-held state so death/departure can remove local access,
with no magical inheritance from a building. Existing `skills.kiln` remains proficiency.
Initial adults/elder entrants know charcoal firing; younger entrants and newborns do
not. A birthday never grants knowledge. All other production competence remains as
before. Historical worlds retain universal recipe access. Lab off-switch:
`rich-universal-techniques`. V17 continuation was pinned in ca6e812 first.

A parent or master who knows a kiln and holds the technique may offer instruction to
a visible youth/adult child or apprentice. They do not query that person's private
knowledge to choose the offer. Existing conversation acceptance and availability apply;
the learner can decline for distrust, low interest, prior knowledge or age. Learning
requires 180 continuous ticks awake in the same space within three tiles. Both spend
that time conversing, subject to ordinary survival interruption, plus explicit thirst,
hunger, energy and danger checks. No passive bystander learns. Interrupted lessons
must be restarted; there is no partial-skill or free-knowledge award. Completion saves
teacher identity, lesson identity and start/completion ticks. The live lesson belongs
to the existing conversation; bounded personal logs/last interaction retain refusal
or interruption, and the completed technique retains its source. No second job store.

Planning, starting, joining and continuing a charcoal batch require the technique.
The existing kiln consumes six wood, yields three charcoal and accounts for waste;
no changed recipes, ownership or material flow. Knowledge is not copied from dead
people. A previously instructed survivor keeps it and its provenance. A batch already
burning can physically finish after a worker dies; knowledge is needed for the next
batch, not to keep an already-lit fire burning.

Controlled G: all 9 control/nudge branches acquired knowledge, all 3 isolation arms
were interrupted and acquired none; all ledgers balanced. The comparison is 1.0
learned fraction for control/nudge versus 0 for isolation in these staged forks.
Kiln skill does not increase merely by hearing instruction. Rendered fixture: Ben
accepts Ada's offer at tick 32, learns at tick 212, then physically fires three charcoal,
ready at tick 999. Mid-lesson save/load yields identical complete state. Twelve browser
checks pass; instruction, provenance and kiln output screenshots inspected. This is
not autonomous transmission frequency or natural multigeneration cultural persistence.

Review: the initial fixture let the listener start an unrelated conversation before
the offer, exceeding its narrow wait. It now holds the listener only until this talk
opens, then releases them. Staged sleep/interior states were normalised before the
conversation director saw them; those boundary checks now invoke the director at the
state change, while separation/need/death also have ordinary stepping coverage. No
simulation success was forced. The inspector's generic progress bar was found to show
zero during instruction; fixed it to derive progress from the actual saved lesson interval.
The inspected paused lesson now shows 45%, matching its 81 elapsed ticks of 180.

S5 technique boundary: full suite 1085 tests / 117 files passed. Forty focused
technique/workshop/continuation tests passed before the presentation repair; afterward,
thirteen technique/continuation checks, twelve rendered checks, build/typecheck,
standalone historical goldens and diff whitespace checks passed. The final repair
changes only derived observer progress. Historical continuation references unchanged.

## S3 prerequisite: general construction access (version 19)

Reproduced on v18 before changing behavior: the actual `plan_site` activity lays out
a private hut over Ben's occupied tile, making it solid beneath him. This establishes
the current unsafe mutation, not a reproduction of the audit's historical cedar death.
`construction_access.ts` owns safety validation; `findBuildSpot` applies it to proposed
new footprints, and `plan_site` rechecks immediately before occupying the tiles.
Alternatives: evacuate/displace people after building, or reject unsafe placement.
Selected rejection preserves physical movement and gives an honest failure.

The existing conservative cardinal-connectivity guard now covers all new footprints.
It refuses an outdoor occupant in the footprint, an existing building's door within
it, or separation of walkable perimeter cells. It may refuse a site with already
separate perimeter areas; it does not find an omniscient better destination or make
resources accessible. It is an engine geometry validation, not new inhabitant map
knowledge. No growth/weather obstacle repair is implied. The existing same-size hut
upgrade preserves its footprint and doorway, so it remains possible with someone
inside. Raw world/fixture construction remains low-level; runtime layout owns refusal.
Version 18 continuation pinned in a9988b6. `rich-unsafe-sites` removes only the v19
extension; earlier public-storehouse protection remains.

Seven access tests include the preserved v18 reproduction, current refusal, actual
clear-site success, delayed occupancy at the mutation boundary, mid-layout full-state
continuation, corridor/door checks, pure planner reads and occupied-home upgrade.
Twenty-four focused access/township/v18-continuation tests pass. In the rendered scene
Ada spends 26 ticks on layout, then records "the footprint would obstruct access";
Ben remains on a walkable tile and Ada still carries all eight wood and four stone.
Ledger balanced, no site created. Five browser checks pass; the expanded last-attempt
panel and unobstructed scene were visually inspected. Save/load at tick 12 gives
identical final state. No natural survival benefit or aggregate construction effect
is claimed from this fixture.

S3 access boundary: full suite 1093 tests / 119 files passed, plus build/typecheck,
standalone historical goldens and diff whitespace check. No existing references
were rewritten. A fresh serial current-rule benchmark was justified by extending
flood validation to all candidate sites: v19, river, first 2,400 ticks, arrivals off,
sample 240/check 600. Normal (28) 1.42s / 0.59ms per tick; Large (100) 5.61s /
2.34ms; Huge (250) 20.64s / 8.60ms. Each run has six invariant checks, zero failures.
Raw `performance-v19-day-*.json` includes actual rules/settings and Node v24.19.0.
Same bounded startup caveats as v16; this is not an isolated causal timing comparison
or mature-world scaling result. No tests/builds overlapped these benchmark processes.

## Rules 20 — household relocation and runtime founding

Contract/architecture: [RELOCATION.md](RELOCATION.md). The first complete S3 slice adds
co-present household agreement, refusal and renewed departure checks; capacity-limited
private packing; ordinary physical travel with dependent-child pacing; local destination
validation; ordinary shelter layout, hauling and construction; explicit establishment
and persistent township identity. Original buildings/resources retain household ownership.
Disagreement cancels the whole proposed move in this first mechanism; no partial-family
split, rescue, successor or return expedition is invented. Lost organisers and separated
families cannot found a township; the agreed deadline produces an observable failure.

Existing modules touched: decision adds the owned relocation options; world samples
personal hardship and hashes new records; activities adds a handler-owned travel pause;
withdraw checks relocation ownership at the actual transfer boundary; types/save carry
and validate optional records; history/labels expose actual state; townships retain
founding causality; lab adds the narrow off-switch. No general suspension semantics or
inhabitant audit fixes are changed. Immutable v19 reference: `801123e`.

Review findings fixed: packing could outrun a co-present family (meeting-place action);
children could be left beyond sensing range (asymmetric wait/follow distances); transfer
needed a fresh ownership check; simultaneous proposal completion needed a second
agreement check; all household responses must be heard together to avoid remote shared
knowledge; founding causality must outlive bounded household detail. Focused contracts
cover these boundaries. Current and historical full suites and rendered evidence are
recorded in the continuation snapshot above.

Bounded experiment D smoke: hypothesis and interpretation were written in
`scripts/relocation_probe.ts` before the run. Meadow, Normal, 28 founders, immigration off,
four days; current control, one-draw nudge and `rich-no-relocation`. All three ended with
28 people and conserved goods. **No sampled day-long hardship and no proposals** occurred.
This is a valid null for this short workload; it neither demonstrates spontaneous
migration nor measures its benefit. No thresholds were changed to obtain success.
`civic_evidence/relocation-natural-smoke.json` retains the results.

Current-rule startup performance: `scripts/bench.ts --current --profile <profile> --days 1
--arrivals off --quiet`, seed meadow, 2400 ticks each, run sequentially. Normal/28:
0.51 ms/tick; Large/100: 2.18 ms/tick; Huge/250: 8.64 ms/tick. Each made three invariant
checks with zero failures. These are first-day timings, not mature-world performance or
migration-cost estimates. Reports: `civic_evidence/performance-v20-day-*.json`.

## Rules 21 — S4a observable production and resource flows

Settlements now show actual resident gathering/harvest, nearby completed workshop output,
repeated activity across recorded days, and recent cross-affiliation gross transfers.
This creates no goods, professions, demand or jobs. Gross transfers (including returns)
are explicitly not called net trade. Module ownership, alternative, retention, attribution
and compatibility are in ECONOMY.md. This is a visible observation prerequisite, not the
still-unimplemented purposeful intertown barter mechanism.

Evidence: full suite 1115 tests / 123 files before the final two additional contracts;
then 17 focused tests across settlement_economy/economy/v20_continuation, including the
new partial-harvest and complete-state choice/RNG neutrality checks. Typecheck/build and
historical golden checks passed. `scripts/browser/settlement_economy_check.mjs`: nine
passing rendered checks, two township views, complete-state observer purity; Ada's rendered
panel inspected. Fixture is explicitly staged and tests physical accounting boundaries,
not autonomous emergence. `scripts/settlement_economy_smoke.ts`: one natural meadow/Normal
first day recorded one gathering group and no cross-township flow; no specialisation or
trade-benefit claim. Reports/screenshots are in `civic_evidence/settlement-economy-page/`
and `civic_evidence/settlement-economy-natural.json`.

Existing modules touched: economy records actual transfers/extraction/harvest; facilities
records only successfully completed output; world hashes and save validates observations;
history exposes them; rules/types carry versioned optional state. The new observation
module does not import economic mutation helpers or participate in inhabitant decisions.
The meaningful next stage is S4b purposeful locally informed exchange journeys.

Rules-21 first-day performance (same sequential meadow, immigration-off workload as
rules 20): Normal/28 0.51 ms/tick, Large/100 2.24, Huge/250 8.51; 2400 ticks and three
invariant checks per profile, no failures. This does not establish mature-world scaling.
Compact results: `civic_evidence/performance-v21-summary.json`.


## Rules 22 — S4b purposeful exchange journeys

The existing need/surplus planner can now offer an intertown material exchange trip from
a personally heard, fallible trade lead. The real conversation teaches the source; carried
goods travel by ordinary pathfinding; the existing barter conversation decides the swap;
ordinary hauling can bring the acquired material back to the household site. Refusal,
missing people/stock, capacity and urgent interruption retain real consequences. New
bounded records and derived town receipts expose that chain. See ECONOMY.md for the
owner, architectural alternative, retention, failure and compatibility contracts.

Existing modules touched: options_social adds the owned trip opportunity; social teaches
leads during co-present news and reports actual barter outcomes; activities are reused
without changing their suspension rules; history/labels expose the records; save/types/
world validate, persist and hash them; the lab adds a narrow off-switch. Immutable v21
reference was committed before implementation at `ee822f3`.

Verification: full `npm test` 1129 tests / 125 files; typecheck and build passed; all
historical golden fingerprints match. Eleven exchange contracts covered real contact,
accepted/refused action, missing counterparties/stock, urgent thirst, physical return
hauling, observer purity, historical/ablation gates and full-state mid-travel/mid-talk
continuation. A further blocked-path contract was added during final review. Rendered
`scripts/browser/exchange_check.mjs`: 19 passing checks across six labelled stages;
travel and fulfilled screenshots inspected. `civic_evidence/exchange-page/` and
`exchange-contract-demo.json` retain the evidence. No manual inhabitant audit run is
claimed; that queue has not begun.

Review fixes: keep the bounded journey against nonurgent alternative work while leaving
critical survival interruption live; record the actual swap immediately so subsequent
conversation interruption cannot erase it; validate new records at deserialization;
use feasible pack loads in labelled fixtures rather than bypass capacity. Original
historical references and audit evidence were not changed.

Experiment E bounded smoke: meadow/Large/100 founders/four camps, one day, immigration
off; current control, one-draw nudge and no-exchange-journeys. All three had zero lead
holders, journeys and swaps, 100 survivors and conserved goods. This short null does not
measure benefit, natural specialisation or dependence. Conditions and interpretation
were recorded in `scripts/exchange_smoke.ts` before running; raw results are in
`civic_evidence/exchange-natural-smoke.json`. No threshold was tuned to force occurrence.


## Rules 23 — persistent alignment and consequential factions

Actual support choices now persist across projects. A resident's uniquely repeated prior
choice slightly strengthens continuity against a rival coordinator. The civic inspector
shows groups formed by this history; ordinary support still determines physical work
access. There is no global faction assignment, automatic successor or coercion.
Architecture, alternative, retention and recovery are recorded in RICH_WORLD.md.

Existing modules touched: civic_decision records actual proposals/accepted choices and
consults personal alignment when comparing rivals; history derives groups; save/types/
world persist, validate and hash the bounded memory; lab adds the narrow ablation.
The new political_alignment module owns this concept. Existing social weights for
witnessed success/failure and the B broken-promise evidence remain unchanged.

Verification: full `npm test` **1136 tests / 127 files**, typecheck/build and unchanged
historical golden fingerprints. Five new contracts cover real support across projects,
one-prior-choice counterfactual with actual acceptance/refusal and changed mandate,
bounds/deduplication/current-project exclusion, strong disagreement, ties, known death,
departure, observer purity, save/load and historical/ablation gates. Focused tests passed
after the final pure-view wording/index improvement. Browser: ten passing checks across
before/retained/changed states; both outcome screenshots inspected and scrolled to the
actual decision explanation. Evidence: `civic_evidence/alignment-counterfactual.json` and
`civic_evidence/alignment-page/`. These are explicitly staged, not natural F emergence.

Review findings resolved: record a challenger's own accepted nomination as well as a
founder's proposal; exclude the current project from continuity to avoid self-reward;
retain only one choice per project; keep derived grouping out of decision inputs and
avoid quadratic household/member lookup in that observer. Broader natural faction
frequency, durability and effects remain unmeasured.


## Rules 24 — household practices passed through shared meals

People can establish the practice of sharing supper by hosting twice, then pass it to
a child through two later physical meals. Food and contact time are real; refusal,
cancellation and incomplete learning remain possible. Holders are more inclined to
offer a later meal under the existing constraints. Household history displays source,
meal IDs, teacher and transmission generation. No automatic birth inheritance or
accelerated lifespan was introduced. HOUSEHOLD_HOME.md records ownership, alternative,
bounds, save validation and failure/recovery.

Existing modules touched: meals records actual portions/contact and successful
completion, and consults the personal invitation preference; household_practices owns
the concept; history presents provenance; save/types/world validate/persist/hash it;
lab adds `rich-no-household-practices`. Immutable v23 continuation was committed first
at `0878bf4`.

Verification: **1145 tests / 129 files** in `npm test` (89 seconds); typecheck/build;
all historical golden fingerprints unchanged. Eight focused contracts cover physical
food/contact, real parent-child transmission and subsequent hosting, cancellation,
mid-meal full-state continuation, teacher death, no automatic inheritance, non-family
contact, idempotence, malformed provenance, historical rules and ablation. Browser:
**16 passing checks** across five labelled scenes; transmitted-provenance screenshot
inspected. Evidence: `civic_evidence/household-practice-contract.json` and
`civic_evidence/household-practice-page/`. Demo: `scripts/household_practices_demo.ts`.

Review fixed repeated completion teaching from the very meal where a host first learned.
The fixture retains legitimate refused invitations and waits before selecting another
offered action. Supplies are finite, withdrawn physically from the household's private
store; meals conserve goods. The fixture advances to later meal windows with normal
adult ages. It proves a parent-child contract, not spontaneous behaviour, natural
multigeneration persistence or aggregate benefit. Natural experiment H is still unrun.


## Rules 25 — retain causes, bound disposable state, index history

Repeated tree felling leaves one cosmetic mark per tile. Expired pair-specific talk,
invitation, apology, proposal and making deadlines are removed at ordinary maintenance;
other timestamps/counters and all meaningful relationship records stay. Deceased-ID
lookup is indexed without altering returned identity, saved state or inhabitant access.
The viewer still sees the actual parent, grief source and remembered conduct.

Existing modules touched: sources replaces duplicate marks; world invokes the owned
memory_retention maintenance; nine history/social/observer consumers use the derived
historical_index; rules/lab provide generation and ablation. No decay weight, lifespan,
ownership, grave placement or resource process changed. SCALING.md records architecture,
alternative, bounds and the intentional O(total deaths) archive cost. The audit's broad
prune-dead-pairs suggestion is superseded by the owner's causal-history requirement.
Immutable v24 continuation was committed first at `7444c80`.

Verification: full `npm test` **1150 tests / 131 files** (92.91 seconds), typecheck/build,
all historical goldens unchanged, five passing rendered history checks and inspected
screenshot. A fifth focused retention contract added during review verifies 1,200 ticks
of full natural continuation against the ablation, normalizing only the deliberately
disposable timer/mark representation; six focused tests including v24 continuation pass.
Evidence: `civic_evidence/retention-page/`, `retention-lookup.json`.

Synthetic lookup workload: 10,001 archived identities, 10,000 queries; identical results,
full state unchanged; 151.23 ms linear versus 2.01 ms indexed on this run. This measures
lookup only. Current v25 meadow first-day benchmarks, immigration off, 2,400 ticks each:
Normal/28 **0.53 ms/tick**, Large/100 **2.17**, Huge/250 **8.68**. Ledger/tool checks at
800-tick intervals and end all pass, no invariant failures. Commands use existing
`scripts/bench.ts --current --profile <profile> --days 1 --seed meadow --arrivals off
--check 800 --quiet --out <file>`. Compact evidence: `performance-v25-summary.json`.
No new 300-person workload was needed; mature-world costs remain unmeasured.


## Rules 26 — spatial mineral opportunities

Finite clay, ore and outcrop amounts now vary with independent seeded spatial geology.
Camp locations, deposit locations, normal food/water and starting equipment are preserved.
Residents gain no world-truth access or assigned occupation. Existing source inspection
shows the quantities; township production still reports actual activity and withholds
specialisation claims until repeated activity exists. ECONOMY.md records the ownership,
alternative, bounds, generation-only ablation and compatibility contract.

Existing modules touched: worldgen applies the pure geology field only when creating
finite deposits; rulesversion selects new versus historical generation. No new saved
schema: source amount/max and the initial resource ledger remain authoritative. Immutable
v25 continuation was captured at `5ba25f9` before implementation.

Verification: `npm test` **1155 tests / 133 files** (89.69 seconds), typecheck/build,
historical goldens unchanged. Three geology contracts verify deterministic placement,
unchanged non-mineral sources, RNG state and knowledge-key boundaries, positive finite
stock, conservation, save continuation and historical generation. Browser: nine passing
checks; ore quantity and actual township production screenshots inspected.
Evidence: `civic_evidence/geology-page/` and `geology-natural-smoke.json`.

C probe: meadow/Large/100, two days, control + nudge + generation-only no-geology. The
four towns' nearest-deposit ore totals are 38/66/55/52 in control versus 43/50/49/48
without geology (this diagnostic partition is not ownership or inhabitant knowledge).
Control and ablation production are identical over two days; nudge differs. All arms
have 100 survivors and conserved goods. No clay/ore production occurred. This valid
short-window null does not establish sustained specialisation, trade dependence or
benefit, and no quantity range was tuned to force an outcome.


## Measurement delivery and remaining queue dependency

Executable checkpoint **b402f3d** adds pure end-state/retained-record civilisation
metrics to the existing lab, generation-only geology comparisons, a resume guard for
that comparison setting, and a provenance-checked detached PowerShell workload runner.
The broad suite passes **1159 tests / 134 files** (85.85 seconds); typecheck/build pass.
Focused lab/report/default/death/civilisation tests: 18 passing; after the final honest
initial-divergence annotation, eight focused report/default/civilisation tests and
typecheck pass. Actual 0.02-day runner, report and resume were exercised. Evidence:
`civic_evidence/lab-civ-metric-final-smoke/` (final) and `lab-civ-metric-smoke/` (initial
runner/resume). The PowerShell launcher parses; no long-run execution is claimed.

Review findings addressed: do not describe regenerated geology as the identical fork;
mark its initial divergence; reject ordinary-versus-geology output reuse; preserve
first-match historical lookup semantics; label retained and living-at-end measures
instead of inventing lifetime counts; check every expected seed/arm before declaring a
workload complete. Source/configuration manifests prevent unsafe continuation of the
prepared workloads across revisions. Core simulation remains rules 26 unchanged.

Pinned owner priority `030d62d` was reread. Each queued item is **blocked by the same
unfinished prerequisite**, not fixed or disproved: F1 night-wait suspension; F3 option
identity; F2 crafting explanation; F4 latest-action summary; F5 time wording. Current
reproduction has not begun. The prerequisite is the remaining programme verification
in CIVILISATION_VALIDATION.md, followed by honest result interpretation and any required
failure repairs. Keep the v13 original audit/transcript intact; use current main when
this queue opens. No manual inhabitant acceptance session for these fixes is claimed.
