// Rules 280 (src/sim/bedtime.ts): a little one goes to bed at dark and sleeps till morning; after dark it takes up nothing but bed and bodily needs, and nobody
// starts a talk with it. Every situation here is STAGED: it checks a rule, not how often anything happens (that is scripts/free_time_split.ts).
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { dayFraction, lightAt } from '../src/sim/environment';
import { FETCH_DARK } from '../src/sim/fetch_home';
import { SETTLE_AGE } from '../src/sim/settle_child';
import { BEDTIME_AGE, BEDTIME_DARK, BEDTIME_PARTS, bedtimeFilter, setBedtime } from '../src/sim/bedtime';
import type { Option } from '../src/sim/optutil';
import type { Person } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => setBedtime(true));

/** a tick of the second day at this fraction of the day */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const DUSK = at(0.8); // after sunset (0.77), before a grown person's bedtime at chrono 0.05 (0.85)
const NIGHT = at(0.95);
const MORNING = at(0.32);

/** Mira (28) and her daughters Cora (5) and Ada (10), of one household with a lean-to; everybody fed, watered and wide awake. */
function scene(version: number, tick: number, tag = '') {
  const s = stage(`bedtime-${version}-${tick}-${tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = tick;
  w.light = lightAt(dayFraction(w.tick));
  const full = { hunger: 95, thirst: 95, energy: 95 };
  const mira = addPerson(s, 'Mira', 40, 36, { age: 28, sex: 'f', ...full });
  const cora = addPerson(s, 'Cora', 41, 37, { age: 5, sex: 'f', ...full, hh: mira.hhId });
  const ada = addPerson(s, 'Ada', 42, 37, { age: 10, sex: 'f', ...full, hh: mira.hhId });
  createBuilding(w, 'lean_to', 39, 38, mira.hhId);
  createBuilding(w, 'fire', 44, 38, 0, { fuel: 30000 });
  done(s);
  for (const p of [mira, cora, ada]) p.chrono = 0.05;
  return { w, mira, cora, ada };
}
const kinds = (os: Option[]) => [...new Set(os.map((o) => o.kind))];

describe('bedtime (rules 280)', () => {
  it('uses the same age and the same "after dark" line as settling a child and fetching one home', () => {
    expect(BEDTIME_AGE).toBe(SETTLE_AGE);
    expect(BEDTIME_DARK).toBe(FETCH_DARK);
    expect(lightAt(dayFraction(DUSK))).toBeLessThan(BEDTIME_DARK);
    expect(lightAt(dayFraction(MORNING))).toBeGreaterThan(0.55);
  });

  it('part bed: at dusk a little one who is not tired is offered sleep, and it ranks first; at 279 it is not offered', () => {
    const now = scene(280, DUSK);
    const ranked = rankOptions(generateOptions(now.w, now.cora));
    expect(ranked[0]?.kind).toBe('sleep');
    const before = scene(279, DUSK);
    expect(generateOptions(before.w, before.cora).options.some((o) => o.kind === 'sleep' && o.make)).toBe(false);
    // the ten-year-old is not a little one: no bedtime pull at dusk
    expect(generateOptions(now.w, now.ada).options.some((o) => o.kind === 'sleep' && o.make)).toBe(false);
  });

  it('part home: after dark a little one is left only bed, rest and bodily needs; at 279 and with the part off, more', () => {
    const now = scene(280, DUSK);
    expect(kinds(rankOptions(generateOptions(now.w, now.cora))).every((k) => ['sleep', 'rest', 'eat', 'eat_store', 'drink', 'warm', 'flee', 'defend', 'relocate'].includes(k))).toBe(true);
    const before = scene(279, DUSK, 'b');
    const all279 = kinds(rankOptions(generateOptions(before.w, before.cora)));
    expect(all279.some((k) => !['sleep', 'rest', 'eat', 'eat_store', 'drink', 'warm'].includes(k))).toBe(true);
    setBedtime(false, 'home');
    const off = scene(280, DUSK, 'off');
    expect(kinds(rankOptions(generateOptions(off.w, off.cora))).some((k) => !['sleep', 'rest', 'eat', 'eat_store', 'drink', 'warm'].includes(k))).toBe(true);
  });

  it('part home: nobody starts a talk with a little one after dark; with the older child, and by day, they may', () => {
    const night = scene(280, DUSK);
    const ctx = generateOptions(night.w, night.mira);
    const talk = (p: Person): Option => ({ kind: 'converse', label: `Talking with ${p.name}`, goal: 'company', need: 'social', util: 30, parts: [], eta: 5, key: `talk:${p.id}`, targetId: p.id, make: () => null });
    expect(bedtimeFilter(ctx, [talk(night.cora), talk(night.ada)]).map((o) => o.targetId)).toEqual([night.ada.id]);
    const noon = scene(280, at(0.45), 'noon');
    const day = generateOptions(noon.w, noon.mira);
    expect(bedtimeFilter(day, [talk(noon.cora), talk(noon.ada)]).length).toBe(2);
  });

  it('part bed: a rested little one asleep at night stays asleep; at 279 she gets up rested; in the morning light she gets up', () => {
    const sleepFor = (version: number, tick: number, tag: string) => {
      const sc = scene(version, tick, tag);
      pin(sc.mira); pin(sc.ada);
      sc.cora.needs.energy = 99;
      startActivity(sc.w, sc.cora, newActivity(sc.w, sc.cora, { kind: 'sleep', label: 'Sleeping by my lean-to', goal: 'to recover energy', need: 'energy', here: true, maxTicks: 9000, minCommit: 1 }));
      for (let n = 0; n < 150; n++) stepWorld(sc.w);
      return sc.cora.activity?.kind;
    };
    expect(sleepFor(280, NIGHT, 'n280')).toBe('sleep');
    expect(sleepFor(279, NIGHT, 'n279')).not.toBe('sleep');
    expect(sleepFor(280, MORNING, 'm280')).not.toBe('sleep');
  });

  it('the lab arms remove both parts or one', () => {
    for (const arm of ['rich-no-bedtime', ...BEDTIME_PARTS.map((p) => `rich-no-bedtime-${p}`)]) {
      const iv = parseIntervention(arm);
      expect(iv.spec).toBe(arm);
      const undo = iv.install!();
      undo();
    }
  });
});
