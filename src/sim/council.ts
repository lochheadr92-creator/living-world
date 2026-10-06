import { DAY } from './constants';
import { addEvent, addLog } from './events';
import { hashUnit } from './rng';
import type { BuildingType, Person, Proposal, World } from './types';
import { clamp } from './util';

/**
 * Deciding together, without anyone in charge.
 *
 * A communal building (a yard, a quarry, a kiln, a smithy, a granary, a bakery, a hall) used to be marked out by whoever had the
 * initiative that afternoon. Now the person who wants one **proposes** it, in conversation. Everyone who hears of it takes a
 * stance from their own circumstances: whether they like and trust the proposer, whether they are hungry or thirsty themselves,
 * what the thing is for (a hall suits the sociable, a granary a household with fields, a smithy the curious), whether they already
 * know of one, and how much work it means. Word spreads from person to person, and nobody who has not heard of it counts. When
 * enough have supported it (and more than opposed) it is **carried**, and a person who supported it may mark the site out; the
 * others who supported it are inclined to help build it. When opposition outweighs support it is **rejected**, and nobody raises
 * the same thing again for a while. A proposal nobody settles lapses. No one decides for anyone else.
 */

export const OPEN_FOR = DAY * 2.5; // how long a proposal can be talked over
export const CARRIED_FOR = DAY * 6; // how long a carried one waits for someone to take it up
export const REJECTED_COOLDOWN = DAY * 2; // before the same thing is proposed again
export const MAX_PROPOSALS = 24;

/** How many supporters carry it: a few, and more as the village grows (never fewer than three; about one in ten). */
export function quorum(world: World): number {
  const pop = world.persons.filter((p) => p.alive).length;
  return Math.max(3, Math.ceil(0.1 * pop));
}

const noun = (type: BuildingType): string => type.replace('_', ' ');

function personOf(world: World, id: number): Person | null {
  const e = world.byId.get(id);
  return e && e.ent === 'person' && e.alive ? e : null;
}

/** The proposal for this kind of building that this person has heard of and that is still being decided or waiting to be taken up. */
export function knownProposal(world: World, p: Person, type: BuildingType): Proposal | null {
  for (const pr of world.proposals) if (pr.type === type && (pr.status === 'open' || pr.status === 'carried') && pr.heard.includes(p.id)) return pr;
  return null;
}

/** A carried proposal this person supported and may act on: they know of it, they agreed to it, and nobody has marked the site out yet. */
export function carriedForMe(world: World, p: Person, type: BuildingType): Proposal | null {
  for (const pr of world.proposals) if (pr.type === type && pr.status === 'carried' && pr.support.includes(p.id)) return pr;
  return null;
}

/** Someone supported a carried proposal for a building of this kind: they are inclined to help raise it. */
export function pledgedTo(world: World, p: Person, type: string | undefined): boolean {
  if (!type) return false;
  return world.proposals.some((pr) => pr.type === type && (pr.status === 'carried' || pr.status === 'done') && pr.support.includes(p.id) && world.tick - pr.settled < DAY * 12);
}

/** Has the village turned this one down lately? (They would have to know: this is read from the proposals a person has heard.) */
export function turnedDownLately(world: World, p: Person, type: BuildingType): boolean {
  return world.proposals.some((pr) => pr.type === type && pr.status === 'rejected' && pr.heard.includes(p.id) && world.tick - pr.settled < REJECTED_COOLDOWN);
}

export function propose(world: World, proposer: Person, type: BuildingType, why: string): Proposal {
  const have = knownProposal(world, proposer, type);
  if (have) return have;
  const pr: Proposal = { id: world.nextId++, type, proposer: proposer.id, why, created: world.tick, status: 'open', until: world.tick + OPEN_FOR, support: [proposer.id], oppose: [], heard: [proposer.id], settled: 0 };
  world.proposals.unshift(pr);
  if (world.proposals.length > MAX_PROPOSALS) world.proposals.length = MAX_PROPOSALS;
  addLog(world, proposer, 'work', `Thought we ought to build a ${noun(type)}: ${why}.`);
  return pr;
}

