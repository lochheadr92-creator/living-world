# Stored household water — rules 67

Rules 66 is pinned in `f5e6f5d` from runtime `720ceeb`; its reference
passed before edits and again after the first implementation. Existing historical expectations remain unchanged.

The reproduced gap is that a thirsty resident can know water in their home store while carrying a full pack, but cannot
drink it. Rules 67 adds a pure remembered-store drinking option. It uses the existing home entry, ordinary
eight-tick drinking work, actual stored inventory consumption and existing thirst relief. It creates no water or pack
capacity. Every work tick rechecks ownership, valid home and actual indoor presence; stock is checked when consumed.
Old rules retain their behavior. The lab removal `rich-no-stored-water` removes new offers without disabling physical
checks on an already-started activity. No save-format or AI-protocol change is made.

Owners: `stored_water.ts` derives the option from personal building beliefs; `stored_water_access.ts` owns the version
gate and physical store access. Existing modules touched: `options_survival.ts` exposes the choice; `habitation.ts`
connects it to real entrance/interior occupancy; `activities.ts` names the actual indoor work; `act_resource.ts` consumes
from the actual store; `rulesversion.ts` and the lab declare version and removal. The existing water source, store,
ledger, entry, action validator, survival scoring and carrying capacity remain authoritative.

Current evidence: 12 focused tests pass (`autonomy-water67-travel-second.log`), covering ordinary indoor selection,
real consumption, unchanged carried load, AI/option purity, saved twin continuation, version/removal, unknown/empty/foreign
beliefs, actual stock loss, ownership loss, interruption and entry after departure. The first fixture retained an active
rest and therefore did not reach the selected-action boundary; the fixture now explicitly ends that staged rest before
the choice, and the positive test uses an ordinary autonomous choice. Production selection rules were not changed to
force it. Typecheck/build pass, retaining native-loader notices and a 943.04 kB bundle warning.

The full suite passed 239 files / 1,593 tests in 309.30 seconds (`autonomy-full-tests67.log`), including all historical references unchanged.

Rendered checks pass 4/4 (`autonomy-water67-browser.log`). All three screenshots were visually inspected: the panel names the actual indoor drinking, its remembered-household-water reason, and the competing-use failure “no water left”. The scene is explicitly marked staged. Observer and saved-twin equality are checked in the runner; screenshot appearance alone is not the consumption evidence.

Predeclared ordinary check: fresh Normal worlds, immigration off, meadow/river/forest, five days (12,000 ticks), 170-second ceiling per run. All reached their horizon in 17.22 / 19.94 / 18.04 seconds. Each had 2,800 living-person samples, **zero known-home-water samples, zero stored-drink offers/starts/portions**, 100 pure observation checks, exact full-state continuation equality and daily/final conservation. No trace was omitted. Reports: `autonomy_evidence/r67-{seed}-5-reviewed/report.json`; runner: `scripts/stored_water_observe.ts`. These nulls do not establish ordinary use or benefit. The first command used npx tsx, which fetched a temporary runner; no project dependency or lockfile changed. Subsequent scripts use the repository's installed vite-node.

Fresh review: PASS personal-knowledge option derivation, actual ownership/room checks, physical entrance/blocked entrance, exact consumption and full-pack behavior, old-rules and lab-off execution validation. A review finding was fixed: a failed sip after competing consumption now observes the actual empty store instead of retaining stale stock. The final focused run passed all 12 water contracts plus the unchanged rules-66 reference (13/13; `autonomy-water67-final-focused.log`); typecheck passed after that fix. This is an implementation review by the builder, not independent review.

A failed hand-over to a full water pack still needs donor-to-store recovery. This drinking prerequisite does not close that care journey. Full original programme and longer owner-run validation remain open.

Travel coverage now includes an actual 50-tick outward walk before the explicitly selected lawful return, saved twins and a blocked entrance. The first travel fixture had only two water, which the elder actually drank during departure; the final shared-reserve fixture accounts for six water so both people have an opportunity. No production rule was changed for that fixture.

Final full regression after the failed-sip knowledge fix: **239 files / 1,593 tests passed in 311.31 seconds** (`autonomy-full-tests67-final.log`). Final production build passed (`autonomy-build67-final.log`, 943.04 kB bundle warning). The existing TimeoutOverflowWarning remains; no test failed. Final diff check passed.
