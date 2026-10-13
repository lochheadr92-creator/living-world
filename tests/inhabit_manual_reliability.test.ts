// Hand control has to be reliable to be usable: the world must hold still while a person thinks, an answer must belong to the moment
// it was composed for, and handing control back must leave nothing pending. These are the failure paths, including the one that was
// actually observed in the page (a decision that went to the engine on its own and then tripped the failure breaker).
import { afterEach, describe, expect, it } from 'vitest';
import { externalController, setExternalController } from '../src/sim/external';
import { Game } from '../src/app/game';
import { InhabitDriver, manualModel, settingsFromConfig } from '../src/app/inhabit';
import type { InhabitConfig } from '../src/app/inhabit';
import { DEFAULT_BUDGET, ModelGate } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';

const base: InhabitConfig = {
  person: 'Pavel', api: 'openai', model: 'manual', effort: '', memory: false, showScores: false,
  fromDay: 1, days: 0.25, seed: 'meadow', harsh: false, rich: false, size: 'normal', arrivals: true, manual: true,
};

// the controller seam is module-level: a test that ends early must not leave one installed over the next test's world
afterEach(() => setExternalController(null));

function setup(cfg: Partial<InhabitConfig> = {}) {
  const c = { ...base, ...cfg };
  const game = new Game(settingsFromConfig(c));
  const driver = new InhabitDriver(game, c);
  return { game, driver };
}

/** run the clock until a decision is waiting to be answered by hand */
async function untilAsked(game: Game, driver: InhabitDriver, frames = 800) {
  const m = driver.manual()!;
  game.setSpeed(16);
  for (let i = 0; i < frames && !m.waiting(); i++) game.advance(0.1);
  return m.waiting();
}

describe('the observed failure: a decision that answered itself', () => {
  // The cause was a timer, not a race: a budget timeoutMs above 2**31-1 does not become a long wait, it becomes 1 ms, so the gate
  // abandoned every hand-answered decision almost at once. Repeated often enough that is what trips maxConsecutiveFailures.
  it('a wall-clock cap above the timer limit collapses to 1 ms, which is why an unanswered decision used to fail', async () => {
    const gate = new ModelGate(manualModel(), { ...DEFAULT_BUDGET, timeoutMs: 2 ** 40, maxConsecutiveFailures: 5 });
    const t0 = Date.now();
    const r = await gate.call({ system: 's', user: 'u' }, 1);
    expect(r.ok, 'the call is abandoned although nobody asked for that').toBe(false);
    expect(Date.now() - t0, 'and it happens at once, not in 2**40 ms').toBeLessThan(3000);
  });

  it('the cap the app actually uses leaves a decision waiting', async () => {
    const m = manualModel();
    const gate = new ModelGate(m, { ...DEFAULT_BUDGET, timeoutMs: 2 ** 31 - 1 });
    const pending = gate.call({ system: 's', user: 'u' }, 1);
    await new Promise<void>((r) => setTimeout(r, 1200));
    expect(m.waiting(), 'still waiting after more than a second of thinking').toBeTruthy();
    m.submit('{"choose":"wander","why":"at last"}');
    const r = await pending;
    expect(r.ok).toBe(true);
  });

  it('the breaker is never reached by thinking slowly: five slow answers all land', async () => {
    const m = manualModel();
    const gate = new ModelGate(m, { ...DEFAULT_BUDGET, timeoutMs: 2 ** 31 - 1, maxConsecutiveFailures: 5 });
    for (let i = 0; i < 5; i++) {
      const p = gate.call({ system: 's', user: `u${i}` }, 1);
      await new Promise<void>((r) => setTimeout(r, 30));
      expect(m.submit(`{"choose":"wander","why":"${i}"}`)).toBe(true);
      expect((await p).ok).toBe(true);
    }
    expect(gate.summary().givenUp, 'the model never gives up on a slow operator').toBeNull();
  });
});

