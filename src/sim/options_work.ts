import { newActivity } from './activities';
import { BUILD_DEF, DAY, FIRE_MAX_FUEL, REPAIR_USES, SUNRISE, TOOLS, TOOL_RECIPE, WEIGHT, WORK, homeNoun, isHomeType, isSolidHome } from './constants';
import { openSitesNear, repairMaterial } from './act_build';
import { rulesOf, within } from './rules';
import { depositLead } from './production';
import { isFacilityType } from './recipes';
import { toolsHeldBy } from './toolreg';
import { findBuildSpot } from './buildings';
import { invRoom, roomFor } from './economy';
import { dayFraction } from './environment';
import { findPlotSpot } from './farming';
import { delBelief, estimatedAmount, noteFailure, recentFailure } from './knowledge';
import { SOURCE_NOUN, SOURCE_VERB } from './labels';
import { drive } from './needs';
import { stageOf } from './people';
import { Scorer, addBlocked, addOption, beliefsByKind, countBeliefsOfKind, dangerAt, eta, foodCount, pen, rankWaterSpots, sourceUsable, spotNear, traitMods, whereIs } from './optutil';
import type { Ctx } from './optutil';
import { foragePlans } from './options_survival';
import { isFreeLand } from './registry';
import { affinityOf } from './relations';
import { hashUnit } from './rng';
import type { Belief, BeliefKind, BuildingType, Commitment, Items, ItemKind, Person, SourceType, ToolKind } from './types';
import { T } from './types';

const unitsOf = (n: number | undefined): number => n ?? 0;

// ───────────────────────── household situation ─────────────────────────
export interface HhState {
  foodStock: number;
  foodTarget: number;
  shortage: number;
  homeFood: number;
  homeSeeds: number;
  homeBelief: Belief | null;
}

export function hhState(ctx: Ctx): HhState {
  const { p, world } = ctx;
  let homeFood = 0;
  let homeSeeds = 0;
  let homeBelief: Belief | null = null;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.hh === p.hhId && isHomeType(b.btype)) {
      homeFood += foodCount(b.items ?? {});
      homeSeeds += unitsOf(b.items?.seeds);
      if (!homeBelief || isSolidHome(b.btype)) homeBelief = b;
    }
  }
  const mem = Math.max(1, ctx.members.length);
  const foodStock = ctx.food + homeFood;
  const foodTarget = (ctx.dependents.length > 0 || mem > 1 ? 6 : 4.5) * mem;
  const shortage = Math.max(0, Math.min(1, 1 - foodStock / foodTarget));
  void world;
  return { foodStock, foodTarget, shortage, homeFood, homeSeeds, homeBelief };
}

export function nightMult(ctx: Ctx): number {
  return ctx.night ? 0.22 : 1;
}

export function weatherMult(ctx: Ctx): number {
  const w = ctx.world.weather;
  return 1 - 0.55 * w.storm * traitMods(ctx.p).caution - 0.15 * w.rain * traitMods(ctx.p).caution;
}

/**
 * Where this person's settlement is, for the rules that count things "in the same settlement" (rules.ts): their home, or the camp if
 * they have none. With the ordinary rules that radius is the whole world, so this makes no difference.
 */
export function settlementAnchor(ctx: Ctx): { x: number; y: number } {
  const home = ctx.home;
  return home ? { x: home.x + home.w / 2, y: home.y + home.h / 2 } : { x: ctx.world.camp.x, y: ctx.world.camp.y };
}

export function friendlyTo(ctx: Ctx, hhId: number): number {
  let best = -100;
  for (const q of ctx.world.persons) {
    if (!q.alive || q.hhId !== hhId) continue;
    best = Math.max(best, affinityOf(ctx.p, q.id));
  }
  return best;
}

/**
 * How much fuel the camp fire should hold right now. By day a little is enough; from the afternoon on it has to be built up
 * so that it lasts until sunrise, because nobody is awake to feed it in the small hours.
 */
export function fireFuelWanted(world: Ctx['world']): number {
  const frac = dayFraction(world.tick);
  const eveningComing = frac > 0.55 || frac < SUNRISE;
  if (!eveningComing) return 500;
  const untilDawn = ((SUNRISE - frac + 1) % 1) * DAY;
  return Math.min(FIRE_MAX_FUEL * 0.8, untilDawn + 250);
}

/**
 * How much does keeping this building sound matter to this person? 1 for their own home (or the storehouse),
 * less for a neighbour's home when the people living there cannot easily manage it themselves (only elders and children)
 * and the helper is the sort to lend a hand, 0 for everything else.
 */
export function repairStake(ctx: Ctx, b: Belief): number {
  if (b.btype === 'storehouse' || b.hh === ctx.p.hhId) return 1;
  // having promised to mend it
  if (ctx.p.commitments.some((c) => c.status === 'active' && c.kind === 'work' && c.destKind === 'building' && c.destId === b.id)) return 1;
  // a common hall, granary or workshop belongs to everybody: those who use it keep it up
  if (b.hh === 0 && isFacilityType(b.btype as BuildingType) && b.btype !== undefined) return 0.5 + 0.5 * ctx.p.traits.generosity;
  if (!isHomeType(b.btype) || !b.hh) return 0;
  const { world, p } = ctx;
  let dwellers = 0;
  let strong = 0;
  for (const q of world.persons) {
    if (!q.alive || q.hhId !== b.hh) continue;
    dwellers++;
    const st = stageOf(world, q);
    if (st === 'adult' || st === 'youth') strong++;
  }
  if (dwellers === 0) return 0;
  const f = friendlyTo(ctx, b.hh);
  if (strong === 0) return f >= 5 || p.traits.generosity > 0.6 ? 0.5 + 0.5 * p.traits.generosity : 0;
  return f >= 30 ? 0.25 + 0.25 * p.traits.generosity : 0;
}

/** should this person consider a site (by its owner household) to be theirs or a friend's to help with? */
/** a building site in words that read naturally after "for" / "to finish" */
export function siteNoun(why: string, btype?: string): string {
  const t = (btype ?? 'building').replace('_', '-');
  if (why === 'a shared project') return `the shared ${t}`;
  if (why === 'a promise I made') return `the ${t} I promised to help with`;
  return `${why} ${t}`;
}

export function siteRelation(ctx: Ctx, b: Belief): { ok: boolean; mult: number; why: string } {
  if (b.hh === ctx.p.hhId) return { ok: true, mult: 1, why: 'my household’s' };
  // a workshop, granary or hall will serve everyone: people are glad to help raise one
  if (b.btype && isFacilityType(b.btype as BuildingType)) return { ok: true, mult: 0.38 + 0.5 * ctx.p.traits.generosity + 0.22 * ctx.p.traits.sociability, why: 'a shared project' };
  if (b.hh === 0) return { ok: true, mult: 0.45 + 0.7 * ctx.p.traits.generosity, why: 'a shared project' };
  const f = friendlyTo(ctx, b.hh ?? 0);
  if (f >= 28) return { ok: true, mult: 0.35 + (f - 28) / 100 + 0.25 * ctx.p.traits.generosity, why: 'a friend’s' };
  return { ok: false, mult: 0, why: 'belongs to people they hardly know' };
}

// ───────────────────────── food stockpiling ─────────────────────────
function optStockpile(ctx: Ctx): void {
  const { p } = ctx;
  if (ctx.drives.hunger > 22) return; // personal hunger is handled elsewhere
  const hs = hhState(ctx);
  const tm = traitMods(p);
  let depHunger = 0;
  for (const d of ctx.dependents) depHunger = Math.max(depHunger, Math.max(0, 55 - d.needs.hunger) / 55);
  const providerBonus = ctx.dependents.length > 0 ? 7 : 0;
  const base = (9 + 26 * hs.shortage + providerBonus + 18 * depHunger) * tm.work * nightMult(ctx) * weatherMult(ctx);
  if (base < 6) return;
  if (ctx.food >= 8) return; // already carrying plenty: bring it home instead
  foragePlans(ctx, { urgency: base, mode: 'stock', baseLabel: hs.shortage > 0.5 ? 'household is short of food' : 'building a food reserve' });
}

