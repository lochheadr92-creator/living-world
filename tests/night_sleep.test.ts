// Rules 283 (src/sim/night_sleep.ts): a night's sleep. STAGED: each checks a rule, not how often (scripts/free_time_split.ts for that).
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { dayFraction, lightAt } from '../src/sim/environment';
import { isEveningFor } from '../src/sim/evening_fire';
import { LATE_BEDTIME, NIGHT_SLEEP_PARTS, bedtimeOf, setNightSleep } from '../src/sim/night_sleep';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';

afterEach(() => setNightSleep(true));
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);

function scene(version: number, frac: number, tag = '') {
  const s = stage(`night-${version}-${frac}-${tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = at(frac);
  w.light = lightAt(dayFraction(w.tick));
  const tom = addPerson(s, 'Tom', 40, 44, { age: 30, sex: 'm', hunger: 95, thirst: 95, energy: 99 });
  const home = building(s, 'hut', 38, 46, tom.hhId);
  done(s);
  learn(w, tom, home);
  tom.chrono = 0;
  return { w, tom, home };
}

describe("a night's sleep (rules 283)", () => {
  it('part evening: a grown bedtime of 0.88 of the day, and the evening runs to it; 0.8 at 282', () => {
    const now = scene(283, 0.84), before = scene(282, 0.84, 'b');
    expect(bedtimeOf(now.w, now.tom)).toBeCloseTo(LATE_BEDTIME);
    expect(bedtimeOf(before.w, before.tom)).toBeCloseTo(0.8);
    expect(isEveningFor(now.w, now.tom)).toBe(true);
    expect(isEveningFor(before.w, before.tom)).toBe(false);
  });

  it('part evening: in the dark evening before bedtime the wait for the light is not offered; at 282 it is', () => {
    const has = (version: number, tag: string) => {
      const sc = scene(version, 0.84, tag);
      sc.tom.x = sc.home.doorX + 0.5; sc.tom.y = sc.home.doorY + 0.5;
      return generateOptions(sc.w, sc.tom).options.some((o) => o.key.startsWith('shelter:') && o.make);
    };
    expect(has(282, 's0')).toBe(true);
    expect(has(283, 's1')).toBe(false);
  });

  it('part through: a rested sleeper at night sleeps on at 283; at 282 gets up; in the morning light gets up', () => {
    const sleepFor = (version: number, frac: number, tag: string) => {
      const sc = scene(version, frac, tag);
      startActivity(sc.w, sc.tom, newActivity(sc.w, sc.tom, { kind: 'sleep', label: 'Sleeping by my hut', goal: 'to recover energy', need: 'energy', here: true, maxTicks: 9000, minCommit: 1 }));
      for (let n = 0; n < 150; n++) stepWorld(sc.w);
      return sc.tom.activity?.kind;
    };
    expect(sleepFor(283, 0.95, 't2')).toBe('sleep');
    expect(sleepFor(282, 0.95, 't1')).not.toBe('sleep');
    expect(sleepFor(283, 0.32, 'tm')).not.toBe('sleep');
  });

  it('the lab arms remove both parts or one', () => {
    for (const arm of ['rich-no-night-sleep', ...NIGHT_SLEEP_PARTS.map((p) => `rich-no-night-sleep-${p}`)]) {
      const iv = parseIntervention(arm);
      expect(iv.spec).toBe(arm);
      iv.install!()();
    }
  });
});
