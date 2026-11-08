// Rules 169: a sight of a store, a cart or a pile remembers which kinds are there and whether it looked full,
// not the exact counts (src/sim/seen_stock.ts). The same staged containers are read at 168, where the counts
// are copied, and at 169, where a partial store becomes one of each kind.
import { afterEach, describe, expect, it } from 'vitest';
import { makeHousePile } from '../src/sim/buildings';
import { newCart } from '../src/sim/carts';
import { addItem, weightOf } from '../src/sim/economy';
import { setSeenStock } from '../src/sim/seen_stock';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Items } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => { setSeenStock(true); });

function glance(version: number, stock: Items, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`seen-stock-${version}-${dynamics}-${Object.keys(stock).join('-')}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const p = addPerson(s, 'Ada', 14, 12);
  const hut = building(s, 'hut', 12, 12, p.hhId, stock);
  const cart = newCart(s.w, 14, 13, p.hhId);
  addItem(cart.load, 'wood', 4);
  const pile = makeHousePile(s.w, 14, 14, { fish: 5 }, 'staged heap');
  if (!pile) throw new Error('pile');
  done(s);
  return { w: s.w, p, hut, cart, pile };
}

describe('rules 169: a store is remembered as a glance', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(169);
    expect(SUPPORTED_RULES_VERSIONS).toContain(169);
  });

  it('at 168 still copies a partial hut, a cart and a pile', () => {
    const { p, hut, cart, pile } = glance(168, { grain: 8, wood: 3 });
    expect(p.beliefs[hut.id].items).toEqual({ grain: 8, wood: 3 });
    expect(p.beliefs[cart.id].items).toEqual({ wood: 4 });
    expect(p.beliefs[pile.id].items).toEqual({ fish: 5 });
  });

  it('at 169 a partial store is one of each kind, and the true counts stay in the store', () => {
    const { p, hut, cart, pile } = glance(169, { grain: 8, wood: 3 });
    expect(hut.store.items).toEqual({ grain: 8, wood: 3 });
    expect(p.beliefs[hut.id].items).toEqual({ grain: 1, wood: 1 });
    expect(cart.load).toEqual({ wood: 4 });
    expect(p.beliefs[cart.id].items).toEqual({ wood: 1 });
    expect(pile.items).toEqual({ fish: 5 });
    expect(p.beliefs[pile.id].items).toEqual({ fish: 1 });
  });

  it('at 169 a full two-kind store is remembered as full, and not as the true split', () => {
    const { p, hut } = glance(169, { grain: 10, wood: 15 });
    expect(weightOf(hut.store.items)).toBe(hut.store.cap);
    const remembered = p.beliefs[hut.id].items ?? {};
    expect(remembered).not.toEqual({ grain: 10, wood: 15 });
    expect(weightOf(remembered)).toBeGreaterThanOrEqual(hut.store.cap);
    expect(remembered.wood).toBe(1);
    expect(remembered.grain).toBeGreaterThan(1);
  });

  it('at 169 one kind filled exactly to the cap reproduces that count', () => {
    const { p, hut } = glance(169, { grain: 40 });
    expect(weightOf(hut.store.items)).toBe(hut.store.cap);
    expect(p.beliefs[hut.id].items).toEqual({ grain: 40 });
  });

  it('at 169 a textile count stays exact so the clothing check still holds', () => {
    const { p, hut } = glance(169, { garment: 3, grain: 4 });
    expect(hut.store.items.garment).toBe(3);
    expect(p.beliefs[hut.id].items).toEqual({ garment: 3, grain: 1 });
    expect(p.beliefs[hut.id].textileStock?.items.garment).toBe(3);
    expect((p.beliefs[hut.id].textileStock?.items.garment ?? 0) <= (p.beliefs[hut.id].items?.garment ?? 0)).toBe(true);
  });

  it('the switch, an authored world, and a rules-169 world with the switch off keep the exact copy', () => {
    setSeenStock(false);
    const off = glance(169, { grain: 8, wood: 3 });
    expect(off.p.beliefs[off.hut.id].items).toEqual({ grain: 8, wood: 3 });
    setSeenStock(true);
    const authored = glance(169, { grain: 8, wood: 3 }, 'authored');
    expect(authored.p.beliefs[authored.hut.id].items).toEqual({ grain: 8, wood: 3 });
  });
});
