# Living World

A small civilisation developing inside an isometric diorama. About thirty people forage, drink, sleep, build, farm,
talk, ask each other for help, quarrel, make peace, fall in love, raise children and grow old — and over weeks of watching
they lay out a timber yard, a quarry, a kiln, a granary, a bakery, a hall and a smithy, make tools and carts, rebuild their
huts as houses, eat together and look after each other. You mostly watch.

Everything on screen is the visible face of real simulation state: a berry bush holds a number of berries,
a person who picks one carries it, a hut rises only as fast as wood and stone arrive, a plank exists because somebody sawed
a log into it, and a bubble that says “I can bring wood” exists because that person has actually promised it.

```bash
npm install
npm run dev      # http://127.0.0.1:5273
npm run build    # type-check + production bundle in dist/
npm test         # the verification suite (vitest)
```

No runtime dependencies, no network, no LLM calls, no `Math.random` in the simulation.

## What you are looking at

**People** have six needs (food, water, energy, warmth, safety, company), five personality traits
(generosity, sociability, caution, diligence, curiosity), skills that grow with practice, a household, relationships,
and a *memory*. Each decision follows the same explicit flow:

```
world state → local perception → eligible actions → chosen action → execution result → updated world state
```

* **Knowledge is local.** A person sees things within a radius that shrinks at night and in rain. Everything seen
  becomes a *belief* — a timestamped snapshot (“6 berries, seen yesterday”) that goes stale. People can also learn
  places by *being told* — a clay pit, a stone outcrop, a new workshop, a site that needs planks; hearsay keeps the age of
  the original sighting and who first saw it. Nobody consults the world's true state to plan.
* **Actions take time and happen in space.** Walking uses A* with path smoothing and desire paths wear into the grass.
  Gathering, building, sawing, firing, forging, baking, hauling, eating and drinking are multi-tick activities performed
  next to the thing being worked.
* **Resources have origins and destinations.** A single ledger records every creation (regrowth, tree growth, crop
  growth, crafting, a batch finishing, water drawn from the lake, newcomers' belongings), consumption (eating, construction,
  repairs, fuel, wasted offcuts and slag) and spoilage. `initial + created − consumed − spoiled` must equal what actually
  exists in packs, stores, workshop shelves, running batches, handcarts, tables, construction sites, piles, sources and
  fields — the test suite checks it after thousands of ticks, and the debug panel shows it live.
* **Commitment is bounded.** Activities have a minimum commitment, a hard time limit, and are re-evaluated periodically.
  Danger and critical needs interrupt at once (water before food before warmth before sleep); otherwise a switch needs
  a clearly better option. Exclusive claims (the unit being gathered, a worker slot on a site, a field plot, the start of a
  batch, the one hammer at the bench) are reservations that are always released when an activity ends, is interrupted, or its
  owner dies.
* **Work does not strand anyone.** Before taking on anything that is not about survival, a person works out whether they
  could still reach water and food: the walk there, the work, the walk back — against what they carry or can see (confirmed
  relief) or only remember (possible relief). Long trips with wolves about and the dark coming are not started.

### Making things

The settlement starts with hand tools and a little knowledge. Whether it gets any further depends on who decides what.

* **Workplaces.** A *timber yard* (logs → planks and handles; carts are built here), a *quarry* (cuts stone out of an
  outcrop, which is finite), a *kiln* (bricks and water jars from clay; charcoal from wood), a *smithy* (ore and charcoal →
  iron → iron tools), a *granary* (grain, flour and bread kept per household, spoiling slowly if tended), a *bakery* (grain →
  flour → bread) and a *hall* (where shared meals are held). A hut becomes a *house* by being rebuilt in place — same
  building, same household, still lived in while the work goes on — once planks and bricks have been carried to it.
  Nothing is guaranteed: each exists because somebody who knew the ingredients laid it out and others supplied it, and
  which ones appear, and when, differs from world to world.
* **Chains.** Every arrow is a recipe in a single table (inputs, fuel, time, products, waste with its cause in words,
  tool, skill, workers). Nothing is made for a want that is already met. The planner works backwards from what a person
  wants — a site's missing materials, a repair, a better tool, bread for the household — through what is on the shelves and
  what a workshop they may use can make, down to something they can gather by hand. The inspector shows what is blocking
  anything that is not being made.
* **Tools.** Axe, pickaxe, hoe, basket, hammer, saw, water jar (iron versions of most). A tool is a record with a wear
  and a holder, kept in step with the count in whoever holds it. It wears with use, dulls past 70%, breaks at 100%, is
  mended with a handle or a stick of wood, can be lent in conversation (the borrower promises to bring it back), left on a
  workshop's rack for anyone to use at the bench, and is left in a heap if its holder dies or the workshop falls.
