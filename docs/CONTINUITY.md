# Continuity: taking up what the dead left unfinished, and the practice of keeping winter stores (rules version 53)

Delivered 2026-10-29 on `main` after rules 52 (`d2a1543`). Workstream 11 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).

## What stood before

A private plan died with its maker (`intent.ts intentionsOnDeath`: dropped, "they died"). The house site kept what had
been carried to it and the pile kept what fell from the dead's pack, but nobody in the household had any reason to pick
up where they had stopped beyond the ordinary cues, which may never fire again for the survivor: the shelter cue needs
the site in their own sight, the tool cue needs the tool wanted by their own work. The only practice a person could hold
was sharing supper (rules 24), learned through hosted meals; the one real seasonal preparation, the winter reserve (rules
2 and 46), left nothing behind in anyone when the winter was over.

## Contract

Gated on `runsRulesVersion(world, 53)` and rich dynamics; the rules-52 full serialized continuation
(`tests/v52_continuation.expected.json`) was recorded from `d2a1543` before any of it. Two lab switches:
`rich-no-succession` (nothing recorded at death, nothing taken up) and `rich-no-winter-practice` (no meal counted, nothing
learned, no cue earlier). Owners: `src/sim/succession.ts`, `src/sim/winter_practice.ts`. New saved state:
`Household.unfinished` (at most 4), `Household.reserveLaid`, `Person.winterPractice`, `Person.winterMeals`,
`Intention.succeeding`; all hashed and validated on load.

### Taking up what somebody left unfinished

**What is left.** At death, each active plan of the dead that served the household is read before the plans are dropped
(`lifecycle.ts killPerson`): a shelter plan for the household's site, a stock plan for its store, a batch for a site of
its own, a hand tool. The record names who, what, how far they had got (`worked`), what they had gathered for it and still
carried, and the pile their belongings fell into (`buildings.ts dropNear` now returns it). Nothing is copied into anyone
else's state.

**Who may take it up.** An adult of the same household who knows of the death by the rules-14 paths (witnessed it, was
told, read the grave; the world tells nobody), within six days of learning, with no live plan of that kind. The
undertaking must still stand by the survivor's own knowledge: the site known as the household's and still open, the store
known, the tool still not in the household's hands; otherwise the record is cancelled with the reason written in the
survivor's log ("the site is finished or gone"). A record older than the window lapses unremarked.

**How.** In the one place projects are taken on (`intent.ts adoptProject`), after the food reserve and before the
survivor's own roof or axe: the plan is built by its kind's own rules (the site's want for a shelter, the tool's recipe,
the preparation cue for a store, the batch want for a batch), and when the kind's rules give nothing to do now the record
waits. The plan carries `succeeding` (whom it continues, how far they had got), its goal reads "finish what Ada began:
…", the survivor's log says what was gathered and left where it fell, and a witness to the death learns the pile (so the
planner can collect from it like any heap); someone merely told does not. The plan is then an ordinary plan: weighed, set
aside, dropped and finished by the rules of its kind; a finished one logs "Finished what Ada began."

**What is preserved.** The site's delivered, used and contributed amounts; the pile's ownership and place; the promises
released at death (nothing is transferred without consent); the two-plan cap and the cooldowns; cancellation with a reason
when continuation is impossible. Achievement and later hopes stay with rules 38 (`achievement.ts`), untouched.

### Keeping winter stores

**The winter's record.** A season stock plan that reached its target marks the household's reserve as laid for the year,
by whom (`intent.ts settleIntentions` → `noteReserveLaid`). Each meal a member eats from their own household's store or
from a granary while it is winter is counted on them for that year (`act_resource.ts eat_store`, at the meal's end, by what
actually left the store); a dependant fed in winter by a member of a household whose reserve is laid counts the feeding
the same way (`social.ts onGift`, mode care).

**Learning, at winter's end.** On the first day of the new year (`hardship.ts`, where winter ends), in a household whose
reserve was laid that year: the one who laid it, having eaten `PRACTICE_MEALS` (3) from it, holds the practice as their
own ("laid"); any other member, child or adult, who ate three holds it from the layer ("family"). The counts are cleared.
Nobody learns it from a label, from membership, or from a winter they did not eat through; a holder who dies takes it with
them; a child holder keeps it into adulthood, where the cue first applies.

