# LW-N10-05 crop climate trial

Date: 2026-11-21

## Scope and setup

This was a measurement-only, 36-day paired trial on the frozen rules-266 baseline commit `9b96ae6148bc2c9f0defeb683366672995e8150e`. The two ordinary histories were Aspen and River. Each history was run once under control and once with the documented moderate crop-climate candidate: lean-season growth 25%→50%, peak-winter growth 30%→60%, and below-4°C growth 40%→70%. The candidate was gated only in the isolated experiment copy of `src/sim/hardship.ts` and `src/sim/farming.ts`; no production source or shared dirty checkout was changed.

The control runs assert that each day's world hash matches the archived first 12 daily control hashes. Both arms assert daily conservation and food-budget balance. Paired arms assert identical full-run ambient-temperature traces. Care, daylight, and soil modifiers are recorded for growing plot-days. Person warmth is recorded as score thresholds (`<62`, `<35`) and cumulative deficit (`100 - warmth`); these are simulation score counters, not clinical measures.

## Results

| History | Plot-to-person field harvest (grain) | Nutrition intake | Hungry awake ticks | Final alive population | Final cumulative warmth <62 / <35 ticks |
|---|---:|---:|---:|---:|---:|
| Aspen control → candidate | 1,068 → 1,305 (+237) | 76,902 → 81,838 (+4,936) | 1,422,265 → 1,491,592 (+69,327) | 52 → 61 | 1,365,742 / 445,379 → 1,468,307 / 486,606 |
| River control → candidate | 1,139 → 1,410 (+271) | 85,386 → 82,422 (−2,964) | 1,599,526 → 1,446,620 (−152,906) | 59 → 58 | 1,323,232 / 375,903 → 1,226,313 / 353,001 |

Ambient temperature traces were identical between arms for both histories. No deaths occurred in either arm. Final warmth deficit increased in Aspen (114,680,575.43→123,359,763.00) and decreased in River (119,315,421.83→112,987,947.17). Mean plot-day care/daylight/soil modifiers were recorded; these environmental modifiers remained active and were not replaced by the candidate. Growing plot-days changed (Aspen −165,694; River +197,521), indicating the simulation's available growing-plot exposure also diverged.

The `createdGrain` ledger field is world-wide and can include non-crop grain sources; it is retained in raw JSON but is not used as a crop-specific result. Field harvest is reported separately as the observer's plot-to-person grain transfer.

## Interpretation and limits

The candidate increased measured plot-to-person grain harvest in both histories, but downstream nutrition and warmth outcomes diverged. One run per history does not establish a reliable general effect, and these results do not justify changing the default crop rules. The trial combined the three candidate factors; it cannot identify which factor drove a given result. The warmth counters are cumulative simulation scores, and population differed between paired outcomes despite zero deaths, so per-person exposure is not normalized. The trial does not prove long-term benefits, nor that care/daylight/soil penalties are sufficiently balanced.

No production rule was promoted and no list definition was changed. Follow-up requires owner review of whether to keep/discard this candidate and, if useful, a separately specified replicated comparison.

## Reproduction artifacts

- `prepare.py`: builds the scratch source from the frozen baseline and applies candidate-only gates.
- `probe.ts`: executes one seed/arm for 36 days with assertions and daily measurements.
- `summarize.py`: compares paired outputs and reports totals/final cumulative counters.
- Four raw JSON outputs preserve daily measurements. The generated source and npm package are in `C:\dev\_claude_scratch\crop-climate-20261121` and are not part of the shared checkout.

Reproduce with Node/TypeScript dependencies available in the scratch copy by running `probe.ts <aspen|river> <control|candidate> <output.json>` for each pair, then `python summarize.py` in the scratch directory.
