# The world pass: what a rich world has that an authored one does not

One page, one line of truth per mechanism: what it is, where it is read, and how to see it in the page. Everything here is
behind `settings.dynamics = 'rich'`. In an authored world every function below returns its neutral value and no field below is
ever created, so authored saves and fingerprints are untouched (the golden suite checks this on every commit). Every chance
below is a hash of the seed, the person and the tick, never a draw from the world's random stream, so a replay is exact and
the lab's "nudge" still tells chaos from cause.

| Mechanism | Module | What it changes | Read where | See it |
|---|---|---|---|---|
| Occasions | `occasions.ts` | A death calls a funeral, a birth or wedding a feast, a harvest a harvest feast, the calendar a market every sixth day once a hall stands. Held at the hall (else the fire), in daylight by the world clock. | `attendOptions` (30–50 against ordinary work's 20–45; closer kin and friends, the sociable, more), `arrive` (the first eight met, a thought for everyone, food to the hungriest at the market, `marketSwap` barter) | Feed: "A funeral for X is called at the hall today"; people's logs "Went to the market" |
| Reputation and news | `reputation.ts` | What people saw of each other (a gift, a quarrel, a promise kept or broken, a death, a birth, a wedding, a theft) is held with its source, teller, hops and age, passed one story per conversation, weighed by trust, fading over twelve days. | `social.ts willingness` (±0.25), chat option (±3), the ask worth making | Person card, Traits & skills: "What they have heard of people" |
| Illness | `illness.ts` | A fever from cold, hunger and exhaustion (more in winter); passes in talk (12%), at one table (15%), under one roof; worsens a day, eases with rest counted double; costs health (fatal on an empty stomach), twenty days' immunity after. | bed and rest options (+14–30, +10–22), chat candidates (the cautious keep away), existing care for the hurt | Health line: "62 · a fever, day 2: bad" |
| Apprenticeship | `apprentice.ts` | On top of the trade a person settles on for themselves (`trade.ts`, by comparative advantage and what they see others at): a tradesperson may take on a workmate after a job done together; the apprentice learns half as much again within ten tiles of the master, graduates into a trade of their own when nearly as good, lapses after five idle days. Skill still grows only by practice. | `onSharedWork` (facilities, building sites), `notePractice` at every skill-gain site | Traits & skills line: "Their trade: smithing — learned from Sven; apprentice at smithing under Sven"; feed "has taken X on as an apprentice" |
| Hopes | `life.ts` | On coming of age one hope from the nature: a solid home, a family, a trade, a full store, a good name. Progress is read from the world; a nudge of 4 to what serves it; a weight when long unmet, a lift when reached. | `goalNudge` in the ranking; thoughts | Traits summary: "Hopes for a family (50% there)" |
| Injury and age | `life.ts` | Felling, breaking stone and building may hurt (sprain, cut, broken arm): walking up to 40% slower, work up to 50%, healing two to six days. Elders carry and mend at three quarters and are hurt twice as easily. | `moveSpeed`, `tools.ts taskMultiplier`, `carryCap`, `needs.ts` recovery | Health line: "a broken arm (at the building site), 4 days to heal" |
| Theft | `misdeeds.ts` | Very hungry, nothing carried, nothing at home: another household's store is an option weighed against conscience (−18, −8·caution, −6·generosity). Who saw decides the cost: witnesses hold the story, the household wronged a grievance. | `options_survival.ts` eat-from-store loop, `act_resource.ts onTheft` | Feed (conflict): "Bea caught Sven taking food from the Ash household's store" |
| Favours | `misdeeds.ts` | `Relation.debt` (a gift leaves one) is read: whoever owes is readier to grant, whoever is owed readier to ask. | `willingness`, `optRequest` | Decision record: "they owe me a favour +3" |
| An ask worth making | `options_social.ts` | A request for food or water is weighed by how likely the answer is yes (plausibility, trust, their name, what they owe); a likely refusal is not asked unless the need is dire. | `optRequest` | Decision record, blocked: "not worth asking: they would likely say no" |
| Finite rock | `sources.ts` | Rock does not grow back; after it, the quarry at an outcrop. | `makeSource` | Rock card: no regrowth |
| Dry spell, flood | `hardship.ts` | High summer may bring a dry spell (12%/day, 2–5 days): wild food at 40%, crops at 30%, fish and water untouched. A storm at its height floods the shore: piles within two tiles of water lost (recorded as spoiled), lean-tos and huts there lose 25 condition; at most once in three days. | `regrowRate`, `growthRate`, `floodTick` | Feed (nature) |
| Deer and hunting | `wildlife.ts`, `hunting.ts` | Two deer and one more per twenty-five people graze at the forest's edge and bolt from anyone within seven tiles (four for a stalker). A hunt is an option (hungrier, better forager, with others near); the strike lands by 22% + 18% per companion + 10% per skill point; a kill yields four meat plus one per companion, shared, recorded. Deer are no danger to anyone. | `huntOptions` in `survivalOptions`; `isThreat` | A brown deer on the map; feed "X and Y brought down a deer" |
| Chronicle | `events.ts` | The events worth remembering (lives, the land, what was finished, held, fought over) kept up to four hundred after the feed has rolled on. | `addEvent` | Feed filter "Chronicle" |
| Buildings remember | `buildings.ts` | A finished building records who finished it and when. | `completeSite` | Building card: "Built by Kai, Bea (3 days ago)" |
| Roads | `world.ts roadsTick` | A tile worn to 0.85 for eight checks (two days) becomes a road that stays worn: plain to see, faster to walk. Nothing is built. | `decayWear` keeps wear at 0.7; `terrainSpeed` reads wear | The worn paths that never fade; feed at 20/60/120/240 tiles |
| A crowd's hall | `production.ts` | Once two dozen live here a hall is wanted whether or not a yard stands. | facility wants | The town builds its hall, then holds its market |

Also in this pass, not rich-gated: the town survives its first lean season (fishing spots on a short shore fill as fast as the
town's share would; the lean-to ring grows with the camp), and a settlement may hold one workplace of a kind per village's
worth of people (`rules.ts facilitiesPerKind`).

## What was checked

Each mechanism has a unit test (`tests/{occasions,reputation,illness,apprentice,life,misdeeds,environment,settlement_record}.test.ts`)
that holds the mechanism to its rule and holds an authored world to having none of it. The golden suite matched after every
commit. No ensemble was run for this pass: it is a build, not a measurement. The lab switch `rich-no-trades` (trade.ts) removes the trade and the apprenticeship together; the other mechanisms can be given
switches on the same pattern.

## What is not done

Nothing here is tuned against an ensemble; the numbers are first settings chosen to be visible without dominating (a gathering
beats a chore, never a pressing need; a trade's nudge is the plan's nudge; a hope's is smaller). The next pass (the user's list:
boundaries and alone time, mentors and apprentices, crews, mediation, shared responsibilities, life changes, traditions) builds
on the records this one leaves: `p.heard`, `p.trade`, `p.apprentice`, `p.goal`, `world.chronicle`.
