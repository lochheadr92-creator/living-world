# One outcome traced end to end: the Willowbank storehouse (ordinary aspen, rules 185)

10 November 2026. No rules change, no source change. This is a read-only trace of one multi-person, multi-week outcome in an ordinary world, link by link, judged only
on what the simulation itself stored. It answers the 10 November substance review, which asked for one causally traceable outcome shown end to end before more mechanics.
Evidence, probes and raw records: `review_evidence/end-to-end-trace-20261110/`.

## What was run

- Clean pinned worktree `living-world-v183-pin` at `f7507b76` (rules 185, `dirty=false`). The docs commit `82e7692b` on top of it changes no source.
- Census: the twelve lab seeds, Normal, rich, arrivals on, 45 days each, nothing staged (`census_probe.ts`, `run-census.ps1`, 380 s for all twelve). Conservation held in 12 of 12.
- Trace: aspen stepped again from tick 0 (`trace_probe.ts`), copying out records at the tick they were written. Inspector and history functions were called on a save and
  load copy only, never on the stepped world.
- Follow-up: aspen stepped a third time (`stone_probe.ts`) to read world state where the records named no source. That part is ground truth, not a stored explanation, and
  is marked as such below.

## The twelve worlds at day 45

| seed | alive | deaths | shared projects | note |
|---|---|---|---|---|
| aspen | 20 | 20 | 5 (4 failed, 1 completed) | the outcome traced here |
| birch | 8 | 20 | 1 | 20 people on day 21, 9 on day 26 |
| cedar | 25 | 17 | 1 | |
| fern | 20 | 19 | 1 | 26 people on day 11, 10 on day 16 |
| gen-1 | 16 | 18 | 1 | |
| gen-2 | 20 | 10 | 1 | |
| gen-3 | 23 | 5 | 1 | |
| gen-4 | 17 | 16 | 1 | |
| gen-5 | 9 | 32 | 1 | 35 people on day 26, 11 on day 31, 22 deaths from hunger |
| gen-6 | 32 | 2 | 1 | storehouse took 7 days |
| meadow | 19 | 28 | 1 | 32 people on day 21, 11 on day 26 |
| river | 18 | 14 | 1 | 12 people answered the storehouse ask, 7 days |

No world recorded a relocation. Every world but aspen built its one shared storehouse inside the first 13 days.

## Candidates and the choice

Criteria, stated before the search: a concrete end state in the final world, at least three named people in at least two households whose acts the end state depended on,
at least 14 days between the first contributing act and the end state, an ordinary run. The search covered shared projects in all twelve seeds and the aspen feed. It did not
search adoptions, partnerships or food chains across the other eleven seeds.

- **Chosen: the aspen storehouse.** First proposed on day 15.3, finished on day 43.4, 28 days. Five proposals by three people (Dax, Petra, Wren). Eleven people answered
  an ask. Three households built it (Rowan, Briar, Hazel). It crosses two cold snaps and 12 deaths.
- Runner-up, not traced: in aspen, Isla took Eli and Dov into her household on day 22.4 and 22.5, and died of exposure on day 22.6. Both are in Petra's household
  at day 45.
- The other eleven storehouses took 2 to 7 days and miss the 14 day criterion.

## The chain

Verdicts. **EXPLAINED**: a stored record states the cause in words and the cause is true against world state. **SCORE-ONLY**: the only stored cause is a chosen option, a
label or a figure, with nothing that says why this, or why now. **STALE-OR-LOST**: a record held the cause and had rolled off by day 45. **MISSING**: no record ever held the
cause. **WRONG**: a record states something the world state contradicts. Days are simulated days (2,400 ticks).