function optDepositFood(ctx: Ctx): void {
  const { world, p } = ctx;
  const keepSelf = ctx.drives.hunger > 0 ? 3 : 2;
  const surplus = ctx.food - keepSelf;
  if (surplus < 2) return;
  const mem = Math.max(1, ctx.members.length);
  void mem;
  for (const b of beliefsByKind(p, ['building'])) {
    const mine = b.hh === p.hhId && isHomeType(b.btype);
    const comm = b.btype === 'storehouse';
    if (!mine && !comm) continue;
    const used = Object.entries(b.items ?? {}).reduce((s, [k, n]) => s + (n ?? 0) * WEIGHT[k as ItemKind], 0);
    const cap = BUILD_DEF[b.btype as BuildingType].cap;
    if (cap - used < 2) {
      addBlocked(ctx, 'deposit', 'Store food', b.id, 'remembers it being full', 'store');
      continue;
    }
    const e = eta(ctx, b.x, b.y);
    const sc = new Scorer()
      .add('surplus food', 10 + Math.min(surplus, 8) * 1.2)
      .add(mine ? 'for my household' : 'for everyone', mine ? 4 + ctx.dependents.length * 3 : 2 + 5 * p.traits.generosity)
      .add('walking', -pen(e));
    if (sc.total < 8) continue;
    const items: Record<string, number> = {};
    // deposit the better-keeping foods and keep a little for myself
    let toStore = surplus;
    for (const k of ['grain', 'fish', 'fruit', 'berries'] as ItemKind[]) {
      const have = p.inv[k] ?? 0;
      const give = Math.min(have, toStore);
      if (give > 0) {
        items[k] = give;
        toStore -= give;
      }
    }
    addOption(ctx, {
      kind: 'deposit',
      label: mine ? 'Bring food home' : 'Add food to the storehouse',
      goal: mine ? 'to feed the household' : 'to share with the community',
      need: null,
      util: sc.total * nightMult(ctx),
      parts: sc.parts,
      eta: e + 20,
      key: `deposit:${b.id}:food`,
      targetId: b.id,
      tag: 'store',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'deposit',
          label: mine ? 'Bringing food home' : 'Taking food to the storehouse',
          goal: mine ? 'to feed the household' : 'to share with the community',
          targetId: b.id,
          targetType: 'building',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          utility: sc.total,
          minCommit: 40,
          maxTicks: 600,
          data: { items },
        });
      },
    });
  }
}

// ───────────────────────── materials ─────────────────────────
export interface MatNeed {
  siteId?: number;
  item: ItemKind;
  n: number;
  base: number;
  why: string;
  tag: string;
}

export function relevantSites(ctx: Ctx): { b: Belief; rel: ReturnType<typeof siteRelation> }[] {
  const out: { b: Belief; rel: ReturnType<typeof siteRelation> }[] = [];
  for (const b of beliefsByKind(ctx.p, ['site'])) {
    const rel = siteRelation(ctx, b);
    const committed = ctx.p.commitments.some((c) => c.status === 'active' && c.siteId === b.id);
    if (rel.ok || committed) out.push({ b, rel: committed ? { ok: true, mult: Math.max(rel.mult, 1), why: 'a promise I made' } : rel });
  }
  return out;
}

export function materialNeeds(ctx: Ctx): MatNeed[] {
  const { p, world } = ctx;
  const needs: MatNeed[] = [];
  for (const { b, rel } of relevantSites(ctx)) {
    for (const k in b.need ?? {}) {
      const n = unitsOf(b.need?.[k as ItemKind]);
      if (n > 0) needs.push({ item: k as ItemKind, n, base: 34 * rel.mult + 4, why: `for ${siteNoun(rel.why, b.btype)}`, tag: 'site', siteId: b.id });
    }
  }
  // repairs
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype === 'fire') {
      const fuel = (b.fuel ?? 0) - (world.tick - b.seen) * 0.85;
      if (fuel < fireFuelWanted(world)) {
        if (hashUnit(p.id, Math.floor(world.tick / 400), b.id) < 0.3 + 0.45 * p.traits.generosity) needs.push({ item: 'wood', n: 2, base: 24 + 6 * p.traits.generosity, why: 'to keep the fire going', tag: 'fire' });
      }
      continue;
    }
    const stake = repairStake(ctx, b);
    if (stake > 0 && (b.cond ?? 100) < (stake === 1 ? 55 : 45)) {
      const cond = b.cond ?? 55;
      const own = stake === 1;
      const kind = (b.btype ?? 'building').replace('_', '-');
      const use = REPAIR_USES[(b.btype ?? 'hut') as BuildingType] ?? 'wood';
      needs.push({ item: use, n: use === 'wood' ? 2 : 1, base: (25 + (55 - cond) * 0.3) * stake, why: own ? `to repair the ${kind}` : `to help keep a neighbour’s ${kind} standing`, tag: 'repair' });
    }
  }
  // a tool this person wants
  const tool = wantedTool(ctx);
  if (tool) {
    const r = TOOL_RECIPE[tool];
    if (r.wood) needs.push({ item: 'wood', n: r.wood, base: 15 * p.traits.diligence + 6, why: `to make ${/^[aeiou]/.test(tool) ? 'an' : 'a'} ${tool}`, tag: 'craft' });
    if (r.stone) needs.push({ item: 'stone', n: r.stone, base: 15 * p.traits.diligence + 6, why: `to make ${/^[aeiou]/.test(tool) ? 'an' : 'a'} ${tool}`, tag: 'craft' });
  }
  // a worn tool is mended with a handle, or at a pinch a piece of wood
  for (const t of toolsHeldBy(world, p.id)) {
    if (t.wear >= 55 && (p.inv.handles ?? 0) < 1 && (p.inv.wood ?? 0) < 1 && t.kind !== 'jar') {
      needs.push({ item: 'wood', n: 1, base: 12 + (t.wear - 55) * 0.35, why: `to mend my ${TOOL_RECIPE[t.kind].label}`, tag: 'craft' });
      break;
    }
  }
  return needs;
}

export function wantedTool(ctx: Ctx): 'axe' | 'pick' | 'hoe' | 'basket' | 'hammer' | 'saw' | null {
  const { p, world } = ctx;
  if (ctx.stage === 'child') return null;
  const has = (t: ToolKind) => (p.inv[t] ?? 0) > 0;
  const knowTrees = countBeliefsOfKind(p, 'tree') >= 3;
  const knowRocks = countBeliefsOfKind(p, 'rock') >= 1;
  const farming = world.plots.some((pl) => pl.hhId === p.hhId) || ctx.seeds > 0;
  const builds = p.stats.built > 0 || beliefsByKind(p, ['site']).some((s) => s.hh === p.hhId);
  const options: { t: 'axe' | 'pick' | 'hoe' | 'basket' | 'hammer' | 'saw'; w: number }[] = [];
  if (!has('basket') && p.stats.gathered > 6) options.push({ t: 'basket', w: 1 + p.skills.forage });
  if (!has('axe') && knowTrees && p.stats.gathered > 3) options.push({ t: 'axe', w: p.skills.wood * 1.4 });
  if (!has('hoe') && farming) options.push({ t: 'hoe', w: p.skills.farm * 1.3 });
  if (!has('pick') && knowRocks && knowTrees) options.push({ t: 'pick', w: p.skills.stone });
  if (!has('hammer') && builds && p.stats.gathered > 6) options.push({ t: 'hammer', w: p.skills.build * 1.25 });
  if (!has('saw') && p.skills.carpentry > 1.04 && knowTrees && p.stats.crafted >= 1) options.push({ t: 'saw', w: p.skills.carpentry * 1.2 });
  // planks are wanted and there is a yard to work them at: the saw is what makes the difference
  const planksWanted = beliefsByKind(p, ['site']).some((s) => unitsOf(s.need?.planks) > 0) && beliefsByKind(p, ['building']).some((b) => b.btype === 'timber_yard');
  if (planksWanted && !has('saw') && knowTrees && p.skills.carpentry >= 0.95) options.push({ t: 'saw', w: 3 });
  // iron tools are forged with a hammer: someone who would swap a wearing tool for an iron one, and knows a smithy, needs their own
  if (!has('hammer') && beliefsByKind(p, ['building']).some((b) => b.btype === 'smithy') && toolsHeldBy(world, p.id).some((t) => t.tier === 0 && t.kind !== 'basket' && t.kind !== 'jar' && t.wear >= 18)) options.push({ t: 'hammer', w: 2 });
  if (!options.length) return null;
  options.sort((x, y) => y.w - x.w);
  return options[0].t;
}

