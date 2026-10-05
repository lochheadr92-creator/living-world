import { newActivity, faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { addEvent, addFx, addLog } from './events';
import { Scorer, addOption, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { hashUnit } from './rng';
import type { Grief, Person, World } from './types';
import { clamp } from './util';

/**
 * Grief and remembrance.
 *
 * Someone mourns only because they learned that a person had died: they were near when it happened, or somebody who knew told them.
 * How heavily it weighs starts from how close they were (family and partner most, then housemates, then close friends), eases
 * with time, and eases faster at the grave, over a meal held in memory, and among others who mourn the same person. While it weighs
 * they are slower to take up work and to wander. Nothing here creates or consumes goods.
 */

export const GRIEF_KEEP = DAY * 6; // how long they remember having been told (so word of it can still pass on)
export const NEAR_DEATH = 14; // within this many tiles they see or hear of it as it happens
const DECAY_PER_STEP = 1.2; // per 240 ticks, about 12 a day

type DeadRecord = { id: number; name: string; tick: number; hh?: number; gx?: number; gy?: number };

function personOf(world: World, id: number): Person | null {
  const e = world.byId.get(id);
  return e && e.ent === 'person' && e.alive ? e : null;
}

/** How close was `q` to the person who died? 0 means not close enough to grieve. */
export function bondTo(q: Person, rec: DeadRecord): number {
  const r = q.relations[rec.id];
  const kin = r?.kin;
  if (kin === 'partner') return 90;
  if (kin === 'parent' || kin === 'child') return 80;
  if (kin === 'sibling') return 65;
  if (rec.hh !== undefined && q.hhId === rec.hh) return 50;
  const aff = r?.affinity ?? 0;
  if (aff >= 45) return Math.round(25 + Math.min(15, (aff - 45) * 0.4));
  return 0;
}

/** Called once, as the person dies, after their grave is placed. */
export function onDeath(world: World, rec: DeadRecord): void {
  for (const q of world.persons) {
    if (!q.alive || q.id === rec.id) continue;
    if (!rec.gx && !rec.gy) continue;
    // only those standing near, awake, see or hear of it; everyone else learns by word of mouth
    if (q.pose === 'sleep' || Math.hypot(q.x - (rec.gx ?? 0), q.y - (rec.gy ?? 0)) > NEAR_DEATH) continue;
    const bond = bondTo(q, rec);
    if (bond > 0) learnOfDeath(world, q, rec, bond, 'saw', q.id);
  }
}

export function learnOfDeath(world: World, q: Person, rec: DeadRecord, bond: number, src: 'saw' | 'told' | 'found', from: number): void {
  if (q.grief.some((g) => g.about === rec.id)) return;
  if ((q.cooldowns['death' + rec.id] ?? 0) > world.tick) return;
  q.cooldowns['death' + rec.id] = world.tick + DAY * 30;
  q.grief.push({ about: rec.id, name: rec.name, weight: bond, bond, since: world.tick, died: rec.tick, src, from, gx: rec.gx ?? 0, gy: rec.gy ?? 0, visited: -99999 });
  if (q.grief.length > 5) q.grief.sort((a, b) => b.since - a.since), (q.grief.length = 5);
  const f = bond / 80;
  q.needs.social = Math.max(0, q.needs.social - 24 * Math.min(1, f));
  q.needs.safety = Math.max(0, q.needs.safety - 8 * Math.min(1, f));
  const teller = from === q.id ? null : world.byId.get(from);
  addLog(world, q, 'life', src === 'saw' ? `${rec.name} died.` : src === 'found' ? `Came upon ${rec.name}'s grave, and so learned ${rec.name} had died.` : `${teller && teller.ent === 'person' ? teller.name : 'Someone'} told me ${rec.name} had died.`);
  if (src !== 'told') q.speech = { text: '…', until: world.tick + 120, kind: 'think' };
  q.nextThink = world.tick;
}

/** Word of a death passes on: only to someone who was close to the person, who does not yet know, and only by someone who does. */
export function shareDeath(world: World, S: Person, L: Person): void {
  for (const g of S.grief) {
    if (world.tick - g.since > GRIEF_KEEP) continue;
    if (L.grief.some((x) => x.about === g.about)) {
      // two people who both mourn them: a few words together ease it a little for each
      const mine = L.grief.find((x) => x.about === g.about)!;
      if ((S.cooldowns['remember' + L.id + ':' + g.about] ?? 0) <= world.tick && g.weight > 8 && mine.weight > 8) {
        S.cooldowns['remember' + L.id + ':' + g.about] = world.tick + DAY;
        L.cooldowns['remember' + S.id + ':' + g.about] = world.tick + DAY;
        easeGrief(world, S, g.about, 4);
        easeGrief(world, L, g.about, 4);
        addLog(world, S, 'social', `Talked with ${L.name} about ${g.name}.`);
        addLog(world, L, 'social', `Talked with ${S.name} about ${g.name}.`);
      }
      continue;
    }
    const rec: DeadRecord = { id: g.about, name: g.name, tick: g.died, gx: g.gx, gy: g.gy, hh: world.deceased.find((d) => d.id === g.about)?.hh };
    const bond = bondTo(L, rec);
    if (bond <= 0) continue;
    learnOfDeath(world, L, rec, bond, 'told', S.id);
    return; // one piece of sad news per conversation
  }
}

export function easeGrief(world: World, p: Person, aboutId: number, amount: number): void {
  const g = p.grief.find((x) => x.about === aboutId);
  if (g) g.weight = clamp(g.weight - amount, 0, 100);
  void world;
}

/** How much grief is weighing on them now, 0..1 (the heaviest one). */
export function griefLoad(p: Person): number {
  let w = 0;
  for (const g of p.grief) w = Math.max(w, g.weight);
  return w / 100;
}

/**
 * A death nobody saw is found out: someone close to them who comes upon a recent grave learns whose it is. (Otherwise a person who
 * died alone would never be known to be gone.) Called every few hundred ticks, so it is a matter of passing by, not a search.
 */
export function discoverGraves(world: World, p: Person): void {
  for (const d of world.deceased) {
    if (world.tick - d.tick > GRIEF_KEEP) continue;
    if (d.gx === undefined || d.gy === undefined) continue;
    if (Math.hypot(p.x - d.gx, p.y - d.gy) > 9) continue;
    if (p.grief.some((g) => g.about === d.id)) continue;
    const rec: DeadRecord = { id: d.id, name: d.name, tick: d.tick, hh: d.hh, gx: d.gx, gy: d.gy };
    const bond = bondTo(p, rec);
    if (bond > 0) learnOfDeath(world, p, rec, bond, 'found', p.id);
  }
}

/** Slowly eases; forgets having been told after a while. */
export function decayGrief(world: World, p: Person): void {
  discoverGraves(world, p);
  if (!p.grief.length) return;
  for (const g of p.grief) g.weight = Math.max(0, g.weight - DECAY_PER_STEP);
  p.grief = p.grief.filter((g) => world.tick - g.since < GRIEF_KEEP);
}

// ───────────────────────── going to the grave ─────────────────────────
/** Someone who is grieving may walk to the grave and stand there a while. Only when nothing pressing is going on. */
export function mournOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child' || !p.grief.length) return;
  if (ctx.night || ctx.criticals.length > 0 || ctx.drives.hunger > 24 || ctx.drives.thirst > 24 || ctx.drives.energy > 40) return;
  for (const g of p.grief) {
    if (g.weight < 25 || !g.gx || world.tick - g.visited < DAY * 0.5) continue;
    const e = eta(ctx, g.gx + 0.5, g.gy + 0.5);
    const sc = new Scorer().add(`weighed down by the loss of ${g.name}`, 6 + 0.16 * g.weight).add('walking', -pen(e));
    if (g.bond >= 65) sc.add('family', 5);
    if (sc.total < 9) continue;
    addOption(ctx, {
      kind: 'mourn',
      label: `Go to ${g.name}'s grave`,
      goal: `to remember ${g.name}`,
      need: 'social',
      util: sc.total,
      parts: sc.parts,
      eta: e + 150,
      key: `mourn:${g.about}`,
      targetId: g.about,
      tag: 'care',
      make: () =>
        newActivity(world, p, {
          kind: 'mourn',
          label: `Remembering ${g.name}`,
          goal: `to remember ${g.name}`,
          need: 'social',
          targetId: 0,
          targetType: 'grave',
          tx: g.gx + 0.5,
          ty: g.gy + 0.5,
          spotX: g.gx + 0.5,
          spotY: g.gy + 1.6,
          utility: sc.total,
          minCommit: 60,
          maxTicks: 800,
          data: { about: g.about },
        }),
    });
  }
}

registerHandler('mourn', {
  availability: 0.5,
  pose: () => 'stand',
  begin(world, p, a) {
    a.duration = 150 + Math.floor(hashUnit(p.id, a.targetId, 3) * 60);
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    return a.progress >= a.duration ? 'done' : 'continue';
  },
  onEnd(world, p, a, outcome) {
    if (outcome !== 'success') return;
    const g = p.grief.find((x) => x.about === (a.data.about as number));
    if (!g) return;
    g.visited = world.tick;
    easeGrief(world, p, g.about, g.bond >= 65 ? 20 : 15);
    addLog(world, p, 'life', `Stood by ${g.name}'s grave for a while.`);
    addFx(world, 'sparkle', p.x, p.y, 0);
  },
});

/** A remembrance meal is one called by someone who is still mourning; it eases the grief of whoever sits down to it and mourns the same person. */
export function remembering(host: Person, tick: number): Grief | null {
  let best: Grief | null = null;
  for (const g of host.grief) if (g.weight >= 25 && tick - g.since < DAY * 3 && (!best || g.weight > best.weight)) best = g;
  return best;
}

export function onRemembranceMeal(world: World, name: string, aboutId: number, diners: Person[], host: Person): void {
  let eased = 0;
  for (const d of diners) {
    const g = d.grief.find((x) => x.about === aboutId);
    if (!g) continue;
    easeGrief(world, d, aboutId, 15);
    addLog(world, d, 'life', `Shared a meal remembering ${name}.`);
    eased++;
  }
  if (eased > 0) addEvent(world, 'life', `${host.name} held a meal in memory of ${name}; ${eased} who mourned them sat down together.`, diners.map((x) => x.id).slice(0, 4), host.x, host.y);
}
