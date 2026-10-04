import { describe, expect, it } from 'vitest';
import { Game, MAX_STEPS_PER_FRAME, SPEEDS } from '../src/app/game';
import { TPS } from '../src/sim/constants';
import { hashWorld, runTicks } from '../src/sim/world';
import { killPerson } from '../src/sim/lifecycle';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { Renderer } from '../src/render/renderer';
import { fakeCanvas, installFakeDom } from './helpers/fakeDom';

const N = 1200;

/** Drive a game to exactly N ticks using a given frame-time pattern (never overshooting). */
function driveTo(g: Game, n: number, dts: number[]): void {
  let i = 0;
  while (g.world.tick < n) {
    const remaining = n - g.world.tick;
    const dt = dts[i++ % dts.length];
    // never ask for more than what is left, so the stop is exact
    g.advance(Math.min(dt, remaining / (TPS * g.speed)));
  }
}

describe('the clock: simulation results do not depend on frame rate', () => {
  it('30 fps, 144 fps and an irregular stutter all reach the identical world at the same tick', () => {
    const reference = createWorld({ ...defaultSettings('framerate') });
    runTicks(reference, N);
    const want = hashWorld(reference);
    const patterns: Record<string, number[]> = {
      '30fps': [1 / 30],
      '144fps': [1 / 144],
      stutter: [0.016, 0.003, 0.2, 0.011, 0.045, 0.001, 0.12, 0.016],
    };
    for (const [name, dts] of Object.entries(patterns)) {
      const g = new Game({ seed: 'framerate' });
      driveTo(g, N, dts);
      expect(g.world.tick, name).toBe(N);
      expect(hashWorld(g.world), name).toBe(want);
    }
  });

  it('playback speed changes how fast time passes, not what happens in it', () => {
    const slow = new Game({ seed: 'speeds' });
    const fast = new Game({ seed: 'speeds' });
    slow.setSpeed(1);
    fast.setSpeed(16);
    driveTo(slow, 800, [1 / 60]);
    driveTo(fast, 800, [1 / 60]);
    expect(hashWorld(slow.world)).toBe(hashWorld(fast.world));
  });

  it('one second of real time at speed s runs about s x TPS ticks, capped per frame', () => {
    for (const s of SPEEDS) {
      const g = new Game({ seed: 'speed-count' });
      g.setSpeed(s);
      let ticks = 0;
      for (let i = 0; i < 60; i++) ticks += g.advance(1 / 60);
      expect(Math.abs(ticks - s * TPS)).toBeLessThanOrEqual(2);
    }
    const g = new Game({ seed: 'cap' });
    expect(g.advance(100)).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
  });
});

describe('play, pause, step', () => {
  it('pause freezes the world: no ticks, no change, animation time frozen', () => {
    const g = new Game({ seed: 'pause' });
    g.advance(0.5);
    g.setPlaying(false);
    const h = hashWorld(g.world);
    const t = g.world.tick;
    const st = g.simTime();
    for (let i = 0; i < 30; i++) expect(g.advance(0.05)).toBe(0);
    expect(g.world.tick).toBe(t);
    expect(hashWorld(g.world)).toBe(h);
    expect(g.simTime()).toBe(st);
    g.setPlaying(true);
    expect(g.advance(0.2)).toBeGreaterThan(0);
  });

  it('single-step advances exactly one tick and leaves the game paused', () => {
    const g = new Game({ seed: 'step' });
    const t = g.world.tick;
    g.stepOnce();
    expect(g.world.tick).toBe(t + 1);
    expect(g.playing).toBe(false);
    g.stepOnce();
    g.stepOnce();
    expect(g.world.tick).toBe(t + 3);
    // stepping is the same as running: same result as an uninterrupted run
    const ref = createWorld({ ...defaultSettings('step') });
    runTicks(ref, t + 3);
    expect(hashWorld(g.world)).toBe(hashWorld(ref));
  });
});

describe('selection, follow, restart', () => {
  it('select / follow / deselect behave', () => {
    const g = new Game({ seed: 'select' });
    const id = g.world.persons[2].id;
    const events: string[] = [];
    g.subscribe((e) => events.push(e));
    g.select(id);
    expect(g.selectedId).toBe(id);
    g.setFollow(true);
    expect(g.following).toBe(true);
    g.select(0);
    expect(g.selectedId).toBe(0);
    expect(g.following).toBe(false);
    g.setFollow(true); // nothing selected: cannot follow
    expect(g.following).toBe(false);
    expect(events).toContain('select');
    expect(events).toContain('follow');
  });

  it('a selected person who dies is deselected, and following stops', () => {
    const g = new Game({ seed: 'select-death' });
    const p = g.world.persons[0];
    g.select(p.id);
    g.setFollow(true);
    killPerson(g.world, p, 'test');
    g.advanceTicks(1);
    expect(g.selectedId).toBe(0);
    expect(g.following).toBe(false);
  });

  it('restart builds a new world from the chosen seed and clears view state', () => {
    const g = new Game({ seed: 'first' });
    const h1 = hashWorld(g.world);
    g.advanceTicks(300);
    g.select(g.world.persons[0].id);
    g.restart({ seed: 'second' });
    expect(g.settings.seed).toBe('second');
    expect(g.world.tick).toBe(0);
    expect(g.selectedId).toBe(0);
    expect(hashWorld(g.world)).not.toBe(h1);
    g.restart({ seed: 'first' });
    expect(hashWorld(g.world)).toBe(h1); // the same seed gives the same starting world again
  });

  it('staged scenes are labelled and can be left again', () => {
    const g = new Game({ seed: 'scenes' });
    expect(g.world.sceneLabel).toBe('');
    for (const s of ['contest', 'help', 'cooperate'] as const) {
      g.loadScene(s);
      expect(g.world.sceneLabel).toMatch(/^TEST SCENE/);
      expect(g.settings.scene).toBe(s);
    }
    g.restart({ scene: 'natural' });
    expect(g.world.sceneLabel).toBe('');
  });
});

describe('rendering never changes the simulation', () => {
  it('drawing a world every tick (with camera moves, zoom, overlays) gives exactly the same result as never drawing it', () => {
    installFakeDom();
    const drawn = new Game({ seed: 'render-purity' });
    const blind = new Game({ seed: 'render-purity' });
    const renderer = new Renderer(fakeCanvas(900, 520), drawn);
    drawn.overlays = { perception: true, paths: true, intentions: true, knowledge: true, labels: true };
    drawn.select(drawn.world.persons[4].id);
    drawn.setFollow(true);
    for (let i = 0; i < 360; i++) {
      drawn.advanceTicks(1);
      blind.advanceTicks(1);
      drawn.camera.zoom = 0.5 + (i % 40) / 20;
      drawn.camera.x += Math.sin(i) * 20;
      renderer.frame(1 / 60);
    }
    expect(renderer.drawnCount).toBeGreaterThan(5);
    expect(hashWorld(drawn.world)).toBe(hashWorld(blind.world));
    renderer.destroy();
  });

  it('a long stretch of drawing at several playback speeds still matches an undrawn run', () => {
    installFakeDom();
    const a = new Game({ seed: 'render-speeds' });
    const b = new Game({ seed: 'render-speeds' });
    const r = new Renderer(fakeCanvas(), a);
    a.setSpeed(8);
    driveTo(a, 900, [1 / 60]);
    for (let i = 0; i < 40; i++) r.frame(1 / 60);
    driveTo(b, 900, [1 / 144]);
    expect(hashWorld(a.world)).toBe(hashWorld(b.world));
    r.destroy();
  });
});
