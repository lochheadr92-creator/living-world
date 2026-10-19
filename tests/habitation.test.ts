import { afterEach, describe, expect, it } from 'vitest';
import { testKit } from '../src/sim/scenes';
import { RNG } from '../src/sim/rng';
import { settingsFor } from './helpers/util';
import { createBuilding, createSite, completeSite, destroyBuilding } from '../src/sim/buildings';
import { enterHome, leaveHome, indoorHome, occupants, homeCapacity, doorPoint, setHabitationAdmissions } from '../src/sim/habitation';
import { newActivity, startActivity, stepActivity, endActivity } from '../src/sim/activities';
import { perceive } from '../src/sim/perception';
import { observe } from '../src/sim/knowledge';
import { rebuildMobileGrid } from '../src/sim/registry';
import { shelterAt } from '../src/sim/needs';
import { safeFromWolf, makeWolf, updateWildlife } from '../src/sim/wildlife';
import { hashWorld, stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { killPerson, giveBirth } from '../src/sim/lifecycle';
import { generateOptions } from '../src/sim/decision';
import { describePerson, describeEntity } from '../src/sim/inspect';
import { parseIntervention } from '../scripts/lab/lab';

function fixture(version = 3) {
  const w = testKit.flatWorld(settingsFor('home-contract', { dynamics: 'rich', rulesVersion: version, immigration: false }));
  const p = testKit.addPerson(w, new RNG(32), { name: 'Ada', x: 36.5, y: 42.5, hunger: 90, thirst: 90, energy: 20, age: 25 });
  const b = createBuilding(w, 'hut', 40, 40, p.hhId);
  w.households.find(h => h.id === p.hhId)!.homeId = b.id;
  testKit.finish(w, 'natural');
  observe(w, p, b);
  return { w, p, b };
}
function atDoor(s: ReturnType<typeof fixture>) { Object.assign(s.p, doorPoint(s.b)); }
function sleep(s: ReturnType<typeof fixture>) {
  const a = newActivity(s.w, s.p, { kind: 'sleep', label: 'Sleep at home', goal: 'rest', targetType: 'building', targetId: s.b.id, spotX: s.b.x - 0.5, spotY: s.b.y + 0.5, maxTicks: 2000 });
  startActivity(s.w, s.p, a);
  return a;
}
afterEach(() => setHabitationAdmissions(true));

describe('physical home occupancy', () => {
  it('requires arrival at the door, then enters via the ordinary sleep activity', () => {
    const s = fixture();
    expect(enterHome(s.w, s.p, s.b)).toMatch(/reach/);
    const a = sleep(s);
    expect(s.p.indoors).toBeUndefined();
    for (let n = 0; n < 300 && !s.p.indoors; n++) { s.w.tick++; stepActivity(s.w, s.p); }
    expect(s.p.indoors).toBe(s.b.id);
    expect(a.phase).toBe('work');
    expect(a.progress).toBeGreaterThan(0);
    expect(occupants(s.w, s.b).map(p => p.id)).toEqual([s.p.id]);
  });
  it('does not let a here/controller action bypass entrance validation', () => {
    const s = fixture();
    startActivity(s.w, s.p, newActivity(s.w, s.p, { kind: 'sleep', label: 'sleep', goal: 'rest', targetId: s.b.id, here: true }));
    expect(s.p.activity?.phase).toBe('travel');
    expect(s.p.indoors).toBeUndefined();
  });
  it('refuses another household and blocked entrances', () => {
    const s = fixture(); atDoor(s);
    s.b.hhId++;
    expect(enterHome(s.w, s.p, s.b)).toMatch(/household/);
    s.b.hhId = s.p.hhId;
    s.w.solid[s.b.doorY * s.w.W + s.b.doorX] = 1;
    expect(enterHome(s.w, s.p, s.b)).toMatch(/blocked/);
    expect(s.p.indoors).toBeUndefined();
  });
  it('keeps a household together rather than using store capacity for beds', () => {
    const s = fixture();
    s.b.store.cap = 0;
    expect(homeCapacity(s.w, s.b)).toBeGreaterThanOrEqual(s.w.persons.filter(p => p.hhId === s.p.hhId).length);
    atDoor(s);
    expect(enterHome(s.w, s.p, s.b)).toBeNull();
    expect(enterHome(s.w, s.p, s.b)).toBeNull();
    expect(occupants(s.w, s.b)).toHaveLength(1);
  });
  it('stays indoors between rests and exits before outside work', () => {
    const s = fixture(); atDoor(s); sleep(s); stepActivity(s.w, s.p);
    endActivity(s.w, s.p, 'success', 'rested');
    expect(s.p.indoors).toBe(s.b.id);
    startActivity(s.w, s.p, newActivity(s.w, s.p, { kind: 'rest', label: 'rest', goal: 'rest', here: true }));
    stepActivity(s.w, s.p);
    expect(s.p.indoors).toBe(s.b.id);
    startActivity(s.w, s.p, newActivity(s.w, s.p, { kind: 'search', label: 'outside', goal: 'look', here: true }));
    stepActivity(s.w, s.p);
    expect(s.p.indoors).toBeUndefined();
    expect({ x: s.p.x, y: s.p.y }).toEqual(doorPoint(s.b));
  });
  it('does no outside work through a blocked exit and resumes when opened', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    s.w.solid[s.b.doorY * s.w.W + s.b.doorX] = 1;
    const a = newActivity(s.w, s.p, { kind: 'search', label: 'look outside', goal: 'look', here: true });
    startActivity(s.w, s.p, a);
    for (let i = 0; i < 5; i++) stepActivity(s.w, s.p);
    expect(a.progress).toBe(0);
    expect(a.blocked).toMatch(/exit is blocked/);
    expect(s.p.indoors).toBe(s.b.id);
    s.w.solid[s.b.doorY * s.w.W + s.b.doorX] = 0;
    stepActivity(s.w, s.p);
    expect(s.p.indoors).toBeUndefined();
    expect(a.progress).toBe(1);
  });
  it('gives enclosed protection only indoors, not beside the wall', () => {
    const s = fixture(); atDoor(s);
    expect(shelterAt(s.w, s.p.x, s.p.y, s.p).cover).toBe(0);
    expect(safeFromWolf(s.w, s.p)).toBe(false);
    enterHome(s.w, s.p, s.b);
    expect(shelterAt(s.w, s.p.x, s.p.y, s.p).cover).toBe(1);
    expect(safeFromWolf(s.w, s.p)).toBe(true);
    s.b.condition = 10;
    expect(shelterAt(s.w, s.p.x, s.p.y, s.p).cover).toBe(0.5);
  });
  it('does not let a stalking wolf bite an indoor person', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    const a = makeWolf(s.w, s.p.x, s.p.y);
    a.state = 'stalk'; a.targetId = s.p.id; a.until = 9999; a.cooldown = 0;
    s.w.tick = 1; // also exercise the ticks between normal safety refreshes
    const hp = s.p.health;
    updateWildlife(s.w);
    expect(s.p.health).toBe(hp);
    expect(a.state).toBe('retreat');
  });
  it('hides outside people/animals from occupants and occupants from outsiders', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    const q = testKit.addPerson(s.w, new RNG(2), { name: 'Bob', x: s.p.x + 1, y: s.p.y });
    makeWolf(s.w, s.p.x + 2, s.p.y);
    rebuildMobileGrid(s.w);
    perceive(s.w, s.p); perceive(s.w, q);
    expect(s.p.seen).toEqual([]);
    expect(q.seen.some(x => x.id === s.p.id)).toBe(false);
  });
  it('does not count indoor residents as an outdoor group guarding someone', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    const q = testKit.addPerson(s.w, new RNG(3), { name: 'Out', x: s.p.x, y: s.p.y });
    const r = testKit.addPerson(s.w, new RNG(4), { name: 'In', x: s.p.x, y: s.p.y });
    r.hhId = s.p.hhId; enterHome(s.w, r, s.b);
    expect(safeFromWolf(s.w, q)).toBe(false);
  });
  it('preserves occupied save/load and exact saved-state continuation', () => {
    const s = fixture(); atDoor(s); sleep(s); stepActivity(s.w, s.p);
    const text = serializeWorld(s.w), back = deserializeWorld(text);
    expect(serializeWorld(back)).toBe(text);
    expect(indoorHome(back, back.persons[0])?.id).toBe(s.b.id);
    for (let i = 0; i < 70; i++) { stepWorld(s.w); stepWorld(back); }
    expect(serializeWorld(back)).toBe(serializeWorld(s.w));
    const hash = hashWorld(back); delete back.persons[0].indoors;
    expect(hashWorld(back)).not.toBe(hash);
  });
  it('removes occupancy on death or collapse', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    destroyBuilding(s.w, s.b, 'test collapse');
    expect(s.p.indoors).toBeUndefined();
    const t = fixture(); atDoor(t); enterHome(t.w, t.p, t.b);
    killPerson(t.w, t.p, 'test death');
    expect(occupants(t.w, t.b)).toEqual([]);
    expect(t.p.indoors).toBeUndefined();
  });
  it('keeps occupancy when ownership changes, but denies re-entry after leaving', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    s.b.hhId++;
    expect(indoorHome(s.w, s.p)?.id).toBe(s.b.id);
    expect(leaveHome(s.w, s.p)).toBeNull();
    expect(enterHome(s.w, s.p, s.b)).toMatch(/household/);
  });
  it('keeps existing occupants coherent when the lab disables new admission', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    setHabitationAdmissions(false);
    expect(indoorHome(s.w, s.p)?.id).toBe(s.b.id);
    expect(leaveHome(s.w, s.p)).toBeNull();
    expect(enterHome(s.w, s.p, s.b)).toMatch(/disabled/);
  });
  it('a finished household home is usable through the normal sleep option', () => {
    const s = fixture();
    destroyBuilding(s.w, s.b, 'fixture replacement');
    const site = createSite(s.w, 'hut', 40, 40, s.p.hhId, s.p.id);
    site.work = site.workTotal; // staged completed construction; no new construction decisions
    const home = completeSite(s.w, site, s.p);
    observe(s.w, s.p, home);
    const choice = generateOptions(s.w, s.p, true).options.find(o => o.kind === 'sleep' && o.targetId === home.id);
    expect(choice).toBeTruthy();
    const a = choice!.make!(); expect(a).toBeTruthy();
    startActivity(s.w, s.p, a!);
    for (let i = 0; i < 300 && !s.p.indoors; i++) { s.w.tick++; stepActivity(s.w, s.p); }
    expect(s.p.indoors).toBe(home.id);
  });
  it('the inspectors describe actual occupancy', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    expect(describePerson(s.w, s.p.id)?.qa.doing).toContain('Inside Hut');
    expect(JSON.stringify(describeEntity(s.w, s.b.id))).toContain('Ada');
  });
  it('preserves occupants during an in-place hut upgrade', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    const site = createSite(s.w, 'house', s.b.x, s.b.y, s.p.hhId, s.p.id, { upgradeOf: s.b.id });
    const upgraded = completeSite(s.w, site, s.p);
    expect(upgraded.id).toBe(s.b.id);
    expect(indoorHome(s.w, s.p)?.type).toBe('house');
    expect(deserializeWorld(serializeWorld(s.w)).persons[0].indoors).toBe(s.b.id);
  });
  it('keeps a newborn with an indoor mother', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    giveBirth(s.w, s.p);
    const baby = s.w.persons[s.w.persons.length - 1];
    expect(baby.indoors).toBe(s.b.id);
    expect(occupants(s.w, s.b)).toHaveLength(2);
  });
  it('refuses invalid indoor save state rather than guessing a home', () => {
    const s = fixture(); s.p.indoors = 999999;
    expect(() => deserializeWorld(serializeWorld(s.w))).toThrow(/indoor/);
  });
  it('lab intervention installation is reversible without changing saved occupancy', () => {
    const s = fixture(); atDoor(s);
    const before = serializeWorld(s.w);
    const restore = parseIntervention('no-home-entry').install!();
    expect(enterHome(s.w, s.p, s.b)).toMatch(/disabled/);
    expect(serializeWorld(s.w)).toBe(before);
    restore();
    expect(enterHome(s.w, s.p, s.b)).toBeNull();
  });
  it('ends shelter work when its home disappears', () => {
    const s = fixture(); atDoor(s); sleep(s); stepActivity(s.w, s.p);
    destroyBuilding(s.w, s.b, 'test');
    stepActivity(s.w, s.p);
    expect(s.p.activity).toBeNull();
    expect(s.p.lastResult?.detail).toMatch(/home is no longer/);
  });
  it('does not execute a direct social action through a wall', () => {
    const s = fixture(); atDoor(s); enterHome(s.w, s.p, s.b);
    const q = testKit.addPerson(s.w, new RNG(9), { name: 'Outside', x:s.p.x, y:s.p.y });
    startActivity(s.w,q,newActivity(s.w,q,{kind:'search',label:'meet',goal:'meet',targetType:'person',targetId:s.p.id,here:true}));
    expect(q.activity).toBeNull();
    expect(q.lastResult?.detail).toContain('different space');
  });
  it('urgent thirst interrupts sleeping and takes the person outside', () => {
    const s = fixture(); atDoor(s); sleep(s); stepActivity(s.w, s.p);
    s.p.needs.thirst = 1;
    // No water is provided here: the existing survival chooser may seek or wander,
    // but the sleep handler must stop and the subsequent outside action must exit.
    stepActivity(s.w, s.p);
    expect(s.p.activity).toBeNull();
    startActivity(s.w, s.p, newActivity(s.w, s.p, { kind: 'search', label: 'find water', goal: 'water', here: true }));
    stepActivity(s.w, s.p);
    expect(s.p.indoors).toBeUndefined();
  });
  it('version 2 keeps radius shelter and cannot acquire indoor state', () => {
    const s = fixture(2); atDoor(s);
    expect(shelterAt(s.w, s.p.x, s.p.y, s.p).cover).toBe(1);
    expect(enterHome(s.w, s.p, s.b)).toMatch(/disabled/);
    expect(s.p.indoors).toBeUndefined();
  });
});