* **Carts.** A handcart holds a fixed weight, is loaded and unloaded only by someone standing at the place, follows its
  puller, cannot cross forest, stony ground or water, and wears. A person wants one when they keep carrying heavy loads far
  and a load would take several trips on foot.
* **Skills** that matter here (`carpentry`, `kiln`, `smith`, `bake`) rise only when a batch is finished, so the best
  sawyer is someone who has sawn.
* [`docs/ECONOMY.md`](docs/ECONOMY.md) describes all of it — ownership and access, accounting for a batch, tools and loans,
  promises, the contested-claim rule, what happens to goods when something goes wrong, and the rule changes made
  deliberately — and [`docs/recipes.generated.md`](docs/recipes.generated.md) lists every building, recipe, item and tool as
  the simulation reads it (`npm run docs` regenerates it).

### Social life

* **Requests name what they are for.** Who asked whom, for what, how much (or what milestone), where it is to go, and by
  when. The answer is give now, promise, or decline, with the reason. A person who promises to bring materials to a site
  takes them *to the site*; an asker is not given more than they need, does not ask again for what has been promised, and
  a site takes only as many helpers as it can use.
* **Promises end exactly one way:** done, expired (partly done), moot (no longer needed), interrupted (put aside for their
  own survival), failed (turned out impossible) or broken (free and able, and did nothing). Each has its own effect on the
  relationship; only a broken one opens a grievance. A *refusal* is not a broken promise.
* **Shared meals** are one interaction from start to finish: an invitation, acceptance (a serving reserved against the host's
  own spare food), a physical place (the hall or a fire), a table laid with real food, one serving eaten at a time, and a
  recorded ending — including the ways it can fall through. An invitation that was turned down is not repeated for most of
  a day.
* **Looking after each other.** A worry exists only because someone saw a person hungry, thirsty or hurt, or was told by
  someone who did. A worry about a child, a frail elder or someone not seen for a long time may lead to a visit with
  food or water in hand, which looks at how things really are before anything is given. Healthy people are not fussed over.
* **Quarrels have causes and ways back:** a contested last berry, a refusal when it mattered, a broken promise. The soreness
  fades with time, eases with an apology (a bounded number of attempts) or a gift, and when it is over the pair are much less
  likely to fall out over the same sort of thing at once. The feed says when it ended.
* Greetings, conversations (with real phases), news and warnings that spread by word of mouth, swaps, gifts, caring for
  children and the frail, couples who move in together, births and grief are as before.

### The world

* **The world changes.** Lean-tos, huts and a storehouse are laid out, supplied, built and repaired; fields are broken,
  sown, watered, ripen and sometimes rot; trees are felled and slowly regrow; buildings weather; a fire has to be fed.
  Day/night, rain and storms matter for exposure, work and safety. Wolves prowl at the edges, avoid fire and groups, and
  occasionally bite someone who wanders alone. People plan around them: they drink at another stretch of shore, and
  someone dying of thirst will risk the one beside a den.
* **Lives run at a gentler pace.** A year of age takes twelve days (a day is 2400 ticks, four minutes at 1×), so nobody
  visibly ages during an ordinary viewing: a pregnancy lasts nine days (half an hour at 1×), a newborn needs about thirteen
  hours at 1× (under an hour at 16×) to reach adulthood, and the first elders pass on after tens of minutes of fast-forward.
  Births, new couples and travellers drawn to a thriving camp keep the population going. (`DAYS_PER_YEAR` in
  `src/sim/constants.ts` sets the pace.)

## Using it

| | |
|---|---|
| **Pan / zoom** | drag, `WASD`/arrows · wheel, pinch, `+` `-` · `Home`/`C` recentre · click or drag the minimap |
| **Inspect** | click a person, a building, a field, a resource, a construction site, a cart or a deposit; click an event in the feed to see where it happened |
| **Follow** | `F`, or double-click a person |
| **Time** | `Space` play/pause · `.` single step (exactly one tick) · `1`–`6` or `[` `]` speed (0.5× … 16×) |
| **Overlays** | Perception (what they can see), Paths, Intentions (what everyone is doing), Knowledge (what the selected person remembers — fog over what they have never seen; hollow rings are hearsay), Labels (names) |
| **Debug** | `Shift`+`D` — ledger status, state hash, frame stats, counts |
| **Worlds** | the seed chip opens the world menu: type a seed and press *New world*; *Harsh* gives scarcer food, colder weather, more wolves and fewer births; *World size* picks Village (the ordinary world), Large (160×160, 4 camps) or Huge (256×256, 6 camps) for the next new world; *Arrivals* lets travellers join; *Scenes* loads a staged test scene; *Save/Load* keeps a world in your browser |
| **Help** | `?` |

