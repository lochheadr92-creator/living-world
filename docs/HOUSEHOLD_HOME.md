# From needing a home to living in one

One complete, watchable situation: a household recognises that it has no proper home, decides what to do about it, gets
the materials, builds, and moves in — or meets an understandable reason it cannot finish. Rules version 7.

The product question this answers is the one in [PRODUCT_VISION.md](../PRODUCT_VISION.md): *can someone follow a household
from needing a home to living in one, and understand why it succeeds or fails?*

## What already existed, and the one thing that did not

Most of the chain was already built, and it was built properly. What was missing was in the middle.

| Link | Before this change |
|---|---|
| The household's shelter is read from what its members can see | **worked** (`options_work.ts hhState`, beliefs) |
| A household with no shelter lays out a lean-to; one in a lean-to lays out a hut | **worked** (`optPlanBuild`) |
| Only one site per household; no duplicate project from a decision race | **worked** (checked against beliefs *and* `world.sites`) |
| Somebody carrying what a site needs takes it there | **worked** (`optSites`, the `haul:<siteId>` option) |
| **Somebody goes and GETS what their own household's home site is short of** | **missing** |
| The work is done on the site | worked (`optSites` build option, `act_build.ts`) |
| The finished building becomes the household's home | **worked** (`buildings.ts completeSite` sets `hh.homeId`) |
| The household physically enters, sleeps, rests and leaves | **worked** (`habitation.ts`, rules version 3) |
| All of it survives a save and a reload | **worked** |

Delivery was only ever *opportunistic*: `optSites` offers to carry material to a site only when the person **already
happens to be carrying** what it needs. Nothing made anybody go and fetch it. Measured on seed `river`, Normal, 8 days,
on `b050816` before this change: of 8 hut sites laid out, 6 were finished, **1 sat untouched for five days and was
abandoned** under the stale-site rule (`world.ts clearStaleSites`), so its household had to start again, and 2 more stood
"waiting for materials" at the end of the window.

So the household-to-home chain was not absent. It leaked in one place, and a household could not say what it was doing
about its own roof.

## What was added

### The behaviour (rules version 7, rich worlds only)

`src/sim/shelter.ts` plus the `shelter` plan kind in `src/sim/intent.ts`. It is an ordinary private plan, of exactly the
shape of mending a roof or putting food by:

```
our household has no proper home  ->  our home site is short 4 wood and 4 stone
   ->  go and gather stone  ->  carry it to the site  ->  (the ordinary build option finishes it)
```

Nothing new was built underneath. The gathering is the ordinary gather option, the carrying is the ordinary site haul
(`haul:<siteId>`), the building is the ordinary build option, the ownership is the ordinary `hh.homeId` on completion, and
living in it is the ordinary habitation. The plan does what every plan here does: it keeps its step a candidate and nudges
it by at most `NUDGE` (14), and it speaks for the material so a wanted plank is not burned on the fire. Hunger, thirst,
cold, a wolf and a promise all still outrank it.

**What it reads.** Only this person's own beliefs: their household's home as they remember it, their household's site as
they remember it, and what that site still wanted *when they last saw it*. It never reads `world.sites`, never learns of a
site nobody has seen, and never consults the true remaining cost. A member who has not seen the site cannot plan for it;
they may be told of it by the ordinary conversation.

**It re-aims.** `wants` is set from what the site was last seen to need, one material and one trip's worth
(`SHELTER_BATCH` = 4) at a time, so a plan that has just delivered its wood goes after the stone rather than hoarding wood
the site no longer wants — and a plan never speaks for the whole cost of a hut.

**What it is not.** It does not lay out sites, choose where to build, assign anybody to anything, promise anything, create
or move material, or make a site finish. It plans one step ahead of the engine. A household that cannot get stone still
does not get a hut, and says so.

**One deadlock, found and fixed.** The reservation that keeps a wanted plank out of the fire also hid it from *the plan's
own* delivery: `optSites` computed what a person could hand over with `freeOf`, which subtracts what plans have spoken
for, so a plan would reserve four wood and then be unable to see them when the time came to carry them. `optSites` now
makes the same exception for a plan's own delivery step that it already made for a promise (`intent.ts planDeliveringTo`).

### Food comes before a house, deliberately

`adoptProject` reaches household food preparation (version 2) before a shelter plan, and one person carries one project at
a time. A household that can *see* it has next to nothing puts food by instead, and takes the shelter plan on once that is
seen to. This precedence is deliberate, it leaves `provision.ts` untouched, and it is pinned by its own test. The practical
consequence is that shelter plans are adopted when a household is not visibly short of food — about one per household per
eight days in the runs below.

