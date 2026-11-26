// Rules 261 (the social scenes stream, bundle B, part 5 of `docs/SOCIAL_SCENES_PLAN.md`): the naming day. The feast a birth already calls
// becomes the child's naming feast: the parents say the name before those who are there when it opens, and sometimes the child bears the
// name of somebody who has died.
//
// What stood before: a birth called a generic "feast" for the baby and the mother (occasions.ts noteBirth); the baby's name was a random
// unused one drawn at birth (people.ts pickName), and the mother, who is in the feast's `about`, never went to it (attendOptions skips
// whoever it is about). Nobody said the name, and nobody was ever named after anybody.
//
// One part, `naming` (switched in hearth_scenes.ts, with `birth`, birth_help.ts, and `vigil`, vigil.ts). From rules 261:
//
//   the name      At birth (lifecycle.ts giveBirth) the usual name is still drawn from the shared stream first, so that the stream is exactly what
//                 it was. Then, if a parent has a dead parent, partner, sibling or close friend (in that order, the mother's before the father's),
//                 whose death that parent knows (rules 158: they were told or saw), whose name suits the child's sex, and which NO LIVING PERSON
//                 BEARS (checked against everybody alive), the child takes that name instead and records the dead person
//                 (`Person.namedAfter`). The name drawn first goes back to the pool of names nobody has borne. A name with a numeral ("Cora II",
//                 which the world gives when the plain names have run out) is taken whole, numeral and all, if nobody alive has it: the rule is
//                 about the exact name, and nothing is added or taken away.
//   the feast     A birth calls the feast it always called, and with the part on it is a naming feast (`Occasion.naming`: the newborns whose naming
//                 it is, at most four), so its lines in the feed say "naming feast". The mother may go to it (she is in its `about`, which kept
//                 her away), and counts as the one it is most for.
//   the naming    When the feast opens (occasions.ts, at the tick it begins) a parent of one of those newborns who has come for it and is there,
//                 with at least one other (not a child) who has come for it and is there, says the name before them: a speech, one line in
//                 the feed, and the child is named aloud (`Occasion.named`). Everybody who comes to the feast afterwards, and those who were there,
//                 comes to know the child (familiarity). If no parent is there, or nobody else, nothing is said and nothing is written; the
//                 feast goes on as any feast, and "nobody came" is still the line of an empty one.
//
// Nothing here reads anybody's true state: a parent names a dead person they hold a relation with and know to be dead, and "there" is the
// physical place. No draw is made (the name is chosen, not drawn). Saved: Person.namedAfter, Occasion.naming and Occasion.named, both in the
// fingerprint and checked on loading. Rich worlds at rules 261 and later only; rules 260 and earlier, authored worlds and a part switched off keep
// the old behaviour.
import { DAY } from './constants';
import { hasLocalDeath, knowsDeath } from './death_knowledge';
import { addEvent, addLog, say } from './events';
import { HEARTH_FROM, hasNaming } from './hearth_scenes';
import { deceasedById } from './historical_index';
import { presentAt } from './market_contact';
import { think } from './mood';
import { FEMALE_NAMES, MALE_NAMES, stageOf } from './people';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import type { Occasion, Person, World } from './types';

/** at least this many others (not children) must have come and be there when it opens, for the name to be said before them */
export const NAMING_LISTENERS_MIN = 1;
/** the most newborns one feast is the naming of */
export const NAMING_MAX = 4;
/** what hearing a child named does: those who came grow to know the child, and the parents are glad */
export const NAMING_FAMILIARITY = 3;
export const NAMING_AFFINITY = 1.5;
export const NAMING_GLAD = 6;
export const NAMING_GLAD_FOR = DAY;

export const namingOf = (o: Occasion): number[] => o.naming ?? [];
/** the feast a birth called, with the part on, is a naming feast */
export const isNamingFeast = (o: Occasion): boolean => o.kind === 'feast' && namingOf(o).length > 0;

/** a name is one of the world's plain women's or men's names, with or without the numeral it was given when the plain ones had run out */
export function nameSex(name: string): 'f' | 'm' | null {
  const base = name.split(' ')[0];
  if (FEMALE_NAMES.includes(base)) return 'f';
  if (MALE_NAMES.includes(base)) return 'm';
  return null;
}

