import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { observe, putBelief } from '../src/sim/knowledge';
import { currentWorldSettings } from '../src/sim/profiles';

const make = () => createWorld(currentWorldSettings('normal', 'river', { immigration: false }));

it('logs exactly one line, from the person\u2019s own belief, when an emptied source is re-sighted (rules 32)', () => {
  const w = make();
  const p = w.persons[0];
  const s = w.sources.find((x) => x.type === 'berry_bush')!;
  const teller = w.persons[1];
  putBelief(p, { id: s.id, kind: s.type, x: s.x, y: s.y, amount: 6, max: s.max, seen: w.tick - 1080, src: 'told', from: teller.id, learned: w.tick - 1080 });
  s.amount = 0;
  const before = p.log.length;
  observe(w, p, s);
  expect(p.log.length).toBe(before + 1);
  const line = p.log[p.log.length - 1];
  expect(line.kind).toBe('info');
  expect(line.text).toContain('berry bush');
  expect(line.text).toContain(teller.name);
  expect(line.text).toContain('about 6');
  expect(line.text).toContain('1.8 min old');
  expect(line.text).toContain('was bare');
});

it('does not log when the source still holds more than half of what was believed', () => {
  const w = make();
  const p = w.persons[0];
  const s = w.sources.find((x) => x.type === 'berry_bush')!;
  putBelief(p, { id: s.id, kind: s.type, x: s.x, y: s.y, amount: 6, max: s.max, seen: w.tick - 1080, src: 'seen', from: 0, learned: w.tick - 1080 });
  s.amount = 5;
  const before = p.log.length;
  observe(w, p, s);
  expect(p.log.length).toBe(before);
});

it('does not log in a rules-31 world', () => {
  const w = createWorld({ ...currentWorldSettings('normal', 'river', { immigration: false }), rulesVersion: 31 });
  const p = w.persons[0];
  const s = w.sources.find((x) => x.type === 'berry_bush')!;
  putBelief(p, { id: s.id, kind: s.type, x: s.x, y: s.y, amount: 6, max: s.max, seen: w.tick - 1080, src: 'told', from: w.persons[1].id, learned: w.tick - 1080 });
  s.amount = 0;
  const before = p.log.length;
  observe(w, p, s);
  expect(p.log.length).toBe(before);
});