export type RawMaterial = 'wood' | 'stone' | 'clay' | 'ore';
export const RAW_KINDS: Record<RawMaterial, BeliefKind[]> = { wood: ['tree'], stone: ['rock', 'outcrop'], clay: ['clay_pit'], ore: ['ore_vein'] };
export const isRawMaterial = (k: ItemKind): k is RawMaterial => k === 'wood' || k === 'stone' || k === 'clay' || k === 'ore';

export function gatherMaterial(ctx: Ctx, item: RawMaterial, want: number, base: number, why: string, tag: string): void {
  const { world, p } = ctx;
  const tm = traitMods(p);
  const kinds: BeliefKind[] = RAW_KINDS[item];
  const cands: { b: Belief; est: number; e: number; score: number }[] = [];
  for (const b of beliefsByKind(p, kinds)) {
    const u = sourceUsable(ctx, b, 1);
    if (!u.ok) continue;
    const e = eta(ctx, b.x, b.y);
    const dng = dangerAt(ctx, b.x, b.y);
    let crowd = 0;
    for (const s of ctx.seenPersons) if (s.act === 'gather' && Math.hypot(s.x - b.x, s.y - b.y) < 3) crowd++;
    const score = base - pen(e) - 24 * dng * tm.caution - Math.max(0, crowd - 1) * 5;
    cands.push({ b, est: u.est, e, score });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands.slice(0, 2)) {
    const type = c.b.kind as SourceType;
    const room = roomFor(p.inv, 9999, item) && invRoom(world, p, item);
    if (room < 1) continue;
    const units = Math.max(1, Math.min(want, Math.floor(c.est), room));
    const sc = new Scorer().add(why, base).add('walking', -pen(c.e));
    const sk = p.skills[type === 'tree' ? 'wood' : 'stone'];
    sc.add('good at it', (sk - 1) * 5);
    const dng = dangerAt(ctx, c.b.x, c.b.y);
    if (dng > 0) sc.add('wolf nearby', -24 * dng * tm.caution);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    addOption(ctx, {
      kind: 'gather',
      label: `${SOURCE_VERB[type]} ${why}`,
      goal: `${why}`,
      need: null,
      util,
      parts: sc.parts,
      eta: c.e + units * WORK[type],
      key: `gather:${c.b.id}`,
      targetId: c.b.id,
      tag,
      make: () => {
        const spot = spotNear(world, p, c.b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'gather',
          label: SOURCE_VERB[type],
          goal: why,
          targetId: c.b.id,
          targetType: 'source',
          tx: c.b.x,
          ty: c.b.y,
          spotX: spot.x,
          spotY: spot.y,
          amount: units,
          utility: util,
          minCommit: 80,
          maxTicks: 1300,
          data: { purpose: tag, stype: type },
        });
      },
    });
  }
  if (!cands.length) {
    addBlocked(ctx, 'gather', `Get ${item} ${why}`, 0, `does not know any ${SOURCE_NOUN[RAW_KINDS[item][0] as SourceType]} worth visiting`, tag);
  }
}

function optMaterials(ctx: Ctx): void {
  const needs = materialNeeds(ctx);
  if (!needs.length) return;
  const byItem: Record<string, { n: number; base: number; why: string; tag: string }> = {};
  for (const n of needs) {
    const cur = byItem[n.item];
    if (!cur) byItem[n.item] = { n: n.n, base: n.base, why: n.why, tag: n.tag };
    else {
      cur.n += n.n;
      if (n.base > cur.base) {
        cur.base = n.base;
        cur.why = n.why;
        cur.tag = n.tag;
      }
    }
  }
  for (const item of ['wood', 'stone', 'clay', 'ore'] as const) {
    const need = byItem[item];
    if (!need) continue;
    const have = ctx.p.inv[item] ?? 0;
    const missing = need.n - have;
    if (missing <= 0) continue;
    if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30) continue;
    gatherMaterial(ctx, item, missing, need.base * traitMods(ctx.p).work, need.why, need.tag);
  }
}

// ───────────────────────── building ─────────────────────────
export function fractionAvailable(b: Belief): number {
  const def = BUILD_DEF[(b.btype ?? 'lean_to') as BuildingType];
  const req: Items = def.cost;
  let f = 1;
  for (const k in req) {
    const need = unitsOf(req[k as ItemKind]);
    const miss = unitsOf(b.need?.[k as ItemKind]);
    f = Math.min(f, (need - miss) / need);
  }
  return Math.max(0, Math.min(1, f));
}

function optSites(ctx: Ctx): void {
  const { world, p } = ctx;
  const tm = traitMods(p);
  if (ctx.drives.hunger > 35 || ctx.drives.thirst > 35 || ctx.drives.energy > 45) return;
  for (const { b, rel } of relevantSites(ctx)) {
    const e = eta(ctx, b.x, b.y);
    const fail = recentFailure(world, p, b.id, 250);
    if (fail) {
      addBlocked(ctx, 'build', 'Work on the building site', b.id, `tried recently: ${fail.reason}`, 'site');
      continue;
    }
    const committed = p.commitments.some((c) => c.status === 'active' && c.siteId === b.id);
    // deliver what I am carrying
    const items: Record<string, number> = {};
    let any = false;
    for (const k in b.need ?? {}) {
      const have = p.inv[k as ItemKind] ?? 0;
      const give = Math.min(have, unitsOf(b.need?.[k as ItemKind]));
      if (give > 0) {
        items[k] = give;
        any = true;
      }
    }
    if (any) {
      const sc = new Scorer().add('carrying what it needs', 36 * rel.mult + 8).add('walking', -pen(e));
      if (committed) sc.add('I promised', 20);
      const util = sc.total * weatherMult(ctx);
      addOption(ctx, {
        kind: 'haul',
        label: `Deliver materials to the ${(b.btype ?? 'building').replace('_', '-')} site`,
        goal: `to help finish ${siteNoun(rel.why, b.btype)}`,
        need: null,
        util,
        parts: sc.parts,
        eta: e + 20,
        key: `haul:${b.id}`,
        targetId: b.id,
        tag: 'site',
        make: () => {
          const spot = spotNear(world, p, b);
          if (!spot) return null;
          return newActivity(world, p, {
            kind: 'haul',
            label: `Delivering ${Object.keys(items).join(' & ')} to the building site`,
            goal: `to help finish ${siteNoun(rel.why, b.btype)}`,
            targetId: b.id,
            targetType: 'site',
            tx: b.x,
            ty: b.y,
            spotX: spot.x,
            spotY: spot.y,
            utility: util,
            minCommit: 40,
            maxTicks: 800,
            data: { items },
          });
        },
      });
    }
    // work on it
    const avail = fractionAvailable(b);
    const done = b.progress ?? 0;
    const canWork = done < Math.min(1, 0.06 + avail) - 0.02;
    if (!canWork) {
      const miss = Object.entries(b.need ?? {})
        .map(([k, n]) => `${n} ${k}`)
        .join(', ');
      addBlocked(ctx, 'build', 'Work on the building site', b.id, `site is waiting for materials (${miss || 'unknown'})`, 'site');
      for (const cm of p.commitments) if (cm.status === 'active' && cm.siteId === b.id && cm.kind === 'help_build') markBlocked(world, cm, `the site was waiting for ${miss || 'materials'}`);
      continue;
    }
    const sc = new Scorer().add('building work to do', 33 * tm.work * rel.mult + 4).add('walking', -pen(e)).add('good builder', (p.skills.build - 1) * 6);
    if (committed) sc.add('I promised', 26);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    addOption(ctx, {
      kind: 'build',
      label: `Build the ${(b.btype ?? 'building').replace('_', '-')}`,
      goal: `to finish ${siteNoun(rel.why, b.btype)}`,
      need: null,
      util,
      parts: sc.parts,
      eta: e + 100,
      key: `build:${b.id}`,
      targetId: b.id,
      tag: 'site',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'build',
          label: `Building the ${(b.btype ?? 'building').replace('_', '-')}`,
          goal: `to finish ${siteNoun(rel.why, b.btype)}`,
          targetId: b.id,
          targetType: 'site',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          utility: util,
          minCommit: 120,
          maxTicks: 1400,
        });
      },
    });
  }
}

