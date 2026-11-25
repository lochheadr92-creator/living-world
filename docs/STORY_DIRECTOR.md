# Story director (presentation only)

An opt-in way to sit back. While it is on, the camera follows the person a noteworthy real event is about, or what is happening now
(a gathering, a wolf near someone, a conversation, someone in trouble); a caption says what happened or is happening in the
simulation's own words; a "What happened" reel lists recent highlights to jump to. No simulation rule, save format, RNG or rules
version changes.

## Off by default, and what it reads
Nothing in this interface moves the camera unasked. Turning the director on (the "Director" chip along the bottom edge, or the T key)
is the asking; the viewer taking the camera ends it. The only thing stored is the on/off choice (`Prefs.director`, default false). It
is not mounted beside the AI inhabitant (`?inhabit=`). It reads `world.events` (and `world.chronicle` for the reel) and, at most once a
UI second, world state: occasions, animals, conversations, speech, the inspector's status line and `describePerson`. It writes
nothing to the world and never draws from its random state; it drives view state on `Game` (`select`, `setFollow`, `flyTo`).

## Why this rework
One measurement by the coordinator, after the owner watched the first version: three ordinary worlds (meadow, aspen, river), 8 days
each, the model stepped alongside at 2x. 28.8 feed events a day, 8.0 "worthy"; none weighed 85 or more in 24 days; 5.9 a day were
finished huts, lean-tos and cellars, "has what they hoped for" and crews. It cut 50 to 56 times per 10 minutes, median hold 7 to 11 s.
The ranking had inherited the chronicle's idea of what to record (a wolf bite weighed 0); and every shot was of something finished.

## What an event weighs: `storyWeight` over kind and real wording (`matchEvent` names the rule)
Bands, exported: `TOP_FROM` 80 (may cut in early), `MIDDLE_FROM` 50 (waits for the hold), `FILLER_BELOW` 30 (only when nothing better).
- TOP: a death 100, a fatal bite 95, a birth ("was born to") 90, "A wolf bit" 90, a wolf driven off or killed 88, "became a couple"
  85, a wedding feast called or begun 80, every `conflict` event 80.
- MIDDLE: " got a " (injury) 65; arrivals and "expecting a child" 60; a funeral 60, harvest feast 58, feast and market 55, called or
  begun; "has what they hoped for: a family" 55; a deer brought down 55; a building for everyone (finished, no "household" in the
  text: "finished a shallow well.", "finished a storehouse.", "... for everyone.") 55; "warned ... about a wolf", peace or "on good
  terms again", apprenticeship, "own right", "has become a tradition" 50.
- FILLER: a household's hut, lean-to or cellar finished 25; "has what they hoped for" a home or a trade 25; a crew formed 22; a
  gathering over 20; healed 20; "marked out" 10; gave, promised, fed, fire out or relit, made a tool, farm notes 5 to 15; a story
  told at the fire 10 (it retells something else). Never a shot (0): every `nature` and every other `work` event.
- Unnamed wording: conflict 80, danger 50, life 50, social 12, build 10, trade 10, survival 8, farm 6.
The reel lists weight 50 and up (`highlights`), at most 8 of the last three days, in the order they happened.

## Hold, cut, fade, merge (constants exported from `director_model.ts`)
- `MIN_HOLD` 15 s (UI seconds, any speed). Only a TOP event cuts early, after `MIN_CUT` 3 s, and only over a shot from a lower band.
  A MIDDLE event waits for the hold. Past the hold a shot lingers to `LINGER_SECONDS` 45 unless a strictly heavier live thing, faded
  repeat or filler comes (my addition, to meet the cut rate below). Waiting: `MAX_WAITING` 6; stale after `STALE_SECONDS` 60 or
  `STALE_TICKS` (a day).
- Repeat fade: each showing of the same rule in the last day multiplies a waiting event by `REPEAT_FADE` 0.6 (TOP exempt). Below 50 it
  is no longer MIDDLE waiting: it is shown only when no live thing is, and only once the shot has lingered.
- Merge: two events within `MERGE_TICKS` 5 about the same first living person are one moment: the heavier stays (`counts.merged`).

## Following what is still happening (`director_live.ts`, `scanLive`, once a UI second, `LIVE_SCAN_SECONDS`)
When the hold is up and no TOP or MIDDLE event waits: the best live thing, else the filler candidate (one, needing a living person,
dropped after `FILLER_STALE_TICKS`), else the shot stays. A live thing is not picked again for `LIVE_COOLDOWN` 60 s unless it scores
`LIVE_EXEMPT` 70 or more. When its condition ends the caption goes and the camera stays with the person (`ended`); a MIDDLE or TOP
event takes it at once, anything else at the hold. A live shot's caption says "now" and is read again at each scan.
- A gathering (`status` 'gathering'): a place shot, `occasionNotice(...).says`; wedding and funeral 70, feast and harvest 60, market 45.
- A wolf in 'stalk' or 'attack' within `WOLF_NEAR` 8 tiles of a living person (its target if that is one): 70 or 80, follows the person.
  Sentences, exactly: "A wolf is stalking near <name>." and "A wolf is attacking near <name>." (the wolf's recorded `state`).
- A conversation: scored by purpose (mediate 68, lessons 55, play 45, family and foraging 40 ... plain chat 20), follows person `a`;
  caption `describePerson(world, id).qa.doing`. Someone speaking 'angry' 65 or 'warn' 60: the same caption.
- Trouble: `statusLine` tone 'danger' 50 (unwell or hurt 40); caption the status text.

## What it does not do
No explanation of its own: captions are event text, the inspector's lines or the two wolf sentences. No world writes.

## Files and tests
`src/ui/director_model.ts`, `director_live.ts`, `director.ts`, `src/app/prefs.ts`, `shortcuts.ts` (T), `help.ts`, `styles.css`.
`tests/director.test.ts` (bands and wording, holds and cuts, fade, merge, filler, each live signal on staged world state, cooldown,
ended shots, reel, purity with the scan run every step). `scripts/browser/director_check.mjs --url <dev server> --out <fresh folder>`
drives the real page; its person, place, filler and live shots are staged with the simulation's `addEvent` and world state.

## Known limits
- Cuts, measured by a scratch script (not kept) over 2 days of each of those three worlds at 2x: 27 to 30 per 10 minutes, not 25.
- Short exchanges (about 7 s at 1x) end before the camera settles; they ride at low scores. The page part has no unit test (no DOM);
  the browser check is its evidence, in headless Chrome only. A wolf is only ever 'stalk' in today's wildlife.ts; 'attack' is handled.
