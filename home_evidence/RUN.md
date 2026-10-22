# Retained evidence: from needing a home to living in one

Rules version 7, source `b050816` + this change. Full account: [`docs/HOUSEHOLD_HOME.md`](../docs/HOUSEHOLD_HOME.md).

| file | what it is |
|---|---|
| `river.json` | the retained example: seed `river`, Normal, arrivals off, ticks 0–19,200, the Willow household followed from a lean-to to a hut it lives in. An ordinary autonomous run; nothing staged. |
| `ab-<seed>-on.json`, `ab-<seed>-off.json` | the same four seeds with household shelter plans on and with `rich-no-shelter`. The ablation table in the doc is read from these. |
| `page/report.json` | `scripts/browser/household_home_check.mjs`, 16/16, against an ordinary autonomous world in the real page. |
| `page/*.png` | screenshots, looked at and not only asserted on: a plan under way, a site waiting for stone, an occupied hut, the same after save/load, and a household's Home line saying why it is not building. |

Regenerate:

```
npx --no-install vite-node scripts/household_home.ts -- river 8 --json home_evidence/river.json
npx --no-install vite-node scripts/household_home.ts -- river 8 --off --json home_evidence/ab-river-off.json
npm run dev -- --host 127.0.0.1 --port 5287 --strictPort
node scripts/browser/household_home_check.mjs http://127.0.0.1:5287/ home_evidence/page
```

Limits: one run per seed. These show the chain is possible and every link is recorded. They are NOT evidence that more
households get housed or that anybody survives better; the on/off comparison in the doc found no aggregate difference.
