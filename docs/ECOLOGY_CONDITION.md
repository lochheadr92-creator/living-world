# Persistent ecological condition — current-source audit

Audited against rules 85 runtime `8d41d2a`, before allocating successor behavior. This is a
source audit and implementation continuation, not a completed ecology feature or measured
benefit. The owner's full autonomy/environment prompt remains the scope; the capability row
in `DEPENDENCY_CHAIN_PROGRAMME.md` stays open.

## Existing owners and confirmed gap

- `sources.ts/makeSource,updateSources`: stock, maximum stock, regrowth timer, tree maturity,
  rain/season/hardship growth and natural tree seeding. No persistent harvest-pressure condition.
  Rich rock and mineral deposits remain finite. Tree removal leaves an existing cosmetic stump.
- `act_resource.ts`: actual source extraction includes ordinary inventory gathering through
  `economy.ts/gatherFromSource` and a distinct full-pack eating-at-source path which removes a
  unit directly and records consumption. Any pressure hook must cover both once, using actual
  removed quantity, without double-counting reservation, transfer or food consumption.
- `farming.ts/createPlot,updatePlots`: crop care and accumulated care affect growth and grain/seed
  yield. `act_farm.ts/plant` resets crop care after consuming a real seed. Tending already costs
  time and tool wear; it consumes one carried water when available for a larger care improvement.
  No persistent soil condition survives successive crop cycles, and no fallow/rest decision exists.
- `knowledge.ts`, `source_learning.ts` and work/source options own personal observation, stale
  quantity estimates and actual gathering experience. Ecological knowledge must be observed
  locally or honestly communicated, with no access to exact unseen current condition.
- `types.ts`, `world.ts`, `save.ts` own authoritative state, update ordering, hashing and saved
  validation; existing source/plot renderer and inspector owners supply visible place changes.

## Required implementation and evidence

The missing behavior is not another stock counter. Introduce bounded persistent local productive
condition, separate from harvestable inventory, with pressure from actual extraction/cultivation
and recovery through rest, appropriate real tending/fallowing and feasible replanting. Recovery
must respond to existing season/weather/local circumstances. Avoid resetting a damaged place
merely by replacing its resource entity. Keep finite mineral stock finite and biological growth
explicit in the material ledger. No negative stocks, duplicate growth or free planting material.

People need observable condition distinctions and corresponding lawful options: use another
remembered source, preserve seed, tend, rest a field or establish a patch when feasible. Reuse
existing movement, household access, work, claims, tools, water and seed consumption. Execution
must revalidate location, ownership/access, materials and competing use. An unknown condition
or recovery time stays uncertain. Choices remain voluntary under genuine survival pressure.

Verification must include comparable patches under different real harvest pressure, rest versus
treatment, successive crops, a physical local response, interruption/concurrency/failure cases,
continued save/replay, pure inspection and a visible persistent change. Preserve ordinary adverse
outcomes and opportunity denominators. Staged divergence alone does not establish ordinary
frequency, viable food supply or welfare benefit. Current mature Large/long ecological ensembles
remain the explicitly pending owner-run validation in `AUTONOMY_VALIDATION.md`.

The same owner prompt separately requires bounded accessible water supply/recharge/extraction
and any justified constructed well or collector. Lake fetching is currently not a hydrological
budget. That requirement and durable hazards/debris remain open; ecological-condition work must
not label them complete by association.
