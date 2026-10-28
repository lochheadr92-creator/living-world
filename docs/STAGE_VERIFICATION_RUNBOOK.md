# Stage verification runbook

## Manual inhabitant verification — no API key; browser-driven

`manual=1` drives the person with `manualModel()` (`src/app/inhabit.ts`), answered **by hand** in the inhabitant panel with no
API key and no external model call. The verification therefore needs a browser that can click the offered actions and read the
rendered panel, not a model key. The repo's `scripts/browser/cdp.mjs` (a minimal Chrome DevTools Protocol driver; Node 22+,
a local Chrome/Edge) provides exactly that.

1. Start the dev server: `npm run dev` (serves on 5273).
2. Open `http://127.0.0.1:5273/?inhabit=Pavel&manual=1&seed=meadow&from=1&days=1&noarrivals=1`.
3. The inhabitant panel (`src/ui/inhabit.ts` `manualBlock`) lists the offered options as buttons; click one of the offered keys.
   The restricted observation (including the Stage-1 plans and spoken-for/available split) is what the panel shows.
4. Inspect the rendered explanation: the decision "because", the observation, and the resulting scene.
5. Save the transcript, then replay it headlessly against the same build (no browser, no model):
   `npx vite-node scripts/inhabit.ts -- --mode replay --transcript <saved.json> --out inhabitant_evidence/stage1-replay`

## Gate / ensemble (policy checks)

The unversioned gate (authored Large 8 seeds, 12 days) is legacy regression evidence — it proves the versioned changes do not
leak into unversioned worlds; it does **not** exercise or establish the benefit of the new rich-rule mechanisms. The rich-rule
causal comparisons (ablation vs control vs nudge) are run separately in the lab. A current-rule rich baseline is recorded only
after integration, per DEVELOPMENT_POLICY ("the first change at a new version cannot be gated").
