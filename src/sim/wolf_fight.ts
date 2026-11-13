// Rules 239 (the owner's direction, 13 November 2026): a spear wounds, and a wolf can be killed.
//
// Since rules 4 a spear has kept a wolf at arm's length and no more: a stand that succeeds drives the wolf off and "nothing
// is hurt and nothing dies" (defence.ts). The wolves a world begins with are the wolves it has for ever, and the people who
// stand up to them gain nothing by it but a respite of 620 ticks from that one animal.
//
// From 239, in rich worlds:
//   wound  a stand that succeeds wounds the wolf (SPEAR_WOUND, and HELPER_WOUND more for each of up to two people standing
//          with the defender). The wolf still breaks off, as before, unless the wound kills it.
//   kill   a wolf whose wounds reach its whole health dies where it stands and leaves a body (carcass.ts, as a deer does):
//          two meat and a hide, to be butchered by ordinary paid work. Two stands won kill a sound wolf.
//   heal   a wounded wolf mends, one point of health every HEAL_EVERY ticks (five a day, so a wound is gone in ten days):
//          the wolf that dies is the one that keeps coming back.
//
// The numbers were set from four worlds over four years (`scripts/wolf_probe.ts`, `docs/GROWTH_PLAN.md`): a world has three
// wolves, and one of them takes nearly all the stands (4, 7, 6 and none in the four worlds). At a wound of 34 mending ten a
// day two wolves died in the sixteen world-years; at 50 mending five a day the persistent wolf dies at its second to fourth
// stand.
//   back   the country is not emptied: WOLF_RETURN ticks (two years) after a wolf is killed another comes in at a map
//          edge well away from any settlement. The danger eases for a time and does not vanish.
//
// What it is not. Nobody goes looking for wolves: a wolf is wounded only by somebody standing up to one that is threatening
// them or a person they can see, by the unchanged rules of defence.ts. There is no den raid and no armour.
//
// Saved: `world.wolfReturns` (the ticks at which a wolf is due back), present only once a wolf has been killed. A wolf's
// health below 100 enters the world's hash. Four switched parts. Rich worlds at rules 239 and later only.
import { makeCarcass } from './carcass';
import { DAY } from './constants';
import { isWalkable } from './registry';
import { hashString, hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import { nearestHub } from './settlements';
import { T } from './types';
import type { Animal, Person, World } from './types';
import { makeWolf } from './wildlife';

export const WOLF_FIGHT_PARTS = ['wound', 'kill', 'heal', 'back'] as const;
export type WolfFightPart = (typeof WOLF_FIGHT_PARTS)[number];
const on: Record<WolfFightPart, boolean> = { wound: true, kill: true, heal: true, back: true };
/** Lab switch (never saved or hashed): all parts, or one. With `wound` off nothing here happens, as before rules 239. */
export function setWolfFight(enabled: boolean, part?: WolfFightPart): void {
  if (part) on[part] = enabled;
  else for (const k of WOLF_FIGHT_PARTS) on[k] = enabled;
}
export const wolfFightPartOn = (part: WolfFightPart): boolean => on[part];
export const hasWolfFight = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 239);

/** what a won stand takes from a wolf's health (of 100) */
export const SPEAR_WOUND = 50;
/** and what each person standing with the defender adds, for up to two of them */
export const HELPER_WOUND = 8;
/** a wounded wolf mends one point of health every this many ticks */
export const HEAL_EVERY = 480;
/** how long after a wolf is killed another comes into the country */
export const WOLF_RETURN = 24 * DAY;
/** a returning wolf comes in at least this far from any settlement */
export const RETURN_CLEAR = 25;

export type Wound = 'none' | 'wounded' | 'killed';

/** A stand has just been won against this wolf: wound it, and if the wound is its last, kill it and leave its body. */
export function woundWolf(world: World, a: Animal, p: Person, helpers: number): Wound {
  if (!on.wound || !hasWolfFight(world) || a.type !== 'wolf' || a.health <= 0) return 'none';
  const left = a.health - (SPEAR_WOUND + HELPER_WOUND * Math.max(0, Math.min(2, helpers)));
  if (left > 0 || !on.kill) {
    a.health = Math.max(1, left);
    return 'wounded';
  }
  // the body is made from the living animal (carcass.ts refuses one already at nothing), which removes it from the world
  if (!makeCarcass(world, a, p)) {
    a.health = 1;
    return 'wounded';
  }
  if (on.back) (world.wolfReturns ??= []).push(world.tick + WOLF_RETURN);
  return 'killed';
}

const key = (world: World): number => hashString(world.seed) ^ 0x301f;

/** Once a tick: wounded wolves mend, and a wolf that is due comes back into the country. Draws nothing from the world's stream. */
export function updateWolfFight(world: World): void {
  if (!hasWolfFight(world)) return;
  if (on.heal && world.tick % HEAL_EVERY === 0) for (const a of world.animals) if (a.type === 'wolf' && a.health > 0 && a.health < 100) a.health++;
  const due = world.wolfReturns;
  if (!due || world.tick % 100 !== 0) return;
  for (let i = 0; i < due.length; i++) {
    if (due[i] > world.tick) continue;
    const at = edgePoint(world, i);
    if (!at) continue; // nowhere clear to come in today: it tries again in a hundred ticks
    makeWolf(world, at.x + 0.5, at.y + 0.5);
    due.splice(i--, 1);
  }
  if (due.length === 0) delete world.wolfReturns;
}

/** A place on the map's edge for a wolf to come in: open ground, well away from every settlement. */
function edgePoint(world: World, n: number): { x: number; y: number } | null {
  for (let k = 0; k < 24; k++) {
    const edge = Math.floor(hashUnit(key(world), world.tick + n, k * 2 + 1) * 4) % 4;
    const len = edge % 2 === 0 ? world.W : world.H;
    const t = 6 + Math.floor(hashUnit(key(world), world.tick + n, k * 2 + 2) * (len - 12));
    const x = edge === 0 ? t : edge === 1 ? world.W - 4 : edge === 2 ? t : 3;
    const y = edge === 0 ? 3 : edge === 1 ? t : edge === 2 ? world.H - 4 : t;
    if (!isWalkable(world, x, y) || world.terrain[y * world.W + x] === T.SHALLOW) continue;
    const hub = nearestHub(world, x, y);
    if (Math.hypot(hub.x - x, hub.y - y) < RETURN_CLEAR) continue;
    return { x, y };
  }
  return null;
}

/** A saved world's wolf returns are a list of whole ticks, and only where the rule runs. */
export function validateWolfFight(world: World): void {
  const due = world.wolfReturns;
  if (due !== undefined && (!hasWolfFight(world) || !Array.isArray(due) || due.length === 0 || due.some((t) => !Number.isSafeInteger(t) || t <= 0 || t > world.tick + WOLF_RETURN))) throw new Error('invalid save: wolf returns');
  for (const a of world.animals) {
    if (a.type !== 'wolf') continue;
    if (!Number.isFinite(a.health) || a.health > 100 || a.health < 0) throw new Error('invalid save: wolf health');
  }
}
