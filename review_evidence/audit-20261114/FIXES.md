# Audit fixes of 14 November 2026: behaviour neutral removals

Branch `claude/audit-fixes-20261114`, from `4a7a11bb` (rules 245). Source of the findings: `AUDIT.md` and `AUDIT_all_findings.tsv` in this folder. Each file set was edited by one reader and its diff then read by a second reader told to revert anything that could change an outcome (30 sets reviewed, no hunk reverted).

## Checks run

- `npx tsc --noEmit`: clean. With `--noUnusedLocals --noUnusedParameters`: 334 diagnostics against 354 at `4a7a11bb`.
- World hash identity (`tools/smoke_hash.ts`, Normal, arrivals on, rules 245, hash every 2 days): aspen 25 days (13 checkpoints), river 12 days (7) and cedar 12 days (7) are identical to the audited commit at every checkpoint (final hashes `fe1bb633`, `1a0f02ef`, `99d4dae3`).
- 49 named test files (every test named after a touched module, plus `golden`, `v1`, `v244`, `v245` continuation and `observer_viewer_purity`): 366 of 367 tests pass; the one failure, `tests/preservation.test.ts` "carries household raw food for preservation while retaining two immediate meals", fails the same way at `4a7a11bb`.
- Not run: the full suite, any lab, any second seed, any save replay. A full suite line for your machine is in the brain checkpoint of the same day.

## What was removed (151 items)

### F1a
- `src/sim/relations.ts` (P1a-07): Removed exported peekRel and familiarityOf
- `src/sim/grievance.ts` (P1a-08): Removed exported grievanceOf
- `src/sim/lifechanges.ts` (P1b-09): Removed exported const near and the import of hyp that only it used
- `src/sim/options_social.ts` (F-x01 / P1a-10): Removed the line 'if (ctx.stage === child && ctx.dependents.length === 0 && false) return;' in optChat
- `src/sim/options_social.ts` (P1a-10): In optTrade the swap sort comparator 'valueOf(world, p, a.item) * 0 + b.n - a.n' is now 'b.n - a.n'
- `src/sim/options_social.ts` (P1a-13): Removed void statements: 'void world' in optAskInfo, 'void isDependent' in optOffer, 'void hashUnit' in optTrade, 'void eta' at the end of socialOptions, and the top-level 'void toolsHeldBy'. Removed the imports participation (townships), isDependent (people), valueOf (social), hashUnit (rng) and toolsHeldBy (toolreg).
- `src/sim/social.ts` (P1a-09): Removed the '&& false' hands-full guard in the give handler's return-mode branch: 'if ((t.inv[tool.kind] ?? 0) >= 1 && carryCap(world, t) < 99 && false) return ...'
- `src/sim/social.ts` (P1a-09): In reserveOf, removed the unreachable 'void dep' and the dep and hh locals that only fed it
- `src/sim/social.ts` (P1a-12): Removed the unused const toldKey and the pairKey import (id_ranges) it alone used. Removed the unused isFacilityType import (recipes). Removed the trailing 'void estimatedAmount; void NUTRITION; void noteFailure; void drive;' and NUTRITION from the constants import. Removed the local binding and 'void c' after addCommitment in the lend-response branch.

### F1b
- `src/sim/dialogue.ts` (P1b-08): Removed the exported constants BUILD_DONE and NEWBORN (two speech lists).
- `src/sim/news.ts` (P1a-14): Removed the `water: 1` entry from NEWS_WEIGHT and the now-unreachable `if (b.kind === 'water') continue;` in pickNews.

### F1c
- `src/sim/three_ages.ts` (P1c-03): Removed the exported const practiced (and its doc comment). Also removed the imports SKILL_MAX (constants) and SkillKey (types) that only it used.
- `src/sim/play.ts` (P1c-04): Removed the exported accessors soloDoing and soloSkill. The SkillKey import stays because SOLO_DEF's type uses it.
- `src/sim/leisure.ts` (P1b-10 (MAX_HAUNTS slice only)): Removed the clamp `.slice(0, MAX_HAUNTS)` at the end of hauntsFor (it now returns `out`) and the private const MAX_HAUNTS = 4.

### F2a
- `src/sim/intent.ts` (L2a-01): Removed the exported const activeIntent (one-line arrow function, p.intentions.find status active).
- `src/sim/intent.ts` (L2a-02): Removed the unexported function stillNeeded(p, wants) and its doc comment.
- `src/sim/decision.ts` (L2a-09): Removed the 'void MIN_COMMIT;' statement and MIN_COMMIT from the import from './constants' (REVIEW_EVERY and SWITCH_MARGIN kept).

### F2b
- `src/sim/options_work.ts` (L2b-03): Removed the no-op self-assignment `stand = { x: stand.x, y: stand.y }` guarded by an isFreeLand/world.solid check in the plan_site make(); `let stand` became `const stand`. Removed the now-unused `import { isFreeLand } from './registry'`.
- `src/sim/options_work.ts` (L2b-04): Removed the unused imports `estimatedAmount` (from ./knowledge) and `drive` (from ./needs), and the four trailing statements `void estimatedAmount; void drive; void T; void ({} as Person);`. The imports of T and Person stay because both are used elsewhere in the file.
- `src/sim/options_work.ts` (L2b-05): Removed the `homeBelief` field from the HhState interface, the local `homeBelief` in hhState, its assignment line `if (!homeBelief || isSolidHome(b.btype)) homeBelief = b;`, and the returned property.
- `src/sim/options_work.ts` (L2b-10): Removed `void world;` in hhState and the unused `const mem = Math.max(1, ctx.members.length); void mem;` in optDepositFood.

### F2c
- `src/sim/options_survival.ts` (L2c-02): Removed the four void statements (void carryCap, NUTRITION, estimatedAmount, hashUnit) and their imports: carryCap from './people', hashUnit from './rng', NUTRITION from the './constants' import list, estimatedAmount from the './knowledge' import list.
- `src/sim/welfare.ts` (L2c-02): Removed 'void stageOf;' and stageOf from the './people' import.
- `src/sim/welfare.ts` (L2c-03): In outOfDate, changed `known ? false : age >= 2 * DAY || !subject.lifeEvent || ...` to `known ? false : !subject.lifeEvent || ...`.
- `src/sim/options_survival.ts` (L2c-04): In optWarmth, `(w.rain > 0.3 || w.storm > 0.3) && true` became `w.rain > 0.3 || w.storm > 0.3`.
- `src/sim/options_survival.ts` (L2c-04): In optSleep, the Bed type `b?: Belief` became `b: Belief`, and `bed.b ? spotNear(world,p,bed.b) : null` became `spotNear(world,p,bed.b)`.
- `src/sim/relief.ts` (L2c-04): In guardOption, removed `if (need !== 'thirst' && need !== 'hunger') continue;`. The cast of the literal array changed from [NeedKey, Relief|null][] to ['thirst'|'hunger', Relief|null][], and the now unused NeedKey import was removed.

### F3a
- `src/sim/act_build.ts` (G2-16 / L3a-08): Removed export const MAX_BASIC_SITES and its doc comment, and the ORDINARY_RULES import that only it used.
- `src/sim/act_build.ts` (L3a-09): Removed the unused ledgerCreate import, the `void carryCap;` statement and the `void ((): Person | null => null);` no-op statement.
- `src/sim/act_production.ts` (L3a-09): Removed the void block (weightOf, carryCap, cartStore, addEvent, WORK, wearFor, toolsHeldBy) and the imports it kept alive. The `./people` and `./toolreg` import lines are gone entirely. weightOf, cartStore, addEvent, WORK and wearFor were dropped from their import lists.
- `src/sim/act_resource.ts` (L3a-09): Removed the void block (addItem, takeFrom, ledgerCreate, WATER_VALUE, distToFootprint). Dropped takeFrom and ledgerCreate from the economy import and distToFootprint from the registry import.
- `src/sim/act_misc.ts` (L3a-10): Removed `if (a.progress < 0) a.progress = 0;` in flee, after `a.progress = Math.max(0, a.progress - 1)`.
- `src/sim/act_misc.ts` (L3a-02): Removed the lim.untilEnergy early wake branch in sleep's work, with the `lim` local and its comment.

