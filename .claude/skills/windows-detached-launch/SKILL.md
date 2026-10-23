---
name: windows-detached-launch
description: Produce the PowerShell that launches a long living-world lab run detached on the user's Windows machine so it outlives the session, plus how to check it is alive and read the result. Use whenever a lab/gates/novelneed run will take more than about 10 minutes, the user asks to run something in the background or detached, asks whether a run is still going or stalled, or wants to resume one - even if they do not say "detached".
---

# Windows detached launch

A job backgrounded through the agent harness dies when the session ends, which loses a whole ensemble. On the user's Windows machine, launch detached with `Start-Process` so a later session only has to read `<out>\report.txt`.

## Launch (Windows PowerShell 5.1: one line per code block, no `&&`)

```
cd "C:\dev\Claude Experiment\living-world"
```

```
Start-Process node -ArgumentList 'scripts/lab.mjs','--out','<out>','--seeds','<N>','--fork','<F>','--days','<D>','--dynamics','<dyn>','--branches','<list>' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput "<out>.log" -RedirectStandardError "<out>.err.log" -WindowStyle Hidden -PassThru
```

- Each option and each value is its own quoted element in `-ArgumentList`. Never put double quotes inside an element: they do not survive the trip to the child process.
- `-PassThru` prints the process object: tell the user to note the `Id` (PID).
- `-RedirectStandardOutput` and `-RedirectStandardError` must be different files.
- Build the argument list with the `lab-run-dispatcher` skill if the user has not fixed one yet. For `novelneed_all.mjs` swap the script name and its options.
- Code must be pushed and pulled first (`git pull`, `npm ci` only if `package.json` changed).

## Check liveness

Check the process, never file modification times. Each seed's `lab_*.jsonl` is a buffered stream that only touches disk when an arm finishes, so a healthy run looks untouched for minutes, and 24 seeds finish in a burst, not a trickle.

```
powershell.exe -NoProfile -NonInteractive -Command "Get-Process -Id <pid>"
```

(`tasklist /FI "PID eq <pid>"` also works, but only in a PowerShell window the user runs themselves; from the agent's bundled sh the slash is mangled.)

A missing PID is not yet a failure: a just-finished or very short process is legitimately gone, so check the output files before concluding anything.

If the PID is gone, check whether `<out>\report.txt` exists. If not, read the last lines of `<out>.err.log` before relaunching.

## Finish and resume

- When done, the report is `<out>\report.txt`. To re-render it from existing data (takes seconds):

```
npx vite-node scripts/lab_report.ts -- <out>
```

- Paste back only `report.txt`, never progress lines.
- If the process died or the machine rebooted, re-run the same launch line with the same `--out`: `lab.mjs` skips finished seeds and resumes unfinished ones.
- After a source change, use a fresh `--out`; the resume guard only compares rules version.

## Don't

- Don't say a run is stalled because a `.jsonl` mtime is old.
- Don't launch with the harness's background shell for a long run.
- Don't use `pkill -f`/`pgrep -f` with a pattern that appears in your own command line (it kills your shell); use the bracket trick, e.g. `'[l]ab_seed'`.
