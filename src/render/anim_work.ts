// Work (H): the main work motions, told apart by what the person's own record says they are working at. Presentation only.
//
// Gathering was one "pick" for a berry bush, a fruit tree, wild grain and a hay meadow; felling, fishing, sowing, tending,
// harvesting, building, eating and drinking at the water were each one motion whatever was being done. This file reads the
// record (the activity's kind and data, what the person holds) and names a look for each; anim_rig.ts calls `workRig` for these
// ids and characters.ts draws the things they hold (anim_work_props.ts). Nothing here changes a pose, adds a rule or reads a
// random number: the motion follows the activity's own progress (the unit being taken) or the simulation clock.
//
// What each choice reads (the sources are cited at the case):
//   gather: `data.stype` (set by the handler on arrival and by the option that made the activity): berry_bush, fruit_tree,
//           wild_grain, hay_meadow, tree, fish_spot; whether a rod is in the pack (`inv.rod`, fishing_rods.ts)
//   plant / tend / harvest: that the activity's target is a household plot; `tend` also reads `inv.water` (act_farm.ts waters the
//           plot with the water the person carries, else only weeds it)
//   tree_work: `data.op` 'cut' (a living cutting) or 'plant' (a young tree)
//   build: the site the activity points at, and `data.waited` (the builder is standing for want of material)
//   eat / eat_store: `data.food` (what is being eaten) and, for the wipe, how many bites the activity has taken (`activity.cycle`)
//   drink: `data.wx` (the spot at the water), not from the pack, a store or a well
import { clamp } from '../sim/util';
import { hasRods } from '../sim/fishing_rods';
import type { Activity, Person, PoseKind, World } from '../sim/types';
import { R, cycleOf, ease, setBase } from './rig';
import type { PoseCtx, Rig } from './rig';

export type WorkAnimId =
  | 'pick_bush' | 'pick_tree' | 'reap' | 'mow' | 'fell' | 'take_cutting' | 'fish_cast' | 'fish_hand'
  | 'sow' | 'weed' | 'water_crop' | 'plant_tree' | 'raise' | 'eat_stand' | 'drink_shore';

const WORK_ANIMS: ReadonlySet<string> = new Set<WorkAnimId>([
  'pick_bush', 'pick_tree', 'reap', 'mow', 'fell', 'take_cutting', 'fish_cast', 'fish_hand',
  'sow', 'weed', 'water_crop', 'plant_tree', 'raise', 'eat_stand', 'drink_shore',
]);
export const isWorkAnim = (a: string): a is WorkAnimId => WORK_ANIMS.has(a);

/** the tool kind drawn in the right hand for these (characters.ts TOOL_OF: 1 axe, 2 rod, 3 hammer); the rod is dropped there when none is held */
export const WORK_TOOL_OF: Partial<Record<string, number>> = { fell: 1, fish_cast: 2, raise: 3 };

/**
 * The work animation for a person at their work (the activity's work phase), or null when the old pose is the right look.
 * `pose` is the pose the renderer would have shown (the simulation's, with its own corrections for clay, ore and stone already made).
 */
const targetIs = (world: World, a: Activity, ent: 'plot' | 'site'): boolean => world.byId.get(a.targetId)?.ent === ent;

