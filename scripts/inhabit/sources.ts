// A fingerprint of the simulation's and the agent's sources, so a transcript says which code made it, and a strict replay can
// refuse a transcript made by different code. Shared by the runner (scripts/inhabit.ts) and the replay checker.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hashString } from '../../src/sim/rng';

/** the directories whose contents decide how the world behaves */
export const SOURCE_DIRS = ['src/sim', 'src/agent', 'src/app'];

export function sourcesFingerprint(): string {
  const files: string[] = [];
  for (const dir of SOURCE_DIRS) for (const f of readdirSync(dir).sort()) if (f.endsWith('.ts')) files.push(join(dir, f));
  let text = '';
  for (const f of files) text += f + '\n' + readFileSync(f, 'utf8');
  return hashString(text).toString(16).padStart(8, '0');
}
