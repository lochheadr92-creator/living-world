// Occasions (rich worlds only): a place and a time at which many people gather at once - a funeral, a wedding, a feast for a birth or
// the first harvest, and a market day. An occasion is called by something that happened (a death, a wedding, a birth, a harvest) or
// by the calendar (the market, every sixth day once a hall stands), is held at the hall or, failing that, at the camp fire, and
// opens for a while in daylight. Going is an ordinary option that people take or leave by their own lights: closeness to whoever it
// is for, sociability, what they carry, how far it is. Being there changes what a nudge never could: who met whom, how everyone
// felt that day, and at the market what moved from one pack to another.
//
// What it is NOT: nobody is made to go, nothing is created from nothing (the market only moves food that exists, by the ordinary
// transfer that records it), and an authored world calls no occasion at all - `world.occasions` is never created there, so its
// saves and fingerprints are untouched.
import { faceToward, newActivity, registerHandler, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { DAY, DAYS_PER_YEAR, NUTRITION, START_FRAC } from './constants';
import { transfer } from './economy';
import { surplusOf, valueOf } from './social';
import { dayNumber } from './environment';
import { addEvent, addLog } from './events';
import { isRich, think } from './mood';
import { Scorer, addOption, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { carryCap } from './people';
import { personById } from './registry';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import type { Building, FoodKind, ItemKind, Occasion, OccasionKind, Person, World } from './types';
import { hyp } from './util';
import { dueTraditions, noteOccasionOver, noteWinterOver, occasionOf } from './traditions';

/** how long an occasion stays open once it has opened */
export const OCCASION_OPEN = 600;
/** the market comes round this often, in days, once there is a hall to hold it in */
export const MARKET_EVERY = 6;
/** a harvest feast is called once this much grain has been brought in since the last one */
export const HARVEST_FEAST_AT = 25;
/** the most others one person's arrival is counted as meeting (the first that many to have come) */
const MEET_AT_MOST = 8;

const KIND_LABEL: Record<OccasionKind, string> = { funeral: 'funeral', wedding: 'wedding feast', feast: 'feast', harvest: 'harvest feast', market: 'market' };

export const occasionsOf = (world: World): Occasion[] => world.occasions ?? [];

/** the hall if one stands (the soundest), else the camp fire nearest the camp; null in a world with neither */
function placeFor(world: World): Building | null {
  let best: Building | null = null;
  for (const b of world.buildings) {
    if (b.type === 'hall' && b.condition > 15 && (!best || best.type !== 'hall' || b.condition > best.condition)) best = b;
  }
  if (best) return best;
  let d = Infinity;
  for (const b of world.buildings) {
    if (b.type !== 'fire') continue;
    const dd = hyp(b.x - world.camp.x, b.y - world.camp.y);
    if (dd < d) {
      d = dd;
      best = b;
    }
  }
  return best;
}

/**
 * The next tick whose clock reads `frac` of a day (0 = midnight, 0.5 = noon): today's if it is still comfortably ahead, else
 * tomorrow's. The clock does not start at midnight (`START_FRAC`), so the tick is found from the clock, not from the day boundary.
 */
function nextDaylight(world: World, frac: number): number {
  let at = Math.floor(world.tick / DAY) * DAY + Math.round(((frac - START_FRAC + 1) % 1) * DAY);
  while (at <= world.tick + 60) at += DAY;
  return at;
}

/** Call an occasion. Rich only; nothing happens in an authored world, and nothing without a place to hold it. */
export function callOccasion(world: World, kind: OccasionKind, about: number[], frac = 0.4): Occasion | null {
  if (!isRich(world)) return null;
  const place = placeFor(world);
  if (!place) return null;
  const list = (world.occasions ??= []);
  // one of a kind at a time: a second death before the first funeral is mourned at the same one
  const open = list.find((o) => o.kind === kind && o.status !== 'done');
  if (open) {
    for (const id of about) if (!open.about.includes(id)) open.about.push(id);
    return open;
  }
  const at = nextDaylight(world, frac);
  const o: Occasion = {
    id: world.nextId++,
    kind,
    placeId: place.id,
    placeName: place.type === 'hall' ? 'the hall' : 'the fire',
    x: place.x + place.w / 2,
    y: place.y + place.h / 2,
    called: world.tick,
    at,
    until: at + OCCASION_OPEN,
    about: about.slice(),
    attended: [],
    status: 'called',
    end: '',
  };
  list.push(o);
  const names = about.map((id) => nameOfId(world, id)).filter(Boolean).join(' and ');
  const when = dayNumber(at) > dayNumber(world.tick) ? 'tomorrow' : 'today';
  addEvent(world, 'social', `A ${KIND_LABEL[kind]}${names ? ` for ${names}` : ''} is called at ${o.placeName} ${when}.`, about, o.x, o.y);
  return o;
}

function nameOfId(world: World, id: number): string {
  const p = world.byId.get(id);
  if (p && p.ent === 'person') return p.name;
  const d = world.deceased.find((x) => x.id === id);
  return d ? d.name : '';
}

// ───────────────────────── what calls one ─────────────────────────
export function noteDeath(world: World, dead: Person): void {
  callOccasion(world, 'funeral', [dead.id], 0.38);
}
export function noteBirth(world: World, baby: Person, mother: Person): void {
  callOccasion(world, 'feast', [baby.id, mother.id], 0.58);
}
export function noteWedding(world: World, a: Person, b: Person): void {
  callOccasion(world, 'wedding', [a.id, b.id], 0.58);
}
export function noteHarvest(world: World, units: number): void {
  if (!isRich(world) || units <= 0) return;
  const st = (world.occasionState ??= { harvestUnits: 0, lastHarvestFeastDay: -99, lastMarketDay: -99 });
  st.harvestUnits += units;
  const day = Math.floor(world.tick / DAY);
  if (st.harvestUnits >= HARVEST_FEAST_AT && day - st.lastHarvestFeastDay >= MARKET_EVERY) {
    st.harvestUnits = 0;
    st.lastHarvestFeastDay = day;
    callOccasion(world, 'harvest', [], 0.58);
  }
}

/** Once a tick, cheaply: open what is due, close what is over, and call the market when its day comes. */
export function occasionsTick(world: World): void {
  if (!isRich(world)) return;
  if (world.tick % DAY === 11) {
    const day = Math.floor(world.tick / DAY);
    const st = (world.occasionState ??= { harvestUnits: 0, lastHarvestFeastDay: -99, lastMarketDay: -99 });
    if (day >= 3 && day % MARKET_EVERY === 3 && st.lastMarketDay !== day && world.buildings.some((b) => b.type === 'hall' && b.condition > 15)) {
      st.lastMarketDay = day;
      callOccasion(world, 'market', [], 0.42);
    }
    // the first winter lived through becomes a midwinter fire; the traditions whose day it is are called (traditions.ts)
    if (day > 0 && day % DAYS_PER_YEAR === 0) noteWinterOver(world);
    for (const t of dueTraditions(world)) {
      const o = callOccasion(world, occasionOf(t), t.about ? [t.about] : [], 0.55);
      if (o) t.lastHeld = day;
    }
  }
  const list = world.occasions;
  if (!list || !list.length) return;
  for (const o of list) {
    if (o.status === 'called' && world.tick >= o.at) {
      o.status = 'gathering';
      addEvent(world, 'social', `The ${KIND_LABEL[o.kind]} at ${o.placeName} begins.`, o.about, o.x, o.y);
    } else if (o.status === 'gathering' && world.tick >= o.until) {
      o.status = 'done';
      o.end = o.attended.length ? `${o.attended.length} came` : 'nobody came';
      addEvent(world, 'social', `The ${KIND_LABEL[o.kind]} at ${o.placeName} is over: ${o.end}.`, o.about, o.x, o.y);
      noteOccasionOver(world, o);
    }
  }
  // the record keeps the last few, so the card and the chronicle can say what was held
  while (list.length > 12 && list[0].status === 'done') list.shift();
}

// ───────────────────────── going ─────────────────────────
/** how much this occasion is this person's: for family and friends of whoever it is for, a great deal */
function closeness(p: Person, o: Occasion): number {
  let c = 0;
  for (const id of o.about) {
    if (id === p.id) return 0; // the baby, the bride: they are there already by other means, and need no option to go
    const r = p.relations[id];
    if (!r) continue;
    if (r.kin) c = Math.max(c, 1);
    else c = Math.max(c, Math.min(1, Math.max(0, r.affinity) / 60));
  }
  return c;
}

const foodCarried = (p: Person): number => (Object.keys(NUTRITION) as FoodKind[]).reduce((n, k) => n + (p.inv[k] ?? 0), 0);

export function attendOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!isRich(world) || ctx.stage === 'child') return;
  const list = world.occasions;
  if (!list) return;
  if (ctx.criticals.length || ctx.dangers.length) return;
  for (const o of list) {
    // worth setting out for a little before it opens, so that people arrive as it begins rather than as it ends
    if (o.status === 'done' || o.attended.includes(p.id) || o.about.includes(p.id)) continue;
    if (o.status === 'called' && world.tick < o.at - 200) continue;
    const d = hyp(o.x - p.x, o.y - p.y);
    if (d > 60) continue;
    const e = eta(ctx, o.x, o.y);
    const close = closeness(p, o);
    const place = world.byId.get(o.placeId);
    if (!place || place.ent !== 'building') continue;
    // an occasion is a reason to be somewhere: it draws people off ordinary work (which scores 20 to 45) as a called meal does, and
    // never beats a need that has become pressing (those are 50 and more); the walk counts for less than it does for a chore
    const sc = new Scorer();
    if (o.kind === 'funeral') sc.add(close > 0 ? 'to mourn someone of mine' : 'to pay respects', 30 + 20 * close);
    else if (o.kind === 'market') sc.add(foodCarried(p) > 8 ? 'food to spare and a market to take it to' : p.needs.hunger < 55 ? 'a market, and little in the pack' : 'market day', foodCarried(p) > 8 || p.needs.hunger < 55 ? 34 : 26);
    else sc.add(close > 0 ? `a ${KIND_LABEL[o.kind]} for someone of mine` : `a ${KIND_LABEL[o.kind]}`, 30 + 14 * close);
    sc.add('company', 10 * p.traits.sociability);
    // the hall is out of the weather: on a cold day a gathering there is also somewhere warm to be
    if (place.type === 'hall') {
      const wet = (34 * world.weather.storm + 16 * world.weather.rain) * 0.5 + Math.max(0, 60 - p.needs.warmth) * 0.5;
      if (wet > 0) sc.add('out of the weather at the hall', wet);
    }
    sc.add('walking', -pen(e) * 0.5);
    if (sc.total < 8) continue;
    addOption(ctx, {
      kind: 'attend',
      label: `Go to the ${KIND_LABEL[o.kind]} at ${o.placeName}`,
      goal: o.kind === 'funeral' ? 'to mourn' : o.kind === 'market' ? 'to trade' : 'to celebrate',
      need: 'social',
      util: sc.total,
      parts: sc.parts,
      eta: e + 150,
      key: `attend:${o.id}`,
      targetId: o.id,
      tag: 'social',
      make: () => {
        // a free tile beside the hall or the fire, as a meal's guests find one; none means no way to be there
        const spot = standSpotFor(world, p, place);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'attend',
          label: `At the ${KIND_LABEL[o.kind]}`,
          goal: o.kind === 'funeral' ? 'to mourn' : o.kind === 'market' ? 'to trade' : 'to celebrate',
          need: 'social',
          targetId: o.id,
          targetType: 'occasion',
          tx: o.x,
          ty: o.y,
          spotX: spot.x + 0.5,
          spotY: spot.y + 0.5,
          utility: sc.total,
          minCommit: 60,
          maxTicks: 900,
          data: { occasion: o.id },
        });
      },
    });
  }
}

