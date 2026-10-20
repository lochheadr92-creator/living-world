# Wolf integration evidence, 2026-10-20

Source: `57e3047`, branch `codex/wolf-defence-integration`, rules version 4, base main `a5530cf`.
Measurements ran on the same simulation files before that commit was made. The documentation
and evidence commit changes no simulation code. Prior mixed version-5 candidate results are
kept in that other worktree and are not the measurements reported here.

The recorded questions were whether the two review failures reproduce and are fixed, whether
habitation/legacy saves remain intact, and whether an ordinary village makes and uses spears.
A natural zero is retained. Staged resolution is not described as natural activation or welfare.

Commands, from the integration checkout:

```powershell
npx --no-install vitest run tests/defence_response.test.ts tests/wolf_defence.test.ts tests/wolf_habitation.test.ts tests/defence_lab.test.ts tests/v3_continuation.test.ts
npm test
npm run build
npx --no-install vite-node scripts/golden.ts
npx --no-install vite-node scripts/defence_story.ts -- --out wolf_evidence/natural-meadow
npx --no-install vite-node scripts/encounters.ts -- --n 40 --ticks 300 --staged-only --out wolf_evidence/encounters
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5188 --strictPort
node scripts/browser/wolf_defence_check.mjs http://127.0.0.1:5188/ wolf_evidence/browser-defence
node scripts/browser/habitation_check.mjs http://127.0.0.1:5188/ wolf_evidence/browser-habitation
node scripts/browser/defence_story_check.mjs http://127.0.0.1:5188/ wolf_evidence/natural-meadow wolf_evidence/browser-natural
```

Use fresh output directories when repeating after a source change. The natural-story script
refuses an existing directory. The saved scene is a snapshot of the ordinary engine, not a fixture.
Full suite: 887/887; focused: 69/69; browser: 5/5, 10/10 and 4/4. Build and goldens passed.
Natural report: two spear crafts, one defence start, zero attempts; the wolf left on its own.
Staged report: 18 successes / 22 failures, with zero attempts under the action-off intervention.
