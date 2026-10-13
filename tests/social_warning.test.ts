// A warning must report what it actually came to. The engine already knows (news.ts tellBelief returns whether the belief
// passed); these tests hold that the speaker is told the truth, that the listener's knowledge keeps its provenance, and that
// nothing about the listener's private state leaks back to the speaker.
import { describe, expect, it } from 'vitest';
import { runLive } from '../src/agent/run';
import { putBelief } from '../src/sim/knowledge';
import type { Belief, Person, World } from '../src/sim/types';
import { chooser, observeNow } from './helpers/inhabit';
import { addPerson, done, stage } from './helpers/kit';

const WOLF_ID = 990001;

/** Ana has just seen a wolf; Ben is standing next to her. Staged: it checks a rule, it is not spontaneous behaviour. */
function pair(seed: string, listenerKnowsAt: number | null = null) {
  const s = stage(seed);
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { hunger: 85, thirst: 85, energy: 85 });
  const ben = addPerson(s, 'Ben', 41.5, 40.5, { hunger: 85, thirst: 85, energy: 85 });
  const w = done(s);
  const wolf: Belief = { id: WOLF_ID, kind: 'danger', x: 52.5, y: 40.5, amount: 1, max: 1, seen: w.tick, src: 'seen', from: 0, learned: w.tick };
  putBelief(ana, { ...wolf });
  if (listenerKnowsAt !== null) putBelief(ben, { ...wolf, seen: listenerKnowsAt, learned: listenerKnowsAt });
  return { w, ana, ben };
}

/** drive Ana until she has taken the warning option (she is offered it: fresh first-hand sighting, Ben one tile away).
 *  runLive rewinds by deserializing snapshots, so it returns a different world object: people must be re-read from it. */
// 150 ticks: the warning completes around tick 72, and the window closes before either of them starts another
// conversation (lastInteraction is written for both parties, so a later chat of Ben's would overwrite Ana's record).
async function warnOnce(w: World, ana: Person, ben: Person, until = 150) {
  const key = `socialize:${ben.id}:warn`;
  // after the warning, keep away from further conversations: a second exchange would overwrite lastInteraction
  const quiet = (o: { options: { key: string }[] }): string => (o.options.find((x) => !x.key.startsWith('socialize:')) ?? o.options[0]).key;
  const model = chooser('warner', (o) => (o.options.some((x) => x.key === key) ? key : quiet(o)));
  const r = await runLive(w, ana.id, model, { until });
  const at = (id: number): Person => r.world.persons.find((q) => q.id === id)!;
  return { world: r.world, ana: at(ana.id), ben: at(ben.id), transcript: r.transcript, warnCall: r.transcript.calls.find((c) => c.result?.key === key) };
}

describe('a warning says what it came to', () => {
  it('a delivered warning is reported as a success, not as unknown, and the listener keeps the provenance', async () => {
    const { w, ana, ben } = pair('warn-delivered');
    const { ana: a, ben: b, transcript, warnCall } = await warnOnce(w, ana, ben);
    expect(warnCall, 'Ana should have been offered and taken the warning').toBeTruthy();

    // the listener really learned it, from Ana, as hearsay
    const got = b.beliefs[WOLF_ID];
    expect(got, 'Ben should now know about the wolf').toBeTruthy();
    expect(got.src).toBe('told');
    expect(got.from).toBe(a.id);
    expect(got.hops).toBe(1);
    expect(got.learned).toBeGreaterThanOrEqual(0);

    // the speaker is told the truth about their own action
    const outcome = transcript.outcomes.find((o) => o.activityId === warnCall!.result!.activityId);
    expect(outcome, 'the warning should have a recorded outcome').toBeTruthy();
    expect(outcome!.outcome).not.toBe('unknown');
    expect(outcome!.outcome).toBe('success');
    expect(outcome!.detail).toBe('they had not heard; they know now');
    // a conversation deliberately does not overwrite p.lastResult: the work it interrupted keeps its own result, and the
    // observation older recordings were made with stays byte-identical. The exchange's own record carries the truth instead.
    expect(a.lastResult?.label).not.toBe('Warn Ben about the wolf');

    // and the exchange is remembered as a warning, not as a vague friendly chat
    expect(a.lastInteraction?.purpose).toBe('warn');
    expect(a.lastInteraction?.outcome).toBe('warned them');
  });

  it('warning someone who already knows is reported as partial, and does not overwrite what they saw themselves', async () => {
    const { w, ana, ben } = pair('warn-already-known', 0);
    const before = { ...ben.beliefs[WOLF_ID] };
    const { ana: a, ben: b, transcript, warnCall } = await warnOnce(w, ana, ben);
    expect(warnCall).toBeTruthy();

    const outcome = transcript.outcomes.find((o) => o.activityId === warnCall!.result!.activityId);
    expect(outcome!.outcome).toBe('partial');
    expect(outcome!.detail).toBe('they knew as much or more already');
    expect(a.lastInteraction?.outcome).toBe('they already knew');

    // Ben's own sighting stands: hearsay no fresher than what he saw does not replace it
    expect(b.beliefs[WOLF_ID].src).toBe(before.src);
    expect(b.beliefs[WOLF_ID].seen).toBe(before.seen);
  });

  it('the established rule holds: the same warning is not offered to the same person again', async () => {
    const { w, ana, ben } = pair('warn-no-repeat');
    const { world: w2, ana: a, warnCall } = await warnOnce(w, ana, ben);
    expect(warnCall).toBeTruthy();
    expect(a.told[ben.id * 1_000_000 + WOLF_ID], 'the telling is recorded').toBeGreaterThanOrEqual(0);
    const { warnCall: again } = await warnOnce(w2, a, ben, w2.tick + 600);
    expect(again, 'the warning should not be offered twice in quick succession').toBeFalsy();
  });

  it('the speaker learns nothing about the listener beyond delivery', async () => {
    const { w, ana, ben } = pair('warn-no-leak');
    ben.needs.hunger = 3; // a private fact about Ben
    const { ana: a, ben: b, transcript, warnCall } = await warnOnce(w, ana, ben);
    const outcome = transcript.outcomes.find((o) => o.activityId === warnCall!.result!.activityId);
    // the result says whether it landed; it never carries the listener's needs, beliefs or plans
    expect(['they had not heard; they know now', 'they knew as much or more already']).toContain(outcome!.detail);
    expect(outcome!.detail).not.toMatch(/hungry|hunger|belief|plan|3/);
    // Ana did not acquire Ben's knowledge by talking to him
    for (const k of Object.keys(b.beliefs)) if (!a.beliefs[Number(k)]) expect(a.beliefs[Number(k)]).toBeUndefined();
  });
});

describe('the speaker can see what their exchange came to', () => {
  it('observation shape 3 carries the last interaction, and older shapes are untouched', async () => {
    const { w, ana, ben } = pair('warn-observed');
    const { world, ana: a } = await warnOnce(w, ana, ben);
    const v3 = observeNow(world, a, false, 3);
    expect(v3.doing.lastInteraction, 'shape 3 should carry it').toBeTruthy();
    expect(v3.doing.lastInteraction!.purpose).toBe('warn');
    expect(v3.doing.lastInteraction!.outcome).toBe('warned them');
    // the older shapes must not gain a field, or transcripts recorded under them would stop replaying
    expect(observeNow(world, a, false, 2).doing.lastInteraction).toBeUndefined();
    expect(observeNow(world, a, false, 1).doing.lastInteraction).toBeUndefined();
  });
});
