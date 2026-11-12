# A generation at rules 220: what 20 years show

Measurement only, no rules change. Asked for by the owner on 12 November 2026 ("let's see what a generational run shows"), after rules 220
(`docs/LEAN_YEARS.md`). Evidence: `review_evidence/generation-20261113/` (the 24 traces, `summary.txt`, `lean.txt`, the two scripts that
print them, and the thirst trace).

## What was run

- `scripts/generation_trace.ts` (new, read-only): one ordinary world, a row a day and a fuller row a year. It builds the world as the lab
  does for fork 0, and its day-60 hash equals the rules-220 lab control's for all twelve seeds, so these are the lab's worlds carried on.
- The twelve lab seeds, Normal, rules 220 (`cc0e656a`), **240 days (20 years of 12 days)**, once with arrivals on and once with arrivals off.
  24 runs side by side took 71 to 110 minutes each.
- **One run a seed, no nudge branches**, so there is no noise floor here: the figures below describe these 24 worlds and the spread between
  seeds. A difference between the two arms is a description, not a measured effect.

## 1. Nobody dies out, and without arrivals almost nobody dies

| | arrivals on | arrivals off |
|---|---|---|
| people at day 60 / 120 / 192 / 240 (28 founders) | 36.6 / 46.6 / 42.3 / 41.0 | 29.7 / 31.8 / 31.8 / 31.3 |
| range between seeds at day 240 | 23 to 56 | 14 to 39 |
| born, a settlement, in 20 years | 11.8 | 9.9 |
| came | 62.5 | 0 |
| died | 61.3 | 6.7 |
| falls of eight or more people in three days | 27, in 10 of 12 settlements | 1 |
| founders alive at day 240 | 12.8 | 22.4 |
| mean mood at day 240 | -17.7 | -6.8 |

No settlement is under four people at any year's end in either arm. Without arrivals a settlement holds at about 31 people for 20 years;
the one fall (gen-1, days 21 to 23, 31 to 14) is never made good (14 at day 240).

## 2. With arrivals the settlement booms and busts, and the newcomers do the dying

Nine of the twelve settlements climb to 55 to 59 people (first between days 91 and 215, six of them between days 100 and 135) and then
lose 8 to 34 in three days, again and again; gen-1 is cut down each time it passes 40 (27 falls in ten settlements). Every fall is in a hardship (26 lean seasons, one dry spell) and 22 of the 27 are in winter. The two settlements that never
passed 37 people (birch, gen-2) never had a fall. Of 735 deaths, 498 were people who had arrived, 183 founders and 54 born there: of the
62.5 who come to a settlement, about 41 die there. Causes: hunger 340, exposure 178, wolves 78, fever 73, injuries 44, thirst 13, old age 9.

What a lean season costs depends on how many people there were when it began (all 182 lean seasons of the 24 runs, deaths in the season
and the three days after; `lean.txt`):

| people when it began | lean seasons | deaths a season | eight or more died | if it ran into winter | if it stayed clear |
|---|---|---|---|---|---|
| under 30 | 37 | 0.3 | 0 | 0.3 | 0.2 |
| 30 to 34 | 62 | 0.8 | 1 | 1.9 | 0.2 |
| 35 to 39 | 37 | 2.1 | 3 | 5.5 | 0.5 |
| 40 to 44 | 8 | 7.1 | 3 | 13.7 | 3.2 |
| 45 to 49 | 14 | 7.4 | 6 | 8.4 | 6.4 |
| 50 to 54 | 14 | 14.5 | 7 | 25.2 | 6.5 |
| 55 and over | 10 | 13.9 | 6 | 33.7 | 5.4 |

Read in source: arrivals are admitted while there are fewer than 54 people, on the food per head of that day and enough roofs
(`lifecycle.ts immigrationTick`). So the cap sits well above the 35 or so people this land feeds through a lean season, and nothing in the
admission looks ahead to one. This is a reading of the table and the source together, not an arm: no run here changes the cap.

## 3. Few are born, and fewer each year

- Births, a settlement, in each four years: 3.6, 2.5, 2.4, 1.9, 1.3 with arrivals; 2.6, 3.1, 2.1, 1.4, 0.8 without.
- Children under twelve fall from 8.6 to 5.7 (on) and 8.3 to 4.2 (off); mean age rises from about 27.7 to 30.8 (on) and 34.8 (off).
- Couples stay at six or seven while the grown go from 19 to 33 (on) and 17 to 23 (off); with arrivals the households of one person go
  from 3 to 8.6. The newcomers mostly live alone.
- Elders are one or two a settlement throughout, and only 9 (on) and 14 (off) people in all died of old age.

Read in source (`lifecycle.ts conceptionTick`): a woman of 17 to 44, with a partner in her household, a home, fewer than three children
in it, a year and a half since her last child, household food of 3 a head and health of 60, has one chance in two a year. **Which of these
holds births down was not measured.** The run does not say whether the grown children pair up; that needs a count of weddings and of
partnered women of 17 to 44, which the trace does not record.

## 4. The settlement stops developing after its second year

- By the end of year two every settlement has a storehouse, a timber yard, a well and (most) a kiln, a quarry and a mine. After that
  nothing new is built: **no house in any of the 24 runs**, a hall in 2 of 12 (on) and 3 of 12 (off), no cart, no apprentice at any
  year's end but a stray one.
- **Ore is untouched**: 46 units at day 12 and 46 at day 240 in every run of both arms. Those who know smelting and forging stay at two
  or three and one or two; charcoal spreads (6 to 12 or 14).
- Huts: 10 to 12.3 with arrivals (16.8 at day 120, lost again), 10.4 to 8.1 without. Lean-tos stay (11.9 and 4.9). Open sites and
  abandoned sites grow with arrivals (5.4 to 11.4 open).
- Farm plots grow all the way (14 to 95 with arrivals, 14 to 37.5 without), and tools keep accumulating.
- Stone falls from 570 to 193 (on) and 314 (off), clay from 125 to 70 and 90; trees hold. The id counter stands at about 268,000 at day
  240 with arrivals (about 1,100 a day), which reaches the water-belief ids at 1,000,000 near day 900.

## 5. Daily life

Chats rise from 64 to 69 a year to about 100 and stay there; stories told double (7 to 15 or 18). Family time and child play fall by a
third to a half in the last four years, as the children get fewer. The share of waking time under the hungry line is about 50% (off) and
57% (on) in every year; it does not improve.

## 6. Thirst (the meadow run of the rules-220 lab)

Traced (`thirst-trace/`; it reproduces the lab row, 37 to 12 people on day 30). Natural water is a stock that only rain refills
(`hydrology.ts`): about 35 people drew some 90 units a day from a lake of 1,804, no rain fell for the first 19 days, and every body of
water stood at zero on day 19 (five deaths over two days) and again from day 28 (27 deaths, 26 of them on day 29, most of them waiting
at the dry lake). The well
held 0 to 4 units and filled only when it rained. So it is the rule working, on an unlucky run of weather, and not a defect. In the 24
generation runs thirst took 13 of 735 (on) and 6 of 80 (off), with no such die-off.

## What it leaves open (the owner's to choose)

1. **What arrivals are for** (the open decision OD-04): as it stands they turn a settlement that holds steady into one that starves
   every few years, and two thirds of those who come die. Changing who is admitted, or what the land can feed, would be a rules version.
2. **Why so few are born**, and whether the second generation pairs up: one more measurement, no rules change.
3. **Why nothing is built after year two** (houses, halls, ore, carts): not looked into here.
4. A lean season that runs into winter is still the worst case at every size (table above); that line stays open from rules 220.
