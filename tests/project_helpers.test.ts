import { afterEach, expect, it } from 'vitest';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { earnHelp, projectHelperScene } from './helpers/project_helpers';
import { projectHelperChoiceOn, setProjectHelperChoice } from '../src/sim/options_social';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { perceive } from '../src/sim/perception';
import { parseIntervention } from '../scripts/lab/lab';
import { observeNow } from './helpers/inhabit';
import { createRequest, updateConversations, updateRequests, MAKING_NOTE } from '../src/sim/social';
import { adjustRel, driftRelations } from '../src/sim/relations';
import { newActivity, startActivity, endActivity } from '../src/sim/activities';
import { stepWorld } from '../src/sim/world';
import { runLive, runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt, observationVersionFor } from '../src/agent/protocol';
import type { Person, World } from '../src/sim/types';

afterEach(() => setProjectHelperChoice(true));
const askFor = (w: World, p: Person) => generateOptions(w, p, true, true).options.find(o => o.key.endsWith(':plan:stone'));

it('uses personal trust when choosing between otherwise eligible project helpers', () => {
  const { w, ada, ben, cora } = projectHelperScene();
  const ask = () => generateOptions(w, ada, true, true).options.find(o => o.key.endsWith(':plan:stone'));
  expect(ask()?.targetId).toBe(ben.id);
  // Boundary fixture only; the complete chain separately earns trust through an actual exchange.
  ada.relations[cora.id].trust = 16;
  expect(ask()?.targetId).toBe(cora.id);
});

