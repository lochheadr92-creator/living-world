// Rules 167: a carerless child is taken in only by a living adult who has seen them or been told where they are
// (src/sim/known_adoption.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous
// behaviour. The method is the review's own: one hidden fact differs (who holds a note, or where that note points)
// and the same scene runs at 166 (the scan uses the child's true coordinates) and at 167 (it uses only what a carer
// knows). done() is not called: it looks around and would hand everyone a note of the child.
import {describe, expect, it} from 'vitest';
import {stage, addPerson} from './helpers/kit';
import {adoptOrphans} from '../src/sim/lifecycle';
import {householdHistory} from '../src/sim/history';
import {relOf} from '../src/sim/relations';
import {conservationReport, snapshotInitial} from '../src/sim/economy';
import {initializeWater} from '../src/sim/hydrology';
import {serializeWorld, deserializeWorld} from '../src/app/save';
import {CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS} from '../src/sim/rulesversion';
import type {Person, SeenEntity, World} from '../src/sim/types';

function world(version: number, rich = true) {
  const s = stage('staged-known-adoption');
  s.w.settings.dynamics = rich ? 'rich' : 'authored';
  s.w.settings.rulesVersion = version;
  return {s, w: s.w};
}
function note(q: Person, child: Person, x: number, y: number) {
  q.whereabouts[child.id] = {x, y, tick: 0};
}
function glance(q: Person, child: Person) {
  const seen: SeenEntity = {
    id: child.id, ent: 'person', x: child.x, y: child.y,
    hungry: false, thirsty: false, tired: false, cold: false, hurt: false,
    child: true, carrying: [], asleep: false, act: '', busyTalking: false,
  };
  q.seen.push(seen);
}
function taker(w: World, child: Person): string | null {
  const hh = w.households.find((h) => h.id === child.hhId)!;
  const other = hh.members.find((id) => id !== child.id);
  return other === undefined ? null : w.persons.find((p) => p.id === other)!.name;
}
function seal(w: World) {
  initializeWater(w);
  snapshotInitial(w);
}
const sound = (w: World) => {
  expect(conservationReport(w).ok).toBe(true);
  const raw = serializeWorld(w);
  expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
};

/** Ada is closest and kin, and holds no note. Ben is far and has been told where Tam is. */
function closest(version: number) {
  const {s, w} = world(version);
  const tam = addPerson(s, 'Tam', 20, 20, {age: 6, sex: 'm'});
  const ada = addPerson(s, 'Ada', 22, 20, {age: 30, sex: 'f', traits: {generosity: 0.95}});
  const ben = addPerson(s, 'Ben', 70, 20, {age: 32, sex: 'm', traits: {generosity: 0.5}});
  relOf(ada, tam.id).kin = 'parent';
  note(ben, tam, tam.x, tam.y);
  seal(w);
  return {w, tam};
}
/** Both generosity 0.5. Cara's note puts Tam one tile from Cara; Ben's note is the true place, which is nearer to Ben. */
function remembered(version: number) {
  const {s, w} = world(version);
  const tam = addPerson(s, 'Tam', 20, 20, {age: 6, sex: 'm'});
  const cara = addPerson(s, 'Cara', 70, 20, {age: 30, sex: 'f', traits: {generosity: 0.5}});
  const ben = addPerson(s, 'Ben', 50, 50, {age: 32, sex: 'm', traits: {generosity: 0.5}});
  note(cara, tam, 69, 20);
  note(ben, tam, 20, 20);
  seal(w);
  return {w, tam};
}
function unseen(version: number) {
  const {s, w} = world(version);
  const tam = addPerson(s, 'Tam', 20, 20, {age: 6, sex: 'm'});
  addPerson(s, 'Ada', 22, 20, {age: 30, sex: 'f', traits: {generosity: 0.95}});
  const stayed = tam.hhId;
  seal(w);
  return {w, tam, stayed};
}
function sight(version: number) {
  const {s, w} = world(version);
  const tam = addPerson(s, 'Tam', 20, 20, {age: 6, sex: 'm'});
  addPerson(s, 'Ada', 22, 20, {age: 30, sex: 'f', traits: {generosity: 0.95}});
  const ben = addPerson(s, 'Ben', 40, 40, {age: 32, sex: 'm', traits: {generosity: 0.5}});
  glance(ben, tam);
  expect(ben.whereabouts[tam.id], 'a glance is not yet a stored note').toBeUndefined();
  seal(w);
  return {w, tam};
}
function youthKnows(version: number) {
  const {s, w} = world(version);
  const tam = addPerson(s, 'Tam', 20, 20, {age: 6, sex: 'm'});
  const nia = addPerson(s, 'Nia', 22, 20, {age: 14, sex: 'f'});
  addPerson(s, 'Ada', 60, 20, {age: 30, sex: 'f', traits: {generosity: 0.9}});
  note(nia, tam, tam.x, tam.y);
  const stayed = tam.hhId;
  seal(w);
  return {w, tam, stayed};
}

