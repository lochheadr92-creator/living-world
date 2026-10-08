// Side-effect imports register every activity handler.
import './act_resource';
import { noteFoodLoss } from './storage';
import { spoilPile, spoilStore, updateHardship } from './hardship';
import { updateMood } from './mood';
import { updateWells } from './water';
import './act_build';
import './act_farm';
import './act_production';
import './meals';
import './welfare';
import './act_misc';
import './social';

import { stepActivity, abortActivity } from './activities';
import { BELIEF_REFRESH_EVERY, DECAY_PER_TICK, PERCEIVE_EVERY, isHomeType, PERISHABLE, PROJECT_PATIENCE, SITE_PATIENCE } from './constants';
import { decide, reviewActivity, urgentInterrupt } from './decision';
import { isProjectSite } from './act_build';
import { cancelSite, destroyBuilding } from './buildings';
import { expireReservations, ledgerSpoil } from './economy';
import { updateCarts } from './carts';
import { updateEnvironment } from './environment';
import { facilityTick, noteSpoiled, spoilMultiplier } from './facilities';
import { mealTick } from './meals';
import { noteConcerns } from './welfare';
import { addEvent, addFx } from './events';
import { updatePlots } from './farming';
import { CONCEPTION_CHECK_EVERY, LIFE_CHECK_EVERY, adoptOrphans, conceptionTick, immigrationTick, killPerson, lifeTick } from './lifecycle';
import { updateNeeds } from './needs';
import { perceive, refreshBeliefs } from './perception';
import { rebuildMobileGrid } from './registry';
import { decayGrievances } from './grievance';
import { driftRelations } from './relations';
import { bondWorkers, checkCommitments, flushDelayedBubbles, passingGreetings, updateConversations, updateRequests } from './social';
import { resumeSuspended } from './activities';
import { updateSources } from './sources';
import { releaseStaleBench } from './tools';
import { updateWildlife } from './wildlife';
import type { ItemKind, Person, World } from './types';

/** One simulation tick. The only thing that ever mutates the world. */
export function stepWorld(world: World): void {
  const tick = world.tick;

  // previous transforms, so the renderer can interpolate
  for (const p of world.persons) {
    p.px = p.x;
    p.py = p.y;
    p.pheading = p.heading;
  }
  for (const a of world.animals) {
    a.px = a.x;
    a.py = a.y;
    a.pheading = a.heading;
  }

  updateEnvironment(world);
  updateHardship(world);
  updateWells(world);
  updateSources(world);
  updatePlots(world);
  updateBuildings(world);
  for (const b of world.buildings) if (b.ops) facilityTick(world, b);
  if (tick % 60 === 7) releaseStaleBench(world);
  expireReservations(world);
  flushDelayedBubbles(world);
  if (tick % 30 === 0) updateRequests(world);
  if (tick % 90 === 0) decayWear(world);

  updateWildlife(world);
  rebuildMobileGrid(world);

  const list = world.persons.slice();
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const p = list[(i + tick) % n];
    if (!p.alive) continue;
    stepPerson(world, p);
  }

  updateCarts(world);
  updateConversations(world);
  if (tick % 10 === 3) mealTick(world);

  // slow world processes
  if (tick % LIFE_CHECK_EVERY === 17) for (const p of world.persons.slice()) if (p.alive) lifeTick(world, p);
  if (tick % CONCEPTION_CHECK_EVERY === 91) conceptionTick(world);
  if (tick % 300 === 151) clearStaleSites(world);
  if (tick % 300 === 43) adoptOrphans(world);
  if (tick % 400 === 211) immigrationTick(world);
  if (tick % 120 === 59) spoilGoods(world);

  world.tick++;
}

