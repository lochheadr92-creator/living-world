import {brewDemand,hasBrewing} from './brewing';
import { BAKE_WORTH, GRAIN_WORKS_SIGNAL, LOAVES_A_HEAD, LOAVES_MOST, breadIsStaple, grainInPack, wantsGrainWorks } from './grain_kept';
import { benchStock, chainLeavesLeftover, madeForSiteWorth, sawToYardOption } from './site_supply';
import { IRON_WANT, IRON_WHY, carriesForSmelter, ironWanted, oreLeavesLeftover, smithyShelf } from './smithy_iron';
import { leaveHeaviestOption } from './leave_heaviest';
import { firstYardShared } from './shared_yard';
import {hasRecoveredWorkshops,recoveredWorkshopWants} from './recovered_workshops';
import {forestryOptions} from './forestry';
import {communalStockOptions} from './communal_stock';
import {materialsHomeOption} from './pack_materials';
import {openToAll} from './open_workplaces';
import {STORED_STONE_SIGNAL,hasQuarryStock,hasStoredStoneCue,knownStoreHoldsStone} from './shared_stone';
import {wellFetchOptions} from './wells';
import {hasLivestock,livestockMaterials} from './livestock';
import {hasCarcassSupply,isBodyPart,knownCarcassUnits,supplyFromCarcass} from './carcass_supply';
import {reservedFor} from './reserved_goods';
import {knownGearStock} from './gear_stock';
import {hasGear,knowsSetGear,knownTrapGround} from './passive_gear';
import {hasCarcasses} from './carcass';
import {recipeAvailable} from './recipes';
import {knownTextileStock} from './textile_stock';
import {hasClothing,isTextile,TEXTILES,visibleChildNeedsGarment} from './clothing';
import {hasProjectAcquire} from './project_acquire';
import {hearthOptions,knownColdHearth} from './hearth';
import {hasPreservation} from './preservation';
import {PRESERVED_FOODS} from './constants';
import {hasMealLeftovers,mayTakeKnownPile} from './meal_leftovers';
import {foodUnits} from './economy';
import {carryCap} from './people';
import { techniqueBlocker, hasLearnerInstruction, techniqueLacking, trialAllowed, firstLacking, TECHNIQUES } from './techniques';
import {hasOffcuts} from './offcuts';
import {hasWarmthDuty,fuelAvailable} from './warmth_duty';
import {fireCommitment} from './responsibilities';
import {fireFuelWanted} from './options_work';
import {freeOf} from './intent';
import { isRich } from './mood';
import { newActivity } from './activities';
import { BUILD_DEF, CARRY_CAP, DAY, GRANARY_TEND_EVERY, ITEM_LABEL, REPAIR_USES, TOOL_DEFS, WEIGHT, WORK, isSolidHome, workRules } from './constants';
import { findBuildSpot } from './buildings';
import { hasBatchResume, hasRequiredToolRecovery } from './facilities';
import { cartLoaded } from './carts';
import { invRoom, weightOf } from './economy';
import { delBelief, noteFailure, recentFailure } from './knowledge';
import { rankWaterSpots, Scorer, addBlocked, addOption, beliefsByKind, countBeliefsOfKind, dangerAt, eta, foodCount, pen, spotNear, traitMods } from './optutil';
import type { Ctx } from './optutil';
import { RAW_KINDS, friendlyTo, gatherMaterial, hhState, isRawMaterial, materialNeeds, nightMult, settlementAnchor, weatherMult } from './options_work';
import { rulesOf, within } from './rules';
import { runsRulesVersion } from './rulesversion';
import { keepCurrent } from './kept_target';
import { GRANARY_TRIP } from './intent';
import { cartExperience, cartTripOptions } from './transport';
import { durableReserve } from './provision';
import { baseHub } from './settlements';
import { projectLimit, projectsUnderWay } from './act_build';
import { RECIPES, RECIPE_BY_ID, acceptedAt, isFacilityType, recipesAt, recipesMaking } from './recipes';
import type { Recipe } from './recipes';
import { toolsHeldBy } from './toolreg';
import { toolOf } from './tools';
import { stageOf } from './people';
import type { Belief, BuildingType, Items, ItemKind, Person, ToolKind, World } from './types';
import { hashUnit } from './rng';
import {hasProjectPlans,nextProjectStep} from './project_step';
import {feelsCrowd} from './known_crowd';
import {hasReadyStep,stepPrepared,READY_STEP_BONUS} from './ready_step';

import { hyp } from './util';
const unitsOf = (n: number | undefined): number => n ?? 0;

// Rules 64: a missing tool with no known alternative takes precedence over an efficiency tool
// found earlier (for example, the cart's hammer over a saw when planks can be hewn by hand).
// Derived planning context only; crafting, borrowing and execution keep their ordinary checks.
export const TOOL_PRECEDENCE_FROM_VERSION = 64;
let toolPrecedence = true;
export const toolPrecedenceOn = (): boolean => toolPrecedence;
export function setToolPrecedence(on: boolean): void { toolPrecedence = on; }
export const hasToolPrecedence = (world: World): boolean => toolPrecedence && isRich(world) && runsRulesVersion(world, TOOL_PRECEDENCE_FROM_VERSION);
function noteToolWanted(ctx: Ctx, kind: ToolKind, doing: string, required?: boolean): void {
  if (!hasToolPrecedence(ctx.world)) { ctx.toolWanted ??= { kind, for: doing }; return; }
  if (!ctx.toolWanted || (required && !ctx.toolWanted.required)) ctx.toolWanted = { kind, for: doing, required: !!required };
}

/** What somebody believes the settlement needs made or fetched, in the order they would care about it. */
export interface Demand {
  /** the building site this is for, if any (work and deliveries toward it count toward promises to help) */
  siteId?: number;
  item: ItemKind | 'cart';
  qty: number;
  /** how many of them this person already has in the right form (tools: of the right quality) */
  have: number;
  base: number;
  why: string;
  tag: string;
  /** tools: the quality asked for */
  tier?: 0 | 1;
}

// ───────────────────────── what a person knows about workplaces ─────────────────────────
interface Fac {
  b: Belief;
  type: BuildingType;
  e: number;
}

/** Could this person plausibly use that workplace? Judged from what they know of who it belongs to. */
function mayUseBelief(ctx: Ctx, b: Belief): boolean {
  if (b.hh === 0 || b.hh === ctx.p.hhId) return true;
  // rules 207 (open_workplaces.ts): a workplace is open to everyone, so knowing of one is knowing of one they may use
  if (openToAll(ctx.world, b.btype as BuildingType | undefined)) return true;
  // New preservation decisions cannot read a remote workshop's current builder ledger.
  if(b.btype==='food_rack')return friendlyTo(ctx,b.hh??-1)>=12;
  const real = ctx.world.byId.get(b.id);
  if (real && real.ent === 'building' && (real.ops?.builders[ctx.p.hhId] ?? 0) >= 0.2) return true;
  return friendlyTo(ctx, b.hh ?? -1) >= 12;
}

export function facilitiesOf(ctx: Ctx, type: BuildingType): Fac[] {
  const out: Fac[] = [];
  for (const b of beliefsByKind(ctx.p, ['building'])) {
    if (b.btype !== type) continue;
    // All preservation planners share the same limit on remembered food stock.
    if(type==='food_rack'&&ctx.world.tick-b.seen>DAY)continue;
    if (!mayUseBelief(ctx, b)) continue;
    out.push({ b, type, e: eta(ctx, b.x, b.y) });
  }
  out.sort((a, c) => a.e - c.e);
  return out;
}

/**
 * a workplace of that kind that exists or is being built, as far as this person knows (anyone's). With scaled rules only one in their
 * own settlement counts: a workshop on the far side of the map is not a means they can plan around.
 */
export function knowsOfAny(ctx: Ctx, type: BuildingType): boolean {
  const radius = rulesOf(ctx.world).facilityRadius;
  if (radius === Infinity) return beliefsByKind(ctx.p, ['building', 'site']).some((b) => b.btype === type);
  const at = settlementAnchor(ctx);
  return beliefsByKind(ctx.p, ['building', 'site']).some((b) => b.btype === type && within(radius, at.x, at.y, b.x, b.y));
}

/**
 * Does this person already know of as many workplaces of that kind as their settlement is allowed (rules.ts facilityAllowance)?
 * This is the question behind "should anyone want another one", where `knowsOfAny` is the question behind "is there one I could
 * use". They are the same in the ordinary world, where the allowance is one. Counted from this person's own beliefs: somebody who
 * has not yet seen the second granary may still set out to lay one out, and the site rules will tell them when they get there.
 */
export function knowsEnough(ctx: Ctx, type: BuildingType): boolean {
  const rules = rulesOf(ctx.world);
  if (rules.facilityAllowance <= 1) return knowsOfAny(ctx, type);
  const at = settlementAnchor(ctx);
  let n = 0;
  for (const b of beliefsByKind(ctx.p, ['building', 'site'])) if (b.btype === type && within(rules.facilityRadius, at.x, at.y, b.x, b.y)) n++;
  return n >= rules.facilityAllowance;
}

const stockAt = (ctx:Ctx,b: Belief, item: ItemKind): number => knownGearStock(ctx.world,ctx.p,b,item)??knownTextileStock(ctx.world,ctx.p,b,item);

function belief(ctx: Ctx, id: number): Belief | undefined {
  return ctx.p.beliefs[id];
}

// ───────────────────────── leaves: single things a person can go and do ─────────────────────────
function itemPhrase(items: Items, world:World): string {
  return Object.keys(items)
    .map((k) => `${items[k as ItemKind]} ${k==='garment'&&hasCarcasses(world)?'garment':ITEM_LABEL[k as ItemKind]}`)
    .join(' and ');
}

function nameOf(b: Belief): string {
  return (b.btype ?? 'building').replace('_', ' ');
}

/** Go and take stock out of a store, a workplace's shelves or a heap. */
export function collectLeaf(ctx: Ctx, b: Belief, items: Items, util0: number, why: string, tag: string, parts: [string, number][] = [], materialStock?: ItemKind): void {
  const { world, p } = ctx;
  if (recentFailure(world, p, b.id, 320)) {
    addBlocked(ctx, 'withdraw', `Collect ${itemPhrase(items, world)}`, b.id, `tried recently and found none to take`, tag);
    return;
  }
  const e = eta(ctx, b.x, b.y);
  const dng = dangerAt(ctx, b.x, b.y);
  const sc = new Scorer().add(why, util0).add('walking', -pen(e));
  for (const [n, v] of parts) sc.add(n, v);
  if (dng > 0) sc.add('wolf nearby', -22 * dng * traitMods(p).caution);
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  const place = b.kind === 'pile' ? 'the heap' : b.kind === 'cart' ? 'the parked cart' : `the ${nameOf(b)}`;
  addOption(ctx, {
    kind: 'withdraw',
    label: `Collect ${itemPhrase(items, world)} from ${place}`,
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: e + 25,
    key: `collect:${b.id}:${Object.keys(items).join('+')}`,
    targetId: b.id,
    tag,
    ...(materialStock ? { yields: materialStock } : {}),
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'withdraw',
        label: `Collecting ${itemPhrase(items, world)}`,
        goal: why,
        targetId: b.id,
        targetType: b.kind === 'pile' ? 'pile' : 'building',
        tx: b.x,
        ty: b.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 30,
        maxTicks: 700,
        data: { items, ...(materialStock ? { materialStock } : {}) },
      });
    },
  });
}

