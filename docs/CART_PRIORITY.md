# The cart before the planks it would haul — rules 59

Delivered 2026-10-30 on local `main` after rules 58 (`7b2a680`). WS7 continuation of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md); the cart's recipe and batch plan are rules 50
([BATCH_PLAN.md](BATCH_PLAN.md)), the hauling ground for wanting one is rules 55 ([TRANSPORT.md](TRANSPORT.md)), the
missing-hammer connection is rules 57. The immutable rules-58 reference (`tests/v58_continuation.expected.json`, recorded by
`scripts/v58_reference.ts` at `7b2a680`, committed at `de9c635`) was recorded before any of this.

## Diagnosis, before changing rules

The register's resume note said: 65 cart-demand samples, 33 missing-hammer samples, six crafted hammers, no cart; do not
assume the seed blockage explains the rest; trace the offered choices across the next demand episode. The programme's rule
for this work is to find the demonstrated bottleneck and change that one transition.

`scripts/cart_diagnosis.ts` (one-tick snapshot of the retained rules-58 river save at tick 108,000) found nobody wanting a
cart at the end: one open site (the bakery) short 9 weight, six hammers held by Ben, Zia, Tomas, Kai, Petra and Cole, no
cart plan ever adopted, no handles ever made. The end state was not the episode; so `scripts/cart_episode_observe.ts`
traces every 240-tick sample of an adult who wants a cart through the planner itself (hammer in hand or on the rack, the
batch planner's answer and, when it is not the cart, the first gate that refused it, the project slot, the options and
blockers about the cart and its components, the top-ranked option), with observer purity checked at every sample.
Three fixed ordinary worlds (Normal, no immigration, 45 days / 108,000 ticks) at rules 58, on the rules-59 code with the
version pinned (`cart_evidence/episodes-r58-{river,meadow,forest}`; the river hash `f2bddef5` is the one the pre-change code
produced):

| seed | adult samples | wanting a cart | of them holding a hammer | batch planner's answer in those | cart plans | carts |
|---|---|---|---|---|---|---|
| river | 7,965 | 38 | 1 (Cole) | planks for a site 32, bricks for a site 6 | 0 | 0 |
| meadow | 7,650 | 40 | 7 (Vik) | planks 15, bricks 25 | 0 | 0 |
| forest | 6,742 | 61 | 36 (Lena, 3.5 days running) | planks 19, bricks 38; no hammer 4 | 0 | 0 |

In every one of the 44 samples where a hammer-holder wanted a cart, the batch planner (`batch_plan.ts batchWanted`) took a
site material instead. The cause is structural, not a tuning accident: the cart is wanted on the ground of known site
deficits of 40 weight or more (`production.ts wantsCart`), or of heavy hauling to sites (rules 55), and the same sites put a
material want into the batch planner at a base of about 38 (`options_work.ts materialNeeds`, 34 × relevance + 4), while the
cart's base is 14 × work taste. The planner sorts its wants by base, so the cart could never be the batch taken on while the
reason for wanting it existed. The other 95 samples were people without a hammer, for whom rules 57 already turns the
want into a hammer plan; that plan then competes for the one project slot with the stock, shelter, repair and tool plans
recorded in the samples (`projectSlotWhenWanting`), which is a different transition and is left as found.

## Contract

Gated on rich dynamics and `runsRulesVersion(world, 59)`; lab switch `rich-no-cart-first` keeps the rules-58 order and
changes nothing else. Owner: `src/sim/cart_priority.ts` (`orderBatchWants`); one call site in `batch_plan.ts batchWanted`.
No new saved state, no new field, no hash change beyond the version itself.

- Among the batch planner's wants, a wanted cart is placed before the first want tagged `site`; its place relative to
  everything else (promises to bring a material, repairs, the smithy's charcoal, bread, jars) is unchanged.
- Every gate the planner applies to a want still applies to the cart in its new place: a known timber yard, the technique,
  the hammer in hand or on the yard's rack (`toolAvailable`), a known source of wood for the planks and handles it lacks.
  A cart nobody present can make yields to the planks exactly as before.
- The cart's demand, its recipe (four planks, two handles, two wood at the yard; a hammer; 190 work), the batch plan's
  steps (handles and planks made first at the same yard, from known wood), its three-day patience, its earmarks and its
  ending ("the household has its handcart") are rules 50 and 55 and are untouched. Nothing is created, moved or reserved by
  this change; it only changes which batch a willing maker with a hammer takes on.

## Tests

`tests/cart_priority.test.ts` (5): the diagnosed situation staged (a hammer in hand, the yard holding the cart's makings, a
known site short of planks as well as stone) gives planks at 58 and the cart at 59, with the planner pure; without the
hammer the planks stay first, and the pure ordering keeps a promise ahead of the site materials ahead of the cart; the cart
batch is adopted through `reviewIntentions`, built through the plan's own step with an exact mid-build save continuation,
empties the shelf of exactly its makings, ends the plan with the cart and ends the demand, with conservation held; the lab
switch restores the 58 order and a 58 world adopts no cart plan; a bare yard gives the plan a component step first and the
plan survives the first real gathering trip. `tests/v58_continuation.test.ts` pins rules 58.

## Ordinary worlds

The same three worlds at rules 59 (`cart_evidence/episodes-r59-{river,meadow,forest}`), and forest at 59 under
`rich-no-cart-first` (`cart_evidence/episodes-r59-forest-no-cart-first`), whose 61 samples are identical to forest at 58:

| seed | wanting a cart | holding a hammer | batch planner answers "the cart" | cart plans adopted | carts |
|---|---|---|---|---|---|
| river | 38 | 1 | 1 of 1 | 0 | 0 |
| meadow | 40 | 7 | 7 of 7 | 0 | 0 |
| forest | 80 | 44 | 44 of 44 | 1 (Lena, day 32.0) | 0 |

Read plainly: the diagnosed transition is repaired (the planner now answers the cart in every hammer-holder sample, 52 of
52) and the first cart plan ever adopted in an ordinary world followed (Lena, forest, "to haul heavy loads, after carrying 41
weight of materials to building sites in 7 loads these last days", first step "get 1 more wood for the hewn planks"). No cart
was built in 45 days. The next transition is now visible in the trace and is not changed here: the plan's own steps score
0.7–4.3 (hewing planks, shaping handles) against winter rest, warmth and sleep at 18–73, because the cart's demand base is
the personal-convenience 14 × work taste, and the bounded plan nudge is 14; Lena's wood source was unknown (she went
"looking for timber"); the plan would lapse at its three-day patience. In meadow and river the demand with a hammer was a
single sample (Vik day 27.1 with a free slot, Cole day 33.2 holding a spear plan), too brief for a review to adopt it. The
weight of the cart's want (whether a settlement's cart is an industrial want, as charcoal's 30 was made for the same reason)
and the brevity of the demand are recorded as the next bounded decisions, not retuned here. No aggregate claim; no lab
ensemble was run.

## Limits

- The order is changed only in the batch planner. The ordinary (non-plan) workshop options for the cart's components keep
  their rules-20 utilities.
- The cart still needs the hammer in hand or on the rack; nobody lends a hammer for a cart.
- A cart plan is still one batch among the one-project-at-a-time rules: it is not taken on beside a stock, shelter, repair
  or tool plan, and never beside another batch.
