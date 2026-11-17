# Two lived lives, five days each, on rules 161 (6 November 2026)

Request: "enter sim and lived two different lives and report from latest checkout, also do a 5 day run each". Checkout: `main` at
`5fc0ad29` (rules 161, product save format 5), ordinary fresh worlds (rich dynamics, Normal profile, arrivals on), 12,000 ticks (5 days)
from tick 2,400 (the first free moment was tick 2,410 / 2,502).

## How the lives were lived

The repository's inhabitant seam (`docs/INHABITANT.md`: one person's `decide` is answered from outside, one option per decision, notes
kept between decisions, a transcript that replays without the model) is meant for an API model. No Anthropic key is set here, so a
**manual model** was added: `scripts/inhabit/manual.ts` (a `ModelClient` of kind `manual` that writes each ask to a folder and waits for
an answer), `scripts/inhabit/live.mjs` (the player's side: `next` / `say`) and a `--manual <dir>` flag in `scripts/inhabit.ts`. Nothing in
`src/` changed. Each life was played by Claude subagents (this session's model, default inheritance; the transcript's `claude-sonnet-5-5`
is a label I passed, not something the harness verified), one decision at a time, with the instruction to live as the person, not to
score, and to read nothing else in the repo. A subagent stops after 50 decisions, so each life was played by two successive players who
shared only the person's own notes (`--memory`, protocol `inhabitant/34`), which is also how the API client works (stateless apart from the notes).

| | Milo | Sofia |
|---|---|---|
| Who | elder, 70, alone, "cautious, generous, sociable", river | adult, 40, wife and mother of Kai (4) and Orla (2), partner Ivo, meadow |
| Decisions | 93 (players: asks 0-49, 50-92) | 70 (asks 0-49, 50-69) |
| Replay without the model | OK, end state `4dd3f04a`, 93 decisions | OK, end state `0b435b2e`, 70 decisions |
| Refused picks / engine fallbacks | 1 / 0 | 0 / 0 |

**Two mistakes of mine in the player's view, both fixed during the run and both disclosed here** (`live.mjs` shows a compact form of the
observation: places cut to the nearest three of each kind, long lists cut to their first entries, options, set-aside, plans and notes in full).
1. The compact view hid the world's reason for a refused pick ("`eat:0` is not on offer now"), so Milo's first player read it as "no reason shown" (ask 47-48). Fixed from ask 50.
2. The compact view labelled the game's `nourishment` field "stored food", and both first players read it as the household store ("looks like household stock but behaves like my own belly"; Sofia said it cost about 25 asks of confusion). Fixed after Sofia's ask 50; Milo saw it up to about ask 54. These two friction items are **my label, not the game's**.
The compact form also means the lives were lived on a thinner view than a model sees through the API; the raw ask files were kept in `*/bridge` locally and are not committed (the transcripts carry them).

## What happened (from the records; the reports are `*/report.txt`)

| End of day 5 (tick 14,400) | Milo, lived | Milo, engine-driven | Sofia, lived | Sofia, engine-driven |
|---|---|---|---|---|
| Alive / health | yes / 100 | yes / 79 | yes / 100 | yes / 100 |
| Hunger / thirst / energy / warmth | 48 / 62 / 75 / 72 | 14 / 68 / 35 / 72 | 87 / 97 / 95 / 37 | 53 / 92 / 94 / 58 |
| Carrying | 3 seeds, 2 grain | 1 seed, 2 wood | rod, basket, 2 seeds, 2 stone, 2 wood, 1 berry | 2 berries, 2 wood, 2 fish |
| Home | lean-to (41%) | lean-to (42%) | **hut (90%)**, built in the run | lean-to (76%) |
| Household | alone | alone | all four alive, hunger 87/50/40/62 | all four alive, hunger 53/67/88/90 |
| Lifetime counters | gathered 37, given 4, received 1, built 0, talked 17, farmed 12 | 24, 0, 2, 1, 6, 5 | gathered 52, given 3, received 2, built 1, talked 12, crafted 2 | 39, 1, 0, 0, 10, 0 |
| Village (alive / below hunger 25 / deaths) | 28 / 6 / 0 | 28 / 3 / 0 | 29 / 1 / 0 | 32 / 0 / 0 |

