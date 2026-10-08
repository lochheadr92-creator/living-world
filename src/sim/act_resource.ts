import { faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { LOAN_TERM, NUTRITION, SOURCE_SKILL, SKILL_MAX, WATER_VALUE, WORK } from './constants';
import {
  addItem,
  claimUnits,
  consume,
  gatherFromSource,
  invRoom,
  ledgerConsume,
  ledgerCreate,
  pickFood,
  produce,
  releaseClaims,
  roomFor,
  takeFrom,
  transfer,
} from './economy';
import { addFx, addLog } from './events';
import { clearFailure, noteFailure, observe, delBelief, isWaterBeliefId } from './knowledge';
import { mayDeposit, noteDeposit, noteWithdraw, withdrawAllowance } from './facilities';
import { carryCap } from './people';
import { taskMultiplier, wearFor } from './tools';
import type { ToolTask } from './tools';
import { adjustRel } from './relations';
import { contestLost, creditContribution, fulfillCommitment } from './social';
import { fellTree } from './sources';
import { distToFootprint, isWater } from './registry';
import { isToolItem } from './toolreg';
import type { Activity, Building, FoodKind, Items, ItemKind, Person, Source, ToolKind, World } from './types';
import { clamp, hyp } from './util';

// ───────────────────────── helpers ─────────────────────────
function skillOf(p: Person, s: Source): number {
  return p.skills[SOURCE_SKILL[s.type]];
}

function toolTask(s: Source): ToolTask | null {
  switch (s.type) {
    case 'tree':
      return 'chop';
    case 'rock':
    case 'outcrop':
    case 'clay_pit':
    case 'ore_vein':
      return 'mine';
    case 'berry_bush':
    case 'fruit_tree':
    case 'wild_grain':
      return 'forage';
    default:
      return null;
  }
}

function toolMult(world: World, p: Person, s: Source): number {
  const t = toolTask(s);
  return t ? taskMultiplier(world, p, t) : 1;
}

function cycleDuration(world: World, p: Person, s: Source): number {
  const base = WORK[s.type] ?? 30;
  let d = (base * toolMult(world, p, s)) / skillOf(p, s);
  d *= 1 + 0.12 * world.weather.rain + 0.1 * world.weather.storm;
  if (p.needs.energy < 25) d *= 1.2;
  return Math.max(6, Math.round(d));
}

function sourceOf(world: World, a: Activity): Source | null {
  const e = world.byId.get(a.targetId);
  return e && e.ent === 'source' ? e : null;
}

// ───────────────────────── gather ─────────────────────────
function startCycle(world: World, p: Person, a: Activity, s: Source): string | null {
  if (s.type === 'tree' && s.amount < 1) return 'nothing to take yet';
  const id = claimUnits(world, p.id, s, 1, cycleDuration(world, p, s) + 40);
  if (!id) {
    return s.amount <= 0 ? 'nothing left' : 'someone else is already taking it';
  }
  a.claims.push(id);
  a.progress = 0;
  a.pprogress = 0;
  a.duration = cycleDuration(world, p, s);
  return null;
}

function gatherPose(a: Activity) {
  switch (a.data.stype as string) {
    case 'tree':
      return 'chop' as const;
    case 'rock':
      return 'mine' as const;
    case 'fish_spot':
      return 'fish' as const;
    default:
      return 'pick' as const;
  }
}

registerHandler('gather', {
  availability: 0.38,
  pose: gatherPose,
  begin(world, p, a) {
    const s = sourceOf(world, a);
    if (!s) {
      delBelief(p, a.targetId);
      return 'it is gone';
    }
    a.data.stype = s.type;
    observe(world, p, s); // arriving, they see its real state
    faceToward(p, s.x + 0.5, s.y + 0.5, 3);
    const err = startCycle(world, p, a, s);
    if (err) {
      a.blocked = err;
      if (err.startsWith('someone')) a.data.contest = true;
      return err;
    }
  },
  work(world, p, a): WorkResult {
    const s = sourceOf(world, a);
    if (!s) return a.cycle > 0 ? 'partial:the source disappeared' : 'fail:the source disappeared';
    faceToward(p, s.x + 0.5, s.y + 0.5);
    a.progress++;
    if (a.progress === Math.floor(a.duration * 0.55)) {
      addFx(world, s.type === 'tree' ? 'chop' : s.type === 'rock' ? 'mine' : s.type === 'fish_spot' ? 'splash' : 'pick', s.x + 0.5, s.y + 0.5, 0);
    }
    if (a.progress < a.duration) return 'continue';

    // the claimed unit is taken from the source and put into the pack
    releaseClaims(world, a.claims);
    let got = 0;
    if (a.data.purpose === 'eat' && invRoom(world, p, s.item) < 1 && NUTRITION[s.item as FoodKind] !== undefined && p.needs.hunger < 85 && s.amount >= 1) {
      // a full pack must not mean going hungry: eat it right there (the unit leaves the source and is consumed)
      s.amount -= 1;
      ledgerConsume(world, s.item, 1, 'eaten at the source');
      p.needs.hunger = clamp(p.needs.hunger + NUTRITION[s.item as FoodKind], 0, 100);
      p.lastAteTick = world.tick;
      addFx(world, 'eat', p.x, p.y, 0);
      got = 1;
    } else {
      got = gatherFromSource(world, s, p, 1);
    }
    if (got <= 0) {
      a.blocked = invRoom(world, p, s.item) < 1 ? 'pack is full' : 'nothing left';
      return a.cycle > 0 ? `partial:${a.blocked}` : `fail:${a.blocked}`;
    }
    s.lastTaker = p.id;
    s.lastTakeTick = world.tick;
    a.cycle++;
    p.stats.gathered++;
    const task = toolTask(s);
    if (task) wearFor(world, p, task, a.duration);
    const sk = SOURCE_SKILL[s.type];
    p.skills[sk] = Math.min(SKILL_MAX, p.skills[sk] + 0.004);
    if (s.type === 'wild_grain' && world.rng.chance(0.2)) {
      // shell some of the grain heads for seed
      consume(world, p.inv, 'grain', 1, 'saved as seed');
      produce(world, p.inv, carryCap(world, p), 'seeds', 1, 'seed saved from wild grain');
    }
    observe(world, p, s);
    clearFailure(p, s.id);
    if (s.type === 'tree' && s.amount <= 0 && s.growth >= 0.55) {
      fellTree(world, s);
      delBelief(p, s.id);
      a.blocked = 'felled the tree';
      return a.cycle >= a.amount ? 'done' : 'partial:the tree is used up';
    }
    if (a.cycle >= a.amount || (a.data.purpose === 'eat' && p.needs.hunger >= 88)) {
      a.blocked = '';
      return 'done';
    }
    if (invRoom(world, p, s.item) < 1 && !(a.data.purpose === 'eat' && NUTRITION[s.item as FoodKind] !== undefined)) {
      a.blocked = 'pack is full';
      return 'partial:pack is full';
    }
    const err = startCycle(world, p, a, s);
    if (err) {
      a.blocked = err;
      return `partial:${err}`;
    }
    return 'continue';
  },
  onEnd(world, p, a, outcome, detail) {
    const s = sourceOf(world, a);
    const name = a.data.stype ? String(a.data.stype).replace('_', ' ') : 'source';
    if (outcome === 'failed' || (outcome === 'partial' && a.cycle === 0)) {
      if (a.targetId) noteFailure(world, p, a.targetId, detail);
      if (s) observe(world, p, s);
      a.data.logged = true;
      addLog(world, p, 'work', `${detail === 'nothing left' ? 'The ' + name + ' was empty when I got there' : 'Could not use the ' + name + ': ' + detail}.`);
      if (a.data.contest || detail.startsWith('someone')) {
        if (s && s.lastTaker && s.lastTaker !== p.id && world.tick - s.lastTakeTick < 60) contestLost(world, p, s.lastTaker, s);
      }
    } else if (a.cycle > 0) {
      addLog(world, p, 'work', `Gathered ${a.cycle} ${s ? s.item : 'items'} from the ${name}.`);
      if (s && s.amount <= 0 && s.type !== 'tree') addLog(world, p, 'info', `The ${name} has been picked clean.`);
    }
  },
});

// ───────────────────────── eat ─────────────────────────
function eatTick(world: World, p: Person, a: Activity): WorkResult {
  a.progress++;
  if (a.progress < a.duration) return 'continue';
  const k = a.data.food as FoodKind;
  const eaten = consume(world, p.inv, k, 1, 'eaten');
  if (eaten > 0) {
    p.needs.hunger = clamp(p.needs.hunger + NUTRITION[k], 0, 100);
    p.lastAteTick = world.tick;
    a.cycle++;
    addFx(world, 'eat', p.x, p.y, 0);
  }
  const next = pickFood(p.inv, p.needs.hunger);
  const keepFood = (a.data.keep as number) ?? 0;
  const foodLeft = Object.keys(p.inv).reduce((s, key) => s + (NUTRITION[key as FoodKind] ? (p.inv[key as ItemKind] ?? 0) : 0), 0);
  if (!next || p.needs.hunger >= 88 || (keepFood > 0 && foodLeft <= keepFood && p.needs.hunger > 55)) return 'done';
  a.data.food = next;
  a.progress = 0;
  a.duration = WORK.eat;
  return 'continue';
}

registerHandler('eat', {
  availability: 0.55,
  pose: () => 'eat',
  begin(world, p, a) {
    const k = pickFood(p.inv, p.needs.hunger);
    if (!k) return 'no food on me';
    a.data.food = k;
    a.duration = WORK.eat;
  },
  work: (world, p, a) => eatTick(world, p, a),
});

registerHandler('eat_store', {
  availability: 0.4,
  pose: () => 'eat',
  begin(world, p, a) {
    const e = world.byId.get(a.targetId);
    if (!e || (e.ent !== 'building' && e.ent !== 'pile')) {
      delBelief(p, a.targetId);
      return 'it is gone';
    }
    observe(world, p, e);
    const items = e.ent === 'building' ? e.store.items : e.items;
    let want = Math.ceil((92 - p.needs.hunger) / 18);
    let tookAny = false;
    for (let guard = 0; guard < 12 && want > 0; guard++) {
      const k = pickFood(items, p.needs.hunger + (a.cycle * 14));
      if (!k) break;
      const got = transfer(world, items, p.inv, carryCap(world, p), k, 1, e.ent === 'building' ? 'building:' + e.id : 'pile:' + e.id, 'person:' + p.id, 'eat from store');
      if (!got) break;
      tookAny = true;
      want--;
      a.cycle++;
    }
    if (!tookAny) {
      noteFailure(world, p, a.targetId, 'no food there');
      return 'there is no food there';
    }
    observe(world, p, e);
    a.cycle = 0;
    const k = pickFood(p.inv, p.needs.hunger);
    if (!k) return 'could not take food';
    a.data.food = k;
    a.duration = WORK.eat;
    a.data.keep = 0;
  },
  work: (world, p, a) => eatTick(world, p, a),
  onEnd(world, p, a, outcome, detail) {
    if (outcome === 'success') addLog(world, p, 'need', 'Ate a meal from the stores.');
  },
});

// ───────────────────────── drink / water ─────────────────────────
function waterFacing(world: World, p: Person): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bd = 99;
  const tx = Math.floor(p.x);
  const ty = Math.floor(p.y);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (isWater(world, tx + dx, ty + dy)) {
        const d = hyp(dx, dy);
        if (d < bd) {
          bd = d;
          best = { x: tx + dx + 0.5, y: ty + dy + 0.5 };
        }
      }
    }
  }
  return best;
}