/** Reuse the ordinary collection action for one remembered raw-material store.
 * The caller has checked personal knowledge; execution still checks the real place. */
export function collectMaterialStock(ctx: Ctx, b: Belief, item: ItemKind, want: number, base: number, why: string, tag: string): void {
  const take = Math.min(b.items?.[item] ?? 0, Math.max(1, Math.ceil(want)), invRoom(ctx.world, ctx.p, item));
  if (take < 1) return;
  // rules 162: stone already cut and stacked at a quarry yard costs no breaking, so it is not marked down against a rock
  const yard = b.btype === 'quarry' && hasQuarryStock(ctx.world);
  collectLeaf(ctx, b, { [item]: take }, yard ? base : base * 0.95, why, tag, yard ? [['cut stone is waiting', 3]] : [], item);
}

/** Carry goods to a workplace so that a batch can be started there. */
function depositLeaf(ctx: Ctx, b: Belief, items: Items, util0: number, why: string, tag: string, siteId = 0): void {
  const { world, p } = ctx;
  const accepted = acceptedAt((b.btype ?? 'hut') as BuildingType);
  const take: Items = {};
  for (const k of Object.keys(items) as ItemKind[]) if (accepted.includes(k) && unitsOf(p.inv[k]) > 0) take[k] = Math.min(unitsOf(items[k]), unitsOf(p.inv[k]));
  if (!Object.keys(take).length) return;
  const e = eta(ctx, b.x, b.y);
  const sc = new Scorer().add(why, util0).add('walking', -pen(e));
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  addOption(ctx, {
    kind: 'deposit',
    label: `Bring ${itemPhrase(take, world)} to the ${nameOf(b)}`,
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: e + 20,
    key: `bring:${b.id}:${Object.keys(take).join('+')}`,
    targetId: b.id,
    tag,
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'deposit',
        label: `Bringing ${itemPhrase(take, world)} to the ${nameOf(b)}`,
        goal: why,
        targetId: b.id,
        targetType: 'building',
        tx: b.x,
        ty: b.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 30,
        maxTicks: 700,
        data: { items: take, destSite: siteId },
      });
    },
  });
}

function waterLeaf(ctx: Ctx, n: number, util0: number, why: string, tag: string): void {
  wellFetchOptions(ctx,n,util0,why,tag);
  const { world, p } = ctx;
  if ((p.inv.water ?? 0) >= n) return;
  const spot = rankWaterSpots(ctx, 1)[0];
  if (!spot) return;
  const b = spot.b;
  const sc = new Scorer().add(why, util0).add('walking', -pen(spot.e));
  if (spot.dng > 0) sc.add('wolf nearby', -30 * spot.dng * traitMods(p).caution);
  if (spot.trouble > 0) sc.add('was driven off near here', -16 * spot.trouble);
  const util = sc.total * nightMult(ctx);
  addOption(ctx, {
    kind: 'fetch_water',
    label: 'Fetch water',
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: spot.e + 50,
    scopeEstimate: {walk:spot.e,work:WORK.water,amount:Math.min(Math.max(2,Math.min(4,n)),invRoom(world,p,'water')),item:'water'},
    key: 'fetch_water:production',
    targetId: b.id,
    tag,
    make: () => {
      const sp = spotNear(world, p, b);
      if (!sp) {
        delBelief(p, b.id);
        return null;
      }
      return newActivity(world, p, {
        kind: 'fetch_water',
        label: 'Fetching water',
        goal: why,
        targetId: b.id,
        targetType: 'tile',
        tx: sp.x,
        ty: sp.y,
        spotX: sp.x,
        spotY: sp.y,
        amount: Math.max(2, Math.min(4, n)),
        utility: util,
        minCommit: 40,
        maxTicks: 600,
      });
    },
  });
}

// ───────────────────────── planning a batch at a workplace ─────────────────────────
function skillBonus(p: Person, r: Recipe): number {
  return r.skill ? (p.skills[r.skill] - 1) * 9 : 0;
}

export function toolAvailable(ctx: Ctx, f: Fac, r: Recipe): boolean {
  if (!r.tool?.required) return true;
  const kind = r.tool.kind;
  return unitsOf(ctx.p.inv[kind]) > 0 || (f.b.tools ?? []).includes(kind);
}

/** The supply planner's existing choice between equivalent recipes, from held/remembered equipment only. */
export function preferredRecipeForTools(ctx: Ctx, f: Pick<Fac, 'b'>, r: Recipe): boolean {
  const saw = unitsOf(ctx.p.inv.saw) > 0 || (f.b.tools ?? []).includes('saw');
  if (r.id === 'hew_planks' && saw) return false;
  if (r.id === 'saw_planks' && !saw && unitsOf(ctx.p.inv.axe) > 0) return false;
  return true;
}

function perBatch(r: Recipe, item: ItemKind | 'cart' | 'tend'): number {
  if (item === 'cart') return 1;
  if (r.toolOut && r.toolOut.kind === item) return 1;
  if (r.fromDeposit && r.fromDeposit.item === item) return r.fromDeposit.n;
  return r.outputs[item as ItemKind] ?? 1;
}

/**
 * One batch of a recipe at a workplace: everything the batch needs is either there (so go and work), carried (so bring it),
 * or somewhere else (so that becomes the next thing to fetch). Nothing here is a guarantee: it is a plan from memory.
 */
function planRecipe(ctx: Ctx, f: Fac, r: Recipe, item: ItemKind | 'cart' | 'tend', unmet: number, base: number, why: string, tag: string, depth: number, siteId = 0, toolRequired?: boolean, ready = ''): void {
  if(!recipeAvailable(ctx.world,r)||r.preservation&&!hasPreservation(ctx.world))return;
  const { world, p } = ctx;
  const b = f.b;
  const technique = techniqueBlocker(world,p,r.id);
  const lacking = technique ? techniqueLacking(world,p,r.id) : undefined;
  if(technique&&lacking){
    // the procedure they could learn or try next is the first one lacking on the way (smelting before forging)
    const next = firstLacking(world,p,lacking);
    if(hasLearnerInstruction(world))ctx.techniqueWanted??={kind:next,for:why};
    // rules 52 (techniques.ts): wanted long enough with nobody to teach it, the work may be tried untaught; the leaf says so.
    // When an earlier procedure is the one lacking, its own recipe at this workshop is the trial (smelting, for the forging wanted)
    if(next!==lacking&&trialAllowed(world,p,next)&&depth<4){
      const first=RECIPE_BY_ID[TECHNIQUES[next].recipes[0]];
      if(first&&first.at===b.btype){planRecipe(ctx,f,first,item,unmet,base*0.9,`to work out ${TECHNIQUES[next].name} first, ${why}`,tag,depth+1,siteId);return;}
    }
    if(!(next===lacking&&trialAllowed(world,p,lacking))){
      addBlocked(ctx,'operate',r.doing,b.id,technique,tag);
      // rules 235 (smithy_iron.ts): somebody who cannot smelt still brings the ore and the charcoal for whoever can
      if(carriesForSmelter(world,r.id,why))bringInputs(ctx,f,r,base,why,tag,depth,siteId);
      return;
    }
  }
  const trial = !!technique;
  const snap = b.ops;
  const fresh = world.tick - b.seen < 500;
  const busy = fresh && snap?.job && snap.readyAt > world.tick;
  if (busy && trial) {
    addBlocked(ctx, 'operate', r.doing, b.id, 'the workshop is in use; a trial waits for it to be free', tag);
    return;
  }
  if (busy) {
    // somebody is working: join them if the recipe is the one that is wanted and has room for another pair of hands
    const running = RECIPE_BY_ID[snap!.job as string];
    // rules 50 (facilities.ts resumableJob): a batch of this person's own, still being worked as they remember it, is one to get back
    // to, not a busy workshop; the handler resumes the job as it stands
    // (any recipe of theirs at this workshop: the stage before a product, flour before bread, is theirs to finish as much as the product)
    const mine = hasBatchResume(world) && running && snap!.client === p.id && snap!.burn === 0 && snap!.progress < 1;
    if (hasRequiredToolRecovery(world) && mine && !toolAvailable(ctx, f, running)) {
      addBlocked(ctx, 'operate', running.doing, b.id, `needs a ${running.tool!.kind}; the unfinished batch can wait`, tag);
      // A paid batch must finish its actual recipe; an unstarted alternative cannot replace its tool.
      noteToolWanted(ctx, running.tool!.kind, `finishing ${running.doing.toLowerCase()}`, true);
      return;
    }
    if (mine) operateLeaf(ctx, f, running, base * 0.97, `${why} (get back to it)`, tag, false, siteId, false, ready);
    else if (running && running.id === r.id && running.workers > 1 && r.id !== 'quarry_stone') operateLeaf(ctx, f, r, base * 0.8, `${why} (lend a hand)`, tag, true, siteId);
    else addBlocked(ctx, 'operate', r.doing, b.id, `the ${nameOf(b)} is busy with ${running ? running.label : 'a batch'}`, tag);
    return;
  }
  if (recentFailure(world, p, b.id, 240)) {
    addBlocked(ctx, 'operate', r.doing, b.id, 'tried recently and could not get on', tag);
    return;
  }
  if (!toolAvailable(ctx, f, r)) {
    addBlocked(ctx, 'operate', r.doing, b.id, `needs a ${r.tool!.kind === 'pick' ? 'pickaxe' : r.tool!.kind} and has none (and none is on the rack)`, tag);
    noteToolWanted(ctx, r.tool!.kind, r.doing.toLowerCase(), toolRequired);
    return;
  }
  if (r.fromDeposit && snap && snap.deposit >= 0 && snap.deposit < r.fromDeposit.n) {
    addBlocked(ctx, 'operate', r.doing, b.id, 'the outcrop is worked out', tag);
    return;
  }
  if (b.cond !== undefined && b.cond < 12) {
    addBlocked(ctx, 'operate', r.doing, b.id, 'too run down to use', tag);
    return;
  }
  // inputs
  const need: Items = {};
  for (const k of Object.keys(r.inputs) as ItemKind[]) need[k] = (need[k] ?? 0) + unitsOf(r.inputs[k]);
  for (const k of Object.keys(r.fuel) as ItemKind[]) need[k] = (need[k] ?? 0) + unitsOf(r.fuel[k]);
  if(r.preservation&&r.preservation!=='render'){
    const raw:ItemKind=r.inputs.fish?'fish':'meat';
    const otherFood=foodUnits(p.inv)+foodUnits(b.items??{})-(b.items?.[raw]??0);
    need[raw]=(need[raw]??0)+Math.max(0,2-otherFood);
  }
  const short: Items = {};
  for (const k of Object.keys(need) as ItemKind[]) {
    // rules 229 (site_supply.ts): what lies ready at the bench is counted from the workshop's own record, not the glance
    const lack = unitsOf(need[k]) - benchStock(world, b, k, stockAt(ctx,b, k));
    if (lack > 0) short[k] = lack;
  }
  if (!Object.keys(short).length) {
    operateLeaf(ctx, f, r, base * 0.97, why, tag, false, siteId, trial, ready);
    return;
  }
  // bring what is carried
  const carryAll: Items = {};
  let anyCarried = false;
  let stillShort = false;
  for (const k of Object.keys(short) as ItemKind[]) {
    const have = unitsOf(p.inv[k]);
    if (have > 0) {
      carryAll[k] = Math.min(have, unitsOf(short[k]));
      anyCarried = true;
    }
    if (have < unitsOf(short[k])) stillShort = true;
  }
  if (anyCarried) depositLeaf(ctx, b, carryAll, base * 0.92, `${why} (${r.label})`, tag, siteId);
  if (depth >= 2) {
    // too deep to plan further stages, but raw materials are the end of any chain: wood for the charcoal, ore, clay and stone can always be gathered by hand
    for (const k of Object.keys(short) as ItemKind[]) {
      const missing = unitsOf(short[k]) - unitsOf(p.inv[k]);
      if (missing > 0 && isRawMaterial(k)) supply(ctx, k, missing, base * 0.93, `${why} (${r.label})`, tag, depth + 1, b, undefined, siteId);
    }
    return;
  }
  // what is still missing has to come from somewhere
  if (stillShort) {
    for (const k of Object.keys(short) as ItemKind[]) {
      const missing = unitsOf(short[k]) - unitsOf(p.inv[k]);
      if (missing > 0) supply(ctx, k, missing, base * 0.93, `${why} (${r.label})`, tag, depth + 1, b, undefined, siteId);
    }
  }
}

