# Stone hauling: is it pack weight or pack size? Ordinary diagnosis and a two-arm try (6 November 2026)

Request: "address weight reduction or storage increase to avoid recurring stone issue", after the two lived lives
(`review_evidence/lives-20261106/`): Milo (elder, pack 6) could carry two stones, a hut needs four, and the hut stalled at 6% for
three stone. Nothing in the simulation was changed here; this is the measurement that decides whether a change is warranted.

## Method

`probe.ts` (read-only): Normal profile, arrivals on, rules 161, 25 days. Every tick a person's `inv.stone` is compared with the tick
before; the stones held when a delivery sequence starts are the load of one trip, set against the pack's stone limit
(`floor(cap / 3)`). Every site that needs stone is followed from layout to its last stone, to its last wood and to completion.
Baskets are counted at 120-tick samples. Each run also steps an unsampled twin; every run below matches it exactly and conserves goods.
Arms (changed before the world exists, one number from tick 0, this process only): `control`; `stone2` (a stone weighs 2, game 3);
`elder9` (an elder's pack is 9, game 6). Worlds: forest, river, meadow, life-stages-6, one seed each, 12 runs.

## What was found (control, rules 161, four worlds)

1. **Pack size is not what limits a stone trip.** Adults reached a site with 1.82 stones on average (369 trips; none at the pack's
   stone limit, which is 4, or 6 with a basket). Elders 1.13 (23 trips, 4% at the limit). Loads are set by what was wanted and by what
   else is in the pack, not by the pack being full of stone.
2. **Baskets are already common.** 34-45% of adult and elder samples hold one (cap 18 and 12), which is the game's existing way to
   carry more. Milo held none.
3. **Stone is the last material in most stone sites.** In 77 of 93 sites with a recorded stone time, the last stone arrived after the
   last wood, a median 24 hours later; stone was complete a median 34 hours after layout (mean 50, worst 311). 14 of 106 stone sites
   were still open at day 25.
4. **Elders make few stone trips** (23 in four worlds), so the Milo case is real but rare in ordinary play.

## The two arms (one seed per world: a different pack changes the whole village; this is not an effect estimate)

| | control | stone weighs 2 | elder pack 9 |
|---|---|---|---|
| Stone sites finished / laid out | 92 / 106 | 101 / 115 | 82 / 95 |
| Huts finished / laid out | 57 / 63 | 64 / 69 | 51 / 59 |
| Stone complete after layout, median (mean), hours | 34 (50) | 24 (42) | 40 (56) |
| Adult stones per trip / elder | 1.82 / 1.13 | 2.12 / 1.77 | 1.63 / 1.38 |
| Living at day 25, four worlds | 101 | 76 | 61 |

- **Stone weight 2** is the only arm that moved the stone wait (median about 10 hours shorter, loads 16% larger for adults, 57% for elders).
- **Elder pack 9** did not (median longer, 40 hours; elder loads 1.38 against 1.13, and elders make few stone trips).
- **Survival is not readable from this.** Control, stone 2 and elder 9 end with 101, 76 and 61 alive, but the forest world alone is
  12, 3 and 1 (a famine collapse in every arm), and an elder-only pack cannot plausibly cost lives; the arms diverge within days.
  Kept as recorded, not explained, not an adverse finding about either change.

## What a repair would cost

Weight is not a world-aware quantity: `weightOf(items)` and `WEIGHT[k]` are read in 27 files at about 70 sites (packs, building
stores, carts, rendering, inspectors) without a world. A stone that weighs 2 only from rules 162 means threading the world, or a
rules switch, through all of them and changes every store's and cart's stone capacity as well as packs. A pack-size change, by
contrast, is one line in `people.ts carryCap(world, p)` and gates on rules version like the existing elder and basket terms, but the
elder arm above shows it would not move the stone wait, and `villager-age-carry-20261104` advised against raising everyone's capacity unmeasured.

## Not claimed

No benefit, no regression, no effect size. One seed per world per arm; the unsampled twin and conservation checks pass but say nothing
about the arms. The load measure is read from pack changes, so a delivery that pauses for a tick or more midway counts as two trips.

## Files

`probe.ts`; `arm-<arm>-<world>.json` (12 runs, with `.log` and `.err`); `forest|river|meadow-r161.json` (the first control runs, before the
site-wood fields were added); `smoke.json` (a 6-day check).

## Why is stone neither stored nor used? (follow-up, same four control worlds, rules 161, 25 days)

Probes: `where.ts` (`where-*.json`: stone by location every 120 ticks; `where2-*.json`: the same after it was extended to record why holders keep it),
`flows.ts` (`flows-*.json`: every change in a person's stone, classified by the activity they were in the tick before),
`census.ts` (`census-*.json`: buildings at days 5, 10, 15, 25). All twins match and goods are conserved.

1. **Stone is used, not wasted, but nothing is ever stored.** 624 stone were gathered (97% from loose rocks and outcrops, one at a
   time) and 578 left packs: about 73% went into building sites (a
   quarter of the whole, 156 stone, went to other households' sites) and about 21% into crafted tools. **None was deposited in
   any store**, in any world.
2. **There is nowhere shared to put it.** Three of the four worlds never lay out a storehouse, at any point in 25 days. The rules-136
   communal stock only exists at a storehouse. In the fourth (life-stages-6, which starts with one; 29-34 people know of it) the
   storehouse held 0 stone at every census and 1 once. Homes held no stone at any sample.
3. **Stone does pile up at quarries and is almost never fetched from there.** A quarry's store held 5-16 stone (maximum 18) in 27-47%
   of samples in the worlds that have one, while open sites lacked 5-13. Only 18 stone (3% of all stone gained) was ever taken out of
   a quarry. Reading the code: the "collect remembered raw material" path used for site and tool needs
   (`material_stock.ts rememberedMaterialStores`) looks only at the person's own home and public storehouses, never a quarry yard.
4. **Packs are the warehouse.** Across the village packs hold 7-10 stone at a time (sites lack 5-13), and in 72-90% of holder-samples
   the person had been holding some stone for 12 hours or more. 73% of those holders had stone not reserved by a promise or plan, and
   only 10-34% had a site of their own household lacking stone. Why a person with unreserved stone does not hand it over is **not
   traced**: candidates read from the code are the one stone every person keeps back for themselves (`communal_stock.ts KEEP`), site
   needs only reaching people the site's relation rules count as relevant (`options_work.ts relevantSites`), and a pending tool plan.

Not claimed: any of this as a defect rate, any benefit of a repair, or that the quarry gap is the main cause (it is the largest
reachable store the probes found).

## Rules 162: what was built from this, and what it measured (7 November 2026)

Request: build the storehouse (food-gating "sounds stupid"), let anyone take from it free, let stone be stored and retrieved, let stone move from
the quarry to the storehouse, and encourage building and making with it. Design and limits: `docs/SHARED_STONE.md`.

Further read-only probes (Normal, arrivals on, rules pinned, unsampled twin matches, goods conserved in every run):

- `storehouse-gate.ts` (`storehouse-gate-*.json`, 12 days, rules 161): per decision, was "Lay out a storehouse" weighed? 4-23 of about 4,000-4,350
  decisions per world. First gate stopping adult and youth person-samples: four-site open cap 35-41%, own household's open site 22-29%, no solid
  home 20-25%, only 10-18% reach the food-shortage and temperament gates. When weighed it ranked 2nd-5th, median 6-9 behind the choice.
- `quarry-access.ts` (`quarry-access-*.json`, 25 days): river and meadow quarries were public and someone with a stone-short site could draw them in
  120 of 137 and 236 of 236 samples; forest was mixed; life-stages-6 had a private yard (closed to other households).
- `quarry-why.ts` (`quarry-why-*.json`): of person-samples who knew the yard, believed it held stone and were allowed to draw it, no stone-collect
  option was weighed in 81% (river 456/563, meadow 928/1,151) and 96% (forest 65/68). The site-material fetch path listed no quarry yard.
- `restock-gate.ts` (`restock-gate-*.json`, `restock-gate2-*.json`, 14 days, rules 162): with a public store standing, night stops 45-47%, hunger,
  thirst or tiredness 29-31%, a stone need of one's own 15-21% (83-96% of those who got that far), a plan 1-3%; 0-6 of 3,200-3,600 samples passed.
- `ab.ts` (`ab/` 161 and 162, `ab2/`, `ab3/` 162 with the restock fixes; single seed per world): storehouse laid out days 2.4-3.3, finished 5.0-6.3
  in forest, river and meadow (none at 161); stone drawn from the public quarry 0/0/18 to 18/24/16 and 1 to 47 (life-stages-6); the store itself holds
  a mean of 0 stone, maximum 1. Day-25 survivors 12/20/35/34 at 161 against 3/30/21/29 at 162 (forest, river, meadow, life-stages-6): single
  seeds, not read as an effect.
- `lab162/` (12 seeds aspen, birch, cedar, fern, gen-1..6, meadow, river; Normal; fork at day 0; 25 days; control, `nudge:1`, `nudge:2`, then
  `rich-no-shared-stone`, `rich-no-first-storehouse`, `rich-no-quarry-stone`; `report.txt`): nothing about people, deaths or hunger is
  distinguishable from the noise floor. All parts removed (= rules 161): people 21.6 against a reference 23.3, deaths +2.0, plots -2.2 (within the
  noise floor), shared projects completed 0.9 to 0.1 (lower in 11 of 12 seeds; the storehouse). First storehouse removed: people 20.8, deaths +2.3,
  projects done -3.4 (within the noise floor). Quarry part removed: nothing moves. The 6 MB of lab rows (`lab_*.jsonl`) are regenerable with
  `node scripts/lab.mjs --out <dir> --seeds 12 --fork 0 --days 25 --profile normal --branches nudge:1,nudge:2,rich-no-shared-stone,rich-no-first-storehouse,rich-no-quarry-stone`
  and are not committed; `report.txt`, `run.log` and `provenance.json` are.

Not claimed: any benefit; that stone is now stored (the store stays at about 0 because awake, fed people all hold a stone need of their own, i.e. stone is
production-limited here); that the stored-stone cue works in ordinary play (no stone is stored to read); any effect of a different seed set or length.
