# Shared stone: a storehouse for everyone and a way to carry stone to it (rules 162)

Owner request, 7 November 2026, after a recurring stone shortage in a lived life (`review_evidence/lives-20261106/`): a storehouse is a
natural thing for a group to build, so make sure at least one is built; let anyone take what they want from it for free until there is a
money system; let stone be stored and retrieved there; let stone be moved to it from a quarry; and encourage using stored stone in more
building and making. Everything below is `src/sim/shared_stone.ts` plus the small hooks it names. Rules 161 and earlier are unchanged.

## What was found first (ordinary worlds, rules 161, read-only probes in `review_evidence/stone-haul-20261106/`)

1. **None of the 578 stone that left packs went into any store**, in four 25-day worlds.
2. **Three of the four worlds never laid out a storehouse.** The offer reached only 0.1-0.5% of ordinary decisions. Among adult and
   youth person-samples the first thing to stop them was: the four-site open cap (35-41%), their own household's open site (22-29%), no
   solid home yet (20-25%); only 10-18% got as far as the household food-shortage and temperament gates, which were the ones the owner
   called out. When it was weighed it ranked 2nd-5th, a median 6-9 points behind the choice.
3. **Cut stone sat at quarry yards unused.** Yards held 5-18 stone while sites lacked 5-13. In 81% of cases (river, meadow; 96% in
   forest) a person who knew the yard, believed it held stone and was allowed to draw it was offered no collect option at all, because the
   site-material fetch path listed only one's own home and storehouses. A yard is open to its owner household and, when public, to everyone;
   the real yard still decides (earmarks, builders' shares).
4. **Storing is gated shut.** Once a storehouse stands, the rules-136 restock needs an idle person: of the awake, fed people who know the
   store, 83-96% hold a stone need of their own (a site, a tool); 0-6 of about 3,500 person-samples per world passed every gate.

## What rules 162 does (four parts, each removable in the lab)

| part | lab removal | what it does |
|---|---|---|
| first storehouse | `rich-no-first-storehouse` | A settlement with a solid home and no storehouse standing or being built lays one out: no household-food or temperament gate, outside the open-site and basic-site caps (the marking-out activity is not turned away), one household's open site does not hold the person back, utility 30-40. Personal hunger and thirst (over 28) still wait. A second storehouse (a larger town's allowance) keeps the old gates. |
| quarry yard as a store | `rich-no-quarry-stone` | A quarry yard that is public or the person's own household's is a place to collect **stone** for a site, a promise or a tool, scored a little above a loose rock ("cut stone is waiting"). The withdrawal re-checks the real yard. |
| stone restock | `rich-no-stone-restock` | The public store aims at 16 stone (was 8). A person with no stone need of their own, a plan, a promise or an errand, who is fed and awake, carries cut stone from a yard to the store (preferred over breaking rocks), where it is stacked through the existing communal deposit. Wood keeps its old rule. |
| stored-stone cue | `rich-no-stored-stone-cue` | A public store known (seen within a day) to hold the stone a building costs gives that building a small pull: +5 utility to a hut, cellar or well, +0.15 signal to a kiln, smithy, granary, bakery or hall that already had a reason. |

`rich-no-shared-stone` removes all four (exactly rules 161 behaviour).
Stored goods stay free for anyone who knows the store (`withdrawAllowance` has no access check for a storehouse); a storehouse is public
(`hhId 0`) because a township makes it a civic project. Nothing is created: stone moves from a yard to a store to a site.

## Evidence

- **Single seeds, 25 days, four ordinary worlds (`ab/`, `ab3/`; unsampled twin matches and goods conserved in every run).** The storehouse
  was laid out on days 2.4-3.3 and finished on days 5.0-6.3 in forest, river and meadow (none at all at 161); stone drawn from the public
  quarry went from 0, 0 and 18 to 18, 24 and 16 (life-stages-6 1 to 47). The survival numbers of single worlds moved both ways (forest 12 to 3,
  life-stages-6 34 to 29, meadow 35 to 21, river 20 to 30) and are not an estimate; hence the ensemble.
- **Paired ensemble (`lab162/`, 12 seeds, Normal, 25 days, fork at day 0; control, two random-draw controls for the noise floor, and three removals).**
  Nothing about survival is distinguishable from the noise floor. All parts removed: 21.6 people against 23.3, +2.0 deaths (intervals include
  zero); first storehouse removed: 20.8 people, +2.3 deaths (intervals include zero), projects done -3.4 (within the noise floor); quarry part
  removed: nothing moves. Shared projects completed per world: 0.9 with the storehouse, 0.1 without it, lower in 11 of 12 seeds.

## Not claimed / open

- **The store still holds about no stone in ordinary worlds** (mean 0, maximum 1 in four worlds). The restock gate is open now, but every
  awake, fed person holds a stone need of their own, so there is no surplus: stone is production-limited, not access-limited. A store fills
  only when stone is made faster than it is used, which needs a motive to produce for the store (a reserve plan, more quarry work); that is
  the next step and is not done here.
- The stored-stone cue has no stone to read in ordinary worlds, so it is covered by staged tests only. No new stone-using building type was
  added: with stone short, more stone buildings would only deepen the shortage.
- No benefit is claimed. The ensemble is one set of 12 seeds in the Normal profile at 25 days.

Tests: `tests/shared_stone.test.ts` (staged; each check has the rules-161 contrast). Probes: `review_evidence/stone-haul-20261106/`
(`storehouse-gate.ts`, `quarry-access.ts`, `quarry-why.ts`, `restock-gate.ts`, `ab.ts`).
