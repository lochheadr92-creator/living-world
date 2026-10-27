# Owner-reduced civilisation regression run

2026-10-25: owner explicitly requested stopping the full batch and using a smaller run.
The original civ_validation_v26 output remains untouched apart from stopped-by-owner.json.
It is interrupted, not a completed or passing ensemble.

Simulation source: b402f3d44bf3919b82982b6c66d37cd8d0e74873, rules 26.
Runner: scripts/run_civilisation_validation_small.ps1 (local workload variant; no simulation edits).
Runner SHA256: 3291F9E277146BD028084BAE9C847CCD36366644CFB6773E8F9113D543479D2C.
Output: civ_validation_small_v26. Do not mix it with the original outputs.
Seeds for each ensemble: meadow, river, fern, aspen. Immigration remains off.

Declared before launch:
- A: Town/100, 2 days, control plus nudge:1/nudge:2 versus no-stock/no-shelter.
- C: Large/100, 2 days, control plus both nudges versus no geology at generation.
- DEF: Large/100, 2 days, control plus both nudges versus no-relocation/no-exchange-journeys/no-political-alignment.
- GH: Normal/28, 4 days, control plus both nudges versus no-household-practices.
- Performance: existing bench, meadow, no immigration, Normal/28, Large/100 and Huge/250 each 1 day.

Question: do these short executions complete with valid outputs, and what actual welfare,
retained civic outcomes, learning and production metrics occur? Compare ablations with
mean control/nudges. Inspect adverse results and failures; do not tune until positive.
A zero opportunity/event count means a mechanism was not exercised naturally in this window.
Completion is not proof of aggregate benefit or of every mechanism executing.
These workloads do not establish sustained survival advantage, natural multigeneration
culture, or mature-world scaling. Those claims remain explicitly unverified/deferred.
Existing contract and browser evidence remain separate. No original acceptance threshold
or historical evidence was changed. The full programme is not automatically complete.

Estimate using historical saturated 30 CPU-seconds/day, 4 workers:
A 5 min + C 4 min + DEF 6 min + GH 8 min = 23 min, plus short benchmarks.
Allow 25-30 min, not a guarantee; Normal may run faster.

Resume only after checking the previous process is gone:
Start-Process powershell.exe -ArgumentList '-NoProfile','-NonInteractive','-File','scripts/run_civilisation_validation_small.ps1','-Only','all' -WorkingDirectory 'C:\dev\Claude Experiment\living-world-validation-v26' -RedirectStandardOutput 'C:\dev\Claude Experiment\living-world-validation-v26\validation-small.log' -RedirectStandardError 'C:\dev\Claude Experiment\living-world-validation-v26\validation-small.err.log' -WindowStyle Hidden -PassThru
Completed seeds are skipped; unfinished seeds restart. Preserve source and workload.
Read civ_validation_small_v26/report.txt, then inspect failures before any completion claim.
