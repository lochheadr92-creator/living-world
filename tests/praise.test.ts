// Rules 260 (bundle A, part 3): public praise (src/sim/praise.ts, the switch in src/sim/meeting.ts; owed in defence.ts resolve, due in buildings.ts
// completeSite, spoken in act_misc.ts at an evening fire sitting and in occasions.ts on arriving at an occasion). Every situation here is STAGED:
// it checks a rule, it is not an example of spontaneous behaviour. The last test runs ordinary worlds and PRINTS what happened in the whole bundle.
import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity, stepActivity } from '../src/sim/activities';
import { BUILD_DEF, DAY } from '../src/sim/constants';
import { completeSite, createBuilding } from '../src/sim/buildings';
import { conservationReport } from '../src/sim/economy';
import { updateEnvironment } from '../src/sim/environment';
import { FIRE_TICKS } from '../src/sim/evening_fire';
import { chronicleWorthy } from '../src/sim/events';
import { createWorld } from '../src/sim/factory';
import * as D from '../src/sim/dialogue';
import { MEETING_PARTS, hasPraise, meetingPartOn, setMeeting } from '../src/sim/meeting';
import { callOccasion } from '../src/sim/occasions';
import { perceive } from '../src/sim/perception';
import { COMPANY_MIN, GLAD, LISTENER_AFFINITY_BUILDER, LISTENER_AFFINITY_RESCUE, OWED_LIFE, OWED_MAX, RESCUER_AFFINITY, SPOKEN_AFFINITY, SPOT_AFFINITY, SPOT_RANGE, SPOT_TRUST, praiseAtFire, praiseTick, speakThanks, thankRescuer, validatePraise } from '../src/sim/praise';
import { currentWorldSettings } from '../src/sim/profiles';
import { relOf } from '../src/sim/relations';
import { describeHeard, reputationOf } from '../src/sim/reputation';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { RNG } from '../src/sim/rng';
import { mintTool } from '../src/sim/tools';
import type { Activity, Building, Person, World } from '../src/sim/types';
import { makeWolf } from '../src/sim/wildlife';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { settingsFor } from './helpers/util';
import { addPerson, building, done, learn, site, stage } from './helpers/kit';

afterEach(() => setMeeting(true));

const EVENING = DAY + Math.round(0.36 * DAY);
const thanksLines = (name: string): string[] => D.THANKS.map((s) => D.fill(s, { n: name }));

// ───────────────────────── a rescue, through the real defence ─────────────────────────
/** Ada (armed) and Ben, who a wolf is after; Cy a little way off sees it. The wolf is weak enough to be killed by one won stand if `weak`. */
function rescue(version: number, tag: string, o: { weak?: boolean; benFar?: boolean } = {}) {
  const w = testKit.flatWorld(settingsFor('praise-' + tag, { dynamics: 'rich', rulesVersion: version, immigration: false }));
  const rng = new RNG(71);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, age: 25, hunger: 95, thirst: 95, energy: 95, traits: { caution: 0.1 } });
  const ben = testKit.addPerson(w, rng, { name: 'Ben', x: o.benFar ? 52.5 : 43.5, y: 41.5, sex: 'm', age: 28, hunger: 95, thirst: 95, energy: 95 });
  const cy = testKit.addPerson(w, rng, { name: 'Cy', x: 38.5, y: 42.5, sex: 'm', age: 33, hunger: 95, thirst: 95, energy: 95 });
  mintTool(w, 'spear', 0, ada.hhId, ada.id, ada.inv, ada.id, 'fixture equipment', false);
  const wolf = makeWolf(w, 45.5, 41.5);
  if (o.weak) wolf.health = 1;
  wolf.state = 'stalk';
  wolf.targetId = ben.id;
  wolf.until = 99999;
  testKit.finish(w, 'natural');
  w.tick = 1000;
  updateEnvironment(w);
  for (const p of [ada, ben, cy]) { p.needs.warmth = 100; p.needs.safety = 100; p.nextThink = w.tick + 100000; perceive(w, p); }
  return { w, ada, ben, cy, wolf };
}
type Rx = ReturnType<typeof rescue>;

/** Ada goes at the wolf for Ben until a stand is won (a fresh attempt each time one is not): returns the event's text. */
function resolveRescue(f: Rx): string {
  const { w, ada, ben, wolf } = f;
  for (let attempt = 0; attempt < 60; attempt++) {
    ada.cooldowns['defend:' + wolf.id] = 0;
    wolf.x = 45.5; wolf.y = 41.5; wolf.state = 'stalk';
    const act = newActivity(w, ada, { kind: 'defend', label: 'Rescue Ben', goal: 'help', targetId: wolf.id, here: true, data: { forWhom: ben.id, forName: ben.name, tries: 0 } });
    startActivity(w, ada, act);
    for (let i = 0; i < 400 && ada.activity === act; i++) {
      w.tick++;
      stepActivity(w, ada);
    }
    const ev = [...w.events].reverse().find((e) => /^Ada (killed a wolf|drove a wolf off)/.test(e.text));
    if (ev) return ev.text;
  }
  throw new Error('no stand was ever won');
}

