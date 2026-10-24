# Next priority work after the current implementation

Owner instruction, 24 October 2026: record the inhabitant audit findings as the next priority work after the current implementation is finished.

**Status: queued, not started.** Finish the current civilisation implementation programme and its required verification first. This queue does not interrupt that programme, change its scope, or replace any unfinished stage with the audit repairs. Once the programme is complete, address this queue before starting unrelated new features.

Evidence: [Odette manual inhabitant audit](README.md), recorded in commit `fc04d7db45c034c5ea317086bb7533ae6e085f7f`. The audited simulation was version 13 at `a69c30b9e065c4d817392e35538f8bd6e0b2189c`; subsequent implementation may change these paths. Reproduce each finding on the completed current implementation before editing. If it is already resolved, record the current evidence instead of applying a redundant fix. Keep the original transcript and findings intact as historical evidence.

## Ordered work queue

| Order | Audit finding | Required outcome and verification |
|---|---|---|
| 1 | **F1: night shelter restarts after conversation and times out** | Preserve the intended night-wait boundary across a real conversation interruption. Demonstrate an appropriate daylight completion or legitimate interruption, rather than a restarted full duration ending in timeout. Add a focused regression through actual suspension/resumption; verify deterministic continuation and save/replay compatibility; show the corrected outcome in the page. Avoid changing unrelated work suspension semantics. |
| 2 | **F3: different offered actions share a choice key** | Establish whether duplicate keys remain and reproduce how the controller resolves them. Make each selectable alternative unambiguous, or explicitly canonicalise equivalent choices. Check differing goals and quantity limits, the UI selection path and old transcript interpretation. The audit established duplicate keys and first-match resolution, not a demonstrated wrong resource transfer. |
| 3 | **F2: crafting disappears without a blocked explanation** | When a material-ready tool plan is withheld by hunger or thirst, explain the actual blocking condition in the inhabitant-facing view. Test the blocked and restored option states and inspect the rendered explanation. Preserve needs thresholds unless a separate behavioural change is justified. |
| 4 | **F4: short turn summary shows an older action after conversation** | Use the latest relevant action or interaction outcome in the short summary. Verify that a completed conversation supersedes an older work result, with correct ordering when a later work action follows. Keep the wording grounded in recorded state. |
| 5 | **F5: time descriptions mix world time and seconds at 1x** | State the time basis clearly or use consistent inhabitant-facing world durations. Check action estimates and memory ages at multiple playback speeds. Keep simulation timing unchanged. |

## Completion record required

For each item, record current reproduction, semantic owner, the bounded change (or evidence that no change is needed), relevant contract/regression results, browser evidence where presentation changes, and remaining limits. Follow current rules-version and compatibility policy for behavioural changes; do not re-record historical references to conceal drift. Existing passing tests are not proof that these findings are resolved: the original 57 focused tests passed while F1 remained reproducible.

This priority decision schedules follow-up work. It does not claim any repair has been implemented or verified, and it does not authorise unrelated redesign, balance changes or new player controls.
