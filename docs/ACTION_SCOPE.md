# Autonomous work scope — rules 71

Predecessor: rules 70 runtime `0dc486d`, immutable continuation `15dbf6e`. Existing gathering already chooses a quantity
from demand, remembered stock and pack space; forage, eating and daylight waiting already expose some external bounds.
Do not recreate these capabilities. The missing A4 transition is fitting an offered trip/work spell to personal time:
estimated outward/return travel, current fatigue/consumption and an approaching personally accepted duty.

Add bounded deterministic estimates to supported gathering/water amounts and resumable building/workshop spells. Use
only own needs, known places/current weather, accepted obligations and communicated whereabouts. Keep uncertain travel
estimates explicit; do not read future weather or another person's live plan. An amount/duration can only narrow the
existing legal action. Urgent survival remains under its existing path. If even the minimum cannot fit, explain the
blocker; do not fabricate time, teleport home or auto-complete a duty. A later legal choice remains necessary.

Expected proof: otherwise matched workers choose smaller quantities or shorter productive spells before a known duty,
complete real work, retain paid intermediate progress and continue identically through save/load. Larger carrying room
cannot create source stock. Unknown obligations or hidden changes cannot affect the estimate. Physical depletion, blocked
travel and urgent interruption remain truthful failures. Show the chosen amount/duration and actual partial work in the
page. Measure ordinary opportunity/selection/completion separately, retaining zeros and pending aggregate benefit.

## Delivered mechanism and existing owners

`action_scope.ts` derives a work window from personal food/water/energy, current heat/harshness, existing caution, known
home or departure point, and accepted duties with personally located destinations. Return travel uses the existing speed
estimate with a 20% allowance. A small margin is retained; no future weather or other person's live location is consulted.
A duty at the work's own target, or explicitly promised supply, is not treated as unrelated competing work. Unknown duty
locations do not silently become known. These are estimates, not guaranteed return times or fulfilled appointments.

`options_work.ts`, `options_survival.ts` and `production.ts` supply the existing estimates and demand/stock/pack-bounded
amounts for raw materials, reserve forage and water, and resumable building/workshop work. `decision.ts` narrows these
before hard filtering. The ordinary and external chooser see the same maximum; `make` can only reduce the registered
action's amount or duration. Hungry survival forage is unchanged. Water's existing requested batch size is preserved
except for pack/time narrowing; this is not a claim of globally optimal or exact deficit-sized water provisioning.

`activities.ts` ends a chosen shorter work spell as **partial**, retaining the existing paid site/job progress, ownership
and later resumption. It does not call an unfinished batch complete. Ordinary depletion, access, capacity and urgent
interruption still act at their existing boundaries. `save.ts` validates scoped activity state; `world.ts` fingerprints
it. `inspect.ts` shows the chosen upper bound, estimated return and uncertainty in the existing goal explanation. The
existing AI limit schema exposes the same bound, without changing protocol shape or adding model authority. Lab removal:
`rich-no-action-scope`. No additional persistent person memory or unbounded cache is introduced.

## Verification and review findings

`tests/action_scope.test.ts`: final **16/16**. An accepted future duty narrows a real trip; the quantity is physically
collected with exact saved continuation. A 38-tick workshop spell preserves its paid batch, then resumes without paying
twice after the fixture cancels the competing duty. The resulting plank is collected, hauled and consumed by actual
construction. Also covered: impossible minimum, unknown location, another person's private change, legacy/ablation,
source depletion after departure, urgent thirst, malformed scope, external over-limit rejection, further legal external
narrowing and water collection into the one unit of real remaining pack space. Duty cancellation and selected legal
actions are staged; no successful duty delivery is claimed by this scene.

Full regression before two final additional cases and the upper-bound wording clarification: **249 files / 1,686 tests,
160.75 seconds** (`autonomy-scope71-full-tests.log`). Final focused rules-70 continuation plus then-15 scope cases passed
**16/16 in 10.30 seconds** (`autonomy-scope71-final-check.log`), followed by the final **16/16** scope file including water.
Do not add these to the prior full count and call it a fresh full run. Typecheck and build passed; final bundle 972.85 kB
retains the existing size notice. The full run also retains the existing timeout-overflow warning.

Rendered proof **7/7** (`autonomy_evidence/scope71-rendered-final/report.json`), with actual trip, retained work, useful
construction and failure images; expanded explanation and physical construction screenshots were visually inspected.
The first browser attempt used unsupported wrapper names and failed before the scene; corrected to the repository CDP
API. The first workshop fixture requested no planks and correctly offered no plank recipe; its explicit site now needs
planks, with other materials staged and ledger-accounted. A fixture type narrowed commitment status too far and was
corrected to the actual `Commitment` type. Review also changed the displayed plan to **“up to”** so further lawful external
narrowing cannot make the inspector claim an exact larger collection. Historical references and valid tests unchanged.

## Ordinary occurrence, adverse cases and limits

Fresh Normal, immigration off, fixed meadow/river/forest, five days each. Every run reaches 12,000 ticks with 2,800
living-person samples, 100 full-state/RNG purity checks, exact unobserved continuation, conserved materials and a complete
exclusive living-person time budget. Reports retain source manifests and all sampled narrowed offers and actual endings:
`autonomy_evidence/r71-{meadow,river,forest}-5/report.json`. These runs precede only the **text-only** “up to” clarification.

| Seed | Samples with a scoped legal option | Samples with a narrowed option | Samples with a time-blocked option | Scoped starts / of which narrowed | Recorded endings: success / partial / failed / interrupted | Seconds |
|---|---:|---:|---:|---:|---:|---:|
| meadow | 1,936 | 74 | 208 | 508 / 6 | 234 / 108 / 41 / 116 | 71.82 |
| river | 2,119 | 112 | 209 | 630 / 17 | 286 / 84 / 80 / 168 | 27.36 |
| forest | 2,086 | 112 | 269 | 593 / 14 | 245 / 100 / 75 / 167 | 24.46 |

These repeated samples are not independent opportunities. Starts still active at the horizon do not have an ending;
suspended activities are separate starts if resumed. “Scoped” includes amounts already fitting the estimate; it does not
mean the new mechanism changed every one of those choices. Meadow ran alongside the full suite, so timing differences
are not a controlled performance comparison.

Ordinary causal example: meadow **Pia #1013**, source **#940**, begins activity **#2440** at tick **3533**, planning one
stone with an estimated 196-tick return, limited by energy. At **3672**, the real trip completes with one unit collected.
Meadow **Isla #1031** works site **#1271**, activity **#1638**, ticks **934–1033**: the chosen 99-tick spell ends partial and
keeps the work. Preserved failure: Isla's activity **#1132** at berry source **#815** fails at tick **123**, zero units,
because someone else is taking it. A planned amount is not an entitlement to reserved stock.

No aggregate productivity, duty reliability, survival, long-term viability or mature-world benefit is established.
Trip provisioning (food/water/tools), communicated meeting/delivery waits, other goal families and the full programme
remain open. Reproduce the short occurrence run with
`npx --no-install vite-node scripts/scope_observe.ts -- meadow <fresh-output-directory>` (then river/forest). It refuses
reused output and has a 170-second stop. For costly matched aggregate validation, use `AUTONOMY_VALIDATION.md` with
`--branches nudge:1,nudge:2,rich-no-action-scope`; approximately 90 minutes for its documented 24-seed Large workload,
owner-run and pending. No broad benefit threshold is inferred from these short observations.