(`*/compare.json`, `compare.ts`: the lived run replayed from its transcript against `runStandard` of the same person and window.) One
world per life per arm; a different person's choices change the village and nothing here is an effect estimate. The village rows differ
in arrivals too (Sofia's village 29 against 32), which I did not trace.

**Milo.** Day 2: gave berries to a hungry child, drank, invited Emre to a meal. Laid out a hut at tick 3,006: the walk took 4 h 12 min and
ended "too many projects under way", he missed his own meal and said so. Laid it out again at tick 4,991 (success), delivered all eight
wood, then stalled for three stone: one stone fills half a six-unit pack, the near outcrops were bare and five people he asked said "busy";
Cora's fruit-for-stone swap was refused. At 03:25 on day 5 "Warm up at the fire" was quoted at 3 h 34 min and ran 7 h 34 min (t9223 to t9980),
ending "failed: took too long", during which two grain promises were accepted in his name. His own field was the rescue (4 grain, then 2 grain and
2 seeds, replanted). Emre accepted a fish and Zia gave him fish unasked. The engine dropped the hut plan at ask 74 ("the time is up"); at the
end the site is at 6% and lacks three stone. The engine-driven Milo (same hours, same village at the start) ends hungrier (14), sicker (79)
and tired (35), in the same lean-to (no hut for him either).

**Sofia.** Days 2-3: a full pack of wood and nothing to do with it (the first three options were explore, wander and a coaching request;
coaching ended "declined: I cannot show you enough new"), fruit and water for the children, a rod and a basket made. Pia kept a promise of
a stone. In the storm the village crowded round one fire. She carried five stone to the household's hut site and built until the roof was
on near midnight in rain (a 4.5-hour build option; a promise of one stone to Yara was made on her behalf inside it, and kept). The family
has not moved in. In the last day: two food swaps refused by neighbours as hungry as she was, a long fruit trip to trees others had stripped (one
fruit), back 18 tiles in the dark. She never found Orla after a sighting about five hours before the end (all four are alive and the
household's hunger is 40-87), and never told Ivo about the third child.

## Findings: what the lives showed about the build

**Checked by me against the records**
1. **A protocol gap (not mine).** The observation advertises per-action limits (`"limits":[{"field":"portions",...},{"field":"untilHunger",...}]`
   on `eat:0`, `amount` on gathers), and `protocol.ts` accepts them in a key named `"limit"` (`parseAnswer`, lines 276-288), but the system prompt of
   protocol `inhabitant/34` does not name that key (`"limit"` is absent from the system text of ask 0). Milo's player tried `"limits"` (ask 53,
   `answer-53.txt`) and `args`; both were ignored without a refusal or warning, so he ate to full and could not keep food to give away
   (asks 53-54, 74-75). Not repaired here; it changes what a model is told, so it needs its own observation/protocol version.
2. **Quoted ETA against the real duration.** "Warm up at the fire": 3 h 34 min quoted, 7 h 34 min taken, ended "failed: took too long"
   (report line 63). The first hut walk: 36 min quoted with the walk "not counted", 4 h 12 min taken (the player's figures; the failing
   outcome is in the report, line 17). Whether the walk estimate is a defect or a deliberate "walk not counted" is not traced.
3. **Replays pass** for both lives. Conservation was not screened in these runs (a read-only comparison, not a screen).

**Reported by the players, not checked** (ask numbers are theirs; all of it is perception from the compact view and needs a trace before it is a defect)
- *Wolves.* Wolves in sight near the toddler Orla (asks 17, 22-24, 31, Sofia) with only "Warn X about the wolf" on offer; wolves on the same tiles for three days with people beside them unharmed (Milo, asks 0-60); wolves in `seen` but `dangers` empty while "a wolf about" suspends plans.
- *Care.* A care request from a hungry child declined "own need" in Sofia's name while she carried 3 berries "for dependents" (t13999, asks 68-69); "Eat carried food" set aside as "saving for dependents" at hunger 24-31 although the children carried food (asks 26-32); no option to fetch Kai and Orla into the new hut at 3 C in rain (ask 53); no signal whether a wandering four-year-old was safe (asks 66-68).
- *Pregnancy.* Appears only as a memory line; no option to tell the partner (Sofia, asks 27-69). Nobody spoke to Ivo in 70 decisions.
- *Refusals.* "Busy / nothing to spare / more pressing needs" refused chats, gifts, swaps and recruits, including from resting, sleeping or visibly hungry people, and offers to such people are still listed (Milo asks 0-92, Sofia 55-62). A visit that delivers a fish worked where the social offer failed three times (Milo, asks 89-90).
- *Long uninterruptible options*: a 4.5 h build and a 5 h gather swallowed decisions and accepted promises (Sofia asks 36, 52-53).
- *Options that come and go*: nearby full sources set aside as "believes it is empty" while their amounts were visible (Sofia ask 34); full bushes dropping out of the options with no set-aside reason (Milo asks 18-23); duplicate keys `gather:990#choice:2` / `#choice:3` for one action; the same set-aside entry repeated 3-6 times.
- *Pack and stone.* A stone is half a pack, so a four-stone hut is four two-hour trips; the pack could not shed 0.8 of seeds (Milo, asks 31-47, 60-61).
- *Mood.* "The flood" and "the lean season" thoughts lowered mood (to -26) while floods were empty (Sofia, asks 42-50).
- *Ending.* The run's end at tick 14,400 gave no hint; the last decision's outcome was never seen (Milo ask 92).

## Not claimed

No benefit or regression. Two lives, one world each, one engine-driven comparison each, and a player who is a model reading a thinner view than
the API gives. The friction list is a reading from the inside; the unchecked items may be perception, the compact view or correct behaviour.
Nothing was changed in the simulation, so rules 161 stands; the lives did not happen to hit the "the place looked empty" ending (no such text in either report).

## Files

`roster.ts` (who could be lived), `compare.ts` (lived against engine-driven), `milo/` and `sofia/`: `transcript.json` (replayable),
`report.txt`, `replay.txt`, `standard.txt`, `compare.json`. Replay: `npx vite-node scripts/inhabit.ts -- --mode replay --transcript review_evidence/lives-20261106/milo/transcript.json --out <dir> --allow-source-drift`.
