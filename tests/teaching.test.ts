// Teaching: skills pass from person to person by instruction and by watching. Staged scenes check a rule; the last tests are the village.
import { describe, expect, it } from 'vitest';
import { newActivity } from '../src/sim/activities';
import { DAY, SKILL_MAX } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { stageOf, ageYears } from '../src/sim/people';
import { relOf } from '../src/sim/relations';
import { LESSON_SPACING, MIN_GAP, giveLesson, lessonFor, skillOfActivity, watchAndLearn } from '../src/sim/teaching';
import { TICKS_PER_YEAR } from '../src/sim/constants';
import { hashWorld } from '../src/sim/world';
import type { Person, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

function stage() {
  const w = natural('teach-stage');
  const people = w.persons.filter((p) => p.alive && stageOf(w, p) === 'adult').slice(0, 3);
  const [teacher, adultL, other] = people;
  const kid = w.persons.find((p) => p.alive && stageOf(w, p) === 'child')!;
  for (const p of [teacher, adultL, other, kid]) {
    for (const k of Object.keys(p.skills) as (keyof typeof p.skills)[]) p.skills[k] = 0.9;
    p.cooldowns = {};
    p.learned = [];
  }
  teacher.skills.carpentry = 1.5;
  teacher.skills.build = 1.3;
  return { w, teacher, adultL, other, kid };
}

describe('who can teach what', () => {
  it('only what the teacher is good at, and only where they are clearly better; grown people are shown only what they clearly lack', () => {
    const { w, teacher, adultL, kid } = stage();
    // to a child: the biggest gap wins
    expect(lessonFor(w, teacher, kid)).toMatchObject({ skill: 'carpentry' });
    // to a grown person: a gap of 0.3 or more only
    adultL.skills.carpentry = 1.3; // gap 0.2 in carpentry
    adultL.skills.build = 1.1; // gap 0.2 in build
    expect(lessonFor(w, teacher, adultL)).toBeNull();
    adultL.skills.carpentry = 1.15; // gap 0.35
    expect(lessonFor(w, teacher, adultL)).toMatchObject({ skill: 'carpentry' });
    // nothing to show someone who is as good
    kid.skills.carpentry = 1.45;
    kid.skills.build = 1.25;
    expect(lessonFor(w, teacher, kid)).toBeNull();
    // and nothing a teacher is not good at themselves
    teacher.skills.carpentry = 0.95;
    kid.skills.carpentry = 0.5;
    expect(lessonFor(w, teacher, kid)).toBeNull();
    expect(MIN_GAP).toBeGreaterThan(0);
  });

  it('a person gives and takes at most one lesson in half a day, and the same skill to the same learner once a day', () => {
    const { w, teacher, kid, other } = stage();
    kid.skills.carpentry = 0.7;
    kid.skills.build = 0.7;
    expect(giveLesson(w, teacher, kid, 'carpentry')).toBeGreaterThan(0);
    expect(lessonFor(w, teacher, kid)).toBeNull(); // spacing
    expect(lessonFor(w, teacher, other)).toBeNull(); // the teacher has just taught
    w.tick += LESSON_SPACING + 1;
    expect(lessonFor(w, teacher, kid)).toMatchObject({ skill: 'build' }); // carpentry waits a day
    w.tick += DAY;
    expect(lessonFor(w, teacher, kid)).toMatchObject({ skill: 'carpentry' });
  });
});

describe('a lesson', () => {
  it('raises the learner a little (children most), never above the teacher, barely changes the teacher, and is on the record', () => {
    const { w, teacher, adultL, kid } = stage();
    kid.skills.carpentry = 0.7;
    adultL.skills.carpentry = 0.7;
    const t0 = teacher.skills.carpentry;
    const gKid = giveLesson(w, teacher, kid, 'carpentry');
    w.tick += LESSON_SPACING + 1;
    teacher.cooldowns = {};
    adultL.cooldowns = {};
    const gAdult = giveLesson(w, teacher, adultL, 'carpentry');
    expect(gKid).toBeGreaterThan(gAdult);
    expect(gKid).toBeLessThanOrEqual(0.04);
    expect(gAdult).toBeGreaterThanOrEqual(0.006);
    expect(kid.skills.carpentry).toBeCloseTo(0.7 + gKid, 9);
    expect(teacher.skills.carpentry).toBeCloseTo(t0 + 0.004, 9); // two lessons, +0.002 each
    expect(kid.learned).toHaveLength(1);
    expect(kid.learned[0]).toMatchObject({ skill: 'carpentry', from: teacher.id, how: 'shown' });
    expect(kid.log.some((l) => new RegExp(`${teacher.name} showed me how to saw planks`).test(l.text))).toBe(true);
    expect(teacher.log.some((l) => new RegExp(`Showed ${kid.name} how to saw planks`).test(l.text))).toBe(true);
    expect(relOf(kid, teacher.id).history.some((h) => /showed me how/.test(h.text))).toBe(true);
    expect(w.stats.lessons).toBe(2);
  });

  it('can never make the learner better than the teacher, however many lessons, and stops when there is nothing left to show', () => {
    const { w, teacher, kid } = stage();
    kid.skills.carpentry = 0.6;
    let lessons = 0;
    for (let i = 0; i < 200; i++) {
      w.tick += DAY + LESSON_SPACING;
      teacher.cooldowns = {};
      kid.cooldowns = {};
      if (lessonFor(w, teacher, kid)?.skill !== 'carpentry') break;
      if (giveLesson(w, teacher, kid, 'carpentry') > 0) lessons++;
      expect(kid.skills.carpentry).toBeLessThanOrEqual(teacher.skills.carpentry - 0.05 + 1e-9);
    }
    expect(lessons).toBeGreaterThan(3);
    expect(lessons).toBeLessThan(120);
    expect(kid.skills.carpentry).toBeGreaterThan(1.1);
    expect(kid.skills.carpentry).toBeLessThanOrEqual(SKILL_MAX);
    // the record is bounded
    expect(kid.learned.length).toBeLessThanOrEqual(8);
  });
});

describe('learning by watching', () => {
  const work = (w: World, p: Person, kind: 'build' | 'craft') => {
    p.activity = newActivity(w, p, { kind, label: 'x', goal: 'x' });
  };
  it('someone building next to a better builder picks up a little of it; not from someone worse, and not when they are doing something else', () => {
    const { w, teacher, kid, adultL } = stage();
    work(w, teacher, 'build');
    work(w, kid, 'build');
    expect(skillOfActivity(w, kid.activity!)).toBe('build');
    const before = kid.skills.build;
    for (let i = 0; i < 20; i++) watchAndLearn(w, kid, teacher);
    expect(kid.skills.build).toBeGreaterThan(before);
    expect(kid.skills.build).toBeLessThan(before + 0.07); // a trickle
    expect(kid.learned.some((l) => l.how === 'watched' && l.from === teacher.id)).toBe(true);
    expect(kid.log.some((l) => /Picking up .* way of working/.test(l.text))).toBe(true);
    // a better builder learns nothing from a worse one
    const t = teacher.skills.build;
    work(w, adultL, 'build');
    adultL.skills.build = 0.9;
    for (let i = 0; i < 20; i++) watchAndLearn(w, teacher, adultL);
    expect(teacher.skills.build).toBe(t);
    // doing a different job: nothing
    work(w, adultL, 'craft');
    const b2 = kid.skills.build;
    watchAndLearn(w, kid, adultL);
    expect(kid.skills.build).toBe(b2);
    // the learner never passes the teacher
    teacher.skills.build = 1.0;
    kid.skills.build = 0.9;
    for (let i = 0; i < 400; i++) watchAndLearn(w, kid, teacher);
    expect(kid.skills.build).toBeLessThanOrEqual(0.95 + 1e-9);
  });
});

describe('in a village', () => {
  it('an elder with a skill and a child who lacks it: the elder shows them, it shows up in what the child can do, and it is traceable', () => {
    const { w, teacher, kid } = stage();
    // make the teacher an elder in the child's household, with a skill the child lacks, and a calm midday
    teacher.birthTick = w.tick - Math.round(70 * TICKS_PER_YEAR);
    teacher.hhId = kid.hhId;
    relOf(teacher, kid.id).kin = 'child';
    relOf(kid, teacher.id).kin = 'parent';
    relOf(teacher, kid.id).affinity = 70;
    relOf(kid, teacher.id).affinity = 70;
    teacher.skills.carpentry = 1.6;
    kid.skills.carpentry = 0.7;
    kid.x = teacher.x + 1;
    kid.y = teacher.y + 1;
    w.tick = Math.floor(w.tick / DAY) * DAY + Math.floor(DAY * 0.4);
    const before = kid.skills.carpentry;
    for (let chunk = 0; chunk < 24 && kid.skills.carpentry === before; chunk++) {
      run(w, 100, () => {
        for (const p of [teacher, kid]) for (const n of ['hunger', 'thirst', 'energy', 'warmth', 'safety'] as const) p.needs[n] = Math.max(p.needs[n], 92);
      });
    }
    expect(kid.skills.carpentry).toBeGreaterThan(before);
    expect(kid.learned.some((l) => l.from === teacher.id && l.skill === 'carpentry' && l.how === 'shown')).toBe(true);
    expect(w.stats.lessons).toBeGreaterThanOrEqual(1);
    expect(ageYears(w, teacher)).toBeGreaterThan(62);
  });

  it('over days of play lessons happen, every record traces to a real person, nobody exceeds the maximum, the books balance, and it is deterministic', () => {
    const go = () => {
      const w = natural('teach-village');
      run(w, 2400 * 6);
      return w;
    };
    const a = go();
    expect(conservationReport(a).ok).toBe(true);
    const everyone = new Set<number>([...a.persons.map((p) => p.id), ...a.deceased.map((d) => d.id)]);
    let records = 0;
    for (const p of a.persons) {
      for (const k of Object.keys(p.skills) as (keyof typeof p.skills)[]) expect(p.skills[k], `${p.name} ${k}`).toBeLessThanOrEqual(SKILL_MAX + 1e-9);
      for (const l of p.learned) {
        records++;
        expect(everyone.has(l.from), `${p.name} learned from someone who never existed`).toBe(true);
        expect(l.from).not.toBe(p.id);
        expect(l.gain).toBeGreaterThan(0);
      }
    }
    console.log(`[teaching] 6 days: ${a.stats.lessons ?? 0} lessons, ${records} learned records held, skill moved by lessons ${(a.stats.lessonGain ?? 0).toFixed(2)} and by watching ${(a.stats.watchGain ?? 0).toFixed(2)}`);
    expect(a.stats.lessons ?? 0).toBeGreaterThan(0);
    expect(hashWorld(go())).toBe(hashWorld(a));
  }, 400_000);
});
