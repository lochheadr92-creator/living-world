import { newActivity } from './activities';
import { hasNightWaitBoundary } from './night_wait';
import { DAY } from './constants';
import { isRich } from './mood';
import { nightPlansOn, shelters, untilDaylight } from './intent';
import { hasHabitation, indoorHome } from './habitation';
import { payNudge } from './learning';
import { NUTRITION, isHomeType, isSolidHome, homeNoun } from './constants';
import { carryCap } from './people';
import { foodUnits, invRoom } from './economy';
import { hasCareCapacity } from './care_capacity';
import { withdrawAllowance } from './facilities';
import { hasWinterReserve } from './provision';
import { runsRulesVersion } from './rulesversion';
import { delBelief, estimatedAmount, recentFailure } from './knowledge';
import { FOOD_VALUE, SOURCE_VERB } from './labels';
import { hashUnit } from './rng';
import { dayFraction } from './environment';
import {
  Scorer,
  addBlocked,
  addOption,
  beliefsByKind,
  dangerAt,
  eta,
  fleeRadius,
  foodCount,
  pen,
  rankWaterSpots,
  sourceUsable,
  spotNear,
  traitMods,
} from './optutil';
import type { Ctx } from './optutil';
import type { Belief, FoodKind, ItemKind, Person, SourceType, World } from './types';
import { SOURCE_FOOD } from './food_help';
import { WORK } from './constants';

import { hyp } from './util';
import { householdById } from './households';
import { huntOptions } from './hunting';
import { defenceOptions } from './defence';
const FOOD_KINDS = ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot'] as const;

// ───────────────────────── flee ─────────────────────────
function optFlee(ctx: Ctx): void {
  const { world, p } = ctx;
  if (indoorHome(world, p)) return;
  let tx = 0;
  let ty = 0;
  let td = 99;
  for (const a of ctx.seenAnimals) {
    const d = hyp(a.x - p.x, a.y - p.y);
    if (d < td) {
      td = d;
      tx = a.x;
      ty = a.y;
    }
  }
  const fr = fleeRadius(p);
  if (td > fr) {
    // a very fresh sighting nearby still counts
    for (const b of ctx.dangers) {
      const d = hyp(b.x - p.x, b.y - p.y);
      if (world.tick - b.seen < 120 && d < Math.min(7, fr) && d < td) {
        td = d;
        tx = b.x;
        ty = b.y;
      }
    }
  }
  if (td > fr) return;

  // already safe where we stand?
  let near = 0;
  for (const s of ctx.seenPersons) if (hyp(s.x - p.x, s.y - p.y) < 4.5) near++;
  let atFire = false;
  let atHut = false;
  for (const b of world.buildings) {
    if (b.type === 'fire' && b.fuel > 0 && hyp(b.x + 0.5 - p.x, b.y + 0.5 - p.y) < 5.5) atFire = true;
    if (!hasHabitation(world) && isSolidHome(b.type) && hyp(b.x + b.w / 2 - p.x, b.y + b.h / 2 - p.y) < 2.8) atHut = true;
  }
  if ((near >= 2 || atFire || atHut) && td > 3.5) return;

  // choose a refuge among places they know about
  let best: { x: number; y: number; score: number; what: string; homeId?: number } | null = null;
  for (const b of beliefsByKind(p, ['building'])) {
    const isFire = b.btype === 'fire' && (b.fuel ?? 0) - (world.tick - b.seen) > 0;
    const isHome = isHomeType(b.btype) && b.hh === p.hhId;
    if (!isFire && !(isHome && isSolidHome(b.btype))) continue;
    const dMe = hyp(b.x - p.x, b.y - p.y);
    const dTh = hyp(b.x - tx, b.y - ty);
    if (dTh < dMe * 0.7) continue; // would run toward the danger
    const score = -dMe + 0.6 * dTh + (isFire ? 3 : 4);
    if (!best || score > best.score) best = { x: b.x, y: b.y, score, what: isFire ? 'the fire' : 'home', homeId: isHome ? b.id : undefined };
  }
  for (const s of ctx.seenPersons) {
    if (s.child) continue;
    const dMe = hyp(s.x - p.x, s.y - p.y);
    const dTh = hyp(s.x - tx, s.y - ty);
    if (dTh < dMe) continue;
    const score = -dMe * 1.15 + 0.5 * dTh - 2;
    if (!best || score > best.score) best = { x: s.x, y: s.y, score, what: 'other people' };
  }
  if (!best) {
    // just run directly away
    const ang = Math.atan2(p.y - ty, p.x - tx);
    best = { x: p.x + Math.cos(ang) * 10, y: p.y + Math.sin(ang) * 10, score: 0, what: 'away from it' };
  }
  const bx = Math.min(world.W - 2, Math.max(2, best.x));
  const by = Math.min(world.H - 2, Math.max(2, best.y));
  const sc = new Scorer().add('danger close', 92 + 38 * (1 - td / 12.5) * traitMods(p).caution);  const what = best.what;
  addOption(ctx, {
    kind: 'flee',
    label: `Run to safety (${what})`,
    goal: 'to get away from the wolf',
    need: 'safety',
    util: sc.total,
    parts: sc.parts,
    eta: 40,
    key: 'flee:0',
    targetId: 0,
    make: () => {
      // find a tile the person can actually reach near the chosen refuge
      let sx = bx;
      let sy = by;
      const spot = spotNear(world, p, { id: 0, kind: 'building', x: bx, y: by, amount: 0, max: 0, seen: 0, src: 'seen', from: 0, learned: 0 });
      if (spot) {
        sx = spot.x;
        sy = spot.y;
      }
      return newActivity(world, p, {
        kind: 'flee',
        label: `Running from the wolf toward ${what}`,
        goal: 'to reach safety',
        need: 'safety',
        ...(hasHabitation(world) && best?.homeId ? { targetId: best.homeId, targetType: 'building' } : {}),
        spotX: sx,
        spotY: sy,
        utility: sc.total,
        minCommit: 30,
        maxTicks: 260,
        data: { run: true, ...(hasHabitation(world) && best?.homeId ? { homeRefuge: true } : {}) },
      });
    },
  });
}

