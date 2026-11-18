import { hash3, hashString, RNG } from './rng';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

// RULES 256: FIVE SYSTEMS STOP DRAWING FROM THE SHARED STREAM AND DRAW FROM KEYS.
//
// Read in source (review_evidence/stage1c-20261118/step0c_shared_stream_map.txt): every random event in the world takes its number from one
// stream, world.rng, in the order the code reaches it. So one extra draw anywhere (a wolf's turn, a name, a birth) moves every draw after it,
// and two runs that differ by a single draw have a different weather, different arrivals and different spoilage from then on. A change to one
// system then shows up as noise in all the others, and a small offset can also be absorbed (stage 1c step 4, aspen nudge:2).
//
// From 256, in rich worlds, five separately switched parts draw from a key made of the world seed, the system, the tick and the ids of the
// things involved, and from nothing else:
//   weather   the next weather and how long it lasts, keyed by the tick of the change
//   arrivals  whether a newcomer comes, from where, who they are and what they are like: one short generator per arrival, seeded from the tick
//   spoilage  each unit of perishable food in a pack, cart, store or pile, keyed by the tick, the holder, the kind and the unit's place in the heap
//   trees     whether a tree seeds a sapling and where, keyed by the tick and the tree
//   grain     whether a gatherer keeps grain heads for seed, keyed by the tick, the gatherer and the plant
// Nothing is saved for this: a key is built from the seed, the tick and ids the world already holds. Old age, conception, births, all wildlife
// and relocation names stay on the shared stream. The chances are the ones they were and no rule reads the number differently: only which
// number is drawn changes. Rules 255 and earlier, authored worlds and a switch thrown keep the shared stream.

export const KEYED_DRAWS_FROM = 256;

const on = { weather: true, arrivals: true, spoilage: true, trees: true, grain: true };
export type KeyedDrawsPart = keyof typeof on;
export const KEYED_DRAWS_PARTS = Object.keys(on) as KeyedDrawsPart[];
/** Lab switches (never saved or hashed). */
export const keyedDrawsPartOn = (part: KeyedDrawsPart): boolean => on[part];
export function setKeyedDraws(enabled: boolean, part?: KeyedDrawsPart): void {
  if (part) on[part] = enabled;
  else for (const k of KEYED_DRAWS_PARTS) on[k] = enabled;
}
/** does this part draw from keys in this world? */
export const keyedOn = (world: World, part: KeyedDrawsPart): boolean => on[part] && world.settings.dynamics === 'rich' && runsRulesVersion(world, KEYED_DRAWS_FROM);

const SALT: Record<KeyedDrawsPart, number> = {
  weather: hashString('keyed:weather'),
  arrivals: hashString('keyed:arrivals'),
  spoilage: hashString('keyed:spoilage'),
  trees: hashString('keyed:trees'),
  grain: hashString('keyed:grain'),
};

// the seed is text and its hash is the same for the life of a world, so it is worked out once
const seedHashes = new WeakMap<World, { seed: string; h: number }>();
function seedHash(world: World): number {
  const seed = world.settings.seed;
  const hit = seedHashes.get(world);
  if (hit && hit.seed === seed) return hit.h;
  const h = hashString(seed);
  seedHashes.set(world, { seed, h });
  return h;
}

/** the key every draw of one system at one tick starts from */
export const keyAt = (world: World, part: KeyedDrawsPart, tick: number): number => hash3(seedHash(world), SALT[part], tick);
/** a key with an id and a counter folded in */
export const keyMix = (key: number, a: number, b = 0): number => hash3(key, a, b);
/** a key as a number in [0,1) */
export const keyUnit = (key: number): number => key / 4294967296;
/** a short generator for one event that needs several draws; it lives for the call and nothing of it is saved */
export const keyedRng = (key: number): RNG => new RNG(key);

const kindKeys = new Map<string, number>();
/** the key of an item kind (text, hashed once) */
export function kindKey(kind: string): number {
  let k = kindKeys.get(kind);
  if (k === undefined) {
    k = hashString(kind);
    kindKeys.set(kind, k);
  }
  return k;
}

/** spoilage: the kinds of holder, so a pack, a store, a pile and a granary's shares never share a key even if an id were reused */
export const SPOIL_PACK = 0;
export const SPOIL_STORE = 1;
export const SPOIL_PILE = 2;
export const SPOIL_SHARE = 3;
/** where the units of one kind in one holder start from; unit i is keyUnit(keyMix(prefix, i)) */
export const spoilPrefix = (base: number, group: number, holderId: number, kind: string): number => hash3(hash3(base, group, holderId), kindKey(kind), 0);

/** trees: the generator for one tree's seeding at this tick (a sapling's chance and where it lands); the shared stream before 256 */
export const treeRng = (world: World, treeId: number): RNG => (keyedOn(world, 'trees') ? keyedRng(hash3(keyAt(world, 'trees', world.tick), treeId, 0)) : world.rng);

/** grain: does this gatherer keep heads for seed from this plant (one chance in five); the shared stream before 256 */
export const grainSeedRoll = (world: World, personId: number, sourceId: number): boolean =>
  keyedOn(world, 'grain') ? keyUnit(hash3(keyAt(world, 'grain', world.tick), personId, sourceId)) < 0.2 : world.rng.chance(0.2);