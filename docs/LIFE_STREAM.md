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
   off, not an edit. Proposed: 203 turns off swap and the shared yard; the stalled ask and the meal window stay, as harmless.
2. The fall in chats (114 to 93) is unexplained. The removal arms put chats at 79 to 104 against a reference of 93 with a floor near 20, so no single part owns
   it; the committed approach is the first suspect (an approach that used to be dropped for a chat nearby is now carried through). A probe of what chats lost to
   would settle it.
3. A shared project that needs supporters before anyone may build is why the shared yard is slow. A yard that is private to build and open to use (an access rule,
   not a civic project) is the smaller design, if the yard's use is still wanted.
4. From three lived lives at rules 202 (a child, an adult and an elder in meadow): a pupil is offered, again and again, teachers who cannot teach her (a teacher
   must know more than the pupil, and nobody remembers the refusal); and the site cap ("too many projects under way already", "another layout already reserves this
   footprint") refused a hut five times in two days to two people who wanted one.