it('earns trust through an offered physical gift, without informing an absent neighbour or rewarding it twice', () => {
  const f = projectHelperScene();
  const before = f.ada.relations[f.cora.id].trust;
  const gifts: { item: string; n: number }[] = [];
  f.w.hooks = { onTransfer: t => { if (t.from === `person:${f.cora.id}` && t.to === `person:${f.ada.id}`) gifts.push(t); } };
  earnHelp(f);
  expect(gifts.some(t => t.item === 'berries' && t.n > 0)).toBe(true);
  expect(f.ada.relations[f.cora.id].trust).toBeGreaterThan(before);
  expect(f.ada.relations[f.cora.id].history.some(h => /gave me/.test(h.text))).toBe(true);
  expect(f.outsider.relations[f.cora.id]).toBeUndefined();
  const once = serializeWorld(f.w);
  updateConversations(f.w); updateRequests(f.w);
  expect(serializeWorld(f.w)).toBe(once);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('keeps trust choice, observation and the ordinary request/craft execution across save and transcript replay', async () => {
  const f = projectHelperScene(); earnHelp(f);
  // A meaningful midpoint after the gift, before the receiver has eaten or asked for stone.
  const start = serializeWorld(f.w);
  const observations: ReturnType<typeof observationFromPrompt>[] = [];
  const model = stubModel('offered-project-help', req => {
    const o = observationFromPrompt(req.user)!; observations.push(o);
    const a = o.options.find(a => a.kind === 'eat') ?? o.options.find(a => a.label === 'Ask Cora for stone') ?? o.options.find(a => a.kind === 'craft' && /axe/i.test(a.label)) ?? o.options[0];
    return JSON.stringify({ choose: a.key, why: 'Eat if needed, then ask the offered helper for my axe material and make it.' });
  });
  const result = await runLive(deserializeWorld(start), f.ada.id, model, { until: f.w.tick + 1200 });
  const p = result.world.persons.find(p => p.id === f.ada.id)!;
  expect(observations.some(o => o?.options.some(a => a.label === 'Ask Cora for stone' && a.goal.includes('I trust Cora')))).toBe(true);
  const r = result.world.requests.find(r => r.from === f.ada.id && r.to === f.cora.id && r.item === 'stone');
  expect(r?.status).toBe('fulfilled'); expect(r?.delivered).toBe(1);
  expect(p.inv.axe).toBe(1);
  expect(p.intentions.some(i => i.makes === 'axe' && i.status === 'done' && i.worked > 0)).toBe(true);
  expect(conservationReport(result.world).ok).toBe(true);
  expect(serializeWorld(runReplay(deserializeWorld(start), result.transcript).world)).toBe(serializeWorld(result.world));
  // Continue the original in-memory midpoint as well: loading is not allowed to
  // change the earned preference or any later saved consequence.
  const uninterrupted = await runLive(f.w, f.ada.id, model, { until: f.w.tick + 1200 });
  expect(serializeWorld(uninterrupted.world)).toBe(serializeWorld(result.world));
});

it('preserves first-feasible choice in legacy rules and the isolated lab ablation, including restore', () => {
  for (const version of [38, 39]) {
    const f = projectHelperScene(version); f.ada.relations[f.cora.id].trust = 50;
    const original = serializeWorld(f.w);
    const restore = parseIntervention('rich-no-project-helper-choice').install!();
    expect(askFor(f.w, f.ada)?.targetId).toBe(f.ben.id);
    expect(askFor(f.w, f.ada)?.selectionReason).toBeUndefined();
    restore(); expect(projectHelperChoiceOn()).toBe(true);
    expect(askFor(f.w, f.ada)?.targetId).toBe(version === 38 ? f.ben.id : f.cora.id);
    expect(serializeWorld(f.w)).toBe(original);
  }
});

it('an interrupted offered gift grants no help credit', () => {
  const f = projectHelperScene(); f.ada.needs.hunger = 35;
  perceive(f.w, f.cora);
  const ctx = generateOptions(f.w, f.cora, true, true);
  const offer = rankOptions(ctx).find(o => o.tag === 'offer' && o.targetId === f.ada.id)!;
  expect(offer).toBeTruthy();
  const trust = f.ada.relations[f.cora.id].trust, inv = { ...f.ada.inv };
  startActivity(f.w, f.cora, offer.make!()!);
  endActivity(f.w, f.cora, 'interrupted', 'staged interruption before arrival');
  expect(f.cora.stats.given).toBe(0);
  expect(f.ada.relations[f.cora.id].trust).toBe(trust);
  expect(f.ada.inv).toEqual(inv);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('the trusted helper can refuse goods reserved for another obligation', async () => {
  const f = projectHelperScene(); earnHelp(f);
  const r = createRequest(f.w, f.outsider, f.cora, { kind: 'stone', item: 'stone', amount: 3 });
  r.status = 'promised';
  const id = f.w.nextId++; r.commitmentId = id;
  f.cora.commitments.push({ id, requestId: r.id, kind: 'deliver', to: f.outsider.id, item: 'stone', amount: 3, siteId: 0, made: f.w.tick, deadline: f.w.tick + 3000, status: 'active', delivered: 0 });
  const other = createRequest(f.w, f.ben, f.cora, { kind: 'wood', item: 'wood', amount: 1 });
  other.status = 'promised'; other.commitmentId = f.w.nextId++;
  f.cora.commitments.push({ id: other.commitmentId, requestId: other.id, kind: 'deliver', to: f.ben.id, item: 'wood', amount: 1, siteId: 0, made: f.w.tick, deadline: f.w.tick + 3000, status: 'active', delivered: 0 });
  const model = stubModel('offered-refusal', req => {
    const o = observationFromPrompt(req.user)!;
    const a = o.options.find(a => a.kind === 'eat') ?? o.options.find(a => a.label === 'Ask Cora for stone') ?? o.options[0];
    return JSON.stringify({ choose: a.key, why: 'Ask the helper I trust when that option becomes available.' });
  });
  const result = await runLive(f.w, f.ada.id, model, { until: f.w.tick + 900 });
  const ask = result.world.requests.find(q => q.from === f.ada.id && q.to === f.cora.id && q.item === 'stone');
  expect(ask?.status).toBe('declined'); expect(ask?.note).toBe('committed');
  expect(ask?.delivered ?? 0).toBe(0);
  expect(result.world.persons.find(p => p.id === f.cora.id)!.inv.stone).toBe(3);
  expect(conservationReport(result.world).ok).toBe(true);
});

it('stale sight of a trusted helper does not guarantee contact or a transfer', () => {
  const f = projectHelperScene(); f.ada.relations[f.cora.id].trust = 40;
  const ask = askFor(f.w, f.ada)!;
  expect(ask.targetId).toBe(f.cora.id);
  startActivity(f.w, f.ada, ask.make!()!);
  // Developer-controlled negative: the visible neighbour leaves after selection.
  f.cora.x = 70; f.cora.y = 70;
  for (let n = 0; n < 480 && f.ada.activity; n++) stepWorld(f.w);
  expect(f.w.requests.some(r => r.from === f.ada.id && r.to === f.cora.id && (r.delivered ?? 0) > 0)).toBe(false);
  expect(f.ada.inv.stone ?? 0).toBe(0);
  expect(f.ada.lastResult?.outcome).not.toBe('success');
  expect(conservationReport(f.w).ok).toBe(true);
});

it('trust never creates sight, supplies, eligibility or relief from a known refusal', () => {
  for (const condition of ['unseen', 'working', 'making', 'asked', 'asleep'] as const) {
    const f = projectHelperScene(); f.ada.relations[f.cora.id].trust = 100;
    if (condition === 'unseen') f.cora.x = 70;
    if (condition === 'working') f.cora.activity = newActivity(f.w, f.cora, { kind: 'craft', label: 'Own work', goal: 'Own work', here: true });
    if (condition === 'making') f.ada.cooldowns[MAKING_NOTE + f.cora.id] = f.w.tick + 100;
    if (condition === 'asked') f.ada.asked[f.cora.id] = f.w.tick;
    if (condition === 'asleep') f.cora.pose = 'sleep';
    perceive(f.w, f.ada);
    expect(askFor(f.w, f.ada)?.targetId, condition).toBe(f.ben.id);
  }
});

it('does not promote a project ask over urgent needs or duplicate a covered request', () => {
  const f = projectHelperScene(); f.ada.relations[f.cora.id].trust = 100;
  f.ada.needs.thirst = 2;
  expect(askFor(f.w, f.ada)).toBeUndefined();
  f.ada.needs.thirst = 100;
  const plan = f.ada.intentions.find(i => i.kind === 'tool')!;
  createRequest(f.w, f.ada, f.cora, { kind: 'stone', item: 'stone', amount: 1, planId: plan.id });
  expect(askFor(f.w, f.ada)).toBeUndefined();
});

it('uses bounded drifting relationships, with no inflation from repeated option generation', () => {
  const f = projectHelperScene(); f.ada.relations[f.cora.id].trust = 100;
  const before = serializeWorld(f.w);
  for (let i = 0; i < 30; i++) { const ctx = generateOptions(f.w, f.ada, true, true); rankOptions(ctx); observeNow(f.w, f.ada); }
  expect(serializeWorld(f.w)).toBe(before);
  // Existing relationship input boundary: repeated experiences remain bounded.
  // The execution tests above separately establish which real action earns credit.
  for (let i = 0; i < 30; i++) adjustRel(f.ada, f.cora.id, f.w.tick + i, { trust: 5, note: 'helpful encounter' });
  expect(f.ada.relations[f.cora.id].trust).toBe(100);
  expect(f.ada.relations[f.cora.id].history).toHaveLength(6);
  for (let i = 0; i < 2000; i++) driftRelations(f.ada);
  expect(f.ada.relations[f.cora.id].trust).toBeLessThan(10.04);
});

it('preserves observation 11 wording and protocol mappings while explaining the new choice in 12', () => {
  const f = projectHelperScene(); f.ada.relations[f.cora.id].trust = 20;
  expect(observeNow(f.w, f.ada, false, 11).options.find(a => a.label === 'Ask Cora for stone')?.goal).not.toContain('I trust');
  expect(observeNow(f.w, f.ada).options.find(a => a.label === 'Ask Cora for stone')?.goal).toContain('I trust Cora');
  expect(observationVersionFor('inhabitant/19')).toBe(11);
  expect(observationVersionFor('inhabitant/20')).toBe(11);
  expect(observationVersionFor('inhabitant/21')).toBe(12);
  expect(observationVersionFor('inhabitant/22')).toBe(12);
});
