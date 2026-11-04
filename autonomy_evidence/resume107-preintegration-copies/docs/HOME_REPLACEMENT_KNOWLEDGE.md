# Home replacement from personal knowledge — diagnosis at rules 107

## Reproduced gap before editing

On 31 October 2026, `autonomy_evidence/home-loss107-probe.ts` compared Ada's
layout options before and after her remembered hut collapsed outside her sight.
Her belief remained identical: a sound hut at (71,66), observed at tick 0. Ada
remained at (30,30), heard no report and did not perceive the collapse. Before:
no home layout offer. After: `plan_site:lean_to`, reason `no shelter of our own yet`.
Both observations were pure and the resource ledger balanced. Log retained at
`autonomy-home-loss107-probe.log`.

Classification: **RUNTIME_LOGIC_BUG**. `Ctx.home` is populated by
`homeBuildingOf`, which follows the live household home id. `destroyBuilding`
correctly clears that physical ownership record, but `options_work.ts optPlanBuild`
uses it as the person's knowledge when choosing whether they need another home.
The existing `shelter.ts ownHomeBeliefFor` already owns the person's remembered
home; missing buildings are removed from that knowledge by actual local perception.
Replacing physical custody is not itself communication to absent household members.

## Bounded intended contract (not implemented yet)

Home layout decisions and their stated housing need must use the person's own
remembered home type and location. An unseen collapse must not create a replacement
decision; an observed loss may open the existing costly shelter path. Physical
layout/site/ownership checks remain engine checks. Preserve pending layout claims,
material costs, capacity, actual labour, urgent needs and refusal/failure. Do not
copy a Building object into beliefs or use the live entity to fill missing facts.

Before selecting the exact change, cover stale knowledge when another person has
already completed a replacement. Reuse existing valid work and prevent duplicate
physical layouts without teaching remote facts through the planning stage.

Expected owners: a small housing-knowledge helper, `options_work.ts` layout choice,
and only demonstrated missing execution checks in `act_build.ts`; rules version
and lab switch, contract tests, visible scenario, docs/register and predecessor
continuation verification. Rules 107 already has an immutable reference. The next
rules number must still be checked before allocation.

## Retained adverse physical case

`autonomy_evidence/home-replacement107-probe.ts` stages one adult, a home collapsing
within sight, finite carried/home food and water and known raw sources. Existing
rules already lay out and build a replacement lean-to (finished at tick 2,609),
then begin a hut (layout at 3,188). By tick 12,000 the adult has died and the hut
did not finish. Exact twin continuation and conservation pass. This is not a claim
of reliable household recovery, and the fixture must not be silently edited to
erase that failure. Log: `autonomy-home-replacement107-probe.log`.

The broader WS16 replacement, limited-labour household viability and A3 goal-family
requirements remain open. This diagnosis is one specific local-knowledge gap,
not evidence that another planner or a global pressure change is needed.
