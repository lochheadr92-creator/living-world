import { addEvent, addLog } from './events';
import { DAY } from './constants';
import { caseFatality, frailtyOf, illnessRatePerYear, lifeDraw, yearTicks } from './ageing';
import { killPerson } from './lifecycle';
import { circleOf, noteOccasion } from './leisure';
import type { Person, World } from './types';
import { clamp } from './util';

/**
 * Illness. A spell of illness starts with a chance that depends on age, frailty and hardship (rain, storms, hunger and cold make it
 * likelier), lasts one and a half to four days (longer for the old), and runs a course: health dips and recovers, so a serious one shows
 * (the person looks hurt, and neighbours bring food and water through the ordinary caring behaviour). While it lasts they are slow to
 * work or wander and want to rest at home. When it comes to a head they recover or they do not; the chance of dying depends on age,
 * frailty, how severe it was, and whether anyone looked after them. Every step is a hash of the person, the world and the moment, so
 * it uses no random stream.
 */

export const SERIOUS = 0.67; // a spell this severe shows (health under 60) and makes the feed

/** Called once a minute of simulated time for each person (from lifeTick). Returns true if they died. */
export function illnessTick(world: World, p: Person, age: number, step: number): boolean {
  const ill = p.illness;
  const f = frailtyOf(world, p);
  if (!ill) {
    if (world.tick < (p.cooldowns.illFree ?? 0)) return false;
    const stress = 1 + 0.6 * world.weather.rain + 0.4 * world.weather.storm + (p.needs.hunger < 25 ? 0.6 : 0) + (p.needs.warmth < 25 ? 0.6 : 0);
    const per = 1 - Math.exp((-illnessRatePerYear(age, f) * stress * 60) / yearTicks(world));
    if (lifeDraw(world, p, step, 95) >= per) return false;
    const u = lifeDraw(world, p, step, 96);
    const severity = 0.3 + 0.7 * Math.pow(u, 2.2);
    const days = (1.5 + 2.5 * lifeDraw(world, p, step, 98)) * (age >= 62 ? 1.3 : 1);
    p.illness = { since: world.tick, until: world.tick + Math.round(days * DAY), severity, care: 0 };
    addLog(world, p, 'need', severity >= SERIOUS ? 'Fell seriously ill.' : 'Fell ill.');
    if (severity >= SERIOUS) addEvent(world, 'life', `${p.name} has fallen seriously ill.`, [p.id], p.x, p.y);
    p.nextThink = world.tick;
    return false;
  }
  // the course: health dips towards the middle of it and comes back
  const progress = clamp((world.tick - ill.since) / Math.max(1, ill.until - ill.since), 0, 1);
  const ceiling = 100 - ill.severity * 60 * Math.sin(Math.PI * progress);
  if (p.health > ceiling) p.health = ceiling;
  if (world.tick < ill.until) return false;
  // it comes to a head
  const starving = p.needs.hunger < 25 || p.needs.thirst < 25;
  if (lifeDraw(world, p, step, 97) < caseFatality(age, f, ill.severity, ill.care, starving)) {
    p.illness = null;
    killPerson(world, p, age < 12 ? 'a childhood illness' : 'illness');
    return true;
  }
  p.illness = null;
  p.cooldowns.illFree = world.tick + 3 * DAY; // not ill again straight away
  p.health = Math.max(p.health, 50);
  addLog(world, p, 'need', ill.care > 0 ? 'Recovered, having been looked after.' : 'Recovered.');
  if (ill.severity >= SERIOUS) {
    addEvent(world, 'life', `${p.name} has recovered from a serious illness${ill.care > 0 ? ', looked after by others' : ''}.`, [p.id], p.x, p.y);
    noteOccasion(world, 'recovery', p.name, p.id, circleOf(world, [p]));
  }
  p.nextThink = world.tick;
  return false;
}
