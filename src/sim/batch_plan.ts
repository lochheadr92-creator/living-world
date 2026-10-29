// A BATCH PLAN: seeing a wanted workshop product through (rules version 50, rich worlds only).
//
// What the 45-day chain audits of ordinary rules-48 worlds showed (chain_evidence/audit-45-*): every seed wanted planks, bricks
// and water jars constantly (jars by 9-18 people, thousands of sampled wants) and carts by a few, the workshops stood, the
// single steps were offered - dig clay, bring it to the kiln, fire it, collect it, carry it to the site - and yet a kiln fired
// four batches of bricks in 29 days, no jar was ever fired, no handle was ever made, and house sites waited weeks at 6 %. The
// reason is structural, not a missing recipe: the supply planner (production.ts) re-derives each leaf at every decision, weights
// it a little less at each stage, and keeps nothing between steps, so a person who dug clay this morning has no more reason to
// take it to the kiln this afternoon than anyone else has. Hand tools already had the answer: a private plan (intent.ts) that
// persists, speaks for its materials and nudges its own next step by NUDGE. This module gives the same to one batch at a known
// workshop: "fire bricks at the kiln for the house", "fire a water jar", "make handles for the cart".
//
// The plan adds no option of its own. Every step it names is an option the planner already offers for the same want - gather or
// collect the input (yields it), bring it to the workshop (deposit there), run the recipe (operate), collect the output, haul it
// to the site - and the plan only says which of them is its step now, so that the decision's existing nudge recognises it.
// It reads the person's own beliefs about the workshop and the sources, nothing else; it needs the recipe's tool in their own
// pack or on the rack, the technique if the recipe has one, and a known source for every raw input before it is taken up, so it
// is not a plan that cannot be fed. It ends when the goods reached their use, or with a stated reason: time up, the workshop or
// the site gone, nobody able to supply an input. One such plan at a time, after food, shelter, roof and tool plans.
import type { Belief, ItemKind, Items, Person, World } from './types';
import type { Ctx, Option } from './optutil';
import { DAY } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import { RECIPE_BY_ID, recipesMaking } from './recipes';
import type { Recipe } from './recipes';
import { demandsOf, facilitiesOf, toolAvailable } from './production';
import { techniqueBlocker } from './techniques';
import { isRawMaterial } from './options_work';
import { rankWaterSpots } from './optutil';
import { hasKnownResource, setBatchHooks } from './intent';
import type { Intention } from './types';

export const BATCH_FROM_VERSION = 50;
/** a want worth a plan: the planner's base weight for it, after traits */
export const BATCH_MIN_BASE = 8;
/** how long a batch plan is given: two trips for the inputs, the work, a burn of up to 420 ticks and the collection do not fit in two days */
export const BATCH_PATIENCE = DAY * 3;
/** what a batch plan may be about: the workshop products the planner wants, plus the two things fired or built from them */
export const BATCH_ITEMS: ReadonlySet<string> = new Set(['planks', 'handles', 'bricks', 'charcoal', 'iron', 'flour', 'bread', 'jar', 'cart']);

let enabled = true;
export const batchPlansOn = (): boolean => enabled;
/** Lab switch `rich-no-batch-plans`: no batch plan is adopted; every option stays as it was; no effect below rules 50. */
export function setBatchPlans(on: boolean): void {
  enabled = on;
}
export const hasBatchPlans = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, BATCH_FROM_VERSION);

const unitsOf = (n: number | undefined): number => n ?? 0;
const stockAt = (b: Belief, item: ItemKind): number => unitsOf(b.items?.[item]);
/** everything a recipe takes, inputs and fuel together */
function takes(r: Recipe): Items {
  const need: Items = {};
  for (const k of Object.keys(r.inputs) as ItemKind[]) need[k] = unitsOf(need[k]) + unitsOf(r.inputs[k]);
  for (const k of Object.keys(r.fuel) as ItemKind[]) need[k] = unitsOf(need[k]) + unitsOf(r.fuel[k]);
  return need;
}

