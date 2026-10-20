# Owner workflow rules

Owner decision: 2026-10-21. This is the authoritative repository workflow for both
Codex and Claude. The project is maintained by one owner working with an AI agent.
This decision persists across sessions; do not ask the owner to reconfirm it.

## Default delivery

Implement the authorized change, inspect the diff, run appropriate checks, fix concrete
findings, record the result, and commit/push within the owner's authorized scope.
When integration is authorized, integrate directly into main and push normally.
Do not ask for permission again when the current task already provides it.
Explicit read-only, no-commit, no-push or other task boundaries still apply.

- No mandatory pull requests. Open a PR only when the owner explicitly requests one.
- No mandatory second reviewer, independent approval or approval round.
- Review is part of the work. Record findings and their resolution; do not turn the
  record into another approval gate.
- A repaired finding with appropriate regression evidence is resolved. Revisit it only
  for relevant changes, new evidence or an unresolved defect. Do not repeat checks just
  because a documentation commit or handoff was added.
- Use branches/worktrees when they protect concurrent work or isolate a change. Their
  existence does not imply a PR requirement.
- Keep commits focused and include a short "Existing modules touched, and why" explanation.
- Report actual failures, conflicts, missing information and enforced tool/GitHub
  restrictions accurately. Do not invent process blockers or pretend a refusal passed.

## Rules that remain

Preserve unrelated work, deterministic behaviour and save/replay compatibility.
Run checks appropriate to the change; never weaken tests or fabricate evidence.
No force-push, history rewriting, destructive reset, committed secrets or bypassing
actual protections. Keep the difference between mechanism evidence and measured benefit.

## Preventing workflow drift

Do not add PR requirements, required reviewers, repeated approval gates, or a blanket
"never merge" policy unless the owner explicitly changes this decision.
This supersedes conflicting workflow instructions in older handoffs, PR descriptions,
branch-specific notes, copied prompts, and earlier repository policy.
Historical review verdicts remain historical evidence, not current delivery requirements.

`AGENTS.md`, `CLAUDE.md` and `docs/DEVELOPMENT_POLICY.md` must stay consistent with this file.
This is a committed agent workflow policy, not a GitHub branch-protection ruleset.
GitHub was verified on 2026-10-21 to have no rulesets applying to main and main was
unprotected. If that changes, identify the actual restriction rather than silently
creating a PR or bypassing it. Any change to this owner policy requires an explicit
owner instruction.
