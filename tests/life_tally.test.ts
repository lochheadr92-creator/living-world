// The lab's counters for the life stream (scripts/lab/lab.ts LifeTally): observation only, never read by the simulation. STAGED: the
// tally is fed activity ends, conversations, occasions and events by hand, so each counter is checked against what it was given.
import { describe, expect, it } from 'vitest';
import { LifeTally, METRICS } from '../scripts/lab/lab';
import { newActivity } from '../src/sim/activities';
import { addEvent } from '../src/sim/events';
import { addPerson, building, done, stage } from './helpers/kit';
import type { Conversation, World } from '../src/sim/types';

function scene() {
  const s = stage('life-tally');
  const ann = addPerson(s, 'Ann', 40.5, 40.5, { age: 30 });
  const yard = building(s, 'timber_yard', 50, 40, ann.hhId);
  const kiln = building(s, 'kiln', 56, 40, ann.hhId);
  const w = done(s);
  return { w, ann, yard, kiln };
}
const talk = (w: World, purpose: Conversation['purpose']): void => { w.conversations.push({ id: w.nextId++, a: 1, b: 2, purpose, start: w.tick, phase: 0, nextAt: w.tick, end: 0, requestId: 0, data: {} } as Conversation); };

describe('the life-stream counters', () => {
  it('are named in the metric list', () => {
    for (const m of ['approachesFailed', 'approachFailShare', 'tradeTalk', 'marketsCalled', 'apprenticesAtEnd', 'fireOuts', 'fireFeeds', 'yardJobs', 'sharedYardsAtEnd']) expect(METRICS as readonly string[]).toContain(m);
  });

  it('an approach that ends is a failed approach, whatever its outcome; the share is of failed approaches plus conversations opened', () => {
    const { w, ann } = scene();
    const life = new LifeTally();
    const approach = () => newActivity(w, ann, { kind: 'socialize', label: 'Chat', goal: 'staged', here: true });
    life.end(w, ann, approach(), 'failed');
    life.end(w, ann, approach(), 'interrupted');
    expect(life.approachesFailed).toBe(2);
    talk(w, 'chat'); talk(w, 'trade'); talk(w, 'play_together'); talk(w, 'trade');
    life.tick(w);
    life.tick(w); // the same conversations are not counted twice
    expect(life.tradeTalk).toBe(2);
    expect(life.chats).toBe(1);
    expect(life.otherTalk).toBe(2); // trade is still inside otherTalk, as in older rows
    expect(life.approachFailShare).toBeCloseTo(2 / 6, 4);
  });

  it('counts a fire fed, a job finished at a timber yard but not one at a kiln, and only successes', () => {
    const { w, ann, yard, kiln } = scene();
    const life = new LifeTally();
    const act = (kind: 'fuel_fire' | 'operate', targetId = 0) => newActivity(w, ann, { kind, label: 'staged', goal: 'staged', here: true, targetId });
    life.end(w, ann, act('fuel_fire'), 'success');
    life.end(w, ann, act('fuel_fire'), 'failed');
    life.end(w, ann, act('operate', yard.id), 'success');
    life.end(w, ann, act('operate', yard.id), 'partial');
    life.end(w, ann, act('operate', kiln.id), 'success');
    expect(life.fireFeeds).toBe(1);
    expect(life.yardJobs).toBe(1);
    expect(life.approachesFailed).toBe(0);
  });

  it('counts each time the fire goes out once, across ticks, and each market once', () => {
    const { w } = scene();
    const life = new LifeTally();
    addEvent(w, 'survival', 'The fire has gone out.');
    addEvent(w, 'nature', 'Rain begins to fall.');
    life.tick(w);
    life.tick(w);
    expect(life.fireOuts).toBe(1);
    addEvent(w, 'survival', 'The fire has gone out.');
    addEvent(w, 'survival', 'The fire has gone out.');
    life.tick(w);
    expect(life.fireOuts).toBe(3);
    w.occasions = [{ id: 901, kind: 'market' }, { id: 902, kind: 'harvest' }] as World['occasions'];
    life.tick(w);
    w.occasions!.push({ id: 903, kind: 'market' } as NonNullable<World['occasions']>[number]);
    life.tick(w);
    expect(life.marketsCalled).toBe(2);
  });
});
