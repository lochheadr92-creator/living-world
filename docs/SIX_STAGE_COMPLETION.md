# Six-stage inhabitant programme: takeover evidence

28 October 2026. Authoritative checkout: `living-world-integrate`, continued from
`main@9871662`. The six existing commits, `gate_v35/`, and
`inhabitant_evidence/manual-stage1/` were preserved. The dirty `deepseek-b1` checkout
was not edited. Nothing was pushed.

## Findings and changes

1. **Plans and pack reservations.** The compact panel previously called total demand
   “spoken for” even when some of it was not carried. It now distinguishes carried
   reserved goods, still-missing quantities and unreserved goods, and shows the next
   plan step. It explains that individual actions have their own permission rules.
   A completed or running decision no longer leaves the old plan panel visible.
2. **Reconsideration.** Rules 34 handled unknown sources but did not resolve a known
   household site competing with an unfinished tool. Rules 36 relinquish a tool plan
   after a day when it still lacks material and holds goods needed by that known
   household site. Pending requests and live promises protect it. Existing cooldowns
   and ordinary plan adoption remain in charge; no materials move during reconsideration.
   Manual play then exposed a second obstruction: a full pack holding two wood could
   not satisfy a four-wood shelter batch and could not offer its own delivery. Rules
   37 permit that useful partial load through the existing haul action. No capacity,
   resource, survival or promise limit was relaxed.
3. **Crew re-entry.** The existing grievance and location changes are retained. A new
   save/load test follows departure, continued absence and re-entry after returning.
   No additional crew rule was necessary.
4. **Honest estimates and blockers.** Work-session and excluded-walking estimates
   remain. A dedicated build-description regression checks observation 8 versus 9+.
   Commitment `blocked`/`blockedAt` are explicitly historical records; generating an
   observer view must not clear them. Observation 10 calls them the “last reported
   obstacle” and includes age. The inspector uses the same historical wording.
   The restricted-observation test helper now uses the observer flag, preventing
   supposedly read-only tests from changing commitment records.
5. **Civic completion through use.** Ordinary Large runs did reach proposal, voluntary
   support, coordinator selection, contributions, completion, deposits and withdrawals.
   No civic score, prerequisite or completion rule was changed. Observation scripts
   retain negative outcomes and use actual resource-transfer hooks. A previous
   “no proposal” report alone cannot identify absent prerequisites versus a losing
   option; it did not justify a speculative civic repair.
6. **Achievement aftermath.** Rules 38 give a bounded, decaying satisfaction thought
   to actual contributors who are awake, outdoors and near a completed solid home or
   storehouse. Distant contributors and bystanders receive no new knowledge or reward.
   The existing home-aspiration reward covers that same home success rather than
   receiving a duplicate construction reward. After three days of fulfilment, an adult
   may take a different unfulfilled aspiration. The trait-weighted deterministic choice
   and existing goal nudges are reused. Each goal kind can enter fulfilled history once;
   if none remain, fulfilment is retained. History is saved and validated on load.
   Observation 11 exposes the current hope and fulfilled history.

## Version and compatibility boundaries

- Rules 35 retain the integration behaviour present at `9871662`. Its full serialized
  continuation was captured before the new rules. This reference does not certify the
  earlier, pre-location-fix meaning of 35 at `4929adb`; those historical artifacts
  remain tied to their original build. No saved world is silently relabelled.
- Rules 36 add competing-plan reconsideration; rules 37 add partial shelter delivery;
  rules 38 add achievement aftermath. New product worlds use 38. Full serialized
  references for 35, 36 and 37 were captured before their successor changed behaviour.
  Earlier continuation references and historical golden expectations were not rewritten.
- Protocols 17/18 preserve observation 10; protocols 19/20 use observation 11.
  Protocols 1–16 retain their observation mapping. The saved manual observation-10
  transcript replays on the updated implementation.
