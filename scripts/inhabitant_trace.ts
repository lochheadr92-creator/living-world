/**
 * Observer-only inhabitant trace.
 * Run: npx vite-node scripts/inhabitant_trace.ts meadow 2
 * Optional third argument: person ID (otherwise first living inhabitant).
 * JSONL on stdout; no world mutation beyond stepWorld.
 */
import { defaultSettings, createWorld } from '../src/sim/factory';
import { hashWorld, stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? '2');
const requestedId = process.argv[4] === undefined ? undefined : Number(process.argv[4]);
if (!Number.isFinite(days) || days <= 0 || days > 30 || (requestedId !== undefined && !Number.isSafeInteger(requestedId))) {
  throw new Error('Usage: npx vite-node scripts/inhabitant_trace.ts [seed] [days: 0..30] [personId]');
}
const world = createWorld(defaultSettings(seed));
const person = requestedId === undefined ? world.persons.find(p => p.alive) : world.persons.find(p => p.id === requestedId);
if (!person) throw new Error('Requested inhabitant not found');
const emit = (kind: string, detail: unknown) => console.log(JSON.stringify({ tick: world.tick, personId: person.id, kind, detail }));
const snapshot = () => ({
  alive: person.alive,
  needs: { ...person.needs },
  health: person.health,
  position: { x: person.x, y: person.y },
  activity: person.activity ? { kind: person.activity.kind, targetId: person.activity.targetId } : null,
  knowledge: { seen: person.seen.length, beliefs: Object.keys(person.beliefs).length },
  plans: person.intentions,
  commitments: person.commitments,
  relations: person.relations,
  memories: person.log,
  lastResult: person.lastResult,
});
emit('header', { seed, days, name: person.name, initialHash: hashWorld(world) });
let lastDecision = JSON.stringify(person.lastDecision);
let lastResult = JSON.stringify(person.lastResult);
let lastLog = JSON.stringify(person.log);
let lastActivity = person.activity?.kind ?? null;
emit('snapshot', snapshot());
for (let i = 0, limit = Math.ceil(days * DAY); i < limit; i++) {
  stepWorld(world);
  const decision = JSON.stringify(person.lastDecision);
  if (decision !== lastDecision) { emit('decision', person.lastDecision); lastDecision = decision; }
  const result = JSON.stringify(person.lastResult);
  if (result !== lastResult) { emit('result', person.lastResult); lastResult = result; }
  const log = JSON.stringify(person.log);
  if (log !== lastLog) { emit('memory', person.log); lastLog = log; }
  const activity = person.activity?.kind ?? null;
  if (activity !== lastActivity) { emit('activity', { from: lastActivity, to: activity }); lastActivity = activity; }
  if (world.tick % 240 === 0 || !person.alive) emit('snapshot', snapshot());
  if (!person.alive) break;
}
emit('end', { finalHash: hashWorld(world), final: snapshot() });
