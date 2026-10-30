# The tool that really stands in the way — rules 59

## Diagnosis, before changing rules

The register's next transition (WS7, 2026-10-30) was to trace an ordinary cart-demand
episode gate by gate rather than assume the earlier seed blockage explained every
missing cart. `scripts/cart_trace.ts` samples every adult every 240 ticks in the fixed
river/Normal/no-immigration world and, for anyone wanting a cart, holding a hammer or
carrying a cart batch plan, records the timber yard as they know it, each cart input's
shelf and pack stock and stage-before recipe, the batch the planner would adopt, live
plans and cooldowns, the hammer carriers in sight, the planner's lacking-tool fact, the
hammer craft/borrow options offered, their utilities against the top-ranked option, and
what the person was in fact doing. Observer purity (serialized before and after each
sample), conservation and the source manifest are checked. Raw samples are retained
locally; the committed `demand_episodes.json` holds every demand sample in full.

Rules 58, 35 days (`viewer_evidence/tool58-river35-trace/`), identical in every count
to the 45-day run before it:

| measure | value |
|---|---|
| adult samples | 6,265 |
| cart-demand samples / people | 38 / Cora (21, days 12.9–14.9), Basil (9, 19.5–21.1), Arlo (6, 32.5–33.0), Cole (2) |
| demand samples with a hammer in the pack | 1 (Cole) |
| demand samples with another project live (shelter, stock, repair, hoe or spear plan) | 38 / 38 |
| demand samples with a hammer carrier in sight | 22 / 38 |
| planner's lacking tool during demand | saw 13, hammer 5, none 20 |
| hammer borrow asks offered / hammer craft offered | 1 / 0 |
| cart batch plan wanted by anyone, ever | 0 |
| samples with a hammer in the pack and no cart demand | 1,303 (Kai, Zia, Tomas, Ben, Petra, Cole) |
| hammers crafted / carts / loans of any tool in 35 days | 6 / 0 / 0 |

Two separate facts, both verified in the samples:

1. **The lacking tool was the wrong one.** While Cora hauled wood to her own hut
   (the very hauling that grounds her cart demand), the site also wanted planks.
   `production.ts planRecipe` recorded the first tool any wanted recipe lacked, and
   sawing planks (a saw) was planned before the cart (a hammer). The saw is a
   convenience: hewing makes planks with no tool at all, and its option was on offer in
   the same samples. The hammer is required: no recipe builds a cart without it. Rules
   57 connected the lacking tool to borrowing, materials, crafting and the private tool
   plan, so all of them went after a saw, and the hammer was never asked for, gathered
   for or crafted by anyone who wanted a cart. This is a correctness defect in the
   rules-57 connection, not a tuning question.
2. **The people who want a cart and the people who hold hammers are different
   people at different times.** The four wanters were each in the middle of another
   project every time (a hut, a food reserve, a roof, a hoe); the six hammer holders
   made theirs for building and repair, hauled little, and never met the cart's grounds.
   A cart demand lasts half a day to two days; the project occupying the one project
   slot lasts longer. The cart batch plan ranks wants by weight, and a site's planks or
   bricks outrank a cart whenever both are wanted (Cole's one sample with hammer and
   demand together wanted planks). None of this is a defect in any one gate.

## Contract (rules 59)

Owner: `src/sim/production.ts noteToolWanted` / `toolRequiredFor`; the fact itself is
`Ctx.toolWanted` (`src/sim/optutil.ts`), which exists only during option derivation.
When a wanted recipe is stopped by a tool the person neither carries nor remembers on
the rack, the planner still records the blocker exactly as before. From rules 59 the
recorded lacking tool carries `required`: true when nothing this person could run makes
the wanted thing without a tool they lack (a raw material never qualifies, because it
can be gathered by hand; a recipe with a procedure they have not learned does not
count as a way). A required tool takes the place of a convenience recorded earlier; a
convenience never displaces a required one; otherwise the first found stands, as it
did. Nothing else changes: the same blocked rows are written, the same options are
offered, borrowing (`options_social.ts`), the rules-57 crafting pass and the tool-plan
hook consume the same field, and a world below 59 keeps the first tool found.

No state is added to any person, building or save. Lab `rich-no-tool-precedence`
restores the first-found rule at rules 59 and changes nothing below it. The immutable
rules-58 reference (`tests/v58_continuation.expected.json`, recorded at `7b2a680`
before this change) pins the ordinary river continuation and the staged cart-hammer
crafting continuation.

## Evidence

`tests/tool_precedence.test.ts`, five contracts on the rules-57 scene with a site that
also wants planks: rules 58 names the saw and rules 59 the hammer (required) from the
same blockers; a convenience is still recorded when nothing required is lacking, and a
remembered rack hammer leaves only the saw; the crafting pass and the borrow ask follow
the hammer and not the saw; the lab switch restores the saw at 59 and changes nothing at
58; a raw material's quarry tool is never required. Observer purity, conservation and
tool-record integrity hold. The staged scene is labelled staged; it is the rules-57
fixture with one more site requirement.

Ordinary rules-59 river/Normal/no immigration, 45 days (`viewer_evidence/tool59-river45/`):
the lacking tool during cart demand is now the hammer (required) in 18 / 38 samples
and none in 20 (the planner is not run while hungry, thirsty or tired); hammer borrow
asks were offered in 2 samples (Cora, day 13.5, to three carriers in sight at utilities
20.8–23.3 against a top option of 43.2; Basil, day 20.1, 21.9 against 36.5); no hammer
craft option, because no wanter ever held the two stone it takes. The final world is
identical to the rules-58 run in every physical respect: the only differing fields
are the ask cooldown keys (`askToolhammer` instead of `askToolsaw`) on Cora and Arlo.
Six hammers, zero carts, zero loans, as before. The repair is verified as correct and
as changing no decision in this world within 45 days.

## What this does and does not establish

It establishes that the lacking-tool fact now names the tool that stands in the way
and that the dependent paths follow it; it establishes with denominators why the river
world still builds no cart. It does not establish ordinary cart construction, an
aggregate benefit or any change to selection. The two remaining grounds are design
tensions recorded in the register, not defects to patch here: the cart's wanters are
occupied by the projects that ground the want, and a cart is outranked by the planks
and bricks the same sites want. Raising the cart's weight, letting a hammer plan jump
the project slot, or granting hammers would manufacture the outcome; a demand grounded
in witnessed hauling by others, or a yard-side cart want like the smithy's charcoal,
would be a new mechanism to argue for on its own evidence.
