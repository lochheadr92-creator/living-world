# Review notes (main reviewer) — Living World, main @ b2cf812, rules 115

## Baseline
- toplevel C:/dev/Claude Experiment/living-world-integrate, branch main, HEAD b2cf812 == origin/main (0/0), no tracked changes, ~100 untracked evidence dirs/logs.
- 22 worktrees; original checkout living-world is on deepseek-b1 with modified .gitignore/AGENTS.md — not the target.
- tsc --noEmit exit 0. vitest: meat/helper/longrun 15/15; save/economy/v107/v114/v115 20/20; golden/purity/determinism/rules_version/intentions/projects/plan_reconsider/promise_targets/viewer_purity/inspect_work_purity 115/115.
- Three forest .err files at root show the historical "Invalid helper direct receipt" crash (fixed 0182849).

## Own evidence produced
- UI: scratchpad/review/ui/out-1793459218108/ (review_ui.mjs): ordinary forest world, 4,800 ticks in the real page; 6 inspections all pure (serializeWorld, hashWorld, RNG identical); playback 8x gave 242 ticks in 3 s.
- tests/zz_review_main_tool_capacity.test.ts -> tool_capacity-{forest,river,meadow}.json
- tests/zz_review_main_site_fate.test.ts -> site_fate.json
- tests/zz_review_main_liveness.test.ts -> liveness-*.json

## Finding M1 (P2, runtime defect, reproduced): hand-tool plans adopted without carrying-capacity feasibility
- craft requires every input carried at once: act_build.ts craft.begin (p.inv.wood>=r.wood && p.inv.stone>=r.stone); craftOption only offered when haveWood>=r.wood && haveStone>=r.stone (options_work.ts ~1005).
- elder cap: CARRY_CAP.elder 8 * elderFactor 0.75 = 6 (people.ts:66-71, life.ts:79); youth 9. Recipes (constants.ts:334-345): axe/hoe/spear 7 weight, hammer 8, pick/saw 10, basket 6.
- wantedTool (options_work.ts:374) / toolWanted (intent.ts:629) / adoption (intent.ts:1252-1290) have no capacity check. gatherMaterial blocks the missing input "no room in my pack for one stone" (options_work.ts:442) because the plan's own wood fills the pack; stepKey null, blocked ''.
- Measured (3 seeds x 12,000 ticks): forest 2/33, river 3/34, meadow 2/33 tool plans infeasible, all elders, all adopted at tick 0, all expired "never got round to the X (still short …)"; river Yan re-adopted an infeasible axe plan at 9817. Plan holds 2 wood reserved (freeOf) for 2 days each time.
- Viewer: panel says "Make a hoe. Step: get 1 more stone — settled on, not started. Still needs 1 stone." (Petra). No cause shown; rules 34 reconsider does not cover it.
- Contract: PLAN_RECONSIDER.md (impossible plans relinquished with reason), PRODUCT_VISION understandable choices.

## Finding M2 (P2, knowledge/viewer-truth defect, reproduced): completed site reported as "no longer there; fate unknown"
- promise_targets.ts observePromiseTarget records 'observed absence' whenever the site id is gone and the person is within sense radius; it never checks whether a building now stands on the footprint (visible, in p.seen / refreshBeliefs adds it). 'completed here' only for the finisher (act_build.ts:128).
- Forest seed: site 2280 (Linden hut, created 3035) finished by Petra at 5714 ("Petra finished a hut for the Linden household"); hut 3271 on same footprint; Bram arrives 5728 at (45,43) and records absence; commitment moot "I saw that the promised site was no longer there; its fate is unknown. My contribution remains 2/4"; log "I do not know why". Hana's household homeId=3271.
- Contract: PROMISE_TARGETS.md "personally discovered target changes… truthful settlement"; PRODUCT_VISION honest descriptions.

