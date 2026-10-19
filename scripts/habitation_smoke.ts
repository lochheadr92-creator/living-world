// Short autonomous observation, not an ensemble or a welfare-effect claim.
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { setHabitationAdmissions } from '../src/sim/habitation';
const on = !process.argv.includes('--no-entry');
setHabitationAdmissions(on);
const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
const initialHomes = w.buildings.filter(b=>b.type==='hut'||b.type==='house').length;
const previous = new Map<number, number>();
let entries = 0, exits = 0, indoorTicks = 0, first: unknown;
while (w.tick < 7200) {
  stepWorld(w);
  for (const p of w.persons) {
    const before = previous.get(p.id) ?? 0, now = p.indoors ?? 0;
    if (now && !before) {
      entries++;
      const b = w.byId.get(now);
      first ??= { tick: w.tick, person: p.id, name: p.name, home: now, activity: p.activity?.kind,
        builtTick:b?.ent==='building'?b.builtTick:null, builtBy:b?.ent==='building'?b.builtBy:null };
    }
    if (before && !now) exits++;
    if (now) indoorTicks++;
    previous.set(p.id, now);
  }
}
const roundTrip = deserializeWorld(serializeWorld(w));
console.log(JSON.stringify({ admission: on, seed:'river', profile:'normal', tick:w.tick, version:w.settings.rulesVersion,
  initialHomes, entries, exits, indoorTicks, first, homes:w.buildings.filter(b=>b.type==='hut'||b.type==='house').length,
  alive:w.persons.filter(p=>p.alive).length, hash:hashWorld(w), fullSaveRoundTrip:serializeWorld(roundTrip)===serializeWorld(w) }, null, 2));
setHabitationAdmissions(true);