/** The well an activity is aimed at, looked at on arrival: it must still stand and be a well. Returns the reason if not. */
function wellFor(world: World, p: Person, a: Activity): Building | string {
  const e = world.byId.get(a.targetId);
  if (!e || e.ent !== 'building' || e.type !== 'well') {
    delBelief(p, a.targetId);
    return 'the well is gone';
  }
  observe(world, p, e);
  return e;
}

/** A remembered drinking place nobody can walk to is not worth remembering: forget it so another (or a search) takes over. */
function forgetUnreachableWater(p: Person, a: Activity, outcome: string, detail: string): void {
  if (outcome === 'failed' && isWaterBeliefId(a.targetId) && /no way|blocked/.test(detail)) delBelief(p, a.targetId);
}

registerHandler('drink', {
  availability: 0.55,
  pose: () => 'drink',
  begin(world, p, a) {
    if (a.data.fromInv) {
      if ((p.inv.water ?? 0) < 1) return 'no water on me';
      a.duration = 8;
      return;
    }
    if (a.targetType === 'building') {
      const well = wellFor(world, p, a);
      if (typeof well === 'string') return well;
      // the first unit is drawn at once; the rest as the drinking goes on (see `work`), so water leaves the well as it is drunk
      if (consume(world, well.store.items, 'water', 1, 'drunk at a well') < 1) {
        noteFailure(world, p, a.targetId, 'the well was dry');
        return 'the well is dry';
      }
      a.data.well = well.id;
      a.data.credit = WATER_VALUE;
      a.data.wx = well.x + well.w / 2;
      a.data.wy = well.y + well.h / 2;
      a.duration = Math.ceil((97 - p.needs.thirst) / 2.8) + 3;
      return;
    }
    const w = waterFacing(world, p);
    if (!w) {
      // the remembered spot was not actually at the water
      delBelief(p, a.targetId);
      return 'no water here';
    }
    a.data.wx = w.x;
    a.data.wy = w.y;
    a.duration = Math.ceil((97 - p.needs.thirst) / 2.8) + 3;
    addFx(world, 'splash', w.x, w.y, 0);
  },
  onEnd(world, p, a, outcome, detail) {
    forgetUnreachableWater(p, a, outcome, detail);
  },
  work(world, p, a): WorkResult {
    if (a.data.fromInv) {
      a.progress++;
      if (a.progress < a.duration) return 'continue';
      if (consume(world, p.inv, 'water', 1, 'drunk') < 1) return 'fail:no water left';
      p.needs.thirst = clamp(p.needs.thirst + WATER_VALUE, 0, 100);
      a.cycle++;
      if (p.needs.thirst >= 88 || (p.inv.water ?? 0) < 1) return 'done';
      a.progress = 0;
      return 'continue';
    }
    faceToward(p, a.data.wx, a.data.wy, 3);
    if (a.data.well) {
      // each unit of water drawn is worth WATER_VALUE of thirst; when what was drawn is used up, another must be drawn, or the well is dry
      if (a.data.credit < 2.8) {
        const well = world.byId.get(a.data.well);
        if (!well || well.ent !== 'building' || consume(world, well.store.items, 'water', 1, 'drunk at a well') < 1) return a.progress > 0 ? 'partial:the well ran dry' : 'fail:the well is dry';
        a.data.credit += WATER_VALUE;
      }
      a.data.credit -= 2.8;
    }
    a.progress++;
    p.needs.thirst = clamp(p.needs.thirst + 2.8, 0, 100);
    if (a.progress >= a.duration || p.needs.thirst >= 97) return 'done';
    return 'continue';
  },
});

