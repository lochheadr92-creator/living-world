# Required workshop tools remain required during work — rules 61

This bounded WS6/A5 transition follows rules 60's recipe choice. The rules-60 ordinary forest continuation and a running
sawing batch with its saw removed were captured from `5c71df4` before this change, committed at `a320243`. They preserve
the old defect as historical semantics. No saved field, migration or inhabitant protocol changes.

## Cause and contract

Reproduced on rules 60: after the required saw disappeared, `workJob` advanced a paid job from 7 to 8.4. It checked the
procedure but treated a missing required tool as unassisted work. Separately, `production.planRecipe` returned an owned
busy-job resume offer before its missing-tool branch, so replacement acquisition was not connected to that path.

From rules 61, `facilities.ts` stops before progress, worker credit, workshop contribution or wear when the required tool
cannot actually be used. A held tool or an available rack tool still works; another worker's live rack claim does not.
Optional equipment remains optional. A tool's last valid tick counts before wear breaks it. Inputs, client and paid
progress stay in the same job. The normal two-day stale-job rule remains: if recovery never arrives, inputs are shelved
without producing output. `act_production.ts` reports partial work (or failure before any work) with the missing tool and
retained materials/progress, then follows ordinary activity cleanup.

`production.ts` uses the actor's remembered owned job and held/rack equipment to request the actual missing tool instead
of offering a known-illegal resume. The existing rules-57 tool plan, gathering, crafting, borrowing and rack paths remain
the mechanisms for obtaining it. No priority, capacity, knowledge, need threshold, tool cost or deadline was changed.
Lab removal `rich-no-required-tool-recovery` restores only the old work/resume pair; rules 60 and earlier remain exact.

## Physical and rendered evidence

Six contracts in `tests/workshop_tool_loss.test.ts` cover mid-work loss, old rules/ablation, optional-tool work, the last
valid wear tick, exclusive rack use, real replacement and continuation, and no-replacement expiry with inputs returned.
The browser uses the same physical chain. All responses are explicitly chosen from legal offered actions; initial tools,
timber, handles and a useful site are staged, and the saw loss is imposed. This is not autonomous occurrence evidence.

`autonomy_evidence/tool61-rendered-final/report.json` records 7/7 checks. Hana (#2), timber yard #5:

- Tick 1090: sawing stopped at 7/60, retaining three wood. The partial result names the missing saw; the replacement
  request exists and the illegal sawing offer is absent. Twenty waiting ticks preserve full saved continuation and progress.
- Tick 1762: real gathering/hauling has left two wood and only one stone in the pack beside carried food/water/hammer.
  Capacity is not bypassed. Sleep, drinking and a further stone trip make the two-stone hand recipe feasible.
- Tick 2541: a new saw exists, consuming exactly two wood/two stone. The original workshop job still holds its three wood
  and 7/60 progress. No replacement material is granted.
- Tick 2692: the resumed original batch produces two planks; full saved continuations match and the workshop's remaining
  five wood were not charged again. A second batch produces two more planks using the normal recipe.
- Tick 2745: after a real meal, the cart recipe is offered but ineligible because this fixture has no remembered shore
  after its waterskin is consumed. The guard projects thirst 34. Four planks remain; zero carts. The longer recovery's
  downstream provisioning failure stays visible, while the shorter rules-60 staged chain did complete a useful cart haul.

Screenshots were visually inspected: stopped worker and last recorded blocker, carrying gathered materials, the new saw
and finished planks are visible. Review caught a contradictory "Nothing in the way" after the partial failure. The
read-only inspector now prefers that later failed/partial attempt over an older decision and labels it historical, with
its timestamp. A later current activity still owns its blocker. This does not claim all saved plan text updates before
the next intention review; that broader A15 question remains open.

## Preserved failures and evidence limits

The first replacement attempt had only one stone and correctly offered no crafting. The first immediate meal attempt was
too early to be offered; drinking alone freed the necessary pack room. After sawing, the meal became available normally.
A speculative downstream water visit failed because no shore was known; the test now explicitly verifies that negative
fixture contract rather than inventing a source or bypassing the safety filter. The first browser report's false check
was diagnostic arithmetic (`undefined` for consumed-to-zero item keys); treating absent counts as zero made it correctly
verify the observed two-wood/two-stone charge. Both reports remain available. Typecheck also caught a test-only narrowing
of a rack loan to null; the assertion now rereads the actual tool record after work.

Focused mechanism/adjacent tests passed 24 tests / 6 files; after the inspector correction, relevant observer/tool tests
passed 9 tests / 3 files. The final unchanged-source full suite passed **1,512 tests / 224 files** in 289.74 seconds;
typecheck passed after the inspector-only correction. Ordinary run denominators, zero activation and the superseded mixed
source verification run are recorded in the programme register. The complete autonomy/environment programme remains open.