/** Decide to start a new building: shelter first, then a proper hut, then shared structures. */
function optPlanBuild(ctx: Ctx): void {
  const { world, p, hh } = ctx;
  if (!hh || ctx.stage === 'child') return;
  if (world.settings.scene !== 'natural') return; // staged scenes stay exactly as staged
  if (ctx.drives.hunger > 28 || ctx.drives.thirst > 28) return;
  const tm = traitMods(p);
  const mySites = beliefsByKind(p, ['site']).filter((b) => b.hh === hh.id);
  if (mySites.length > 0) return;
  if (world.sites.filter((s) => s.hhId === hh.id).length > 0) return; // someone in my household already started one
  const rules = rulesOf(world);
  const anchor = settlementAnchor(ctx);
  if (openSitesNear(world, anchor) >= rules.maxOpenSites) return;
  const hs = hhState(ctx);
  const knowTrees = countBeliefsOfKind(p, 'tree') >= 3;
  const knowRocks = countBeliefsOfKind(p, 'rock') >= 1;
  const members = ctx.members.length;
  const frac = dayFraction(world.tick);
  const duskish = frac > 0.62 || frac < 0.28;

  const tryPlan = (type: BuildingType, base: number, why: string): void => {
    const key = -1000 - Object.keys(BUILD_DEF).indexOf(type);
    if (recentFailure(world, p, key, 700)) {
      addBlocked(ctx, 'plan_site', `Lay out a ${BUILD_DEF[type].label}`, 0, 'could not find a good spot recently', 'build');
      return;
    }
    const sc = new Scorer().add(why, base * tm.work);
    if (duskish && type === 'lean_to') sc.add('night is coming', 8);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    addOption(ctx, {
      kind: 'plan_site',
      label: `Lay out a ${BUILD_DEF[type].label}`,
      goal: why,
      need: null,
      util,
      parts: sc.parts,
      eta: 60,
      key: `plan_site:${type}`,
      targetId: 0,
      tag: 'build',
      make: () => {
        const home = ctx.home;
        const ax = home ? home.x + home.w / 2 : world.camp.x;
        const ay = home ? home.y + home.h / 2 : world.camp.y;
        let spot = null as { x: number; y: number } | null;
        if (type === 'storehouse') spot = findBuildSpot(world, p, type, world.camp.x, world.camp.y, 4, 11, 7);
        else if (type === 'fire') spot = findBuildSpot(world, p, type, ax, ay, 3, 9, 5);
        else spot = findBuildSpot(world, p, type, ax, ay, 4, 16, type === 'hut' ? 8 : 6);
        if (!spot) {
          noteFailure(world, p, key, 'no suitable spot');
          return null;
        }
        const d = BUILD_DEF[type];
        const sx = spot.x;
        const sy = spot.y;
        // stand just in front of where it will be
        let stand = { x: sx + 0.5, y: sy + d.h + 0.5 };
        if (!isFreeLand(world, Math.floor(stand.x), Math.floor(stand.y)) && !world.solid[Math.floor(stand.y) * world.W + Math.floor(stand.x)]) stand = { x: stand.x, y: stand.y };
        return newActivity(world, p, {
          kind: 'plan_site',
          label: `Marking out a ${d.label}`,
          goal: why,
          tx: sx + d.w / 2,
          ty: sy + d.h / 2,
          spotX: stand.x,
          spotY: stand.y,
          utility: util,
          minCommit: 60,
          maxTicks: 700,
          data: { type, sx, sy, hh: hh.id },
        });
      },
    });
  };

  if (!ctx.home) {
    if (knowTrees) {
      const urgent = 22 + (hs.shortage < 0.6 ? 6 : 0) + 4 * Math.min(members, 3);
      tryPlan('lean_to', urgent, 'no shelter of our own yet');
    }
  } else if (ctx.home.type === 'lean_to') {
    const secure = hs.foodStock >= 3 * members;
    if (secure && knowTrees && knowRocks && members >= 2 && world.tick > 1500) {
      tryPlan('hut', 11 + 4 * Math.min(members, 4) + 6 * (hs.shortage < 0.3 ? 1 : 0), 'to build a proper hut');
    }
  }
  // shared storehouse, once the settlement has a few solid homes
  // (with scaled rules, "the settlement" is what lies within the settlement radius; with the ordinary rules it is the whole world)
  const sameSettlement = (x: number, y: number): boolean => within(rules.facilityRadius, anchor.x, anchor.y, x, y);
  const huts = world.buildings.filter((b) => isSolidHome(b.type) && sameSettlement(b.x + b.w / 2, b.y + b.h / 2)).length;
  const hasStore = beliefsByKind(p, ['building']).some((b) => b.btype === 'storehouse' && sameSettlement(b.x, b.y)) || beliefsByKind(p, ['site']).some((b) => b.btype === 'storehouse' && sameSettlement(b.x, b.y));
  if (!hasStore && huts >= 1 && knowTrees && knowRocks && !world.sites.some((s) => s.type === 'storehouse' && sameSettlement(s.x + s.w / 2, s.y + s.h / 2))) {
    const spirit = (p.traits.generosity + p.traits.sociability + p.traits.diligence) / 3;
    if (hs.shortage < 0.5 && spirit > 0.46) tryPlan('storehouse', 8 + 22 * spirit, 'a shared storehouse for the settlement');
  }
}

// ───────────────────────── repairs & the fire ─────────────────────────
function optRepairAndFire(ctx: Ctx): void {
  const { world, p } = ctx;
  const tm = traitMods(p);
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30) return;
  for (const b of beliefsByKind(p, ['building'])) {
    const e = eta(ctx, b.x, b.y);
    if (b.btype === 'fire') {
      const fuel = (b.fuel ?? 0) - (world.tick - b.seen) * 0.85;
      const wanted = fireFuelWanted(world);
      if (fuel > wanted || ctx.wood < 1) continue;
      if (!(ctx.night || world.light < 0.55 || world.weather.rain > 0.3 || fuel < 150 || wanted > 500)) continue;
      const lack = Math.max(0, Math.min(1, (wanted - fuel) / wanted));
      const cold = ctx.drives.warmth > 15;
      const sc = new Scorer().add(wanted > 500 ? 'the fire has to last the night' : 'the fire is getting low', 10 + 14 * lack + (ctx.night ? 8 : 0) + 8 * p.traits.generosity).add('walking', -pen(e));
      if (cold) sc.add('cold', ctx.drives.warmth * 0.55);
      addOption(ctx, {
        kind: 'fuel_fire',
        label: 'Add wood to the fire',
        goal: cold ? 'to keep the fire burning and get warm' : 'to keep the fire burning',
        need: cold ? 'warmth' : null,
        util: sc.total,
        parts: sc.parts,
        eta: e + 30,
        key: `fuel:${b.id}`,
        targetId: b.id,
        tag: 'fire',
        make: () => {
          const spot = spotNear(world, p, b);
          if (!spot) return null;
          return newActivity(world, p, {
            kind: 'fuel_fire',
            label: 'Feeding the fire',
            goal: 'to keep the fire burning',
            targetId: b.id,
            targetType: 'building',
            tx: b.x,
            ty: b.y,
            spotX: spot.x,
            spotY: spot.y,
            amount: Math.min(ctx.wood, 3),
            utility: sc.total,
            minCommit: 30,
            maxTicks: 500,
          });
        },
      });
      continue;
    }
    const stake = repairStake(ctx, b);
    if (stake > 0 && (b.cond ?? 100) < (stake === 1 ? 60 : 45)) {
      if (!repairMaterial({ type: (b.btype ?? 'hut') as BuildingType }, p.inv)) continue;
      const fail = recentFailure(world, p, b.id, 300);
      if (fail) continue;
      const own = stake === 1;
      const cond = b.cond ?? 60;
      // a roof that has all but gone is an emergency in cold or wet weather
      const chill = Math.max(0, Math.min(1, (10 - world.weather.temp) / 15)) + 0.4 * Math.min(1, world.weather.rain + world.weather.storm);
      const sc = new Scorer().add(own ? 'needs repair' : 'a neighbour’s home is falling apart', (18 + (60 - cond) * 0.6) * (1 + 0.5 * Math.min(1, chill)) * tm.work * stake).add('walking', -pen(e));
      const util = sc.total * (cond < 35 ? Math.max(nightMult(ctx), 0.55) : nightMult(ctx)) * weatherMult(ctx);
      addOption(ctx, {
        kind: 'repair',
        label: own ? `Repair the ${BUILD_DEF[(b.btype ?? 'hut') as BuildingType].label}` : `Help repair a neighbour’s ${BUILD_DEF[(b.btype ?? 'hut') as BuildingType].label}`,
        goal: own ? 'to keep it sound' : 'to keep a neighbour’s roof over their head',
        need: null,
        util,
        parts: sc.parts,
        eta: e + 80,
        key: `repair:${b.id}`,
        targetId: b.id,
        tag: 'repair',
        make: () => {
          const spot = spotNear(world, p, b);
          if (!spot) return null;
          return newActivity(world, p, {
            kind: 'repair',
            label: `Repairing the ${BUILD_DEF[(b.btype ?? 'hut') as BuildingType].label}`,
            goal: 'to keep it sound',
            targetId: b.id,
            targetType: 'building',
            tx: b.x,
            ty: b.y,
            spotX: spot.x,
            spotY: spot.y,
            utility: util,
            minCommit: 60,
            maxTicks: 700,
          });
        },
      });
    }
  }
}

