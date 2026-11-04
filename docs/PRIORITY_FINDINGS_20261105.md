# Priority findings publication — 5 November 2026

Owner request: commit, merge and push all finished work, then provide the PowerShell path to current main.

Published completed evidence:

- [Villager age/carry trace](../review_evidence/villager-age-carry-20261104/README.md): the historical rules-154 reproduction, including exact-twin and conservation results, with later rules-156/157 fixes clearly signposted.
- [Thirty-day comparison](../review_evidence/priority-findings-20261105/README.md): rules-153, three seeds on two profiles, full outcomes, priority cases, limits, chart and hash-verified supporting artifacts. Five original passes; Large River's original exact serialization failure and separate semantic continuation are retained.

No production module, rules version, dependency, save schema or test expectation changes in this publication. Runtime files and configuration must remain identical to the publication base. Verification is copied-artifact hash checks, JSON parsing, report consistency and diff review; the recorded simulations are not rerun for a documentation/evidence publication.

At publication preparation, main was rules 157 (`7d79757a`). Rules 158 on `eat-in-hand` (`59de7e54`) still had its full suite running and lacked a completed final handoff. It is outside this finished-work publication while that verification continues. The `p12-teller-confidence` branch is retained original history whose final narrowed behaviour is already rebuilt on main, as recorded in [P1.2 verification](../review_evidence/p12-narrow-20261104/README.md); merging the old branch again is not required.

All 19 archived payloads match their recorded SHA-256 hashes in both the worktree and staged Git blobs. The original CRLF line endings and generated SVG trailing whitespace are deliberately preserved rather than rewritten; the archive therefore retains whitespace-check diagnostics. The new publication prose passes its whitespace check.

The original observation priorities are historical evidence, not instructions to reimplement already delivered fixes. See current `HANDOFF.md` and `docs/DEPENDENCY_CHAIN_PROGRAMME.md` before engineering. The active agent's rules-158 checkout and processes remain untouched.
