// The animation loop cannot be stopped by one exception (src/app/frameloop.ts), and the autosave keeps to its rules (src/app/autosave.ts).
import { describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_EVERY, Autosaver } from '../src/app/autosave';
import { runFrame, startFrameLoop } from '../src/app/frameloop';
import { Game, MAX_FRAME_DT, MAX_STEP_MS } from '../src/app/game';
import { TPS } from '../src/sim/constants';
import { defaultSettings } from '../src/sim/factory';
import type { World } from '../src/sim/types';

const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

function playing(seed: string): Game {
  const g = new Game(defaultSettings(seed));
  g.playing = true;
  return g;
}

describe('a frame that throws', () => {
  it('pauses the world and records the fault when the world itself throws, and still draws and updates', () => {
    const err = quiet();
    const g = playing('loop-world');
    (g.world as unknown as { weather: World['weather'] | null }).weather = null; // a world the rules cannot run: it throws on its next tick
    const frame = vi.fn();
    const update = vi.fn();
    expect(() => runFrame(g, { frame, update }, 0.1)).not.toThrow();
    expect(g.playing).toBe(false);
    expect(g.fault?.stage).toBe('world');
    expect(g.fault?.message).toMatch(/nextChange/);
    expect(g.worldFaulted).toBe(true);
    expect(frame).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(err).toHaveBeenCalledOnce();
    // the same fault again is not logged again
    g.playing = true;
    runFrame(g, { frame, update }, 0.1);
    expect(err).toHaveBeenCalledOnce();
    err.mockRestore();
  });

  it('pauses on a picture fault without marking the world as faulted', () => {
    const err = quiet();
    const g = playing('loop-picture');
    const update = vi.fn();
    runFrame(g, { frame: () => { throw new Error('canvas lost'); }, update }, 0.05);
    expect(g.playing).toBe(false);
    expect(g.fault).toEqual({ stage: 'picture', message: 'canvas lost', tick: g.world.tick });
    expect(g.worldFaulted).toBe(false);
    expect(update).toHaveBeenCalledOnce();
    err.mockRestore();
  });

  it('a picture that then fails to draw the broken world does not replace the world fault', () => {
    const err = quiet();
    const g = playing('loop-order');
    g.reportFault('world', new Error('tick broke'));
    g.reportFault('picture', new Error('cannot draw'));
    expect(g.fault).toMatchObject({ stage: 'world', message: 'tick broke' });
    err.mockRestore();
  });

  it('keeps scheduling frames whatever throws', () => {
    const err = quiet();
    const g = playing('loop-schedule');
    const queue: ((now: number) => void)[] = [];
    const schedule = (cb: (now: number) => void) => queue.push(cb);
    let frames = 0;
    startFrameLoop(g, { frame: () => { frames++; throw new Error('draw'); }, update: () => { throw new Error('panel'); } }, schedule, 0, () => { throw new Error('autosave'); });
    for (let i = 1; i <= 5; i++) {
      expect(queue.length).toBe(1);
      queue.shift()!(i * 16);
    }
    expect(queue.length).toBe(1); // the sixth frame is already scheduled
    expect(frames).toBe(5);
    err.mockRestore();
  });

  it('a new world forgets the fault; dismissing only hides it', () => {
    const err = quiet();
    const g = playing('loop-forget');
    g.reportFault('world', new Error('boom'));
    g.clearFault();
    expect(g.fault).toBeNull();
    expect(g.worldFaulted).toBe(true);
    g.restart({ seed: 'loop-forget-2' });
    expect(g.worldFaulted).toBe(false);
    err.mockRestore();
  });
});

