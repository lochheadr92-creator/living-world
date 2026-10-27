// Friend groups and informal crews (rich worlds only). People who like each other and keep ending up together start to count as
// a group: a crew has a name (the first member's), its members, when it formed and when it was last together. It changes what
// its members lean toward, a little: work where a crew-mate is working, the company of a crew-mate, a gathering a crew-mate is
// at. It drifts apart as these things do: a member whose liking for most of the crew has gone, who holds a grievance against
// one of them, or who has moved to another settlement, leaves; a crew of one is no crew. Nobody is assigned to a crew and
// nobody is held to one.
//
// An authored world never creates `world.crews`.
import { DAY } from './constants';
import { addEvent, addLog } from './events';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { Option } from './optutil';
import { nearestHub } from './settlements';
import type { Crew, Person, World } from './types';
import { hyp } from './util';

/** how often crews are looked at */
const CREW_EVERY = DAY / 4;
/** liking each other this much counts as friends; this few left and it is no crew */
const FRIENDS_AT = 30;
const CREW_MIN = 3;
const CREW_MAX = 6;
/** the pull of a crew on an option that puts a member beside their crew */
export const CREW_NUDGE = 4;

export const crewsOf = (world: World): Crew[] => world.crews ?? [];
export function crewOf(world: World, p: Person): Crew | null {
  for (const c of crewsOf(world)) if (c.members.includes(p.id)) return c;
  return null;
}
export const crewMates = (world: World, p: Person, q: Person): boolean => {
  const c = crewOf(world, p);
  return !!c && c.members.includes(q.id);
};

const likes = (p: Person, q: Person): boolean => (p.relations[q.id]?.affinity ?? 0) >= FRIENDS_AT && !p.relations[q.id]?.grievance;
const mutual = (p: Person, q: Person): boolean => likes(p, q) && likes(q, p);

function names(world: World, ids: number[]): string {
  return ids.map((id) => (world.byId.get(id) as Person | undefined)?.name ?? '?').join(', ');
}

/** Every CREW_EVERY ticks: crews form among mutual friends, take in a friend of most of them, and drift apart. */
export function crewsTick(world: World): void {
  if (!isRich(world) || world.tick % CREW_EVERY !== 17) return;
  const list = (world.crews ??= []);
  const alive = world.persons.filter((p) => p.alive && p.children !== undefined);
  const byId = new Map(alive.map((p) => [p.id, p]));
  // drifting apart
  for (const c of list) {
    for (const id of c.members.slice()) {
      const p = byId.get(id);
      const others = c.members.filter((x) => x !== id).map((x) => byId.get(x)).filter((x): x is Person => !!x);
      let why = '';
      if (!p) why = 'is gone';
      else if (others.some((q) => p.relations[q.id]?.grievance)) why = 'fell out with one of them';
      else if (others.length && others.filter((q) => likes(p, q)).length < others.length / 2) why = 'drifted away';
      else if (others.length && others.every((q) => hyp(nearestHub(world, p.x, p.y).x - nearestHub(world, q.x, q.y).x, nearestHub(world, p.x, p.y).y - nearestHub(world, q.x, q.y).y) > 1)) why = 'moved away';
      if (!why) continue;
      c.members = c.members.filter((x) => x !== id);
      if (p) {
        addEvent(world, 'social', `${p.name} has ${why === 'is gone' ? 'left' : why} from ${c.name}.`, [p.id], p.x, p.y);
        addLog(world, p, 'social', `${why === 'drifted away' ? 'Drifted away from' : why === 'moved away' ? 'Moved away from' : 'Left'} ${c.name}.`);
      }
    }
  }
  for (const c of list.slice()) {
    if (c.members.length < 2) {
      list.splice(list.indexOf(c), 1);
      addEvent(world, 'social', `${c.name[0].toUpperCase()}${c.name.slice(1)} is no more.`, c.members);
    }
  }
  // joining and forming
  for (const p of alive) {
    if (crewOf(world, p)) continue;
    // a friend of most of an existing crew joins it
    let joined = false;
    for (const c of list) {
      if (c.members.length >= CREW_MAX) continue;
      const members = c.members.map((x) => byId.get(x)).filter((x): x is Person => !!x);
      if (runsRulesVersion(world, 35) && members.some((q) => p.relations[q.id]?.grievance)) continue; // a grievance against one of them keeps them out, as departure says
      const friends = members.filter((q) => mutual(p, q)).length;
      if (friends >= Math.ceil(members.length / 2) && friends >= 2) {
        c.members.push(p.id);
        c.together = world.tick;
        addEvent(world, 'social', `${p.name} has fallen in with ${c.name}.`, [p.id, ...c.members.slice(0, 2)], p.x, p.y);
        addLog(world, p, 'social', `Fell in with ${c.name}: ${names(world, c.members.filter((x) => x !== p.id))}.`);
        joined = true;
        break;
      }
    }
    if (joined) continue;
    // two mutual friends who also like each other, and nobody's crew yet: a new one
    const friends = alive.filter((q) => q !== p && !crewOf(world, q) && mutual(p, q));
    if (friends.length < CREW_MIN - 1) continue;
    const core: Person[] = [];
    for (const q of friends) {
      if (core.every((r) => mutual(q, r))) core.push(q);
      if (core.length >= CREW_MAX - 1) break;
    }
    if (core.length < CREW_MIN - 1) continue;
    const c: Crew = { id: world.nextId++, name: `${p.name}'s crew`, members: [p.id, ...core.map((q) => q.id)], since: world.tick, together: world.tick };
    list.push(c);
    addEvent(world, 'social', `${names(world, c.members)} have become a crew: ${c.name}.`, c.members, p.x, p.y);
    for (const id of c.members) {
      const m = byId.get(id);
      if (m) addLog(world, m, 'social', `We are a crew now: ${names(world, c.members.filter((x) => x !== id))}.`);
    }
  }
}

/** the crew's pull on an option: beside a crew-mate at work, in their company, or at a gathering they are at (0 in an authored world) */
export function crewNudge(world: World, p: Person, o: Option): number {
  const c = crewOf(world, p);
  if (!c) return 0;
  if (o.kind === 'socialize' && c.members.includes(o.targetId)) return CREW_NUDGE;
  if (o.kind === 'build' || o.kind === 'operate' || o.kind === 'gather' || o.kind === 'attend' || o.kind === 'hunt') {
    for (const id of c.members) {
      if (id === p.id) continue;
      const q = world.byId.get(id);
      if (!q || q.ent !== 'person' || !q.alive || !q.activity) continue;
      if (q.activity.targetId === o.targetId && q.activity.kind === o.kind) return CREW_NUDGE;
    }
  }
  return 0;
}

/** for the inspector */
export function describeCrew(world: World, p: Person): string | null {
  const c = crewOf(world, p);
  if (!c) return null;
  return `one of ${c.name} with ${names(world, c.members.filter((x) => x !== p.id))}`;
}
