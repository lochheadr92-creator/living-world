import { reviewReportPath } from './helpers/review_report';
// REVIEW G (observer truth audit): every observer entry point, every tick, must leave the serialized world and the RNG
// state byte-for-byte unchanged, and the looked-at world must continue exactly like an unwatched twin.
// Broader than purity.test.ts (describePerson every 250 ticks) and inspect_work_purity.test.ts (sites/facilities):
// person cards with opportunities, every entity card, water/flood cards, histories, the AI observation built from an
// observer option context, rankOptions outside the whileObserving guard, summarizeWorld, and renderer frames with every
// overlay, debug, follow, hover and several zooms.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Game } from '../src/app/game';
import { serializeWorld } from '../src/app/save';
import { Renderer } from '../src/render/renderer';
import { project } from '../src/render/iso';
import { observeInhabitant } from '../src/agent/observe';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { createWorld } from '../src/sim/factory';
import { waterBodyAt } from '../src/sim/hydrology';
import { auditOpportunities, describeEntity, describePerson, planViews, summarizeWorld } from '../src/sim/inspect';
import { describeFlood, floodViewAt } from '../src/sim/inspect_flood';
import { describeWater, waterViewId } from '../src/sim/inspect_water';
import { commitmentViews, concernViews, describeCartSections, describeFacility, describeSiteSections, grievanceViews, interactionViews, mealViews, toolViews } from '../src/sim/inspect_work';
import { civicHistory, decisionHistory, householdHistory, relationshipHistory } from '../src/sim/history';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';
import { fakeCanvas, installFakeDom } from './helpers/fakeDom';

const OUT = reviewReportPath('purity_sweep.txt');

function firstDifference(a: unknown, b: unknown, path = ''): string | null {
  if (Object.is(a, b)) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return `${path || '(root)'}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return null;
}

/** every read path a viewer, the inspector, the tooltip, the AI seam or the renderer can take */
function lookAtEverything(world: World, g: Game, renderer: Renderer, zoom: number, tick: number): number {
  let looks = 0;
  for (const p of world.persons) {
    if (!p.alive) continue;
    const v = describePerson(world, p.id, { opportunities: true });
    expect(v).not.toBeNull();
    planViews(world, p);
    auditOpportunities(world, p); // outside the whileObserving guard, as a careless caller might
    toolViews(world, p);
    commitmentViews(world, p);
    interactionViews(world, p);
    mealViews(world, p);
    concernViews(world, p);
    grievanceViews(world, p);
    decisionHistory(world, p);
    householdHistory(world, p);
    civicHistory(world, p);
    relationshipHistory(world, p);
    const ctx = generateOptions(world, p, true, true);
    observeInhabitant(world, p, ctx, rankOptions(ctx), { showScores: true });
    looks++;
  }
  for (const id of world.byId.keys()) {
    describeEntity(world, id);
    looks++;
  }
  for (const b of world.buildings) describeFacility(world, b);
  for (const s of world.sites) describeSiteSections(world, s);
  for (const c of world.carts) describeCartSections(world, c);
  for (let y = 0; y < world.H; y += 8) {
    for (let x = 0; x < world.W; x += 8) {
      const wb = waterBodyAt(world, x, y);
      if (wb) {
        describeWater(world, waterViewId(wb));
        looks++;
      }
      const fid = floodViewAt(world, x, y);
      if (fid) {
        describeFlood(world, fid);
        looks++;
      }
    }
  }
  summarizeWorld(world);
  // the picture: every overlay on, debug on, following a (rotating) selected person, a hover, several zooms
  const alive = world.persons.filter((p) => p.alive);
  const sel = alive[tick % alive.length];
  if (sel) {
    g.select(sel.id);
    g.setFollow(true);
    const q = project(sel.x, sel.y);
    g.camera = { x: q.sx, y: q.sy, zoom };
    const hv = alive[(tick + 1) % alive.length];
    g.hover = { id: hv.id, px: 400, py: 300 };
  }
  renderer.frame(1 / 60);
  return looks;
}

describe('REVIEW G: observation leaves the world exactly as it was, every tick', () => {
  const report: string[] = [];
  for (const [seed, ticks, every] of [['river', 1000, 1], ['meadow', 2000, 4]] as const) {
    it(`${seed}: all entry points every ${every} tick(s) for ${ticks} ticks, serialized state + RNG unchanged, twin continuation identical`, () => {
      installFakeDom();
      const settings = currentWorldSettings('normal', seed, { immigration: false });
      const looked = createWorld(settings);
      const twin = createWorld(settings);
      const g = new Game();
      g.world = looked;
      g.settings = settings;
      g.setPlaying(false);
      g.debug = true;
      g.overlays = { perception: true, paths: true, intentions: true, knowledge: true, labels: true };
      g.setViewer({ speech: 'automatic', textSize: 'large', contrast: 'high', reducedMotion: false });
      const renderer = new Renderer(fakeCanvas(900, 600), g);
      const zooms = [0.3, 0.9, 1.8, 3.2];
      let looks = 0;
      let diffs = 0;
      for (let t = 0; t < ticks; t++) {
        stepWorld(looked);
        stepWorld(twin);
        if (t % every) continue;
        const before = serializeWorld(looked);
        const rng = JSON.stringify(looked.rng.getState());
        const hash = hashWorld(looked);
        looks += lookAtEverything(looked, g, renderer, zooms[(t / every) % zooms.length], t);
        const after = serializeWorld(looked);
        if (after !== before) {
          diffs++;
          const d = firstDifference(JSON.parse(before), JSON.parse(after));
          report.push(`${seed} tick ${looked.tick}: inspection changed serialized state at ${d}`);
          writeFileSync(OUT, report.join('\n'));
          expect(d, `inspection at tick ${looked.tick} changed serialized state`).toBeNull();
        }
        expect(JSON.stringify(looked.rng.getState()), `RNG state after inspection at tick ${looked.tick}`).toBe(rng);
        expect(hashWorld(looked), `hash after inspection at tick ${looked.tick}`).toBe(hash);
        if (t % 200 === 0) {
          const a = serializeWorld(looked);
          const b = serializeWorld(twin);
          if (a !== b) {
            const d = firstDifference(JSON.parse(a), JSON.parse(b));
            report.push(`${seed} tick ${looked.tick}: looked world drifted from twin at ${d}`);
            writeFileSync(OUT, report.join('\n'));
            expect(d, `drift from twin by tick ${looked.tick}`).toBeNull();
          }
        }
      }
      // afterwards, unwatched: both worlds must carry on identically (catches mutated live state that is not serialized)
      for (let t = 0; t < 300; t++) {
        stepWorld(looked);
        stepWorld(twin);
      }
      const a = serializeWorld(looked);
      const b = serializeWorld(twin);
      if (a !== b) {
        const d = firstDifference(JSON.parse(a), JSON.parse(b));
        report.push(`${seed}: continuation drifted at ${d}`);
        writeFileSync(OUT, report.join('\n'));
        expect(d, 'continuation drift').toBeNull();
      }
      expect(hashWorld(looked)).toBe(hashWorld(twin));
      report.push(`${seed}: ${ticks} ticks, ${looks} looks, ${diffs} serialized differences, persons alive ${looked.persons.filter((p) => p.alive).length}, events kept ${looked.events.length} (oldest ${looked.tick - (looked.events[0]?.tick ?? looked.tick)} ticks back), chronicle ${looked.chronicle?.length ?? 0}`);
      renderer.destroy();
      writeFileSync(OUT, report.join('\n'));
    }, 170_000);
  }
});
