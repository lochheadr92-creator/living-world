# Story director (presentation only)

An opt-in way to sit back. While it is on, the camera follows the person a noteworthy real event is about, a caption says what
happened in the simulation's own words, and a "What happened" reel lists the recent highlights so any of them can be jumped to.
No simulation rule, save format, RNG or rules version changes.

## Off by default, and what it reads
Nothing in this interface moves the camera unasked. Turning the director on (the "Director" chip along the bottom edge, or the T key)
is the asking; the viewer taking the camera themselves ends it. The on/off choice is the one thing stored (`Prefs.director`, default
false); a world is never changed or saved by it. It is not mounted beside the AI inhabitant (`?inhabit=`), which follows a person itself.
It reads `world.events` for the shots, and `world.chronicle` as well for the reel (older worlds have none): nothing else. It writes
nothing to the world and never draws from its random state; it drives view state on `Game` (`select`, `setFollow`, `flyTo`).

## Which events, and how much each weighs
`storyWeight(ev)` is 0 for anything `chronicleWorthy` (src/sim/events.ts) would not keep. The rest is a short table over the
simulation's own wording, heaviest first: a death (100), a fatal bite (95), a birth of a person (90), a pairing (85), a wedding feast
(75), a conflict (70), a funeral (65), an injury (60), an arrival (55), a finished building (50); other worthy events by kind
(life 45, social and work 40, build 35, trade 30); routine nature notes 20. Nothing else ranks them.

## Cut, hold and yield
- `step(world, dt)` once per UI frame. The first step on a world primes silently: events already there are history. A different
  world object resets everything. Waiting events: at most `MAX_WAITING` (6); past it the lightest, the oldest among equals, goes
  (counted as overflow). A waiting event goes stale after `STALE_TICKS` (one day of world ticks) or `STALE_SECONDS` (30 UI seconds).
- One shot at a time. It holds `MIN_HOLD` (6 s) before any waiting event may replace it; a strictly heavier one may cut in after
  `MIN_CUT` (3 s). The best waiting event is the heaviest, the oldest among equals. With nothing waiting the shot stays and its
  caption fades after `CAPTION_SECONDS` (12 s).
- The subject is the first of the event's people who is alive, and the camera follows them. With none (a death, a building) it is a
  shot of the place and the camera flies there. If the subject goes while the shot is up, it becomes a shot of the place. An event
  with no position and no living person (winter setting in) is a caption only; the camera stays.
- Yield: any `select` or `follow` game event the director did not cause turns it off, as does a drag, a key pan, the minimap or a row
  of the reel. A drag off a place shot raises no game event, so it is read from the camera having moved from where the director put it.
  The game clearing the selection because the followed person died is not the viewer.
- The reel lists `highlights(world, tick - 3 days, 8)`: the heaviest worthy events, in the order they happened, each once.

## Quiet stretches (the ambient tier)
The director also keeps at most one ambient candidate: the newest ordinary event the record would not keep (`ambientWeight`:
danger 15, social 12, build 10, trade 10, survival 8, farm 6; workshop output 0), about a living person; never a place shot. All sit
below the lightest worthy weight (20), so any worthy event outranks any ambient one; the reel stays worthy-only. It becomes the
shot only when nothing worthy waits and either no shot is up or the shot has been up `IDLE_SECONDS` (20). It is dropped after
`AMBIENT_STALE_TICKS` (a quarter of a day) or when its person is gone; a worthy event cuts an ambient shot after `MIN_CUT`; Next
falls back to it (`hasNext`). The caption is the same, with a muted icon. Why: one aspen world, 4 days, rules 257: worthy events
per day 14, 2, 6, 5 against 31, 18, 25, 20 feed events; the gap between worthy events had a median of 256 ticks, a 90th percentile
of 915 and a longest of 1,648 (165 s at 1x).

## What it does not do
It makes up no explanation: the caption is the event's own text. It writes nothing to the world. It ranks nothing beyond the table.

## Files and tests
`src/ui/director_model.ts` (model, no DOM), `src/ui/director.ts` (controls, caption, reel, driving the view), `src/app/prefs.ts`,
`src/ui/shortcuts.ts` (T), `src/ui/help.ts`, `src/styles.css`. `tests/director.test.ts` covers weights, priming, holds and cuts,
staleness, the queue cap, a subject who has gone, skip, the reel, the ambient tier and observer purity against an unwatched twin.
`scripts/browser/director_check.mjs --url <dev server> --out <fresh folder>` drives the real page (clicks, keys, drags, 375 px, a
reload); its person, place and ambient shots are staged with the simulation's own `addEvent`.

## Known limits
- The weights are a hand-written table over today's wording; a reworded event falls to its kind's weight or out of the record.
- Life, conflict and nature events are all kept by the record, so those kinds never reach the ambient table.
- The wheel zoom while following does not end it (the camera still follows); over a place shot it does if it moves the view.
- The page part has no unit test (no DOM in the test environment); the browser check is its evidence, run in headless Chrome only.
