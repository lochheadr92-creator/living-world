// Rules 238: only wolves bar a traveller's way in (src/sim/arrival_way.ts; read in lifecycle.ts immigrationTick).
// STAGED: a flat world with a fed, roofed household at the camp and one animal standing beside it. The ordinary-world
// evidence is scripts/arrivals_probe.ts and docs/GROWTH_PLAN.md.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { barsTheWay, setArrivalWay } from '../src/sim/arrival_way';
import { conservationReport } from '../src/sim/economy';
import { immigrationTick } from '../src/sim/lifecycle';
import { makeSheep } from '../src/sim/livestock';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeWolf } from '../src/sim/wildlife';
import type { Animal, World } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => setArrivalWay(true));

/** Five fed people with two roofs at the camp, past the settlement's first two days, and one animal that began beside the camp (staged). */
function fixture(version: number, animal: 'sheep' | 'deer' | 'wolf' | 'none') {
  const s = stage('arrival-way'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.settings.immigration = true;
  w.tick = 6000;
  const cx = Math.floor(w.camp.x), cy = Math.floor(w.camp.y);
  const first = addPerson(s, 'Hana', cx + 0.5, cy + 4.5, { sex: 'f', age: 30, hunger: 100, thirst: 100, energy: 100 });
  for (const [i, name] of ['Tomas', 'Brannoc', 'Ilse', 'Maren'].entries()) addPerson(s, name, cx + 1.5 + i, cy + 4.5, { age: 30, hh: first.hhId, hunger: 100, thirst: 100, energy: 100 });
  building(s, 'hut', cx - 6, cy + 2, first.hhId, { grain: 40 });
  building(s, 'hut', cx + 6, cy + 2, first.hhId);
  const a: Animal | null = animal === 'none' ? null : animal === 'sheep' ? makeSheep(w, cx + 0.5, cy + 6.5, 'f') : makeWolf(w, cx + 0.5, cy + 6.5, animal);
  done(s);
  return { s, w, a };
}
/** The world's own check for travellers, as many times as forty days of it, with the spacing between groups set aside (staged). */
function arrivalsIn(w: World, n = 240): number {
  const before = w.stats.arrivals ?? 0;
  for (let i = 0; i < n; i++) { w.stats.lastArrival = -99999; immigrationTick(w); }
  return (w.stats.arrivals ?? 0) - before;
}

describe('rules 238: only wolves bar a traveller\'s way in', () => {
  it('is a supported version, and its removal is a lab arm', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(238);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(238);
    expect(parseIntervention('rich-no-arrival-way').spec).toBe('rich-no-arrival-way');
  });

  it('the staged settlement draws newcomers when no animal stands by it, at either version', () => {
    expect(arrivalsIn(fixture(237, 'none').w)).toBeGreaterThan(0);
    expect(arrivalsIn(fixture(238, 'none').w)).toBeGreaterThan(0);
  });

  it('a sheep beside the settlement kept every traveller out before, and does not now', () => {
    const before = fixture(237, 'sheep');
    expect(barsTheWay(before.w, before.a!)).toBe(true);
    expect(arrivalsIn(before.w)).toBe(0);
    const now = fixture(238, 'sheep');
    expect(barsTheWay(now.w, now.a!)).toBe(false);
    expect(arrivalsIn(now.w)).toBeGreaterThan(0);
    expect(conservationReport(now.w).ok).toBe(true);
  });

  it('a deer that began beside the settlement does not bar the way either', () => {
    expect(arrivalsIn(fixture(237, 'deer').w)).toBe(0);
    expect(arrivalsIn(fixture(238, 'deer').w)).toBeGreaterThan(0);
  });

  it('a wolf\'s den beside the settlement still keeps travellers out', () => {
    const { w, a } = fixture(238, 'wolf');
    expect(barsTheWay(w, a!)).toBe(true);
    expect(arrivalsIn(w)).toBe(0);
  });

  it('with the part removed every animal bars the way, as rules 237 has it', () => {
    const { w, a } = fixture(238, 'sheep');
    setArrivalWay(false);
    expect(barsTheWay(w, a!)).toBe(true);
    expect(arrivalsIn(w)).toBe(0);
  });
});
