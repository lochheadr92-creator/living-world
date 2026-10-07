import { DAY } from './constants';
import { quarrelFactor } from './mood';
import { addEvent, addLog } from './events';
import { relOf } from './relations';
import type { GrievanceCause, Person, World } from './types';

/**
 * Grievances: what two people are actually sore about, why, and how it ends.
 *
 * A grievance is opened by a real incident (a contested resource, a refusal that mattered, a broken promise), carries its
 * cause in words, and has a weight that falls with time, apologies, gifts and working side by side. It closes — and is
 * remembered as settled — when the weight reaches zero or three days pass. An apology is only ever attempted while one is open,
 * and only a bounded number of times; a settled grievance never prompts another apology, and a new quarrel needs a new cause
 * (or a different old wound), not the same one over again.
 */
export const GRIEVANCE_LIFE = DAY * 3;
export const MAX_APOLOGIES = 3;
/** after a grievance closes, the same cause cannot start a new quarrel for this long */
export const SETTLED_TRUCE = Math.round(DAY * 0.6);

export function openGrievance(world: World, holder: Person, other: Person, cause: GrievanceCause, detail: string, weight: number): void {
  const r = relOf(holder, other.id);
  const g = r.grievance;
  if (g && g.cause === cause) {
    // the same wound again: it is a little deeper, not a new quarrel
    g.weight = Math.min(100, Math.max(g.weight, weight) + 6);
    g.detail = detail;
    return;
  }
  r.grievance = { cause, detail, since: world.tick, weight, apologies: 0, lastAmends: 0 };
  r.history.push({ tick: world.tick, text: `sore: ${detail}` });
  if (r.history.length > 24) r.history.shift();
}

export function grievanceOf(holder: Person, other: number): { cause: GrievanceCause; detail: string; weight: number; apologies: number } | null {
  const g = holder.relations[other]?.grievance;
  return g ? { cause: g.cause, detail: g.detail, weight: g.weight, apologies: g.apologies } : null;
}

/** Something was done to mend it. Returns true if that closed it. */
export function easeGrievance(world: World, holder: Person, other: Person, amount: number, how: string): boolean {
  const r = holder.relations[other.id];
  if (!r || !r.grievance) return false;
  r.grievance.weight -= amount;
  r.grievance.lastAmends = world.tick;
  r.history.push({ tick: world.tick, text: `${how} (soreness ${Math.max(0, Math.round(r.grievance.weight))} left)` });
  if (r.history.length > 24) r.history.shift();
  if (r.grievance.weight <= 0) return closeGrievance(world, holder, other, how);
  return false;
}

export function closeGrievance(world: World, holder: Person, other: Person, how: string): boolean {
  const r = relOf(holder, other.id);
  const g = r.grievance;
  if (!g) return false;
  r.grievance = null;
  r.settledAt = world.tick;
  r.avoidUntil = 0;
  addLog(world, holder, 'social', how === 'time' ? `The trouble with ${other.name} has faded.` : `Put the trouble with ${other.name} behind us (${how}).`);
  announceEnd(world, holder, other, how);
  return true;
}

/** The feed hears of a quarrel's end once, when neither side is sore any more (an accepted apology says so itself). */
function announceEnd(world: World, holder: Person, other: Person, how: string): void {
  if (how === 'an apology') return;
  const back = other.relations[holder.id]?.grievance;
  if (back) return;
  const why = how === 'time' ? 'it faded with time' : how === 'a gift' ? 'after a gift' : how;
  addEvent(world, 'social', `${holder.name} and ${other.name} are on good terms again (${why}).`, [holder.id, other.id], holder.x, holder.y);
}

/** Both sides close it together (an accepted apology). */
export function settleBoth(world: World, a: Person, b: Person, how: string): void {
  closeGrievance(world, a, b, how);
  closeGrievance(world, b, a, how);
}

/** A gift to someone who is sore at the giver eases it in proportion to how much it mattered. */
export function endGrievanceOnGift(world: World, giver: Person, receiver: Person, severity: number): void {
  easeGrievance(world, receiver, giver, 8 + 14 * severity, 'a gift');
  easeGrievance(world, giver, receiver, 4, 'giving something');
  const rr = receiver.relations[giver.id];
  if (rr && !rr.grievance) rr.avoidUntil = 0;
  const gr = giver.relations[receiver.id];
  if (gr && !gr.grievance) gr.avoidUntil = 0;
}

/** Slow fading, called every few hundred ticks per person. */
export function decayGrievances(world: World, p: Person): void {
  for (const k in p.relations) {
    const r = p.relations[k as unknown as number];
    const g = r.grievance;
    if (!g) continue;
    g.weight -= 3;
    if (g.weight <= 0 || world.tick - g.since > GRIEVANCE_LIFE) {
      const other = world.byId.get(Number(k));
      if (other && other.ent === 'person') closeGrievance(world, p, other, 'time');
      else {
        r.grievance = null;
        r.settledAt = world.tick;
        r.avoidUntil = 0;
      }
    }
  }
}

/** May a new quarrel start between these two over something like this again, so soon after making peace? Returns a multiplier on the chance. */
export function quarrelDamper(world: World, a: Person, b: Person): number {
  const r = a.relations[b.id];
  if (!r) return 1;
  if (r.grievance) return 1;
  return (world.tick - r.settledAt < SETTLED_TRUCE ? 0.2 : 1) * quarrelFactor(world, a);
}

/** Does this person have any reason to seek the other out to make amends? Only an open grievance that they have not given up on. */
export function wantsAmends(world: World, p: Person, q: Person): boolean {
  const r = p.relations[q.id];
  if (!r || !r.grievance) return false;
  if (r.grievance.apologies >= MAX_APOLOGIES) return false;
  if (r.grievance.weight < 6) return false;
  if ((p.cooldowns['sorry' + q.id] ?? 0) > world.tick) return false;
  return true;
}
