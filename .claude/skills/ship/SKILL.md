---
name: ship
description: Take one plain-language request from words to a pushed commit: harden it into a spec, plan it, have a cheaper model build it, gate it, have two different Claude models review it blind, then decide, commit and push. Use ONLY when the owner types /ship or asks for the ship pipeline by name.
---

# Ship

One request in, one reviewed commit on a branch out. The owner types what he wants; the steps below are yours, in order. Typing
`/ship` is his word to commit and push to a feature branch. It is not his word to merge, to push to main, to open a PR, or to
force-push, and none of those happen.

You should be running as the strongest model (Fable): you write the spec and plan, adjudicate the reviews and decide. If you are
not, say so in one line and carry on. Who does what: you plan and decide; `sonnet` builds; `haiku` runs the gate; `opus` and
`sonnet` review, each blind to the other. The assignments are constants at the top of `.claude/workflows/ship.js`.

## 0. Before anything

- `git status --short` and the current branch. If tracked files already have uncommitted changes that are not part of this
  request, tell the owner and stop: the commit at the end must contain only this change. Untracked scratch files are fine.
- Branch: if the session names a branch, use it. Otherwise, if on main, create `ship/<short-slug>`; if already on a feature
  branch, use it.
- Note the base commit (`git rev-parse HEAD`).

## 1. Harden

Turn his words into a spec you would be willing to be judged against. Read the code first (and `CLAUDE.md`, `WORKFLOW.md`,
`PRODUCT_VISION.md` for behavioural work here). Write:

- Goal in one sentence, and what the owner will observe when it works.
- Non-goals: what this change must not do.
- Assumptions you made where his words left a choice, each one stated.
- Every call site, consumer and test the change touches (search for them; do not guess).
- Acceptance checks, concrete enough to become tests: inputs and the numbers or behaviour expected.

Ask him at most ONE question, and only if two readings of the request lead to materially different work and no safe default
exists. Otherwise state the assumption and go on.

## 2. Plan

File by file: what changes, what is created, which tests are written or updated, and the gate: the exact commands that must exit 0
(typecheck, and the specific test files, not the whole suite unless it is quick). Give the cheaper model exact names, signatures
and the delicate code verbatim; it cannot see what you saw. Rules of this repository bind the plan: never plan to weaken a test,
re-record a pin or golden, edit `WORKFLOW.md`, `AGENTS.md` or `CLAUDE.md`, or invent a rules-version number (ask the owner for it).

Show him the spec and plan as a short breakdown, then continue without waiting, UNLESS the work is high-risk: data or schema
migration, deleting files or data outside the task, history rewrite, a rules-version or save-format change, anything hard to
reverse. For those, stop after the breakdown and wait for his yes. Anything that needs more than about three minutes of compute
(lab runs, ensembles, the full suite on Large worlds) is not run here: give him the PowerShell lines instead, as `CLAUDE.md` says.

## 3. Build, gate, review (the workflow)

Run:

```
Workflow({ scriptPath: ".claude/workflows/ship.js", args: { spec, plan, base, gate: [ "<command>", ... ] } })
```

It builds, runs the gate (one automatic repair if it fails), then runs the two blind reviews. It returns a status:

- `reviewed`: go to step 4.
- `gate_failed`: the builder could not make the gate pass. Read `failures`. If the plan was wrong, fix the plan and run once more;
  if the work is beyond the builder, stop and tell the owner. Do not weaken the gate.
- `blocked`: the builder says the plan lacks something. Add it and run once more, or stop.
- `error`: your arguments were wrong; correct them.

## 4. Adjudicate

Each review is an external reader's claim, and most such claims are wrong or overstated. For every finding: read the code yourself,
and reproduce it with a command or a small test run where you can. Sort them:

- **Confirmed**, introduced by this change, worth fixing now: written down as a fix instruction in your own words (what is wrong,
  where, what correct looks like). Never paste a reviewer's text to the builder.
- **Refuted** or **not reproduced**: dropped, with the one-line reason.
- **Real but the owner's call** (a design choice, an older defect, a trade-off): kept for the report.

A reviewer returning "approve" means it found nothing, not that the change is correct. Two reviewers agreeing is a reason to check
first, not proof. If a review is missing, say so in the report; do not treat silence as approval.

## 5. One fix round, no more

If any finding is confirmed, run the workflow once more with the same `spec`, `plan`, `base`, `gate` plus `fix: ["<instruction>", ...]`.
It fixes, re-gates and re-reviews. Adjudicate those reviews the same way. After that round, nothing goes back to the builder:
whatever is still confirmed and unfixed goes to the owner.

## 6. Decide, commit, push

Approve only if all of these hold: the gate passed at the final state; no confirmed P0 or P1 remains; every changed file is one
the plan named (check `git status` and `git diff --stat` yourself); you have read the whole diff. If not, do not commit: report
what blocks it and leave the changes in the working tree.

If approved:

1. Stage by explicit path, never `git add -A` or `.`. Commit one problem per commit. The message says what changed and why,
   ends with a line `Existing modules touched, and why:` (or "none"), and then the attribution trailers the session gives.
2. `git push -u origin <branch>`, retrying a network error up to four times. Never force. Never push to main. No PR unless he
   asked for one.

## 7. Report

Use the owner's format:

- STATUS: what is VERIFIED (you ran it and saw it), what is LIKELY, what is UNKNOWN. Name the highest level of verification
  reached: the gate commands and their results.
- CHANGES: files and the commit.
- RISKS: findings left for him, unresolved or unproven claims, what the gate did not run (the full suite, the lab), reviewers that
  returned nothing, and the fact that two models approving is not proof.
- NEXT STEP: one recommended action.

## What not to do

- Do not run this pipeline unasked, or for a change he did not name.
- Do not let the builder or a reviewer commit, push, stage or reset; only you do, once, at step 6.
- Do not loop: one build, one gate repair, one fix round.
- Do not hide a failing gate behind a reviewer's approval.
