# The technique tree and knowledge continuity (rules version 52)

Delivered 2026-10-29 on `main` after rules 51 (`7dd9066`). Workstream 10 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).

## What stood before

Rules 18 made charcoal firing a procedure a person holds (`src/sim/techniques.ts`): proficiency stays in `skills.kiln`, the
kiln owns the material work, and the procedure passes only in a timed lesson between two people awake and together. Rules
41 let a learner who wants the work ask a parent, a master or somebody seen at the kiln; rules 44 varied who arrives
knowing it. Everything else at the smithy (`smelt_iron`, the `forge_*` recipes) needed nothing but the recipe's skill,
tool and materials: an iron chain that no world had reached in 45 days (no smithy stood before day 21 in any audit) was
open to anyone who got there. One procedure is not a tree, and a procedure whose last holder dies had no way back but a
teacher who no longer exists.

## Contract

Gated on `runsRulesVersion(world, 52)` and rich dynamics; the rules-51 full serialized continuation
(`tests/v51_continuation.expected.json`) was recorded from `7dd9066` before any of it. One lab switch,
`rich-no-technique-tree` (smelting and forging read as known by everyone, nobody tries a procedure untaught; charcoal, its
lessons and the backgrounds unchanged). Owner: `src/sim/techniques.ts` (the registry `TECHNIQUES`, the gates, the lessons,
the trial). New saved state: `Person.techniques.smelting` / `.forging` (same record as charcoal, plus `attempts` and
`spent` when worked out by trial), `Person.trials` (attempts so far and their cost), `Job.trial`, `Conversation.lesson.kind`;
all hashed and validated on load.

**Three procedures, five separate facts.** Charcoal firing (`burn_charcoal` at the kiln), iron smelting (`smelt_iron` at
the smithy; cannot be learned or tried by someone who does not know charcoal firing) and iron forging (the smithy's
`forge_*`; cannot be learned or tried without smelting). Knowing the procedure (`techniques`), being quick at the work
(`skills.smith`, which grows with practice as before), owning the hammer (`toolreg`), having the ore, charcoal and a standing
smithy (the planner's ordinary supply), and being willing and free (the lesson's and the batch's own checks) are read in
five different places and none substitutes for another: a smith of skill 1.8 without the procedure is blocked at the
planner, the start, the join and the work, exactly as the kiln blocks charcoal.

**Who starts knowing.** The rules-44 creation-time background, read with its own salts (`background.ts backgroundKnows`):
a specialist smith knows smelting and forging; the experienced know smelting about a third of the time and forging most of
the times they know smelting; the generalist and the other specialists rarely; the inexperienced never. Someone who arrives
knowing smelting arrives knowing charcoal firing too (a smith knows the fire), so the tree holds for everyone from the
start. Nothing is granted by skill, by standing near a smithy, to newborns, or to everyone at once, and a world made before
52 keeps its people exactly as they were (smelting and forging are read as known there, as before).

**Teaching.** The rules-18 lesson, carrying the procedure it is about: a holder offers it to a child or an apprentice at a
workshop they know (`options_social.ts optTeachTechnique`, every held procedure in turn); a learner whose wanted work is
blocked by a procedure asks a parent, a master or somebody seen at that work for the first procedure lacking on the way
(`optRequestTechnique`; forging wanted and smelting lacking asks for smelting, and the card says why forging cannot be asked
for yet); the answer is given at contact and nowhere else (`answerLesson`: the learner must hold the one before, and the
old refusals stand); `LESSON_TICKS` together; the record names the teacher and the lesson.

**Trial.** Knowledge ends when its last holder dies or leaves, and nobody is told. A person whose wanted work has been
blocked by a procedure for `TRIAL_AFTER` (two days: the decision, never an observer, notes the first time it stood in the
way, `cooldowns['techWant:<kind>']`), who holds the procedure before it and is in no lesson, may try the work untaught
(`trialAllowed`): the planner offers the recipe at the workshop as "… untaught (a trial)", with the first procedure lacking
as the trial when a later one is wanted (smelting first, for the forging that a worn axe wants). The batch draws its real
inputs and fuel and takes its real work and burn; the first `TRIALS_NEEDED − 1` (two) attempts come to nothing (the inputs
are spent and recorded as "a failed attempt", the person's own log says what it cost so far); the third yields the goods
and the procedure, recorded as worked out by trial with the attempts and everything spent. No draw: the same person at the
same work learns on the same attempt every time. A workshop in use is not tried at; nobody can lend a hand to a trial
without holding the procedure themselves.

**What stays.** Charcoal firing and its lessons are as they were (the rules-18, 41 and 44 tests pass unchanged); the
smithy's skill, tools, materials, capacity and stall rules; survival needs no procedure (wooden-and-stone tools, huts,
food and water are untouched); no procedure is ever granted by proximity, by skill or globally.

## Tests

`tests/technique_tree.test.ts` (7 staged contracts; Ada knows all three, Ben her child knows charcoal, Cora knows charcoal,
a public smithy stocked with ore and charcoal): the gates at 52 and their absence at 51, with the card's three lines; who
starts knowing in a created world against the same seed at 51 (every smelter knows charcoal, nobody loses charcoal, every
other creation draw equal); a smelting lesson refused for want of charcoal, taught with it, forging after it, and the
taught batch making real iron; the trial after two days of wanting, never for forging while smelting is lacking, never
without charcoal, two failed batches then iron and the procedure, with the ore and charcoal accounted for and the ledger
conserved; the planner offering the smelting trial for a forged axe wanted, the want written by the decision and not by an
observer; the last holder's death leaving a gap the taught survivor keeps and the rest fall to the trial; switch, exact
replay through a trial batch, observer purity, hash coverage. `tests/techniques.test.ts`, `tests/learner_instruction.test.ts`
and `tests/backgrounds.test.ts` pass unchanged; `tests/v51_continuation.test.ts` pins rules 51.

## Ordinary worlds and the lab

Three 45-day seeds (`technique_evidence/obs-45-{seed}`, `scripts/technique_observe.ts`): the backgrounds seeded 5 / 7 / 6
charcoal holders, 4 / 4 / 3 smelters and 4 / 1 / 2 forgers; four charcoal lessons were learned (the first in an ordinary
world since the rules-44 chain); forest lost two charcoal holders, a smelter and a forger to its second winter and ended
with one forger. Smelting and forging were wanted in river (8 option samples each, worn tools wanting iron ones), but the
smithies stood only from day 33 and 37 and no ore was mined in any seed, so no lesson or trial past charcoal happened in
135 seed-days: the gates, the lessons and the trial are contract- and page-proven, their ordinary occurrence waits on the
ore chain (workstream 6's open finding). The 8-seed lab rows are in the slice log of DEPENDENCY_CHAIN_PROGRAMME.md
(`technique_evidence/lab-tree`). No benefit is claimed.

## Limits

- Three procedures only; brick firing is not gated (houses need bricks, and gating them would put shelter behind
  knowledge; the brief keeps survival routes open).
- The trial needs the same ore, charcoal and smithy the taught work needs; it is a route to knowledge, not to materials,
  and in a 45-day Normal world a smithy stands late or not at all.
- Rediscovery costs three batches of inputs; the number is a contract constant, not a measured one.
- No aggregate claim.