| # | day | who | what happened | cause | where it is stored | verdict | ledger |
|---|---|---|---|---|---|---|---|
| 1 | 15.2 | Dax | finishes a hut, the first solid home in the settlement | his own building work | feed line, building card | EXPLAINED | |
| 2 | 15.2 to 15.3 | Dax, Isla, Ines, Vera, Wen, Ben, Rafe, Kira | each chooses "Lay out a storehouse" within 0.1 day | rules 162: a solid home now stands and no storehouse does. `firstStorehouseWanted` reads `world.buildings`, not what each person has seen | `lastDecision.because`: "the first shared storehouse, a place to keep stone, wood and tools for everyone +41". It gives the purpose. It does not name the hut or say why now | SCORE-ONLY | G32, G09 |
| 3 | 15.2 to 15.3 | the seven who lost the race | give up: "another layout already reserves this footprint", "a storehouse is already being built" | Dax reached the spot first | each person's log, 60 lines, gone within about 2 days. Never in the feed | STALE-OR-LOST | G05, G08 |
| 4 | 15.3 | Dax | feed: "Dax marked out a storehouse for the Hazel household", beside "Dax proposed a shared storehouse for Willowbank" at the same tick | the site is public (`hhId` 0) from the tick it exists. The build line takes the actor's household name unless the action carries `communal` (`act_build.ts:411`) | feed | WRONG | new |
| 5 | 15.3 | Yusuf | refuses Dax: "own needs take priority" | his own drives were above the line in the answer rule | project record, request note | EXPLAINED | |
| 6 | 17.1 to 18.1 | Delia, Esme, Ben | refuse Dax: "not willing to commit to this proposal" | the answer rule adds diligence, generosity, affinity, what they have seen of this organiser's projects and a random draw, and compares the sum with 0.55 (`social.ts:1581`). The text is what is left when no other reason applies | project record keeps the label. None of the inputs is kept | MISSING | G74, G09 |
| 7 | 15.3 to 19.3 | Dax | never lifts a tool on his own site | "Construction requires two people and a clear lead in support" | civic history of the project. His own card shows no blocked "Build the storehouse" option, because the option is not generated | EXPLAINED | |
| 8 | 19.3 | | the site is abandoned | "nobody had worked on it for days" | feed, project outcome | EXPLAINED | |
| 9 | 19.3 to 19.4 | Petra (also Wes, Vera) | chooses "Lay out a storehouse" 0.01 day after the abandonment and marks it out | the same world-truth gate reopened the moment the site was cancelled. Nothing records that she knew the first site was gone | `lastDecision.because`, purpose only | SCORE-ONLY | G32, G09 |
| 10 | 20.2 | Isla | agrees to help her housemate Petra | the same answer rule | request note: "Isla supports Petra coordinating and will help build". What, not why | MISSING | G74, G09 |
| 11 | 20.2 | Petra | becomes coordinator | "most accepted support (at least two people)" | council change on the project | EXPLAINED | |
| 12 | 20.2 to 21.4 | Isla, Petra | cut and carry 6 wood, 38 work | "for the storehouse I promised to help with", "I promised" | decision at the time. Project record keeps who supplied what | EXPLAINED | |
| 13 | 21 to 22 | everyone | cold snap: 7 C falls to -5 C, mean warmth 1.6 of 100, two huts for 25 people, nine deaths between day 21.6 and day 23.0 | winter and a storm | feed: "Winter sets in", "A storm rolls in". Deaths with causes | EXPLAINED | |
| 14 | 21.8, 22.1 | Isla, Petra | withdraw | "urgent personal survival needs" (the need is not named) | feed, project record | EXPLAINED | |
| 15 | 21.8 | | Petra's mandate lapses | "support is tied, insufficient or the coordinator left" | council change | EXPLAINED | |
| 16 | 22.6 | Isla | dies of exposure | the cold | death record | EXPLAINED | |
| 17 | 25.4 | | abandoned. 6 wood is left on the ground 2 tiles from where the fifth site will stand. Nobody touches it for 18 days. Mona later cuts 8 fresh wood for the fifth site. 4 of the 6 are taken on days 43.5 and 44.1, after the storehouse is finished | no option connects left materials to the next attempt | the pile exists. Nothing ties it to a project, and no record says who took it or for what | MISSING | G133 |
| 18 | 26.0 | Dax | proposes again | the gate, as in 2 | purpose only | SCORE-ONLY | G32, G09 |
| 19 | 26.0 to 30.1 | Dax | asks nobody for four days | "Ask Wren to help with the storehouse" and seven like it were open at 31 to 36. Sometimes he chose something that scored higher (chatting at 40 to 52, his cellar). Sometimes he chose something that scored lower (making a hammer at 22, bringing food home at 18) | nothing. Passed-over options are not kept, neither are their scores, and the scores alone do not account for the choice | SCORE-ONLY | G09 |
| 20 | 30.1 | | abandoned | "nobody had worked on it for days" | feed, project outcome | EXPLAINED | |
| 21 | 30.1 | Wren | proposes, 0.03 day after the abandonment | the gate, plus "building is my trade" | purpose and trade, not why now | SCORE-ONLY | G32, G09 |
| 22 | 30.1 to 34.1 | Wren | asks nobody for four days | not recorded. No ask was chosen and no request exists | nothing | SCORE-ONLY | G09 |
| 23 | 33 to 34.2 | Wren | withdraws on day 34.1 in the second cold snap (-6 C, mean warmth 6). Abandoned on day 34.2 | "urgent personal survival needs" | feed, project record | EXPLAINED | |
| 24 | 34.3 | Petra | proposes, the fifth time | the gate | purpose only | SCORE-ONLY | G32, G09 |
| 25 | 36.0 to 43.2 | Petra | eight approaches end "too busy to stop", "already talking to someone", "they walked away" | the other person's activity at that moment | Petra's log only. One line survives at day 45 | STALE-OR-LOST | G05, G08 |
| 26 | 36.0 | Wes | refuses: "own needs take priority" | his drives | project record | EXPLAINED | |
| 27 | 37.0 | Mona | learns of the site from Petra | told, in person | Mona's belief of the site: source "told", from Petra | EXPLAINED | |
| 28 | 37.0 | Mona | agrees | the answer rule | label only | MISSING | G74, G09 |
| 29 | 37.0 to 37.5 | Mona, Petra | cut and deliver all 10 wood in half a day. Mona brings 8: "woodcutting is my trade" | the promise | decisions at the time. Project record keeps the totals | EXPLAINED | |
| 30 | 37.5 to 41.2 | Mona, Petra | 3.7 days with the wood in place and no stone | "Get stone for a public project I support: no room in my pack for one stone". Mona carried a hoe, 7 seeds, berries, a cutting, grain and wood. "Breaking stone" was open at 27 to 29 and was not chosen | the blocked reason was on the person card while it was the last decision. Not kept. The project record says only what is still needed | STALE-OR-LOST | G09 |
| 31 | 39.3 to 41.2 | Dax | gathers stone at the outcrop for his own work | his own plans | his log at the time: "Gathered 1 stone from the outcrop" | EXPLAINED | |
| 32 | 41.2, 41.5 | Mona | picks up one stone, then another, and carries each to the site | ground truth from the follow-up probe: both came from piles left when hut sites were abandoned, one on day 13.6 and one on day 24.6, two days after the cold snap deaths | her log: "Took 1 item from storage." No item, no place, no origin | MISSING | G133 |
| 33 | 43.3 | Pavel | refuses: "not willing to commit to this proposal" | the answer rule | label only | MISSING | G74, G09 |
| 34 | 43.3 | Dax | agrees, after being "too busy to stop" on days 36.1, 38.1 and 38.3 | the answer rule | label only | MISSING | G74, G09 |
| 35 | 43.4 | Dax, Mona | Dax delivers his 2 stone and builds. Mona strikes the last blow | "I promised", "carrying what it needs", "good builder" | decisions, logs ("Satisfied: helped finish a shared storehouse"), project record: Mona 330 work, Dax 223, Petra 85 | EXPLAINED | |
| 36 | 43.4 | | building card: "Built by: Mona" | `builtBy` is filled from `builderShares`, whose keys are household ids, then filtered for person ids, so only the finisher is ever named (`buildings.ts:214`, `:238`). The quarry and timber yard cards say "Built by: Wren" for the same reason | building card | WRONG | G04, new |
| 37 | 43.4 | Mona, Wren, Rafe, Dax | remember "witnessed Petra's project complete" | they had answered the ask and stood within 8 tiles, outdoors | `civicOutcomes`, shown on the person card | EXPLAINED | |
| 38 | 19 to 34 | | the four failures are remembered by nobody | a failed project with no coordinator is attributed to no one (`townships.ts:114`) | nothing. The five projects are five records with no link between them | MISSING | G74 |
| 39 | 43.4 to 45.0 | | the storehouse stands empty for the 1.6 days that remain | "Get stone for a public project I support: no room in my pack" is still what Petra's card shows on day 44 | building card: "Storage 0/160 used" | EXPLAINED | |

