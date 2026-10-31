# Persistent material traces — source reconciliation and rules 89

The original pre-implementation audit below is retained as provenance. Rules 88 completed
verification and was published at `ef7a0c9`; its immutable continuation is `1e48964` from runtime
`7502c1e`. The rules-89 candidate and fresh evidence follow the audit. It is not yet a release.

A13 is still incomplete. This is an audit and implementation direction, not delivered debris
or salvage behavior. Rules 88 must finish verification and acquire its immutable continuation
before any successor behavior or number is allocated.

## Reuse and exclusions

- `sources.ts/fellTree` already unregisters the tree, retains a dated stump and aggregates the
  latest mark per tile under memory-retention rules. That stump is explicitly cosmetic, not a
  remaining wood inventory. Do not credit more wood simply because its mark remains visible.
- Roads/wear, piles and source quantities already render persistent local use. Rules 86 adds
  persistent productive condition independently of harvestable stock, actual sowing/harvest
  pressure and paid field care/rest. Do not implement another field-exhaustion owner.
- `buildings.ts/destroyBuilding` moves surviving stored goods and a paid workshop job's held
  inputs into a real existing pile, then clears the job. It does not recover the construction
  materials already consumed. `cancelSite` preserves delivered unused materials separately.
  Keep those physical origins, property and accounting; do not mint a second rubble reward.
- `facilities.ts/finishJob` owns the batch completion boundary. Paid held inputs are removed;
  product inputs and declared waste are consumed with separate reasons; output goods are then
  created in the workshop's real store with client earmarks. The store-capacity guard runs
  before this mutation. `ops.wasted` is cumulative history, not a current recoverable pile.
- `recipes.ts` explicitly distinguishes timber chips/bark, sawdust/offcuts, fired cracked clay,
  charcoal smoke/ash, smelting slag and flour husks/chaff. The latter labels do not imply that
  those sinks can become their original input items again.

## Actual missing transition and bounded next direction

Workshop waste is currently only a ledger sink/history entry. It has no persistent local
physical quantity, collection work or useful/disposal endpoint. The smallest connected next
situation should originate recoverable material at a **new** paid timber batch completion,
leave a bounded visible quantity at that lawful place, and let a locally informed person
collect and physically use it. Existing storage, client rights, walking, capacity and fuel
actions should do the work wherever their existing contracts fit.

Audit a distinct timber offcut/fuel item against a dedicated debris owner before choosing the
representation. Coarse wood already serves structural/crafting input; returning sawdust as
full structural wood would be misleading. Reusable offcuts must have an explicit conversion,
weight, usable purpose and accounting. Divert only the declared newly recoverable portion at
completion; do not also record it as irretrievably wasted, and never resurrect prior
`ops.wasted` totals. Existing charcoal smoke and burnt fuel remain spent.

If collecting reusable fuel is the selected situation, connect paid batch → real bounded
output → lawful local collection → actual fire consumption → warmth at real presence. Add
physical cleanup/disposal only where the retained quantity causes a demonstrated access or
workplace constraint, with real time/cost and interruption. A cosmetic heap alone cannot close
the response requirement. Avoid one entity per chip; aggregate only compatible owner/origin
state without deleting meaningful provenance or claiming unique historic attribution after
compaction.

## Required boundaries before completion

Check completion exactly once, full workshop/pack, interrupted work/collection, client or
household ownership, someone else collecting first, workshop loss with retained materials,
save during the paid batch and partial collection, later real consumption, pure inspection
and AI exposure, old rules and immutable continuations. Render the same place before and
after real output/use. A declared staged chain is mechanism evidence; ordinary fixed-seed
production/collection/fuel opportunities and completed use need separate denominators.

The rules-88 ordinary forest flood also exposes critical delays reaching water. Before adding
a new well/collector under A11's conditional request, trace whether existing household stores,
carried-water preparation and known supplies can serve that gap. A delayed journey alone
does not establish that a new structure is the missing primitive.

