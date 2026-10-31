# Childcare responsibility after a parent's recovery

## Reproduced transition at rules 96

`autonomy_evidence/care97-before2.ts` declares an initially injured parent, a nearby
child and a willing neighbour. It selects an actually offered watch request and,
after acceptance, an actually offered watch. The initial injury naturally expires
at tick 160. At 320 the recovered parent personally sees both child and helper;
the helper is physically watching and the accepted request remains active. There
is no offered way for the parent to communicate taking care back. The ledger
balances; the expected failing assertion is in `autonomy-care97-before2.log`.
The earlier tick-220 probe is retained, but the existing general talk cooldown
lasts to 297. That earlier instant was not an eligible conversation opportunity;
the corrected later probe and source inspection establish the missing transition.

The companion `care97-watch-interruption.ts` reproduces a directly relevant pause
defect: after 109 real watch ticks, suspending/resuming the same valid activity and
running eight more ticks leaves progress at eight. `suspendActivity` and
`beginWork` clear the generic progress field; `watchTick` has no separate retained
watch time. Conservation still passes (`autonomy-care97-watch-interruption.log`).
A refused or interrupted handback conversation must not erase already performed
childcare. Preserve that bounded paid-watch progress across the existing pause and
arrival lifecycle, without counting time spent talking, travelling or out of contact.

Existing rules 56 communicates the child's dated location, protects reserves and
requires physical watch contact; its 300-tick completion remains valid. Rules 82
owns the requester's heard agreement, and rules 94 owns transfer of private work
plans. Neither represents an agreed early childcare return. Rules 84 cancellation
specifically means personally observed building/site change; recovery is not such
a target observation and must not be fabricated as one.

The next bounded implementation must use the existing conversation and watch
owners. A recovered parent may voluntarily propose resuming care from their own
heard agreement and personal contact. Acceptance must require a capable parent,
real shared contact with the child and helper, and the exact matching obligation.
Only that watch can end; no goods, completed watch duration, private plan or other
promise can be copied or credited. Keep hearing and acknowledgement distinct,
preserve interruption/refusal, and retain a bounded personal receipt in the existing
social-memory lifecycle. Unknown remote recovery must never stop a helper's watch.

Verify actual request → accepted watch → naturally healed parent → spoken return →
accepted responsibility → safe end of the matching watch. Check renewed incapacity,
missing child, different interiors, stale/dead participants, already ended duties,
interrupted conversation and later continuation. Save/replay, observer purity,
legal AI offers and rendered evidence are required. Ordinary opportunities and
sustained child welfare remain separate measurement requirements.

## Rules 97 implementation and verification

`care_handback.ts` owns the bounded personal return receipt and proposal/answer
contract. The parent's own heard agreement and capability can offer the existing
social action. Actual speaking contact conveys the proposal, and a separate
answer rechecks capability and both adults' contact with the child. Acceptance
cancels only the matching remaining watch, records `agreed care return` as the
expectation's ending source and releases only its suspended activity. It does not
award the full-watch milestone or transfer unrelated goods or work. Refusal,
conversation interruption and another conversation leave the duty active.

The existing watch handler retains paid `watchedTicks`; re-arrival restores that
counter without counting travel or discussion. A resumed watch still completes at
300 physical ticks, once. A helper's proposal receipt is updated by actual later
settlement if the discussion did not end the watch. Save validation distinguishes
proposed from answered receipts and checks ownership, times and bounded progress;
hashing covers retained activity progress. The isolated lab removal is
`rich-no-care-handback`; rules 96 retain their immutable continuation.

The first positive scene inadvertently allowed the child's initial 150-tick rest
to end before the parent's offer. On release the child started talking to Ben at
320, so Ada's arrival at 322 failed because he was already talking. This is retained
as a negative contract and diagnostic (`autonomy-care97-run.log`). The positive
scene separately declares a tired child (energy 20) with a 600-tick rest; no child
controller remains after preparation. Ordinary talk cooldown and competing
conversation rules are unchanged. These are staged mechanism conditions, not
ordinary-world frequency evidence.

Focused tests pass 63 contracts across six files, including legal AI
selection and exact transcript replay with and without notes, renewed injury,
missing/dead/separately housed child, lost adult contact, stale ended duty,
unrelated held work, interrupted continuation to actual completion, malformed
saves and the rules-96 reference (`autonomy-care97-focused2.log`). Final build and
typecheck pass (`autonomy-care97-final-build.log`); the pre-existing bundle-size
warning remains (1,129.29 kB JavaScript, 378.90 kB gzip).

Rendered checks pass **7/7** (`autonomy-care97-reviewed-browser.log`, screenshots and
report in `autonomy_evidence/care97-reviewed-rendered`). Actual request #11 is
accepted at 39; the recovered parent proposes at 331, and the helper answers at
353 with both adults beside the child. The receipt records 212 real watch ticks,
leaving the remaining duty cancelled without full-watch credit. The expanded
relationship history and conversation label were visually inspected. The earlier
expanded-history check correctly failed because the detailed receipt was in the
household panel and the conversation showed a raw identifier. It now belongs in
relationship history with a plain label. The first full suite was stopped for that
concrete finding; `autonomy-care97-full-tests.log` is not a passing result.

## Ordinary screen and limits

`scripts/care_handback_observe.ts` ran fixed current-rules Normal worlds, immigration
off, for five days/12,000 ticks each, with no induced injury, recovery, request or
action. Final source manifests and full saves are under
`autonomy_evidence/r97-final-{river,forest,meadow}`.

| Seed | Seconds | Living-person samples | Repeated incapacity samples | Watch requests/starts | Return offers/starts/answers |
|---|---:|---:|---:|---:|---:|
| river | 47.56 | 2,800 | 54 | 0 / 0 | 0 / 0 / 0 |
| forest | 42.77 | 2,800 | 0 | 0 / 0 | 0 / 0 / 0 |
| meadow | 45.13 | 2,773 | 0 | 0 / 0 | 0 / 0 / 0 |

Each run performs 100 full-state observer-purity checks, preserves the unobserved
twin exactly, passes daily material accounting and reloads the final save exactly.
There were zero sampled active watches or personal recovered-watch agreements.
Thus the incapacity samples are not qualified independent handback opportunities.
Meadow retains Talia #1029's death from thirst at tick 8746, age eight. No ordinary
successful handback story exists in these windows, and none is invented. No
sustained childcare, ordinary handback frequency or survival benefit is established.

The shared exact tick-budget observer also records 336,000 / 336,000 / 332,747
living-person ticks. Work occupies 14.22% / 14.27% / 14.12%; travel 36.60% / 41.05%
/ 35.47%; social contact 6.76% / 5.80% / 6.48%; named leisure 0.38% / 0.37% / 0.32%.
Completed uninterrupted work spells lasting at least 300 ticks number 5 / 5 / 2.
These totals establish measured occupancy, not a healthy repeating household rhythm:
travel mixes purposes, survival work can be in the work category, and open spells
are censored. Critical exposure is 330 / 983 / 7,118 person-ticks; the per-need
counts can overlap. The premise of “95% survival” remains unestablished. No pressure
or leisure threshold was retuned from these aggregate categories.

Final broad regression passes **315 files / 2,124 tests in 437.41 seconds**
(`autonomy-care97-final-full-tests.log`), including the final presentation changes
and all prior continuation references. The existing test warning about an oversized
timeout remains; it did not fail the suite. The next source-confirmed household
transition is heard roof repair under `REPAIR_DUTY.md`; the expanded programme
remains incomplete.
