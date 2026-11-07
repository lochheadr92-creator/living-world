// REVIEW-ONLY measurement (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// Loads the retained rules-109 day-45 Large meadow save (read-only, from the completion worktree) under CURRENT code
// (it keeps running rules 109 by design), then measures: load time, 240-tick continuation cost, inspector cost over all
// living people, full-serialization purity of inspection, serialized size, and the size of the longest person panel.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson, describeEntity } from '../src/sim/inspect';
import { conservationReport } from '../src/sim/economy';
import { reviewOut } from './helpers/review_out';

const SAVE = 'C:/dev/Claude Experiment/living-world-completion/autonomy_evidence/mature109-large-meadow-45/final-save.json';
const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };

describe('REVIEW: retained mature Large save under current code', () => {
  // the save lives in a sibling worktree on the reviewer's machine; elsewhere there is nothing to measure, and that is said, not failed
  it.skipIf(!existsSync(SAVE))('load, continue 240 ticks, inspect everyone, purity, size', () => {
    const text = readFileSync(SAVE, 'utf8');
    const l0 = performance.now(); const w = deserializeWorld(text); const loadMs = performance.now() - l0;
    const alive = w.persons.filter((p) => p.alive);
    const before = serializeWorld(w); const h0 = hashWorld(w);
    const insp: number[] = []; let longest = { name: '', chars: 0, decisions: 0, relationshipLines: 0, logLines: 0 };
    const i0 = performance.now();
    for (const p of alive) { const a = performance.now(); const v = describePerson(w, p.id, { opportunities: true }); if (!v) throw new Error(`Missing inspector view for living person ${p.id}`); const d = performance.now() - a; insp.push(d); const chars = JSON.stringify(v).length; if (chars > longest.chars) longest = { name: p.name, chars, decisions: v.decisionHistory.length, relationshipLines: (v as any).relationshipHistory?.length ?? -1, logLines: p.log.length }; }
    const inspectAllMs = performance.now() - i0;
    const ent: number[] = []; for (const b of w.buildings) { const a = performance.now(); describeEntity(w, b.id); ent.push(performance.now() - a); }
    const after = serializeWorld(w); const h1 = hashWorld(w);
    const ticks: number[] = []; const t0 = performance.now();
    for (let t = 0; t < 240; t++) { const a = performance.now(); stepWorld(w); ticks.push(performance.now() - a); }
    const contMs = performance.now() - t0;
    const s0 = performance.now(); const json = serializeWorld(w); const saveMs = performance.now() - s0;
    const cons = conservationReport(w);
    const counts = { persons: w.persons.length, alive: alive.length, deceased: w.deceased.length, buildings: w.buildings.length, sites: w.sites.length, piles: w.piles.length, graves: w.graves.length, events: w.events.length, chronicle: (w as any).chronicle?.length, requests: w.requests.length, reservations: w.reservations.size, conversations: w.conversations.length, meals: w.meals.length, occasions: (w as any).occasions?.length, tools: w.tools.length, carts: w.carts.length, sumLog: alive.reduce((n, p) => n + p.log.length, 0), sumBeliefs: alive.reduce((n, p) => n + Object.keys(p.beliefs).length, 0), sumCommitments: alive.reduce((n, p) => n + p.commitments.length, 0), sumHeard: alive.reduce((n, p) => n + (p.heard?.length ?? 0), 0), sumSocialMemory: alive.reduce((n, p) => n + (p.socialMemory?.length ?? 0), 0), sumWhereabouts: alive.reduce((n, p) => n + Object.keys(p.whereabouts).length, 0), sumRelations: alive.reduce((n, p) => n + Object.keys(p.relations).length, 0), sumCooldownKeys: alive.reduce((n, p) => n + Object.keys(p.cooldowns).length, 0), sumFailures: alive.reduce((n, p) => n + Object.keys(p.failures).length, 0) };
    const out = { rules: w.settings.rulesVersion, tick: w.tick, day: w.tick / 2400, loadMs, inputBytes: text.length, serializedBytes: json.length, saveMs, inspectMs: { p50: q(insp, 0.5), p95: q(insp, 0.95), max: Math.max(...insp), all: inspectAllMs }, entityInspectMs: { p95: q(ent, 0.95), n: ent.length }, pureSerialized: before === after, pureHash: h0 === h1, tickMs: { p50: q(ticks, 0.5), p95: q(ticks, 0.95), max: Math.max(...ticks), mean: contMs / 240 }, conservationOk: cons.ok, counts, longestPanel: longest };
    writeFileSync(reviewOut() + '/mature-large.json', JSON.stringify(out, null, 1));
    expect(alive.length).toBeGreaterThan(50);
  });
});