### F3b
- `src/sim/economy.ts` (L3b-04): Removed five unreferenced exported helpers invStore, giveToPerson, takeFromPerson, buildingStore, siteStoreRoom, and the now unused type imports Building and Store.
- `src/sim/meals.ts` (L3b-07): Removed the stageOf import and the Belief type import, plus the two 'void stageOf;' and 'void ({} as Belief);' statements that silenced them.
- `src/sim/meals.ts` (L3b-10 / L7c2-07): Removed the exported function openMeals.
- `src/sim/meals.ts` (L3b-11): Removed the dead 'q.hhId === p.hhId && false' term from the skip test in the invitee loop (now '!q || !q.alive'). Removed the empty 'if (m.status === eating && ...) { // already there }' block in guestOptions. Replaced the ternary 'cond ? continue : continue' with a plain return of 'continue'.
- `src/sim/facilities.ts` (L3b-09): Removed the re-exports 'export { newId }' and 'export { PERISHABLE, itemsSum }', the unused itemsSum function, and the then unused imports newId (from registry) and PERISHABLE (from constants).
- `src/sim/facilities.ts` (L3b-08): Removed the exported function scrapJob.
- `src/sim/facilities.ts` (L3b-12): In expireEarmarks, removed the unused 'have' closure and 'void have;'. In startBlocker, simplified the guard to 'out > 0 && storeFreeWeight(b) < out' (dropped '- (r.fromDeposit ? 0 : 0)' and 'weightOfList(r.inputs) * 0'). In shelveJob, collapsed the identical if/else branches to one addItem(b.store.items, k, n). In finishJob, removed the unused 'freed' local and 'void freed;', and simplified the guard to 'storeFreeWeight(b) < out && !r.cartOut' (dropped the '- 0' arm and '(r.toolOut && false)').

### F3c
- `src/sim/production.ts` (L3c-07): Removed unexported function perBatch.
- `src/sim/production.ts` (L3c-08): Removed the parameters item and unmet from unexported planRecipe and from all 7 call sites in production.ts.
- `src/sim/production.ts` (L3c-09): Removed the unused imports hasBrewing (brewing) and freeOf (intent). Removed the void block (void RECIPES, REPAIR_USES, weightOf, toolOf, belief) together with the imports RECIPES, REPAIR_USES and toolOf, and the unexported function belief. weightOf stays imported because it is used at two call sites.
- `src/sim/production.ts` (L3c-06): optRackSpare: removed 'kiln' and 'bakery' from the facility type list in the for loop.
- `src/sim/production.ts` (L3c-14): Removed the never-read field type from unexported interface Fac and from the single object literal in facilitiesOf that set it.
- `src/sim/provision.ts` (L3c-12): Removed the exported getter foodPreparationOn.

### F3d
- `src/sim/tools.ts` (L3d-01): Removed the exported functions syncToolRecords, toolsToHeap, releaseToolsOf and overdueLoans.
- `src/sim/tools.ts` (L3d-09): Removed the unused local imports toolById and retagTools from the './toolreg' import line.

### F4a
- `src/sim/knowledge.ts` (L4a-07): Removed exported functions beliefAge, beliefsOfKind and beliefStale. Belief, BeliefKind, World, Person and isWaterBeliefId stay, because other code in the file uses them.
- `src/sim/illness.ts` (L4a-08): Removed isIll, illnessOf, the Illness type import and the export type { Illness } re-export.
- `src/sim/households.ts` (L4a-09): Removed exported function sameHousehold. fatalHoldOn is handled under L4a-10.
- `src/sim/lifecycle.ts` (L4a-10): Removed the BUILD_DEF import and the gridQuery import. Removed the trailing 'void gridQuery;' and 'void BUILD_DEF;' in immigrationTick. Merged the duplicate newId import into the existing './registry' import line and deleted the second import line. Removed the exported getter fatalHoldOn, kept setFatalHold, and left fatalHold and fatalInjuryHolds untouched.
- `src/sim/lifecycle.ts` (L5g-15): Same edit as L4a-10: the gridQuery and BUILD_DEF imports and their void statements are gone.
- `src/sim/knowledge.ts` (L7b-13): Same edit as L4a-07: beliefAge is removed.

### F4b
- `sim/worldgen.ts` (L4b-01): Removed the unexported function floodReach (a one-line wrapper over floodReachFrom). floodReachFrom stays, it has two callers.
- `sim/worldgen.ts` (L4b-03): In the tree placement loop, replaced the ternary 'Math.floor(maxW * growth + 1e-6) > 0 ? Math.max(1, Math.round(gen.range(3, maxW + 0.4) * growth)) : 0' with its live arm 'Math.max(1, Math.round(gen.range(3, maxW + 0.4) * growth))'.
- `sim/worldgen.ts` (L4b-04): In populate, removed the write-only 'const used = new Set<number>()' and its single 'used.add(p.id)'.
- `sim/world.ts` (L4b-05): Removed the 'void addFx;' statement and dropped addFx from the import of './events'. addEvent stays, it is used at lines 209 and 271.

### F5a
- `src/sim/batch_plan.ts` (L5a-06): Removed exported function servesBatch (with its doc comment) and the then-unused type import Option (import is now `import type { Ctx } from './optutil'`).
- `src/sim/activities.ts` (L5a-07): Removed exported minimumCommitLeft, clampProgress and distanceToTarget, and the imports `clamp` (from ./util) and `distToFootprint` (from ./registry) that only they used.
- `src/sim/carts.ts` (L5a-08): Removed exported cartCanCross and cartLoadItems, and the imports `T` (value) and `Items` (type) that only they used. Removed the dead store `target = 0;` in updateCarts and changed `let target` to `const target`.
- `src/sim/apprentice.ts` (L5a-14a): Removed the unused re-export `export type { Apprenticeship };` and the type import Apprenticeship from the ./types import.
- `src/sim/checked_accounts.ts` (L5a-14b): Removed the unused type import SourceType from the ./types import.

### F5b
- `src/sim/constants.ts` (G1-01 / L5b-01): Removed BuildDef.protect: the interface field and the protect value in all 18 BUILD_DEF entries (lean_to 5, hut 10, house 16, the rest 0).
- `src/sim/constants.ts` (G1-14 / L5b-08): Removed export const REACH = 1.55.
- `src/sim/constants.ts` (L5b-08): Removed export const isFoodKind (the type guard over FOODS and PRESERVED_FOODS).
- `src/sim/constants.ts` (G1-15 / L3a-14 / L5b-07): Removed the WORK keys drink, deposit and withdraw.
- `src/sim/delivery_place.ts` (L5b-09): agentPlace guard `!hasDeliveryPlace(world) || helper.hhId === asker.hhId && false` is now `!hasDeliveryPlace(world)`.
- `src/sim/defence.ts` (L5b-10): Removed the exported getter wolfDefenceOn.
- `src/sim/daily_routines.ts` (L5b-02): Removed the always-false disjunct `a.data.layoutWait` from the guard in prepareRoutine.
- `src/sim/defence.ts` (unlisted): Removed `void _on;` in defSnapshot. The destructure `const { on: _on, ...rest } = defProbe` stays, because it is what drops the `on` field from the snapshot.

### F5c
- `src/sim/empty_news.ts` (L5c-09a): Removed exported getters emptyCorrectionOn, emptyTravelOn and correctionDeliveryOn; the set... switches and has... predicates stay.
- `src/sim/geology.ts` (L5c-09b): Removed exported getter depositGeologyOn; setDepositGeology stays.
- `src/sim/grave_site.ts` (L5c-09c): Removed exported getter graveSiteOn; setGraveSite and hasGraveSite stay.
- `src/sim/heard_helpers.ts` (L5c-09d): Removed exported getter heardHelpersOn; setHeardHelpers, hasHeardHelpers and heardHelpers stay.
- `src/sim/home_interior.ts` (L5c-09e): Removed exported getter homeInteriorOn; setHomeInterior, hasHomeInterior, seesInside and keepUnseenInterior stay.
- `src/sim/events.ts` (L5c-06): Removed the dead fragment text.includes("'s trade") from the 'work' case of chronicleWorthy. The reachable ' lit a ' fragment stays.

