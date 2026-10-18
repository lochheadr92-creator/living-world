// Theft, favours and barter (src/sim/misdeeds.ts, occasions.ts marketSwap): a starving person with nothing may take from
// another household's store, and what it costs depends on who saw; a favour owed opens hands; at the market a surplus is
// swapped for a want by each side's own valuation. None of it in an authored world.
import { describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { onTheft, favourOwedBy } from '../src/sim/misdeeds';
import { marketSwap } from '../src/sim/occasions';
import { generateOptions } from '../src/sim/decision';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { heardBy } from '../src/sim/reputation';
import { stepWorld } from '../src/sim/world';
import { observe } from '../src/sim/knowledge';
import type { Building, Occasion, Person, World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));

/** a starving adult who knows of a stocked home that is not theirs */
function starving(w: World): { p: Person; home: Building; owner: Person } {
  for (let i = 0; i < 200; i++) stepWorld(w);
  const p = w.persons.find((x) => x.alive && stageOf(w, x) === 'adult')!;
  const owner = w.persons.find((x) => x.alive && x.hhId !== p.hhId && stageOf(w, x) === 'adult')!;
  const hh = w.households.find((h) => h.id === owner.hhId)!;
  let home = w.byId.get(hh.homeId) as Building | undefined;
  if (!home || home.ent !== 'building') {
    home = createBuilding(w, 'hut', Math.floor(owner.x) + 3, Math.floor(owner.y), hh.id, { condition: 90 });
  }
  home.store.items.berries = 12;
  p.inv = {};
  p.needs.hunger = 8;
  const ownHome = w.byId.get(w.households.find((h) => h.id === p.hhId)!.homeId);
  if (ownHome && ownHome.ent === 'building') ownHome.store.items = {};
  observe(w, p, home);
  return { p, home, owner };
}

describe('theft', () => {
  it('is an option for the starving with nothing of their own in a rich world, and never in an authored one', () => {
    const r = world('rich');
    const { p, home } = starving(r);
    p.traits.caution = 0.2;
    p.traits.generosity = 0.2;
    const ctx = generateOptions(r, p, true);
    const steal = ctx.options.find((o) => o.kind === 'eat_store' && o.targetId === home.id);
    expect(steal).toBeTruthy();
    expect(steal!.label).toMatch(/^Take food from the .* household's store$/);
    expect(steal!.parts.some(([n]) => n === 'not mine to take')).toBe(true);
    const a = world('authored');
    const s = starving(a);
    const ctxA = generateOptions(a, s.p, true);
    expect(ctxA.options.some((o) => o.kind === 'eat_store' && o.targetId === s.home.id)).toBe(false);
  });

  it('costs by who saw: a household member who catches it holds a grievance, witnesses hold the story, nobody seen means only the log', () => {
    const r = world('rich');
    const { p, home, owner } = starving(r);
    // nobody near: only the thief's own log
    for (const q of r.persons) if (q !== p) q.x = home.x + 40;
    onTheft(r, p, home, 2);
    expect(p.log.at(-1)!.text).toContain('Nobody saw');
    expect(owner.relations[p.id]?.grievance ?? null).toBeNull();
    // the owner at the door
    owner.x = home.x + 1;
    owner.y = home.y + 1;
    owner.pose = 'stand';
    onTheft(r, p, home, 2);
    expect(owner.relations[p.id].grievance?.cause).toBe('harm');
    expect(heardBy(owner).some((x) => x.about === p.id && x.kind === 'thief')).toBe(true);
    expect(r.events.some((e) => e.kind === 'conflict' && e.text.includes('caught'))).toBe(true);
  });
});

describe('favours', () => {
  it('are owed after a gift and read only in a rich world', () => {
    const r = world('rich');
    const [a, b] = r.persons;
    a.relations[b.id] = { ...(a.relations[b.id] ?? { affinity: 0, trust: 0, familiarity: 0, lastMet: 0, kin: '', avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 }), debt: 2 };
    expect(favourOwedBy(r, a, b)).toBe(2);
    const au = world('authored');
    const [c, d] = au.persons;
    c.relations[d.id] = { ...(c.relations[d.id] ?? { affinity: 0, trust: 0, familiarity: 0, lastMet: 0, kin: '', avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 }), debt: 2 };
    expect(favourOwedBy(au, c, d)).toBe(0);
  });
});

describe('barter at the market', () => {
  it('swaps a surplus for a want with whoever has the opposite, by each side\'s own valuation, through recorded transfers', () => {
    const r = world('rich');
    for (let i = 0; i < 100; i++) stepWorld(r);
    const [p, q] = r.persons.filter((x) => x.alive && stageOf(r, x) === 'adult');
    p.inv = { wood: 4, berries: 1 };
    q.inv = { fish: 6, berries: 3 }; // enough food to value fish little
    q.inv.basket = 1; // and room to take wood in return
    p.needs.hunger = 40;
    q.needs.hunger = 90;
    const o: Occasion = { id: 1, kind: 'market', placeId: 0, placeName: 'the hall', x: p.x, y: p.y, called: 0, at: 0, until: DAY, about: [], attended: [q.id, p.id], status: 'gathering', end: '' };
    const moves: string[] = [];
    r.hooks = { onTransfer: (t) => moves.push(`${t.item}:${t.n}:${t.reason}`) };
    expect(marketSwap(r, p, o)).toBe(true);
    expect(p.inv.fish ?? 0).toBeGreaterThan(0);
    expect(q.inv.wood ?? 0).toBeGreaterThan(0);
    expect(moves.every((m) => m.endsWith('market swap'))).toBe(true);
    expect(r.events.some((e) => e.kind === 'trade' && e.text.includes('swapped'))).toBe(true);
  });
});
