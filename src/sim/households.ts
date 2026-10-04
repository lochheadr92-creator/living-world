import type { RNG } from './rng';
import type { Building, Household, Person, World } from './types';

const HOUSE_NAMES = [
  'Reed', 'Fern', 'Moss', 'Wren', 'Birch', 'Willow', 'Brook', 'Ash', 'Clover', 'Heron', 'Marsh', 'Thistle', 'Alder', 'Briar', 'Sparrow',
  'Linden', 'Rowan', 'Sedge', 'Hazel', 'Finch', 'Bramble', 'Juniper', 'Sorrel', 'Tansy',
];

export function createHousehold(world: World, rng: RNG): Household {
  const used = new Set(world.households.map((h) => h.name));
  let name = '';
  for (let i = 0; i < 40 && !name; i++) {
    const n = rng.pick(HOUSE_NAMES);
    if (!used.has(n)) name = n;
  }
  if (!name) name = rng.pick(HOUSE_NAMES) + ' ' + (world.households.length + 1);
  const hh: Household = {
    id: world.nextId++,
    name,
    members: [],
    color: world.households.length % 10,
    homeId: 0,
    headId: 0,
    formed: world.tick,
  };
  world.households.push(hh);
  return hh;
}

export function householdById(world: World, id: number): Household | undefined {
  return world.households.find((h) => h.id === id);
}

/** Dissolve an empty household; its buildings become vacant (anyone may claim them). */
export function dissolveHousehold(world: World, hh: Household): void {
  const i = world.households.indexOf(hh);
  if (i >= 0) world.households.splice(i, 1);
  for (const b of world.buildings) if (b.hhId === hh.id) b.hhId = 0;
  for (const s of world.sites) if (s.hhId === hh.id) s.hhId = 0;
  for (const pl of world.plots) if (pl.hhId === hh.id) pl.hhId = 0;
}

export function addToHousehold(world: World, p: Person, hh: Household): void {
  const old = householdById(world, p.hhId);
  if (old && old !== hh) {
    old.members = old.members.filter((m) => m !== p.id);
    if (old.headId === p.id) old.headId = old.members[0] ?? 0;
    if (old.members.length === 0) dissolveHousehold(world, old);
  }
  p.hhId = hh.id;
  if (!hh.members.includes(p.id)) hh.members.push(p.id);
  if (!hh.headId) hh.headId = p.id;
}

export function removeFromHousehold(world: World, p: Person): void {
  const hh = householdById(world, p.hhId);
  if (!hh) return;
  hh.members = hh.members.filter((m) => m !== p.id);
  if (hh.headId === p.id) hh.headId = hh.members.find((m) => world.byId.get(m)?.ent === 'person') ?? 0;
  if (hh.members.length === 0) dissolveHousehold(world, hh);
}

export function membersOf(world: World, hh: Household | undefined): Person[] {
  if (!hh) return [];
  const out: Person[] = [];
  for (const id of hh.members) {
    const e = world.byId.get(id);
    if (e && e.ent === 'person' && e.alive) out.push(e);
  }
  return out;
}

/** The building (if any) a person calls home. */
export function homeBuildingOf(world: World, p: Person): Building | null {
  const hh = householdById(world, p.hhId);
  if (!hh || !hh.homeId) return null;
  const e = world.byId.get(hh.homeId);
  return e && e.ent === 'building' ? e : null;
}

export function sameHousehold(a: Person, b: Person): boolean {
  return a.hhId !== 0 && a.hhId === b.hhId;
}
