# Rules 32 — observer-facing truth

Two presentation changes that make what a viewer sees match the ledger, delivered together at rules 32
because both change serialized state (and so are versioned like any behavioural change).

## Stalled-site shortfall

`src/sim/options_work.ts` (`optSites`): the "site is waiting for materials (…)" reason is now derived from
the site's own ledger — `missingMaterials` (required minus delivered minus used) — instead of the person's
stale belief snapshot, so the reason does not list material that has already been delivered. The text is part
of the serialized decision record, hence the version gate. Below rules 32 the stale text is kept.

## Belief-outcome log

`src/sim/knowledge.ts` (`observe`): when a person re-sights a source whose own earlier belief said it held
2+ units and it is now bare or at most half full, one `info` line is written to their log from the belief
fields (amount, age, whether told or remembered, who told them) and what they now see. `p.log` is not hashed
(so `hashWorld` is unchanged) but is serialized, hence the version gate. Below rules 32 no such line is written.

Both are presentation-only: no decision reads the new text or the log line.
