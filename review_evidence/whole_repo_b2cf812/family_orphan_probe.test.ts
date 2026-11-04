import { expect, it } from 'vitest';
import { createWorld } from '../../src/sim/factory';
import { adoptOrphans, killPerson } from '../../src/sim/lifecycle';
import { stageOf } from '../../src/sim/people';
import { currentWorldSettings } from '../../src/sim/profiles';

it('documents orphan household transfer without contact, consent or movement', () => {
  const w = createWorld(currentWorldSettings('normal', 'review-remote-orphan', { immigration: false }));
  const child = w.persons.find((p) => stageOf(w, p) === 'child' && p.parents.length > 0)!;
  const oldHousehold = w.households.find((h) => h.id === child.hhId)!;
  for (const id of [...oldHousehold.members]) {
    const member = w.byId.get(id);
    if (member?.ent === 'person' && member.id !== child.id) killPerson(w, member, 'staged orphan probe');
  }
  for (const p of w.persons) {
    delete p.lifeEvent;
    if (stageOf(w, p) !== 'child' && stageOf(w, p) !== 'youth') {
      p.x = child.x < w.W / 2 ? w.W - 5 : 5;
      p.y = child.y < w.H / 2 ? w.H - 5 : 5;
      p.px = p.x;
      p.py = p.y;
    }
  }
  const before = { hhId: child.hhId, x: child.x, y: child.y };
  adoptOrphans(w);
  const carer = w.persons.find((p) => p.lifeEvent?.kind === 'took_in' && p.lifeEvent.about === child.id)!;
  const observed = {
    before,
    after: { hhId: child.hhId, x: child.x, y: child.y },
    carer: { id: carer.id, name: carer.name, x: carer.x, y: carer.y },
    distance: Math.hypot(carer.x - child.x, carer.y - child.y),
    carerLog: carer.log.filter((l) => l.text.includes(child.name)),
    childLog: child.log.filter((l) => l.text.includes(carer.name)),
    carerLifeEvent: carer.lifeEvent,
  };
  console.log('REMOTE_ORPHAN_OBSERVED ' + JSON.stringify(observed));
  expect(observed.after.hhId).not.toBe(before.hhId);
  expect(observed.after.x).toBe(before.x);
  expect(observed.after.y).toBe(before.y);
  expect(observed.distance).toBeGreaterThan(10);
  expect(observed.carerLog.some((l) => l.text === `Took ${child.name} into my household.`)).toBe(true);
  expect(observed.childLog.some((l) => l.text === `${carer.name} took me in.`)).toBe(true);
});
