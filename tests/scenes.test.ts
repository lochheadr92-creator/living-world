import { describe, expect, it } from 'vitest';
import { CART_CAP } from '../src/sim/constants';
import { conservationReport, foodUnits, weightOf } from '../src/sim/economy';
import { SCENE_LABELS } from '../src/sim/scenes';
import { toolReport } from '../src/sim/toolreg';
import type { SceneId } from '../src/sim/types';
import { person, run, scene } from './helpers/util';

/**
 * The staged scenes are set up by hand, but nobody in them is told what to do. These tests keep the promise each scene's
 * description makes: given the staged situation, the thing described happens by ordinary decisions, and the books balance.
 * (They are regression tests for the scenes, not evidence of what the ordinary world does.)
 */
describe('the staged test scenes', () => {
  it('every scene has a label that says it is a staged test scene', () => {
    for (const id of Object.keys(SCENE_LABELS) as SceneId[]) {
      if (id === 'natural') expect(SCENE_LABELS[id]).toBe('');
      else expect(SCENE_LABELS[id]).toMatch(/^TEST SCENE · /);
    }
  });

  it('workshop: a house waiting for planks gets them from logs sawn at the yard, carried to the site, and is finished', () => {
    const w = scene('workshop');
    const yard = w.buildings.find((b) => b.type === 'timber_yard')!;
    const site = w.sites.find((s) => s.type === 'house')!;
    expect(site.upgradeOf).toBeTruthy();
    run(w, 6500);
    expect(yard.ops!.batches).toBeGreaterThan(0);
    expect(yard.ops!.produced.planks ?? 0).toBeGreaterThanOrEqual(8);
    expect(w.sites).toHaveLength(0);
    expect(w.buildings.some((b) => b.type === 'house')).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });

  it('meal: a host with food at the end of the afternoon ends up eating with a friend at the hall, from a table of real food', () => {
    const w = scene('meal');
    const placed: number[] = [];
    w.hooks = { onTransfer: (t: { reason: string; n: number }) => void (t.reason === 'set out for a shared meal' && placed.push(t.n)) } as never;
    run(w, 2600);
    const done = w.meals.filter((m) => m.status === 'done');
    expect(done.length, w.meals.map((m) => `${m.status}:${m.end}`).join(' | ')).toBeGreaterThan(0);
    const m = done[0];
    expect(m.ate.length).toBeGreaterThanOrEqual(2);
    expect(m.placeName).toMatch(/hall|fire/);
    expect(placed.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(m.ate.length);
    expect(foodUnits(m.table)).toBe(0);
    for (const x of w.meals) if (x.status === 'cancelled') expect(x.end.length).toBeGreaterThan(3);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('haul: the cart goes out empty to the far store, is loaded with the hauler standing there, never carries more than its bed, and the house is finished', () => {
    const w = scene('haul');
    const hana = person(w, 'Hana');
    const store = w.buildings.find((b) => b.type === 'storehouse')!;
    const cart = w.carts[0];
    let firstLoad: { d: number; tick: number } | null = null;
    let maxLoad = 0;
    run(w, 3500, () => {
      const wt = weightOf(cart.load);
      maxLoad = Math.max(maxLoad, wt);
      if (!firstLoad && wt > 0) firstLoad = { d: Math.hypot(hana.x - (store.x + 1), hana.y - (store.y + 1)), tick: w.tick };
    });
    expect(firstLoad, 'the cart was loaded').toBeTruthy();
    expect(firstLoad!.d).toBeLessThan(5);
    expect(maxLoad).toBeLessThanOrEqual(CART_CAP + 1e-9);
    expect(w.sites).toHaveLength(0);
    expect(w.buildings.some((b) => b.type === 'house')).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('care: someone who passed a frail old man’s door and saw him hungry goes to him with food, finds him in need, and feeds him', () => {
    const w = scene('care');
    const kit = person(w, 'Kit');
    const gus = person(w, 'Gus');
    const hungerBefore = kit.needs.hunger;
    expect(gus.concerns.some((c) => c.about === kit.id && c.src === 'seen')).toBe(true);
    run(w, 1200);
    expect(gus.log.some((l) => /Found Kit in need and helped/.test(l.text))).toBe(true);
    expect(foodUnits(kit.inv) > 0 || kit.needs.hunger > hungerBefore).toBe(true);
    expect(gus.concerns.some((c) => c.about === kit.id)).toBe(false);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('are deterministic: the same scene twice gives the same world', async () => {
    const { hashWorld } = await import('../src/sim/world');
    for (const id of ['workshop', 'meal', 'haul', 'care'] as SceneId[]) {
      const a = scene(id);
      const b = scene(id);
      run(a, 800);
      run(b, 800);
      expect(hashWorld(b), id).toBe(hashWorld(a));
    }
  });
});
