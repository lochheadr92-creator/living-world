# Roadmap execution handoff — rules 156

**Current checkpoint (5 November 2026): rules 156, product save format 5.** Brain list row 2a item 1: a child (under 12) is not offered, and cannot start or resume, wood or stone gathering ("too young to chop wood or break stone"); light food gathering, water, learning and play are unchanged. An audit found every later heavy kind already excluded children; youths are unchanged. Ordinary meadow: 6 child wood starts at 155, none at 156; the debug panel shows the reason for Mona (9) at tick 767. A latent rules-144 save defect, where a founder's pre-start water memory made the final account unloadable, is fixed load-side. Suite: 2,871 of 2,884 pass; the 10 failures are a missing ignored fixture and load timeouts, and all affected files pass alone. 25-day screens pass. Next: row 2a item 2 (care hand-overs to dependants already holding food). Evidence: `review_evidence/child-tasks-20261104/README.md`.

**Rules 155 checkpoint (4 November 2026), product save format 5.** P1.1 shows where hearsay came from; P1.2 (rules 154, narrowed by owner decision) weighs a told food place by the listener's own checks of its teller: 2-6x fewer trips on a caught-out teller's word, no measured change in total wasted trips or survival (an explained knowledge behaviour, not a benefit). Rules 155 ends a paused care acquisition through the common ending when its purpose ends. Verification: 2,878/2,879 tests pass; the one observer-purity timeout under load passes in isolation at the same time as on the predecessor. Next per the Brain implementation list: children's work by physical task, carrying recovery in exchanges, interrupted-project diagnosis, elder warmth/shelter/company. Evidence: `review_evidence/p12-narrow-20261104/README.md`.

**Rules 153 checkpoint (4 November 2026), product save format 5.** Rules 153 stops a full-pack loop of empty-handed net checks seen in the ordinary river screen (blocked until there is room; a zero-transfer check fails). Full suite 492 files / 2,869 tests pass; 25-day screens pass integrity, and river now has 2 successful checks and no empty-handed ones. The uncollected meadow trap is rational competition (no tuning). Rules 152 summary follows. Evidence: `survival_evidence/ordinary-acquisition-20261104/README.md`.

**Rules 152 checkpoint (4 November 2026), product save format 5.** Ordinary diagnosis found the first broken transition for traps, nets and sheep: rules-135 cellars outranked a lean-to household's hut, so ordinary worlds kept 1-6 huts and never planned a timber yard (0/9 at rules 148-151, against 25/25 at rules 121), leaving no fibre. A rules-pinned bisection isolates 134 to 135. Rules 152 lays out a cellar only after a proper home. Ordinary 25-day Normal arrivals-on forest/river/meadow screens now activate sheep acquisition and care (river: mating, pregnancy and an ordinary lamb birth), nets (meadow: one trap) and wool garments, with integrity passes. The body-origin preservation null was a staged dry-camp fixture: beside known water the same scene dries and eats two meat portions; no rules change. Full suite 490 files / 2,865 tests pass; typecheck/build pass. Preserved-meat and trap-meat ordinary meals, sustained flocks and benefit remain open; next is a zero-progress net check with a full pack. Evidence: `survival_evidence/ordinary-acquisition-20261104/README.md`.

**Historical checkpoint (4 November 2026): rules 151, product save format 5.** Three survival-chain repairs are implemented: bounded collection of one's processing preserved food and quantity-aware paid butchery (149), checked trap-catch recovery before reset (150), and known food-route comparison before sheep slaughter (151). Final local verification on THEWEAPON passes 488 files / 2,860 tests with unchanged source/config hashes; typecheck/build pass. Staged autonomous runs demonstrate eaten dried meat, attributable trap-meat meals and a lamb birth with exact continuation and conservation. All nine 25-day Normal arrivals-on screens (rules 148/149/151, forest/river/meadow) pass integrity checks but show no activation of those three target chains. Ordinary uptake, body-origin preserved-meat completion, sustainable flocks and aggregate benefit remain open. See the survival capability record and `survival_evidence/continuation-20261104/README.md`; follow the ordered dependency-chain programme. Earlier checkpoints remain historical.

## Historical rules-147 test maintenance

The owner-requested local full-suite rerun, all-on baseline and test maintenance are complete. On THEWEAPON, the final four-worker run passed all 477 files: **2,811 tests passed, zero unexpected failures and two documented expected failures** in 790.58 seconds. Typecheck/build pass. No simulation source, scripts or dependencies changed; the nine-seed, 25-day all-on baseline remains a measurement of the same runtime.