// ───────────────────────── eating ─────────────────────────
export interface ForageOpts {
  urgency: number;
  mode: 'eat' | 'stock';
  baseLabel: string;
  /** only sources yielding this kind (a promise to bring a named food, rules 45); absent means any food source */
  only?: FoodKind;
}

export function foragePlans(ctx: Ctx, o: ForageOpts): void {
  const { world, p } = ctx;
  const tm = traitMods(p);
  const cands: { b: Belief; est: number; e: number; val: number; score: number }[] = [];
  for (const b of beliefsByKind(p, FOOD_KINDS as unknown as Belief['kind'][])) {
    if (o.only && SOURCE_FOOD[b.kind] !== o.only) continue;
    const u = sourceUsable(ctx, b, 1);
    if (!u.ok) {
      addBlocked(ctx, 'gather', `${SOURCE_VERB[b.kind as SourceType]}`, b.id, u.why ?? 'unusable', 'food');
      continue;
    }
    const e = eta(ctx, b.x, b.y);
    const val = FOOD_VALUE[b.kind];
    const dng = dangerAt(ctx, b.x, b.y);
    // other people already working there (seen) make it less attractive
    let crowd = 0;
    for (const s of ctx.seenPersons) {
      if (s.act === 'gather' && hyp(s.x - b.x, s.y - b.y) < 3.5) crowd++;
    }
    const yieldF = Math.min(1, 0.45 + 0.18 * Math.min(u.est, 4));
    const score = o.urgency * 0.85 * yieldF + 3 * (val / 28) - pen(e) - 26 * dng * tm.caution - Math.max(0, crowd - 1) * 5 - 0.5 * Math.max(0, 3 - u.est) * 2;
    cands.push({ b, est: u.est, e, val, score });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands.slice(0, 3)) {
    const b = c.b;
    const type = b.kind as SourceType;
    const room = invRoom(world, p, type === 'fish_spot' ? 'fish' : type === 'wild_grain' ? 'grain' : type === 'fruit_tree' ? 'fruit' : 'berries');
    if (room < 1 && o.mode !== 'eat') continue; // (hungry people can still eat on the spot with a full pack)
    const need = o.mode === 'eat' ? Math.ceil((90 - p.needs.hunger) / c.val) + (p.traits.diligence > 0.55 && room > 0 ? 1 : 0) : Math.round(3 + 3 * p.traits.diligence);
    const units = Math.max(1, Math.min(Math.floor(c.est), need, o.mode === 'eat' ? need : room));
    const sc = new Scorer();
    if (o.mode === 'eat') sc.add('hungry', o.urgency * 0.85 * Math.min(1, 0.45 + 0.18 * Math.min(c.est, 4)));
    else sc.add(o.baseLabel, o.urgency * Math.min(1, 0.45 + 0.18 * Math.min(c.est, 4)));
    sc.add('well-liked food', 3 * (c.val / 28));
    sc.add('walking', -pen(c.e));
    const skill = p.skills[type === 'fish_spot' ? 'fish' : 'forage'];
    sc.add('good at it', (skill - 1) * 5);
    const pay = payNudge(world, p, type);
    if (pay) sc.add(pay.label, pay.value);
    const dng = dangerAt(ctx, b.x, b.y);
    if (dng > 0) sc.add('wolf nearby', -26 * dng * tm.caution);
    const purpose = o.mode === 'eat' ? 'to ease hunger' : 'to stock the household';
    const expected = c.e + units * (WORK[type] ?? 25);
    addOption(ctx, {
      kind: 'gather',
      label: `${SOURCE_VERB[type]}`,
      goal: purpose,
      need: o.mode === 'eat' ? 'hunger' : null,
      util: sc.total,
      parts: sc.parts,
      eta: expected,
      key: `gather:${b.id}`,
      targetId: b.id,
      tag: 'food',
      // `units` is what the engine already planned to take here, itself bounded by the source and the pack
      bounds: [{ kind: 'count', field: 'amount', min: 1, max: Math.max(1, units), note: 'how many to take (the engine still stops at what the source holds and the pack can carry)' }],
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'gather',
          label: SOURCE_VERB[type],
          goal: o.mode === 'eat' ? `to ease hunger (${Math.round(p.needs.hunger)}/100)` : 'to bring food home',
          need: o.mode === 'eat' ? 'hunger' : null,
          targetId: b.id,
          targetType: 'source',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          amount: units,
          utility: sc.total,
          minCommit: 60,
          maxTicks: 1100,
          // `eta` is the expectation the person's own estimate of what pays is later judged against (learning.ts)
          data: { purpose: o.mode, stype: type, eta: expected },
        });
      },
    });
  }
}