registerHandler('fetch_water', {
  availability: 0.5,
  pose: () => 'drink',
  begin(world, p, a) {
    if (a.targetType === 'building') {
      const well = wellFor(world, p, a);
      if (typeof well === 'string') return well;
      if ((well.store.items.water ?? 0) < 1) {
        noteFailure(world, p, a.targetId, 'the well was dry');
        return 'the well is dry';
      }
      a.data.well = well.id;
      a.data.wx = well.x + well.w / 2;
      a.data.wy = well.y + well.h / 2;
      a.duration = WORK.water;
      a.progress = 0;
      return;
    }
    const w = waterFacing(world, p);
    if (!w) {
      delBelief(p, a.targetId);
      return 'no water here';
    }
    a.data.wx = w.x;
    a.data.wy = w.y;
    a.duration = WORK.water;
    a.progress = 0;
  },
  onEnd(world, p, a, outcome, detail) {
    forgetUnreachableWater(p, a, outcome, detail);
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.data.wx, a.data.wy, 3);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    let got: number;
    if (a.data.well) {
      // water moves from the well to the pack: it was already counted when it seeped in
      const well = world.byId.get(a.data.well);
      if (!well || well.ent !== 'building') return 'fail:the well is gone';
      if ((well.store.items.water ?? 0) < 1) return a.cycle > 0 ? 'partial:the well ran dry' : 'fail:the well is dry';
      got = transfer(world, well.store.items, p.inv, carryCap(world, p), 'water', 1, 'building:' + well.id, 'person:' + p.id, 'water drawn from a well');
    } else {
      got = produce(world, p.inv, carryCap(world, p), 'water', 1, 'water drawn from the lake');
      if (got > 0) addFx(world, 'splash', a.data.wx, a.data.wy, 0);
    }
    if (got <= 0) return a.cycle > 0 ? 'partial:cannot carry more' : 'fail:cannot carry more';
    a.cycle++;
    a.progress = 0;
    if (a.cycle >= a.amount) return 'done';
    if (roomFor(p.inv, carryCap(world, p), 'water') < 1) return 'partial:pack is full';
    return 'continue';
  },
});

