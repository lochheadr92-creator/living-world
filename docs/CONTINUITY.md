# Continuity: taking up what the dead left unfinished, and the practice of keeping winter stores (rules version 53)

## Rules 92 — personally informed continuity

Predecessor rules 91 is published at `7046cc2`, runtime `3834df2`, immutable reference
`62909bc`. This closes the information boundaries reproduced below. Physical
estate custody and temporary/departure handover are still required next; this is not
whole-programme completion.

`continuity_knowledge.ts` owns dated work accounts on the existing relationship: at most
two heard undertakings and two records of what the person told that other person. An actual
`share_work` conversation communicates the speaker's active household shelter, tool, stock
or site-batch undertaking. Both phases require awake same-space contact. The listener can
refuse the conversation through the existing needs/busyness rules. Hearing and acknowledgement
are separate; neither creates a promise, transfers goods or copies ability. The speaker
can offer the same account again after a day, using their own record of speech rather than
reading the listener's private memory. A site/store report copies the speaker's dated belief
and cannot replace equally recent or newer knowledge. No live remote stock is read.

Death still records the engine's truthful unfinished work for the household observer.
Succession decisions require both personal death knowledge and a matching work account
actually heard while the worker was alive. The prospective successor sees the communicated
progress, goal and place, not later private progress, inventory or a newly revealed death
pile. Existing ordinary plan eligibility, priorities, cooldowns and limits still decide
whether to adopt. One actual adoption consumes the household record; another informed person
cannot inherit the same undertaking. Missing knowledge postpones only that person's attempt,
with a 400-tick retry, instead of deleting everybody's opportunity. Existing personal home
and reserve cues remain available without inventing a predecessor's intentions.

The existing succession owner now checks the survivor's remembered site and own/visibly
carried tools, and never refreshes remote belongings at adoption. Real perception, travel,
capacity and material handling still govern collection. The latest heard account appears
in relationship history with source conversation/time and an explicit statement that no
takeover was promised. AI/stub controllers use the same offered conversation and replay
the resulting knowledge; there is no new free-form command or protocol-shape change.
`rich-no-continuity-knowledge` removes this bounded mechanism. Rules 91 and earlier retain
their recorded meaning.

### Verification and preserved findings

- Four new boundary tests first failed (`autonomy-continuity92-before.log`), reproducing
  private-plan disclosure, remote tool/site reads, remote pile refresh and global deletion.
- Focused contracts, historical succession and the immutable rules-91 continuation pass
  **18 tests / three files**, **2.50 s**. An added urgent-listener refusal passes separately;
  the final contract file has **14 passing tests**. Typecheck/build pass with the existing
  bundle-size warning (JavaScript about 1,098 kB, gzip about 370 kB).
- Real speech → saved hearing → acknowledgement → informed adoption → real wood delivery
  passes, including conservation. Other contracts cover walls/sleep, interrupted phases,
  competing successors, stale later progress, bounded records, malformed provenance,
  own-project refusal and stale place reports. These are declared fixtures, not ordinary
  occurrence. An early fixture allowed the work to be abandoned for absent timber before
  the staged death; it is retained in the logs. The corrected boundary explicitly has a
  listener awaiting the conversation and declares the loss after actual acknowledgement.
- AI/stub live/replay passes **2/2**, **1.83 s**, with and without notes. Its first fixture
  lacked a viable timber source, so normal pre-choice review correctly ended the undertaking.
  The corrected declared source initially missed the initial ledger; that fixture failure
  was corrected before simulation. All failures remain in `autonomy-continuity92-protocol*`.
- Rendered checks pass **7/7** (`autonomy_evidence/continuity92-rendered`). The inspected
  screenshot shows actual speech and the listener's sourced account without a takeover
  promise. The scene then reaches physical delivery. No browser exceptions or observer
  mutation occurred. Final full regression passes **299 files / 2,014 tests** in **427.14 s**
  (`autonomy-continuity92-final-full-tests.log`). The two later-added AI replay cases pass
  separately; they were not in that full run's discovered file list.
- Reviewing that first scene's saved plan found that its later hauling happened after
  abandonment for lack of a known timber source. It therefore did not prove retained-plan
  delivery. The corrected declared fixture provides a real known tree, and a stronger
  assertion requires the successor plan to remain active when wood reaches the site.
  Final contracts and AI replay pass **16/16**, **1.88 s**; final rendered checks pass **7/7**
  under `autonomy_evidence/continuity92-final-rendered`. At tick **690**, Ben has delivered
  **two wood**, his inherited shelter plan is still active and credits **two work**. The
  record keeps Ada's earlier reported work at zero, despite her later staged 37. This proves
  actual delivery under the inherited intention; it does not trace every fungible wood unit
  back to the death pile. The original incomplete proof remains available. No runtime
  behaviour or ordinary-world conditions were changed to repair the fixture.