/** What this person makes of a proposal, from their own point of view. */
export function stanceOn(world: World, p: Person, pr: Proposal): 'for' | 'against' | 'unsure' {
  const rel = p.relations[pr.proposer];
  let s = 0.46 + 0.2 * clamp((rel?.affinity ?? 0) / 100, -1, 1) + 0.12 * clamp(((rel?.trust ?? 10) - 10) / 90, -1, 1);
  if (p.needs.hunger < 35 || p.needs.thirst < 35) s -= 0.25; // food and water first
  s += 0.15 * (p.traits.diligence - 0.5); // it means work
  const hasPlots = world.plots.some((pl) => pl.hhId === p.hhId);
  switch (pr.type) {
    case 'hall':
      s += 0.3 * (p.traits.sociability - 0.4);
      break;
    case 'granary':
    case 'bakery':
      s += hasPlots ? 0.25 : -0.05;
      break;
    case 'smithy':
    case 'kiln':
      s += 0.25 * (p.traits.curiosity - 0.4) + 0.1;
      break;
    case 'timber_yard':
      s += 0.14; // planks are what homes are built from
      break;
    case 'quarry':
      s += 0.14; // stone is what everything else is built from
      break;
    default:
      break;
  }
  // they already know of one: no need for another
  for (const k in p.beliefs) {
    const b = p.beliefs[k as unknown as number];
    if (b.kind === 'building' && b.btype === pr.type) {
      s -= 0.6;
      break;
    }
  }
  s += (hashUnit(p.id, pr.id, 5) - 0.5) * 0.12; // a steady, personal lean either way
  return s >= 0.52 ? 'for' : s <= 0.36 ? 'against' : 'unsure';
}

/** `L` hears of it (from `from`, or from the proposer in person) and takes a stance. Returns it, or null if they already knew. */
export function hear(world: World, L: Person, pr: Proposal, from: Person): 'for' | 'against' | 'unsure' | null {
  if (pr.status !== 'open' && pr.status !== 'carried') return null;
  if (pr.heard.includes(L.id)) return null;
  pr.heard.push(L.id);
  const stance = stanceOn(world, L, pr);
  if (stance === 'for') pr.support.push(L.id); // even after it has carried, someone who is for it is inclined to help
  else if (stance === 'against' && pr.status === 'open') pr.oppose.push(L.id);
  const what = noun(pr.type);
  addLog(
    world,
    L,
    'social',
    `${from.name} ${from.id === pr.proposer ? 'proposed' : 'told me about the idea of'} a ${what}${stance === 'for' ? ': I think it is a good idea' : stance === 'against' ? ': I do not think we need it' : ': I am not sure'}.`,
  );
  evaluate(world, pr);
  return stance;
}

