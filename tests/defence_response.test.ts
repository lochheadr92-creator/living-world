import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity, stepActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { TOOL_RECIPE } from '../src/sim/constants';
import { decide, generateOptions, rankOptions, reviewActivity } from '../src/sim/decision';
import { defProbe, defReset, defSnapshot, setWolfDefence } from '../src/sim/defence';
import { produce } from '../src/sim/economy';
import { updateEnvironment } from '../src/sim/environment';
import { perceive } from '../src/sim/perception';
import { RNG } from '../src/sim/rng';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { mintTool, toolOf } from '../src/sim/tools';
import { makeWolf } from '../src/sim/wildlife';
import { stepWorld } from '../src/sim/world';
import { settingsFor } from './helpers/util';

// Explicit starting equipment and threat. Decisions, interruption and movement use the real engine.
function scene(version: number, armed = true, wolfAt: [number, number] = [43.5, 40.5]) {
  const w = testKit.flatWorld(settingsFor('defence-response', { dynamics: 'rich', rulesVersion: version, immigration: false }));
  const p = testKit.addPerson(w, new RNG(71), { name: 'Ada', x: 40.5, y: 40.5, age: 25, hunger: 92, thirst: 92, energy: 60, traits: { caution: 0.1 } });
  const home = createBuilding(w, 'hut', 30, 30, p.hhId);
  w.households.find(h => h.id === p.hhId)!.homeId = home.id;
  const wolf = makeWolf(w, ...wolfAt);
  wolf.state = 'stalk'; wolf.targetId = p.id; wolf.until = 9999;
  if (armed) mintTool(w, 'spear', 0, p.hhId, p.id, p.inv, p.id, 'fixture equipment', false);
  testKit.finish(w, 'natural'); w.tick = 1000; updateEnvironment(w); perceive(w, p);
  return { w, p, home, wolf };
}

afterEach(() => { defProbe.on = false; defReset(); setWolfDefence(true); });

describe.each([...new Set([4, CURRENT_RULES_VERSION])])('defensive response under rules %i', version => {
  it.each(['sleep', 'craft'] as const)('interrupts %s immediately when defence is the chosen response', kind => {
    const { w, p, home } = scene(version);
    if (kind === 'craft') {
      produce(w, p.inv, 99, 'wood', TOOL_RECIPE.axe.wood, 'fixture materials');
      produce(w, p.inv, 99, 'stone', TOOL_RECIPE.axe.stone, 'fixture materials');
    }
    const prior = newActivity(w, p, {
      kind, label: kind, goal: 'previous task', need: kind === 'sleep' ? 'energy' : null,
      here: kind === 'sleep', targetId: kind === 'craft' ? home.id : 0,
      targetType: kind === 'craft' ? 'building' : '', minCommit: 999, duration: 999,
      data: kind === 'craft' ? { tool: 'axe', sticky: true } : {},
    });
    startActivity(w, p, prior);
    expect(p.activity).toBe(prior);
    expect(rankOptions(generateOptions(w, p, true))[0].kind).toBe('defend');
    p.nextThink = w.tick + 999; // the per-tick alarm must override commitment, not a scheduled review
    stepWorld(w);
    expect(p.activity?.kind).toBe('defend');
    expect(p.lastResult?.outcome).toBe('interrupted');
    expect(p.lastDecision?.trigger).toBe('danger');
    expect(p.cooldowns.hurt).toBeUndefined();
    expect(p.inv.axe ?? 0).toBe(0);
  });

  it('approaches a stationary visible wolf and resolves one attempt', () => {
    const { w, p, wolf } = scene(version, true, [43.5, 43.5]);
    const start = { x: p.x, y: p.y };
    decide(w, p, 'wolf seen');
    expect(p.activity?.kind).toBe('defend');
    defProbe.on = true; defReset();
    // Hold only wildlife's update: isolate the activity's approach to a non-closing target.
    // No position, path, progress or outcome is authored after the activity starts.
    for (let n = 0; n < 120 && defSnapshot().attempts === 0; n++) {
      w.tick++; perceive(w, p); stepActivity(w, p);
    }
    expect(Math.hypot(p.x - start.x, p.y - start.y)).toBeGreaterThan(0.5);
    expect(defSnapshot().attempts).toBe(1);
    expect(defSnapshot().droveOff + defSnapshot().failed).toBe(1);
    expect(toolOf(w, p, 'spear')!.wear).toBeGreaterThan(0);
    expect(wolf.x).toBe(43.5);
  });
});

it('still wakes an unarmed sleeper to flee', () => {
  const { w, p } = scene(CURRENT_RULES_VERSION, false);
  startActivity(w, p, newActivity(w, p, { kind: 'sleep', label: 'sleep', goal: 'rest', need: 'energy', here: true }));
  p.nextThink = w.tick + 999;
  stepWorld(w);
  expect(p.activity?.kind).toBe('flee');
  expect(p.lastResult?.outcome).toBe('interrupted');
});

it('keeps a fit ongoing defence when flight later ranks higher, then releases an unfit defender', () => {
  const { w, p } = scene(CURRENT_RULES_VERSION);
  decide(w, p, 'wolf seen');
  const defence = p.activity!;
  expect(defence.kind).toBe('defend');
  // Review after minimum commitment with a now cautious person. Utility ranking prefers flight.
  w.tick = defence.minCommit + 1; p.traits.caution = 1;
  expect(rankOptions(generateOptions(w, p, true))[0].kind).toBe('flee');
  reviewActivity(w, p);
  expect(p.activity).toBe(defence);
  p.health = 20;
  reviewActivity(w, p);
  expect(p.activity?.kind).toBe('flee');
});
