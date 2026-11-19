# Step 4. Why people turn back before arrival

**Decision. Keep the existing travel review rule.** Generic switches caused substantial detours, but the old job option disappeared in 463 of 657 sampled switches on the jobs the proposed bonus covers. Its score then becomes zero. Raising the multiplier for a nearly finished walk cannot restore a missing option.

## Six 13-day continuations

Aspen, Gen-4 and River each contribute two starts, at days 48 and 96. Arrivals and rules-257 workshop access are on. An abandoned walk is a leg recorded as switched mid-walk or given up before arrival. The observer keeps work attempted after arrival, temporary pauses, and right-censored outcomes separate. The 13-day denominator includes all recorded walking ticks of legs started by people aged twelve or older, including unfinished walks. It uses age at leg start. The one-day replays below count age at each tick.

Of 18,714 abandoned legs, 15,504 (82.8%) ended with “something better came up”, 1,874 (10.0%) with a gatherer believing the source was empty, 538 (2.9%) with nearby danger, and 293 (1.6%) with the other person inside a different space. Urgent warmth accounted for 207 and food immediately available in the pack for 106. The remaining labels and their tick costs are in `full-window.json`. Of the generic switches, 4,194 had closed at least three quarters of the original straight-line distance to their standing spot, 1,884 less than one quarter, 8,769 between, and 657 had no defined fraction. That fraction describes the recorded start and end positions relative to the old spot.

| Start | Abandoned walks | Generic switches | Linked new destinations | Walking ticks on abandoned legs | Estimated detour / all walking | Low geometry estimate / all walking |
|---|---:|---:|---:|---:|---:|---:|
| aspen-day48 | 2030 | 1683 | 1521 | 21.0% | 9.6% | 7.6% |
| aspen-day96 | 4459 | 3984 | 3602 | 23.5% | 12.4% | 9.9% |
| gen-4-day48 | 1696 | 1560 | 1400 | 18.3% | 9.7% | 7.8% |
| gen-4-day96 | 4190 | 3348 | 3016 | 24.8% | 9.8% | 7.6% |
| river-day48 | 2043 | 1765 | 1601 | 20.9% | 10.9% | 8.9% |
| river-day96 | 4296 | 3164 | 2875 | 26.7% | 10.2% | 8.1% |

For 14,015 of the 15,504 generic switches, the same person started a uniquely matching replacement at the switch tick and walked from the recorded drop point. For these matches, extra distance is the path already walked plus straight-line distance from the drop to the new standing spot, less straight-line distance from the original departure to that spot. Dividing by this person's observed pace on the old leg gives estimated ticks. Unmatched switches contribute zero to the displayed numerator. The archive stores the replacement standing tile. The low estimate allows 1.44 tiles of uncertainty for the two endpoint distances and coordinate rounding, with distances clipped to their geometric range. This sensitivity check is approximate. Buildings, doors, obstacles and what the walker could know at departure limit any claim about recoverable time. The nominal 3% threshold is exceeded in every start on this calculation.

### What replaced the walk

A withdrawal replaced by another withdrawal accounted for the most estimated detour in **each of the six starts**, about 102,883 ticks in total. Gather to gather was next overall at 26,377. The per-start old/new activity breakdown is in `full-window.json`.

Of 1,689 linked withdrawal-to-withdrawal switches, the withdrawal observer independently recorded both target IDs for 1,683. Of those, 1,598 changed store. In 506 the person changed store while keeping the same goal text and wanted item kinds (quantity could differ). Only 413 replacements eventually moved goods, and 1,129 were interrupted. Among 573 sequences with a third linked withdrawal and three available target records, 370 went from store A to B and immediately chose A again. Individual chains can overlap. This identifies repeated changes of destination. It does not identify a hidden stock shortage or establish that the first store would have supplied the goods.

One example from Aspen day 48 shows why the purpose of the trip matters. Person 22744 walked 46 ticks for ore from smithy 30125, then 50 ticks for ore from smithy 57884. Both walks ended at review. The person then walked 53 ticks back to the first smithy and took two charcoal for the same toolmaking goal. The records identify the changes of store and item; they do not say which was best when the walker set out.

