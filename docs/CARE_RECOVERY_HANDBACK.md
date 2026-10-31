# Childcare responsibility after a parent's recovery

## Reproduced transition at rules 96

`autonomy_evidence/care97-before.ts` declares an initially injured parent, a nearby
child and a willing neighbour. It selects an actually offered watch request and,
after acceptance, an actually offered watch. The initial injury naturally expires
at tick 160. At 220 the recovered parent personally sees both child and helper;
the helper is physically watching and the accepted request remains active. There
is no offered way for the parent to communicate taking care back. The ledger
balances; the expected failing assertion is in `autonomy-care97-before.log`.

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

No rules-97 implementation or successful handback is claimed by this audit.