Further owning-source detail: timber hewing pays three wood, produces one plank and consumes
two wood as chips/bark; sawing pays three wood, produces two planks and consumes one wood as
sawdust/offcuts. `finishJob` must include any real recoverable output in its capacity check
before consuming inputs. Reuse the existing output earmark/client and transfer paths, rather
than appending an unowned reward after completion. `options_work` fire demand and `act_build`
fire execution currently consume only wood, so an offcut item needs both a genuinely offered
acquisition path and a checked physical fuel endpoint. Merely rendering it in the store would
leave the intended use disconnected.

If introducing a new item, audit `ALL_ITEMS` conservation-report rows, `WEIGHT`, labels,
material/recipe lookup, personal carrying observations, store capacity, stock acquisition and
old-save validation. Historical worlds must not gain a new zero-valued saved inventory or
changed reference from a global enumeration. Initial item accounting uses actual holder
contents; the all-item enumeration is used by the conservation report and requires explicit
compatibility consideration. No new item or recipe has been implemented by this audit.

## Rules 89 contract and expected result

Expected watchable chain: an actually paid timber batch makes boards and leaves real offcut
fuel bundles; the client observes and collects the stock, walks to a low known fire, burns
it with handling time and later warms there. A full store must retain the paid inputs rather
than creating extra goods. Changed ownership, vanished stock, a full pack and interruption
must prevent or limit collection with a truthful result. Ordinary occurrence is measured
separately on fixed river/forest/meadow Normal rich worlds, immigration off, five days each.
No need, stock, workshop, weather or decision is forced in those windows. Aggregate benefit
requires the existing control/nudge/removal method and is not claimed by this screen.

The recipe table declares two bundles from hewing and one from sawing. Each weighs one and
contains the recoverable half-wood portion, giving half a log's fire duration (190 fuel).
Hewing consumes three wood into one plank, two bundles and one wood-equivalent remaining
sink. Sawing consumes three wood into two planks, one bundle and half a wood-equivalent sink.
The conversion is explicit in the ledger: wood converted into recoverable fuel is consumed
under that reason, bundles are created once, and the remaining waste retains its sink reason.
These are declared model quantities, not empirical industrial yields. Existing charcoal,
burnt fuel, old waste totals and cosmetic stumps remain irrecoverable.

`offcuts.ts` owns the rules/lab gate, conversion interpretation, fuel identity and saved-state
validation. `recipes.ts` owns the by-product quantities. `facilities.ts` includes both outputs
in its capacity precheck, then uses ordinary client earmarks, stored items and output history.
No new per-chip entity, remote reservation or second inventory was introduced. Existing
withdrawal performs the trip, handling time, capacity and actual access checks. New collection
offers require personally known offcuts and a known low fire, adequate work margin and a need
for fuel. Existing fire work consumes the selected material after 12 work ticks per unit.
Carried offcuts reduce the remaining firewood want; they cannot replace structural timber,
repair ingredients, tool materials or workshop recipe inputs. Removing them from the store
frees genuine capacity; no separate gratuitous disposal/reset mechanic is needed.

The world and pack render real quantities, with a distinct bundle icon, bounded pile drawing,
the existing carried sack, actual burning fire and useful warmth. Place inspection separates
remaining waste from recoverable stock and shows ownership, earmarks and output. Individual
completion logs record recovered bundles and consumed fuel. Ordinary memories retain dated
stock through existing beliefs. No global knowledge or new generic memory store is added.
AI uses existing legal `withdraw` and `fuel_fire` offers and generic item maps; no schema shape
changed, so protocols 27/28 and observation 15 remain current. Actual live/stub replay is
tested with and without notes. The old rules-88 continuation remains unchanged.

## Fresh staged checks and review

`tests/offcuts.test.ts`, `tests/offcuts_protocol.test.ts`, existing workshops and frozen 88:
**42 tests / four files pass**, 2.28 seconds, `autonomy-offcuts89-final-focused.log`.
They cover real offered operate → collection → consumption → offered warming, exact saves
during paid work, collection and partially consumed fuel, interrupted paid work resuming once,
stock loss, changed owner, full pack, interruption, collapse retaining actual outputs, saw/hewn
accounting, no unseen collection, malformed/older saves and isolated legacy-waste removal.
The full regression is running; no verdict is claimed yet. Build/typecheck pass; existing
import-extension and large-bundle warnings remain. Built JS is 1,072.29 kB (361.98 kB gzip),
not a mature-world performance result.

