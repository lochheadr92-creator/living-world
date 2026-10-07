// The cascade tracer: how often does one thing lead to another?
//
// It watches a running world from outside (it reads state, it never writes it, and what it records is not saved or hashed) and collects
// "happenings": the world's own events, plus a few things a person goes through (going critically hungry or thirsty, being hurt,
// opening a grievance). Two happenings are LINKED when the later one involves a person who was in the earlier one within a day, the later
// one linking to that person's most recent earlier happening. A connected set of linked happenings is a CASCADE.
//
// What this does and does not show. A link means "the same person, soon after", not "because": it finds chains that could be causal and
// cannot prove it. What it can show reliably is the opposite: if almost nothing links to anything of a different kind, or no happening
// changes what a person goes on to do (the `lifts`), the systems are not coupled, however many of them there are.
import { CRITICAL, DAY } from '../../src/sim/constants';
import type { Activity, Person, World } from '../../src/sim/types';
import { stepWorld } from '../../src/sim/world';

export interface Happening {
  tick: number;
  system: string;
  label: string;
  ids: number[];
  text: string;
}

export interface Cascade {
  nodes: Happening[];
  people: number;
  systems: string[];
  depth: number;
}

export interface CascadeReport {
  days: number;
  people: number;
  happenings: number;
  perSystem: Record<string, number>;
  links: number;
  crossSystemLinks: number;
  /** kind→kind link counts, "a>b" */
  transitions: Record<string, number>;
  sizes: Record<string, number>;
  /** cascades with at least 3 happenings, 2 systems and 2 people */
  storyLike: number;
  longestDepth: number;
  /** for each kind of happening: how much likelier a given activity is in the 2 hours after it than at any time (only lifts ≥ 1.5, ≥ 8 cases) */
  lifts: Record<string, { activity: string; lift: number; n: number }[]>;
  stories: Cascade[];
  /** rich dynamics only: how people were doing across the run */
  mood?: { mean: number; lowest: number; shareBelowMinus25: number; thoughtsStarted: Record<string, number>; leanSeasons: number };
}

const WINDOW = DAY; // a happening links to a person's previous happening only within a day
const POLL = 20;
const AFTER = 100; // ticks after a happening in which what the person starts doing is looked at

interface Live {
  hungry: boolean;
  thirsty: boolean;
  hurt: boolean;
  sore: Set<number>;
}