// ───────────────────────── crafting ─────────────────────────
function optCraft(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30) return;
  const tool = wantedTool(ctx);
  if (!tool) return;
  const r = TOOL_RECIPE[tool];
  if (ctx.wood < r.wood || ctx.stone < r.stone) return;
  // workspace: home, storehouse, or the fire
  let best: Belief | null = null;
  let bd = 1e9;
  for (const b of beliefsByKind(p, ['building'])) {
    if (!(b.hh === p.hhId || b.btype === 'storehouse' || b.btype === 'fire')) continue;
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  if (!best) return;
  const target = best;
  const e = eta(ctx, target.x, target.y);
  const sc = new Scorer().add(`wants ${/^[aeiou]/.test(tool) ? 'an' : 'a'} ${tool}`, 17 + 8 * p.traits.diligence).add('walking', -pen(e));
  const util = sc.total * nightMult(ctx);
  addOption(ctx, {
    kind: 'craft',
    label: `Make ${/^[aeiou]/.test(tool) ? 'an' : 'a'} ${tool}`,
    goal: 'to work faster',
    need: null,
    util,
    parts: sc.parts,
    eta: e + r.work,
    key: `craft:${tool}`,
    targetId: target.id,
    tag: 'craft',
    make: () => {
      const spot = spotNear(world, p, target);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'craft',
        label: `Making ${/^[aeiou]/.test(tool) ? 'an' : 'a'} ${tool}`,
        goal: 'to work faster',
        targetId: target.id,
        targetType: 'building',
        tx: target.x,
        ty: target.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 80,
        maxTicks: 700,
        data: { tool },
      });
    },
  });
}

// ───────────────────────── farming ─────────────────────────
function optFarm(ctx: Ctx): void {
  const { world, p, hh } = ctx;
  if (!hh || ctx.stage === 'child') return;
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 40) return;
  const tm = traitMods(p);
  const hs = hhState(ctx);
  const mem = ctx.members.length;
  const mult = nightMult(ctx) * weatherMult(ctx) * tm.work;
  const seedsAvail = ctx.seeds;

  const myPlots = beliefsByKind(p, ['plot']).filter((b) => b.hh === hh.id);
  const wantPlots = 1 + Math.floor(mem / 2) + (hs.shortage > 0.4 ? 1 : 0);
  const insecure = 8 * hs.shortage;

  for (const b of myPlots) {
    const e = eta(ctx, b.x, b.y);
    const fail = recentFailure(world, p, b.id, 220);
    if (fail) {
      addBlocked(ctx, 'tend', 'Work the field', b.id, `tried recently: ${fail.reason}`, 'farm');
      continue;
    }
    const mk = (kind: 'till' | 'plant' | 'tend' | 'harvest', label: string, goal: string, util: number, parts: [string, number][]) => {
      addOption(ctx, {
        kind,
        label,
        goal,
        need: null,
        util,
        parts,
        eta: e + 60,
        key: `${kind}:${b.id}`,
        targetId: b.id,
        tag: 'farm',
        make: () => {
          const spot = spotNear(world, p, b);
          if (!spot) return null;
          return newActivity(world, p, {
            kind,
            label,
            goal,
            targetId: b.id,
            targetType: 'plot',
            tx: b.x,
            ty: b.y,
            spotX: spot.x,
            spotY: spot.y,
            utility: util,
            minCommit: 60,
            maxTicks: 700,
          });
        },
      });
    };
    if (b.state === 'tilling') {
      const sc = new Scorer().add('unfinished ground', 22 * mult + insecure).add('walking', -pen(e));
      mk('till', 'Finish preparing the field', 'to ready the ground for seed', sc.total, sc.parts);
    } else if (b.state === 'tilled') {
      if (seedsAvail >= 1) {
        const sc = new Scorer().add('seed in hand, ground ready', 34 * mult + insecure).add('walking', -pen(e));
        mk('plant', 'Plant seed', 'to grow a crop', sc.total, sc.parts);
      } else {
        addBlocked(ctx, 'plant', 'Plant seed', b.id, 'has no seeds', 'farm');
      }
    } else if (b.state === 'growing') {
      const last = p.cooldowns['tend' + b.id] ?? -9999;
      if (world.tick - last > 900) {
        const sc = new Scorer().add('crop needs care', 19 * mult + insecure * 0.5).add('walking', -pen(e));
        mk('tend', 'Tend the crops', 'to help the crop grow', sc.total, sc.parts);
      }
    } else if (b.state === 'ripe') {
      const sc = new Scorer().add('ripe crop', 38 * Math.max(0.8, mult) + insecure * 1.2).add('walking', -pen(e));
      mk('harvest', 'Harvest the crop', 'to bring in food and seed', sc.total, sc.parts);
    }
  }

  // break new ground
  const plotsNow = world.plots.filter((pl) => pl.hhId === hh.id).length;
  if (seedsAvail >= 1 && plotsNow < wantPlots && !myPlots.some((b) => b.state === 'tilling')) {
    const plantable = myPlots.filter((b) => b.state === 'tilled').length;
    if (plantable < seedsAvail) {
      const key = -2000;
      if (!recentFailure(world, p, key, 800)) {
        const sc = new Scorer().add('seed to sow, ground to prepare', (17 + insecure + (hs.shortage > 0.3 ? 4 : 0)) * mult);
        addOption(ctx, {
          kind: 'till',
          label: 'Break ground for a new plot',
          goal: 'to grow food near home',
          need: null,
          util: sc.total,
          parts: sc.parts,
          eta: 80,
          key: 'till:new',
          targetId: 0,
          tag: 'farm',
          make: () => {
            const spot = findPlotSpot(world, p);
            if (!spot) {
              noteFailure(world, p, key, 'no good farmland');
              return null;
            }
            return newActivity(world, p, {
              kind: 'till',
              label: 'Breaking new ground',
              goal: 'to grow food near home',
              tx: spot.x + 0.5,
              ty: spot.y + 0.5,
              spotX: spot.x + 0.5,
              spotY: spot.y + 1.5,
              utility: sc.total,
              minCommit: 80,
              maxTicks: 700,
              data: { px: spot.x, py: spot.y, hh: hh.id },
            });
          },
        });
      }
    }
  }
  // seeds in the home store but none on me
  if (seedsAvail < 1 && hs.homeSeeds >= 1 && (myPlots.some((b) => b.state === 'tilled') || plotsNow < wantPlots)) {
    for (const b of beliefsByKind(p, ['building'])) {
      if (b.hh !== hh.id || !isHomeType(b.btype) || unitsOf(b.items?.seeds) < 1) continue;
      const e = eta(ctx, b.x, b.y);
      const sc = new Scorer().add('seed for planting is at home', 20 * mult).add('walking', -pen(e));
      const n = Math.min(unitsOf(b.items?.seeds), 3);
      addOption(ctx, {
        kind: 'withdraw',
        label: 'Take seed from the home store',
        goal: 'to plant a crop',
        need: null,
        util: sc.total,
        parts: sc.parts,
        eta: e + 20,
        key: `withdraw:${b.id}:seeds`,
        targetId: b.id,
        tag: 'farm',
        make: () => {
          const spot = spotNear(world, p, b);
          if (!spot) return null;
          return newActivity(world, p, {
            kind: 'withdraw',
            label: 'Taking seed from the store',
            goal: 'to plant a crop',
            targetId: b.id,
            targetType: 'building',
            tx: b.x,
            ty: b.y,
            spotX: spot.x,
            spotY: spot.y,
            utility: sc.total,
            maxTicks: 500,
            data: { items: { seeds: n } },
          });
        },
      });
    }
  }
}