// ───────────────────────── deposit / withdraw ─────────────────────────
function containerItems(world: World, id: number): { items: Items; cap: number; kind: 'building' | 'site' | 'pile' } | null {
  const e = world.byId.get(id);
  if (!e) return null;
  if (e.ent === 'building') return { items: e.store.items, cap: e.store.cap, kind: 'building' };
  if (e.ent === 'site') return { items: e.delivered, cap: 9999, kind: 'site' };
  if (e.ent === 'pile') return { items: e.items, cap: 9999, kind: 'pile' };
  return null;
}

function transferDuration(want: Record<string, number>): number {
  return 6 + Object.keys(want).length * 3;
}

registerHandler('deposit', {
  availability: 0.45,
  pose: () => 'store',
  begin(world, p, a) {
    const c = containerItems(world, a.targetId);
    if (!c) {
      delBelief(p, a.targetId);
      return 'the place is gone';
    }
    const e = world.byId.get(a.targetId)!;
    observe(world, p, e);
    a.duration = transferDuration(a.data.items ?? {});
    const door = e.ent === 'building' || e.ent === 'site' ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : { x: p.x, y: p.y };
    a.tx = door.x;
    a.ty = door.y;
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    const c = containerItems(world, a.targetId);
    if (!c) return 'fail:the place is gone';
    const want = (a.data.items ?? {}) as Record<string, number>;
    let moved = 0;
    let partial = false;
    const e = world.byId.get(a.targetId)!;
    for (const k of Object.keys(want)) {
      const n = Math.min(want[k], p.inv[k as ItemKind] ?? 0);
      if (n <= 0) continue;
      if (e.ent === 'building' && !mayDeposit(e, k as ItemKind)) {
        partial = true;
        continue;
      }
      const m = transfer(world, p.inv, c.items, c.cap, k as ItemKind, n, 'person:' + p.id, c.kind + ':' + a.targetId, 'deposit');
      moved += m;
      if (m < n) partial = true;
      if (m > 0) {
        a.data.moved = { ...(a.data.moved ?? {}), [k]: ((a.data.moved ?? {})[k] ?? 0) + m };
        if (e.ent === 'building' && isToolItem(k as ItemKind)) donateToRack(world, e.id, p, k as ToolKind, m);
        if (e.ent === 'building') {
          noteDeposit(world, e, p, k as ItemKind, m);
          if (a.data.destSite) creditContribution(p, a.data.destSite as number, 12 * m);
        }
        if (e.ent === 'site' && e.contrib) e.contrib[p.hhId] = (e.contrib[p.hhId] ?? 0) + m;
      }
    }
    if (e.ent === 'building' || e.ent === 'site' || e.ent === 'pile') observe(world, p, e);
    if (moved === 0) return partial ? 'fail:no room' : 'fail:nothing to put down';
    a.cycle = moved;
    if (p.errand && p.errand.targetId === a.targetId) p.errand = null;
    if (c.kind === 'site') {
      addFx(world, 'deliver', e.ent === 'site' ? e.x + e.w / 2 : p.x, e.ent === 'site' ? e.y + e.h / 2 : p.y, 0);
    }
    return partial ? 'partial:no room for everything' : 'done';
  },
  onEnd(world, p, a, outcome) {
    if (a.cycle > 0) {
      const moved = a.data.moved as Record<string, number> | undefined;
      const txt = moved ? Object.entries(moved).map(([k, n]) => `${n} ${k}`).join(', ') : `${a.cycle} items`;
      const e = world.byId.get(a.targetId);
      const where = e && e.ent === 'site' ? 'the building site' : e && e.ent === 'building' ? 'the ' + (e.type === 'storehouse' ? 'storehouse' : 'home store') : 'the pile';
      addLog(world, p, 'work', `Put ${txt} into ${where}.`);
    }
  },
});