### F5d
- `src/sim/hunting.ts` (L5d-04): Removed the guard clause `|| a.data.tries >= 2` from the hunt handler's follow-up check in `work`, leaving `if (d > 14)`. The `tries: 0` data and the `act.data.tries++` in `strike` are kept because they are saved activity state.
- `src/sim/inspect.ts` (L5d-07): Removed `void NUTRITION; void TICKS_PER_YEAR; void ACTIVITY_NOUN;` and their imports (NUTRITION, TICKS_PER_YEAR from './constants'; ACTIVITY_NOUN from './labels').
- `src/sim/inspect_work.ts` (L5d-07): Removed `void RECIPES; void usableUnits;` and the `usableUnits` import from './facilities'. The RECIPES import stays because it is used at line 103.
- `src/sim/inspect_observer.ts` (L5d-06): Removed the exported function `daysSince` and the `DAY` import from './constants'. NEED_KEYS stays.
- `src/sim/inspect.ts` (L5d-08): Removed the exported type `Selection`.

### F5e
- `src/sim/metabolism.ts` (G3-18): Removed the exported getter labRatesOn. setLabRates and the labRates variable stay, hungerRate and thirstRate read labRates directly.
- `src/sim/known_able.ts, known_crowd.ts, known_handover.ts, known_hands.ts, known_home.ts, known_ration.ts, known_welfare.ts, known_worry.ts, layout_words.ts` (L5e-05): Removed the nine unreferenced getters knownAbleOn, knownCrowdOn, knownHandoverOn, knownHandsOn, knownHomeOn, knownRationOn, knownWelfareOn, knownWorryOn and layoutWordsOn. Each set... switch, the enabled variable and the hasKnown.../hasLayoutWords gate stay. The lab switch comment now sits directly above the setter.
- `src/sim/labels.ts` (L5e-03): Removed the exported table ITEM_ICON (37 lines). Also removed the ItemKind type import from labels.ts, which was only used by that table.
- `src/sim/life.ts` (L5e-04): Removed the exported function isHurt.
- `src/sim/leave_heaviest.ts` (L5e-08): Removed BUILD_DEF from the import { BUILD_DEF, ITEM_LABEL, WEIGHT } from './constants' line.
- `src/sim/life.ts` (L5e-10): Removed the type-only re-export `export type { Goal, Injury, SkillKey }`. Dropped Injury and SkillKey from the type import on line 26, since they were used nowhere else in life.ts. Goal stays imported because it is used locally.

### F5f
- `src/sim/pathfinding.ts` (L5f-06 / L7c2-06): Removed exported functions reachable() and walkEstimate() (and their doc comments)
- `src/sim/people.ts` (L5f-07): Removed exported dependentsOf and hasTool, plus the ToolKind type import that only hasTool used
- `src/sim/preservation.ts` (L5f-08): Removed unused local 'quantity' in losePreservationRack (const raw=...,quantity=r.inputs[raw]??0 became const raw=...)

### F5g
- `src/sim/registry.ts` (L5g-04): Removed exported tileIndex, unregisterPlot, terrainAt and animalById, and the now unused type import Animal. Kept Plot, gridRemove and T, which are still used in the file.
- `src/sim/responsibilities.ts` (L5g-05): Removed exported watchCommitment. Person and Commitment imports are still used by fireCommitment and settleFirePromise.
- `src/sim/rng.ts` (L5g-06): Removed static RNG.fromString and exported seedToNumber. hashString stays because agent/memory.ts, agent/observe.ts and app/save.ts import it.
- `src/sim/rulesversion.ts` (L5g-07): Removed exported settingsRulesVersion and its doc comment, and narrowed the import to 'import type { World }' because Settings was used only there.
- `src/sim/rulesversion.ts` (G1-17): Only the settingsRulesVersion part applied, as in L5g-07. The other items in the finding (void-kept imports in other files, FOODS and MATERIALS) are outside this file set and were not touched.

### F5h
- `src/sim/scenes.ts` (L5h-10): Removed the statement 'void ({} as ItemKind);' and the now unused 'ItemKind' from the type import on line 16.
- `src/sim/seen_dependant.ts` (L5h-07): Removed export const seenDependantOn (getter). setSeenDependant and the 'enabled' variable stay (enabled is still read by hasSeenDependant).
- `src/sim/seen_stock.ts` (L5h-07): Removed export const seenStockOn (getter). setSeenStock and 'enabled' stay (enabled still read elsewhere in the file).
- `src/sim/shared_builders.ts` (L5h-07): Removed export const sharedBuildersOn (getter). setSharedBuilders and 'enabled' stay.
- `src/sim/taken_from.ts` (L5h-07): Removed export const takenFromOn (getter). setTakenFrom and 'enabled' stay.
- `src/sim/township_extent.ts` (L5h-07): Removed export const townshipExtentOn (getter). setTownshipExtent and 'enabled' stay.
- `src/sim/tableeating.ts` (L5h-07): Removed export const tableEatingOn (getter). setTableEating and 'tableEating' stay (still read by eatsAtTheStore).
- `src/sim/shared_stone.ts` (L5h-07): Removed export const knownFirstStorehouseOn (getter). setKnownFirstStorehouse and 'knownFirst' stay (knownFirst still has 3 occurrences, so it is still read).
- `src/sim/techniques.ts` (L5h-04): Removed the unreachable 'too young for kiln/smithy instruction' line in answerLesson, and the then unused imports AGE_CHILD and TICKS_PER_YEAR (AGE_ADULT and DAY stay, still used).

### F5i
- `src/sim/util.ts` (L5i-01): Removed the five unused helpers sq, dist2, lerpAngle, plural and capFirst. angleDiff and normAngle stay, because turnToward uses them.
- `src/sim/wooden_spear.ts` (L5i-02 / G2-17 / L7a-08): Removed the dose setters setSpearReady and setSpearWorth and the null variables readyDose and worthDose. spearReady() now returns SPEAR_READY and spearWorth() uses SPEAR_WORTH directly.
- `src/sim/witness_sight.ts` (L5i-05): Removed the exported getter witnessSightOn. The enabled variable, setWitnessSight and hasWitnessSight stay.

### F5agent

### F6uia
- `src/ui/dom.ts` (L6uia-03): Removed the exported const plural (the one-line arrow function after cap).
- `src/ui/entity.ts` (L6uia-02): Removed the constant SHOW_WORKSHOP_CARD (fixed true, with its comment) and the half of the guard in updateShop that read it: `if (!SHOW_WORKSHOP_CARD || !ops) return false;` is now `if (!ops) return false;`. The 'Making' row guard on the next line is untouched.

### F6uib
- `src/ui/icons.ts` (L6uib-03): Removed exported function allIconNames()
- `src/ui/icons.ts` (L6uib-04): Removed the three ICONS entries menu, wrench and plate
- `src/ui/help.ts` (L6uib-06): Removed open() and isOpen() from the HelpPart interface and removed the matching 'open' and 'isOpen' properties from the object returned by createHelp. The internal open function and isOpen variable stay, because toggle and close use them.
- `src/ui/person.ts` (L6uib-06b): Removed setDepth from the PersonPanel interface and from the object createPersonPanel returns. The internal setDepth function stays.
- `src/ui/person.ts` (L6uib-05a): Removed the three unreachable fallbacks: '?? #cccccc' twice in makeNeedCell, and '?? #ccc' in the urgentList builder.

### F6uic
- `src/ui/viewer.ts` (L6uic-02): Removed the selector tokens '.wm' and '.help-card' from the viewOcclusions querySelectorAll, leaving '.glass, .viewer-settings'
- `src/ui/tooltip.ts` (L6uic-03): Dropped the unused 'world' parameter of the unexported thingStatus (now thingStatus(e)), updated its one call site, and removed the now unused 'World' type import
- `src/ui/person_sections.ts` (L6uic-05): Removed the 'settled on' entry from PLAN_TONE
- `src/ui/person_sections.ts` (L6uic-06): In the unexported disclosure(): removed the 'fallback' parameter (the open default is now a literal false) and removed 'summary' from the returned object and its type
- `src/ui/person_social.ts` (L6uic-07): Removed the '?? ...' fallbacks on v.interaction, v.meal, v.commitments, v.grievances and v.concerns in update()
- `src/ui/topbar.ts` (L6uic-08): In the file-local stat(): the icon name is now IconName (not null), ico is always built with icon(...), StatEls.ico is HTMLElement, and the 'if (weather.ico)' guard before setIcon is gone

