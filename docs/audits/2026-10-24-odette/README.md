# Odette manual inhabitant audit 24 October 2026

Odette could complete a coherent day of gathering, toolmaking, helping a neighbour, family conversation, sleep and household food delivery. The main runtime defect was an overnight shelter action that restarted its waiting progress after a conversation and then expired in daylight. Several smaller interface problems made otherwise working behaviour harder to understand.

This is an actual browser session with manual decisions, followed by deterministic replay and a diagnostic replay. It is not evidence that the autonomous chooser would make these choices, or that version 13 improves aggregate outcomes.

## Reproduction and authority

- Repository: `https://github.com/lochheadr92-creator/living-world.git`.
- Audited branch: `nova/inhabitant-perspective-audit`, exact source commit `a69c30b9e065c4d817392e35538f8bd6e0b2189c`.
- This branch adds baseline documentation and an observer trace runner over `054cf328927fe307752c718efe410b53dc79c1eb`. Other concurrent civilisation work is not represented.
- Isolated checkout: `C:\Users\RJLoc\.codex\worktrees\inhabitant-audit\living-world`. Initially clean, detached at the audited commit. The original checkout and other worktrees were not edited or switched.
- Read authority: `AGENTS.md`, `WORKFLOW.md`, `PRODUCT_VISION.md`, relevant development policy, inhabitant architecture and `NOVA_INHABITANT_BASELINE.md`.
- Browser URL: `http://127.0.0.1:5284/?inhabit=&manual=1&seed=meadow&size=town&from=0&days=2`.
- Actual window: tick 0 to 2584, approximately Day 1 07:11 to Day 2 09:02. The URL allows two days; the audit stopped after this shorter window.
- Person: Odette, ID 1311, adult age 23; Fern household; partner Zed, children Isla and Lena.
- Settings: town, 100 starting people, natural scene, rich dynamics, rules version 13, scaled rules, immigration enabled, harsh disabled.
- Inputs: 13 applied manual choices; 14 recorded decision calls because the final call is still deferred. Zero fallback, rejected, lagged or engine-override decisions. No external model API calls.

I selected only offered keys, using the controller observation exposed by the page's **Answer from a chat** panel. The global feed, map and inspector remained visible as part of the interface; they were not used to choose actions or to supply first-person knowledge. Subsequent source inspection and diagnostic replay are explicitly separate evidence.

## Diary from Odette's permitted observations

The descriptions below paraphrase actual observations; they do not invent thoughts or feelings. Result ticks refer to `doing.lastResult.t` or `lastInteraction.t`; the transcript usually observes that result at the next decision tick.

| Decision tick | Choice and reason | Observed consequence |
|---|---|---|
| 0 | Chop tree 488 for the existing pick plan, while needs were comfortable. | At 117, gathered 2 wood. Load rose from 1 to 5. |
| 118 | Break stone at known outcrop 1143 for the same plan. | At 326, acquired 2 stone. Inventory: 1 grain, 2 wood, 2 stone; load 11/12. |
| 327 | Drink at known shore 1000252 as thirst fell. | At 502, drinking succeeded; next observation thirst 99. |
| 503 | Eat from home store 1310; carried grain was reserved for dependents. | At 609, meal succeeded; next observation hunger 81. |
| 610 | Make the now-offered pick. | At 700, pick made; at 701, plan marked finished. Wood and stone gone, one pick present, load 1/12. |
| 701 | Gather berries for the household reserve. | At 763, gained 2 berries; partial result, "nothing left". Local memory says the bush was picked clean. |
| 764 | Help finish nearby lean-to site 1888. | At 900, "Finished building the lean-to." No claim here that Odette supplied all materials or did all construction. |
| 901 | Chat with daughter Lena. | At 987, friendly interaction. Social need rose from 47 to 67 across the action. |
| 988 | Sleep at home after energy fell to 30. | At 1672, success, rested; memory records 65 energy recovered; next observation energy 94. |
| 1673 | Stay at the lean-to until light. | Zed gave 2 fruit at 2207 and relayed news at 2229. At 2401, shelter action failed: "took too long". |
| 2402 | Drink after the overnight wait left thirst at 30. | At 2485, drinking succeeded; next observation thirst 100. |
| 2486 | Eat at home after hunger fell to 31. | At 2573, meal succeeded; next observation hunger 89. |
| 2574 | Bring carried food home. | At 2582, deposited 3 fruit. Two berries remained carried; this action did not deposit every food item. |

Final permitted observation at tick 2583: health 100, food 88, water 96, energy 93, warmth 88, safety 84 and company 74. Inventory contained a pick and two berries. Odette remained alive and the browser was left paused at the next manual decision.

## Findings

### F1 Medium runtime bug: conversation makes night shelter restart and time out

**Observed:** the choice at 1673 promised staying until light, but the result at 2401 was failed, "took too long". This was reproduced by replay, not inferred only from wording.

**Cause established by diagnostic replay:** the shelter activity has duration 607 and expiry 2400. It reaches progress 487 by tick 2160. At 2177, conversation suspends it and the suspended progress becomes zero. At 2246 it resumes with duration 607 and the same expiry 2400. At tick 2400, progress is only 154 although light is 0.94; the expiry check then ends it as a failure. See [shelter-replay-trace.json](shelter-replay-trace.json).

The owning path is `options_survival.ts` `optShelter` -> `act_misc.ts` rest handler -> `activities.ts` `suspendActivity` / `resumeSuspended` / `stepActivity`. Shelter uses a duration-based rest action. Suspension clears progress; the rest handler checks duration, not the dawn boundary; resumption retains expiry.

