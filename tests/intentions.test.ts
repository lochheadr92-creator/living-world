// An intention (a promise: src/sim/social.ts checkCommitments) is settled by what its maker knows, not by the world behind their back.
// The lifecycle itself — adopt, pause, resume, revise, complete, abandon with a reason — is the existing commitment system, held by
// tests/commitments.test.ts. What is checked here is the knowledge boundary, and that authored worlds keep their established behaviour.
import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { observe } from '../src/sim/knowledge';
import { relOf } from '../src/sim/relations';
import { testKit } from '../src/sim/scenes';
import { checkCommitments } from '../src/sim/social';
import type { ConvData } from '../src/sim/social';
import type { ConvPurpose, Person, World } from '../src/sim/types';
import { commitmentViews } from '../src/sim/inspect_work';
import { RNG } from '../src/sim/rng';
import { createBuilding } from '../src/sim/buildings';
import { settingsFor, run } from './helpers/util';

function talk(w: World, a: Person, b: Person, purpose: ConvPurpose, conv: ConvData = {}): void {
  const act = newActivity(w, a, {
    kind: 'socialize',
    label: `Talking to ${b.name}`,
    goal: 'a staged conversation',
    targetId: b.id,
    targetType: 'person',
    tx: b.x,
    ty: b.y,
    spotX: b.x - 1.3,
    spotY: b.y,
    utility: 100,
    minCommit: 4000,
    maxTicks: 600,
    data: { purpose, conv },
  });
  startActivity(w, a, act);
  for (let i = 0; i < 400 && w.conversations.length + (a.lastInteraction ? 1 : 0) === 0; i++) run(w, 1);
  for (let i = 0; i < 400 && w.conversations.length > 0; i++) run(w, 1);
}

/** an elder with a failing roof and a neighbour who promises to mend it */
function roofPromise(seed: string, dynamics: 'authored' | 'rich') {
  const w = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics }));
  const rng = new RNG(11);
  const elder = testKit.addPerson(w, rng, { name: 'Edda', x: 44, y: 26, age: 72, traits: { sociability: 0.8 }, inv: { fruit: 4 } });
  const ned = testKit.addPerson(w, rng, { name: 'Ned', x: 46, y: 26, sex: 'm', inv: { wood: 4, fruit: 4 }, traits: { generosity: 0.95, diligence: 0.9 } });
  const hut = createBuilding(w, 'hut', 40, 28, elder.hhId);
  w.households.find((h) => h.id === elder.hhId)!.homeId = hut.id;
  hut.condition = 38;
  w.camp = { x: 44.5, y: 26.5 };
  testKit.finish(w, 'natural');
  for (const [x, y] of [[elder, ned], [ned, elder]] as [Person, Person][]) {
    const r = relOf(x, y.id);
    r.affinity = 50;
    r.trust = 50;
  }
  observe(w, elder, hut);
  observe(w, ned, hut);
  talk(w, elder, ned, 'request', { reqKind: 'repair', item: 'wood', amount: 1, destKind: 'building', destId: hut.id, purpose: 'the roof is failing', milestone: 'sound again' });
  const cm = ned.commitments.find((c) => c.destId === hut.id);
  return { w, elder, ned, hut, cm };
}

describe('a promise is settled by what its maker knows', () => {
  it('an authored world keeps its established behaviour: the roof being sound settles the promise at once', () => {
    const { w, ned, hut, cm } = roofPromise('intent-authored', 'authored');
    expect(cm, 'Ned should have promised').toBeTruthy();
    expect(cm!.status).toBe('active');
    hut.condition = 90; // someone else mended it, far from Ned
    checkCommitments(w, ned);
    expect(cm!.status).not.toBe('active');
    expect(cm!.reason).toBe('it was mended by someone else');
  });

  it('a rich world waits until Ned has seen the roof for himself, then settles it with the reason', () => {
    const { w, ned, hut, cm } = roofPromise('intent-rich', 'rich');
    expect(cm, 'Ned should have promised').toBeTruthy();
    expect(cm!.status).toBe('active');
    const knewBefore = ned.beliefs[hut.id]?.cond;
    hut.condition = 90; // mended by someone else, out of Ned's sight

    checkCommitments(w, ned);
    expect(ned.beliefs[hut.id]?.cond, 'Ned has not looked, so what he knows has not changed').toBe(knewBefore);
    expect(cm!.status, 'the promise stands while he does not know').toBe('active');
    // and the inspector says what he is still about
    expect(commitmentViews(w, ned).some((v) => v.status === 'active')).toBe(true);

    observe(w, ned, hut); // now he sees it
    expect(ned.beliefs[hut.id]?.cond).toBeGreaterThanOrEqual(62);
    checkCommitments(w, ned);
    expect(cm!.status, 'once he knows, the promise is settled').not.toBe('active');
    expect(cm!.reason).toBe('it was mended by someone else');
    // the inspector explains the revision, not just the status
    expect(commitmentViews(w, ned).some((v) => v.detail.includes('it was mended by someone else'))).toBe(true);
  });
});