### F6uid
- `ui/worldmenu.ts` (L6uid-01): Removed the unused members open() and isOpen() from the WorldMenu interface, and the matching 'open' and 'isOpen: () => isOpen' properties from the object createWorldMenu returns. The inner function open() and the isOpen local variable stay, because toggle(), close() and the pointerdown handler still use them.

### F6ra
- `src/render/bld_food.ts` (L6ra-06): Removed unused import plankLines from the './sprites' import
- `src/render/bld_home.ts` (L6ra-06): Removed unused import poly from the './sprites' import (plankLines kept, it is used at lines 37 and 38)
- `src/render/bld_work.ts` (L6ra-06): Removed the unused local type alias 'type Ctx = CanvasRenderingContext2D' and the blank line after it
- `src/render/bld_common.ts` (L6ra-02): Removed 'planks' from the RoofTex union and deleted the unreachable case 'planks' arm in roofFront (hashUnit and line are still used elsewhere in the file)
- `src/render/bld_common.ts` (L6ra-04): Removed the never read, never set field 'lit?: boolean' from the WindowOpts interface
- `src/render/bld_food.ts` (L6ra-08): Removed the never read field z from BAKERY.dome (now { x: 1.52, y: 1.6 })
- `src/render/carts.ts` (L6ra-07): Replaced the constant ternary 'kind === "ore" ? 0 : 0.0' with 0 in the alpha('#ffffff', ...) arm of the ore glint fillStyle

### F6rb
- `render/deposits.ts` (L6rb-13): Removed the local type Facet and the no-op statement 'void (null as unknown as Facet);'. Pt import kept, still used by chunk and others.
- `render/characters.ts` (L6rb-10a): Removed the ignored parameter handL from the unexported function drawTool, and the matching argument at its single call site.
- `render/construction.ts` (L6rb-10b): Removed the ignored parameter simT from the private method SiteDrawer.structure and from its single call in draw.
- `render/characters.ts` (L6rb-09): Removed the empty if block in poseRig (the p.wave wave override), which held only a comment.
- `render/characters.ts` (L6rb-06): Removed the no-op block 'if (o.night > 0.4 && o.eyes < 0.5 && o.lie) { void o.night; }' from drawHead. Also removed the options night, elderly and lie from drawHead's inline option type and from its single call in draw.
- `render/characters.ts` (L6rb-08): Removed R.TOOLON (the decl and its writes in the chop/mine/till, fish and build/craft poses), RigState.talkT, RigState.simT (field, initialiser and the s.simT write in updateAll), and PoseCtx.speed (field and the Math.min(1, s.moved*6) initialiser). Slot numbers PH 23 and N 24 are unchanged, so index 22 is just unused.
- `render/characters.ts` (L6rb-03): In rigFor, replaced the pair 'if moved>0.004 && (stand||sit) pose = running?run:walk' and 'if pose===walk && !walking pose=stand' with the equivalent 'if (s.moved > 0.004 && pose === "sit") pose = "stand"'. Removed the then-unused walking and running parameters of the private rigFor and the running local in draw.

### F6rc
- `src/render/effects.ts` (L6rc-03): Removed the for loop in Effects.consume (the one that only broke on fx[i].tick <= lastTick); the real scan is the while loop below it.
- `src/render/effects.ts` (L6rc-06a): Removed unused type import Building from the '../sim/types' import.
- `src/render/input.ts` (L6rc-06b): Removed the unused generic <K extends keyof HTMLElementEventMap> from the local arrow function 'on'.
- `src/render/overlays.ts` (L6rc-04a): drawKnowledge: (Number(k) + Math.floor(simT * 0)) % 3 became Number(k) % 3. The simT parameter stays because it is also used by Math.sin(simT * 6) later in the function.
- `src/render/effects.ts` (L6rc-04b): drawWeather: removed const x = x0 - (y / h) * 0 and used x0 directly in the two rain line calls.
- `src/render/iso.ts` (L6rc-05): Removed unused exported functions projectX and projectY.
- `src/render/renderer.ts` (L6rc-07): Removed the Renderer.viewSize getter.
- `src/render/renderer.ts` (L6rc-10): Removed the ignored _simT parameter from the private method drawScreenOverlays and from its single call site in the same file.

### F6rd
- `src/render/sprites.ts` (L6rd-03): Removed the export const BUILDING_SIZES table (and the blank line after it). ClassicKind stays, it is still used by classicBuildingSprite.
- `src/render/terrain.ts` (L6rd-05a): Removed the four 'void ex; void ey; void fx; void fy;' statements after ctx.stroke() in the shore edge loop of TerrainPainter.draw.
- `src/render/terrain.ts` (L6rd-05b): Removed the end-of-draw 'void tuftL; tuftL = new Path2D(); tuftD = new Path2D();' and changed the declarations of tuftL and tuftD from let to const.

### F6app
- `src/app/viewer.ts` (L6app-01): Removed exported const DEFAULT_VIEWER (line 10).
- `src/app/inhabit.ts` (L6app-02): Removed InhabitDriver.world() and InhabitDriver.alive(), plus the now unused `livingPerson` import (from '../agent/run') and the `World` type import (from '../sim/types'). The personId field stays, it is used elsewhere.
- `src/app/save.ts` (L6app-03): Removed `import type { Game } from './game'`, removed the `void hashString;` statement at the end of the file, and dropped hashString from the '../sim/rng' import (RNG stays).
- `src/app/game.ts` (L6app-05): Removed the `asked` field from the private Game.recent entry type and from the push in the frame loop (`asked: this.speed`).

## What was not changed, and why (163 items)

Skipped items are kept on purpose: saved or hashed fields in `types.ts`, legacy replay paths, code a test, script or lab arm references, callback signatures, and anything that would need a rules version. The findings that change behaviour or saved state (promise consequences, the `errand` guards, `plan_shared`, `ProjectNode.alternatives`, the chronicle filter, never read fields) are not touched here.

### F1a
- P1a-02: Request.deadline is saved state. promise_delays.ts writes it and promise_expectations.ts sets it on a synthetic Request, so the plumbing is live, and the field is in types.ts, which is not to be edited.
- P1a-03: Grievance.lastAmends is a field of a types.ts interface (saved and hashed). Tests also build it in literals. Removing the write in grievance.ts would change saved state, so kept.
- P1a-06: No firing in the census or smoke runs. It is a observation, not dead code, and the options may fire in other seeds. Nothing to edit.
- P1b-03: Crew.since and Crew.together are fields of a types.ts interface (saved). The writes in crews.ts stay.
- P1b-04: Tradition.since and Tradition.held are types.ts fields, and held is read by the world fingerprint (hash). Kept.
- P1a-09 witness help: The 'help' kind of the exported witness() function is a union member of an exported signature, and the audit's evidence is that no caller passes it. The statement says to keep exported signatures and I did not change it.
- P1a-11: The RequestKind, ConvPurpose and Commitment kind members live in types.ts, which must not be edited. The branches on them in social.ts are reachable by type and may be reached by older saves, so kept.
- P1a-12 params: outcome (1960), and world and p (1974) are unused parameters of registerHandler callbacks (the 'converse' onEnd and the 'give' onEnd). They are callback signatures, so kept.
- P1b-12: The filter p.children !== undefined in crews.ts is always true for the current type, but old saves may lack children and the result decides crew membership. Not provably neutral, so kept.
- P1b-13: The unused world, p and a parameters in the 'alone' handler in temperament.ts belong to the handler interface's positional callbacks (begin, work, onEnd). The rules say not to change callback signatures, so kept.

