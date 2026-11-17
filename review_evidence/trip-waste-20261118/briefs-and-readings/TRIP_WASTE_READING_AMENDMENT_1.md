# Trip waste reading, amendment 1 (SCRATCH ONLY, 18 November 2026, written before any load table was computed)

`TRIP_WASTE_READING.md` (SHA-256 `c223694b8482d55675cb174633956f6d52b033d20fab677e33b2a5625dadc47d`, recorded at launch, 00:26) is not edited. This amendment replaces its question 1 only, because of a flaw I found by reading `src/sim/options_survival.ts` lines 203 to 210 while the three runs were going, before any load figure of this task existed (the nine `trips.jsonl` files had been opened for one sample row only).

## The flaw
The reading called a gather **room-limited** when units taken equal the pack room and the room is below the planned units. But a food gather's planned units are already `max(1, min(floor(source estimate), need, room))` (`foragePlans`: `need` is 3 to 6 for stocking, `room` is `invRoom` of the item, the source estimate is the person's belief of what the source holds). Planned never exceeds the room, so "room below planned" cannot occur and the reading's three classes cannot tell room from a small plan. One sample row shows it: a youth with a pack of 7.75 of 9 took 1 berry, planned 1, room 1.

## The replacement (question 1 only)
For a gather walk of a person of 12 or over that did its job and took at least 1 unit, with T units taken, P units planned (`plannedUnits`) and R the room in units for the main item taken at the start of the walk (`floor((cap - pack weight) / item weight)`, `economy.ts roomFor`, pack and cap from `packStart`): a gather is **tiny** when T is 2 or fewer. Among the tiny gathers:
- **pack full** when R is 2 or fewer (the pack had room for two units or fewer of that item, so a plan of any size could not have been larger);
- **short of plan** when R is 3 or more and T is below P (the place gave less than was planned);
- **small plan** when R is 3 or more and T equals P and P is 2 or fewer (the amount planned, from the person's belief of what the source holds, the amount wanted, or a care or promise amount, was already small while the pack had room);
- **other** otherwise.

Also reported, because it says which term of the plan was small: the tiny gathers by purpose (`to stock the household`, `to ease hunger`, a care supply) and by source type, and the share of all gathers that were tiny. Whether the small plan came from the source estimate or from the wanted amount cannot be separated in `trips.jsonl` (only the minimum is kept); that is a limit, stated now.

**TINY LOADS ARE THE PACK** when, in at least 2 of 3 worlds, at least half of the tiny gathers were pack full. **TINY LOADS ARE THE PLAN** when at least half were small plan. **TINY LOADS ARE THE PLACE** when at least half were short of plan. Anything else is **MIXED**. Read from the pooled A, N1 and N2 runs of each world. Everything else in `TRIP_WASTE_READING.md` stands, including questions 2 and 3 and the limits.
