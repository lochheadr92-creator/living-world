// Getting ready for the night (rich worlds): a plan someone adopts for their own reasons, carries across several activities, sets
// aside for something more pressing, and then takes up again, finishes, or gives up with a reason. Waiting out the night is a real
// action here, so a rested person is no longer forced to wander. Authored worlds must be untouched by every line of it.
import { describe, expect, it } from 'vitest';
import { decide, generateOptions, rankOptions } from '../src/sim/decision';
import { creditShelter, intentBonus, reviewIntentions, servesIntent } from '../src/sim/intent';
import { stageOf } from '../src/sim/people';
import { delBelief, observe, putBelief } from '../src/sim/knowledge';
import { createBuilding } from '../src/sim/buildings';
import { killPerson } from '../src/sim/lifecycle';
import { abortActivity, newActivity, resumeSuspended, startActivity, suspendActivity } from '../src/sim/activities';
import { hashWorld, stepWorld } from '../src/sim/world';
import { dayFraction } from '../src/sim/environment';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { DAY } from '../src/sim/constants';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import type { Person, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';

/** one adult with a lean-to they know about, at a chosen point in the day */
function evening(seed: string, dynamics: 'authored' | 'rich', atFrac = 0.70, needs: Partial<Record<'hunger' | 'thirst' | 'energy' | 'warmth', number>> = {}) {
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics }));
  const rng = new RNG(7);
  const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 90, thirst: 90, energy: 95 });
  const home = createBuilding(w, 'lean_to', 41, 40, p.hhId);
  const hh = w.households.find((h) => h.id === p.hhId);
  if (hh) hh.homeId = home.id;
  testKit.finish(w, 'natural');
  observe(w, p, home);
  // move the clock to the asked-for point of day without running the world
  while (dayFraction(w.tick) < atFrac - 0.004 || dayFraction(w.tick) > atFrac + 0.004) w.tick++;
  Object.assign(p.needs, needs);
  return { w, p, home };
}

const ctxFor = (w: World, p: Person) => generateOptions(w, p, true);
/** step the world until `done`, or until `ticks` have passed; the number of ticks it took, or -1 */
function until(w: World, ticks: number, done: () => boolean): number {
  for (let n = 0; n < ticks; n++) {
    if (done()) return n;
    stepWorld(w);
  }
  return done() ? ticks : -1;
}
const keys = (w: World, p: Person): string[] => rankOptions(ctxFor(w, p)).map((o) => o.key);

