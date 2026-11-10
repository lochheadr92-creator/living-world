# A manageable ordinary metabolism: rules 195

Predecessor rules 194 is pinned by `tests/v194_continuation.expected.json`. Origin: the owner's survival-pressure rebalance brief of 11 November 2026 ("Rebalance basic
survival pressure so ordinary lives have room for social, family, learning, and leisure behaviour"), which proposed base hunger and thirst drains of about 0.020 and 0.025
a tick as a hypothesis to measure, not a number to apply. Stream: balance (`docs/RULES_RANGES.md`, 195 to 199).

## The arithmetic as it stood (every version up to 194)

Observed in source, not interpretation. `needs.ts updateNeeds`: hunger falls by `HUNGER_RATE` (0.03) a tick, thirst by `THIRST_RATE` (0.04), each times a child factor
(0.85), the harsh-profile factor (1.18) and a pose factor (asleep 0.55 and 0.6; heavy work 1.25 and 1.3; running 1.3 and 1.4), thirst also times a heat factor above 19 C.
A world day is 2,400 ticks (`DAY`), so an awake adult at rest loses 72 hunger and 96 thirst a day; one asleep for a third of it, about 61 and 83. The hunger drive starts
at 62 and is strongly pressing at 36 (`DRIVE_BANDS`); thirst's at 66 and 40. Fed and watered to the full, a person had 1,267 ticks (12.7 world hours) before hunger
started to matter and 850 (8.5 hours) before thirst did; a meal is worth 12 (berries) to 28 (fish) hunger (`NUTRITION`), a drink `WATER_VALUE`. Several ordinary-life
options ask for more than that margin: foraging practice and coaching want the least of hunger, thirst and energy above 65 (`options_social.ts`), childhood time above
42. The critical line is 14 for both (`CRITICAL`); below it `rankOptions` (`decision.ts`) keeps only the options that serve the lead need, flight, and asks for help.
Warmth is not a drain: it moves toward a target set by temperature, rain and cover, shelter, fire, hearth and clothing at 0.006 of the gap a tick, the same speed
both ways (`updateNeeds`, `shelterAt`, `fireWarmth`). The rates have stood since the first commit.

## The rule (rules 195, rich worlds)

`src/sim/metabolism.ts hungerRate` and `thirstRate`, read by `updateNeeds`, by the journey budget of `action_scope.ts workWindow`, by the water lead of `optutil.ts
makeCtx` and by the projection of `relief.ts projected`. At 195 they return `HUNGER_RATE_195` (0.024, 58 a day awake against 72) and `THIRST_RATE_195` (0.032, 77 against 96); everywhere else the old constants. Nothing else
moves: every multiplier, `DRIVE_BANDS`, `CRITICAL`, the options' own levels, the critical-need filter, the relief guard, starvation (0.022 health a tick at hunger 0),
dehydration (0.05 at thirst 0), exposure (0.035 at warmth 6 or below), nourishment, and `DAY_FOOD` (4 units a day for a reserve, now about a day and a half of eating,
kept on the safe side). Rules 194 and earlier, authored worlds and `setMetabolism(false)` keep 0.03 and 0.04. The lab branch `rates:<hunger>:<thirst>` runs a 195 world
under other rates for one arm (`setLabRates`, never saved or hashed), and `rich-no-metabolism` is the old drains at 195.

Not changed, and why: warmth. The brief allowed an asymmetric warmth response if exposure was diagnosed as crowding life out; the measurement below is what decides it,
and the section "Exposure" records the reading.

## Measurement

