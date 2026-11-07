# A stranger's need is what the signs show — rules 166

Predecessor rules 165 is pinned by `tests/v165_continuation.expected.json`, recorded before this
behaviour existed. Origin: the 7 November 2026 whole-project adversarial review, item 6 (omniscience
leaks), the leak "exact needs used beyond the visible flag (`optOffer`, `knownNeeds`)", re-verified
against source first. One leak, one rules version (decision D2). Only the `optOffer` half is changed;
see "Not touched".

## The defect (every version up to 165)

`options_social.ts optOffer` is the spontaneous offer of food or water to someone who looks hungry or
thirsty. Whether to offer needs only the sign `SeenEntity.hungry` (hunger under 42) or `thirsty`
(under 40), which perception provides. The rest of the option read the other person's exact figures,
which no sign carries:

- which food to offer (`pickFood(p.inv, q.needs.hunger)`, the food whose nutrition best fits the deficit);
- how much (three units below hunger 25, otherwise two);
- how urgent it is (the score rises with `(50 - hunger) / 50`, or the same for thirst).

Changing only Ben's exact hunger after Ada's last glance changed what she offered and how much it
weighed (`tests/visible_need.test.ts`, the 165 half).

## The rule

`src/sim/visible_need.ts` (`hasVisibleNeed`: rich, rules 166 or later, switch on):

- perception adds `starving` (hunger under 20) and `parched` (thirst under 20) to the record of a
  person in view, beside hungry and thirsty. The keys are absent otherwise and absent altogether below
  166;
- `optOffer` takes the need those signs imply, in the convention rules 106 already uses for a dependant
  out of sight (`remembered_need.ts needsFromSigns`: just past the visible threshold, never the live
  figure): starving 19, hungry 41, parched 19, thirsty 39. Every hunger within a sign therefore weighs
  the same and picks the same food and amount; the weight changes when the person looks again and the
  sign has changed.

Who is offered anything is unchanged (the hungry or thirsty flag, the 12-tile reach, the quarrel gate,
the surplus check). Rules 165 and earlier keep their recorded behaviour. The module switch
`setVisibleNeed` (`visibleNeedOn`) restores the exact-figure reads inside a rules-166 world; the lab
branch name would be `rich-no-visible-need`.

## Evidence

- **Contract tests** `tests/visible_need.test.ts` (6): change only Ben's exact hunger or thirst after Ada's last glance and diff her option. At 165 its
  weight follows the figure at once; at 166 it is unchanged until she looks again and then follows the sign. Every hunger within a band (25 to 41, and 0 to
  19) weighs the same at 166 and starving weighs more than hungry; the signs appear at 19 and not 20 and are absent below 166; someone who does not look
  hungry is not offered food at either version; the switch restores the 165 reads. Against a `git archive` export of `afb50aef` 3 of the 4 tests that do
  not need the new module fail on behaviour (`review_evidence/visible-need-20261107/test-before-at-afb50aef.txt`); the fourth is a guard.
- **Earlier rules unchanged:** 18 files, 111 tests including the pins 93 and 161 to 165 and the goldens pass; `tsc --noEmit` is clean
  (`test-related-after.txt`). Immutable rules-166 continuation `tests/v166_continuation.*` (Normal birch, 6,000 ticks with several offers and the new signs,
  then 120 after a save and load), recorded in `776f34a5` from a clean checkout before any successor.
- **Ordinary worlds.** Spontaneous offers are common: 2 to 13 open in the first 12 days of each of the twelve lab seeds, the first between ticks 959 and
  10,457 (`first_offer.ts`). The saved state differs from rules 165 in all twelve seeds (`twelve/ab-compare.txt`), as it must from the first sighting that
  carries a new key, and the outcomes move seed by seed in both directions (alive in aspen 26 to 17, in cedar 18 to 24), which is what any change to a
  chaotic world does; so the lab is the instrument.
- **Paired lab against the previous version** (`scripts/lab_versions.ts`; twelve seeds, Normal, arrivals on, 25 days; rules 165 pinned with `--rules 165`
  and rules 166, each as a control plus `nudge:1` and `nudge:2`, run from a clean checkout of `260a961a`; `versions-report.txt`). The lab's verdict is that
  nothing moved by more than a single draw moves it. Version 166 minus 165, 95% interval, against the lab's noise floor: people -0.8 [-1.8, +0.4]
  (floor 4.4), deaths +0.9 [-0.6, +2.5] (4.4), mean hunger +1.5 [-0.8, +4.0] (8.7), mean mood +2.1 [-0.9, +5.1] (10.0), tools -1.2 [-3.8, +1.2],
  projects done +0.4 [-1.7, +2.6]. Three metrics lean one way with intervals that exclude zero but sit inside the floor: people without a home +0.4
  [+0.1, +0.8] (0.6 to 1.1), the day of the first yard +2.5 [+0.3, +5.0] (12.7 to 15.2), and mean condition -2.2 [-4.3, -0.1]. With fifty metrics a few such
  leans are expected by chance; twelve seeds cannot rule out a small real effect, and none is claimed in either direction. No benefit is claimed.
- **Full suite**, once for the series 164 to 166 from a clean checkout of `776f34a5` (`suite_run.ps1`, `suite-run.txt`): 520 of 524 files, 2,996 of 3,002
  tests with 3 skipped, in one parallel run of 436 s. The four files that failed (`zz_review_g_observer_purity`, `zz_review_h_retention`,
  `zz_review_main_toolreport_saves`, and the rules-165 pin, which takes 110 s alone and passed its 240-second limit under load) are load timeouts; the
  results of re-running them one at a time are in `suite-failed-rerun-alone.txt`. The rules-165 pin's limit is now 600 seconds; its recorded digests are
  unchanged.

## Not touched

- `knownNeeds` (`remembered_need.ts`) still returns a dependant's live needs when they are in sight.
  That was rules 106's own decision ("somebody in sight is judged as before, from what the carer can see
  up close") and it drives care of children and elders, where blunting urgency could cost lives. The two
  graded signs added here could serve it in a later step, judged by the lab.
- `responsibilities.ts` reads a watched child's exact hunger within 3.2 tiles; `facilities.ts` reads a
  housemate's hunger when a granary adjudicates an emergency ration; `meals.ts` reads the responder's own
  needs. None is a bystander's choice about a stranger.