export interface BatchWant {
  item: string;
  recipe: string;
  facilityId: number;
  qty: number;
  forSite: number;
  why: string;
  wants: Partial<Items>;
}

/**
 * Pure. The batch this person would take on now, or null. Judged from the planner's own wants (demandsOf), the workshops they
 * know and may use, their own tools, their technique, and whether every raw input the shelf lacks has a known source.
 */
export function batchWanted(ctx: Ctx): BatchWant | null {
  const { world, p } = ctx;
  if (!hasBatchPlans(world) || ctx.stage === 'child') return null;
  const wants = demandsOf(ctx).filter((d) => BATCH_ITEMS.has(String(d.item)) && d.base >= BATCH_MIN_BASE).sort((a, b) => b.base - a.base);
  for (const d of wants) {
    const item = String(d.item);
    const recipes = item === 'cart' ? [RECIPE_BY_ID.build_cart] : recipesMaking(d.item as ItemKind);
    for (const r of recipes) {
      if (!r) continue;
      const fac = facilitiesOf(ctx, r.at)[0];
      if (!fac) continue;
      if (techniqueBlocker(world, p, r.id)) continue;
      if (!toolAvailable(ctx, fac, r)) continue;
      // one workshop at a time: a processed input the shelf and the pack lack is this plan's to make only when the same workshop
      // makes it from raw inputs the person knows a source of (handles before a cart at the yard, flour before bread at the bakery)
      const need = takes(r);
      const short: Partial<Items> = {};
      let feasible = true;
      for (const k of Object.keys(need) as ItemKind[]) {
        const lack = unitsOf(need[k]) - stockAt(fac.b, k) - unitsOf(p.inv[k]);
        if (lack <= 0) continue;
        if (knownInput(ctx, k)) {
          short[k] = lack;
          continue;
        }
        const sub = stageBefore(world, ctx, fac, r, k);
        if (!sub) {
          feasible = false;
          break;
        }
        for (const kk of Object.keys(takes(sub)) as ItemKind[]) {
          const lack2 = unitsOf(takes(sub)[kk]) - stockAt(fac.b, kk) - unitsOf(p.inv[kk]);
          if (lack2 > 0) short[kk] = unitsOf(short[kk]) + lack2;
        }
      }
      if (!feasible) continue;
      const qty = item === 'cart' ? 1 : r.toolOut ? 1 : Math.max(1, unitsOf(r.outputs[d.item as ItemKind]));
      return { item, recipe: r.id, facilityId: fac.b.id, qty, forSite: d.siteId ?? 0, why: d.why, wants: short };
    }
  }
  return null;
}

/** A raw input the person knows a source of, or water they know where to find. */
function knownInput(ctx: Ctx, k: ItemKind): boolean {
  if (k === 'water') return rankWaterSpots(ctx, 1).length > 0; // water is known by its own belief ids; the planner's own ranking says so
  return isRawMaterial(k) && hasKnownResource(ctx.world, ctx.p, k);
}

/**
 * The stage before: a recipe at the SAME workshop that makes a processed input the main recipe lacks, which this person could run
 * (technique, tool) from raw inputs they know. One stage only: the batch plan is one workshop, not the whole tree.
 */
function stageBefore(world: World, ctx: Ctx, fac: { b: Belief }, main: Recipe, k: ItemKind): Recipe | null {
  const { p } = ctx;
  for (const sub of recipesMaking(k)) {
    if (sub.at !== main.at || sub.id === main.id) continue;
    if (techniqueBlocker(world, p, sub.id)) continue;
    if (!toolAvailable(ctx, fac as never, sub)) continue;
    const need = takes(sub);
    const ok = (Object.keys(need) as ItemKind[]).every((kk) => unitsOf(need[kk]) - stockAt(fac.b, kk) - unitsOf(p.inv[kk]) <= 0 || knownInput(ctx, kk));
    if (ok) return sub;
  }
  return null;
}

