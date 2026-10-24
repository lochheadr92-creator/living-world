import { hasLocalDeath, learnDeath, withinHearing } from './death_knowledge';
import { runsRulesVersion } from './rulesversion';
// Reputation and news that travel by word of mouth (rich worlds only). What a person knows of someone they have not dealt with
// themselves comes from what they saw and what they were told: a gift witnessed, a quarrel, a promise kept or broken, a death, a
// birth. Each story is kept by the hearer with who told it, who saw it first, how many mouths it passed through and when it
// happened; it spreads one story at a time in conversation (the news phase), fades with age, and is read wherever someone decides
// whether to help, trust or keep company with a person they have only heard of. Nothing here is village-wide fact: two neighbours
// can hold opposite opinions of the same person for as long as nobody tells one what the other knows.
//
// An authored world never creates `p.heard`, so its saves and fingerprints are untouched.
import { DAY } from './constants';
import { addLog } from './events';
import { isRich, think } from './mood';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import { pickStory } from './traditions';
import type { DeathNotice, Person, Rumour, RumourKind, World } from './types';

// Lab-only ablation of the single-counting repair, not a product mode.
let singleCount = true;
export const singleCountOn = () => singleCount;
export function setSingleCount(on: boolean): void { singleCount = on; }
const singleCountFor = (world: World) => singleCount && isRich(world) && runsRulesVersion(world, 13);

/** the most stories one person keeps; the oldest go first */
export const HEARD_MAX = 30;
/** a story older than this is no longer passed on, and no longer counts */
export const RUMOUR_LIFE = 12 * DAY;
/** a story is not passed on after this many retellings */
export const RUMOUR_HOPS = 3;

/** how a kind of story moves an opinion: above 0 to someone's credit */
const WEIGHT: Record<RumourKind, number> = { generous: 1, reliable: 0.7, quarrelsome: -0.8, unreliable: -0.7, thief: -1.2, news: 0 };

const fade = (world: World, r: Rumour): number => Math.max(0, 1 - (world.tick - r.tick) / RUMOUR_LIFE);

/** What this person has seen or been told, about anyone (empty in an authored world) */
export const heardBy = (p: Person): Rumour[] => p.heard ?? [];

/** Something `p` saw with their own eyes, about `about`: kept as a first-hand story. Rich only. */
export function noteDeed(world: World, p: Person, about: Pick<Person, 'id'>, kind: RumourKind, text: string, relationshipApplied = false, death?: DeathNotice): void {
  if (!isRich(world) || p === about || !p.alive) return;
  keep(world, p, { about: about.id, kind, tick: world.tick, from: 0, origin: p.id, hops: 0, weight: 1, text, ...(death ? { death } : {}), ...(singleCountFor(world) && relationshipApplied ? { relationshipApplied: true } : {}) });
}

function sameStory(a:Rumour,b:Rumour):boolean {
 return a.death || b.death ? !!a.death && a.death.id===b.death?.id : a.about===b.about && a.kind===b.kind && Math.abs(a.tick-b.tick)<DAY/2;
}
function keep(world: World, p: Person, r: Rumour): boolean {
  const list = (p.heard ??= []);
  // the same story told twice is one story (the fresher telling kept); the same kind of deed a day apart is another story
  const same = list.find((x) => sameStory(x,r));
  if (same) {
    if (r.hops < same.hops) Object.assign(same, r);
    if (singleCountFor(world) && r.relationshipApplied) same.relationshipApplied = true;
    return false;
  }
  list.push(r);
  while (list.length > HEARD_MAX) list.shift();
  return true;
}

/** Everyone awake within `radius` of (x, y) saw it (rich only). */
export function noteDeedNear(world: World, about: Person, kind: RumourKind, text: string, x: number, y: number, radius = 8, except: number[] = []): void {
  if (!isRich(world)) return;
  for (const w of world.persons) {
    if (!w.alive || w === about || w.pose === 'sleep' || except.includes(w.id)) continue;
    const dx = w.x - x;
    const dy = w.y - y;
    if (dx * dx + dy * dy > radius * radius) continue;
    noteDeed(world, w, about, kind, text);
  }
}

/**
 * The speaker passes one story to the listener, if they have one worth telling: about someone who is not the listener, not too
 * old, not retold too often, and not one the listener already holds. The listener weighs it by how far they trust the speaker,
 * and their opinion of the person it is about moves a little. Returns true if something was passed on.
 */