export function workAnimOf(world: World, p: Person, pose: PoseKind, a: Activity): WorkAnimId | 'idle' | null {
  if (a.phase !== 'work') return null;
  const d = a.data;
  switch (a.kind) {
    case 'gather':
      // gatherPose (act_resource.ts): tree -> chop, rock -> mine, fish_spot -> fish, anything else -> pick
      if (pose === 'pick') {
        switch (d.stype) {
          case 'berry_bush': return 'pick_bush';
          case 'fruit_tree': return 'pick_tree';
          case 'wild_grain': return 'reap';
          case 'hay_meadow': return 'mow';
          default: return null; // clay, ore and stone are drawn as digging and mining; nothing else reaches here
        }
      }
      if (pose === 'chop') return d.stype === 'tree' ? 'fell' : null;
      // a rod is drawn only if one is held (and where rods exist at all, nobody is drawn with one they do not have)
      if (pose === 'fish') return d.stype !== 'fish_spot' ? null : hasRods(world) && (p.inv.rod ?? 0) < 1 ? 'fish_hand' : 'fish_cast';
      return null;
    case 'tree_work':
      // forestry.ts: op 'cut' takes a living cutting from a tree (pose chop), op 'plant' sets a young tree (pose plant)
      return d.op === 'cut' && pose === 'chop' ? 'take_cutting' : d.op === 'plant' && pose === 'plant' ? 'plant_tree' : null;
    case 'plant':
      // act_farm.ts: the activity's target is the household plot (it ends at once if the plot is gone)
      return pose === 'plant' && targetIs(world, a, 'plot') ? 'sow' : null;
    case 'tend':
      // the plot is watered with the water the person carries, and only weeded and loosened without it
      return pose === 'tend' && targetIs(world, a, 'plot') ? ((p.inv.water ?? 0) >= 1 ? 'water_crop' : 'weed') : null;
    case 'harvest':
      // a household plot only ever bears grain and seed (Plot.stock, Plot.seedStock): the crop is cut
      return pose === 'harvest' && targetIs(world, a, 'plot') ? 'reap' : null;
    case 'build':
      if (pose !== 'build' || !targetIs(world, a, 'site')) return null;
      // while the site has none of what the next piece needs the builder stands and waits (data.waited counts those ticks)
      return (d.waited ?? 0) > 0 ? 'idle' : 'raise';
    case 'eat':
    case 'eat_store':
      // the handler records what is being eaten (data.food) when the meal begins
      return pose === 'eat' && typeof d.food === 'string' ? 'eat_stand' : null;
    case 'drink':
      // drunk at the water the activity records (data.wx, wy): not from the pack, the household store or a well
      return pose === 'drink' && typeof d.wx === 'number' && !d.fromInv && !d.fromStore && !d.fromWell ? 'drink_shore' : null;
    default:
      return null;
  }
}

const TAU = Math.PI * 2;
const frac = (x: number): number => x - Math.floor(x);
/** 0 before a, 1 after b, eased between */
const ramp = (k: number, a: number, b: number): number => ease(clamp((k - a) / (b - a), 0, 1));
/** rises over a..b, falls over c..d */
const win = (k: number, a: number, b: number, c: number, d: number): number => ramp(k, a, b) - ramp(k, c, d);
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** how far through the unit being taken (a berry, a fish, a bite) the person is: 0..1, smooth between ticks */
function unitOf(p: Person, alphaT: number): number {
  const a = p.activity;
  if (!a) return 0;
  let prog = a.progress;
  if (a.progress >= a.pprogress) prog = a.pprogress + (a.progress - a.pprogress) * alphaT;
  return clamp(prog / Math.max(1, a.duration), 0, 0.9999);
}

