// Decision-level attribution over recorded inhabitant runs (src/agent/attribute.ts): which stated reasons could only have come from the
// notes, and which choices carry out a noted goal or intention. Reads transcripts only; no model, no world. Writes attribution.txt
// beside each transcript.
//
//   npx vite-node scripts/inhabit_attribute.ts -- experiments/memory-pavel-gpt5 experiments/harsh6-tomas-gpt5/transcript.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { attribute, renderAttribution } from '../src/agent/attribute';
import type { Transcript } from '../src/agent/transcript';

const args = process.argv.slice(2).filter((a) => a !== '--');
if (args.length === 0) throw new Error('name one or more runs: a folder holding transcript.json, or the file itself');

for (const p of args) {
  const path = existsSync(join(p, 'transcript.json')) ? join(p, 'transcript.json') : p;
  if (!existsSync(path)) throw new Error(`no transcript at ${path}`);
  const t = JSON.parse(readFileSync(path, 'utf8')) as Transcript;
  const text = renderAttribution(attribute(t));
  const out = join(dirname(path), 'attribution.txt');
  writeFileSync(out, text + '\n');
  console.log(`== ${path}\n${text}\n(written to ${out})\n`);
}
