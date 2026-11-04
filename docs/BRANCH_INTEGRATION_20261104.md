# Branch integration and older-work preservation — 4 November 2026

Owner instruction: stop after the current survival section, commit/push outstanding work, include older work, and review every branch for merging. Capability development remains stopped at rules 133.

## Outcome

Review started from `a916ec028b2e373226f1593602a9d2d748e1a27b`. Fetched and reviewed **82 references / 63 distinct tips**, including **30 tips outside main ancestry**. **11 of those tips are now included in main** through ten merge commits; **19 remain preserved historical or deferred tips**. All 21 previously unpublished local branches were pushed and verified at their original hashes; no branch was overwritten or deleted.

The preservation commit is `c188ac3ee8b9ecb7a2b8116c96830f59c35d931f`, published as `archive/older-work-20261104`. It captures older main-checkout material plus outstanding project files from sibling worktrees. **71 worktree manifests, 7,709 file references and 3,446 deduplicated compressed objects** preserve working contents, separate staged contents, deletions, source revisions and original paths. Every recorded file was verified against the committed bytes; zero mismatches. Dependencies, build outputs, Git internals and local assistant configuration/attachments are excluded and listed. Original sibling checkouts remain untouched and can still appear dirty.

## What changed on main

- Imported the historical Odette/inhabitant audit and trace runner, the historical rules-33 floorplan, the death-tally observer, and the seasonal diagnostic record. The trace explicitly identifies its legacy settings.
- Integrated the matching technical-research guidance from both DeepSeek branches without duplicating it or changing WORKFLOW.md.
- Joined the already-represented rules-109 performance, rules-113 continuation, rules-114 hungry-harvest and Stage-1 integrity histories. Reviewed conflict resolutions retain current code; these four history joins make no file-content change.
- Fixed two archived review probes only for null safety: capture the known household ID before a callback, and fail explicitly if an inspector view is absent. No assertion or outcome threshold changed. Their original bytes remain in the preservation commit.
- Corrected the imported death-tally conception funnel to include the actual global population cap and added an optional exact unobserved-twin check. Added actual settings to its JSON.
- Corrected the seasonal record’s unsupported inference: aggregate consumption/spoilage is not a trace of deposited reserve food. Original findings remain visibly qualified rather than rewritten into a current benefit claim.

**No `src/` files, simulation rules, save schema, immutable reference expectations, or survival acceptance criteria changed in this closeout.**

## Verification

- `npm run typecheck`: PASS.
- `npm run build`: PASS, with the existing large-bundle advisory.
- Eight focused regression files: 16 tests PASS (provenance, tool transfers, flood records, cart spill, lab exits, upgrade-field deletion, observer purity, rules-132 continuation).
- Rules-133 continuation and trap-catch truth: 5 tests PASS across two files.
- The two repaired historical review probes: 7 tests PASS. Total: **28 tests / 12 files**.
- `death_tally`: current rules 133, ordinary meadow, one day; exact serialized equality with the unobserved twin. This bounded smoke does not establish long-run population viability or every conception gate.
- Seasonal diagnostic: one-day current meadow smoke PASS; legacy inhabitant trace: 0.01-day smoke PASS. No current-survival claim is drawn from the legacy trace.
- Git committed-archive verification: **7,709 references, zero hash/size mismatches**. Git connectivity check PASS after a transient object-write warning during the large preservation commit.
- Full suite was not repeated for this observer/documentation/archive closeout. Prior failures and the stopped full run remain preserved; there is no fresh full-suite pass claim.

## Non-ancestor tip review

The table is keyed by the 30 distinct tips outside main at the start. Duplicate local/remote names are grouped. All 82 original reference dispositions are in `reference-dispositions.json`. Ancestry inclusion is distinct from feature equivalence; retained branches do not imply their unique features shipped.