The inspector answers the five questions for any person: *what are they doing, why did they choose it, what are they
trying to achieve, what is stopping them, and what happened after their last attempt* — and lists nearby opportunities
with the reason each was not taken: **unaware** (never seen or heard of), **blocked** (missing a prerequisite),
**passed over** (preferred something else, with the scores), **failed before**, or simply **not needed**.

A person's card also shows the tools they carry and how worn they are, their promises and how the earlier ones ended, the
conversation they are in and — kept apart — the last one, a shared meal they are hosting or have said yes to and the last
one, who they are worried about and why, and who they are still sore at. A workplace's card shows what it can make, what
is under way and by whom, what is on its shelves, and — for anything that is not being made — what is missing. A building
site shows the materials that have arrived, the ones it is waiting for, and the work done. Parts with nothing to show stay
hidden.

The speed buttons say two things: the speed you asked for and the speed actually achieved over the last couple of seconds.
If the page cannot keep up, or stalled and the clock gave up on some world time, the bar says so (amber, with the number of
ticks skipped) instead of pretending. While paused nothing animates, including the people.

### Staged test scenes

The *Scenes* menu loads small deterministic situations that are **clearly labelled “TEST SCENE”** and are not examples
of spontaneous behaviour. Nobody in them is told what to do.

| Scene | What is staged |
|---|---|
| Contested berry | two hungry people, one berry |
| Asking for help | one request met by a generous neighbour, one refused by a stingy one |
| Shared building | one builds while another fetches materials |
| Logs to planks to a house | a hut being rebuilt as a house waits for planks; a timber yard, a saw, trees |
| A shared meal | a host with food, two friends, the hall at the end of the afternoon |
| A handcart load | bricks and planks in a store far from the house that wants them; a cart by the house |
| Looking after a frail neighbour | an old man hungry in his lean-to, out of sight; a neighbour who earlier saw how he looked |

The ordinary seeded world is the demonstration of natural behaviour.

## Things worth watching for

* A bush picked clean at dusk, and the person who walks all the way there tomorrow on a stale memory.
* A stranger asking “Do you know where I can find food?” — and someone answering with a place they once saw.
* Households choosing different projects: one breaks ground and sows, another lays out a hut, a third keeps the fire fed.
* A builder waiting at a site (the small “!” badge, and the card saying exactly what is missing) until a friend turns up
  with planks — sawn at the yard a few minutes ago from logs somebody felled — then the house visibly rising.
* A load too big to carry in one go: someone fetches the cart, walks it out empty, loads it where the bricks are, and
  brings it back.
* Two people reaching the last berry at once; the one who lost remembers it, and sometimes says so in the feed — and,
  a day or so later, the feed saying that they are on good terms again.
* A promise kept, one that ran out of time, one put aside because the maker was thirsty — each ending in its own way.
* Evenings at the hall: a host laying a table, a guest turning up, one serving each, leftovers returned.
* An old neighbour, hungry in his lean-to, visited by someone who heard he looked unwell.
* A saw lent for the afternoon and handed back, a tool worn to a stub, an iron axe where there was a wooden one.
* Two housemates who work side by side and talk late become a couple; a few days later a child is born.
* A wolf by the pond: people fetch water from the far shore, and someone dying of thirst finally risks the near one.

## Architecture

```
src/sim      pure simulation (no DOM, no rendering): world generation, needs, perception, beliefs,
             decisions (survival / work / production / social option generators), activities, the social engine
             (requests, promises, news, quarrels, meals, welfare), economy + ledger + reservations, workplaces and
             recipes, tools and carts, farming, building, weather, wildlife, lifecycle
src/app      Game (fixed-timestep clock, requested/achieved speed, selection, camera state), preferences, save/load
src/render   isometric canvas renderer: procedural sprites for every building and construction stage, terrain,
             characters (with poses for sawing, hammering, forging, baking, digging, pulling), carts, effects, overlays
src/ui       DOM interface: top bar, transport, inspector (people, workplaces, sites, carts, deposits), feed,
             minimap, overlays, help, debug
tests        vitest suite;  scripts/  headless tools (census, traces, baseline, audits)
docs         ECONOMY.md (rules), recipes.generated.md (tables), BASELINE.md (before/after record),
             OBSERVED.md (five causal chains watched in the page), SCALING.md (benchmark tools, golden fingerprints,
             measurements beyond the ordinary world)
```

