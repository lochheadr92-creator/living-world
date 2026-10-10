// The AI inhabitant driven by the app's clock (src/app/inhabit.ts): the Game's tick hooks, the driver's pause-answer-rewind-resume
// cycle, and that what the app records replays headlessly to the same world.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/app/game';
import { InhabitDriver, inhabitConfigFromUrl, settingsFromConfig } from '../src/app/inhabit';
import type { InhabitConfig } from '../src/app/inhabit';
import { runReplay } from '../src/agent/run';
import { goalKeeperModel, pickerModel } from '../src/agent/stubs';
import { createWorld } from '../src/sim/factory';
import { hashWorld, stepWorld } from '../src/sim/world';

const DAY = 2400;

describe('the clock\'s tick hooks', () => {
  it('run around every tick, and a false from afterTick ends the frame', () => {
    const game = new Game({ seed: 'hooks' });
    let before = 0;
    let after = 0;
    game.tickHooks = {
      beforeTick: () => {
        before++;
      },
      afterTick: () => {
        after++;
        return after < 3;
      },
    };
    game.setSpeed(16);
    const ran = game.advance(0.25); // would be 40 ticks at 16x; stops after the third
    expect(ran).toBe(3);
    expect(before).toBe(3);
    expect(after).toBe(3);
    expect(game.world.tick).toBe(3);
    game.stepOnce();
    expect(before).toBe(4);
    expect(game.world.tick).toBe(4);
  });
});

describe('the in-app driver', () => {
  it('reads its configuration from the page\'s query string', () => {
    const cfg = inhabitConfigFromUrl('?inhabit=Pavel&api=openai&model=gpt-5&memory=1&seed=meadow&harsh=1&from=1&days=5&size=large', { seed: 'x' });
    expect(cfg).toMatchObject({ person: 'Pavel', api: 'openai', model: 'gpt-5', memory: true, seed: 'meadow', harsh: true, fromDay: 1, days: 5, size: 'large' });
    expect(settingsFromConfig(cfg!)).toMatchObject({ seed: 'meadow', harsh: true, profile: 'large' });
    expect(inhabitConfigFromUrl('?seed=meadow', { seed: 'x' })).toBeNull();
    expect(inhabitConfigFromUrl('?inhabit=', { seed: 'river' })).toMatchObject({ person: '', seed: 'river', memory: false, days: null });
  });

  it('pauses while the model thinks, applies the answer at the asked tick, and records a transcript that replays headlessly', async () => {
    const cfg: InhabitConfig = { person: 'Pavel', api: 'openai', model: 'stub', effort: '', memory: true, showScores: false, fromDay: 1, days: 0.3, seed: 'meadow', harsh: false, rich: false, size: 'normal', arrivals: true };
    const game = new Game(settingsFromConfig(cfg));
    const driver = new InhabitDriver(game, cfg, goalKeeperModel());
    await driver.start();
    expect(driver.status).toBe('running');
    expect(game.world.tick).toBe(DAY);
    expect(game.selectedId).toBe(driver.personId);
    expect(game.following).toBe(true);
    expect(game.playing).toBe(true);
    game.setSpeed(16);
    let frames = 0;
    let sawThinking = false;
    while (driver.status === 'running' || driver.status === 'thinking') {
      if (++frames > 5000) throw new Error('the run did not finish');
      if (driver.status === 'thinking') {
        expect(game.playing).toBe(false);
        sawThinking = true;
        await driver.idle();
        continue;
      }
      game.advance(0.1);
    }
    expect(sawThinking).toBe(true);
    expect(driver.status).toBe('finished');
    expect(game.playing).toBe(false);
    const t = driver.transcriptNow()!;
    expect(t.end!.tick).toBe(DAY + Math.round(0.3 * DAY));
    expect(t.end!.applied).toBeGreaterThan(0);
    expect(t.end!.lagged).toBe(0);
    expect(t.calls.every((c) => c.choice.kind !== 'defer')).toBe(true);
    expect(t.end!.hash).toBe(hashWorld(game.world));
    // the world the app holds is the one the transcript describes: a fresh world replays to it without any model
    const fresh = createWorld(settingsFromConfig(cfg));
    while (fresh.tick < DAY) stepWorld(fresh);
    const again = runReplay(fresh, t);
    expect(hashWorld(again.world)).toBe(t.end!.hash);
    expect(again.world.inhabitants![driver.personId].notes).toEqual(game.world.inhabitants![driver.personId].notes);
  }, 300_000);

  it('hands the person back when told to stop, and reports a name it cannot find', async () => {
    const cfg: InhabitConfig = { person: 'Nobody Here', api: 'openai', model: 'stub', effort: '', memory: false, showScores: false, fromDay: 0.05, days: null, seed: 'meadow', harsh: false, rich: false, size: 'normal', arrivals: true };
    const game = new Game(settingsFromConfig(cfg));
    const missing = new InhabitDriver(game, cfg, pickerModel('first'));
    await missing.start();
    expect(missing.status).toBe('failed');
    expect(missing.detail).toMatch(/nobody alive is called Nobody Here/);
    const ok = new InhabitDriver(game, { ...cfg, person: '' }, pickerModel('first'));
    await ok.start();
    expect(ok.status).toBe('running');
    ok.stop();
    expect(ok.status).toBe('finished');
    expect(game.tickHooks).toBeNull();
    expect(game.playing).toBe(false);
  });
});
