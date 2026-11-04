# Review H scratch notes (2026-11-01, HEAD b2cf812, rules 115)

Scripts here: growth.ts (4-day Normal collection census + per-field sizes), dead107.ts (rules-107 save residue),
packcheck.ts (packPersons fallback cause + cost), prof.ts / prof2.ts (inspector-protocol CPU profiles), profsum.mjs.
Outputs: growth-meadow.json, growth-river.json, dead107.json, normal.cpuprofile, large.cpuprofile, mature107.cpuprofile.

Key measured numbers
- Normal meadow/river current rules, 28 people, immigration off: raw save 0.87/0.93 MB (day 0, packed) ->
  1.89/2.09 (d1) -> 2.23/2.47 (d2) -> 2.44/2.77 (d3) -> 2.63/2.99 MB (d4), all unpacked from day 1.
- packPersons fallback: day-4 meadow 2.63 MB raw / 450 kB gz as saved vs 1.98 MB / 254 kB if columns applied;
  rules-107 day-18 save 4.49 MB / 754 kB vs 3.09 MB / 497 kB. Cause: optional keys on some people only
  (crowd 26/28, socialMemory 23/28, goal 19/28, hauling 16/28, leisure, heardDemand, indoors, customers,
  relocationHardship, injury, apprentice, careJourney; background 28/29 in the 107 save) + key-order differences.
- told (news.ts, key listener*1e6+belief): 145 -> 549 entries over days 1-4 (28 people); 1,816 at day 18 (29 people).
- cooldowns: 1,027-1,038 keys at day 4 (greet 714-750, opt: 140-177), 67-85% expired; 1,944 at day 18, 94% expired.
- failures: 47-76 at day 4 (15-20% stale targets), 284 at day 18.
- beliefs: 6,651-8,881 at day 4 (240-320/person), 14,492 at day 18 (500/person), 67,350 at Large day 45 (612/person);
  stale (entity gone, not water/flood) 2-3%.
- nextId: +780/+884 per day for 28 people (28-32 per person-day).
- Tick cost (this machine, idle-ish): fresh Normal 0.84 ms (ticks 2400-4800), Normal day 18 (107 save) 1.57 ms,
  fresh Large 3.93 ms (ticks 60-300). Retained: mature Large day 45 16.55 mean / 25.65 p95 ms (perf109).
- Profiles: fresh Normal top self: describeSeenPerson 5.6%, stepPerson 5.1%, personalHandovers 5.0%, perceive closures 8.7%,
  workWindow 3.3%, updateNeeds 3.1%, gridQuery 3.0%. Normal day 18: workWindow 10.1%, perceive 4.5%, observe 3.5%,
  refreshBeliefs 2.6%, observeFlood 2.2%+2.0%, reviewHandovers+personalHandovers 3.3%.
- Rules-107 save residue of the 1 dead person: 8 relations, 13 whereabouts; removing all gone references -0.8% raw.