### What the viewer can now follow

| Question | Where it is answered |
|---|---|
| Why do they need a home? | the person card's **Home** line, and the plan's `Why:` clause |
| What are they trying to do about it? | the plan on the card: goal, step, and whether the step is under way |
| Where is the home or site? | the site/home card; the plan names the site |
| What work or materials remain? | the site card ("Work has paused for lack of 3 stone", materials supplied *n*/*m*) |
| What is actually preventing progress? | the plan's `on hold:` reason, and the **Home** line for a household that cannot even start |
| When does it become their home? | the feed ("Mira finished a hut for the Briar household"), the home card's **Owner** |
| Who is physically inside it? | the home card's **Indoors** list, and the roof markers |

Two presentation changes carry this, both reading state that already existed:

* the plan's line on the card now says **how much this person's own hands have carried there** and **why they took it on**
  — the same two things a food reserve already said, for the same reason (`inspect.ts planLine`);
* the **Home** line says where the household lives and, when it has no proper home, the rule that is stopping it:
  *"Home: lean-to (77% sound) — the household has only 2 food to hand and wants 6 before starting a hut"*.

The reasons themselves are new (`options_work.ts noteHousingBlock`). They were silent before: a lone adult who will never
lay out a hut, or a household that has not got a day's food by, showed a card with nothing about their home on it.

**These reasons are versioned, not "presentation only."** A blocked entry has no utility, never enters `ctx.options` and so
can never be ranked or chosen — but the list of opportunities not taken is part of the decision record, which is serialized
and included in the deep state fingerprint. Writing one changes saved state, so it is gated on the rules version
(`shelter.ts explainsHousing`) exactly like a behavioural change, and a version-6 world comes back as it was recorded. For
the same reason `decision.ts` moves the housing entry to the front of the recorded list (which keeps only six) **only** at
version 7; below it the list is recorded in exactly the order it always was.

## Compatibility

* **Rules version 7.** Everything above is gated on `runsRulesVersion(world, 7)` and rich dynamics. Versions 1–4 and 6 keep
  their behaviour and their records; an unversioned world is never eligible; version 5 remains unsupported.
* **Version-6 continuation** is pinned by `tests/v6_continuation.expected.json`, recorded by `scripts/v6_reference.ts` from
  `b050816` **before any of this was written**. Beside the version-1 counts it carries who is indoors, how many solid homes
  stand and how many home sites are open — so a gate that leaked would be named in words, not only in a hash. Never
  re-record it to make a change pass.
* The save format is unchanged. `Intention.kind` gains `'shelter'` and `stepKind` gains `'deliver'`; both are additive and
  no older save contains them.
* The historical goldens, and the version-1, -2, -3 and -4 continuation references, are unchanged and were not re-recorded.

## The lab switch

`rich-no-shelter` removes **only** the plan to fetch a home site's missing material. Laying the site out, building,
ownership and habitation are untouched, and material carried for any other reason still arrives, so the arm isolates going
and getting it on purpose from everything that surrounds it. Below version 7 it changes nothing. The explanation on the
card is *not* removed by it: a viewer of that arm can still see why nobody is building.

## What was measured, and what it does and does not show

Four seeds, Normal, arrivals off, 8 days (19,200 ticks), current rules against the same rules with `rich-no-shelter`:

| | households | housed | home sites laid | finished | lost unfinished | plans | finished plans | units carried on purpose | alive |
|---|---|---|---|---|---|---|---|---|---|
| **with shelter plans** | 46 | 27 (0.59) | 49 | 45 | **0** | 48 | 28 | **127** | 110 |
| **without** | 45 | 28 (0.62) | 52 | 46 | 1 | 0 | – | 0 | 111 |

Per seed, housed households were brook 10 vs 9, meadow 6 vs 7, river 5 vs 6, stone5 6 vs 6.

**The mechanism works.** 48 plans were taken on, 28 ran to a finished home, and 127 units of wood and stone reached home
sites *because somebody meant to take them there*, each with a recorded reason for how it ended.

**No aggregate housing benefit is claimed, and none was found.** 27 of 46 households housed against 28 of 45 is a wash:
the arms diverge chaotically from the first tick, four seeds cannot separate a difference of one household, and the
direction is not even consistent across them. Survival is unchanged (110 against 111 alive). The one abandoned home site
in the control is a single event, not a trend.

That is a legitimate result for this change. Per [DEVELOPMENT_POLICY.md](DEVELOPMENT_POLICY.md), "Matching evidence to the
claim": the claim here is that the situation is now **followable and deliberate**, not that more households get housed.
Anyone wanting an aggregate claim needs an ensemble, which was not run.

## The retained example

`home_evidence/river.json`, from `scripts/household_home.ts` — an ordinary autonomous run, nothing staged, nobody told
what to do. Seed `river`, Normal profile, arrivals off, ticks 0–19,200, rules version 7.

**The Willow household (1135)** — Ivy (1136), Basil (1137), Thea (1138), Nico (1139):

| tick | what the records say |
|---|---|
| 591 | laid out lean-to site #1640, wanting 4 wood |
| 2955 | lean-to #2592 finished; it becomes their home |
| 5179 | laid out hut site #3453 at (34,50), wanting 8 wood and 4 stone |
| 5180 | Ivy: *"means to get the household's hut built — because the household is still in a lean-to, and their hut wants 8 wood and 4 stone"* |
| 5190–5643 | Ivy's steps: get 4 wood → get 2 wood → **take 2 wood to the hut** |
| 5848 | Basil takes a plan on too, now for the 3 stone still wanted |
| 5857–7322 | both after stone; the site reaches 5 wood, 3 stone |
| 7498 | the hut wants nothing more; Ivy's step becomes *"the hut has its materials; it wants building"* |
| 7709 | **hut #4359 finished and becomes the Willow household's home**, built by Ivy |
| 7710 | Ivy's plan ends **DONE**: *"the household has a hut, and they carried 4 of its materials"* |
| 7712 | Basil's ends honestly: *"the household got a hut without their carrying anything to it"* |
| 8425 onward | Thea, Basil, Ivy and Nico go inside to sleep and rest, and come out again |

Saved and reloaded at the end: byte-identical, same hash (`ee4bbda0`), same households housed.

**Limits of this example.** One run of one seed. It shows the chain is possible and that every link is recorded. It is not
evidence that more households get housed, that anybody survives better, or that this happens in every world.

## Verification

```
npx --no-install vitest run tests/household_home.test.ts     48 tests
npx --no-install vitest run                                  944 tests in 90 files
npm run build                                                typecheck + bundle
npx --no-install vite-node scripts/golden.ts                 all historical fingerprints match
git diff --check
```

All passed. The goldens and the version-1/2/3/4/6 continuation references were **not** re-recorded.

Three defects were found and fixed during the work, each with a test that fails without the fix:

1. the plan's own material reservation hid the material from its own delivery (above);
2. a plan that timed out while *carrying* its material reported "it still wants nothing", because the message read the
   pack rather than the site — it now reports what the site still wanted when last seen;
3. the blocked housing reasons changed the deep state fingerprint of every world including authored ones, because the
   decision record is serialized — they are now gated on the rules version.

### In the page

`node scripts/browser/household_home_check.mjs http://127.0.0.1:5287/ home_evidence/page` — **16/16**. It is not a staged
fixture: it creates the ordinary autonomous `river` world, steps it with the real `stepWorld`, and asks the real interface
what it says. It checks that an ordinary run produces a shelter plan; that the card states the goal, the step, the grounds
and what has actually been carried, and that those words are the state underneath; that the site card is the household's
own and says what it is waiting for; that a household reaches a home and goes inside it; that the home card names the owner
and lists who is actually indoors; that the feed recorded it; that saving and loading keeps all of it; and that an unhoused
household's card says which rule is stopping it.

Screenshots in `home_evidence/page/` were **looked at**, not only asserted on: `plan-under-way.png` (Cora's card reading
"Get the household's hut built. Step: get 3 stone for the hut… Why: the household is still in a lean-to"),
`site-waiting.png`, `home-occupied.png` (the hut card: Owner *Briar household*, Indoors *Emre: Sleeping inside the hut*,
Built by *Mira*), `home-after-load.png`, and `why-not-building.png` (Zia's Home line carrying the reason). Automated
browser assertions and a look at a screenshot are not a usability study, and no claim is made about what people in general
would understand from it.

## Known limits, unresolved

* **A single-member household can never build a hut.** `optPlanBuild` requires `members >= 2`, a rule that predates
  habitation (version 3), which is what made a solid home genuinely protective. Four of twelve households on seed `river`
  are in this position and stay in open lean-tos indefinitely. This change does **not** alter that rule — it only makes it
  visible ("a hut is a job for a household of two or more"). Whether a lone adult should be able to build is a behavioural
  question for a separate, authorised task.
* **Stone is the usual bottleneck**, and plans frequently lapse one or two stone short and are taken up again after their
  cooldown. That is legible in the records, but it means a hut often takes several plans rather than one.
* The three-day patience (`SHELTER_PATIENCE`) was chosen to match the existing plan kinds, not measured.
* No ensemble was run and no acceptance baseline was recorded or replaced.
