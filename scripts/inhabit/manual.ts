// A model that is a person at a keyboard: each ask is written to a folder as ask-N.json, and the run waits for answer-N.txt to appear.
// It is the same seam as the API clients (ModelClient), so the runner, the budget, the transcript and the replay are unchanged; the
// transcript records kind 'manual'. The player's side is scripts/inhabit/live.mjs. Nothing here touches the simulation.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ModelClient } from '../../src/agent/model';

export function manualModel(dir: string, model = 'manual'): ModelClient {
  mkdirSync(dir, { recursive: true });
  let n = 0;
  return {
    id: `manual:${model}`,
    kind: 'manual',
    config: { bridge: 'files' },
    async complete(req, signal) {
      const k = n++;
      const answer = join(dir, `answer-${k}.txt`);
      writeFileSync(join(dir, `ask-${k}.json`), JSON.stringify({ n: k, system: req.system, user: req.user }));
      for (;;) {
        if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('aborted');
        if (existsSync(answer)) {
          const text = readFileSync(answer, 'utf8');
          if (text.trim()) return { text };
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    },
  };
}