export function workRig(anim: WorkAnimId, c: PoseCtx, r: Rig): void {
  const { t, p } = c;
  const id = p.id;
  const a = p.activity;
  const unit = (): number => unitOf(p, c.alphaT);
  /** both hands: forward, sideways, height (left then right) */
  const H = (lu: number, lv: number, lz: number, ru: number, rv: number, rz: number): void => {
    r[R.HLU] = lu;
    r[R.HLV] = lv;
    r[R.HLZ] = lz;
    r[R.HRU] = ru;
    r[R.HRV] = rv;
    r[R.HRZ] = rz;
  };
  /** a hand height above the ground, whatever the crouch (set the crouch first) */
  const Z = (z: number): number => z + r[R.CROUCH] * 0.4;
  const fresh = (): void => {
    setBase(r);
    r[R.BOB] = Math.sin(t * 2.1 + id) * 0.25;
  };
  /** on both knees, or on the right knee with the left foot planted */
  const kneel = (both: boolean, crouch: number, lean: number): void => {
    fresh();
    r[R.KNEEL] = both ? 1 : 0.5;
    r[R.CROUCH] = crouch;
    r[R.LEAN] = lean;
    r[R.FRU] = -0.2;
    r[R.FLU] = both ? -0.2 : 0.13;
    if (!both) r[R.KNZ] = 3.2;
  };

  switch (anim) {
    // ───────────── gathering ─────────────
    case 'pick_bush': {
      // standing at the bush, both hands working in it at chest height; now and then one goes down to the hip to stow what it has
      fresh();
      const k = unit();
      const w = k * TAU * 3;
      const stow = win(k, 0.55, 0.74, 0.9, 1);
      r[R.CROUCH] = 0.3;
      r[R.LEAN] = 0.07 - 0.05 * stow;
      r[R.HEAD_U] = 0.03;
      r[R.HEAD_Z] = -0.2;
      r[R.ELB] = 0.08;
      r[R.FLU] = -0.04;
      r[R.FRU] = 0.06;
      r[R.PH] = stow;
      H(
        0.33 + 0.04 * Math.cos(w), 0.11 + 0.03 * Math.sin(w), Z(20.5 + 2.8 * Math.sin(w)),
        lerp(0.34 + 0.04 * Math.cos(w + 2.2), -0.01, stow), lerp(-0.11 - 0.03 * Math.sin(w + 2.6), -0.125, stow), Z(lerp(19.5 + 2.8 * Math.sin(w + 2.6), 10.6, stow)),
      );
      break;
    }
    case 'pick_tree': {
      // up on the toes, one arm reaching overhead; the fruit comes down to the other arm held at the chest
      fresh();
      const k = unit();
      const up = ramp(k, 0.02, 0.3) * (1 - ramp(k, 0.5, 0.64));
      const down = ramp(k, 0.5, 0.64) * (1 - ramp(k, 0.9, 1));
      r[R.BOB] += 1.7 * up;
      r[R.LEAN] = 0.02 - 0.05 * up + 0.03 * down;
      r[R.HEAD_Z] = 1 * up - 0.3 * down;
      r[R.HEAD_U] = -0.02 * up + 0.03 * down;
      r[R.ELB] = 0.06 * up + 0.04 * down;
      r[R.PH] = down;
      const pluck = Math.max(0, Math.sin(clamp((k - 0.34) / 0.16, 0, 1) * Math.PI)); // the tug that brings it away
      const base = Math.max(up, down);
      H(
        lerp(0.14, 0.16, up) - 0.02 * down, lerp(0.1, 0.07, up) - 0.05 * down, lerp(12, 28, up) + down,
        0.11 + 0.1 * down + 0.02 * pluck, -0.1 + 0.06 * down, (1 - base) * 12 + up * (33.6 - 1.4 * pluck) + down * 16,
      );
      break;
    }
    case 'reap': {
      // bent low, one hand gathering the stalks while the other cuts across in a sweep; then up to bundle them at the chest
      fresh();
      // a field plot is cut in one go (the whole activity), wild grain a handful at a time; either way the end is the bundle
      const kk = a && a.kind === 'harvest' ? frac(unit() * 2) : unit();
      const stand = ramp(kk, 0.52, 0.64) * (1 - ramp(kk, 0.88, 1));
      const bent = 1 - stand;
      const sweep = ramp(kk, 0.12, 0.46);
      r[R.CROUCH] = 1.6 * bent + 0.3 * stand;
      r[R.LEAN] = 0.4 * bent + 0.03 * stand;
      r[R.HEAD_U] = 0.09 * bent;
      r[R.HEAD_Z] = -1.4 * bent;
      r[R.SPIN] = bent * (0.3 - 0.5 * sweep);
      r[R.FLU] = -0.06;
      r[R.FRU] = 0.1;
      r[R.PH] = stand;
      const tie = Math.sin(kk * TAU * 5) * 0.02 * stand;
      H(
        lerp(0.52, 0.2, stand) + tie, lerp(0.08, 0.04, stand), Z(lerp(3, 15.5, stand)),
        lerp(0.48 - 0.03 * sweep, 0.2, stand) - tie, lerp(0.26 - 0.54 * sweep, -0.04, stand), Z(lerp(2.4 + 1.8 * Math.sin(sweep * Math.PI), 14.5, stand)),
      );
      break;
    }
    case 'mow': {
      // feet wide, both arms swinging broadly from one side to the other at the hip, a step on the beat; every third swing a stand to ease the back
      fresh();
      const M = 6;
      const m = frac(t / M + id * 0.37);
      const rest = ramp(m, 0.72, 0.78) * (1 - ramp(m, 0.95, 1));
      const sw = Math.sin((m / 0.75) * 3 * TAU) * (1 - rest);
      const mid = 1 - sw * sw;
      r[R.CROUCH] = lerp(1.3, 0, rest);
      r[R.LEAN] = lerp(0.1 + 0.05 * mid, -0.06, rest);
      r[R.SPIN] = -0.75 * sw;
      r[R.HEAD_U] = lerp(0.04, 0, rest);
      r[R.HEAD_Z] = 0.6 * rest;
      r[R.FLV] = 0.15;
      r[R.FRV] = -0.15;
      const stepL = win(frac(m / 0.25), 0.78, 0.9, 0.96, 1) * (1 - rest);
      const stepR = win(frac(m / 0.25 + 0.5), 0.78, 0.9, 0.96, 1) * (1 - rest);
      r[R.FLU] = -0.1 + 0.12 * stepL;
      r[R.FRU] = 0.1 + 0.1 * stepR;
      r[R.FLL] = 2 * stepL;
      r[R.FRL] = 2 * stepR;
      r[R.ELB] = 0.04 * rest;
      H(
        lerp(0.2 + 0.18 * mid, -0.08, rest), lerp(0.4 * sw + 0.04, 0.1, rest), Z(lerp(9.6 + 1.5 * mid, 12.5, rest)),
        lerp(0.2 + 0.18 * mid, -0.08, rest), lerp(0.4 * sw - 0.04, -0.1, rest), Z(lerp(8.6 + 1.5 * mid, 12.5, rest)),
      );
      break;
    }

    // ───────────── felling ─────────────
    case 'fell': {
      // feet planted wide and the whole body turning into each full swing; after a few strokes a pause to straighten and wipe the brow
      fresh();
      const M = 5.2;
      const m = frac(t / M + id * 0.173);
      const pause = ramp(m, 0.76, 0.82) * (1 - ramp(m, 0.96, 1));
      const s = frac(m / 0.76 * 4);
      const sIn = m < 0.76 ? s : 0;
      // wound up behind the shoulder (w), and just after the blow, the weight gone into it (h)
      const wnd = sIn < 0.55 ? ease(sIn / 0.55) : sIn < 0.66 ? 1 - (sIn - 0.55) / 0.11 : 0;
      const hit = sIn < 0.55 ? 0 : sIn < 0.66 ? (sIn - 0.55) / 0.11 : 1 - ease((sIn - 0.66) / 0.34);
      const rest = Math.max(0, 1 - wnd - hit);
      const sw = 1 - pause;
      r[R.FLU] = lerp(-0.15, -0.1, pause);
      r[R.FRU] = lerp(0.15, 0.1, pause);
      r[R.FLV] = 0.11;
      r[R.FRV] = -0.11;
      r[R.SPIN] = sw * (0.7 * wnd - 0.45 * hit);
      r[R.LEAN] = sw * (0.04 - 0.07 * wnd + 0.19 * hit) + pause * -0.03;
      r[R.CROUCH] = sw * (1 + 0.6 * wnd + 1.1 * hit);
      r[R.HEAD_U] = sw * 0.03 * hit;
      r[R.HEAD_Z] = pause * 0.55;
      r[R.BOB] += pause * Math.sin(t * 7 + id) * 0.4;
      r[R.MOUTH] = pause > 0.5 && Math.sin(t * 5 + id) > -0.2 ? 1 : 0;
      r[R.ELB] = 0.075 * pause;
      r[R.TOOL] = sw * (0.15 * rest + 1.75 * wnd - 0.6 * hit) + pause * -1.25;
      const wipe = Math.sin(t * 8 + id) * 0.035;
      H(
        sw * (0.1 * rest - 0.05 * wnd + 0.32 * hit) + pause * -0.01, sw * (0.08 * rest + 0.1 * wnd + 0.04 * hit) + pause * 0.12, Z(sw * (14 * rest + 24 * wnd + 6.5 * hit) + pause * 12.2),
        sw * (0.18 * rest - 0.03 * wnd + 0.36 * hit) + pause * 0.1, sw * (-0.07 * rest - 0.12 * wnd - 0.05 * hit) + pause * (-0.03 + wipe), Z(sw * (14 * rest + 29 * wnd + 7.5 * hit) + pause * 26.4),
      );
      break;
    }
    case 'take_cutting': {
      // taking a living cutting: a hand holding the branch down at head height, the other making short strokes at it
      fresh();
      const k = unit();
      const done = ramp(k, 0.86, 0.96);
      r[R.LEAN] = 0.0;
      r[R.BOB] += 1.4 * (1 - done);
      r[R.HEAD_Z] = 0.9 * (1 - done);
      r[R.HEAD_U] = -0.02;
      r[R.FLU] = -0.06;
      r[R.FRU] = 0.08;
      r[R.ELB] = 0.06;
      const cut = Math.sin(k * TAU * 8) * (1 - done);
      H(
        lerp(0.12, 0.17, done), lerp(0.12, 0.06, done), lerp(32, 17, done),
        lerp(0.22 + 0.06 * cut, 0.2, done), lerp(-0.07, -0.07, done), lerp(33.2 + 1.6 * cut, 16, done),
      );
      r[R.PH] = done;
      break;
    }

    // ───────────── fishing ─────────────
    case 'fish_cast': {
      // a cast, a long still wait with small twitches of the rod, then a sharp strike and the haul
      fresh();
      const k = unit();
      const back = ramp(k, 0, 0.1) * (1 - ramp(k, 0.1, 0.18)); // the rod drawn back
      const out = ramp(k, 0.1, 0.18);
      const strike = ramp(k, 0.8, 0.86);
      const haul = ramp(k, 0.9, 0.96) * (1 - ramp(k, 0.97, 1));
      const twitch = 0.16 * win(k, 0.33, 0.35, 0.37, 0.39) + 0.22 * win(k, 0.5, 0.52, 0.54, 0.56) + 0.14 * win(k, 0.64, 0.66, 0.68, 0.7);
      const held = out * (1 - strike);
      r[R.FLU] = -0.05;
      r[R.FRU] = 0.1;
      r[R.FLV] = 0.1;
      r[R.FRV] = -0.1;
      r[R.LEAN] = 0.04 - 0.06 * back - 0.1 * strike;
      r[R.HEAD_Z] = 0.6 * strike;
      r[R.HEAD_U] = 0.02 * (1 - strike);
      r[R.PH] = haul;
      r[R.TOOL] = 0.5 * held + 1.9 * back + 1.32 * strike - 0.25 * ramp(k, 0.97, 1) + twitch * held;
      r[R.MOUTH] = strike > 0.5 && haul < 0.5 ? 1 : 0;
      H(
        lerp(0.12, 0.18, strike) + 0.05 * haul, lerp(0.06, 0.1, strike), lerp(11.5 + 5 * back, 25, strike) - 14 * haul + 3 * back,
        lerp(0.26, 0.14, back) + 0.04 * strike, -0.1, lerp(14.5, 23, back) + (twitch * 10) * held + 11 * strike - 5 * haul,
      );
      break;
    }
    case 'fish_hand': {
      // no rod: down on a knee at the edge, both hands in the water, still; then a snatch and the catch held up
      kneel(false, 6.2, 0.26);
      const k = unit();
      const into = ramp(k, 0, 0.14);
      const snatch = ramp(k, 0.8, 0.86);
      const up = ramp(k, 0.86, 0.94);
      const trem = Math.sin(t * 9 + id) * 0.012 + Math.sin(t * 5.3 + id) * 0.01;
      r[R.HEAD_U] = 0.08;
      r[R.HEAD_Z] = -1.2 + 0.6 * up;
      r[R.LEAN] = 0.26 - 0.1 * up;
      r[R.PH] = up * (1 - ramp(k, 0.98, 1));
      H(
        lerp(0.16, 0.42, into) - 0.22 * up - 0.02 * snatch, 0.07 - 0.05 * snatch, Z(lerp(8, 1.4, into) + 12 * up) + trem * 8,
        lerp(0.16, 0.42, into) - 0.22 * up - 0.02 * snatch, -0.07 + 0.05 * snatch, Z(lerp(8, 1.2, into) + 12 * up) - trem * 8,
      );
      break;
    }

    // ───────────── farming ─────────────
    case 'sow': {
      // on one knee at the bed: a seed from the pouch, pressed in, covered; then shuffling along to the next
      kneel(false, 4.8, 0.21);
      const k = unit();
      const p1 = win(k, 0.12, 0.3, 0.4, 0.5); // down to the ground at the first spot
      const p2 = win(k, 0.56, 0.72, 0.82, 0.92);
      const down = Math.max(p1, p2);
      const shuf = ramp(k, 0.5, 0.58);
      const press = Math.sin(k * TAU * 6) * 0.5 + 0.5;
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -0.9;
      r[R.FLU] = 0.13 + 0.12 * shuf;
      r[R.LEAN] = 0.21 + 0.03 * shuf;
      r[R.ELB] = 0.03;
      H(
        0.16, 0.1, Z(9 - 0.8 * down),
        lerp(0.17, 0.34 + 0.04 * shuf, down), lerp(-0.1, -0.06 - 0.08 * shuf, down), Z(lerp(9, 1.6 + 1.1 * press * down, down)),
      );
      break;
    }
    case 'weed': {
      // on both knees: each hand grips a weed, pulls it up and tosses it aside, one after the other
      kneel(true, 5.4, 0.24);
      const k = unit();
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -0.8;
      /** one hand's round: down to the ground (0..0.2), the weed pulled up and back, tossed out to the side, back down */
      const arm = (ph: number, side: number): [number, number, number] => {
        const pu = ramp(ph, 0.2, 0.42);
        const to = ramp(ph, 0.42, 0.54);
        const rt = ramp(ph, 0.62, 0.95);
        return [
          0.34 + (0.14 - 0.34) * pu + (0.02 - 0.14) * to - (0.02 - 0.34) * rt,
          side * (0.06 + (0.05 - 0.06) * pu + (0.36 - 0.05) * to - (0.36 - 0.06) * rt),
          2.6 + (11 - 2.6) * pu + (13.4 - 11) * to - (13.4 - 2.6) * rt,
        ];
      };
      const pr = arm(frac(k * 2), -1);
      const pl = arm(frac(k * 2 + 0.5), 1);
      r[R.LEAN] = 0.24 - 0.05 * Math.max(0, Math.sin(frac(k * 2) * TAU));
      H(pl[0], pl[1], Z(pl[2]), pr[0], pr[1], Z(pr[2]));
      break;
    }
    case 'water_crop': {
      // standing over the bed with the jar held in both hands, tipping it and sweeping the pour along
      fresh();
      const k = unit();
      const tip = win(k, 0.12, 0.34, 0.76, 0.94);
      const sweep = Math.sin(k * TAU * 1.5) * tip;
      r[R.CROUCH] = 1.4;
      r[R.LEAN] = 0.12 + 0.02 * tip;
      r[R.HEAD_U] = 0.04;
      r[R.HEAD_Z] = -0.5;
      r[R.FLU] = -0.04;
      r[R.FRU] = 0.07;
      r[R.PH] = tip;
      H(0.3 - 0.02 * tip, 0.06 + 0.08 * sweep, Z(10.5 + 0.5 * tip), 0.32 + 0.03 * tip, -0.06 + 0.08 * sweep, Z(13 + 4 * tip));
      break;
    }
    case 'plant_tree': {
      // on both knees: scooping the earth out with both hands, setting the young tree upright, firming the earth round it
      kneel(true, 5.6, 0.2);
      const k = unit();
      const dig = win(k, 0.02, 0.08, 0.38, 0.44);
      const set = win(k, 0.42, 0.5, 0.7, 0.76);
      const firm = win(k, 0.74, 0.8, 0.96, 1);
      const rest = Math.max(0, 1 - dig - set - firm);
      const sw = Math.sin(k * TAU * 6);
      const press = Math.sin(k * TAU * 8) * 0.5 + 0.5;
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -0.9;
      r[R.LEAN] = 0.2 + 0.05 * dig + 0.03 * firm;
      r[R.PH] = set;
      // each hand: resting, digging (out to the ground and back between the knees), holding / packing, pressing down
      const dl = 0.5 + 0.5 * sw;
      const dr = 0.5 - 0.5 * sw;
      H(
        rest * 0.3 + dig * (0.4 - 0.28 * dl) + set * 0.27 + firm * (0.3 - 0.03 * press), 0.08 * rest + 0.14 * dig + 0.1 * set + 0.09 * firm, Z(4 * rest + dig * (2.2 + 4.4 * dl) + set * (3 + 1.2 * press) + firm * (2.6 - 1.4 * press)),
        rest * 0.3 + dig * (0.4 - 0.28 * dr) + set * 0.4 + firm * (0.3 - 0.03 * (1 - press)), -0.08 * rest - 0.14 * dig - 0.03 * set - 0.09 * firm, Z(4 * rest + dig * (2.2 + 4.4 * dr) + set * 8.5 + firm * (2.6 - 1.4 * (1 - press))),
      );
      break;
    }

    // ───────────── building ─────────────
    case 'raise': {
      // bending to the ground for a piece, up with it to the chest, setting it against the frame, then three blows of the hammer
      fresh();
      const k = cycleOf(p, c.alphaT, 42);
      const low = clamp(1 - ramp(k, 0.06, 0.26) + ramp(k, 0.9, 1), 0, 1); // 1 down at the pile, 0 standing at the frame
      const set = ramp(k, 0.26, 0.36); // the piece goes forward to the frame
      const carry = ramp(k, 0.03, 0.08) * (1 - ramp(k, 0.34, 0.38)); // the piece is in the hands
      const blow = (from: number): number => Math.pow(Math.max(0, Math.sin(clamp((k - from) / 0.13, 0, 1) * Math.PI)), 1.5);
      const strike = Math.max(blow(0.4), blow(0.56), blow(0.72));
      const frame = ramp(k, 0.36, 0.4) * (1 - ramp(k, 0.88, 0.94)); // 1 while one hand holds the piece in place and the other strikes
      r[R.CROUCH] = 1.2 + 3.6 * low;
      r[R.LEAN] = 0.1 + 0.12 * low;
      r[R.HEAD_U] = 0.05 * low;
      r[R.HEAD_Z] = -0.6 * low;
      r[R.FLU] = -0.05;
      r[R.FRU] = 0.08;
      r[R.FLV] = 0.1 + 0.04 * low;
      r[R.FRV] = -0.1 - 0.04 * low;
      r[R.PH] = carry;
      // the hammer hangs from the hand while both hands are on the piece
      r[R.TOOL] = lerp(0.9 - strike * 1.5, -1.3, carry);
      // both hands on the piece (at the pile, at the chest, forward at the frame); then the left holds it and the right strikes
      const pieceU = 0.3 + 0.11 * set;
      const pieceZ = lerp(16, 3, low) + 1.5 * set;
      H(
        lerp(pieceU, 0.4, frame), 0.07, Z(lerp(pieceZ, lerp(17, 4, low), frame)),
        lerp(pieceU, 0.2 + 0.4 * strike * 0.5, frame), -0.07, Z(lerp(pieceZ, lerp(15.5 + (1 - strike) * 9, 4, low), frame)),
      );
      break;
    }

    // ───────────── eating and drinking ─────────────
    case 'eat_stand': {
      // food held at the chest in both hands; a bite taken with the head going to it, chewed with the head bobbing and the mouth
      // working; every third bite the back of the hand is wiped across the mouth
      fresh();
      const k = unit();
      const wiping = (a ? a.cycle : 0) % 3 === 2;
      const toMouth = win(k, 0.02, 0.22, 0.34, 0.5);
      const chew = ramp(k, 0.3, 0.4) * (1 - ramp(k, 0.9, 1));
      const swallow = win(k, 0.8, 0.86, 0.9, 0.96) * (wiping ? 0 : 1);
      const wipe = wiping ? win(k, 0.6, 0.7, 0.9, 0.98) : 0;
      const swipe = wiping ? Math.sin(clamp((k - 0.64) / 0.3, 0, 1) * TAU * 1.5) : 0;
      const bob = Math.sin(t * 15 + id) * chew;
      r[R.FLU] = -0.05;
      r[R.FRU] = 0.07;
      r[R.LEAN] = 0.03 + 0.07 * toMouth;
      r[R.HEAD_U] = 0.04 * toMouth;
      r[R.HEAD_Z] = -0.9 * toMouth + 0.45 * bob + 0.7 * swallow;
      r[R.MOUTH] = toMouth > 0.8 || (chew > 0.5 && bob > -0.2) ? 1 : 0;
      r[R.PH] = 1; // the food is in the hand
      r[R.ELB] = 0.05 * (1 - wipe) + 0.08 * wipe;
      H(
        lerp(0.19, 0.1, wipe), lerp(0.05, 0.03 + 0.05 * swipe, wipe), lerp(13, 25, wipe),
        lerp(0.2, 0.08, toMouth), lerp(-0.05, -0.02, toMouth), lerp(14.5, 25.2, toMouth),
      );
      break;
    }
    case 'drink_shore': {
      // down on a knee at the edge: both hands cupped into the water, up to the mouth, a pause, again
      kneel(false, 5.2, 0.2);
      const m = frac(t / 2.9 + id * 0.29);
      const dip = win(m, 0, 0.2, 0.26, 0.4);
      const lift = ramp(m, 0.26, 0.42) * (1 - ramp(m, 0.7, 0.8));
      const drink = win(m, 0.42, 0.5, 0.62, 0.7);
      const pause = ramp(m, 0.7, 0.8) * (1 - ramp(m, 0.92, 1));
      const rest = Math.max(0, 1 - dip - lift - pause);
      r[R.LEAN] = 0.2 + 0.1 * dip - 0.08 * lift - 0.06 * pause;
      r[R.HEAD_U] = 0.03 + 0.06 * dip - 0.03 * drink;
      r[R.HEAD_Z] = -0.8 * dip + 0.5 * drink + 0.3 * pause;
      r[R.MOUTH] = drink > 0.4 ? 1 : 0;
      r[R.ELB] = 0.03 * lift;
      r[R.BOB] += 0.25 * pause * Math.sin(t * 3 + id);
      const hu = rest * 0.14 + dip * 0.4 + lift * 0.15 + pause * 0.12;
      const hz = rest * 6 + dip * 1.6 + lift * (15 + 4 * drink) + pause * 7;
      const hv = 0.02 + 0.04 * (1 - lift);
      H(hu, hv, Z(hz), hu, -hv, Z(hz));
      break;
    }
    default:
      setBase(r);
  }
}