## The decision at review time

The first day of each start was replayed with read-only callbacks at option generation, the actual switch and the replacement's startup. Among 5,733 travel-phase reviews at age 12 or older, 1,022 switched and 4,711 held. At 4,260 held reviews the old key was present. The default “something better came up” label covered 925 switches: 684 with the old option absent, 234 with it present, and seven with an unkeyed activity that uses its stored utility. The generic reason is emitted after checking danger, critical-need mismatch and the believed-empty gather case.

For the proposed rule's job list, the split was **463 absent and 194 present out of 657**. Absence was the majority in every start. Withdrawal was particularly one-sided (188 absent, 12 present). Gathering had more genuine comparisons (43 absent, 64 present). A missing option key can mean the option is no longer generated or that its key changed. These measurements do not establish which upstream condition removed each key. For example, the collection planner checks remembered stock, access, destination and room before considering the current target for its shortlist.

| Start | Reviews | Held with old key present | Generic switches | Old job present / absent | Measured generic detour / adult walking | Job-only detour / adult walking |
|---|---:|---:|---:|---:|---:|---:|
| aspen-day48 | 525 | 389 | 83 | 21 / 26 | 7.2% | 5.6% |
| aspen-day96 | 884 | 669 | 144 | 29 / 68 | 7.4% | 6.0% |
| gen-4-day48 | 747 | 597 | 92 | 12 / 56 | 5.8% | 3.4% |
| gen-4-day96 | 1304 | 967 | 210 | 45 / 119 | 9.4% | 6.9% |
| river-day48 | 771 | 552 | 129 | 39 / 52 | 8.6% | 6.2% |
| river-day96 | 1502 | 1086 | 267 | 48 / 142 | 13.5% | 8.0% |

The one-day geometry uses the replacement's actual standing point after startup, or the person's position for work begun on the spot. Each of the 751 positive-distance rows retains its origin, drop point, replacement point, distances, ticks and activity IDs. Another 136 switch legs had zero observed displacement along the path. Legs already underway at the start and two failed replacement startups have no detour credited. In both failures a proposed site layout was already reserved. The original probe stopped at these two cases. The corrected observer recognised the activity-end callback that precedes the missing start callback, and the two replays finished at their reference hashes. The archived 13-day method and the one-day replay use different coverage and time horizons.

The design requires geometric detour of at least 3% in two of three worlds **and** most drops to be decided with a current option present. The first condition held across all six starts. The second failed across all six starts, including when restricted to the proposed job list. No behaviour arm was run. The outcome of making people persist, and the effect on survival or leisure, are unknown. The narrow follow-up suggested by these observations is to trace why a collection option disappears immediately before a person changes stores, particularly on the A-to-B-to-A sequences.

## Verification and reproduction

All six replays matched their established first-day control hashes and passed item conservation. Typecheck passed. All 23 focused tests passed in `kept_target`, `found_empty` and `finish_job`. The full test suite was not rerun for this diagnostic. The six continuations represent three settlements at two ages. These totals describe those runs.

From the feature worktree, generate the 13-day summary from the existing withdrawal controls, replay each of the six saves, then summarise. For example:

```powershell
node scripts/walk_step4_archive.mjs
node node_modules/vite-node/dist/cli.mjs scripts/walk_step4.ts -- --rules-up 257 --load C:/dev/lw_saves/rules256/aspen-day48.save.json --control review_evidence/withdraw-baseline-20261119/fix-runs/aspen-day48-on.json --reference review_evidence/pack-20261119/aspen-day48.json --out review_evidence/walk-step4-20261119/aspen-day48.json
node node_modules/vite-node/dist/cli.mjs scripts/walk_step4_summary.ts
```

Use the matching seed and age in all three paths for Aspen, Gen-4 and River at days 48 and 96. The 13-day per-world reason and replacement tables are in [full-window.json](full-window.json). The first-day decision counts and old/new detour breakdowns are in [summary.json](summary.json). The per-start files contain the matched geometry.
