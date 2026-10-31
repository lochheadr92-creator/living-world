# Pavel evidence

`final117/report.json` is the final runtime screen. It includes commit provenance,
source hashes, three ordinary worlds, exact twins/save continuations, conservation
and scripted LiveSession replay. `run117/report.json` is the retained preliminary
screen and must not be relabelled as final runtime evidence.

Full initial/final saves, observations and LiveSession transcripts remain beside
these reports locally and are ignored because they are reproducible large files.
Regenerate in a fresh output directory from the delivery branch:

```powershell
npx vite-node scripts/pavel_observe.ts pavel_evidence/reproduction
```

No browser rendering was possible: local browser use is disabled in Work settings.
The controller replay is scripted and must not be described as a manual visit.
