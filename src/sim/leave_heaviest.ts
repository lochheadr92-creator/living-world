// Rules version 33: leave the heaviest left-over to free the hands (rich worlds only).
//
// `gatherMaterial` (options_work.ts) quietly offers nothing when the pack has no room for one more of the material a person is
// short of, so someone whose hands are full of wood or stone that nothing they are doing wants can neither gather what they need
// nor be told why. From version 33, in exactly that situation, they may also go and leave the heaviest such left-over at a place
// they already know that would take it - a storehouse, or a shared workplace that accepts that material - and so make room.
//
// The whole of the mechanism is an ordinary `deposit` option and the existing deposit handler (`act_resource.ts`): the unit
// leaves the pack and enters the store through `transfer`, the same ledger entry, store capacity and workplace acceptance
// (`mayDeposit`) as any other deposit. Nothing is claimed or reserved, so there is nothing to release when the trip is
// interrupted: what has not been put down is still in the pack.
//
// What it does NOT do. It reads only the person's own pack, plans, promises and beliefs; it never looks at the world. It never
// leaves anything a plan, a promise, an errand or an open material need of theirs asks for. It is only about wood and stone,
// the two materials every measured stall involved (docs/LEAVE_HEAVIEST.md); processed goods, tools and food are left to the
// chains and options that already move them. No score, weight or threshold of any other option changes, and a world below
// version 33 never reaches it. Lab ablation: `rich-no-leave-heaviest`. Contract and measurement: docs/LEAVE_HEAVIEST.md.
import { newActivity } from './activities';
import { BUILD_DEF, ITEM_LABEL, WEIGHT } from './constants';
import { invRoom } from './economy';
import { freeOf } from './intent';
import { recentFailure } from './knowledge';
import { isRich } from './mood';
import { Scorer, addOption, beliefsByKind, dangerAt, eta, pen, sourceUsable, spotNear, traitMods } from './optutil';
import type { Ctx } from './optutil';
import { acceptedAt, isFacilityType } from './recipes';
import { runsRulesVersion } from './rulesversion';
import type { Belief, BeliefKind, BuildingType, ItemKind, Person } from './types';

export const LEAVE_HEAVIEST_FROM_VERSION = 33;

/** the materials a person may put down for this reason, in the order that breaks a tie in weight */
export const LEAVE_KINDS: readonly ItemKind[] = ['stone', 'wood'];

/** how long a place that turned out not to take it is left alone */
const AVOID_FAILED_PLACE = 300;

let enabled = true;
export const leaveHeaviestOn = (): boolean => enabled;
/** lab switch (`rich-no-leave-heaviest`): removes this mechanism and nothing else */
export function setLeaveHeaviest(on: boolean): void {
  enabled = on;
}

/** What is stopping the gather: the material wanted, how much it is worth, and what the person already has a use for. */
export interface PackStall {
  item: ItemKind;
  /** the urgency the gather would have been offered at (trait-adjusted by the caller, as for the gather itself) */
  base: number;
  why: string;
  /** the kinds of source that give the material */
  sources: BeliefKind[];
  /** the weather and night multiplier the gather would have been scaled by */
  mult: number;
  /** every material any open need of theirs names, whether or not it is still short */
  wanted: ReadonlySet<ItemKind>;
}

/** The heaviest left-over: a carried stack nothing they are doing asks for, weightiest first, or null. Pure. */
export function heaviestLeftover(p: Person, wanted: ReadonlySet<ItemKind>): ItemKind | null {
  let best: ItemKind | null = null;
  let bestWeight = 0;
  for (const k of LEAVE_KINDS) {
    const have = p.inv[k] ?? 0;
    if (have < 1 || wanted.has(k)) continue;
    if (freeOf(p, k) < have) continue; // a private plan of theirs has spoken for some of it
    if (p.commitments.some((c) => c.status === 'active' && c.item === k)) continue; // promised to someone
    if (p.errand && p.errand.item === k) continue; // being carried somewhere
    const w = have * WEIGHT[k];
    if (w > bestWeight) {
      best = k;
      bestWeight = w;
    }
  }
  return best;
}

const unitsIn = (b: Belief): number => Object.entries(b.items ?? {}).reduce((s, [k, n]) => s + (n ?? 0) * WEIGHT[k as ItemKind], 0);

/** the person's own idea of how many of `k` the place could still take */
function believedRoom(b: Belief, k: ItemKind): number {
  const cap = BUILD_DEF[b.btype as BuildingType].cap;
  return Math.floor((cap - unitsIn(b) + 1e-9) / WEIGHT[k]);
}

/** Is this a place anyone may leave `k` at: the storehouse, or a shared workplace whose work uses it? */
function takesIt(b: Belief, k: ItemKind): boolean {
  const type = b.btype as BuildingType;
  if (type === 'storehouse') return true;
  return isFacilityType(type) && (b.hh ?? 0) === 0 && acceptedAt(type).includes(k);
}

/**
 * Offer to leave the heaviest left-over, when a gather the person wants has no room to start. Writes nothing: the activity is
 * only built if this is the option chosen.
 */
export function leaveHeaviestOption(ctx: Ctx, stall: PackStall): void {
  const { world, p } = ctx;
  if (!enabled || !isRich(world) || !runsRulesVersion(world, LEAVE_HEAVIEST_FROM_VERSION)) return;
  // only when hands are the reason: there is no room for one more of what they are short of
  if (invRoom(world, p, stall.item) >= 1) return;
  // and only if there is something to go and gather once there is: a source they believe is worth the walk
  if (!beliefsByKind(p, stall.sources).some((b) => sourceUsable(ctx, b, 1).ok)) return;
  const k = heaviestLeftover(p, stall.wanted);
  if (!k) return;

  let place: Belief | null = null;
  let placeEta = Infinity;
  for (const b of beliefsByKind(p, ['building'])) {
    if (!takesIt(b, k) || believedRoom(b, k) < 1) continue;
    if (recentFailure(world, p, b.id, AVOID_FAILED_PLACE)) continue;
    const e = eta(ctx, b.x, b.y) + 40 * dangerAt(ctx, b.x, b.y);
    if (e < placeEta) {
      place = b;
      placeEta = e;
    }
  }
  if (!place) return;

  const b = place;
  const n = Math.min(p.inv[k] ?? 0, believedRoom(b, k));
  const walk = eta(ctx, b.x, b.y);
  const sc = new Scorer().add(`hands full of ${ITEM_LABEL[k]} that nothing needs`, stall.base * 0.85).add('walking', -pen(walk));
  const dng = dangerAt(ctx, b.x, b.y);
  if (dng > 0) sc.add('wolf nearby', -22 * dng * traitMods(p).caution);
  if (sc.total < 8) return;
  const util = sc.total * stall.mult;
  const where = b.btype === 'storehouse' ? 'the storehouse' : `the ${(b.btype ?? 'workplace').replace('_', ' ')}`;
  addOption(ctx, {
    kind: 'deposit',
    label: `Leave the ${ITEM_LABEL[k]} at ${where}`,
    goal: `to free my hands ${stall.why}`,
    need: null,
    util,
    parts: sc.parts,
    eta: walk + 20,
    key: `leave:${b.id}:${k}`,
    targetId: b.id,
    tag: 'store',
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'deposit',
        label: `Leaving ${n} ${ITEM_LABEL[k]} at ${where}`,
        goal: `to free my hands ${stall.why}`,
        targetId: b.id,
        targetType: 'building',
        tx: b.x,
        ty: b.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 30,
        maxTicks: 600,
        data: { items: { [k]: n }, leftAt: where },
      });
    },
  });
}
