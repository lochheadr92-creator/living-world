// REVIEW-ONLY probe (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// Root cause of Isla's repeated "Breaking new ground … no way to get there" at plot (46,40) in the ordinary forest world.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { isFreeLand, isWalkable } from '../src/sim/registry';
import { findPath } from '../src/sim/pathfinding';
import { findPlotSpot } from '../src/sim/farming';
import { T } from '../src/sim/types';

describe('REVIEW: why the chosen field tile cannot be reached', () => {
  it('forest, Isla at tick 3204', () => {
    const w = createWorld(currentWorldSettings('normal', 'forest', { immigration: false }));
    for (let t = 0; t < 3203; t++) stepWorld(w);
    const p = w.persons.find((q) => q.name === 'Isla')!;
    const spot = findPlotSpot(w, p);
    const tn: Record<number, string> = {}; for (const [k, v] of Object.entries(T)) tn[v as number] = k;
    const cell = (x: number, y: number) => w.grid.cells[y * w.W + x]?.map((e: any) => `${e.ent}#${e.id}${e.type ? ':' + e.type : ''}`) ?? [];
    const around: Record<string, unknown> = {};
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = spot!.x + dx, y = spot!.y + dy; around[`${x},${y}`] = { terrain: tn[w.terrain[y * w.W + x]], free: isFreeLand(w, x, y), walk: isWalkable(w, x, y), ents: cell(x, y) }; }
    const sx = spot!.x + 0.5, sy = spot!.y + 1.5;
    const pathExact = findPath(w, p.x, p.y, sx, sy, { exact: { x: sx, y: sy }, cart: false, caller: 'review' } as any);
    const pathLoose = findPath(w, p.x, p.y, sx, sy, { cart: false, caller: 'review' } as any);
    const out = { tick: w.tick, isla: { x: p.x, y: p.y, indoors: p.indoors, activity: p.activity?.label }, spot, standing: { x: sx, y: sy }, pathExactLen: pathExact ? pathExact.length / 2 : null, pathLooseLen: pathLoose ? pathLoose.length / 2 : null, around, homeTile: (() => { const hh = w.households.find((h) => h.id === p.hhId); const b = hh?.homeId ? w.byId.get(hh.homeId) as any : null; return b && { type: b.type, x: b.x, y: b.y, w: b.w, h: b.h }; })() };
    writeFileSync('C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/till-root.json', JSON.stringify(out, null, 1));
    expect(spot).not.toBeNull();
  });
});