// ───────────────────────── belongings left lying about ─────────────────────────
/** What the dead (or the careless) left on the ground is picked up and put to use. */
function optSalvage(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child' || ctx.drives.hunger > 35 || ctx.drives.thirst > 35) return;
  const tm = traitMods(p);
  let considered = 0;
  for (const b of beliefsByKind(p, ['pile'])) {
    if (++considered > 10) break;
    const items = b.items ?? {};
    const want: Items = {};
    let value = 0;
    for (const t of TOOLS) {
      if (unitsOf(items[t]) > 0 && unitsOf(p.inv[t]) === 0) {
        want[t] = 1;
        value += 10;
      }
    }
    for (const k of ['seeds', 'wood', 'stone', 'planks', 'bricks', 'handles', 'charcoal', 'iron', 'clay', 'ore', 'flour', 'bread', 'berries', 'fruit', 'fish', 'grain'] as const) {
      const n = unitsOf(items[k]);
      if (n <= 0) continue;
      const heavy = k === 'wood' || k === 'stone' || k === 'planks' || k === 'bricks' || k === 'clay' || k === 'ore';
      const take = Math.min(n, invRoom(world, p, k), heavy ? 4 : 6);
      if (take <= 0) continue;
      want[k] = take;
      value += take * (k === 'seeds' ? 2 : heavy ? 1.4 : 1.8);
    }
    if (value < 4) continue;
    const dng = dangerAt(ctx, b.x, b.y);
    const e = eta(ctx, b.x, b.y);
    const sc = new Scorer().add('belongings lying about', (8 + Math.min(14, value)) * tm.work).add('walking', -pen(e));
    if (dng > 0) sc.add('wolf nearby', -24 * dng * tm.caution);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    addOption(ctx, {
      kind: 'withdraw',
      label: 'Gather up what was left behind',
      goal: 'to put left-behind belongings to use',
      need: null,
      util,
      parts: sc.parts,
      eta: e + 30,
      key: `withdraw:${b.id}:salvage`,
      targetId: b.id,
      tag: 'salvage',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'withdraw',
          label: 'Gathering up what was left behind',
          goal: 'to put left-behind belongings to use',
          targetId: b.id,
          targetType: 'pile',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          utility: util,
          maxTicks: 600,
          data: { items: want },
        });
      },
    });
  }
}

// ───────────────────────── water for others ─────────────────────────
function optWaterRun(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.drives.thirst > 20 || ctx.stage === 'child') return;
  if (ctx.water >= 2) return;
  let need = 0;
  for (const d of ctx.dependents) need = Math.max(need, Math.max(0, 52 - d.needs.thirst) / 52);
  const growing = world.plots.some((pl) => pl.hhId === p.hhId && pl.state === 'growing');
  const base = 7 + 28 * need + (growing ? 5 : 0);
  if (base < 11) return;
  const spot = rankWaterSpots(ctx, 1)[0];
  if (!spot) return;
  const b = spot.b;
  const e = spot.e;
  const sc = new Scorer().add(need > 0 ? 'someone at home is thirsty' : 'water for the crops', base * traitMods(p).work).add('walking', -pen(e));
  if (spot.dng > 0) sc.add('wolf nearby', -30 * spot.dng * traitMods(p).caution);
  if (spot.trouble > 0) sc.add('was driven off near here', -16 * spot.trouble);
  addOption(ctx, {
    kind: 'fetch_water',
    label: 'Fetch water',
    goal: need > 0 ? 'to bring water to the household' : 'to water the crops',
    need: null,
    util: sc.total * nightMult(ctx),
    parts: sc.parts,
    eta: e + 60,
    key: 'fetch_water',
    targetId: b.id,
    tag: 'water',
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) {
        delBelief(p, b.id);
        return null;
      }
      return newActivity(world, p, {
        kind: 'fetch_water',
        label: 'Fetching water',
        goal: need > 0 ? 'to bring water to the household' : 'to water the crops',
        targetId: b.id,
        targetType: 'tile',
        tx: spot.x,
        ty: spot.y,
        spotX: spot.x,
        spotY: spot.y,
        amount: need > 0 ? 3 : 2,
        utility: sc.total,
        minCommit: 40,
        maxTicks: 700,
      });
    },
  });
}

// ───────────────────────── exploring ─────────────────────────
function optExplore(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child' || ctx.night) return;
  // someone hungry with no known way to eat has every reason to go looking
  const noFoodLead = ctx.drives.hunger > 25 && !ctx.options.some((o) => o.tag === 'food' && (o.kind === 'gather' || o.kind === 'eat' || o.kind === 'eat_store'));
  const noWaterLead = ctx.drives.thirst > 18 && !ctx.options.some((o) => o.tag === 'water');
  // timber is wanted (a house to raise, a roof to mend) but there is no tree they know of left to fell
  const woodWanted = ctx.wood < 2 && materialNeeds(ctx).some((n) => n.item === 'wood');
  const noWoodLead = woodWanted && !ctx.options.some((o) => o.kind === 'gather' && (o.tag === 'site' || o.tag === 'repair' || o.tag === 'fire' || o.tag === 'craft'));
  // a workshop that cannot be started for want of clay, ore or a big outcrop: go and look
  const dLead = depositLead(ctx);
  const noLead = noFoodLead || noWaterLead || noWoodLead || !!dLead;
  if (!noLead && (ctx.drives.hunger > 40 || ctx.drives.thirst > 40 || ctx.drives.energy > 40)) return;
  if (world.tick - p.lastExploreTick < (noLead ? 250 : 520)) return;
  const tm = traitMods(p);
  const foodKnown = countBeliefsOfKind(p, 'berry_bush') + countBeliefsOfKind(p, 'fruit_tree') + countBeliefsOfKind(p, 'wild_grain') + countBeliefsOfKind(p, 'fish_spot');
  const hs = hhState(ctx);
  let base = 4 + 14 * tm.explore;
  // the strongest reason to go looking counts; reasons do not stack up
  let lead = 0;
  if (noFoodLead) lead = Math.max(lead, 8 + ctx.drives.hunger * 0.25);
  if (noWaterLead) lead = Math.max(lead, 10 + ctx.drives.thirst * 0.4);
  if (noWoodLead) lead = Math.max(lead, 16);
  if (dLead) lead = Math.max(lead, 14);
  if (foodKnown < 4) lead = Math.max(lead, 14);
  if (hs.shortage > 0.5) lead = Math.max(lead, 10);
  if (countBeliefsOfKind(p, 'tree') < 3 || countBeliefsOfKind(p, 'rock') < 1) lead = Math.max(lead, 6);
  base += lead;
  if (ctx.dangers.length) base -= 8 * tm.caution;
  if (ctx.stage === 'elder') base *= 0.5; // the old stay closer to home
  if (base < 8) return;
  const rMin = 11;
  const rMax = 24 + 10 * p.traits.curiosity;
  // pick a frontier: sample points and prefer those whose surroundings are unexplored
  let best: { x: number; y: number; score: number } | null = null;
  const ax = ctx.home ? ctx.home.x : world.camp.x;
  const ay = ctx.home ? ctx.home.y : world.camp.y;
  for (let i = 0; i < 16; i++) {
    const ang = hashUnit(p.id, Math.floor(world.tick / 60), i * 7) * Math.PI * 2;
    const r = rMin + hashUnit(p.id, Math.floor(world.tick / 60), i * 13 + 1) * (rMax - rMin);
    const x = Math.floor(ax + Math.cos(ang) * r);
    const y = Math.floor(ay + Math.sin(ang) * r);
    if (x < 3 || y < 3 || x >= world.W - 3 || y >= world.H - 3) continue;
    const idx = y * world.W + x;
    const t = world.terrain[idx];
    if (t === T.DEEP || t === T.SHALLOW || world.solid[idx]) continue;
    if (recentFailure(world, p, -(idx + 10), 1500)) continue;
    let unknown = 0;
    for (let k = 0; k < 9; k++) {
      const xx = Math.min(world.W - 1, Math.max(0, x + ((k % 3) - 1) * 4));
      const yy = Math.min(world.H - 1, Math.max(0, y + (Math.floor(k / 3) - 1) * 4));
      if (p.explored[yy * world.W + xx] === 0) unknown++;
    }
    if (unknown < 3) continue;
    const dng = dangerAt(ctx, x, y, 12);
    const score = unknown * 2 - Math.hypot(x - p.x, y - p.y) * 0.12 - dng * 14 * tm.caution + hashUnit(p.id, i, 3) * 1.5;
    if (!best || score > best.score) best = { x, y, score };
  }
  if (!best) return;
  const target = best;
  const e = Math.hypot(target.x - p.x, target.y - p.y) * 1.18 / Math.max(0.03, ctx.speed);
  const sc = new Scorer().add('curiosity', base * (hs.shortage > 0.6 ? 1 : 0.9)).add('walking', -pen(e) * 0.5).add('daylight to spare', 2);
  addOption(ctx, {
    kind: 'explore',
    label: noWaterLead ? 'Search for water' : noWoodLead && !noFoodLead ? 'Look for timber' : dLead && !noFoodLead ? `Look for ${dLead.what === 'clay_pit' ? 'clay' : dLead.what === 'ore_vein' ? 'ore' : 'stone'}` : 'Explore somewhere new',
    goal: noWaterLead ? 'to find water' : noWoodLead && !noFoodLead ? 'to find trees to fell' : dLead && !noFoodLead ? dLead.why : foodKnown < 4 || noFoodLead ? 'to look for food sources' : 'to see what is out there',
    need: noWaterLead ? 'thirst' : noFoodLead ? 'hunger' : null,
    util: sc.total * weatherMult(ctx),
    parts: sc.parts,
    eta: e + 20,
    key: 'explore',
    targetId: 0,
    tag: 'explore',
    make: () => {
      const spot = spotNear(world, p, { id: 0, kind: 'building', x: target.x + 0.5, y: target.y + 0.5, amount: 0, max: 0, seen: 0, src: 'seen', from: 0, learned: 0 });
      if (!spot) {
        noteFailure(world, p, -(target.y * world.W + target.x + 10), 'unreachable');
        return null;
      }
      return newActivity(world, p, {
        kind: 'explore',
        label: noWoodLead && !noFoodLead ? 'Looking for timber' : 'Exploring',
        goal: noWoodLead && !noFoodLead ? 'to find trees to fell' : foodKnown < 4 ? 'to look for food sources' : 'to see what is out there',
        tx: spot.x,
        ty: spot.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: sc.total,
        minCommit: 120,
        maxTicks: 1100,
        data: { where: `the ${directionName(world, spot.x, spot.y)}` },
      });
    },
  });
}

