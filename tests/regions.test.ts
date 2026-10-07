// Larger worlds (src/sim/profiles.ts): the ordinary natural world, on a bigger map, founded in several places at once.
// The point of these worlds is that they start from scratch like the ordinary one: people, a fire, a few lean-tos, a little food and a
// handful of tools, with everything else left to be found, made and built. These tests hold that, and that each camp is a viable start
// of its own that knows nothing of the others.
import { describe, expect, it } from 'vitest';
import { conservationReport } from '../src/sim/economy';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { WATER_ID_BASE } from '../src/sim/knowledge';
import { findPath } from '../src/sim/pathfinding';
import { layoutFor, settingsForProfile } from '../src/sim/profiles';
import { rulesOf } from '../src/sim/rules';
import { nearestHub, settlementCount } from '../src/sim/settlements';
import { toolReport } from '../src/sim/toolreg';
import type { SourceType, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';

const cache = new Map<string, World>();
function world(profile: 'large' | 'huge', seed = 'meadow'): World {
  const key = profile + '|' + seed;
  let w = cache.get(key);
  if (!w) {
    w = createWorld(settingsForProfile(profile, seed));
    cache.set(key, w);
  }
  return w;
}

const camps = (w: World) => [w.camp, ...(w.extraSettlements ?? [])];
const within = (w: World, c: { x: number; y: number }, r: number, types: SourceType[]) => w.sources.filter((s) => types.includes(s.type) && s.amount > 0 && Math.hypot(s.x - c.x, s.y - c.y) <= r).length;

describe('profiles', () => {
  it('the ordinary world has no profile and no layout', () => {
    expect(layoutFor(defaultSettings('meadow'))).toBeNull();
    expect(settingsForProfile('normal', 'meadow')).toEqual(defaultSettings('meadow'));
  });

  it('a larger world is founded under the scaled rules, with one settlement being one camp', () => {
    expect(settingsForProfile('huge', 'x')).toMatchObject({ profile: 'huge', population: 250, ruleSet: 'scaled', settlementFounders: 42, immigration: true, harsh: false });
    expect(settingsForProfile('large', 'x')).toMatchObject({ profile: 'large', population: 100, ruleSet: 'scaled', settlementFounders: 25 });
  });

  it('splits however many founders are asked for among the camps, and sizes each camp by its own people', () => {
    const l = layoutFor(settingsForProfile('huge', 'x', { population: 100 }))!;
    expect(l.hubs.map((h) => h.founders)).toEqual([17, 17, 17, 17, 16, 16]);
    expect(l.hubs[0].scale).toBeCloseTo(17 / 28, 6);
    const same = layoutFor(settingsForProfile('huge', 'x'))!;
    expect(layoutFor(settingsForProfile('huge', 'x'))).toEqual(same); // the same seed lays the camps out the same way
    expect(layoutFor(settingsForProfile('huge', 'y'))!.hubs[0].x).not.toBe(same.hubs[0].x);
  });
});

describe.each([
  { profile: 'large' as const, W: 160, camps: 4, people: 100, minGap: 36 },
  { profile: 'huge' as const, W: 256, camps: 6, people: 250, minGap: 60 },
])('$profile world', ({ profile, W, camps: nCamps, people, minGap }) => {
  it('has the size, camps and people it says it has', () => {
    const w = world(profile);
    expect(w.W).toBe(W);
    expect(w.H).toBe(W);
    expect(settlementCount(w)).toBe(nCamps);
    expect(w.persons.length).toBe(people);
    for (const a of camps(w)) {
      expect(a.x).toBeGreaterThan(40);
      expect(a.y).toBeGreaterThan(40);
      expect(a.x).toBeLessThan(W - 40);
      expect(a.y).toBeLessThan(W - 40);
      for (const b of camps(w)) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(minGap);
    }
    const perCamp = camps(w).map((c) => w.persons.filter((p) => nearestHub(w, p.x, p.y) === c).length);
    expect(perCamp.reduce((a, b) => a + b, 0)).toBe(people);
    expect(Math.max(...perCamp) - Math.min(...perCamp)).toBeLessThanOrEqual(1);
  });

  it('starts bare: fires and lean-tos, a little food and a few tools, nothing made', () => {
    const w = world(profile);
    const types = new Set(w.buildings.map((b) => b.type));
    expect([...types].sort()).toEqual(['fire', 'lean_to']);
    expect(w.buildings.filter((b) => b.type === 'fire').length).toBeGreaterThanOrEqual(nCamps);
    expect(w.sites).toHaveLength(0);
    expect(w.plots).toHaveLength(0);
    expect(w.carts).toHaveLength(0);
    expect(w.piles).toHaveLength(0);
    const made = ['planks', 'handles', 'bricks', 'charcoal', 'iron', 'flour', 'bread', 'jar', 'saw', 'hammer', 'clay', 'ore', 'stone'] as const;
    const holders = [...w.persons.map((p) => p.inv), ...w.buildings.map((b) => b.store.items)];
    for (const items of holders) for (const k of made) expect(items[k] ?? 0, k).toBe(0);
    for (const t of w.tools) expect(t.tier, 'no iron tools').toBe(0);
    // the same tools per person as the ordinary camp (2 axes, 1 hoe, 2 baskets and 1 pick for 28 people), give or take rounding
    const perCamp = (kind: string) => w.tools.filter((t) => t.kind === kind).length / (people / 28);
    expect(perCamp('axe')).toBeGreaterThan(1.3);
    expect(perCamp('axe')).toBeLessThan(2.7);
    expect(perCamp('basket')).toBeGreaterThan(1.3);
    expect(perCamp('basket')).toBeLessThan(2.7);
    // most households have a roof of their own, the rest do not (as in the ordinary world, where about 40% start without)
    const roofless = w.households.filter((h) => !h.homeId).length;
    expect(roofless).toBeGreaterThan(0);
    expect(roofless).toBeLessThan(w.households.length * 0.6);
  });

  it('gives every camp what the ordinary camp has within reach: water, food, stone, clay, ore, and wolves to be careful of', () => {
    const w = world(profile);
    for (const [i, c] of camps(w).entries()) {
      let shore = Infinity;
      for (let k = 0; k < w.accessCell.length; k++) {
        const t = w.accessCell[k];
        if (t >= 0) shore = Math.min(shore, Math.hypot((t % w.W) - c.x, Math.floor(t / w.W) - c.y));
      }
      expect(shore, `camp ${i} water`).toBeLessThan(15);
      expect(within(w, c, 30, ['berry_bush']), `camp ${i} berries`).toBeGreaterThanOrEqual(15);
      expect(within(w, c, 30, ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot']), `camp ${i} food`).toBeGreaterThanOrEqual(40);
      expect(within(w, c, 30, ['rock']), `camp ${i} stone`).toBeGreaterThanOrEqual(10);
      for (const d of ['clay_pit', 'outcrop', 'ore_vein'] as const) expect(within(w, c, 60, [d]), `camp ${i} ${d}`).toBeGreaterThanOrEqual(1);
      expect(Math.min(...w.animals.map((a) => Math.hypot(a.denX - c.x, a.denY - c.y))), `camp ${i} wolves`).toBeGreaterThanOrEqual(20);
    }
    expect(w.animals.length).toBeGreaterThanOrEqual(Math.round(3 * (people / 28)) - 2);
  });

  it('keeps the camps apart: founders know their own camp and its people, and nobody else', () => {
    const w = world(profile);
    for (const p of w.persons) {
      const mine = nearestHub(w, p.x, p.y);
      for (const k in p.relations) {
        const q = w.byId.get(Number(k));
        if (q && q.ent === 'person') expect(nearestHub(w, q.x, q.y)).toBe(mine);
      }
      for (const k in p.beliefs) {
        const b = p.beliefs[k as unknown as number];
        expect(Math.hypot(b.x - mine.x, b.y - mine.y), `${p.name} knows of a place far from home`).toBeLessThan(65);
      }
    }
  });

  it('is a world a person could walk across: every camp can be reached from every other on foot (for this seed)', () => {
    const w = world(profile);
    const hs = camps(w);
    for (let i = 0; i < hs.length; i++)
      for (let j = i + 1; j < hs.length; j++) {
        const path = findPath(w, hs[i].x, hs[i].y, hs[j].x, hs[j].y, { maxNodes: 400000, goalFn: (x, y) => Math.hypot(x + 0.5 - hs[j].x, y + 0.5 - hs[j].y) <= 4 });
        expect(path, `camp ${i} to camp ${j}`).not.toBeNull();
      }
  });

  it('runs the real simulation: the books balance, nobody has a broken need, ids stay clear of the water-belief range', () => {
    const w = createWorld(settingsForProfile(profile, 'smoke'));
    for (let i = 0; i < 400; i++) stepWorld(w);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
    for (const p of w.persons) for (const v of Object.values(p.needs)) expect(Number.isFinite(v)).toBe(true);
    expect(w.persons.filter((p) => p.alive).length).toBe(people);
    expect(w.nextId).toBeLessThan(WATER_ID_BASE);
  }, 180_000);

  it('is repeatable for a seed and different for another', () => {
    const a = createWorld(settingsForProfile(profile, 'repeat'));
    const b = createWorld(settingsForProfile(profile, 'repeat'));
    const c = createWorld(settingsForProfile(profile, 'other'));
    expect(deepHash(a)).toBe(deepHash(b));
    expect(deepHash(c)).not.toBe(deepHash(a));
  }, 120_000);
});

describe('the rules of a larger world follow its camps', () => {
  it('limits grow with the founders of the world and of a camp', () => {
    const r = rulesOf(world('huge'));
    expect(r.immigrationCap).toBe(482);
    expect(r.conceptionCap).toBe(571);
    expect(r.maxBasicSites).toBe(6); // a camp of 42, not a world of 250
    expect(r.facilityRadius).toBe(40);
    expect(rulesOf(world('large')).maxBasicSites).toBe(4);
  });
});