/** Units of grain, bread or flour-free food this person may take from a granary now: their household's share, or the emergency ration. */
function granaryRation(world: World, p: Person, id: number): number {
  const b = world.byId.get(id);
  if (!b || b.ent !== 'building' || b.type !== 'granary') return 0;
  let n = 0;
  for (const k of ['grain', 'bread'] as ItemKind[]) n += withdrawAllowance(world, b, p, k, b.store.items[k] ?? 0);
  return n;
}

function optEat(ctx: Ctx): void {
  const { world, p } = ctx;
  const dr = ctx.drives.hunger;
  if (dr <= 0) return;
  // Rules 45: everything the person could eat counts here, meat and bread included. `ctx.food` counts only the four wild
  // kinds (the ones a trip home would put down, see provision.ts), so before 45 a hungry person carrying only meat or bread
  // was never offered a meal from their own pack, although the meal itself (act_resource.ts, pickFood) would have eaten it.
  const food = runsRulesVersion(world, 45) ? foodUnits(p.inv) : ctx.food;
  const keep = p.needs.hunger > 20 ? Math.min(food, ctx.dependents.length * 2) : 0;
  if (food - keep > 0) {
    const sc = new Scorer().add('hungry', dr).add('food in pack', 4);
    addOption(ctx, {
      kind: 'eat',
      label: 'Eat what I am carrying',
      goal: 'to ease hunger',
      need: 'hunger',
      util: sc.total,
      parts: sc.parts,
      eta: 12,
      key: 'eat:0',
      targetId: 0,
      tag: 'food',
      // unparameterised this eats until satisfied or out of food; a controller may ask for fewer portions or a lower target
      bounds: [
        { kind: 'count', field: 'portions', min: 1, max: Math.max(1, Math.floor(food - keep)), note: 'how many portions to eat (default: until satisfied)' },
        { kind: 'until', field: 'untilHunger', min: Math.min(100, Math.ceil(p.needs.hunger) + 1), max: 100, note: 'stop once hunger has risen to this' },
      ],
      make: () =>
        newActivity(world, p, {
          kind: 'eat',
          label: 'Eating',
          goal: `to ease hunger (${Math.round(p.needs.hunger)}/100)`,
          need: 'hunger',
          here: true,
          utility: sc.total,
          minCommit: 20,
          maxTicks: 400,
          data: { keep },
        }),
    });
  } else if (food > 0) {
    addBlocked(ctx, 'eat', 'Eat carried food', 0, 'saving the food for dependents', 'food');
  }

  // very hungry, nothing carried, nothing at home: another household's store is a temptation (rich only; weighed against conscience)
  const tempted = isRich(world) && dr > 50 && ctx.food < 1 && ctx.stage !== 'child';
  for (const b of beliefsByKind(p, ['building', 'pile'])) {
    const mine = b.kind === 'building' && b.hh === p.hhId && isHomeType(b.btype);
    const comm = b.kind === 'building' && b.btype === 'storehouse';
    const pile = b.kind === 'pile';
    const theirs = tempted && b.kind === 'building' && !mine && b.hh !== undefined && b.hh !== p.hhId && isHomeType(b.btype);
    // Rules 46: the granary's bins feed the households that filled them. What may be taken is the household's own share, or the
    // emergency ration facilities.ts already grants the starving (withdrawAllowance); the share is the household's own record
    // of what it put in, so reading it is reading their own books, not the bins of others. Below 46 a granary is not eaten from.
    const bins = b.kind === 'building' && b.btype === 'granary' && hasWinterReserve(world) ? granaryRation(world, p, b.id) : 0;
    if (!mine && !comm && !pile && !theirs && !bins) continue;
    const fc = b.btype === 'granary' ? bins : hasCareCapacity(world) ? foodUnits(b.items ?? {}) : foodCount(b.items ?? {});
    if (fc < 1) {
      if (mine || comm) addBlocked(ctx, 'eat_store', 'Eat from the stores', b.id, 'remembers it being empty', 'food');
      continue;
    }
    if (recentFailure(world, p, b.id, 400)) {
      addBlocked(ctx, 'eat_store', 'Eat from the stores', b.id, 'went there recently and found nothing', 'food');
      continue;
    }
    const e = eta(ctx, b.x, b.y);
    const sc = new Scorer().add('hungry', dr * 0.92).add('walking', -pen(e)).add(mine ? 'my own home' : comm ? 'communal store' : bins ? 'our share in the granary' : theirs ? 'not mine to take' : 'goods lying about', mine ? 2 : bins ? 1 : theirs ? -18 : -1);
    if (theirs) sc.add('conscience', -(8 * p.traits.caution + 6 * p.traits.generosity));
    if (theirs && sc.total < 8) continue;
    const theirName = theirs ? `${householdById(world, b.hh!)?.name ?? 'another'} household` : '';
    addOption(ctx, {
      kind: 'eat_store',
      label: mine ? 'Eat from the home store' : comm ? 'Eat from the storehouse' : bins ? 'Eat from the granary' : theirs ? `Take food from the ${theirName}'s store` : 'Take food from a pile',
      goal: 'to ease hunger',
      need: 'hunger',
      util: sc.total,
      parts: sc.parts,
      eta: e + 30,
      key: `eat_store:${b.id}`,
      targetId: b.id,
      tag: 'food',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'eat_store',
          label: mine ? 'Eating at home' : theirs ? `Taking food from the ${theirName}'s store` : bins ? 'Eating from the granary' : 'Eating from the stores',
          data: theirs ? { steal: b.hh } : bins ? { ration: bins } : {},
          goal: `to ease hunger (${Math.round(p.needs.hunger)}/100)`,
          need: 'hunger',
          targetId: b.id,
          targetType: 'building',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          utility: sc.total,
          minCommit: 40,
          maxTicks: 700,
        });
      },
    });
  }

  foragePlans(ctx, { urgency: dr, mode: 'eat', baseLabel: 'hungry' });
}

