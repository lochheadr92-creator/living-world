// Rules 210: being shown (src/sim/shown.ts; wantsChildTime, childTimeProblem, beginChildTime and finishChildTime in childhood.ts). Every
// situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The ordinary-world origin is the child's-day
// probe (about 118 lessons asked a settlement, 28 to 30 percent refused "I cannot teach you more about foraging yet"; children of seven
// to eleven forage as well as adults and fish and farm at half their level) and a lived nine-year-old refused twelve times. Each check
// has the rules-208 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { perceive } from '../src/sim/perception';
import { newRelation } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { CANNOT_TEACH, NO_TEACH_DAYS, SHOWN_PARTS, lessonSkill, olderChildMayShow, setShown } from '../src/sim/shown';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => setShown(true));

type Known = { forage: number; fish: number; farm: number };
/** Talia, a child, beside somebody who is kin to her. Both are fed and rested, and each one's three skills are set by hand. */
function scene(version: number, opts: { pupilAge?: number; teacherAge?: number; pupil?: Partial<Known>; teacher?: Partial<Known>; tag?: string } = {}) {
  const s = stage(`shown-${version}-${opts.pupilAge ?? 8}-${opts.teacherAge ?? 35}-${JSON.stringify(opts.pupil ?? {})}-${JSON.stringify(opts.teacher ?? {})}-${opts.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = DAY;
  const p = addPerson(s, 'Talia', 40, 40, { age: opts.pupilAge ?? 8, traits: { sociability: 0.9, curiosity: 0.9 } });
  const q = addPerson(s, 'Yara', 41.5, 40, { age: opts.teacherAge ?? 35, traits: { sociability: 0.9 } });
  done(s);
  for (const x of [p, q]) x.needs = { hunger: 95, thirst: 95, energy: 95, warmth: 95, safety: 95, social: 90 };
  Object.assign(p.skills, { forage: 0.9, fish: 0.4, farm: 0.4, ...opts.pupil });
  Object.assign(q.skills, { forage: 1.2, fish: 1.0, farm: 1.0, ...opts.teacher });
  const child = (opts.teacherAge ?? 35) < 12;
  p.relations[q.id] = { ...newRelation(), affinity: 60, trust: 40, familiarity: 5, kin: child ? 'sibling' : 'parent' };
  q.relations[p.id] = { ...newRelation(), affinity: 60, trust: 40, familiarity: 5, kin: child ? 'sibling' : 'child' };
  pin(q); perceive(w, p);
  const offer = () => generateOptions(w, p, true, true).options.find((o) => o.key === `socialize:${q.id}:learn_foraging`);
  /** she asks, and the two are stepped until the other has answered */
  const reach = () => { const o = offer(); expect(o, 'the practice is on offer').toBeTruthy(); startActivity(w, p, o!.make!()!); for (let i = 0; i < 200 && !w.conversations[0]?.childhood; i++) stepWorld(w); return w.conversations[0]; };
  const finish = () => { for (let n = 0; n < 300 && p.convId; n++) stepWorld(w); };
  return { w, p, q, offer, reach, finish };
}
// a teacher who forages worse than the pupil but fishes and farms better
const NO_FORAGING = { teacher: { forage: 0.7 } };
// a teacher who knows less than the pupil at everything
const NOTHING = { teacher: { forage: 0.7, fish: 0.3, farm: 0.3 } };

describe('rules 210 is registered', () => {
  it('is registered and supported (the current version may be later), with three parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(210);
    expect(SUPPORTED_RULES_VERSIONS).toContain(210);
    expect(SHOWN_PARTS).toEqual(['remember', 'older', 'more']);
  });
});

describe('the rules themselves', () => {
  it('what a teacher can still show: foraging first; fishing then farming only from 210', () => {
    const old = scene(208).w, now = scene(210).w;
    const pupil = { forage: 0.9, fish: 0.4, farm: 0.4 };
    expect(lessonSkill(old, pupil, { forage: 1.2, fish: 1, farm: 1 })).toBe('forage');
    expect(lessonSkill(now, pupil, { forage: 1.2, fish: 1, farm: 1 })).toBe('forage');
    expect(lessonSkill(old, pupil, { forage: 0.7, fish: 1, farm: 1 })).toBeNull();
    expect(lessonSkill(now, pupil, { forage: 0.7, fish: 1, farm: 1 })).toBe('fish');
    expect(lessonSkill(now, pupil, { forage: 0.7, fish: 0.4, farm: 1 })).toBe('farm');
    expect(lessonSkill(now, pupil, { forage: 0.7, fish: 0.3, farm: 0.3 })).toBeNull();
    setShown(false, 'more');
    expect(lessonSkill(now, pupil, { forage: 0.7, fish: 1, farm: 1 })).toBeNull();
  });

  it('which child may be asked: seven or more and at least a year older, from 210', () => {
    const old = scene(208).w, now = scene(210).w;
    expect(olderChildMayShow(old, 8, 10)).toBe(false);
    expect(olderChildMayShow(now, 8, 10)).toBe(true);
    expect(olderChildMayShow(now, 8, 8.5)).toBe(false);
    expect(olderChildMayShow(now, 4, 6)).toBe(false);
    expect(olderChildMayShow(now, 6, 7)).toBe(true);
    setShown(false, 'older');
    expect(olderChildMayShow(now, 8, 10)).toBe(false);
  });
});

describe('more: a teacher who cannot teach more foraging', () => {
  it('at 208 refuses; at 210 shows her fishing, the practice is paid as before and continues exactly through a save and load', () => {
    const old = scene(208, NO_FORAGING);
    expect(old.reach()?.childhood?.outcome).toBe('declined');
    old.finish();
    expect(old.p.lastInteraction?.outcome).toBe('invitation declined');
    expect(old.p.skills.fish).toBe(0.4);

    const now = scene(210, NO_FORAGING);
    const c = now.reach();
    expect(c?.childhood?.outcome).toBe('sharing');
    expect(c?.childhood?.skill).toBe('fish');
    expect(now.p.activity?.label).toBe('Fishing practice with Yara');
    const copy = deserializeWorld(serializeWorld(now.w));
    expect(serializeWorld(copy)).toBe(serializeWorld(now.w));
    for (let n = 0; n < 300 && now.p.convId; n++) { stepWorld(now.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(now.w));
    expect(now.p.skills.fish).toBe(0.425);
    expect(now.p.skills.forage).toBe(0.9);
    expect(now.p.lastInteraction?.outcome).toContain('completed');
    expect(now.p.lastResult?.detail).toContain('fishing skill improved by 0.025');
    expect(now.p.relations[now.q.id].childhood?.[0].kind).toBe('learn_foraging');
    expect(conservationReport(now.w).ok).toBe(true);
  });

  it('farming is shown when fishing cannot be; with the part off she is refused as at 208', () => {
    const farm = scene(210, { teacher: { forage: 0.7, fish: 0.3 } });
    expect(farm.reach()?.childhood?.skill).toBe('farm');
    farm.finish();
    expect(farm.p.skills.farm).toBe(0.425);
    expect(farm.p.lastResult?.detail).toContain('farming skill improved by 0.025');
    setShown(false, 'more');
    const off = scene(210, { ...NO_FORAGING, tag: 'off' });
    expect(off.reach()?.childhood?.outcome).toBe('declined');
  });

  it('where foraging can still be taught nothing changes: foraging practice, no skill on the session', () => {
    const f = scene(210);
    const c = f.reach();
    expect(c?.childhood?.skill).toBeUndefined();
    expect(f.p.activity?.label).toBe('Foraging practice with Yara');
    f.finish();
    expect(f.p.skills.forage).toBe(0.925);
    expect(f.p.skills.fish).toBe(0.4);
    expect(f.p.lastResult?.detail).toContain('foraging skill improved by 0.025');
  });
});

describe('remember: somebody who has nothing more to show', () => {
  /** she is refused, and then the quarter-day she waits after any refusal is taken to be over */
  const refused = (version: number, tag = '') => {
    const f = scene(version, { ...NOTHING, tag });
    const c = f.reach();
    expect(c?.childhood?.outcome).toBe('declined');
    expect(c?.childhood?.reason).toBe(CANNOT_TEACH);
    f.finish();
    delete f.p.cooldowns['child:learn_foraging'];
    delete f.p.cooldowns['talk' + f.q.id];
    perceive(f.w, f.p);
    return f;
  };
  it('at 208 she asks the same person again; at 210 she does not for three days, and then may', () => {
    const old = refused(208);
    expect(old.p.cooldowns['noteach:' + old.q.id]).toBeUndefined();
    expect(old.offer(), 'asked again at 208').toBeTruthy();
    const now = refused(210);
    const until = now.p.cooldowns['noteach:' + now.q.id];
    expect(until).toBeGreaterThan(now.w.tick + (NO_TEACH_DAYS - 1) * DAY);
    expect(until).toBeLessThanOrEqual(now.w.tick + NO_TEACH_DAYS * DAY);
    expect(now.offer()).toBeUndefined();
    now.w.tick = until;
    perceive(now.w, now.p);
    expect(now.offer(), 'asked again once the three days are over').toBeTruthy();
  });

  it('with the part off nothing is remembered', () => {
    setShown(false, 'remember');
    const f = refused(210, 'off');
    expect(f.p.cooldowns['noteach:' + f.q.id]).toBeUndefined();
    expect(f.offer()).toBeTruthy();
  });
});

describe('older: a child of ten who forages better than her sister of eight', () => {
  it('at 208 he is not somebody to ask; at 210 he is, he gives the practice, and he keeps his own turn at it for the day', () => {
    const old = scene(208, { teacherAge: 10 });
    expect(old.offer()).toBeUndefined();
    const now = scene(210, { teacherAge: 10 });
    const c = now.reach();
    expect(c?.childhood?.outcome).toBe('sharing');
    now.finish();
    expect(now.p.skills.forage).toBe(0.925);
    expect(now.p.cooldowns['child:learn_foraging']).toBeGreaterThan(now.w.tick);
    expect(now.q.cooldowns['child:learn_foraging']).toBeUndefined();
    expect(conservationReport(now.w).ok).toBe(true);
  });

  it('he gives it even on a day he has had his own practice', () => {
    const f = scene(210, { teacherAge: 10, tag: 'had-his' });
    f.q.cooldowns['child:learn_foraging'] = f.w.tick + DAY;
    expect(f.reach()?.childhood?.outcome).toBe('sharing');
  });

  it('whether he knows more is found out by asking: one who knows less refuses in the same words', () => {
    const f = scene(210, { teacherAge: 10, ...NOTHING });
    const c = f.reach();
    expect(c?.childhood?.outcome).toBe('declined');
    expect(c?.childhood?.reason).toBe(CANNOT_TEACH);
  });

  it('not a child less than a year older, not one under seven, and not with the part off', () => {
    expect(scene(210, { teacherAge: 8.5 }).offer()).toBeUndefined();
    expect(scene(210, { pupilAge: 4, teacherAge: 6 }).offer()).toBeUndefined();
    setShown(false, 'older');
    expect(scene(210, { teacherAge: 10, tag: 'off' }).offer()).toBeUndefined();
  });
});
