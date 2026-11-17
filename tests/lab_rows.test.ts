// Stage 1c step 2 of the plan of 17 November 2026: the lab rows added to LifeTally (scripts/lab/lab.ts). They are read only. STAGED tests feed
// the tally worlds built by hand, so each row is checked against what it was given; one RUN test checks the rows against DayShape's own
// totals on the same ticks (the observers and the lab must say the same thing about the same world).
import { describe, expect, it } from 'vitest';
import { LifeTally, METRICS, outcomeOf } from '../scripts/lab/lab';
import { DayShape } from '../scripts/observers/day_shape';
import { newActivity } from '../src/sim/activities';
import { makeSheep } from '../src/sim/livestock';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { foodUnits } from '../src/sim/economy';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, stage } from './helpers/kit';
import type { Conversation, Person, World } from '../src/sim/types';

const NEW_ROWS = [
  'companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12',
  'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare',
  'sheepAcquired', 'sheepShorn', 'sheepSlaughtered', 'lambsBorn', 'sheepAtEnd', 'sheepKeptAtEnd', 'plotsRested', 'plotsRestingAtEnd',
  'workNotesKept', 'workTakenUp', 'workNotesSpent',
  'techLessonsLearned', 'techLessonsInterrupted', 'techLessonsDeclined',
  'exchangeJourneysStarted', 'exchangeJourneysArrived', 'exchangeJourneysFulfilled',
];

function scene() {
  const s = stage('lab-rows');
  const ann = addPerson(s, 'Ann', 40.5, 40.5, { age: 30, hunger: 30, inv: { berries: 2 } });
  const bob = addPerson(s, 'Bob', 44.5, 40.5, { age: 30, hunger: 30 });
  const cat = addPerson(s, 'Cat', 48.5, 40.5, { age: 30, hunger: 30 });
  const dan = addPerson(s, 'Dan', 52.5, 40.5, { age: 8, hunger: 30 });
  const eve = addPerson(s, 'Eve', 56.5, 40.5, { age: 30, hunger: 30 });
  const bobHut = building(s, 'hut', 44, 44, bob.hhId, { berries: 3 });
  const catHut = building(s, 'hut', 48, 44, cat.hhId);
  const w = done(s);
  w.households.find((h) => h.id === bob.hhId)!.homeId = bobHut.id;
  w.households.find((h) => h.id === cat.hhId)!.homeId = catHut.id;
  return { w, ann, bob, cat, dan, eve };
}
const act = (w: World, p: Person, kind: string, phase: 'travel' | 'work', data: Record<string, unknown> = {}) => {
  const a = newActivity(w, p, { kind: kind as never, label: kind, goal: 'staged', here: true, data });
  a.phase = phase;
  p.activity = a;
  return a;
};