// ───────────────────────── drinking ─────────────────────────
function optDrink(ctx: Ctx): void {
  const { world, p } = ctx;
  const dr = ctx.drives.thirst;
  if (dr <= 0) return;
  if (ctx.water > 0) {
    const sc = new Scorer().add('thirsty', dr * 1.02).add('water in pack', 3);
    addOption(ctx, {
      kind: 'drink',
      label: 'Drink from my waterskin',
      goal: 'to quench thirst',
      need: 'thirst',
      util: sc.total,
      parts: sc.parts,
      eta: 8,
      key: 'drink:inv',
      targetId: 0,
      tag: 'water',
      make: () =>
        newActivity(world, p, {
          kind: 'drink',
          label: 'Drinking',
          goal: `to quench thirst (${Math.round(p.needs.thirst)}/100)`,
          need: 'thirst',
          here: true,
          utility: sc.total,
          minCommit: 10,
          maxTicks: 200,
          data: { fromInv: true },
        }),
    });
  }
  for (const c of rankWaterSpots(ctx, 2)) {
    const sc = new Scorer().add('thirsty', dr * 0.98).add('walking', -pen(c.e));
    if (c.dng > 0) sc.add('wolf nearby', -30 * c.dng * traitMods(p).caution);
    if (c.trouble > 0) sc.add('was driven off near here', -16 * c.trouble);
    addOption(ctx, {
      kind: 'drink',
      label: 'Go and drink at the water',
      goal: 'to quench thirst',
      need: 'thirst',
      util: sc.total,
      parts: sc.parts,
      eta: c.e + 30,
      key: `drink:${c.b.id}`,
      targetId: c.b.id,
      tag: 'water',
      make: () => {
        const spot = spotNear(world, p, c.b);
        if (!spot) {
          delBelief(p, c.b.id); // the shore there is gone (built over): they will notice it is no longer a place to drink
          return null;
        }
        return newActivity(world, p, {
          kind: 'drink',
          label: 'Drinking at the water',
          goal: `to quench thirst (${Math.round(p.needs.thirst)}/100)`,
          need: 'thirst',
          targetId: c.b.id,
          targetType: 'tile',
          tx: spot.x,
          ty: spot.y,
          spotX: spot.x,
          spotY: spot.y,
          utility: sc.total,
          minCommit: 30,
          maxTicks: 800,
        });
      },
    });
  }
}

