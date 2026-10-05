import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { TICKS_PER_YEAR } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { findPath } from '../src/sim/pathfinding';
import { SCENE_LABELS } from '../src/sim/scenes';
import { T } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { natural, run, scene } from './helpers/util';

describe('the generated world', () => {
  it('has people, households, resources near the camp and nothing in the water', () => {
    for (const seed of ['gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6']) {
      const w = natural(seed);
      expect(w.persons.length).toBe(28);
      expect(w.households.length).toBeGreaterThan(5);
      expect(w.persons.some((p) => p.birthTick < -TICKS_PER_YEAR * 60)).toBe(true); // elders
      expect(w.persons.filter((p) => p.birthTick > -TICKS_PER_YEAR * 12).length).toBeGreaterThanOrEqual(3); // children
      const near = (type: string, r: number) => w.sources.filter((s) => s.type === type && Math.hypot(s.x - w.camp.x, s.y - w.camp.y) < r).length;
      expect(near('berry_bush', 16), seed).toBeGreaterThanOrEqual(3);
      expect(near('tree', 18), seed).toBeGreaterThanOrEqual(8);
      expect(near('rock', 26), seed).toBeGreaterThanOrEqual(1);
      expect(near('fish_spot', 26) + near('wild_grain', 26) + near('fruit_tree', 26), seed).toBeGreaterThanOrEqual(3);
      for (const s of w.sources) expect(w.terrain[s.y * w.W + s.x]).not.toBe(T.DEEP);
      // every building and every person can be reached from the camp
      for (const p of w.persons) expect(findPath(w, w.camp.x + 2, w.camp.y + 2, p.x, p.y, { maxNodes: 12000 }), `${seed} ${p.name}`).not.toBeNull();
      expect(conservationReport(w).ok).toBe(true);
    }
  });

  it('people start knowing only their surroundings, plus a little hearsay from the journey', () => {
    const w = natural('start-knowledge');
    const farFood = w.sources.filter((s) => s.type !== 'tree' && Math.hypot(s.x - w.camp.x, s.y - w.camp.y) > 20);
    expect(farFood.length).toBeGreaterThan(10);
    for (const p of w.persons) {
      const knownFar = farFood.filter((s) => p.beliefs[s.id]).length;
      expect(knownFar).toBeLessThan(farFood.length * 0.35); // nobody knows the whole map
      // and beliefs are stamped with when they were seen: some are already out of date
      for (const k in p.beliefs) expect(p.beliefs[k as unknown as number].seen).toBeLessThanOrEqual(0);
    }
    const union = new Set<number>();
    for (const p of w.persons) for (const s of farFood) if (p.beliefs[s.id]) union.add(s.id);
    expect(union.size).toBeGreaterThan(0); // knowledge is unevenly spread, so sharing it matters
  });

  it('only staged scenes carry a TEST SCENE label', () => {
    expect(natural('label').sceneLabel).toBe('');
    expect(SCENE_LABELS.natural).toBe('');
    for (const s of ['contest', 'help', 'cooperate'] as const) expect(scene(s).sceneLabel).toMatch(/^TEST SCENE/);
  });
});

describe('saving and loading', () => {
  it('a saved world resumes exactly where it left off: continuing from the copy equals continuing the original', () => {
    const a = natural('save-load');
    run(a, 900);
    const json = serializeWorld(a);
    const b = deserializeWorld(json);
    expect(hashWorld(b)).toBe(hashWorld(a));
    run(a, 600);
    for (let i = 0; i < 600; i++) stepWorld(b);
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(conservationReport(b).ok).toBe(true);
  });

  it('so does a world in the middle of making things: workshops, batches, tools on racks, a meal under way, a cart on the road', () => {
    for (const [id, until] of [['workshop', 1500], ['meal', 1000], ['haul', 260], ['care', 300], ['grief', 400]] as const) {
      const a = scene(id);
      run(a, until);
      const b = deserializeWorld(serializeWorld(a));
      expect(hashWorld(b), id + ' as loaded').toBe(hashWorld(a));
      run(a, 1800);
      for (let i = 0; i < 1800; i++) stepWorld(b);
      expect(hashWorld(b), id + ' after carrying on').toBe(hashWorld(a));
      expect(conservationReport(b).ok, id).toBe(true);
    }
  });

  it('a cart that was loaded and being pulled when the world was saved is still found by id, still has its puller, and finishes the trip', () => {
    const a = scene('haul');
    let loaded = false;
    for (let i = 0; i < 600 && !loaded; i++) {
      run(a, 1);
      loaded = (a.carts[0].load.planks ?? 0) > 0;
    }
    expect(loaded).toBe(true);
    run(a, 40); // on the road home with the load
    const b = deserializeWorld(serializeWorld(a));
    const cart = b.carts[0];
    expect(b.byId.get(cart.id)).toBe(cart);
    expect(cart.puller).toBeGreaterThan(0);
    const puller = b.byId.get(cart.puller);
    expect(puller && puller.ent === 'person' && puller.cartId === cart.id).toBe(true);
    for (let i = 0; i < 2500; i++) stepWorld(b);
    expect(b.buildings.some((x) => x.type === 'house')).toBe(true);
    expect(b.sites).toHaveLength(0);
    expect(conservationReport(b).ok).toBe(true);
  });

  it('a save from before workshops, tools and carts existed is refused rather than half-loaded', () => {
    const json = serializeWorld(natural('old-save'));
    expect(() => deserializeWorld(json.replace(/^\{"version":\d+/, '{"version":2'))).toThrow(/unsupported save version/);
  });

  it('an ordinary world a few days in, with a yard and a kiln at work, saves and resumes exactly', () => {
    const a = natural('save-load-workshops');
    run(a, 15500);
    expect(a.buildings.some((x) => x.ops)).toBe(true);
    const b = deserializeWorld(serializeWorld(a));
    expect(hashWorld(b)).toBe(hashWorld(a));
    run(a, 1500);
    for (let i = 0; i < 1500; i++) stepWorld(b);
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(conservationReport(b).ok).toBe(true);
  }, 120000);
});