/** Step `world` for `days` days, watching. The world ends exactly where it would have without the watching. */
export function trace(world: World, days: number, onTick?: (w: World) => void): CascadeReport {
  const nodes: Happening[] = [];
  const live = new Map<number, Live>();
  const starts: { tick: number; id: number; kind: string }[] = [];
  const prevHook = world.hooks?.onActivityStart;
  world.hooks = { ...(world.hooks ?? {}), onActivityStart: (p: Person, a: Activity) => (prevHook?.(p, a), starts.push({ tick: world.tick, id: p.id, kind: a.kind })) };
  let seenEvent = world.events.length ? world.events[world.events.length - 1].id : -1;
  const end = world.tick + days * DAY;
  const start = world.tick;

  const moodAcc = { sum: 0, n: 0, min: 0, low: 0, seen: new Set<string>(), kinds: {} as Record<string, number> };
  const poll = () => {
    for (const e of world.events) {
      if (e.id <= seenEvent) continue;
      seenEvent = e.id;
      nodes.push({ tick: e.tick, system: e.kind, label: e.kind, ids: e.ids.slice(), text: e.text });
    }
    for (const p of world.persons) {
      if (!p.alive) continue;
      if (p.mood) {
        moodAcc.sum += p.mood.level;
        moodAcc.n++;
        moodAcc.min = Math.min(moodAcc.min, p.mood.level);
        if (p.mood.level < -25) moodAcc.low++;
        for (const t of p.mood.thoughts) {
          const key = `${p.id}|${t.kind}|${t.since}`;
          if (moodAcc.seen.has(key)) continue;
          moodAcc.seen.add(key);
          const base = t.kind.split(':')[0];
          moodAcc.kinds[base] = (moodAcc.kinds[base] ?? 0) + 1;
        }
      }
      let s = live.get(p.id);
      if (!s) live.set(p.id, (s = { hungry: p.needs.hunger < CRITICAL.hunger, thirsty: p.needs.thirst < CRITICAL.thirst, hurt: p.health < 60, sore: new Set() }));
      const flag = (now: boolean, was: boolean, label: string, system: string, text: string) => {
        if (now && !was) nodes.push({ tick: world.tick, system, label, ids: [p.id], text });
      };
      const hungry = p.needs.hunger < CRITICAL.hunger;
      const thirsty = p.needs.thirst < CRITICAL.thirst;
      const hurt = p.health < 60;
      flag(hungry, s.hungry, 'hungry', 'need', `${p.name} is dangerously hungry`);
      flag(thirsty, s.thirsty, 'thirsty', 'need', `${p.name} is dangerously thirsty`);
      flag(hurt, s.hurt, 'hurt', 'health', `${p.name} is hurt (health ${Math.round(p.health)})`);
      s.hungry = hungry;
      s.thirsty = thirsty;
      s.hurt = hurt;
      for (const k in p.relations) {
        const g = p.relations[k as unknown as number].grievance;
        const id = Number(k);
        if (g && !s.sore.has(id)) {
          s.sore.add(id);
          nodes.push({ tick: world.tick, system: 'grievance', label: 'sore', ids: [p.id, id], text: `${p.name} is sore with ${world.byId.get(id) ? (world.byId.get(id) as Person).name : '#' + id}: ${g.detail}` });
        } else if (!g && s.sore.has(id)) s.sore.delete(id);
      }
    }
  };
  while (world.tick < end) {
    onTick?.(world);
    stepWorld(world);
    if ((world.tick - start) % POLL === 0) poll();
  }
  poll();
  if (world.hooks) world.hooks.onActivityStart = prevHook;

  nodes.sort((a, b) => a.tick - b.tick);
  // link each happening to the previous happening of each person in it
  const parent: number[][] = nodes.map(() => []);
  const lastOf = new Map<number, number>();
  const transitions: Record<string, number> = {};
  let links = 0;
  let cross = 0;
  nodes.forEach((n, i) => {
    for (const id of n.ids) {
      const j = lastOf.get(id);
      if (j !== undefined && n.tick - nodes[j].tick <= WINDOW && !parent[i].includes(j)) {
        parent[i].push(j);
        links++;
        if (nodes[j].system !== n.system) cross++;
        const key = `${nodes[j].label}>${n.label}`;
        transitions[key] = (transitions[key] ?? 0) + 1;
      }
      lastOf.set(id, i);
    }
  });
  // cascades = connected components (union-find), depth = longest chain
  const uf = nodes.map((_, i) => i);
  const find = (x: number): number => (uf[x] === x ? x : (uf[x] = find(uf[x])));
  parent.forEach((ps, i) => ps.forEach((j) => (uf[find(i)] = find(j))));
  const depth = nodes.map(() => 1);
  parent.forEach((ps, i) => ps.forEach((j) => (depth[i] = Math.max(depth[i], depth[j] + 1))));
  const comps = new Map<number, number[]>();
  nodes.forEach((_, i) => {
    const r = find(i);
    if (!comps.has(r)) comps.set(r, []);
    comps.get(r)!.push(i);
  });
  const cascades: Cascade[] = [...comps.values()].map((idx) => ({
    nodes: idx.map((i) => nodes[i]),
    people: new Set(idx.flatMap((i) => nodes[i].ids)).size,
    systems: [...new Set(idx.map((i) => nodes[i].system))],
    depth: Math.max(...idx.map((i) => depth[i])),
  }));
  const sizes: Record<string, number> = { '1': 0, '2': 0, '3-4': 0, '5-9': 0, '10+': 0 };
  for (const c of cascades) {
    const n = c.nodes.length;
    sizes[n === 1 ? '1' : n === 2 ? '2' : n <= 4 ? '3-4' : n <= 9 ? '5-9' : '10+']++;
  }
  const storyLike = cascades.filter((c) => c.nodes.length >= 3 && c.systems.length >= 2 && c.people >= 2);
  const score = (c: Cascade) => c.systems.length * 3 + c.people + c.depth * 2;
  const stories = storyLike.sort((a, b) => score(b) - score(a)).slice(0, 3);

  // does a happening change what the person goes on to do?
  const byPerson = new Map<number, { tick: number; kind: string }[]>();
  for (const s of starts) {
    if (!byPerson.has(s.id)) byPerson.set(s.id, []);
    byPerson.get(s.id)!.push(s);
  }
  const base: Record<string, number> = {};
  for (const s of starts) base[s.kind] = (base[s.kind] ?? 0) + 1;
  const total = starts.length || 1;
  const lifts: CascadeReport['lifts'] = {};
  const seenLabels = new Set(nodes.map((n) => n.label));
  for (const label of seenLabels) {
    const counts: Record<string, number> = {};
    let n = 0;
    for (const h of nodes) {
      if (h.label !== label) continue;
      for (const id of h.ids.slice(0, 1)) {
        for (const s of byPerson.get(id) ?? []) {
          if (s.tick > h.tick && s.tick <= h.tick + AFTER) {
            counts[s.kind] = (counts[s.kind] ?? 0) + 1;
            n++;
          }
        }
      }
    }
    if (!n) continue;
    const rows = Object.entries(counts)
      .map(([activity, c]) => ({ activity, lift: Math.round((c / n / (base[activity] / total)) * 10) / 10, n: c }))
      .filter((r) => r.n >= 8 && r.lift >= 1.5)
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 4);
    if (rows.length) lifts[label] = rows;
  }

  const perSystem: Record<string, number> = {};
  for (const n of nodes) perSystem[n.system] = (perSystem[n.system] ?? 0) + 1;
  return {
    days: (world.tick - start) / DAY,
    people: world.persons.filter((p) => p.alive).length,
    happenings: nodes.length,
    perSystem,
    links,
    crossSystemLinks: cross,
    transitions,
    sizes,
    storyLike: storyLike.length,
    longestDepth: Math.max(0, ...depth),
    lifts,
    stories,
    mood: moodAcc.n
      ? {
          mean: Math.round((moodAcc.sum / moodAcc.n) * 10) / 10,
          lowest: moodAcc.min,
          shareBelowMinus25: Math.round((1000 * moodAcc.low) / moodAcc.n) / 10,
          thoughtsStarted: moodAcc.kinds,
          leanSeasons: nodes.filter((n) => n.text.startsWith('A lean season begins')).length,
        }
      : undefined,
  };
}

const hhmm = (tick: number) => `day ${Math.floor(tick / DAY)} ${String(Math.floor(((tick % DAY) / DAY) * 24)).padStart(2, '0')}h`;
export function tellStory(c: Cascade): string {
  return c.nodes.map((n) => `    ${hhmm(n.tick)}  [${n.system}] ${n.text}`).join('\n');
}