The simulation advances in whole ticks (10 per second at 1×; a day is 2400 ticks). Rendering interpolates between the
previous and current tick, so frame rate, camera and animation can never change a decision or a resource outcome. A long
gap between frames (a hidden tab, a stalled page) is a stall rather than a debt: the world plays a bounded burst, the rest
is given up and counted, and play carries on at the speed asked for. All randomness is seeded; decisions that need “noise”
use a pure hash so inspecting someone cannot disturb the world; people are stepped in a rotating order, so when two want
the same thing in the same tick the winner is the same every run.

## Verification

`npm test` covers: determinism (same seed ⇒ same state; inspecting never perturbs it; saved and reloaded worlds carry on
identically, including a cart on the road), resource conservation (gathering, transfers, eating, renewal, crop growth,
construction, batches, waste, spoilage, carts, meal tables, long natural runs), contested last items and exclusive claims,
reservation release on interruption/death/long runs, locality of knowledge (including a whole-run audit that every
targeted place was known, and that news keeps its source and age), social requests causing real transfers, refusals,
promises ending each of six ways, cooperation changing construction progress, lifecycle (birth, growing up, death,
adoption, caregiving, couples, newcomers), survival under pressure (a wolf at the only pond, two critical needs at once,
planning ahead for a long walk to water, work that would strand someone), every workplace and recipe, tools (wear,
lending, racks, death and collapse), handcarts (capacity, terrain, nothing loaded from a distance), the iron chain, shared
meals and their endings, worries and visits, quarrels and the way back, the clock under stalls, pause, step and resume, and
that running the real renderer never changes the simulation. `tests/scenes.test.ts` keeps each staged scene's promise.

Headless tools: `npm run census -- <seed> <days> [harsh] [-v]` prints a periodic census; `npm run baseline -- <seed>
[--out file.json]` records an ordinary-world baseline; `npm run chains -- <seed> <days> [-v]` watches the workplaces and
chains develop; `vite-node scripts/invariants.ts <seed> <days> [harsh]` audits a long run (books, tool records, claims,
promises, carts, meal tables); `vite-node scripts/audit_far.ts` checks that nobody works at a distance;
`vite-node scripts/find_moments.ts <seed> <days>` lists the first examples of each kind of event in a run;
`npm run playback -- <url> [result.json]` (after `npm run build && npm run preview`) drives a headless Chrome over the DevTools
protocol and measures, with a real animation loop, the speed achieved at each setting, what a stalled page costs and how the
speed readout reports it, and that pause freezes the canvas and a step is exactly one tick (`scripts/browser/`); and
`scripts/*.ts` has the traces used while tuning (`multi.ts a,b,c 12` runs several seeds and reports deaths and ledger
balance; `death.ts` and `trace.ts` follow whoever dies and why). [`docs/BASELINE.md`](docs/BASELINE.md) records what a
fixed ordinary world did before and after this work.

## Known limits

* People never steal from or hurt each other; “harm” is quarrels, broken promises and the occasional wolf bite.
* One settlement on one 80×80 map; the only animals are wolves; no hunting, no inheritance, no trade between camps, no
  currency, markets or caravans.
* A workplace's output is not routed anywhere automatically: somebody has to want it and go and fetch it. Iron is the slowest
  chain — the ore lies a long walk away and a wooden tool is easy to replace — so a forge may stand for weeks before it is
  used, and in some worlds it is never used.
* Carts are rare in ordinary play: they are built only once somebody has been carrying heavy loads far.
* Couples are simple: some pairs of unattached adults click, and only mixed pairs have children (others can take in orphans).
* Everything is drawn procedurally on a 2D canvas; there is no sound. Construction is shown as a finished building rising
  behind scaffolding rather than wall by wall.
* The settlement grows to about sixty-five people (newcomers stop coming at fifty-four, births at sixty-four) and then holds;
  it runs at roughly 0.4–1.3 ms per simulation tick as it grows, so 16× stays smooth on an ordinary laptop. Fully zoomed out
  the frame costs more (a few milliseconds) than zoomed in.
* Because lives are long (a year is twelve days), old-age deaths only appear after tens of minutes of fast-forward; in
  harsh worlds hunger, cold and wolves take people sooner and more often.
* One run of a seed is one run. The baseline record compares particular runs; it says nothing about long-term stability.