registerHandler('haul', {
  availability: 0.45,
  pose: () => 'store',
  begin: (world, p, a) => {
    const h = world.byId.get(a.targetId);
    if (!h || h.ent !== 'site') {
      delBelief(p, a.targetId);
      return 'the site is gone (finished or abandoned)';
    }
    observe(world, p, h);
    a.duration = transferDuration(a.data.items ?? {});
    a.tx = h.x + h.w / 2;
    a.ty = h.y + h.h / 2;
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    const site = world.byId.get(a.targetId);
    if (!site || site.ent !== 'site') return 'fail:the site is gone';
    const want = (a.data.items ?? {}) as Record<string, number>;
    let moved = 0;
    for (const k of Object.keys(want)) {
      const need = (site.required[k as ItemKind] ?? 0) - (site.delivered[k as ItemKind] ?? 0) - (site.used[k as ItemKind] ?? 0);
      const n = Math.min(want[k], p.inv[k as ItemKind] ?? 0, Math.max(0, need));
      if (n <= 0) continue;
      const m = transfer(world, p.inv, site.delivered, 9999, k as ItemKind, n, 'person:' + p.id, 'site:' + site.id, 'delivery');
      moved += m;
      if (m > 0 && site.contrib) site.contrib[p.hhId] = (site.contrib[p.hhId] ?? 0) + m;
      if (m > 0) a.data.moved = { ...(a.data.moved ?? {}), [k]: ((a.data.moved ?? {})[k] ?? 0) + m };
    }
    observe(world, p, site);
    if (moved > 0) site.lastWorkTick = world.tick;
    if (p.errand && p.errand.targetId === site.id) p.errand = null;
    if (moved > 0) {
      for (const c of p.commitments) {
        if (c.status !== 'active' || c.siteId !== site.id) continue;
        c.contrib = (c.contrib ?? 0) + 40;
        const got = a.data.moved as Record<string, number> | undefined;
        if (c.kind === 'haul' && c.item && got && got[c.item]) {
          c.delivered = (c.delivered ?? 0) + got[c.item];
          if ((c.delivered ?? 0) >= c.amount) fulfillHaul(world, p, c);
        }
      }
    }
    if (moved === 0) return 'fail:the site no longer needs that';
    a.cycle = moved;
    addFx(world, 'deliver', site.x + site.w / 2, site.y + site.h / 2, 0);
    // the household that owns the site notices who helped
    if (site.hhId && site.hhId !== p.hhId) {
      for (const q of world.persons) {
        if (q.alive && q.hhId === site.hhId && hyp(q.x - p.x, q.y - p.y) < 8) adjustRel(q, p.id, world.tick, { aff: 1.8, trust: 1.5, fam: 0.5, note: `helped build our ${site.type.replace('_', '-')}` });
      }
    }
    return 'done';
  },
  onEnd(world, p, a) {
    if (a.cycle > 0) {
      const moved = a.data.moved as Record<string, number> | undefined;
      const txt = moved ? Object.entries(moved).map(([k, n]) => `${n} ${k}`).join(', ') : `${a.cycle} items`;
      addLog(world, p, 'work', `Delivered ${txt} to the building site.`);
    }
  },
});

