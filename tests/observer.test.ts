import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { describeEntity } from '../src/sim/inspect';
import { whereItemIs } from '../src/sim/inspect_work';
import type { Site, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { addPerson, building, done, learn, site, stage } from './helpers/kit';
import { natural, run } from './helpers/util';

const notesOf = (w: World, id: number, title: string): string[] => describeEntity(w, id)?.sections?.find((s) => s.title === title)?.notes ?? [];

describe('for the observer: where the thing a stalled site or an idle workplace waits for actually is', () => {
  it('an ordinary world: a site stalled for want of planks says where planks are, where they are made and who knows', () => {
    const w = natural('meadow');
    let stalled: Site | undefined;
    for (let i = 0; i < 240 && !stalled; i++) {
      run(w, 100);
      stalled = w.sites.find((s) => w.tick - s.lastWorkTick >= 300 && (s.delivered.planks ?? 0) + (s.used.planks ?? 0) < (s.required.planks ?? 0));
    }
    expect(stalled, 'a site waiting for planks within 24,000 ticks').toBeDefined();
    const before = { hash: hashWorld(w), json: serializeWorld(w) };
    const notes = notesOf(w, stalled!.id, 'Materials');
    const line = notes.find((n) => n.startsWith('For the observer, planks: '));
    expect(line, notes.join(' | ')).toBeDefined();
    expect(line).toMatch(/made at the timber yard, which is (busy|idle: .+?);/);
    expect(line).toMatch(/\d+ of \d+ people know of a place to get it\.$/);
    // describing reads the world and changes nothing in it
    expect(hashWorld(w)).toBe(before.hash);
    expect(serializeWorld(w)).toBe(before.json);
    // and a loaded save shows the very same card
    expect(describeEntity(deserializeWorld(before.json), stalled!.id)).toEqual(describeEntity(w, stalled!.id));
  }, 240_000);

  it('counts what is carried and stored, grouped by kind of building, says where it is made and how many know of a place to get it', () => {
    // STAGED
    const s = stage('where-planks');
    const a = addPerson(s, 'Ana', 40, 30, { inv: { planks: 2 } });
    const b = addPerson(s, 'Ben', 46, 30, { sex: 'm' });
    addPerson(s, 'Cai', 60, 50, { sex: 'm' });
    const store = building(s, 'storehouse', 42, 26, 0, { planks: 3 });
    building(s, 'hut', 50, 26, a.hhId, { planks: 1 });
    building(s, 'hut', 54, 26, b.hhId, { planks: 1 });
    building(s, 'timber_yard', 36, 34, 0);
    const w = done(s);
    // Ben has seen the storehouse; Cai, far off, has seen nothing that holds planks
    learn(w, b, store);
    const text = whereItemIs(w, 'planks');
    expect(text).toMatch(/^For the observer, planks: /);
    expect(text).toContain('2 carried by 1 person');
    expect(text).toContain('3 in the storehouse');
    expect(text).toContain('2 in 2 huts');
    expect(text).toContain('made at the timber yard, which is idle: needs 3 more wood brought in');
    const knowers = w.persons.filter((p) => Object.values(p.beliefs).some((x) => (x.items?.planks ?? 0) > 0)).length;
    expect(text).toContain(`${knowers} of 3 people know of a place to get it`);
    expect(knowers).toBeLessThan(3);
  });

  it('an idle workplace short of an input says where that input is, but only while its product is wanted', () => {
    // STAGED: a kiln with no clay; then a house site that needs bricks
    const s = stage('kiln-short');
    const p = addPerson(s, 'Ana', 40, 30);
    const kiln = building(s, 'kiln', 44, 34, 0);
    const w = done(s);
    const observerNotes = () => notesOf(w, kiln.id, 'Idle — what is stopping it').filter((n) => n.startsWith('For the observer'));
    expect(observerNotes(), 'nobody wants bricks: nothing to explain').toEqual([]);
    site(s, 'house', 52, 40, p.hhId, p.id, { wood: 6, planks: 8 });
    const notes = observerNotes();
    expect(notes.some((n) => n.startsWith('For the observer, clay: '))).toBe(true);
    expect(notes.find((n) => n.startsWith('For the observer, clay: '))).toMatch(/\d+ of \d+ people know of a place to get it\.$/);
  });
});
