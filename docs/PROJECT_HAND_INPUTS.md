# Retaining the current hand-tool prerequisite inputs — rules 115

Owner: `src/sim/project_hand_inputs.ts`. The first ordinary rules-113 forest cart
trace (`FIRST_CART_113.md`) begins with Lena carrying the one wood and two stone
needed for the hammer, but a batch graph has no input claim at its craft step.
The stone goes to a different site, and the plan later expires while still trying
to acquire inputs. Two staged contracts reproduced empty claims at ready crafting
and loss of the other ingredient while acquiring missing stone.

At rich rules 115, only the hand-tool prerequisite currently being prepared retains
its one recipe's wood/stone through acquisition and crafting. It uses the existing
personal `wants` allocation; no material, future workshop stock or whole graph is
reserved or created. Ordinary promise precedence, capacity, physical consumption
and cancellation/death boundaries remain authoritative. Completion and the next
ordinary decision release the hand-tool inputs. No deadline, need rate, yield,
work score, random draw or save schema changes.

`project_step.ts` derives the allocation while recording a decision; observation
remains pure. A preparation hook in `batch_plan.ts`/`intent.ts` sets it at initial
adoption, including communicated continuations, only for a current hand-tool step.
Other workshop adoption histories retain their previous shape. The plan must already
be in the person's intention list before setting its claim: otherwise its own
allocation is added without being subtracted by `reservedFor`, falsely counting an
extra input. A failing first-step test caught this during review; the hook was moved
after insertion, retaining the correct initial acquire/craft step.

The rendered autonomous test exposed a second issue in the candidate: seeing its
own retained inputs as unavailable, ordinary adoption created a second intention
for the identical hammer, and the physical handler correctly refused double-claimed
inputs. The initial broader run was stopped; an autonomous regression reproduces
the duplicate. The same owner now suppresses a second tool intention for the
current hand-tool prerequisite already being prepared. Other tool goals remain
available. The corrected scene makes the hammer without that artificial conflict.

Earlier rules and `rich-no-project-hand-inputs` preserve old behaviour. The initial
115 full run and first rendered report were unsuccessful/aborted evidence, not
passes. They are retained locally; final evidence uses fresh output paths.

## Verification and declared measurement

Eleven contracts cover immediate allocation, a partially held input, old/removal
behaviour, observer purity, no remote/future claims, promise precedence, original
deadline release, death, actual hand crafting/payment across a mid-work save,
non-hand adoption and no duplicate autonomous tool claim. Focused project-input,
immutable-114, quantity-revision and commitment suites pass **54 tests / 4 files**,
2.90 s. Typecheck/build pass with existing Vite native-loader/bundle warnings.

Final rendered scene passes **9/9**. The staged cart proposal and stocks are labelled;
subsequent choices, travel, hand work and next decision are autonomous. By tick 147
one hammer is held, its one wood and two stone have been consumed, the input claim
is empty, and Lena is walking to the timber yard for the next cart step. Mid-work
saved twins, reload, all-item accounting and inspection purity pass. The initial
and final screenshots were inspected. This is not ordinary cart-completion proof.

Predeclared ordinary measurement: fresh Normal forest 15 days at 114 and 115, plus
five-day river/meadow comparisons, immigration off. The longer forest window is
chosen because the observed predecessor cart plan began after day seven; a five-day
window alone would miss it. `project_hand_inputs_observe.ts` records current hand
prerequisites, held/free inputs, duplicate tool intentions, offers/ranks, actual
handcraft outcomes and carts/trips, with pure inspection, frozen source hashes,
exact unobserved twins/reloads and full accounting. No supplied goods, knowledge,
plans or decisions. Repeated samples are not independent opportunities. Full
regression and these six windows completed; 115 is pinned before any successor.

The rules-114 forest day-45 extinction remains an adverse separate result. This
input repair does not establish food security, cart usefulness or population
viability. Required open programme rows remain open until their own evidence exists.

## Final results

Runtime `fef1304`, immutable continuation `bc80e48`. Full final regression passes
**359 files / 2,303 tests**, 347.11 s (`autonomy-inputs115-full-reviewed.log`, exit 0).
The immutable 115 reference was added after full collection and passes separately
with the eleven input contracts: **12 tests / 2 files**, 15.81 s. Old references
were not regenerated. The existing Node timeout-overflow test warning is retained.

All six ordinary windows have **zero current hand-tool prerequisite samples,
zero project handcraft starts and zero carts or cart trips**. They are null for
the new transition, including forest through day 15. The earlier 113 cart episode
does not recur in the divergent 114/115 forest windows; do not present it as a
matched current-world episode. At each version, forest has 37 general handcraft
starts, 27 successes and nine interruptions; meadow 23/9/13; river 12/8/3. Forest
ends with 31 alive/no deaths; river and meadow 28/no deaths. Each 15-day window has
300 pure checks and each five-day window 100, with exact unobserved twins/reloads,
frozen runtime and conserved items. One general handcraft can remain underway at
the end, so starts and endings need not balance within a finite window.

Reports: `autonomy_evidence/inputs{114,115}-forest-15/report.json` and
`inputs{114,115}-{river,meadow}-5/report.json`. Full saves remain local. Staged
retention, autonomous physical hammer completion and release are established;
ordinary activation, cart usefulness and aggregate benefit remain unproven.
