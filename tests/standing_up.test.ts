// Rules 264 (bundle E, part 15): standing up for someone (src/sim/standing_up.ts, the switch in src/sim/together_scenes.ts; offered in options_social.ts socialOptions through
// standUpOption, kept in act_misc.ts, the quarrel noticed in social.ts startArgument). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous
// behaviour. The ordinary-world smoke run for the whole bundle is the last test of tests/fetch_home.test.ts (it prints, and asserts nothing about how much).
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { generateOptions } from '../src/sim/decision';
import { TICKS_PER_YEAR } from '../src/sim/constants';
import { SIDE_LINES } from '../src/sim/dialogue';
import { describePerson } from '../src/sim/inspect';
import { mediate, quarrelsFor } from '../src/sim/mediation';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { startArgument } from '../src/sim/social';
import {
  SIDE_AFFINITY, SIDE_FOND, SIDE_OTHER_AFFINITY, SIDE_REST, SIDE_SCORE, SIDE_SEE, SIDE_STAND, SIDE_TRUST, SIDE_WALK_MAX, kinOrFond, validateTakingSides,
} from '../src/sim/standing_up';
import { TOGETHER_SCENE_PARTS, hasTakingSides, setTogetherScenes, togetherScenePartOn } from '../src/sim/together_scenes';
import type { Activity, Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, learn, pin, stage } from './helpers/kit';

afterEach(() => setTogetherScenes(true));

interface Opts {
  tag?: string;
  version?: number;
  dynamics?: 'rich' | 'authored';
  /** how far west of Ada Cora stands (tiles) */
  far?: number;
}

/**
 * Ada (30) and Ben (32) are the two who quarrel, standing two tiles apart; Cora (27) is Ada's sister and a stranger to Ben, three tiles from Ada; Eli (40) is Ben's brother and a
 * stranger to Ada; Dov (35) is a friend of both who is far off. Only the ones a test sets going decide anything.
 */
