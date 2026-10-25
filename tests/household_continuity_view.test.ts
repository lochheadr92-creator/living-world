import { afterEach, expect, it } from 'vitest';
import { householdContinuityWorld, converseDuringDelivery } from '../scripts/fixtures/household_continuity_world';
import { describePerson, planViews } from '../src/sim/inspect';
import { setExternalController } from '../src/sim/external';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { delBelief } from '../src/sim/knowledge';
import { homePlanPause } from '../src/sim/inspect_home_plan';
import { newActivity, startActivity } from '../src/sim/activities';
import { generateOptions } from '../src/sim/decision';
import { reviewIntentions, settleIntentions } from '../src/sim/intent';

afterEach(() => setExternalController(null));
it('shows a real conversation pause, resumes the same delivery, and credits only physical goods', () => {
  const s = householdContinuityWorld();
  const view = () => planViews(s.w, s.p).find(v => v.id === s.plan.id)!;
  expect(view().state).toBe('under way');
  setExternalController({ controls: () => true, choose: () => ({ kind: 'defer' }) });
  converseDuringDelivery(s);
  expect(view().state).toBe('paused');
  expect(view().detail).toContain('paused for a conversation');
  expect(view().detail).not.toContain('not started');
  expect(view().detail).toContain('Last known site requirements: 8 wood and 4 stone');
  expect(view().progress).toBe('0 units carried to the site');
  const saved = serializeWorld(s.w);
  const back = deserializeWorld(saved);
  for (let n = 0; n < 200 && s.p.convId; n++) { stepWorld(s.w); stepWorld(back); }
  expect(s.p.lastInteraction?.purpose).toBe('chat');
  expect(s.p.activity?.id).toBe(s.deliveryId);
  expect(view().state).toBe('under way');
  expect(describePerson(s.w, s.p.id)!.qa.stopping).not.toContain('Stuck');
  for (let n = 0; n < 100 && s.plan.worked === 0; n++) { stepWorld(s.w); stepWorld(back); }
  expect(s.plan.worked).toBe(4);
  expect(s.site.delivered.wood).toBe(4);
  expect(s.p.inv.wood ?? 0).toBe(0);
  expect(view().progress).toBe('4 units carried to the site');
  expect(view().detail).toContain('Last known site requirements: 4 wood and 4 stone');
  expect(view().detail).not.toContain('paused for a conversation');
  expect(serializeWorld(back)).toBe(serializeWorld(s.w));
});

it('reads the referenced site belief, never a remote site truth or another household site', () => {
  const s = householdContinuityWorld();
  s.site.delivered.wood = 4; // unobserved remote change for this boundary test
  expect(planViews(s.w, s.p)[0].detail).toContain('Last known site requirements: 8 wood and 4 stone');
  s.p.beliefs[s.site.id].hh = s.q.hhId;
  expect(planViews(s.w, s.p)[0].detail).toContain('Site requirements unknown');
  delBelief(s.p, s.site.id);
  expect(planViews(s.w, s.p)[0].detail).toContain('Site requirements unknown');
});

it('complete inspector reads during a pause preserve the entire saved state and RNG', () => {
  const s = householdContinuityWorld();
  converseDuringDelivery(s);
  const before = serializeWorld(s.w);
  for (let n = 0; n < 3; n++) { describePerson(s.w, s.p.id); planViews(s.w, s.p); }
  expect(serializeWorld(s.w)).toBe(before);
});

it('a real refused conversation leaves the delivery under way', () => {
  const s = householdContinuityWorld(1000); // the initially observed refusal, kept as its own contract
  setExternalController({ controls: () => true, choose: () => ({ kind: 'defer' }) });
  startActivity(s.w, s.q, newActivity(s.w, s.q, { kind: 'socialize', label: 'Chat with Ada', goal: 'a chat', targetId: s.p.id, targetType: 'person', here: true, data: { purpose: 'chat' } }));
  for (let n = 0; n < 5; n++) stepWorld(s.w);
  expect(s.q.lastResult?.detail).toBe('Ada was too busy to stop');
  expect(s.p.suspended).toBeNull();
  expect(planViews(s.w, s.p)[0].state).toBe('under way');
  expect(planViews(s.w, s.p)[0].detail).not.toContain('paused for a conversation');
});

it('does not invent the cause of a suspended step or associate a different plan', () => {
  const s = householdContinuityWorld();
  converseDuringDelivery(s);
  s.p.activity = null; // presentation boundary: no current interaction records a cause
  expect(homePlanPause(s.p, s.plan)).toContain('reason not recorded');
  expect(homePlanPause(s.p, { ...s.plan, id: s.plan.id + 99 })).toBe('');
  expect(homePlanPause(s.p, { ...s.plan, status: 'done' })).toBe('');
});

it('shows an urgent need without claiming that the plan ended', () => {
  const s = householdContinuityWorld();
  s.p.needs.thirst = 2;
  reviewIntentions(generateOptions(s.w, s.p));
  expect(planViews(s.w, s.p)[0].state).toBe('blocked');
  expect(planViews(s.w, s.p)[0].detail).toContain('thirst comes first');
  expect(s.plan.status).toBe('active');
});

it('shows the recorded home-plan deadline failure without a false success', () => {
  const s = householdContinuityWorld();
  s.w.tick = s.plan.until + 1;
  settleIntentions(s.w, s.p);
  const v = planViews(s.w, s.p)[0];
  expect(v.state).toBe('ended');
  expect(v.outcome).toContain('never got anything');
  expect(v.detail).not.toContain('Last known site requirements');
  expect(v.progress).toBe('0 units carried to the site');
});

it('still reports a stall that the travel engine actually recorded', () => {
  const s = householdContinuityWorld();
  s.p.activity!.stuck = 1; // observer boundary, not an attempted pathfinding reproduction
  expect(describePerson(s.w, s.p.id)!.qa.stopping).toContain('Stuck');
});
