// Rules 263 (bundle D, part 10): sitting with the grieving (src/sim/grief_sit.ts, the switch in src/sim/kin_scenes.ts; who is bereaved in lifechanges.ts onKinLost, called from
// death_knowledge.ts learnDeath; offered in welfare.ts welfareOptions, kept in act_misc.ts). Every situation here is STAGED: deaths are rare at current rules (none in six
// settlements over 25 days), so this part is proven by staged tests only. They check a rule; they are not an example of spontaneous behaviour.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { learnDeath } from '../src/sim/death_knowledge';
import { describePerson } from '../src/sim/inspect';
import { KIN_SCENE_PARTS, hasGriefSitting, kinScenePartOn, setKinScenes } from '../src/sim/kin_scenes';
import { killPerson } from '../src/sim/lifecycle';
import { companyPull, describeLifeEvent, leanOn, lifeEventOf, lostWord, onKinLost, onPartnerLost } from '../src/sim/lifechanges';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import {
  GRIEF_AFFINITY, GRIEF_EASE_EVERY, GRIEF_MIN, GRIEF_REPLY_AT, GRIEF_SHARE, GRIEF_SIT_MIN, GRIEF_SIT_SPREAD, GRIEF_VISIT_REST, isGriefSit, validateGriefSit,
} from '../src/sim/grief_sit';
import { GRIEF_SIT_LINES, GRIEF_SIT_REPLIES } from '../src/sim/dialogue';
import type { Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, learn, pin, stage } from './helpers/kit';

afterEach(() => setKinScenes(true));

interface Opts {
  tag?: string;
  version?: number;
  /** what Ada lost: her mother Zora (the default) or her partner Zeke */
  partner?: boolean;
}

/**
 * Ada (35) by the camp fire at noon, resting where she is; her brother Cy (33), her friend Dov (45 to her) and a stranger Eli within eight tiles, all knowing the fire and the lake.
 * Her mother Zora (60) is far away. Nothing has happened yet: `bereave` kills her and has Ada learn of it.
 */