- `rich-no-reconsider` is the existing compound planning ablation: unknown sources
  from 34, competing plans from 36, partial batches from 37. It is not an isolated
  estimate of any one of these effects. `rich-no-achievement-aftermath` removes only
  construction satisfaction and later aspirations, with no effect below 38.

## Evidence

All generated evidence is local and retained outside the focused source commits.

| Evidence | Result and scope |
|---|---|
| `inhabitant_evidence/civic-r36-meadow/` | Ordinary Large meadow, no immigration, 30 days: 113 alive, three standing storehouses, 359 units deposited, 57 withdrawn; all daily resource conservation checks pass. Baseline before aftermath. |
| `inhabitant_evidence/civic-inhabitant-boundary/` | Ines, from an ordinary saved world: offered `collect:19436:wood`, successful collection of two wood matched to its exact activity, later observation of success; final hash and replay both `2d1dc051`, conservation passes. Uses recorded rules 36. |
| `inhabitant_evidence/achievement-verified/` | Explicitly staged, initially supplied construction scene; offered build actions complete the hut at tick 467. The inhabitant observes satisfaction. Separate home-aspiration run observes its next hope. Both transcripts replay and conserve resources. |
| `inhabitant_evidence/takeover-manual/` | Rendered Pavel case, saved transcripts and screenshots. Reservation release and actual two-wood delivery are followed through offered actions; the hut shortfall falls from eight wood to six. A separate earlier transcript preserves the unsuccessful build-session result. |
| `takeover-tests-r36.log` and `takeover-subprocess-recheck.log` | Initial broad run: five subprocess failures (timeouts and a Windows watch lock), 1,277 tests passed. The same three affected test files then pass all 30 tests with one worker. No assertion or timeout was weakened. |
| `takeover-focused.log` | 24 focused tests pass, including full serialized continuations for rules 35, 36 and 37. |
| `takeover-review-fix.log` | 33 tests pass across achievement, life, townships and inhabitant observations after excluding sleeping witnesses. |

Final verification on the frozen implementation:

- `takeover-tests-verified.log`: **169 files, 1,294 tests passed** with four workers.
  `takeover-build-verified.log`: typecheck and production build passed. Diff check passed.
- `inhabitant_evidence/civic-r38-verified/`: ordinary Large meadow, 20 days,
  **110 alive, four standing storehouses, 201 units deposited, 29 withdrawn**;
  all daily conservation checks pass. `source-sha256.json` identifies the tested source.
- Achievement transcript/replay hashes: `561f0f90` (construction satisfaction),
  `ffebd6ea` (later aspiration); conservation passes in both.
- Final Pavel manual transcript replay: **`f869b654`**, all four recorded calls consumed,
  no overrides. The earlier rules-36 transcript also replays as `df0f97da`.
- `takeover-manual/pia-next-hope.png` and `.txt`: ordinary meadow from day four,
  Pia's rendered observation says she hopes for a home and earlier achieved a trade.
  Her subsequent build action outlasted the short window; it is not completion evidence.
- The intermediate broad run overlapped a source correction and retained one stale-module
  failure. It is preserved in `takeover-tests-final.log`; the frozen-source run above
  supersedes it. No assertion, deadline, golden or historical reference was weakened.

## Review and limits

The fresh review checked ownership, release of reservations, actual transfer boundaries,
save/load, local witness eligibility, duplicate credit, bounded history, legacy execution
and observational purity. It found the sleeping-witness condition and added a regression.
The manual session found the partial-batch problem; that finding became rules 37 rather
than being dismissed as a browser or fixture issue.

These results establish the implemented mechanisms, a concrete ordinary civic chain,
and restricted-observation/replay behaviour. They do not establish improved survival,
population, productivity, civic frequency or universal completion across seeds. The
old authored gate remains legacy regression evidence. No aggregate-benefit claim is
made and no new ensemble baseline was fitted to make one pass.

Manual control used no model API. The staged/civic automated inhabitant checks use
scripted choices restricted to offered options; they are not claims about an external
language model's reasoning ability. A finished work session is not necessarily a finished
building, and a missing or interrupted milestone remains visible in the evidence.
