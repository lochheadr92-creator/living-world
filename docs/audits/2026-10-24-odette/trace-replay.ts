// Read-only diagnostics of the saved manual run. Run from the repository root:
// npx vite-node docs/audits/2026-10-24-odette/trace-replay.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { createWorld } from '../../../src/sim/factory';
import { runReplay } from '../../../src/agent/run';
import { hashWorld } from '../../../src/sim/world';
import type { Transcript } from '../../../src/agent/transcript';

const dir = 'docs/audits/2026-10-24-odette';
const transcript = JSON.parse(readFileSync(`${dir}/transcript.json`, 'utf8')) as Transcript;
const rows: unknown[] = [];
let prior = '';
const result = runReplay(createWorld(transcript.header.settings), transcript, {
  onTick(world) {
    if (world.tick < 1673 || world.tick > 2403) return;
    const p = world.persons.find(p => p.id === transcript.header.personId)!;
    const summarize = (a: typeof p.activity) => a ? {
      id: a.id, kind: a.kind, phase: a.phase, progress: a.progress,
      duration: a.duration, amount: a.amount, expire: a.expire, data: a.data,
    } : null;
    const signature = JSON.stringify([p.activity?.id, p.activity?.phase, p.suspended?.id, p.lastResult?.tick]);
    if (signature !== prior || world.tick % 60 === 0) {
      rows.push(JSON.parse(JSON.stringify({tick: world.tick, light: world.light,
        activity: summarize(p.activity), suspended: summarize(p.suspended),
        lastResult: p.lastResult, indoors: p.indoors ?? null})));
      prior = signature;
    }
  },
});
writeFileSync(`${dir}/shelter-replay-trace.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify({endTick: result.world.tick, hash: hashWorld(result.world), recordedHash: transcript.end?.hash, samples: rows.length}));
