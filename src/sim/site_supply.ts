// Rules 229 (the growth stream, `docs/GROWTH_PLAN.md` step 5): what a waiting site lacks gets made.
//
// The diagnosis (13 November 2026, `review_evidence/growth-20261113/building-stall/`): in four settlements over six years no
// brick and almost no plank was made, with a kiln and a timber yard standing, and every smithy, house, hall and granary site
// was abandoned short of exactly those. People do plan the buildings and the work is offered; it loses. Measured again at
// rules 228 before this rule was sized (`scripts/supply_probe.ts`, birch and river, the second and third years, daylight only):
//
//   * a step toward planks or bricks was somebody's first choice in 46 of 1,485 looks at which one was offered. It was worth
//     16 at the middle, where the jobs grown people do are worth 32 at the middle (parent_decides.ts), and it was behind the
//     first choice by 19 to 21 at the middle;
//   * sawing was refused for want of a saw 606 times in birch, 501 of them while a saw was in somebody's pack; seven saws had
//     been made and none ever lay at the yard;
//   * the dig or the chop was refused for want of room in the pack 374 times; those packs carried wood and stone (4.6 to 4.9
//     of weight between them), seed, food and tools, and had 1 of weight free where a clay or a stone weighs 3.
//
// And with the worth part alone in place (birch and river again): the step became the first choice in 697 of 1,594 daylight
// looks, "Bring wood to the timber yard" was offered 1,135 times, and the two settlements still made four planks and no brick.
// Read in source: since rules 169 (seen_stock.ts) a sight of a store remembers each kind there as one, or the store as full,
// and the planner took a workshop's stock from that sight (production.ts planRecipe). Three wood at the yard were one, a batch
// of three was always two short, and everybody brought more wood and nobody sawed. Only work that needs one of a thing, or
// nothing, was ever begun (fibre, cut stone), which is what every trace shows.
//
// Four separately switched parts:
//
//   * BENCH. Somebody judging whether a workshop holds what a batch needs counts what its own record shows lying ready for
//     work (FacilitySnapshot inputs and output: taken at the same sight as the glance, and left exact by rules 169, which says
//     so), and so does somebody collecting what a workshop has made (planks waiting at the yard were one plank a trip).
//     The glance still governs everything else: what a house or a storehouse holds, and what is passed on.
//   * WORTH. A made material (planks, bricks and the other workshop goods) that a building site this person knows is waiting
//     for counts for MADE_FOR_SITE more than the site's other needs. The site's own weight (options_work.ts materialNeeds: 34
//     times what the site is to them, plus 4) was set for wood and stone, which are one walk away; planks and bricks are three
//     or four steps away, each step chosen on its own, and each a little cheaper than the last (production.ts planRecipe).
//     The addition brings the first step to about the middle of ordinary work. From rules 230 it is half that (see below).
//   * SAW. Somebody carrying a saw who knows a timber yard they may use with no saw on its rack is offered to leave it there.
//     A saw has no use anywhere else (recipes.ts: sawing planks is the only work that asks for one); left on the rack it is
//     the settlement's (act_resource.ts donateToRack) and whoever saws there uses it at the bench, its maker included.
//   * ROOM. The rule of rules 33 (leave_heaviest.ts: with no room for one more of what they are short of, leave the heaviest
//     left-over of wood or stone at a storehouse or shared workplace they know) applied only to a site's own wood, stone, clay
//     and ore. It now also applies to the clay and the wood a workshop needs for a site's planks and bricks.
//
// Nothing is saved. Rich worlds at rules 229 and later only; rules 228 and earlier, authored worlds and a switch thrown keep
// the glance at the bench, the weights, the saw in its maker's pack and the refusal as they were.
import { newActivity } from './activities';
import { recentFailure } from './knowledge';
import { nightMult } from './options_work';
import { Scorer, addOption, dangerAt, pen, spotNear, traitMods } from './optutil';
import type { Ctx } from './optutil';
import { runsRulesVersion } from './rulesversion';
import { toolsHeldBy } from './toolreg';
import type { Belief, ItemKind, World } from './types';

/** what a made material a known site waits for counts for, beyond the site's other needs, at rules 229 */
export const MADE_FOR_SITE = 18;
/**
 * ... and from rules 230, on the owner's word after the rules-229 lab: half. At 18 the first hall came 4.7 days sooner but
 * buildings stood at 61.0 of condition against 66.1 without the part (larger than chance, 12 of 12 seeds), with tools and people
 * leaning the same way; the bench part, not this one, is what gets the planks and bricks made.
 */