function directionName(world: { camp: { x: number; y: number } }, x: number, y: number): string {
  const dx = x - world.camp.x;
  const dy = y - world.camp.y;
  const sx = dx - dy;
  const sy = dx + dy;
  const ang = Math.atan2(sx, -sy);
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return names[Math.round(((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8] + ' country';
}

// ───────────────────────── looking after others ─────────────────────────
function optCare(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.dependents.length === 0 || ctx.stage === 'child') return;
  const tm = traitMods(p);
  for (const d of ctx.dependents) {
    const child = stageOf(world, d) === 'child';
    const hungry = d.needs.hunger < (child ? 66 : 50);
    const thirsty = d.needs.thirst < (child ? 58 : 46);
    const cold = d.needs.warmth < 34;
    if (!hungry && !thirsty && !cold) continue;
    // where are they? only what this person has actually seen
    const seenNow = ctx.seenPersons.find((s) => s.id === d.id);
    const wh = p.whereabouts[d.id];
    if (!seenNow && (!wh || world.tick - wh.tick > 700)) {
      addBlocked(ctx, 'give', `Care for ${d.name}`, d.id, 'does not know where they are', 'care');
      continue;
    }
    // someone who is asleep or already holding food does not need it pressed on them
    if (seenNow && seenNow.asleep && d.needs.hunger > 18 && d.needs.thirst > 18) continue;
    if (seenNow && !thirsty && seenNow.carrying.some((k) => k === 'berries' || k === 'fruit' || k === 'fish' || k === 'grain')) continue;
    if ((d.cooldowns.fedUntil ?? 0) > world.tick) continue;
    const px = seenNow ? seenNow.x : wh!.x;
    const py = seenNow ? seenNow.y : wh!.y;
    const e = eta(ctx, px, py);
    const give: Items = {};
    let what = '';
    if (hungry && ctx.food > 0) {
      // give what fits best
      const k = (['berries', 'fruit', 'grain', 'fish'] as ItemKind[]).find((x) => (p.inv[x] ?? 0) > 0);
      if (k) {
        give[k] = Math.min(p.inv[k] ?? 0, d.needs.hunger < 25 ? 3 : 2);
        what = k;
      }
    }
    if (thirsty && ctx.water > 0) {
      give.water = 1;
      what = what ? what + ' and water' : 'water';
    }
    if (Object.keys(give).length === 0) continue;
    const sev = Math.max(hungry ? (child ? 68 : 50) - d.needs.hunger : 0, thirsty ? (child ? 60 : 46) - d.needs.thirst : 0);
    const sc = new Scorer().add(`${d.name} needs ${what}`, (26 + sev * 0.9) * tm.give).add('walking', -pen(e));
    const rel = p.relations[d.id];
    if (rel?.kin === 'child' || rel?.kin === 'parent' || rel?.kin === 'partner') sc.add('family', 8);
    addOption(ctx, {
      kind: 'give',
      label: `Bring ${what} to ${d.name}`,
      goal: `to look after ${d.name}`,
      need: null,
      util: sc.total,
      parts: sc.parts,
      eta: e + 20,
      key: `give:${d.id}`,
      targetId: d.id,
      tag: 'care',
      make: () => {
        const spot = { x: px, y: py };
        return newActivity(world, p, {
          kind: 'give',
          label: `Bringing ${what} to ${d.name}`,
          goal: `to look after ${d.name}`,
          targetId: d.id,
          targetType: 'person',
          tx: px,
          ty: py,
          spotX: spot.x,
          spotY: spot.y,
          utility: sc.total,
          minCommit: 40,
          maxTicks: 600,
          data: { items: give, mode: 'care' },
        });
      },
    });
  }
}

// ───────────────────────── promises ─────────────────────────
/** Remember what has been standing in the way of a promise, so that if it fails the reason is on record. */
function markBlocked(world: Ctx['world'], c: Commitment, why: string): void {
  c.blocked = why;
  c.blockedAt = world.tick;
}

function optCommitments(ctx: Ctx): void {
  const { world, p } = ctx;
  for (const c of p.commitments) {
    if (c.status !== 'active') continue;
    if (c.kind === 'deliver' && c.item) {
      const to = world.byId.get(c.to);
      if (!to || to.ent !== 'person' || !to.alive) continue;
      const have = p.inv[c.item] ?? 0;
      const remaining = c.amount - (c.delivered ?? 0);
      if (remaining <= 0) continue;
      if (have >= remaining || (have >= 1 && world.tick - c.made > 600)) {
        const loc = whereIs(ctx, c.to, c.siteId);
        if (!loc) {
          addBlocked(ctx, 'give', `Keep promise to ${to.name}`, c.to, 'does not know where to find them', 'promise');
          markBlocked(world, c, 'did not know where to find them');
          continue;
        }
        const hx = loc.x;
        const hy = loc.y;
        const e = eta(ctx, hx, hy);
        const sc = new Scorer().add(`promised ${to.name} ${c.item}`, 54 + 10 * Math.max(0, (p.relations[c.to]?.trust ?? 10) / 100)).add('walking', -pen(e));
        const give: Items = { [c.item]: Math.min(have, remaining) };
        addOption(ctx, {
          kind: 'give',
          label: `Take ${c.item} to ${to.name} as promised`,
          goal: `to keep my promise to ${to.name}`,
          need: null,
          util: sc.total,
          parts: sc.parts,
          eta: e,
          key: `give:${c.to}:promise`,
          targetId: c.to,
          tag: 'promise',
          make: () =>
            newActivity(world, p, {
              kind: 'give',
              label: `Bringing ${c.item} to ${to.name} (promised)`,
              goal: `to keep my promise to ${to.name}`,
              targetId: c.to,
              targetType: 'person',
              tx: hx,
              ty: hy,
              spotX: hx,
              spotY: hy,
              utility: sc.total,
              minCommit: 60,
              maxTicks: 700,
              data: { items: give, mode: 'promise', commitmentId: c.id },
            }),
        });
      } else {
        // need to get it first
        const before = ctx.options.length;
        if (c.item === 'wood' || c.item === 'stone' || c.item === 'clay' || c.item === 'ore') {
          gatherMaterial(ctx, c.item, remaining - have, 52, `to keep my promise to ${to.name}`, 'promise');
        } else if (c.item === 'water') {
          // handled by water run with a bump below
          optPromisedWater(ctx, remaining - have, to.name);
        } else {
          foragePlans(ctx, { urgency: 54, mode: 'stock', baseLabel: `promised ${to.name} food` });
        }
        if (ctx.options.length === before) markBlocked(world, c, `no ${c.item} to be had from anywhere they know of`);
      }
    } else if (c.kind === 'haul' && c.item) {
      // bring a stated quantity to a named place: the delivery itself is the ordinary site-haul option, made urgent by the promise
      const remaining = c.amount - (c.delivered ?? 0);
      if (remaining <= 0) continue;
      const dest = c.siteId ? p.beliefs[c.siteId] : undefined;
      if (!dest) {
        markBlocked(world, c, 'does not know where the site is');
        addBlocked(ctx, 'haul', `Haul ${c.item} as promised`, c.siteId, 'does not know where the site is', 'promise');
        continue;
      }
      const have = p.inv[c.item] ?? 0;
      if (have < remaining) {
        const before = ctx.options.length;
        if (isRawMaterial(c.item)) gatherMaterial(ctx, c.item, remaining - have, 50, 'to keep my promise to bring it', 'promise');
        if (ctx.options.length === before && !isRawMaterial(c.item)) {
          // finished goods come from the workshops, through the ordinary supply planning (see production.ts); if that finds nothing it is a blocker
          if (!ctx.options.some((o) => o.tag === 'site' || o.tag === 'craft')) markBlocked(world, c, `no ${c.item} to be had`);
        } else if (ctx.options.length === before) markBlocked(world, c, `no ${c.item} to be had from anywhere they know of`);
      }
    } else if (c.kind === 'return_tool' && c.toolId) {
      const t = world.tools.find((x) => x.id === c.toolId);
      const lender = world.byId.get(c.to);
      if (!t || !t.loan || t.holder !== p.id || !lender || lender.ent !== 'person' || !lender.alive) continue;
      // give it back when finished with it, or when it is due
      const usingNow = !!p.activity && p.activity.phase === 'work' && (p.activity.kind === 'gather' || p.activity.kind === 'operate' || p.activity.kind === 'build' || p.activity.kind === 'repair' || p.activity.kind === 'till' || p.activity.kind === 'tend');
      const dueSoon = world.tick > c.deadline - 500;
      if (usingNow && !dueSoon) continue;
      const loc = whereIs(ctx, c.to, 0);
      if (!loc) {
        addBlocked(ctx, 'give', `Return the ${t.kind}`, c.to, 'does not know where to find them', 'promise');
        markBlocked(world, c, 'did not know where to find them');
        continue;
      }
      const e = eta(ctx, loc.x, loc.y);
      const sc = new Scorer().add(`borrowed ${lender.name}’s ${t.kind}`, (dueSoon ? 46 : 26) + 6 * (p.relations[c.to]?.trust ?? 10) / 100).add('walking', -pen(e));
      addOption(ctx, {
        kind: 'give',
        label: `Take ${lender.name}’s ${t.kind} back`,
        goal: `to keep my promise to return it`,
        need: null,
        util: sc.total,
        parts: sc.parts,
        eta: e,
        key: `give:${c.to}:return:${t.id}`,
        targetId: c.to,
        tag: 'promise',
        make: () =>
          newActivity(world, p, {
            kind: 'give',
            label: `Returning ${lender.name}’s ${t.kind}`,
            goal: 'to keep my promise to return it',
            targetId: c.to,
            targetType: 'person',
            tx: loc.x,
            ty: loc.y,
            spotX: loc.x,
            spotY: loc.y,
            utility: sc.total,
            minCommit: 40,
            maxTicks: 700,
            data: { items: {}, mode: 'return', toolId: t.id, commitmentId: c.id },
          }),
      });
    }
  }
}

function optPromisedWater(ctx: Ctx, n: number, who: string): void {
  const { world, p } = ctx;
  const spot = rankWaterSpots(ctx, 1)[0];
  if (!spot) return;
  const b = spot.b;
  const e = spot.e;
  const sc = new Scorer().add(`promised ${who} water`, 52).add('walking', -pen(e));
  if (spot.dng > 0) sc.add('wolf nearby', -30 * spot.dng * traitMods(p).caution);
  if (spot.trouble > 0) sc.add('was driven off near here', -16 * spot.trouble);
  addOption(ctx, {
    kind: 'fetch_water',
    label: 'Fetch water as promised',
    goal: `to keep my promise to ${who}`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + 40,
    key: 'fetch_water:promise',
    targetId: b.id,
    tag: 'promise',
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) {
        delBelief(p, b.id);
        return null;
      }
      return newActivity(world, p, {
        kind: 'fetch_water',
        label: 'Fetching water (promised)',
        goal: `to keep my promise to ${who}`,
        targetId: b.id,
        targetType: 'tile',
        spotX: spot.x,
        spotY: spot.y,
        tx: spot.x,
        ty: spot.y,
        amount: Math.max(1, n),
        utility: sc.total,
        minCommit: 40,
        maxTicks: 600,
      });
    },
  });
}