### F1b
- P1b-11: greeting() is exported, and the rule says not to change the signature of an exported function. Its single caller (social.ts:1099) lives in another file.
- P1b-16: pickLine, fill (and its `export { fill }` re-export) and GREET_* are used inside dialogue.ts by saying() and greeting(). The finding is only about narrowing the export, which is not one of the permitted removals. The change would be safe but is outside the contract, so I left it.
- P1b-17: hasApproachRules, hasLearningGate, hasMealWindow, hasMarketFire and the LEARNING_GATE, MEAL_WINDOW and MARKET_FIRE constants are all used inside company.ts (lines 53-87). The finding is only about narrowing exports, which is not permitted here. These also sit on rules-200 gated switch paths that must be kept.
- P1c-07: childTimeReport is exported, so its signature (`w?: World`) cannot change. The `w &&` guard is needed to type-check an optional parameter, and removing it would also be a signature-coupled change. childhood.ts is in the set, but the `runsRulesVersion(w,211)` part is live legacy replay at 210.
- scan-extra: Looked for unused imports, `void x;` statements, `&& false` guards, `* 0` terms and empty ifs in all 11 files of the set and found none. The only `? ... : 0` hit, news.ts:123, is a live water branch in answerInfo. No extra edits made.

### F1c
- P1b-06: Occasion.called and Occasion.end are stored fields of an interface in types.ts, which is saved and hashed. Writing them in callOccasion and occasionsTick also feeds the event text. Not touched.
- P1b-07: HelperTask.offered is a saved field in a social-memory record that save validation checks. It is also copied from Request.offered at several sites in other files. Not touched.
- P1b-10 (REMEMBERED trim and 'fire' key): The shift at REMEMBERED=6 in noteHaunt is not provably unreachable: a.data.haunt from a loaded save is not validated, and p.leisure.recent is saved and hashed. The trim stays, as does the 'fire' key, which reaches leisureFingerprint.
- P1c-01: noteHaunt(w,p,'fire') writes p.leisure.recent, which is saved and hashed through leisureFingerprint (world.ts:446) and read by tests/leisure.test.ts. Removing it changes the world hash, so the contract does not allow it.
- P1c-02: p.shown is a saved and hashed field, and markShown writes 'farm' into it. notShownReason is exported and its 'farm' ternary arm is behaviour of an exported function (tests/three_ages.test.ts imports it). SHOWN_TASKS must keep 'farm' for validateShown. Not touched.
- P1c-05: toyFor is a key in a.data, which is part of the saved activity record. Dropping it changes saved games even though nothing reads it back. Not touched.
- P1c-06: gameAccept and gameTurn are exported, and their 'guess' arms are the default branch for a valid Game value. Removing an arm changes an exported function's behaviour for a value its type allows, and gameQuestion('guess') is live elsewhere. Skipped as not provably neutral.
- P1c-09: This is an exports-used-only-in-file finding, not dead code. Dropping `export` is outside the allowed removals, and tests import FIRE_SOCIAL and FIRE_SOCIAL_EACH. The unlinked EVENING_FROM copies are a documentation point; changing them would risk changing outcomes.
- P1c-10: Same as P1c-09: toys.ts exports are used in-file or by tests (TOY_LIFT, toyInterest, toyLift), and TOY_WOOD and TOY_WORK mirror a recipe constant by value. Not dead code, and linking them is not a neutral deletion.
- P1c-11: Same as P1c-09: play.ts exports are used in-file or by tests/play.test.ts (GAMES, GAME_PAUSE, SOLO_SEED). Not removable.
- unlisted files: child_feeding.ts, child_pace.ts, child_tasks.ts, helper_learning.ts, evening_fire.ts, toys.ts and occasions.ts had no unused imports, locals, void statements, no-op guards or ignored parameters on a full read. No edits there.

### F2a
- L2a-11: Not a dead code finding. The audit says the class is UNKNOWN and it is a rarity observation about plan help. No code change is possible without altering behaviour.
- L2a-12: Needless exports (summarize, OptionChooser, PlanHelp, BatchHooks, BatchWantLike, shelterInFlight, OptionLimit, WaterSpot). Dropping the export keyword changes the module surface and the finding itself says not dead. The task forbids signature changes to exported items, so I left them.
- optutil.ts: No findings for src/sim/optutil.ts and no plainly unused import or local was spotted, so no edit.

### F2b
- L2b-01: The finding itself says the wantedTool and 'to begin' branches are live from productionOptions callers. Not dead, so kept.
- L2b-02: The ore and clay hunt in optExplore is live code. Zero firings in one smoke run is not proof it can never run. Kept.
- L2b-11: blockedCraftNeeds is used by src/agent/observe.ts (import and call). Kept.
- L2b-12: Un-exporting is not a deletion of dead code. metAWolfLately is used by tests/wolf_defence.test.ts and workshopToolsOn by scripts/lab/lab.ts. The other names are exported helpers I did not re-verify. Export changes are left untouched.
- L2b-13: The finding itself says Math.max(8, sc.total) may differ by one float rounding step after the 8-sc.total top-up. That is not proven bit identical and util feeds option ranking, so kept.

### F2c
- L2c-01: The reader of lim.untilEnergy is in act_misc.ts, outside file set F2c, and options_survival.ts declares no bounds for it. Editing act_misc.ts is not allowed for this set, so nothing was done.
- L2c-04 (NOT_GUARDED set members and `o.need !== null ||`): Whether every producer of flee, eat, drink, sleep and warm sets need non-null spans many files and could not be proven here. NOT_GUARDED is also used at relief.ts:135. Left unchanged.
- L2c-05: Activity.data is saved and hashed world state. Dropping the `since` and `from` fields, or changing the `outcome` values, changes the saved activity and the world hash even though nothing reads them. Left unchanged.
- L2c-08: Option tags ('rest', 'warmth', 'social') are fields on option records. Options are surfaced to the inspector, the agent and blocked-option records. Removing or changing them could change observable output, and a missed reader is possible. Left unchanged.
- options_places.ts / external.ts: No finding listed for either, and no unused import, local, dead guard or void statement found on reading them. No edits.

### F3a
- L3a-01: Plot.sownTick is a field of an interface in types.ts. Those fields are saved and hashed, and the write is part of a sowing that mutates world state, so it stays.
- L3a-06: The cart_haul handler and the cart branch of tool_work have no firing in saved evidence, but tests exercise them (protocol31_32 cart-project scene). Test-reached code stays.
- L3a-07: a.data.joined and a.data.started are writes into the saved activity record, even though nothing reads them. The contract says keep statements that write a field or mutate saved state, so they stay.
- L3a-13: Left alone as not provably neutral: `?? 30` on WORK[s.type] (a loaded save could in principle carry another source type), the `: a.label` branch in cart_haul's pose, and the final `return 'done'` at the end of cart_haul's work.
- L3a-16: The ignored parameters are all on registerHandler callbacks (begin, work, onEnd, pose and similar), which are passed as callbacks, so their signatures stay. That covers act_build 496, act_farm 138, act_misc 20, 55, 135, 139, 158, 172, 181 and 184, and act_resource 401 and 738. The only item from that list handled is the ledgerCreate import at act_build 28, removed under L3a-09.

### F3b
- L3b-01: Building.inside is an interface field in src/sim/types.ts, which is saved and hashed. types.ts is off limits, and the field is still set in buildings.ts and by tests. KEEP.
- L3b-02: Job.destSite is a stored interface field in types.ts, read by the validators clothing.ts and preservation.ts. KEEP.
- L3b-05: The meal options 'Take food for the meal from the home store' and 'Arrange another meal' are rules 200 live behaviour whose firing is UNKNOWN. A lab arm (rich-no-meal-larder) changes worlds. Not dead code, so no edit.
- L3b-06: completeSite's rebuild-in-place finish is reachable behaviour with UNKNOWN reachability, not provably dead. KEEP.
- L3b-15: The unused 'world' parameter is on noteWithdraw, which is exported (act_production.ts and act_resource.ts call it), so its signature stays. The '?? 0.012' fallback in finishJob rests on a claim about every recipe skill being in SKILL_GAIN that I did not fully prove. The finding is LIKELY, so skipped.
- L3b-18: Meal.servings and Meal.created are interface fields in types.ts, saved and fingerprinted. The writes at meals.ts (m.servings = tableUnits(m), m.created set) stay. KEEP.
- L7c1-12: The finding is about functions and constants exported only for tests but used inside their own file. That is live code, and a test imports them, so there is nothing to remove.
- buildings.ts: No edit. Every import in buildings.ts has at least two matches, so none is unused. Other buildings.ts findings (L3b-01, L3b-06) are KEEP as above.

