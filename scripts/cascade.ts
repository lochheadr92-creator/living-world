// Measure how much one thing leads to another in a world (scripts/cascade/trace.ts).
//   npx vite-node scripts/cascade.ts -- --seed meadow [--profile large] [--days 12] [--json out.json]
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { tellStory, trace } from './cascade/trace';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'meadow');
const profile = opt('profile', 'large') as ProfileName;
const days = Number(opt('days', '12'));
const world = createWorld(settingsForProfile(profile, seed, { immigration: false }));
const r = trace(world, days);
if (opt('json', '')) writeFileSync(opt('json', ''), JSON.stringify({ seed, profile, ...r }));
console.log(`seed ${seed} (${profile}), ${r.days} days, ${r.people} people alive`);
console.log(`  happenings ${r.happenings}: ${Object.entries(r.perSystem).map(([k, v]) => k + ' ' + v).join(', ')}`);
console.log(`  links ${r.links}, of which between different systems ${r.crossSystemLinks} (${r.links ? Math.round((100 * r.crossSystemLinks) / r.links) : 0}%)`);
console.log(`  cascade sizes: ${Object.entries(r.sizes).map(([k, v]) => k + ':' + v).join('  ')}; story-like ${r.storyLike}; longest chain ${r.longestDepth}`);
console.log('  commonest links: ' + Object.entries(r.transitions).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', '));
console.log('  what a happening makes a person go on to do (activity lift ≥1.5, ≥8 cases):');
const labels = Object.keys(r.lifts);
if (!labels.length) console.log('    none: nothing changes what anyone does next');
for (const l of labels) console.log(`    after ${l}: ${r.lifts[l].map((x) => `${x.activity} ×${x.lift} (${x.n})`).join(', ')}`);
r.stories.forEach((c, i) => console.log(`  story ${i + 1} (${c.nodes.length} happenings, ${c.people} people, ${c.systems.join('+')}, chain ${c.depth}):\n${tellStory(c)}`));