/**
 * Rules 235 (smithy_iron.ts): what a batch of this recipe still lacks at the workshop is brought there by somebody who will not
 * work the batch themselves: what they carry is taken there, and what is missing is sought as for any batch. No work is offered.
 */
function bringInputs(ctx: Ctx, f: Fac, r: Recipe, base: number, why: string, tag: string, depth: number, siteId: number): void {
  const { world, p } = ctx;
  const b = f.b;
  const need: Items = {};
  for (const k of Object.keys(r.inputs) as ItemKind[]) need[k] = (need[k] ?? 0) + unitsOf(r.inputs[k]);
  for (const k of Object.keys(r.fuel) as ItemKind[]) need[k] = (need[k] ?? 0) + unitsOf(r.fuel[k]);
  const carry: Items = {};
  let any = false;
  for (const k of Object.keys(need) as ItemKind[]) {
    const lack = unitsOf(need[k]) - benchStock(world, b, k, stockAt(ctx, b, k));
    if (lack <= 0) continue;
    const have = unitsOf(p.inv[k]);
    if (have > 0) { carry[k] = Math.min(have, lack); any = true; }
    const missing = lack - have;
    if (missing > 0 && (depth < 2 || isRawMaterial(k))) supply(ctx, k, missing, base * 0.93, `${why} (${r.label})`, tag, depth + 1, b, undefined, siteId);
  }
  if (any) depositLeaf(ctx, b, carry, base * 0.92, `${why} (${r.label})`, tag, siteId);
}

function operateLeaf(ctx: Ctx, f: Fac, r: Recipe, util0: number, why: string, tag: string, joining: boolean, siteId = 0, trial = false, ready = ''): void {
  const { world, p } = ctx;
  const b = f.b;
  const e = f.e;
  const crowd = ctx.seenPersons.filter((s) => s.act === 'operate' && hyp(s.x - b.x, s.y - b.y) < 5).length;
  const sc = new Scorer().add(why, util0).add('walking', -pen(e));
  if (trial) sc.add(`nobody to teach me ${TECHNIQUES[techniqueLacking(world, p, r.id)!].name}: try it`, -4);
  const sb = skillBonus(p, r);
  if (sb > 0.5) sc.add('practised at it', sb);
  if (crowd >= r.workers) sc.add('already crowded', -12);
  if (r.id === 'quarry_stone') sc.add('cuts stone far faster than breaking small rocks', 5);
  if (r.id === 'saw_planks') sc.add('a saw wastes far less wood', 4);
  // rules 99 (ready_step.ts): a prepared step of one's own project is worth finishing
  if (ready) sc.add(ready, READY_STEP_BONUS);
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  addOption(ctx, {
    kind: 'operate',
    label: joining ? `Lend a hand at the ${nameOf(b)}` : trial ? `${r.doing} untaught (a trial)` : r.doing,
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: e + r.work,
    scopeEstimate: {walk:e,work:r.work},
    key: `operate:${b.id}:${r.id}`,
    targetId: b.id,
    tag,
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'operate',
        label: joining ? `Heading to help at the ${nameOf(b)}` : trial ? `${r.doing} untaught (a trial)` : r.doing,
        goal: why,
        targetId: b.id,
        targetType: 'building',
        tx: b.x,
        ty: b.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 80,
        maxTicks: Math.max(900, r.work * 3),
        data: { recipe: r.id, client: p.id, purpose: why, destSite: siteId, ...(trial ? { trial: true } : {}) },
      });
    },
  });
}

// ───────────────────────── supply: how to get hold of something ─────────────────────────
function collectOptions(ctx: Ctx, item: ItemKind | 'cart', unmet: number, base: number, why: string, tag: string, dest: Belief | null): number {
  if (item === 'cart') return 0;
  const { world, p } = ctx;
  const rememberedOnly=dest?.btype==='food_rack';
  const found: { b: Belief; n: number; e: number }[] = [];
  for (const b of beliefsByKind(p, ['building', 'pile', 'cart'])) {
    if(!mayTakeKnownPile(p,b))continue;
    if (dest && b.id === dest.id) continue;
    if(rememberedOnly&&world.tick-b.seen>DAY)continue;
    let n = stockAt(ctx,b, item);
    if (b.kind === 'building') {
      if (b.btype === 'granary') {
        // only the household's own share may be drawn out for its own purposes
        if(rememberedOnly){
          if(b.hh!==0&&b.hh!==p.hhId)continue;
        }else{
          const real = world.byId.get(b.id);
          const share = real && real.ent === 'building' ? (real.ops?.shares[p.hhId]?.[item] ?? 0) : 0;
          n = Math.min(n, share);
        }
      } else if (b.btype && isFacilityType(b.btype as BuildingType)) {
        if (!(rememberedOnly?(b.hh===0||b.hh===p.hhId||friendlyTo(ctx,b.hh??-1)>=12):mayUseBelief(ctx, b))) continue;
        // rules 229 (site_supply.ts): what waits at a workshop is counted from the workshop's own record, not the glance
        n = benchStock(world, b, item, n);
        // a batch of mine that will be ready by the time I arrive counts
        const snap = b.ops;
        if (snap && snap.job && snap.client === p.id && snap.readyAt <= world.tick + eta(ctx, b.x, b.y) + 60) n += unitsOf(snap.yields[item]);
      } else if (b.btype === 'storehouse') {
        // everyone's
      } else if (b.hh !== p.hhId) continue;
      else if (!rememberedOnly && (foodUnits({[item]:1})>0 || item === 'flour')) {
        // the household's own food is not to be spent making things unless there is plenty
        // Preservation moves raw food into another edible form. Its own surplus
        // and start checks retain two immediate meals, including those carried
        // from this home; the general reserve floor would prevent that trip.
        // rules 243 (grain_kept.ts): grain and flour are for baking; turning them into bread is not spending the household's food
        if (!(breadIsStaple(world) && (item === 'grain' || item === 'flour'))) {
          const hs = hhState(ctx);
          n = Math.max(0, Math.min(n, Math.floor(hs.foodStock - hs.foodTarget * 1.1)));
        }
      }
    } else if (b.kind === 'cart') {
      if ((b.hh ?? -1) !== p.hhId && b.hh !== 0) continue;
    }
    if (n < 1) continue;
    found.push({ b, n, e: eta(ctx, b.x, b.y) });
  }
  found.sort((a, c) => a.e - c.e);
  let total = 0;
  for (const f of found) total += f.n;
  for (const f of keepCurrent(ctx, found, 2, c => `collect:${c.b.id}:${item}`)) {
    const take = Math.min(f.n, Math.max(1, Math.ceil(unmet)), invRoom(ctx.world, p, item as ItemKind));
    if (take < 1) continue;
    collectLeaf(ctx, f.b, { [item]: take } as Items, base * 0.95, why, tag);
  }
  return total;
}

function supply(ctx: Ctx, item: ItemKind | 'cart' | 'tend', qty: number, base: number, why: string, tag: string, depth: number, dest: Belief | null, haveOverride?: number, siteId = 0): void {
  const { p } = ctx;
  const carried = item === 'cart' || item === 'tend' ? 0 : unitsOf(p.inv[item]);
  const have = haveOverride ?? (dest ? 0 : carried);
  const unmet = qty - have;
  if (unmet <= 0) return;
  let remaining = unmet;
  if (item !== 'tend') remaining = unmet - collectOptions(ctx, item, unmet, base, why, tag, dest);
  // what is already standing on somebody's shelves counts: no one makes more of what is already there
  if (remaining <= 0) return;
  if(item!=='cart'&&item!=='tend'&&hasCarcassSupply(ctx.world)&&isBodyPart(item)){
    supplyFromCarcass(ctx,item,base*.92,why,remaining);return;
  }
  if (item !== 'cart' && item !== 'tend') {
    if (isRawMaterial(item)) {
      // rules 229 (site_supply.ts): with no room for one, a left-over of wood or stone may be left first, as rules 33 has it
      if ((chainLeavesLeftover(ctx.world, tag, siteId) || oreLeavesLeftover(ctx.world, item)) && invRoom(ctx.world, p, item) < 1 && !ctx.options.some((o) => o.key?.startsWith('leave:')))
        leaveHeaviestOption(ctx, { item, base: base * 0.92 * traitMods(p).work, why, sources: RAW_KINDS[item], mult: nightMult(ctx) * weatherMult(ctx), wanted: new Set<ItemKind>([item, ...materialNeeds(ctx).map((n) => n.item)]) });
      gatherMaterial(ctx, item, remaining, base * 0.92 * traitMods(p).work, why, tag);
      if (item !== 'stone' && !(item==='ore'&&hasRecoveredWorkshops(ctx.world))) return; // stone can also be cut at a quarry
    }
    if (item === 'water') {
      waterLeaf(ctx, Math.ceil(remaining), base * 0.92, why, tag);
      return;
    }
  }
  if (depth >= 3) return;
  const recipes = item === 'tend' ? recipesAt('granary') : recipesMaking(item);
  const toolRequired = toolRequiredFor(ctx, recipes);
  const seen = new Set<string>();
  for (const r of recipes) {
    if(!recipeAvailable(ctx.world,r))continue;
    const fac = facilitiesOf(ctx, r.at)[0];
    if (!fac) {
      if (!seen.has(r.at)) {
        seen.add(r.at);
        addBlocked(ctx, 'operate', r.doing, 0, `does not know of a ${BUILD_DEF[r.at].label} they may use`, tag);
      }
      continue;
    }
    // prefer the better way of making something when its tool is to hand: sawing beats hewing
    if (!preferredRecipeForTools(ctx, fac, r)) continue;
    planRecipe(ctx, fac, r, item, remaining, base, why, tag, depth, siteId, toolRequired);
  }
}