### F3c
- L3c-04: UNKNOWN class: a handcart chain that never fires in saved runs. It is live reachable behaviour, not dead code. Left untouched.
- L3c-05: UNKNOWN class: recipes that were not chosen in sampled runs. The finding's own evidence shows burn_charcoal and smelt_iron do fire in longer runs. Recipes are saved and replayed data, so all are kept. Nothing in recipes.ts changed.
- L3c-10: The finding itself says it is a logic gap, not dead code. Removing or changing the spear skip list would change which tool demand is chosen, so outcomes could change. Not behaviour neutral, kept.
- L3c-16: These are used-in-file exports, and removing the export keyword is not an allowed removal. Tests and other modules may later import them. Kept.
- settlement_economy.ts: Nothing to remove. Every export has a caller (economy, facilities, history, save, world, tests, or in-file use). The imports are all used. No dead statements found.
- recipes.ts: Nothing to remove. Every export has references, FACILITY_TYPES is used by isFacilityType, and all imports are used.
- provision.ts void _on: The statement 'void _on;' in prepSnapshot is paired with the destructure '{ on: _on, ...rest }'. The local is needed to exclude 'on' from the copy, so statement and local cannot be removed together without changing the returned object. Kept.

### F3d
- L3d-04: ToolTask 'saw' and 'smith' are part of an exported type, and TOOL_EFFECT.saw and ironSaw are read by scripts/docs.ts. The baseMultiplier saw case and the TASK_TOOL entries are not provably unreachable for callers outside src. The finding says nothing is wrong beyond a doc mismatch. Left alone.
- L3d-05: The finding is about per-kind wear for jars and textiles never being applied. Fixing it would change behaviour, and TOOL_DEFS lives in constants.ts, which is outside this set. Not dead code removal.
- L3d-02: The finding is that a tool record may be left on a removed building. The fix would be to wire in releaseToolsOf, which changes behaviour. I removed the function only because it has zero references. I did not wire it in.
- L3d-07: The basket case in baseMultiplier returns TOOL_EFFECT.basket for any tier, and TOOL_EFFECT.ironBasket is a constants.ts field read by scripts/docs.ts through Object.entries. Nothing in tools.ts is removable, and constants.ts is outside this set.
- L3d-08: The fish guard in toolFor is called without the hasRods check by scripts/recovered_rods_probe.ts, so it is script-referenced and kept. The baseMultiplier default branch is the exhaustive fallback for ToolKind values such as net, trap, spear and garment. Removing it would risk a type error and a behaviour change, so it stays.
- L3d-11: Trade.since is a field of an interface in types.ts, which is saved and fingerprinted at world.ts:438 and written at apprentice.ts:50. Stored field, keep.
- trade.ts-imports: I checked every import and local in trade.ts, and all are used. There is nothing to remove.

### F4a
- L4a-01: Not edited. The guards `pop + 3 <= rules.arrivalGroupCap` and `pop + 2 <= rules.arrivalGroupCap` in immigrationTick can only be called always true by following arithmetic across rules.ts, rulesOf, limitsOf and withGrowthRoom. They also read a Rules field that tests/rules.test.ts and tests/growth_room.test.ts reference, so the field is a live contract. The proof is not local, so I left the guards in place.
- L4a-03: SeenEntity.tired is a field of an interface in src/sim/types.ts (line 208). It is saved and hashed. src/agent/observe.ts:488 also reads it. KEEP.
- L4a-15: Removing 'export' from constants, types and functions is not among the permitted removals. It is a visibility change, not dead code, and lab or script references are not fully ruled out. LEAN_REGROW, WINTER_COLD, SPOIL_PILE, payKeyOf, spawnPerson, MOOD_EVERY, stampExplored, refreshAccessCell, SHELTER_PATIENCE, ShelterWant, OfferOutcome and FATAL_HOLD_FROM_VERSION are all left as they are. The finding itself says 'Not dead'.

### F4b
- L4b-11: Household.headId is a stored, hashed field of an interface in types.ts, and worldgen.ts:875 reads it to choose who gets the starting axes and hoes, which changes the world at founding. The audit itself says it is not dead. KEEP.
- L4b-02: The 'attack' member of the Animal.state union is in types.ts, which I may not edit. Display code also names it (ui/tooltip.ts WOLF_STATE and sim/inspect.ts). The default branch in wildlife.ts that resets unknown states to roam guards loaded or saved states, and removing it could change the replay of an older save. KEEP.
- L4b-06: hashWorld is an exported function, and the task says not to change the signature of an exported function. Tests and scripts could pass the trace argument, and the 'trace?.(s)' call is a no-op when it is absent. KEEP.
- L4b-extra: I looked for other unused imports and locals in wildlife.ts, world.ts and worldgen.ts only through the findings and the code I read. I made no further edits, because I could not run tsc to check for unused-name hits.

### F5a
- L5a-01: Carts chain (carts.ts, cart_priority.ts) never fires in saved runs, but that is a behaviour claim, not dead code. The code is reachable by rules and tests (breakCart called from updateCarts, tests call it directly). KEEP.
- L5a-02: Brewing and shared drink code has no firing in saved evidence, but layMealDrinks and sipMealDrink are called from meals.ts and brewing is gated by rules. Reachable code, not dead. KEEP.
- L5a-04: Grievance.eventId, history eventId and answerWhy are fields of types.ts interfaces, which are saved and hashed, and are written by live code. Do not touch. KEEP.
- L5a-05: CareJourney.received and .ended are fields of a type in types.ts (saved and hashed) and are read by validateCareSupply (can throw) and by the world fingerprint. KEEP.
- L5a-08 (hitch world parameter): hitch is exported, so its signature stays unchanged (the contract allows dropping an ignored parameter only on an unexported function with same-file callers). The `world` parameter is left in place.
- extra-scan: Scanned all 24 files in the set for `void x;` statements, `&& false` guards and `* 0` terms. None found. The tsc unused-symbol list has no other entries for these files, so nothing further was edited.

### F5b
- L5b-05: KEEP. ToldUndertaking.acknowledgedAt is a stored, validated and hashed record field (world.ts:507). Tests and scripts read it (tests/informed_continuity.test.ts, tests/helpers/v92ref.ts, scripts/informed_continuity_observe.ts, scripts/browser/informed_continuity_check.mjs). Removing it would change saves and the world hash.
- L5b-06: KEEP. The communal_stock.ts restock branch is live code that the audit found only rarely offered, and its class is UNKNOWN, not dead. Removing it would change the options offered.
- G1-16 / L5b-07 (TOOL_EFFECT.ironBasket): KEEP. scripts/docs.ts:39 iterates Object.entries(TOOL_EFFECT) and docs/recipes.generated.md prints it, so it is not a zero-reference name.
- L5b-07 (BuildDef.wood): KEEP. tests/cooperation.test.ts:52 reads it, and BUILD_DEF[type].stone, its sibling, is read by options_work.ts and production.ts.
- L5b-10 (driveChance unused 'world' parameter): KEEP. driveChance is exported and tests/wolf_defence.test.ts:412 and :417 call it with the current signature, so the signature stays.
- unused imports and locals in the other set files: The audit's tsc noUnusedLocals output (tsc_unused.txt) lists only defence.ts(189,29) for the 19 files in this set. A scan of them for `void x;`, `&& false`, `* 0` and empty if blocks found nothing further.

### F5c
- L5c-01: KEEP. Plot.sownTick, Plot.variant and Plot.lastTended are interface fields in src/sim/types.ts, which are saved and hashed. farming.ts writes them and tests read lastTended. Not editable under the contract.
- L5c-02: KEEP. Building.inside is a types.ts field, saved and hashed. buildings.ts initialises it and tests write and read it.
- L5c-07: No dead code. The audit itself says the 'home is full' branch is reachable (non-members can stay indoors). Nothing to remove.
- L5c-08: beginFlood is exported, and its storm and existing-flood guards can still bind. A lab toggle of setFloodAccess mid run can leave a stale w.flood, and beginFlood can also be called when hasFloodAccess is true. The finding itself is only LIKELY. Removing a guard on an exported function is not provably neutral, so I left it.
- L5c-12: exchangeHistory is exported, and the contract says not to change the signature of an exported function. The unused 'w' parameter stays. The sole caller is history.ts:49, which is outside my edit set.
- extra-scan: tsc_unused.txt lists no unused import or local for any file in F5c except the exchange_journeys 'w' parameter above. A grep of the set for 'void x;', '&& false', '|| true' and '* 0' terms found none, so no further edits were made.