| Tip and reference(s) | Disposition | Evidence / reason |
|---|---|---|
| `007b9d52` origin/claude/leisure-rhythm-v27 | Retained: adapted | Varied leisure is already adapted as rules 28 (docs/CIVILISATION_IMPLEMENTATION.md); old rules 27 conflicts with main night-wait generation. Do not overwrite v26 reference or rules meanings. |
| `030d62d7` origin/nova/inhabitant-perspective-audit | Included in main | Additive historical Odette audit and legacy trace runner. Mark historical context; smoke-check observer output. |
| `03bad1aa` deepseek-trial | Included in main | Additive unfamiliar-technical-pieces guidance; identical resulting merge tree to deepseek-b1. No workflow approval change. |
| `03dd8684` claude/epic-franklin-469omp | Retained: historical | Ancestor of remote epic-franklin tip c55926d4. Preserve under that complete history; no separate runtime merge. |
| `359bce91` claude/wolf-defence-v3<br>origin/claude/wolf-defence-v3 | Retained: adapted | Retired wolf-defence generation 3 conflicts with main habitation generation 3. Current defence and immutable history must remain; docs/WOLF_DEFENCE.md and BRANCH_LIFECYCLE.md record adaptation. |
| `3d54edd4` deepseek-b1 | Included in main | Same additive guidance as deepseek-trial; both histories can be joined without duplicate text. |
| `3e62a2d7` origin/claude/wonderful-hypatia-46pdde | Included in main | Additive death_tally observer. Review found missing global conception-cap gate; fix before integration and check sampling does not mutate serialized state. |
| `3f6ec661` claude/civilisation-phase1 | Retained: adapted | Store eating adapted at main generation 11 (docs/TABLE_EATING.md); observer-lifecycle contract already present. Historical table evidence stays on the published branch; conflicting v8 reference cannot replace main history. |
| `49655bb0` claude/ws3-seasonal-prep | Included in main | Additive historical seasonal diagnostic. Aggregate eaten/spoiled totals do not establish reserve-specific flow or prove the proposed binding constraint. Preserve original text with prominent correction; current reserve implementation is separate. |
| `4b063dca` claude/mood-ranking<br>origin/claude/mood-ranking | Retained: historical | Explicitly unmeasured old mood-ranking experiment. Changes utility ordering for rich worlds without current rules gating; importing it would change existing save continuations. |
| `500bb2f2` origin/claude/tests-current-rules | Retained: deferred | Shared test-default migration, not a runtime feature. Changes 22 files, reserves entity id 1000000 to retain outcomes, pins old scenarios and adds weaker current-generation claims. Requires its own contract/fixture migration and broad validation; not imported into the stop checkpoint. |
| `551b034e` origin/claude/eager-carson-p8jy0f | Retained: historical | Old renderer experiment: terrain, shore foam, foliage, mouthfuls and small-window UI. Conflicts with current styles and lacks current rendered validation. Review did not establish every visual effect already exists; retain proposal rather than declare it delivered. |
| `5be609ef` origin/claude/wonderful-rubin-p9n961 | Included in main | Additive static FLOORPLAN.html, explicitly a rules-33 snapshot. Historical documentation only; counts and layout are not current architecture claims. |
| `64e5780c` codex/site-completion109 | Included in main | All eight added performance report/image files are byte-identical on main. Join the branch history without altering contents. |
| `70214c6c` origin/claude/living-world-survival-legibility-xipvpo | Retained: historical | Unversioned old multi-feature line includes freshly shuffled actor order, grief, promise policies and observer changes. Several concepts have current implementations, but shuffled order would change deterministic RNG consumption and save history. No blanket feature-equivalence claim. |
| `9651cf0f` origin/claude/courier-promise | Retained: adapted | Courier recovery explicitly recovered on main (docs/COURIER_RECOVERY.md); later table-eating reconciliation records the renumbered lineage. Keep original branch provenance. |
| `9698236a` claude/record-2026-10-20<br>origin/claude/record-2026-10-20 | Retained: historical | Old AGENTS/CLAUDE/HANDOFF route and branch-status text superseded by current repository and WORKFLOW.md. Do not restore stale authority pointers. |
| `9db27b67` codex/autonomy-continuation | Included in main | All added reports/docs already identical; scripts retain newer source provenance, configurable pin and survival observations. Resolve only script conflicts to current implementations. |
| `a69c30b9` nova/inhabitant-perspective-audit | Included in main | Contained in remote audit tip 030d62d7; integration of that tip includes this local branch. |
| `ae8f76b7` codex/hungry-harvest114 | Included in main | Both added adverse/activation reports already identical on main; current crop trace adds normalized source and dirty provenance. Resolve its script conflict to current implementation. |
| `b5428365` claude/snapshot-wolf-habitation-integration-2026-10-20<br>origin/claude/snapshot-wolf-habitation-integration-2026-10-20 | Retained: historical | Frozen unfinished wolf/habitation generation-5 experiment, not an outstanding current product change. Conflicting version meanings and references retained with historical evidence. |
| `be786a80` origin/ccr-8527b59e-oatizp | Retained: adapted-partial | Old rules-59 required-tool and rules-60 kept-target line. Current optutil documents required-tool precedence; kept-target was diagnosed/adapted as rules 65 (docs/KEPT_TARGET.md). Unique historical tools and reports remain available on origin; do not replace generations 58/59 references or claim every old artifact integrated. |
| `c55926d4` origin/claude/epic-franklin-469omp | Retained: historical | Old rich-only expansion bundle: well, cellar, forestry, mine, stockyard, mill, brewery, bed and smokehouse, plus mood/lab changes. Some survival concepts now exist through different physical/versioned mechanisms; multiple unique expansion modules remain absent. Whole-branch merge would bypass current save/rules contracts and is not accepted merely because parts overlap. |
| `c67be494` stage-1-integrity | Included in main | Stage-1 fixes are present: flood tool records, transfer caps, lab failure exits, normalized observer provenance, deletion of absent upgrade field and vision policy. Main strengthens preferred-tool identity and activates former cart TODO with rules-117 regression. Resolve conflict files to their current implementations; verify no tree change. |
| `d44695d3` origin/claude/wonderful-mccarthy-xmbcng | Retained: historical | Old ageing/fertility/life-pace, grief, council, teaching, reputation and leisure bundle. Several dedicated modules remain absent; changes are not gated for current historical saves. Preserve proposal, no blanket delivered claim. |
| `d72e3666` claude/snapshot-wolf-defence-v3-2026-10-20<br>origin/claude/snapshot-wolf-defence-v3-2026-10-20 | Retained: historical | Unfinished wolf-defence generation-3 snapshot; keep provenance, not a replacement for current versioned defence. |
| `df9acb9c` origin/claude/adoring-hawking-fj66vw | Retained: historical | Old workshop claims, fishing-rod/smokehouse, well and spear experiment changes rich rules without current save-version contract. Current fish preservation and gear differ; absence of old tests is not proof current system has their semantics. |
| `f133938d` claude/friendly-planck-ccpkxf<br>origin/claude/friendly-planck-ccpkxf | Retained: historical | Distinct place-memory/danger/grief model; current tree lacks places.ts and options_places.ts. It would add unversioned saved state and scoring effects. Requires a separately bounded current-generation adaptation. |
| `f33cd0bf` claude/winter-shelter-v34<br>origin/claude/winter-shelter-v34 | Retained: adapted | Winter shelter was explicitly adapted from this tip at main rules 47 (docs/WINTER_SHELTER.md). Candidate rules 34 is main plan reconsideration. Only independent death_tally observer is considered separately. |
| `f82d42de` place-scar<br>origin/place-scar | Retained: historical | Distinct old recently-failed-place scoring penalty. It changes ranking without a current version boundary; no new continuation/reliability evidence. Preserve rather than silently enable. |

## Retained limits and recovery

The 19 retained tips include incompatible historical rules generations, already adapted mechanics, unversioned multi-feature experiments, stale instruction records and the broad test-default migration. No blanket claim is made that every feature on these branches exists on main. Their exact commits remain published and reachable for a later focused adaptation. In particular, changing old rich-world behaviour or replacing historical continuation fixtures merely to close branch ancestry would violate save compatibility.

The survival programme itself remains incomplete. Ordinary preserved-meat/trap-meat uptake, final-source lamb birth and the full cross-seed comparison were not established by the stopped task. Adverse reserve findings are retained. See [SURVIVAL_CAPABILITIES.md](SURVIVAL_CAPABILITIES.md).

Archive layout, exclusions, recovery instructions, pre-review merge-tree output, publication verification and command logs are under [review_evidence/branch-integration-20261104](../review_evidence/branch-integration-20261104/README.md). `repositoryPath` entries resolve at preservation commit `c188ac3e`, not against later edited files.