registerHandler('withdraw', {
  availability: 0.45,
  pose: () => 'store',
  begin(world, p, a) {
    const c = containerItems(world, a.targetId);
    if (!c) {
      delBelief(p, a.targetId);
      return 'the place is gone';
    }
    const e = world.byId.get(a.targetId)!;
    observe(world, p, e);
    a.duration = transferDuration(a.data.items ?? {});
    a.tx = e.ent === 'building' || e.ent === 'site' ? e.x + e.w / 2 : p.x;
    a.ty = e.ent === 'building' || e.ent === 'site' ? e.y + e.h / 2 : p.y;
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    const c = containerItems(world, a.targetId);
    if (!c) return 'fail:the place is gone';
    const want = (a.data.items ?? {}) as Record<string, number>;
    let moved = 0;
    const e = world.byId.get(a.targetId);
    for (const k of Object.keys(want)) {
      let n = want[k];
      if (e && e.ent === 'building') n = withdrawAllowance(world, e, p, k as ItemKind, n);
      if (n <= 0) continue;
      const m = transfer(world, c.items, p.inv, carryCap(world, p), k as ItemKind, n, c.kind + ':' + a.targetId, 'person:' + p.id, 'withdraw');
      moved += m;
      if (m > 0 && e && e.ent === 'building') {
        noteWithdraw(world, e, p, k as ItemKind, m);
        if (isToolItem(k as ItemKind)) borrowFromRack(world, p, k as ToolKind, m);
      }
    }
    if (e) observe(world, p, e);
    if (moved === 0) {
      noteFailure(world, p, a.targetId, 'nothing there to take');
      return 'fail:there was nothing to take';
    }
    a.cycle = moved;
    return 'done';
  },
  onEnd(world, p, a) {
    if (a.cycle > 0) addLog(world, p, 'work', `Took ${a.cycle} item${a.cycle > 1 ? 's' : ''} from storage.`);
  },
});

/** A tool left on a shared rack is no longer anyone's own: it becomes the settlement's, free to be borrowed and brought back. */
function donateToRack(world: World, buildingId: number, p: Person, kind: ToolKind, n: number): void {
  let left = n;
  for (const t of world.tools) {
    if (left <= 0) break;
    if (t.holder === buildingId && t.kind === kind && t.ownerHh === p.hhId && !t.loan) {
      t.ownerHh = 0;
      left--;
    }
  }
}

function fulfillHaul(world: World, p: Person, c: import('./types').Commitment): void {
  fulfillCommitment(world, p, c.id);
}

/** A tool taken off a shared rack belongs to someone else (or to nobody): it comes with a promise to return it. */
function borrowFromRack(world: World, p: Person, kind: ToolKind, n: number): void {
  let left = n;
  for (const t of world.tools) {
    if (left <= 0) break;
    if (t.holder === p.id && t.kind === kind && !t.loan && t.ownerHh !== p.hhId) {
      t.loan = { lender: 0, borrower: p.id, due: world.tick + LOAN_TERM };
      left--;
    }
  }
}

void addItem;
void takeFrom;
void ledgerCreate;
void WATER_VALUE;
void distToFootprint;

