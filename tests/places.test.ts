// Places that matter (places.ts, options_places.ts): off by default and then invisible; when on, remembered, weighed, visited, saved.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { endActivity, startActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { describePerson } from '../src/sim/inspect';
import { killPerson } from '../src/sim/lifecycle';
import { thoughtsOf } from '../src/sim/mood';
import { dangerAt, makeCtx } from '../src/sim/optutil';
import { holdOf, placesOnBite, rememberPlace, setPlaceEffects, updatePlaces } from '../src/sim/places';
import type { Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

const rich = (seed: string) => natural(seed, { dynamics: 'rich' });

/** move a person (and their idea of where they are) without walking */
function put(p: Person, x: number, y: number): void {
  p.x = p.px = x;
  p.y = p.py = y;
}

function partners(w: World): [Person, Person] {
  const alive = w.persons.filter((p) => p.alive);
  const dead = alive[0];
  const mate = alive.find((p) => p !== dead)!;
  mate.relations[dead.id] = { affinity: 80, trust: 80, familiarity: 80, lastMet: 0, kin: 'partner', avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };
  return [dead, mate];
}

afterEach(() => setPlaceEffects(true));

describe('places that matter', () => {
  it('are never remembered in an ordinary world', () => {
    const w = natural('places-off');
    const p = w.persons[0];
    placesOnBite(w, p);
    rememberPlace(w, p, 'danger', p.x, p.y, 1, DAY, 'x');
    const [dead] = partners(w);
    killPerson(w, dead, 'test');
    run(w, 600);
    expect(w.persons.every((q) => q.places === undefined)).toBe(true);
    expect(describePerson(w, w.persons[0].id)?.places).toBeNull();
  });

  it('mark where a wolf bit someone, for them and for whoever saw it, and nobody else', () => {
    const w = rich('places-bite');
    const [victim, near, far] = w.persons.filter((p) => p.alive);
    put(victim, 30, 30);
    put(near, 34, 30);
    near.pose = 'stand';
    put(far, 60, 60);
    placesOnBite(w, victim);
    expect(victim.places?.[0]).toMatchObject({ kind: 'danger', strength: 1 });
    expect(near.places?.[0]).toMatchObject({ kind: 'danger', strength: 0.5 });
    expect(near.places?.[0].why).toContain(victim.name);
    expect(far.places).toBeUndefined();
  });

  it('count a remembered place of danger when weighing where to go, as strongly as it still holds', () => {
    const w = rich('places-weigh');
    const p = w.persons[0];
    put(p, 20, 20);
    rememberPlace(w, p, 'danger', 40, 40, 1, DAY * 6, 'where a wolf bit them');
    const fresh = dangerAt(makeCtx(w, p, false), 40, 40);
    expect(fresh).toBeGreaterThan(0.9);
    expect(dangerAt(makeCtx(w, p, false), 52, 40)).toBe(0);
    w.tick += DAY * 3;
    expect(dangerAt(makeCtx(w, p, false), 40, 40)).toBeCloseTo(fresh / 2, 1);
    setPlaceEffects(false);
    expect(dangerAt(makeCtx(w, p, false), 40, 40)).toBe(0);
  });

  it('renew a place rather than pile up copies, and forget it once it has faded', () => {
    const w = rich('places-fade');
    const p = w.persons[0];
    rememberPlace(w, p, 'danger', 40, 40, 0.5, DAY, 'seen');
    rememberPlace(w, p, 'danger', 41, 40, 1, DAY * 2, 'bitten');
    expect(p.places!.length).toBe(1);
    expect(p.places![0]).toMatchObject({ x: 41, strength: 1, why: 'bitten' });
    w.tick += DAY;
    expect(holdOf(w, p.places![0])).toBeCloseTo(0.5, 2);
    w.tick += DAY + 1;
    updatePlaces(w, p);
    expect(p.places!.length).toBe(0);
  });

  it('unsettle a person standing near where it happened', () => {
    const w = rich('places-uneasy');
    const p = w.persons[0];
    rememberPlace(w, p, 'danger', p.x + 2, p.y, 1, DAY * 6, 'where a wolf bit them');
    updatePlaces(w, p);
    const t = thoughtsOf(w, p).find((x) => x.why.includes('uneasy'));
    expect(t?.value).toBeLessThan(-8);
    expect(t?.why).toBe('feels uneasy near where a wolf bit them');
  });

  it('make a grave a place of grief for those close to the dead, and a wolf death a place to fear', () => {
    const w = rich('places-grave');
    const [dead, mate] = partners(w);
    const stranger = w.persons.find((p) => p.alive && p !== dead && p !== mate && p.hhId !== dead.hhId && !p.relations[dead.id]?.kin && (p.relations[dead.id]?.affinity ?? 0) <= 50)!;
    expect(stranger).toBeDefined();
    dead.deathCause = 'wolf attack';
    killPerson(w, dead, 'wolf attack');
    const grave = w.graves.find((g) => g.name === dead.name)!;
    const grief = mate.places!.find((m) => m.kind === 'grief')!;
    expect(grief).toMatchObject({ about: dead.id, strength: 1, x: grave.x + 0.5, y: grave.y + 0.5 });
    expect(mate.places!.some((m) => m.kind === 'danger' && m.why.includes(dead.name))).toBe(true);
    expect(stranger.places).toBeUndefined();
  });

  it('let a mourner go to the grave, which eases the loss, and not want to go again straight away', () => {
    const w = rich('places-visit');
    const [dead, mate] = partners(w);
    killPerson(w, dead, 'test');
    run(w, 60);
    while (makeCtx(w, mate, false).night) run(w, 60); // daytime
    mate.needs.hunger = mate.needs.thirst = mate.needs.energy = mate.needs.warmth = mate.needs.safety = 90;
    const opt = generateOptions(w, mate).options.find((o) => o.kind === 'pay_respects');
    expect(opt?.label).toContain(dead.name);
    const lost = mate.mood!.thoughts.find((t) => t.kind === 'lost:' + dead.id)!;
    const before = lost.until;
    const a = opt!.make!()!;
    startActivity(w, mate, a);
    endActivity(w, mate, 'success', 'done');
    expect(lost.until).toBeLessThan(before);
    expect(thoughtsOf(w, mate).some((t) => t.why.includes('paid respects') && t.value > 0)).toBe(true);
    expect(generateOptions(w, mate).options.some((o) => o.kind === 'pay_respects')).toBe(false);
    run(w, DAY + 60);
    while (makeCtx(w, mate, false).night) run(w, 60);
    mate.needs.hunger = mate.needs.thirst = mate.needs.energy = mate.needs.warmth = mate.needs.safety = 90;
    expect(generateOptions(w, mate).options.some((o) => o.kind === 'pay_respects')).toBe(true);
  });

  it('save and load with the places, and count them in the fingerprint', () => {
    const a = rich('places-save');
    run(a, 300);
    const p = a.persons[0];
    const h0 = hashWorld(a);
    rememberPlace(a, p, 'danger', p.x, p.y, 1, DAY * 6, 'where a wolf bit them');
    expect(hashWorld(a)).not.toBe(h0);
    const b = deserializeWorld(serializeWorld(a));
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(b.persons[0].places?.[0].why).toBe('where a wolf bit them');
    run(a, 600);
    run(b, 600);
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it('show in the inspector, strongest first', () => {
    const w = rich('places-inspect');
    const p = w.persons[0];
    rememberPlace(w, p, 'danger', 10, 10, 0.5, DAY, 'seen');
    rememberPlace(w, p, 'grief', 30, 30, 1, DAY * 6, 'where Ada is buried', 999);
    const v = describePerson(w, p.id)!;
    expect(v.places!.map((m) => m.kind)).toEqual(['grief', 'danger']);
  });
});
