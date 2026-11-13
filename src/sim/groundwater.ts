// Rules 236 (the growth stream, `docs/GROWTH_PLAN.md` step D): a well reaches groundwater.
//
// Measured at rules 233 (`scripts/water_probe.ts`, twelve settlements over three years, `review_evidence/growth-20261113/water/`):
// a person draws 2.3 to 2.5 units of water a day; a settlement lives off one body of natural water that only rain refills; a
// well added no water, it drew from the same body (wells.ts, rules 134); and at the measured draw the rain carries 42 to 110
// people, 64 at the middle. A settlement of 112 died of thirst in three days at rules 226. The owner's choice of 13 November
// 2026, of the two put to them: wells reach their own groundwater, so that a settlement grows by digging wells.
//
// Three separately switched parts:
//
//   * GROUND. A well draws from the ground beneath it, not from the lake. The ground at a well holds up to GROUND_CAP units and
//     is refilled by the rain that falls on GROUND_TILES tiles of land, at the rate a tile of lake takes rain (two units a tile
//     a day in full rain; hydrology.ts). Rain measured at 0.29 to 0.60 units a tile a day gives a well 29 to 60 units a day,
//     against the 48 a day a well can raise (one every 50 ticks): about 12 to 20 people a well. It does not evaporate, and in a
//     dry spell nothing comes in. A new well finds GROUND_START units. The lake is as it was.
//   * ANYWHERE. A well may be dug where there is no lake within 14 tiles, and wells may stand WELL_SPACING tiles apart, not 14.
//   * MORE. Wells are wanted as the homes spread: somebody with no well known within WELL_NEAR tiles of home wants one there,
//     whether or not the lake is near; and where the wells they know near home were all empty when they last looked, they want
//     another. Before, a well was wanted only where water was eight tiles or more from home and no well stood within 14.
//
// What is saved: `world.groundwater`, the ground's holding at each well. Rich worlds at rules 236 and later only; rules 235 and
// earlier, authored worlds and a switch thrown keep the well drawing from the lake, its siting and its want as they were.
import { DAY } from './constants';
import { ledgerCreate, ledgerSpoil } from './economy';
import { runsRulesVersion } from './rulesversion';
import type { Building, World } from './types';

/** the land a well drains, in tiles, each taking rain as a tile of lake does */
export const GROUND_TILES = 100;
/** the most the ground at one well holds */
export const GROUND_CAP = 240;
/** what a new well finds */
export const GROUND_START = 120;
/** how near two wells may stand (14 before rules 236) */
export const WELL_SPACING = 6;
/** a well this near home is "the well by us" */
export const WELL_NEAR = 10;
/** the want for a well by the homes where water is near and no well is */
export const WELL_BY_HOMES = 16;
/** the want for another where the wells near home were found empty */
export const WELL_DRAWN_DRY = 28;

const on = { ground: true, anywhere: true, more: true };
export type GroundwaterPart = keyof typeof on;
export const GROUNDWATER_PARTS = Object.keys(on) as GroundwaterPart[];
/** Lab switches (never saved or hashed). */
export const groundwaterPartOn = (part: GroundwaterPart): boolean => on[part];
export function setGroundwater(enabled: boolean, part?: GroundwaterPart): void {
  if (part) on[part] = enabled;
  else for (const k of GROUNDWATER_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 236);
export const hasGroundwater = (world: World): boolean => runs(world) && on.ground;
export const wellsAnywhere = (world: World): boolean => runs(world) && on.anywhere;
export const wantsMoreWells = (world: World): boolean => runs(world) && on.more;

export interface Ground { amount: number; acc: number }

/** GROUND: the ground at this well, made (with what a new well finds) the first time it is asked for; null when the rule is off. */
export function groundAt(world: World, well: Building): Ground | null {
  if (!hasGroundwater(world)) return null;
  const all = (world.groundwater ??= {});
  let g = all[well.id];
  if (!g) {
    g = all[well.id] = { amount: GROUND_START, acc: 0 };
    ledgerCreate(world, 'water', GROUND_START, 'groundwater reached by a new well');
  }
  return g;
}

/** GROUND: rain soaks into the ground at every standing well, every 60 ticks; the ground of a well that is gone is lost. */
export function updateGroundwater(world: World): void {
  if (!hasGroundwater(world) || world.tick % 60 !== 0) return;
  const standing = new Set<number>();
  for (const b of world.buildings) {
    if (b.type !== 'well') continue;
    standing.add(b.id);
    const g = groundAt(world, b)!;
    g.acc += GROUND_TILES * Math.max(0, world.weather.rain) * 2 * (60 / DAY);
    const whole = Math.floor(g.acc);
    g.acc -= whole;
    const taken = Math.min(whole, GROUND_CAP - g.amount);
    if (taken > 0) { g.amount += taken; ledgerCreate(world, 'water', taken, 'rain soaked into the ground at a well'); }
  }
  const all = world.groundwater;
  if (all) for (const k of Object.keys(all)) {
    if (standing.has(Number(k))) continue;
    if (all[Number(k)].amount > 0) ledgerSpoil(world, 'water', all[Number(k)].amount, 'groundwater lost with its well');
    delete all[Number(k)];
  }
}
