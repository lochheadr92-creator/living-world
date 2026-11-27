# Review repairs of 28 November 2026 (rules 282, and two outside the rules)

Source: a read-only review of `main` at `185c3ea0` (rules 281), pasted by Ryan on 28 November 2026. Seven findings. Each was checked against
the code before it was repaired; each repair has a staged test that shows the old behaviour at 281 where it could be staged.

| # | finding | repair | where |
|---|---|---|---|
| 1 | a manual step that throws did not fault the world, so a broken world could replace a good save | `Game.stepOnce` catches and calls `reportFault('world')` | `src/app/game.ts`, commit `0fa737bf`, no rules number |
| 6 | a loaded earlier world kept the old pose clocks of people with the same ids | `CharacterRenderer.resetWorld` on a world change | `src/render`, commit `0fa737bf`, no rules number |
| 5 | bedtime filtered `converse`, but chats are offered as `socialize` | part `chat`: a socialize option aimed at a little one after dark is dropped unless urgent (request, info, warn, ask_info, check_in, offer, return_care, report, the cancels and delays) | `bedtime.ts`, rules 282 |
| 2 | a walker crossed a site laid across a route planned before it | part `route`: a step from a standable tile into a solid one that is not the walk's end plans the route again, at most 3 times a walk | `activities.ts` stepTravel, rules 282 |
| 3 | an empty jar could not take water when the rest of the pack was full | part `jar`: the room for water counts the jar's free allowance when the world is known (transfers, natural water, `invRoom`) | `economy.ts` roomFor, rules 282 |
| 4 | an inherited loan kept a return promise to the dead lender, which lapsed | part `loan`: the borrower's return promise passes to the heir with the loan | `tools.ts` toolsOnDeath, rules 282 |
| 7 | a wolf's search that ran out of budget was remembered as "unreachable" | part `wolf`: only a search that ran out of tiles is remembered | `wildlife.ts`, `pathfinding.ts`, rules 282 |

Lab arms: `rich-no-review-repairs` and `rich-no-review-repairs-<chat|route|jar|loan|wolf>`. Tests: `tests/review_repairs.test.ts`,
`tests/frame_loop.test.ts`, `tests/character_world_reset.test.ts`.

Limits and choices, written down:
- `loan` makes the promise over at the moment of the death, before the borrower may know of it. The review asked for respect of when the
  borrower learns; that would need a new knowledge step and was not built. The borrower may set out for the heir without having heard.
- `jar` applies where the world is passed to `roomFor`. About 30 other callers estimate room without the world; they are not water transfers.
- `wolf` may cost more searches: a wolf whose search runs out of budget searches again on its next step instead of waiting for the ground to
  change. Not measured.
- No run measured how often any of these happened in ordinary worlds, and no lab was run with the arms.