describe('a plan for the night', () => {
  it('is adopted in the evening, for a reason the person can see, and only in a rich world', () => {
    const rich = evening('night-adopt-rich', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(rich.w, rich.p));
    const i = rich.p.intentions[0];
    expect(i, 'a rich evening with a real worry should raise a plan').toBeTruthy();
    expect(i.kind).toBe('night');
    expect(i.status).toBe('active');
    expect(i.reason).toMatch(/thirsty/);
    expect(i.goal).toMatch(/shelter/);
    expect(i.step, 'the first step is the thing that worried them').toMatch(/drink/);

    const authored = evening('night-adopt-authored', 'authored', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(authored.w, authored.p));
    expect(authored.p.intentions, 'an authored world has no private plans at all').toEqual([]);
  });

  it('is not adopted when the person can see no reason for one', () => {
    const { w, p } = evening('night-content', 'rich', 0.7, { thirst: 95, hunger: 95, warmth: 95 });
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions).toEqual([]);
  });

  it('moves on to the next step as the earlier worry is settled', () => {
    const { w, p } = evening('night-steps', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions[0].step).toMatch(/drink/);
    p.needs.thirst = 90; // they drank
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions[0].step, 'with the thirst gone, the shelter is what is left').toMatch(/stay at|get to/);
    expect(p.intentions[0].status).toBe('active');
  });

  it('is set aside by a wolf, says so, and is taken up again afterwards — without becoming a broken promise', () => {
    const { w, p } = evening('night-interrupt', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    expect(i.status).toBe('active');

    // a real danger the person can see
    const wolf = { id: 880001, kind: 'danger' as const, x: p.x + 3, y: p.y, amount: 1, max: 1, seen: w.tick, src: 'seen' as const, from: 0, learned: w.tick };
    putBelief(p, wolf);
    reviewIntentions(ctxFor(w, p));
    expect(i.status, 'a plan is not abandoned because something urgent happened').toBe('active');
    expect(i.blocked).toMatch(/wolf/);
    expect(i.reason).toMatch(/set aside/);
    expect(i.setAside).toBeGreaterThan(0);
    expect(p.commitments, 'a private plan is nobody else’s business: no promise was made or broken').toEqual([]);

    delBelief(p, wolf.id);
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('active');
    expect(i.blocked).toBe('');
    expect(i.reason).toBe('taken up again');
  });

  it('is given up with a reason once the night it was for has gone', () => {
    const { w, p } = evening('night-expire', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    w.tick = i.until + 1;
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('dropped');
    // A night plan's deadline is first light plus a little, so `until + 1` lands in the morning - and the morning judges the night
    // on how it went rather than on the clock (intent.ts reviewIntentions, the ordering contract). This person never sheltered, so
    // that is what it says. The deadline's own wording is still reached when nobody judges the night at all: see
    // "a night plan nobody ever judged does not hang about" below.
    expect(i.reason).toMatch(/passed without shelter/);
    expect(i.sheltered, 'and there was nothing to credit').toBe(0);
  });

  it('survives a save and reload, step and all', () => {
    const { w, p } = evening('night-save', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const before = { ...p.intentions[0] };
    const back = deserializeWorld(serializeWorld(w));
    const q = back.persons.find((x) => x.id === p.id)!;
    expect(q.intentions).toHaveLength(1);
    expect(q.intentions[0]).toEqual(before);
  });

  it('an older save with no plans at all loads, and nobody is left broken', () => {
    const { w, p } = evening('night-oldsave', 'rich', 0.7);
    // a save written before private plans existed: the column simply is not there
    const parsed = JSON.parse(serializeWorld(w)) as { world: { persons: { __cols?: string[]; d?: Record<string, unknown> } & Record<string, unknown> } };
    const ppl = parsed.world.persons;
    if (Array.isArray(ppl)) for (const q of ppl as unknown as Record<string, unknown>[]) delete q.intentions;
    else {
      ppl.__cols = (ppl.__cols ?? []).filter((c) => c !== 'intentions');
      delete ppl.d!.intentions;
    }
    const back = deserializeWorld(JSON.stringify(parsed));
    const q = back.persons.find((x) => x.id === p.id)!;
    expect(Array.isArray(q.intentions), 'the missing field becomes an empty list').toBe(true);
    expect(() => reviewIntentions(ctxFor(back, q))).not.toThrow();
  });
});

describe('waiting out the night is a real choice', () => {
  it('a rested person at night is offered shelter instead of only wandering', () => {
    const { w, p } = evening('night-rested', 'rich', 0.95, { energy: 98 });
    const offered = keys(w, p);
    expect(offered.some((k) => k.startsWith('shelter:')), `offered: ${offered.join(', ')}`).toBe(true);
    // and it is what they settle on, rather than walking about in the dark
    expect(offered[0].startsWith('shelter:') || offered[0].startsWith('sleep:'), `top choice was ${offered[0]}`).toBe(true);
  });

  it('the same rested person in an authored world is offered no such thing', () => {
    const { w, p } = evening('night-rested-authored', 'authored', 0.95, { energy: 98 });
    expect(keys(w, p).some((k) => k.startsWith('shelter:'))).toBe(false);
  });

  it('waiting is bounded by the light, never open-ended', () => {
    const { w, p } = evening('night-bounded', 'rich', 0.95, { energy: 98 });
    const o = rankOptions(ctxFor(w, p)).find((x) => x.key.startsWith('shelter:'))!;
    const act = o.make!()!;
    expect(act.amount).toBeGreaterThan(0);
    expect(act.amount, 'nobody waits longer than a bit over half a day').toBeLessThanOrEqual(Math.round(DAY * 0.55));
    expect(act.expire, 'and the activity itself has an end').toBeGreaterThan(w.tick);
  });

  it('a pressing need is never answered by sitting still', () => {
    const { w, p } = evening('night-urgent', 'rich', 0.95, { energy: 98, thirst: 8 });
    const offered = keys(w, p);
    expect(offered.some((k) => k.startsWith('shelter:')), `offered: ${offered.join(', ')}`).toBe(false);
  });
});

describe('a plan keeps its step in the running', () => {
  it('a step that scores poorly is still a candidate, while every hard filter still applies', () => {
    const { w, p } = evening('night-candidate', 'rich', 0.95, { energy: 98 });
    reviewIntentions(ctxFor(w, p));
    const ctx = ctxFor(w, p);
    reviewIntentions(ctx);
    const ranked = rankOptions(ctx);
    // the shelter option is on offer and the plan's nudge cannot have invented it: the engine generated it
    expect(ctx.options.some((o) => o.key.startsWith('shelter:'))).toBe(true);
    expect(ranked.some((o) => o.key.startsWith('shelter:'))).toBe(true);
  });
});

describe('finishing is judged on what was recorded, not on where they are standing', () => {
  /** a plan already under way, with the clock wound on to morning */
  function morningWith(seed: string, sheltered: number, needs: Partial<Record<'hunger' | 'thirst', number>> = {}) {
    const { w, p, home } = evening(seed, 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    i.sheltered = sheltered;
    Object.assign(p.needs, { thirst: 90, hunger: 90, ...needs });
    while (dayFraction(w.tick) < 0.34 || dayFraction(w.tick) > 0.36) w.tick++;
    return { w, p, i, home };
  }

  it('standing by a remembered shelter at dawn proves nothing on its own', () => {
    const { w, p, i } = morningWith('night-arrived-late', 0); // never actually sheltered
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('dropped');
    expect(i.reason).toMatch(/passed without shelter/);
  });

  it('a little shelter is not a night under shelter', () => {
    const { w, p, i } = morningWith('night-brief', 30);
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('dropped');
    expect(i.reason).toMatch(/mostly passed without it/);
  });

  it('sheltered but hungry at dawn is not the goal it set out to meet, and claims no more than dawn shows', () => {
    const { w, p, i } = morningWith('night-hungry', 600, { hunger: 20 });
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('dropped');
    expect(i.reason).toMatch(/still hungry at dawn/);
    expect(i.reason, 'morning hunger does not show how the whole night went').not.toMatch(/through the night/);
  });

  it('sheltered through the night, fed and watered, is done', () => {
    const { w, p, i } = morningWith('night-good', 600);
    reviewIntentions(ctxFor(w, p));
    expect(i.status).toBe('done');
    // says what was measured: time actually under shelter, and how they were by morning
    expect(i.reason).toMatch(/under shelter for 600 ticks/);
    expect(i.reason).toMatch(/fed and watered by morning/);
  });

  it('the shelter time comes from the activity itself, not from an assumption', () => {
    const { w, p, home } = evening('night-credit', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    p.needs.thirst = 90;
    reviewIntentions(ctxFor(w, p)); // step moves on to the shelter
    expect(i.stepTarget).toBe(home.id);
    expect(i.sheltered).toBe(0);
    creditShelter(p, home.id, 300);
    expect(i.sheltered, 'the rest activity credits what it really spent').toBe(300);
    // time spent resting somewhere else is not this plan's
    creditShelter(p, home.id + 999, 500);
    expect(i.sheltered).toBe(300);
  });

  it('a shelter that stops being one moves the step on and says so', () => {
    const { w, p, home } = evening('night-stale', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    p.needs.thirst = 90;
    reviewIntentions(ctxFor(w, p));
    expect(i.stepTarget).toBe(home.id);
    // they went, and found it gone: the belief is dropped, as the engine does on arrival
    delBelief(p, home.id);
    reviewIntentions(ctxFor(w, p));
    expect(i.stepTarget, 'it is no longer the target').not.toBe(home.id);
    expect(i.blocked).toMatch(/no shelter remembered/);
  });
});

describe('a plan helps only the step it is actually on', () => {
  it('an unrelated rest or another bed gets neither the nudge nor the exception', () => {
    const { w, p, home } = evening('night-serves', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    p.needs.thirst = 90;
    reviewIntentions(ctxFor(w, p));
    expect(i.stepKind).toMatch(/stay|goto/);
    expect(i.stepTarget).toBe(home.id);

    const at = (kind: 'rest' | 'sleep', targetId: number) => ({ kind, label: '', goal: '', need: null, util: 1, parts: [], eta: 0, key: `${kind}:${targetId}`, targetId }) as never;
    expect(servesIntent(i, at('rest', home.id)), 'the planned shelter does').toBe(true);
    expect(servesIntent(i, at('sleep', home.id)), 'sleeping at the same place does').toBe(true);
    expect(servesIntent(i, at('rest', 0)), 'resting just anywhere does not').toBe(false);
    expect(servesIntent(i, at('sleep', home.id + 123)), 'another bed does not').toBe(false);
    expect(intentBonus(i, at('rest', 0)), 'and gets no nudge').toBe(0);
    expect(intentBonus(i, at('rest', home.id))).toBeGreaterThan(0);
  });

  it('the wording of the step is not the contract: only its kind and place are', () => {
    const { w, p, home } = evening('night-wording', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    expect(i.stepKind).toBe('drink');
    i.step = 'stay at my lean-to until it is light'; // display text alone, deliberately misleading
    const rest = { kind: 'rest', label: '', goal: '', need: null, util: 1, parts: [], eta: 0, key: 'rest:0', targetId: home.id } as never;
    expect(servesIntent(i, rest), 'the words must not decide it').toBe(false);
  });
});

describe('children seek shelter without being given adult planning', () => {
  it('a child makes no plan of their own, but is still offered shelter at night', () => {
    const { w, p } = evening('night-child', 'rich', 0.95, { energy: 98 });
    // make them a child by the same rule the engine uses everywhere else
    p.birthTick = w.tick - Math.round(3 * 12 * DAY);
    expect(stageOf(w, p)).toBe('child');
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions, 'no adult planning').toEqual([]);
    expect(keys(w, p).some((k) => k.startsWith('shelter:')), 'but shelter is still theirs to take').toBe(true);
  });

  it('an adult in the same spot does make one', () => {
    const { w, p } = evening('night-adult', 'rich', 0.7, { thirst: 20 });
    expect(stageOf(w, p)).not.toBe('child');
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions).toHaveLength(1);
  });
});

describe('shelter time is earned by running the activity, not by being told about it', () => {
  /** an adult standing at their own lean-to, in the evening, with a plan already in hand */
  function atShelter(seed: string) {
    const { w, p, home } = evening(seed, 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(w, p));
    p.needs.thirst = 90; // the drink is seen to; the shelter is what is left
    p.x = home.x + 0.5;
    p.y = home.y + 0.5;
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    expect(i.aboutId, 'the plan knows which shelter it is about').toBe(home.id);
    expect(i.sheltered).toBe(0);
    return { w, p, home, i };
  }

  /** run one activity through its ordinary life: begin, work, end. Nothing here touches the plan. */
  function runActivity(w: ReturnType<typeof atShelter>['w'], p: ReturnType<typeof atShelter>['p'], act: ReturnType<typeof newActivity>, maxTicks = 900) {
    startActivity(w, p, act);
    for (let n = 0; n < maxTicks && p.activity === act; n++) stepWorld(w);
    return act;
  }

  it('SLEEPING at the shelter earns credit, as resting there does (the case that earned none)', () => {
    const sleep = atShelter('night-sleep-credit');
    runActivity(
      sleep.w,
      sleep.p,
      newActivity(sleep.w, sleep.p, { kind: 'sleep', label: 'Sleeping', goal: 'to rest', need: 'energy', here: true, targetId: sleep.home.id, amount: 400, minCommit: 50, maxTicks: 800 }),
    );
    expect(sleep.i.sheltered, 'a night asleep at the right place is time under shelter').toBeGreaterThan(0);

    const rest = atShelter('night-rest-credit');
    runActivity(
      rest.w,
      rest.p,
      newActivity(rest.w, rest.p, { kind: 'rest', label: 'Staying', goal: 'waiting for the light', need: 'warmth', here: true, targetId: rest.home.id, amount: 300, minCommit: 50, maxTicks: 800 }),
    );
    expect(rest.i.sheltered, 'and so is resting there').toBeGreaterThan(0);
  });

  it('time spent somewhere else earns this plan nothing', () => {
    const { w, p, home, i } = atShelter('night-elsewhere');
    runActivity(w, p, newActivity(w, p, { kind: 'sleep', label: 'Sleeping', goal: 'to rest', need: 'energy', here: true, targetId: home.id + 9999, amount: 300, minCommit: 50, maxTicks: 600 }));
    expect(i.sheltered).toBe(0);
  });

  it('a night broken in two is counted once, not lost and not doubled', () => {
    const { w, p, home, i } = atShelter('night-broken');
    const act = newActivity(w, p, { kind: 'rest', label: 'Staying', goal: 'waiting for the light', need: 'warmth', here: true, targetId: home.id, amount: 600, minCommit: 20, maxTicks: 1200 });
    startActivity(w, p, act);
    for (let n = 0; n < 120; n++) stepWorld(w);
    const worked = act.progress;
    expect(worked, 'some of the night has passed').toBeGreaterThan(0);

    suspendActivity(w, p); // something pulled them away
    const afterSuspend = i.sheltered;
    expect(afterSuspend, 'the stretch before the interruption is not lost').toBeGreaterThanOrEqual(worked);

    resumeSuspended(w, p);
    for (let n = 0; n < 400 && p.activity; n++) stepWorld(w);
    expect(i.sheltered, 'and the rest of it is added, not counted twice').toBeGreaterThanOrEqual(afterSuspend);
    expect(i.sheltered, 'never more than the night itself').toBeLessThanOrEqual(600 + worked + 5);
  });

  it('travelling to the shelter is not time spent in it', () => {
    const { w, p, home, i } = atShelter('night-travel');
    p.x = home.x + 9; // a walk away
    p.y = home.y + 9;
    const act = newActivity(w, p, { kind: 'rest', label: 'Staying', goal: 'waiting for the light', need: 'warmth', targetId: home.id, tx: home.x, ty: home.y, spotX: home.x + 0.5, spotY: home.y + 0.5, amount: 40, minCommit: 10, maxTicks: 600 });
    startActivity(w, p, act);
    for (let n = 0; n < 200 && p.activity === act && act.phase === 'travel'; n++) stepWorld(w);
    expect(i.sheltered, 'walking there earns nothing').toBe(0);
  });

  it('the whole thing end to end: a night is slept through and the morning assessment uses what was recorded', () => {
    const { w, p, home, i } = atShelter('night-end-to-end');
    runActivity(w, p, newActivity(w, p, { kind: 'sleep', label: 'Sleeping', goal: 'to rest', need: 'energy', here: true, targetId: home.id, amount: 700, minCommit: 60, maxTicks: 1400 }), 1400);
    const earned = i.sheltered;
    expect(earned, 'earned by running the activity, never by a direct call').toBeGreaterThan(0);

    // save and reload mid-plan: the credit and the shelter it is about come back
    const back = deserializeWorld(serializeWorld(w));
    const q = back.persons.find((x) => x.id === p.id)!;
    expect(q.intentions[0].sheltered).toBe(earned);
    expect(q.intentions[0].aboutId).toBe(home.id);

    // morning: the assessment reads the recorded time, not where they happen to be standing
    Object.assign(q.needs, { hunger: 90, thirst: 90 });
    while (dayFraction(back.tick) < 0.34 || dayFraction(back.tick) > 0.36) back.tick++;
    reviewIntentions(ctxFor(back, q));
    const done = q.intentions[0];
    if (earned >= 240) {
      expect(done.status).toBe('done');
      expect(done.reason).toContain(`under shelter for ${earned} ticks`);
    } else {
      expect(done.status).toBe('dropped');
      expect(done.reason).toMatch(/shelter/);
    }
  });
});

describe('a changed shelter is described for what it is', () => {
  it('finding the old one gone reads differently from simply choosing another', () => {
    const a = evening('night-gone', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(a.w, a.p));
    a.p.needs.thirst = 90;
    reviewIntentions(ctxFor(a.w, a.p));
    expect(a.p.intentions[0].aboutId).toBe(a.home.id);
    delBelief(a.p, a.home.id); // went there, found it gone
    const other = createBuilding(a.w, 'lean_to', 44, 40, a.p.hhId);
    observe(a.w, a.p, other);
    reviewIntentions(ctxFor(a.w, a.p));
    expect(a.p.intentions[0].reason).toMatch(/no longer one they know of/);

    const b = evening('night-nearer', 'rich', 0.7, { thirst: 20 });
    reviewIntentions(ctxFor(b.w, b.p));
    b.p.needs.thirst = 90;
    reviewIntentions(ctxFor(b.w, b.p));
    const nearer = createBuilding(b.w, 'lean_to', Math.round(b.p.x), Math.round(b.p.y), b.p.hhId);
    observe(b.w, b.p, nearer);
    reviewIntentions(ctxFor(b.w, b.p));
    if (b.p.intentions[0].aboutId !== b.home.id) {
      expect(b.p.intentions[0].reason, 'the old one is still known: this was a choice').toMatch(/settled on a different shelter/);
    }
  });
});

describe('a night really spent in shelter is the night the plan is judged on', () => {
  /**
   * F1: the `shelter:` option carried the shelter's id, but the activity its `make()` built did not, so `newActivity` defaulted the
   * target to 0 and `creditShelter` - which credits the plan the shelter BELONGS to - rejected every tick of it. An inhabitant could
   * stand under cover from dusk to dawn and have the plan record that the night passed without shelter.
   *
   * Nothing here is constructed by hand: the option comes from the option layer, the choice from `decide`, the activity from the
   * option's own `make()`, and the credit from the activity ending. The existing tests in this file credit `creditShelter` directly
   * or set `sheltered` on the plan, which is exactly why they could not see this.
   */
  it('the engine’s own shelter option makes an activity about that shelter, and its time is credited to the plan', () => {
    const { w, p, home } = evening('night-shelter-credit-f1', 'rich', 0.82, { warmth: 40 });
    expect(stageOf(w, p), 'an adult: children make no plans').toBe('adult');
    expect(p.needs.energy, 'rested, so this is waiting out the night and not sleeping').toBeGreaterThan(90);

    // an active night plan, whose step is to stay at the shelter it knows
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    expect(i, 'the evening and the cold raise a plan').toBeTruthy();
    expect(i.kind).toBe('night');
    expect(i.status).toBe('active');
    expect(i.stepKind).toBe('stay');
    expect(i.stepKey).toBe(`shelter:${home.id}`);
    expect(i.aboutId, 'and the plan is about that shelter').toBe(home.id);
    expect(i.sheltered).toBe(0);

    // the genuine option, and the engine's own choice among what it offers
    const ctx = ctxFor(w, p);
    expect(ctx.night, 'it is night by the person’s own reckoning').toBe(true);
    const offered = rankOptions(ctx);
    expect(offered.some((o) => o.key === `shelter:${home.id}`), `offered: ${offered.map((o) => o.key).join(', ')}`).toBe(true);
    decide(w, p, 'test');
    const a = p.activity;
    expect(a, 'the engine started something').toBeTruthy();
    expect(a!.data.optKey, `it chose “${a!.label}”`).toBe(`shelter:${home.id}`);
    expect(a!.kind).toBe('rest');
    expect(a!.targetId, 'the activity is about the shelter it is spent in (F1)').toBe(home.id);
    expect(a!.amount, 'and it is bounded by the light the person can see coming').toBeGreaterThan(240);

    // the night runs: nobody touches the plan's books but the activity itself
    const spent = until(w, 2600, () => i.status !== 'active' || (!p.activity && i.sheltered > 0));
    expect(spent, 'the night came to an end one way or another').toBeGreaterThanOrEqual(0);
    expect(i.sheltered, 'the hours really spent under cover are credited to the plan').toBeGreaterThanOrEqual(240);

    // and the morning says what happened, not the opposite of it
    const judged = until(w, 1200, () => i.status !== 'active');
    expect(judged).toBeGreaterThanOrEqual(0);
    expect(i.reason, `judged: ${i.status} — ${i.reason}`).not.toMatch(/passed without shelter/);
    expect(i.reason).not.toMatch(/mostly passed without it/);
    // judged at first light on what happened: a night under shelter, and needs still above the mark at that moment
    expect(i.status).toBe('done');
    expect(i.reason).toMatch(/under shelter for \d+ ticks of the night/);
    expect(i.reason).not.toMatch(/without shelter|has passed/);
  });

  it('the same seed spends the same night: the shelter credit is deterministic', () => {
    const run = () => {
      const { w, p, home } = evening('night-shelter-credit-f1', 'rich', 0.82, { warmth: 40 });
      reviewIntentions(ctxFor(w, p));
      const i = p.intentions[0];
      decide(w, p, 'test');
      const target = p.activity!.targetId;
      until(w, 2600, () => i.status !== 'active');
      return { target, home: home.id, sheltered: i.sheltered, status: i.status, reason: i.reason, hash: hashWorld(w), events: w.events.map((e) => e.text).join('|') };
    };
    const a = run();
    const b = run();
    expect(a.target).toBe(a.home);
    expect(a.sheltered).toBeGreaterThanOrEqual(240);
    expect(b, 'same seed, same night').toEqual(a);
  });

  it('an authored world never offers it, so nothing about this reaches authored behaviour', () => {
    const { w, p, home } = evening('night-shelter-credit-authored', 'authored', 0.82, { warmth: 40 });
    reviewIntentions(ctxFor(w, p));
    expect(p.intentions).toEqual([]);
    expect(rankOptions(ctxFor(w, p)).some((o) => o.key.startsWith('shelter:')), 'the option does not exist in an authored world').toBe(false);
    decide(w, p, 'test');
    expect(p.activity?.data.optKey ?? '', 'so nothing authored can be started by it').not.toMatch(/^shelter:/);
    void home;
  });
});

describe('the morning judges the night before any deadline does', () => {
  /**
   * The ordering contract in `reviewIntentions`: account for what the person is physically doing, conclude any plan whose moment of
   * judgement has come, and only then let a deadline end a plan that has no verdict of its own. A night plan's own deadline is first
   * light plus 240 ticks, so it always falls inside the morning window - which is why the order, not the boundary, was the defect.
   *
   * Every case below runs the real pathway: the engine's option, the engine's choice, the option's own activity, and credit that
   * arrives only from that activity. Nothing is asserted conditionally.
   */
  const judge = (w: World, p: Person, i: { status: string }, ticks = 3000) => until(w, ticks, () => i.status !== 'active');

  it('a night really spent under shelter, fed and watered, is done — judged at first light, before any deadline', () => {
    const { w, p, home } = evening('dawn-done', 'rich', 0.82, { warmth: 40, thirst: 100 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    expect(i.kind).toBe('night');
    const deadline = i.until;
    decide(w, p, 'test');
    expect(p.activity!.data.optKey).toBe(`shelter:${home.id}`);
    expect(p.activity!.targetId).toBe(home.id);

    expect(judge(w, p, i), 'the plan was concluded').toBeGreaterThanOrEqual(0);
    expect(i.sheltered, 'the whole night is credited').toBeGreaterThanOrEqual(240);
    // The verdict belongs to first light, not to whenever its owner next wondered about it, and so it beats the deadline outright.
    // (`i.ended` is the tick it was judged on; the loop above has since stepped the clock once more.)
    expect(dayFraction(i.ended), 'judged at first light').toBeCloseTo(0.25, 2);
    expect(i.ended, 'with the deadline still ahead of it').toBeLessThan(deadline);
    expect(i.ended).toBe(w.tick - 1);
    expect(i.status).toBe('done');
    expect(i.reason).toMatch(/under shelter for \d+ ticks of the night, fed and watered by morning/);
    expect(i.reason).not.toMatch(/has passed/);
    expect(p.needs.thirst, 'and the conditions it claims were really met').toBeGreaterThanOrEqual(42);
    expect(p.needs.hunger).toBeGreaterThanOrEqual(42);
  });

  it('a night mostly spent out of shelter says so, with the hours it did manage', () => {
    const { w, p, home } = evening('dawn-short', 'rich', 0.82, { warmth: 40, thirst: 100 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    decide(w, p, 'test');
    expect(p.activity!.data.optKey).toBe(`shelter:${home.id}`);

    // a wolf comes by after a little while, and the stay is broken off through the engine's own interruption path, which is where
    // the hours actually spent are credited (activities.ts abortActivity -> endActivity -> creditShelterFrom)
    for (let n = 0; n < 120; n++) stepWorld(w);
    putBelief(p, { id: 980001, kind: 'danger', x: p.x + 2, y: p.y, amount: 1, max: 1, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
    expect(p.activity?.data.optKey, 'still at the shelter when the wolf turns up').toBe(`shelter:${home.id}`);
    abortActivity(w, p, 'a wolf came by');
    expect(i.sheltered, 'some of the night was spent under cover').toBeGreaterThan(0);
    expect(i.sheltered, 'but not enough of it').toBeLessThan(240);
    // the shelter is gone from what they know, so the night cannot be made good
    delBelief(p, home.id);

    // morning comes, and the verdict is about the night, not about the clock
    while (dayFraction(w.tick) < 0.3 || dayFraction(w.tick) > 0.45) w.tick++;
    decide(w, p, 'morning');
    expect(i.status).toBe('dropped');
    expect(i.reason).toMatch(/only \d+ ticks under shelter; the night mostly passed without it/);
  });

  it('a night under shelter that still left them thirsty says that, and not that the night passed without shelter', () => {
    const { w, p, home } = evening('dawn-thirsty', 'rich', 0.82, { warmth: 40, thirst: 80 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    decide(w, p, 'test');
    expect(p.activity!.data.optKey).toBe(`shelter:${home.id}`);
    expect(judge(w, p, i)).toBeGreaterThanOrEqual(0);
    expect(i.sheltered).toBeGreaterThanOrEqual(240);
    expect(i.status).toBe('dropped');
    expect(i.reason).toMatch(/sheltered, but still (thirsty|hungry|hungry and thirsty) at dawn/);
    expect(i.reason).not.toMatch(/without shelter|has passed/);
  });

  it('a night plan nobody ever judged does not hang about: the deadline still ends it', () => {
    const { w, p } = evening('dawn-expired', 'rich', 0.82, { warmth: 40, thirst: 100 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    expect(i.status).toBe('active');
    // nothing is judged while nobody decides: the clock runs past first light, past the deadline, and out of the morning altogether
    while (w.tick <= i.until || dayFraction(w.tick) < 0.63 || dayFraction(w.tick) > 0.67) w.tick++;
    expect(w.tick, 'the deadline is well behind us').toBeGreaterThan(i.until);
    expect(dayFraction(w.tick), 'and the morning in which it could have been judged is over').toBeGreaterThan(0.6);
    decide(w, p, 'later that day');
    expect(i.status, 'it does not stay active for ever').toBe('dropped');
    expect(i.reason).toBe('the night it was for has passed');
  });

  it('a project deadline is untouched by the reordering: it still ends with its own reason', () => {
    const { w, p } = evening('dawn-project', 'rich', 0.40, { warmth: 95, thirst: 95, hunger: 95 });
    // a project of their own, which keeps its own deadline inside projectOutcome
    p.stats.gathered = 12;
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions.find((x) => x.kind === 'tool');
    expect(i, 'a tool project was taken on').toBeTruthy();
    w.tick = i!.until + 1;
    reviewIntentions(ctxFor(w, p));
    expect(i!.status).toBe('dropped');
    expect(i!.reason, 'the project says what was missing, not that a night passed').toMatch(/never got round to|had the makings/);
  });

  it('the same seed spends and judges the same night', () => {
    const once = () => {
      const { w, p, home } = evening('dawn-replay', 'rich', 0.82, { warmth: 40, thirst: 100 });
      reviewIntentions(ctxFor(w, p));
      const i = p.intentions[0];
      decide(w, p, 'test');
      const target = p.activity!.targetId;
      until(w, 3000, () => i.status !== 'active');
      return { home: home.id, target, sheltered: i.sheltered, status: i.status, reason: i.reason, ended: i.ended, hash: hashWorld(w), events: w.events.map((e) => `${e.tick}:${e.text}`).join('|'), log: p.log.map((l) => l.text).join('|') };
    };
    const a = once();
    const b = once();
    expect(a.target).toBe(a.home);
    expect(a.status).toBe('done');
    expect(b, 'identical events, intention state and outcome').toEqual(a);
  });
});

describe('a night’s verdict does not depend on when its owner next thinks', () => {
  /**
   * `reviewIntentions` runs from `decide`, and when somebody next decides depends on `p.nextThink` - which carries a jitter drawn
   * from their own id (`decision.ts reviewActivity`). So the same night could be judged at different moments for different people,
   * or not at all while an activity ran. The world now settles what has become due in its own person phase (world.ts stepPerson ->
   * intent.ts settleIntentions), so the verdict belongs to the moment it fell due.
   */
  it('two inhabitants with the same night and different thinking schedules get the same verdict at the same moment', () => {
    const made: { ended: number; status: string; reason: string; sheltered: number; frac: number }[] = [];
    for (const shift of [0, 7, 19, 31]) {
      const { w, p, home } = evening(`independence-${shift}`, 'rich', 0.82, { warmth: 40, thirst: 100 });
      reviewIntentions(ctxFor(w, p));
      const i = p.intentions[0];
      decide(w, p, 'test');
      expect(p.activity!.data.optKey, 'the same physical night in every run').toBe(`shelter:${home.id}`);
      const since = w.tick;
      // the only difference between the runs: how long after the night this person would next think about anything
      p.nextThink = w.tick + 1041 + shift;
      until(w, 3000, () => i.status !== 'active');
      made.push({ ended: i.ended - since, status: i.status, reason: i.reason, sheltered: i.sheltered, frac: Math.round(dayFraction(i.ended) * 1000) / 1000 });
    }
    expect(made[0].status).toBe('done');
    expect(made[0].sheltered).toBeGreaterThanOrEqual(240);
    for (const m of made.slice(1)) expect(m, `schedules differ, verdicts must not: ${JSON.stringify(made)}`).toEqual(made[0]);
  });

  it('a plan is concluded with no new decision at all: the world does it', () => {
    const { w, p, home } = evening('independence-nothink', 'rich', 0.82, { warmth: 40, thirst: 100 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    decide(w, p, 'test');
    const a = p.activity!;
    expect(a.data.optKey).toBe(`shelter:${home.id}`);
    const decidedAt = p.lastDecision?.tick ?? -1;
    // They sit on past first light (an activity that ends schedules a decision at once - activities.ts endActivity - so a stay that
    // outlasts the night is the only way to have nobody decide anything), and they will not think again for a very long time.
    a.amount = 4000;
    a.duration = 4000;
    p.nextThink = w.tick + 100000;
    expect(until(w, 3000, () => i.status !== 'active'), 'the night was judged').toBeGreaterThanOrEqual(0);
    expect(i.status).toBe('done');
    expect(i.sheltered).toBeGreaterThanOrEqual(240);
    expect(p.activity, 'still sitting there, having decided nothing').toBe(a);
    expect(p.lastDecision?.tick ?? -1, 'and not one new decision was taken to do it').toBe(decidedAt);
    void home;
  });

  it('a stay still under way at first light is judged on the hours it has actually sat through', () => {
    const { w, p, home } = evening('independence-inflight', 'rich', 0.82, { warmth: 40, thirst: 100 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    decide(w, p, 'test');
    const a = p.activity!;
    expect(a.data.optKey).toBe(`shelter:${home.id}`);
    // make the stay outlast the night, so at first light it is still running and its hours are still in the activity
    a.amount = 4000;
    a.duration = 4000;
    p.nextThink = w.tick + 100000;
    expect(until(w, 3000, () => i.status !== 'active')).toBeGreaterThanOrEqual(0);
    expect(p.activity, 'they are still sitting there').toBe(a);
    expect(a.progress, 'with the hours still on the activity').toBeGreaterThan(240);
    expect(i.sheltered, 'and those hours counted for the plan').toBeGreaterThanOrEqual(240);
    expect(i.status).toBe('done');
    // nothing was counted twice: the plan's credit is what the activity had actually sat through
    expect(i.sheltered).toBeLessThanOrEqual(a.progress + 1);
  });

  it('dying in the night invents no shelter, and a corpse is not judged', () => {
    const { w, p, home } = evening('independence-death', 'rich', 0.82, { warmth: 40, thirst: 100 });
    reviewIntentions(ctxFor(w, p));
    const i = p.intentions[0];
    decide(w, p, 'test');
    expect(p.activity!.data.optKey).toBe(`shelter:${home.id}`);
    for (let n = 0; n < 150; n++) stepWorld(w);
    const sheltered = i.sheltered;
    killPerson(w, p, 'test');
    const credited = i.sheltered;
    expect(credited, 'what they really sat through is credited when the activity ends').toBeGreaterThanOrEqual(sheltered);
    // the plan ends with them, saying so, and claiming nothing
    expect(i.status).toBe('dropped');
    expect(i.reason).toBe('they died');
    expect(i.wants, 'and what it was saving is material again').toEqual({});
    expect(i.step).toBe('');
    // the night runs on without them
    for (let n = 0; n < 2000; n++) stepWorld(w);
    expect(p.alive).toBe(false);
    expect(i.sheltered, 'nothing accrues to the dead').toBe(credited);
    expect(i.status, 'and no verdict is ever passed on a corpse’s plan').toBe('dropped');
    expect(i.reason).toBe('they died');
    expect(p.intentions.filter((x) => x.status === 'active'), 'no live plan is left on them').toHaveLength(0);
    void home;
  });
});