describe('rules 260 part 3 is registered', () => {
  it('has its switch, a lab arm of its own, and is a supported version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(260);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(260);
    expect(MEETING_PARTS).toContain('praise');
    expect(parseIntervention('rich-no-meeting-praise').summary).toMatch(/thanks a rescuer/);
    const f = rescue(260, 'arm');
    expect(hasPraise(f.w)).toBe(true);
    const undo = parseIntervention('rich-no-meeting-praise').install!();
    expect([meetingPartOn('courting'), meetingPartOn('welcome'), meetingPartOn('praise')]).toEqual([true, true, false]);
    expect(hasPraise(f.w)).toBe(false);
    undo();
    expect(hasPraise(f.w)).toBe(true);
  });
});

describe('a rescue: the thanks on the spot, and a thanks owed', () => {
  for (const killed of [false, true]) {
    it(`${killed ? 'a wolf killed' : 'a wolf driven off'}: Ben thanks Ada at once, grows fonder, Cy saw a brave deed, and Ben holds the thanks owed`, () => {
      const f = rescue(260, killed ? 'killed' : 'drove', { weak: killed });
      const { w, ada, ben, cy } = f;
      const before = { ben: { ...relOf(ben, ada.id) }, ada: { ...relOf(ada, ben.id) } };
      const text = resolveRescue(f);
      expect(text).toMatch(killed ? /^Ada killed a wolf, which was after Ben/ : /^Ada drove a wolf off away from Ben/);
      // at once, within 8 tiles: a thanks line (the ordinary one)
      expect(Math.hypot(ben.x - ada.x, ben.y - ada.y)).toBeLessThanOrEqual(SPOT_RANGE);
      expect(thanksLines('Ada')).toContain(ben.speech?.text);
      // relations
      expect(relOf(ben, ada.id).affinity - before.ben.affinity).toBeGreaterThanOrEqual(SPOT_AFFINITY - 0.1);
      expect(relOf(ben, ada.id).trust - before.ben.trust).toBeGreaterThanOrEqual(SPOT_TRUST - 0.1);
      expect(relOf(ada, ben.id).affinity - before.ada.affinity).toBeGreaterThanOrEqual(RESCUER_AFFINITY - 0.1);
      // a brave deed held first-hand by those who could see it, in the words of the rescue
      const heard = (p: Person) => (p.heard ?? []).filter((r) => r.kind === 'brave' && r.about === ada.id);
      expect(heard(cy)).toHaveLength(1);
      expect(heard(cy)[0].text).toBe(killed ? 'Ada killed a wolf that was after Ben' : 'Ada drove a wolf off Ben');
      expect(heard(cy)[0].from).toBe(0);
      expect(reputationOf(w, cy, ada.id), 'a brave deed counts as a good name').toBeGreaterThan(0);
      expect(heard(ada), 'the rescuer holds no story of themselves').toHaveLength(0);
      // the thanks owed
      expect(ben.thanksOwed).toEqual([{ to: ada.id, since: expect.any(Number), ...(killed ? { killed: true } : {}) }]);
      expect(cy.thanksOwed).toBeUndefined();
      // nothing is written for the on-the-spot thanks: the rescue's own line is the only one
      expect(w.events.filter((e) => /thank/i.test(e.text))).toEqual([]);
      expect(conservationReport(w).ok).toBe(true);
    });
  }

  it('Ben beyond 8 tiles says nothing at once, but is as fond and holds the thanks owed', () => {
    const f = rescue(260, 'far', { benFar: true });
    f.ben.speech = null;
    thankRescuer(f.w, f.ada, f.ben, false);
    expect(f.ben.speech).toBeNull();
    expect(relOf(f.ben, f.ada.id).affinity).toBeGreaterThanOrEqual(SPOT_AFFINITY);
    expect(f.ben.thanksOwed).toHaveLength(1);
  });

  it('nothing at all when the one rescued is the rescuer, or is dead', () => {
    const f = rescue(260, 'nobody');
    thankRescuer(f.w, f.ada, f.ada, false);
    expect(f.ada.thanksOwed).toBeUndefined();
    expect(f.ada.speech).toBeNull();
    f.ben.alive = false;
    thankRescuer(f.w, f.ada, f.ben, true);
    expect(f.ben.thanksOwed).toBeUndefined();
    expect(relOf(f.ben, f.ada.id).affinity).toBe(0);
    expect((f.cy.heard ?? []).length).toBe(0);
  });

  it('is not done at rules 257 or with the part off: the rescue is as it was', () => {
    const old = rescue(257, 'old');
    resolveRescue(old);
    expect(old.ben.thanksOwed).toBeUndefined();
    expect((old.cy.heard ?? []).some((r) => r.kind === 'brave')).toBe(false);
    setMeeting(false, 'praise');
    const off = rescue(260, 'off');
    resolveRescue(off);
    expect(off.ben.thanksOwed).toBeUndefined();
    expect(thanksLines('Ada')).not.toContain(off.ben.speech?.text);
  });

  it('holds at most three, one for each rescuer, and a thanks lapses in silence after three days', () => {
    const f = rescue(260, 'owed');
    const { w, ben } = f;
    const rescuers = [f.ada, f.cy];
    for (let i = 0; i < 2; i++) thankRescuer(w, rescuers[0], ben, false);
    expect(ben.thanksOwed).toHaveLength(1);
    const extra: Person[] = [];
    for (let i = 0; i < 3; i++) { const z = testKit.addPerson(w, new RNG(5 + i), { name: 'Z' + i, x: 30 + i, y: 30, age: 30 }); extra.push(z); }
    for (const z of [rescuers[1], ...extra]) { w.tick += 10; thankRescuer(w, z, ben, false); }
    expect(ben.thanksOwed).toHaveLength(OWED_MAX);
    expect(ben.thanksOwed!.map((o) => o.to)).not.toContain(f.ada.id);
    const events = w.events.length;
    w.tick += OWED_LIFE - 10;
    praiseTick(w);
    expect(ben.thanksOwed!.length, 'the oldest have lapsed').toBeLessThan(OWED_MAX);
    w.tick += 100;
    praiseTick(w);
    expect(ben.thanksOwed).toBeUndefined();
    expect(w.events.length, 'a lapse writes nothing').toBe(events);
  });
});