/** Has it carried, or been turned down? */
export function evaluate(world: World, pr: Proposal): void {
  if (pr.status !== 'open') return;
  const q = quorum(world);
  const proposer = personOf(world, pr.proposer);
  if (pr.support.length >= q && pr.support.length > pr.oppose.length) {
    pr.status = 'carried';
    pr.settled = world.tick;
    pr.until = world.tick + CARRIED_FOR;
    // anyone talking over the same thing separately is folded in: they heard of it, and those who were for it are inclined to help
    for (const other of world.proposals) {
      if (other === pr || other.type !== pr.type || other.status !== 'open') continue;
      for (const id of other.heard) if (!pr.heard.includes(id)) pr.heard.push(id);
      for (const id of other.support) if (!pr.support.includes(id)) pr.support.push(id);
      other.status = 'merged';
      other.settled = world.tick;
    }
    addEvent(world, 'build', `The village agreed to raise a ${noun(pr.type)} (${pr.support.length} for, ${pr.oppose.length} against).`, pr.support.slice(0, 3), proposer?.x ?? world.camp.x, proposer?.y ?? world.camp.y);
    for (const id of pr.support) {
      const p = personOf(world, id);
      if (p) {
        addLog(world, p, 'social', `It was agreed that we should build a ${noun(pr.type)}.`);
        p.nextThink = world.tick;
      }
    }
    world.stats.motionsCarried = (world.stats.motionsCarried ?? 0) + 1;
  } else if (pr.oppose.length >= 3 && pr.oppose.length >= pr.support.length + 2) {
    pr.status = 'rejected';
    pr.settled = world.tick;
    if (proposer) addLog(world, proposer, 'social', `The others did not want a ${noun(pr.type)}.`);
    addEvent(world, 'social', `The idea of a ${noun(pr.type)} was turned down (${pr.oppose.length} against, ${pr.support.length} for).`, pr.oppose.slice(0, 3), proposer?.x ?? world.camp.x, proposer?.y ?? world.camp.y);
    world.stats.motionsRejected = (world.stats.motionsRejected ?? 0) + 1;
  }
}

/** Called now and then: proposals nobody settled, and carried ones nobody took up, lapse. */
export function lapseProposals(world: World): void {
  for (const pr of world.proposals) {
    if ((pr.status === 'open' || pr.status === 'carried') && world.tick > pr.until) {
      pr.status = 'lapsed';
      pr.settled = world.tick;
      world.stats.motionsLapsed = (world.stats.motionsLapsed ?? 0) + 1;
    }
  }
}

/** The site for it has been marked out: the decision has been acted on. */
export function completeProposal(world: World, type: string, by: Person): void {
  for (const pr of world.proposals) {
    if (pr.type === type && pr.status === 'carried') {
      pr.status = 'done';
      pr.settled = world.tick;
      addLog(world, by, 'work', `Marked out the ${noun(pr.type)} the village had agreed on.`);
    }
  }
}

/**
 * Two people who have heard of different proposals for the same building compare notes: the younger proposal is folded into the
 * older one (everyone who supported or opposed it counts there, and everyone who heard of it has now heard of the older one).
 */
export function mergeProposals(world: World, S: Person, L: Person): void {
  for (const a of world.proposals) {
    if ((a.status !== 'open' && a.status !== 'carried') || !a.heard.includes(S.id)) continue;
    for (const b of world.proposals) {
      if (b === a || b.type !== a.type || (b.status !== 'open' && b.status !== 'carried') || !b.heard.includes(L.id) || a.heard.includes(L.id)) continue;
      const [keep, fold] = a.created <= b.created ? [a, b] : [b, a];
      for (const id of fold.heard) if (!keep.heard.includes(id)) keep.heard.push(id);
      if (keep.status === 'open') {
        for (const id of fold.support) if (!keep.support.includes(id) && !keep.oppose.includes(id)) keep.support.push(id);
        for (const id of fold.oppose) if (!keep.oppose.includes(id) && !keep.support.includes(id)) keep.oppose.push(id);
      } else {
        // the older one is already carried: those who supported the other are inclined to help too
        for (const id of fold.support) if (!keep.support.includes(id)) keep.support.push(id);
      }
      fold.status = 'merged';
      fold.settled = world.tick;
      evaluate(world, keep);
      return;
    }
  }
}

/** Word of a proposal passes on, one at a time, to someone who has not heard of it, from someone who has. */
export function shareMotion(world: World, S: Person, L: Person): void {
  mergeProposals(world, S, L);
  mergeProposals(world, L, S);
  for (const pr of world.proposals) {
    if (pr.status !== 'open') continue;
    if (!pr.heard.includes(S.id) || pr.heard.includes(L.id)) continue;
    if (world.tick - pr.created > OPEN_FOR) continue;
    hear(world, L, pr, S);
    return;
  }
}