export interface Namesake { id: number; name: string; kind: 'parent' | 'partner' | 'sibling' | 'friend'; by: Person }

/** how fond somebody must have been of a friend, on their own record, for the child to be named after them */
export const FRIEND_AFFINITY = 60;

/** who, of those a parent has lost, the child could be named after: in the order parent, partner, sibling, friend; the mother's before the father's */
export function namesakeFor(world: World, baby: Person, mother: Person, father: Person | null): Namesake | null {
  const bearers = new Set<string>();
  for (const q of world.persons) if (q.alive) bearers.add(q.name);
  for (const kind of ['parent', 'partner', 'sibling', 'friend'] as const) {
    for (const by of [mother, father]) {
      if (!by) continue;
      const ids = Object.keys(by.relations).map(Number).sort((a, b) => a - b);
      for (const id of ids) {
        const r = by.relations[id];
        if (world.byId.has(id)) continue; // still alive
        const hit = kind === 'friend' ? !r.kin && r.affinity >= FRIEND_AFFINITY : r.kin === kind;
        if (!hit) continue;
        const dead = deceasedById(world, id);
        if (!dead || (hasLocalDeath(world) && !knowsDeath(by, id))) continue;
        if (nameSex(dead.name) !== baby.sex || bearers.has(dead.name)) continue;
        return { id, name: dead.name, kind, by };
      }
    }
  }
  return null;
}

/**
 * The child has been created with the name the shared stream gave it (lifecycle.ts giveBirth). If a parent has lost somebody whose name nobody alive
 * bears, the child takes it; the name drawn goes back among those nobody has borne. Returns the dead person's name, or null.
 */
export function nameAfterTheDead(world: World, baby: Person, mother: Person, father: Person | null): string | null {
  if (!hasNaming(world)) return null;
  const ns = namesakeFor(world, baby, mother, father);
  if (!ns) return null;
  world.usedNames.delete(baby.name); // nobody has borne it: it was only drawn
  world.usedNames.add(ns.name);
  baby.name = ns.name;
  baby.namedAfter = ns.id;
  return ns.name;
}

/** how the one the child is named after was somebody's, by the first of these parents who held them: { by, role } as "M's mother", "M's late partner", "M's sister", "M's friend" */
function afterWhom(world: World, baby: Person, parents: Person[]): { by: Person; role: string } | null {
  const id = baby.namedAfter;
  if (id === undefined) return null;
  const dead = deceasedById(world, id);
  const sex = dead ? nameSex(dead.name) : null;
  for (const by of parents) {
    const r = by.relations[id];
    if (!r) continue;
    if (r.kin === 'parent') return { by, role: sex === 'f' ? 'mother' : sex === 'm' ? 'father' : 'parent' };
    if (r.kin === 'partner') return { by, role: 'late partner' };
    if (r.kin === 'sibling') return { by, role: sex === 'f' ? 'sister' : sex === 'm' ? 'brother' : 'sibling' };
    return { by, role: 'friend' };
  }
  return null;
}

// ───────────────────────── the feast ─────────────────────────
/** The mother of a newborn whose naming this feast is: she is in the feast's `about`, and goes to it all the same. */
export function isNamingMother(world: World, o: Occasion, p: Person): boolean {
  if (!hasNaming(world) || !isNamingFeast(o) || p.sex !== 'f') return false;
  return namingOf(o).some((id) => p.children.includes(id));
}

/** who has come for this feast and is in the place: their attend activity is for this occasion and they are within reach of it */
function comeAndThere(world: World, o: Occasion): Person[] {
  const out: Person[] = [];
  for (const q of world.persons) {
    // somebody stopped to talk on the way in still has the feast in hand (their activity is held while they talk)
    const a = q.activity?.kind === 'attend' ? q.activity : q.suspended?.kind === 'attend' ? q.suspended : null;
    if (!q.alive || !a || a.data.occasion !== o.id || !presentAt(world, q, o)) continue;
    out.push(q);
  }
  return out;
}

/**
 * The feast has just opened (occasions.ts occasionsTick): each newborn it is the naming of is named aloud if a parent is there with enough others.
 * Written once for each child that is, and never otherwise.
 */
