// Hand control in the live app (src/app/inhabit.ts manualModel): one person answered by hand through the same ModelClient seam the
// API models use. No key, no network, no model call. The clock must not move while a decision is waiting, an answer must reach the
// exact moment it was asked for, and a stale or repeated answer must be refused rather than applied to the wrong tick.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/app/game';
import { InhabitDriver, inhabitConfigFromUrl, manualModel, settingsFromConfig } from '../src/app/inhabit';
import type { InhabitConfig } from '../src/app/inhabit';
import { runReplay } from '../src/agent/run';
import { observationFromPrompt } from '../src/agent/protocol';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';

const DAY = 2400;
const base: InhabitConfig = {
  person: 'Pavel', api: 'openai', model: 'manual', effort: '', memory: false, showScores: false,
  fromDay: 1, days: 0.25, seed: 'meadow', harsh: false, rich: false, size: 'normal', arrivals: true, manual: true,
};

function setup(cfg: Partial<InhabitConfig> = {}) {
  const c = { ...base, ...cfg };
  const game = new Game(settingsFromConfig(c));
  const driver = new InhabitDriver(game, c);
  return { game, driver, cfg: c };
}

describe('a person can be answered by hand', () => {
  it('is asked for several decisions in a row, each applied at the moment it was asked, and the record replays', async () => {
    const { game, driver } = setup();
    await driver.start();
    const m = driver.manual();
    expect(m, 'a manual config should give a manual model').toBeTruthy();
    expect(m!.kind).toBe('manual');
    const start = serializeWorld(game.world);
    game.setSpeed(16);

    const chosen: string[] = [];
    let frames = 0;
    while (driver.status === 'running' || driver.status === 'thinking') {
      if (++frames > 4000) throw new Error('the run did not finish');
      const waiting = m!.waiting();
      if (waiting) {
        expect(game.playing, 'the clock stops while a decision waits').toBe(false);
        const tickWhileWaiting = game.world.tick;
        const obs = observationFromPrompt(waiting.user);
        expect(obs, 'the waiting prompt carries the observation').toBeTruthy();
        // the operator takes their time: the world must not move on. (It may step back by the one tick that is replayed with
        // the answer, which is the point of the rewind; what must never happen is time passing while nobody has answered.)
        await new Promise<void>((r) => setTimeout(r, 0));
        expect(game.world.tick).toBeLessThanOrEqual(tickWhileWaiting);
        const key = obs!.options[0].key;
        chosen.push(key);
        expect(m!.submit(JSON.stringify({ choose: key, why: 'by hand' }), waiting.id)).toBe(true);
        await driver.idle();
        continue;
      }
      game.advance(0.1);
    }

    expect(chosen.length, 'several decisions were answered by hand').toBeGreaterThan(2);
    const t = driver.transcriptNow()!;
    const applied = t.calls.filter((c) => c.result?.status === 'applied');
    expect(applied.length).toBe(chosen.length);
    for (const c of applied) {
      expect(t.asks[c.ask].tick).toBe(c.tick); // answered at the very tick it was asked
      expect(c.timing).toBe('exact');
    }
    expect(t.header.model.kind).toBe('manual');

    // what the app recorded replays headlessly to the same world
    const again = runReplay(deserializeWorld(start), t);
    expect(hashWorld(again.world)).toBe(t.end!.hash);
    expect(deepHash(again.world)).toBe(deepHash(game.world));
  });

  it('refuses a stale or repeated answer, and survives nonsense without applying it', async () => {
    const { game, driver } = setup({ days: 0.25 });
    await driver.start();
    const m = driver.manual()!;
    game.setSpeed(16);
    let frames = 0;
    let checked = false;
    while ((driver.status === 'running' || driver.status === 'thinking') && !checked) {
      if (++frames > 4000) break;
      const waiting = m.waiting();
      if (!waiting) {
        game.advance(0.1);
        continue;
      }
      const obs = observationFromPrompt(waiting.user)!;
      // an answer aimed at a moment that is not this one is refused outright
      expect(m.submit('{"choose":"wander"}', waiting.id + 99)).toBe(false);
      // the real answer is taken once
      expect(m.submit(JSON.stringify({ choose: obs.options[0].key }), waiting.id)).toBe(true);
      // and a second copy of it has nothing to answer
      expect(m.submit(JSON.stringify({ choose: obs.options[0].key }), waiting.id)).toBe(false);
      await driver.idle();
      checked = true;
    }
    expect(checked, 'a decision should have been waiting').toBe(true);

    // nonsense is a refused answer, not a crash: the engine chooses and the transcript says why
    const next = await (async () => {
      let guard = 0;
      while (driver.status === 'running' || driver.status === 'thinking') {
        if (++guard > 2000) return null;
        const w = m.waiting();
        if (w) return w;
        game.advance(0.1);
      }
      return null;
    })();
    if (next) {
      expect(m.submit('not json at all', next.id)).toBe(true);
      await driver.idle();
      const t = driver.transcriptNow()!;
      // nonsense is on record as a problem, and no choice was made out of it
      expect(t.asks.find((a) => a.problem), 'the bad answer is on record as a problem').toBeTruthy();
      expect(t.calls.every((c) => c.result?.status !== 'applied' || c.choice.kind === 'pick')).toBe(true);
      expect(t.calls.some((c) => c.choice.kind === 'pick' && c.choice.key === 'not json at all')).toBe(false);
    }
    // hand the person back, so this test leaves no controller installed behind it (the seam is module-level)
    driver.stop();
  });

  it('hands the person back to the engine when stopped, and the world goes on without being asked', async () => {
    const { game, driver } = setup({ days: null });
    await driver.start();
    const m = driver.manual()!;
    game.setSpeed(16);
    for (let i = 0; i < 800 && !m.waiting(); i++) game.advance(0.1);
    const waiting = m.waiting();
    if (waiting) {
      const obs = observationFromPrompt(waiting.user);
      if (obs && obs.options.length) m.submit(JSON.stringify({ choose: obs.options[0].key }), waiting.id);
      else m.decline('nothing offered');
      await driver.idle();
    }
    driver.stop();
    expect(driver.status).toBe('finished');
    const tickAfterStop = game.world.tick;
    game.setPlaying(true);
    for (let i = 0; i < 50; i++) game.advance(0.1);
    expect(game.world.tick, 'the world runs on by itself').toBeGreaterThan(tickAfterStop);
    expect(m.waiting(), 'nobody is asked once control is handed back').toBeNull();
  });

  it('reads manual from the query string, and an ordinary inhabit URL is unaffected', () => {
    const byHand = inhabitConfigFromUrl('?inhabit=Pavel&manual=1&seed=meadow', { seed: 'x' });
    expect(byHand?.manual).toBe(true);
    const byModel = inhabitConfigFromUrl('?inhabit=Pavel&api=openai&model=gpt-5&seed=meadow', { seed: 'x' });
    expect(byModel?.manual).toBe(false);
  });

  it('a manual model on its own: nothing waiting means nothing to answer', () => {
    const m = manualModel();
    expect(m.waiting()).toBeNull();
    expect(m.submit('{"choose":"wander"}')).toBe(false);
    expect(m.decline('no')).toBe(false);
    expect(m.kind).toBe('manual');
  });
});