// ───────────────────────── empty houses ─────────────────────────
function optClaimHome(ctx: Ctx): void {
  const { world, p, hh } = ctx;
  if (!hh || ctx.stage === 'child') return;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.hh !== 0 || !isHomeType(b.btype)) continue;
    const e0 = world.byId.get(b.id);
    if (!e0 || e0.ent !== 'building' || e0.hhId !== 0) continue; // belief only; checked in reality on arrival
    if (ctx.home && (isSolidHome(ctx.home.type) || b.btype === 'lean_to')) continue;
    const e = eta(ctx, b.x, b.y);
    const sc = new Scorer().add('an empty home nobody uses', (ctx.home ? 18 : 30) * traitMods(p).work).add('walking', -pen(e));
    addOption(ctx, {
      kind: 'claim_home',
      label: `Move into the empty ${homeNoun(b.btype)}`,
      goal: 'to have a better home',
      need: null,
      util: sc.total * nightMult(ctx),
      parts: sc.parts,
      eta: e + 20,
      key: `claim_home:${b.id}`,
      targetId: b.id,
      tag: 'home',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, { kind: 'claim_home', label: 'Moving in', goal: 'to have a better home', targetId: b.id, targetType: 'building', tx: b.x, ty: b.y, spotX: spot.x, spotY: spot.y, utility: sc.total, maxTicks: 600 });
      },
    });
  }
}

// ───────────────────────── fallback ─────────────────────────
function optIdle(ctx: Ctx): void {
  const { world, p } = ctx;
  const ax = ctx.home ? ctx.home.doorX + 0.5 : world.camp.x;
  const ay = ctx.home ? ctx.home.doorY + 0.5 : world.camp.y + 2;
  const sc = new Scorer().add('nothing pressing', 6);
  addOption(ctx, {
    kind: 'wander',
    label: 'Potter about near home',
    goal: 'nothing needs doing right now',
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: 40,
    key: 'wander',
    targetId: 0,
    tag: 'idle',
    make: () => {
      for (let i = 0; i < 8; i++) {
        const ang = hashUnit(p.id, world.tick, i) * Math.PI * 2;
        const r = 1.5 + hashUnit(p.id, world.tick, i + 11) * 4.5;
        const x = ax + Math.cos(ang) * r;
        const y = ay + Math.sin(ang) * r;
        const tx = Math.floor(x);
        const ty = Math.floor(y);
        if (tx > 1 && ty > 1 && tx < world.W - 1 && ty < world.H - 1 && !world.solid[ty * world.W + tx] && world.terrain[ty * world.W + tx] !== T.DEEP && world.terrain[ty * world.W + tx] !== T.SHALLOW) {
          return newActivity(world, p, { kind: 'wander', label: 'Pottering about', goal: 'nothing needs doing right now', spotX: x, spotY: y, tx: x, ty: y, utility: sc.total, minCommit: 20, maxTicks: 300 });
        }
      }
      return newActivity(world, p, { kind: 'wander', label: 'Standing about', goal: 'nothing needs doing right now', here: true, utility: sc.total, minCommit: 10, maxTicks: 200 });
    },
  });
}

export function workOptions(ctx: Ctx): void {
  optStockpile(ctx);
  optDepositFood(ctx);
  optMaterials(ctx);
  optSites(ctx);
  optPlanBuild(ctx);
  optRepairAndFire(ctx);
  optCraft(ctx);
  optFarm(ctx);
  optWaterRun(ctx);
  optCare(ctx);
  optCommitments(ctx);
  optSalvage(ctx);
  optClaimHome(ctx);
  optExplore(ctx);
  optIdle(ctx);
}

void estimatedAmount;
void drive;
void T;
void ({} as Person);