// ───────────────────────── sleep ─────────────────────────
function optSleep(ctx: Ctx): void {
  const { world, p } = ctx;
  const e = p.needs.energy;
  // nobody can sleep while parched or starving: they would wake straight away
  if (p.needs.thirst < 14 || p.needs.hunger < 10) {
    addBlocked(ctx, 'sleep', 'Sleep', 0, 'too thirsty or hungry to sleep', 'rest');
    return;
  }
  let sd = ctx.drives.energy;
  const frac = dayFraction(world.tick);
  const bedtime = 0.8 + p.chrono;
  const lateNight = frac > bedtime || frac < 0.2 + p.chrono;
  if (lateNight && e < 90) sd = Math.max(sd, 26 + (100 - e) * 0.5 + (world.light < 0.12 ? 8 : 0));
  if (sd <= 0) return;

  type Bed = { x: number; y: number; q: number; what: string; id: number; b?: Belief };
  const beds: Bed[] = [];
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.hh === p.hhId && isHomeType(b.btype)) {
      beds.push({ x: b.x, y: b.y, q: b.btype === 'house' ? 1.04 : b.btype === 'hut' ? 1 : 0.88, what: `my ${homeNoun(b.btype)}`, id: b.id, b });
    } else if (b.btype === 'fire' && (b.fuel ?? 0) - (world.tick - b.seen) * 0.85 > 100) {
      beds.push({ x: b.x, y: b.y, q: 0.74, what: 'the fire', id: b.id, b });
    }
  }
  const options: { bed: Bed; u: number; e: number; sc: Scorer }[] = [];
  for (const bed of beds) {
    const et = eta(ctx, bed.x, bed.y);
    const sc = new Scorer().add(lateNight && e > 40 ? 'bedtime' : 'tired', sd * bed.q).add('walking', -pen(et));
    // a fever is slept off: bed draws the ill in daylight too (rich only; nobody is ill otherwise)
    if (p.illness) sc.add('feverish', 14 + 16 * p.illness.severity);
    const dng = dangerAt(ctx, bed.x, bed.y, 9);
    if (dng > 0) sc.add('wolf nearby', -30 * dng);
    options.push({ bed, u: sc.total, e: et, sc });
  }
  options.sort((a, b) => b.u - a.u);
  for (const o of options.slice(0, 2)) {
    const bed = o.bed;
    addOption(ctx, {
      kind: 'sleep',
      label: `Sleep at ${bed.what}`,
      goal: 'to recover energy',
      need: 'energy',
      util: o.u,
      parts: o.sc.parts,
      eta: o.e + 40,
      key: `sleep:${bed.id}`,
      targetId: bed.id,
      tag: 'rest',
      make: () => {
        const spot = bed.b ? spotNear(world, p, bed.b) : null;
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'sleep',
          label: `Sleeping by ${bed.what}`,
          goal: `to recover energy (${Math.round(p.needs.energy)}/100)`,
          need: 'energy',
          targetId: bed.id,
          targetType: 'building',
          spotX: spot.x,
          spotY: spot.y,
          utility: o.u,
          minCommit: 250,
          maxTicks: 1800,
        });
      },
    });
  }
  // nowhere known: sleep where they stand (only when really worn out)
  if (e < 22 || (lateNight && options.length === 0)) {
    const sc = new Scorer().add('exhausted', sd * 0.5);
    addOption(ctx, {
      kind: 'sleep',
      label: 'Sleep right here',
      goal: 'to recover energy',
      need: 'energy',
      util: sc.total,
      parts: sc.parts,
      eta: 5,
      key: 'sleep:here',
      targetId: 0,
      tag: 'rest',
      make: () =>
        newActivity(world, p, {
          kind: 'sleep',
          label: 'Sleeping on the ground',
          goal: `to recover energy (${Math.round(p.needs.energy)}/100)`,
          need: 'energy',
          here: true,
          utility: sc.total,
          minCommit: 250,
          maxTicks: 1800,
        }),
    });
  }
}

