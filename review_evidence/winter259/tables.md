# Rules 259 through winter

Six starts, four arms each, 13 simulated days per arm. Means give each start equal weight. Differences are enabled minus disabled. Noise is the largest absolute difference from enabled to either nudged control in the same save. Raw ticks and denominators are in the per-arm JSON files.

| Start | Returns off → on | Walking off → on (% awake 12+) | Walking Δ / noise (pp) | Company + leisure Δ / noise (pp) | Deaths off → on | Hungry without food Δ / noise (pp) |
|---|---:|---:|---:|---:|---:|---:|
| aspen-day48 | 6 → 0 | 52.74 → 52.11 | -0.63 / 0.76 | -0.13 / 0.46 | 0 → 0 | 0.66 / 0.67 |
| aspen-day96 | 145 → 13 | 56.87 → 57.08 | 0.21 / 0.37 | -0.08 / 0.27 | 0 → 0 | 0.93 / 0.55 |
| gen-4-day48 | 10 → 3 | 50.59 → 50.41 | -0.18 / 0.35 | -0.47 / 0.18 | 0 → 0 | 0.65 / 1.20 |
| gen-4-day96 | 42 → 4 | 56.78 → 57.79 | 1.01 / 0.66 | -0.49 / 0.32 | 1 → 1 | -0.72 / 1.89 |
| river-day48 | 75 → 6 | 56.61 → 56.02 | -0.59 / 0.20 | -0.34 / 0.30 | 0 → 0 | -3.20 / 1.92 |
| river-day96 | 99 → 4 | 54.79 → 55.35 | 0.56 / 0.26 | -0.43 / 0.56 | 0 → 1 | 1.16 / 1.53 |

## Where waking time went

Shares of all waking ticks for people aged 12 or older. The category called sleep covers a sleep activity sampled while the pose is still awake.

| Activity | Off (%) | On (%) | Change (pp) | Starts above / below noise |
|---|---:|---:|---:|---:|
| travel | 54.73 | 54.79 | 0.07 | 2 / 1 |
| work | 12.74 | 12.91 | 0.17 | 3 / 1 |
| social_contact | 11.29 | 10.99 | -0.30 | 0 / 4 |
| leisure | 0.55 | 0.52 | -0.03 | 0 / 2 |
| rest | 6.17 | 6.43 | 0.26 | 0 / 1 |
| waiting | 7.97 | 7.81 | -0.16 | 1 / 2 |
| eating_drinking_warming | 5.58 | 5.50 | -0.08 | 0 / 0 |
| failure_recovery | 0.19 | 0.19 | 0.00 | 2 / 0 |
| idle | 0.68 | 0.70 | 0.02 | 3 / 1 |
| defence | 0.12 | 0.15 | 0.03 | 1 / 1 |
| sleep | 0.00 | 0.00 | 0.00 | 0 / 0 |

## Paired changes in the waking day

Percentage points, enabled minus disabled. Waking person-tick totals can differ across arms. Blank causal attribution is intentional: the observer measures occupancy, not how individual minutes are reassigned.

| Start | travel | work | social_contact | leisure | rest | waiting | eating_drinking_warming | failure_recovery | idle | defence | sleep |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| aspen-day48 | -0.63 | 0.16 | 0.00 | -0.13 | 0.46 | 0.12 | -0.03 | 0.01 | 0.02 | 0.01 | -0.00 |
| aspen-day96 | 0.21 | 0.09 | -0.08 | -0.01 | 0.02 | -0.29 | 0.01 | -0.00 | 0.06 | -0.02 | -0.00 |
| gen-4-day48 | -0.18 | 0.64 | -0.35 | -0.12 | 0.89 | -0.26 | -0.63 | 0.00 | 0.02 | -0.02 | 0.00 |
| gen-4-day96 | 1.01 | -0.15 | -0.48 | -0.01 | -0.24 | -0.18 | -0.02 | 0.01 | -0.02 | 0.08 | 0.00 |
| river-day48 | -0.59 | 0.62 | -0.49 | 0.15 | 0.10 | 0.26 | -0.13 | -0.01 | 0.04 | 0.04 | 0.00 |
| river-day96 | 0.56 | -0.34 | -0.39 | -0.04 | 0.35 | -0.60 | 0.34 | -0.01 | 0.01 | 0.10 | 0.00 |

## Behaviour and survival

Counts within each 13-day window. An asterisk means the adverse change was strictly greater than the corresponding nudge spread.

| Start | Store switches off → on | Withdrawals off → on | Deposits off → on | Operations off → on | Death Δ / noise | Hungry without food, off → on (%) |
|---|---:|---:|---:|---:|---:|---:|
| aspen-day48 | 55 → 13 | 836 → 1048 | 1079 → 1072 | 173 → 179 | 0 / 0 | 14.84 → 15.50 |
| aspen-day96 | 612 → 307 | 1314 → 2132 | 1857 → 2600 | 332 → 349 | 0 / 0 | 10.54 → 11.48 * |
| gen-4-day48 | 90 → 63 | 964 → 1191 | 1172 → 1200 | 212 → 237 | 0 / 0 | 14.78 → 15.43 |
| gen-4-day96 | 293 → 204 | 1321 → 1133 | 1658 → 1579 | 333 → 372 | 0 / 1 | 23.76 → 23.04 |
| river-day48 | 210 → 86 | 727 → 939 | 978 → 1160 | 189 → 245 | 0 / 0 | 15.36 → 12.16 |
| river-day96 | 349 → 98 | 995 → 1026 | 1366 → 1360 | 176 → 181 | 1 / 1 | 27.80 → 28.96 |

## Checks

aspen-day48 — all checks passed; 4 distinct end hashes.
aspen-day96 — all checks passed; 4 distinct end hashes.
gen-4-day48 — all checks passed; 3 distinct end hashes.
gen-4-day96 — all checks passed; 4 distinct end hashes.
river-day48 — all checks passed; 3 distinct end hashes.
river-day96 — all checks passed; 4 distinct end hashes.