function stepPerson(world: World, p: Person): void {
  const tick = world.tick;
  updateNeeds(world, p);
  updateMood(world, p);
  if (p.health <= 0) {
    const n = p.needs;
    const cause = p.deathCause || (n.thirst <= 0 ? 'thirst' : n.hunger <= 0 ? 'hunger' : n.warmth <= 6 ? 'exposure' : 'injuries');
    killPerson(world, p, cause);
    return;
  }
  if ((tick + p.id) % PERCEIVE_EVERY === 0) perceive(world, p);
  if ((tick + p.id) % BELIEF_REFRESH_EVERY === 0) refreshBeliefs(world, p);
  if ((tick + p.id) % 12 === 5) noteConcerns(world, p);
  if (p.speech && p.speech.until < tick) p.speech = null;
  passingGreetings(world, p);
  bondWorkers(world, p);
  if ((tick + p.id) % 40 === 0) checkCommitments(world, p);
  if ((tick + p.id) % 240 === 0) {
    driftRelations(p);
    decayGrievances(world, p);
  }

  // someone is handing something over: stand still for a moment
  if ((p.cooldowns.pause ?? 0) > tick && !p.activity) {
    p.pose = 'stand';
    return;
  }
  if ((p.cooldowns.pause ?? 0) > tick && p.activity && p.activity.kind !== 'give') {
    p.pose = 'stand';
    return;
  }

  if (!p.activity) {
    if (p.suspended && !p.convId) resumeSuspended(world, p);
    if (!p.activity && tick >= p.nextThink) decide(world, p, 'free');
  } else if (tick >= p.nextThink || urgentInterrupt(world, p)) {
    reviewActivity(world, p);
  }
  stepActivity(world, p);
}

// ───────────────────────── physical world processes ─────────────────────────
function updateBuildings(world: World): void {
  const w = world.weather;
  const stormy = 1 + 0.45 * w.rain + 1.1 * w.storm;
  for (const b of world.buildings.slice()) {
    if (b.type === 'fire') {
      if (b.fuel > 0) {
        const burn = world.light < 0.5 || w.rain > 0.3 || w.temp < 10 ? 1 : 0.5;
        b.fuel = Math.max(0, b.fuel - burn);
        if (b.fuel === 0) addEvent(world, 'survival', 'The fire has gone out.', [], b.x, b.y);
      }
      continue;
    }
    b.condition -= DECAY_PER_TICK[b.type] * stormy;
    if (b.condition <= 0) {
      for (const p of world.persons) if (p.activity && p.activity.targetId === b.id) abortActivity(world, p, 'the building collapsed');
      destroyBuilding(world, b, 'collapsed from neglect');
    }
  }
}

function decayWear(world: World): void {
  const wear = world.wear;
  for (let i = 0; i < wear.length; i++) {
    if (wear[i] > 0) {
      wear[i] *= 0.9965;
      if (wear[i] < 0.01) wear[i] = 0;
    }
  }
}

/** Perishable goods slowly go off: an explicit, recorded process (never silent). */
function spoilGoods(world: World): void {
  const rate = 0.011;
  for (const b of world.buildings) {
    if (b.store.cap <= 0) continue;
    const bad = (b.condition < 40 ? 2 : 1) * spoilMultiplier(world, b);
    for (const k of Object.keys(PERISHABLE) as ItemKind[]) {
      const n = b.store.items[k] ?? 0;
      if (n <= 0) continue;
      let lost = 0;
      for (let i = 0; i < n; i++) if (world.rng.next() < rate * (PERISHABLE[k] ?? 1) * bad * spoilStore(world)) lost++;
      if (lost > 0) {
        b.store.items[k] = n - lost;
        if (b.store.items[k] === 0) delete b.store.items[k];
        noteSpoiled(world, b, k, lost);
        if (b.hhId && (isHomeType(b.type) || b.type === 'cellar')) noteFoodLoss(world, b.hhId, lost);
        ledgerSpoil(world, k, lost, b.type === 'granary' ? 'grain bins: stored food spoiled' : 'stored food spoiled');
      }
    }
  }
  for (const pile of world.piles.slice()) {
    for (const k of Object.keys(PERISHABLE) as ItemKind[]) {
      const n = pile.items[k] ?? 0;
      if (n <= 0) continue;
      let lost = 0;
      for (let i = 0; i < n; i++) if (world.rng.next() < 0.04 * (PERISHABLE[k] ?? 1) * spoilPile(world)) lost++;
      if (lost > 0) {
        pile.items[k] = n - lost;
        if (pile.items[k] === 0) delete pile.items[k];
        ledgerSpoil(world, k, lost, 'left-out food spoiled');
      }
    }
    if (Object.keys(pile.items).length === 0) {
      const i = world.piles.indexOf(pile);
      if (i >= 0) world.piles.splice(i, 1);
      world.byId.delete(pile.id);
      const cell = world.grid.cells.find((c) => c.includes(pile));
      if (cell) cell.splice(cell.indexOf(pile), 1);
    }
  }
  void addFx;
}