The 36 original unexpected failures were repaired or retired with maintained replacement coverage; the additional report-provenance false positive was repaired too. Two real expected-failure limits remain: competing-plan material claims and compact-save fallback. Full triage, retained failed attempts, final logs and source manifests: [recovery record](docs/RECOVERED_CAPABILITIES.md#post-publication-test-maintenance-and-all-on-baseline) and `review_evidence/test-maintenance-20261104/`. Brain's 4 November recovery/full-suite note retains the original suite, all nine baseline rows and final repair evidence. The separate survival programme remains stopped and incomplete.

## Historical recovery publication — rules 147 on main

Selected missing features from the retired branches are implemented, tested, committed and pushed. Main integrated at `f03a2593`; subsequent commits record cleanup only. All nineteen reviewed tips have verified remote annotated archive tags, and ten local / eighteen remote retired refs have been removed. The two occupied old worktrees were detached at their existing commits with unchanged file/index fingerprints. No test or measurement remains running.

Historical pre-maintenance result: the full suite was not green: 2,784 passed / 39 failed / 3 expected failures; 36 failures reproduce on starting main, and the remaining three lab timeouts pass in isolation. Build and recovery/continuation contracts pass. Ordinary uptake is bounded and several industrial/social features remain staged-only evidence. See [the recovery programme](docs/RECOVERED_CAPABILITIES.md) and its linked raw evidence. The separate survival programme remains stopped and incomplete.

## Historical stop checkpoint — rules 133

Owner requested stop after the current section, commit/push the survival work,
and merge it to main. The delivery branch has been pushed successfully and
fast-forwarded into main. All survival-task code, scripts, tests, docs, raw
results and execution logs are committed; older unrelated artifacts and retired
branches remain preserved. Check live Git for the final publication SHA.

Final merged-main focused verification:5tests in2files PASS (5.74s), including
exact rules133 continuation. Main typecheck exits2 solely on the two existing
nullable errors in untracked zz_review_f_plank_diversion and
zz_review_main_mature_large. Combined tracked delivery build PASS. The unfinished
full132regression was interrupted at the owner's stop boundary, not passed.
No capability work or long-run measurements remain running. Do not resume the
remaining programme without a new owner request. Detailed results/gaps follow.

# Delivery checkpoint — rules133; stopped at owner request

All survival-task source, tests, diagnostic scripts, documentation and retained
evidence are committed on the delivery line for integration into main. The
rules133 repair and rules132 nourishment implementation are included. The
combined tracked checkout passes npm run build, including TypeScript checking
(publication-build-isolated.log). This does not include main's pre-existing
untracked review tests, whose two type errors are documented separately.

The current section is complete. The whole seven-family programme remains
incomplete and no further work should resume without a new owner request.
Completed/partial measurements and remaining gaps are in the stop checkpoint
below and docs/SURVIVAL_CAPABILITIES.md. Verify live Git for publication status;
older working notes below are historical, not instructions to keep running.

# Owner-requested stop — current section complete; publishing to main

Owner asked to stop after the current section, commit/push current work, merge
it to main and report. Do not resume capability work without a new request.
Rules133 trap-report repair is complete on codex/survival-trap-report133 at
0ce4171, to merge with main216619d and this evidence checkpoint. All task source,
tests, scripts, docs and survival evidence are being preserved for publication.
Older unrelated untracked artifacts and retired branches are outside this
survival-task publication unless the owner explicitly broadens that scope.

Current section:4contracts;29/4affected tests plus20passive-gear tests;
32reference/rules/save/inspector checks; final5/2including direct empty-body
wording;6rendered checks; isolated typecheck/build pass. Ordinary133replay
matches132after only specified log text/rules normalization and saves exactly.
Immutable133 source86210bc6355cf48e0d5b5400eaa7b7527d2d1757ec0a967e424f5ee0687301d7
retained. Final inspect-only delta is audited; no expectations rewritten.

All follow-on simulations and unfinished132broad regression were stopped.
owner-stop-20261104.json:75baseline,48pre131and40final132draws completed and
validated; remainder partial/not started. Full132has no final test count or
pass verdict. Known main typecheck/build errors are in unrelated review files.
Ordinary132forest/river25 both pass exacttwins/save120/conservation (18/28alive).
131meadow60 passes,23alive,7netfishmeals but no traps/births and all8bodymeatlost.
The whole programme remains incomplete: preserved-meat meals, attributable
trap meals, final-source lamb birth and full aggregate comparison are open.
Forest25drawmeans121/131/132=5.56/8.32/5.68, an adverse reserve comparison.

Authoritative details:docs/SURVIVAL_CAPABILITIES.md. Historical working notes
below are superseded where they say continue or running.

# Active continuation - main216619d (rules132);133 isolated repair

Overall seven-family task NOT complete. Owner explicitly said continue this checkout.
132 committed216619d. Main runtime must stay132 while full suite86942 runs.
Docs/SURVIVAL_CAPABILITIES.md has uncommitted completed forest subset findings.
Main tests/trap_catch_truth.test.ts is OUR untracked older3-test red version.

Only active edits to runtime are in sibling living-world-trap-truth-fix, detached
216619d, node_modules junction. Four changed source files: carcass.ts adds pure
hasRecoverableParts; passive_gear.ts gates truthful lost-catch log at133;
inspect.ts distinguishes empty remnants; rulesversion.ts current/support133.
4 tests in that sibling cover lost/empty/fresh/historical and mid-check exact
continuation. Green2=29tests/4files (gear.test.ts filter was nonexistent);
separate passive_gear20tests PASS. Firstgreen12/3PASS. Isolated typecheck and
build both EXIT0 (no unrelated untracked review files in that checkout).
Rendered6checks pass at trap-catch-truth-rendered1 with success/failure images
visually inspected. Vite5297 session31169. CUA tab1 variablecarcassSupplyTab.

Do NOT modify src/scripts in living-world-trap-truth-fix while its ordinary
133 replay runs session25004: scripts/trap_report_replay.ts, reference
aggregate-nourishment132/forest-f2-n1, output trap-report133-replay.
It normalizes only rules version and the two known trap-check log strings;
all other final saved bytes must equal132. Saves120/conservation/sourceguard.
After finish: capture immutable133, bring ONLY four source files plus new
4-test file/browser2/replay script to main after132full completes. No commits
in isolated sibling yet. Need final diffs/tests/ordinary proof/docs/commit.

Original132trap food replay42686 DONE EXIT0: exact original25day save,
save120/conservation. Body17987 caught50849, zero recovered meat/zero meals.
Full source-attributed report trap-food132-replay/report.json retains failed
chain. Do not claim trap food completion.

Current jobs: full132 npmtest86942 still running; pre13175draw24591 at37/75;
final13275draw4850 at32/75;131meadow60 observer84692 atday51;132fern60
observer54076 (frozen living-world-nourishment-check1) juststarted to diagnose
remaining final-source carcass/preservation/gear uptake. No frozen edits.
132forest/river25 bothDONE18/28alive,500pure each,exacttwins/save120/conserve.
Bothflowbalances near1e-10. River one mating at37848; mother1167 slaughtered
41578 before birth,ram43664. No final-source birth yet. Final meat-preservation
meals, attributable trap meals and lamb birth remain gaps.

ALL25FOREST cohort draws complete in three conditions:121mean5.56 med5range0-15;
131mean8.32 med8range0-18;132mean5.68 med5range2-18. ADVERSE reserve result,
reported to user and in single capability doc. Not a reason to tune thresholds.
River/meadow pending; full comparison script survival_compare.mjs still ours
untracked and baseline selfcheck4PASS. No all-cohort benefit claim yet.

Brain daily updated with132commit and pending limits; checksum
b2ed52e0aec3ccbb9c29985c27cf01d6f69ab234d04f6dbb63a06d5279dc89cf.
Archive END refresh only at actual final. No subagents/push/user confirmation.
Use python -X utf8. Preserve all unrelated untracked evidence and tests.

# Rules132 implementation checkpoint; overall task NOT complete

Rules132 runtime/tests are ready for focused commit. Forest/river25 are now
complete:18/28alive,500pure checks each,exacttwins/save120/conservation.
Forest is byte-equal to its independently observed cohort control. Docs updated.
Full suite86942 still running; cohorts24591/4850 running. Trap replay42686
lastday19. New tests/trap_catch_truth.test.ts is UNTRACKED and deliberately
red:2fail1pass reproducing stale/empty catch claims; leave it out of132commit.
No133runtime edits yet. Do not modify frozen measurements. Earlier detailed
paths/provenance below remain applicable.

# Current survival continuation - main c75fe2d;132 staged, NOT complete

131 is committed c75fe2d.132 runtime/tests/observers/browser/reference are
staged (24files); docs/SURVIVAL_CAPABILITIES.md is separately dirty. Preserve
all unrelated evidence and tests. No push, no agents, no approval needed.

132:29new contracts pass (26nutrition+2access+1view), ten122-131 references
pass; immutable132 captured bfb773f5e134dfcd4753d29628052626c3ee4e552a16ce0ad277157d74856f86
and passes. Final browser10checks pass nourishment-rendered3, visible fed/unfed
sleep captures in rendered2, actual forest Yusuf view in nourishment-ordinary-view.
Only read-only sleep QA differs from frozen132 source; exact audit retained in
resume-20261104/nourishment-view-source-audit.json. Typecheck/build retain only
two baseline nullable errors; final standalone Vite passes.

RUNNING (never edit frozen source worktrees):
-24591 pre-reserve13175draws ../living-world-trap-window-check2,
 aggregate-pre-reserves131 (last24complete, nofailed).
-4850 nourishment13275draws ../living-world-nourishment-check1,
 aggregate-nourishment132 (last22complete, nofailed).
-6838/45599 ordinary132forest/river25, nourishment-check1,
 lastforest~day22/river~day19. Exact twins, save120, pure/conservation runner.
-84692 older131meadow60, trap-window-check2, lastday40.
-86942 npmtest maxWorkers2 on main, nourishment-full1.log. Has baseline
 review failures plus likely four timeout failures (toolreport+lab_defaults),
 wait for full detailed summary; recheck timeouts after machine load eases.
 Collection predates new nourishment_access/view files; those passed separately.
-42686 trap_food_replay in ../living-world-trap-food132. Reference is the
 completed132forest-f2-n1 cohort draw. Output trap-food132-replay. Observer
 conservatively tracks direct trap-meat recovery and meals; exact final save
 must match the original draw. Main script is untracked scripts/trap_food_replay.ts.

NEW finding awaiting replay/repair:132forest-f2-n1 has trap catch body17987 at
50849, original deadline51280. Final body is gone; p905 log at58812 still says
'Checked the trap: a body needs butchering.' passive_gear check uses non-null
historical bodyId without testing current recoverable remains. This is a real
misleading failure log; no repair yet. Respect version/reference rules when
fixing. Trap food not yet attributable:20meat made/12eaten but multiple bodies.

Ordinary hide route CLOSED:130fern60 garment50001protected ticks. Fat route
CLOSED as bounded activation:131forest-f4-n2 and f5-n3 each rendered/ate1fat.
Meat preservation, attributable trap meal and final-source sheep birth remain
open. Check completed cohort saves' chronicle for lamb births; absence in a
bounded chronicle does not prove none. No added hunting utility/deer.

NEXT: finish pending outputs, source-attributed trap replay, remaining uptake/
truthful failure repair,132focused commit once verified, full cohort comparison
against131 and121. scripts/survival_compare.mjs untracked, selfcheck4passes;
validates full settings, hashes and75draws; nutrition missing means null notzero.
Brain daily latest checksum bbcf015fa061d6c2ec5e2698022b1cf594e74785acc6cfa7dd088b71371e7d8a.
Do not end with partial work; owner requested all seven. Archive refresh at
actual end remains due. Use python -X utf8 for reads to avoid CP1252 corruption.

# Current survival checkpoint - rules131 ready to commit;132 separate working changes

Task NOT complete. The owner authorised this checkout; no renewed approval,
subagents or publishing unrelated commits. Preserve existing evidence/tests.
131 runtime, tests, viewer and immutable reference are staged separately.
Forest/river25 finish11/27alive,500pure checks each, exact twins/save120 and
conservation. Broad131 has31baseline failures; timeout-only recheck passes.
130fern60 closes ordinary hide use;131forest-f4-n2 closes bounded fat use.
Details and all limits are in docs/SURVIVAL_CAPABILITIES.md.

132 finite paid nourishment is implemented ONLY in the working tree, with
28new contracts, ten predecessor references and eight rendered checks.
Immutable132 captured from bfb773f5e134dfcd4753d29628052626c3ee4e552a16ce0ad277157d74856f86.
Do not mix132 changes into the staged131 commit.

Running:131meadow60 session84692;13175draw cohort24591 frozen
../living-world-trap-window-check2 (DO NOT EDIT);132forest/river25 sessions
6838/45599 and13275draw cohort4850 frozen../living-world-nourishment-check1
(DO NOT EDIT);132full suite maxWorkers2 session86942 in main. Full suite was
collected before nourishment_access.test.ts; that file passes2/2 separately.
Both75draw comparisons, deferred meat preservation/trap-food/breeding evidence,
132 final review/commit and concise Brain checkpoint remain outstanding.

# Active survival continuation — main7f1895f, dirty rules131

130committed7f1895f; details below. Task NOT complete. One behaviour stream,
no subagents/reapproval/push. Preserve unrelated evidence and tests.
131trap-window runtime implemented; immutable131 captured, NEVERoverwrite.
Source hash6b2436581d2a683934222612cb6b88506245288bd3188c080fb4fbe1860e8b70.
54/7 affected + final36/4 pass; type/build only2baseline errors; VitePASS.
8browserchecksPASS. Cua browser2/tab1 variablecarcassSupplyTab now on
/scripts/browser/trap_window_manual.html, server5296session81948.
Finalfailure screenshot trap-window-rendered2/failure-visible.png inspected;
firstsuccess trap-window-rendered1/success-visible.png inspected.
Mainobservergear.ts corrected zero-fish story ontrap; runtimeunchanged.

RUNNING:
- 71225forest25,19178river25 frozen../living-world-trap-window-check1;
  outputs survival_evidence/trap-window-check1.
- 16546 npmtest frozencheck1, log resume-20261104/trap-window-full1.log;
  original famine fixture copied byte-identical. Contains unrelated baseline tests.
- 84692 meadow60 frozen../living-world-trap-window-check2 (correctedobserver).
- 61524 standalone131reference test; 54276capture already wrote expected file.
- 63699 older130fern60 frozen../living-world-carcass-supply-check2.
Read only compact progress fields, never whole JSONL lines (huge).

NEXT: check131reference result and ordinary/broad outputs; finish131review/
commit/checkpoint. Ordinary hide/fat/preserved meat/trap-food remain open;
no probability/deer/utility inflation. Reserves7 remainsLAST/alreadyauthorised;
chosenbounds and allocation documented BEFORE code, no reserve runtime yet.
Need immediate-predecessor75draw and final75draw against validated121baseline.
Brain daily checksum a3360f479b398784dbb19e8701d9a46d602e4f16e0c7590f855519216dd14bdb.

# Active survival continuation — rules130, ready for focused commit

Owner authorised this checkout and all seven capability families. Task NOT
complete. Preserve unrelated evidence/tests; no push of older unrelated commits.
130 known-body recipe supply passes75/6+88/8 focused, nine122–130references,
eight rendered checks; typecheck/build retain two baseline nullable errors.
Final-source2 forest/river25 DONE11/27alive; exact twins/save120/conservation,
500pure checks each. No hide/fat/preserved-meat output. Detailed null findings
and source hashes in docs/SURVIVAL_CAPABILITIES.md. Forest trace130 DONE:928
samples,10butchery endings, eight changed offers but no changed endings.

Running only frozen130 fern60 extension: session63699, output
survival_evidence/carcass-supply-check2/fern-60d, frozen
../living-world-carcass-supply-check2. Do not modify frozen source.
Next implement131 trap-window repair: actual128meadow encounter130198 was
missed before final resolution130797. tests/trap_window.test.ts has6tests,
3pass3expected-red under130 (trap-window-red2.log). Future staged page and
checker scripts/browser/trap_window_* exist but unverified, exclude130commit.
Immutable130 captured, source1a87e46dd5571935f034373d7d8d16e8c4b9d37de8137839dc94f69b8cdecb7f.

Remaining: ordinary hide/fat/preserved meat/trap-food completion; bounded131
checks/rendering/25day runs. Reserves7 is LAST and already authorised. Chosen
capacity/efficiency/expenditure/recovery bounds are recorded before code.
Then immediate-predecessor75draw and final75draw cohorts and comparison with
validated121baseline, final broad verification. No reserve runtime yet.

Finished129source5 broad:427filespass14fail;2604testspass32fail3expected,
1023.88s exit1.32=31baseline+old wool whitelist; current focused covers fix.
Frozen128 trap encounter trace done: trap43683 set130197, deer1292 inradius4
at130198 with fixed hashPASS; missed because code checked only130797. One
bounded131followup should check actual encounters during existing600tick window,
never reroll; do after130capture/verification. Evidence trap-encounter128-meadow.
129carcass trace928samples,13heldmeat (none>=2), noheldhide/fat, demonstrated
missing production ingredient connection. Three red tests retained.

Next: finish130ordinary+reference+diff/commit/Brain. Then boundedtrap repair,
ordinaryuse. Deferredhide/fat/preservedmeat/trapfood still need final-source
use. Reserves7LAST, alreadyauthorised: chosen capacities/80%efficiency/bounds
and paidrecovery recorded BEFORE implementation in SURVIVAL_CAPABILITIES.md.
No reserve runtime yet. Need immediate-predecessor75draw and final75draw
cohorts; baseline75 complete/validated. survival_compare.mjs selfcheckpassed.

Uncommitted observational extras: survival_ensemble bodyremaining metric,
survival_compare.mjs, trap_activation_scan.ts, trap_encounter_trace.ts,
carcass_route_trace.ts. Own sheep_trace.ts trailing whitespace fixed after129
commit. Include logical files only; no indiscriminate gitadd.

Brain daily checksum f360e4ddbf45a47ddb2d455604e05ade87d58e609ebd8350967588c71b539445
for daily/2026-11-04-living-world-survival-implementation. Archive start refreshed
2212; run refresh.mjs at eventual turn end. Historical checkpoints below.

# Active survival continuation — dirty rules128, main2fdf0ea

Still implementing the owner's entire seven-family programme, not complete.
126 remains last commit. 127 immutable is now captured/passing before128:
`tests/v127_continuation.expected.json`, digest9100b98c82e47eed8221a9d2ba8c51070e297167d32d5fc855429ac466e8b39a.
Do not rewrite126/127 references.127 added dated trap ground + manufacture gate.
Fresh review found repeated target switching as moving deer replaced the only
eligible ground (check1 forest owner924, ticks39115–39319). Red test confirms.
128 keeps at most one selected known tree beside the new alternative, using
normal scores/review.37tests/5files pass including real placement, exact save,
critical thirst override and126/127 references. UI inspector now distinguishes
trap bodies/absent bodies from net fish;28tests/3files pass after that change.
Final typecheck4/build4 retain only2known review nullable errors; Vite bundle passes.
Browser `trap-ground-rendered-check4`8PASS after inspector wording edit;
`trap_ground_check.mjs` now exists and includes moving-sighting placement.

Frozen sources/runs (do not edit active measured files):
-127 check1 forest+river25 complete: forest11alive/no trap placed, river25alive.
-127 check2 forest25 complete10alive, river25complete27alive. Neither made a trap.
 All exact twins/save/conserve/pure500. Original counter evidence retained.
-127 check2 fern60 session90840, last74400/12alive/no gear yet.
-128 check3 forest25 session90907, river25session35386; last24000.267src snapshot
 predates presentation-only inspector edit. New source file manifest in
 survival_evidence/resume-20261104/trap-ground-check3-source.json.
-127 manufacturing diagnosis session16385 uses new observer-only
 scripts/trap_ground_trace.ts in check2, target48000; output
 survival_evidence/trap-ground-demand-trace. It samples known prey/ground/demand,
 offers and competing decisions. Do not change demand just to force uptake.
-126 check3 fern60 complete:28alive,72fishcaught30collected22directnetmeals,
 13successful repairs,7full-pack partials,2trapplacements0trappedbodies.
 Final126source check4 replay session39702 running to60days; compare final bytes
 to gear-check3/fern-60d when complete. This isolates earlier loan-capacity edit.

Remaining: finish128 ordinary/diagnostic evidence and any justified connection;
Immutable128 now captured/passing (f031d7d052d73eb535a7952b1ab08d780d1a0816b2ac9127d3c616918a30ddb2).
Then focusedcommit, register/Brain checkpoint and continue domestic
species, deferred hide/fat/preserved meat/wool, reserves LAST, final cohorts.
Species/reserve implementation not started. Existing Brain checksum remains
7bd70606b3b0510fff866678949deef50f3f720bfe481315efd56b5cae06c2aa.
Start archive refresh succeeded(total2212). End refresh still required. No push.

# Survival continuation — rules126 checkpoint, 4 November 2026

Net route is observed end-to-end; physical traps work in staged tests but their
ordinary site choice is disconnected from deer sightings. Continue this family
with that bounded connection under127 before animals and reserves. All seven
families remain authorised; no renewed permission or premature completion.

126 immutable digest7387ea83e0806df4aea2bbfc5b7a72873ff9653747849aef5ec1c4879e366d34
is recorded and passes. Never regenerate references122–126. Current source267
files frozen in `living-world-gear-check4`; its forest/river25 replay equals the
observed check3 saves. Focused46/4 and affected60/6 pass. Broad frozen check2
passes2,566tests/423files with31failures exactly matching125,3expected failures;
710.24s. It predates later stock and capacity fixes, covered by focused tests.
Typecheck8/build4 retain only two known nullable review errors. Standalone Vite
bundle passes. Browser current check2 passes7assertions, broken image inspected.

Ongoing frozen `living-world-gear-check3` fern60 observed run: session31481,
`survival_evidence/gear-check3/fern-60d`; do not edit its source. Other126runs
finished. At84k it had net meals, repairs and a placed trap, no reported body;
read final results when done, and use a final-source fern replay if required.
Forest diagnostic `gear-trap-attempt-trace` at36,845 found deer19.6–27.6tiles away.
The preceding36k diagnostic plus this continuation uses current126source; it is
not an every-tick twin run. Retain the original check1 zero-placement evidence.

Remaining: ordinary trap-to-body use, domestic species and wool, reserves LAST,
ordinary hide/fat/preserved-meat links and final comparisons.125core ordinary
meat and124allfibre forms proven; no broader maturity/benefit claim. All75baseline
121draws audited. No push: older unrelated unpublished commits remain below
focused work. Preserve unrelated review files/evidence. One programme matrix:
`docs/SURVIVAL_CAPABILITIES.md`. End-of-turn prompt archive refresh still required.

# Codex integration checkpoint (2026-10-27)

Current integration is rules 31: individual work tastes from `codex/game-inspired-slices`
are combined with main's rules-29 event snapshots and rules-30 layout coordination.
The local rules-28 audit `ad4a2b7` is retained as historical evidence, not a rules-31 audit.
See docs/CIVILISATION_IMPLEMENTATION.md for verification and compatibility details.

All seven local Codex branch tips and their six published counterparts were inspected.
Only work tastes had unique commits; the other six lines were already integrated.
No previous Codex worktree had uncommitted tracked source. The completed smaller
rules-26 validation is archived in civic_evidence/validation-small-v26 with exact provenance.
The stopped full batch and scratch probes stay untouched in their original checkouts.

Old unmarked rules-29 saves are ambiguous between the candidate and main implementations
and must stay with their originating build. They are not silently migrated. New main-29
saves carry explicit generation provenance. Rules 30 and older simulation references are
preserved, including both independent rules-28 references.

Slice 4 (builder completion thoughts) was never implemented and is not part of this
integration. Longer-run work-taste benefit remains unmeasured. This delivery merges
existing work; it does not declare the entire civilisation programme complete.

# Historical main checkpoint (2026-10-25)

Current published main is `d84e5ea`, **rules 28**. The familiar checkout at
`C:/dev/Claude Experiment/living-world` now holds main; the former main checkout
at `C:/Users/RJLoc/.codex/worktrees/home-habitation/living-world` is detached at
the same revision, with its untracked work preserved.

Read [the refreshed civilisation audit](docs/CIVILISATION_AUDIT.md) first.
Fresh verification: 1,200 tests / 144 files and production build pass; bounded
28-person/8-day and 100-person/4-day ordinary runs pass ledger, save continuation
and observer-purity checks. Household survival is demonstrated; civic support and
delivery occur, but no shared project finishes within these short windows.
Next recommended slice: trace one existing voluntary storehouse project through
completion/use or an explained failure before making a behavioural change.

F1–F5 are delivered. The owner-stopped long validation remains stopped; a smaller
rules-26 validation already exists. Rules-29 work in a different worktree is not
part of this main checkpoint. The older instructions below are historical and
must not reopen the old queue or restart the stopped ensemble.

# Historical civilisation continuation (2026-10-24)

Read `docs/CIVILISATION_IMPLEMENTATION.md` for the current programme and
`docs/CIVILISATION_VALIDATION.md` for exact remaining workloads and launch commands.
Working branch: `codex/civilisation-programme`, worktree
`C:/Users/RJLoc/.codex/worktrees/civilisation-programme/living-world`.
Executable checkpoint: **b402f3d**, rules **26**. The following handoff commit changes
documentation only. Verified implementation is integrated into main and pushed.

Versions 20-26 add physical household relocation/founding, actual settlement production,
heard exchange opportunities and physical barter journeys, repeated political support,
transmitted household supper practices, bounded disposable state/indexed history, and
spatial finite mineral geology. Earlier versions 11-19 reconcile the base and establish
township projects, history, local death news, development and technique instruction.

Latest full suite: **1159 tests / 134 files**; typecheck/build, historical goldens and
representative browser scenes pass. Natural smoke results include valid nulls. The full
programme is **not complete**: D12/A, natural C-H and mature-world measurements remain.
No long ensemble is running and the proposed validation checkout has not been created.
F1/F3/F2/F4/F5 remain queued behind that prerequisite, as pinned owner priority requires.

No implementation patch is intentionally pending. Preserve main's untracked
`scripts/_find_moments_rich.ts` and `scripts/_warmth_probe2.ts`, the retired original
checkout's files, the civilisation candidate and the historical inhabitant audit.
The exact continuation record includes a paste-ready prompt. Old notes below are
historical and do not supersede this status or WORKFLOW.md.

# Living World Repository Handoff

Updated: 2026-10-23

Standing owner workflow: [WORKFLOW.md](WORKFLOW.md). Both Codex and Claude must follow
it: no mandatory PR, second reviewer or repeat-approval loop. Older process instructions
in historical sections below do not override it.

## Branch cleanup — 2026-10-23

Two useful historical candidates are integrated: paired lab reporting (with missing-metric regression coverage) and the three-winter report, explicitly labelled historical. Six other branches were already incorporated. Thirteen conflicting lines are retired from active development with their unique work preserved; this is not a claim that all their features shipped. See [BRANCH_LIFECYCLE.md](docs/BRANCH_LIFECYCLE.md) for exact tips, dispositions, PR closure list and validation.

## Current product direction

Owner decision, 2026-10-22: Living World is developed as an **autonomous world game with few
direct controls**, supported by the causal, deterministic simulation. The brief is
[PRODUCT_VISION.md](PRODUCT_VISION.md), and both `AGENTS.md` and `CLAUDE.md` point at it. In
short: people live their own lives, and the viewer follows individuals, households, relationships,
places and changes over time; the simulation is the foundation and the observable experience is
the product. Prefer completing one coherent situation over adding several disconnected systems,
and ask of any behavioural change what a viewer will notice, understand or care about afterwards.

That decision adds no intervention controls, no scores and no quests, and it changed no
simulation behaviour, default, parameter or baseline. How the different kinds of claim are
evidenced — correctness, physical coherence, readability, watchability, aggregate effectiveness —
is in [docs/DEVELOPMENT_POLICY.md](docs/DEVELOPMENT_POLICY.md), "Matching evidence to the claim".
Sections below that frame the project as a simulation only are superseded on that point alone;
their measurements, review verdicts and status records stand exactly as written.

## Current main — full-pack site courier recovery

Rules version 8 recovers the missing part of `claude/courier-promise`: a willing helper who already carries construction materials can promise to haul them to a remembered site when the requester has no pack room. Existing conversation, commitment, haul, ledger and inspector paths are reused. Older worlds retain their rules. Source comparison, regression evidence and limits: [COURIER_RECOVERY.md](docs/COURIER_RECOVERY.md).

## Previous main — from needing a home to living in one

Rules version 7. One complete, watchable situation: a household recognises it has no proper home, lays a site out, its
members FETCH the materials on purpose, build, take ownership and move in — or meet an understandable reason they cannot
finish. Contract, evidence and limits: [HOUSEHOLD_HOME.md](docs/HOUSEHOLD_HOME.md).

**What already existed, and what was missing.** Most of the chain was built and correct: reading the household's shelter
from what its members can see, laying out a lean-to or a hut, one site per household with no duplicate from a decision
race, doing the work, `hh.homeId` on completion, and physically living in it (habitation, version 3). The gap was in the
middle — delivery was only ever OPPORTUNISTIC. `optSites` offered to carry material to a site only when somebody already
happened to be carrying what it needed; nothing made anybody go and get it. On seed `river` before the change, of 8 hut
sites laid out, 6 finished, one sat untouched for five days and was abandoned, and two stood waiting at the end.

**What changed.** `src/sim/shelter.ts` plus a `shelter` plan kind in `src/sim/intent.ts`: an ordinary private plan of the
same shape as mending a roof, reading only the person's own beliefs, re-aiming at what the site was last seen to need, one
material and one trip's worth at a time. The gathering, the carrying, the building, the ownership and the habitation are
all the existing ones. Lab switch `rich-no-shelter` removes only the plan.

**What a viewer can now follow.** The card's Home line says where the household lives and, when it has none, the rule
stopping it (*"Home: lean-to (77% sound) — the household has only 2 food to hand and wants 6 before starting a hut"*).
The plan line says the goal, the step, how much this person has actually carried there, and why they took it on. The site
card says what it is waiting for; the home card names the owner and lists who is indoors; the feed records the finish.

**Compatibility.** Everything is gated on `runsRulesVersion(world, 7)` and rich dynamics. The recorded "why not building"
explanation is gated on the same version, because the decision record is serialized and deep-hashed — it changes saved
state even though it changes nothing anybody does. Version-6 continuation is pinned by `tests/v6_continuation.expected.json`,
recorded from `b050816` before any of this was written. The save format is unchanged; `Intention.kind` gains `'shelter'`
and `stepKind` gains `'deliver'`, both additive. Goldens and the version-1/2/3/4/6 references were not re-recorded.

**Verification.** `npx --no-install vitest run tests/household_home.test.ts` 48 tests; `npx --no-install vitest run` 944
tests in 90 files; `npm run build`; `npx --no-install vite-node scripts/golden.ts` all fingerprints match;
`git diff --check`. All passed. Three defects were found and fixed with tests during the work: the plan's own material
reservation hid the material from its own delivery; a timed-out plan reported "it still wants nothing" because it read the
pack rather than the site; and the new explanations changed the deep fingerprint of every world including authored ones.
Page check `node scripts/browser/household_home_check.mjs http://127.0.0.1:5287/ home_evidence/page` — 16/16, on an
ordinary autonomous world, with the screenshots looked at and not only asserted on.

**The retained example.** `home_evidence/river.json` from `scripts/household_home.ts` (seed `river`, Normal, arrivals off,
ticks 0–19,200). The Willow household laid out a hut at 5179; Ivy took a plan on the same tick; she and Basil fetched the
wood and the stone; the hut became their home at 7709; Ivy's plan ended DONE, *"the household has a hut, and they carried 4
of its materials"*; Basil's ended *"the household got a hut without their carrying anything to it"*; all four slept inside
from 8425 on. Saved and reloaded byte-identical.

**What is NOT claimed.** Four seeds at 8 days, with the switch on and off, housed 27 of 46 households against 28 of 45 —
a wash, and no aggregate housing or survival benefit is claimed or was found. The claim is that the situation is
followable and deliberate: 48 plans, 28 finished, 127 units of material carried to home sites on purpose, each with a
recorded reason for how it ended. No ensemble was run; no acceptance baseline was recorded or replaced.

**Unresolved.** A single-member household can never build a hut (`optPlanBuild` requires `members >= 2`, a rule that
predates habitation). Four of twelve households on seed `river` stay in open lean-tos because of it. This change only
makes that rule visible; changing it is a behavioural question for a separate task.

## Previous main — fatal injuries stay fatal

Rules version 6. When a person is already at zero health, `stepPerson` settles death through
the existing `killPerson` path before `updateNeeds` can add passive recovery. New product
worlds use version 6. Versions 1–4 keep the old order. A version-4 continuation reference
was captured from main `0d39350` before the repair and is left unchanged
(`tests/v4_continuation.expected.json`, `scripts/v4_reference.ts`).

Version 5 is not this build. The unintegrated wolf-habitation-integration candidate used that
number for a mood-ranking correction. Those saves are refused. They are not run as version 4
or as version 6, and the mood-ranking change was not imported.

The lab switch is `rich-no-fatal-hold`. It restores only the old order. Wolf damage, healing
rates, defence, habitation and preparation stay, and the switch does nothing below version 6.

The defect, as it stood on version 4: `updateWildlife` runs before people. A bite can set
health to zero and `deathCause` to `wolf attack`. `stepPerson` then ran `updateNeeds` before
the death check. With hunger, thirst and warmth high enough, passive recovery put health back
above zero, so the person lived, acted and could be saved that way. The danger event could
already say the bite was fatal. A staged regression through `stepWorld` reproduced that before
the repair: the fatal line was present and the person was still in the live registry.

Death still happens once. The same cleanup releases the activity, reservations and indoor
occupancy. Later ticks and a save/load continuation do not bring the person back or write the
death again. People who stay above zero still receive ordinary recovery. Indoor protection is
unchanged: the cleanup fixture does not make a wolf bite someone indoors.

No village-survival claim is made from the regression or from the staged page. No acceptance
baseline was replaced. Household-led home construction was not started.

Verification on this repair, before integration:

- Before the fix, `npx --no-install vitest run tests/fatal_injury.test.ts` failed 3 and passed 2.
  The fatal bite wrote "A wolf bit Ada fatally." and left Ada alive. The nonfatal recovery and the
  version-4 order passed.
- After the fix, the same command passed 7 tests.
- `npm test`: 898 tests in 88 files passed, including the version-1, version-2, version-3 and
  version-4 continuations and the historical goldens inside the suite.
- `npm run build`: TypeScript and the production build passed.
- `npx --no-install vite-node scripts/golden.ts`: all historical fingerprints matched.
- `node scripts/browser/fatal_injury_check.mjs http://127.0.0.1:5288/ fatal_evidence`: 5/5.
  The staged page showed "Ada has died (wolf attack), aged 25." in the inspector and once in the
  feed, and the same single record after save/load and 30 further ticks. Labelled STAGED.

## Previous main — wolf defence integrated

The owner fast-forwarded `main` to `9a082d6` and pushed it normally, integrating
`codex/wolf-defence-integration` from base `a5530cf`. Active defence with habitation is
rules version 4. Implementation: `57e3047`; preserved version-3 reference: `6163c86`.
Main checkout: `C:\Users\RJLoc\.codex\worktrees\home-habitation\living-world`.
Full contract, review repairs and evidence: [WOLF_DEFENCE.md](docs/WOLF_DEFENCE.md).
Durable review record: [WOLF_DEFENCE_REVIEW.md](docs/WOLF_DEFENCE_REVIEW.md), including the
original request-changes verdict, both blockers, their fixes and regression evidence.
Both recorded blockers are resolved with regression evidence. Per the owner's 2026-10-21
workflow decision, no further independent review or PR approval is required by project
policy.

[PR #20](https://github.com/lochheadr92-creator/living-world/pull/20) is closed without a
GitHub PR merge. The code is integrated through the direct fast-forward of `main`;
GitHub's `merged: false` describes the PR, not absence of the code from main.
Local main and origin/main were verified at `9a082d6` on 2026-10-21.

Prior implementation verification: 887 tests / 86 files, build/typecheck and historical goldens passed. Browser checks: defence
5/5, habitation 10/10, autonomous saved scene 4/4. Sofia autonomously made a spear and later
went to protect Abel; the wolf left before an attempt, correctly receiving no defence credit.
Staged encounters resolve both success and failure. No village-wide survival benefit is claimed.

The original wolf checkout is untouched. The separate mixed wolf/mood candidate is preserved,
with the two review fixes and regression tests added there; its mood correction is not shipped
in main. Do not exchange experimental wolf-v3 saves with habitation-v3 saves.
No independent approval or new acceptance baseline is claimed. The inherited main status below
describes the earlier preparation/habitation integration. This current section supersedes
historical unmerged-status statements below.

## Integrated main — read this before the inherited handoff

On 2026-10-19 the owner explicitly requested the merge. Household preparation was merged at
`ac7318d`, followed by habitation at `8184f92`, and `main` was pushed normally. No conflicts,
force push, history rewrite or protection override occurred. The merge result's Git tree is
identical to `codex/home-habitation` at `9e41653`.

Verification rerun on `8184f92`: 818 tests in 81 files passed; `npm run build` (including
TypeScript checking) passed; historical golden fingerprints matched; `git diff --check` passed.
The prior browser checks below cover this identical source tree and were not rerun for the merge.

GitHub confirms PR #18 merged. PR #19 remains open/draft against `claude/household-preparation-v2`,
although all its commits are ancestors of pushed `main`. Its GitHub metadata still needs updating
to reflect integration; available GitHub connector calls were unavailable and the browser was
signed out. No independent approval is claimed. The stale legacy ensemble baseline remains a
known limitation; no baseline was replaced or expensive ensemble launched.

The integration checkout is `C:\Users\RJLoc\.codex\worktrees\home-habitation\living-world`, on
`main`. The original checkout and its separate wolf-defence branch were left untouched.

### Historical habitation implementation record

This isolated checkout is `codex/home-habitation`, based on `1a13408` from the household-preparation
branch. It implements actual hut/house entry, indoor sleep/rest/refuge, exit, saved occupancy,
indoor protection, and occupant inspection. Full contract and verification: `docs/HABITATION.md`.

Implementation commit: `701f580`; pre-feature version-2 reference: `780a593`. Both are pushed.
Draft [PR #19](https://github.com/lochheadr92-creator/living-world/pull/19) is open against
`claude/household-preparation-v2` to isolate the habitation diff. It is not merged or approved.

The owner chose **habitation first, then wolf defence**. Here rules version 3 means habitation.
The uncommitted wolf-defence work in the original checkout was not copied or modified. Its rules
version must be reconciled as a later generation before integration; two unrelated version-3
implementations must not exchange saves.

818 tests passed, historical goldens and both old-version continuation references passed.
Browser results: habitation 10/10, current-world 15/15, household preparation 19/19.
In the autonomous `river` example, Mira finished hut 2827 at tick 3349 and Emre entered it
at tick 3516. This branch adds habitation, not a guarantee that everybody builds a house.

At the time of the implementation record below, no merge or baseline refresh had been performed.
The integration status above supersedes those older status claims. See `docs/HABITATION.md` for
limits, screenshots and launch commands.

A continuation guide for this checkout. The repository and the current Git state are authoritative; this is a map, not a
replacement for them.

## Where things stand

**Household food preparation is built, measured and on a pushed branch.** The previous pass (Stage 0 rules versioning and
the CLI rules-version fix) is merged into `main` and is not reopened below.

- Checkout: `C:\dev\Claude Experiment\living-world`, branch `claude/household-preparation-v2`, cut from `main` at `5b7a941`.
- Integration branch: `main` at `5b7a941`, which carries the merge `e81aad4` (pull request #17) and everything before it.
- The working tree is clean. One ignored artifact directory, `gates_rich_out/`, remains ignored (`.gitignore`).
- **Pull request [#18](https://github.com/lochheadr92-creator/living-world/pull/18)** is open against `main`. Nothing
  is merged: `main` is still at `5b7a941`. See "Integration" at the end of this file for the two open acceptance
  conditions.

## What inhabitants can now do

An adult may decide to put a **modest food reserve** into their own household's home store, and then do it with the actions
that already existed: gather food, carry it home, put it down. Nothing new was built underneath - the decision is an ordinary
private plan (`Intention`, kind `stock`), the work is the ordinary stockpile forage and the ordinary deposit, and the reserve
is ordinary food in the ordinary store, which spoils and is eaten like any other.

This is **rules version 2**. A world running version 1, and an unversioned world, have none of it.

### The two cues, and the one thing they may not do

* **Hardship** - what the person can actually see of their own household: the home store as they remember it, plus what they
  are carrying, coming to under half a day's eating for its members; or their own memory of having gone hungry within the
  last day (`mood.ts`'s `hungry` thought).
* **Season** - winter, the one hardship here that is not a roll: the last 4 days of every 12-day year, the same days each
  year, announced when it arrives and when it goes. The window is the 2 days before it.

**Nothing reads the lean season.** It is a one-in-five daily roll, unannounced, and `src/sim/provision.ts` touches neither
`world.hardship` nor any draw behind it. A lean season reaches people only through the hardship cue, once their store has
actually emptied. Hardship is tested first, so `season` means the narrow thing: nothing visibly wrong, and winter close. The
cue is recorded on the plan so a measurement can tell anticipation from reaction.

### The size of it

Hunger falls 0.03 a tick and a day is 2400 ticks, so 72 hunger a day; the foods people eat are worth 12 to 28 and average
about 18; 72/18 = 4 units a person a day, and a measured Large run gave 3.8. Target: **one day's eating per member** (4
each), capped at **12** (three members' worth, and exactly a lean-to's capacity, so the poorest household can hold one),
clipped again by the room the person believes their home has. It is a cushion of about one day; winter is four days.
**Nothing here prevents starvation and nothing claims to.**

## The reproducible example, in the running app

Autonomous, not staged: nothing is placed, nobody's option is picked.

```
npx vite --port 5184
node scripts/browser/preparation_check.mjs "http://127.0.0.1:5184/"      ->  19/19 passed
```

Seed `river`, profile `normal`, arrivals off, the page's own clock STOPPED and the world advanced by an exact number of
ticks (so nothing races requestAnimationFrame and the tick numbers mean something).

* At tick 2567, **Ben of household 1109** takes on 8 units because "there is next to nothing at home to fall back on"
  (cue `hardship`). His step is gathering.
* By about tick 5000 he has put **3 units into his own home, building 1110**, which held 0 when the example started. The card
  reads: *"Put 8 units of food by for the household. Step: gather food to put by (5 more) - under way (Gathering wild
  grain). 3 of 8 units put by so far. Why: there is next to nothing at home to fall back on."*
* Another household's preparation reaches a verdict in the same window: *"done: put 5 units of food by; the store holds 13"*.
* Ten preparations then survive a save and a load with their cue, target and units intact (tick 5567, state `92fe5e72`), and
  the world comes back as rules version 2.
* A version-1 world made in the same page forms **0** preparations while its 77 other plans carry on; a world started after
  it is version 2 again; and loading the version-1 save puts it back on version 1, not on the latest.

The check asserts behaviour and displayed text only. A headless Chrome renders in software: **nothing here says anything
about how any of it looks.**

## What was measured, including what was not shown

24 seeds, profile `normal`, rules version 2, forked at day 0. Arms: `control` (preparation on), `rich-no-stock` (preparation
off and nothing else), `nudge:1` and `nudge:2` (the noise floor). The question, metrics, window and how a result would be
read were written into `prep_out8/RUN.md` **before** either run. Full-precision paired differences are in
`prep_out8/PAIRED.md`, because the report rounds to one decimal and two of these numbers live below that.

| | control | no preparation | diff | 95% CI | of 24 seeds |
|---|---|---|---|---|---|
| preparations taken on (8 d) | 37.3 | 0 | -37.3 | [-39.6, -35.1] | 24 lower |
| from the season / from hardship | 6.3 / 31.0 | 0 / 0 | | | |
| finished / given up (8 d) | 16.0 / 13.5 | 0 / 0 | | | |
| units really put into home stores (8 d) | 166.5 | 0 | -166.5 | [-183.2, -149.7] | 24 lower |
| **home-store food per person entering winter** | **1.62** | **0.83** | **-0.80** | **[-1.05, -0.54]** | **22 lower** |
| the same after winter (12 d) | 0.73 | 0.29 | -0.44 | [-0.66, -0.22] | 18 lower |
| hunger exposure (8 d) | 0.00303 | 0.00261 | -0.00043 | [-0.00156, +0.00071] | 8 lower, 8 higher |
| hunger exposure (12 d) | 0.00973 | 0.00882 | -0.00091 | [-0.00355, +0.00173] | 11 lower, 12 higher |
| person-days preparing (8 d / 12 d) | 8.1 / 12.4 | 0 / 0 | | | 24 lower |
| tool and repair projects STARTED (12 d) | 86.0 | 101.3 | +15.3 | [+12.2, +18.4] | 24 higher |

**Reading the table.** Every `diff` is **the arm minus `control`**, and `control` is the run WITH preparation enabled.
So `homeFoodPerPerson -0.80` means the arm with preparation removed ends with 0.80 units a head LESS - that is,
preparation raises it. `projectsAdopted +15.3` means removing preparation RAISES project starts by 15.3 - that is,
preparation costs that many.

Nudge floor: 0.04-0.16 for `homeFoodPerPerson`, 0.00024-0.00158 for `hungerExposure`.

**Established.** The mechanism runs on its own, by both cues, and roughly doubles the food within a household's reach when
winter arrives (1.62 units a head against 0.83).

**Not established.** Any welfare benefit. Hunger exposure, `belowCritical`, mean hunger, deaths and mood are all
indistinguishable from chance in both windows.

Why it was not detected is **not** established by these runs. Several explanations are live and none has been tested
against the others: the reserve may be too small to matter; it may arrive too late, or be eaten before it is needed; a
household may not reach its own store at the moment it is hungry; the time it takes from other work may offset what it
gains; the baseline hardship in these runs may be low enough that there was little to improve; or the effect may be real
but smaller than 24 seeds can resolve. Saying which would need a test that separates them. Until then "no welfare
benefit was demonstrated" is the whole of it - which is not the same as "the feature does nothing": it demonstrably
moves food, and that is reported above.

**The cost, measured.** About 3.6% of all person-time over eight days (3.8% over twelve), and 15.3 fewer tool and repair
projects *started* over 12 days, in every one of the 24 seeds. Projects finished and tools held did not move.

### The one run that is outstanding

Whether a village that is actually short would benefit. The `town` profile (100 people in one camp, which has a real famine
in it) is where that could be answered. It is beyond the budget for a run made inside a session, so it is left here as a
command. About 20 minutes on 24 cores; re-running it resumes unfinished seeds.

```
cd "C:\dev\Claude Experiment\living-world"
```

```
git pull
```

```
node scripts/lab.mjs --out prep_town_out --seeds 24 --fork 0 --days 12 --profile town --branches rich-no-stock,nudge:1
```

```
npx vite-node scripts/lab_report.ts -- prep_town_out
```

Paste back only `prep_town_out\report.txt`, never the progress lines. Read `hungerExposure`, `deaths`, `belowCritical` and
`homeFoodPerPerson` for `rich-no-stock` against the nudge arm, remembering that each figure is the arm minus the
control.

What it can and cannot settle. A resolved difference in a village that is genuinely short would be evidence of welfare
benefit under hardship. A second null would **not** show that the reserve is too small: it would be consistent with
that, and equally with timing, access, the work it displaces, or an effect below what 24 seeds resolve. Which of those
it is would need a test that separates them - varying the reserve size alone, or the window alone, with everything else
held - and no such test has been run. Do not read a second null as a mandate to make the reserve bigger.

## How version 1 is proved not to have changed

A test that checks the version LABEL is not enough: a gate that leaked would keep the label and change the world. So, from
the revision **before** version 2 was written, `scripts/v1_reference.ts --write` recorded
`tests/v1_continuation.expected.json`: two rich worlds stamped `rulesVersion: 1`, run, written out and read back through the
real save path, then continued, with the compact and deep hashes **and** plain counts (people alive, live plans by kind,
food believed to be in home stores, food actually in them) at each checkpoint. One case (`prewinter`, seed `river`, to tick
18000) sits in the window before winter, which is exactly where a seasonal behaviour would be adopted.

`tests/v1_continuation.test.ts` compares against it on every test run, and one of its assertions is that the only plan kinds
in the reference are `night`, `repair` and `tool`.

**Re-recording that file to make a change pass would delete the only evidence of the leak.** A failure there means the gate
is wrong.

## The acceptance gate

AGENTS.md names the ensemble gates as the acceptance test for a behavioural change. The full argument and every number
is in `gate_v2_unversioned/FINDING.md`; in short:

* **No recorded gate can accept a version-2 change.** `scripts/gates.ts` refuses a comparison across rules versions, and
  both baselines are unversioned (`docs/gates.json`, authored; `docs/gates-rich.json`, rich). A version-2 run is refused
  with "rules version unversioned vs 2" - the guard working. Recording a version-2 baseline from this candidate and
  then checking the candidate against it would be comparing it with itself, so that was not done.
* **The gate that does apply was run**: an unversioned rich Large world, 24 seeds, 12 days, against
  `docs/gates-rich.json`. Ten of eleven gated metrics pass. `tools` FAILS - 140.8 against the band [143.9, 178.7],
  recorded 161.3.
* **That failure belongs to `main`.** The same ensemble and gate on `main` (`5b7a941`), run in a temporary worktree now
  removed and kept under `gate_v2_unversioned/main_5b7a941/`, fails identically: 140.8, same band, every other line the
  same to the digit. `docs/gates-rich.json` was recorded 56 commits before `main` (`e8118fe`) and is stale. It is
  deliberately NOT re-recorded on this branch.
* **The same run is new preservation evidence.** All 24 seeds have identical final hashes on the two revisions and every
  metric both record is equal on all 24; the only difference is the ten metric fields this branch adds. An unversioned
  rich Large world at 12 days is therefore bit-for-bit unchanged - a profile and duration neither the goldens nor the
  continuation reference reaches.

**What acceptance rests on instead**, since the gate cannot be applied to a version-2 run: the older generation provably
unchanged (goldens, continuation reference, the Large ensemble above); the suite; the preparation ensembles with their
ablation and nudge floor; the two browser checks.

**Two baselines to record after merge**, and explicitly not as evidence for it - each about 4 minutes on 24 cores, and
recording asserts nothing:

```
node scripts/lab.mjs --out gates_rich_refresh --seeds 24 --fork 0 --days 12 --profile large --dynamics rich-unversioned --branches none
```

```
npx vite-node scripts/gates.ts -- gates_rich_refresh --record --file docs/gates-rich.json --force
```

```
node scripts/lab.mjs --out gates_v2_out --seeds 24 --fork 0 --days 12 --profile large --branches none
```

```
npx vite-node scripts/gates.ts -- gates_v2_out --record --file docs/gates-v2.json
```

The first replaces a baseline that is stale and already failing; the second gives version 2 a reference so the NEXT
behavioural change can be gated.

## Review of the implementation

Self-review. **No independent reviewer has seen this branch**, and nothing below should be read as if one had.

A first pass over the completed diff found one real defect (`9cfad02`): the step threshold counted all six foods while
`optDepositFood` stores only four, so somebody carrying five units of meat settled on a trip home the engine never
offers and stayed on it until the deadline. Fixed with a test; both ensembles re-run; 23 of 24 seeds byte-identical.

A second pass over the areas the closeout brief names:

| area | verdict | evidence |
|---|---|---|
| version-1 and unversioned preservation | PASS | goldens; `tests/v1_continuation.test.ts`; 24/24 Large unversioned seeds identical to `main` |
| food ownership | PASS | `provision.ts` filters `b.hh !== p.hhId`; a test puts a neighbour's larger, fuller `house` next door and the plan still targets her own hut |
| storage access | PASS | `facilities.ts mayDeposit` is true for a home; the deposit is the ordinary option, matched by its own key |
| physical delivery | PASS | `creditStocked` runs in the deposit handler as each kind transfers, so only food that moved is credited |
| contribution vs claimed completion | PASS | `done` needs `inStore >= want` AND `worked > 0`; otherwise "came to hold N without their doing" |
| judged on belief, not the world | PASS | a test fills her store while she is away; the plan stays active until she has seen it |
| urgent-need interruption | PASS | set aside with a reason; tested |
| stale plans, impossible actions | PASS, with one limit | the deadline always ends it; the "gave up after 3 tries" path needs a `stepTarget`, which a `forage` step has not, so a plan with no food anywhere waits out its deadline (1-2 days) rather than ending sooner |
| several members, no double counting | PASS | the target is a LEVEL the store should reach, not a quota each owes; tested |
| save/load, deterministic continuation | PASS | in-process and in the page (10 preparations restored with cue, target, units) |
| lab-switch isolation, incl. forks with live plans | PASS | `runBranch` restores in a `finally`; a live plan at a fork ends with "no longer part of these rules" |
| inspector claims match recorded state | PASS, after a fix | the browser check compares the card's figure with the world's; `76dbfdf` fixes "1 units" to "1 unit" |

Two commits came out of it: `76dbfdf` and `26a6d18`. Each new test was confirmed to FAIL when its rule is removed.

## Verification

All run on this branch at `26a6d18`, the branch head when they were run.

| | result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 79 files, **793 tests**, all passing |
| `npm run build` | clean |
| `git diff --check` | clean |
| `npx vite-node scripts/golden.ts` | all golden fingerprints match (not re-recorded) |
| `npx vite-node scripts/v1_reference.ts` | version-1 continuation unchanged |
| `node scripts/browser/current_world_check.mjs http://127.0.0.1:5186/` | 15/15 |
| `node scripts/browser/preparation_check.mjs http://127.0.0.1:5186/` | 19/19 |
| `npx vite-node scripts/gates.ts -- gate_v2_unversioned --file docs/gates-rich.json` | 10 of 11 pass; `tools` fails identically on `main` |

Both ensembles were re-run at `9cfad02` into emptied directories, because `9cfad02` changes behaviour. The earlier pair,
made at `83c770e`, is **not** in the working tree - one directory name must not hold two sets of numbers - but it is
**retained in Git history and retrievable**, which is where it should be looked for rather than being treated as lost:

```
git show 3c71703:prep_out8/report.txt
git show 3c71703 --stat -- prep_out8 prep_out12
git checkout 3c71703 -- prep_out8 prep_out12     # only into a scratch checkout, never over the current ones
```

All 53 files of that earlier pair are at `3c71703`. Reusing the directory NAME rather than taking a new one was a
departure from the task's own rule and is recorded as such here; it was not repaired by re-running, because re-running
to tidy history would have cost more evidence than it bought. Every future run after a source change takes a new
directory. The difference between the two pairs was small (the food effect moved from -0.78 to -0.80) and changed no
conclusion.

The acceptance criteria are `tests/household_preparation.test.ts`, one `describe` group per criterion (43 tests):
1 evidence that may start a preparation, 2 situations that may not, 3 the action is an ordinary one and really moves food,
4 completion is about the food and not the label, 5 urgency/absence/staleness end it safely, 6 determinism and save/load,
7 version-1 and unversioned worlds, 8 the lab switch, 9 the app and the command line agree. A tenth group holds the reserve
arithmetic to the documented numbers.

## Limits worth carrying forward

These stand. None is fixed by this pass.

- **Household preparation shows no measured welfare benefit.** It moves food and costs time; that is all the measurement
  supports. Do not describe it as preventing starvation.
- The measurement is on the **Normal** profile only. Whether a village under real pressure would benefit is untested;
  the `town` run above is the missing evidence. Why no benefit showed on Normal is also untested - reserve size, timing,
  access, displaced work, low baseline hardship and plain statistical power are all live explanations and none has been
  separated from the others.
- The Stage 4 pilots are **one seed, one day** each. Days 4, 8 and 12 are missing, not zero; `hall` and `ask_info` were never
  exercised; zero cross-camp contact means unexercised in that window, nothing more.
- Stage 4 known-cohort coverage is low: the plan's day-0 cohort rule leaves 38 of 100 people unknown in a Large world, so
  every cross-camp figure describes about 37% of the data. Whether to keep that rule is a decision to take **before** an
  ensemble.
- No Stage 4 ensemble has been run. `rich-no-transmission` is unwritten.
- Apprenticeship is built but barely exercised (one start, no graduations across four 12-day worlds).
- Rules versions 1 and 2 establish supported baselines. They do **not** reconstruct unidentified historical rich releases and
  do not prove compatibility with any of them. What IS verified across revisions: saves produced by pre-merge `main`
  (`8a2b6e7`) load into this build, keep their dynamics, stay explicitly unversioned, run on, and survive a re-save with a
  matching hash.
- The `rich` lab intervention switches a legacy world to rich dynamics at the fork but leaves it **unversioned**, which is the
  unversioned policy working as intended. Such an arm therefore never exercises version-2 behaviour.

## Map

- `docs/DEVELOPMENT_POLICY.md` - one evolving simulation, how a change becomes standard, lab defaults, rules versions 1 and 2,
  and how a version is proved not to have leaked.
- `docs/EMERGENCE.md` - staged plan, stop rules, every measured result, including this pass.
- `docs/RICH_WORLD.md` - the rich systems and what each one actually does, including household food preparation.
- `docs/AUTONOMY.md` - the R1-R14 requirement matrix with current status.
- `docs/SCALING.md` - profiles, rule sets, the rich-only town corrections.
- `src/sim/provision.ts`, `src/sim/rulesversion.ts`, `src/sim/transmission.ts`, `scripts/stage4.ts` - newest modules.
- Experiment outputs in `prep_out8/`, `prep_out12/`, `learn_out/`, `noask_out/`, `town_out/`, `stage4_pilot_out/`,
  `stage4_pilot2_out/`.

## Commits on this branch

| commit | what |
|---|---|
| `2a4a704` | A version-1 continuation reference, recorded before version 2 exists |
| `91705f1` | A lab-guard test said "the current rules version is 1" in numbers |
| `6819a2a` | Rules version 2: a household puts a little food by, for a bad day or for winter |
| `9018d65` | The lab can take food preparation out and leave everything else in |
| `83c770e` | The lab can see what food preparation does, and what it costs |
| `3c71703` | The measurement: the mechanism works, the food is real, the benefit is not shown |
| `7d7197c` | A viewer can follow a preparation from the evidence to the food, in the page |
| `4e629c9` | Document what was built, what was measured and what was not shown |
| `9cfad02` | Review of the diff: a reserve could settle on a trip home it could not make |
| `335d91d` | The measurement re-run at `9cfad02`, and the documented numbers brought to it |
| `72640d7` | The PR blocker and the prepared body, written down |
| `76dbfdf` | Review of the inspector text: a person who put one unit by was told "1 units" |
| `26a6d18` | Discriminating tests for two review areas: whose store it is, and whose knowledge |
| `571a404` | The acceptance gate resolved: none can accept version 2, and the one that runs already failed on `main` |
| `eaca9f4` | Claims the experiments do not support, taken back out |
| `e870b3c` | The prepared body lists every commit it describes |
| (last) | Pull request #18 opened; the integration state recorded |

`2a4a704` is the only commit without the required "Existing modules touched, and why" line: it touched no existing modules
(four new files), and it was not amended because rewriting history is a hard rail for this task.

## Integration: pull request #18, open and NOT merged

**<https://github.com/lochheadr92-creator/living-world/pull/18>** - open, not a draft, head
`claude/household-preparation-v2`, base `main`, 130 files. `main` is still at `5b7a941` and contains **none** of this
work.

The authentication that blocked the previous session has since been completed by the owner, and the pull request was
opened from this one. `PULL_REQUEST.md` is the body that was posted; it is kept for the record rather than deleted, and
editing it now changes nothing, because the GitKraken tool can create a pull request but not edit one.

### Why it is not merged

Two acceptance conditions are open. Neither is a defect in the change.

1. **No independent review.** `approved: false` on #18. Everything in the "Review of the implementation" section above
   is SELF-review, and must not be read as anything else. The repository's own workflow, and the development
   environment's policy, both expect a human review before a merge; the previous pass's merge was refused here for
   exactly that reason and was done by the owner. No attempt was made to route around it.
2. **The one applicable ensemble gate fails** - `tools`, 140.8 against the band [143.9, 178.7]. It fails **identically
   on `main`**, which is evidenced seed by seed above, so it is not caused by this branch; but a failing gate is a
   failing gate, and calling it satisfied would be untrue. Fixing it means refreshing a stale baseline, which belongs
   to merged `main`, not to a candidate.

### The smallest next actions, in order

1. Review #18 and approve or request changes.
2. Merge it through the normal workflow.
3. On merged `main`, refresh the stale baseline and record one for version 2 (commands in
   `gate_v2_unversioned/FINDING.md`). Recording asserts nothing; it gives the next change something to be gated
   against.
4. Optionally, the `town` ensemble above - a separately scoped investigation into welfare under real hardship, not a
   correctness condition for this merge.

After a merge, verify on the merge commit itself rather than on this branch, and correct this file to the real state.

## Next

The bounded preparation feature is finished and closed out. The next actions are the four above, in order. Beyond them,
the proposed stages in `docs/EMERGENCE.md` remain a backlog; nothing here commits to them, and the count of "fifteen"
written here was wrong (that file proposes stages 0-5). Current direction prefers completing one bounded, watchable
situation over picking up disconnected mechanics from that list; see `PRODUCT_VISION.md`.
