// Rules 214: feeding the children who no longer feed themselves (src/sim/child_feeding.ts; the care option and the provider pull in
// options_work.ts, the hand-overs in social.ts and welfare.ts). Every situation here is STAGED: it checks a rule, it is not an example
// of spontaneous behaviour. The ordinary-world origin is the rules-213 lab (the settlement hungrier, the children most of all). Each
// check has the rules-213 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { CHILD_FEEDING_PARTS, MEAL_DUE, MEAL_GAP, PROVIDE_PER_CHILD, mealDue, providePull, setChildFeeding } from '../src/sim/child_feeding';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { perceive } from '../src/sim/perception';
import { newRelation } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => setChildFeeding(true));

/** Ada, thirty, with berries in her pack, beside her son Pip, five, who is fed enough to look well. */
function family(version: number, o: { pipAge?: number; pipHunger?: number; tag?: string } = {}) {
  const s = stage(`child-feeding-${version}-${o.pipAge ?? 5}-${o.pipHunger ?? 80}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 900;
  const ada = addPerson(s, 'Ada', 40, 30, { age: 30, inv: { berries: 4 } });
  const pip = addPerson(s, 'Pip', 42, 30, { age: o.pipAge ?? 5, hh: ada.hhId });
  done(s);
  ada.needs = { hunger: 90, thirst: 90, energy: 90, warmth: 90, safety: 95, social: 80 };
  pip.needs = { hunger: o.pipHunger ?? 80, thirst: 90, energy: 90, warmth: 90, safety: 95, social: 80 };
  ada.relations[pip.id] = { ...newRelation(), affinity: 70, trust: 60, familiarity: 20, kin: 'child' };
  pip.relations[ada.id] = { ...newRelation(), affinity: 70, trust: 60, familiarity: 20, kin: 'parent' };
  // he is two steps away and is not pinned: pin() blocks anybody from giving to him
  // staged: he has had his time with her today, so he does not draw her into talk mid hand-over
  for (const k of ['child:family_time', 'child:play_together', 'child:learn_foraging']) pip.cooldowns[k] = 1e9;
  ada.needs.social = 100;
  pip.needs.social = 100;
  // staged: he sits resting where he is, so he does not walk off or start talk of his own
  startActivity(w, pip, newActivity(w, pip, { kind: 'rest', label: 'Sit for a while', goal: 'rest', minCommit: 5000, duration: 5000, maxTicks: 6000 }));
  perceive(w, ada);
  const care = () => generateOptions(w, ada, true, true).options.find((x) => x.kind === 'give' && x.targetId === pip.id);
  return { w, ada, pip, care };
}

describe('rules 214 is registered', () => {
  it('is registered and supported (the current version may be later), with two parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(214);
    expect(SUPPORTED_RULES_VERSIONS).toContain(214);
    expect(CHILD_FEEDING_PARTS).toEqual(['meals', 'provide']);
  });
});

describe('meals: a carer keeps a child on a meal rhythm', () => {
  it('at 213 a five-year-old who looks well is not brought food; at 214 he is due a meal, and once fed is not due again until the gap has passed', () => {
    expect(family(213).care()).toBeUndefined();
    const f = family(214);
    expect(mealDue(f.w, f.ada, f.pip)).toBe(true);
    const o = f.care();
    expect(o, 'a meal is brought').toBeTruthy();
    expect(o!.label).toContain('Pip');
    startActivity(f.w, f.ada, o!.make!()!);
    for (let i = 0; i < 300 && f.ada.activity?.kind === 'give'; i++) stepWorld(f.w);
    expect(f.pip.inv.berries ?? 0).toBeGreaterThan(0);
    expect(f.ada.cooldowns['fedby:' + f.pip.id]).toBeGreaterThan(900);
    expect(mealDue(f.w, f.ada, f.pip)).toBe(false);
    // the meal is eaten (staged: the berries go into him), and later a meal is due again
    f.pip.inv.berries = 0;
    f.pip.needs.hunger = 80;
    const fedAt = f.ada.cooldowns['fedby:' + f.pip.id];
    f.w.tick = fedAt + MEAL_GAP;
    expect(mealDue(f.w, f.ada, f.pip)).toBe(true);
  });

  it('a youth is not on the rhythm; the switch keeps the old way; and a child who looks hungrier than due is read as he looks', () => {
    const youth = family(214, { pipAge: 13, tag: 'youth' });
    expect(mealDue(youth.w, youth.ada, youth.pip)).toBe(false);
    setChildFeeding(false, 'meals');
    expect(family(214, { tag: 'off' }).care()).toBeUndefined();
    setChildFeeding(true);
    const hungry = family(214, { pipHunger: 30, tag: 'hungry' });
    expect(hungry.care()!.parts.some(([n, v]) => n.startsWith('Pip needs') && v > 26 + (68 - MEAL_DUE) * 0.9 + 1)).toBe(true);
  });

  it('through a save and load the rhythm continues exactly', () => {
    const f = family(214, { tag: 'save' });
    startActivity(f.w, f.ada, f.care()!.make!()!);
    for (let i = 0; i < 40; i++) stepWorld(f.w);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 200; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    expect(conservationReport(f.w).ok).toBe(true);
  });
});

describe('provide: the pull to put food by grows with the children at home', () => {
  it('nothing at 213; four for each under-twelve at 214; nothing with the switch thrown', () => {
    const old = family(213, { tag: 'pull' });
    expect(providePull(old.w, old.ada, [old.ada, old.pip])).toBe(0);
    const now = family(214, { tag: 'pull' });
    expect(providePull(now.w, now.ada, [now.ada, now.pip])).toBe(PROVIDE_PER_CHILD);
    const youth = family(214, { pipAge: 13, tag: 'pull-youth' });
    expect(providePull(youth.w, youth.ada, [youth.ada, youth.pip])).toBe(0);
    setChildFeeding(false, 'provide');
    expect(providePull(now.w, now.ada, [now.ada, now.pip])).toBe(0);
  });
});
