# Wolf defence after habitation

Implementation and local verification, 2026-10-19. This is unmerged work on
`codex/wolf-habitation-integration`, based on main `a5530cfd36ab6bdba9ab62bfa7fb212ee5c79e24`.
The source checkout at `C:\dev\Claude Experiment\living-world` remains on
`claude/wolf-defence-v3` at `35b7236`, with its original unfinished changes intact.
The integration imports that branch's defence work, including its pending standoff fixes,
without importing its replacement version-1 reference or any experiment outputs.

## Rules and physical contract

- Version 3 retains main's habitation semantics. Version 4 adds spears and active defence.
- Version 5 adds the narrow mood-ranking correction below. New product worlds use version 5
  in this checkout; loading older supported worlds keeps their version.
- Do not load experimental saves from the old wolf-v3 branch here. That branch used the
  same number for different rules; no automatic conversion or provenance detection is provided.
- A spear is crafted with real wood and stone, held as a registered tool, and worn by attempts.
  Its existence alone protects nobody. The ordinary ranking chooses between fleeing and
  defending; attempts can fail. Success makes the wolf retreat and remember that defender.
- An indoor occupant cannot defend, count as a nearby companion, or receive rescue credit.
  If the threatened person reaches home during a rescue, it ends without credit or tool wear.
  A stale defence activity on an occupant does not prevent the wolf from retreating.
- A defender who becomes unfit no longer holds off the wolf or suppresses urgent flight.
  Physical entry/exit remains owned by habitation; defence does not teleport people indoors.
- An attack can interrupt crafting. Recipe accounting is tested as a selected activity;
  the separate full-world test verifies interruption and physical refuge. Autonomous spear
  production beside a threat is not claimed from the component test.

## Mood correction

The reproduced defect: warming at utility 30 beats idle rest at 28 without mood, but a
low mood reverses that preference. From version 5, idle rest/wandering cannot move above
physical relief that ranked higher without mood. The neutral comparison includes plans,
trade, life-goal and crew nudges and the same deterministic jitter. It uses no random draws.
Cold-weather shelter represented by `rest` remains physical relief.

Only offending idle alternatives move down. No option is removed. Ordinary mood choices,
neutrally preferred rest, random-choice experiments and versions 1–4 retain their behavior.
The recorded decision explains when physical relief was protected. The lab intervention
`rich-no-mood-guard` disables just this correction; `rich-no-defence` disables just the
defensive action while retaining spear production. `no-home-entry` remains available.

## Measurement repairs

The imported bite tally treated a missing cooldown as a first bite and lost victims removed
from the live registry. It now observes the actual bite callback, including fatal bites.
Lab branches restore the prior defence probe state. Defence offers include re-evaluations;
they are not independent choices or a rate denominator. Spears means registered spears at
the endpoint, not cumulative crafts. Existing probe fields keep offers, starts, attempts,
successes, failures and wolves leaving on their own separate.

The staged encounter script now times the wolf's stalking window from the fixture's actual
starting tick. A short initial run expired the window before the run began and produced
zero attempts; retained in `integration_evidence/encounters/`. The corrected run is in
`integration_evidence/encounters-fixed-timing/`. Reports no longer hardcode an old village result.

## Verification

- `npm test`: 889 tests in 87 files passed on the final simulation changes.
- `npm run build`: TypeScript and production bundle passed.
- Historical goldens and unchanged version-1/version-2 references pass. A version-3 save
  continuation was captured from main before importing defence. A version-4 continuation
  was captured from the integration working tree before the mood correction; this latter
  reference is iteration evidence, not an independently released baseline. Both pass.
- `node scripts/browser/habitation_check.mjs http://127.0.0.1:5187/ integration_evidence/habitation`:
  10 checks pass, including indoor inspector state, save/load, actual protection, exit, and
  an autonomous inhabitant entering a built home. Screenshots inspected locally.
- `node scripts/browser/wolf_defence_check.mjs`: 6 checks pass. The real page chooses defence,
  names it in the person inspector, resolves an attempt, wears the spear, and saves/loads
  the outcome. The observed attempt failed; success was not forced. The first attempt at
  reading the inspector queried a hidden building panel; corrected to the visible person panel.
- `npx --no-install vite-node scripts/encounters.ts -- --n 40 --ticks 300 --staged-only --out integration_evidence/encounters-fixed-timing`:
  40 starts, 40 resolved attempts, 18 drive-offs and 22 failures. Defence-on mean bites 0.55;
  armed/disabled and unarmed arms each 1.0. This is conditional staged evidence, not a
  village ensemble, a natural-use estimate, or an acceptance claim about welfare.
- `git diff --check HEAD`: passed. No existing golden or ensemble baseline was replaced.

Full logs are local ignored files `integration-tests-final.log` and `integration-build.log`.
Browser reports and images are local untracked `integration_evidence/` artifacts. No independent
review, commit, push, merge, expensive ensemble, or new baseline recording is claimed.

## Remaining work and separate finding

Review this integrated candidate, then measure natural activation and costs with the existing
control/nudge discipline before claiming benefit. Large-profile acceptance and the Stage 4
cohort decision remain outstanding. See `BASELINE_REFRESH.md` for the correct baseline procedure.

A separate existing lifecycle problem was observed while testing fatal-bite counting:
`stepWorld` updates wildlife before `stepPerson`, but `stepPerson` applies `updateNeeds`
before checking zero health. A well-fed, warm victim can therefore go from zero health to
0.009 and remain alive despite a fatal-bite event. This predates the integration and is not
changed here. The fatal-counter fixture deliberately uses hunger 35 to prevent passive
healing and exercise removal; it does not establish that every fatal bite kills correctly.
Fixing death ordering needs its own versioned contract and continuation assessment.