function scene(o: Opts = {}) {
  const s = stage(`side-${o.version ?? 264}-${o.dynamics ?? 'rich'}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = o.dynamics ?? 'rich';
  w.settings.rulesVersion = o.version ?? 264;
  const full = { hunger: 95, thirst: 95, energy: 90 };
  const ada = addPerson(s, 'Ada', 40, 40, { age: 30, sex: 'f', ...full });
  const ben = addPerson(s, 'Ben', 42, 40, { age: 32, sex: 'm', ...full });
  const cora = addPerson(s, 'Cora', 40 - (o.far ?? 3), 41, { age: 27, sex: 'f', ...full });
  const eli = addPerson(s, 'Eli', 45, 42, { age: 40, sex: 'm', ...full });
  const dov = addPerson(s, 'Dov', 41, 52, { age: 35, sex: 'm', ...full });
  const fay = addPerson(s, 'Fay', 38, 44, { age: 28, sex: 'f', ...full }); // Cora's other sister: for a second quarrel
  const gus = addPerson(s, 'Gus', 40, 44, { age: 33, sex: 'm', ...full }); // a stranger to Cora
  done(s);
  const kin = (a: Person, b: Person, how: 'sibling', aff: number): void => {
    Object.assign(relOf(a, b.id), { kin: how, affinity: aff, trust: 50, familiarity: 50 });
    Object.assign(relOf(b, a.id), { kin: how, affinity: aff, trust: 50, familiarity: 50 });
  };
  const friend = (a: Person, b: Person, aff: number): void => {
    Object.assign(relOf(a, b.id), { affinity: aff, trust: 40, familiarity: 40 });
    Object.assign(relOf(b, a.id), { affinity: aff, trust: 40, familiarity: 40 });
  };
  kin(cora, ada, 'sibling', 60);
  kin(cora, fay, 'sibling', 60);
  kin(eli, ben, 'sibling', 60);
  friend(dov, ada, 40);
  friend(dov, ben, 40);
  kin(dov, ben, 'sibling', 50); // so that Dov has heard of any quarrel of Ben's: family hears of everything (mediation.ts)
  for (const p of [ada, ben, cora, eli, dov, fay, gus]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; p.nextThink = w.tick + 100000; }
  pin(dov);
  pin(eli);
  pin(fay);
  pin(gus);
  rebuildMobileGrid(w);
  for (const p of [ada, ben, cora, eli, dov, fay, gus]) perceive(w, p);
  return { s, w, ada, ben, cora, eli, dov, fay, gus };
}
type Fx = ReturnType<typeof scene>;

const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const sideOpt = (w: World, p: Person, A: Person) => options(w, p).find((o) => o.key === `side:${A.id}`);
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));
const standing = (p: Person): boolean => p.activity?.data.side !== undefined;
const refresh = (f: Fx): void => { rebuildMobileGrid(f.w); for (const p of [f.ada, f.ben, f.cora, f.eli, f.dov, f.fay, f.gus]) perceive(f.w, p); };

/** a quarrel between Ada and Ben begins and the world looks at it (the option is read from what Cora sees) */
function quarrel(f: Fx): void {
  startArgument(f.w, f.ada, f.ben, 'the last berries');
  // the two have nothing to decide when it is over (a talk with Cora would hold her walk): they stand where they are once it ends
  f.ada.nextThink = f.ben.nextThink = f.w.tick + 100000;
  const prev = f.w.hooks?.onActivityEnd;
  f.w.hooks = { ...f.w.hooks, onActivityEnd: (p: Person, a: Activity, o: string, d: string) => { prev?.(p, a, o as never, d); if (a.kind === 'argue') p.cooldowns.pause = 1e12; } };
  refresh(f);
}

describe('rules 264 is registered, with its three parts', () => {
  it('is supported, and hasTakingSides follows the version and its own switch', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(264);
    expect(TOGETHER_SCENE_PARTS).toEqual(['side', 'speech', 'fetch']);
    const now = scene({ tag: 'parts' }).w, old = scene({ tag: 'parts-old', version: 263 }).w, au = scene({ tag: 'parts-au', dynamics: 'authored' }).w;
    expect([hasTakingSides(now), hasTakingSides(old), hasTakingSides(au)]).toEqual([true, false, false]);
    setTogetherScenes(false, 'side');
    expect([hasTakingSides(now), togetherScenePartOn('speech'), togetherScenePartOn('fetch')]).toEqual([false, true, true]);
  });
});

describe('the cue: offered only when everything holds', () => {
  it('Cora, Ada\'s sister, who sees Ada and Ben quarrelling, is offered to stand up for Ada, worth the base less the walk; nobody who is kin or fond of neither or of both is', () => {
    const f = scene({ tag: 'offer' });
    quarrel(f);
    const o = sideOpt(f.w, f.cora, f.ada);
    expect(o, 'offered').toBeTruthy();
    expect(o!.label).toBe('Stand up for Ada');
    expect(o!.parts.map(([n]) => n)).toEqual(['Ada is being quarrelled with', 'walking']);
    const walk = o!.parts.find(([n]) => n === 'walking')![1];
    expect(Math.abs(o!.util - (SIDE_SCORE + walk))).toBeLessThan(0.1);
    // Dov, kin of Ben and fond of Ada: of both, so of neither side more than the other; and he is far off (he does not see it at all)
    expect(options(f.w, f.dov).some((x) => x.key.startsWith('side:'))).toBe(false);
    // fond of both
    relOf(f.cora, f.ben.id).affinity = SIDE_FOND + 5;
    expect(sideOpt(f.w, f.cora, f.ada), 'fond of both').toBeUndefined();
    relOf(f.cora, f.ben.id).affinity = 0;
    expect(sideOpt(f.w, f.cora, f.ada), 'fond of neither side more: back to one').toBeTruthy();
    // kin or fond of neither
    relOf(f.cora, f.ada.id).kin = '';
    relOf(f.cora, f.ada.id).affinity = SIDE_FOND - 1;
    expect(sideOpt(f.w, f.cora, f.ada), 'only just not fond enough').toBeUndefined();
    relOf(f.cora, f.ada.id).affinity = SIDE_FOND;
    expect(sideOpt(f.w, f.cora, f.ada), 'exactly fond enough').toBeTruthy();
  });

  it('kinOrFond reads the person\'s own record: kin, or affinity of 30 and over', () => {
    const f = scene({ tag: 'kinorfond' });
    expect([kinOrFond(f.cora, f.ada), kinOrFond(f.cora, f.ben), kinOrFond(f.ben, f.cora)]).toEqual([true, false, false]);
  });

  const negatives: [string, (f: Fx) => void][] = [
    ['Cora is a child', (f) => { f.cora.birthTick = f.w.tick - 8 * TICKS_PER_YEAR; }],
    ['Cora has a critical need (thirst)', (f) => { f.cora.needs.thirst = 5; }],
    ['a danger is believed about', (f) => { f.cora.beliefs[777777] = { id: 777777, kind: 'danger', x: 30, y: 30, amount: 1, seen: f.w.tick, hh: 0 } as never; f.cora.bykind.danger = [777777]; }],
    ['Cora stood up for somebody in the last day', (f) => { f.cora.cooldowns.sided = f.w.tick + 100; }],
    ['Cora turned back from Ada a little while ago', (f) => { f.cora.cooldowns['side' + f.ada.id] = f.w.tick + 100; }],
    ['Cora is too far to walk it in time (more than SIDE_WALK_MAX ticks off)', (f) => { f.cora.x = 40 - 9; f.cora.y = 41; }],
    ['Cora is one of the two quarrelling', (f) => { relOf(f.ada, f.cora.id).kin = 'sibling'; startArgument(f.w, f.cora, f.eli, 'the water'); }],
  ];
  for (const [why, change] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene({ tag: 'neg-control-' + why });
      quarrel(control);
      expect(sideOpt(control.w, control.cora, control.ada), 'control').toBeTruthy();
      const f = scene({ tag: 'neg-' + why });
      quarrel(f);
      change(f);
      refresh(f);
      expect(sideOpt(f.w, f.cora, f.ada), why).toBeUndefined();
    });
  }

  it('is not offered before a quarrel, at rules 263, with the part switched off, in an authored world, or to somebody who does not see it', () => {
    const calm = scene({ tag: 'calm' });
    expect(options(calm.w, calm.cora).some((o) => o.key.startsWith('side:'))).toBe(false);
    const old = scene({ tag: 'v263', version: 263 });
    quarrel(old);
    expect(sideOpt(old.w, old.cora, old.ada)).toBeUndefined();
    const off = scene({ tag: 'off' });
    quarrel(off);
    setTogetherScenes(false, 'side');
    expect(sideOpt(off.w, off.cora, off.ada)).toBeUndefined();
    setTogetherScenes(true);
    const au = scene({ tag: 'authored', dynamics: 'authored' });
    quarrel(au);
    expect(sideOpt(au.w, au.cora, au.ada)).toBeUndefined();
    const far = scene({ tag: 'far', far: SIDE_SEE + 12 });
    quarrel(far);
    expect(far.cora.seen.some((s) => s.act === 'argue')).toBe(false);
    expect(sideOpt(far.w, far.cora, far.ada)).toBeUndefined();
    expect(SIDE_WALK_MAX).toBeGreaterThan(0);
  });
});

describe('the quarrel is noticed', () => {
  it('the moment it begins, Cora (who could take Ada\'s side) and Eli (who could take Ben\'s) are made to think again within a few ticks; Dov, who is kin of Ben and fond of Ada, and one who is a child, are not', () => {
    const f = scene({ tag: 'notice' });
    const t0 = f.w.tick;
    startArgument(f.w, f.ada, f.ben, 'the last berries');
    expect(f.cora.nextThink).toBeLessThanOrEqual(t0 + 4);
    expect(f.eli.nextThink).toBeLessThanOrEqual(t0 + 4);
    expect(f.dov.nextThink).toBeGreaterThan(t0 + 1000);
    const g = scene({ tag: 'notice-child' });
    g.cora.birthTick = g.w.tick - 8 * TICKS_PER_YEAR;
    startArgument(g.w, g.ada, g.ben, 'the last berries');
    expect(g.cora.nextThink).toBeGreaterThan(g.w.tick + 1000);
  });

  it('with the part off nobody is nudged, and Cora takes the offer on her own at the next look, walks over, and speaks up', () => {
    const off = scene({ tag: 'notice-off' });
    setTogetherScenes(false, 'side');
    startArgument(off.w, off.ada, off.ben, 'the last berries');
    expect(off.cora.nextThink).toBeGreaterThan(off.w.tick + 1000);
    setTogetherScenes(true);
    const f = scene({ tag: 'notice-own' });
    startArgument(f.w, f.ada, f.ben, 'the last berries');
    let said = false;
    for (let i = 0; i < 90 && !said; i++) { stepWorld(f.w); said = eventsWith(f.w, 'stood up for').length > 0; }
    expect(said, 'Cora got there in time on her own').toBe(true);
    expect(eventsWith(f.w, 'stood up for')[0].text).toBe('Cora stood up for Ada against Ben.');
  });
});

describe('the scene', () => {
  /** Cora is made to take the option and walks to Ada; returns when she has spoken */
  function standUp(f: Fx): void {
    quarrel(f);
    // when she has done standing she goes no further (an ordinary talk with Ada would hold what follows)
    const prev = f.w.hooks?.onActivityEnd;
    f.w.hooks = { ...f.w.hooks, onActivityEnd: (p: Person, a: Activity, o: string, d: string) => { prev?.(p, a, o as never, d); if (a.data.side !== undefined) p.cooldowns.pause = 1e12; } };
    const o = sideOpt(f.w, f.cora, f.ada);
    expect(o, 'offered').toBeTruthy();
    startActivity(f.w, f.cora, o!.make!()!);
    for (let i = 0; i < 90 && eventsWith(f.w, 'stood up for').length === 0; i++) stepWorld(f.w);
    expect(eventsWith(f.w, 'stood up for').length).toBe(1);
  }

  it('Cora walks to Ada and speaks up while the quarrel is going: one spoken line, one feed line of kind social, and the inspector says what she is doing', () => {
    const f = scene({ tag: 'scene' });
    quarrel(f);
    const o = sideOpt(f.w, f.cora, f.ada)!;
    startActivity(f.w, f.cora, o.make!()!);
    expect(f.cora.activity!.kind).toBe('rest');
    expect(describePerson(f.w, f.cora.id)?.qa.doing).toMatch(/stand up for Ada/);
    let said = false;
    for (let i = 0; i < 90 && !said; i++) { stepWorld(f.w); said = eventsWith(f.w, 'stood up for').length > 0; }
    expect(said).toBe(true);
    expect(f.ada.activity?.kind, 'the quarrel is still going').toBe('argue');
    const lines = eventsWith(f.w, 'stood up for');
    expect(lines.length).toBe(1);
    expect(lines[0].text).toBe('Cora stood up for Ada against Ben.');
    expect(lines[0].kind).toBe('social');
    expect(lines[0].ids).toEqual([f.cora.id, f.ada.id, f.ben.id]);
    expect(SIDE_LINES).toContain(f.cora.speech?.text);
    expect(describePerson(f.w, f.cora.id)?.qa.doing).toMatch(/Standing up for Ada/);
    expect(f.ada.activity!.data.sided).toBe(f.cora.id);
    expect(f.ben.activity!.data.sided).toBe(f.cora.id);
    expect(f.cora.cooldowns.sided).toBeGreaterThan(f.w.tick);
    expect(f.cora.cooldowns.sided).toBeLessThanOrEqual(f.w.tick + SIDE_REST);
    expect(() => validateTakingSides(f.w)).not.toThrow();
    run(f.w, SIDE_STAND + 5);
    expect(standing(f.cora)).toBe(false);
    expect(eventsWith(f.w, 'stood up for').length).toBe(1);
  });

  it('the one stood up for is glad and closer and more trusting; the other side thinks less of Cora, with a note; Ada\'s and Ben\'s own record of each other is as the quarrel left it', () => {
    const f = scene({ tag: 'effect' });
    quarrel(f);
    const adaCora = { ...relOf(f.ada, f.cora.id) }, benCora = { ...relOf(f.ben, f.cora.id) };
    startActivity(f.w, f.cora, sideOpt(f.w, f.cora, f.ada)!.make!()!);
    for (let i = 0; i < 90 && eventsWith(f.w, 'stood up for').length === 0; i++) stepWorld(f.w);
    expect(f.ada.mood?.thoughts.some((t) => t.kind === 'stood_up_for' && t.value > 0)).toBe(true);
    expect(f.ada.relations[f.cora.id].affinity).toBeCloseTo(adaCora.affinity + SIDE_AFFINITY, 5);
    expect(f.ada.relations[f.cora.id].trust).toBeCloseTo(adaCora.trust + SIDE_TRUST, 5);
    expect(f.ben.relations[f.cora.id].affinity).toBeCloseTo(benCora.affinity + SIDE_OTHER_AFFINITY, 5);
    expect(f.ben.relations[f.cora.id].history.some((h) => /took Ada's side against me/.test(h.text))).toBe(true);
    expect(f.ada.log.some((l) => l.text === 'Cora stood up for me against Ben.')).toBe(true);
    expect(f.cora.log.some((l) => l.text === 'Stood up for Ada against Ben.')).toBe(true);
  });

  it('the quarrel is not changed: its grievances, its length and what it did to the two are those of the same quarrel with the part off', () => {
    const run1 = (on: boolean) => {
      const f = scene({ tag: 'twin-quarrel' });
      const ended: [number, number][] = [];
      f.w.hooks = { onActivityEnd: (p: Person, a: Activity) => { if (a.kind === 'argue') ended.push([p.id, f.w.tick]); } };
      if (on) {
        quarrel(f);
        startActivity(f.w, f.cora, sideOpt(f.w, f.cora, f.ada)!.make!()!);
      } else {
        setTogetherScenes(false, 'side');
        quarrel(f);
      }
      run(f.w, 120);
      setTogetherScenes(true);
      return { f, ended, g: JSON.stringify([f.ada.relations[f.ben.id], f.ben.relations[f.ada.id]]) };
    };
    const a = run1(true), b = run1(false);
    expect(eventsWith(a.f.w, 'stood up for').length).toBe(1);
    expect(eventsWith(b.f.w, 'stood up for').length).toBe(0);
    expect(a.ended).toEqual(b.ended);
    expect(a.ended.length).toBe(2);
    expect(a.g).toBe(b.g);
    expect(a.f.ada.relations[a.f.ben.id].grievance).toBeTruthy();
  });

  it('it does not start a second quarrel and nobody is hurt: one argued line, one grievance each way, nobody else quarrelling, every health as before', () => {
    const f = scene({ tag: 'nothurt' });
    const health = [f.ada, f.ben, f.cora, f.eli, f.dov].map((p) => p.health);
    standUp(f);
    run(f.w, 300);
    expect(eventsWith(f.w, 'argued over').length).toBe(1);
    expect(f.w.events.filter((e) => e.kind === 'conflict').length).toBe(1);
    expect([f.cora, f.eli, f.dov].some((p) => p.activity?.kind === 'argue')).toBe(false);
    expect(Object.values(f.cora.relations).some((r) => r.grievance)).toBe(false);
    expect([f.ada, f.ben, f.cora, f.eli, f.dov].map((p) => p.health)).toEqual(health);
  });

  it('a person stands up for somebody at most once a day: another quarrel the same day draws no offer, and a day later it does', () => {
    const f = scene({ tag: 'once-a-day' });
    standUp(f);
    run(f.w, SIDE_STAND + 10);
    // Fay (Cora's other sister) and Gus quarrel: Cora, who would take Fay's side, has stood up for somebody today
    startArgument(f.w, f.fay, f.gus, 'the last fish');
    refresh(f);
    expect(f.fay.activity?.kind).toBe('argue');
    expect(f.cora.activity?.data.side, 'she has done standing').toBeUndefined();
    expect(sideOpt(f.w, f.cora, f.fay), 'rested').toBeUndefined();
    f.w.tick += SIDE_REST;
    refresh(f);
    expect(sideOpt(f.w, f.cora, f.fay), 'a day later').toBeTruthy();
  });

});

describe('one supporter for each quarrel: the first to arrive', () => {
  it('Cora (for Ada) and Eli (for Ben) both set out: Eli, nearer, speaks for Ben; Cora finds him there and turns back with nothing said or written; one line', () => {
    const f = scene({ tag: 'two', far: 3 });
    // Eli stands close to Ben this time, and is not pinned
    f.eli.x = 44.5; f.eli.y = 41; f.eli.cooldowns.pause = 0; f.eli.nextThink = f.w.tick + 100000;
    quarrel(f);
    const oc = sideOpt(f.w, f.cora, f.ada), oe = sideOpt(f.w, f.eli, f.ben);
    expect(oc && oe, 'both offered').toBeTruthy();
    startActivity(f.w, f.cora, oc!.make!()!);
    startActivity(f.w, f.eli, oe!.make!()!);
    f.cora.x -= 2; // a little further off
    const events0 = f.w.events.length;
    run(f.w, 120);
    const lines = f.w.events.slice(events0).filter((e) => /stood up for/.test(e.text));
    expect(lines.length).toBe(1);
    const who = lines[0].text.startsWith('Eli') ? f.eli : f.cora;
    const other = who === f.eli ? f.cora : f.eli;
    expect(other.log.filter((l) => /Stood up for|stand up for/.test(l.text)), who.name + ' spoke; ' + other.name + ' did not').toEqual([]);
    expect(other.cooldowns.sided ?? 0).toBeLessThanOrEqual(f.w.tick);
    expect(standing(other)).toBe(false);
    expect(f.ada.activity?.data.sided ?? f.ben.activity?.data.sided ?? who.id).toBe(who.id);
  });
});

describe('failure: nothing is said or written', () => {
  it('the quarrel was over before Cora got there: she turns back, no line, no thought, not even a line in her own log, and she may try for somebody else at once', () => {
    const f = scene({ tag: 'late', far: 3 });
    quarrel(f);
    const o = sideOpt(f.w, f.cora, f.ada)!;
    const act = o.make!()!;
    f.cora.x = 40 - 9; // she sets out from too far to arrive in time (the option itself would not have been offered)
    startActivity(f.w, f.cora, act);
    const events0 = f.w.events.length;
    for (let i = 0; i < 400 && standing(f.cora); i++) stepWorld(f.w);
    expect(standing(f.cora)).toBe(false);
    expect(f.w.events.slice(events0).filter((e) => /stood up for/.test(e.text))).toEqual([]);
    expect(f.ada.mood?.thoughts.some((t) => t.kind === 'stood_up_for')).toBeFalsy();
    expect(f.cora.log.some((l) => /Stood up|stand up for/.test(l.text))).toBe(false);
    expect(f.cora.cooldowns.sided ?? 0).toBeLessThanOrEqual(f.w.tick);
    expect(f.cora.cooldowns['side' + f.ada.id]).toBeGreaterThan(f.w.tick);
    expect(f.ada.activity?.data.sided).toBeUndefined();
  });

  it('Ada is not where Cora expected: nothing is written', () => {
    const f = scene({ tag: 'gone' });
    quarrel(f);
    startActivity(f.w, f.cora, sideOpt(f.w, f.cora, f.ada)!.make!()!);
    f.ada.x = 60; f.ada.y = 60; f.ben.x = 62; f.ben.y = 60;
    const events0 = f.w.events.length;
    for (let i = 0; i < 300 && standing(f.cora); i++) stepWorld(f.w);
    expect(standing(f.cora)).toBe(false);
    expect(f.w.events.slice(events0).filter((e) => /stood up for/.test(e.text))).toEqual([]);
    expect(f.cora.log.some((l) => /Stood up|stand up for/.test(l.text))).toBe(false);
  });
});

describe('the peace-making that was there still works', () => {
  it('after Cora stood up for Ada, Dov (close to both) is offered the same quarrel to step into once it has cooled, and the same word has the same outcome as with the part off', () => {
    const outcomes = (on: boolean) => {
      const f = scene({ tag: 'mediate' });
      if (on) {
        quarrel(f);
        startActivity(f.w, f.cora, sideOpt(f.w, f.cora, f.ada)!.make!()!);
      } else {
        setTogetherScenes(false, 'side');
        quarrel(f);
      }
      run(f.w, 130);
      setTogetherScenes(true);
      expect(eventsWith(f.w, 'stood up for').length).toBe(on ? 1 : 0);
      f.w.tick += 600; // the quarrel has cooled (mediation.ts COOL_FOR)
      const offered = quarrelsFor(f.w, f.dov).map((q) => [q.a.id, q.b.id].sort().join(','));
      const list: string[] = [];
      for (let k = 0; k < 24; k++) {
        f.w.tick += 16;
        f.dov.cooldowns['mediate' + f.ada.id] = 0;
        // the grievance is the same each time: restore its weight so that every word is weighed on its own
        const g = f.ada.relations[f.ben.id].grievance ?? null;
        list.push(g ? mediate(f.w, f.dov, f.ada, f.ben) : 'closed');
        if (!g) break;
        f.ada.relations[f.ben.id].grievance = g;
        g.weight = 46;
      }
      return { f, offered, list };
    };
    const a = outcomes(true), b = outcomes(false);
    expect(a.offered.length).toBeGreaterThan(0);
    expect(a.offered).toEqual(b.offered);
    expect(a.list).toEqual(b.list);
    expect(a.list.includes('peace') || a.list.includes('eased'), 'a word can still do some good').toBe(true);
  });
});

describe('save and load in the middle of a scene continue identically', () => {
  const twin = (stop: (f: Fx) => boolean) => {
    const f = scene({ tag: 'save' });
    quarrel(f);
    startActivity(f.w, f.cora, sideOpt(f.w, f.cora, f.ada)!.make!()!);
    for (let i = 0; i < 90 && !stop(f); i++) stepWorld(f.w);
    expect(stop(f)).toBe(true);
    const json = serializeWorld(f.w);
    const g = deserializeWorld(json);
    expect(hashWorld(g)).toBe(hashWorld(f.w));
    return { f, g };
  };
  const carryOn = (f: Fx, g: World) => {
    // Cora's and the others' decisions are not what is under test: both worlds are stepped the same way
    g.hooks = f.w.hooks; // (the hook that stills the two once their quarrel ends is not saved: the world it loads into is given the same one)
    for (const w of [f.w, g]) for (const p of w.persons) p.nextThink = w.tick + 100000;
    run(f.w, 140);
    run(g, 140);
    expect(hashWorld(g)).toBe(hashWorld(f.w));
    expect(g.events.filter((e) => /stood up for/.test(e.text)).length).toBe(f.w.events.filter((e) => /stood up for/.test(e.text)).length);
  };

  it('on the way over (before she has spoken)', () => {
    const { f, g } = twin((x) => standing(x.cora) && x.cora.activity!.phase === 'travel' && x.cora.activity!.progress === 0 && x.w.tick > 0 && Math.hypot(x.cora.x - x.ada.x, x.cora.y - x.ada.y) < 2.6);
    expect(f.cora.activity!.data.side.said).toBeUndefined();
    carryOn(f, g);
    expect(f.w.events.filter((e) => /stood up for/.test(e.text)).length).toBe(1);
  });

  it('standing beside her after she has spoken', () => {
    const { f, g } = twin((x) => eventsWith(x.w, 'stood up for').length === 1);
    expect(f.cora.activity!.data.side.said).toBe(true);
    carryOn(f, g);
  });
});

describe('what a save may hold', () => {
  it('refuses a standing up that is not allowed or is out of range, and the quarrel side outside a quarrel', () => {
    const f = scene({ tag: 'validate' });
    quarrel(f);
    startActivity(f.w, f.cora, sideOpt(f.w, f.cora, f.ada)!.make!()!);
    expect(() => validateTakingSides(f.w)).not.toThrow();
    const a = f.cora.activity!;
    const good = { ...a.data.side };
    for (const bad of [{ ...good, for: 0 }, { ...good, against: good.for }, { ...good, since: f.w.tick + 5 }, { ...good, said: false }, null]) {
      a.data.side = bad;
      expect(() => validateTakingSides(f.w), JSON.stringify(bad)).toThrow(/Invalid standing up/);
    }
    a.data.side = good;
    f.ada.activity!.data.sided = 0;
    expect(() => validateTakingSides(f.w)).toThrow(/Invalid quarrel side/);
    f.ada.activity!.data.sided = f.cora.id;
    expect(() => validateTakingSides(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 263;
    expect(() => validateTakingSides(f.w)).toThrow(/Invalid/);
  });
});

describe('the lab arms', () => {
  it('rich-no-together-side removes the part alone, and puts it back; rich-no-together-scenes removes all three', () => {
    const one = parseIntervention('rich-no-together-side');
    expect(one.summary).toMatch(/no effect below rules 264/);
    const restore = one.install!() as () => void;
    expect([togetherScenePartOn('side'), togetherScenePartOn('speech'), togetherScenePartOn('fetch')]).toEqual([false, true, true]);
    restore();
    expect(TOGETHER_SCENE_PARTS.map((q) => togetherScenePartOn(q))).toEqual([true, true, true]);
    const all = parseIntervention('rich-no-together-scenes');
    const back = all.install!() as () => void;
    expect(TOGETHER_SCENE_PARTS.map((q) => togetherScenePartOn(q))).toEqual([false, false, false]);
    back();
    expect(TOGETHER_SCENE_PARTS.map((q) => togetherScenePartOn(q))).toEqual([true, true, true]);
  });
});
