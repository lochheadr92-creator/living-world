// Rules 264 (bundle E, part 14): speaking for a shared building (src/sim/speak_for.ts, the switch in src/sim/together_scenes.ts; spoken in act_misc.ts at an evening fire
// sitting and in occasions.ts on arriving at an occasion; the one answer is social.ts answerRecruit, shared with the private ask). Every situation here is STAGED: it
// checks a rule, it is not an example of spontaneous behaviour. The ordinary-world smoke run for the whole bundle is the last test of tests/fetch_home.test.ts (it prints, and asserts nothing about how much).
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { createSite } from '../src/sim/buildings';
import { mandate } from '../src/sim/civic_decision';
import { DAY, TICKS_PER_YEAR } from '../src/sim/constants';
import { SPEECH_LINES, fill } from '../src/sim/dialogue';
import { FIRE_TICKS } from '../src/sim/evening_fire';
import { observe } from '../src/sim/knowledge';
import { callOccasion } from '../src/sim/occasions';
import { perceive } from '../src/sim/perception';
import { generateOptions } from '../src/sim/decision';
import { thankRescuer } from '../src/sim/praise';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import {
  SPEECH_MAX, SPEECH_MIN, SPEECH_NEAR, SPEECH_QUIET, buildingName, speakAtFire, speakFor, validateSpeech,
} from '../src/sim/speak_for';
import { TOGETHER_SCENE_PARTS, hasSpeech, setTogetherScenes, togetherScenePartOn } from '../src/sim/together_scenes';
import { mayWorkProject, projectAt, townshipOf, proposeProject } from '../src/sim/townships';
import type { Activity, Person, World } from '../src/sim/types';
import type { CivicProject } from '../src/sim/townships';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, stage } from './helpers/kit';
import { civicTalk, stop } from './helpers/contest';

afterEach(() => setTogetherScenes(true));

const EVENING = DAY + Math.round(0.36 * DAY);
const HALF = Math.floor(FIRE_TICKS / 2);
const KIND = { generosity: 0.9, diligence: 0.9, sociability: 0.7 };
const SOUR = { generosity: 0, diligence: 0, sociability: 0.2 };

interface Opts {
  tag?: string;
  version?: number;
  dynamics?: 'rich' | 'authored';
  /** how many generous listeners there are besides the one sour one (3 by default: Ben, Cora, Dov) */
  kind?: number;
  /** a sour listener (Eli) is there */
  sour?: boolean;
  /** this many more sour listeners (Sour0, Sour1...), who will not back her */
  sours?: number;
}

/**
 * A lit fire at (46,28). Ada (35), who has proposed a shared storehouse for the township and so is its first candidate, and a number of grown listeners of the same township:
 * Ben, Cora and Dov are open-handed and think well of her, Eli is not and does not; Fay is far off. Nobody decides anything unless a test sets it going.
 */
