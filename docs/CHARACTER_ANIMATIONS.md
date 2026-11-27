# Character animations: one look for each thing a person does

27 November 2026. Presentation only: no rule, no rules version, nothing under `src/sim` changed.

## What it is

The simulation names one of 28 poses for each activity, and about 25 activities shared a generic one (standing, sitting, a
general "craft" motion, a "pick" motion, a "store" motion). A viewer could not tell a vigil from a rest, a dance from a walk,
or a stand against a wolf from berry-picking.

The renderer now chooses a richer animation from the person's own record, and the simulation is not told:

- `src/render/animation.ts` `animationOf(world, person, pose, conversation)` returns an animation id. It reads the activity's
  kind, phase and data, the conversation's purpose, what the person is saying, and (for an occasion or a speech for a shared
  building) the record the activity points at. `conditionOf` reads fever, injury, pregnancy and bereavement.
- `src/render/anim_rig.ts` holds the rig for each new animation; `src/render/anim_props.ts` the things held in the hand;
  `src/render/rig.ts` the rig layout both files share. `src/render/characters.ts` draws the new rig channels (kneeling, knees
  drawn up, elbows out, a turn of the body) and the conditions.
- `p.pose` is what it always was. No value was added to `PoseKind`, no handler returns anything new, and nothing is saved.

The rule kept throughout: **nothing is drawn that the record does not hold.** A spear is drawn only if a spear is in the
pack, a jar only if one is carried, a wolf skin only if one is held. Where the record cannot tell two things apart they are
drawn alike, and the list at the end says which.

## Every action and its animation

| Was | Action | How it is recognised | Now |
|---|---|---|---|
| stand | Idling | `wander`, no marker, at work | `idle`: hands on hips, weight shifting, a stretch now and then |
| stand | Evening fire | `wander`, `data.evening === 'fire'` | `fire_sit`: seated, leaning back on one hand |
| walk | Walking out, on the way | `wander`, `data.walk`, walking | `stroll`: an easy pace, an arm crooked, a hand behind the back |
| stand | Walking out, arrived | `wander`, `data.walk`, at work | `walkout`: close, a hand held out to the other's |
| run | Running to meet somebody | `wander`, `data.reunion`, running | `greet_run`: arms flung wide |
| stand | The reunion | `wander`, `data.reunion`, at work | `embrace`: leaning in, both arms round |
| stand | Exploring | `explore` | `lookout`: a hand shading the eyes, the other on the hip, up on the toes |
| stand | Searching | `search` | `search`: stooped, parting the grass with both hands |
| stand | Claiming a home | `claim_home` | `claim`: a hand flat on the doorpost, looking the place over |
| stand | Paying respects | `pay_respects` | `respects`: down on one knee, head bowed, a hand to the ground |
| stand | Looking in on somebody | `visit`, no marker | `lookin`: bending to them, a hand out |
| stand | Minding a child | `visit`, `data.watch` | `mind`: arms folded and watching, then down to the child's height |
| stand | Attending a birth | `visit`, `data.birth` (not `emptyDoor`) | `attend_birth`: on both knees beside her, both hands busy |
| walk | Search party, walking | `visit`, `data.fetch` or `data.fetchWith`, on foot | `search_walk`: walking with a hand to the brow |
| stand | Search party, leader standing | `visit`, `data.fetch`, at work | `call`: both hands cupped to the mouth |
| stand | Search party, companion standing | `visit`, `data.fetchWith`, at work | `lookout` |
| stand | Feast, wedding, harvest feast | `attend`, occasion gathering | `celebrate`: clapping, both arms up with a hop |
| stand | Market | `attend`, occasion kind `market` | `market`: weighing one hand against the other |
| stand | Funeral | `attend`, occasion kind `funeral` | `funeral`: head bowed, hands clasped, a hand to the eyes |
| walk | Dancing | `attend`, `data.dance` not done | `dance`: arms up, hopping, turning |
| walk | Trading journey | `exchange_journey`, on foot | `trek`: a steady walk, a hand up on the pack strap |
| stand | Trading journey, arrived | `exchange_journey`, at work | `barter`: both hands held out |
| walk | Moving house | `relocate`, on foot | `trudge`: bowed, both hands at the shoulders, short steps |
| stand | Moving house, arrived | `relocate`, at work | `unpack`: bend, set down, straighten |
| sit | Resting | `rest`, no marker | `rest`: slumped forward, forearms on the knees |
| sit | Warming by a fire | `warm` | `warm`: hunched with both palms out, shivering |
| sit | Time alone | `alone` | `alone`: knees drawn up and held, head down on them |
| sit | Sharing a meal | `attend_meal`, `host_meal` | `meal_sit`: cross-legged; `meal_eat` when eating (it was the standing eat) |
| sit | Vigil | `rest`, `data.vigil` | `vigil`: on the knees beside the sick, a hand on them |
| sit | Lying in | `rest`, `data.lyingIn` | `lyingin`: lying back propped on an arm, a hand on the belly |
| sit | Sitting with the grieving | `rest`, `data.grief` | `comfort`: seated close, an arm out round their shoulder |
| sit | Settling a child | `rest`, `data.settle` | `settle`: bent low over the child, patting |
| sit | Standing up for somebody | `rest`, `data.side` | `standup`: on the feet, a palm thrust out; arms folded once it is said |
| craft | Making a tool by hand | `craft` | `whittle`: seated, the piece in the lap, short strokes |
| craft | Mending a tool, a cart, cloth work | `tool_work` (`cartId`, `textile`) | `mend_tool`, `mend_cart`, `weave` |
| craft | Butchering | `butcher`; `animal_work` op `slaughter` | `butcher`: on both knees, one hand holding, one cutting |
| craft | Tending livestock | `animal_work` by `data.op` | `feed_animal` (feed, water), `shear`, `tether` (the rest) |
| craft | Setting a net or trap | `gear_work` by `data.op` | `setgear` (place, reset, repair), `haul_net` (check, retrieve) |
| craft | Hanging a wolf skin | `hang_skin` | `hangskin`: stretched up, both hands high, the skin between them |
| craft | Workshop with no motion of its own | `operate`, pose `craft` | `workbench`: both hands working at bench height, no hammer |
| pick | Hunting a deer | `hunt` | `stalk` on the way (low and slow), `strike` (drawn back, then a lunge) |
| pick | Standing against a wolf | `defend` | `guard`: feet wide, the spear levelled in both hands, jabbing; `charge` on the way |
| store | Putting goods in | `deposit` | `putaway`: from the chest down and in |
| store | Taking goods out | `withdraw` | `takeout`: reaching down and in, then up to the chest |
| store | Hauling | `haul` | `heave`: a deep squat, up to the chest, onto the shoulder |
| store | Feeding a fire | `fuel_fire` | `feedfire`: on one knee, an arm up against the heat, the other throwing |
| drink | Filling a water jar | `fetch_water` | `filljar`: on both knees, both hands lowering the jar and lifting it |
| build | Mending a building | `repair` | `mend`: reaching up, nailing above the head |
| build | Laying out a site | `plan_site` | `survey`: an arm sighting along the line, then down to mark a corner |
| talk | Warning of danger | conversation `warn` | `talk_warn` (an arm flung out), the hearer `alarmed` |
| talk | Teaching | `learn_foraging`, `learn_skill`, `teach_technique`, `learn_technique` | `teach` (down to the learner, a finger on the thing), `learn` |
| talk | Asking to walk out | conversation `court` | `ask_court` (a small bow, a hand offered), the other `demure` |
| talk | Welcoming newcomers | conversation `welcome` | `welcome`: both arms wide, then beckoning |
| talk | Asking for hands for a building | conversation `recruit` | `rally`: one arm sweeping "come along" |
| talk | Making peace | conversation `mediate` | `peace`: both arms wide and low, pressing down |
| stand | A story at the fire | speech, and the thought `told_story` dated the tick it began | `fire_story`; a listener with the thought `story` is `fire_listen` |
| stand | A song | speech, and the thought `sang` dated the tick it began | `fire_sing`: head back, arms wide |
| stand | Speaking for a building | speech, and the civic project's `spoke` tick with the speaker a candidate | `fire_address`, `stand_address`: an arm raised |
| stand | Thanks in company | the words of the speech (`praise.ts`) | `fire_thanks`, `stand_thanks`: a hand on the heart, bowing |
| talk | Chase, hide and seek, house | conversation `play_together`, `data.game` | `game_chaser` (crouched, lunging to tag) and `game_runner` (twisting away, hopping), `game_count`/`game_hide`, `game_house`. The games are played where the children stand, so nobody is drawn running on the spot |
| stand | A child playing alone | `wander`, `data.play` | `play_ground` (stones, bugs), `play_sticks`, `play_toy` |
| none | A fever | `p.illness` | hunched and shivering, arms hugged in, flushed cheeks |
| none | A sprained ankle | `p.injury.kind === 'sprain'` | a limp |
| none | A broken arm | `p.injury.kind === 'broken'` | the forearm in a sling |
| none | A bad cut | `p.injury.kind === 'cut'` | a binding on the forearm |
| none | Near her time | `p.pregnantUntil` within 9,600 ticks | the belly, leaning back, a hand to the back |
| none | Mourning | `p.lifeEvent.kind === 'bereaved'` | head down, arms still, a dark band on the arm |