### F5d
- L5d-02: WorldSummary is an exported interface that feeds the top bar display (ui/topbar.ts), and summarizeWorld is exercised by purity and death_knowledge tests. Treated as a display feeder, so KEEP. The buildings, sites, plots and tick fields have no reader I found, but removing fields from an exported shape is not covered by the zero-reference rule.
- L5d-03: PersonView.sex is a field of an exported display view-model, a display feeder. The whole view is serialised by scripts such as single_roof_duty_check.mjs, so it is not a zero-reference item. KEEP.
- L5d-09: describeEntityName is exported and called from src/ui/tooltip.ts and src/ui/inspector.ts, and imported by inspect_observer.ts, so its signature cannot be changed under the rules. The hunt `begin(world,p,a)` parameter p is the registerHandler signature, a callback. Neither half was edited.
- L5d-14: Exports that are used only inside their own file are over-exported, not dead. recipeBlockers is used by tests/preservation.test.ts, and hasHutBeforeLarder-style exports may be used by tests or lab switches. Un-exporting could break tests, tooling or the type check, and the finding itself classes it as UNKNOWN. No edit.
- set-files-no-findings: hut_before_larder.ts, hydrology.ts, id_ranges.ts, inspect_flood.ts, inspect_home_plan.ts, inspect_water.ts had no findings. I read the first three and found no plainly unused import or local. I did not open the last three, so nothing was edited in any of the six.

### F5e
- L5e-09: describeGoal(world, p) is exported and called from agent/observe.ts, inspect.ts and tests/pavel_company.test.ts, so its signature must stay.
- L5e-01: Not a dead code finding. The audit's own evidence shows lamb birth, tether break and sheep repair firing in saved runs. Sheep breeding, slaughter and tether repair are live code and may still run in older rules versions, so nothing was edited in livestock.ts.
- L5e-12: Class is UNKNOWN. The journey provisioning code has fired in saved runs (a completed journey intention at rules 140, water prep offers in the rules 196 census). Journey code is live and may be replayed under older versions. journey.ts was not edited.
- L5e-11: This is a logic gap in the journey food preparation branch, not dead code. Making the food branch run would change outcomes, so journey.ts was not edited.

### F5f
- L5f-01: ProjectNode.alternatives is a saved, hashed and validated field (project_graph.ts:63), and the second recipesMaking/facilitiesOf/techniqueBlocker pass that fills it is part of the compile. Tests and protocol JSON hold the key. KEEP.
- L5f-02: estimatedTicks and ProjectGraph.completed are saved and validated fields. estimatedTicks is read by describeProject (display feeder) and by tests. KEEP.
- L5f-03: Person.diedTick is a field of an interface in types.ts (saved and hashed), and the string appears in a saved test fixture. KEEP.
- L5f-04: Promise record provenance fields are saved, validated, hashed and read by describe functions and by record copying. KEEP.
- L5f-05: Classed UNKNOWN. alignmentWeight is a live decision read in civic_decision.ts:69 and so is not dead; the audit finding only says it is rarely seen firing. Nothing to remove.
- L5f-11: GearState.owner and setAt are saved and validated fields, copied for hashing and save validation. KEEP.
- L5f-14: reviseProject is called from decision.ts:321 for the external 'revise' choice and from tests. It is reachable with the AI inhabitant, so it is not dead. KEEP.

### F5g
- L5g-01: Not dead code. It is an evidence gap in a staged relocation chain, with no code to remove.
- L5g-02: Not dead code. The rules-54 relocation extensions are live code reached by tests and gated by rules version, and the successions, rescues and newHouseholdId records are saved and hashed. Kept.
- L5g-03: Relocation.townshipId is a field of an interface in a saved and hashed structure, so it stays, and types.ts must not be edited. The write at relocation.ts:363 stays too.
- L5g-10: relocationResponse is exported and registered as a handler. reservedFor is exported with 29 call sites. The rules forbid changing the signature of an exported function, so both parameters stay. tsc_unused.txt flags the unused w in relocationResponse, but it is the same exported function.
- L5g-12: retryAt is a stored and validated field of the route experience record, which is saved and hashed. Its write sets a value the code never reads back, but removing it would change the saved state and the world hash.
- L5g-14: These are needless exports, not dead code, and the contract does not allow removing an export that is used in its own file. Left alone to keep the diff to removals with zero references. Exports on lab-touched or test-touched names could also matter.

### F5h
- L5h-02: Source experience event records (tick, outcome, units, took, expected) are stored fields of saved state and validated on load (source_learning.ts:61), so they are saved and hashed. Dropping them would change the save format and the world hash. Kept.
- L5h-05: Township.founded is a field of an interface in src/sim/types.ts, which is saved and hashed (it is also in the fingerprint). It is read by scripts/relocation_observe.ts:52 and written by tests. The contract forbids touching types.ts and requires keeping stored fields. Kept.

### F5i
- L5i-03: The cart destinations and loaded-cart recovery in transport.ts are live mechanism code that the audit calls UNKNOWN, since it never fired in ordinary evidence. cartTripOptions is called from production.ts and scenes.ts builds carts. Reachable code is not removable.
- L5i-04: Person.hauling is a stored, hashed field in types.ts, and cartExperience feeds production.ts planning. KEEP.
- L5i-08: The paid===1 check in wild_seed.ts saveSeedFromGrain looks always true after the grain >= 1 guard. It is not provable for a NaN grain count: (NaN<1) is false, so the guard passes, and consume would then return NaN, not 1. The change is not provably neutral and the gain is trivial. wildSeedInputOn and setWildSeedInput are used by lab.ts line 581, so they stay.
- unlisted-sweep: I checked the other files in the set (visible_need, warmth_duty, water_access, water_search, wells, winter_practice, winter_shelter, wolf_fight, wolf_skin, work_handover, and the rest of transport) for unused imports, unused locals, void statements, '&& false' guards and zero-reference exports. I found none. Every export has an external reference or a use inside its own file, and every import is used, so I made no further edits.

### F5agent
- L5agent-01: Lagged apply branch in TranscriptController.choose is the replay path for recorded transcripts and the legacy timing contract. Tests assert the lagged count, so it is not provably dead. Left alone.
- L5agent-04: ModelReply.stop is an optional interface field that scripts/inhabit/anthropic.ts, openai.ts and app/inhabit.ts populate. Removing it from model.ts would break those producers' type check, and they are outside my file set. Left alone.
- L5agent-05: TranscriptHeader.mode is a field of a saved and replayed transcript, and its 'replay' member is part of the stored-format union that scripts/inhabit.ts and tests/inhabitant.test.ts read. Stored field, kept.
- L5agent-12: The worldDuration re-export in time_text.ts line 2 is imported by tests/inhabit_time_text.test.ts, so it has a reference and is kept. afterTick(_world) is a public method on the exported class LiveSession. controls(_world) and choose(_trigger) in transcript.ts fulfil the ExternalController interface. Changing any of these signatures is not allowed.
- L5agent-13: The audit itself calls this an observation gap and not dead code. Adding person signs or place kinds to the observation would change prompts and the observation hash, so it is not behaviour neutral.
- extra-exports: Items exported with no external reference (for example the PROTOCOL_V* constants, checkBudget, cleanText, the Run/Session option types, TRANSCRIPT_VERSION) all have in-file uses. Only the export keyword would be removable, which is not a deletion of an unreferenced symbol, so I left them.
- extra-imports-locals: I counted occurrences of every import name and every local const or let in the 11 files and found no unused import, unused local, void statement, '&& false' guard, '* 0' term, or empty if block. tsconfig has noUnusedLocals and noUnusedParameters set to false, so the compiler would not have reported any. This was a grep heuristic, not a compiler check.

