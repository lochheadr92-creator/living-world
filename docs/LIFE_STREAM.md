# The life stream: rules 200, 201 and 202, and what the lab says of each part

Predecessor rules 196 is pinned by `tests/v196_continuation.expected.json` (197 to 199 are unused). Origin: the mechanism census of 11 November 2026
(`docs/MECHANISM_CENSUS_20261111.md`) and its plan (`docs/LIFE_PLAN_20261111.md`), reshaped by the owner into three batched versions of separately switched
parts after the rules-162 pattern, implemented first and measured afterwards. Stream: life (`docs/RULES_RANGES.md`, 200 to 204).

## The parts

| rules | part and switch | what it changes | where |
|---|---|---|---|
| 200 | approach (`setCompany(_, 'approach')`) | a childhood or learning ask adds a request's 0.12 to the stop-and-talk roll; an approach is committed for its walk | `company.ts`, `social.ts`, `options_social.ts` |
| 200 | learning | the coaching ask is open as before, or when no drive is pressing | `company.ts`, `options_social.ts` |
| 200 | meal | the invitation to eat together may be made from 0.35 of the day | `company.ts`, `meals.ts` |
| 200 | larder | food believed to be in the host's own home store counts toward an invitation; a host short of food takes it from home before laying the table | `company.ts`, `meals.ts` |
| 200 | market | with no hall the market is called at the fire, four households, day 6 or later | `company.ts`, `occasions.ts` |
| 201 | shared yard (`setSharedYard`) | a timber yard laid out by somebody who believes in no yard is the shared layout | `shared_yard.ts`, `production.ts` |
| 201 | stalled ask (`setStalledAsk`) | the ask for a household site's materials gains weight from half a day of waiting, and from a day is made beside a quick trip of the asker's own | `stalled_ask.ts`, `options_social.ts` |
| 202 | swap (`setSwapAndFire(_, 'swap')`) | a swap for food gains the walk it saves to known food, at most 18 | `swap_and_fire.ts`, `options_social.ts` |
| 202 | fire | a fire with a gathering called at it is fed from 400 believed fuel; a host with no wood may ask a neighbour to keep it | `swap_and_fire.ts`, `options_work.ts`, `options_social.ts` |

