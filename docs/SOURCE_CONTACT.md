# Gathering failure must respect contact — rules 75

Dependency for A7 route reliability: a failed route must not produce a new firsthand source observation or blame a
distant last taker. Rules 74 is frozen at runtime `f131e59`, continuation/publication `5d86090`.

The physical diagnostic (`scripts/route_failure_diagnostic.ts`, `autonomy-route75-before3.log`) starts an actual gathering
trip after legal preparation. A staged deep-water barrier and unseen depletion are introduced at the departure callback.
At tick 323, person 2 is at (14.5,26.5), source 6 is at (65,55); travel fails before arrival. The gathering ending handler
nevertheless replaces remembered stock 12 / seen tick 0 with stock 0 / firsthand seen tick 323. The same handler can
inspect the source's last taker when its contest marker is set. This is hidden information, not route learning.

Contract: preserve the prior source belief after a failed travel phase; record the actual inability to reach it and its
uncertainty in the existing log. Do not infer source availability or a rival's contribution before arrival. Actual work
arrival still refreshes stock and supports the existing source experience. Verify a reachable counterpart, failed travel,
hidden-stock independence, intermediate save, observer purity, lawful later arrival and predecessor behavior. Do not alter
pathfinding, obstruction geometry, general cooldowns or category payoff in this repair. Repeated-route learning remains
the next dependent implementation.

Initial diagnostic failures are retained: the first attempted gathering before its prerequisites were ready and was
correctly unavailable; the second introduced the barrier after the path was already computed and did not produce the
intended travel failure. The final diagnostic intervenes at the real departure callback before path planning. These are
fixture corrections, not changed simulation thresholds or claimed ordinary events.

## Implemented boundary and evidence

`act_resource.ts` owns this repair: its gathering ending handler now requires actual work arrival before refreshing stock
or inspecting last-taker metadata for contest attribution. The existing downstream contest handler also requires the
other person to be nearby; the repair prevents the unvisited-source inference before that check. Existing failure and
log owners retain the route result. A failed travel log explicitly says the source was not reached and current stock is
unknown. The `rulesversion.ts` gate preserves every recorded earlier world. No new saved schema or general memory owner.

`tests/source_contact.test.ts` has **5 passing contracts**: failed travel preserves its belief, unseen empty versus stocked
sources yield identical personal knowledge, actual arrival still learns emptiness, rules 74 retains its former behavior,
and a handler-boundary contest negative does not blame a nearby person from unvisited-source metadata. The last is staged
metadata, not a claim of an ordinary theft. The failed-travel test also verifies observer/AI purity, 600 ticks of exact
saved continuation and conservation. Combined initial contact/source-learning/rules-74 check passed 16/16 before adding
the contest negative; the full suite includes all final contracts.

Release verification: **257 files / 1,732 tests passed**, 177.36 seconds (`autonomy-contact75-full-tests.log`); typecheck
and production build passed (`autonomy-contact75-typecheck.log`, `autonomy-contact75-build.log`). The build retains the
large-chunk notice (988.91 kB). No source or tests changed during the full suite or ordinary observations.

`scripts/browser/source_contact_check.mjs`: **6/6** in `autonomy_evidence/contact75-rendered4/`. Visually reviewed the
failed-travel close view, its overview showing the person and source on opposite sides of the deep-water barrier, and the
reachable source's actual empty-visit explanation. The first browser assertions used a nonexistent `.inspector` selector
and reported empty text despite readable screenshots; that report remains preserved. The corrected query and the overview
camera adjustment do not change simulation behavior. Inspector interaction leaves the complete world unchanged.

## Fixed ordinary sample and limits

Each fresh Normal rich world runs 5 days / 12,000 ticks with immigration disabled, 2,800 living-person samples and 100
full-state/RNG observer checks. Every observed world exactly matches its unobserved continuation and conserves resources.

| Seed | Gathering starts | Endings | Failed in travel | Failed in work | Seconds |
| --- | ---: | ---: | ---: | ---: | ---: |
| river | 745 | 733 | 0 | 109 | 85.44 |
| forest | 766 | 750 | 0 | 122 | 84.30 |
| meadow | 625 | 606 | 0 | 42 | 85.43 |

These are activity counts, not independent people; some activities remain running at the horizon. Work failures can have
causes besides empty stock. **No ordinary travel-failure activation was observed.** The physical staged case proves the
knowledge boundary; it does not establish frequency or aggregate benefit. Source manifests, settings, exact events,
time budgets and final saves: `autonomy_evidence/r75-{seed}/report.json`. Reproduce with
`npx --no-install vite-node scripts/gather_contact_observe.ts -- river <fresh-output>` and likewise forest/meadow.

## Next dependent gap

`scripts/route_retry_diagnostic.ts` and `autonomy-route76-before.log` keep the same physical barrier while the remembered
source stays positive. After the first failed departure at tick 323, ordinary decisions retry and fail at **485, 591 and
793**, without clearing cooldowns or changing needs. At tick 1524 the current offer is absent for other ordinary reasons;
the failure record has count 4. This is evidence of repeated attempts in a staged obstruction, not an ordinary incidence
or proof that any particular new retry duration is beneficial. Next: bounded personally grounded route experience, scoped
to a relevant start/destination and corrected through successful arrival, without global terrain knowledge. Task-specific
helper reliability, conflicting reports and the remaining programme are still open. Expensive mature/aggregate validation
remains pending under `AUTONOMY_VALIDATION.md`.
