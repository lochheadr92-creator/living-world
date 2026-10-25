# Rules-28 audit evidence, 2026-10-25

Simulation source: `d84e5eaa828e86ea01b9847809875acd4259cf3a` (published main).
Audit runner and documentation are local additions; no production code changed.
See `../../docs/CIVILISATION_AUDIT.md` for interpretation and limitations.

Run from the repository root:

```powershell
npm.cmd test -- --reporter=dot
npm.cmd run build
npx.cmd --no-install vite-node scripts/audit_rules28.ts -- normal river 8 civic_evidence/audit-r28/normal-river.json
npx.cmd --no-install vite-node scripts/audit_rules28.ts -- large meadow 4 civic_evidence/audit-r28/large-meadow.json
npx.cmd --no-install vite-node scripts/household_life.ts -- river 8 --profile normal --rules 28 --json civic_evidence/audit-r28/household-river.json
```

Observed full-suite result: 144 files, 1,200 tests passed, 93.07 seconds.
Production build/typecheck passed. These commands were run on the simulation
revision above. Full temporary logs: `%TEMP%/living-world-r28-audit-tests.log`
and `%TEMP%/living-world-r28-build.log`.

Both autonomous reports have no daily conservation/tool invariant failures,
exact serialized observer purity, exact save roundtrip and matching 120-tick
continuations. End-of-run project snapshots are captured before continuation.
They include actual delivery/work amounts and support decisions, not inferred
intentions. Activity-start counts are attempts, not useful completion counts.

The final diagnostic reruns overlapped other processes. Performance values
include per-tick instrumentation overhead; heap includes loaded world copies.
They are not isolated performance benchmarks. Reports use the source revision
at execution; their hashes/settings/outcomes are the reproducibility evidence,
not elapsed time or heap size.

The household script's completion definition and reporting thresholds are
printed in its JSON. One seed does not estimate improvement over another rule.
No large ensemble, browser check or new 300-person benchmark was run.
