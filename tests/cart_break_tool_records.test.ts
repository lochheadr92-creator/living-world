// A1-CART: a cart that breaks with tools in its load spills them into a heap through makeHousePile without naming the cart as
// the holder, so the counts land in the pile while their records stay on a cart that no longer exists. Under the strict A1 cap a
// count with no record cannot move, so the spilled tool is then stuck in the heap. Scheduled for Stage 3, after F1, which is meant
// to make ordinary carts appear. Until then this test is a todo: flip `it.todo` to `it` when the spill retags.
import { describe, expect, it } from 'vitest';
import { breakCart, newCart } from '../src/sim/carts';
import { conservationReport, transfer } from '../src/sim/economy';
import { carryCap, stageOf } from '../src/sim/people';
import { mintTool } from '../src/sim/tools';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';

function cartBreaksWithAnAxe(): void {
  // STAGED: a cart beside an adult, an axe minted into the adult and loaded through the ordinary transfer, then the cart breaks
  const w = createWorld(currentWorldSettings('normal', 'a1-cart', { immigration: false }));
  const p = w.persons.find((q) => stageOf(w, q) === 'adult')!;
  const cart = newCart(w, Math.floor(p.x), Math.floor(p.y), p.hhId);
  const axe = mintTool(w, 'axe', 0, p.hhId, p.id, p.inv, 0, 'staged', true);
  expect(transfer(w, p.inv, cart.load, cart.cap, 'axe', 1, 'person:' + p.id, 'cart:' + cart.id, 'loaded')).toBe(1);
  expect(axe.holder).toBe(cart.id);
  breakCart(w, cart, null);
  const heap = w.piles.find((pl) => (pl.items.axe ?? 0) > 0)!;
  expect(heap, 'the axe was spilled into a heap').toBeTruthy();
  expect(axe.holder, 'the spilled axe keeps its record in the heap').toBe(heap.id);
  expect(toolReport(w).problems).toEqual([]);
  // the heap is picked over: the count and the record move together
  const moved = transfer(w, heap.items, p.inv, carryCap(w, p), 'axe', 1, 'pile:' + heap.id, 'person:' + p.id, 'picked up');
  expect(moved).toBe(1);
  expect(toolsHeldBy(w, p.id, 'axe')).toContain(axe);
  expect(toolReport(w).problems).toEqual([]);
  expect(conservationReport(w).ok).toBe(true);
}

describe('a broken cart spills its tools with their records', () => {
  it.todo('A1-CART: spilled tools keep their records and move with their counts', cartBreaksWithAnAxe);
});
