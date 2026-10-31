# Prepared project steps are finished — rules 99

Delivered 31 October 2026 on `main` after the verified rules-98 checkpoint (`259f028`, reference `4cd6828`).
WS6/WS7 continuation of [DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md): the cart recipe and batch plan
are rules 50, the cart-first adoption order is rules 59 ([CART_PRIORITY.md](CART_PRIORITY.md)), the saved production
graph is rules 69 ([BOUNDED_PROJECTS.md](BOUNDED_PROJECTS.md)). Owner: `src/sim/ready_step.ts`; lab removal
`rich-no-ready-step`; rules 98 and earlier keep their recorded behaviour and references.

## Diagnosis before changing rules

The owner's brief names the rules-58 cart transition as the first production trace: "trace the actual remaining hammer
plans, offered choices, selection, interruption, reservations and workshop component stock. Do not assume seed blockage
still explains every failure." The register's rules-59 row left exactly that trace pending. Every staged cart test
(rules 57–64) selects each step by hand through `selectPrerequisite`, so the current graph path (rules 69 onward) had no
evidence at all, staged or ordinary, of finishing a cart from its own decisions. No ordinary run has ever built one.

A viable staged scene was built for ordinary decisions (`tests/helpers/cart_project.ts`: Hana, 35, diligent, build 1.1,
carpentry 1.4, three bread and three water, a hut with twelve grain, a known timber yard with eight wood and two handles,
hammer and saw in hand, a household storehouse site short forty stone, a known stone store, tree and rock). The earlier
fixtures pin the person (`pin`) and stage one bread and one water, which is why they could not answer this question.
Run with no controller at rules 98 (`autonomy_evidence/` is not needed; the probe is reproduced by the legacy case in
`tests/ready_step.test.ts`), the trace was:

1. The batch plan is adopted at once (cart first, rules 59). Hana saws one batch (three wood → two planks) at tick 100.
2. `nextProjectStep` then answers **collect: planks** for the planks node, because its output is on the yard's shelf,
   although that yard is also the node's destination. She withdraws one plank and deposits it back; with a saw the
   loop happens to resolve, without one it does not (the no-saw scene stays at "collect: planks" for the whole window).
3. With four planks, two handles and two wood on the shelf and the hammer in hand, the assembly offer
   `operate:<yard>:build_cart` is present in daylight at about 17 (base 28 less the walk, or the ordinary cart demand's
   base of 14 × work taste when that leaf was produced first and the project's reading was discarded) against about 40
   for gathering or hauling the same site's stone by hand. The plan nudge (14) does not close the gap. The prepared cart
   is never assembled in three days while its maker carries stone by hand, which is what the cart is for.
4. When the assembly was started under a bonus, the review loop interrupted it after the minimum commitment: the shelf
   snapshot no longer showed the inputs (they are in the job), so the step no longer read as prepared and the
   "get back to it" leaf carried no readiness.

None of this is seed blockage. It is the step interpreter and the offer weighting of the project path.

## Contract (rules 99)

- **Same-workshop output is stock.** A recipe node whose place is also its destination never answers "collect" for its own
  output; what is on that shelf counts toward the quantity and the remainder is made (`project_step.ts`).
- **A prepared step gets one bounded, named part.** When the person's own belief of the workshop shows every input and
  fuel the recipe takes, the required tool is in hand or on the rack, and the workshop is not remembered busy with
  somebody else's batch, the offer carries "everything for it is already at the <workshop>" (+18, `READY_STEP_BONUS`,
  the same order as the plan nudge). Their own batch of that recipe under way reads as prepared too, so review does not
  drop it. Anything short, or a workshop busy for someone else, is planned exactly as before (`ready_step.ts`,
  `production.ts projectOptions`, `planRecipe`, `operateLeaf`).
- **The plan's stronger reading of a shared leaf is the one weighed.** When the ordinary demand path already produced the
  same offer key at a lower utility, the project's utility, parts and goal replace it; the activity still carries
  `forPlan` (`production.ts projectOptions`).
- Nothing reads true remote state: the shelf is the belief snapshot, so inputs lost after the last visit are discovered
  on arrival (`startBlocker` fails truthfully, the shelf is re-read, the plan revalidates). No goods are created; the
  ledger balances through loss, re-sawing and use. Survival gates are unchanged (`productionOptions` still yields to
  hunger, thirst and energy; critical needs always interrupt).

## Evidence

Focused contracts (`tests/ready_step.test.ts`, 7; `tests/ready_step_protocol.test.ts`, 2): adoption, two saw batches,
assembly without interruption, plan closed "the household has its handcart", a real cart trip delivering stone to the
site, exact twin continuation from adoption and from mid-assembly, ledger (`consumed.planks` 4) and tool registry; the
prepared part named and ranked first with the full state unchanged under observation; rules 98 and the ablation keep the
unprepared reading and the collect step and build no cart in a day; no withdraw/deposit loop at 99; planks and the known
tree lost after preparation give no cart, at most one more real batch, a re-read shelf and no prepared part; legal AI
selection of offered steps with exact transcript replay, with and without notes.

Rendered (`scripts/browser/ready_step_check.mjs`, **8/8**, `autonomy_evidence/ready99-rendered`, screenshots inspected):
sawn planks and handles on the yard's shelf at tick 256; Hana assembling at 288 with the inspector reading
"a step toward build a handcart at the timber yard … everything for it is already at the timber yard +18"; cart 20 built
at 365 with the plan closed and the twin equal; cart trip from 531 delivering fourteen stone by 691 with the site panel
showing 14/40 stone and the feed "Hana finished a handcart at the timber yard". Staged fixture; every decision after
staging is autonomous. No ordinary-frequency or aggregate claim.

Ordinary screen (`scripts/ready_step_observe.ts river autonomy_evidence/r99-river 5 300`, report committed, final save
local): five days / 12,000 ticks in 85.72 s, 2,800 samples, 100 purity checks, exact twin, valid save, conserved, no
deaths. **Zero project plans adopted, zero project steps sampled, zero workshop operations, zero carts**; the 118 plans
seen are hand-tool plans (14 crafts). Occupancy is identical to the rules-98 river screen, so rules 99 changed nothing in
this window. Workshop production does not begin within five days in this seed; the rules-64 45-day screens are the last
complete ordinary cart evidence (0/0/0). The next ordinary measurement is the 45-day three-seed run below, which exceeds
the cloud budget and is pending on the owner's machine (`AUTONOMY_VALIDATION.md`).

## Limits and preserved adverse behaviour

- Without a saw, the raw wood the project acquires is hauled to the household's own site first: a site the person
  founded counts as a commitment and outranks their private plan's claim (`options_work.ts` haul). The no-saw scene
  therefore still ends without a cart at 99. This is existing policy, recorded here, not changed.
- The readiness part is a preference, not an override: needs, danger and an ordinary clearly better option still win.
- Wear, breakage and mending of carts have no new evidence. Ordinary activation, useful trips in ordinary worlds and any
  efficiency benefit remain unproven until the pending runs return.