**Smallest repair direction, not implemented:** give this shelter wait an explicit absolute completion boundary, or preserve its remaining duration correctly across conversation. Do not change all work suspension semantics merely to fix shelter. Add a contract test that starts shelter, interrupts it with a real conversation near dawn, resumes it and verifies an appropriate daylight outcome rather than timeout. Include transcript/save compatibility because changing this path changes deterministic outcomes.

### F2 Medium interface issue: crafting silently disappears while every need says okay

At tick 327 Odette had the exact wood and stone for her pick, but no craft option and no blocked-crafting reason. At tick 503, after drinking, it was still missing. Both observations labelled every need `ok`. After eating, crafting appeared at 610 and succeeded at 700.

Source explains the suppression: `options_work.ts` `optCraft` returns when hunger or thirst drive exceeds 30, before adding any blocked explanation. This is a working needs gate with missing explanation, not a stuck recipe or capacity failure. Record why the intended crafting step is unavailable using the existing blocked-action presentation. Preserve the threshold unless a separate behaviour change is authorised.

### F3 Medium protocol ambiguity: different options share the same choice key

At tick 118, keys `gather:838`, `gather:853` and `gather:890` each appeared twice: once for stocking the household and once for easing hunger, with different goals and amount limits. At tick 1673, multiple berry choices again shared keys across those goals. The visible buttons also omit the goal.

`decision.ts` resolves an external pick with `ranked.find(x => x.key === choice.key)`. Therefore the key cannot select the later alternative unambiguously. This audit did not attempt to select the second duplicate or prove a resulting wrong transfer. The duplicate identity and first-match resolution are established; the downstream behavioural impact needs a focused test. A repair needs canonicalisation or unambiguous identifiers while preserving old transcript interpretation.

### F4 Low interface issue: the short turn summary reports an older result after conversation

At tick 988 the latest interaction was friendly chat with Lena at 987, but `doing.lastResult` still described building the lean-to at 900. `src/ui/inhabit.ts` builds the short "Last:" line exclusively from `lastResult`, ignoring `lastInteraction`, even though the restricted observation exposes both. The fuller transcript correctly records the conversation as a friendly partial outcome. Prefer the newer relevant event in the short summary; no social mechanics change is needed.

### F5 Low readability issue: durations use a different clock without saying so

Stone gathering spanned roughly 08:22 to 10:28 in the world clock but was advertised as about 21s. Memories use the same seconds/minutes convention. `secondsText` documents these as seconds at 1x; `agoText` also divides ticks by 10. At 16x these are neither elapsed wall time nor inhabitants' clock time. This is a presentation convention, not evidence of bad simulation timing. Label the time basis, or consistently provide an in-world duration for inhabitant-facing text.

## What worked and what remains uncertain

- Toolmaking had visible physical costs and an explicit completed plan. The 11/12 loaded-material state did not prevent the eventual craft.
- Gathering depletion produced an honest partial result and a memory of the empty bush.
- A neighbour's shelter could be helped to completion through the offered action.
- Family conversation improved company; Zed later independently initiated food sharing and conveyed attributed news. The run demonstrates a local social chain, not measured causal benefit from version 13.
- Household food delivery moved three fruit from inventory into the home store and recorded the amount.
- Sleep recovered energy. The home was a lean-to and the result said "Sleeping by my lean-to"; this does not establish enterable-house indoor occupancy.
- The final observed needs were healthy. No claims are made about longer-term survival, village-wide resource conservation, save/load continuation, wolf defence, multi-seed effects or comparison with pre-version-13 rules.
- The observer-only runner added by the branch was inspected for scope but was not the method used to make these manual choices. This report does not certify that runner.

## Evidence and verification

- [transcript.json](transcript.json): original UI export, including settings, every offered observation, submitted reasons, outcomes and final hash. Its source fingerprint field is absent, as expected for browser exports; the audited Git commit above pins source separately.
- [observations.json](observations.json): captured controller observations read during the session.
- [replay/replay.txt](replay/replay.txt): normal replay passed at tick 2584, recorded and reproduced hash `596d04e8`, 14 calls consumed, zero overrides. The fourteenth call is deferred, not an additional manual choice.
- [trace-replay.ts](trace-replay.ts) and [shelter-replay-trace.json](shelter-replay-trace.json): observer callback used to diagnose F1. This replay also ended at `596d04e8`. That establishes matching compact hash and transcript checks, not full serialized-state equality.
- [focused-tests.txt](focused-tests.txt): **57 tests passed across 3 files**, 11.41 seconds. These existing tests passed despite the reproduced F1 failure; they do not establish the interrupted shelter contract. The run emitted Vite extensionless-import warnings and a Node timeout-overflow warning; both are retained in the log and were not investigated as part of this audit.
- [sleep.png](sleep.png), [shelter-timeout.png](shelter-timeout.png), [final.png](final.png): rendered evidence. The first shows the completed sleep and next decision, not an indoor-occupancy proof.
- Browser console query returned no captured error/warning entries during this session. No full suite, build, ensemble or save/load test was run for this documentation-only audit.

Reproduce from the audited checkout:

```powershell
npx vite-node scripts/inhabit.ts -- --mode replay --transcript docs/audits/2026-10-24-odette/transcript.json --out docs/audits/2026-10-24-odette/replay
npx vite-node docs/audits/2026-10-24-odette/trace-replay.ts
npx vitest run tests/night_plan.test.ts tests/inhabit_manual.test.ts tests/inhabit_manual_reliability.test.ts
```

## Change scope

Only this audit record, recorded evidence and its read-only replay diagnostic were added. No existing simulation, UI, test, configuration, golden or save-format file changed. Findings are recorded for follow-up; no repair is claimed.