Counts: 39 links. EXPLAINED 19. SCORE-ONLY 7. MISSING 8. STALE-OR-LOST 3. WRONG 2. That is 20 holes. Five are one hole (the proposal gate) seen five times, and
five are another (an answer to an ask with no cause) seen five times. Counting each of those two once leaves 12.

## The three questions from the review

1. **Did a project outlive the person who started it?** Not exercised. Each of the five attempts is its own project record, and each died with its site. What carried the idea
   for 28 days was not a memory or a commitment. It was the rules 162 want, re-offered to everyone from world truth the moment no storehouse stood or was being built. Isla, a
   supporter, died in the middle of the second attempt, and that attempt did not survive her. The history text "no longer present; supporters may continue" exists and was not
   reached.
2. **Did a source that mattered empty and regrow, and did belief lag?** Belief lag: yes, and recorded. "The rock outcrop I had remembered (about 2, 22.7 min old) was bare when
   I got close" (Mona, day 43.2). Petra's newer zero for a wild grain replaced Dax's own older sight on day 43.3 (rules 174 to 176 at work). Regrowth: not exercised for stone,
   because rock does not regrow in rich worlds. The stone that mattered was salvage and the outcrop.
3. **At decision links, why or only what?** For things people did, the record says why in named parts: "I promised +26", "carrying what it needs +44". For things people did
   not do (four days without asking, four days without fetching stone) there is nothing, not even the scores. For answers to an ask there is a label.