Walking, running, sleeping, eating alone, drinking, chopping, mining, fishing, tilling, planting, tending, harvesting,
building, sawing, hammering, forging, baking, digging, plain talk, giving, arguing, pulling a cart, fleeing, carrying and
waving are drawn as before.

`care`, `fulfill` and `return_tool` are in the `ActivityKind` type but no handler is registered for any of them and no
activity of those kinds is ever created: `care` is an option tag and a request kind, `return_tool` a commitment kind. A
person caring for somebody is in a `give`, `deposit`, `gather` or `fetch_water`; one returning a tool is in a `give`. There
is nothing of those three kinds to draw.

## What the record does not hold

- **Where a cut is.** `Injury` holds the kind only. The binding is drawn on the forearm by convention.
- **A knife.** Nothing in the item list is a knife, so a butcher's cutting hand is empty.
- **Whose thanks.** A thanks before the company leaves only the spoken words on the speaker, so it is recognised by the
  two openings `praise.ts` writes. If those lines change, a thanks is drawn as an ordinary sitting.
- **A guessing game** is talk, and is drawn as talk.
- **A net or a trap in the hands.** `gear_work` is drawn by posture; the gear itself is not drawn in the hand.
- **What is carried on a trading journey or a move** is drawn only from the pack, as it was.
- **Asking support for a shared building** is the `recruit` conversation (the speech before listeners is the other way of
  asking, and has its own look).

## Evidence

- `tests/animation_choice.test.ts`: every row above as a staged record, the choice it gives, and that the person is left
  as they were.
- `scripts/browser/animation_sheet.mjs` with `scripts/browser/animation_specs.mjs`: a labelled contact sheet of every
  animation at the default zoom and at twice that, and the tell-apart pairs. Staged figures, not an ordinary world: the
  sheet shows how a state is drawn, not that it arises.
- `scripts/browser/animation_cost.mjs`: frame time in a Large world.
