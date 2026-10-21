# Wolf defence with habitation

2026-10-20. Implemented on `codex/wolf-defence-integration` from main `a5530cf`.
Simulation implementation: `57e3047`. Version-3 continuation reference: `6163c86`.
Integrated into main by the owner's direct fast-forward to `9a082d6`, verified on
2026-10-21. PR #20 was closed without merging through GitHub.

## Inhabitant behaviour

An adult who has seen a wolf may want a spear. Ordinary crafting consumes two wood and one
stone at a workspace and creates an owned, carried tool. Seeing a threat while holding a usable
spear offers active defence alongside flight. Caution, fitness, proximity and concern for a visible
neighbour affect the choice. Nobody is assigned a defence, and a stored spear protects nobody.

The defender physically approaches a stationary wolf or faces a closing one, then spends ten
ticks on an attempt. Every attempt wears the spear by 3.6; success is deterministic from the
seed, participants and tick, but is not guaranteed. A successful attempt makes the wolf retreat
and avoid that person temporarily. Failure leaves danger present. This does not add killing,
patrols, armour, fences, or a guaranteed rescue.

Habitation remains authoritative: indoor residents cannot defend through walls, cannot count as
outdoor helpers, and cannot be bitten indoors. Flight toward one's known solid home enters it
through the door. If a rescue target reaches shelter, the defence ends without credit or wear.
The inspector identifies the target and records success, failure, or a wolf leaving on its own.

## Rules and provenance

Current rules are **version 4**. Versions 1 and 2 retain their previous behaviour; version 3 keeps
habitation without spears or active defence. The version-3 reference was captured from main
`a5530cf` before importing defence and is unchanged, alongside the version-1/version-2 references.

The original checkout at `C:\dev\Claude Experiment\living-world` still contains its independent
`claude/wolf-defence-v3` work. Its experimental version-3 saves are **not compatible**: they used
the same number for different rules. Keep those saves with that source revision; no automatic
conversion or reliable provenance inference from an unmarked save is claimed here.

The separate `wolf-habitation-integration` candidate also contains a version-5 mood correction.
It is preserved there and is not included in this branch. The two review fixes were first applied
and verified in that candidate, then included in this clean integration. No existing work was reset.

`src/sim/defence.ts` owns eligibility, decisions, physical attempts and observational counters.
`rich-no-defence` disables the action in the lab while leaving spear production and habitation
intact. No off-switch is exposed as a product mode. Bite measurements use the actual bite hook,
including victims subsequently removed from the live registry, rather than inferring bites from health.

## Review repairs

The [review and resolution record](WOLF_DEFENCE_REVIEW.md) preserves the original
request-changes verdict, reviewed candidate, finding severities and repair evidence.
Both findings are resolved; no automatic independent re-review is required.

The earlier candidate review found two blocking defects, both reproduced before repair:

- A newly preferred defence did not count as urgent, so an armed sleeper or a person committed
  to work could continue their previous activity. It now interrupts those activities through the
  ordinary alarm/review path. Existing flight and ongoing valid defence retain their behaviour.
- A fresh approach cleared the path but retained its prior attempt count, so a diagonal stationary
  target could leave the defender motionless. A new approach now initializes a new path. The
  defender first takes a second distance observation so a closing wolf is still met by holding ground.

`tests/defence_response.test.ts` exercises these cases, unarmed flight, and loss of fitness during
a defence. Six checks failed in the original two-version candidate before the repairs; all passed
afterwards. This clean branch runs the current version once (five checks). Existing tests and
thresholds were not weakened. This pass is implementation plus fresh self-review, not independent approval.

## Observed example and limits

One unmodified Normal village, seed `meadow`, no arrivals, 12 days:

- Sofia made spear 5204 at tick 11948.
- At tick 12017 she chose to drive a wolf off Abel, carrying the spear she had made.
- At tick 12049 the attempt ended as **partial: it was already going**. The wolf left before
  she struck. The spear took no wear and she received no successful-defence credit.
- Across the run, two spears were made and one defence began. There were zero resolved attempts.

The saved scene was loaded into the real page. The inspector displayed "Driving a wolf off Abel"
and continuation preserved the partial result. See `wolf_evidence/browser-natural/` and
`wolf_evidence/natural-meadow/`. This is an autonomous craft-to-response example, not evidence
that autonomous villagers often drive wolves off or survive longer.

Separately, 40 staged armed encounters produced 40 resolved attempts: 18 drive-offs and 22
failures. With the action disabled, no attempts occurred. The mean bites were 0.55 with defence
and 1.0 without it, conditional on this fixture. That is mechanism evidence, not a village-wide
effect estimate; no broad ensemble or new acceptance baseline was run.

## Verification

- `npm test`: 887 tests in 86 files passed, including historical saves and all habitation tests.
- Focused defence/habitation/reference set: 69 tests in five files passed.
- `npm run build`: TypeScript and production build passed.
- `npx --no-install vite-node scripts/golden.ts`: all historical fingerprints matched unchanged.
- Browser defence: 5/5; habitation: 10/10; autonomous saved defence scene: 4/4.
- Final natural-scene screenshot visually inspected. Evidence uses headless Chrome; it is not a broad usability assessment.
- `git diff --check HEAD`: passed.

Exact measurement/browser commands and source attribution are in `wolf_evidence/RUN.md`.
At this stage the death-ordering defect was still open, and this integration did not fix it.
Wildlife updates before people. A bite can set health to zero and `deathCause` to `wolf attack`,
then `stepPerson` used to run passive recovery before the death check, so favourable hunger,
thirst and warmth could put health back above zero. The bite event could already say "fatally"
while the person lived. No survival claim in this document relies on that path. The repair is
rules version 6, recorded separately: zero health is settled by the existing death path before
passive recovery. The stale historical ensemble baseline was also left unchanged; neither issue
was represented as fixed by the wolf-defence stage.