All of it with the lab's own tooling (`scripts/lab.mjs`, `scripts/lab_versions.ts`, `scripts/ab_run.ps1`, `scripts/ab_compare.ts`), from clean worktrees,
`dirty` false and `modified` empty in every `provenance.json`. Twelve ordinary seeds (aspen, birch, cedar, fern, gen-1 to gen-6, meadow, river), Normal profile,
arrivals on, forked at day 0 and run 25 days; a year is 12 days with the last 4 winter (`hardship.ts`), so the window holds two winters. Population starts at 28 a
settlement and the figures below are per settlement at day 25, means over the control and two one-draw nudges. The life metrics were added to the lab for this
measurement (`scripts/lab/lab.ts LifeTally`: conversations by purpose counted once each from the record, meals, visits, spare-time outings, ended-activity time by
category and stage, deaths by cause, and the burden as awake person-time); the baseline was run fresh because no earlier run carried them.

**Baseline, rules 194** (`review_evidence/balance-20261111/final/r194/`, also the paired lab of rules 194, `review_evidence/repairs-20261111/lab194/`): 22.7 people
and 9.1 deaths (hunger 3.6, exposure 2.6, thirst 0.3, the rest wolves, fever and injuries); 4% of person-time below critical hunger and 4.5% below critical warmth;
awake, people were hungry (below the drive's start) 61% of the time and thirsty 45%, and inside the fed window that coaching and foraging practice ask for 13%;
ended-activity time went 34% to survival, 39% to sleep and rest, 13% to work and 14% to life (children 22%, adults 10%, elders 11%); 102 chats, 62 family
times, 55 child plays, 96 foraging practices, 1.4 coachings, 20 visits, 15 spare-time outings; 7.6 solid homes, 29 tools in hand, 253 units of food laid up
by preparations. Mean mood -22.

**Screening, one run at 195** (`screen195/`, clean `7eb29a61`, five arms in one world per seed: control at the brief's 0.020/0.025, two nudges, `rates:0.024:0.032`
and `rich-no-metabolism`, which is the old 0.03/0.04): at the old, moderate and brief rates, people 21.3 / 31.3 / 34.8, deaths 10.4 / 2.2 / 0.25 (hunger 3.2 / 0.6 / 0,
exposure 3.9 / 0.6 / 0.2), family time 58 / 85 / 97, child play 51 / 73 / 81, foraging practice 92 / 123 / 142, coaching 1.6 / 3.2 / 5.3, chats 102 / 108 / 121,
life share 0.135 / 0.153 / 0.155, solid homes 7.1 / 10.3 / 11.7, tools 29 / 52 / 63. The moderate correction reaches most of the life gain and leaves scarcity in
view (two deaths a settlement, hunger exposure 1.2% of person-time); the brief's rates leave a quarter of a death and no hunger death in the window. The brief asked
for the smallest evidence-supported rebalance and warned against erasing the survival challenge, so 0.024 and 0.032 are the rates taken.

**Result, rules 194 pinned against 195** (`final/`, clean `09880f79`, `versions-report.txt`; the noise floor is the lab's own, one arm against the mean of the
others, and an effect inside it is never called larger than chance):

| metric (per settlement, day 25) | 194 | 195 | diff [95%] | up/down | verdict |
|---|---:|---:|---|---|---|
| people | 22.7 | 30.6 | +8.0 [+5.8, +10.1] | 11/0 | larger than chance |
| deaths | 9.1 | 2.5 | -6.6 [-8.9, -4.5] | 1/11 | larger than chance |
| deaths of hunger | 3.6 | 0.6 | -3.0 [-4.6, -1.6] | 0/11 | larger than chance |
| deaths of exposure | 2.6 | 0.8 | -1.8 [-2.8, -1.0] | 1/11 | systematic, inside the floor (±3.2 on deaths) |
| hunger below critical, share of person-time | 0.039 | 0.012 | | 0/12 | larger than chance |
| warmth below critical, share of person-time | 0.045 | 0.026 | | 1/11 | larger than chance |
| awake and hungry (below 62), share | 0.61 | 0.52 | -0.09 | 0/12 | larger than chance |
| awake in the fed window (all above 65), share | 0.13 | 0.18 | +0.05 | 12/0 | larger than chance |
| survival share of ended-activity time | 0.34 | 0.30 | | 0/12 | larger than chance |
| life share | 0.139 | 0.149 | | 11/1 | larger than chance |
| work share | 0.133 | 0.161 | | 12/0 | larger than chance |
| sleep share | 0.39 | 0.39 | 0 | 6/6 | not distinguishable |
| life share, children / adults / elders | 0.22 / 0.10 / 0.11 | 0.24 / 0.11 / 0.11 | | 10/2, 11/1, 9/3 | inside floor / larger / not distinguishable |
| family time | 62.2 | 83.8 | +21.6 [+18.5, +25.1] | 12/0 | larger than chance (floor ±10.9) |
| child play | 54.6 | 70.3 | +15.6 [+11.7, +19.6] | 12/0 | larger than chance (±9.1) |
| foraging practice | 95.6 | 120.9 | +25.3 [+20.8, +29.8] | 12/0 | larger than chance (±10.8) |
| coaching | 1.4 | 2.9 | +1.4 [+0.4, +2.4] | 10/2 | systematic, inside the floor (±2.0) |
| chats | 102.0 | 113.6 | +11.6 [-0.9, +24.3] | 9/3 | not distinguishable (±20.7) |
| visits (welfare calls on the worried-about) | 20.2 | 17.4 | -2.8 [-5.8, +0.4] | 3/9 | not distinguishable |
| spare-time outings | 15.3 | 20.1 | +4.9 [+0.6, +9.3] | 9/3 | systematic, inside the floor |
| meals sat down to | 0.4 | 0.4 | | 3/3 | not distinguishable |
| solid homes | 7.6 | 10.5 | +2.9 [+2.2, +3.6] | 12/0 | larger than chance |
| tools in hand | 28.7 | 50.1 | +21.4 [+16.9, +25.3] | 12/0 | larger than chance |
| projects done | 44.0 | 63.7 | +19.7 [+15.1, +24.0] | 12/0 | larger than chance |
| food laid up by preparations (units) | 253 | 348 | +94.8 [+74.3, +116.1] | 12/0 | larger than chance |
| wolf bites taken | 22.6 | 15.4 | -7.2 [-12.0, -2.1] | 3/9 | larger than chance |
| mean mood | -21.9 | -11.1 | +10.8 [+4.7, +18.3] | 10/2 | larger than chance |

Chats are the one life count that does not clear its floor (they were never the scarce thing: a chat asks little of the body); family time, child play and foraging
practice, which the childhood and coaching options gate on the body being fed, are the ones that move. Visits lean down because fewer people are in want to be
visited. The work share and everything built from it (tools, projects, homes, reserves) rise as much as life does: the time freed from eating and fetching went
to both. Hunger exposure falls by two thirds but stays: 1.2% of all person-time below critical hunger, 0.6 hunger deaths a settlement, and the harsh check below.

**The twin** (`final/twins/`, clean `09880f79`): the final world differs at 194 and 195 in 12 of 12 seeds, as it must from the first tick; conservation and the tool
registry hold in 12 of 12 pairs.

## Exposure

Warmth was not changed. The brief allowed an asymmetric warmth response if ordinary cold and rain were crowding life out. The reading: at 194 people spent 4.5%
of person-time below critical warmth and 2.6 a settlement died of exposure; at 195, with the warmth dynamics untouched, 2.6% and 0.8. Exposure in these worlds was
coupled to hunger: a person at critical hunger is held to food by the critical filter and has no margin for the fire or the shelter, and the lean-to households
of `docs/REPAIRS_20261111.md` died in the first cold snap already short of food. With the hunger burden eased the same shelters and fires suffice far more often.
Severe conditions still kill (the harsh check below: 13.2 exposure deaths a settlement with the harsh setting on at 195). So hunger and thirst, not cold, were
the dominant cause, and the warmth rule stands as it was: the response window a lean-to gives at -6 C in rain is an owner-level world rule (G70), not this stream's.

**Survival still matters** (`review_evidence/balance-20261111/harsh/`, `scripts/harsh_check.ts`, six seeds, 25 days, arrivals on): with the harsh setting on
(`settings.harsh`, the x1.18 drain, a harder world) both versions lose the whole settlement, 27.8 deaths of about 28 at 194 and at 195 (hunger 14.7 against 9.0,
exposure 7.2 against 13.2, wolves 4.0 against 2.2), a quarter of person-time at a critical need at 194 and a fifth at 195; with it off, 9.2 against 1.7. The
contract tests add the staged floor: a starving adult still loses 0.022 health a tick, a critical need still filters the options down to it, and with nothing to
eat or drink hunger and thirst still run out inside a day and a half.

## Verification

- `npm run typecheck` and `npm run build` pass with 195 in the tree (and again at 196).
- Contract tests `tests/metabolism.test.ts` (7, each with the rules-194 contrast); `tests/nourishment.test.ts` reads the world's rate; `tests/rules_version.test.ts`.
- Immutable pin `tests/v195_continuation.*` (Normal gen-2, arrivals on, 2,400 ticks then 120 after a save and load), recorded from a clean checkout of `09880f79`
  (`review_evidence/balance-20261111/pin195.log`); it passes here. The pins of every earlier version are unchanged.
- Determinism and continuity: the pin (save, load, 120 ticks identical) and the contract test (two seeds alike after 300 ticks; a saved copy continues identically).
  Observer purity: `tests/observer_viewer_purity.test.ts` passed in the suite below; `tests/zz_review_g_observer_purity.test.ts` timed out under load as it does at
  every head since 193 and is not a 195 finding.
- Full suite from the clean checkout of `09880f79` (`review_evidence/balance-20261111/suite-head-195.log`): 17 files failed of 581, 73 tests of 3,246. Against the
  193 head (`review_evidence/repairs-20261111/suite-head-193.log`) two failures are gone (`suspended_scan`, repaired by 194; the trajectory-fragile leisure
  variety test) and three are new: `zz_review_e_famine_trace` (2) reads a gitignored `autonomy_evidence/**/final.json` fixture a clean checkout does not have (the
  rules-167 checkpoint records the same), and `save_told` (1), a real defect the 195 trajectory exposed: a shared project could take a thirteenth participant and
  the save was refused at load. That is repaired as rules 196 (`docs/PROJECT_ROOM.md`), after which `save_told` passes; the rest of the list is the known
  pre-existing set (`household_home`, `household_preparation`, `household_continuity_view`, `preservation`, `stored_materials`, `project_*`, `carcass_supply`,
  `transport`, `zz_review_h_retention`, `zz_review_main_toolreport_saves`, and the load-timeout files that pass alone).

## Limitations and the next measurement

- Twenty-five days from a founding, Normal profile, arrivals on: two short winters, no mature settlement, no Large world. The year is 12 days, so "winter viability"
  here means the fourth-day cold of each year, not a long one.
- The harsh setting kills everyone at both versions inside 25 days, so it shows that severe conditions still kill, not how 195 behaves in a harsh world that can be
  survived. A milder harsh arm, or the harsh profile over fewer days, is the next survival measurement.
- Life counts are conversations and activity ends, not minutes of company; the time shares are of ended activities only (idle ticks between activities are not
  counted anywhere).
- Visits lean down and are explained (fewer in want), not measured as a loss.
- `DAY_FOOD` keeps 4 units a day; at 0.024 that is a day and a quarter of eating, so preparations lay up a little more than they need. Deliberate; not measured
  separately.
- The next useful measurement: the same twelve seeds for 60 days (five winters) at 194 against 195, and one Large seed, read for deaths by cause and the fed
  window by stage, before any further step toward the brief's 0.020/0.025.
