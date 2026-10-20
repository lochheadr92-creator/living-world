// Side-effect imports register every activity handler.
import './act_resource';
import { hasHabitation } from './habitation';
import { spoilPile, spoilStore, updateHardship } from './hardship';
import { occasionsTick } from './occasions';
import { updateMood } from './mood';
import { illnessTick } from './illness';
import { apprenticeTick } from './apprentice';
import { lifeTickRich } from './life';
import { crowdTick } from './temperament';
import { crewsTick } from './crews';
import './act_build';
import './act_farm';
import './act_production';
import './meals';
import './welfare';
import './act_misc';
import './social';

import { stepActivity, abortActivity } from './activities';
import { settleIntentions } from './intent';
import { BELIEF_REFRESH_EVERY, DECAY_PER_TICK, PERCEIVE_EVERY, PERISHABLE, PROJECT_PATIENCE, SITE_PATIENCE } from './constants';
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
  occasionsTick(world);
  crewsTick(world);
  updateSources(world);
  updatePlots(world);
  updateBuildings(world);
  for (const b of world.buildings) if (b.ops) facilityTick(world, b);
  if (tick % 60 === 7) releaseStaleBench(world);
  expireReservations(world);
  flushDelayedBubbles(world);
  if (tick % 30 === 0) updateRequests(world);
  if (tick % 90 === 0) decayWear(world);
  roadsTick(world);

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
  illnessTick(world, p);
  apprenticeTick(world, p);
  lifeTickRich(world, p);
  crowdTick(world, p);
  if (p.health <= 0) {
    const n = p.needs;
    const cause = p.deathCause || (n.thirst <= 0 ? 'thirst' : n.hunger <= 0 ? 'hunger' : n.warmth <= 6 ? 'exposure' : 'injuries');
    killPerson(world, p, cause);
    return;
  }
  // what the world has already decided about this person's own plans, settled on the tick it became due rather than whenever they
  // next happen to think (intent.ts settleIntentions). Rich worlds only, and free for anyone carrying no plans.
  settleIntentions(world, p);
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
  const roads = world.roads;
  for (let i = 0; i < wear.length; i++) {
    if (wear[i] > 0) {
      wear[i] *= 0.9965;
      if (wear[i] < 0.01) wear[i] = 0;
    }
    // a road stays worn: the renderer shows it and the walk is faster (pathfinding.ts terrainSpeed reads the wear)
    if (roads && roads[i] && wear[i] < 0.7) wear[i] = 0.7;
  }
}

/**
 * How worn a tile must be, for how many checks (one every 600 ticks), before it is a road; the milestones announced. Wear decays
 * by 0.35% every 90 ticks and a step adds 0.0028, so a tile walked once in 90 ticks settles near 0.8: a road needs a footfall
 * about every 85 ticks, kept up for two days (the first setting, 0.3 for a day, made a fifth of the map a road in twelve days).
 */
const ROAD_WEAR = 0.85;
const ROAD_AFTER = 8;
const ROAD_MILESTONES = [20, 60, 120, 240];

/**
 * Roads (rich only): a path walked hard for about a day hardens into a road that stays, faster to walk and plain to see.
 * Nothing is built: the roads are where people already go, so they say what the settlement's life is shaped like.
 */
