# Persistent material traces — source reconciliation before the next slice

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