describe('a frame has a stepping budget in time, not only in ticks', () => {
  /** a world whose every tick takes `ms` of the frame */
  const heavy = (seed: string, ms: number) => {
    const g = playing(seed);
    let now = 0;
    g.clock = () => now;
    g.tickHooks = { afterTick: () => ((now += ms), true) };
    return g;
  };

  it('a heavy world at 16x stops stepping once the frame has spent its budget, and counts the rest as given up', () => {
    const g = heavy('budget-heavy', 10);
    g.setSpeed(16);
    const dropped = g.playbackStats().dropped;
    const ran = g.advance(MAX_FRAME_DT); // owes 40 ticks
    const smooth = Math.ceil((16 * TPS) / 60) + 1;
    expect(ran).toBe(smooth); // its smooth share already took longer than MAX_STEP_MS
    expect(g.playbackStats().dropped - dropped).toBe(40 - smooth);
    expect(g.world.tick).toBe(ran);
  });

  it('a light world is not held back: what is owed within the budget is all run', () => {
    const g = heavy('budget-light', 0.1);
    g.setSpeed(16);
    expect(g.advance(MAX_FRAME_DT)).toBe(40);
    const slow = heavy('budget-mid', 2); // 2 ms a tick: the budget allows a few past the smooth share
    slow.setSpeed(16);
    const ran = slow.advance(MAX_FRAME_DT);
    expect(ran).toBeGreaterThan(Math.ceil((16 * TPS) / 60) + 1);
    expect(ran).toBeLessThanOrEqual(Math.ceil((16 * TPS) / 60) + 1 + Math.ceil(MAX_STEP_MS / 2));
  });

  it('a smooth 60 fps frame always gets its share, however slow its ticks', () => {
    const g = heavy('budget-smooth', 50);
    g.setSpeed(4);
    let ticks = 0;
    for (let i = 0; i < 60; i++) ticks += g.advance(1 / 60);
    expect(Math.abs(ticks - 4 * TPS)).toBeLessThanOrEqual(2);
  });
});

describe('when the autosave is kept', () => {
  const saver = (g: Game) => {
    const write = vi.fn(async () => true);
    return { a: new Autosaver(g, write), write };
  };

  it('after AUTOSAVE_EVERY seconds of play, once per tick reached, never while the last write is pending', async () => {
    const g = playing('auto-every');
    let release: (v: boolean) => void = () => {};
    const write = vi.fn(() => new Promise<boolean>((r) => (release = r)));
    const a = new Autosaver(g, write);
    a.frame(AUTOSAVE_EVERY - 1);
    expect(write).not.toHaveBeenCalled();
    a.frame(1);
    expect(write).toHaveBeenCalledTimes(1);
    g.advanceTicks(5);
    a.frame(AUTOSAVE_EVERY * 2); // the first write has not finished
    expect(write).toHaveBeenCalledTimes(1);
    release(true);
    await Promise.resolve();
    await Promise.resolve();
    a.frame(AUTOSAVE_EVERY);
    expect(write).toHaveBeenCalledTimes(2);
    a.frame(AUTOSAVE_EVERY); // nothing has happened since
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('not while paused, not in a staged scene, not after the world threw', () => {
    const err = quiet();
    const paused = playing('auto-paused');
    paused.playing = false;
    const p = saver(paused);
    p.a.frame(AUTOSAVE_EVERY * 3);
    expect(p.write).not.toHaveBeenCalled();

    const scene = playing('auto-scene');
    scene.loadScene('help');
    scene.playing = true;
    const s = saver(scene);
    s.a.frame(AUTOSAVE_EVERY * 3);
    expect(s.write).not.toHaveBeenCalled();

    const broken = playing('auto-broken');
    broken.reportFault('world', new Error('boom'));
    broken.playing = true;
    const b = saver(broken);
    b.a.frame(AUTOSAVE_EVERY * 3);
    expect(b.write).not.toHaveBeenCalled();

    const drawn = playing('auto-drawn'); // a picture fault leaves the world sound: it is still kept
    drawn.reportFault('picture', new Error('canvas'));
    drawn.playing = true;
    const d = saver(drawn);
    d.a.frame(AUTOSAVE_EVERY);
    expect(d.write).toHaveBeenCalledOnce();
    err.mockRestore();
  });
});
