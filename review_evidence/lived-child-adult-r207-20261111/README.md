# Rules 207: following a child and her mother

11 November 2026. Assessment, no rules changed. Source HEAD `1957b8951c33048c9abac0a6195c6919288f80ad`, unchanged at completion. Existing untracked work was preserved. The required basic-memory-local MCP server was unavailable; Brain was neither read nor updated.

## Method and limits

One ordinary Normal meadow world, rich rules 207, arrivals on, harsh off, ticks 0–36,000 (15 days). All ordinary capabilities enabled; no laboratory removals, manual decisions, supplied resources, or staged opportunities. Selected before stepping: first founder aged 7–10, Mona #1024 (9.445), and first adult aged 16–54 in her household, her mother Maren #1022 (27.547). Both belong to Thistle #1020. The assessment reads their autonomous lives; it does not claim the assessor controlled their decisions or watched rendered playback.

`probe.ts` reads each tick, captures changes to lastDecision/lastResult and personal logs, records daily snapshots, and retains the final world. `trace.jsonl` is the detailed record; `summary.json` holds initial/final states and counters; `world.json` is the save at tick 36,000. Time budgets count the active kind each tick (conversation takes precedence), including travel within activities. They are not hands-on labour measurements. Result counts are observed lastResult changes, not guaranteed exhaustive activity-end counts: more than one result can occur during one simulation tick. Snapshot days are elapsed simulation days.

Reproduce from this checkout:

```powershell
node node_modules/vite-node/dist/cli.mjs review_evidence/lived-child-adult-r207-20261111/probe.ts
```

This overwrites this assessment's outputs. Preserve the directory first if retaining the original run.

## What the lives show

Both remained alive with health 100 throughout the sampled days. Mona's per-tick minimum hunger was 36.870; Maren's 28.140. Mona spent no awake tick below 30 hunger; Maren spent 86 of 25,387 awake ticks (0.34%) below 30. Neither went below 10. These are explicitly chosen reporting thresholds, not the engine's hunger-drive boundary (62) or critical hunger (14). They do not establish that either person was always comfortable.

Mona gathered 107 units of food, completed 25 recorded trips bringing food home, and spent 23.10% of all ticks gathering and 6.43% depositing. She also spent 14.41% in conversation, 5.88% approaching/socializing, 18.82% resting and 22.22% asleep. Recorded completed childhood experiences: five guessing games (Abel, Rafe three times, Wes), two foraging practices with Yara, and one family-time session with Maren. Another game with Wes was in progress at tick 36,000. Conversations include refusals and other subjects; their time is not all successful play. Mona did no building, crafting, farming, wood gathering or stone gathering in this trace.

The childhood weakness is visible despite adequate food. Mona starts with foraging 0.8113, already above Maren's 0.6212, and ends at 1.2463 against Maren's 0.8062. Twelve recorded lessons are declined because the adult cannot teach her more: Dax three, Maren four, Ivo two, Alma two, Quinn one. Two real lessons succeed with Yara. The trace therefore shows both a working teaching path and repetitive unsuitable requests. `src/sim/childhood.ts` checks teacher skill when the session begins, while `wantsChildTime` does not screen teacher skill; `src/sim/act_resource.ts` awards 0.004 skill per gathered unit. The refusal loop is consistent with these paths; it is not evidence that all teaching is broken or that rules 207 introduced it.

Mona also makes 15 recorded choices to ask adults for wood/stone for household sites. For example, at decision tick 5487 she asks Maren for stone because the building needs it and Maren is carrying some; Maren promises four stone at tick 5523. After the hut is finished, Maren records that three of four promised stone were delivered and the completed site cannot receive the rest (tick 7938). This is substantive project coordination by a nine-year-old, even though direct heavy work is prohibited. The material-request loop in `src/sim/options_social.ts` checks household-site knowledge and need but has no age gate. This is a design question about childhood responsibility, not an established loss or deadlock; requests can be useful, as this sequence demonstrates.

Maren has a connected adult life. She makes a basket (tick 562), finishes the family hut (7925), finishes the timber yard (14502), makes a hammer (17015), attends the market (22162), produces bast fibre (28709), weaves a garment (28809), takes the garment (29065), finishes the cellar (34560), and makes a spear (34644). The family moves from lean-to #1021 to hut #4038 by day four. The hut persists at day 15; Mona sleeps and rests inside it and takes refuge there. Maren's home goal is fulfilled and a later goal is respect. She completes nine recorded meals at home. Her work has consequences beyond a progress label.

There is friction: repeated partial hut-building results for missing materials; a quarry job refused because its output store is full; empty-well and depleted-source failures; and social approaches lost to location, competing needs or a busy recipient. However, the home, yard, garment and cellar do finish, so this trace does not support a general claim that projects cannot recover. The garment's stated motive includes insulation for herself and the child; this run proves production and collection, not delivery to Mona (Maren retains it at the end).

## Assessment

This household is viable over the observed window and has readable, persistent connections among work, home, care, danger, company and production. The adult experience is substantially richer than survival alone. Childhood remains overly responsible and narrow: substantial self-provisioning, repeated impossible lessons, and construction-material coordination, with one repeated game as the available play type. Play and family time exist and succeed, so calling them absent would be false.

Priority suggested by this assessment: preserve the successful adult chains; address teacher selection/refusal memory and explicitly decide the desired boundary for children's provisioning and site-material requests, in the existing childhood-plan discussion. No implementation or owner decision is implied.

## Verification and exclusions

- Daily and final observer calls left `hashWorld` unchanged.
- Saved state loaded and matched the live world, then matched on every one of 120 continued ticks. The probe uses the serializer's default **format 4**, preserving rules 207; this is not a format-5 validation claim.
- Conservation report after continuation: `ok: true`, no differences. No deaths in this one settlement/window.
- No rules, production code, tests, or pre-existing files changed. No commit or push. Only this evidence directory was added.
- No full suite, rendered browser review, matched rules-206 control, multi-seed comparison, lifetime aging, or mature-world assessment. These observations cannot establish general survival benefit or attribute changes specifically to rules 207.
- Maren owns her timber yard; the quarry ends communal. Her successful workplace use therefore does not demonstrate the new guest-access route. The existing rules-206 charcoal regression remains documented in `docs/CARRYING.md`; it was not rerun or resolved by this assessment.

The prompt archive refresh succeeded at the start (coverage remains limited to available histories). Brain continuity is incomplete because the local MCP server is not available in this session.
