import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { TimeBudget, timeCategory } from '../scripts/observers/time_budget';
import { newActivity, startActivity, endActivity } from '../src/sim/activities';
import { stage, addPerson, done, pin } from './helpers/kit';

it('partitions start-of-tick living time and leaves the full ordinary continuation and RNG unchanged', () => {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const twin = deserializeWorld(serializeWorld(w)), observer = new TimeBudget();
  const detach = observer.attach(w);
  let denominator = 0;
  for (let n = 0; n < 360; n++) {
    denominator += w.persons.filter(p => p.alive).length;
    observer.sampleTick(w);
    if (n % 120 === 0) observer.samplePlans(w);
    stepWorld(w); stepWorld(twin);
  }
  detach();
  expect(observer.livingTicks).toBe(denominator);
  expect(Object.values(observer.totals).reduce((a,b) => a+b,0)).toBe(denominator);
  expect(serializeWorld(w)).toBe(serializeWorld(twin));
  expect(Object.values(observer.starts).reduce((a,b) => a+b,0)).toBeGreaterThan(0);
}, 30000);

it('records failed travel once at its actual ending, including repeated attempts and released claims', () => {
  const s = stage('time-budget-ending'), p = addPerson(s, 'Ada', 20.5, 20.5); done(s); pin(p);
  const observer = new TimeBudget(), detach = observer.attach(s.w);
  for (let n = 0; n < 2; n++) {
    const a = newActivity(s.w,p,{kind:'gather',label:'A staged journey',goal:'test',targetId:7,targetType:'source',tx:35,ty:35,spotX:35,spotY:35,utility:10,minCommit:20,maxTicks:500});
    startActivity(s.w,p,a);
    observer.sampleTick(s.w); s.w.tick++; observer.sampleTick(s.w);
    endActivity(s.w,p,'failed','source empty');
    expect(p.activity).toBeNull();
    expect(timeCategory(p,s.w.tick)).toBe('failure_recovery');
  }
  detach();
  expect(observer.failedTravel['gather|failed|source empty']).toEqual({endings:2,travelTicks:4,repeatEndings:1});
  expect(observer.endings['gather|failed|source empty']).toBe(2);
});

it('counts travel before its purpose, blocked travel as waiting, and night waiting separately from restorative rest', () => {
  const s=stage('time-budget-categories'),p=addPerson(s,'Ada',20.5,20.5);done(s);
  p.activity=newActivity(s.w,p,{kind:'rest',label:'Wait',goal:'test',targetId:0,targetType:'tile',tx:25,ty:25,spotX:25,spotY:25,utility:10,minCommit:10,maxTicks:500});
  expect(timeCategory(p,0)).toBe('travel');
  p.activity.blocked='occupied';expect(timeCategory(p,0)).toBe('waiting');
  p.activity.blocked='';p.activity.phase='work';expect(timeCategory(p,0)).toBe('rest');
  p.activity.data.daylightAt=100;expect(timeCategory(p,0)).toBe('waiting');
});