describe('the stage 1c lab rows', () => {
  it('are named in the metric list, and outcomeOf returns every one as a finite number', () => {
    for (const m of NEW_ROWS) expect(METRICS as readonly string[], m).toContain(m);
    const { w } = scene();
    const life = new LifeTally();
    life.tick(w);
    const { outcome } = outcomeOf(w, 0, w.tick, undefined, undefined, undefined, undefined, life);
    for (const m of METRICS) expect(Number.isFinite(outcome[m]), m).toBe(true);
  });

  it('split hungry time by food to hand: pack, home store only, neither; a sleeper is not counted; the three add to hungryTicks', () => {
    const { w, ann, bob, cat, dan, eve } = scene();
    expect(foodUnits(ann.inv)).toBeGreaterThan(0);
    eve.pose = 'sleep';
    dan.needs.hunger = 30;
    const life = new LifeTally();
    life.tick(w);
    expect(life.awakeTicks).toBe(4); // Ann, Bob, Cat, Dan; Eve sleeps
    expect(life.hungryTicks).toBe(4);
    expect(life.hungryPack).toBe(1); // Ann
    expect(life.hungryStoreOnly).toBe(1); // Bob: empty pack, berries in his home store
    expect(life.hungryNoFood).toBe(2); // Cat (empty home store) and Dan (no home building)
    expect(life.hungryPack + life.hungryStoreOnly + life.hungryNoFood).toBe(life.hungryTicks);
    expect(life.hungryPackShare + life.hungryStoreOnlyShare + life.hungryNoFoodShare).toBeCloseTo(life.hungryShare, 3);
    // a person who is not hungry is in no cell
    ann.needs.hunger = 90; bob.needs.hunger = 90;
    life.tick(w);
    expect(life.hungryPack).toBe(1);
    expect(life.hungryStoreOnly).toBe(1);
    expect(life.hungryNoFood).toBe(4);
    expect(life.hungryTicks).toBe(6);
  });

  it('measure company, leisure and walking over the waking time of people 12 and over only', () => {
    const { w, ann, bob, cat, dan, eve } = scene();
    act(w, ann, 'converse', 'work');
    act(w, bob, 'wander', 'work');
    act(w, cat, 'gather', 'travel');
    act(w, dan, 'wander', 'work'); // a child: awake, in leisure, and in nobody's yardstick
    eve.pose = 'sleep'; act(w, eve, 'converse', 'work'); // asleep: out of waking time whatever her activity says
    const life = new LifeTally();
    life.tick(w);
    expect(life.awake12).toBe(3);
    expect([life.company12, life.leisure12, life.travel12]).toEqual([1, 1, 1]);
    expect(life.companyShare12).toBeCloseTo(1 / 3, 4);
    expect(life.companyLeisureShare12).toBeCloseTo(2 / 3, 4);
    expect(life.walkingShare12).toBeCloseTo(1 / 3, 4);
    expect(life.awakeTicks).toBe(4);
  });

  it('count sheep jobs that finished, lambs once, plots rested, lessons by how they last stood, and journeys by how far they got', () => {
    const { w, ann } = scene();
    const life = new LifeTally();
    const job = (kind: string, data: Record<string, unknown>) => newActivity(w, ann, { kind: kind as never, label: kind, goal: 'staged', here: true, data });
    life.end(w, ann, job('animal_work', { op: 'acquire' }), 'success');
    life.end(w, ann, job('animal_work', { op: 'shear' }), 'success');
    life.end(w, ann, job('animal_work', { op: 'shear' }), 'success');
    life.end(w, ann, job('animal_work', { op: 'shear' }), 'failed'); // a job that did not finish is not a firing
    life.end(w, ann, job('animal_work', { op: 'slaughter' }), 'success');
    life.end(w, ann, job('tend', { ecologyRest: true }), 'success');
    life.end(w, ann, job('tend', {}), 'success'); // an ordinary tend is not a rested plot
    life.end(w, ann, job('tend', { ecologyRest: true }), 'interrupted');
    expect([life.sheepAcquired, life.sheepShorn, life.sheepSlaughtered, life.plotsRested]).toEqual([1, 2, 1, 1]);

    makeSheep(w, 30.5, 30.5, 'f'); // a founder
    makeSheep(w, 31.5, 30.5, 'f', [1, 2]); // a lamb
    life.tick(w); life.tick(w);
    expect(life.lambsBorn).toBe(1);

    const conv = (outcome: Conversation['lesson'] extends infer L ? (L extends { outcome: infer O } ? O : never) : never) => {
      const c = { id: w.nextId++, a: 1, b: 2, purpose: 'teach_technique', start: w.tick, phase: 0, nextAt: w.tick, end: 0, requestId: 0, data: {}, lesson: { since: 0, until: 0, outcome, reason: '' } } as unknown as Conversation;
      w.conversations.push(c);
      return c;
    };
    const first = conv('learning');
    conv('declined'); conv('interrupted'); conv('learned');
    life.tick(w);
    expect([life.techLessonsLearned, life.techLessonsInterrupted, life.techLessonsDeclined]).toEqual([1, 1, 1]);
    first.lesson!.outcome = 'learned';
    life.tick(w);
    expect(life.techLessonsLearned).toBe(2); // the same lesson is counted once, as it last stood

    const journey = (id: number, status: string) => ({ id, started: 0, fromTown: 1, lead: {}, item: 'wood', amount: 1, offer: 'grain', offerAmount: 1, status, outcome: '' });
    const journeys = [journey(901, 'travelling'), journey(902, 'travelling')];
    ann.exchangeJourneys = journeys as never;
    life.tick(w);
    expect([life.exchangeJourneysStarted, life.exchangeJourneysArrived, life.exchangeJourneysFulfilled]).toEqual([2, 0, 0]);
    journeys[0].status = 'talking';
    life.tick(w);
    journeys[0].status = 'fulfilled';
    journeys[1].status = 'failed';
    life.tick(w);
    expect([life.exchangeJourneysStarted, life.exchangeJourneysArrived, life.exchangeJourneysFulfilled]).toEqual([2, 1, 1]);
  });

  it('count a held piece of work kept, then taken up or spent; a note of one tick is not counted', () => {
    const { w, ann, bob, cat } = scene();
    const life = new LifeTally();
    const note = (progress: number) => ({ progress, pprogress: 0, duration: 100, x: 40, y: 40 });
    const a = act(w, ann, 'gather', 'travel'); a.data.kept = note(5);
    const b = act(w, bob, 'gather', 'travel'); b.data.kept = note(7);
    const c = act(w, cat, 'gather', 'travel'); c.data.kept = note(1);
    life.tick(w);
    expect(life.workNotesKept).toBe(2);
    // Ann's count is put back (progress at least what was kept); Bob's note is spent (the work starts again from nothing)
    delete a.data.kept; a.phase = 'work'; a.progress = 6;
    delete b.data.kept; b.phase = 'work'; b.progress = 0;
    delete c.data.kept; c.phase = 'work'; c.progress = 1;
    life.tick(w);
    expect([life.workNotesKept, life.workTakenUp, life.workNotesSpent]).toEqual([2, 1, 1]);
    life.tick(w);
    expect([life.workNotesKept, life.workTakenUp, life.workNotesSpent]).toEqual([2, 1, 1]); // each note is settled once
  });

  it('agree with DayShape on a run: same waking time, same hungry cells, same company, leisure and walking for people 12 and over', () => {
    const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
    const day = new DayShape();
    const life = new LifeTally();
    for (let n = 0; n < 3000; n++) {
      // both read the same state of the world: before the step
      day.sampleTick(w); life.tick(w);
      stepWorld(w);
    }
    const d: any = day.report();
    const rows: { packFood: string; homeStoreFood: string; ticks: number }[] = d.hungryTime.crossTab;
    const sum = (f: (r: { packFood: string; homeStoreFood: string }) => boolean) => rows.filter(f).reduce((n, r) => n + r.ticks, 0);
    expect(life.awakeTicks).toBe(d.hungryTime.wakingTicks);
    expect(life.hungryTicks).toBe(d.hungryTime.hungryWakingTicks);
    expect(life.hungryTicks).toBeGreaterThan(0);
    expect(life.hungryPack).toBe(sum((r) => r.packFood === 'food'));
    expect(life.hungryStoreOnly).toBe(sum((r) => r.packFood === 'none' && r.homeStoreFood === 'food'));
    expect(life.hungryNoFood).toBe(sum((r) => r.packFood === 'none' && r.homeStoreFood !== 'food'));
    const grown = (cat?: string) => d.hungryTime.wakingByHunger.filter((r: any) => r.stage === '12_and_over' && (!cat || r.category === cat)).reduce((n: number, r: any) => n + r.ticks, 0);
    expect(life.awake12).toBe(grown());
    expect(life.company12).toBe(grown('social_contact'));
    expect(life.leisure12).toBe(grown('leisure'));
    expect(life.travel12).toBe(grown('travel'));
    expect(life.awake12).toBeGreaterThan(0);
  }, 240000);
});