describe('the clock cannot be driven past an unanswered decision', () => {
  it('play, speed changes and many frames do not advance a tick while a decision waits', async () => {
    const { game, driver } = setup();
    await driver.start();
    const waiting = await untilAsked(game, driver);
    expect(waiting, 'a decision should be waiting').toBeTruthy();
    const tick = game.world.tick;

    // everything a user could reach for
    game.setPlaying(true);
    game.setSpeed(16);
    for (let i = 0; i < 60; i++) game.advance(0.25);
    game.setSpeed(1);
    for (let i = 0; i < 20; i++) game.advance(1);

    expect(game.world.tick, 'no time passed, whatever was pressed').toBe(tick);
    expect(driver.manual()!.waiting()!.id, 'and it is still the same moment').toBe(waiting!.id);
    driver.stop();
  });
});

describe('handing the decision or the person back', () => {
  it('declining records an explicit handoff: the engine chooses and the transcript says who let it', async () => {
    const { game, driver } = setup();
    await driver.start();
    const m = driver.manual()!;
    const waiting = await untilAsked(game, driver);
    expect(waiting).toBeTruthy();
    expect(m.decline('handed to the engine by the operator', waiting!.id)).toBe(true);
    await driver.idle();

    // the handoff is on the record at once: the operator gave no usable answer, and the driver says the engine is taking it
    const asked = driver.transcriptNow()!.asks.find((a) => a.problem);
    expect(asked, 'the decision is on record as unanswered by the operator').toBeTruthy();
    expect(driver.detail).toMatch(/engine chooses/);

    // the engine's own choice lands when the rewound tick is actually replayed, not before
    game.setPlaying(true);
    for (let i = 0; i < 40 && !driver.transcriptNow()!.calls.length; i++) game.advance(0.1);
    const t = driver.transcriptNow()!;
    expect(t.calls.some((c) => c.choice.kind === 'fallback' || c.result?.status === 'fallback'), 'the engine took it').toBe(true);
    driver.stop();
  });

  it('Stop cancels a waiting decision, and an answer that arrives afterwards cannot restart anything', async () => {
    const { game, driver } = setup({ days: null });
    await driver.start();
    const m = driver.manual()!;
    const waiting = await untilAsked(game, driver);
    expect(waiting).toBeTruthy();

    driver.stop();
    expect(driver.status).toBe('finished');
    expect(m.waiting(), 'nothing is left pending').toBeNull();

    // a late answer to the moment that was cancelled
    expect(m.submit('{"choose":"wander"}', waiting!.id), 'the late answer is refused').toBe(false);
    expect(driver.status, 'and it does not restart the session').toBe('finished');

    // the world is coherent and goes on by itself
    const t = game.world.tick;
    game.setPlaying(true);
    for (let i = 0; i < 40; i++) game.advance(0.1);
    expect(game.world.tick).toBeGreaterThan(t);
    expect(m.waiting()).toBeNull();
  });

  it('a bounded visit that ends leaves no pending decision and a transcript that can be kept', async () => {
    const { game, driver } = setup({ days: 0.08 });
    await driver.start();
    const m = driver.manual()!;
    game.setSpeed(16);
    for (let i = 0; i < 2000 && driver.status !== 'finished'; i++) {
      const w = m.waiting();
      if (w) {
        const obs = observationFromPrompt(w.user);
        m.submit(JSON.stringify({ choose: obs?.options[0]?.key ?? 'wander' }), w.id);
        await driver.idle();
        continue;
      }
      game.advance(0.1);
    }
    expect(driver.status).toBe('finished');
    expect(m.waiting()).toBeNull();
    const t = driver.transcriptNow();
    expect(t?.end, 'the record is closed off').toBeTruthy();
  });
});

