import { LOAN_TERM, TOOL_DEFS, TOOL_DULL_FROM, TOOL_EFFECT, TOOLS } from './constants';
import { addItem, ledgerConsume, ledgerCreate, takeFrom } from './economy';
import { addEvent, addLog } from './events';
import { bestOf, holderItems, retagTools, toolById, toolsHeldBy } from './toolreg';
import { newId } from './registry';
import type { Items, Person, Tool, ToolKind, World } from './types';

export { toolById, toolsHeldBy, bestOf } from './toolreg';

export type ToolTask = 'chop' | 'mine' | 'till' | 'tend' | 'forage' | 'build' | 'repair' | 'saw' | 'smith';

const TASK_TOOL: Record<ToolTask, ToolKind | null> = {
  chop: 'axe',
  mine: 'pick',
  till: 'hoe',
  tend: 'hoe',
  forage: 'basket',
  build: 'hammer',
  repair: 'hammer',
  saw: 'saw',
  smith: 'hammer',
};

/** how much worse a tool does its job once it has worn past `TOOL_DULL_FROM`: 0 = like new, 1 = no better than bare hands */
export function dullness(wear: number): number {
  return wear <= TOOL_DULL_FROM ? 0 : Math.min(1, (wear - TOOL_DULL_FROM) / (100 - TOOL_DULL_FROM));
}

function baseMultiplier(kind: ToolKind, tier: 0 | 1, task: ToolTask): number {
  const iron = tier === 1;
  switch (kind) {
    case 'axe':
      return iron ? TOOL_EFFECT.ironAxe : TOOL_EFFECT.axe;
    case 'pick':
      return iron ? TOOL_EFFECT.ironPick : TOOL_EFFECT.pick;
    case 'hoe':
      return task === 'tend' ? (iron ? TOOL_EFFECT.ironHoeTend : TOOL_EFFECT.hoeTend) : iron ? TOOL_EFFECT.ironHoe : TOOL_EFFECT.hoe;
    case 'basket':
      return TOOL_EFFECT.basket;
    case 'hammer':
      return iron ? TOOL_EFFECT.ironHammer : TOOL_EFFECT.hammer;
    case 'saw':
      return iron ? TOOL_EFFECT.ironSaw : TOOL_EFFECT.saw;
    default:
      return 1;
  }
}

/** The tool a person would use for a task, if they hold one. */
export function toolFor(world: World, p: Person, task: ToolTask): Tool | null {
  const kind = TASK_TOOL[task];
  return kind ? bestOf(world, p.id, kind, p.id) : null;
}

export function toolOf(world: World, p: Person, kind: ToolKind): Tool | null {
  return bestOf(world, p.id, kind, p.id);
}

/** Duration multiplier for a task (1 = bare hands, lower = faster), counting how worn the tool is. */
export function taskMultiplier(world: World, p: Person, task: ToolTask): number {
  const t = toolFor(world, p, task);
  if (!t) return 1;
  const base = baseMultiplier(t.kind, t.tier, task);
  return base + (1 - base) * dullness(t.wear);
}

/** Multiplier from a tool kind that a recipe names (with that recipe's own speed-up for a wooden-and-stone tool). */
export function recipeToolMultiplier(tool: Tool | null, speed: number): number {
  if (!tool) return 1;
  const s = tool.tier === 1 ? speed * 0.8 : speed;
  return s + (1 - s) * dullness(tool.wear);
}

/** Wear gained per tick of use. Iron wears half as fast; a stone-toothed saw wears faster than the rest. */
export function wearRate(tool: Tool): number {
  let r = TOOL_DEFS[tool.kind].wear;
  if (tool.tier === 1) r *= 0.5;
  if (tool.kind === 'saw' && tool.tier === 0) r *= 1.4;
  return r;
}

/**
 * Create a tool: a new record plus a count in the holder's items. The ledger entry is the caller's choice of `reason`
 * (crafting, forging, firing); starting equipment passes `ledger: false` because it is part of the initial snapshot.
 */