/** A known alternative, not a promise of completion: stock, routes and tools are checked again at execution. */
function toolRequiredFor(ctx: Ctx, recipes: Recipe[]): boolean | undefined {
  if (!hasToolPrecedence(ctx.world)) return undefined;
  for (const r of recipes) {
    if(!recipeAvailable(ctx.world,r))continue;
    const fac = facilitiesOf(ctx, r.at)[0];
    if (!fac || techniqueBlocker(ctx.world, ctx.p, r.id)) continue;
    if (toolAvailable(ctx, fac, r)) return false;
  }
  return true;
}

// ───────────────────────── what is wanted ─────────────────────────
const PROCESSED: ItemKind[] = ['planks', 'handles', 'bricks', 'charcoal', 'iron', 'flour', 'bread', 'fibre'];
const quarryAware = (ctx: Ctx, item: ItemKind): boolean => item === 'stone' && facilitiesOf(ctx, 'quarry').length > 0 || hasRecoveredWorkshops(ctx.world)&&item==='ore'&&facilitiesOf(ctx,'mine').length>0;

/** Demands this person is aware of: from building sites they know, repairs, their own tools, their household's table. */
export function demandsOf(ctx: Ctx): Demand[] {
  const { world, p } = ctx;
  const out: Demand[] = [];
  if(brewDemand(ctx))out.push({item:'beer',qty:2,have:p.inv.beer??0,base:24,why:'brew spare grain for an adult shared meal',tag:'meal'});
  for(const [item,qty] of Object.entries(livestockMaterials(ctx)))if((p.inv[item as ItemKind]??0)<qty!)out.push({item:item as ItemKind,qty:qty!,have:p.inv[item as ItemKind]??0,base:32,why:'supplies for known sheep care',tag:'animals'});
  if(hasGear(world)&&ctx.stage!=='child')for(const kind of ['net','trap'] as const){
    const known=kind==='trap'&&runsRulesVersion(world,127)?!!knownTrapGround(ctx):Object.values(p.beliefs).some(b=>b.kind===(kind==='net'?'fish_spot':'tree'));
    if(known&&!p.inv[kind]&&!knowsSetGear(ctx,kind))out.push({item:kind,qty:1,have:0,base:28,why:'set owned gear for later food',tag:'craft'});
    if(Object.values(p.beliefs).some(b=>b.gear?.kind===kind&&b.gear.hhId===p.hhId&&b.gear.wear>=60)&&!p.inv.fibre)out.push({item:'fibre',qty:1,have:0,base:32,why:'mend owned gear',tag:'craft'});
  }
  if(hasClothing(world)){
    const cold=p.needs.warmth<65||world.weather.temp<12;
    const woolYards=hasLivestock(world)?facilitiesOf(ctx,'timber_yard'):[];
    const knownWool=Math.max(0,...woolYards.map(f=>knownTextileStock(world,p,f.b,'wool')));
    for(const kind of TEXTILES){
      const childNeeds=kind==='garment'&&ctx.seenPersons.some(s=>visibleChildNeedsGarment(ctx,s));
      // Collected fleece has a use even during a warm working window. It does
      // not request more animal products or spend another promise's material.
      const readyWool=hasLivestock(world)&&(p.inv.wool??0)-reservedFor(world,p,'wool')+knownWool>=(kind==='bedding'?4:3);
      const prepared=woolYards.some(f=>knownTextileStock(world,p,f.b,kind)>0);
      const finishingWool=woolYards.some(f=>f.b.ops?.client===p.id&&f.b.ops.job==='weave_wool_'+kind);
      if(!cold&&!childNeeds&&!readyWool&&!prepared&&!finishingWool)continue;
      const target=1+(childNeeds?1:0),have=p.inv[kind]??0;
      if(have<target)out.push({item:kind,qty:target,have,base:kind==='garment'?32:25,why:childNeeds?'insulation for me and the child in cold weather':prepared?'collect prepared personal insulation':readyWool||finishingWool?'use collected wool for personal insulation':'personal insulation against the cold',tag:'craft'});
    }
    if(toolsHeldBy(world,p.id).some(t=>isTextile(t.kind)&&t.wear>=45)&&(p.inv.fibre??0)<1)out.push({item:'fibre',qty:1,have:0,base:28,why:'mend worn insulation',tag:'craft'});
  }
  if(hasCarcasses(world)&&((p.inv.fat??0)>0||hasCarcassSupply(world)&&knownCarcassUnits(ctx,'fat')>0&&facilitiesOf(ctx,'food_rack').length>0))out.push({item:'rendered_fat',qty:1,have:p.inv.rendered_fat??0,base:30,why:'prepare recovered animal fat for food',tag:'food'});
  if(hasPreservation(world)){
    const raw=preservationSurplus(ctx);
    // A finite food job belongs to the same planner as other workshop batches.
    // Adopt only with immediate meals already held or seen at the workbench;
    // the compiler still has to find the actual recipe inputs and fuel.
    const rack=facilitiesOf(ctx,'food_rack').find(f=>world.tick-f.b.seen<=DAY&&foodUnits(p.inv)+foodUnits(f.b.items??{})>=4);
    if(raw&&rack){
      const item=`${world.weather.rain>0.1?'smoked':'dried'}_${raw}` as ItemKind;
      out.push({item,qty:2,have:p.inv[item]??0,base:27,why:'keep spare food for later meals',tag:'food'});
    }
  }
  const grouped: Record<string, { n: number; base: number; why: string; tag: string; siteId?: number }> = {};
  for (const n of materialNeeds(ctx)) {
    if (!PROCESSED.includes(n.item) && !quarryAware(ctx, n.item)) continue;
    const cur = grouped[n.item];
    if (!cur) grouped[n.item] = { n: n.n, base: n.base, why: n.why, tag: n.tag, siteId: n.siteId };
    else {
      cur.n += n.n;
      if (n.base > cur.base) {
        cur.base = n.base;
        cur.why = n.why;
        cur.tag = n.tag;
        cur.siteId = n.siteId;
      }
    }
  }
  for (const k of Object.keys(grouped)) {
    const g = grouped[k];
    // rules 229 (site_supply.ts): a made material a site waits for counts for more than the site's wood and stone
    out.push({ item: k as ItemKind, qty: g.n, have: 0, base: g.base * traitMods(p).work + (PROCESSED.includes(k as ItemKind) ? madeForSiteWorth(world, g.tag, g.siteId) : 0), why: g.why, tag: g.tag, siteId: g.siteId });
  }
  // promises to bring materials to a site count as wants of their own, at the weight of the promise
  for (const c of p.commitments) {
    if (c.status !== 'active' || c.kind !== 'haul' || !c.item || !PROCESSED.includes(c.item)) continue;
    const left = c.amount - (c.delivered ?? 0);
    if (left > 0) out.push({ item: c.item, qty: left, have: 0, base: 50, why: 'to keep my promise to bring it', tag: 'promise', siteId: c.siteId });
  }
  const tm = traitMods(p);

  // a tool that is wearing out is worth replacing with an iron one, where a smithy can be used
  if (facilitiesOf(ctx, 'smithy').length) {
    let worst: { kind: ToolKind; wear: number } | null = null;
    for (const t of toolsHeldBy(world, p.id)) {
      if (isTextile(t.kind) || t.kind === 'net' || t.kind === 'trap' || t.kind === 'rod' || t.kind === 'basket' || t.kind === 'jar' || t.tier === 1) continue;
      if (toolsHeldBy(world, p.id, t.kind).some((x) => x.tier === 1)) continue;
      if (t.wear >= 18 && (!worst || t.wear > worst.wear)) worst = { kind: t.kind, wear: t.wear };
    }
    if (worst) {
      out.push({ item: worst.kind, qty: 1, have: 0, base: (13 + (worst.wear - 18) * 0.3) * tm.work, why: `to replace my worn ${TOOL_DEFS[worst.kind].label} with an iron one`, tag: 'craft', tier: 1 });
    }
  }

  // the smithy's fuel (rules version 10): a standing smithy is a standing want for charcoal. Without a want of its own,
  // charcoal is only ever the transitive ingredient of a personal iron-tool plan, and that chain stalls (measured: a
  // 160-day ordinary world builds a kiln and a smithy but makes no charcoal and forges no iron). Someone who knows a
  // smithy and a kiln keeps the charcoal stocked, so the kiln's idle time goes to firing it. Weighted like the other
  // settlement supplies (bricks and planks ride at about 30), not like a personal convenience: only an industrial want
  // beats rest and chatter on an ordinary day.
  if (runsRulesVersion(world, 10) && facilitiesOf(ctx, 'smithy').length && knowsOfAny(ctx, 'kiln')) {
    let onShelves = 0;
    for (const s of beliefsByKind(p, ['building'])) {
      if (s.btype !== 'smithy' && s.btype !== 'kiln') continue;
      onShelves += smithyShelf(world, s, 'charcoal'); // rules 235 (smithy_iron.ts): the workshop's own count, not the glance
    }
    if (onShelves < 4) {
      out.push({ item: 'charcoal', qty: 4 - onShelves, have: onShelves, base: 30 * tm.work, why: 'the smithy burns charcoal to smelt and forge', tag: 'craft' });
    }
  }

  // rules 235 (smithy_iron.ts): a standing smithy is a standing want for iron too, as rules 10 made it one for charcoal
  {
    const wanted = ironWanted(world, facilitiesOf(ctx, 'smithy').map((f) => f.b));
    if (wanted > 0) out.push({ item: 'iron', qty: wanted, have: 0, base: IRON_WANT * tm.work, why: IRON_WHY, tag: 'craft' });
  }

  // water is heavy to carry for those who fetch it for others
  if (facilitiesOf(ctx, 'kiln').length && unitsOf(p.inv.jar) < 1 && (p.stats.farmed >= 6 || ctx.dependents.some((d) => stageOf(world, d) === 'child'))) {
    out.push({ item: 'jar', qty: 1, have: 0, base: 10 * tm.work, why: 'to carry more water at a time', tag: 'craft' });
  }

  // a handcart for the one who keeps hauling heavy loads over a long way: known site deficits (rules 20), or what they have
  // really carried lately (rules 55, transport.ts)
  if (facilitiesOf(ctx, 'timber_yard').length) {
    const carried = cartExperience(ctx);
    if (wantsCart(ctx)) out.push({ item: 'cart', qty: 1, have: 0, base: 14 * tm.work, why: 'to haul heavy loads', tag: 'craft' });
    else if (carried && !hasCartAlready(ctx)) out.push({ item: 'cart', qty: 1, have: 0, base: 14 * tm.work, why: `to haul heavy loads, ${carried}`, tag: 'craft' });
  }

  // bread for a household that has grain to spare
  if (facilitiesOf(ctx, 'bakery').length) {
    const hs = hhState(ctx);
    const members = Math.max(1, ctx.members.length);
    const staple = breadIsStaple(world); // rules 243 (grain_kept.ts): bread is the household's staple, not its luxury
    const target = staple ? Math.min(LOAVES_MOST, LOAVES_A_HEAD * members) : Math.min(8, Math.ceil(1.2 * members));
    const granary = facilitiesOf(ctx, 'granary')[0];
    const realG = granary ? world.byId.get(granary.b.id) : undefined;
    const share = realG && realG.ent === 'building' ? (realG.ops?.shares[p.hhId] ?? {}) : {};
    const haveBread = unitsOf(p.inv.bread) + unitsOf(ctx.home ? p.beliefs[ctx.home.id]?.items?.bread : 0) + unitsOf(share.bread);
    const surplusGrain = unitsOf(p.inv.grain) + unitsOf(ctx.home ? p.beliefs[ctx.home.id]?.items?.grain : 0) + unitsOf(share.grain);
    if ((staple || hs.foodStock >= hs.foodTarget * 1.1) && surplusGrain >= 4 && haveBread < target) {
      out.push({ item: 'bread', qty: target - haveBread, have: haveBread, base: ((staple ? BAKE_WORTH : 14) + 6 * (ctx.dependents.length > 0 ? 1 : 0)) * tm.work, why: staple ? 'to bake the household\'s grain into bread, which feeds further and keeps' : 'to turn spare grain into bread for the household', tag: 'food' });
    }
  }
  return out;
}