function scene(o: Opts = {}) {
  const s = stage(`grief-${o.version ?? 263}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 263;
  w.tick = 3000;
  const full = { hunger: 95, thirst: 95, energy: 90 };
  const ada = addPerson(s, 'Ada', 40, 36, { age: 35, sex: 'f', ...full });
  const cy = addPerson(s, 'Cy', 45, 36, { age: 33, sex: 'm', ...full });
  const dov = addPerson(s, 'Dov', 42, 40, { age: 30, sex: 'm', ...full });
  const eli = addPerson(s, 'Eli', 38, 31, { age: 30, sex: 'm', ...full });
  const dead = addPerson(s, o.partner ? 'Zeke' : 'Zora', 12, 12, { age: 60, sex: o.partner ? 'm' : 'f', ...full });
  const fire = createBuilding(w, 'fire', 41, 38, 0, { fuel: 30000 });
  w.camp = { x: 41, y: 36 };
  done(s);
  Object.assign(relOf(ada, dead.id), { kin: o.partner ? 'partner' : 'parent', affinity: 80, trust: 80, familiarity: 60 });
  Object.assign(relOf(dead, ada.id), { kin: o.partner ? 'partner' : 'child', affinity: 80, trust: 80, familiarity: 60 });
  if (o.partner) { ada.partnerId = dead.id; dead.partnerId = ada.id; } else ada.parents = [dead.id];
  Object.assign(relOf(ada, cy.id), { kin: 'sibling', affinity: 70, trust: 70, familiarity: 60 });
  Object.assign(relOf(cy, ada.id), { kin: 'sibling', affinity: 70, trust: 70, familiarity: 60 });
  for (const [a, b] of [[ada, dov], [dov, ada]]) Object.assign(relOf(a, b.id), { affinity: 45, trust: 45, familiarity: 30 });
  for (const p of [ada, cy, dov, eli]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; learn(w, p, fire); }
  startActivity(w, ada, newActivity(w, ada, { kind: 'rest', label: 'Resting', goal: 'to rest', here: true, amount: 9000, maxTicks: 9500, minCommit: 9000 }));
  for (const p of [ada, cy, dov, eli]) p.nextThink = w.tick + 100000;
  pin(eli);
  rebuildMobileGrid(w);
  for (const p of [ada, cy, dov, eli]) perceive(w, p);
  return { s, w, ada, cy, dov, eli, dead, fire };
}
type Fx = ReturnType<typeof scene>;

/** the dead person dies far from anybody and Ada is told of it: the real death and the real learning */
function bereave(f: Fx): void {
  killPerson(f.w, f.dead, 'old age');
  learnDeath(f.w, f.ada, { id: f.dead.id, name: f.dead.name, hhId: f.dead.hhId, tick: f.w.tick }, 'told');
  refresh(f);
}
const refresh = (f: Fx): void => { rebuildMobileGrid(f.w); for (const p of [f.ada, f.cy, f.dov, f.eli]) perceive(f.w, p); };
const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const griefOpt = (f: Fx, p: Person) => options(f.w, p).find((o) => o.key === `grief:${f.ada.id}`);
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));
const sitting = (p: Person): boolean => isGriefSit(p.activity);
const sitData = (p: Person) => p.activity!.data.grief as { for: number; sat: number; len: number; began?: true; counted?: true };
const lostThought = (f: Fx) => f.ada.mood?.thoughts.find((t) => t.kind === 'lost:' + f.dead.id);

/** the visitor takes the option and gets to her; she sits beside her */
function sitDown(f: Fx, visitor: Person = f.cy): void {
  const o = griefOpt(f, visitor);
  expect(o, 'a sit is offered').toBeTruthy();
  startActivity(f.w, visitor, o!.make!()!);
  for (let i = 0; i < 400 && !(sitting(visitor) && visitor.activity!.phase === 'work' && sitData(visitor).began); i++) stepWorld(f.w);
  expect(sitData(visitor).began).toBe(true);
}
/** the visitor is kept fed and watered while the sit runs */
const keepWell = (...ps: Person[]): void => { for (const p of ps) { p.needs.thirst = 90; p.needs.hunger = 90; p.needs.energy = 80; } };

describe('rules 263 is registered, with its three parts', () => {
  it('is supported, and hasGriefSitting follows the version and its own switch', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(263);
    const now = scene({ tag: 'parts' }).w, old = scene({ tag: 'parts-old', version: 262 }).w;
    expect([hasGriefSitting(now), hasGriefSitting(old)]).toEqual([true, false]);
    setKinScenes(false, 'grief');
    expect([hasGriefSitting(now), kinScenePartOn('age'), kinScenePartOn('settle')]).toEqual([false, true, true]);
  });
});

describe('who is bereaved', () => {
  it('Ada, told that her mother has died, is bereaved as a widow is: a life event naming whom she lost, a line in her log, a concern in the kin and the fond within eight tiles', () => {
    const f = scene({ tag: 'mother' });
    bereave(f);
    const e = lifeEventOf(f.w, f.ada)!;
    expect(e.kind).toBe('bereaved');
    expect(e.about).toBe(f.dead.id);
    expect(e.of).toBe('parent');
    expect(e.until - e.since).toBe(10 * DAY);
    expect(f.ada.log.some((l) => l.text === 'Lost my mother, Zora. I will lean on those I have left.')).toBe(true);
    expect(f.cy.concerns.some((c) => c.about === f.ada.id && c.kind === 'bereaved' && c.src === 'seen')).toBe(true);
    expect(f.dov.concerns.some((c) => c.about === f.ada.id && c.kind === 'bereaved'), 'a friend (affinity 45)').toBe(true);
    expect(f.eli.concerns.some((c) => c.about === f.ada.id), 'a stranger').toBe(false);
    expect(describeLifeEvent(f.w, f.ada)).toBe('has lost their mother, Zora, and leans on those close to them (10 more days)');
    // read by what read it before: the lean on kin and the pull of company
    expect(leanOn(f.w, f.cy, f.ada)).toBeGreaterThan(0.2);
    expect(companyPull(f.w, f.ada, f.cy)).toBeGreaterThan(0);
  });

  it('a person beyond eight tiles, and one asleep, are told nothing by the learning itself', () => {
    const f = scene({ tag: 'far' });
    f.cy.x = 60;
    f.dov.pose = 'sleep';
    refresh(f);
    bereave(f);
    expect(f.cy.concerns.some((c) => c.kind === 'bereaved')).toBe(false);
    expect(f.dov.concerns.some((c) => c.kind === 'bereaved')).toBe(false);
  });

  it('a lost partner is as it always was: no `of`, the same words, the same concern', () => {
    const f = scene({ tag: 'partner', partner: true });
    bereave(f);
    const e = lifeEventOf(f.w, f.ada)!;
    expect(e.kind).toBe('bereaved');
    expect(e.of).toBeUndefined();
    expect(describeLifeEvent(f.w, f.ada)).toBe('has lost Zeke and leans on those close to them (10 more days)');
    expect(f.ada.log.some((l) => l.text === 'Lost Zeke. I will lean on those I have left.')).toBe(true);
    expect(f.cy.concerns.some((c) => c.about === f.ada.id && c.kind === 'bereaved')).toBe(true);
    expect(lostWord(f.w, f.ada)).toBe('partner');
  });

  const words: [string, 'parent' | 'child' | 'sibling', string, string | null][] = [
    ['her mother', 'parent', 'Zora', 'mother'], ['her father', 'parent', 'Zeke', 'father'], ['her parent (a name that says nothing of sex)', 'parent', 'Nobody', 'parent'],
    ['her daughter', 'child', 'Zora', 'daughter'], ['her son', 'child', 'Zeke', 'son'], ['her child', 'child', 'Nobody', 'child'],
    ['her sister', 'sibling', 'Zora', 'sister'], ['her brother', 'sibling', 'Zeke', 'brother'], ['her sibling', 'sibling', 'Nobody', 'sibling'],
  ];
  for (const [what, kin, name, word] of words) {
    it(`${what}: the words are "${word}" in the life event, the inspector and the line`, () => {
      const f = scene({ tag: 'word-' + what });
      f.w.deceased.push({ id: 9001, name, tick: f.w.tick, cause: 'old age', age: 60 });
      onKinLost(f.w, f.ada, { id: 9001, name }, kin);
      expect(lostWord(f.w, f.ada)).toBe(word);
      expect(describeLifeEvent(f.w, f.ada)).toBe(`has lost their ${word}, ${name}, and leans on those close to them (10 more days)`);
    });
  }

  it('the inspector says what the state is, and an observer reading it writes nothing', () => {
    const f = scene({ tag: 'card' });
    bereave(f);
    expect(describePerson(f.w, f.ada.id)?.lifeEvent).toBe('has lost their mother, Zora, and leans on those close to them (10 more days)');
    const before = hashWorld(f.w);
    describePerson(f.w, f.ada.id);
    expect(hashWorld(f.w)).toBe(before);
  });

  it('with the part off, or at rules 262, a lost mother makes nobody bereaved and raises no concern, as before', () => {
    setKinScenes(false, 'grief');
    const off = scene({ tag: 'off' });
    bereave(off);
    setKinScenes(true);
    const old = scene({ tag: 'old', version: 262 });
    bereave(old);
    for (const f of [off, old]) {
      expect(f.ada.lifeEvent).toBeUndefined();
      expect(f.cy.concerns.some((c) => c.kind === 'bereaved')).toBe(false);
    }
  });
});

describe('the cue: offered only when everything holds', () => {
  it('Cy, who holds the concern and has Ada IN SIGHT, is offered to sit with her: the look-in is no longer skipped, and the concern is not dropped on seeing her', () => {
    const f = scene({ tag: 'offer' });
    bereave(f);
    expect(f.cy.seen.some((s) => s.id === f.ada.id)).toBe(true);
    const o = griefOpt(f, f.cy)!;
    expect(o, 'offered').toBeTruthy();
    expect(o.label).toBe('Sit with Ada');
    expect(o.parts.map(([n]) => n)).toEqual(['Ada has lost someone', 'walking', 'family']);
    run(f.w, 40); // noteConcerns runs every twelve ticks: with her in sight the concern used to be dropped on the next
    expect(f.cy.concerns.some((c) => c.about === f.ada.id && c.kind === 'bereaved')).toBe(true);
  });

  it('before 263, or with the part off, the same Cy in the same sight is offered no visit and the concern is dropped, as before', () => {
    setKinScenes(false, 'grief');
    const f = scene({ tag: 'old-sight' });
    // the old rule needs a partner for anybody to be bereaved at all
    const p = scene({ tag: 'old-sight-partner', partner: true });
    bereave(p);
    expect(options(p.w, p.cy).some((o) => o.targetId === p.ada.id && (o.kind === 'visit' || o.kind === 'rest'))).toBe(false);
    run(p.w, 40);
    expect(p.cy.concerns.some((c) => c.about === p.ada.id && c.kind === 'bereaved')).toBe(false);
    expect(f.ada.lifeEvent).toBeUndefined();
  });

  const negatives: [string, (f: Fx) => void][] = [
    ['Ada is seen asleep', (f) => { f.ada.pose = 'sleep'; }],
    ['somebody is seen sitting beside her', (f) => { f.dov.activity = null; startActivity(f.w, f.dov, newActivity(f.w, f.dov, { kind: 'rest', label: 'Sitting with Ada', goal: 'x', here: true, maxTicks: 9000, minCommit: 9000, data: { grief: { for: f.ada.id, since: f.w.tick, sat: 5, len: 250, began: true }, sticky: true } })); f.dov.x = f.ada.x + 1; f.dov.y = f.ada.y; f.cy.x = 44; }],
    ['Cy is critically thirsty', (f) => { f.cy.needs.thirst = 6; }],
    ['Cy is hungry (drive over 30)', (f) => { f.cy.needs.hunger = 40; }],
    ['a danger is believed about', (f) => { f.cy.beliefs[777777] = { id: 777777, kind: 'danger', x: 46, y: 36, amount: 1, seen: f.w.tick, hh: 0 } as never; f.cy.bykind.danger = [777777]; }],
    ['Cy looked in on her a little while ago', (f) => { f.cy.cooldowns['check' + f.ada.id] = f.w.tick + 300; }],
  ];
  for (const [why, change] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene({ tag: 'neg-control-' + why });
      bereave(control);
      expect(griefOpt(control, control.cy), 'control').toBeTruthy();
      const f = scene({ tag: 'neg-' + why });
      bereave(f);
      change(f);
      refresh(f);
      expect(griefOpt(f, f.cy), why).toBeUndefined();
    });
  }
});

describe('the sit', () => {
  it('Cy walks to Ada and sits down beside her: a rest, marked, with a line spoken and one in answer, and the inspector says what he is doing', () => {
    const f = scene({ tag: 'sit' });
    bereave(f);
    sitDown(f);
    const a = f.cy.activity!;
    expect(a.kind).toBe('rest');
    expect(a.label).toBe('Sitting with Ada');
    expect(Math.hypot(f.cy.x - f.ada.x, f.cy.y - f.ada.y)).toBeLessThan(3.5);
    expect(GRIEF_SIT_LINES).toContain(f.cy.speech?.text);
    const len = sitData(f.cy).len;
    expect(len).toBeGreaterThanOrEqual(GRIEF_SIT_MIN);
    expect(len).toBeLessThanOrEqual(GRIEF_SIT_MIN + GRIEF_SIT_SPREAD);
    expect(describePerson(f.w, f.cy.id)?.qa.doing).toMatch(/Sitting with Ada/);
    perceive(f.w, f.dov);
    expect(f.dov.seen.find((s) => s.id === f.cy.id)?.sittingWith).toBe(true);
    keepWell(f.cy, f.ada);
    for (let i = 0; i < GRIEF_REPLY_AT + 2; i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    expect(GRIEF_SIT_REPLIES).toContain(f.ada.speech?.text);
    expect(() => validateGriefSit(f.w)).not.toThrow();
  });

  it('when it has lasted GRIEF_MIN ticks it counts, once: one line in the feed with the true relation, the two closer, both glad, her grief eased by the share, the worry settled', () => {
    const f = scene({ tag: 'count' });
    bereave(f);
    sitDown(f);
    const aff0 = f.ada.relations[f.cy.id].affinity;
    const before = lostThought(f)!.until;
    for (let i = 0; i < GRIEF_MIN - 5; i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    expect(eventsWith(f.w, 'sat with Ada')).toEqual([]);
    for (let i = 0; i < 10; i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    const lines = eventsWith(f.w, 'sat with Ada');
    expect(lines.length).toBe(1);
    expect(lines[0].text).toBe('Cy sat with Ada, who has lost her mother.');
    expect(lines[0].kind).toBe('social');
    expect(lines[0].ids).toEqual([f.cy.id, f.ada.id]);
    expect(f.ada.relations[f.cy.id].affinity).toBeGreaterThanOrEqual(aff0 + GRIEF_AFFINITY - 0.5);
    expect(f.ada.mood?.thoughts.some((t) => t.kind === 'looked_in')).toBe(true);
    expect(f.cy.mood?.thoughts.some((t) => t.kind === 'looked_in')).toBe(true);
    const eased = lostThought(f)!.until;
    const sinceNow = before - f.w.tick, easedNow = eased - f.w.tick;
    expect(easedNow).toBeLessThan(sinceNow);
    expect(easedNow / sinceNow).toBeGreaterThan(GRIEF_SHARE - 0.05);
    expect(easedNow / sinceNow).toBeLessThan(GRIEF_SHARE + 0.01);
    expect(f.ada.cooldowns.griefEased).toBeGreaterThan(f.w.tick);
    expect(f.cy.log.some((l) => l.text === 'Sat with Ada, who has lost her mother.')).toBe(true);
    expect(f.ada.log.some((l) => l.text === 'Cy sat with me.')).toBe(true);
    // however long it goes on, the line is written once
    for (let i = 0; i < 400 && sitting(f.cy); i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    expect(eventsWith(f.w, 'sat with Ada').length).toBe(1);
  });

  it('it ends at its length (200 to 300 ticks): Cy goes on, does not come again for a day and the worry is gone', () => {
    const f = scene({ tag: 'end' });
    bereave(f);
    sitDown(f);
    const len = sitData(f.cy).len;
    let ticks = 0;
    for (let i = 0; i < 400 && sitting(f.cy); i++, ticks++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    expect(sitting(f.cy)).toBe(false);
    expect(ticks).toBeGreaterThanOrEqual(len - 5);
    expect(ticks).toBeLessThanOrEqual(len + 5);
    expect(f.cy.concerns.some((c) => c.about === f.ada.id)).toBe(false);
    expect(f.cy.cooldowns['check' + f.ada.id]).toBeGreaterThanOrEqual(f.w.tick + GRIEF_VISIT_REST - 5);
    expect(GRIEF_VISIT_REST).toBeGreaterThan(DAY);
    refresh(f);
    expect(griefOpt(f, f.cy), 'not again within the day').toBeUndefined();
  });

  it('a lost partner is sat with in the same way, and the line says "partner"', () => {
    const f = scene({ tag: 'partner-sit', partner: true });
    bereave(f);
    sitDown(f);
    for (let i = 0; i < GRIEF_MIN + 5; i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    expect(eventsWith(f.w, 'sat with Ada')[0].text).toBe('Cy sat with Ada, who has lost her partner.');
  });

  it('a visitor who has to see to a need of his own leaves; under GRIEF_MIN ticks nothing is written in the feed, after it the sit counted', () => {
    const early = scene({ tag: 'short' });
    bereave(early);
    sitDown(early);
    run(early.w, 20);
    early.cy.needs.thirst = 20;
    run(early.w, 5);
    expect(sitting(early.cy)).toBe(false);
    expect(eventsWith(early.w, 'sat with Ada')).toEqual([]);
    expect(early.cy.log.some((l) => /^Sat with Ada for a little/.test(l.text))).toBe(true);
    expect(early.cy.cooldowns['check' + early.ada.id]).toBeLessThan(early.w.tick + GRIEF_VISIT_REST);
    const late = scene({ tag: 'late' });
    bereave(late);
    sitDown(late);
    for (let i = 0; i < GRIEF_MIN + 10; i++) { keepWell(late.cy, late.ada); stepWorld(late.w); }
    late.cy.needs.thirst = 20;
    run(late.w, 5);
    expect(sitting(late.cy)).toBe(false);
    expect(eventsWith(late.w, 'sat with Ada').length).toBe(1);
  });

  it('she is followed if she moves, and the sit ends if she falls asleep', () => {
    const f = scene({ tag: 'follow' });
    bereave(f);
    sitDown(f);
    f.ada.activity = null;
    f.ada.pose = 'stand';
    startActivity(f.w, f.ada, newActivity(f.w, f.ada, { kind: 'wander', label: 'Walking', goal: 'to walk', tx: 46, ty: 33, spotX: 46, spotY: 33, maxTicks: 900, minCommit: 900 }));
    for (let i = 0; i < 60; i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    expect(sitting(f.cy)).toBe(true);
    expect(Math.hypot(f.cy.x - f.ada.x, f.cy.y - f.ada.y)).toBeLessThan(8);
    f.ada.activity = null;
    f.ada.needs.energy = 30;
    startActivity(f.w, f.ada, newActivity(f.w, f.ada, { kind: 'sleep', label: 'Sleeping on the ground', goal: 'to recover energy', need: 'energy', here: true, maxTicks: 9000, minCommit: 9000 }));
    f.ada.pose = 'sleep';
    run(f.w, 60);
    expect(sitting(f.cy)).toBe(false);
  });
});

describe('the caps', () => {
  it('one sitter at a time: Dov, who set out too, finds Cy beside her and turns back; nothing is written for him', () => {
    const f = scene({ tag: 'one' });
    bereave(f);
    const oc = griefOpt(f, f.cy)!, od = griefOpt(f, f.dov)!;
    startActivity(f.w, f.cy, oc.make!()!);
    startActivity(f.w, f.dov, od.make!()!);
    for (let i = 0; i < 400 && !(sitData(f.cy)?.began || sitData(f.dov)?.began); i++) stepWorld(f.w);
    const first = sitData(f.cy)?.began ? f.cy : f.dov, second = first === f.cy ? f.dov : f.cy;
    for (let i = 0; i < 60; i++) { keepWell(first, second, f.ada); stepWorld(f.w); }
    expect(sitting(first)).toBe(true);
    expect(sitting(second)).toBe(false);
    expect(second.log.some((l) => /Sat with Ada/.test(l.text))).toBe(false);
    expect(second.cooldowns['check' + f.ada.id]).toBeGreaterThan(f.w.tick);
  });

  it('her grief is eased once a day however many come: the second visitor\'s sit counts and is written, but eases nothing; a day on it eases again', () => {
    const f = scene({ tag: 'ease' });
    bereave(f);
    pin(f.dov);
    sitDown(f, f.cy);
    for (let i = 0; i < 400 && sitting(f.cy); i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    pin(f.cy);
    delete f.dov.cooldowns.pause;
    const afterFirst = lostThought(f)!.until;
    sitDown(f, f.dov);
    for (let i = 0; i < 400 && sitting(f.dov); i++) { keepWell(f.dov, f.ada); stepWorld(f.w); }
    expect(eventsWith(f.w, 'sat with Ada').length).toBe(2);
    expect(lostThought(f)!.until, 'the second visitor eased nothing').toBe(afterFirst);
    f.ada.cooldowns.griefEased = f.w.tick - 1; // a day on
    f.cy.cooldowns['check' + f.ada.id] = 0;
    delete f.cy.cooldowns.pause;
    pin(f.dov);
    f.cy.concerns.push({ about: f.ada.id, kind: 'bereaved', seen: f.w.tick, src: 'seen', from: f.cy.id, checked: -99999 }); // a fresh worry: the old one was settled by the sit
    refresh(f);
    sitDown(f, f.cy);
    for (let i = 0; i < GRIEF_MIN + 5; i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    expect(lostThought(f)!.until).toBeLessThan(afterFirst);
    expect(GRIEF_EASE_EVERY).toBe(DAY);
  });
});

describe('failure: the visitor turns back and nothing is written', () => {
  it('Ada is asleep when he gets there', () => {
    const f = scene({ tag: 'asleep' });
    bereave(f);
    startActivity(f.w, f.cy, griefOpt(f, f.cy)!.make!()!);
    f.ada.activity = null;
    f.ada.needs.energy = 30;
    startActivity(f.w, f.ada, newActivity(f.w, f.ada, { kind: 'sleep', label: 'Sleeping on the ground', goal: 'to recover energy', need: 'energy', here: true, maxTicks: 9000, minCommit: 9000 }));
    f.ada.pose = 'sleep';
    const events0 = f.w.events.length;
    for (let i = 0; i < 300 && sitting(f.cy); i++) stepWorld(f.w);
    expect(sitting(f.cy)).toBe(false);
    expect(f.w.events.slice(events0).filter((e) => /sat with/.test(e.text))).toEqual([]);
    expect(f.cy.log.some((l) => /Sat with Ada/.test(l.text))).toBe(false);
    expect(f.ada.log.some((l) => /Cy sat/.test(l.text))).toBe(false);
    expect(f.cy.cooldowns['check' + f.ada.id]).toBeGreaterThan(f.w.tick);
  });

  it('she is not where he expected (gone out of his sight before he arrived)', () => {
    const f = scene({ tag: 'gone' });
    bereave(f);
    f.cy.x = 52;
    f.cy.y = 36;
    refresh(f);
    const o = griefOpt(f, f.cy);
    expect(o, 'offered from afar (she is believed to be there)').toBeTruthy();
    startActivity(f.w, f.cy, o!.make!()!);
    f.ada.x = 40;
    f.ada.y = 8;
    rebuildMobileGrid(f.w);
    const events0 = f.w.events.length;
    for (let i = 0; i < 400 && sitting(f.cy); i++) stepWorld(f.w);
    expect(sitting(f.cy)).toBe(false);
    expect(f.w.events.slice(events0).filter((e) => /sat with/.test(e.text))).toEqual([]);
    expect(f.cy.whereabouts[f.ada.id]?.tick ?? 0).toBeLessThan(f.w.tick);
  });
});

describe('the part off and the old rules', () => {
  it('a lost partner with the part off is looked in on as it always was: a visit of twelve ticks, no sit, no line in the feed', () => {
    setKinScenes(false, 'grief');
    const f = scene({ tag: 'old-visit', partner: true });
    bereave(f);
    f.cy.x = 62; // out of sight, so the old rule offers the visit
    refresh(f);
    f.cy.whereabouts[f.ada.id] = { x: f.ada.x, y: f.ada.y, tick: f.w.tick };
    const o = options(f.w, f.cy).find((x) => x.kind === 'visit' && x.targetId === f.ada.id);
    expect(o, 'the old visit').toBeTruthy();
    expect(options(f.w, f.cy).some((x) => x.key === `grief:${f.ada.id}`)).toBe(false);
  });

  it('makes no draw from the shared stream: the modules never touch it', () => {
    for (const file of ['grief_sit.ts', 'kin_scenes.ts']) expect(readFileSync('src/sim/' + file, 'utf8'), file).not.toMatch(/\.rng\b|rng\.next|keyedRng/);
  });
});

describe('save and load, the fingerprint and the checks on loading', () => {
  it('saved in the middle of the sit and loaded, it goes on exactly as the original does, to the same line and the same fingerprint', () => {
    const f = scene({ tag: 'save' });
    bereave(f);
    sitDown(f);
    for (let i = 0; i < 40; i++) { keepWell(f.cy, f.ada); stepWorld(f.w); }
    const copy = deserializeWorld(serializeWorld(f.w));
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    const cy2 = copy.byId.get(f.cy.id) as Person, ada2 = copy.byId.get(f.ada.id) as Person;
    expect(isGriefSit(cy2.activity)).toBe(true);
    expect(ada2.lifeEvent?.of).toBe('parent');
    for (let i = 0; i < 300; i++) { keepWell(f.cy, f.ada); keepWell(cy2, ada2); stepWorld(f.w); stepWorld(copy); }
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    expect(eventsWith(copy, 'sat with Ada').map((e) => e.text)).toEqual(eventsWith(f.w, 'sat with Ada').map((e) => e.text));
    expect(eventsWith(copy, 'sat with Ada').length).toBe(1);
  });

  it('the kind of loss and the sit are in the fingerprint', () => {
    const f = scene({ tag: 'hash' });
    bereave(f);
    const h0 = hashWorld(f.w);
    f.ada.lifeEvent!.of = 'child';
    expect(hashWorld(f.w)).not.toBe(h0);
    f.ada.lifeEvent!.of = 'parent';
    sitDown(f);
    const h2 = hashWorld(f.w);
    sitData(f.cy).sat += 1;
    expect(hashWorld(f.w)).not.toBe(h2);
  });

  it('a save holding something this part could not have made is refused', () => {
    const f = scene({ tag: 'refuse' });
    bereave(f);
    expect(() => validateGriefSit(f.w)).not.toThrow();
    f.ada.lifeEvent!.of = 'cousin' as never;
    expect(() => validateGriefSit(f.w)).toThrow(/bereavement/i);
    f.ada.lifeEvent!.of = 'parent';
    f.ada.lifeEvent!.kind = 'moved';
    expect(() => validateGriefSit(f.w), 'a kind of loss on a change of home').toThrow(/bereavement/i);
    f.ada.lifeEvent!.kind = 'bereaved';
    f.w.settings.rulesVersion = 262;
    expect(() => validateGriefSit(f.w), 'in a world of rules 262').toThrow(/bereavement/i);
    f.w.settings.rulesVersion = 263;
    sitDown(f);
    expect(() => validateGriefSit(f.w)).not.toThrow();
    const v = sitData(f.cy);
    v.len = 500;
    expect(() => validateGriefSit(f.w)).toThrow(/sitting/i);
    v.len = 250;
    v.counted = true;
    delete v.began;
    expect(() => validateGriefSit(f.w), 'counted without having begun').toThrow(/sitting/i);
  });
});

describe('the lab arms', () => {
  it('rich-no-kin-grief removes the part alone, and puts it back', () => {
    const one = parseIntervention('rich-no-kin-grief');
    expect(one.summary).toMatch(/no effect below rules 263/);
    const restore = one.install!() as () => void;
    expect([kinScenePartOn('grief'), kinScenePartOn('age'), kinScenePartOn('settle')]).toEqual([false, true, true]);
    restore();
    expect(KIN_SCENE_PARTS.map((q) => kinScenePartOn(q))).toEqual([true, true, true]);
  });
});

describe('what the partner loss does is unchanged', () => {
  it('onPartnerLost still raises the concern in the kin and the fond within eight tiles and gives the same life event', () => {
    const f = scene({ tag: 'direct', partner: true });
    onPartnerLost(f.w, f.ada, { id: f.dead.id, name: f.dead.name });
    expect(lifeEventOf(f.w, f.ada)).toMatchObject({ kind: 'bereaved', about: f.dead.id });
    expect(f.cy.concerns.some((c) => c.kind === 'bereaved')).toBe(true);
    expect(f.dov.concerns.some((c) => c.kind === 'bereaved')).toBe(true);
    expect(f.eli.concerns.some((c) => c.kind === 'bereaved')).toBe(false);
  });
});