- The initial full-suite invocation selected an unavailable reporter and exited before
  tests; the corrected invocation is recorded separately. This was a runner invocation
  error, not a simulation pass or failure.

### Ordinary five-day screen

`scripts/informed_continuity_observe.ts` runs fixed Normal rich worlds, immigration off,
**12,000 ticks** each, with source manifests, exact unobserved twins, daily resource checks,
100 full-save observer-purity checks and validated final saves. All checks pass. Counts
below are repeated samples, not independent opportunities.

| Seed | Active-project samples | Sharing offer samples / ranked first | Actual starts | Heard / acknowledged | Completed / failed conversations | Living / deaths |
|---|---:|---:|---:|---:|---:|---:|
| river | 1,837 | 333 / 3 | 4 | 4 / 4 | 4 / 0 | 28 / 0 |
| forest | 1,775 | 298 / 4 | 5 | 2 / 2 | 2 / 3 | 28 / 0 |
| meadow | 1,754 | 407 / 3 | 4 | 4 / 4 | 4 / 0 | 27 / 1 |

Every world has **zero successor projects**. Forest Hal #924 communicates his pick plan
#980 to #923 at tick **2651**, conversation #2098. Later attempts fail because Delia is
already talking (5256), Zeke has pressing needs (6975), and Thea is too busy (7959).
Thea #934 then communicates basket plan #3896 to Zeke #935 at **7978**, conversation #4015.
Meadow Yara #1026 communicates shelter plan #2205, site #2132, reported work **5**, to
#1027 at **7927**, acknowledged **7949**. These are actual heard accounts, not takeovers.

The adverse meadow result is retained: **Talia #1029, age eight, dies of thirst at tick
8746**. This is not attributed causally to work-sharing by the short screen. No welfare
or survival improvement is claimed. River/forest have 2,800 person samples; meadow has
2,773. Runtime is **45.42 / 39.98 / 43.73 s**; final saves are **3,139,687 / 2,802,585 /
2,592,752 bytes**, respectively, while other tests also ran. These are not isolated mature
Large-world performance measurements. Outputs: `autonomy_evidence/r92-{river,forest,meadow}`.

### Next physical boundary: estate custody

The rules-92 declared execution audit `autonomy_evidence/estate93-audit.ts` places an
outsider at the deceased's real belongings and starts the existing withdrawal action.
It transfers all **three wood** from household #1 to household #9, with the resource ledger
still balanced (`autonomy-estate93-audit2.log`). No estate owner is recorded. The first
fixture omitted the random generator needed to create the outsider and failed before
simulation; it is retained separately. This is a reproduced authorization gap, not an
ordinary theft-frequency measurement or a delivered repair.

The next owner is physical pile custody, preserving separate registered tool owners where
borrowed tools fall with the belongings. Keep the estate distinct from public piles and
meal leftovers, validate contact/capacity again at removal, and let only actual perception
or a dated report reveal the place. Informed incapacity/departure handover follows this
physical boundary. Neither capability is claimed here.

## Historical rules-53 delivery

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

Further source tracing during rules 91 identifies an earlier information boundary:
`collectUnfinished` copies the deceased's private plan, progress and carried quantities into
the household record. `successionWanted` treats knowing the death as sufficient to read that
entire record, including a never-communicated tool intention. Death news alone does not
communicate private work or belongings. The existing rules-53 test explicitly expects that
historical behavior; preserve it below the new boundary instead of weakening its contract.

An informed continuity extension therefore needs actual work/intention communication while
the worker is alive, or explicitly sourced observation of a public undertaking. Keep the
observer's truthful record separate from what a prospective successor has learned. The
same contact machinery can support voluntary temporary coverage and eventual handback,
without copying skills, inventory or promises. Missing knowledge should leave the normal
household-building/reserve cues available rather than granting an unseen private project.

The declared rules-91 boundary fixture `autonomy_evidence/continuity92-audit.ts` reproduces
three source findings (`autonomy-continuity92-audit2.log`): a registered axe on an unseen
housemate blocks the tool undertaking; a remote cancelled site blocks a still-remembered
site; and adopting as a past death witness refreshes a pile **42.426 tiles away**, changing
the belief timestamp from 0 to 100 and remembered wood from three to zero. Conservation
still holds. The first audit's tool count lacked its required identity record and did not
reproduce the tool finding; that fixture error and first log are retained. The corrected
fixture uses the standard starting-equipment helper. These are staged boundary proofs,
not ordinary incidence, repaired behavior or evidence of household benefit.