function hasCartAlready(ctx: Ctx): boolean {
  const { p, world } = ctx;
  if (world.carts.some((c) => c.ownerHh === p.hhId || c.ownerHh === 0)) return true;
  return beliefsByKind(p, ['cart']).some((b) => b.hh === p.hhId || b.hh === 0);
}
/** Known outstanding work heavy enough to want wheels for (the rules-20 reason; what they have carried is transport.ts). */
function wantsCart(ctx: Ctx): boolean {
  const { p } = ctx;
  if (hasCartAlready(ctx)) return false;
  let heavy = 0;
  for (const s of beliefsByKind(p, ['site'])) {
    if (!(s.hh === p.hhId || s.hh === 0)) continue;
    for (const k of Object.keys(s.need ?? {}) as ItemKind[]) heavy += unitsOf(s.need?.[k]) * WEIGHT[k];
  }
  return heavy >= 40 && p.skills.build >= 0.9 && p.traits.diligence > 0.4;
}

// ───────────────────────── upkeep of tools, carts and the granary ─────────────────────────
function optToolMaintenance(ctx: Ctx): void {
  const { world, p } = ctx;
  for (const t of toolsHeldBy(world, p.id)) {
    if (isTextile(t.kind) || t.kind === 'jar' || t.wear < 52) continue;
    const mat = unitsOf(p.inv.handles) > 0 ? 'handles' : unitsOf(p.inv.wood) > 0 ? 'wood' : null;
    if (!mat) continue;
    const sc = new Scorer().add(`my ${TOOL_DEFS[t.kind].label} is wearing out`, 9 + (t.wear - 52) * 0.55 + 6 * p.traits.diligence);
    const util = sc.total * nightMult(ctx);
    addOption(ctx, {
      kind: 'tool_work',
      label: `Mend my ${TOOL_DEFS[t.kind].label}`,
      goal: 'so it does not break at a bad moment',
      need: null,
      util,
      parts: sc.parts,
      eta: 70,
      key: `mend:${t.id}`,
      targetId: 0,
      tag: 'craft',
      make: () => newActivity(world, p, { kind: 'tool_work', label: `Mending my ${TOOL_DEFS[t.kind].label}`, goal: 'so it does not break at a bad moment', here: true, utility: util, minCommit: 40, maxTicks: 400, data: { toolId: t.id } }),
    });
    break;
  }
  // the household's cart, if it is standing here
  for (const b of beliefsByKind(p, ['cart'])) {
    const c = world.byId.get(b.id);
    if (!c || c.ent !== 'cart' || (c.ownerHh !== p.hhId && c.ownerHh !== 0) || c.wear < 50 || c.puller) continue;
    if (hyp(c.x - p.x, c.y - p.y) > 14) continue;
    if (!(unitsOf(p.inv.planks) > 0 || unitsOf(p.inv.handles) > 0 || unitsOf(p.inv.wood) > 0)) continue;
    const e = eta(ctx, c.x, c.y);
    const sc = new Scorer().add('the cart is wearing out', 8 + (c.wear - 50) * 0.4).add('walking', -pen(e));
    addOption(ctx, {
      kind: 'tool_work',
      label: 'Mend the handcart',
      goal: 'so the cart keeps rolling',
      need: null,
      util: sc.total * nightMult(ctx),
      parts: sc.parts,
      eta: e + 90,
      key: `mend:cart:${c.id}`,
      targetId: c.id,
      tag: 'craft',
      make: () => newActivity(world, p, { kind: 'tool_work', label: 'Mending the handcart', goal: 'so the cart keeps rolling', targetId: c.id, targetType: 'cart', tx: c.x, ty: c.y, spotX: c.x + 1, spotY: c.y, utility: sc.total, minCommit: 40, maxTicks: 500, data: { cartId: c.id } }),
    });
    break;
  }
}

/** Tending the grain bins is a chore for whoever has grain in them, and for the public-spirited. */
function optTendGranary(ctx: Ctx): void {
  const { world, p } = ctx;
  const g = facilitiesOf(ctx, 'granary')[0];
  if (!g) return;
  const snap = g.b.ops;
  const held = foodCount(g.b.items ?? {}) + unitsOf(g.b.items?.flour) + unitsOf(g.b.items?.bread);
  if (held < 3) return;
  const since = world.tick - (snap?.tended ?? g.b.seen - GRANARY_TEND_EVERY);
  if (since < GRANARY_TEND_EVERY * 0.55) return;
  const real = world.byId.get(g.b.id);
  const mine = real && real.ent === 'building' && (real.ops?.shares[p.hhId]?.grain ?? 0) + (real.ops?.shares[p.hhId]?.bread ?? 0) + (real.ops?.shares[p.hhId]?.flour ?? 0) > 0;
  const urgency = Math.min(1, (since - GRANARY_TEND_EVERY * 0.55) / (GRANARY_TEND_EVERY * 0.6));
  const base = (7 + 10 * urgency + (mine ? 9 : 0) + 6 * p.traits.generosity) * traitMods(p).work;
  const r = RECIPE_BY_ID.tend_granary;
  planRecipe(ctx, g, r, 'tend', 1, base, 'to keep the stored grain from spoiling', 'store', 0);
}

/** A household with spare grain, flour or bread puts it in the granary, where it keeps. */
function optGranaryStore(ctx: Ctx): void {
  const { world, p } = ctx;
  const g = facilitiesOf(ctx, 'granary')[0];
  if (!g) return;
  // rules 46: a winter reserve (provision.ts durableReserve) takes grain to the bins a few at a time, keeping two back for
  // the day; everyone else, and every world below 46, waits for the ordinary load
  const winter = durableReserve(world, p);
  const keep = grainInPack(world, winter ? 2 : ctx.drives.hunger > 0 ? 4 : 3); // rules 243 (grain_kept.ts): one for the day
  const items: Items = {};
  let n = 0;
  for (const k of ['grain', 'flour', 'bread','dried_fish','smoked_fish','dried_meat','smoked_meat','rendered_fat'] as ItemKind[]) {
    const have = unitsOf(p.inv[k]);
    const give = k === 'grain'||k==='rendered_fat'||k.startsWith('dried_')||k.startsWith('smoked_') ? Math.max(0, have - keep) : have;
    if (give >= (winter ? 1 : 2)) {
      items[k] = give;
      n += give;
    }
  }
  if (n < (winter ? GRANARY_TRIP - 2 : 3)) return;
  depositLeaf(ctx, g.b, items, 11 + Math.min(10, n) + 5 * p.traits.diligence, winter ? 'to put grain by for the winter where it keeps' : 'to keep our grain from spoiling', 'store');
}

/**
 * A tool they no longer need (a second one of the same kind, or the old wooden one after getting an iron one) is left on the
 * rack of a workshop that uses it, where anyone who works there can pick it up and then bring it back.
 */
function optRackSpare(ctx: Ctx): void {
  const { world, p } = ctx;
  if (p.traits.generosity < 0.42) return;
  const held = toolsHeldBy(world, p.id);
  for (const t of held) {
    if (t.loan || t.kind === 'basket' || t.kind === 'jar') continue;
    const same = held.filter((x) => x.kind === t.kind && !x.loan);
    if (same.length < 2) continue;
    // the spare is the worse of the two
    const spare = same.sort((a, c) => (c.tier - a.tier) || a.wear - c.wear)[same.length - 1];
    if (spare.id !== t.id) continue;
    let target: Fac | null = null;
    for (const type of ['timber_yard', 'smithy', 'quarry', 'kiln', 'bakery'] as BuildingType[]) {
      if (!recipesAt(type).some((r) => r.tool?.kind === t.kind)) continue;
      const f = facilitiesOf(ctx, type)[0];
      if (f && (f.b.hh === 0 || f.b.hh === p.hhId) && !(f.b.tools ?? []).includes(t.kind)) {
        target = f;
        break;
      }
    }
    if (!target) continue;
    const sc = new Scorer().add(`a spare ${t.kind} could stay at the ${nameOf(target.b)} for whoever works there`, 9 + 6 * p.traits.generosity).add('walking', -pen(target.e));
    const b = target.b;
    addOption(ctx, {
      kind: 'deposit',
      label: `Leave a spare ${t.kind} at the ${nameOf(b)}`,
      goal: 'so others can use it and bring it back',
      need: null,
      util: sc.total * nightMult(ctx),
      parts: sc.parts,
      eta: target.e + 20,
      key: `rack:${b.id}:${t.kind}`,
      targetId: b.id,
      tag: 'craft',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, { kind: 'deposit', label: `Leaving a spare ${t.kind} at the ${nameOf(b)}`, goal: 'so others can use it', targetId: b.id, targetType: 'building', tx: b.x, ty: b.y, spotX: spot.x, spotY: spot.y, utility: sc.total, minCommit: 20, maxTicks: 600, data: { items: { [t.kind]: 1 } } });
      },
    });
    break;
  }
}

