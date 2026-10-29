# Mature-world measurements and practical-chain evidence

2026-10-29, isolated `codex/viewer-programme`, source `5033c9e` plus script hashes in
each report. These are bounded diagnostics, not an ensemble or an aggregate benefit
claim. The owner-stopped ensembles were not restarted.

## Measurement question and provenance

What does real accumulated state cost to step, render, inspect, save and load?
Fresh product worlds use rules 54. The actual day-45 meadow world remains rules 53,
from `living-world-integrate/continuity_evidence/obs-45-meadow/final.json`, original
manifest source `98fd719934f8862e2d400499e32e29613c787cfa`. Its input SHA-256 is retained
in `viewer_evidence/performance/headless.json`. No records are cloned to manufacture
age, and no saved rules are relabelled. This is a Normal mature world, not mature Large.

Commands, each exit 0:

```powershell
npx vite-node scripts/mature_perf.ts -- 'C:\dev\Claude Experiment\living-world-integrate\continuity_evidence\obs-45-meadow\final.json' viewer_evidence/performance
node scripts/browser/mature_perf_check.mjs http://127.0.0.1:5286/ viewer_evidence/performance
```

Headless budget: 240 ticks maximum per case, at most 20 seconds including the restored
twin; 60 inspector and history queries and five save/load repetitions. All cases reached
240 ticks. Browser: 1440×900 DPR1, 180 paused app frames with the first 30 discarded;
renderer's existing CPU timers sampled without drawing extra frames. Sixty forced UI
refreshes measured separately afterwards. JS heap sampled after a browser garbage
collection. Node heap is transient process memory, including tooling and temporary
world copies, and must not be called retained world size. CPU/Node/browser versions
are in the reports. This was an active development machine, not a quiet benchmark.

| World | Living people / buildings | Save bytes | Step p95 ms | Inspector p95 ms | History p95 ms | Save p95 ms | Load p95 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal new, 54 | 28 / 8 | 816,222 | 1.73 | 1.53 | 0.033 | 7.84 | 22.19 |
| Large new, 54 | 100 / 26 | 3,000,244 | 4.69 | 1.79 | 0.028 | 31.86 | 91.85 |
| Normal day 45, 53 | 31 / 27 | 4,217,759 | 3.06 | 3.29 | 0.089 | 34.78 | 108.52 |

| Browser state | Frame submission p95 ms | Overlay p95 ms | App rAF interval p95 ms | JS heap after GC MB |
|---|---:|---:|---:|---:|
| Normal new | 2.30 | 0.10 | 17.30 | 11.34 |
| Large new | 2.60 | 0.20 | 17.00 | 15.87 |
| Normal day 45 | 3.70 | 0.20 | 20.50 | 24.17 |
| Staged speech crowd, 7 bubbles | 2.60 | 0.30 | 17.30 | 12.55 |

Submission time is CPU work, not GPU completion. The mature view's roughly 20 ms
interval needs investigation at wider camera views and with running simulation before
making a sustained frame-rate claim. No production optimisation is justified solely
by these short observations. No meaningful history was discarded. Existing history
retention semantics remain; long-term growth and mature Large still need measurements.

All observer queries and four browser cases left the complete serialized world/RNG
unchanged. All three headless cases matched their unobserved restored twin exactly
after 240 steps and passed conservation. Source hashes and array/relationship/belief
counts are retained, so these results cannot be silently attributed to later source.

The initial harness had an indexing error in its person lookup; corrected before
valid results. `browser-duplicate-draw-diagnostic.json` preserves an early measurement
that drew a second frame each rAF; it is not the normal frame-rate result above.

## Existing practical chains demonstrated

`tests/practical_care_upkeep.test.ts`: ten cases, exit 0. Six shared building types
offer real repair with owned materials. A kiln starts at condition 8, consumes five
wood to reach about 97.5, and then an offered real firing yields three bricks. A
household member physically gives two bread to a resting injured elder; the elder
eats it, improving hunger 17.81→77.18. Intermediate saved repairs and deliveries
continue exactly. These are staged opportunities with explicitly selected offered
actions, not spontaneous activation, house completion or full medical recovery.

`node scripts/browser/practical_care_upkeep_check.mjs http://127.0.0.1:5286/ viewer_evidence/practical-final`
passes five checks in actual Chromium. Screenshots of before, delivered/repaired and
used/eaten states were inspected. The renderer retains staged provenance banners.
The injury text exposed a crowded Health label; wrapping now gives that description
its own line when needed. The original captures remain in `viewer_evidence/practical/`.

Early test-fixture failures were correctly traced to using `cooldowns.pause` as a
generic hold. It means the recipient is already being attended to and prevents
work/travel. The care fixture now uses actual awake rest, preserving the valid refusal
to wake a noncritical sleeper. No production threshold or valid assertion was weakened.

Two historical rules-54 tests also reproduce unresolved childcare defects: live
coordinates used without any location knowledge, and a watch transfer consuming
the helper's last food despite their own hungry dependant. These are findings to fix
at the next valid rules boundary, not passing evidence of correct care. Concurrent
rules-55 transport work occupies that version and remains untouched.

## Ordinary checkpoint opportunities and adverse outcomes

`npx vite-node scripts/programme_checkpoint.ts -- 'C:\dev\Claude Experiment\living-world-integrate\continuity_evidence' viewer_evidence/checkpoint`
completed with exit 0. Fixed meadow, river and forest rules-53 day-45 saves each ran
1200 more ticks (half a day), with a 30-second per-case stop limit. All reached the
horizon. Each living person's actual offered options were sampled every 120 ticks;
starts and transfers were observed at their execution boundaries. These are repeated
person-time samples, not unique needs or conversion rates. Exact restored unobserved
continuation, conservation and observer purity passed for all three.

| Seed | Person samples | Care offers / starts | Care give endings | Repair offers / starts | Repair units consumed |
|---|---:|---:|---|---:|---:|
| meadow | 310 | 40 / 11 | 6 no room; 3 changed priority; 1 moved recipient; 1 different interior | 233 / 3 | 3 |
| river | 220 | 26 / 9 | 1 successful berry transfer; 2 changed priority; 6 different interior | 191 / 8 | 8 |
| forest | 80 | 6 / 3 | 1 changed priority; 2 different interior | 20 / 0 | 0 |

River's repair starts included two timber-yard jobs and one bakery job; the other
observed repair starts were homes. Starts and consumed repair goods do not establish
later useful operation of each ordinary repaired building. The staged kiln supplies
that narrower end-to-end proof. Population stayed 31/22/8 over this short window;
no household with dependants had zero diagnostically capable workers at the end.
That is not a generational viability result, and no immigration was enabled.

The care nulls expose concrete next seams: `give` correctly refuses transfers across
interiors, but planning still sends helpers into that failure; full recipient packs
also need legitimate collection/eating or capacity responses. Do not remove the
physical boundary or enlarge packs to hide either failure. The successful staged
elder care does not close those ordinary-world gaps.

There were 38/34/14 gather offers against sources last remembered empty, but **zero**
against a currently empty personal regrowth estimate. This does not establish wasted
trips or justify suppressing those offers: `estimatedAmount` legitimately projects
renewable growth. Finite-deposit adaptation and actual failed arrivals remain separate
questions. The first diagnostic counted all remembered empty places; its report is
retained as `all-place-count-diagnostic.json`, not used for this source-only claim.
`initial-counts.json` precedes the additional recorded-ending trace; fixed outcomes
were reproduced when the missing measurement was added. Nulls were not retuned away.