/** what happens on arrival: the person is counted, meets those already there, feels it, and at a market food changes hands */
function arrive(world: World, p: Person, o: Occasion): void {
  if (o.attended.includes(p.id)) return;
  const there = o.attended.slice(0, MEET_AT_MOST);
  o.attended.push(p.id);
  for (const id of there) {
    const q = personById(world, id);
    if (!q || !q.alive) continue;
    const note = `met at the ${KIND_LABEL[o.kind]}`;
    adjustRel(p, q.id, world.tick, { aff: 1.2, fam: 1, note });
    adjustRel(q, p.id, world.tick, { aff: 1.2, fam: 1, note });
  }
  const close = closeness(p, o);
  if (o.kind === 'funeral') think(world, p, 'mourning', close > 0 ? 4 : 1, DAY, close > 0 ? 'grief shared at the funeral' : 'paid respects at the funeral');
  else if (o.kind === 'market') think(world, p, 'market', 3, DAY, 'market day');
  else think(world, p, 'feast', 6 + 4 * close, DAY, `the ${KIND_LABEL[o.kind]}`);
  addLog(world, p, 'social', `Went to the ${KIND_LABEL[o.kind]} at ${o.placeName}${there.length ? ` (${there.length} already there)` : ''}.`);
  if (o.kind === 'market') {
    marketExchange(world, p, o);
    marketSwap(world, p, o);
  }
}