### F6uia
- L6uia-01: The cart fallback block in entity.ts (e.ent === 'cart' && !withSecs) is only argued dead by tracing callers through inspector.ts, inspect.ts and inspect_work.ts. The audit itself rates it LIKELY. EntityView is built outside this file, and a test or another caller could pass a cart view with no sections. Not proven unreachable, so kept.
- L6uia-02b: The 'Making' row guard in updateShop (v.rows.some(r => r[0] === 'Making')) is kept. The finding rests on a grep of the string 'Making', but EntityView.rows can be filled with computed labels, so it is not proven that no row has that label.
- L6uia-07: The EVENT_COLORS ?? fallback and the missing-category branch in feed.ts are guards over event kinds and chronicle data that come from loaded saves. The audit says whether older kinds existed is UNKNOWN, and save loading does no kind validation. Kept as a legacy-save guard.
- imports-and-locals: Checked every import in the ten files of the set (context, debug, dom, entity, event_cards, event_cards_art, event_cards_model, faultbanner, feed, feed_rows) by counting uses of each imported name. Each is used more than once, so none were removed. A grep for `void ` statements in those files found none.

### F6uib
- L6uib-02: The obs.version < 6 branches in src/ui/inhabit.ts depend on a version parsed from prompt text by observationFromPrompt. That is data, not a code constant, so I cannot prove no input reaches it. A hand or chat answer or a test may feed an older prompt. The audit's own label is LIKELY, not VERIFIED.
- L6uib-05b: The 'kind in ITEM_LABEL ? itemIconName(kind) : hammer' arm in person.ts is a defensive fallback for a tool kind from a save, and save validation was not checked. Removing it could change what an old save displays, so I kept it.
- L6uib-07: The finding itself says these are not dead and only the export keyword is redundant. Un-exporting PersonDepth, PersonPanel, PersonHooks or UIHandle could break the declaration emit for exported signatures and gains nothing. Skipped.
- scan: I also scanned all 11 files for unused imports, 'void x;' statements, '&& false' guards, and '* 0' terms. After the edits there were none. Imports of help.ts, icons.ts and person.ts are all still used. Nothing in index.ts, inspector.ts, layout.ts, minimap.ts, minimapgeom.ts, overlays.ts or inhabit_summary.ts needed a change.

### F6uic
- L6uic-03 (ctx in createPeopleBlock and createHistoryBlock): Both are exported functions, and the brief says not to change the signature of an exported function. person.ts:286-287 passes ctx. Kept.
- L6uic-04: IconButtonOpts.pressed and noTip, and SectionHandle.setOpen and countEl, are members of exported interfaces or opts of the exported iconButton and makeSection. The finding is only LIKELY, and removing them changes an exported signature. countEl is also used inside makeSection. Skipped as not provably safe under the contract.
- L6uic-10: Dropping 'export' from fmtSpeed, fmtRate and playbackNote is not an allowed removal class (they are used inside transport.ts and are not dead). Skipped as outside the contract.

### F6uid
- L6uid-02: The finding is only that the export keyword on randomSeed is not needed. The contract allows removing unreferenced code but does not list un-exporting a used function, so I left it alone. It is harmless either way.
- L6uid-03: The null return in sceneWords and the if (words) guard in SCENE_ITEMS are a defensive guard for a future scene id, not a provable no-op. The label is read through a Partial cast, and whether a label exists depends on the SCENE_LABELS content in sim/scenes.ts, outside my file set. Skipped as not certain.

### F6ra
- L6ra-01: UNKNOWN class, not dead. The handcart renderer is reachable through facilities.ts cartOut, registry world.carts.push and the staged scene. The audit itself says unproven either way. Kept the whole carts.ts renderer.
- L6ra-03: doorL non-arch else branch: arch is a public option on the exported doorL and DoorOpts. Removing the branch would change what the function does for arch false, which is an API change to an exported function, not a zero reference removal. Kept.
- L6ra-04: The always-passed shutter and the never-passed bars option are live reads in the exported windowL (if (o.shutter), o.bars !== false). Only the unused lit field was removed.
- L6ra-05: BrickStyle.mortar and the tone, ridgeCol and boards defaults are live parameters and defaults on exported functions that every current caller happens to leave at the default. Changing them alters exported signatures, so skipped.
- extra: Scanned bld_common, bld_food, bld_home, bld_work, buildings, camera and carts for '&& false', '|| true', 'void x;', '* 0' terms and empty if blocks. Found nothing plainly dead. tsc_unused lists no other issues for these files.

### F6rb
- L6rb-01: The 'fire' Site branch in SiteDrawer.draw is kept. SPEC.fire, STRUCT typing and Site.type (a saved BuildingType) can still carry a fire site from an authored or old saved world. The audit says no current code creates one, but I cannot prove no save does, so it stays.
- L6rb-02: PILE_ORDER and stackKindOf slots for handles, clay, iron, charcoal, ore, flour and bread are kept. Site.delivered is saved state, and act_resource.ts:605 can deposit uncapped to a site. The audit itself says LIKELY with lowered severity. Removing the slots could change what an old save shows.
- L6rb-04: The hearth-fit site drawn as a full home rebuild is a display design question (UNKNOWN class, and inspect.ts reads Site.improvement), not dead code. Nothing is removable.
- L6rb-05: The 'dig' pose is kept, with the spade and non-clay colours. PoseKind 'dig' is a field type in types.ts and could come from a saved person.pose. The audit marks old saves UNKNOWN, and a non-clay branch is not provably unreachable.
- L6rb-07: Site.variant is a stored, saved and hashed field in types.ts, which I may not edit. The renderer's rehash at construction.ts:142 is the display behaviour, and changing it would change what is drawn.
- L6rb-11: allowedFraction and missingMaterials are used inside construction.ts (siteIsWaiting, badge). The finding is only that they are exported. Removing 'export' is not on the allowed list, and a test or script could import them, so they are left as they are.
- L6rb-12: Spec.frame 'timber' versus 'posts' is a type-level distinction in a data table. Merging the values would not remove a dead statement, and the audit does not ask for it, so it stays.

### F6rc
- L6rc-02: goods.ts StackKind 'grain' arm and the non-flour sackPile variants are part of a type union and switch that a future caller could select, and the palette entries are data; I did not prove them unreachable, so KEEP.
- L6rc-11: Smoke fx nearest-chimney fallback in effects.ts is reachable in principle (older saves without fx.a, building removed between emission and frame), and the audit itself says it cannot be proven dead; KEEP.
- L6rc-12: Needless export keywords on logPile, cutStone, stoneHeap, BoxStyle, OBoxStyle and roundRect: the code is live and removing an export keyword is not in the allowed removals, so left as is.

### F6rd
- L6rd-01: Real visual misplacement (groundShadow at map origin, cy = y+2-y), but fixing it changes rendered pixels and y+2-y may not equal 2 in floating point, so it is not behaviour neutral. Left for a separate display fix.
- L6rd-04: The p.alive guard in hallOccupied can be false for a loaded save with alive:false, so it is not provably dead. Kept.
- L6rd-06: The default branch and Proxy fallback in structures.ts are the intentional path for a saved building with an unknown type string, and save.ts does not validate the type. Kept.
- L6rd-08: drawSource is an exported class method, and blob is an exported function, so their signatures must not change under the contract. Kept.
- L6rd-09: Only export hygiene; dropping 'export' on RES, rgb, blob, ClassicKind, WorkState, View, Anchor, StructMeta, scenery.cache is outside the allowed edits (exported symbols that are referenced or may be used in lab or review scripts). Kept.
- imports-all-files: Checked every import in scenery, structures, speech_layout, sprites, terrain, workstate: all are used. shore_foam.ts has no unused items. Nothing to remove.

### F6app
- L6app-04: httpModel is an exported function (inhabit.ts:78). The brief says not to change the signature of an exported function, so the default url parameter stays.
- L6app-06: The Autosaver same-tick guard (autosave.ts:24) is not dead. The audit itself shows it is reachable in production after loadAutosave restores a world at the last autosaved tick. It is a guard with behaviour, so KEEP.
- L6app-07: The finding says no export is dead. The save.ts `replacer` export and the manualModel export are used by their own file or by tests. The brief rules out removing exports that tests reference, and an export used only inside its own file is not zero-reference code. Nothing to remove.