function scene(o: Opts = {}) {
  const s = stage(`speech-${o.version ?? 264}-${o.dynamics ?? 'rich'}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = o.dynamics ?? 'rich';
  w.settings.rulesVersion = o.version ?? 264;
  w.tick = EVENING;
  const base = { hunger: 98, thirst: 98, energy: 90 };
  const ada = addPerson(s, 'Ada', 44, 30, { age: 35, sex: 'f', traits: KIND, ...base });
  const names = ['Ben', 'Cora', 'Dov', 'Gil', 'Hal', 'Ivy', 'Jon', 'Kay', 'Lee', 'Mo'];
  const kind: Person[] = [];
  for (let i = 0; i < (o.kind ?? 3); i++) kind.push(addPerson(s, names[i], 44 + i * 0.5, 33 + (i % 3), { age: 25 + 3 * i, sex: i % 2 ? 'f' : 'm', traits: KIND, ...base }));
  const eli = o.sour === false ? null : addPerson(s, 'Eli', 47, 33, { age: 50, sex: 'm', traits: SOUR, ...base });
  const sours: Person[] = [];
  for (let i = 0; i < (o.sours ?? 0); i++) sours.push(addPerson(s, 'Sour' + i, 44 + (i % 5), 36 + Math.floor(i / 5), { age: 40 + i, traits: SOUR, ...base }));
  const fay = addPerson(s, 'Fay', 62, 36, { age: 30, sex: 'f', traits: KIND, ...base });
  const fire = building(s, 'fire', 46, 28);
  fire.fuel = 80;
  const site = createSite(w, 'storehouse', 52, 40, ada.hhId, ada.id);
  proposeProject(w, ada, site, 'a shared store for the township');
  observe(w, ada, site);
  done(s);
  const q = w.civicProjects?.[0] as CivicProject;
  const all = [ada, ...kind, ...(eli ? [eli] : []), ...sours, fay];
  for (const x of all) {
    x.needs = { hunger: 95, thirst: 95, energy: 90, warmth: 95, safety: 95, social: 50 };
    x.chrono = 0;
    x.nextThink = w.tick + 100000;
    learn(w, x, fire);
    observe(w, x, site);
  }
  for (const x of kind) { Object.assign(relOf(x, ada.id), { affinity: 40, trust: 40, familiarity: 30 }); Object.assign(relOf(ada, x.id), { affinity: 40, trust: 40, familiarity: 30 }); }
  for (const x of sours) Object.assign(relOf(x, ada.id), { affinity: -40, trust: -20, familiarity: 30 });
  if (eli) { Object.assign(relOf(eli, ada.id), { affinity: -40, trust: -20, familiarity: 30 }); Object.assign(relOf(ada, eli.id), { affinity: 0, trust: 10, familiarity: 30 }); }
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
  return { s, w, ada, kind, eli, sours, fay, fire, site, q, seat, everyone: all.filter((x) => x !== fay) };
}
type Fx = ReturnType<typeof scene>;

const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));
const spoke = (w: World) => w.events.filter((e) => / spoke for a new /.test(e.text));
/** everybody sits at the fire; Ada at the half-way point of her sitting */
function sitDown(f: Fx): Activity {
  const a = f.seat(f.ada, HALF);
  for (const x of f.everyone) if (x !== f.ada) f.seat(x);
  return a;
}
const record = (q: { participants: { personId: number; status: string; supports?: number; decisions?: { candidateId: number; accepted: boolean; reason: string }[] }[] }) =>
  q.participants.map((m) => [m.personId, m.status, m.supports ?? 0, (m.decisions ?? []).map((d) => [d.candidateId, d.accepted, d.reason])]);

describe('rules 264 is registered, with its three parts', () => {
  it('is supported, and hasSpeech follows the version and its own switch', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(264);
    expect(TOGETHER_SCENE_PARTS).toEqual(['side', 'speech', 'fetch']);
    const now = scene({ tag: 'parts' }).w, old = scene({ tag: 'parts-old', version: 263 }).w, au = scene({ tag: 'parts-au', dynamics: 'authored' }).w;
    expect([hasSpeech(now), hasSpeech(old), hasSpeech(au)]).toEqual([true, false, false]);
    setTogetherScenes(false, 'speech');
    expect([hasSpeech(now), togetherScenePartOn('side'), togetherScenePartOn('fetch')]).toEqual([false, true, true]);
  });

  it('the staged world is one whose project has a council, no mandate, and all listeners in its township', () => {
    const f = scene({ tag: 'staged' });
    expect(f.q.council?.candidates.map((c) => c.personId)).toEqual([f.ada.id]);
    expect(mandate(f.w, f.q)).toBe(0);
    expect(mayWorkProject(f.w, f.ada, f.site.id)).toBe(false);
    for (const x of f.everyone) expect(townshipOf(f.w, x)?.id, x.name).toBe(f.q.townshipId);
    expect(projectAt(f.w, f.site.id)).toBe(f.q);
    expect(buildingName(f.q)).toBe('storehouse');
  });
});

describe('a speech at the fire', () => {
  it('at her half-way point Ada speaks for the storehouse; Ben, Cora and Dov say yes and Eli no there and then: one line, "3 of 4", a mandate in one evening', () => {
    const f = scene({ tag: 'fire' });
    const a = sitDown(f);
    expect(f.q.council!.candidates).toHaveLength(1);
    expect(speakAtFire(f.w, f.ada, a)).toBe(true);
    const lines = spoke(f.w);
    expect(lines.map((e) => e.text)).toEqual(['At the fire Ada spoke for a new storehouse; 3 of 4 said they would help.']);
    expect(lines[0].kind).toBe('social');
    expect(lines[0].ids).toEqual([f.ada.id, ...f.kind.map((x) => x.id), f.eli!.id]);
    expect(SPEECH_LINES.map((l) => fill(l, { what: 'storehouse' }))).toContain(f.ada.speech?.text);
    expect(f.q.spoke).toBe(f.w.tick);
    // each answered by the private ask's own rule, and it is on the record as one
    for (const x of f.kind) {
      const m = f.q.participants.find((p) => p.personId === x.id)!;
      expect([m.status, m.supports]).toEqual(['supporting', f.ada.id]);
      expect(m.decisions).toEqual([expect.objectContaining({ candidateId: f.ada.id, accepted: true, tick: f.w.tick })]);
      expect(x.commitments.some((c) => c.kind === 'help_build' && c.siteId === f.site.id && c.status === 'active'), x.name + ' promised').toBe(true);
    }
    const eli = f.q.participants.find((p) => p.personId === f.eli!.id)!;
    expect(eli.status).toBe('refused');
    expect(eli.decisions).toEqual([expect.objectContaining({ candidateId: f.ada.id, accepted: false })]);
    expect(f.w.requests.filter((r) => r.kind === 'help_build' && r.from === f.ada.id).map((r) => r.status).sort()).toEqual(['declined', 'promised', 'promised', 'promised']);
    // the mandate formed there and then, by the existing rule: two or more and a strict lead
    expect(mandate(f.w, f.q)).toBe(f.ada.id);
    expect(f.q.council!.coordinatorId).toBe(f.ada.id);
    expect(mayWorkProject(f.w, f.kind[0], f.site.id)).toBe(true);
    // not one feed line for each yes: the speech has its own
    expect(eventsWith(f.w, 'agreed to help').length).toBe(0);
    expect(f.ada.log.some((l) => l.text === 'Spoke for the new storehouse at the fire; 3 of 4 said they would help.')).toBe(true);
    expect(f.kind[0].log.some((l) => l.text === 'Agreed to help Ada with the building.')).toBe(true);
  });

  it('it is the mandate the private asks would have made: the same listeners asked one at a time by a real talk record the same choices', () => {
    const f = scene({ tag: 'twin-speech' });
    speakFor(f.w, f.ada, 'the fire', f.everyone.filter((x) => x !== f.ada));
    const g = scene({ tag: 'twin-private' });
    // Ada goes to each in turn and asks, as the private ask does (a real conversation); nobody else decides anything
    for (const x of g.everyone) { x.cooldowns.pause = 1e9; }
    for (const x of [...g.kind, g.eli!]) { x.x = 47 + (x.id % 3); x.y = 41 + (x.id % 2); civicTalk(g.w, g.ada, x, g.site.id); stop(g.w, g.ada, x); }
    // the three who are asked in talk are recorded as the three who are asked in company; Eli, who thinks ill of her, is cold to a private talk (he would not stop for one: nothing is
    // recorded of him) and in company he is asked and answers no, which is recorded
    const three = (q: CivicProject) => record(q).filter((r) => [g.ada.id, ...g.kind.map((x) => x.id)].includes(r[0] as number));
    expect(three(g.q)).toEqual(three(f.q));
    expect(g.q.participants.some((m) => m.personId === g.eli!.id)).toBe(false);
    expect(f.q.participants.find((m) => m.personId === f.eli!.id)?.status).toBe('refused');
    expect(mandate(g.w, g.q)).toBe(mandate(f.w, f.q));
    expect(mandate(g.w, g.q)).toBe(g.ada.id);
    expect(g.q.spoke).toBeUndefined();
  });

  it('it is the same function: a listener answered by the speech and by the private path gets the same answer and the same note', () => {
    const f = scene({ tag: 'same-function' });
    speakFor(f.w, f.ada, 'the fire', f.everyone.filter((x) => x !== f.ada));
    const notes = f.w.requests.filter((r) => r.kind === 'help_build').map((r) => [r.to, r.status, r.note]);
    expect(notes.find((n) => n[0] === f.kind[0].id)).toEqual([f.kind[0].id, 'promised', 'Ben supports Ada coordinating and will help build']);
    expect(notes.find((n) => n[0] === f.eli!.id)![1]).toBe('declined');
  });

  it('nobody persuaded: the line still says so, "0 of 4", and the private asks carry on for those who were not there', () => {
    const f = scene({ tag: 'nobody', kind: 0 });
    // four sour listeners
    const sour: Person[] = [f.eli!];
    for (let i = 0; i < 3; i++) {
      const x = addPerson(f.s, 'Sour' + i, 44 + i, 36, { age: 40 + i, traits: SOUR, hunger: 98, thirst: 98, energy: 90 });
      x.needs = { hunger: 95, thirst: 95, energy: 90, warmth: 95, safety: 95, social: 50 };
      x.chrono = 0; x.nextThink = f.w.tick + 100000; learn(f.w, x, f.fire); observe(f.w, x, f.site);
      Object.assign(relOf(x, f.ada.id), { affinity: -40, trust: -20, familiarity: 30 });
      sour.push(x);
    }
    const a = f.seat(f.ada, HALF);
    for (const x of sour) f.seat(x);
    expect(speakAtFire(f.w, f.ada, a)).toBe(true);
    expect(spoke(f.w).map((e) => e.text)).toEqual(['At the fire Ada spoke for a new storehouse; 0 of 4 said they would help.']);
    expect(mandate(f.w, f.q)).toBe(0);
    expect(f.q.council!.candidates.map((c) => c.personId)).toEqual([f.ada.id]);
    // Fay was not there: the ordinary private ask is still on offer to Ada
    f.ada.needs.social = 20;
    perceive(f.w, f.ada);
    f.fay.x = f.ada.x + 1.5; f.fay.y = f.ada.y;
    rebuildMobileGrid(f.w);
    perceive(f.w, f.ada);
    const ask = generateOptions(f.w, f.ada, true, true).options.find((o) => o.key === `socialize:${f.fay.id}:recruit`);
    expect(ask, 'the private ask to Fay is still offered').toBeTruthy();
  });

  it('a candidate who is not one, or one whose project has its coordinator already, says nothing; and the story is told in the place of a speech not made', () => {
    const f = scene({ tag: 'not-candidate' });
    const a = f.seat(f.kind[0], HALF);
    for (const x of f.everyone) if (x !== f.kind[0]) f.seat(x);
    expect(speakAtFire(f.w, f.kind[0], a), 'Ben is no candidate').toBe(false);
    const g = scene({ tag: 'has-mandate' });
    const b = sitDown(g);
    g.q.participants.push({ personId: g.kind[0].id, requestId: 0, since: 0, status: 'supporting', reason: 'staged', materials: {}, work: 0, supports: g.ada.id });
    g.q.participants.push({ personId: g.kind[1].id, requestId: 0, since: 0, status: 'supporting', reason: 'staged', materials: {}, work: 0, supports: g.ada.id });
    expect(mandate(g.w, g.q)).toBe(g.ada.id);
    expect(speakAtFire(g.w, g.ada, b), 'it has its coordinator').toBe(false);
    expect(spoke(g.w)).toEqual([]);
  });
});

describe('the order at the half-way slot: a thanks, then a speech, then a story, then a song', () => {
  const story = (w: World) => (w.chronicle ??= []).push({ id: 9001, tick: w.tick - 4 * DAY, kind: 'social', text: 'Ulric pulled a child out of the river.', ids: [9999], x: 0, y: 0 });
  const sitting = (tag: string, change: (f: Fx) => void) => {
    const f = scene({ tag });
    story(f.w);
    change(f);
    const a = f.seat(f.ada, HALF - 1);
    for (const x of f.everyone) if (x !== f.ada) f.seat(x);
    stepWorld(f.w);
    expect(a.progress).toBe(HALF);
    return f.w.events.map((e) => e.text);
  };

  it('a thanks owed is spoken first, and the speech waits for another sitting', () => {
    const lines = sitting('thanks-first', (f) => thankRescuer(f.w, f.kind[0], f.ada, false));
    expect(lines.some((t) => /^At the fire Ada thanked Ben/.test(t))).toBe(true);
    expect(lines.some((t) => / spoke for a new /.test(t))).toBe(false);
  });

  it('with no thanks owed the speech is made, and it takes the place of the story', () => {
    const lines = sitting('speech-second', () => undefined);
    expect(lines.some((t) => /^At the fire Ada spoke for a new storehouse/.test(t))).toBe(true);
    expect(lines.some((t) => /^Ada told a story at the fire/.test(t))).toBe(false);
  });

  it('with the speech not possible (the part off, or too few to ask) the story is told as before', () => {
    const off = sitting('story-off', () => setTogetherScenes(false, 'speech'));
    expect(off.some((t) => /^Ada told a story at the fire/.test(t))).toBe(true);
    expect(off.some((t) => / spoke for a new /.test(t))).toBe(false);
    setTogetherScenes(true);
    const few = sitting('story-few', (f) => { f.kind.slice(1).forEach((x) => { x.alive = false; }); f.eli!.alive = false; });
    expect(few.some((t) => /^Ada told a story at the fire/.test(t))).toBe(true);
  });
});

describe('a speech at an occasion', () => {
  function wedding(version: number, tag: string, there = 4) {
    const f = scene({ tag, version });
    const o = callOccasion(f.w, 'wedding', [], 0.5)!;
    o.status = 'gathering';
    o.at = f.w.tick - 10;
    o.until = f.w.tick + 400;
    const others = [...f.kind, f.eli!].slice(0, there);
    others.forEach((x, i) => { x.x = o.x + 1 + (i % 4); x.y = o.y + 2 + (i % 3) * 0.7; o.attended.push(x.id); });
    f.ada.x = o.x + 3; f.ada.y = o.y + 3;
    return { ...f, o };
  }
  const arrive = (f: ReturnType<typeof wedding>) => {
    startActivity(f.w, f.ada, newActivity(f.w, f.ada, { kind: 'attend', label: 'At the wedding feast', goal: 'to celebrate', targetId: f.o.id, targetType: 'occasion', here: true, data: { occasion: f.o.id } }));
  };

  it('Ada arrives at a wedding feast that has begun and speaks for the storehouse before the four there: the line carries the occasion\'s own label', () => {
    const f = wedding(264, 'wedding');
    arrive(f);
    expect(spoke(f.w).map((e) => e.text)).toEqual(['At the wedding feast Ada spoke for a new storehouse; 3 of 4 said they would help.']);
    expect(mandate(f.w, f.q)).toBe(f.ada.id);
  });

  it('not at a funeral, not before it has begun, not with fewer than two there, and not in the place of a thanks', () => {
    const fun = wedding(264, 'funeral');
    fun.o.kind = 'funeral';
    arrive(fun);
    expect(spoke(fun.w)).toEqual([]);
    const early = wedding(264, 'early');
    early.o.status = 'called';
    arrive(early);
    expect(spoke(early.w)).toEqual([]);
    const few = wedding(264, 'few', SPEECH_MIN - 1);
    arrive(few);
    expect(spoke(few.w)).toEqual([]);
    expect(few.q.spoke).toBeUndefined();
    const thanks = wedding(264, 'thanks');
    thankRescuer(thanks.w, thanks.kind[0], thanks.ada, false);
    arrive(thanks);
    expect(thanks.w.events.some((e) => /^At the wedding feast Ada thanked Ben/.test(e.text))).toBe(true);
    expect(spoke(thanks.w)).toEqual([]);
  });

  it('not at rules 263, with the part off, or in an authored world', () => {
    const old = wedding(263, 'v263');
    arrive(old);
    expect(spoke(old.w)).toEqual([]);
    setTogetherScenes(false, 'speech');
    const off = wedding(264, 'off');
    arrive(off);
    expect(spoke(off.w)).toEqual([]);
    setTogetherScenes(true);
  });
});

describe('who is spoken to, and the caps', () => {
  it('only those the private ask could reach: not a child, not somebody who has answered Ada already, not beyond SPEECH_NEAR', () => {
    const f = scene({ tag: 'who', kind: 4 });
    const [ben, cora, dov, gil] = f.kind;
    ben.birthTick = f.w.tick - 8 * TICKS_PER_YEAR; // a child
    f.q.participants.push({ personId: cora.id, requestId: 0, since: 0, status: 'refused', reason: 'staged', materials: {}, work: 0, decisions: [{ candidateId: f.ada.id, accepted: false, reason: 'staged', tick: 0 }] });
    sitDown(f);
    gil.x = f.ada.x + SPEECH_NEAR + 1; gil.y = f.ada.y; // at the fire, but out of her hearing
    expect(speakFor(f.w, f.ada, 'the fire', f.everyone.filter((x) => x !== f.ada))).toBe(true);
    const asked = f.w.requests.filter((r) => r.kind === 'help_build' && r.from === f.ada.id).map((r) => r.to).sort((x, y) => x - y);
    expect(asked).toEqual([dov.id, f.eli!.id].sort((x, y) => x - y));
    expect(spoke(f.w).map((e) => e.text)).toEqual(['At the fire Ada spoke for a new storehouse; 1 of 2 said they would help.']);
    expect(SPEECH_MIN).toBe(2);
  });

  it('at most SPEECH_MAX are answered, one speech for a project in an evening, and again after it', () => {
    const f = scene({ tag: 'caps', kind: 0, sour: false, sours: 10 });
    const a = sitDown(f);
    expect(speakAtFire(f.w, f.ada, a)).toBe(true);
    expect(f.w.requests.filter((r) => r.kind === 'help_build' && r.from === f.ada.id).length).toBe(SPEECH_MAX);
    expect(spoke(f.w)[0].text).toMatch(/; \d of 8 said they would help\.$/);
    // another sitting at the same fire the same evening: no second speech
    const b = f.seat(f.ada, HALF);
    expect(speakAtFire(f.w, f.ada, b)).toBe(false);
    expect(spoke(f.w).length).toBe(1);
    // an evening later, those who have not answered are asked (here there are only two)
    f.w.tick += SPEECH_QUIET;
    const c = f.seat(f.ada, HALF);
    expect(speakAtFire(f.w, f.ada, c)).toBe(true);
    expect(spoke(f.w).length).toBe(2);
    expect(spoke(f.w)[1].text).toMatch(/; \d of 2 said they would help\.$/);
  });

  it('it never removes a candidate or changes who has the mandate except by recording choices: a rival keeps their place, and a tie stays a tie', () => {
    const f = scene({ tag: 'rival' });
    const [ben, cora] = f.kind;
    f.q.council!.candidates.push({ personId: cora.id, tick: f.w.tick, reason: 'staged rival' });
    f.q.participants.push({ personId: cora.id, requestId: 0, since: 0, status: 'supporting', reason: 'staged', materials: {}, work: 0, supports: cora.id });
    f.q.participants.push({ personId: ben.id, requestId: 0, since: 0, status: 'supporting', reason: 'staged', materials: {}, work: 0, supports: cora.id });
    expect(mandate(f.w, f.q)).toBe(cora.id);
    const a = sitDown(f);
    expect(speakAtFire(f.w, f.ada, a), 'Cora already has the mandate').toBe(false);
    // a rival with no mandate, and Ada's speech: candidates are as they were
    f.q.participants.find((m) => m.personId === ben.id)!.supports = 0;
    expect(mandate(f.w, f.q)).toBe(0);
    const before = f.q.council!.candidates.map((c) => c.personId);
    expect(speakAtFire(f.w, f.ada, a)).toBe(true);
    expect(f.q.council!.candidates.map((c) => c.personId)).toEqual(before);
    expect([0, f.ada.id, cora.id]).toContain(mandate(f.w, f.q));
  });
});

describe('save and load', () => {
  it('after a speech the world saves, loads and continues identically; the record is checked on loading', () => {
    const f = scene({ tag: 'save' });
    const a = sitDown(f);
    expect(speakAtFire(f.w, f.ada, a)).toBe(true);
    const json = serializeWorld(f.w);
    const g = deserializeWorld(json);
    expect(hashWorld(g)).toBe(hashWorld(f.w));
    expect(g.civicProjects![0].spoke).toBe(f.q.spoke);
    for (const w of [f.w, g]) for (const p of w.persons) p.nextThink = w.tick + 100000;
    for (let i = 0; i < 200; i++) { stepWorld(f.w); stepWorld(g); }
    expect(hashWorld(g)).toBe(hashWorld(f.w));
    expect(() => validateSpeech(g)).not.toThrow();
    g.civicProjects![0].spoke = g.tick + 5;
    expect(() => validateSpeech(g)).toThrow(/Invalid speech record/);
    g.civicProjects![0].spoke = -1;
    expect(() => validateSpeech(g)).toThrow(/Invalid speech record/);
    g.civicProjects![0].spoke = 1;
    g.settings.rulesVersion = 263;
    expect(() => validateSpeech(g)).toThrow(/Invalid speech record/);
  });
});

describe('the lab arms', () => {
  it('rich-no-together-speech removes the part alone, and puts it back', () => {
    const one = parseIntervention('rich-no-together-speech');
    expect(one.summary).toMatch(/no effect below rules 264/);
    const restore = one.install!() as () => void;
    expect([togetherScenePartOn('side'), togetherScenePartOn('speech'), togetherScenePartOn('fetch')]).toEqual([true, false, true]);
    restore();
    expect(TOGETHER_SCENE_PARTS.map((q) => togetherScenePartOn(q))).toEqual([true, true, true]);
  });
});

