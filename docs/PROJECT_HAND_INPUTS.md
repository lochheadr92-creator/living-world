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
regression and these six windows are pending; pin 115 before any successor.

The rules-114 forest day-45 extinction remains an adverse separate result. This
input repair does not establish food security, cart usefulness or population
viability. Required open programme rows remain open until their own evidence exists.
