// Rules 194: an argument does not start with somebody already arguing (src/sim/argue_once.ts; startArgument, social.ts). Every
// situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the ordinary-world origin is
// tests/suspended_scan.test.ts at the rules-193 head (river, arrivals off: Alma's paused meal overwritten at tick 7,262 by a second
// argument). Each check has the rules-193 contrast so the older behaviour is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { alreadyArguing, setArgueOnce } from '../src/sim/argue_once';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { startArgument } from '../src/sim/social';
import { addPerson, done, stage } from './helpers/kit';
import type { Activity, Person } from '../src/sim/types';

afterEach(() => setArgueOnce(true));

/** Ada eating a meal with Ben and Cal beside her. */
function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`no-nested-argument-${version}-${dynamics}`);
  s.w.settings = { ...s.w.settings, dynamics, rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40, 40, { age: 30, hunger: 60, inv: { berries: 3 } });
  const ben = addPerson(s, 'Ben', 41, 40, { age: 30 });
  const cal = addPerson(s, 'Cal', 40, 41, { age: 30 });
  const w = done(s);
  const ended: Activity[] = [];
  w.hooks = { onActivityEnd: (_p: Person, a: Activity) => { ended.push(a); } };
  const meal = newActivity(w, ada, { kind: 'eat', label: 'Eating', goal: 'to eat', here: true, maxTicks: 60 });
  startActivity(w, ada, meal);
  startArgument(w, ada, ben, 'the well');
  expect(ada.activity?.kind).toBe('argue');
  expect(ada.suspended?.id).toBe(meal.id);
  return { w, ada, ben, cal, meal, ended };
}

describe('rules 194 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(194);
    expect(SUPPORTED_RULES_VERSIONS).toContain(194);
  });
});

describe('a second argument on somebody already arguing', () => {
  it('at 193 overwrites the held meal, which vanishes without an ending', () => {
    const { w, ada, cal, meal, ended } = scene(193);
    const first = ada.activity!;
    startArgument(w, ada, cal, 'the fish');
    expect(ada.activity?.kind).toBe('argue');
    expect(ada.activity?.id).not.toBe(first.id);
    expect(ada.suspended?.id).toBe(first.id);
    expect(ended.some((a) => a.id === meal.id)).toBe(false);
  });

  it('at 194 does not start: the first argument and the held meal are untouched, and nothing is recorded for the second', () => {
    const { w, ada, cal, meal } = scene(194);
    const first = ada.activity!;
    const events = w.events.length;
    startArgument(w, ada, cal, 'the fish');
    expect(ada.activity?.id).toBe(first.id);
    expect(ada.suspended?.id).toBe(meal.id);
    expect(cal.activity?.kind ?? null).not.toBe('argue');
    expect(cal.suspended).toBeNull();
    expect(w.events.length).toBe(events);
    expect(ada.relations[cal.id]?.grievance).toBeUndefined();
  });

  it('at 194 the other way round too: the newcomer cannot be drawn in by somebody arguing', () => {
    const { w, ada, cal } = scene(194);
    startArgument(w, cal, ada, 'the fish');
    expect(cal.activity?.kind ?? null).not.toBe('argue');
    expect(alreadyArguing(w, cal, ada)).toBe(true);
  });

  it('an argument between two people who are not arguing still starts at 194', () => {
    const { w, ben, cal } = scene(194);
    expect(ben.activity?.kind).toBe('argue');
    const s = stage('no-nested-argument-194-fresh');
    s.w.settings = { ...s.w.settings, dynamics: 'rich', rulesVersion: 194 };
    const dee = addPerson(s, 'Dee', 40, 40, { age: 30 });
    const eve = addPerson(s, 'Eve', 41, 40, { age: 30 });
    const w2 = done(s);
    expect(alreadyArguing(w2, dee, eve)).toBe(false);
    startArgument(w2, dee, eve, 'the well');
    expect(dee.activity?.kind).toBe('argue');
    expect(eve.activity?.kind).toBe('argue');
    void w; void cal;
  });

  it('with the switch off a rules-194 world nests again, and an authored world keeps the old behaviour too', () => {
    setArgueOnce(false);
    const a = scene(194);
    expect(alreadyArguing(a.w, a.ada, a.cal)).toBe(false);
    startArgument(a.w, a.ada, a.cal, 'the fish');
    expect(a.ada.suspended?.kind).toBe('argue');
    setArgueOnce(true);
    const b = scene(194, 'authored');
    expect(alreadyArguing(b.w, b.ada, b.cal)).toBe(false);
  });
});
