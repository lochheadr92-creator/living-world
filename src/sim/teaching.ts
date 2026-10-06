import { DAY, SKILL_MAX, SOURCE_SKILL } from './constants';
import { addEvent, addLog } from './events';
import { adjustRel, trustOf } from './relations';
import type { Activity, Person, SkillKey, World } from './types';
import { clamp } from './util';
import { stageOf } from './people';

/**
 * Teaching. Skills grow with practice, and they also pass from person to person in two ways: **instruction** (someone who is good at
 * something offers to show someone who is not, in a conversation) and **watching** (working next to someone better at the same job
 * slowly rubs off). Either way the learner never ends up better than the teacher, nobody is taught by someone who is not clearly better,
 * and each lesson is on the learner's record (who showed them, what, how much it helped). Children learn fastest. The teacher barely
 * changes. Nothing is created or consumed.
 */

export const SKILL_KEYS: SkillKey[] = ['forage', 'fish', 'wood', 'stone', 'build', 'farm', 'craft', 'carpentry', 'kiln', 'smith', 'bake'];
/** how the skill reads in "let me show you how to ..." */
export const SKILL_WORD: Record<SkillKey, string> = {
  forage: 'find food in the wild',
  fish: 'fish',
  wood: 'fell a tree',
  stone: 'work stone',
  build: 'build',
  farm: 'work the fields',
  craft: 'make things',
  carpentry: 'saw planks',
  kiln: 'fire the kiln',
  smith: 'forge iron',
  bake: 'bake',
};
export const MIN_TEACHER_SKILL = 1.0; // you have to be good at it to show others
export const MIN_GAP = 0.2; // and clearly better than they are
/** a person gives at most one lesson, and takes at most one, in this long */
export const LESSON_SPACING = DAY / 2;
const MAX_LEARNED = 8;

/** The best thing `T` could show `L` right now: the biggest gap in T's favour, among what T is good at and has not just taught them. */
export function lessonFor(world: World, T: Person, L: Person): { skill: SkillKey; gap: number } | null {
  if ((T.cooldowns.teachAny ?? 0) > world.tick || (L.cooldowns.learnAny ?? 0) > world.tick) return null;
  let best: { skill: SkillKey; gap: number } | null = null;
  for (const k of SKILL_KEYS) {
    if (T.skills[k] < MIN_TEACHER_SKILL) continue;
    const gap = T.skills[k] - L.skills[k];
    if (gap < MIN_GAP) continue;
    if ((T.cooldowns['teach' + L.id + ':' + k] ?? 0) > world.tick) continue;
    if (stageOf(world, L) !== 'child' && stageOf(world, L) !== 'youth' && gap < 0.3) continue; // grown people are shown only what they clearly lack
    if (!best || gap > best.gap) best = { skill: k, gap };
  }
  return best;
}

function remember(L: Person, skill: SkillKey, from: number, tick: number, gain: number, how: 'shown' | 'watched'): void {
  L.learned.push({ skill, from, tick, gain, how });
  if (L.learned.length > MAX_LEARNED) L.learned.shift();
}

/** The lesson happens. Returns how much the learner gained. */
export function giveLesson(world: World, T: Person, L: Person, skill: SkillKey): number {
  const gap = T.skills[skill] - L.skills[skill];
  if (gap < MIN_GAP) return 0;
  const st = stageOf(world, L);
  const rate = st === 'child' ? 0.12 : st === 'youth' ? 0.1 : 0.06;
  const bond = 0.7 + 0.3 * clamp(trustOf(L, T.id) / 60, 0, 1);
  let gain = clamp(gap * rate * bond, 0.006, 0.04);
  gain = Math.min(gain, Math.max(0, T.skills[skill] - 0.05 - L.skills[skill])); // never better than the teacher
  gain = Math.min(gain, SKILL_MAX - L.skills[skill]);
  if (gain <= 0) return 0;
  L.skills[skill] += gain;
  T.skills[skill] = Math.min(SKILL_MAX, T.skills[skill] + 0.002); // explaining it to someone sharpens it a little
  T.cooldowns['teach' + L.id + ':' + skill] = world.tick + DAY;
  T.cooldowns.teachAny = world.tick + LESSON_SPACING;
  L.cooldowns.learnAny = world.tick + LESSON_SPACING;
  world.stats.lessonGain = (world.stats.lessonGain ?? 0) + gain;
  remember(L, skill, T.id, world.tick, gain, 'shown');
  adjustRel(L, T.id, world.tick, { aff: 1.5, trust: 1, fam: 0.5, note: `${T.name} showed me how to ${SKILL_WORD[skill]}` });
  adjustRel(T, L.id, world.tick, { aff: 1, fam: 0.5, note: `I showed ${L.name} how to ${SKILL_WORD[skill]}` });
  addLog(world, T, 'work', `Showed ${L.name} how to ${SKILL_WORD[skill]}.`);
  addLog(world, L, 'work', `${T.name} showed me how to ${SKILL_WORD[skill]}.`);
  world.stats.lessons = (world.stats.lessons ?? 0) + 1;
  if (stageOf(world, L) === 'child' && world.tick - (world.stats.lastLessonEvt ?? -9999) > 450) {
    world.stats.lastLessonEvt = world.tick;
    addEvent(world, 'work', `${T.name} showed ${L.name} how to ${SKILL_WORD[skill]}.`, [T.id, L.id], L.x, L.y);
  }
  return gain;
}

/** Which skill an activity practises, for learning by watching. */
export function skillOfActivity(world: World, a: Activity): SkillKey | null {
  switch (a.kind) {
    case 'build':
    case 'repair':
      return 'build';
    case 'craft':
      return 'craft';
    case 'till':
    case 'plant':
    case 'tend':
    case 'harvest':
      return 'farm';
    case 'gather': {
      const s = world.byId.get(a.targetId);
      return s && s.ent === 'source' ? SOURCE_SKILL[s.type] : null;
    }
    default:
      return null;
  }
}

/** `p` is working next to `q`, who is doing the same job: if `q` is clearly better at it, a little of it rubs off. */
export function watchAndLearn(world: World, p: Person, q: Person): void {
  const a = p.activity;
  const b = q.activity;
  if (!a || !b) return;
  const k = skillOfActivity(world, a);
  if (!k || skillOfActivity(world, b) !== k) return;
  const gap = q.skills[k] - p.skills[k];
  if (gap < 0.12 || q.skills[k] < MIN_TEACHER_SKILL) return;
  const st = stageOf(world, p);
  const rate = st === 'child' ? 0.012 : st === 'youth' ? 0.01 : 0.006;
  const bond = 0.6 + 0.4 * clamp(trustOf(p, q.id) / 60, 0, 1);
  const gain = Math.min(0.003, gap * rate * bond, Math.max(0, q.skills[k] - 0.05 - p.skills[k]));
  if (gain <= 0) return;
  p.skills[k] += gain;
  world.stats.watchGain = (world.stats.watchGain ?? 0) + gain;
  const key = 'watch' + q.id + ':' + k;
  const acc = (p.cooldowns[key] ?? 0) + gain;
  if (acc >= 0.04) {
    p.cooldowns[key] = 0;
    remember(p, k, q.id, world.tick, acc, 'watched');
    addLog(world, p, 'work', `Picking up ${q.name}'s way of working: I am getting better at it.`);
  } else p.cooldowns[key] = acc;
}
