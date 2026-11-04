# Large River integrity exception

The original 30-day attempt stopped at tick 45600 (elapsed day 19) because `serializeWorld(observed) !== serializeWorld(twin)`. A fresh reproduction from the same initial bytes failed at the same tick. The initial file SHA-256 was `68ED8DA08A704D7DFBC855732FF20AF10C58DD0C325A5EBF10A05A959EB9FBE4` in both attempts.

## Captured difference

`diagnostic/large-river/state-difference.json` reports exact text unequal, parsed values equal, and zero differing leaf values. `key-order-difference.json` finds one object with a different key order: `world.persons[124].bykind`, belonging to Sofia II (id 66167). The observed state lists `building` before `clay_pit`; the twin lists those two keys in reverse order. All their arrays, array order and saved values match at this checkpoint.

The daily pure-observation and conservation checks passed before the exact twin comparison failed. This is evidence for a serialization/order discrepancy at the checkpoint, not observed behavioural divergence. Its original cause is not established. The twin began from a deserialized initial state; the other world began from the factory, and only the latter received the observation calls and recording hooks. The investigation cannot assign blame among those differences without further controlled isolation.

Frozen-source inspection found by-kind readers selecting explicit kinds or summing lengths; it did not identify a behaviour depending on these two object keys' enumeration order. That inspection alone does not prove permanent harmlessness.

## Separate continuation

`supplemental-resumed.ts` resumes both captured day-19 states to day 30, retaining initial-founder metrics and focal events from the reproduction. It records exact mismatch checkpoints separately and requires deep equality of parsed saved values (including array order), daily exact observer purity and conservation. It also checks a 120-tick save/reload continuation. This is additional evidence, not a retroactive pass of the original exact-text test. It writes to `supplemental-resumed/large-river`, never the original `results/large-river` directory.

One earlier bootstrap (`supplemental.ts`) stopped before stepping because Clara, a non-focal founder who died of wolf attack on day 14.00, had already been removed from the live person array. The resumed harness follows remaining founder objects and retains Clara's collected metrics and death record. Her supplemental final row is explicitly marked `lastSampleBeforeDeath`; needs/inventory there are her last daily sample, not asserted death-time values. No person was restored to the simulation and no game source was edited.

Continuation completed: day-30 population 76, founders alive 63/100. Parsed-state equality passed at every supplemental daily checkpoint (days 19-30), and the final 120-tick semantic save continuation passed. Exact serialized equality failed at every one of those 12 daily checkpoints and after the final 120 ticks. Observer purity and conservation passed, frozen source was unchanged. No game fix was attempted. Do not classify this world as having passed all original checks.

Resuming from the two saves rebuilds non-serialized runtime indexes and caches. Even if the supplemental continuation stays equivalent, it does not prove the original uninterrupted twins would have stayed equivalent through day 30. Retain this distinction when using the outcome or deciding what regression test the development agent should add.
