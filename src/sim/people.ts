import { AGE_ADULT, AGE_CHILD, AGE_ELDER, BASKET_BONUS, CARRY_CAP, TICKS_PER_YEAR } from './constants';
import { vigourOf } from './ageing';
import type { RNG } from './rng';
import type { Items, Look, Person, Skills, Stage, ToolKind, Traits, World } from './types';
import { clamp } from './util';

export const FEMALE_NAMES = [
  'Mira', 'Ana', 'Lena', 'Sofia', 'Nora', 'Ivy', 'Tessa', 'Hana', 'Rosa', 'Elin', 'Maren', 'Ada', 'Kira', 'Juno', 'Wren', 'Isla',
  'Odette', 'Pia', 'Talia', 'Zora', 'Bea', 'Clara', 'Dara', 'Edda', 'Faye', 'Greta', 'Hilde', 'Ines', 'Jess', 'Kaia', 'Lia', 'Mona',
  'Nell', 'Orla', 'Petra', 'Rhea', 'Sana', 'Thea', 'Una', 'Vera', 'Wilma', 'Yara', 'Zia', 'Alma', 'Brigid', 'Cora', 'Delia', 'Esme',
];
export const MALE_NAMES = [
  'Cole', 'Ben', 'Tomas', 'Hugo', 'Finn', 'Leo', 'Oren', 'Jonas', 'Rafe', 'Silas', 'Theo', 'Ulric', 'Viktor', 'Wes', 'Xavi', 'Yusuf',
  'Zed', 'Arlo', 'Bram', 'Cass', 'Dov', 'Eli', 'Fenn', 'Gus', 'Hal', 'Ivo', 'Jax', 'Kai', 'Lars', 'Milo', 'Nico', 'Otto', 'Pavel',
  'Quinn', 'Rolf', 'Sven', 'Tariq', 'Uri', 'Vik', 'Wen', 'Yan', 'Zeke', 'Abel', 'Basil', 'Corin', 'Dax', 'Emre', 'Felix',
];

export function pickName(world: World, rng: RNG, sex: 'f' | 'm'): string {
  const list = sex === 'f' ? FEMALE_NAMES : MALE_NAMES;
  for (let tries = 0; tries < 40; tries++) {
    const n = rng.pick(list);
    if (!world.usedNames.has(n)) {
      world.usedNames.add(n);
      return n;
    }
  }
  // exhausted: add a numeral
  for (let k = 2; k < 200; k++) {
    const n = rng.pick(list) + ' ' + toRoman(k);
    if (!world.usedNames.has(n)) {
      world.usedNames.add(n);
      return n;
    }
  }
  return rng.pick(list) + world.nextId;
}

function toRoman(n: number): string {
  const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}

export function ageYears(world: World, p: Person): number {
  return (world.tick - p.birthTick) / TICKS_PER_YEAR;
}

export function stageOfAge(age: number): Stage {
  return age < AGE_CHILD ? 'child' : age < AGE_ADULT ? 'youth' : age < AGE_ELDER ? 'adult' : 'elder';
}

export function stageOf(world: World, p: Person): Stage {
  return stageOfAge(ageYears(world, p));
}

export function carryCap(world: World, p: Person): number {
  const age = ageYears(world, p);
  const st = stageOfAge(age);
  // grown people carry less as their strength goes (the prime carries the full load)
  const base = st === 'adult' || st === 'elder' ? Math.round(CARRY_CAP.adult * (0.4 + 0.6 * vigourOf(world, p, age))) : CARRY_CAP[st];
  return base + ((p.inv.basket ?? 0) > 0 ? BASKET_BONUS : 0);
}

export const dependentsOf = (world: World, p: Person): Person[] => world.persons.filter((q) => q.alive && q.id !== p.id && q.hhId === p.hhId && isDependent(world, q));

export function hasTool(p: Person, t: ToolKind): boolean {
  return (p.inv[t] ?? 0) > 0;
}

/** Children, frail elders and the hurt rely on others. */
export function isDependent(world: World, p: Person): boolean {
  const s = stageOf(world, p);
  return s === 'child' || (s === 'elder' && p.health < 70) || p.health < 35;
}

export function isAdultWorker(world: World, p: Person): boolean {
  const s = stageOf(world, p);
  return s === 'adult' || s === 'elder' || s === 'youth';
}

export function makeTraits(rng: RNG): Traits {
  const t = () => clamp(0.5 + rng.gauss() * 0.2, 0.06, 0.96);
  return { generosity: t(), sociability: t(), caution: t(), diligence: t(), curiosity: t() };
}

export function mixTraits(rng: RNG, a: Traits | null, b: Traits | null): Traits {
  const fresh = makeTraits(rng);
  if (!a || !b) return fresh;
  const mix = (x: number, y: number, z: number) => clamp((x + y) / 2 * 0.55 + z * 0.45 + rng.gauss() * 0.05, 0.06, 0.96);
  return {
    generosity: mix(a.generosity, b.generosity, fresh.generosity),
    sociability: mix(a.sociability, b.sociability, fresh.sociability),
    caution: mix(a.caution, b.caution, fresh.caution),
    diligence: mix(a.diligence, b.diligence, fresh.diligence),
    curiosity: mix(a.curiosity, b.curiosity, fresh.curiosity),
  };
}

