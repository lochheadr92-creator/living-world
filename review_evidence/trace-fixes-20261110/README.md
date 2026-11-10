# Rules 186, 187 and 188: three records the end-to-end trace asked for

Write-ups: `docs/SHARED_BUILDERS.md` (186), `docs/ANSWER_CAUSE.md` (187), `docs/TAKEN_FROM.md` (188). Contracts and results: `docs/GAP_LEDGER.md`. Origin:
`docs/END_TO_END_TRACE.md`. Stream: gap. Each baseline is the predecessor version pinned with the probe's rules argument on the candidate tree. `dirty=false` throughout.

- `run-twins.ps1`, `r185-r186/`, `r186-r187/`: version twins from the clean pinned worktree at `af15790c`, 2026-11-10 15:02 to 15:17. Each `ab-compare.txt` ends "identical in
  12 of 12 seeds". Each folder also holds one run at the later version without the strip (`nostrip-*`), whose hash differs from the stripped one.
- `run-twin-188.ps1`, `r187-r188/`: the same at `6254dc9b`, 15:18 to 15:25. Identical in 12 of 12.
- `trace-aspen-r188.json`: the trace probe of `review_evidence/end-to-end-trace-20261110/` run again at rules 188 from clean `6254dc9b`. Same sites, projects, requests and
  decisions as at 185. The project views, the building cards and Mona's log now carry the builders, the answer causes and the salvage lines.
- `first-taking-probe.ts`: found the pin world for 188. The pin-world probes for 186 and 187 are in the end-to-end trace folder.
- `suite-summary.txt`: the one full suite for the three versions.

Limits: twelve 25 day worlds say the dynamics are unchanged with the new keys stripped. The `--strip-taken` option also cuts every text that starts "Took " to that word at
both versions, so a difference only inside such a text would be hidden. No benefit or harm is claimed.