**What it changes.** A holder's season cue opens `PRACTICE_LEAD` (2) days earlier than the ordinary window
(`provision.ts preparationWanted`), and the plan's reason reads "winter is coming and we keep stores: the store is thin"
until the ordinary window opens. Nothing else: the target, the cap, the steps and the outcome are the rules-46 ones.

## Tests

`tests/succession.test.ts` (4): a shelter plan outlives its maker; the record on the household with the wood she carried
and the pile; the witness takes it up as the ordinary shelter plan naming whom it continues, learns the pile, and her wood
reaches the site by his hands, credited to him, the ledger conserved; a tool plan taken up by its recipe, by someone told
of the death (not a witness: no pile known), and not before; an undertaking whose site is gone cancelled with the reason;
a record past the window lapsed; switch, exact replay, observer purity, hash coverage, rules 52 unchanged.
`tests/winter_practice.test.ts` (4): a season reserve reaching its target marks the household's reserve laid at 53 and not
at 52; three winter meals from the laid reserve (the child's first a feed from his mother, the rest taken by himself) make
the practice at winter's end, the layer's own and the child's from her, a neighbour who laid none learning nothing, the
ledger conserved; a holder's cue two days before a neighbour's, with its own words, and the child holding it into
adulthood; switch, exact replay through a winter meal, observer purity, hash coverage, rules 52 unchanged.
`tests/v52_continuation.test.ts` pins rules 52.

## Ordinary worlds and the lab

Three 45-day seeds (`continuity_evidence/obs-45-{seed}`, `scripts/continuity_observe.ts`): five undertakings recorded at
deaths (a food reserve and a batch in river; a reserve and two tools in forest) and none taken up: river's one surviving
adult already had a reserve plan of his own, forest's households died in the famine that made the records. The practice
was learned by five people across the three seeds, four from the one who laid the reserve and one as her own; in forest
the holders took three season plans, one of them on the early cue. The 8-seed lab against each switch
(`continuity_evidence/lab-continuity/report.txt`) shows nothing beyond the noise floor; the preparation counts move as
much under a one-draw nudge as under either switch. The full table is in the slice log of DEPENDENCY_CHAIN_PROGRAMME.md.
No benefit is claimed.

## Limits

- A lapsed promise is not an undertaking here; promises are released at death as before.
- The succession plan is built by the kind's own rules, so a site the survivor cannot see, or a tool whose materials they
  cannot source, waits and lapses like any plan.
- One practice, one effect (the earlier cue); the second practice slice the brief allows (maintenance) is not here.
- No aggregate claim.

## Current-source follow-up audit during the autonomy programme

Rules 90's shared-meal custody repair does **not** repair succession. The following source
boundaries must be addressed before extending the death path to incapacity or departure:

- `successionBlocker` reads live site existence and every living housemate's registered tools.
  A remote completed site or an unseen tool can therefore end the undertaking without new
  personal evidence. The statement above that this is entirely the survivor's knowledge is
  too broad for the current implementation.
- `takeUp` observes the live death pile whenever the successor once witnessed the death,
  even if adoption occurs later and elsewhere. An original witness should retain the
  original observation; witnessing death is not permission to refresh remote stock forever.
- The historical wording "the pile's ownership" preserves registered tool identity, but an
  ordinary death pile has no household access marker for its other goods. Current pile
  withdrawal/eating treats those goods as public. Rules 90 introduces explicit custody only
  for meal leftovers, not estates or collapse salvage. Do not claim that estate goods are
  protected merely because their quantities balance or tool records retain an owner.

These are source findings, not new ordinary incidence measurements or delivered repairs.
Continue the existing WS11/20 row: establish locally informed records and actual ownership,
then voluntary temporary/departure handover, competing acceptance, original-worker recovery,
already-complete work and missing goods. Do not copy private skills, goods or obligations.