export function makeSkills(rng: RNG, traits: Traits): Skills {
  const base = (bias = 0) => clamp(0.78 + rng.next() * 0.5 + bias, 0.7, 1.5) * (0.94 + 0.12 * traits.diligence);
  return {
    forage: base(traits.curiosity * 0.06),
    fish: base(),
    wood: base(),
    stone: base(),
    build: base(traits.diligence * 0.05),
    farm: base(),
    craft: base(traits.curiosity * 0.05),
    carpentry: base(traits.diligence * 0.03),
    kiln: base(),
    smith: base(traits.diligence * 0.03),
    bake: base(traits.generosity * 0.03),
  };
}

export function makeLook(rng: RNG, sex: 'f' | 'm'): Look {
  return {
    skin: rng.int(6),
    hair: rng.int(6),
    hairStyle: sex === 'f' ? [1, 1, 2, 3, 0][rng.int(5)] : [0, 0, 4, 3, 0][rng.int(5)],
    shirt: rng.int(10),
    pants: rng.int(5),
    hat: rng.chance(0.2) ? 1 + rng.int(3) : 0,
    build: 0.92 + rng.next() * 0.18,
    height: 0.94 + rng.next() * 0.14,
  };
}

export function blendLook(rng: RNG, a: Look | null, b: Look | null, sex: 'f' | 'm'): Look {
  const fresh = makeLook(rng, sex);
  if (!a || !b) return fresh;
  return {
    ...fresh,
    skin: rng.chance(0.5) ? a.skin : b.skin,
    hair: rng.chance(0.5) ? a.hair : b.hair,
  };
}

export interface NewPersonOpts {
  name?: string;
  sex?: 'f' | 'm';
  age: number;
  hhId: number;
  x: number;
  y: number;
  traits?: Traits;
  look?: Look;
  parents?: number[];
}

export function createPerson(world: World, rng: RNG, o: NewPersonOpts): Person {
  const sex = o.sex ?? (rng.chance(0.5) ? 'f' : 'm');
  const traits = o.traits ?? makeTraits(rng);
  const id = world.nextId++;
  const name = o.name ?? pickName(world, rng, sex);
  const p: Person = {
    ent: 'person',
    id,
    name,
    sex,
    look: o.look ?? makeLook(rng, sex),
    x: o.x,
    y: o.y,
    px: o.x,
    py: o.y,
    heading: rng.next() * Math.PI * 2 - Math.PI,
    pheading: 0,
    birthTick: world.tick - Math.round(o.age * TICKS_PER_YEAR),
    alive: true,
    health: 100,
    needs: {
      hunger: 62 + rng.next() * 30,
      thirst: 62 + rng.next() * 30,
      energy: 72 + rng.next() * 24,
      warmth: 78 + rng.next() * 10,
      safety: 85,
      social: 45 + rng.next() * 45,
    },
    traits,
    skills: makeSkills(rng, traits),
    inv: {},
    hhId: o.hhId,
    parents: o.parents ? o.parents.slice() : [],
    children: [],
    partnerId: 0,
    pregnantUntil: 0,
    pregnantBy: 0,
    beliefs: {},
    bykind: {},
    whereabouts: {},
    explored: new Uint8Array(world.W * world.H),
    seen: [],
    relations: {},
    failures: {},
    commitments: [],
    errand: null,
    activity: null,
    suspended: null,
    pose: 'stand',
    convId: 0,
    speech: null,
    wave: 0,
    log: [],
    lastDecision: null,
    lastResult: null,
    lastPercept: { tick: 0, seen: 0, newBeliefs: 0 },
    nextThink: 0,
    cooldowns: {},
    chrono: (rng.next() - 0.5) * 0.09,
    asked: {},
    told: {},
    accounts: [],
    grief: [],
    lastExploreTick: -9999,
    stats: { gathered: 0, given: 0, received: 0, built: 0, talked: 0, farmed: 0, crafted: 0 },
    lastAteTick: world.tick,
    deathCause: '',
    diedTick: 0,
    stampX: -99,
    stampY: -99,
    cartId: 0,
    concerns: [],
    lastInteraction: null,
  };
  p.pheading = p.heading;
  return p;
}

const TRAIT_WORDS: Record<keyof Traits, [string, string]> = {
  generosity: ['frugal', 'generous'],
  sociability: ['reserved', 'sociable'],
  caution: ['bold', 'cautious'],
  diligence: ['easygoing', 'diligent'],
  curiosity: ['homebody', 'curious'],
};

/** Short phrase for the dominant traits, e.g. "generous, curious". */
export function traitSummary(t: Traits): string {
  const entries = (Object.keys(t) as (keyof Traits)[])
    .map((k) => ({ k, v: t[k], dev: Math.abs(t[k] - 0.5) }))
    .sort((a, b) => b.dev - a.dev)
    .slice(0, 3)
    .filter((e) => e.dev > 0.12);
  if (!entries.length) return 'balanced';
  return entries.map((e) => TRAIT_WORDS[e.k][e.v >= 0.5 ? 1 : 0]).join(', ');
}

export function itemsToText(items: Items): string {
  const parts: string[] = [];
  for (const k of Object.keys(items) as (keyof Items)[]) {
    const n = items[k] ?? 0;
    if (n > 0) parts.push(`${n} ${k}`);
  }
  return parts.length ? parts.join(', ') : 'nothing';
}
