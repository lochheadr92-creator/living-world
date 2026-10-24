# Inhabitant-perspective audit — baseline (read-only)

Branch baseline: 054cf328927fe307752c718efe410b53dc79c1eb (version 13). This document is an initial static inspection, NOT a simulation run. Codex work in progress is not represented.

## Verified from repository source
- `src/sim/decision.ts`: generateOptions assembles survival, work, production and social options; rankOptions applies child, relief, critical-need, wolf-threat and cooldown constraints before scoring.
- `src/sim/decision.ts`: lastDecision stores selected option, up to four alternatives, blocked options, a reason, known-place count and currently seen count.
- `src/sim/inspect.ts`: PersonView exposes needs, activity, decision, plans, relationships, requests, memories, knowledge, household and relationship history.
- `docs/INHABITANT.md`: optional external controller receives a restricted observation; global event feed and unrestricted inspector are not appropriate as first-person evidence.
- `README.md`: beliefs can be seen or told, are timestamped and can go stale. The engine is designed for local knowledge, not global omniscience.

## Questions for empirical follow-up
1. Pick a stable seed and inhabitant ID. Capture the person's legitimate observation and state at fixed tick intervals, plus every decision transition.
2. For each decision, trace observed need/belief/relationship -> eligible options -> chosen action -> execution outcome -> updated memory or relationship.
3. Identify repetitive loops, stranded plans, unfulfilled promises, stale-information mistakes, missed social opportunities and differences in behaviour after new social history.
4. Compare same seed and tick window against pre-version-13 baseline. Do not compare across rules generations without explicitly pinning versions.
5. Check inspection purity by hashing world before/after observational reads; check save/replay and same-seed reproducibility.
6. Produce a first-person diary only from actual captured observations and events, with exact tick references and uncertainty where no inner state is represented.

## Current limitations
GitHub file reads alone cannot execute the simulator or access an uncommitted Codex workspace. No runtime observations, pass counts, or inhabitant diary are claimed here.

## Next executable action
Run a pinned, headless seed and capture one person's observation/decision/outcome trace. Keep the harness observer-only and compare its run to an identical run without inspection.
