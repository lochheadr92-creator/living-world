import { describe, expect, it } from 'vitest';
import { TICKS_PER_YEAR } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { adoptOrphans, killPerson } from '../src/sim/lifecycle';
import { ageYears, stageOf } from '../src/sim/people';
import { shelterAt } from '../src/sim/needs';
import { lightAt } from '../src/sim/environment';
import { testKit } from '../src/sim/scenes';
import { RNG } from '../src/sim/rng';
import { updateNeeds } from '../src/sim/needs';
import { updateEnvironment } from '../src/sim/environment';
import { createBuilding } from '../src/sim/buildings';
import { natural, person, run, settingsFor } from './helpers/util';

describe('life stages, birth and death', () => {
  it('a child is born to a couple, joins their household, and has the right family ties', () => {
    const w = natural('birth');
    const mother = w.persons.find((p) => p.sex === 'f' && p.partnerId && stageOf(w, p) === 'adult')!;
    const father = w.persons.find((p) => p.id === mother.partnerId)!;
    expect(father).toBeTruthy();
    const before = w.persons.length;
    mother.pregnantUntil = w.tick + 5;
    mother.pregnantBy = father.id;
    run(w, 90);
    expect(w.persons.length).toBe(before + 1);
    const baby = w.persons[w.persons.length - 1];
    expect(ageYears(w, baby)).toBeLessThan(0.2);
    expect(stageOf(w, baby)).toBe('child');
    expect(baby.parents.sort()).toEqual([mother.id, father.id].sort());
    expect(mother.children).toContain(baby.id);
    expect(baby.hhId).toBe(mother.hhId);
    expect(baby.relations[mother.id].kin).toBe('parent');
    expect(w.events.some((e) => /was born to/.test(e.text))).toBe(true);
    expect(mother.pregnantUntil).toBe(0);
  });

  it('people grow up: a child crossing the age threshold is noticed', () => {
    const w = natural('growing-up');
    const kid = w.persons.find((p) => stageOf(w, p) === 'child')!;
    kid.birthTick = w.tick - Math.round(11.99 * TICKS_PER_YEAR);
    run(w, Math.round(0.02 * TICKS_PER_YEAR));
    expect(stageOf(w, kid)).toBe('youth');
    expect(w.events.some((e) => /is growing up/.test(e.text) && e.ids.includes(kid.id))).toBe(true);
  });

  it('death removes a person from the world but not their belongings, and leaves a grave', () => {
    const w = natural('death');
    const p = w.persons.find((q) => (q.inv.berries ?? 0) + (q.inv.fruit ?? 0) + (q.inv.grain ?? 0) > 0)!;
    const hh = w.households.find((h) => h.id === p.hhId)!;
    const carried = Object.values(p.inv).reduce((s, n) => s + (n ?? 0), 0);
    expect(carried).toBeGreaterThan(0);
    const piles = w.piles.length;
    const graves = w.graves.length;
    killPerson(w, p, 'test');
    expect(w.persons.includes(p)).toBe(false);
    expect(w.byId.has(p.id)).toBe(false);
    expect(hh.members.includes(p.id)).toBe(false);
    expect(w.graves.length).toBe(graves + 1);
    expect(w.piles.length).toBeGreaterThanOrEqual(piles + 1);
    expect(w.deceased.at(-1)!.name).toBe(p.name);
    expect(w.events.some((e) => /died/.test(e.text) && e.text.includes(p.name))).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a child left without any adult in the household is taken in by someone', () => {
    const w = natural('orphan');
    const kid = w.persons.find((p) => stageOf(w, p) === 'child' && p.parents.length)!;
    const hh = w.households.find((h) => h.id === kid.hhId)!;
    for (const id of [...hh.members]) {
      const m = w.byId.get(id);
      if (m && m.ent === 'person' && m.id !== kid.id) killPerson(w, m, 'test');
    }
    adoptOrphans(w);
    const newHh = w.households.find((h) => h.id === kid.hhId)!;
    expect(newHh.members.length).toBeGreaterThan(1);
    expect(w.events.some((e) => /took in/.test(e.text))).toBe(true);
  });

  it('a parent feeds a hungry child: care is a real transfer driven by the parent’s own decision', () => {
    const w = testKit.flatWorld(settingsFor('care', { scene: 'help' }));
    w.camp = { x: 40.5, y: 36.5 };
    const rng = new RNG(3);
    const mum = testKit.addPerson(w, rng, { name: 'Mum', x: 40.5, y: 44.5, age: 32, hunger: 85, inv: { berries: 5 }, traits: { generosity: 0.7 } });
    const kid = testKit.addPerson(w, rng, { name: 'Kid', x: 44.5, y: 44.5, age: 6, hunger: 24, hh: mum.hhId });
    kid.parents = [mum.id];
    mum.children = [kid.id];
    testKit.finish(w, 'help');
    const moves: string[] = [];
    w.hooks = { onTransfer: (t) => moves.push(t.reason + ':' + t.from + '>' + t.to) };
    run(w, 500);
    expect(kid.stats.received).toBeGreaterThan(0);
    expect(moves.some((m) => m.includes('person:' + mum.id + '>person:' + kid.id))).toBe(true);
    expect(kid.lastAteTick).toBeGreaterThan(0);
  });
});

