// A VERSION-1 CONTINUATION REFERENCE.
//
// `tests/golden.expected.json` holds the ordinary (unversioned) world. It cannot answer the question this file exists for:
// when a later rules version adds behaviour, does a world that is still running VERSION 1 carry on exactly as it did before
// that behaviour was written? A test that only checks the version label would pass however badly the gate leaked, so this
// compares the state itself.
//
// Each case is a continuation, not a fresh run: a rich world stamped `rulesVersion: 1` is run for a while, written out and
// read back through the real save path - which is what an existing player's world is - and only then continued. The
// fingerprints are taken after the round trip and at every later checkpoint, so a leak anywhere along the way shows up.
//
// Beside the two hashes each checkpoint carries a handful of plain counts. They are not a second fingerprint; they exist so
// that a failure says something a person can act on ("twelve more plans, all of a kind that did not exist in version 1")
// instead of only "the hash moved".
//
// Recorded from the revision BEFORE version 2 was written, and never re-recorded to make a change pass: a difference here is
// the signal that behaviour added later reached a version-1 world, which is exactly what must not happen.
//   npx vite-node scripts/v1_reference.ts            compare
//   npx vite-node scripts/v1_reference.ts --write    record (only from a revision where version 1 is the whole story)
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import type { ProfileName } from '../../src/sim/profiles';
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import type { World } from '../../src/sim/types';
import { hashWorld, stepWorld } from '../../src/sim/world';
import { deepHash } from './golden';

export interface V1Case {
  name: string;
  /** the rules version this case pins. Every SUPPORTED version below the current one should have cases here. */
  version: number;
  seed: string;
  profile: ProfileName;
  /** tick at which the world is saved and read back; the continuation starts here */
  saveAt: number;
  /** ticks to fingerprint, ascending, all at or after `saveAt` */
  ticks: number[];
}

/**
 * Two small worlds, chosen for what they can catch rather than for size.
 *
 * `short` stops inside the second day: it covers the route that can fire at any hour - a household that can SEE it is short
 * of food - and it is cheap enough to run on every test pass.
 *
 * `prewinter` runs to the middle of day 7 of a twelve-day year. Winter sets in on day 8 (hardship.ts), so this window is
 * exactly where a seasonal preparation would be adopted, and it is the one place a version-1 world could most easily be
 * given behaviour that belongs to version 2.
 */
export const V1_CASES: V1Case[] = [
  { name: 'short', version: 1, seed: 'meadow', profile: 'normal', saveAt: 1200, ticks: [1200, 2400, 3600] },
  { name: 'prewinter', version: 1, seed: 'river', profile: 'normal', saveAt: 14400, ticks: [14400, 16800, 18000] },
  // Version 2 gets the same treatment, recorded from the revision before version 3 was written. `wolves` is a world with
  // a wolf problem (harsh, no arrivals), because what version 3 adds is answered to wolves: if any of it leaked into a
  // version-2 world, this is where it would show.
  { name: 'v2-short', version: 2, seed: 'meadow', profile: 'normal', saveAt: 1200, ticks: [1200, 2400, 3600] },
  { name: 'v2-wolves', version: 2, seed: 'fern', profile: 'normal', saveAt: 2400, ticks: [2400, 7200, 9600] },
];

export interface V1Point {
  hash: string;
  deep: string;
  /** people alive */
  alive: number;
  /** live private plans, counted by kind, so a new kind of plan is named rather than merely hashed */
  plans: Record<string, number>;
  /** food people believe is in their own household home stores, summed: the thing a food reserve would move */
  homeFood: number;
  /** food actually in home buildings, summed (the world's own figure, not a belief) */
  storedFood: number;
  /** spears in existence, and wolves that have been driven off: both are version-3 things and must be 0 below it */
  spears: number;
  droveOff: number;
  /** people bitten badly enough to be below full health, and wolves by state: what a defence would change */
  wolfStates: Record<string, number>;
}

const FOODS = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat'] as const;

export function v1Point(world: World): V1Point {
  const plans: Record<string, number> = {};
  let homeFood = 0;
  let alive = 0;
  for (const p of world.persons) {
    if (!p.alive) continue;
    alive++;
    for (const i of p.intentions) if (i.status === 'active') plans[i.kind] = (plans[i.kind] ?? 0) + 1;
    for (const id of p.bykind.building ?? []) {
      const b = p.beliefs[id];
      if (!b || b.hh !== p.hhId) continue;
      for (const k of FOODS) homeFood += b.items?.[k] ?? 0;
    }
  }
  let storedFood = 0;
  for (const b of world.buildings) {
    if (!b.store) continue;
    for (const k of FOODS) storedFood += b.store.items[k] ?? 0;
  }
  let spears = 0;
  for (const t of world.tools) if (t.kind === 'spear') spears++;
  let droveOff = 0;
  const wolfStates: Record<string, number> = {};
  for (const a of world.animals) {
    if (a.type === 'deer') continue;
    wolfStates[a.state] = (wolfStates[a.state] ?? 0) + 1;
    if (a.wary !== undefined) droveOff++;
  }
  return { hash: hashWorld(world), deep: deepHash(world), alive, plans, homeFood, storedFood, spears, droveOff, wolfStates };
}

/**
 * A version-1 world, built the way a diagnostic builds one: the low-level helper, which is deliberately unversioned, with the
 * version put on explicitly. It must NOT go through `freshRunSettings`/`currentWorldSettings`, because those follow
 * `CURRENT_RULES_VERSION` and would quietly become version 2 the moment the constant is raised - and then this reference
 * would be measuring the new rules against themselves.
 */
export function v1World(c: V1Case): World {
  return createWorld({ ...settingsForProfile(c.profile, c.seed, { dynamics: 'rich', immigration: false }), rulesVersion: c.version });
}

export function computeV1Case(c: V1Case): Record<string, V1Point> {
  let w = v1World(c);
  while (w.tick < c.saveAt) stepWorld(w);
  // the continuation: out through the real save path and back in, which is what an existing version-1 world is
  w = deserializeWorld(serializeWorld(w));
  if (w.settings.rulesVersion !== c.version) throw new Error(`the reference world came back as ${String(w.settings.rulesVersion)}, not version ${c.version}`);
  const out: Record<string, V1Point> = {};
  for (const t of c.ticks) {
    while (w.tick < t) stepWorld(w);
    out[String(t)] = v1Point(w);
  }
  return out;
}

export interface V1File {
  note: string;
  cases: Record<string, Record<string, V1Point>>;
}