describe('an accepted choice is not a finished one', () => {
  it('a window that closes on an unfinished action records it as unfinished, not as a bare "applied"', async () => {
    const { game, driver } = setup({ days: 0.08 });
    await driver.start();
    const m = driver.manual()!;
    game.setSpeed(16);
    let lastKey = '';
    for (let i = 0; i < 2000 && driver.status !== 'finished'; i++) {
      const w = m.waiting();
      if (w) {
        const obs = observationFromPrompt(w.user);
        // always take something long enough that the window can close under it
        const o = obs?.options.find((x) => x.key.startsWith('gather:')) ?? obs?.options[0];
        lastKey = o?.key ?? 'wander';
        m.submit(JSON.stringify({ choose: lastKey }), w.id);
        await driver.idle();
        continue;
      }
      game.advance(0.1);
    }
    expect(driver.status).toBe('finished');
    const t = driver.transcriptNow()!;
    const applied = t.calls.filter((c) => c.result?.status === 'applied');
    expect(applied.length, 'something was accepted').toBeGreaterThan(0);
    // every accepted choice has an outcome of its own, and the last one says plainly that it did not finish
    const last = applied[applied.length - 1];
    const outcome = t.outcomes.find((o) => o.activityId === last.result!.activityId);
    expect(outcome, 'the last accepted choice has an outcome on record').toBeTruthy();
    if (outcome!.outcome === 'unfinished') expect(outcome!.detail).toMatch(/window ended/);
    expect(['success', 'partial', 'failed', 'interrupted', 'unfinished']).toContain(outcome!.outcome);
    expect(outcome!.outcome, 'and it is never left blank or unknown').not.toBe('unknown');
  });
});

describe('control is really let go of, at every owner that holds it', () => {
  // A saved world matching after a replay says nothing about this: these are runtime objects, not saved state.
  function ownersAreClear(game: Game, driver: InhabitDriver): Record<string, unknown> {
    return {
      pendingRequest: driver.manual()?.waiting() ?? null,
      tickHooks: game.tickHooks,
      controllerSeam: externalController(),
      status: driver.status,
      clockRunning: game.playing,
    };
  }

  it('Stop releases the pending request, the tick hooks and the controller seam', async () => {
    const { game, driver } = setup({ days: null });
    await driver.start();
    expect(game.tickHooks, 'while driving, the clock is hooked').not.toBeNull();
    expect(externalController(), 'and the seam is held').not.toBeNull();
    const waiting = await untilAsked(game, driver);
    expect(waiting).toBeTruthy();

    driver.stop();
    const after = ownersAreClear(game, driver);
    expect(after.pendingRequest, 'no request is left waiting').toBeNull();
    expect(after.tickHooks, 'the clock is handed back').toBeNull();
    expect(after.controllerSeam, 'the person is handed back to the engine').toBeNull();
    expect(after.status).toBe('finished');
    await driver.idle(); // nothing is still in flight
    expect(driver.manual()!.waiting()).toBeNull();
  });

  it('a window that ends of its own accord releases the same things', async () => {
    const { game, driver } = setup({ days: 0.08 });
    await driver.start();
    const m = driver.manual()!;
    game.setSpeed(16);
    for (let i = 0; i < 2000 && driver.status !== 'finished'; i++) {
      const w = m.waiting();
      if (w) {
        const obs = observationFromPrompt(w.user);
        m.submit(JSON.stringify({ choose: obs?.options[0]?.key ?? 'wander' }), w.id);
        await driver.idle();
        continue;
      }
      game.advance(0.1);
    }
    expect(driver.status).toBe('finished');
    const after = ownersAreClear(game, driver);
    expect(after.pendingRequest).toBeNull();
    expect(after.tickHooks).toBeNull();
    expect(after.controllerSeam).toBeNull();
  });

  it('a completion that arrives after Stop changes nothing anywhere', async () => {
    const { game, driver } = setup({ days: null });
    await driver.start();
    const m = driver.manual()!;
    const waiting = await untilAsked(game, driver);
    expect(waiting).toBeTruthy();
    const decisionsBefore = driver.transcriptNow()!.calls.length;

    driver.stop();
    expect(m.submit('{"choose":"wander"}', waiting!.id)).toBe(false);
    expect(m.decline('too late')).toBe(false);
    await driver.idle();

    expect(driver.status).toBe('finished');
    expect(driver.transcriptNow()!.calls.length, 'no decision was added after the end').toBe(decisionsBefore);
    expect(game.tickHooks).toBeNull();
    expect(externalController()).toBeNull();
  });
});
