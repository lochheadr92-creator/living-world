import { describe, expect, it } from 'vitest';
import { newActivity, resumeSuspended, startActivity, stepActivity, suspendActivity } from '../../src/sim/activities';
import { companyPull, leanOn } from '../../src/sim/lifechanges';
import { giveBirth } from '../../src/sim/lifecycle';
import { relOf } from '../../src/sim/relations';
import type { Activity, Person, World } from '../../src/sim/types';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';

function current(seed: string): World {
  return createWorld(currentWorldSettings('normal', seed, { immigration: false }));
}

interface Fixture {
  w: World;
  p: Person;
  a: Activity;
  commitment: Person['commitments'][number];
  endings: string[];
}

function suspensionFixture(): Fixture {
  const w = current('review-ordinary-suspension');
  expect(w.settings.dynamics).toBe('rich');
  const p = w.persons[0];
  const target = w.sources[0];
  const commitment = {
    id: w.nextId++, requestId: 0, kind: 'haul' as const, to: w.persons[1].id,
    item: 'berries' as const, amount: 1, siteId: 0, made: w.tick,
    deadline: w.tick + 1000, status: 'active' as const,
  };
  p.commitments.push(commitment);
  const a = newActivity(w, p, {
    kind: 'haul', label: 'Review probe haul', goal: 'review probe', targetId: target.id,
    targetType: target.ent, tx: target.x, ty: target.y, spotX: target.x, spotY: target.y,
    maxTicks: 10, data: { commitmentId: commitment.id, optKey: 'review-probe' },
  });
  p.decisions = [{
    tick: w.tick, trigger: 'review probe', key: 'review-probe', chosen: a.label,
    kind: a.kind, targetId: a.targetId, forPlan: 0, activityId: a.id,
    passedOver: [], setAside: [],
  }];
  p.decisionsDropped = 0;
  const endings: string[] = [];
  w.hooks = { onActivityEnd: (_person, activity, outcome, detail) => {
    if (activity.id === a.id) endings.push(`${outcome}:${detail}`);
  } };
  startActivity(w, p, a);
  return { w, p, a, commitment, endings };
}

function outcome(f: Fixture) {
  return {
    resumedActivity: f.p.activity?.id ?? null,
    suspendedActivity: f.p.suspended?.id ?? null,
    endings: f.endings,
    lastResult: f.p.lastResult ?? null,
    decision: f.p.decisions?.find((d) => d.activityId === f.a.id) ?? null,
    promiseAttempt: f.commitment.attempt ?? null,
    nextThink: f.p.nextThink,
    tick: f.w.tick,
  };
}

describe('review-only staged cross-system probes', () => {
  it('control: an ordinary expired active activity closes all outcome records', () => {
    const f = suspensionFixture();
    f.w.tick = f.a.expire + 1;
    stepActivity(f.w, f.p);
    const observed = outcome(f);
    console.log('ACTIVE_EXPIRY_CONTROL ' + JSON.stringify(observed));
    expect(observed.endings).toEqual(['failed:took too long']);
    expect(observed.lastResult?.outcome).toBe('failed');
    expect(observed.decision?.outcome).toBe('failed');
    expect(observed.promiseAttempt?.reason).toBe('took too long');
  });

  it('documents an expired ordinary suspended activity disappearing without an ending', () => {
    const f = suspensionFixture();
    suspendActivity(f.w, f.p);
    f.w.tick = f.a.expire + 1;
    expect(resumeSuspended(f.w, f.p)).toBe(false);
    const observed = outcome(f);
    console.log('SUSPENDED_EXPIRY_OBSERVED ' + JSON.stringify(observed));
    expect(observed.resumedActivity).toBeNull();
    expect(observed.suspendedActivity).toBeNull();
    expect(observed.endings).toEqual([]);
    expect(observed.lastResult).toBeNull();
    expect(observed.decision?.outcome).toBeUndefined();
    expect(observed.promiseAttempt).toBeNull();
  });

  it('documents a missing ordinary suspended target disappearing without an ending', () => {
    const f = suspensionFixture();
    suspendActivity(f.w, f.p);
    f.w.byId.delete(f.a.targetId);
    expect(resumeSuspended(f.w, f.p)).toBe(false);
    const observed = outcome(f);
    console.log('SUSPENDED_TARGET_GONE_OBSERVED ' + JSON.stringify(observed));
    expect(observed.resumedActivity).toBeNull();
    expect(observed.suspendedActivity).toBeNull();
    expect(observed.endings).toEqual([]);
    expect(observed.lastResult).toBeNull();
    expect(observed.decision?.outcome).toBeUndefined();
    expect(observed.promiseAttempt).toBeNull();
  });

  it('documents immediate remote father knowledge and motivation at a staged birth', () => {
    const w = current('review-remote-birth');
    const mother = w.persons.find((p) => p.sex === 'f' && p.partnerId)!;
    const father = w.persons.find((p) => p.id === mother.partnerId)!;
    father.x = mother.x < w.W / 2 ? w.W - 5 : 5;
    father.y = mother.y < w.H / 2 ? w.H - 5 : 5;
    father.px = father.x;
    father.py = father.y;
    father.log = [];
    father.mood = { level: 0, thoughts: [] };
    delete father.lifeEvent;
    mother.pregnantBy = father.id;
    mother.pregnantUntil = w.tick;
    const distance = Math.hypot(father.x - mother.x, father.y - mother.y);
    const relationBefore = { ...relOf(father, mother.id) };
    giveBirth(w, mother);
    const baby = w.persons[w.persons.length - 1];
    const relationAfter = relOf(father, mother.id);
    const observed = {
      distance,
      fatherLog: father.log,
      fatherThoughts: father.mood.thoughts.map((t) => ({ kind: t.kind, value: t.value, why: t.why })),
      fatherLifeEvent: father.lifeEvent as Person['lifeEvent'],
      affinityBefore: relationBefore.affinity,
      affinityAfter: relationAfter.affinity,
      trustBefore: relationBefore.trust,
      trustAfter: relationAfter.trust,
      companyPullForPartner: companyPull(w, father, mother),
      helpWillingnessBonusFromMother: leanOn(w, mother, father),
      babyParents: baby.parents,
    };
    console.log('REMOTE_BIRTH_OBSERVED ' + JSON.stringify(observed));
    expect(distance).toBeGreaterThan(10);
    expect(observed.fatherLog.some((l) => l.text === `${baby.name} was born.`)).toBe(true);
    expect(observed.fatherThoughts.map((t) => t.kind)).toEqual(expect.arrayContaining(['birth', 'parent']));
    expect(observed.fatherLifeEvent?.kind).toBe('new_parent');
    expect(observed.affinityAfter).toBe(relationBefore.affinity + 6);
    expect(observed.trustAfter).toBe(relationBefore.trust + 3);
    expect(observed.companyPullForPartner).toBe(5);
    expect(observed.helpWillingnessBonusFromMother).toBe(0.15);
  });
});