## Minor
- history.ts:101: `${Math.round(d/100)} hundred ticks ago`.replace('1 hundred','one hundred') => "1one hundred ticks ago" for 1,050..1,149 ticks (seen in Bram's panel). P3.
- Stock plan sentence mixes two quantities: step "take the food home (8 more to put by)" (intent.ts:573, target minus believed store) and "0 of 12 units put by so far" (inspect.ts:368, own worked). Thea panel. P3 readability.
- README "none of it is scripted" vs lifecycle.ts adoptOrphans (world process assigns a child to the closest generous adult without contact/decision); README promises carts/smithy/iron axes "over weeks of watching" while every ordinary 45-day run has zero carts.
- AUTONOMY.md R10 says tools "never mended" but options_work.ts:353 mends with wood/handles (doc stale).
- clearStaleSites: SITE_PATIENCE 4 days; the Bram case was NOT a sweep (site completed).

## Finding M3 (P2, runtime defect / livelock, reproduced): "Break ground for a new plot" retries the same unreachable tile for days
- options_work.ts:1150-1180: till:new activity stands at (spot.x+0.5, spot.y+1.5) = tile SOUTH of the plot; farming.ts:80-115 findPlotSpot checks only the PLOT tile (free GRASS, explored, waterDist>=2, 3..13 from home) and scores deterministically (hashUnit(p.id,x,y)); never checks the standing tile or reachability.
- activities.ts:248-253 planPath fails -> 'blocked' -> endActivity failed 'no way to get there' (activities.ts:499-501); opt cooldown only 80 ticks (activities.ts:422); noteFailure never recorded (targetId 0; recentFailure(-2000) only when no spot at all) -> same tile chosen again.
- Forest: Isla@46,40 fails 13 times (ticks 3204..9827+), 2 successes vs 14 failures in 12,000 ticks; standing tile (45,42)/(46,41) lies in / beside the Linden hut site footprint (44..45,42..43), walk=false/free=false. River: Jax@49,37 fails 9 times (8050..10687). Liveness probe: forest till endings 2 ok / 19 failed / 16 interrupted; river 7/9/15.
- Consequence: household fields not broken for days in forest; farming is the winter-grain path (not a proven famine cause). Viewer: repeated "Gave up 'Breaking new ground': no way to get there" log lines.
- Fix: require walkable/reachable standing tile in findPlotSpot (or choose best walkable neighbour and persist it), and record a failure against the tile on path failure. Regression: candidate tile whose south neighbour is a site footprint is not chosen; a path failure prevents immediate re-pick.

## M2 strengthened
- act_build.ts:85-87: a builder WORKING at a site when another builder completes it ends 'partial: the site is no longer here; its fate is unknown' and records 'observed absence' while standing at the finished hut. Liveness probe: "Building the hut/lean-to | partial | the site is no longer here; its fate is unknown" 6 (forest) + 6 (river) in 12,000 ticks. Before rules 83 the ending was 'done' (a.cycle>0). So rules 83 made ordinary co-building endings less truthful.

## Current-code cost samples (mine)
- Fresh Large meadow rules 115, day 1 (large-cost.json): tick p50 3.46 / p95 5.89 ms, inspect p95 2.9 ms, serialized 6.56 MB (rules-63 fresh Large was 3.0 MB), save 61 / load 164 ms, reload exact.
- Retained mature Large save (rules 109, day 45.1, 110 alive) loaded under current code (mature-large.json): load 587 ms, 21.9 MB, save 160 ms, tick p50 8.5 / p95 13.5 ms (240 ticks, this machine idle-ish), inspect p50 3.0 / p95 6.8 / max 22 ms over 110 people, entity inspect p95 0.25 ms; purity holds (full JSON + hash) after inspecting everyone; conservation OK. Counts: beliefs 67,328 (612/person), cooldown keys 13,126 (119/person), whereabouts 6,975, failures 1,973, requests 260, events 500 (cap), chronicle 400, log 60/person (cap), tools 263, carts 0, sites 11, meals 35, socialMemory 3,104, heard 3,274.
- Product default immigration is ON (profiles.ts:47) but every retained long run uses immigration:false.
- Shared meals: 12,000-tick forest had 2 "lay the table" successes, river 0 (liveness probe).

## Concurrent reviewer (provenance)
- review_evidence/whole_repo_b2cf812/ written 00:29–01:26 on 2026-11-01 by another process during this session (its repository-baseline.log lists my zz_review_* files). Not mine; not modified.
- Its probes, verified against code: (a) resumeSuspended drops an expired or target-less suspended activity with no endActivity (activities.ts:577-578): no lastResult, no log, no promise attempt; ledger shows "ending not recorded" (history.ts:104). Ordinary river 12,000 ticks: 2 losses. P3 truth gap. (b) giveBirth writes log/thought/lifeEvent to a father 57 tiles away (lifecycle.ts giveBirth: addLog/think/onBecameParent for father without distance/contact). P3 knowledge leak. (c) adoptOrphans moves a child into a household 54 tiles away with logs on both, no contact (lifecycle.ts adoptOrphans). Documented world process; contradicts README "none of it is scripted".

## Agent D verified (8/8 tests re-run; lines read)
- D1 welfare.ts:129 (!subject||!subject.alive -> continue), :43/:138 isDependent live health. D2 optutil.ts:156 dependents = live isDependent over all members; options_survival.ts:269 keep = dependents*2. D3 social.ts:443-453 'enough' from site truth. D4 options_work.ts:1862-1863 true hhId with false comment. D5 options_social.ts:577-582 q.relations[p.id]. D6 batch_plan.ts:248-253 / production.ts carts & site truth. D11 perception sees store contents through walls (design).
- My severity: cluster P2 (contradicts PRODUCT_VISION "Nobody consults the world's true state to plan"; D2 affects survival arithmetic). D's liveness table at rules 107: whereabouts.from 0, tradeLeads 0, customers.supplied 0, careHandback 0 in 45 days.

## Agent A/C/G/H verification
- A1 (bench-loan tool count/record split): tests 5/5 re-run; code confirmed (toolreg.ts:38-56 guard; economy.ts transfer moves count; tools.ts breakTool ledgers 1 regardless of takeFrom). NOT observed in 6 worlds (mature109 Large 263 tools, forest107 d18, batch rejected, 113 river/meadow, fresh 3x5d). Rate P2 (latent integrity hazard, staged repro), not P1.
- A2 (flood writes tool counts off, records orphaned): NATURALLY OCCURRING. current113 forest day-45 (living-world-continuation/.../current113-forest-45/final.json): toolReport false, 7 records (axe,pick,hoe,4 baskets) held by absent piles 19929/19575/19595/19587; ledger.spoiled axe1 pick1 hoe1 basket4, reasons xflood 44, lastFlood 107167. Conservation ok. P3 registry defect, ordinary.
- C1 lab.mjs: confirmed static (code only in console line). C4: cited logs absent (confirmed ls). C6: v115ref explicit asserts non-discriminating (digest-only gate) confirmed by reading helper.
- H1: confirmed — none of mature109 / forest113 / forest107 saves contain "__cols" or "__bel"; rich saves are unpacked. P2.
- G: purity sweep 0 diffs; G1 listener "why" shows unrelated decision (P2 presentation); G2 stale "Home exit is blocked"; G3 = suspended drop; G5 make()-failed options recorded as passed over; G6 openConversation discards initiator act.data.
