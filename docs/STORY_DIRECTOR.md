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
  terms again", apprenticeship, "own right", "has become a tradition" 50. The social scenes (rules 260, the words from
  `courting.ts`, `welcome.ts`, `praise.ts`): a thanks in company "At the fire X thanked Y before N people for driving off a wolf" (or
  "killing") 70, "... thanked ... for the new kiln" 55, a pair's "walked out together for the first time" 62, a household's "was the
  first to welcome the newcomer" 58. The hearth scenes (rules 261, `birth_help.ts`, `naming.ts`, `vigil.ts`): a child named aloud "X and Y named
  their daughter Z before N people, after X's mother" (or "X named her son", "... his daughter") 58; a vigil ended "A sat up through the night with B, who
  has a fever" ("sat with" by day, "who is hurt") 50. A birth with or without a helper is still "was born to" (90) and a naming feast is a feast (55).
- TOP, joined to the death: "A was with B when he died." 100. When it comes within MERGE_TICKS of B's own "died" line the plain death is taken out of the
  queue and this one, which follows A, stands for both: one top shot.
- Between MIDDLE and FILLER (30 to 49): a later "walked out together." 45, "asked ... to walk out; ... said not today" 40, a later
  "welcomed the newcomer" 40, "set out to walk together and turned back" 35. The one filler candidate keeps one of these against a lighter
  newcomer; under 30 the newest still wins.
- FILLER: a household's hut, lean-to or cellar finished 25; "has what they hoped for" a home or a trade 25; a crew formed 22; a
  gathering over 20; healed 20; "marked out" 10; gave, promised, fed, fire out or relit, made a tool, farm notes 5 to 15; a story
  told at the fire 10 (it retells something else, these scenes too). Never a shot (0): every `nature` and every other `work` event.
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
- A walk out under way (`courting.ts`: a 'wander' whose `data.walk` has role 'a'): one candidate per pair, 66, follows the one who
  asked; key `walk:<id>`; caption `describePerson(world, id).qa.doing`; gone when the walk ends.
- A woman lying in with a helper beside her (`birth_help.ts`: a 'rest' whose `data.lyingIn` is set, and a visit with `data.birth` for her, in work, within
  4 tiles): 72, key `lying:<id>`, follows her; caption the inspector's "doing" line. With nobody beside her it is no shot.
- A vigil under way (`vigil.ts`: a 'rest' whose `data.vigil` is set, in work, not over): one for each person sat with, 66, key `vigil:<id of the sick>`, follows the
  sitter; caption the inspector's "doing" line; gone when the vigil ends or the sick person has died.
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
