import { setWaterWarning } from '../src/sim/water_warning';
// Diagnostic intervention, not a proposed simulation rule: fill the existing wells' ground once at the start.
// Compare to --fill off from the same historical save; the artificial addition is entered in the water ledger.
import { DAY } from '../src/sim/constants';
import { ledgerCreate } from '../src/sim/economy';
import { GROUND_CAP, groundAt } from '../src/sim/groundwater';
import { hashWorld, stepWorld } from '../src/sim/world';
import { argsOf, worldFromArgs } from './world_args';

const { opt } = argsOf(process.argv);
const { w, loaded } = worldFromArgs(opt);
if (!loaded) throw new Error('This diagnostic requires --load');
const warning = opt('warning', 'on');
if (!['on','off'].includes(warning)) throw new Error('Invalid warning switch');
setWaterWarning(warning === 'on');
const days = Number(opt('days', '10'));
if (!Number.isSafeInteger(days) || days <= 0) throw new Error('Invalid --days');
const fill = opt('fill', 'off');
if (fill !== 'on' && fill !== 'off') throw new Error('Invalid --fill');
const initialHash = hashWorld(w), priorDeaths = w.deceased.length;
let added = 0;
if (fill === 'on') for (const b of w.buildings) {
  if (b.type !== 'well') continue;
  const g = groundAt(w, b);
  if (!g) throw new Error('Groundwater is unavailable');
  const n = GROUND_CAP - g.amount;
  g.amount += n; added += n;
  if (n) ledgerCreate(w, 'water', n, 'diagnostic fill of existing groundwater');
}
const end = w.tick + days * DAY;
console.log(JSON.stringify({ event: 'start', loaded, rules: w.settings.rulesVersion, warning, fill, initialHash, added, tick: w.tick }));
while (w.tick < end) {
  stepWorld(w);
  if (w.tick % DAY === 0) console.log(JSON.stringify({
    event: 'day', day: w.tick / DAY, alive: w.persons.filter(p => p.alive).length,
    groundwater: Object.values(w.groundwater ?? {}).reduce((n, g) => n + g.amount, 0),
    surface: (w.waterBodies ?? []).reduce((n, b) => n + b.amount, 0),
    warningLogsRetained: w.persons.reduce((n,p)=>n+p.log.filter(e=>e.tick>=end-days*DAY && (e.text.includes('warned me that water') || e.text.includes('said water'))).length,0),
    deaths: w.deceased.slice(priorDeaths).reduce<Record<string, number>>((a, d) => { a[d.cause] = (a[d.cause] ?? 0) + 1; return a; }, {}),
  }));
}
console.log(JSON.stringify({ event: 'finish', hash: hashWorld(w), tick: w.tick }));
