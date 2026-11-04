# Large-map findings

## Forest — completed

The four-settlement 160×160 map started with 100 founders. Total population reached 115 at day 19, then fell to 113 at day 20, 104 at day 21, 62 at day 22, six at day 23 and zero at day 24. It stayed extinct through day 30. All 100 founders died, as did the 15 people added during the run. Recorded causes across all 115 deaths: hunger 75, exposure 17, wolf attack 13, fever six and thirst four.

The extinction is an observed world outcome: all 31 daily twin comparisons and pure-observer checks, conservation, unchanged frozen source and final 120-tick save/reload continuation passed. It is not a failed test disguised as a successful simulation. The run provides no proof that any particular proposed fix would avert it.

The original cohorts were 30 children, three youths, 60 adults and seven elders. All died. At day 20 the map nevertheless contained 20 huts, five wells, four cellars, a food rack, three timber yards, two quarries, a storehouse and a kiln, as well as fires and lean-tos. Infrastructure presence alone did not establish sustained food access and warmth.

Focal lives:

- **Zeke, initially 6.02:** died of fever just before elapsed day 20. He received goods 16 times and participated in ordinary life; this was not an entirely absent-care story. His recorded final activity was picking berries. His earlier final-account detail was no longer retained in the world's deceased record; the observer preserves his daily states and activity events.
- **Tomas, initially 15.10:** made a hoe at tick 3203 and basket at 9912 while still a youth. He became an adult at tick 25905, farmed, and died of hunger at day 20.63 while attempting to fish after an empty-source failure. Do not classify all his later work or death as teenager-only behaviour.
- **Orla, initially 42.70, Zeke's mother:** made a basket, farmed and successfully delivered berries to Yan and grain to Zeke. She died of hunger at day 22.53. At death she had tools and materials but no food, zero energy and warmth about 1.8. That does not prove carrying congestion caused her death. Her last local household view had no other living members.
- **Milo, initially 72.34:** made a hoe and spear and farmed. He received no gifts according to his retained statistics and died of hunger at day 22.02. His last known home was a lean-to at 15% condition. This is a different person from normal-river Milo, who died of exposure.

There were 394 founder activity failures with the exact message `they had no room to carry it`. As explained in `METHOD_LIMITS.md`, these are reported handover failures, not 394 independently verified inventory diagnoses.

## Life-stages-6 — completed

This world ended with 131 inhabitants and 91/100 founders alive. All original runtime checks passed, including 31 exact daily twins, observer purity, conservation and the 120-tick save continuation. Initial cohorts: children 16/21, youth 6/6, adults 62/64, elders 7/9 survived. The founder count held at 100 through day 23, fell to 97 on day 24 and 91 on day 25, then stayed at 91. Later entrants raised the final total. Eleven deaths across all inhabitants were recorded: six hunger, one thirst, three wolf attacks, one fever.

- **Fenn, initially 6.87:** died of hunger at tick 56961, day 23.73, still a child (exact age about 8.84). He participated in 14 completed foraging practices, nine games and 14 family-time activities. His food and energy needs were zero at death. His parents Ines and Oren remained alive. His local story was not lack of affection or lack of a home: the failure occurred despite those things.
- **Kira, initially 13.54:** survived at health 100, becoming an adult only at tick 70818, day 29.51. This is the strongest sustained teenager example among the selected people. While still a youth she completed a food rack at tick 17520, a household hut at 22283 and a spear at 41948; she farmed and brought food home. Her daily capacity changed from nine to 12 on adulthood. At tick 50276 she successfully deposited a spare seed specifically to free her hands to fuel the cold household hearth. At 64600 she left grain at home for Rolf. These show working storage/use adaptations alongside the failures elsewhere.
- **Ines, initially 34.68, Fenn's mother:** survived at health 100 with a basket, capacity 18. She farmed, crafted, completed a hut and deposited goods 26 times. She shared lessons and family time with Fenn and tried to feed him. She learned about his death from the grave at tick 58541. Her surviving, productive adult outcome cannot stand in for the welfare of her child.
- **Pavel, initially 66.08:** died of hunger at tick 55549, day 23.15. He had made a basket and spear, delivered promised fish, completed a granary and household cellar, and participated in practice with children. His death account retained a basket, spear and materials but no food; energy was zero. This does not prove those materials caused his death. Seven of the other eight initial elders survived, so the selected death is not representative of all elders in this world.

