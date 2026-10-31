# Practical warmth duty acquisition

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
