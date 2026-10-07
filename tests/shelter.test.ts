// Sheltering from rain or a storm is a `rest` activity too, but it is about warmth, not energy. A person who is already rested must not
// finish it after one tick and start it again, over and over (found by scripts/bench.ts: thousands of starts, each a decision, a path
// search and an id, while it rained).
import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, learn, stage } from './helpers/kit';

function stormWorld(name: string, energy: number) {
  const s = stage(name);
  const a = addPerson(s, 'Ann', 44, 44, { energy, hunger: 85, thirst: 85 });
  const hut = building(s, 'hut', 46, 46, a.hhId);
  s.w.households.find((h) => h.id === a.hhId)!.homeId = hut.id;
  const w = done(s);
  learn(w, a, hut);
  a.needs.warmth = 30;
  w.weather = { ...w.weather, kind: 'storm', rain: 1, storm: 1, cloud: 1, temp: 6, wind: 0.6, nextChange: 1e9 };
  return { w, a };
}

describe('sheltering from the weather', () => {
  it('is not started over and over by someone who is already rested', () => {
    const { w, a } = stormWorld('storm-rested', 100);
    const labels: string[] = [];
    w.hooks = { onActivityStart: (_p, act) => labels.push(act.label) };
    for (let i = 0; i < 400; i++) {
      stepWorld(w);
      a.needs.energy = 100; // as rested as the whole time, as in the situation that was found
      a.needs.warmth = Math.min(a.needs.warmth, 30);
    }
    const shelters = labels.filter((l) => /^Sheltering/.test(l)).length;
    expect(shelters, `started ${shelters} times: ${labels.slice(0, 5).join(' | ')}`).toBeLessThanOrEqual(4);
  });

  it('is the same whether or not the person is rested: a tired person shelters once and stays', () => {
    const { w, a } = stormWorld('storm-tired', 60);
    const labels: string[] = [];
    w.hooks = { onActivityStart: (_p, act) => labels.push(act.label) };
    for (let i = 0; i < 400; i++) {
      stepWorld(w);
      a.needs.energy = 60;
      a.needs.warmth = Math.min(a.needs.warmth, 30);
    }
    expect(labels.filter((l) => /^Sheltering/.test(l)).length).toBeLessThanOrEqual(4);
  });
});

describe('resting for energy', () => {
  it('still ends once the person is rested', () => {
    const s = stage('rest-ends');
    const a = addPerson(s, 'Ann', 44, 44, { energy: 99, hunger: 85, thirst: 85 });
    const w = done(s);
    const act = newActivity(w, a, { kind: 'rest', label: 'Resting', goal: 'to recover energy', need: 'energy', here: true, amount: 180, utility: 1, minCommit: 80, maxTicks: 400 });
    startActivity(w, a, act);
    expect(a.activity).toBe(act);
    for (let i = 0; i < 3; i++) stepWorld(w);
    expect(a.activity).not.toBe(act);
  });
});
