# Water care after a full-pack hand-over — rules 68

Rules 67 is published and pinned at `616309f` (runtime `f51c642`). Its separate continuation test passed before this
behavior changed. The first new contract reproduced an actual failed gift followed by no water-store recovery option:
expected `deposit`, received `undefined` (`autonomy-care-water68-before.log`). Rules 68 connects that missing transition.

The expected journey is personally witnessed failed water receipt → remembered household store → physical deposit →
recipient's ordinary stored-water drinking. The meaningful failure is a full or changed store after departure: water
must remain carried, no receipt or thirst relief may be invented. The helper keeps a personal drink, one for every other
dependant and water already reserved for promises. Hunger below 40, thirst below 30 or energy below 20 blocks this extra
provisioning trip. Current physical water quantities, ownership and carrying capacities remain authoritative.

`care_capacity.ts` owns the existing bounded capacity-failure memory and household recovery choice, now including water.
Actual zero-receipt care transfers alone learn it, through the unchanged `social.ts` call. Food-only failures retain
their old meaning; mixed failures preserve both grounds. At most six capacity records per helper and a 600-tick window
apply. No new save fields or AI protocol are introduced. Remote capacity is not inspected to manufacture this memory.

The ordinary option needs a personally known usable solid household home within eight tiles of the last contact, room
for one water, no remembered water already there, and spare water in hand. `options_work.ts` offers it from ordinary
care; `resident_care.ts` connects remembered room contact. Food and water keep their own urgency, so acute hunger does
not inflate a water-only trip. `act_resource.ts` revalidates actual home ownership, the household recipient and spare
water during the existing deposit work. The ordinary transfer still owns capacity, duration, accounting and completion.
The recipient must independently know and reach the store and actually drink; leaving water awards no direct gift
gratitude or fed cooldown. This does not add guest access or discover absent recipients.

`rich-no-water-care` removes the new memory and offers; execution checks still protect already-started deposits.
Earlier rules retain their behavior. New worlds use rules 68; historical saves retain their declared rules.

Focused evidence: **69 tests / 6 files passed**, including 18 water-care contracts, food/scoring, resident care, stored
drinking and the unchanged rules-67 reference (`autonomy-care-water68-focused.log`, 10.74 seconds). Contracts include
actual failure and consumption, full-state saved twins, personal memory, AI/option purity, old rules/removal, unknown,
full or stocked homes, promised supplies, urgent helper needs, expiry, ownership changes, interruption, donor loss and
mixed food/water recovery. The build/typecheck pass; the existing native-loader notices and 946.00 kB bundle warning
remain. Final full regression passed **241 files / 1,613 tests in 315.85 seconds** (`autonomy-full-tests68.log`), including the additional return test and historical references. Final typecheck and diff check passed. The existing TimeoutOverflowWarning remains; no test failed.

Rendered evidence: **5/5** checks pass (`scripts/browser/care_water_check.mjs`, `autonomy_evidence/water-care68-rendered`).
All four screenshots were visually inspected. Ada's initial offered gift is explicitly selected in a staged full-pack
fixture; the subsequent deposit and Eli's stored drinking are autonomous. One water moves to home #5, Ada retains two,
and Eli's thirst rises to 49.12 while his six-unit carried load stays unchanged and he receives no carried water. The
panel ties provision to the failed hand-over, records actual deposit/drink success, and shows the full-store failure.
The saved observed/unobserved continuations match. Staged success does not establish ordinary care reliability.

Fixed ordinary five-day Normal worlds, immigration off, meadow/river/forest: all reached tick 12,000 in
23.39 / 27.15 / 24.09 seconds. Each has 2,800 living-person samples. Recent personally learned water-capacity failure
samples are **0 / 5 / 0**; offers, eligible options, starts, deposits and later stored drinks are all **zero**. These are
repeated samples, not five independent opportunities. Each passed 100 observer-purity checks, exact full serialized
twin continuation, daily/final conservation and no trace omissions. Reports: `autonomy_evidence/r68-*-5-reviewed`;
runner: `scripts/care_water_observe.ts`. The river diagnostic (`scripts/care_water_gap.ts`, `autonomy_evidence/r68-river-gap.json`) exactly reproduces the original final save: all five samples are Jax at ticks 600–1080, with no known household home and no spare water. They are not feasible store-provision opportunities.

The expanded autonomy/environment programme remains open. This is a connected capacity recovery mechanism, not a claim
of ordinary viability, repeated cooperation, improved survival or completion of every care duty.

Fresh review: PASS bounded personal failure memory, mixed-food preservation, separate need scoring, known-home derivation, execution-time reserves/ownership/capacity, lab-off validation and old-rules compatibility. This is a builder review, not independent approval. An additional real departure/return contract passes, bringing the water-only focused file to **19/19** (`autonomy-care-water68-return-complete.log`). It follows a legal exploration departure and selected legal return, including an actual conversation suspension and resumed deposit, with exact saved twins. The initial fixture's leisure choice stayed only 1.70 tiles from home; it was not a distant journey. A proposed water-collection departure was correctly unavailable without a known shore. The actual offered exploration fixes that staging assumption. The first return check stopped when conversation suspended the trip; following the saved resumption establishes actual completion. No production behavior was changed to force this test. These failed fixture attempts remain in local logs.