Rules 196 and earlier, authored worlds and a part switched off keep the old behaviour. Not built: inviting a friend who is out of sight (an approach steers toward
its target's true position). Plan item 9, remembered emptiness, was a measurement: `scripts/emptiness_probe.ts`, below.

## Measurement

Everything from a clean worktree of `a7d17666` (`provenance.json`: `dirty` false, `modified` empty); evidence in `review_evidence/life-20261111/`.

**Attribution lab** (`parts202/`): `scripts/lab.mjs`, 12 seeds (aspen, birch, cedar, fern, gen-1 to gen-6, meadow, river), Normal, fork 0, 25 days, arrivals on,
twelve arms: control, `nudge:1`, `nudge:2` and one removal arm for each of the nine parts. 144 processes, 24 at a time, 44 minutes 27 seconds; one process peaked at
949 MB. Each row below is the reference (mean of the control and the two nudges) against the arm with that part removed, with the lab's own verdict; an effect
inside the noise floor is never called larger than chance.

| part | measure | with the part | without it | verdict |
|---|---|---:|---:|---|
| learning | coaching conversations | 6.3 | 3.3 | larger than chance |
| approach | approaches that ended before any talk | 840 | 964 | larger than chance |
| approach | coaching conversations | 6.3 | 4.8 | systematic, inside the floor |
| market | markets called | 3.0 | 0.0 | by construction (no market without a hall before) |
| market | talk about a swap | 8.6 | 6.1 | systematic, inside the floor |
| larder | meals sat down to | 2.0 | 0.8 | systematic, inside the floor |
| meal | meals sat down to | 2.0 | 1.3 | not distinguishable |
| fire | times the fire went out | 21.0 | 24.4 | systematic, inside the floor |
| stalled ask | asks made, units delivered | 1.9, 1.1 | 2.2, 1.3 | not distinguishable |
| shared yard | day the first yard stands | 14.3 | 9.3 | systematic, inside the floor: the WRONG way |
| shared yard | jobs finished at a yard | 14.2 | 19.8 | systematic, inside the floor: the WRONG way |
| swap | tools in hand | 46.2 | 53.2 | systematic, inside the floor: the WRONG way |
| swap | projects done | 58.3 | 64.5 | systematic, inside the floor: the WRONG way |
| swap | people at day 25 | 31.3 | 32.8 | systematic, inside the floor: the WRONG way |

Reading it. The coaching gate and the approach rules do what they were for, beyond chance. The market happens. The larder and the fire lean the right way
inside their floors. The meal window and the stalled-site ask show nothing. Two parts lean harmful: the shared yard arrives five days later than a private one
(a shared project needs accepted supporters before anyone may build), so less is made in it inside 25 days; and the swap part costs tools, projects and people,
as the rules-51 record in `optTrade` warned (a swap proposed is mostly refused, and proposing it has a cost).

**The stream as a whole, rules 196 against 202** (`versions-196-202.txt`, `scripts/lab_versions.ts` on the three arms both runs carry; 196 is
`review_evidence/balance-20261111/final196/r196/`): coaching 2.9 to 6.3 (+3.4 [+2.2, +4.6], larger than chance); meals sat down to 0.4 to 2.0 (+1.6, systematic
inside the floor); life share of ended-activity time up in 11 of 12 seeds (larger than chance); other talk 553 to 609; child play 70 to 75 and foraging practice
121 to 126 (systematic inside their floors); spare-time outings 20 to 23. Against it: chats 114 to 93 (-20.4 [-28.9, -11.9], lower in 12 of 12, larger than chance,
cause not yet traced to one part); the first yard day 10.2 to 14.3; tools in hand 50.1 to 46.2 and projects done 63.7 to 58.3 (systematic inside their floors).
People 30.6 to 31.3, deaths 2.5 to 1.8, hunger and cold exposure: not distinguishable.

**Remembered emptiness** (`emptiness-*.json`, four seeds, 25 days, every living person's blocked options every 100 ticks): a person blocked because they "believe
it is empty" is right 91 to 92 percent of the time for bushes, grain, fruit and fish (when wrong the source holds one unit, and their belief is about twice as old
as when right), and one blocked because they "remember it being empty" is right 95 to 99.6 percent of the time for stores. It is real scarcity. No rule follows.

## Verification

- Contract tests, each with the previous-version contrast: `tests/company.test.ts` 13, `tests/shared_yard.test.ts` 5, `tests/stalled_ask.test.ts` 7,
  `tests/swap_and_fire.test.ts` 9, `tests/life_tally.test.ts` 4. `npm run typecheck` clean.
- Immutable pins `tests/v200_continuation.*`, `v201_continuation.*`, `v202_continuation.*`, recorded from a clean checkout of `24918e9c`, each on its first run
  (rules 200: an approach committed for its walk seen inside 2,400 ticks; 201: a shared yard laid out by tick 19,800; 202: a choice on a rules-202 reason by tick
  8,000; each then 120 ticks after a save and load). As their notes say, the 200 and 201 pins were recorded with the later versions present in the tree and gated
  off for the world: weaker than the usual "before successor" rule.
- Full suite from the clean checkout of `a7d17666` (`suite-head-202.log`, gitignored as a log): 16 files failed of 591, 72 tests of 3,293. The failing tests are
  the same 61 names as at the rules-196 head (`review_evidence/balance-20261111/suite-head-196.log`): none new, none gone.

## Open, for the owner

1. The shared yard and the swap part lean harmful and the stalled ask and the meal window show nothing. By the plan's own rule a part that does not clear its floor
   in the right direction is switched off. Doing that changes rules 201 and 202 worlds, which are pinned, so it is a new rules version (203) that turns those parts
   off, not an edit. Proposed: 203 turns off swap and the shared yard; the stalled ask and the meal window stay, as harmless. Done at rules 203 (the section below).
2. The fall in chats (114 to 93) is unexplained. The removal arms put chats at 79 to 104 against a reference of 93 with a floor near 20, so no single part owns
   it; the committed approach is the first suspect (an approach that used to be dropped for a chat nearby is now carried through). A probe of what chats lost to
   would settle it.
3. A shared project that needs supporters before anyone may build is why the shared yard is slow. A yard that is private to build and open to use (an access rule,
   not a civic project) is the smaller design, if the yard's use is still wanted.
4. From three lived lives at rules 202 (a child, an adult and an elder in meadow): a pupil is offered, again and again, teachers who cannot teach her (a teacher
   must know more than the pupil, and nobody remembers the refusal); and the site cap ("too many projects under way already", "another layout already reserves this
   footprint") refused a hut five times in two days to two people who wanted one. The first of the two refusals is repaired at rules 203 (the section below); the footprint refusal is not.

## Rules 203: a first roof outside the site cap; the shared first yard and the swap's saved walk retired

Owner instruction, 11 November 2026, after the elder Felix was refused a hut three times in two lived days ("too many projects under way already"): fix the
building cap first, with the two parts that leaned harmful switched off. One version, two separately switched parts (`src/sim/home_first.ts`).

| part | what changes | lab removal |
|---|---|---|
| cap | A hut for a household with no solid home, and a lean-to for a household with no home at all, is offered and marked out even when the settlement already has its four open sites (`optPlanBuild` in `options_work.ts`, `siteConflict` in `act_build.ts`). Every other layout, and a household that already has a hut, keeps the cap. | `rich-no-home-first` |
| retire | The shared first timber yard (rules 201) and the swap's saved walk (rules 202) no longer apply from 203. Rules 201 and 202 worlds keep them. | `rich-keep-yard-and-swap` |

Contract tests `tests/home_first.test.ts` (8, each with the rules-202 contrast). One existing case in `tests/winter_shelter.test.ts` is pinned to rules 202, with a
comment, because at 203 a homeless household's first shelter passes the cap by design. Immutable pin `tests/v203_continuation.*` (Normal gen-2, arrivals on; a
home laid out past the four-site cap is first seen by tick 800; then 120 ticks after a save and load), recorded from a clean checkout of `06766d32`.

Lab: clean checkout of `06766d32` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, `nudge:1`, `nudge:2` and the two removal arms, 60
arms in 17 minutes 24 seconds. Evidence: `review_evidence/life-20261111/r203/`, `versions-202-203.txt`, `run203.txt`.

Rules 202 against 203 (`scripts/lab_versions.ts`, the control and the two nudges of each lab, the rules-202 lab being `parts202`):

| measure | 202 | 203 | verdict |
|---|---|---|---|
| solid homes | 10.2 | 11.8 | larger than chance, higher in 11 of 12 seeds and lower in none |
| day of the first yard | 14.3 | 8.5 | larger than chance, earlier in 12 of 12 |
| spare-time outings | 23.3 | 14.7 | larger than chance, fewer in 12 of 12 |
| preparation plans finished | 9.2 | 4.7 | larger than chance, fewer in 12 of 12 (dropped 110.1 to 117.7) |
| chats | 93.3 | 113.2 | systematic, within the noise floor, higher in 12 of 12 |
| child play | 74.8 | 67.0 | systematic, within the noise floor |
| family time | 83.1 | 78.8 | systematic, within the noise floor |
| coaching | 6.3 | 4.3 | systematic, within the noise floor |
| shared meals | 2.0 | 1.3 | systematic, within the noise floor |
| trade talk | 8.6 | 6.0 | systematic, within the noise floor |
| people, deaths (1.8 and 1.8), tools, projects done, mood | | | not distinguishable from chance |

Each part, removed inside rules 203 (reference: the mean of the control and the nudges):

| measure | 203 | cap removed | retirement undone |
|---|---|---|---|
| solid homes | 11.8 | 10.4, larger than chance (lower in 11 of 12) | 11.8 |
| households without a solid home at day 25 | 1.1 | 1.9, within the floor (more in 9 of 12) | 0.9 |
| home sites still open | 1.3 | 1.9, within the floor | 1.2 |
| deaths | 1.8 | 3.8, not distinguishable ([-0.6, +5.8]) | 1.7 |
| day of the first yard | 8.5 | 9.7, within the floor | 13.5, larger than chance (later in 10 of 12) |
| tools | 44.3 | 43.8 | 40.0, not distinguishable (lower in 10 of 12) |
| projects done | 59.2 | 59.0 | 55.2, not distinguishable (lower in 9 of 12) |
| spare-time outings | 14.7 | 21.8, within the floor | 22.3, larger than chance |
| child play | 67.0 | 78.0, larger than chance (higher in 10 of 12) | 73.6, within the floor |
| preparation plans finished | 4.7 | 8.7, larger than chance | not listed |
| chats | 113.2 | 92.1, within the floor | 103.8, not distinguishable |

What that supports, and what it does not:

- **The cap part does what it was built for.** About one and a half more solid homes a settlement, beyond chance, and fewer households left without one (inside
  the floor). Sites abandoned do not rise (3.0 against 2.8).
- **The retirement does what it was built for.** The first timber yard comes five to six days sooner, beyond chance, back to where rules 196 had it. Tools and
  projects done lean up with the two parts retired and are not distinguishable.
- **Both parts cost idle time.** Spare-time outings fall by about a third, and the cap part lowers child play by eleven sessions (larger than chance on its
  removal arm) and halves finished preparation plans. People who may now build a home are building it. Family time, coaching and shared meals lean down across
  the versions, all inside the floor. This is the opposite direction to the life stream's aim and it is the first thing the childhood and play plan should be
  measured against (`docs/CHILDHOOD_AND_PLAY_PLAN.md`).
- **Chats are back at the rules-196 level** (114 at 196, 93 at 202, 113 at 203), and inside rules 203 the arm without the cap part sits at 92. Every one of those
  comparisons is inside the noise floor, so nothing is claimed; the mechanism is still not traced.
- Not run: the full suite at the rules-203 head (the owner's rule is one suite at the end of a stream). Not touched: the layout-footprint refusal the adult Dax
  met twice ("another layout already reserves this footprint or its access gap", `layout_claims.ts`), which is a different rule from the cap.

## Rules 204: a basket is worth getting

Owner instruction, 11 November 2026, after the childhood probe showed under-twelves taking a quarter of a settlement's food: grown people should want to carry
more, and that should be attractive in itself, "rather than having it gated by depending on a number of something". One version, three separately switched parts
(`src/sim/carry_more.ts`).

The baseline was not rerun. It is the mechanism census of rules 196 (`review_evidence/balance-20261111/census`: about 7 baskets made a settlement in 25 days
among about 21 grown people, no handcart in any of twelve settlements, and "no room in my pack for one wood" the largest block on the way to a basket) and the
rules-203 lab recorded above.

| part | what changes | lab removal |
|---|---|---|
| want | Every grown person without a basket wants one from the start, at 1 + foraging skill or 2.1, whichever is more (before: only after gathering more than six units). A tool whose makings are already in hand comes before a basket whose wood is not. | `rich-no-basket-want` |
| room | When the wood a basket still needs does not fit in the pack, bringing food home scores 10 more, says why, and one spare portion is enough (two before). | `rich-no-basket-room` |
| worth | The wood trip for a basket and its making each score 8 more than for another tool. | `rich-no-basket-worth` |

`rich-no-carry-more` removes all three and equals rules 203. Contract tests `tests/carry_more.test.ts` (12, each with the rules-203 contrast).
`tests/tool_plan_capacity.test.ts` M1 is pinned to rules 203 with a comment (its scene stages an axe as the only tool wanted; from 204 the same elder takes on a
basket she can carry). Immutable pin `tests/v204_continuation.*` (Normal gen-2, arrivals on; a grown person who has gathered six units or fewer means to make a
basket by tick 100; then 120 ticks after a save and load), recorded from a clean checkout of `70f33555`. A handcart is not part of this version.

Lab: clean checkout of `70f33555` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, `nudge:1`, `nudge:2` and the four removal arms, 84
arms in 30 minutes 16 seconds. Evidence: `review_evidence/life-20261111/r204/`, `versions-203-204.txt`, `run204.txt`.

Rules 203 against 204 (`scripts/lab_versions.ts`, the control and the two nudges of each lab):

| measure | 203 | 204 | verdict |
|---|---|---|---|
| tools in hand | 44.3 | 55.6 | larger than chance, higher in 10 of 12 seeds |
| projects done | 59.2 | 69.9 | larger than chance, higher in 10 of 12 |
| buildings | 33.5 | 34.7 | systematic, within the noise floor |
| people, deaths (1.8 and 1.9), solid homes, hunger, mood, chats, family time, child play, spare time, coaching, shared meals | | | not distinguishable from chance |

Each part, removed inside rules 204 (reference: the mean of the control and the nudges):

| measure | 204 | all removed | want removed | room removed | worth removed |
|---|---|---|---|---|---|
| share of grown people holding a basket at day 25 | 0.84 | 0.59, larger than chance | 0.66, larger than chance | 0.82 | 0.75, larger than chance |
| grown people holding a basket | 18.6 | 13.2, larger than chance | 14.5, larger than chance | 18.0 | 15.6, larger than chance |
| tools in hand | 55.6 | 43.7, larger than chance | 50.1, within the floor | 55.7 | 48.9 |
| projects done | 69.9 | 58.3, larger than chance | 59.9, larger than chance | 65.7 | 65.3 |
| buildings | 34.7 | 33.1, within the floor | 33.8 | 33.9 | 32.3, within the floor |
| trips home made for the basket's wood | 16.3 | 0 | 32.4 | 0 | 25.9 |

What that supports, and what it does not:

- **Most grown people now have a basket.** Five in six at day 25, against under three in five without the rule, beyond chance. The want part and the worth
  part each carry a share of it, beyond chance.
- **More tools and more projects finished**, beyond chance, with nothing lost that the lab can see: people, deaths, hunger, mood, chats, family time and child
  play are not distinguishable from chance.
- **The room part shows nothing the lab can detect.** Its trips happen (16 a settlement) but the share with a basket is 0.82 without it against 0.84 with. It is
  kept as harmless; rules 205 generalises the same idea (one portion kept, the rest taken home).
- Food in the home store per person is lower with the three parts than without them (0.2 against 0.5, larger than chance): more of a household's food is in
  packs. That is the thing rules 205 addresses.
- Not run: the full suite at this head (one suite at the end of a stream). No handcart is built in any arm.
