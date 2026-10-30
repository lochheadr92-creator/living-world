# Learned daily preferences — rules 70

Implemented at rules 70, following published/pinned rules 69 (`f01ba1e`, runtime `e86befb`). No existing supper, winter,
gathering-payoff or immutable work-taste system is replaced. The missing A2 link is a time/context preference learned from
the person's own completed physical activities, rather than a prescribed schedule.

Predeclared contract: three successful completions on distinct days in the same time-of-day band and personally known
context earn a small bounded preference for the same legally offered trip/work/rest. Keep at most eight preferences with
four supporting episodes each. Actual activity identity, timestamp, duration, expected cost and result provide provenance.
Do not learn from merely offered work, duplicate completion callbacks, failed trips or a single repeated day's actions.
No preference supplies goods or bypasses any eligibility/critical-need/relief/danger filter. Ordinary people remain network-free.

Personal household/home knowledge, known dependants and kin contact, injury and current season constrain applicability.
Unknown changes elsewhere do not invalidate a preference through a world-state oracle. New known circumstances, failed work,
expired experience and increased expected travel/work cost suppress its influence; new successful experience can establish a
replacement. Existing traits weight the bounded preference. Shared-meal transmission remains owned by the supper practice.

Proof required: earn preferences through actual engine activities; save at an intermediate activity and continue exactly;
compare otherwise identical observed legal options with and without the earned personal record and show a changed decision
with a truthful reason; preserve urgent survival, bounded records, duplicate protection, changed-context recovery and old rules.
Show the physical journey and its recorded evidence in the running page. Fresh ordinary occurrence remains separate from
staged causation; no welfare/leisure improvement is claimed without the declared time-budget evidence and baseline comparison.

## Connected mechanism and ownership

`daily_routines.ts` owns the bounded personal record, eligibility and pure scoring. `decision.ts` snapshots the accepted
legal choice and adds at most three score points after hard filters; existing diligence changes that weight. No new
traits, universal schedules, extra options, private-world lookups or random draws are added. `activities.ts` learns only
at the actual ending boundary. Transfers require a positive cycle; rest requires actual recovery; quiet activities must
complete their duration; productive work requires progress. Interrupted/failed work supplies no successful episode.
Known failure suppresses the preference until a later successful attempt. A record expires after eight days; at most
four distinct-day episodes support each of eight preferences. An activity lasting over half a day is not learned as a
time-of-day routine. Supper and winter remain in their existing owners.

The optional person state and accepted activity snapshot survive saves and are fingerprinted; `save.ts` rejects malformed,
duplicated or future evidence. `inspect.ts` and the existing Traits section show actual activity IDs, ticks and current
applicability; decision explanations and the existing AI observation reason expose the same preference. No AI protocol
shape changes. Lab removal: `rich-no-daily-routines`. Rules 69 and earlier never acquire this state.

## Verification and preserved failures

`tests/daily_routines.test.ts`: **25/25**. Real wood trips on three staged mornings earn a preference, saved mid-trip and
continued exactly. An otherwise matched autonomous choice changes with only the earned record removed in the control;
the chosen trip then physically produces wood in the rendered proof. Water collection also learns through actual
shore perception/extraction and saves. Tests cover duplicate callbacks/days, season, injury, home, known care/contact/loss,
old experience, time band, urgent thirst, increased offered cost, actual source depletion and uninformed household members.
The retained previous-version continuation passed **1/1** before and after implementation.

Full regression: **247 files / 1,671 tests passed, 151.15 seconds** (`autonomy-routine70-full-tests.log`). Typecheck and
production build passed (`autonomy-routine70-final-typecheck2.log`, `autonomy-routine70-build.log`); the existing bundle
size notice remains (968.82 kB). The full run retains the existing timeout-overflow warning rather than suppressing it.
Rendered proof: **6/6**, `autonomy_evidence/routine70-rendered-reviewed/report.json`; history, autonomous choice and
changed-injury screenshots visually inspected. Fixtures are explicitly staged: supplied worker, spaced mornings,
reset position/needs and selected training trips. They are not ordinary daily-life evidence.

Review corrections: a test clock rewind made a saved episode future-dated and exposed a fixture controller cleanup gap;
the fixture now keeps time monotonic and restores its controller even after load failure. The water scene originally
stood on deep water or lacked local perception; corrected physical shore perception produces a canonical positive water
belief ID. A paused same-tick injury did not refresh the UI cache; the browser fixture advances the real engine before
inspecting the change. Failed logs and the first browser report remain retained. Active/suspended learning snapshots were
added to the fingerprint during review. No historical expected file or valid test was weakened.

## Ordinary occurrence and limits

Fixed fresh Normal worlds, immigration off, five days (12,000 ticks), no staged actions or altered clocks. Each records
2,800 living-person samples, 100 full-state/RNG observation-purity checks, an exact unobserved twin and balanced accounting.
Reports and complete exclusive time budgets: `autonomy_evidence/r70-{meadow,river,forest}-5/report.json`.

| Seed | Samples with some personal experience | Distinct preferences reaching three days | Samples offering a routine nudge | Actual starts naming it | Work / leisure ticks | Living-person ticks | Seconds |
|---|---:|---:|---:|---:|---:|---:|---:|
| meadow | 2,690 | 1 | 0 | 0 | 42,242 / 627 | 336,000 | 24.09 |
| river | 2,673 | 2 | 0 | 0 | 43,372 / 1,468 | 336,000 | 25.88 |
| forest | 2,630 | 0 | 0 | 0 | 45,840 / 1,235 | 336,000 | 22.99 |

Samples are not independent opportunities. Three-day experience does not itself establish current legal availability,
matching context/time/cost or spare need margin. No sampled ranking changed and no actual start named this preference.
Do not tune survival or habit strength to erase this null result. Staged causation is established; ordinary influence,
repeat household discretionary rhythm, aggregate benefit and mature-world performance remain unproven. A1/A2 acceptance
and the broader programme remain open. These short occurrence windows are not a paired time-budget improvement trial.

Reproduce each seed with `npx --no-install vite-node scripts/routine_observe.ts -- meadow <fresh-output-directory>`
(replace meadow with river/forest). The script refuses reused output, caps at 170 seconds, records source hashes and
checks they did not change. Longer combined validation follows `AUTONOMY_VALIDATION.md`; it remains owner-run and pending.