// ───────────────────────── hauling with a cart ─────────────────────────
function optCartHaul(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.drives.hunger > 25 || ctx.drives.thirst > 25) return;
  const carts = beliefsByKind(p, ['cart']).filter((b) => b.state === 'parked' && (b.hh === p.hhId || b.hh === 0) && world.byId.get(b.id)?.ent === 'cart');
  const mineCart = p.cartId ? world.byId.get(p.cartId) : null;
  if (!carts.length && !(mineCart && mineCart.ent === 'cart')) return;
  const cb = carts[0] ?? (mineCart ? ({ id: mineCart.id, x: p.x, y: p.y } as Belief) : null);
  if (!cb) return;
  const cartEnt = world.byId.get(cb.id);
  if (!cartEnt || cartEnt.ent !== 'cart' || cartLoaded(cartEnt)) return;
  for (const site of beliefsByKind(p, ['site'])) {
    const rel = p.beliefs[site.id];
    if (!rel || !(site.hh === p.hhId || site.hh === 0 || friendlyTo(ctx, site.hh ?? -1) >= 20 || (site.btype && isFacilityType(site.btype as BuildingType)))) continue;
    const need = site.need ?? {};
    const kinds = Object.keys(need) as ItemKind[];
    if (!kinds.length) continue;
    // where is the stuff? the one place that has the most of it
    let best: { src: Belief; load: Items; weight: number } | null = null;
    for (const src of beliefsByKind(p, ['building', 'pile'])) {
      if(!mayTakeKnownPile(p,src))continue;
      if (src.id === site.id) continue;
      if (src.kind === 'building' && src.btype && isFacilityType(src.btype as BuildingType) && !mayUseBelief(ctx, src)) continue;
      if (src.kind === 'building' && !isFacilityType(src.btype as BuildingType) && src.btype !== 'storehouse') continue;
      const load: Items = {};
      let w = 0;
      for (const k of kinds) {
        const n = Math.min(unitsOf(need[k]), stockAt(ctx,src, k));
        if (n <= 0) continue;
        const room = Math.floor((cartEnt.cap - w) / WEIGHT[k]);
        const take = Math.min(n, room);
        if (take > 0) {
          load[k] = take;
          w += take * WEIGHT[k];
        }
      }
      if (w >= 14 && (!best || w > best.weight)) best = { src, load, weight: w };
    }
    if (!best) continue;
    const eCart = eta(ctx, cb.x, cb.y);
    const eSrc = hyp(best.src.x - cb.x, best.src.y - cb.y) * 1.3 / Math.max(0.03, ctx.speed * 0.85);
    const eSite = hyp(site.x - best.src.x, site.y - best.src.y) * 1.3 / Math.max(0.03, ctx.speed * 0.8);
    const total = eCart + eSrc + eSite;
    // the same load on foot would take several trips, each a there-and-back over the same ground: that is what the wheels save
    const footTrips = Math.max(1, Math.ceil(best.weight / Math.max(4, CARRY_CAP[ctx.stage as keyof typeof CARRY_CAP] ?? 12)));
    const legEta = (hyp(site.x - best.src.x, site.y - best.src.y) * 1.18) / Math.max(0.03, ctx.speed);
    const sc = new Scorer().add('a cart can move all of it in one go', 24 + Math.min(14, best.weight * 0.3));
    if (footTrips > 1) sc.add(`it would take ${footTrips} trips on foot`, Math.min(40, (footTrips - 1) * pen(2 * legEta)));
    sc.add('walking', -pen(total) * 0.7);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    const load = best.load;
    const src = best.src;
    addOption(ctx, {
      kind: 'cart_haul',
      label: `Cart ${itemPhrase(load, world)} to the ${(site.btype ?? 'building').replace('_', ' ')} site`,
      goal: 'to bring the materials in one trip',
      need: null,
      util,
      parts: sc.parts,
      eta: total + 60,
      key: `cart:${cb.id}:${site.id}`,
      targetId: cb.id,
      tag: 'site',
      make: () => {
        const ce = world.byId.get(cb.id);
        if (!ce || ce.ent !== 'cart') return null;
        return newActivity(world, p, {
          kind: 'cart_haul',
          label: 'Fetching the handcart',
          goal: 'to bring the materials in one trip',
          targetId: ce.id,
          targetType: 'cart',
          tx: ce.x,
          ty: ce.y,
          spotX: ce.x,
          spotY: ce.y,
          utility: util,
          minCommit: 60,
          maxTicks: 2600,
          data: { cartId: ce.id, fromId: src.id, toId: site.id, items: load, leg: 0, sticky: true },
        });
      },
    });
    break;
  }
}

// ───────────────────────── starting a workplace ─────────────────────────
export interface FacilityWant {
  type: BuildingType;
  signal: number;
  why: string;
}

function ownsHut(ctx: Ctx): boolean {
  return !!ctx.home && isSolidHome(ctx.home.type);
}

function planksWanted(ctx: Ctx): number {
  let n = 0;
  for (const s of beliefsByKind(ctx.p, ['site'])) n += unitsOf(s.need?.planks);
  return n;
}

function bricksWanted(ctx: Ctx): number {
  let n = 0;
  for (const s of beliefsByKind(ctx.p, ['site'])) n += unitsOf(s.need?.bricks);
  return n;
}

/** Is this household a candidate for rebuilding its hut as a house? Crowded, with children or elders, or with a roof wearing thin. */
export function upgradeWish(ctx: Ctx): number {
  const { home, members, dependents } = ctx;
  if (!home || home.type !== 'hut' || home.upgrading) return 0;
  let w = 0;
  if (members.length >= 4) w += 0.45;
  else if (members.length >= 3) w += 0.25;
  if (dependents.length > 0) w += 0.3;
  if (home.condition < 72) w += 0.3;
  return Math.min(1, w);
}

export function facilityWants(ctx: Ctx): FacilityWant[] {
  const { p, world } = ctx;
  const out: FacilityWant[] = recoveredWorkshopWants(ctx);
  if(brewDemand(ctx)&&!beliefsByKind(p,['building','site']).some(b=>b.btype==='brewery'))out.push({type:'brewery',signal:.8,why:'spare grain and a known hall could support brewing for shared meals'});
  const knowTrees = countBeliefsOfKind(p, 'tree') >= 3;
  const knowRocks = countBeliefsOfKind(p, 'rock') + countBeliefsOfKind(p, 'outcrop') >= 1;
  if (!knowTrees || !knowRocks) return out;
  const hs = hhState(ctx);
  if(hasPreservation(world)&&!knowsEnough(ctx,'food_rack')&&(preservationSurplus(ctx)||(hasCarcasses(world)&&(p.inv.fat??0)>0)))
    out.push({type:'food_rack',signal:0.9,why:'spare fish or meat could be kept for later meals'});
  const init = 0.5 * p.traits.diligence + 0.3 * p.traits.curiosity + 0.2 * p.traits.generosity;
  const wish = upgradeWish(ctx);
  const haveYard = knowsOfAny(ctx, 'timber_yard');
  const haveKiln = knowsOfAny(ctx, 'kiln');
  const clayKnown = countBeliefsOfKind(p, 'clay_pit') > 0;
  const oreKnown = countBeliefsOfKind(p, 'ore_vein') > 0;
  const outcrops = beliefsByKind(p, ['outcrop']).filter((b) => b.amount >= 10);
  const stonePoor = countBeliefsOfKind(p, 'rock') < 4;
  const stoneNeeded = beliefsByKind(p, ['site']).reduce((n, s) => n + unitsOf(s.need?.stone), 0);
  // rules 162: a storehouse known to hold the stone a building costs makes it a little more attractive, once there is some other reason for it
  const storedStone = (type: BuildingType): number => (hasStoredStoneCue(world) && knownStoreHoldsStone(ctx, BUILD_DEF[type].stone) ? STORED_STONE_SIGNAL : 0);
  const solidHomes = beliefsByKind(p, ['building']).filter((b) => isSolidHome(b.btype)).length;
  const grainKnown = unitsOf(p.inv.grain) + beliefsByKind(p, ['building']).filter((b) => b.hh === p.hhId).reduce((n, b) => n + unitsOf(b.items?.grain), 0);
  const plots = world.plots.filter((pl) => pl.hhId === p.hhId).length;

  if (!knowsEnough(ctx, 'timber_yard')) {
    let s = 0;
    const insulation=hasClothing(world)&&!p.inv.garment&&(p.needs.warmth<65||world.weather.temp<12);
    if(insulation)s+=.6;
    const planks = planksWanted(ctx);
    if (planks > 0) s += 0.9;
    if (wish > 0.5) s += 0.55;
    if ((p.skills.carpentry > 1.05 || p.traits.curiosity > 0.6) && init > 0.5) s += 0.15;
    if (s >= 0.5) out.push({ type: 'timber_yard', signal: Math.min(1, s), why: planks > 0 ? 'planks are wanted and there is no yard to saw them' : insulation?'the cold calls for fibre insulation and there is no yard to make it':'the old hut is too small and too poor a roof: a yard would give us planks' });
  }
  if (!knowsOfAny(ctx, 'quarry') && outcrops.length > 0) {
    let s = 0;
    if (stoneNeeded >= 6) s += 0.7;
    if (stonePoor) s += 0.35;
    if (haveYard || knowsOfAny(ctx, 'kiln')) s += 0.15;
    if (s >= 0.55) out.push({ type: 'quarry', signal: Math.min(1, s), why: 'stone is wanted and loose rocks are few — there is a big outcrop to cut' });
  }
  if (!knowsEnough(ctx, 'kiln') && clayKnown) {
    let s = 0;
    if (bricksWanted(ctx) > 0) s += 0.9;
    if (wish > 0.5 && haveYard) s += 0.5;
    if (knowsOfAny(ctx, 'smithy') || (oreKnown && haveYard && init > 0.55)) s += 0.45;
    if (s > 0) s += storedStone('kiln');
    if (s >= 0.55) out.push({ type: 'kiln', signal: Math.min(1, s), why: bricks_or_charcoal(ctx) });
  }
  if (!knowsEnough(ctx, 'smithy') && oreKnown && haveKiln) {
    let s = 0;
    const worn = toolsHeldBy(world, p.id).some((t) => t.wear >= 25 && t.kind !== 'jar');
    if (worn) s += 0.5;
    if (!(unitsOf(p.inv.axe) > 0 && unitsOf(p.inv.pick) > 0)) s += 0.2;
    if (init > 0.5) s += 0.25;
    if (s > 0) s += storedStone('smithy');
    if (s >= 0.6 || (oreKnown && init > 0.5 && world.tick > DAY * 14)) out.push({ type: 'smithy', signal: Math.min(1, s), why: 'tools are wearing out and there is ore to be smelted' });
  }
  // rules 243 (grain_kept.ts): a worked plot is reason enough for a granary, and a granary or a worked plot for a bakery,
  // whether or not this household holds grain or is short of food
  const grainWorks = wantsGrainWorks(world);
  if (!knowsEnough(ctx, 'granary') && haveYard && (hs.shortage < 0.5 || (grainWorks && plots >= 1))) {
    let s = 0;
    if (grainKnown >= 6) s += 0.5;
    if (plots >= 2) s += 0.4;
    if (init > 0.45) s += 0.15;
    if (s > 0) s += storedStone('granary');
    if (grainWorks && plots >= 1) s = Math.max(s, GRAIN_WORKS_SIGNAL);
    if (s >= 0.6) out.push({ type: 'granary', signal: Math.min(1, s), why: grainWorks && plots >= 1 ? 'the grain from the plots wants keeping for bread' : 'the grain keeps going off in the stores' });
  }
  const bakeryFor = grainWorks && (plots >= 1 || knowsOfAny(ctx, 'granary'));
  if (!knowsEnough(ctx, 'bakery') && haveKiln && (hs.shortage < 0.4 || bakeryFor)) {
    let s = 0;
    if (grainKnown >= 8) s += 0.45;
    if (plots >= 2) s += 0.3;
    if (knowsOfAny(ctx, 'granary')) s += 0.2;
    if (p.traits.generosity > 0.5) s += 0.1;
    if (s > 0) s += storedStone('bakery');
    if (bakeryFor) s = Math.max(s, GRAIN_WORKS_SIGNAL);
    if (s >= 0.6) out.push({ type: 'bakery', signal: Math.min(1, s), why: 'grain could be milled and baked into bread' });
  }
  // a crowd wants a hall (rich only): once two dozen live here, somewhere to gather is wanted whether or not a yard stands
  const crowd = feelsCrowd(world, p); // rules 181: the people one knows of, not the world's live count
  if (!knowsEnough(ctx, 'hall') && (haveYard || crowd) && solidHomes >= 3 && hs.shortage < 0.5) {
    let s = 0.55 * p.traits.sociability + 0.3 * p.traits.generosity;
    if (solidHomes >= 5) s += 0.2;
    if (crowd) s += 0.3;
    if (s > 0) s += storedStone('hall');
    if (s >= 0.6) out.push({ type: 'hall', signal: Math.min(1, s), why: 'we need somewhere to eat and talk together out of the weather' });
  }
  return out;
}