// ───────────────────────── warmth & shelter from weather ─────────────────────────
function optWarmth(ctx: Ctx): void {
  const { world, p } = ctx;
  const tm = traitMods(p);
  let wd = ctx.drives.warmth;
  const w = world.weather;
  const exposed = (w.rain > 0.3 || w.storm > 0.3) && true;
  if (exposed) wd = Math.max(wd, (12 + 34 * w.storm + 16 * w.rain) * tm.caution);
  if (wd <= 0) return;

  // fire
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype !== 'fire') continue;
    const lit = (b.fuel ?? 0) - (world.tick - b.seen) * 0.85 > 60;
    if (!lit) {
      addBlocked(ctx, 'warm', 'Warm up at the fire', b.id, 'thinks the fire has gone out', 'warmth');
      continue;
    }
    const e = eta(ctx, b.x, b.y);
    const sc = new Scorer().add('cold', wd * 0.92).add('walking', -pen(e)).add('company at the fire', 2);
    addOption(ctx, {
      kind: 'warm',
      label: 'Warm up at the fire',
      goal: 'to get warm',
      need: 'warmth',
      util: sc.total,
      parts: sc.parts,
      eta: e,
      key: `warm:${b.id}`,
      targetId: b.id,
      tag: 'warmth',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'warm',
          label: 'Warming up by the fire',
          goal: `to get warm (${Math.round(p.needs.warmth)}/100)`,
          need: 'warmth',
          targetId: b.id,
          targetType: 'building',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          amount: 240,
          utility: sc.total,
          minCommit: 90,
          maxTicks: 700,
        });
      },
    });
  }
  // home
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.hh !== p.hhId || !isHomeType(b.btype)) continue;
    const q = b.btype === 'house' ? 0.95 : b.btype === 'hut' ? 0.9 : 0.58;
    const e = eta(ctx, b.x, b.y);
    const sc = new Scorer().add(exposed && ctx.drives.warmth < 20 ? 'weather' : 'cold', wd * q).add('walking', -pen(e));
    addOption(ctx, {
      kind: 'rest',
      label: `Shelter at the ${homeNoun(b.btype)}`,
      goal: exposed ? 'to get out of the weather' : 'to get warm',
      need: 'warmth',
      util: sc.total,
      parts: sc.parts,
      eta: e,
      key: `rest:home:${b.id}`,
      targetId: b.id,
      tag: 'warmth',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'rest',
          label: `Sheltering at the ${homeNoun(b.btype)}`,
          goal: exposed ? 'to wait out the weather' : 'to get warm',
          need: 'warmth',
          targetId: b.id,
          targetType: 'building',
          spotX: spot.x,
          spotY: spot.y,
          amount: 260,
          utility: sc.total,
          minCommit: 100,
          maxTicks: 800,
        });
      },
    });
  }
}

