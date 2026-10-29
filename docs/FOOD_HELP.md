# Food help: a promise to fetch, and eating what one carries (rules version 45)

Delivered 2026-10-29 on `main` from `7625337` (rules 44). Workstream 2 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).

## The situation this completes

> Someone hungry asks a neighbour for food. The neighbour has none to spare, but knows a fish spot, a berry bush, a
> fruit tree or a stand of wild grain that still holds some. If willing and free enough, they promise the kind they know
> of, go and get it, bring it to the person who asked, and that person eats it. Or they say no, for a reason the
> inspector can show.

Every link of that chain already existed except the one that mattered: the answer.

## Confirmed root causes (rules 44 and earlier)

1. **`social.ts evaluateRequest`, food/care.** `item` was picked from the helper's own pack (`pickFood`), then
   `if (!item) return no_item`. An empty-handed helper never reached the "could B fetch some?" branch, so the only
   people who could promise food were people who already held some but had none spare. Reproduced by
   `tests/food_help.test.ts` ("rules 44 reproduces the defect"): a helper who knows a fish spot answers `no item`.
2. **The reachable fetch branch promised `'berries'`** whatever the helper knew, and the execution
   (`options_work.ts optCommitments`, deliver branch) foraged any food kind through `foragePlans`, while the give needs
   the exact promised kind in the pack. A helper who held one fish (none spare) and knew only a fish spot promised
   berries, fished, and could never hand the promise over.
3. **`optutil.ts foodCount` counts the four wild kinds only** (berries, fruit, fish, grain). `optEat` read it, so a
   hungry person carrying only meat or bread was never offered "Eat what I am carrying", although the meal itself
   (`act_resource.ts`, `pickFood`) would have eaten either. `optCare` read the same count and the same four-kind list
   when choosing what to bring a hungry dependant, so a carer holding only meat or bread brought nothing.

## Contract

Gated on `runsRulesVersion(world, 45)` and rich dynamics; below 45, and under the lab switch, every path is exactly as
recorded (the rules-44 full serialized continuation `tests/v44_continuation.expected.json` was captured from `7625337`
before any of this existed).

- **Who may promise.** A helper of working age (youth, adult, elder) who is not themselves a dependant, asked for food or
  care, with no spare food of any kind, who knows a usable wild source:
  one of their own beliefs about a berry bush, fruit tree, wild grain or fish spot, believed (with regrowth) to hold at
  least 2 and not found wanting in the last 520 ticks. Nearest such source decides the kind (`food_help.ts
  fetchableFood`, pure). Stores are deliberately excluded: another household's store is not theirs to promise from, and
  food in their own home reaches a neighbour through the ordinary gift/care paths once carried.
- **Same gates as every other fetch promise.** Willingness ≥ 0.66, personal drive < 38, fewer than two active
  commitments. Dependant reserves, `reservedFor`, immediate gifts of spare food (`give`) and every refusal reason are
  unchanged. A helper who holds food with none spare at 45+ promises only a kind they know a source of; the old
  "berries" fallback is kept below 45.
- **What the promise is.** An ordinary `deliver` commitment naming that kind, destination the asker. Execution forages
  that kind only (`foragePlans` `only`), the give hands over what is actually held, `cm.delivered`/`req.delivered` are
  written from what moved, and the request settles `fulfilled`/`partial` as before. Expiry, interruption, the asker
  moving ("was not where I expected"), refusal and death keep their recorded consequences.
- **Eating.** At 45+ `optEat` and `optCare` count every edible kind (`foodUnits`): meat and bread in the pack are
  offered as a meal and as care. `foodCount` itself is unchanged, because the deposit step it also serves still stores
  the four wild kinds only (see `provision.ts`).
- **Lab switch.** `rich-no-food-fetch` removes the empty-handed fetch promise only; the eat/care counting is a
  version-gated repair with no separate switch.

New state: none. No save-format change; `Commitment.item` already carried a food kind.

