import { describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { delBelief, learn, observe } from '../src/sim/knowledge';
import { testKit } from '../src/sim/scenes';
import { tellBelief } from '../src/sim/social';
import { makeSource } from '../src/sim/sources';
import { RNG } from '../src/sim/rng';
import type { Activity, ActivityKind, Person, World } from '../src/sim/types';
import { natural, person, run, settingsFor } from './helpers/util';
import { snapshotInitial } from '../src/sim/economy';

/** a hungry person, a second person, and one berry bush well outside anyone's sight */
function remoteBushWorld(): { w: World; bush: ReturnType<typeof makeSource>; ben: Person; ana: Person } {
  const w = testKit.flatWorld(settingsFor('knowledge', { scene: 'help' }));
  w.camp = { x: 40.5, y: 36.5 };
  const rng = new RNG(5);
  const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 40.5, y: 44.5, sex: 'm', hunger: 25 });
  const ana = testKit.addPerson(w, rng, { name: 'Ana', x: 42.5, y: 44.5, hunger: 80 });
  const bush = makeSource(w, 'berry_bush', 40, 74, 6); // ~30 tiles away: beyond sight
  testKit.finish(w, 'help');
  void snapshotInitial;
  return { w, bush, ben, ana };
}

describe('knowledge is local', () => {
  it('people do not act on a resource they have never seen or been told about', () => {
    const { w, bush, ben } = remoteBushWorld();
    expect(ben.beliefs[bush.id]).toBeUndefined();
    const options = generateOptions(w, ben).options;
    expect(options.some((o) => o.targetId === bush.id)).toBe(false);
    // and over time he never targets it before he has actually perceived it or been told
    const violations: string[] = [];
    w.hooks = {
      onActivityStart: (p, a) => {
        if (a.targetId === bush.id && !p.beliefs[bush.id]) violations.push(`${p.name} started ${a.kind} on an unknown bush at ${w.tick}`);
      },
    };
    for (let i = 0; i < 1500; i++) {
      run(w, 1);
      for (const p of w.persons) if (p.activity && p.activity.targetId === bush.id && !p.beliefs[bush.id]) violations.push(`${p.name} was heading for an unknown bush at ${w.tick}`);
    }
    expect(violations).toEqual([]);
  });

  it('hearsay makes an unknown place eligible: the listener then goes there', () => {
    const { w, bush, ben, ana } = remoteBushWorld();
    // Ana has been there and remembers it (as observed some time ago)
    observe(w, ana, bush);
    ana.beliefs[bush.id].seen = -300;
    expect(ben.beliefs[bush.id]).toBeUndefined();
    const told = tellBelief(w, ana, ben, ana.beliefs[bush.id]);
    expect(told).toBe(true);
    const b = ben.beliefs[bush.id];
    expect(b.src).toBe('told');
    expect(b.from).toBe(ana.id);
    expect(b.seen).toBe(-300); // keeps the age of the original sighting: it can be out of date
    const opts = generateOptions(w, ben).options.filter((o) => o.targetId === bush.id);
    expect(opts.length).toBeGreaterThan(0);
    expect(opts[0].kind).toBe('gather');
    // and he does set out for it
    let went = false;
    for (let i = 0; i < 600 && !went; i++) {
      run(w, 1);
      if (ben.activity && ben.activity.targetId === bush.id) went = true;
    }
    expect(went).toBe(true);
  });

  it('memories go out of date: a remembered full bush that is really empty is corrected as soon as it is seen again', () => {
    const { w, bush, ben } = remoteBushWorld();
    // Ben remembers seeing 6 berries long ago, but they are gone now
    observe(w, ben, bush);
    ben.beliefs[bush.id].seen = -4000;
    ben.beliefs[bush.id].amount = 6;
    bush.amount = 0;
    bush.regrowTimer = -1e9; // it will not renew during the test
    // while he cannot see it, the stale memory still drives his plans: he sets out for it
    const first = generateOptions(w, ben).options.find((o) => o.targetId === bush.id);
    expect(first, 'a stale memory still makes the bush look worth visiting').toBeTruthy();
    let setOut = false;
    let corrected = -1;
    for (let i = 0; i < 1200; i++) {
      run(w, 1);
      if (ben.activity && ben.activity.targetId === bush.id) setOut = true;
      if (ben.beliefs[bush.id].amount === 0 && ben.beliefs[bush.id].seen > 0) {
        corrected = i;
        break;
      }
    }
    expect(setOut).toBe(true);
    expect(corrected).toBeGreaterThan(0);
    // having looked, he no longer believes it holds food
    expect(generateOptions(w, ben).options.some((o) => o.targetId === bush.id && o.kind === 'gather')).toBe(false);
  });

  it('forgetting is possible: dropping a belief removes the option', () => {
    const { w, bush, ben } = remoteBushWorld();
    observe(w, ben, bush);
    expect(generateOptions(w, ben).options.some((o) => o.targetId === bush.id)).toBe(true);
    delBelief(ben, bush.id);
    expect(generateOptions(w, ben).options.some((o) => o.targetId === bush.id)).toBe(false);
    void learn;
  });

  it('across a whole natural run, every activity aimed at a place or thing starts from something the person knew', () => {
    const w = natural('knowledge-audit');
    const needsBelief: ActivityKind[] = ['gather', 'eat_store', 'deposit', 'withdraw', 'haul', 'build', 'repair', 'craft', 'till', 'plant', 'tend', 'harvest', 'fuel_fire', 'drink', 'fetch_water', 'claim_home'];
    const bad: string[] = [];
    w.hooks = {
      onActivityStart: (p: Person, a: Activity) => {
        if (!needsBelief.includes(a.kind) || a.targetId === 0) return;
        if (!p.beliefs[a.targetId]) bad.push(`${p.name}:${a.kind}:${a.targetId}@${w.tick}`);
      },
    };
    run(w, 4800);
    expect(bad).toEqual([]);
    // hearsay really spreads in an ordinary run
    let hearsay = 0;
    for (const p of w.persons) for (const k in p.beliefs) if (p.beliefs[k as unknown as number].src === 'told') hearsay++;
    expect(hearsay).toBeGreaterThan(0);
    void person;
  });
});
