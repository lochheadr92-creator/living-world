// Rules 180: a laid-up person counts an able adult at home only if they can see one, not by every housemate's live condition.
import { afterEach, describe, expect, it } from 'vitest';
import { setKnownAble } from '../src/sim/known_able';
import { childrenNeedingWatch, laidUp } from '../src/sim/responsibilities';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Person, SeenEntity } from '../src/sim/types';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => { setKnownAble(true); });

function scene(version: number, dynamics: 'rich' | 'authored' = 'rich', otherAge = 28) {
  const s = stage(`known-able-${version}-${dynamics}-${otherAge}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const parent = addPerson(s, 'Pat', 40, 40, { age: 30 });
  const other = addPerson(s, 'Pam', 60, 60, { age: otherAge, hh: parent.hhId });
  const child = addPerson(s, 'Kit', 41, 40, { age: 6, hh: parent.hhId });
  const w = done(s);
  for (const p of [parent, other, child]) pin(p);
  parent.injury = { kind: 'broken', since: w.tick, until: w.tick + 1e6, how: 'at the building site' };
  parent.seen = [];
  return { w, parent, other, child };
}

const sight = (p: Person, extra: Partial<SeenEntity> = {}): SeenEntity => ({
  id: p.id, ent: 'person', x: p.x, y: p.y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false,
  carrying: [], asleep: false, act: '', busyTalking: false, ...extra,
} as SeenEntity);

const ids = (list: Person[]) => list.map((c) => c.id);

describe('rules 180: an able adult at home counts when the laid-up person can see one', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(180);
    expect(SUPPORTED_RULES_VERSIONS).toContain(180);
  });

  it('at 179 a healthy adult out of sight suppresses the need, from the live read', () => {
    const { w, parent } = scene(179);
    expect(laidUp(w, parent)).toBe(true);
    expect(childrenNeedingWatch(w, parent)).toEqual([]);
  });

  it('at 180 the same adult out of sight is not counted, so the child needs a watch', () => {
    const { w, parent, child } = scene(180);
    expect(ids(childrenNeedingWatch(w, parent))).toEqual([child.id]);
  });

  it('at 180 an adult in sight with no sign of being hurt or feverish suppresses it', () => {
    const { w, parent, other } = scene(180);
    parent.seen = [sight(other)];
    expect(childrenNeedingWatch(w, parent)).toEqual([]);
  });

  it('at 180 an adult in sight who looks hurt, or feverish, does not', () => {
    const hurt = scene(180);
    hurt.parent.seen = [sight(hurt.other, { hurt: true })];
    expect(ids(childrenNeedingWatch(hurt.w, hurt.parent))).toEqual([hurt.child.id]);
    const fever = scene(180);
    fever.parent.seen = [sight(fever.other, { feverish: true })];
    expect(ids(childrenNeedingWatch(fever.w, fever.parent))).toEqual([fever.child.id]);
  });

  it('at 180 a youth in sight does not count, and an elder in sight does', () => {
    const youth = scene(180, 'rich', 15);
    youth.parent.seen = [sight(youth.other)];
    expect(ids(childrenNeedingWatch(youth.w, youth.parent))).toEqual([youth.child.id]);
    const elder = scene(180, 'rich', 70);
    elder.parent.seen = [sight(elder.other)];
    expect(childrenNeedingWatch(elder.w, elder.parent)).toEqual([]);
  });

  it('with the switch off the live read stays at 180', () => {
    const { w, parent } = scene(180);
    setKnownAble(false);
    expect(childrenNeedingWatch(w, parent)).toEqual([]);
  });

  it('an authored world is not laid up and returns nothing', () => {
    const { w, parent } = scene(180, 'authored');
    expect(laidUp(w, parent)).toBe(false);
    expect(childrenNeedingWatch(w, parent)).toEqual([]);
  });
});