export function mintTool(
  world: World,
  kind: ToolKind,
  tier: 0 | 1,
  ownerHh: number,
  holderId: number,
  items: Items,
  maker: number,
  reason: string,
  ledger = true,
): Tool {
  const t: Tool = {
    ent: 'tool',
    id: newId(world),
    kind,
    tier,
    wear: 0,
    ownerHh,
    holder: holderId,
    loan: null,
    madeTick: world.tick,
    maker,
  };
  world.tools.push(t);
  addItem(items, kind, 1);
  if (ledger) ledgerCreate(world, kind, 1, reason);
  return t;
}

/** Give every piece of starting equipment that already sits in a pack a record (worldgen, scenes). */
export function registerStartingTools(world: World): void {
  for (const p of world.persons) {
    for (const kind of TOOLS) {
      const n = p.inv[kind] ?? 0;
      const have = toolsHeldBy(world, p.id, kind).length;
      for (let i = have; i < n; i++) {
        world.tools.push({ ent: 'tool', id: newId(world), kind, tier: 0, wear: 0, ownerHh: p.hhId, holder: p.id, loan: null, madeTick: world.tick, maker: 0 });
      }
    }
  }
}

/** Equipment whose count was changed directly (scenes, tests) gets records so the two views agree again. */
export function syncToolRecords(world: World): void {
  registerStartingTools(world);
}

export function describeTool(t: Tool): string {
  const d = TOOL_DEFS[t.kind];
  return `${t.tier === 1 ? 'iron ' : ''}${d.label}`;
}

/** The tool wears out and breaks: its record and its count are removed and the loss is recorded. */
export function breakTool(world: World, t: Tool, why: string): void {
  const items = holderItems(world, t.holder);
  if (items) takeFrom(items, t.kind, 1);
  ledgerConsume(world, t.kind, 1, why);
  const i = world.tools.indexOf(t);
  if (i >= 0) world.tools.splice(i, 1);
  const holder = world.byId.get(t.holder);
  if (holder && holder.ent === 'person') {
    addLog(world, holder, 'work', `My ${describeTool(t)} broke.`);
    addEvent(world, 'work', `${holder.name}'s ${describeTool(t)} broke from hard use.`, [holder.id], holder.x, holder.y);
  }
  // a loan that ends in breakage ends there
  t.loan = null;
}

/** Use wear up. Called with the ticks of work actually done with the tool. */
export function wearTool(world: World, t: Tool | null, ticks: number): boolean {
  if (!t || ticks <= 0) return false;
  t.wear += wearRate(t) * ticks;
  if (t.wear >= 100) {
    breakTool(world, t, 'tool worn out');
    return true;
  }
  return false;
}

export function wearFor(world: World, p: Person, task: ToolTask, ticks: number): boolean {
  return wearTool(world, toolFor(world, p, task), ticks);
}

// ───────── lending and shared tools ─────────
/** A tool leaves one person's hands for another's on loan. The caller records the promise to return it. */
export function lendTool(world: World, t: Tool, from: Person, to: Person, due: number): boolean {
  if (t.holder !== from.id || t.loan) return false;
  takeFrom(from.inv, t.kind, 1);
  addItem(to.inv, t.kind, 1);
  t.holder = to.id;
  t.loan = { lender: from.id, borrower: to.id, due };
  return true;
}

/** The borrower hands it back: it returns to the lender's hands and the loan is closed. */
export function returnLoan(world: World, t: Tool, borrower: Person, lender: Person): boolean {
  if (t.holder !== borrower.id || !t.loan) return false;
  takeFrom(borrower.inv, t.kind, 1);
  addItem(lender.inv, t.kind, 1);
  t.holder = lender.id;
  t.loan = null;
  return true;
}