const BARTER: ItemKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'wood', 'stone', 'clay', 'planks', 'bricks', 'charcoal'];

/**
 * Barter: the newcomer's surplus against what they are short of, with whoever there has the opposite. Each judges the swap by
 * their own valuation (social.ts valueOf), two units for two units at most, and both packs must have room. One swap per arrival.
 */
export function marketSwap(world: World, p: Person, o: Occasion): boolean {
  // what I am short of, dearest first
  const wants = BARTER.filter((k) => (p.inv[k] ?? 0) < 2)
    .map((k) => ({ k, v: valueOf(world, p, k) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 4);
  for (const { k: want } of wants) for (const id of o.attended) {
    if (id === p.id) continue;
    const q = personById(world, id);
    if (!q || !q.alive || surplusOf(world, q, want) < 1) continue;
    // what of mine would they take for it? the thing they value most that I can spare
    let give: ItemKind | null = null;
    let gain = 0;
    for (const k of BARTER) {
      if (k === want || surplusOf(world, p, k) < 1) continue;
      const g = valueOf(world, q, k) - valueOf(world, q, want);
      if (g > gain) {
        gain = g;
        give = k;
      }
    }
    if (!give || valueOf(world, p, want) <= valueOf(world, p, give)) continue;
    // two for two at most; the transfers themselves cap what each pack can take, and a swap one side cannot carry is undone
    const n = Math.min(2, surplusOf(world, p, give), surplusOf(world, q, want));
    if (n < 1) continue;
    const got = transfer(world, q.inv, p.inv, carryCap(world, p), want, n, 'person:' + q.id, 'person:' + p.id, 'market swap');
    if (got < 1) continue;
    const gave = transfer(world, p.inv, q.inv, carryCap(world, q), give, got, 'person:' + p.id, 'person:' + q.id, 'market swap');
    if (gave < got) {
      // their pack could not take it after all: what came over goes back, and nothing is recorded as a swap
      transfer(world, p.inv, q.inv, carryCap(world, q) + 99, want, got - gave, 'person:' + p.id, 'person:' + q.id, 'market swap undone');
      if (gave < 1) continue;
    }
    adjustRel(p, q.id, world.tick, { aff: 1.5, trust: 1, fam: 0.5, note: `swapped ${give} for ${want} at the market` });
    adjustRel(q, p.id, world.tick, { aff: 1.5, trust: 1, fam: 0.5, note: `swapped ${want} for ${give} at the market` });
    addEvent(world, 'trade', `${p.name} swapped ${gave} ${give} for ${got} ${want} with ${q.name} at the market.`, [p.id, q.id], o.x, o.y);
    addLog(world, p, 'social', `Swapped ${gave} ${give} for ${got} ${want} with ${q.name} at the market.`);
    addLog(world, q, 'social', `Swapped ${got} ${want} for ${gave} ${give} with ${p.name} at the market.`);
    return true;
  }
  return false;
}

/**
 * The market, in its first form: whoever comes with food to spare hands some to whoever came short of it, by the ordinary transfer
 * that records every unit. Up to three units, to the hungriest person there who still has room; nothing moves if nobody is short.
 */
function marketExchange(world: World, p: Person, o: Occasion): void {
  const spare = foodCarried(p) - 6;
  if (spare < 1) return;
  let taker: Person | null = null;
  for (const id of o.attended) {
    if (id === p.id) continue;
    const q = personById(world, id);
    if (!q || !q.alive || q.needs.hunger >= 55) continue;
    if (!taker || q.needs.hunger < taker.needs.hunger) taker = q;
  }
  if (!taker) return;
  let moved = 0;
  for (const k of Object.keys(NUTRITION) as FoodKind[]) {
    const have = p.inv[k] ?? 0;
    if (have <= 0 || moved >= Math.min(3, spare)) continue;
    moved += transfer(world, p.inv, taker.inv, carryCap(world, taker), k as ItemKind, Math.min(have, Math.min(3, spare) - moved), 'person:' + p.id, 'person:' + taker.id, 'market');
  }
  if (moved <= 0) return;
  adjustRel(taker, p.id, world.tick, { aff: 2.5, trust: 1.5, note: 'gave me food at the market' });
  adjustRel(p, taker.id, world.tick, { aff: 1, note: 'took my food at the market' });
  addEvent(world, 'trade', `${p.name} handed ${moved} food to ${taker.name} at the market.`, [p.id, taker.id], o.x, o.y);
  addLog(world, taker, 'social', `${p.name} gave me ${moved} food at the market.`);
}

registerHandler('attend', {
  availability: 0.8,
  pose: () => 'stand',
  begin(world, p, a) {
    const o = occasionsOf(world).find((x) => x.id === a.data.occasion);
    if (!o || o.status === 'done') return 'it was over by the time I got there';
    a.duration = 90 + Math.round(hashUnit(p.id, o.id, 3) * 150);
    if (o.status === 'gathering') arrive(world, p, o);
  },
  work(world, p, a): WorkResult {
    const o = occasionsOf(world).find((x) => x.id === a.data.occasion);
    if (!o || o.status === 'done') return a.progress > 10 ? 'done' : 'fail:it is over';
    faceToward(p, o.x, o.y);
    // early: wait at the place until it begins (the wait counts for nothing)
    if (o.status !== 'gathering') return 'continue';
    if (!o.attended.includes(p.id)) arrive(world, p, o);
    // a gathering at the hall is out of the weather
    if (o.placeName === 'the hall' && p.needs.warmth < 90) p.needs.warmth = Math.min(100, p.needs.warmth + 0.06);
    a.progress++;
    return a.progress < a.duration ? 'continue' : 'done';
  },
});
