# Windows observer batch: captured exit codes and preserved evidence

The owner's returned `living-world-longruns-20261031-212947-395` batch used an inline
PowerShell launcher recovered from local shell history. All nine `ExitCode` values
were blank. Six river/meadow reports passed their script checks; forest failed
final save validation (see `MEAT_SAVE_VALIDATION.md`). Neither the original ZIP nor
any original results have been edited or relabelled as passing.

## Cause and correction

The old launcher redirected `Start-Process` output, polled `HasExited`, then called
`WaitForExit()` and read `ExitCode` without first retaining the native handle.
On Windows PowerShell 5.1 this reproduced null codes for real Node children exiting
with both 0 and 7. The upstream comparison was
[PowerShell issue #5421](https://github.com/PowerShell/PowerShell/issues/5421), whose
documented handle-lifetime workaround matches the local reproduction. No external
source code was copied.

`scripts/run_longruns.ps1` makes that inline observer batch a maintained script.
It retains each child handle before polling, reads the exit code after waiting,
and writes the captured value into individual status JSON files and `summary.csv`.
An unavailable code stays null and produces `EXIT_CODE_UNAVAILABLE`; it is never
converted to zero or inferred from a successful report. A nonzero process code,
missing/malformed report, budget stop, wrong horizon or failed integrity check
cannot pass. The batch itself exits nonzero if any row is incomplete.

The runner accepts an explicitly prepared source checkout with installed
dependencies. Unlike the old pasted preparation block, it does not fetch remote
main, switch revisions or install dependencies implicitly. Its manifest names
the source path and HEAD; a source diff and runner copy are retained, and successful
observer reports include source hashes. This allows a local repair to be tested
without accidentally selecting an older published revision. Use a frozen checkout
for longer measurements; do not edit simulation source while it runs.

## Use

From the integration checkout, a short verification of all three observers is:

```powershell
powershell.exe -NoProfile -NonInteractive -File scripts/run_longruns.ps1 -Seeds forest -Days 1 -BudgetSeconds 120
```

Defaults remain river/forest/meadow, production/households/promises, 45 days and
3,600 seconds per run. `-Source` selects the prepared checkout. `-Seeds forest
-Checks production` restricts work to one seed/observer. `-OutputRoot` selects a
fresh absolute results directory; otherwise a timestamped sibling directory is
created. Every existing output directory is refused, including incomplete ones.
This runner does not resume or overwrite old runs. A rerun must use fresh output.

The output directory contains each run's report and final save, redirected logs,
per-run status JSON, manifest, source diff, summary CSV and a ZIP of reports/logs.
Keep the PowerShell session alive for summary collection, or launch the entire
runner detached for long work. A finished batch is not necessarily a passing batch.
Observer repeats of the same seed are not independent experimental seeds.

## Verification on 31 October 2026

- Real redirected child-process regression under Windows PowerShell 5.1: success
  (0), reported failure (7), crash without report (7), budget stop (1), wrong
  horizon, integrity failure, malformed JSON, and explicit unavailable-code
  boundary. Stdout/stderr are retained and existing-output reuse is refused.
- New one-day forest batch on rules 110: all three observers pass with captured
  exit 0, `Complete=True`, horizon reached, balanced resources and exact twins.
- New production/forest budget probe (45-day request, one-second budget): retained
  budget report, captured exit 1, `Complete=False`, and batch exit 1.
- Meat/helper/runner focused suite: 15 tests in three files pass. Save/economy/food
  help and immutable rules 78/107/110 continuations: 31 tests in six files pass.
  TypeScript check passes. The full suite was not repeated for this runner/test
  change; no runtime simulation source or historical reference changed.

Local artifacts: `verification_evidence/forest-save-20261031/`, including
`batch-smoke/reports/summary.csv`, `batch-budget/reports/summary.csv`, regression
logs, original-launcher exit-code reproduction and the captured forest save audit.
Existing corrected 45-day forest results were inspected and reused as historical
evidence, not claimed as new runs. River/meadow were not rerun.

Review: the first runner regression exposed a fixture issue where dot-sourcing
the runner cleared the fixture's output parameter. Passing it explicitly fixed
the fixture; the production exit-code contract and assertions were unchanged.
Final review checked native handle retention before polling, null/nonzero exit
handling, horizon and integrity rejection, source attribution, and output-folder
preservation. These paths pass the regressions and real short observer runs above
(`TURN_INTEGRATION_VERIFIED`); no new long-horizon performance claim is made.