export function shareRumour(world: World, S: Person, L: Person): boolean {
  if (!isRich(world)) return false;
  if (hasLocalDeath(world) && (!S.alive || !L.alive || L.pose==='sleep' || !withinHearing(S,L))) return false;
  const theirs = L.heard ?? [];
  // now and then a story the settlement remembers, told before any fresh news (traditions.ts pickStory)
  if (hashUnit(S.id, L.id, world.tick >> 4) < 0.1) {
    const story = pickStory(world, S.id, L.id);
    if (story && !theirs.some((x) => x.kind === 'news' && x.tick === story.tick && x.about === story.about)) {
      const r: Rumour = { about: story.about, kind: 'news', tick: story.tick, from: S.id, origin: S.id, hops: 1, weight: 0.5, text: story.text };
      if (keep(world, L, r)) {
        addLog(world, L, 'info', `${S.name} told me a story: ${story.text}.`);
        return true;
      }
    }
  }
  const mine = S.heard;
  if (!mine || !mine.length) return false;
  let best: Rumour | null = null;
  let bs = -1e9;
  for (const r of mine) {
    if (r.about === L.id || r.origin === L.id || r.hops >= RUMOUR_HOPS) continue;
    const f = fade(world, r);
    if (f <= 0) continue;
    if (theirs.some((x) => sameStory(x,r))) continue;
    // fresher and weightier stories first, about people the listener knows; a little chance decides between equals
    const known = L.relations[r.about] ? 1 : 0;
    const score = f * (1 + Math.abs(WEIGHT[r.kind]) + 0.4 * known) * r.weight + hashUnit(S.id, L.id, r.tick) * 0.3;
    if (score > bs) {
      bs = score;
      best = r;
    }
  }
  if (!best) return false;
  const trust = L.relations[S.id]?.trust ?? 10;
  const weight = Math.round(best.weight * Math.max(0.35, Math.min(1, 0.55 + trust / 100)) * 100) / 100;
  const copy: Rumour = { ...best, from: S.id, hops: best.hops + 1, weight };
  if (singleCountFor(world)) delete copy.relationshipApplied; // the listener did not experience the original relation change
  if (!keep(world, L, copy)) return false;
  const about = world.byId.get(best.about);
  const name = about && about.ent === 'person' ? about.name : world.deceased.find((d) => d.id === best.about)?.name ?? 'someone';
  addLog(world, L, 'info', `${S.name} told me ${best.text}.`);
  const w = WEIGHT[best.kind] * weight;
  if (w && !singleCountFor(world)) adjustRel(L, best.about, world.tick, { aff: 1.2 * w, trust: 1.6 * w, note: `${S.name} said ${best.text}` });
  else if (best.kind === 'news' && about && about.ent === 'person') adjustRel(L, best.about, world.tick, { fam: 0.3 });
  // news of a death is felt by those who liked the dead and were not there to see it; the rest file it
  if (hasLocalDeath(world) && best.death) {
    learnDeath(world,L,best.death,'told',S.id);
    S.speech={text:`${best.death.name} has died.`,until:world.tick+90,kind:'say'};
    L.speech=null; // clear unrelated small talk while hearing this news
  }
  if (!hasLocalDeath(world) && best.kind === 'news' && best.text.includes('died') && (L.relations[best.about]?.affinity ?? 0) > 25 && !(L.mood?.thoughts ?? []).some((t) => t.kind === 'lost:' + best.about)) {
    think(world, L, 'lost:' + best.about, -6, DAY * 2, `heard that ${name} has died`);
  }
  return true;
}

/**
 * What `p` makes of `aboutId` from stories alone, -1 (ill repute) to 1 (good name); 0 when they have heard nothing. First-hand
 * stories count in full, hearsay by how far the teller was trusted, and all of it fades over RUMOUR_LIFE.
 */
export function reputationOf(world: World, p: Person, aboutId: number): number {
  const list = p.heard;
  if (!list) return 0;
  let s = 0;
  for (const r of list) {
    if (r.about !== aboutId || (singleCountFor(world) && r.relationshipApplied)) continue;
    s += WEIGHT[r.kind] * r.weight * fade(world, r);
  }
  return Math.max(-1, Math.min(1, s / 2));
}

/** for the inspector: the stories this person holds, freshest first */
export function describeHeard(world: World, p: Person): { about: number; name: string; text: string; via: string; age: number; good: number }[] {
  return heardBy(p)
    .filter((r) => fade(world, r) > 0)
    .slice()
    .sort((a, b) => b.tick - a.tick)
    .map((r) => {
      const a = world.byId.get(r.about);
      const name = a && a.ent === 'person' ? a.name : world.deceased.find((d) => d.id === r.about)?.name ?? 'someone';
      const teller = r.from ? world.byId.get(r.from) : null;
      const via = r.from === 0 ? 'saw it' : `${teller && teller.ent === 'person' ? teller.name : 'someone'} told me${r.hops > 1 ? ` (${r.hops} mouths on)` : ''}`;
      return { about: r.about, name, text: r.text, via, age: Math.floor((world.tick - r.tick) / DAY), good: WEIGHT[r.kind] * r.weight };
    });
}
