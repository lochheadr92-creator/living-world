# Remembered-room welfare visits

Each row follows one original departure through tick 232800. Runs for the same pair overlap. A retry is a subsequent visit launch by the same person towards the same recipient. Held counts are distinct ticks on which that offer was considered and withheld.

| Original case | Test | First outcome | Elapsed ticks | Later launches (tick, memory tick) | Holds |
|---|---|---|---:|---|---:|
| Isla II → Vik II (230957) | native | failed / they are inside a different space | 0 | 231102 / 230796 | 0 |
| Isla II → Vik II (230957) | door | success / helped | 46 | none | 0 |
| Isla II → Vik II (230957) | closed | failed / indoor admission is disabled | 35 | none | 2 |
| Bram → Cole II (231029) | native | failed / they are inside a different space | 0 | none | 0 |
| Bram → Cole II (231029) | door | success / fine | 308 | none | 0 |
| Bram → Cole II (231029) | closed | failed / indoor admission is disabled | 297 | none | 0 |
| Isla II → Vik II (231102) | native | failed / they are inside a different space | 0 | none | 0 |
| Isla II → Vik II (231102) | door | success / helped | 39 | none | 0 |
| Isla II → Vik II (231102) | closed | success / helped | 39 | none | 0 |
| Ulric → Pavel (232179) | native | failed / they are inside a different space | 0 | 232412 / 232364 | 0 |
| Ulric → Pavel (232179) | door | failed / they needed something I did not have on me | 45 | none | 0 |
| Ulric → Pavel (232179) | closed | failed / indoor admission is disabled | 34 | none | 1 |
| Ulric → Pavel (232412) | native | failed / they are inside a different space | 0 | none | 0 |
| Ulric → Pavel (232412) | door | failed / they needed something I did not have on me | 58 | none | 0 |
| Ulric → Pavel (232412) | closed | failed / indoor admission is disabled | 47 | none | 1 |