/** "the fired bricks", "a water jar": a recipe's label with its own article kept and "the" put before the rest. */
const named = (r: Recipe): string => (/^an? /.test(r.label) ? r.label : `the ${r.label}`);

type Step = { kind: Intention['stepKind']; target: number; item: ItemKind | null; step: string; key: string | null; blocked: string };

/** The step that serves a batch plan now, from the person's beliefs about the workshop and their own pack. */
export function batchStep(ctx: Ctx, i: Intention): Step {
  const { world, p } = ctx;
  const b = p.beliefs[i.aboutId];
  const r = i.recipe ? RECIPE_BY_ID[i.recipe] : undefined;
  if (!b || b.kind !== 'building' || !r) return { kind: 'none', target: 0, item: null, step: 'find the workshop again', key: null, blocked: 'the workshop is no longer one they know of' };
  const made = i.makes as ItemKind;
  const held = i.makes === 'cart' ? 0 : unitsOf(p.inv[made]);
  // some of the goods are in hand and they were for a site: take what is held there (a pack may carry a batch a few at a time)
  if (held >= 1 && i.forSite && i.worked < (i.reserve ?? 1)) {
    const site = p.beliefs[i.forSite];
    if (!site || site.kind !== 'site') return { kind: 'none', target: 0, item: null, step: `find the site the ${i.makes} were for`, key: null, blocked: 'the site is no longer one they know of' };
    return { kind: 'deliver', target: i.forSite, item: made, step: `take the ${i.makes} to the site`, key: `haul:${i.forSite}`, blocked: '' };
  }
  // the batch they started: wait for it, then collect it
  const snap = b.ops;
  const mine = snap && snap.job === r.id && snap.client === p.id;
  // as the person remembers it: the batch they started is still burning (wait), or should be ready by the time they get there
  // (the planner's collect option counts a ready batch of theirs the same way), or its output was seen on the shelf
  // left in its work phase (as last seen): get back to it, which the planner offers for one's own batch (facilities.ts resumableJob)
  if (mine && snap.burn === 0 && snap.progress < 1) return { kind: 'make', target: b.id, item: null, step: `get back to ${r.doing.toLowerCase()}`, key: `operate:${b.id}:${r.id}`, blocked: '' };
  if (mine && snap.readyAt > world.tick + 300) return { kind: 'none', target: b.id, item: null, step: `wait for the ${r.label} at the ${b.btype?.replace('_', ' ')}`, key: null, blocked: '' };
  // (a 'make' step with the collect key, not a 'get': a 'get' is a fetch from a natural source, and the rules-34 review would
  // relinquish a plan fetching bricks from nowhere; the output is on the shelf, and the option that collects it is matched by key)
  if (i.makes !== 'cart' && (stockAt(b, made) >= 1 || mine)) return { kind: 'make', target: b.id, item: made, step: `collect the ${i.makes} from the ${b.btype?.replace('_', ' ')}`, key: `collect:${b.id}:${i.makes}`, blocked: '' };
  // inputs the shelf lacks: fetch what the pack lacks, bring what it holds; a processed input the same workshop makes is made first
  const inputSteps = (rr: Recipe): Step | null => {
    const need = takes(rr);
    const toBring: ItemKind[] = [];
    for (const k of Object.keys(need) as ItemKind[]) {
      const onShelf = stockAt(b, k);
      const lack = unitsOf(need[k]) - onShelf;
      if (lack <= 0) continue;
      const have = unitsOf(p.inv[k]);
      if (have >= lack) {
        toBring.push(k);
        continue;
      }
      if (knownInput(ctx, k) || isRawMaterial(k)) return { kind: 'get', target: 0, item: k, step: `get ${lack - have} more ${k} for ${named(rr)}`, key: null, blocked: '' };
      // the stage before, as last seen: a batch of ours making it is still being worked (get back to it) or burning (wait);
      // otherwise a recipe here that makes it from what we know
      const running = snap && snap.client === p.id && snap.job ? RECIPE_BY_ID[snap.job] : undefined;
      const subRunning = running && running.at === rr.at && unitsOf(running.outputs[k]) > 0 ? running : null;
      if (subRunning && snap!.burn === 0 && snap!.progress < 1) return { kind: 'make', target: b.id, item: null, step: `get back to ${subRunning.doing.toLowerCase()}`, key: `operate:${b.id}:${subRunning.id}`, blocked: '' };
      if (subRunning && snap!.readyAt > world.tick + 300) return { kind: 'none', target: b.id, item: null, step: `wait for the ${subRunning.label} at the ${b.btype?.replace('_', ' ')}`, key: null, blocked: '' };
      const sub = subRunning ?? stageBefore(world, ctx, { b }, rr, k);
      if (!sub) return { kind: 'none', target: b.id, item: k, step: `find ${lack - have} ${k} for ${named(rr)}`, key: null, blocked: `no way to get ${k} here` };
      const before = subRunning ? null : inputSteps(sub);
      if (before) return before;
      return { kind: 'make', target: b.id, item: null, step: `${sub.doing.toLowerCase()} first, for ${named(rr)}`, key: `operate:${b.id}:${sub.id}`, blocked: '' };
    }
    if (toBring.length) return { kind: 'store', target: b.id, item: toBring[0], step: `take the ${toBring.join(' and ')} to the ${b.btype?.replace('_', ' ')}`, key: null, blocked: '' };
    return null;
  };
  const pending = inputSteps(r);
  if (pending) return pending;
  return { kind: 'make', target: b.id, item: null, step: r.doing.toLowerCase(), key: `operate:${b.id}:${r.id}`, blocked: '' };
}