There were 421 founder activity failures with the exact reported no-room handover message. This exceeds the extinct large forest world's 394; raw counts alone therefore do not rank viability or establish causality.

### Fenn's care and carrying window

Daily samples on days 20, 21, 22 and 23 show two wood plus one seed, load 4.25/capacity five. At day 20 his food need was about 88 and health 100; day 22 food was 14 and health 80; day 23 food was zero, energy about five and health 55. His last known hut remained available but he travelled among depleted sources.

Ines received reports that Fenn was hungry at ticks 53934 and 54094. An attempt to bring him fruit failed at 55486 because he was not where expected. She then asked him for food (refused: no item), selected care again, and the fruit handover failed at 55678 with `they had no room to carry it`. Her next activity was gathering for her own hunger, not an immediate deposit fallback. She subsequently sought food, attempted inaccessible gatherings and went to sleep; Fenn died 1283 ticks (0.535 day) after the failed handover.

These are observed choices and outcomes. Both inventories were not sampled at the exact handover, and no counterfactual fix was run. Do not claim this one failure fully explains the death or that Fenn ate nothing during the final days: he successfully ate at home at tick 50108, and a later partial grain-gathering action may include immediate consumption without an inventory transfer. `fenn-care-window.json` preserves the sampled needs, pack, final account and the mother's event window.

## River — completed supplemental continuation

The original exact comparison failed at day 19. The separately resumed outcome ended at day 30 with 76 inhabitants and 63/100 founders alive. Initial cohorts: children 16/28, youth 2/2, adults 42/62, elders 3/8 survived. All 12 supplemental daily parsed-state comparisons passed, as did the semantic 120-tick continuation, pure observations and conservation. Exact serialized equality continued to fail at every day-19 through day-30 checkpoint and after the final 120 ticks. See DIAGNOSTIC_FINDINGS.md; do not combine this with the five original passes as six exact successes.

Population fell from 128 on day 21 to 118 on day 25, 106 on day 26, 103 on day 27, 97 on day 28, 87 on day 29 and 76 on day 30. This was an ongoing decline, not established stability at the endpoint. Across all inhabitants, 54 deaths were recorded: hunger 43, wolf attack seven, injuries two and fever two.

- **Brigid, initially 6.63:** survived, still a child, at health 93.44. She participated in 12 completed foraging practices, ten games and 12 family-time activities. Her final known hut was 30 tiles away and 27% sound. Survival did not imply an undamaged household: she learned of several deaths, including Dov's, during the final days.
- **Zora, initially 14.02:** survived at health 78.11, becoming an adult on day 23.73. She brought food home and, while still a youth, deposited two fish at the food rack at tick 51096 for drying. This records delivery for preservation, not proof that those same fish were dried and eaten later.
- **Una, initially 41.74, Brigid's mother:** survived at health 33.98, so describing her merely as alive would hide serious remaining vulnerability. She had 21 successful give activities and 21 successful deposits, but 33 handover failures carrying the exact no-room message. At ticks 47011 and 53027 she successfully left fruit/berries at home specifically for Brigid. These demonstrate completed fallback-type deliveries, not proof of recipient consumption of those units.
- **Ben, initially 66.89:** died of hunger at tick 59879, day 24.95. He already had a basket at the start, participated in six completed practices and finished his household hut at tick 51410. His last known home was 93% sound. The final-account detail was no longer retained after later deaths; daily observations and events remain available. A solid hut and larger pack did not by themselves ensure food access.

There were 427 founder failures with the exact no-room handover message. The same message's interpretation limits apply.

## Starting resource context

All three large worlds began with similar global wild-resource counts: 160-163 berry bushes, 75-78 fruit trees, 78-84 wild-grain sources and exactly 40 fishing spots. Large forest did not start with fewer stored wild-food units in aggregate than the other two (although different foods have different nutritional values). This does not explain the divergent outcomes. Position, access, actor knowledge, travel, regrowth, use and household circumstances remain unisolated. Raw context is in `initial-resource-context.json`; global stocks are not actor knowledge or proof of available food at the point of need.