describe('rules 167 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(167);
    expect(SUPPORTED_RULES_VERSIONS).toContain(167);
  });
});

describe('who may take a carerless child', () => {
  it('rules 166 lets the nearest adult take them unseen; rules 167 requires a note, and kin alone is not one', () => {
    const old = closest(166);
    adoptOrphans(old.w);
    expect(taker(old.w, old.tam)).toBe('Ada');
    const next = closest(167);
    adoptOrphans(next.w);
    expect(taker(next.w, next.tam), 'kin without a note does not qualify').toBe('Ben');
    sound(next.w);
  });

  it('scores the place the carer remembers, not the child\'s true coordinates', () => {
    const old = remembered(166);
    adoptOrphans(old.w);
    expect(taker(old.w, old.tam), '166 follows the true place, which is nearer Ben').toBe('Ben');
    const next = remembered(167);
    adoptOrphans(next.w);
    expect(taker(next.w, next.tam), '167 follows Cara\'s note, one tile from her').toBe('Cara');
    sound(next.w);
  });

  it('leaves the child when nobody knows of them, and the household history says so', () => {
    const old = unseen(166);
    adoptOrphans(old.w);
    expect(taker(old.w, old.tam)).toBe('Ada');
    expect(householdHistory(old.w, old.tam).join('\n')).not.toContain('nobody who has seen');
    const next = unseen(167);
    adoptOrphans(next.w);
    expect(taker(next.w, next.tam)).toBeNull();
    expect(next.tam.hhId).toBe(next.stayed);
    expect(householdHistory(next.w, next.tam).join('\n')).toContain(
      'Tam has no adult in the household, and nobody who has seen them or been told where they are has taken them in.',
    );
    sound(next.w);
  });

  it('counts a current sight, and does not let a youth who has seen them take them', () => {
    const seen = sight(167);
    adoptOrphans(seen.w);
    expect(taker(seen.w, seen.tam)).toBe('Ben');
    const old = youthKnows(166);
    adoptOrphans(old.w);
    expect(taker(old.w, old.tam), '166 still lets the adult who has not seen them').toBe('Ada');
    const next = youthKnows(167);
    adoptOrphans(next.w);
    expect(taker(next.w, next.tam)).toBeNull();
    expect(next.tam.hhId).toBe(next.stayed);
  });

  it('an authored world keeps the old scan at 167', () => {
    const {s, w} = world(167, false);
    const tam = addPerson(s, 'Tam', 20, 20, {age: 6, sex: 'm'});
    addPerson(s, 'Ada', 22, 20, {age: 30, sex: 'f', traits: {generosity: 0.95}});
    const ben = addPerson(s, 'Ben', 70, 20, {age: 32, sex: 'm', traits: {generosity: 0.5}});
    note(ben, tam, tam.x, tam.y);
    seal(w);
    adoptOrphans(w);
    expect(taker(w, tam)).toBe('Ada');
  });
});

describe('the lab removal', () => {
  it('restores the old scan inside a rules-167 rich world and nothing else', async () => {
    const {setKnownAdoption, knownAdoptionOn} = await import('../src/sim/known_adoption');
    expect(knownAdoptionOn()).toBe(true);
    setKnownAdoption(false);
    try {
      const f = closest(167);
      adoptOrphans(f.w);
      expect(taker(f.w, f.tam)).toBe('Ada');
    } finally {
      setKnownAdoption(true);
    }
    expect(knownAdoptionOn()).toBe(true);
  });
});