/** How a batch plan ends: the goods reached their use, or a stated reason why not. */
export function batchOutcome(world: World, p: Person, i: Intention): { status: 'done' | 'dropped'; reason: string } | null {
  if (!hasBatchPlans(world)) return { status: 'dropped', reason: 'seeing a batch through is no longer part of these rules' };
  const b = p.beliefs[i.aboutId];
  if (!b || b.kind !== 'building') return { status: 'dropped', reason: 'the workshop is no longer one they know of' };
  const qty = i.reserve ?? 1;
  if (i.makes === 'cart') {
    if (world.carts.some((c) => c.ownerHh === p.hhId)) return { status: 'done', reason: 'the household has its handcart' };
  } else if (i.forSite) {
    const site = world.byId.get(i.forSite);
    if (!site || site.ent !== 'site') return { status: 'dropped', reason: `the site the ${i.makes} were for is finished or gone` };
    if (i.worked >= qty) return { status: 'done', reason: `brought ${Math.round(i.worked)} ${i.makes} from the ${b.btype?.replace('_', ' ')} to the site` };
    if (unitsOf(site.delivered[i.makes as ItemKind]) + unitsOf(site.used[i.makes as ItemKind]) >= unitsOf(site.required[i.makes as ItemKind])) return { status: 'dropped', reason: `the site came by its ${i.makes} some other way` };
  } else if (unitsOf(p.inv[i.makes as ItemKind]) >= qty) {
    return { status: 'done', reason: `has the ${i.makes} from the ${b.btype?.replace('_', ' ')}` };
  }
  if (world.tick > i.until) return { status: 'dropped', reason: i.step ? `the time is up (was going to ${i.step})` : 'the time is up' };
  return null;
}

/** Does this option serve a batch plan's step? Matched on the plan's own key or on what the step is, never on wording. */
export function servesBatch(i: Intention, o: Option): boolean {
  if (i.kind !== 'batch' || i.status !== 'active') return false;
  if (i.stepKey && o.key === i.stepKey) return true;
  if (i.stepKind === 'get') return o.yields !== undefined && o.yields === i.stepItem;
  if (i.stepKind === 'store') return o.kind === 'deposit' && o.targetId === i.stepTarget;
  if (i.stepKind === 'deliver') return o.kind === 'haul' && o.targetId === i.stepTarget;
  return false;
}

setBatchHooks({ want: batchWanted, step: batchStep, outcome: batchOutcome });
