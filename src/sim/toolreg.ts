import type { Items, ItemKind, Tool, ToolKind, World } from './types';

/**
 * The bookkeeping that keeps tool records and item counts in step. Equipment exists twice on purpose: as a count in the
 * holder's items (so every existing store, hand-over and carry rule applies to it unchanged) and as a `Tool` record (identity,
 * wear, owner, loan). This module has no dependencies so that `economy.transfer` can call it.
 */
export function idFromTag(tag: string): number {
  const i = tag.indexOf(':');
  if (i < 0) return 0;
  const n = Number(tag.slice(i + 1));
  return Number.isFinite(n) ? n : 0;
}

export function toolsHeldBy(world: World, holderId: number, kind?: ToolKind): Tool[] {
  const out: Tool[] = [];
  for (const t of world.tools) if (t.holder === holderId && (kind === undefined || t.kind === kind)) out.push(t);
  return out;
}

export function toolById(world: World, id: number): Tool | undefined {
  for (const t of world.tools) if (t.id === id) return t;
  return undefined;
}

/** Best tool of a kind in someone's hands: iron before wood-and-stone, then the least worn. A tool that is on a bench for someone else is not theirs to use. */
export function bestOf(world: World, holderId: number, kind: ToolKind, user = 0): Tool | null {
  let best: Tool | null = null;
  for (const t of world.tools) {
    if (t.holder !== holderId || t.kind !== kind) continue;
    if (user && t.loan && t.loan.lender === 0 && t.loan.borrower !== user && t.loan.due > world.tick) continue;
    if (!best || t.tier > best.tier || (t.tier === best.tier && t.wear < best.wear)) best = t;
  }
  return best;
}

/** Move `n` tool records from one holder to another (the item counts were moved by the caller). Returns how many were moved. */
export function retagTools(world: World, kind: ToolKind, n: number, fromId: number, toId: number, prefer = 0): number {
  if (n <= 0 || !fromId || !toId) return 0;
  let moved = 0;
  if (prefer) {
    const t = toolById(world, prefer);
    if (t && t.holder === fromId) {
      t.holder = toId;
      moved++;
    }
  }
  for (const t of world.tools) {
    if (moved >= n) break;
    if (t.holder === fromId && t.kind === kind && !(t.loan && t.loan.lender === 0 && t.loan.due > world.tick && t.loan.borrower !== 0 && toId !== t.loan.borrower)) {
      t.holder = toId;
      moved++;
    }
  }
  return moved;
}

export function isToolItem(k: ItemKind): k is ToolKind {
  return k === 'axe' || k === 'pick' || k === 'hoe' || k === 'basket' || k === 'hammer' || k === 'saw' || k === 'jar' || k === 'rod' || k === 'spear';
}

/** The Items container physically holding things for an entity id, if it has one. */
export function holderItems(world: World, id: number): Items | null {
  const e = world.byId.get(id);
  if (!e) return null;
  switch (e.ent) {
    case 'person':
      return e.inv;
    case 'building':
      return e.store.items;
    case 'pile':
      return e.items;
    case 'cart':
      return e.load;
    default:
      return null;
  }
}

/** Consistency check used by tests and the debug panel: every tool record sits in a container that counts it, and vice versa. */
export function toolReport(world: World): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const counted: Record<string, number> = {};
  for (const t of world.tools) {
    const items = holderItems(world, t.holder);
    if (!items) problems.push(`tool ${t.id} (${t.kind}) held by ${t.holder}, which holds nothing`);
    const key = t.holder + ':' + t.kind;
    counted[key] = (counted[key] ?? 0) + 1;
  }
  for (const [key, n] of Object.entries(counted)) {
    const [hid, kind] = key.split(':');
    const items = holderItems(world, Number(hid));
    if (items && (items[kind as ItemKind] ?? 0) !== n) problems.push(`holder ${hid} has ${items[kind as ItemKind] ?? 0} ${kind} in its items but ${n} tool records`);
  }
  const check = (id: number, items: Items) => {
    for (const k of ['axe', 'pick', 'hoe', 'basket', 'hammer', 'saw', 'jar', 'rod', 'spear'] as ToolKind[]) {
      const have = items[k] ?? 0;
      if (have > 0 && (counted[id + ':' + k] ?? 0) !== have) problems.push(`holder ${id} counts ${have} ${k} but has ${counted[id + ':' + k] ?? 0} tool records`);
    }
  };
  for (const p of world.persons) if (p.alive) check(p.id, p.inv);
  for (const b of world.buildings) check(b.id, b.store.items);
  for (const pile of world.piles) check(pile.id, pile.items);
  return { ok: problems.length === 0, problems };
}
