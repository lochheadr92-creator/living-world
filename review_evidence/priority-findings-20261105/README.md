# Published 30-day priority findings

This directory preserves the completed investigation of frozen rules 153 (`79e3ac402ebd93812c93b53c7947e406649dbafe`), not current-main behaviour. Three seeds, Normal and Large profiles, 30 days, arrivals on, rich dynamics, harsh off. The original observations did not control inhabitants or change their resources.

Start with [READOUT.md](READOUT.md), [REPORT.md](REPORT.md) and [the comparison chart](population-comparison.png). [verification.json](verification.json) records five original runtime passes and one separately resumed semantic continuation. Large River's original exact serialization check remains failed; see [DIAGNOSTIC_FINDINGS.md](DIAGNOSTIC_FINDINGS.md). No full test suite was claimed for this observer-only investigation.

## Later fixes and remaining interpretation

- Rules 156 subsequently disallow child wood/stone work at offer, start and resume; the historical chopping cases are predecessor evidence.
- Rules 157 distinguish empty handover causes and avoid bringing food to dependants already holding food. Genuine full-pack fallback remains. See the existing [care-recovery record](../carry-recovery-20261105/README.md).
- Rules 158 is being verified separately on `eat-in-hand` at publication preparation. It lets a hunger-serving activity yield to better eating from the pack. Do not call it merged or its full verification complete from this record; inspect current source/handoff when resuming.
- Fenn's non-food pack, failed handover and later death are a priority reproduction, not proof of one cause or proof that the failure persists under newer rules. Preserve existing successful unloading, learning and care.
- The broader questions of care completion, interrupted work, elder access and long-run viability remain evidence-led. This record does not start a second rules-changing stream or override the existing execution queue.

## Integrity and reproducibility

The 19 files listed in [manifest.json](manifest.json) were copied byte-for-byte from the Brain evidence bundle and checked against its SHA-256 hashes. They include the frozen source archive, scripts, protocol, reports and selected raw evidence. This publication adds this index without modifying those 19 files. Full raw world saves, full per-person reports, dependencies and some post-processing scripts remain in the original directory recorded in READOUT.md; this smaller bundle is not a complete executable backup.

The TypeScript observer scripts here are preserved original artifacts. Their relative `./src` imports refer to an extracted frozen-source workspace, not this current repository's source. Do not run them against mixed versions in this directory. Restore the frozen source separately and use the original protocol/output paths when reproducing.

The historical report's statements that no Brain or game-repository files changed refer to the investigation itself. Subsequent owner-authorized Brain saving and this publication are separate actions.
