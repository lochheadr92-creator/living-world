// Rules 216: the evening fire and a story told (src/sim/evening_fire.ts; offered in options_work.ts, the sitting in act_misc.ts).
// Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The ordinary-world origin is phase
// 5 of docs/CHILDHOOD_AND_PLAY_PLAN.md (chats fell at rules 202; the evening had nothing for grown people and elders). Each check has
// the rules-215 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { EVENING_PARTS, FIRE_SOCIAL, FIRE_SOCIAL_EACH, FIRE_TICKS, eveningFireWork, finishEveningSit, setEvening } from '../src/sim/evening_fire';
import { perceive } from '../src/sim/perception';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Activity, Building, Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, learn, stage } from './helpers/kit';

afterEach(() => setEvening(true));

/** an evening tick: two-thirds of the way through the second day (dayFraction 0.66) */
const EVENING = DAY + Math.round(0.36 * DAY);
const MORNING = DAY + Math.round(0.1 * DAY);

/** A lit fire by Ada's hut; Ada, thirty-five, fed and rested; Bo, Mara (an elder) and Pip (a child) nearby. */
function evening(version: number, tag = '', tick = EVENING) {
  const s = stage(`evening-${version}-${tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = tick;
  const ada = addPerson(s, 'Ada', 40, 30, { age: 35 });
  const bo = addPerson(s, 'Bo', 41, 31, { age: 34, hh: ada.hhId });
  const mara = addPerson(s, 'Mara', 44, 30, { age: 66 });
  const pip = addPerson(s, 'Pip', 43, 31, { age: 6, hh: ada.hhId });
  const fire = building(s, 'fire', 46, 28);
  fire.fuel = 80;
  done(s);
  for (const p of [ada, bo, mara, pip]) {
    p.needs = { hunger: 95, thirst: 95, energy: 90, warmth: 95, safety: 95, social: 50 };
    p.chrono = 0;
    learn(w, p, fire);
  }
  for (const p of [ada, bo, mara, pip]) perceive(w, p);
  const opts = (p: Person) => generateOptions(w, p, true, true).options;
  return { w, ada, bo, mara, pip, fire, opts };
}

/** staged: put somebody on a sitting at this fire, already there, partway through */
function seat(w: World, p: Person, fire: Building, progress: number): Activity {
  p.x = fire.x + 1.5; p.y = fire.y + 2.5;
  const a = newActivity(w, p, { kind: 'wander', label: 'Sitting by the fire', goal: 'to sit in company', spotX: p.x, spotY: p.y, tx: p.x, ty: p.y, utility: 20, minCommit: 90, maxTicks: 600 })!;
  a.data.evening = 'fire';
  a.data.fireId = fire.id;
  startActivity(w, p, a);
  a.duration = FIRE_TICKS;
  a.progress = progress;
  return a;
}

describe('rules 216 is registered', () => {
  it('is registered and supported (the current version may be later), with two parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(216);
    expect(SUPPORTED_RULES_VERSIONS).toContain(216);
    expect(EVENING_PARTS).toEqual(['fire', 'story']);
  });
});

describe('fire: of an evening, a person may sit by the fire in company', () => {
  it('at 215 nothing is offered; at 216 Ada, fed and rested, is offered the fire in the evening, not in the morning, not when hungry', () => {
    const old = evening(215, 'old');
    expect(old.opts(old.ada).some((o) => o.key === 'evening:fire')).toBe(false);
    const f = evening(216, 'now');
    const o = f.opts(f.ada).find((x) => x.key === 'evening:fire');
    expect(o, 'the fire is offered').toBeTruthy();
    expect(o!.label).toBe('Sit by the fire for the evening');
    const am = evening(216, 'morning', MORNING);
    expect(am.opts(am.ada).some((x) => x.key === 'evening:fire')).toBe(false);
    const h = evening(216, 'hungry');
    h.ada.needs.hunger = 20;
    perceive(h.w, h.ada);
    expect(h.opts(h.ada).some((x) => x.key === 'evening:fire')).toBe(false);
    setEvening(false, 'fire');
    const off = evening(216, 'off');
    expect(off.opts(off.ada).some((x) => x.key === 'evening:fire')).toBe(false);
  });

  it('it is worth more with people already sitting there', () => {
    const alone = evening(216, 'alone');
    const a = alone.opts(alone.ada).find((x) => x.key === 'evening:fire')!.util;
    const busy = evening(216, 'busy');
    seat(busy.w, busy.bo, busy.fire, 10);
    seat(busy.w, busy.mara, busy.fire, 10);
    perceive(busy.w, busy.ada);
    const b = busy.opts(busy.ada).find((x) => x.key === 'evening:fire')!.util;
    expect(b).toBeGreaterThan(a);
  });

  it('a finished sitting is company: more with others there, and they come to know each other; it is had for the evening', () => {
    const f = evening(216, 'finish');
    const sa = seat(f.w, f.ada, f.fire, FIRE_TICKS);
    seat(f.w, f.bo, f.fire, 10);
    seat(f.w, f.mara, f.fire, 10);
    const fam = f.ada.relations[f.mara.id]?.familiarity ?? 0;
    finishEveningSit(f.w, f.ada, sa);
    expect(f.ada.needs.social).toBe(50 + FIRE_SOCIAL + 2 * FIRE_SOCIAL_EACH);
    expect(f.ada.relations[f.mara.id].familiarity).toBeGreaterThan(fam);
    expect(f.ada.cooldowns['fire:evening']).toBeGreaterThan(f.w.tick);
    const lone = evening(216, 'lone');
    finishEveningSit(lone.w, lone.ada, seat(lone.w, lone.ada, lone.fire, FIRE_TICKS));
    expect(lone.ada.needs.social).toBe(50 + FIRE_SOCIAL);
  });
});

describe('story: halfway through, an elder tells a story the settlement remembers', () => {
  /** a remembered thing, four days old, about somebody not at the fire */
  const remember = (w: World) => { (w.chronicle ??= []).push({ id: 9001, tick: w.tick - 4 * DAY, kind: 'social', text: 'Ulric pulled a child out of the river.', ids: [9999], x: 0, y: 0 }); };

  it('at 216 Mara tells it to Pip and Ada; Pip, the child, is gladdest; at 215 no story is told', () => {
    const f = evening(216, 'story');
    remember(f.w);
    const m = seat(f.w, f.mara, f.fire, Math.floor(FIRE_TICKS / 2));
    seat(f.w, f.pip, f.fire, 10);
    seat(f.w, f.ada, f.fire, 10);
    eveningFireWork(f.w, f.mara, m);
    const ev = f.w.events.find((e) => e.text.startsWith('Mara told a story at the fire: how Ulric pulled a child out of the river'));
    expect(ev, 'the story is in the feed').toBeTruthy();
    expect(ev!.ids).toEqual(expect.arrayContaining([f.mara.id, f.pip.id, f.ada.id]));
    const lift = (p: Person) => p.mood?.thoughts.find((t) => t.kind === 'story')?.value ?? 0;
    expect(lift(f.pip)).toBeGreaterThan(lift(f.ada));
    expect(lift(f.ada)).toBeGreaterThan(0);
    expect(f.mara.cooldowns.story).toBeGreaterThan(f.w.tick);
    const old = evening(215, 'story-old');
    remember(old.w);
    const om = seat(old.w, old.mara, old.fire, Math.floor(FIRE_TICKS / 2));
    seat(old.w, old.pip, old.fire, 10);
    eveningFireWork(old.w, old.mara, om);
    expect(old.w.events.some((e) => e.text.includes('told a story at the fire'))).toBe(false);
  });

  it('with an elder there a younger grown person does not tell; with the story part switched off nobody does', () => {
    const f = evening(216, 'who');
    remember(f.w);
    const a = seat(f.w, f.ada, f.fire, Math.floor(FIRE_TICKS / 2));
    seat(f.w, f.mara, f.fire, 10);
    eveningFireWork(f.w, f.ada, a);
    expect(f.w.events.some((e) => e.text.includes('told a story at the fire'))).toBe(false);
    setEvening(false, 'story');
    const g = evening(216, 'story-off');
    remember(g.w);
    const gm = seat(g.w, g.mara, g.fire, Math.floor(FIRE_TICKS / 2));
    seat(g.w, g.pip, g.fire, 10);
    eveningFireWork(g.w, g.mara, gm);
    expect(g.w.events.some((e) => e.text.includes('told a story at the fire'))).toBe(false);
  });
});

describe('an evening by the fire through a save and load', () => {
  it('a world with people sitting at the fire continues exactly', () => {
    const f = evening(216, 'save');
    startActivity(f.w, f.ada, f.opts(f.ada).find((x) => x.key === 'evening:fire')!.make!()!);
    perceive(f.w, f.bo);
    const bo = f.opts(f.bo).find((x) => x.key === 'evening:fire');
    if (bo) startActivity(f.w, f.bo, bo.make!()!);
    for (let i = 0; i < 30; i++) stepWorld(f.w);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 250; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    expect(conservationReport(f.w).ok).toBe(true);
  });
});
