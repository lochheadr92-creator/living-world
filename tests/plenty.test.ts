// Rules 226: more food from the same land (src/sim/plenty.ts; read in sources.ts updateSources, farming.ts updatePlots and
// knowledge.ts estimatedAmount). Every situation here is STAGED: places are emptied by hand, a plot is set a moment short of
// ripe, and the regrowth and crop updates are driven directly, so these check the rule; they are not examples of an ordinary
// world. Each check has the rules-225 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createPlot, updatePlots } from '../src/sim/farming';
import { estimatedAmount } from '../src/sim/knowledge';
import { PLENTY_CROPS, PLENTY_PARTS, PLENTY_WILD, cropPlenty, setPlenty, wildPlenty } from '../src/sim/plenty';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { updateSources } from '../src/sim/sources';
import type { Belief, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

afterEach(() => setPlenty(true));

const world = (seed: string, version: number, extra: Record<string, unknown> = {}): World => natural(seed, { dynamics: 'rich', rulesVersion: version, ...extra });
const FOOD = ['berry_bush', 'fruit_tree', 'fish_spot', 'wild_grain'];

/** Empty every wild food place, drive the regrowth update `ticks` times in a standing world, and count what came back. */
function regrown(w: World, ticks: number): number {
  for (const s of w.sources) if (FOOD.includes(s.type)) { s.amount = 0; s.regrowTimer = 0; }
  for (let i = 0; i < ticks; i++) updateSources(w);
  return w.sources.filter((s) => FOOD.includes(s.type)).reduce((n, s) => n + s.amount, 0);
}
/** A plot a moment short of ripe; the crop update ripens it and its grain and seed are read. */
function ripened(w: World): { grain: number; seeds: number } {
  const pl = createPlot(w, Math.floor(w.camp.x) + 5, Math.floor(w.camp.y) + 5, w.households[0].id);
  pl.state = 'growing';
  pl.progress = 0.9999;
  pl.care = 1;
  pl.careAcc = 0.5;
  w.light = 1;
  for (let i = 0; i < 40 && pl.state === 'growing'; i++) updatePlots(w);
  expect(pl.state).toBe('ripe');
  return { grain: pl.stock, seeds: pl.seedStock };
}

describe('rules 226: more food from the same land', () => {
  it('is the current version, above rules 225', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(226);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(226);
    expect(PLENTY_WILD).toBe(2);
    expect(PLENTY_CROPS).toBe(2);
  });

  it('wild food comes back twice as fast; a place holds no more than it did', () => {
    const before = regrown(world('plenty-wild', 225), 300);
    const now = world('plenty-wild', 226);
    const after = regrown(now, 300);
    expect(before).toBeGreaterThan(20);
    // whole units come back, so over a short while the count is lumpy; the pace itself is checked exactly below
    expect(after / before).toBeGreaterThan(1.7);
    expect(after / before).toBeLessThan(3);
    // one update of an emptied place moves its clock exactly twice as far
    const step = (w: World): number[] => {
      const food = w.sources.filter((s) => FOOD.includes(s.type));
      for (const s of food) { s.amount = 0; s.regrowTimer = 0; }
      updateSources(w);
      return food.map((s) => s.regrowTimer);
    };
    const slow = step(world('plenty-pace', 225));
    const fast = step(world('plenty-pace', 226));
    expect(fast.length).toBe(slow.length);
    expect(slow.some((t) => t > 0)).toBe(true);
    fast.forEach((t, i) => expect(t).toBeCloseTo(slow[i] * 2, 9));
    // left long enough every place is full, and full is what it always was
    const full = (w: World): number => { regrown(w, 12000); return w.sources.filter((s) => FOOD.includes(s.type)).reduce((n, s) => n + s.amount, 0); };
    expect(full(world('plenty-full', 226))).toBe(full(world('plenty-full', 225)));
    for (const s of now.sources) expect(s.amount).toBeLessThanOrEqual(s.max);
  });

  it('only wild food: trees, rock, clay and ore are as they were', () => {
    const w = world('plenty-kinds', 226);
    for (const k of FOOD) expect(wildPlenty(w, k)).toBe(2);
    for (const k of ['tree', 'rock', 'clay_pit', 'ore_vein', 'outcrop', 'water']) expect(wildPlenty(w, k)).toBe(1);
  });

  it('a ripened plot carries twice the grain and the same seed', () => {
    const before = ripened(world('plenty-crop', 225));
    const after = ripened(world('plenty-crop', 226));
    expect(before.grain).toBeGreaterThanOrEqual(1);
    expect(after.grain).toBe(before.grain * 2);
    expect(after.seeds).toBe(before.seeds);
  });

  it('what a person expects of a place not seen for a while follows the faster regrowth', () => {
    const memory = (w: World): Belief => ({ id: 1, kind: 'berry_bush', x: 10.5, y: 10.5, amount: 0, max: 6, seen: w.tick - 900, src: 'seen', from: 0, learned: w.tick - 900 });
    const old = world('plenty-memory', 225);
    const now = world('plenty-memory', 226);
    run(old, 1);
    run(now, 1);
    old.tick = now.tick = 2000;
    expect(estimatedAmount(old, memory(old))).toBe(3); // 900 ticks at one berry every 300
    expect(estimatedAmount(now, memory(now))).toBe(6); // twice the pace, and never more than the place holds
    const rock = (w: World): Belief => ({ ...memory(w), kind: 'rock', max: 10 });
    expect(estimatedAmount(now, rock(now))).toBe(estimatedAmount(old, rock(old)));
  });

  it('each part has its own switch; authored worlds and rules 225 keep the old amounts', () => {
    const w = world('plenty-switch', 226);
    expect([wildPlenty(w, 'berry_bush'), cropPlenty(w)]).toEqual([2, 2]);
    setPlenty(false, 'wild');
    expect([wildPlenty(w, 'berry_bush'), cropPlenty(w)]).toEqual([1, 2]);
    setPlenty(false, 'crops');
    expect([wildPlenty(w, 'berry_bush'), cropPlenty(w)]).toEqual([1, 1]);
    setPlenty(true);
    expect(PLENTY_PARTS).toEqual(['wild', 'crops']);
    const authored = natural('plenty-authored', { dynamics: 'authored', rulesVersion: 226 });
    expect([wildPlenty(authored, 'berry_bush'), cropPlenty(authored)]).toEqual([1, 1]);
    const at225 = world('plenty-switch', 225);
    expect([wildPlenty(at225, 'berry_bush'), cropPlenty(at225)]).toEqual([1, 1]);
  });

  it('nothing is saved: a world saved and loaded continues the same', () => {
    const w = world('plenty-save', 226);
    run(w, 400);
    const copy = deserializeWorld(serializeWorld(w));
    run(w, 200);
    run(copy, 200);
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
  });
});