## The account, from explained links only

Dax finished the first hut in Willowbank on day 15. [not recorded: why that made eight people want a storehouse within two hours.] Dax marked one out first and proposed it as
a shared store. He asked Yusuf, who said his own needs came first. He asked Delia, Esme and Ben. [not recorded: why each said no.] A shared building needs two supporters
and a clear lead, so Dax could not work on it alone, and after four days with no work the site was abandoned.

[not recorded: how Petra knew.] Petra proposed it again the same day. Her housemate Isla agreed [not recorded: why], which made Petra the coordinator. Between them they
cut and carried six logs. Then winter set in. The temperature fell to five below, there were two huts for twenty-five people, and nine died in a day and a half. Isla withdrew,
then Petra, both for urgent survival needs. Isla died of exposure the next day. The site was abandoned on day 25. [not recorded: what became of the six logs.]

Dax proposed it a third time. [not recorded: why he asked nobody.] Abandoned on day 30. Wren proposed it a fourth time, withdrew in the second cold snap, and it was
abandoned on day 34.

Petra proposed it a fifth time. Wes said his own needs came first. Petra told Mona about it and Mona agreed [not recorded: why]. Mona is a woodcutter. She and Petra had all
ten logs on the site in half a day. [not recorded by day 45: why no stone came for almost four days.] [not recorded: where Mona then found two stones.] On day 43 Dax, who
had been gathering stone at the outcrop for his own work, agreed to help [not recorded: why now], carried his two stones over and built. Mona struck the last blow.

Mona, Wren, Rafe and Dax remember seeing Petra's project finished. The storehouse stood empty for the rest of the run.

## Could a viewer follow it?

- **While it happened: mostly yes.** The civic project record is the strongest thing in the trace. Who proposed, who refused in what words, who supported, the two-person
  rule, who supplied what and the outcome were all there and all true. The feed carried every proposal, withdrawal and abandonment.
- **Why people did what they did: no.** Every answer to an ask but three is a label with no cause. Every proposal lacks its trigger. Nothing explains inaction.
- **Afterwards, at day 45: only the skeleton.** The civic history shows the last two projects only. A personal log held 1.7 to 2.5 days for these people, and the decision
  ledger about half a day. The feed still held day 14.6 onward (500 events), so the first proposal is about to roll off. The chronicle kept one line: "Mona finished a
  storehouse."
- The best link in the story, that the storehouse was finished with stone left on the hut sites of people the cold killed, is in no record at all.

## What this does not show

- One outcome in one seed, chosen because it was the most traceable candidate. It is a best case, not a rate.
- The rendered inspector was not opened. The views quoted are the inspector's own functions run on a save and load copy.
- Not checked: which abandoned hut each stone pile came from, how Mona knew of the piles, and whether each "own needs take priority" was true beyond the rule that produces it.
- 1.6 days is too short to say the storehouse goes unused.

## What would close the most holes (proposals, not approvals)

Ranked by how many of the 20 holes each would turn into EXPLAINED.

1. **Say why now on a plan, and decide it from what the person knows** (links 2, 9, 18, 21, 24: five holes). The trigger is the first solid home, or the last site being
   gone. Ledger G32, gated: the fix is in `options_work.ts`, a held file.
2. **Keep the deciding term on an answer to an ask** (links 6, 10, 28, 33, 34: five holes). One clause is enough: "has not seen Dax finish a shared project", "not one to take
   on shared work", "close to yes; no this time". No ledger row names this. Nearest: G74, G09.
3. **Keep why an open commitment is idle** (links 19, 22, 30: three holes). The project record could carry each supporter's current blocker: "Mona: no room in her pack for
   stone". Ledger G09.
4. **Name the item, the place and its origin when something is taken** (links 17, 32: two holes, and the best story in the trace). Ledger G133, next in the queue.
5. **Fix the two wrong records** (links 4, 36). The shared-site feed line is in `act_build.ts`, a held file. `builtBy` is in `buildings.ts`, free. Both are display and record
   defects, not behaviour.
6. **Let a failed attempt leave a trace** (link 38), and link a new project to the failed one it follows. Ledger G74.
7. **Keep shared-work lines out of the 60-line roll-off** (links 3, 25). Ledger G05, G08.
