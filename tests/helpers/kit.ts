// Hand-made, clearly labelled situations for the workshop / tools / carts / social-contract tests.
// Everything built with these is STAGED: it checks a rule, it is not an example of spontaneous behaviour.
import { createBuilding, createSite } from '../../src/sim/buildings';
import { addItem } from '../../src/sim/economy';
import { observe } from '../../src/sim/knowledge';
import { RNG, hashString } from '../../src/sim/rng';
import { testKit } from '../../src/sim/scenes';
import { mintTool } from '../../src/sim/tools';
import type { Building, BuildingType, Entity, Items, Person, Tool, ToolKind, Traits, World } from '../../src/sim/types';
import { settingsFor } from './util';

export interface Stage {
  w: World;
  rng: RNG;
}

/** a flat, natural-rules world (so workshops, meals and welfare are active) with the lake along the north edge */
export function stage(name: string, scene: 'natural' | 'help' = 'natural'): Stage {
  const w = testKit.flatWorld(settingsFor(name, { scene }));
  return { w, rng: new RNG(hashString(name)) };
}

export function addPerson(
  s: Stage,
  name: string,
  x: number,
  y: number,
  o: { inv?: Items; hh?: number; sex?: 'f' | 'm'; age?: number; traits?: Partial<Traits>; hunger?: number; thirst?: number; energy?: number } = {},
): Person {
  return testKit.addPerson(s.w, s.rng, { name, x, y, sex: o.sex, age: o.age, inv: o.inv, hh: o.hh, traits: o.traits, hunger: o.hunger, thirst: o.thirst, energy: o.energy });
}

/** everyone knows the lake and the open ground; ledger snapshot taken; call last */
export function done(s: Stage): World {
  testKit.finish(s.w, 'natural');
  return s.w;
}

export function building(s: Stage, type: BuildingType, x: number, y: number, hh = 0, stock: Items = {}): Building {
  const b = createBuilding(s.w, type, x, y, hh);
  for (const k of Object.keys(stock) as (keyof Items)[]) addItem(b.store.items, k, stock[k] ?? 0);
  return b;
}

export function site(s: Stage, type: BuildingType, x: number, y: number, hh: number, creator: number, delivered: Items = {}) {
  const st = createSite(s.w, type, x, y, hh, creator);
  for (const k of Object.keys(delivered) as (keyof Items)[]) addItem(st.delivered, k, delivered[k] ?? 0);
  return st;
}

/** starting equipment: part of the initial snapshot, not a creation */
export function give(w: World, p: Person, tool: ToolKind, tier: 0 | 1 = 0): Tool {
  return mintTool(w, tool, tier, p.hhId, p.id, p.inv, p.id, 'test equipment', false);
}

export function learn(w: World, p: Person, ...things: Entity[]): void {
  for (const e of things) observe(w, p, e);
}

/** the person simply stays where they are and does nothing, whatever happens (a staged bystander) */
export function pin(p: Person): void {
  p.cooldowns.pause = 1e12;
}
