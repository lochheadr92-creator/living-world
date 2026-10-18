// Stage 3, first piece: a person's own estimate of what each kind of gathering has paid them, learned from their own outcomes and
// nothing else, bounded in what it may change, absent from an authored world, saved with the person, and removable by the lab.
import { describe, expect, it } from 'vitest';
import { parseIntervention, runLab } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { PAY_NUDGE_MAX, learningOn, payNudge, payRatio, recordPay, setLearning } from '../src/sim/learning';
import { settingsForProfile } from '../src/sim/profiles';
import type { Activity, Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';

const world = (dynamics: 'authored' | 'rich', seed = 'meadow'): World => createWorld(settingsForProfile('normal', seed, { immigration: false, dynamics }));
const run = (w: World, days: number): void => {
  for (let i = 0; i < days * DAY; i++) stepWorld(w);
};
const entries = (p: Person) => Object.values(p.payoff ?? {});

describe('what has paid: the arithmetic', () => {
  const w = world('rich');
  const p = w.persons[0];
  const trip = (over: Partial<Activity>): Activity =>
    ({ kind: 'gather', amount: 4, cycle: 4, start: 0, data: { stype: 'tree', eta: 100 }, ...over }) as unknown as Activity;

  it('compares what was got in the time spent against what the option expected', () => {
    w.tick = 100;
    expect(payRatio(w, trip({}))).toBe(1);
    w.tick = 200;
    expect(payRatio(w, trip({}))).toBe(0.5);
    expect(payRatio(w, trip({ cycle: 2 }))).toBe(0.25);
    w.tick = 50;
    expect(payRatio(w, trip({}))).toBe(2);
  });

  it('clamps one outcome to a tenth and four times, and says nothing without an expectation', () => {
    w.tick = 100;
    expect(payRatio(w, trip({ cycle: 0 }))).toBe(0.1);
    w.tick = 5;
    expect(payRatio(w, trip({}))).toBe(4);
    expect(payRatio(w, trip({ data: { stype: 'tree' } }))).toBeNull();
    expect(payRatio(w, trip({ amount: 0 }))).toBeNull();
  });

  it('a running mean per kind, and the tilt grows in over three outings and never passes the bound', () => {
    p.payoff = {};
    w.tick = 100;
    recordPay(w, p, trip({}));
    expect(p.payoff.wood).toEqual({ n: 1, r: 1 });
    expect(payNudge(w, p, 'tree')).toBeNull(); // as planned: nothing to say
    w.tick = 25;
    recordPay(w, p, trip({}));
    expect(p.payoff.wood).toEqual({ n: 2, r: 1.75 });
    const half = payNudge(w, p, 'tree')!;
    expect(half.value).toBeGreaterThan(0);
    expect(half.label).toMatch(/paid me well/);
    recordPay(w, p, trip({}));
    const full = payNudge(w, p, 'tree')!;
    expect(full.value).toBeGreaterThan(half.value);
    for (let i = 0; i < 20; i++) recordPay(w, p, trip({}));
    expect(payNudge(w, p, 'tree')!.value).toBeLessThanOrEqual(PAY_NUDGE_MAX);
    p.payoff = { forage: { n: 9, r: 0.1 } };
    const bad = payNudge(w, p, 'berry_bush')!;
    expect(bad.value).toBe(-PAY_NUDGE_MAX);
    expect(bad.label).toMatch(/paid me poorly/);
    expect(p.payoff.wood).toBeUndefined();
  });

  it('is nothing in an authored world and nothing with the switch off, and the switch is restored', () => {
    const a = world('authored');
    const q = a.persons[0];
    a.tick = 100;
    recordPay(a, q, trip({}));
    expect(q.payoff).toEqual({});
    q.payoff = { wood: { n: 5, r: 3 } };
    expect(payNudge(a, q, 'tree')).toBeNull();
    p.payoff = { wood: { n: 5, r: 3 } };
    const restore = parseIntervention('rich-no-learning').install!();
    try {
      expect(learningOn()).toBe(false);
      expect(payNudge(w, p, 'tree')).toBeNull();
      recordPay(w, p, trip({}));
      expect(p.payoff.wood).toEqual({ n: 5, r: 3 });
    } finally {
      restore();
    }
    expect(learningOn()).toBe(true);
    expect(payNudge(w, p, 'tree')).not.toBeNull();
    setLearning(true);
  });
});

describe('what has paid: in a running world', () => {
  const rich = world('rich');
  run(rich, 1);

  it('after a day people in a rich world have estimates, each from real outings and inside the clamp', () => {
    const with_ = rich.persons.filter((p) => entries(p).length > 0);
    expect(with_.length).toBeGreaterThan(5);
    for (const p of rich.persons)
      for (const e of entries(p)) {
        expect(e.n).toBeGreaterThanOrEqual(1);
        expect(e.r).toBeGreaterThanOrEqual(0.1);
        expect(e.r).toBeLessThanOrEqual(4);
      }
  });

  it('an authored world records none, for anyone, ever', () => {
    const a = world('authored');
    run(a, 1);
    for (const p of a.persons) expect(p.payoff).toEqual({});
  });

  it('the estimates survive a save, and a save made before they existed loads with none', () => {
    const back = deserializeWorld(serializeWorld(rich));
    for (const p of rich.persons) expect(back.byId.get(p.id)).toMatchObject({ payoff: p.payoff });
    const json = JSON.parse(serializeWorld(rich)) as { world: { persons: unknown } };
    const persons = json.world.persons as { __cols?: string[]; d?: Record<string, unknown[]> } | Record<string, unknown>[];
    if (Array.isArray(persons)) for (const p of persons) delete (p as Record<string, unknown>).payoff;
    else if (persons.__cols && persons.d) {
      persons.__cols = persons.__cols.filter((c) => c !== 'payoff');
      delete persons.d.payoff;
    }
    const old = deserializeWorld(JSON.stringify(json));
    for (const p of old.persons) expect(p.payoff).toEqual({});
  });

  it('the lab branch without learning parts from the control, and both report how concentrated the gathering was', () => {
    const [ctl, branch] = runLab(world('rich'), 0, 1, ['rich-no-learning'], 120);
    expect(branch.divergedAfterTicks).not.toBeNull();
    for (const r of [ctl, branch]) {
      expect(r.outcome.specialisation).toBeGreaterThan(0);
      expect(r.outcome.specialisation).toBeLessThanOrEqual(1);
      expect(r.outcome.topKindShare).toBeGreaterThan(0);
      expect(r.outcome.topKindShare).toBeLessThanOrEqual(1);
    }
    expect(learningOn()).toBe(true);
  });
});
