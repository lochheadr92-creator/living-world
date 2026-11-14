#!/usr/bin/env node
// The model relay's launcher (docs/MODEL_RELAY.md): `node tools/relay/relay.mjs <command> ...` from any folder. Plain JavaScript so
// that it starts on any supported Node without a loader; it runs the TypeScript command line through the repository's own
// vite-node, as scripts/lab.mjs does for its workers. No shell is involved, so a path with a space is one argument.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const viteNode = join(root, 'node_modules', 'vite-node', 'dist', 'cli.mjs');
if (!existsSync(viteNode)) {
  console.error(`node_modules is missing in ${root}: run "npm ci" there first`);
  process.exit(1);
}
const run = spawnSync(process.execPath, [viteNode, '--root', root, join(here, 'cli.ts'), '--', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, RELAY_CLI: '1' },
  windowsHide: true,
});
process.exit(run.status ?? 1);
