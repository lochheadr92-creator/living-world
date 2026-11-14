// Behaviour identity probe: steps an ordinary world (current rules, Normal, arrivals on) and prints hashWorld every 2 days and at the end.
// If a change cannot alter outcomes, the lines are identical before and after.
//   node node_modules/vite-node/dist/cli.mjs <this> -- <seed> <days> <out.txt>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const from = (p: string) => import(pathToFileURL(join(process.cwd(), p)).href);
const [seed = 'aspen', days = '10', out = 'hash.txt'] = process.argv.slice(2).filter((a) => a !== '--');
const { createWorld } = await from('src/sim/factory.ts');
const { currentWorldSettings } = await from('src/sim/profiles.ts');
const world = await from('src/sim/world.ts');
const { DAY } = await from('src/sim/constants.ts');
const w: any = createWorld(currentWorldSettings('normal', seed, { immigration: true }));
const lines: string[] = [];
const t0 = Date.now();
let nextMark = 2 * DAY;
while (w.tick < Number(days) * DAY) {
  world.stepWorld(w);
  if (w.tick >= nextMark) { lines.push(`tick ${w.tick} hash ${world.hashWorld(w)} alive ${w.persons.filter((p: any) => p.alive).length} events ${w.events.length}`); nextMark += 2 * DAY; }
}
lines.push(`end tick ${w.tick} hash ${world.hashWorld(w)} rules ${w.settings.rulesVersion} deaths ${w.deceased.length} wallMs ${Date.now() - t0}`);
writeFileSync(out, lines.join('\n') + '\n');
console.log(lines.at(-1));
