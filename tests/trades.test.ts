// Trades and apprenticeship (src/sim/trades.ts): a clearly best skill becomes a trade and nudges the options that use it; a
// tradesperson may take on a less skilled workmate, who learns more within reach of the master, graduates when nearly as good,
// or lets it lapse by not practising; an authored world has none of it.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { TRADE_NUDGE, notePractice, onSharedWork, setTrades, tradeNudge, tradesTick } from '../src/sim/trades';
import { stepWorld } from '../src/sim/world';
import type { Option } from '../src/sim/optutil';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const tickFor = (w: World, p: { id: number }): void => {
  while ((w.tick + p.id * 37) % (DAY / 2) !== 0) w.tick++;
};
const adult = (w: World) => w.persons.find((p) => p.alive && stageOf(w, p) === 'adult')!;

describe('a trade', () => {
  const w = world('rich');
  const p = adult(w);

  it('is taken up once one skill stands clearly above the rest, and nudges the options that practise it', () => {
    p.skills.carpentry = 1.45; // founders start with skills up to about 1.25, and a trade must stand clearly above the rest
    tickFor(w, p);
    tradesTick(w, p);
    expect(p.trade).toMatchObject({ kind: 'carpentry', master: 0 });
    expect(w.events.some((e) => e.text.includes("carpenter's trade"))).toBe(true);
    const yard = { ent: 'building', type: 'timber_yard' } as any;
    w.byId.set(999_001, { ...yard, id: 999_001 });
    const opt = (kind: Option['kind'], targetId: number): Option => ({ kind, label: '', goal: '', need: null, util: 10, parts: [], eta: 0, key: 'k', targetId });
    expect(tradeNudge(w, p, opt('operate', 999_001))).toBe(TRADE_NUDGE);
    expect(tradeNudge(w, p, opt('build', 0))).toBe(0);
    expect(tradeNudge(w, p, opt('operate', 0))).toBe(0);
  });

  it('is not taken up by someone whose skills are all alike', () => {
    const q = w.persons.find((x) => x !== p && x.alive && (x.children.length > 0 || x.partnerId > 0))!;
    for (const k of Object.keys(q.skills) as (keyof typeof q.skills)[]) q.skills[k] = 1.3;
    tickFor(w, q);
    tradesTick(w, q);
    expect(q.trade).toBeUndefined();
  });
});

describe('an apprenticeship', () => {
  const w = world('rich');
  const [m, l] = w.persons.filter((p) => p.alive && (p.children.length > 0 || p.partnerId > 0));
  m.skills.smith = 1.4;
  m.trade = { kind: 'smith', since: 0, master: 0, practised: 0, how: 'by their own hand' };
  l.skills.smith = 1.0;
  m.traits.generosity = 1;
  l.traits.curiosity = 1;
  l.needs.hunger = l.needs.thirst = l.needs.energy = 90;

  it('is offered after a job done together and taken by a willing learner', () => {
    let tries = 0;
    while (!l.trade && tries < 40) {
      w.tick += 64;
      m.cooldowns['offer_teach'] = 0;
      onSharedWork(w, [m, l], 'smith');
      tries++;
    }
    expect(l.trade).toMatchObject({ kind: 'smith', master: m.id });
    expect(w.events.some((e) => e.text.includes('as an apprentice smith'))).toBe(true);
  });

  it('teaches more within reach of the master, and the apprentice graduates when nearly as good', () => {
    l.x = m.x + 2;
    l.y = m.y;
    const before = l.skills.smith;
    notePractice(w, l, 'smith', 0.02);
    expect(l.skills.smith).toBeCloseTo(before + 0.01, 6);
    l.x = m.x + 30;
    notePractice(w, l, 'smith', 0.02);
    expect(l.skills.smith).toBeCloseTo(before + 0.01, 6);
    l.skills.smith = m.skills.smith * 0.95;
    tickFor(w, l);
    tradesTick(w, l);
    expect(l.trade).toMatchObject({ kind: 'smith', master: 0 });
    expect(l.trade!.how).toContain(m.name);
  });

  it('lapses when the apprentice stops practising', () => {
    const a = w.persons.find((p) => p.alive && p !== m && p !== l && (p.children.length > 0 || p.partnerId > 0))!;
    a.trade = { kind: 'smith', since: w.tick, master: m.id, practised: w.tick, how: `taken on by ${m.name}` };
    w.tick += 6 * DAY;
    tickFor(w, a);
    tradesTick(w, a);
    expect(a.trade).toBeUndefined();
    expect(w.events.some((e) => e.text.includes('lapse'))).toBe(true);
  });
});

describe('switched off, and in an authored world', () => {
  it('nobody takes up anything', () => {
    const a = world('authored');
    const p = adult(a);
    p.skills.farm = 1.5;
    tickFor(a, p);
    tradesTick(a, p);
    expect(p.trade).toBeUndefined();
    for (let i = 0; i < DAY; i++) stepWorld(a);
    expect(a.persons.every((q) => q.trade === undefined)).toBe(true);
    const r = world('rich');
    const q = adult(r);
    q.skills.farm = 1.5;
    setTrades(false);
    try {
      tickFor(r, q);
      tradesTick(r, q);
      expect(q.trade).toBeUndefined();
    } finally {
      setTrades(true);
    }
  });
});