## Tests

`tests/food_help.test.ts` (7 cases, staged and labelled): the rules-44 reproduction; fish promise → fishing →
delivery → credit once → recipient eats, with conservation; a berry path; no promise without a known source; a bare
remembered source gives no promise; spare food still given at once; ablation isolation, save/replay determinism and
observer purity of `fetchableFood`; bread/meat care at 45 vs 44; meat eaten from the pack at 45 vs 44.
`tests/v44_continuation.test.ts` pins rules 44.

## The dependant's side: going to find a household adult (same rules version)

The river run exposed the other half of the household-distribution chain. Eli, 5, starved while two members of his
household 30 tiles away carried 14 spare units: they had never seen him hungry, held only a stale "missing" worry, and
"look in on Eli" scored below sleep and meals; his mother was starving herself. Nothing acted against its own knowledge.
What was missing was any step of the dependant's own towards the people who feed him. `welfare.ts seekCarerOptions`:
a child or dependant who is hungry or thirsty (drive ≥ 40), with no food/water option worth 62 % of the drive, and no
household working adult in sight, may walk to where they believe one is (in sight, last seen within 900 ticks, their
home, or last seen long ago, through `whereIs`). Arriving is the whole of it: the ordinary `care` ask and the adult's
ordinary care option take over, and both can refuse. Not finding them fails as every visit does, clears the stale
whereabouts and waits 600 ticks before looking for that adult again. Lab switch `rich-no-seek-carer`.

Lab check for harm (`food_help_evidence/lab-seek/report.txt`, 8 seeds, Normal, 30 days, control + nudge + ablation):
removing the seek step changes deaths by −0.6 [95 % −2.8, +1.3] against the control/nudge reference, people +0.1
[−1.7, +2.1], homeless +1.3 [0, +3.1]; all "not distinguishable from chance" at a death noise floor of ±3.8. So no adverse
effect is established, and no benefit is claimed either. The single-seed forest comparison (6 deaths without the step,
15 with) is within that seed's variance and is recorded as such, not as evidence.

## Ordinary-world observation

`scripts/food_help_observe.ts <out> <seed> [days] [arrivals|none] [rulesVersion|current] [noseek|nofetch]`: Normal
profile, immigration off, 30 days, 240-second budget per seed, source manifest, observer-purity check at every 240-tick
sample, death-moment snapshots from the previous tick. The table and denominators are in the slice log of
`DEPENDENCY_CHAIN_PROGRAMME.md`. A budget stop is partial, not a horizon; none occurred.

## Rendered

`scripts/browser/food_help_check.mjs` (headless Chrome over CDP against the page's own river village, nothing staged):
5/5. The helper's card read "Thea asked them for food (care) · PROMISED · 1 of 2 berries brought · Nico will bring 2
berries" and the Promises section "Bring 2 berries to Thea · 1 of 2 delivered · last reported obstacle: Thea had no room
in their pack for it"; the feed carried "Cora promised Ivo berries", "Here you go, Ivo", "Bless you, Cora". Screenshots:
`food_help_evidence/rendered2/promise.png`, `delivered.png`. The check also caught two things: a two-year-old making a
fetch promise (now gated: a promising helper is of working age and not a dependant) and a pre-existing inspector line
"1 of 2 null brought" for a partial on-the-spot gift of a food ask, whose request has no item kind (now "1 of 2 brought",
the note names the kind). Headless rendering shows the text the page puts up, not how it looks to a person.

## Limits

- Mechanism and ordinary-occurrence evidence only. No claim that fewer people starve: that is an aggregate claim and
  needs the paired control/nudge measurement, which was not run.
- A promise is not a delivery; a delivery is not a meal. The inspector shows the three numbers apart (asked for,
  agreed, brought) and the commitment's own "n of m delivered".
- The helper's foraging competes with everything else they could do at urgency 54, so a promise can still lapse.
