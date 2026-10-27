// Lists the World and Person fields that hashWorld (src/sim/world.ts) is blind to, by perturbing each field in a
// deserialized clone of a mid-run ordinary world and comparing the fingerprint. For each blind field it also says
// whether statediff.ts deepEqualState (over the serialized form) sees the perturbation, and classifies it.
//   npx vite-node scripts/hash_coverage.ts
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { deepEqualState } from './statediff';

const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
for (let i = 0; i < 2400; i++) stepWorld(w);
const baseHash = hashWorld(w);
const baseSer = JSON.parse(serializeWorld(w));

function perturb(v: unknown): unknown {
  if (typeof v === 'number') return v + 1;
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'string') return v + '#';
  if (v === null) return 0;
  if (v === undefined) return null;
  if (v instanceof Uint8Array) { const c = new Uint8Array(v); if (c.length) c[0] = (c[0] + 1) & 255; return c; }
  if (v instanceof Int32Array) { const c = new Int32Array(v); if (c.length) c[0] += 1; return c; }
  if (v instanceof Float32Array) { const c = new Float32Array(v); if (c.length) c[0] += 1; return c; }
  if (v instanceof Map) { const m = new Map(v); m.set('__perturb__', 1 as never); return m; }
  if (v instanceof Set) { const s = new Set(v); s.add('__perturb__'); return s; }
  if (Array.isArray(v)) { const c = v.slice(); if (c.length) c[0] = perturb(c[0]); return c; }
  if (typeof v === 'object') { const keys = Object.keys(v); if (!keys.length) return { __perturb__: 1 }; const c: Record<string, unknown> = { ...(v as Record<string, unknown>) }; c[keys[0]] = perturb(c[keys[0]]); return c; }
  return v;
}

function check(field: string, kind: 'world' | 'person'): { field: string; blind: boolean; deepSees: boolean } {
  const clone = deserializeWorld(serializeWorld(w));
  const target = kind === 'world' ? (clone as unknown as Record<string, unknown>) : (clone.persons[0] as unknown as Record<string, unknown>);
  target[field] = perturb(target[field]);
  let blind = true;
  try { blind = hashWorld(clone) === baseHash; } catch { blind = true; }
  const ser = JSON.parse(serializeWorld(clone));
  const deepSees = !deepEqualState(baseSer, ser);
  return { field, blind, deepSees };
}

const worldFields = Object.keys(w).sort();
const personFields = Object.keys(w.persons[0]).sort();

// Intentional absences: transient/derived/presentation fields that are not meant to be part of the deep fingerprint.
const COSMETIC_WORLD = new Set([
  'sceneLabel', 'light', 'fx', 'delayed', 'byId', 'grid', 'pgrid', 'usedNames', 'camp', 'accessCell', 'waterDist', 'stats', 'nextId',
  'terrain', 'solid', 'seed', 'W', 'H', 'settings', 'occ', 'stumps', 'roads', 'roadAge', 'wear',
]);
const COSMETIC_PERSON = new Set([
  'log', 'speech', 'lastResult', 'lastDecision', 'failures', 'whereabouts', 'asked', 'cooldowns', 'nextThink', 'seen', 'explored', 'nextAct', 'pose', 'heading', 'lastInteraction',
]);
const kind = (field: string, set: Set<string>): string => (set.has(field) ? 'cosmetic' : 'unexpected');

let out = '# Hash coverage\n\n';
out += '`hashWorld` (src/sim/world.ts) is the deep state fingerprint a verification run rests on. It does not hash every field. ';
out += 'This lists the World and Person fields a perturbation leaves the fingerprint unchanged on, for a normal river world at tick 2400, ';
out += 'whether the full serialized state (`deepEqualState` over `serializeWorld`) sees the perturbation, and a classification.\n\n';
out += '`cosmetic` = transient/derived/presentation/constant worldgen state intentionally left out of the dynamic fingerprint; ';
out += '`unexpected` = saved dynamic state the fingerprint does not directly cover (flagged for review, though many are covered indirectly by the hashed state that causes them, or by the separate ledger/invariant checks).\n\n';
out += 'Note: for a top-level *collection* field (persons, sources, buildings, sites, plots, piles, animals, tools, carts, meals) the probe perturbs one leaf, so a "blind" row there reflects that leaf, not the whole collection — `hashWorld` does iterate every one of those collections.\n';

out += '## World fields `hashWorld` is blind to\n\n| Field | deepEqualState sees it? | Class |\n|---|---|---|\n';
const worldBlind = worldFields.map((f) => check(f, 'world')).filter((r) => r.blind);
for (const r of worldBlind) out += `| \`world.${r.field}\` | ${r.deepSees ? 'yes' : 'no'} | ${kind(r.field, COSMETIC_WORLD)} |\n`;
if (!worldBlind.length) out += '| (none) | | |\n';

out += '\n## Person fields `hashWorld` is blind to\n\n| Field | deepEqualState sees it? | Class |\n|---|---|---|\n';
const personBlind = personFields.map((f) => check(f, 'person')).filter((r) => r.blind);
for (const r of personBlind) out += `| \`person.${r.field}\` | ${r.deepSees ? 'yes' : 'no'} | ${kind(r.field, COSMETIC_PERSON)} |\n`;
if (!personBlind.length) out += '| (none) | | |\n';

writeFileSync(new URL('../docs/HASH_COVERAGE.md', import.meta.url), out);
console.log(out);