function bricks_or_charcoal(ctx: Ctx): string {
  if (bricksWanted(ctx) > 0) return 'bricks are wanted and there is clay but no kiln';
  return 'clay could be fired into bricks and jars, and wood burned to charcoal';
}

function optPlanFacilities(ctx: Ctx): void {
  const { world, p, hh } = ctx;
  if (!hh || ctx.stage === 'child') return;
  if (world.settings.scene !== 'natural') return; // new projects are an ordinary-world decision; staged scenes stay as staged
  if (ctx.drives.hunger > 28 || ctx.drives.thirst > 28 || ctx.drives.energy > 40) return;
  if (world.tick < DAY * 5 || !ownsHut(ctx)) return; // establish shelter before adding a workplace
  if (beliefsByKind(p, ['building']).filter((b) => isSolidHome(b.btype)).length < 2) return;
  if (projectsUnderWay(world, false, settlementAnchor(ctx)) >= projectLimit(world)) return;
  if (beliefsByKind(p, ['site']).some((s) => s.hh === hh.id && s.btype && isFacilityType(s.btype as BuildingType))) return;
  const tm = traitMods(p);
  const init = 0.5 * p.traits.diligence + 0.3 * p.traits.curiosity + 0.2 * p.traits.generosity;
  if (init < 0.42) return;
  for (const w of facilityWants(ctx)) {
    const type = w.type;
    // improvements are taken up by a few, not by everyone on the same afternoon
    if (hashUnit(p.id, Math.floor(world.tick / 500), Object.keys(BUILD_DEF).indexOf(type)) > 0.25 + 0.4 * init) continue;
    const key = -3000 - Object.keys(BUILD_DEF).indexOf(type);
    if (recentFailure(world, p, key, 900)) {
      addBlocked(ctx, 'plan_site', `Lay out a ${BUILD_DEF[type].label}`, 0, 'could not find a good spot or was beaten to it recently', 'build');
      continue;
    }
    const base = (9 + 20 * w.signal) * tm.work * (0.7 + 0.5 * init);
    const sc = new Scorer().add(w.why, base);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    addOption(ctx, {
      kind: 'plan_site',
      label: `Lay out a ${BUILD_DEF[type].label}`,
      goal: w.why,
      need: null,
      util,
      parts: sc.parts,
      eta: 70,
      key: `plan_site:${type}`,
      targetId: 0,
      tag: 'build',
      make: () => {
        const d = BUILD_DEF[type];
        const camp = baseHub(world, p, ctx.home);
        let spot: { x: number; y: number } | null = null;
        let depositId = 0;
        if (type === 'quarry'||type==='mine') {
          const dep = beliefsByKind(p, [type==='mine'?'ore_vein':'outcrop'])
            .filter((b) => b.amount >= (type==='mine'?6:10) && world.byId.get(b.id))
            .sort((a, c) => hyp(a.x - camp.x, a.y - camp.y) - hyp(c.x - camp.x, c.y - camp.y))[0];
          if (dep) {
            depositId = dep.id;
            spot = findBuildSpot(world, p, type, dep.x, dep.y, 1.5, 6, 3);
          }
        } else if (type === 'granary' || type === 'hall') spot = findBuildSpot(world, p, type, camp.x, camp.y, 3, 11, 6);
        else if (type === 'kiln' || type === 'smithy') spot = findBuildSpot(world, p, type, camp.x, camp.y, 7, 15, 10);
        else spot = findBuildSpot(world, p, type, camp.x, camp.y, 5, 14, 8);
        if (!spot) {
          noteFailure(world, p, key, 'no suitable spot');
          return null;
        }
        // rules 201 (shared_yard.ts): the first timber yard this person knows of is laid out as the shared project of rules 143
        const shared = firstYardShared(world, p, type);
        return newActivity(world, p, {
          kind: 'plan_site',
          label: shared ? `Marking out a proposed shared ${d.label}` : `Marking out a ${d.label}`,
          goal: shared ? `${w.why}; a shared ${d.label}, so that everyone here may use it` : w.why,
          tx: spot.x + d.w / 2,
          ty: spot.y + d.h / 2,
          spotX: spot.x + 0.5,
          spotY: spot.y + d.h + 0.5,
          utility: util,
          minCommit: 60,
          maxTicks: 800,
          data: { type, sx: spot.x, sy: spot.y, hh: hh.id, depositId, ...(shared ? { communal: true } : {}) },
        });
      },
    });
  }
}

/** A household that has outgrown its hut, and knows where planks and bricks come from, may decide to rebuild it as a house. */
function optPlanUpgrade(ctx: Ctx): void {
  const { world, p, hh, home } = ctx;
  if (!hh || !home || ctx.stage === 'child') return;
  if (world.settings.scene !== 'natural') return;
  if (ctx.drives.hunger > 28 || ctx.drives.thirst > 28) return;
  const wish = upgradeWish(ctx);
  if (wish < 0.45) return;
  const hs = hhState(ctx);
  if (hs.shortage > 0.35) return;
  if (projectsUnderWay(world, true, settlementAnchor(ctx)) >= projectLimit(world)) return;
  // the means have to exist or at least be under way, as far as this person knows
  const yard = knowsOfAny(ctx, 'timber_yard');
  const kiln = knowsOfAny(ctx, 'kiln');
  if (!yard || !kiln) return;
  if (beliefsByKind(p, ['site']).some((s) => s.hh === hh.id)) return;
  if (world.sites.some((s) => s.hhId === hh.id)) return;
  const key = -3500;
  if (recentFailure(world, p, key, 1200)) return;
  // not everyone in the household sets out to do it at once
  if (hashUnit(p.id, Math.floor(world.tick / 400), 31) > 0.35 + 0.4 * p.traits.diligence) return;
  const tm = traitMods(p);
  const sc = new Scorer().add('the hut is too small and wearing thin: rebuild it as a proper house', (10 + 20 * wish) * tm.work);
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  addOption(ctx, {
    kind: 'plan_site',
    label: 'Plan to rebuild the hut as a house',
    goal: 'to give the household a better home',
    need: null,
    util,
    parts: sc.parts,
    eta: 40,
    key: 'plan_site:house',
    targetId: home.id,
    tag: 'build',
    make: () => {
      const h = world.byId.get(home.id);
      if (!h || h.ent !== 'building' || h.type !== 'hut') {
        noteFailure(world, p, key, 'no hut to rebuild');
        return null;
      }
      const d = BUILD_DEF.house;
      return newActivity(world, p, {
        kind: 'plan_site',
        label: 'Marking out the rebuilding of the hut',
        goal: 'to give the household a better home',
        tx: h.x + d.w / 2,
        ty: h.y + d.h / 2,
        spotX: h.doorX + 0.5,
        spotY: h.doorY + 0.5,
        utility: util,
        minCommit: 40,
        maxTicks: 600,
        data: { type: 'house', sx: h.x, sy: h.y, hh: hh.id, upgradeOf: h.id },
      });
    },
  });
}

/** Only fresh personal sightings of accessible stocks justify preparation. */
export function preservationSurplus(ctx:Ctx):'fish'|'meat'|null {
  const stocks=[ctx.p.inv,...beliefsByKind(ctx.p,['building']).filter(b=>
    ctx.world.tick-b.seen<=DAY && (b.hh===ctx.p.hhId||b.hh===0)).map(b=>b.items??{})];
  if(hasCarcassSupply(ctx.world))stocks.push({meat:knownCarcassUnits(ctx,'meat')});
  const food=stocks.reduce((n,s)=>n+foodUnits(s),0);
  if(food<4)return null;
  for(const raw of ['fish','meat'] as const)if(stocks.reduce((n,s)=>n+(s[raw]??0),0)>=2)return raw;
  return null;
}