/** Take a tool from a rack (a shared store): the rack's loan has no lender, the borrower answers to everyone. */
export function checkoutFromRack(world: World, t: Tool, rackItems: Items, to: Person): boolean {
  if (t.loan || t.holder === to.id || !(rackItems[t.kind] ?? 0)) return false;
  const rack = world.byId.get(t.holder);
  if (!rack || rack.ent !== 'building') return false;
  takeFrom(rackItems, t.kind, 1);
  addItem(to.inv, t.kind, 1);
  t.holder = to.id;
  t.loan = { lender: 0, borrower: to.id, due: world.tick + LOAN_TERM };
  return true;
}

/**
 * A tool left on a workshop rack can be used at the bench by one person at a time. The checkout lasts a few moments and is
 * renewed while they work; nothing else is needed to release it (it also lapses on its own, see `releaseStaleBench`).
 */
export function benchTool(world: World, p: Person, buildingId: number, kind: ToolKind): Tool | null {
  const t = bestOf(world, buildingId, kind, p.id);
  if (!t) return null;
  if (t.loan && t.loan.borrower !== p.id && t.loan.due > world.tick) return null;
  t.loan = { lender: 0, borrower: p.id, due: world.tick + 40 };
  return t;
}

export function releaseBench(world: World, p: Person): void {
  for (const t of world.tools) if (t.loan && t.loan.lender === 0 && t.loan.borrower === p.id && world.byId.get(t.holder)?.ent === 'building') t.loan = null;
}

export function releaseStaleBench(world: World): void {
  for (const t of world.tools) {
    if (t.loan && t.loan.lender === 0 && world.byId.get(t.holder)?.ent === 'building' && t.loan.due <= world.tick) t.loan = null;
  }
}

/** Is the tool currently on the bench for somebody else? */
export function onBenchFor(world: World, t: Tool, user: number): boolean {
  return !!t.loan && t.loan.lender === 0 && t.loan.borrower !== user && t.loan.due > world.tick && world.byId.get(t.holder)?.ent === 'building';
}

// ───────── rules for the edges of a tool's life ─────────
/**
 * Death. A person's belongings (tools with them) go to a heap where they fell. For equipment on loan to the dead:
 * the loan ends and the tool stays with its owner's household (it is theirs to collect from the heap). For equipment the dead
 * had lent out: the borrower keeps it; if the lender's household still has living members the promise to return it now
 * runs to the oldest of them, otherwise the borrower's household becomes the owner.
 */
export function toolsOnDeath(world: World, dead: Person): void {
  for (const t of world.tools) {
    if (t.holder === dead.id && t.loan && t.loan.borrower === dead.id) t.loan = null;
    if (t.loan && t.loan.lender === dead.id) {
      const heir = world.persons.filter((q) => q.alive && q.hhId === t.ownerHh && q.id !== dead.id).sort((a, b) => a.birthTick - b.birthTick)[0];
      const borrower = world.byId.get(t.loan.borrower);
      if (heir) {
        t.loan.lender = heir.id;
      } else {
        t.loan = null;
        if (borrower && borrower.ent === 'person') t.ownerHh = borrower.hhId;
      }
    }
  }
}

/** Move the tool records along with items that were swept into a heap (death, a collapsed building). */
export function toolsToHeap(world: World, fromId: number, pileId: number, items: Items): void {
  for (const kind of TOOLS) {
    const n = items[kind] ?? 0;
    if (n > 0) retagTools(world, kind, n, fromId, pileId);
  }
}

/** A building that collapses scatters what was on its racks; a tool on the bench is dropped with it. */
export function releaseToolsOf(world: World, buildingId: number): void {
  for (const t of world.tools) if (t.holder === buildingId) t.loan = null;
}

/** Equipment that has been out on loan far past its due date (the lender is told by the commitment system; this is the physical fact). */
export function overdueLoans(world: World): Tool[] {
  return world.tools.filter((t) => t.loan && t.loan.lender !== 0 && t.loan.due < world.tick - 200);
}
