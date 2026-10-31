# Practical warmth duty acquisition

## Rules 96 implementation and evidence

Runtime `bf6d263`; immutable reference `9c1da59` passes separately 1/1 in
2.43 seconds, with reference typecheck clean.

Predecessor rules 95 is published at `6629b3d` (runtime `0926f3a`, immutable
reference `af7d6f3`). `warmth_duty.ts` owns the new switch, personal fire-account
communication and available-fuel calculation. Existing social acceptance, material
acquisition, collection, fire work and responsibility settlement remain the owners
of their actions. No new goods, work handler, duty type or live remote observation
is introduced. The lab removal is `rich-no-warmth-duty`.

During actual acceptance, a requester can communicate their fire belief if it is
at most a day old. The helper retains its observation timestamp and teller; fresher
personal knowledge wins. Missing/stale location or no believed route to fuel can
cause refusal. Acceptance is a belief-based judgment, not a guarantee of access or
stock. Arrival and extraction continue to check physical reality.

An active duty motivates acquiring one usable wood unit through the existing
known-source or lawful-store path, with base 48 before existing modifiers/costs.
Known offcuts can supply that purpose through ordinary collection instead. Already
held usable fuel prevents another duty acquisition. Plans and other delivery/haul
promises protect their goods at both option generation and actual consumption.
Fire work also rechecks whether somebody has already filled the fire. Lost stock,
missing destination, unavailable capacity and interruptions remain real outcomes.

The existing qualitative `fire kept` milestone is settled only after an actual
unit is consumed and its warmth added, with its existing contribution of 40. The
new path settles at that action, before the next choice; it does not assert that
the distant requester has learned completion or that a whole day of warmth was
provided. Current action explanations retain the named fire and accepted purpose.

Final affected verification passes **72 tests / six files**, **2.46 s**
(`autonomy-warmth96-settlement-focused.log`): positive and adverse fire-duty
contracts, live/stub legal AI selection with/without notes and exact replay,
practical care, offcuts, commitments, and immutable rules 95. Final typecheck/build
passes (`autonomy-warmth96-final-build.log`), with the existing bundle warning
(JavaScript about 1,122 kB, gzip 377 kB). Full regression passes **312 files / 2,100 tests**, **435.67 s**, on this final source (`autonomy-warmth96-final-full-tests.log`).

Rendered checks pass **7/7** (`autonomy_evidence/warmth96-reviewed-rendered`,
`autonomy-warmth96-reviewed-browser.log`), and the screenshot was inspected. Declared
initial incapacity/geography leads to real acceptance at **39**, autonomous
gathering at **200**, fuel travel at **321**, and one wood actually consumed at
**464**, adding **380** fire fuel. The fire gives the nearby helper a modelled
local warmth contribution of **10.16** at that moment. The duty completes once;
the helper explores at **465** rather than acquiring more for an already supplied
promise. Paid partial work saves/reloads exactly, rendering is pure, and resources
balance. This proves local warmth from paid fuel, not requester recovery or survival.

### Final ordinary screens

Three unchanged normal worlds run five days / 12,000 ticks without induced
incapacity, requests, fuel or actions. Each has an exact unobserved twin, 100 pure
observer checks, daily conservation and a valid final save. Source manifests are
recorded in `autonomy_evidence/r96-{river,forest,meadow}/report.json`.

| Seed | Seconds | Person samples | Incapacity samples | Incapacity near a known low fire | Fire requests / duty starts |
| --- | ---: | ---: | ---: | ---: | ---: |
| river | 46.94 | 2,800 | 54 | 6 | 0 / 0 |
| forest | 42.48 | 2,800 | 0 | 0 | 0 / 0 |
| meadow | 45.22 | 2,773 | 0 | 0 | 0 / 0 |

These repeated samples are not independent fully eligible request opportunities:
available neighbours, existing supplies and other duties still matter. River and
forest have no deaths. Meadow retains Talia #1029, age 8, dying of thirst at 8746.
Ordinary uptake, sustained care and aggregate benefit remain unproven.

### Review findings retained

- The first no-known-fuel fixture merely deleted a nearby tree belief, which ordinary
  perception correctly restored during the conversation. The final fixture declares
  a physically exhausted source and records the loss; actual refusal then passes.
- Target disappearance correctly interrupts work and makes the obligation moot after
  personally observed absence. The initial assertion incorrectly demanded a generic
  failed action; the final contract verifies that precise existing lifecycle.
- The first offcut test searched for a nonexistent `collect` action. Collection uses
  the existing `withdraw` action; the corrected test follows real withdrawal/burning.
- Fresh review prevents collecting offcuts when a usable portion is already held and
  rechecks a changed fire condition before consumption. The latter test declares the
  changed target condition; it does not claim another worker physically performed it.
- The first rendered scene exposed a second promise-motivated gathering start at 465
  after actual fuel at 464, before periodic settlement at 476. Immediate actual-work
  settlement fixes this, with a regression against that duplicate start. The first
  full run (`autonomy-warmth96-full-tests.log`) was cancelled for this finding, not
  recorded as a pass. The replacement full run passes on the final source.

Next is actual childcare recovery handback, reproduced separately under
`CARE_RECOVERY_HANDBACK.md`. All remaining owner-programme rows stay open until their
implementation and appropriate evidence are complete.

## Pre-implementation audit at rules 95

The existing fire request is a voluntary shared duty owned by `responsibilities.ts`
and `social.ts`. Actual fuel addition already settles the duty from the helper's
own paid action. `options_work.ts` adds priority to feeding a promised fire when
spare fuel is held. However, its material acquisition path still treats firewood
as occasional general upkeep, and accepting a fire duty does not communicate the
requester's personally known fire location.

`autonomy_evidence/warmth96-before.ts` reproduces the latter gap with an actual
offered request and answered conversation. Ada knows the low fire and is injured;
Ben knows a real tree and carries food/water but no wood. Request #11 is promised,
commitment #13 is accepted at tick 39, and the resource ledger balances. Ben still
does not know the named fire and has no relevant gather/fuel option. The assertion
fails in `autonomy-warmth96-before.log`. Initial people, fire, knowledge and injury
are declared staged; no duty is inserted directly.

The next bounded implementation must communicate only the requester's dated fire
belief through actual speech, retain the helper's right to refuse an infeasible
duty, and connect an accepted duty to lawful acquisition of available fuel. Reuse
the existing material-gathering, stored-material, offcut and fire handlers. Protect
other claims, personal survival and ownership. Fire removal, depleted sources,
stale knowledge, full packs and interruption remain genuine failures. Actual fuel
consumption must precede completion; requester knowledge still requires the
existing observation/report rules. Demonstrate actual later warmth, saved
continuation, observer purity, AI replay and truthful rendered explanation.

Ordinary uptake, household recovery and childcare handback are separate requirements.
No implementation or successful warmth outcome is claimed by this audit.
