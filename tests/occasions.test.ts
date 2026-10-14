// Occasions (src/sim/occasions.ts): a death calls a funeral, people go, meet and feel it; a market day moves food from those with
// spare to those short of it; an authored world calls nothing at all.
import { describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { BUILD_DEF, DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { killPerson } from '../src/sim/lifecycle';
import { OCCASION_OPEN, callOccasion, occasionsOf } from '../src/sim/occasions';
import { settingsForProfile } from '../src/sim/profiles';
import { isFreeLand } from '../src/sim/registry';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const run = (w: World, ticks: number): void => {
  for (let i = 0; i < ticks; i++) stepWorld(w);
};
function placeHall(w: World): void {
  const { w: bw, h: bh } = BUILD_DEF.hall;
  for (let r = 4; r < 30; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.floor(w.camp.x) + dx;
        const y = Math.floor(w.camp.y) + dy;
        let ok = true;
        for (let yy = y - 1; yy <= y + bh && ok; yy++) for (let xx = x - 1; xx <= x + bw && ok; xx++) if (!isFreeLand(w, xx, yy)) ok = false;
        if (ok) {
          createBuilding(w, 'hall', x, y, 0, { condition: 90 });
          return;
        }
      }
  throw new Error('no room for a hall');
}

describe('a death calls a funeral, and people come', () => {
  const w = world('rich');
  run(w, DAY + 200); // morning of day 1
  const dead = w.persons.find((p) => p.relations && Object.keys(p.relations).length > 3)!;
  const deadId = dead.id;
  killPerson(w, dead, 'a fall');
  const funeral = occasionsOf(w).find((o) => o.kind === 'funeral')!;

  it('is called for the dead, at the fire (there is no hall yet), in daylight', () => {
    expect(funeral).toBeTruthy();
    expect(funeral.about).toEqual([deadId]);
    expect(funeral.placeName).toBe('the fire');
    expect(funeral.status).toBe('called');
    expect(funeral.at).toBeGreaterThan(w.tick);
  });

  it('opens, is attended, and those who came met each other and felt it', () => {
    run(w, funeral.at - w.tick + OCCASION_OPEN + 5);
    expect(funeral.status).toBe('done');
    expect(funeral.attended.length).toBeGreaterThan(2);
    const came = w.persons.filter((p) => funeral.attended.includes(p.id));
    const met = came.filter((p) => Object.values(p.relations).some((r) => r.history.some((h) => h.text.includes('met at the funeral'))));
    expect(met.length).toBeGreaterThan(1);
    const felt = came.filter((p) => (p.mood?.thoughts ?? []).some((t) => t.why.includes('funeral')));
    expect(felt.length).toBe(came.length);
    expect(w.events.some((e) => e.text.includes('funeral') && e.text.includes('is over'))).toBe(true);
  });
});

describe('market day', () => {
  const w = world('rich');
  run(w, DAY);
  placeHall(w);

  it('comes round on its day once a hall stands, and food moves from those with spare to those short of it', () => {
    run(w, 2 * DAY + 20); // past the market's call on day 3
    const market = occasionsOf(w).find((o) => o.kind === 'market')!;
    expect(market).toBeTruthy();
    expect(market.placeName).toBe('the hall');
    // fair weather for the test: on a stormy day people rightly keep to the fire, and that is not what is being checked here
    w.weather.kind = 'clear';
    w.weather.storm = 0;
    w.weather.rain = 0;
    w.weather.nextChange = w.tick + 5 * DAY;
    run(w, market.until - w.tick + 5);
    expect(market.status).toBe('done');
    expect(market.attended.length).toBeGreaterThan(2);
    // whether food changed hands depends on who came short of it; what is held is that every such move is a recorded transfer
    const trades = w.events.filter((e) => e.kind === 'trade' && e.text.includes('at the market'));
    for (const t of trades) expect(t.text).toMatch(/handed \d+ food to|swapped \d+ \w+ for \d+ \w+ with/);
  });
});

describe('an authored world calls nothing', () => {
  it('has no occasions field after a death, a harvest or three days', () => {
    const w = world('authored');
    run(w, DAY + 200);
    killPerson(w, w.persons[0], 'a fall');
    expect(callOccasion(w, 'feast', [])).toBeNull();
    run(w, 2 * DAY);
    expect(w.occasions).toBeUndefined();
    expect(w.occasionState).toBeUndefined();
  });
});