/** Projects that nobody has touched for days are abandoned, which frees the settlement to start something it can finish. */
function clearStaleSites(world: World): void {
  for (const site of world.sites.slice()) {
    if (world.tick - Math.max(site.lastWorkTick, site.createdTick) < (isProjectSite(site) ? PROJECT_PATIENCE : SITE_PATIENCE)) continue;
    // someone on their way to it counts as interest
    const attended = world.persons.some((q) => q.alive && q.activity && q.activity.targetId === site.id && (q.activity.kind === 'build' || q.activity.kind === 'haul'));
    if (attended) continue;
    cancelSite(world, site, 'nobody had worked on it for days');
  }
}

// ───────────────────────── state hash (determinism checks, debugging) ─────────────────────────
function fnv(h: number, s: string): number {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const r4 = (v: number): string => (Math.round(v * 10000) / 10000).toString();

/** A compact fingerprint of everything that matters. Same seed + settings + ticks => same hash. */
export function hashWorld(world: World): string {
  let h = 2166136261;
  const push = (s: string) => {
    h = fnv(h, s);
  };
  push(`T${world.tick}|${world.rng.a},${world.rng.b},${world.rng.c},${world.rng.d}|${world.weather.kind}`);
  for (const p of world.persons) {
    push(
      `P${p.id}:${r4(p.x)},${r4(p.y)},${r4(p.heading)}|${r4(p.health)}|${NEED_KEYS_STR.map((k) => r4(p.needs[k as keyof Person['needs']])).join(',')}|${JSON.stringify(p.inv)}|${p.hhId}|${p.activity ? p.activity.kind + ':' + p.activity.targetId + ':' + r4(p.activity.progress) + ':' + p.activity.phase : '-'}|${p.commitments.length}`,
    );
    let aff = 0;
    let fam = 0;
    for (const k in p.relations) {
      aff += p.relations[k as unknown as number].affinity;
      fam += p.relations[k as unknown as number].familiarity;
    }
    push(`R${r4(aff)},${r4(fam)}|B${Object.keys(p.beliefs).length}`);
  }
  for (const s of world.sources) push(`S${s.id}:${s.amount},${r4(s.growth)},${s.reserved}`);
  for (const b of world.buildings) push(`B${b.id}:${b.type},${r4(b.condition)},${r4(b.fuel)},${JSON.stringify(b.store.items)}`);
  for (const s of world.sites) push(`C${s.id}:${r4(s.work)},${JSON.stringify(s.delivered)},${JSON.stringify(s.used)}`);
  for (const pl of world.plots) push(`L${pl.id}:${pl.state},${r4(pl.progress)},${pl.stock},${pl.seedStock}`);
  for (const pile of world.piles) push(`I${pile.id}:${JSON.stringify(pile.items)}`);
  for (const a of world.animals) push(`A${a.id}:${r4(a.x)},${r4(a.y)},${a.state}`);
  for (const t of world.tools) push(`W${t.id}:${t.kind},${t.tier},${r4(t.wear)},${t.holder},${t.ownerHh},${t.loan ? t.loan.borrower : 0}`);
  for (const c of world.carts) push(`K${c.id}:${r4(c.x)},${r4(c.y)},${c.puller},${r4(c.wear)},${JSON.stringify(c.load)}`);
  for (const b of world.buildings) {
    const o = b.ops;
    if (o) push(`F${b.id}:${o.job ? `${o.job.recipe},${o.job.phase},${r4(o.job.progress)},${o.job.burnLeft},${JSON.stringify(o.job.held)}` : '-'}|${o.batches}|${JSON.stringify(o.earmarks)}|${JSON.stringify(o.shares)}`);
  }
  for (const m of world.meals) push(`M${m.id}:${m.status},${m.servings},${m.reserved},${m.arrived.length},${m.ate.length}`);
  if (world.settings.dynamics === 'rich') {
    for (const p of world.persons) if (p.alive) push(`D${p.id}:${p.mood ? r4(p.mood.level) + ',' + p.mood.thoughts.length + ',' + (p.mood.breakUntil ?? 0) : '-'}`);
    push(`Z${world.hardship ? world.hardship.until : 0}`);
  }
  push(JSON.stringify(world.ledger.created) + JSON.stringify(world.ledger.consumed) + JSON.stringify(world.ledger.spoiled));
  push(`Q${world.requests.length},${world.requests.filter((r) => r.status === 'fulfilled').length}|H${world.households.length}`);
  return h.toString(16).padStart(8, '0');
}

const NEED_KEYS_STR = ['hunger', 'thirst', 'energy', 'warmth', 'safety', 'social'];

export function runTicks(world: World, n: number): void {
  for (let i = 0; i < n; i++) stepWorld(world);
}