Preserved initial failures: the first fixture named a household that had not been created;
it now uses the fixture-created person's real household. The next run showed genuinely absent
offcuts/capacity behavior. A chain test initially passed a person ID instead of the required
person/context to AI observation; fixed the test call, not the observer. Typecheck identified
a general string instead of a typed failure result and a place note inserted into the source
case; both fixed. No valid expectation was weakened or old reference regenerated.

Fresh source review checked completion once, explicit conversion/sink separation, capacity
before mutation, client earmarks, actual access revalidation, old-rules output, locally known
collection and bounded rendering. Visual review found the new item falling back to a stone
icon; a distinct bundle icon fixes it. Repeated rendered check: **8/8**,
`autonomy_evidence/offcuts89-final-rendered`, `autonomy-offcuts89-final-browser.log`.
Before/after yard, real carried sack/icon, lit fire and warmer person screenshots were viewed.
The scene explicitly labels staged offered actions and its later declared cold need; this is
mechanism/readability evidence, not spontaneous behavior or human comprehension measurement.

Lab removal: `rich-no-offcuts`, preserving original waste behavior and removing new fuel use.
All other programme rows remain open as recorded. Physical by-product reuse does not prove
ordinary production viability, collective upkeep, household resilience or mature performance.

## Fixed ordinary screen (release candidate, no interventions)

`scripts/offcuts_observe.ts` retains source hashes, initial/final state, actual starts/endings/
transfers, per-person ticks, repeated opportunities/offers/ranking and adverse endings. Each
seed reaches **12,000 ticks**, with **2,800 repeated living-person samples** and **100 full-state
observer-purity checks**. Daily conservation, final save validation and exact unobserved twins
all pass. Each has 28 living / zero deaths; that is not evidence of a survival improvement.

| Seed | Timber-work starts | Offcuts made / collected / burned | Seconds | Save bytes | Critical-need person-ticks |
|---|---:|---|---:|---:|---:|
| river | 0 | 0 / 0 / 0 | 44.28 | 3,295,529 | 2,892 |
| forest | 0 | 0 / 0 / 0 | 39.68 | 2,730,120 | 1,528 |
| meadow | 0 | 0 / 0 / 0 | 38.93 | 2,543,574 | 267 |

There are zero known-offcut opportunity samples, zero collection/fuel offers and zero related
selected starts or useful consumption. No ordinary offcut causal story exists in these windows;
do not present the staged Ada chain as ordinary. Reports and unchanged-world evidence are in
`autonomy_evidence/r89-{river,forest,meadow}` and `autonomy-offcuts89-{seed}.log`. Costs include
the instrumented twin and observers alongside regression work, not bare simulation throughput.
The remaining ordinary production/cart programme stays open, as do longer/current-rules
Large tests. Preserve these zeros when running the separately supplied longer commands.

Release full regression: **290 files / 1,959 tests passed**, **416.26 seconds**, in
`autonomy-offcuts89-full-tests.log`. Existing timeout-overflow warning remains. No runtime
or tested dependency changed during the suite or ordinary windows. Fresh remote fetch keeps
main at rules-88 `ef7a0c9`; the conflicting historical 59/60 branch remains `be786a8` and the
other inspected candidate is old rules 8. No competing 89 implementation was found. Main's
989 pre-existing untracked paths remain unchanged. The immutable 89 reference will be
captured from the committed runtime before successor behavior is added.

Captured from runtime `aa38124`, reference commit `ab66ee5`: ordinary, paid partial timber
work, physical collection and partially consumed fire fuel. Separate immutable test **1/1**
passes in **2.29 seconds**. No old reference changed. The next diagnosed shared-place
dependency is recorded in `MEETING_ARRANGEMENTS.md`; its audit is not delivered behavior.
