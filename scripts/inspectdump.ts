import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { describePerson } from '../src/sim/inspect';
const w = createWorld(defaultSettings(process.argv[2] ?? 'meadow'));
const at = Number(process.argv[3] ?? 1500);
for (let i = 0; i < at; i++) stepWorld(w);
for (const p of w.persons.slice(0, Number(process.argv[4] ?? 4))) {
  const v = describePerson(w, p.id)!;
  console.log(`\n=== ${v.name} (${v.age}, ${v.stage}) ${v.household} · ${v.home} · mood ${v.mood.toFixed(0)}`);
  console.log(' needs:', v.needs.map(n => `${n.label} ${n.value.toFixed(0)}${n.state !== 'ok' ? '!' + n.state : ''}`).join(', '), '| inv:', v.inventory.map(i => i.n + ' ' + i.kind).join(', ') || '-');
  console.log(' DOING   :', v.qa.doing);
  console.log(' WHY     :', v.qa.why);
  console.log(' TRYING  :', v.qa.trying);
  console.log(' STOPPING:', v.qa.stopping);
  console.log(' LAST    :', v.qa.lastAttempt);
  for (const o of v.opportunities.slice(0, 6)) console.log(`   · [${o.status}] ${o.what} (${o.distance.toFixed(0)} tiles): ${o.detail}`);
  if (v.requests.length) console.log(' requests:', v.requests.map(r => `${r.direction} ${r.other} ${r.text} → ${r.status}`).join('; '));
  console.log(' knows:', v.knowledge.places, 'places;', v.knowledge.seen, 'seen,', v.knowledge.hearsay, 'told,', v.knowledge.stale, 'stale');
}
