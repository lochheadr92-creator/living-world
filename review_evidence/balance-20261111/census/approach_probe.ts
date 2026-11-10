// DIAGNOSTIC: how approaches for company end (socialize activities), by recorded failure reason, in an ordinary world at the current rules.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const from = (p: string) => import(pathToFileURL(join(process.cwd(), p)).href);
const [seed = 'meadow', days = '15'] = process.argv.slice(2).filter((a) => a !== '--');
const { createWorld } = await from('src/sim/factory.ts');
const { currentWorldSettings } = await from('src/sim/profiles.ts');
const { stepWorld } = await from('src/sim/world.ts');
const { DAY } = await from('src/sim/constants.ts');
const w: any = createWorld(currentWorldSettings('normal', seed, { immigration: true }));
const reasons: Record<string, number> = {}; const byPurpose: Record<string, Record<string, number>> = {};
let converseOk = 0, socializeFail = 0;
w.hooks = { onActivityEnd: (_p: any, a: any, outcome: string, detail: string) => {
  if (a.kind === 'converse' && outcome === 'success') converseOk++;
  if (a.kind !== 'socialize') return;
  socializeFail++;
  const r = String(detail ?? '').replace(/^[A-Z][a-z]+ /, '<name> ').slice(0, 60);
  reasons[r] = (reasons[r] ?? 0) + 1;
  const purpose = String(a.data?.purpose ?? '?');
  (byPurpose[purpose] ??= {})[r] = ((byPurpose[purpose] ??= {})[r] ?? 0) + 1;
} };
while (w.tick < Number(days) * DAY) stepWorld(w);
console.log(JSON.stringify({ seed, days: Number(days), converseOk, socializeFail, reasons: Object.fromEntries(Object.entries(reasons).sort((a, b) => b[1] - a[1])), byPurpose }));