export const MADE_FOR_SITE_HALVED = 9;
let doseOverride: number | null = null;
/** Lab switch (never saved or hashed): hold the worth at a given figure whatever the rules version says; null restores it. */
export function setMadeForSiteDose(dose: number | null): void { doseOverride = dose; }
export const madeForSiteDose = (world: World): number => doseOverride ?? (runsRulesVersion(world, 230) ? MADE_FOR_SITE_HALVED : MADE_FOR_SITE);
/** what leaving the saw at the yard is worth, before the walk: about the middle of ordinary work (at 24 it lost nearly every
 * time: in river two saws stayed in packs for three years while sawing was refused 113 times for want of one) */
export const SAW_TO_YARD = 34;

const on = { bench: true, worth: true, saw: true, room: true };
export type SiteSupplyPart = keyof typeof on;
export const SITE_SUPPLY_PARTS = Object.keys(on) as SiteSupplyPart[];
/** Lab switches (never saved or hashed). */
export const siteSupplyPartOn = (part: SiteSupplyPart): boolean => on[part];
export function setSiteSupply(enabled: boolean, part?: SiteSupplyPart): void {
  if (part) on[part] = enabled;
  else for (const k of SITE_SUPPLY_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 229);

/**
 * BENCH: how many of a batch's material, or of its product waiting to be collected, this person takes a workshop to hold. Since rules 169 (seen_stock.ts) a sight of a store
 * remembers each kind as one, or as full; the workshop's own record of what lay ready for work (FacilitySnapshot inputs and
 * output, taken at the same sight and left exact by rules 169) is what somebody about to work a batch counts.
 */
export function benchStock(world: World, b: Belief, item: ItemKind, glanced: number): number {
  if (!on.bench || !runs(world) || !b.ops) return glanced;
  return Math.max(glanced, b.ops.inputs[item] ?? 0, b.ops.output[item] ?? 0);
}

/** WORTH: what is added to the want for a made material when it is a building site that waits for it. */
export function madeForSiteWorth(world: World, tag: string, siteId: number | undefined): number {
  return on.worth && runs(world) && tag === 'site' && !!siteId ? madeForSiteDose(world) : 0;
}

/** ROOM: whether a workshop's raw material for a site's made goods may be preceded by leaving a left-over (rules 33's rule). */
export function chainLeavesLeftover(world: World, tag: string, siteId: number): boolean {
  return on.room && runs(world) && tag === 'site' && siteId > 0;
}

/**
 * SAW: offer to leave a saw of one's own at the nearest timber yard they may use whose rack, as they remember it, holds none.
 * `yards` is production.ts facilitiesOf(ctx, 'timber_yard'): known, usable, nearest first. Writes nothing: the activity is the
 * ordinary deposit, built only if this is the option chosen.
 */
export function sawToYardOption(ctx: Ctx, yards: { b: Belief; e: number }[]): void {
  const { world, p } = ctx;
  if (!on.saw || !runs(world) || ctx.stage === 'child') return;
  if (!toolsHeldBy(world, p.id, 'saw').some((t) => !t.loan)) return;
  const yard = yards.find((f) => !(f.b.tools ?? []).includes('saw') && !recentFailure(world, p, f.b.id, 300));
  if (!yard) return;
  const b = yard.b;
  const sc = new Scorer().add('a saw is only of use at the timber yard: left there, whoever saws has it', SAW_TO_YARD).add('walking', -pen(yard.e));
  const dng = dangerAt(ctx, b.x, b.y);
  if (dng > 0) sc.add('wolf nearby', -22 * dng * traitMods(p).caution);
  if (sc.total < 8) return;
  const util = sc.total * nightMult(ctx);
  addOption(ctx, {
    kind: 'deposit',
    label: 'Leave the saw at the timber yard',
    goal: 'so whoever saws planks there has it',
    need: null,
    util,
    parts: sc.parts,
    eta: yard.e + 20,
    key: `saw_to_yard:${b.id}`,
    targetId: b.id,
    tag: 'craft',
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, { kind: 'deposit', label: 'Leaving the saw at the timber yard', goal: 'so whoever saws planks there has it', targetId: b.id, targetType: 'building', tx: b.x, ty: b.y, spotX: spot.x, spotY: spot.y, utility: util, minCommit: 20, maxTicks: 600, data: { items: { saw: 1 } } });
    },
  });
}