function roadsTick(world: World): void {
  if (world.settings.dynamics !== 'rich' || world.tick % 600 !== 450) return;
  const n = world.wear.length;
  const age = (world.roadAge ??= new Uint8Array(n));
  const roads = (world.roads ??= new Uint8Array(n));
  let before = 0;
  let after = 0;
  for (let i = 0; i < n; i++) {
    if (roads[i]) {
      before++;
      after++;
      continue;
    }
    if (world.wear[i] >= ROAD_WEAR) {
      if (age[i] < 255) age[i]++;
      if (age[i] >= ROAD_AFTER) {
        roads[i] = 1;
        after++;
      }
    } else if (age[i] > 0) age[i]--;
  }
  for (const m of ROAD_MILESTONES) {
    if (before < m && after >= m) {
      addEvent(world, 'build', `The paths most walked have hardened into roads: ${after} tiles of road now run through the settlement.`);
      break;
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
    if (hasHabitation(world)) push('IN' + (p.indoors ?? 0));
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
  // A wolf that was driven off keeps clear of one person for a while, which changes who it hunts next: that is part of
  // what the world is. Absent on every wolf that was never driven off, so an older world hashes exactly as it did.
  for (const a of world.animals) push(`A${a.id}:${r4(a.x)},${r4(a.y)},${a.state}${a.wary === undefined ? '' : `,w${a.wary},${a.waryOf ?? 0}`}`);
  for (const t of world.tools) push(`W${t.id}:${t.kind},${t.tier},${r4(t.wear)},${t.holder},${t.ownerHh},${t.loan ? t.loan.borrower : 0}`);
  for (const c of world.carts) push(`K${c.id}:${r4(c.x)},${r4(c.y)},${c.puller},${r4(c.wear)},${JSON.stringify(c.load)}`);
  for (const b of world.buildings) {
    const o = b.ops;
    if (o) push(`F${b.id}:${o.job ? `${o.job.recipe},${o.job.phase},${r4(o.job.progress)},${o.job.burnLeft},${JSON.stringify(o.job.held)}` : '-'}|${o.batches}|${JSON.stringify(o.earmarks)}|${JSON.stringify(o.shares)}`);
  }
  for (const m of world.meals) push(`M${m.id}:${m.status},${m.servings},${m.reserved},${m.arrived.length},${m.ate.length}`);
  // The generation of rules a world runs is part of what world it IS: two worlds alike in every other way but running
  // different rules are not the same world. A world with no rules version adds nothing here, so every legacy and authored
  // world hashes exactly as it did before versioning existed (the golden fingerprints hold that).
  if (world.settings.rulesVersion !== undefined) push(`V${world.settings.rulesVersion}`);
  if (world.settings.dynamics === 'rich') {
    for (const p of world.persons) if (p.alive) push(`D${p.id}:${p.mood ? r4(p.mood.level) + ',' + p.mood.thoughts.length : '-'}`);
    // a plan's bearing on the world is its kind, its state and the step it is pressing for - not the words it is written in
    for (const c of world.crews ?? []) push(`W${c.id}:${c.members.join('.')}`);
    for (const t of world.traditions ?? []) push(`V${t.id}:${t.kind},${t.status},${t.held},${t.skipped}`);
    for (const o of world.occasions ?? []) if (o.status !== 'done') push(`G${o.id}:${o.kind},${o.status},${o.attended.length}`);
    for (const p of world.persons) {
      const pay = p.payoff ?? {};
      const ks = Object.keys(pay) as (keyof typeof pay)[];
      if (p.alive && ks.length) push(`Y${p.id}:${ks.map((k) => `${k},${pay[k]!.n},${pay[k]!.r}`).join(';')}`);
    }
    // the trade somebody has settled on bears on what they choose, so it is in the fingerprint like a plan or an estimate
    for (const p of world.persons) if (p.alive && p.trade) push(`T${p.id}:${p.trade.key},${p.trade.since}`);
    if (world.roads) {
      let n = 0;
      for (let i = 0; i < world.roads.length; i++) n += world.roads[i];
      if (n) push(`R${n}`);
    }
    for (const p of world.persons) if (p.alive && p.crowd) push(`Q${p.id}:${p.crowd}`);
    for (const p of world.persons) if (p.alive && (p.goal || p.injury)) push(`L${p.id}:${p.goal ? p.goal.kind + ',' + p.goal.done : '-'}|${p.injury ? p.injury.kind + ',' + p.injury.until : '-'}`);
    for (const p of world.persons) if (p.alive && p.apprentice) push(`A${p.id}:${p.apprentice.master},${p.apprentice.key}`);
    for (const p of world.persons) if (p.alive && p.illness) push(`I${p.id}:${p.illness.since},${r4(p.illness.severity)},${p.illness.rested}`);
    for (const p of world.persons) if (p.alive && p.heard && p.heard.length) push(`H${p.id}:${p.heard.length},${p.heard.map((r) => r.about + r.hops).reduce((a, b) => a + b, 0)}`);
    for (const p of world.persons) if (p.alive && p.intentions.length) push(`N${p.id}:${p.intentions.map((i) => `${i.kind},${i.status},${i.stepKey ?? '-'},${i.setAside}`).join(';')}`);
    // What one person still owes another, and how much of it has really been handed over (Stage D1). The coarse count in the shared
    // part of the fingerprint (`p.commitments.length`) cannot tell an undelivered promise from a kept one, and that difference is
    // exactly what a save has to carry. Authored worlds are untouched: this is inside the rich branch.
    for (const p of world.persons) {
      if (!p.alive) continue;
      const live = p.commitments.filter((c) => c.status === 'active');
      if (live.length) push(`O${p.id}:${live.map((c) => `${c.kind},${c.to},${c.item ?? '-'},${c.amount},${c.delivered ?? 0},${r4(c.contrib ?? 0)}`).join(';')}`);
    }
    // a request outstanding for someone's own project: who asked whom for what, and where it has got to
    for (const r of world.requests) if (r.planId && (r.status === 'pending' || r.status === 'promised')) push(`J${r.id}:${r.from},${r.to},${r.item ?? '-'},${r.amount},${r.status},${r.planId}`);
    push(`Z${world.hardship ? world.hardship.until : 0}`);
  }
  if (world.inhabitants) for (const k of Object.keys(world.inhabitants).sort((a, b) => Number(a) - Number(b))) push(`E${k}:${JSON.stringify(world.inhabitants[Number(k)])}`);
  push(JSON.stringify(world.ledger.created) + JSON.stringify(world.ledger.consumed) + JSON.stringify(world.ledger.spoiled));
  // 'partial' is an answered ask that brought something: counted with 'fulfilled' here, so this number means what it always meant
  push(`Q${world.requests.length},${world.requests.filter((r) => r.status === 'fulfilled' || r.status === 'partial').length}|H${world.households.length}`);
  return h.toString(16).padStart(8, '0');
}

const NEED_KEYS_STR = ['hunger', 'thirst', 'energy', 'warmth', 'safety', 'social'];

export function runTicks(world: World, n: number): void {
  for (let i = 0; i < n; i++) stepWorld(world);
}