// ───────────────────────── rest ─────────────────────────
/**
 * Letting the night pass where it is safe (rich worlds only). Without this a rested person at night has nothing on offer but
 * wandering or work: optSleep returns early once energy is high, and optRest refuses at night. Waiting is a real action here - it
 * takes real time, needs go on changing, and it ends at first light or the moment something more pressing appears.
 */
function optShelter(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!isRich(world) || !nightPlansOn() || !ctx.night) return;
  // waiting must never stand in for seeing to something urgent
  if (ctx.criticals.length || p.needs.thirst < 24 || p.needs.hunger < 20) {
    addBlocked(ctx, 'rest', 'Stay in shelter until it is light', 0, 'something more pressing comes first', 'rest');
    return;
  }
  const near = shelters(ctx).filter((s) => s.d <= 3);
  if (!near.length) {
    addBlocked(ctx, 'rest', 'Stay in shelter until it is light', 0, 'not at a shelter', 'rest');
    return;
  }
  // bounded by the light this person can see coming, never open-ended
  const left = Math.max(60, Math.min(Math.round(untilDaylight(world) * DAY), Math.round(DAY * 0.55)));
  for (const s of near.slice(0, 1)) {
    const sc = new Scorer().add('the night to get through', 16).add(s.home ? 'my own place' : 'a fire burning', s.home ? 6 : 4);
    if (p.needs.warmth < 70) sc.add('cold out there', 8);
    addOption(ctx, {
      kind: 'rest',
      label: `Stay at ${s.what} until it is light`,
      goal: 'to let the night pass under shelter',
      need: 'warmth',
      util: sc.total,
      parts: sc.parts,
      eta: left,
      key: `shelter:${s.id}`,
      targetId: s.id,
      tag: 'rest',
      bounds: [{ kind: 'count', field: 'ticks', min: 30, max: left, note: 'how long to stay, at most until it is light' }],
      make: () =>
        newActivity(world, p, {
          kind: 'rest',
          label: `Staying at ${s.what}`,
          goal: 'waiting for the light',
          data: hasNightWaitBoundary(world) ? { daylightAt: world.tick + Math.round(untilDaylight(world) * DAY) } : {},
          // 'warmth' rather than 'energy': this is waiting out the night, not recovering, so being rested does not end it
          need: 'warmth',
          // the shelter this is spent in: without it the activity is about nowhere, and the time spent in it is credited to no
          // plan (intent.ts creditShelter takes the target as the thing sheltered in), so a night under cover reads as a night out
          targetId: s.id,
          here: true,
          amount: left,
          utility: sc.total,
          minCommit: 60,
          maxTicks: left + 120,
        }),
    });
  }
}

function optRest(ctx: Ctx): void {
  const { world, p } = ctx;
  const ed = ctx.drives.energy;
  if ((ed <= 0 && !p.illness) || ctx.night) return;
  const sc = new Scorer().add('tired', Math.max(0, ed) * 0.9);
  if (p.illness) sc.add('feverish', 10 + 12 * p.illness.severity);
  addOption(ctx, {
    kind: 'rest',
    label: 'Sit down and rest',
    goal: 'to recover energy',
    need: 'energy',
    util: sc.total,
    parts: sc.parts,
    eta: 5,
    key: 'rest:here',
    targetId: 0,
    tag: 'rest',
    make: () =>
      newActivity(world, p, {
        kind: 'rest',
        label: 'Resting',
        goal: `to recover energy (${Math.round(p.needs.energy)}/100)`,
        need: 'energy',
        here: true,
        amount: 180,
        utility: sc.total,
        minCommit: 80,
        maxTicks: 400,
      }),
  });
}

export function survivalOptions(ctx: Ctx): void {
  optFlee(ctx);
  // Standing and facing it is the other answer to a wolf (defence.ts, rules version 4). It is offered here, beside
  // fleeing, because it answers the same situation; which of the two a person takes is the ranking's business, and
  // decision.ts lets both through the filter that used to pass fleeing alone.
  defenceOptions(ctx);
  optEat(ctx);
  huntOptions(ctx);
  optDrink(ctx);
  optSleep(ctx);
  optWarmth(ctx);
  optRest(ctx);
  optShelter(ctx);
}

void carryCap;
void NUTRITION;
void estimatedAmount;
void hashUnit;
