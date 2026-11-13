// Run a measuring script from a bundle instead of through vite-node: about a quarter less time for the same run.
//
//   node scripts/fast.mjs scripts/generation_trace.ts -- --seed aspen --days 240 --out run.json
//
// The script and everything it imports are bundled into one plain JavaScript file (esbuild, already a dependency of vite) under
// node_modules/.cache/fast/, and node runs that. The TypeScript is the same and the run is the same (docs/GROWTH_PLAN.md "Engine speed": the
// same four years gave the same output, 2.4 minutes against 3.3). Through vite-node every call from one source file into
// another goes by way of the loader's module object; in a bundle it is a plain call.
//
// Extra node options go before the script: node scripts/fast.mjs --cpu-prof scripts/generation_trace.ts -- ...
// A script that reads files beside itself by import.meta.url (the pin recorders do) should still be run with vite-node.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const at = argv.findIndex((a) => a.endsWith('.ts'));
if (at < 0) {
  console.error('usage: node scripts/fast.mjs [node options] <script.ts> [-- script arguments]');
  process.exit(2);
}
const nodeOptions = argv.slice(0, at);
const script = argv[at];
const rest = argv.slice(at + 1);
if (!existsSync(script)) {
  console.error(`no such script: ${script}`);
  process.exit(2);
}
const dir = join('node_modules', '.cache', 'fast');
mkdirSync(dir, { recursive: true });
// one bundle per script path, so two runs of different scripts at once do not write the same file
const file = join(dir, `${basename(script, '.ts')}-${createHash('sha1').update(resolve(script)).digest('hex').slice(0, 8)}-${process.pid}.mjs`);
const built = spawnSync(process.execPath, [join('node_modules', 'esbuild', 'bin', 'esbuild'), script, '--bundle', '--platform=node', '--format=esm', '--target=node22', `--outfile=${file}`, '--log-level=error'], { stdio: ['ignore', 'inherit', 'inherit'] });
if (built.status !== 0 || !existsSync(file)) {
  console.error(`could not bundle ${script}; run it with vite-node instead`);
  process.exit(built.status || 1);
}
const run = spawnSync(process.execPath, [...nodeOptions, file, ...rest], { stdio: 'inherit' });
rmSync(file, { force: true });
process.exit(run.status ?? 1);
