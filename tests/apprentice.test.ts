// Apprenticeship (src/sim/apprentice.ts) on top of the trade a person settles on (trade.ts): offered after a job done together,
// taken by a willing learner, more taught within reach of the master, graduated when nearly as good, lapsed by not practising;
// none of it in an authored world or with trades switched off.
import { describe, expect, it } from 'vitest';
import { apprenticeTick, notePractice, onSharedWork } from '../src/sim/apprentice';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { setTrades } from '../src/sim/trade';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const tickFor = (w: World, p: { id: number }): void => {
  while ((w.tick + p.id * 37) % (DAY / 2) !== 0) w.tick++;
};

describe('an apprenticeship', () => {
  const w = world('rich');
  const [m, l] = w.persons.filter((p) => p.alive && stageOf(w, p) === 'adult');
  m.skills.smith = 1.4;
  m.trade = { key: 'smith', since: 0, why: 'quicker at it than at anything else' };
  l.skills.smith = 1.0;
  m.traits.generosity = 1;
  l.traits.curiosity = 1;
  l.needs.hunger = l.needs.thirst = l.needs.energy = 90;

  it('is offered after a job done together and taken by a willing learner', () => {
    let tries = 0;
    while (!l.apprentice && tries < 40) {
      w.tick += 64;
      m.cooldowns['offer_teach'] = 0;
      onSharedWork(w, [m, l], 'smith');
      tries++;
    }
    expect(l.apprentice).toMatchObject({ key: 'smith', master: m.id });
    expect(w.events.some((e) => e.text.includes('as an apprentice at smithing'))).toBe(true);
  });

  it('teaches more within reach of the master, and the apprentice graduates into a trade of their own when nearly as good', () => {
    l.x = m.x + 2;
    l.y = m.y;
    const before = l.skills.smith;
    notePractice(w, l, 'smith', 0.02);
    expect(l.skills.smith).toBeCloseTo(before + 0.01, 6);
    l.x = m.x + 30;
    notePractice(w, l, 'smith', 0.02);
    expect(l.skills.smith).toBeCloseTo(before + 0.01, 6);
    l.skills.smith = m.skills.smith * 0.95;
    l.trade = null;
    tickFor(w, l);
    apprenticeTick(w, l);
    expect(l.apprentice).toBeUndefined();
    expect(l.trade).toMatchObject({ key: 'smith' });
    expect(l.trade!.why).toContain(m.name);
  });

  it('lapses when the apprentice stops practising', () => {
    const a = w.persons.find((p) => p.alive && p !== m && p !== l && stageOf(w, p) === 'adult')!;
    a.apprentice = { master: m.id, key: 'smith', since: w.tick, practised: w.tick };
    w.tick += 6 * DAY;
    tickFor(w, a);
    apprenticeTick(w, a);
    expect(a.apprentice).toBeUndefined();
    expect(w.events.some((e) => e.text.includes('lapse'))).toBe(true);
  });
});

describe('switched off, and in an authored world', () => {
  it('nobody is taken on', () => {
    for (const [dyn, off] of [['authored', false], ['rich', true]] as const) {
      const w = world(dyn);
      const [m, l] = w.persons.filter((p) => p.alive && stageOf(w, p) === 'adult');
      m.skills.smith = 1.4;
      m.trade = { key: 'smith', since: 0, why: 'x' };
      l.skills.smith = 1.0;
      m.traits.generosity = 1;
      if (off) setTrades(false);
      try {
        for (let i = 0; i < 40 && !l.apprentice; i++) {
          w.tick += 64;
          m.cooldowns['offer_teach'] = 0;
          onSharedWork(w, [m, l], 'smith');
        }
        expect(l.apprentice).toBeUndefined();
      } finally {
        if (off) setTrades(true);
      }
      for (let i = 0; i < 200; i++) stepWorld(w);
      expect(w.persons.every((p) => p.apprentice === undefined)).toBe(true);
    }
  });
});
