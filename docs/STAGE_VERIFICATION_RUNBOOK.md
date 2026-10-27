# Stage verification runbook (prepared, not yet executed)

These are the operator-side commands for the manual inhabitant verification and the lab/gate checks. They require the model
key and a browser, which are not available in the automated session, so they are prepared here for the owner to run.

## Manual inhabitant verification (real model, rendered panel, transcript replay)

Stage 1 (Pavel reserved-material case):

1. Start the dev server with the model key in the shell (the key never enters the browser):
   `npm run dev`
   with `OPENAI_API_KEY` (or the anthropic key) exported in that shell.
2. Open in the browser:
   `http://127.0.0.1:5273/?inhabit=Pavel&manual=1&seed=meadow&from=1&days=1&noarrivals=1&memory=1`
3. Inspect the inhabitant panel: confirm the observation shows `plans` (the pick intention and its `wants`) and the
   `spokenFor`/`available` split, and that the model's reason refers to the reservation rather than the omniscient inspector.
4. Save the transcript, then replay (no model, same build):
   `npx vite-node scripts/inhabit.ts -- --mode replay --transcript <saved-transcript.json> --out inhabitant_evidence/stage1-replay`

## Gate / ensemble (policy checks for rules 34 and 35)

The unversioned gate (authored Large 8 seeds, 12 days) is run by the automated session; the result is reported with each stage.
A current-rule rich baseline is recorded only after integration, per DEVELOPMENT_POLICY ("the first change at a new version
cannot be gated").
