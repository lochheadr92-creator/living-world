// Theft, favours and barter (rich worlds only).
//
// * THEFT. Someone very hungry, with nothing in the pack and nothing at home, may take food from another household's store.
//   The option is weighed like any other (hunger against conscience: caution and generosity count against it), and what follows
//   depends on who saw: a witness remembers it and tells it (reputation.ts), the household wronged holds a grievance, and a
//   theft nobody saw is a theft nobody knows of, bar the thief's own log.
// * FAVOURS. A gift leaves a debt (Relation.debt, kept since the first version and never read until now): whoever owes one is
//   readier to grant a request, and whoever is owed one is readier to ask.
// * BARTER. At the market (occasions.ts) whoever came with a surplus of one thing and short of another swaps with whoever
//   has the opposite, each judging by their own valuation; every unit moves by the ordinary transfer that records it.
//
// An authored world has no option to steal, no market, and reads no debt: its fingerprints are untouched.
import { addEvent, addLog } from './events';
import { openGrievance } from './grievance';
import { householdById, membersOf } from './households';
import { isRich, think } from './mood';
import { adjustRel } from './relations';
import { noteDeed } from './reputation';
import type { Building, Person, World } from './types';
import { hyp } from './util';

/** how far away a theft is still seen */
const SEEN_FROM = 8;

/** Food was taken from another household's store. Who saw it decides what it costs. */
export function onTheft(world: World, thief: Person, b: Building, units: number): void {
  if (!isRich(world) || units <= 0) return;
  const hh = householdById(world, b.hhId);
  const hhName = hh ? `${hh.name} household` : 'another household';
  const owners = membersOf(world, hh).filter((m) => m.alive && m.id !== thief.id);
  const story = `${thief.name} took food from the ${hhName}'s store`;
  let caughtBy: Person | null = null;
  let seen = 0;
  for (const w of world.persons) {
    if (!w.alive || w === thief || w.pose === 'sleep') continue;
    if (hyp(w.x - b.x - b.w / 2, w.y - b.y - b.h / 2) > SEEN_FROM) continue;
    seen++;
    noteDeed(world, w, thief, 'thief', story);
    const owner = owners.includes(w);
    adjustRel(w, thief.id, world.tick, { aff: owner ? -12 : -5, trust: owner ? -18 : -8, note: owner ? `caught ${thief.name} at our store` : `saw ${thief.name} steal` });
    if (owner) {
      openGrievance(world, w, thief, 'harm', `${thief.name} took food from our store`, 45);
      if (!caughtBy) caughtBy = w;
    }
  }
  thief.stats.received += units;
  if (caughtBy) {
    addEvent(world, 'conflict', `${caughtBy.name} caught ${thief.name} taking food from the ${hhName}'s store.`, [thief.id, caughtBy.id], b.x + b.w / 2, b.y + b.h / 2);
    addLog(world, thief, 'social', `Took ${units} food from the ${hhName}'s store; ${caughtBy.name} caught me at it.`);
    addLog(world, caughtBy, 'social', `Caught ${thief.name} taking food from our store.`);
    think(world, thief, 'caught', -10, 2400, 'was caught stealing');
  } else if (seen) {
    addEvent(world, 'conflict', `${thief.name} was seen taking food from the ${hhName}'s store.`, [thief.id], b.x + b.w / 2, b.y + b.h / 2);
    addLog(world, thief, 'social', `Took ${units} food from the ${hhName}'s store; someone saw.`);
  } else {
    addLog(world, thief, 'social', `Took ${units} food from the ${hhName}'s store. Nobody saw.`);
  }
  // conscience: the generous mind it more
  think(world, thief, 'stole', -3 - 5 * thief.traits.generosity, 2400, 'took what was not mine');
}

/** the favour an asker can lean on: how much `p` is owed by `q` (0 in an authored world) */
export function favourOwedBy(world: World, p: Person, q: Person): number {
  if (!isRich(world)) return 0;
  return Math.max(0, p.relations[q.id]?.debt ?? 0);
}
