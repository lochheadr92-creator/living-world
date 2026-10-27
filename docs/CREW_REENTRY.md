# Rules 35 — crew re-entry consistency

A member who left a crew because they hold a grievance against one of its members is no longer readmitted while that grievance
persists. Previously the departure rule ("fell out with one of them") and the admission rule (a friend of most of the crew) could
both fire in the same maintenance cycle, so a person left and immediately rejoined a crew that still held the person they had
fallen out with.

## The rule

`src/sim/crews.ts crewsTick`, the admission path: before counting a person as a friend of most of a crew, the crew is skipped if
the person holds a grievance against any current member. Departure (which already leaves over a grievance against any member) and
admission now agree. A cleared grievance restores normal re-entry. Below rules 35 the old behaviour is kept, so historical worlds
replay as recorded.

## Bounds

- Only the person's own relations are read (`p.relations[..].grievance`); no world truth.
- No cooldown or arbitrary delay: re-entry is permitted as soon as the grievance no longer exists.
- `world.crews` is hashed, so this is versioned like any behavioural change; the rules-34 continuation reference was recorded
  from `31cdc6e` before it.
