// REVIEW B (read-only audit): exact save/load round trip of a natural rules-115 world at several ticks.
// Not part of the project's contract suite; created by the reviewer. Delete after the review.
import { describe, expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';
const REPORT = 'C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/agent_b/roundtrip_report.txt';

/** first differing path, key-order sensitive (as the JSON text is) */
function firstDiff(a: unknown, b: unknown, path = ''): string | null {
  if (Object.is(a, b)) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return `${path || '(root)'}: ${JSON.stringify(a)?.slice(0, 120)} vs ${JSON.stringify(b)?.slice(0, 120)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  if (ka.length !== kb.length) return `${path}: key count ${ka.length} vs ${kb.length} (${ka.filter((k) => !kb.includes(k)).slice(0, 5)} | ${kb.filter((k) => !ka.includes(k)).slice(0, 5)})`;
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return `${path}: key order ${ka[i]} vs ${kb[i]} at ${i}`;
  for (const k of ka) {
    const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return null;
}

/** JSON-hostile values in the live world object: NaN, +-Infinity, -0, array holes / undefined elements, present-but-undefined keys */
function anomalies(root: World): string[] {
  const out: string[] = [];
  let undefKeys = 0;
  const undefSamples: string[] = [];
  const seen = new Set<object>();
  const walk = (v: unknown, path: string): void => {
    if (out.length > 40) return;
    if (typeof v === 'number') {
      if (Number.isNaN(v)) out.push(`NaN at ${path}`);
      else if (!Number.isFinite(v)) out.push(`${v} at ${path}`);
      else if (Object.is(v, -0)) out.push(`-0 at ${path}`);
      return;
    }
    if (typeof v === 'function') {
      out.push(`function at ${path}`);
      return;
    }
    if (v === null || typeof v !== 'object') return;
    if (seen.has(v)) return;
    seen.add(v);
    if (v instanceof Float32Array) {
      for (let i = 0; i < v.length; i++) if (Number.isNaN(v[i])) { out.push(`NaN in f32 ${path}[${i}]`); break; }
      return;
    }
    if (v instanceof Uint8Array || v instanceof Int32Array) return;
    if (v instanceof Map) { for (const [k, x] of v) walk(x, `${path}{${String(k)}}`); return; }
    if (v instanceof Set) { let i = 0; for (const x of v) walk(x, `${path}<${i++}>`); return; }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        if (!(i in v)) { out.push(`hole at ${path}[${i}]`); continue; }
        if (v[i] === undefined) { out.push(`undefined element at ${path}[${i}]`); continue; }
        walk(v[i], `${path}[${i}]`);
      }
      return;
    }
    for (const k of Object.keys(v as object)) {
      if (path === '' && (k === 'byId' || k === 'grid' || k === 'pgrid' || k === 'hooks')) continue;
      const x = (v as Record<string, unknown>)[k];
      if (x === undefined) { undefKeys++; if (undefSamples.length < 8) undefSamples.push(`${path}.${k}`); continue; }
      if (x && typeof x === 'object' && (x as object).constructor && (x as object).constructor.name === 'RNG') continue;
      walk(x, path ? `${path}.${k}` : k);
    }
  };
  walk(root, '');
  if (undefKeys) out.push(`present-but-undefined keys: ${undefKeys} e.g. ${undefSamples.join(', ')}`);
  return out;
}

function richness(w: World): Record<string, number> {
  const alive = w.persons.filter((p) => p.alive);
  return {
    tick: w.tick,
    alive: alive.length,
    conversations: w.conversations.length,
    reservations: w.reservations.size,
    carts: w.carts.length,
    openMeals: w.meals.filter((m) => m.status !== 'done' && m.status !== 'cancelled').length,
    indoors: alive.filter((p) => p.indoors !== undefined).length,
    withClaims: alive.filter((p) => (p.activity?.claims.length ?? 0) > 0).length,
    suspended: alive.filter((p) => p.suspended).length,
    activeCommitments: alive.reduce((n, p) => n + p.commitments.filter((c) => c.status === 'active').length, 0),
    pendingRequests: w.requests.filter((r) => r.status === 'pending' || r.status === 'promised').length,
    intentions: alive.reduce((n, p) => n + p.intentions.length, 0),
    sites: w.sites.length,
    buildings: w.buildings.length,
    piles: w.piles.length,
    tools: w.tools.length,
  };
}

const CHECKPOINTS = [600, 3000, 6000];
const CONTINUE = 300;

describe('REVIEW B: save/load round trip then continue, natural rules-115 world', () => {
  for (const seed of ['river', 'meadow', 'forest']) {
    it(`${seed}: byte-identical continuation after loading at ${CHECKPOINTS.join('/')}`, () => {
      const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
      expect(w.settings.rulesVersion).toBe(115);
      const report: string[] = [];
      let t = 0;
      for (const cp of CHECKPOINTS) {
        while (t < cp) { stepWorld(w); t++; }
        const anomaly = anomalies(w);
        report.push(`cp ${cp}: ${JSON.stringify(richness(w))}`);
        if (anomaly.length) report.push(`  anomalies: ${anomaly.join('; ')}`);
        const text = serializeWorld(w);
        report.push(`  packed persons: ${text.includes('"__cols"')}; bytes ${text.length}`);
        const copy = deserializeWorld(text);
        const again = serializeWorld(copy);
        if (again !== text) report.push(`  IMMEDIATE re-serialize differs: ${firstDiff(JSON.parse(text), JSON.parse(again))}`);
        if (hashWorld(copy) !== hashWorld(w)) report.push('  IMMEDIATE hash differs');
        let orderDiff = 0;
        let mixedCells = 0;
        for (let ci = 0; ci < w.grid.cells.length; ci++) {
          const a = w.grid.cells[ci].map((e) => e.id).join(',');
          const b = copy.grid.cells[ci].map((e) => e.id).join(',');
          if (a !== b) orderDiff++;
          if (new Set(w.grid.cells[ci].map((e) => e.ent)).size > 1) mixedCells++;
        }
        report.push(`  static-grid cells whose entity order differs after load: ${orderDiff} (cells holding mixed kinds: ${mixedCells})`);
        // is the runtime cell order simply ascending id (creation order)? if so a canonical rebuild is trivial
        let unsortedRuntime = 0;
        for (const cell of w.grid.cells) for (let i = 1; i < cell.length; i++) if (cell[i].id < cell[i - 1].id) { unsortedRuntime++; break; }
        report.push(`  runtime cells not in ascending-id order: ${unsortedRuntime}`);
        // which present-but-undefined key paths exist (normalised), and why the column packing of persons is not used
        const paths = new Map<string, number>();
        const seen2 = new Set<object>();
        const walk2 = (v: unknown, path: string): void => {
          if (v === null || typeof v !== 'object' || seen2.has(v)) return;
          seen2.add(v);
          if (v instanceof Map || v instanceof Set || ArrayBuffer.isView(v)) return;
          if (Array.isArray(v)) { for (const x of v) walk2(x, `${path}[]`); return; }
          for (const k of Object.keys(v as object)) {
            if (path === '' && (k === 'byId' || k === 'grid' || k === 'pgrid' || k === 'hooks')) continue;
            const x = (v as Record<string, unknown>)[k];
            const pth = path ? `${path}.${k}` : k;
            if (x === undefined) paths.set(pth, (paths.get(pth) ?? 0) + 1);
            else walk2(x, pth);
          }
        };
        walk2(w, '');
        report.push(`  present-but-undefined key paths: ${[...paths.entries()].map(([k, n]) => `${k}×${n}`).join(', ')}`);
        const k0 = Object.keys(w.persons[0]);
        const topUndef = new Set<string>();
        let firstMismatch = '';
        for (const p of w.persons) {
          const ks = Object.keys(p);
          for (const k of ks) if ((p as unknown as Record<string, unknown>)[k] === undefined) topUndef.add(k);
          if (!firstMismatch && (ks.length !== k0.length || ks.some((k, i) => k !== k0[i]))) firstMismatch = `person ${p.id}: keys differ from person ${w.persons[0].id} (only in one: ${ks.filter((k) => !k0.includes(k))} | ${k0.filter((k) => !ks.includes(k))}; order differs: ${ks.length === k0.length && ks.every((k) => k0.includes(k))})`;
        }
        report.push(`  packPersons fallback cause: top-level undefined person keys: [${[...topUndef]}]; ${firstMismatch || 'all persons share the key list'}`);
        let diverged: string | null = null;
        for (let i = 0; i < CONTINUE; i++) {
          stepWorld(w);
          stepWorld(copy);
          t++;
          if ((i + 1) % 25 === 0 || i === CONTINUE - 1) {
            const ha = hashWorld(w);
            const hb = hashWorld(copy);
            const sa = serializeWorld(w);
            const sb = serializeWorld(copy);
            if (ha !== hb || sa !== sb) {
              diverged = `  DIVERGED by tick ${w.tick} (hash ${ha} vs ${hb}): ${firstDiff(JSON.parse(sa), JSON.parse(sb))}`;
              break;
            }
          }
        }
        report.push(diverged ?? `  continued ${CONTINUE} ticks identical (hash ${hashWorld(w)})`);
      }
      appendFileSync(REPORT, `\n[${seed}]\n` + report.join('\n') + '\n');
      expect(report.filter((l) => l.includes('DIVERGED') || l.includes('IMMEDIATE')), report.join('\n')).toEqual([]);
    }, 600_000);
  }
});