function preservationOptions(ctx:Ctx):void {
  if(!hasPreservation(ctx.world))return;
  const first=ctx.options.length;
  const racks=facilitiesOf(ctx,'food_rack');
  for(const f of racks){
    if(ctx.world.tick-f.b.seen>DAY)continue;
    // Collection and resumption do not require another raw surplus.
    const goods:Items={};
    let room=carryCap(ctx.world,ctx.p)-weightOf(ctx.p.inv),waiting=0;
    for(const k of ['dried_fish','smoked_fish','dried_meat','smoked_meat','rendered_fat'] as const){
      const stock=f.b.items?.[k]??0;waiting+=stock;
      const n=Math.min(2,stock,Math.max(0,Math.floor(room/WEIGHT[k])));
      if(n>0){goods[k]=n;room-=n*WEIGHT[k];}
    }
    if(foodUnits(goods)>0)collectLeaf(ctx,f.b,goods,28,'bring preserved food back for meals','food');
    else if(waiting>0)addBlocked(ctx,'withdraw','Collect preserved food',f.b.id,'no room to carry the preserved food','food');
    const running=f.b.ops?.job ? RECIPE_BY_ID[f.b.ops.job] : undefined;
    if(running?.preservation&&f.b.ops!.progress<1){
      planRecipe(ctx,f,running,Object.keys(running.outputs)[0] as ItemKind,2,27,'finish preserving the paid batch','food',0);
      continue;
    }
    if(hasCarcasses(ctx.world)&&waiting===0&&((ctx.p.inv.fat??0)+(f.b.items?.fat??0)+knownCarcassUnits(ctx,'fat')>0))planRecipe(ctx,f,RECIPE_BY_ID.render_fat,'rendered_fat',1,30,'prepare recovered fat for food','food',0);
    const raw=preservationSurplus(ctx);
    if(!raw||waiting>0)continue;
    const method=ctx.world.weather.rain>0.1?'smoke':'dry';
    const r=RECIPE_BY_ID[`${method}_${raw}`];
    planRecipe(ctx,f,r,Object.keys(r.outputs)[0] as ItemKind,2,27,'keep spare food for later meals','food',0);
  }
  for(let j=first;j<ctx.options.length;j++)ctx.options[j].preservesFood=true;
}

// ───────────────────────── entry point ─────────────────────────
export function productionOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child') return;
  if (!workRules(world.settings.scene)) return; // staged scenes stay exactly as staged
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 45) return;
  if (p.health < 45) return;
  preservationOptions(ctx);
  hearthOptions(ctx);
  if(beliefsByKind(p,['building']).some(b=>knownColdHearth(ctx,b))&&fuelAvailable(world,p,'wood')<1&&fuelAvailable(world,p,'offcuts')<1&&hasOffcuts(world))
    collectOptions(ctx,'offcuts',2,34,'reuse known offcuts to heat our home','fire',null);
  if(hasMealLeftovers(world)){
    // Only personally seen/heard household holdings; no lookup of a remote meal table.
    const known=beliefsByKind(p,['pile']).filter(b=>b.hh===p.hhId&&foodUnits(b.items??{})>0).sort((a,b)=>eta(ctx,a.x,a.y)-eta(ctx,b.x,b.y));
    for(const b of known.slice(0,2)){
      const items:Items={};let room=carryCap(world,p)-weightOf(p.inv),left=4;
      for(const k of ['bread','meat','fish','fruit','grain','berries', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat'] as const){
        const n=Math.min(left,b.items?.[k]??0,Math.floor(room/WEIGHT[k]));
        if(n>0){items[k]=n;left-=n;room-=n*WEIGHT[k];}
      }
      if(foodUnits(items)>0)collectLeaf(ctx,b,items,24+4*p.traits.generosity,runsRulesVersion(world,93)?'recover our food left outdoors before it spoils':'recover our leftover meal food before it spoils','meal');
    }
  }
  if(hasOffcuts(world)&&fuelAvailable(world,p,'offcuts')<4&&fuelAvailable(world,p,'wood')<2){
    const fires=beliefsByKind(p,['building']).filter(b=>b.btype==='fire'&&(b.fuel??0)-(world.tick-b.seen)*0.85<fireFuelWanted(world));
    const duty=hasWarmthDuty(world)&&fires.find(b=>fireCommitment(p,b.id));
    if(fires.length&&(!duty||fuelAvailable(world,p,'wood')<1&&fuelAvailable(world,p,'offcuts')<1))collectOptions(ctx,'offcuts',(duty?1:4)-fuelAvailable(world,p,'offcuts'),duty?48:24+6*p.traits.generosity,duty?`reuse known offcuts for the fire I promised to keep (#${duty.id})`:'reuse known offcuts to keep a low fire burning','fire',null);
  }
  const demands = demandsOf(ctx);
  for (const d of demands) if(!PRESERVED_FOODS.some(k=>k===d.item)) supply(ctx, d.item, d.qty, d.base, d.why, d.tag, 0, null, d.item === 'cart' || d.tier ? d.have : undefined, d.siteId ?? 0);
  communalStockOptions(ctx);
  materialsHomeOption(ctx);
  forestryOptions(ctx);
  projectOptions(ctx);
  optGranaryStore(ctx);
  optTendGranary(ctx);
  optToolMaintenance(ctx);
  optCartHaul(ctx);
  cartTripOptions(ctx);
  optRackSpare(ctx);
  sawToYardOption(ctx, facilitiesOf(ctx, 'timber_yard')); // rules 229 (site_supply.ts)
  optPlanFacilities(ctx);
  optPlanUpgrade(ctx);
}

/** A saved prerequisite selects which existing leaf needs an offer, without bypassing that leaf's checks. */
function projectOptions(ctx:Ctx):void{
 if(!hasProjectPlans(ctx.world))return;
 for(const i of ctx.p.intentions){
  if(i.status!=='active'||!i.project)continue;
  if(i.forSite&&(ctx.p.inv[i.makes as ItemKind]??0)>0)continue;
  const step=nextProjectStep(ctx,i.project,i),n=step.node,item=n.item as ItemKind;
  const scratch:Ctx={...ctx,options:[],blocked:[]},why=`to ${i.goal}`,base=28,tag='craft';
  const b=step.target?ctx.p.beliefs[step.target]:undefined;
  if(step.phase==='acquire'&&n.item!=='cart')supply(scratch,item,step.quantity,base,why,tag,0,n.destination?ctx.p.beliefs[n.destination]:null,hasProjectAcquire(ctx.world)?0:undefined);
  if(step.phase==='deposit'&&b&&n.item!=='cart')depositLeaf(scratch,b,{[item]:step.quantity},base,why,tag);
  if(step.phase==='collect'&&b&&n.item!=='cart'){
   const count=Math.min(step.quantity,invRoom(ctx.world,ctx.p,item));if(count>=1)collectLeaf(scratch,b,{[item]:count},base,why,tag);
  }
  if(step.phase==='operate'&&b){
   const r=RECIPE_BY_ID[n.recipe],fac=r?facilitiesOf(ctx,r.at).find(f=>f.b.id===b.id):undefined;
   // rules 99 (ready_step.ts): everything the step takes is on the shelf as last seen, and the tool is to hand
   const ready=r&&fac&&stepPrepared(ctx.world,ctx.p,b,r,toolAvailable(ctx,fac,r))?`everything for it is already at the ${nameOf(b)}`:'';
   if(r&&fac)planRecipe(scratch,fac,r,n.item,step.quantity,base,why,tag,0,0,undefined,ready);
  }
  if(step.phase==='craft')scratch.toolWanted={kind:item as ToolKind,for:i.goal,required:true};
  if(step.phase==='wait'&&!RECIPE_BY_ID[n.recipe]?.preservation)addOption(scratch,{kind:'rest',label:'Wait for my batch',goal:step.reason,need:null,util:base,parts:[['my batch is still finishing',base]],eta:step.wait,key:`project_wait:${i.id}:${n.id}`,targetId:step.target,tag:'rest',
   make:()=>newActivity(ctx.world,ctx.p,{kind:'rest',label:'Waiting for my batch',goal:step.reason,targetId:step.target,here:true,amount:step.wait,utility:base,minCommit:10,maxTicks:step.wait+20,data:{projectWait:true,forPlan:i.id}})});
  if(step.phase==='blocked')addBlocked(scratch,'operate',i.goal,step.target,step.reason,tag);
  if(scratch.toolWanted)ctx.toolWanted=scratch.toolWanted;
  for(const o of scratch.options){
   if(step.phase==='acquire'&&n.item!=='cart'&&(o.kind==='withdraw'||o.kind==='gather'||o.kind==='fetch_water'))o.yields=item;
   const prior=ctx.options.find(x=>x.key===o.key),offer=prior??o;
   if(prior&&o.yields)prior.yields=o.yields;
   // rules 99 (ready_step.ts): the plan's reading of the same leaf, when it is the stronger one, is the one weighed and explained
   if(prior&&hasReadyStep(ctx.world)&&o.util>prior.util){prior.util=o.util;prior.parts=o.parts;prior.goal=o.goal;}
   const make=offer.make;
   if(make)offer.make=()=>{const a=make();if(a){a.data.forPlan=i.id;if(a.kind==='deposit')a.data.projectSupply=i.id;}return a;};
   if(!prior)ctx.options.push(offer);
  }
  for(const o of scratch.blocked)if(!ctx.blocked.some(x=>x.key===o.key&&x.blocked===o.blocked))ctx.blocked.push(o);
 }
}

void RECIPES;
void REPAIR_USES;
void weightOf;
void toolOf;
void belief;

/**
 * A person who would start a workshop if they only knew where the clay, the ore or the big outcrop was goes looking for it.
 * Returns what they are after, or null.
 */
export function depositLead(ctx: Ctx): { what: 'clay_pit' | 'ore_vein' | 'outcrop'; why: string } | null {
  const { p, world } = ctx;
  if (ctx.stage === 'child' || world.tick < DAY * 4) return null;
  const init = 0.5 * p.traits.diligence + 0.3 * p.traits.curiosity + 0.2 * p.traits.generosity;
  if (init < 0.45) return null;
  const hs = hhState(ctx);
  if (hs.shortage > 0.45) return null;
  const knowTrees = countBeliefsOfKind(p, 'tree') >= 3;
  if (!knowTrees) return null;
  if (countBeliefsOfKind(p, 'clay_pit') === 0 && (bricksWanted(ctx) > 0 || (upgradeWish(ctx) > 0.5 && knowsOfAny(ctx, 'timber_yard')))) return { what: 'clay_pit', why: 'to find clay for bricks' };
  if (countBeliefsOfKind(p, 'outcrop') === 0 && countBeliefsOfKind(p, 'rock') < 4 && beliefsByKind(p, ['site']).some((s) => unitsOf(s.need?.stone) >= 4)) return { what: 'outcrop', why: 'to find a big stone outcrop' };
  if (countBeliefsOfKind(p, 'ore_vein') === 0 && knowsOfAny(ctx, 'kiln') && toolsHeldBy(world, p.id).some((t) => t.wear >= 25 && t.kind !== 'jar')) return { what: 'ore_vein', why: 'to find ore for iron tools' };
  return null;
}