// ───────────────────────── in company ─────────────────────────
interface Fire { s: ReturnType<typeof stage>; w: World; fire: Building; q: Person; p: Person; others: Person[]; seat: (x: Person, progress?: number) => Activity }
/** A lit fire; Quinn (who owes a thanks), Pat (who is owed it) and as many others as asked, all sitting there. */
function fireScene(version: number, tag: string, others = 3): Fire {
  const s = stage(`praise-fire-${version}-${tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = EVENING;
  const q = addPerson(s, 'Quinn', 44, 30, { age: 30, sex: 'f' });
  const p = addPerson(s, 'Pat', 46, 31, { age: 31, sex: 'm' });
  const rest: Person[] = [];
  for (let i = 0; i < others; i++) rest.push(addPerson(s, 'O' + i, 44 + i, 33, { age: 20 + 5 * i, sex: i % 2 ? 'f' : 'm' }));
  const fire = building(s, 'fire', 46, 28);
  fire.fuel = 80;
  done(s);
  for (const x of [q, p, ...rest]) { x.needs = { hunger: 95, thirst: 95, energy: 90, warmth: 95, safety: 95, social: 50 }; x.chrono = 0; learn(w, x, fire); x.nextThink = w.tick + 100000; }
  const seat = (x: Person, progress = 10): Activity => {
    x.x = fire.x + 1.0 + (x.id % 3) * 0.6;
    x.y = fire.y + 1.8 + (x.id % 2) * 0.6;
    const a = newActivity(w, x, { kind: 'wander', label: 'Sitting by the fire', goal: 'to sit in company', spotX: x.x, spotY: x.y, tx: x.x, ty: x.y, utility: 20, minCommit: 90, maxTicks: 600, here: true });
    a.data.evening = 'fire';
    a.data.fireId = fire.id;
    startActivity(w, x, a);
    a.duration = FIRE_TICKS;
    a.progress = progress;
    return a;
  };
  return { s, w, fire, q, p, others: rest, seat };
}
const HALF = Math.floor(FIRE_TICKS / 2);

describe('a thanks owed, spoken at the fire', () => {
  it('Quinn thanks Pat at the half-way point before the others there: the event, the line, the story, the affinities, and the thanks is cleared', () => {
    const f = fireScene(260, 'speak', 5);
    const { w, q, p, others } = f;
    // the rescue was out of sight of the fire: nobody there saw it, so what they hold they hold from Quinn
    Object.assign(p, { x: 75, y: 62 });
    Object.assign(q, { x: 74, y: 62 });
    thankRescuer(w, p, q, false);
    expect(q.thanksOwed).toHaveLength(1);
    const a = f.seat(q, HALF);
    f.seat(p);
    for (const o of others) f.seat(o);
    const rel = (x: Person, y: Person) => relOf(x, y.id).affinity;
    const before = { qp: rel(q, p), pq: rel(p, q), op: others.map((o) => rel(o, p)) };
    expect(praiseAtFire(w, q, a)).toBe(true);
    const ev = w.events.filter((e) => / thanked /.test(e.text));
    expect(ev.map((e) => e.text)).toEqual(['At the fire Quinn thanked Pat before 5 people for driving off a wolf.']);
    expect(ev[0].kind).toBe('social');
    expect(chronicleWorthy('social', ev[0].text)).toBe(true);
    expect(w.chronicle?.some((e) => e.text === ev[0].text)).toBe(true);
    expect(q.speech?.text).toBe('I would not be here but for Pat.');
    expect(q.thanksOwed).toBeUndefined();
    // each listener holds the story as heard from Quinn, and is fonder of Pat
    others.forEach((o, i) => {
      expect(rel(o, p) - before.op[i]).toBeCloseTo(LISTENER_AFFINITY_RESCUE, 5);
      const stories = (o.heard ?? []).filter((r) => r.kind === 'brave' && r.about === p.id);
      expect(stories).toHaveLength(1);
      expect([stories[0].from, stories[0].hops, stories[0].text]).toEqual([q.id, 1, 'Pat drove a wolf off Quinn']);
      expect(describeHeard(w, o).some((h) => h.name === 'Pat' && /Quinn told me/.test(h.via))).toBe(true);
    });
    expect(rel(q, p) - before.qp).toBeCloseTo(SPOKEN_AFFINITY, 5);
    expect(rel(p, q) - before.pq).toBeCloseTo(SPOKEN_AFFINITY, 5);
    expect(p.mood?.thoughts.some((t) => t.kind === 'thanked' && t.value === GLAD && t.until - w.tick > DAY)).toBe(true);
    // said once: nothing more is owed
    expect(praiseAtFire(w, q, a)).toBe(false);
  });

  it('a killed wolf is thanked as that, and nobody is named by a pronoun', () => {
    const f = fireScene(260, 'killed');
    thankRescuer(f.w, f.p, f.q, true);
    const a = f.seat(f.q, HALF);
    f.seat(f.p);
    f.others.forEach((o) => f.seat(o));
    praiseAtFire(f.w, f.q, a);
    expect(f.w.events.find((e) => / thanked /.test(e.text))!.text).toBe('At the fire Quinn thanked Pat before 3 people for killing a wolf.');
  });

  it('the other half of the sitting, or Pat away, or Pat farther than 6 tiles, or fewer than two others: nothing is spoken and the thanks is kept', () => {
    const run = (tag: string, change: (f: Fire, a: Activity) => void, progress = HALF): boolean => {
      const f = fireScene(260, tag);
      thankRescuer(f.w, f.p, f.q, false);
      const a = f.seat(f.q, progress);
      f.seat(f.p);
      f.others.forEach((o) => f.seat(o));
      change(f, a);
      const said = praiseAtFire(f.w, f.q, a);
      if (!said) expect(f.q.thanksOwed, tag).toHaveLength(1);
      return said;
    };
    expect(run('control', () => {})).toBe(true);
    expect(run('not-half', () => {}, HALF + 1)).toBe(false);
    expect(run('pat-absent', (f) => { endAct(f.p); })).toBe(false);
    expect(run('pat-far', (f) => { f.p.x += 9; })).toBe(false);
    expect(run('one-other', (f) => { endAct(f.others[1]); endAct(f.others[2]); })).toBe(false);
    expect(COMPANY_MIN).toBe(2);
    // with two others there is enough
    expect(run('two-others', (f) => { endAct(f.others[2]); })).toBe(true);
  });

  it('it takes the place of a story: the same sitting with nothing owed has Quinn tell one, and with a thanks owed she thanks instead', () => {
    const sitting = (owes: boolean) => {
      const f = fireScene(260, 'in-place-' + owes);
      const { w, q, p } = f;
      (w.chronicle ??= []).push({ id: 9001, tick: w.tick - 4 * DAY, kind: 'social', text: 'Ulric pulled a child out of the river.', ids: [9999], x: 0, y: 0 });
      if (owes) thankRescuer(w, p, q, false);
      const a = f.seat(q, HALF - 1);
      f.seat(p);
      f.others.forEach((o) => f.seat(o));
      stepWorld(w);
      expect(a.progress).toBe(HALF);
      return w.events.map((e) => e.text);
    };
    const control = sitting(false);
    expect(control.some((x) => /^Quinn told a story at the fire/.test(x))).toBe(true);
    const thanks = sitting(true);
    expect(thanks.some((x) => /^At the fire Quinn thanked Pat/.test(x))).toBe(true);
    expect(thanks.some((x) => /^Quinn told a story at the fire/.test(x))).toBe(false);
  });

  it('not at rules 257 or with the part off', () => {
    const old = fireScene(257, 'old');
    old.q.thanksOwed = [{ to: old.p.id, since: old.w.tick - 10 }];
    const a = old.seat(old.q, HALF);
    old.seat(old.p);
    old.others.forEach((o) => old.seat(o));
    expect(praiseAtFire(old.w, old.q, a)).toBe(false);
    setMeeting(false, 'praise');
    const off = fireScene(260, 'off');
    off.q.thanksOwed = [{ to: off.p.id, since: off.w.tick - 10 }];
    const b = off.seat(off.q, HALF);
    off.seat(off.p);
    off.others.forEach((o) => off.seat(o));
    expect(praiseAtFire(off.w, off.q, b)).toBe(false);
  });
});

function endAct(p: Person): void {
  p.activity = null;
  p.x = 70;
  p.y = 60;
}

// ───────────────────────── at an occasion ─────────────────────────
describe('a thanks owed, spoken on arriving at an occasion that has begun', () => {
  function wedding(version: number, tag: string, there = 4) {
    const f = fireScene(version, tag, there);
    const o = callOccasion(f.w, 'wedding', [], 0.5)!;
    o.status = 'gathering';
    o.at = f.w.tick - 10;
    o.until = f.w.tick + 400;
    const around = (x: Person, i: number) => { x.x = o.x + 1 + (i % 4); x.y = o.y + 2 + (i % 3) * 0.7; };
    [f.p, ...f.others].forEach((x, i) => { around(x, i); o.attended.push(x.id); });
    f.q.x = o.x + 3; f.q.y = o.y + 3;
    return { ...f, o };
  }
  const arrive = (f: ReturnType<typeof wedding>) => {
    const a = newActivity(f.w, f.q, { kind: 'attend', label: 'At the wedding feast', goal: 'to celebrate', targetId: f.o.id, targetType: 'occasion', here: true, data: { occasion: f.o.id } });
    startActivity(f.w, f.q, a);
  };

  it('Quinn arrives and thanks Pat before the four others there; the event carries the occasion\'s own label', () => {
    const f = wedding(260, 'wedding');
    thankRescuer(f.w, f.p, f.q, false);
    arrive(f);
    expect(f.w.events.filter((e) => / thanked /.test(e.text)).map((e) => e.text)).toEqual(['At the wedding feast Quinn thanked Pat before 4 people for driving off a wolf.']);
    expect(f.q.thanksOwed).toBeUndefined();
    expect(f.o.attended).toContain(f.q.id);
  });

  it('not with too few there, not at a funeral, and not before it has begun', () => {
    const few = wedding(260, 'few', 1);
    thankRescuer(few.w, few.p, few.q, false);
    arrive(few);
    expect(few.w.events.some((e) => / thanked /.test(e.text))).toBe(false);
    expect(few.q.thanksOwed).toHaveLength(1);
    const fun = wedding(260, 'funeral');
    fun.o.kind = 'funeral';
    thankRescuer(fun.w, fun.p, fun.q, false);
    arrive(fun);
    expect(fun.w.events.some((e) => / thanked /.test(e.text))).toBe(false);
    const early = wedding(260, 'early');
    early.o.status = 'called';
    thankRescuer(early.w, early.p, early.q, false);
    arrive(early);
    expect(early.w.events.some((e) => / thanked /.test(e.text))).toBe(false);
  });
});

// ───────────────────────── a shared building ─────────────────────────
describe("the builders of a building for everyone, thanked in company", () => {
  /** a kiln for everyone, built by Abe, Bea, Cal (and Dot and Eli, who are not there); Dan, who did not build it, knows it; the fire has people */
  function builders(version: number, tag: string, o: { there?: number; listeners?: number; knows?: boolean; builders?: number } = {}) {
    const s = stage(`praise-build-${version}-${tag}`), w = s.w;
    w.settings.dynamics = 'rich';
    w.settings.rulesVersion = version;
    w.tick = EVENING;
    const names = ['Abe', 'Bea', 'Cal', 'Dot', 'Eli'];
    const nb = o.builders ?? 3;
    const bs = names.slice(0, nb).map((n, i) => addPerson(s, n, 44 + i, 30, { age: 30 + i, sex: i % 2 ? 'f' : 'm' }));
    const dan = addPerson(s, 'Dan', 45, 32, { age: 40, sex: 'm' });
    const ls: Person[] = [];
    for (let i = 0; i < (o.listeners ?? 3); i++) ls.push(addPerson(s, 'L' + i, 43 + i, 34, { age: 22 + i, sex: i % 2 ? 'f' : 'm' }));
    const fire = building(s, 'fire', 46, 28);
    fire.fuel = 80;
    const kiln = createBuilding(w, 'kiln', 60, 40, 0, { condition: 100 });
    kiln.builtBy = bs.map((b) => b.id);
    kiln.built = w.tick - 50;
    done(s);
    for (const x of [...bs, dan, ...ls]) { x.needs = { hunger: 95, thirst: 95, energy: 90, warmth: 95, safety: 95, social: 50 }; x.chrono = 0; learn(w, x, fire); x.nextThink = w.tick + 100000; }
    if (o.knows !== false) learn(w, dan, kiln);
    kiln.thanksDue = w.tick - 40;
    const sit = (x: Person, progress = 10): Activity => {
      x.x = fire.x + 1.0 + (x.id % 4) * 0.5;
      x.y = fire.y + 1.8 + (x.id % 3) * 0.5;
      const a = newActivity(w, x, { kind: 'wander', label: 'Sitting by the fire', goal: 'to sit in company', spotX: x.x, spotY: x.y, tx: x.x, ty: x.y, utility: 20, minCommit: 90, maxTicks: 600, here: true });
      a.data.evening = 'fire';
      a.data.fireId = fire.id;
      startActivity(w, x, a);
      a.duration = FIRE_TICKS;
      a.progress = progress;
      return a;
    };
    return { s, w, bs, dan, ls, fire, kiln, sit };
  }
  const label = BUILD_DEF.kiln.label;

  it('finishing a building for everyone makes its builders due thanks; a home, and a building at rules 257 or with the part off, does not', () => {
    const finish = (version: number, tag: string, type: 'kiln' | 'hut', off = false) => {
      if (off) setMeeting(false, 'praise');
      const s = stage(`praise-site-${version}-${tag}`), w = s.w;
      w.settings.dynamics = 'rich';
      w.settings.rulesVersion = version;
      const ada = addPerson(s, 'Ada', 40, 30, { age: 30 });
      const st = site(s, type, 60, 40, type === 'hut' ? ada.hhId : 0, ada.id);
      done(s);
      const b = completeSite(w, st, ada);
      return { b, ada, w };
    };
    const kiln = finish(260, 'kiln', 'kiln');
    expect(kiln.b.hhId).toBe(0);
    expect(kiln.b.builtBy).toEqual([kiln.ada.id]);
    expect(kiln.b.thanksDue).toBe(kiln.w.tick);
    expect(finish(260, 'hut', 'hut').b.thanksDue, 'a home belongs to its household').toBeUndefined();
    expect(finish(257, 'old', 'kiln').b.thanksDue).toBeUndefined();
    expect(finish(260, 'off', 'kiln', true).b.thanksDue).toBeUndefined();
  });

  it('Dan thanks the three builders there before the others, once: the event, the glad builders, the heard stories, the affinity; nothing more is due', () => {
    const f = builders(260, 'speak');
    const { w, bs, dan, ls, kiln } = f;
    const a = f.sit(dan, HALF);
    [...bs, ...ls].forEach((x) => f.sit(x));
    const before = ls.map((l) => bs.map((b) => relOf(l, b.id).affinity));
    expect(praiseAtFire(w, dan, a)).toBe(true);
    expect(w.events.filter((e) => / thanked /.test(e.text)).map((e) => e.text)).toEqual([`At the fire Dan thanked Abe, Bea and Cal for the new ${label}.`]);
    expect(chronicleWorthy('social', `At the fire Dan thanked Abe, Bea and Cal for the new ${label}.`)).toBe(true);
    expect(kiln.thanksDue).toBeUndefined();
    for (const b of bs) expect(b.mood?.thoughts.some((t) => t.kind === 'thanked' && t.until - w.tick > DAY)).toBe(true);
    ls.forEach((l, i) => bs.forEach((b, j) => {
      expect(relOf(l, b.id).affinity - before[i][j]).toBeCloseTo(LISTENER_AFFINITY_BUILDER, 5);
      const story = (l.heard ?? []).find((r) => r.about === b.id && r.kind === 'reliable');
      expect([story?.from, story?.hops, story?.text]).toEqual([dan.id, 1, `${b.name} helped build the ${label}`]);
    }));
    expect(praiseAtFire(w, dan, a), 'once for the building').toBe(false);
    const other = f.ls[0];
    expect(speakThanks(w, other, 'the fire', [...bs, dan])).toBe(false);
  });

  it('more builders than named: "and the others who built it"; up to three names', () => {
    const f = builders(260, 'many', { builders: 5 });
    const a = f.sit(f.dan, HALF);
    [...f.bs, ...f.ls].forEach((x) => f.sit(x));
    praiseAtFire(f.w, f.dan, a);
    expect(f.w.events.find((e) => / thanked /.test(e.text))!.text).toBe(`At the fire Dan thanked Abe, Bea, Cal and the others who built it for the new ${label}.`);
  });

  it('only the builders who are there are named, and with none there nothing is said', () => {
    const f = builders(260, 'some-there');
    const a = f.sit(f.dan, HALF);
    f.sit(f.bs[1]);
    f.ls.forEach((x) => f.sit(x));
    praiseAtFire(f.w, f.dan, a);
    expect(f.w.events.find((e) => / thanked /.test(e.text))!.text).toBe(`At the fire Dan thanked Bea and the others who built it for the new ${label}.`);
    const none = builders(260, 'none-there');
    const b = none.sit(none.dan, HALF);
    none.ls.forEach((x) => none.sit(x));
    expect(praiseAtFire(none.w, none.dan, b)).toBe(false);
    expect(none.kiln.thanksDue).toBeDefined();
  });

  it('a builder does not thank themselves, somebody who has never heard of it does not, and fewer than two others is too few', () => {
    const f = builders(260, 'builder-speaks');
    const a = f.sit(f.bs[0], HALF);
    [f.dan, f.bs[1], f.bs[2], ...f.ls].forEach((x) => f.sit(x));
    expect(praiseAtFire(f.w, f.bs[0], a)).toBe(false);
    const g = builders(260, 'unknown', { knows: false });
    const b = g.sit(g.dan, HALF);
    [...g.bs, ...g.ls].forEach((x) => g.sit(x));
    expect(praiseAtFire(g.w, g.dan, b)).toBe(false);
    const h = builders(260, 'few', { listeners: 1 });
    const c = h.sit(h.dan, HALF);
    [...h.bs, ...h.ls].forEach((x) => h.sit(x));
    expect(praiseAtFire(h.w, h.dan, c)).toBe(false);
  });

  it('lapses after three days in silence; and is not due at rules 257 or with the part off', () => {
    const f = builders(260, 'lapse');
    f.w.tick += OWED_LIFE;
    const n = f.w.events.length;
    praiseTick(f.w);
    expect(f.kiln.thanksDue).toBeUndefined();
    expect(f.w.events.length).toBe(n);
    const old = builders(257, 'old');
    const a = old.sit(old.dan, HALF);
    [...old.bs, ...old.ls].forEach((x) => old.sit(x));
    expect(praiseAtFire(old.w, old.dan, a)).toBe(false);
    setMeeting(false, 'praise');
    const off = builders(260, 'off');
    const b = off.sit(off.dan, HALF);
    [...off.bs, ...off.ls].forEach((x) => off.sit(x));
    expect(praiseAtFire(off.w, off.dan, b)).toBe(false);
  });

  it('a rescue thanks comes before a building thanks, and only one is spoken: the building waits for the next', () => {
    const f = builders(260, 'both');
    const pat = f.bs[0];
    thankRescuer(f.w, pat, f.dan, false);
    const a = f.sit(f.dan, HALF);
    [...f.bs, ...f.ls].forEach((x) => f.sit(x));
    expect(praiseAtFire(f.w, f.dan, a)).toBe(true);
    expect(f.w.events.filter((e) => / thanked /.test(e.text)).map((e) => e.text)).toEqual(['At the fire Dan thanked Abe before 5 people for driving off a wolf.']);
    expect(f.kiln.thanksDue).toBeDefined();
    // Dan's building thanks is not Dan's to say now: he is a builder's rescued friend, not a builder; the next at the fire says it
    const l = f.ls[0];
    learn(f.w, l, f.kiln);
    const b = f.sit(l, HALF);
    expect(praiseAtFire(f.w, l, b)).toBe(true);
    expect(f.w.events.filter((e) => / thanked /.test(e.text))).toHaveLength(2);
    expect(f.kiln.thanksDue).toBeUndefined();
  });
});

// ───────────────────────── saved state ─────────────────────────
describe('save, load, continue, and the saved state', () => {
  it('a world with a thanks owed and a building due continues exactly, and two identical runs give the same world', () => {
    const make = (tag: string) => {
      const f = fireScene(260, tag, 4);
      thankRescuer(f.w, f.p, f.q, false);
      const kiln = createBuilding(f.w, 'kiln', 60, 40, 0, { condition: 100 });
      kiln.builtBy = [f.p.id];
      kiln.built = f.w.tick;
      kiln.thanksDue = f.w.tick;
      return { ...f, kiln };
    };
    const f = make('save');
    for (let i = 0; i < 30; i++) stepWorld(f.w);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 300; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    const q = copy.persons.find((x) => x.id === f.q.id)!;
    expect(q.thanksOwed).toEqual(f.q.thanksOwed);
    expect(copy.buildings.find((b) => b.id === f.kiln.id)!.thanksDue).toBe(f.kiln.thanksDue);
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    expect(conservationReport(f.w).ok).toBe(true);
    const a = make('same'), b = make('same');
    for (let i = 0; i < 300; i++) { stepWorld(a.w); stepWorld(b.w); }
    expect(hashWorld(a.w)).toBe(hashWorld(b.w));
  });

  it('both are in the world fingerprint', () => {
    const f = fireScene(260, 'hash');
    const h0 = hashWorld(f.w);
    f.q.thanksOwed = [{ to: f.p.id, since: f.w.tick }];
    const h1 = hashWorld(f.w);
    expect(h1).not.toBe(h0);
    const kiln = createBuilding(f.w, 'kiln', 60, 40, 0, { condition: 100 });
    const h2 = hashWorld(f.w);
    kiln.thanksDue = f.w.tick;
    expect(hashWorld(f.w)).not.toBe(h2);
  });

  it('a save of rules 257, or one with a thanks that cannot be, is refused on loading', () => {
    const f = fireScene(260, 'refuse');
    expect(() => validatePraise(f.w)).not.toThrow();
    f.q.thanksOwed = [{ to: f.p.id, since: f.w.tick - 10 }];
    expect(() => validatePraise(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 257;
    expect(() => validatePraise(f.w)).toThrow(/thanks/i);
    f.w.settings.rulesVersion = 260;
    f.q.thanksOwed = [{ to: f.p.id, since: f.w.tick + 5 }];
    expect(() => validatePraise(f.w)).toThrow(/thanks/i);
    f.q.thanksOwed = [{ to: f.p.id, since: f.w.tick - 1 }, { to: f.p.id, since: f.w.tick - 2 }];
    expect(() => validatePraise(f.w)).toThrow(/thanks/i);
    f.q.thanksOwed = [1, 2, 3, 4].map((to) => ({ to, since: f.w.tick - 1 }));
    expect(() => validatePraise(f.w)).toThrow(/thanks/i);
    delete f.q.thanksOwed;
    const kiln = createBuilding(f.w, 'kiln', 60, 40, 0, { condition: 100 });
    kiln.thanksDue = f.w.tick - 5;
    expect(() => validatePraise(f.w), 'a thanks due for a building nobody built').toThrow(/thanks/i);
    kiln.builtBy = [f.p.id];
    expect(() => validatePraise(f.w)).not.toThrow();
  });
});

// ───────────────────────── ordinary worlds ─────────────────────────
describe('ordinary worlds (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 260, the whole bundle on or off, and prints what it did', () => {
    // MEETING_SEED (default gen-4); MEETING_DAYS: exactly this many days, else about MEETING_BUDGET_MS (default 100 s) to the end of a day;
    // MEETING_OFF=1: the whole bundle switched off (what rich-no-meeting does); MEETING_REPORT=<file>: also append the line there
    const seed = process.env.MEETING_SEED ?? 'gen-4';
    const fixedDays = Number(process.env.MEETING_DAYS ?? 0);
    const budgetMs = Number(process.env.MEETING_BUDGET_MS ?? 100_000);
    if (process.env.MEETING_OFF) setMeeting(false);
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 260 });
    const courtConvs = new Map<number, boolean | undefined>();
    const welcomeConvs = new Set<number>();
    interface Group { tick: number; ids: number[]; first?: number }
    const groups: Group[] = [];
    const owedSeen = new Set<string>(), dueSeen = new Set<number>();
    let lastEvent = 0, walks = 0, cut = 0, couples = 0, deaths = 0, rescues = 0, spot = 0, thankedRescue = 0, finished = 0, thankedBuilding = 0, welcomeEvents = 0;
    const scan = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        if (/^\S+ and \S+ walked out together/.test(e.text)) walks++;
        else if (/set out to walk together and turned back/.test(e.text)) cut++;
        else if (/ became a couple\./.test(e.text)) couples++;
        else if (/^\S+ died/.test(e.text)) deaths++;
        else if (e.kind === 'life' && /arrives? at the settlement/.test(e.text)) groups.push({ tick: e.tick, ids: [...e.ids] });
        else if (/^\S+ (welcomed|was the first to welcome) the newcomers? /.test(e.text)) {
          welcomeEvents++;
          const g = groups.find((x) => e.ids.slice(1).some((id) => x.ids.includes(id)));
          if (g) g.first ??= e.tick - g.tick;
        } else if (e.kind === 'danger' && e.ids.length === 2 && /^\S+ (drove a wolf off away from|killed a wolf, which was after) /.test(e.text) && w.byId.get(e.ids[1])?.ent === 'person') rescues++;
        else if (e.kind === 'build' && / for everyone\.$/.test(e.text)) finished++;
        else if (/^At the .+ thanked /.test(e.text)) {
          if (/ for (killing|driving off) a wolf\.$/.test(e.text)) thankedRescue++;
          else if (/ for the new /.test(e.text)) thankedBuilding++;
        }
      }
    };
    const t0 = Date.now();
    while (fixedDays > 0 ? w.tick < fixedDays * DAY : Date.now() - t0 < budgetMs || w.tick % DAY !== 0) {
      stepWorld(w);
      for (const c of w.conversations) {
        if (c.purpose === 'court') courtConvs.set(c.id, c.data.courtYes ?? courtConvs.get(c.id));
        else if (c.purpose === 'welcome') welcomeConvs.add(c.id);
      }
      for (const p of w.persons) for (const o of p.thanksOwed ?? []) {
        const key = `${p.id}:${o.to}:${o.since}`;
        if (owedSeen.has(key)) continue;
        owedSeen.add(key);
        if (p.speech && p.speech.kind === 'happy' && p.speech.until === o.since + 56) spot++;
      }
      for (const b of w.buildings) if (b.thanksDue !== undefined) dueSeen.add(b.id);
      if (w.tick % 20 === 0) scan();
      if (w.tick >= 60 * DAY) break;
    }
    scan();
    const asks = courtConvs.size, yes = [...courtConvs.values()].filter((v) => v === true).length, no = [...courtConvs.values()].filter((v) => v === false).length;
    const welcomed = groups.filter((g) => g.first !== undefined), times = welcomed.map((g) => g.first!).sort((a, b) => a - b);
    const pendingOwed = w.persons.reduce((n, p) => n + (p.thanksOwed?.length ?? 0), 0), pendingDue = w.buildings.filter((b) => b.thanksDue !== undefined).length;
    const owedMade = owedSeen.size, lapsedOwed = Math.max(0, owedMade - thankedRescue - pendingOwed), lapsedDue = Math.max(0, dueSeen.size - thankedBuilding - pendingDue);
    const expecting = w.persons.filter((p) => p.alive && p.pregnantUntil > w.tick).length;
    const line = `MEETING ordinary world, seed ${seed}${process.env.MEETING_OFF ? ' [whole bundle off]' : ''}: ${Math.floor(w.tick / DAY)} days | courting: asks ${asks}, yes ${yes}, no ${no}, counted walks ${walks}, cut short ${cut}, couples ${couples} | welcome: groups ${groups.length}, welcomed ${welcomed.length}, median ticks to first welcome ${times.length ? times[Math.floor(times.length / 2)] : 'n/a'}, welcome events ${welcomeEvents} | praise: rescues of a living person ${rescues}, thanks owed made ${owedMade}, on the spot ${spot}, spoken in company ${thankedRescue}, lapsed ${lapsedOwed} (still owed ${pendingOwed}); shared buildings finished ${finished}, due ${dueSeen.size}, thanked ${thankedBuilding}, lapsed ${lapsedDue} (still due ${pendingDue}) | births ${w.birthCount ?? 0}, expecting ${expecting}, deaths ${deaths}, alive ${w.persons.filter((p) => p.alive).length}`;
    console.log(line);
    if (process.env.MEETING_REPORT) appendFileSync(process.env.MEETING_REPORT, line + '\n');
    expect(conservationReport(w).ok).toBe(true);
    expect(() => validatePraise(w)).not.toThrow();
    if (process.env.MEETING_OFF) expect(owedMade + welcomeConvs.size + courtConvs.size).toBe(0);
  }, process.env.MEETING_DAYS ? 3_600_000 : 400_000);
});