export function nameAtOpening(world: World, o: Occasion): void {
  if (!hasNaming(world) || !isNamingFeast(o)) return;
  const there = comeAndThere(world, o);
  for (const babyId of namingOf(o)) {
    const baby = world.byId.get(babyId);
    if (!baby || baby.ent !== 'person' || !baby.alive || (o.named ?? []).includes(babyId)) continue;
    const parents = there.filter((q) => baby.parents.includes(q.id));
    const others = there.filter((q) => !baby.parents.includes(q.id) && stageOf(world, q) !== 'child');
    if (!parents.length || others.length < NAMING_LISTENERS_MIN) continue;
    (o.named ??= []).push(babyId);
    const speaker = parents.find((q) => q.sex === 'f') ?? parents[0];
    const child = baby.sex === 'f' ? 'daughter' : 'son';
    const who = parents.length > 1 ? `${parents[0].name} and ${parents[1].name} named their ${child}` : `${speaker.name} named ${speaker.sex === 'f' ? 'her' : 'his'} ${child}`;
    // the parents there come first in saying whose name it is, then the child's other parent if they are alive
    const holders = [...parents, ...baby.parents.map((id) => world.byId.get(id)).filter((x): x is Person => !!x && x.ent === 'person' && x.alive && !parents.includes(x))];
    const link = afterWhom(world, baby, holders);
    const after = link ? `${link.by.name}'s ${link.role}` : '';
    say(world, speaker, link ? `This is ${baby.name}, named for ${link.by === speaker ? 'my' : `${link.by.name}'s`} ${link.role}.` : `This is ${baby.name}.`, 'happy', 150);
    addEvent(world, 'social', `${who} ${baby.name} before ${others.length} ${others.length === 1 ? 'person' : 'people'}${after ? `, after ${after}` : ''}.`, [baby.id, ...parents.map((q) => q.id), ...others.map((q) => q.id)], o.x, o.y);
    for (const q of parents) {
      think(world, q, 'named_child', NAMING_GLAD, NAMING_GLAD_FOR, `named ${baby.name} before ${others.length} ${others.length === 1 ? 'person' : 'people'}`);
      addLog(world, q, 'social', `Named ${baby.name} before ${others.length} ${others.length === 1 ? 'person' : 'people'}.`);
    }
    for (const q of others) addLog(world, q, 'social', `Heard ${baby.name} named${after ? `, after ${after}` : ''}.`);
  }
}

/** Somebody has arrived at a naming feast (occasions.ts arrive): if a child has been named aloud, they come to know it. */
export function meetNamed(world: World, p: Person, o: Occasion): void {
  if (!hasNaming(world) || !o.named?.length) return;
  for (const babyId of o.named) {
    const baby = world.byId.get(babyId);
    if (!baby || baby.ent !== 'person' || !baby.alive || baby.id === p.id || baby.parents.includes(p.id)) continue;
    adjustRel(p, baby.id, world.tick, { fam: NAMING_FAMILIARITY, aff: NAMING_AFFINITY, note: `heard ${baby.name} named at the feast` });
  }
}

// ───────────────────────── what the card says ─────────────────────────
/** Rows for the card (history.ts): whom the child was named after, said as it is. */
export function namingRows(world: World, p: Person): string[] {
  if (p.namedAfter === undefined) return [];
  const dead = deceasedById(world, p.namedAfter);
  return [`Named at birth after ${dead ? dead.name : `person #${p.namedAfter}`}, who had died.`];
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 261, rich only); anything else is refused on loading. */
export function validateNaming(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, HEARTH_FROM);
  const ids = (list: unknown): boolean => Array.isArray(list) && list.length >= 1 && list.length <= NAMING_MAX && list.every((n) => Number.isSafeInteger(n) && n > 0) && new Set(list).size === list.length;
  for (const p of w.persons) if (p.namedAfter !== undefined && (!allowed || !Number.isSafeInteger(p.namedAfter) || p.namedAfter <= 0 || !deceasedById(w, p.namedAfter))) throw new Error('Invalid namesake');
  for (const o of w.occasions ?? []) {
    if (o.naming !== undefined && (!allowed || o.kind !== 'feast' || !ids(o.naming))) throw new Error('Invalid naming feast');
    if (o.named !== undefined && (!allowed || !ids(o.named) || !o.naming || !o.named.every((n) => o.naming!.includes(n)))) throw new Error('Invalid naming record');
  }
}