describe('weather, night and shelter act on exposure', () => {
  it('nights are cold, but a fire or a hut keeps people warm', () => {
    const w = testKit.flatWorld(settingsFor('cold', { scene: 'help' }));
    w.camp = { x: 40.5, y: 36.5 };
    const rng = new RNG(8);
    const open = testKit.addPerson(w, rng, { name: 'Open', x: 20.5, y: 50.5 });
    const fire = createBuilding(w, 'fire', 60, 50, 0, { fuel: 5000 });
    const warm = testKit.addPerson(w, rng, { name: 'Warm', x: fire.x + 1.5, y: fire.y + 0.5 });
    const hut = createBuilding(w, 'hut', 30, 60, 0);
    const indoors = testKit.addPerson(w, rng, { name: 'Indoors', x: hut.x + 1, y: hut.y + 1 });
    testKit.finish(w, 'help');
    w.tick = 1700; // around half past midnight
    for (const p of w.persons) p.needs.warmth = 80;
    expect(lightAt((w.tick / 2400 + 0.3) % 1)).toBeLessThan(0.05);
    for (let i = 0; i < 500; i++) {
      w.tick++;
      updateEnvironment(w);
      for (const p of w.persons) updateNeeds(w, p);
    }
    expect(w.weather.temp).toBeLessThan(12);
    expect(shelterAt(w, indoors.x, indoors.y).kind).toBe('hut');
    expect(open.needs.warmth).toBeLessThan(55);
    expect(warm.needs.warmth).toBeGreaterThan(open.needs.warmth + 20);
    expect(indoors.needs.warmth).toBeGreaterThan(open.needs.warmth + 20);
    void person;
  });

  it('rain soaks people who are not under cover', () => {
    const w = testKit.flatWorld(settingsFor('rain', { scene: 'help' }));
    const rng = new RNG(9);
    const wet = testKit.addPerson(w, rng, { name: 'Wet', x: 20.5, y: 50.5 });
    const hut = createBuilding(w, 'hut', 30, 60, 0);
    const dry = testKit.addPerson(w, rng, { name: 'Dry', x: hut.x + 1, y: hut.y + 1 });
    testKit.finish(w, 'help');
    w.tick = 300; // mid-morning
    w.weather.kind = 'rain';
    w.weather.rain = 0.7;
    w.weather.nextChange = 1e9;
    for (let i = 0; i < 600; i++) {
      w.tick++;
      updateEnvironment(w);
      for (const p of w.persons) updateNeeds(w, p);
    }
    expect(dry.needs.warmth).toBeGreaterThan(wet.needs.warmth + 10);
  });
});
