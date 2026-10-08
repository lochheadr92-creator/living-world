// Natural-activation evidence for the village-economy expansion: run an ordinary seeded rich world and report, for each new building type,
// whether anyone decided to build it, whether it was finished, and whether anyone used it (docs/BUILDINGS.md).
//   npx vite-node scripts/chainwatch.ts -- --seed meadow [--profile normal|large] [--days 14] [--dynamics rich] [--json out.json]
// It only watches: nothing here changes the world.
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { RICH_ONLY_BUILDINGS, DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'meadow');
const profile = opt('profile', 'normal') as ProfileName;
const days = Number(opt('days', '14'));
const dynamics = opt('dynamics', 'rich') as 'authored' | 'rich';
const w = createWorld(settingsForProfile(profile, seed, { immigration: false, dynamics }));
const types: string[] = [...RICH_ONLY_BUILDINGS];
const planned: Record<string, { tick: number; by: string }[]> = {};
const uses: Record<string, { activities: number; people: Set<number>; first: number }> = {};
const seenSite = new Set<number>();
w.hooks = {
  onActivityStart: (p, a) => {
    if (a.targetType !== 'building' || !a.targetId) return;
    const e = w.byId.get(a.targetId);
    if (!e || e.ent !== 'building' || !types.includes(e.type)) return;
    const u = (uses[e.type] ??= { activities: 0, people: new Set(), first: w.tick });
    u.activities++;
    u.people.add(p.id);
  },
};
const born: Record<string, number[]> = {};
for (let i = 0; i < days * DAY; i++) {
  stepWorld(w);
  if (i % 20 === 0) {
    for (const s of w.sites) if (types.includes(s.type) && !seenSite.has(s.id)) {
      seenSite.add(s.id);
      (planned[s.type] ??= []).push({ tick: w.tick, by: w.persons.find((p) => p.id === s.creatorId)?.name ?? '?' });
    }
    for (const b of w.buildings) if (types.includes(b.type) && !(born[b.type] ?? []).includes(b.id)) (born[b.type] ??= []).push(b.id);
  }
}
const report = types.map((t) => ({
  type: t,
  sitesMarkedOut: (planned[t] ?? []).length,
  firstMarkedOutDay: planned[t]?.[0] ? Math.round((planned[t][0].tick / DAY) * 10) / 10 : null,
  completed: w.buildings.filter((b) => b.type === t).length,
  standingNow: w.buildings.filter((b) => b.type === t).map((b) => ({ id: b.id, at: [b.x, b.y], condition: Math.round(b.condition), water: b.store.items.water ?? 0 })),
  uses: uses[t] ? { activities: uses[t].activities, people: uses[t].people.size } : { activities: 0, people: 0 },
  openSites: w.sites.filter((s) => s.type === t).map((s) => ({ id: s.id, status: s.status, work: Math.round((s.work / s.workTotal) * 100) + '%' })),
}));
const out = {
  seed,
  profile,
  dynamics,
  days,
  commit: (() => {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  })(),
  people: w.persons.filter((p) => p.alive).length,
  waterLedger: Object.fromEntries(Object.entries(w.ledger.reasons).filter(([k]) => /well|water/.test(k))),
  report,
};
if (opt('json', '')) writeFileSync(opt('json', ''), JSON.stringify(out));
console.log(JSON.stringify(out, null, 1));
