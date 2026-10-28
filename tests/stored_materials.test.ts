import { afterEach, expect, it } from 'vitest';
import { projectHelperScene } from './helpers/project_helpers';
import { building } from './helpers/kit';
import { delBelief, observe } from '../src/sim/knowledge';
import { generateOptions } from '../src/sim/decision';
import { reviewIntentions } from '../src/sim/intent';
import { canObtain } from '../src/sim/social';
import { RNG } from '../src/sim/rng';
import { materialPlanScene, materialPromiseScene, materialChoice } from './helpers/stored_materials';
import { setStoredMaterialPlans, setStoredMaterialPromises, rememberedMaterialStores } from '../src/sim/material_stock';
import { parseIntervention } from '../scripts/lab/lab';
import { evaluateRequest, createRequest, checkCommitments, fulfillCommitment } from '../src/sim/social';
import { rankOptions } from '../src/sim/decision';
import { startActivity, endActivity } from '../src/sim/activities';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport, transfer, snapshotInitial } from '../src/sim/economy';
import { runLive, runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { observeNow } from './helpers/inhabit';
import { describePerson } from '../src/sim/inspect';
import { destroyBuilding } from '../src/sim/buildings';
import { makeSource } from '../src/sim/sources';
import type { Person, World } from '../src/sim/types';

afterEach(() => { setStoredMaterialPlans(true); setStoredMaterialPromises(true); });
const collection = (w: World, p: Person, id: number) => generateOptions(w, p, true, true).options.find(o => o.kind === 'withdraw' && o.targetId === id && o.yields === 'stone');
function startCollection(f: ReturnType<typeof materialPlanScene>) {
  const o = collection(f.w, f.ada, f.store.id)!;
  expect(o).toBeDefined(); const a = o.make!()!; startActivity(f.w, f.ada, a); f.ada.nextThink = 1e9;
  return a;
}
function finishAction(w: World, p: Person, limit = 600) {
  const a = p.activity; let i = 0;
  while (p.activity === a && i++ < limit) stepWorld(w);
  expect(p.activity).not.toBe(a);
}

function storedScene() {
  const f = projectHelperScene();
  const store = building({ w: f.w, rng: new RNG(1) }, 'storehouse', 55, 40, 0, { stone: 4 });
  observe(f.w, f.ada, store); observe(f.w, f.ben, store);
  for (const b of Object.values(f.ada.beliefs)) if (b.kind === 'rock' || b.kind === 'outcrop') delBelief(f.ada, b.id);
  return { ...f, store };
}

it('keeps a material plan viable when remembered shared storage is the only stone source', () => {
  const { w, ada } = storedScene();
  const plan = ada.intentions.find(i => i.kind === 'tool')!;
  reviewIntentions(generateOptions(w, ada, true));
  expect(plan.status).toBe('active');
  expect(generateOptions(w, ada, true, true).options.some(o => o.kind === 'withdraw' && o.yields === 'stone')).toBe(true);
});

it('allows a helper to consider remembered shared material, without consulting remote inventory', () => {
  const { w, ben, store } = storedScene();
  expect(canObtain(w, ben, 'stone')).toBe(true);
  store.store.items = {};
  expect(canObtain(w, ben, 'stone'), 'unseen depletion is not knowledge').toBe(true);
});

it('offers ordinary collection to execute a raw-material commitment', () => {
  const { w, ada, ben, store } = storedScene();
  ben.inv.stone = 0;
  ben.commitments.push({ id: w.nextId++, requestId: 0, kind: 'deliver', to: ada.id, item: 'stone', amount: 2, siteId: 0, made: w.tick, deadline: w.tick + 1800, status: 'active', destKind: 'person', destId: ada.id });
  const option = generateOptions(w, ben, true, true).options.find(o => o.kind === 'withdraw' && o.targetId === store.id && o.tag === 'promise');
  expect(option).toBeDefined();
});

it('only reads known own/public stocks, with pure observers and no knowledge for an absent person', () => {
  const f = materialPlanScene();
  const strangerHome = building({ w: f.w, rng: new RNG(2) }, 'hut', 63, 30, f.outsider.hhId, { stone: 6 });
  observe(f.w, f.ada, strangerHome);
  const before = serializeWorld(f.w);
  for (let i = 0; i < 3; i++) {
    expect(rememberedMaterialStores(f.w, f.ada, 'stone').map(b => b.id)).toEqual([f.store.id]);
    expect(rememberedMaterialStores(f.w, f.outsider, 'stone')).toEqual([]);
    expect(observeNow(f.w, f.outsider).remembered.places.some(b => b.id === f.store.id)).toBe(false);
    observeNow(f.w, f.ada); describePerson(f.w, f.ada.id);
  }
  expect(serializeWorld(f.w)).toBe(before);
  // A remote stock change leaves the decision at its remembered quantity.
  f.store.store.items.stone = 0;
  expect(collection(f.w, f.ada, f.store.id)?.make!()?.data.items).toEqual({ stone: 1 });
});

it('isolates plan and promise connections and retains all rules-39 behavior', () => {
  for (const version of [39, 40]) {
    const f = materialPlanScene(version), g = materialPromiseScene(version);
    const restorePlan = parseIntervention('rich-no-stored-material-plans').install!();
    expect(collection(f.w, f.ada, f.store.id)).toBeUndefined();
    reviewIntentions(generateOptions(f.w, f.ada, true));
    expect(f.ada.intentions.find(i => i.makes === 'axe')?.status).toBe('dropped');
    expect(canObtain(g.w, g.ben, 'stone')).toBe(version === 40);
    restorePlan();
    const restorePromise = parseIntervention('rich-no-stored-material-promises').install!();
    expect(canObtain(g.w, g.ben, 'stone')).toBe(false);
    expect(collection(f.w, f.ada, f.store.id) !== undefined).toBe(version === 40);
    restorePromise();
  }
});

it('uses real withdrawal, crafting and later tool work with full-state save/replay equality', async () => {
  const f = materialPlanScene(); const start = serializeWorld(f.w);
  const observations: NonNullable<ReturnType<typeof observationFromPrompt>>[] = [];
  const model = stubModel('stored-plan', req => {
    const o = observationFromPrompt(req.user)!; observations.push(o);
    return JSON.stringify({choose: materialChoice(o, 'plan').key, why: 'Use the offered known store, then make and use my axe.'});
  });
  const result = await runLive(f.w, f.ada.id, model, {until: 2000});
  const p = result.world.persons.find(p => p.id === f.ada.id)!;
  expect(p.inv.axe).toBe(1);
  expect(result.world.tools.find(t => t.holder === p.id && t.kind === 'axe')!.wear).toBeGreaterThan(0);
  expect(p.intentions.find(i => i.makes === 'axe')?.status).toBe('done');
  expect(observations[0].options.some(o => /Collect 1 stone from the storehouse/.test(o.label))).toBe(true);
  expect(conservationReport(result.world).ok).toBe(true);
  expect(serializeWorld(runReplay(deserializeWorld(start), result.transcript).world)).toBe(serializeWorld(result.world));
});

it('an offered request creates a voluntary promise, collects stock, delivers, credits use and retains personal feedback', async () => {
  const f = materialPromiseScene(); const start = serializeWorld(f.w); const beforeTrust = f.ada.relations[f.ben.id].trust;
  const observations: NonNullable<ReturnType<typeof observationFromPrompt>>[] = [];
  const model = stubModel('stored-promise', req => {
    const o = observationFromPrompt(req.user)!; observations.push(o);
    return JSON.stringify({choose: materialChoice(o, 'promise').key, why: 'Ask the offered helper, allow an accepted promise time, then make my pick.'});
  });
  const result = await runLive(f.w, f.ada.id, model, {until: 2000});
  const p = result.world.persons.find(p => p.id === f.ada.id)!, ben = result.world.persons.find(p => p.id === f.ben.id)!;
  const r = result.world.requests.find(r => r.from === p.id && r.to === ben.id)!;
  expect(r.status).toBe('fulfilled'); expect(r.delivered).toBe(2);
  expect(ben.commitments.find(c => c.requestId === r.id)?.status).toBe('done');
  expect(p.inv.pick).toBe(1);
  expect(p.intentions.find(i => i.makes === 'pick')?.reason).toContain('Ben brought 2');
  expect(p.relations[ben.id].trust).toBeGreaterThan(beforeTrust);
  expect(p.socialMemory?.some(m => m.requestId === r.id && m.outcome === 'fulfilled')).toBe(true);
  expect(result.world.persons.find(p => p.id === f.outsider.id)!.socialMemory?.length ?? 0).toBe(0);
  expect(observations.some(o => o.people.requests.some(r => r.status === 'promised'))).toBe(true);
  expect(observations.some(o => o.people.requests.some(r => r.status === 'fulfilled'))).toBe(true);
  expect(conservationReport(result.world).ok).toBe(true);
  expect(serializeWorld(runReplay(deserializeWorld(start), result.transcript).world)).toBe(serializeWorld(result.world));
  const once = serializeWorld(result.world);
  fulfillCommitment(result.world, ben, r.commitmentId!); checkCommitments(result.world, ben);
  expect(serializeWorld(result.world)).toBe(once);
});

it('storage knowledge does not override urgent needs, conflicting commitments or refusal', () => {
  const f = materialPromiseScene();
  const req = createRequest(f.w, f.ada, f.ben, {kind:'stone', item:'stone', amount:2, destKind:'person', destId:f.ada.id});
  expect(evaluateRequest(f.w, f.ben, f.ada, req).kind).toBe('promise');
  f.ben.needs.thirst = 6;
  f.ben.inv.water = 1; // Explicit urgent-needs fixture: there is an ordinary drink available.
  expect(evaluateRequest(f.w, f.ben, f.ada, req).kind).toBe('decline');
  expect(rankOptions(generateOptions(f.w, f.ben, true, true))[0].need).toBe('thirst');
  f.ben.needs.thirst = 100;
  for (let i = 0; i < 2; i++) f.ben.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.cora.id,item:'wood',amount:1,siteId:0,made:f.w.tick,deadline:2500,status:'active'});
  expect(evaluateRequest(f.w, f.ben, f.ada, req).kind).toBe('decline');
});

it('stale stock fails physically, records the failure, and stops offering the empty place', () => {
  const f = materialPlanScene(); startCollection(f);
  transfer(f.w, f.store.store.items, f.outsider.inv, 999, 'stone', 4, `building:${f.store.id}`, `person:${f.outsider.id}`, 'test competing withdrawal');
  finishAction(f.w, f.ada);
  expect(f.ada.lastResult?.outcome).toBe('failed'); expect(f.ada.inv.stone ?? 0).toBe(0);
  expect(f.ada.failures[f.store.id]?.reason).toBe('nothing there to take');
  expect(collection(f.w, f.ada, f.store.id)).toBeUndefined();
  expect(conservationReport(f.w).ok).toBe(true);
});

it('revalidates a private store after household ownership changes during the work', () => {
  const f = materialPlanScene();
  f.store.type = 'hut'; f.store.hhId = f.ada.hhId; observe(f.w, f.ada, f.store);
  const a = startCollection(f);
  while (f.ada.activity === a && a.phase !== 'work') stepWorld(f.w);
  expect(f.ada.activity).toBe(a);
  f.store.hhId = f.outsider.hhId;
  finishAction(f.w, f.ada);
  expect(f.ada.lastResult?.detail).toMatch(/no longer shared or ours/);
  expect(f.ada.inv.stone ?? 0).toBe(0); expect(f.store.store.items.stone).toBe(4);
  expect(collection(f.w, f.ada, f.store.id)).toBeUndefined();
});

it('interruption, capacity changes and repeated completion cannot duplicate stock', () => {
  const f = materialPlanScene(); const a = startCollection(f);
  endActivity(f.w, f.ada, 'interrupted', 'test urgent interruption');
  expect(f.store.store.items.stone).toBe(4); expect(f.ada.inv.stone ?? 0).toBe(0);
  // A new offered action after interruption is a new physical attempt.
  startCollection(f);
  f.ada.inv.ore = 50; snapshotInitial(f.w);
  finishAction(f.w, f.ada);
  expect(f.ada.inv.stone ?? 0).toBe(0); expect(f.store.store.items.stone).toBe(4);
  expect(collection(f.w, f.ada, f.store.id)).toBeUndefined();
  const once = serializeWorld(f.w); endActivity(f.w, f.ada, 'success', 'duplicate');
  expect(serializeWorld(f.w)).toBe(once); expect(a.cycle).toBe(0);
});

it('continues identically after a save during a real collection journey', () => {
  const f = materialPlanScene(); startCollection(f);
  for (let i = 0; i < 20; i++) stepWorld(f.w);
  expect(f.ada.activity?.kind).toBe('withdraw');
  const loaded = deserializeWorld(serializeWorld(f.w));
  for (let i = 0; i < 180; i++) { stepWorld(f.w); stepWorld(loaded); }
  expect(serializeWorld(loaded)).toBe(serializeWorld(f.w));
  expect(conservationReport(loaded).ok).toBe(true);
});

it('accepts a partial physical withdrawal and lets later observation correct the remaining shortage', () => {
  const f = materialPlanScene();
  // A pick really needs two stone. A remembered exhausted rock establishes the
  // tool's use without providing an alternative supply in this partial-stock case.
  observe(f.w,f.ada,makeSource(f.w,'rock',65,30,0));
  f.ada.skills.stone=1.8;f.ada.skills.wood=0.5;f.ada.skills.forage=0.2;
  f.ada.intentions[0].makes='pick';f.ada.intentions[0].goal='make a pick';
  f.ada.intentions[0].wants.stone = 2;
  // Competing withdrawal leaves just one unit after the two-unit offer was accepted.
  const a = startCollection(f);
  expect(a.data.items).toEqual({stone:2});
  transfer(f.w, f.store.store.items, f.outsider.inv, 999, 'stone', 3, `building:${f.store.id}`, `person:${f.outsider.id}`, 'test competing withdrawal');
  finishAction(f.w,f.ada);
  expect(f.ada.inv.stone).toBe(1);expect(a.cycle).toBe(1);
  expect(f.store.store.items.stone ?? 0).toBe(0);
  reviewIntentions(generateOptions(f.w,f.ada,true));
  expect(f.ada.intentions[0].status).toBe('dropped');
  expect(f.ada.intentions[0].reason).toContain('no known source of stone');
  expect(conservationReport(f.w).ok).toBe(true);
});

it('a demolished destination is learned at arrival, without transferring its scattered goods remotely', () => {
  const f=materialPlanScene();startCollection(f);
  destroyBuilding(f.w,f.store,'test collapse during journey');
  finishAction(f.w,f.ada);
  expect(f.ada.lastResult?.outcome).toBe('failed');
  expect(f.ada.inv.stone ?? 0).toBe(0);
  expect(f.ada.beliefs[f.store.id]).toBeUndefined();
  expect(conservationReport(f.w).ok).toBe(true);
});

it('cancelled and expired commitments stop demanding collection and never acquire delivery credit', () => {
  const f=materialPromiseScene();
  const r=createRequest(f.w,f.ada,f.ben,{kind:'stone',item:'stone',amount:2,destKind:'person',destId:f.ada.id});
  const c={id:f.w.nextId++,requestId:r.id,kind:'deliver' as const,to:f.ada.id,item:'stone' as const,amount:2,siteId:0,made:f.w.tick-2000,deadline:f.w.tick-1,status:'active' as const};
  f.ben.commitments.push(c);r.commitmentId=c.id;r.status='promised';
  checkCommitments(f.w,f.ben);
  expect(f.ben.commitments[0].status).not.toBe('active');
  expect(r.status).not.toBe('fulfilled');expect(r.delivered ?? 0).toBe(0);
  expect(generateOptions(f.w,f.ben,true,true).options.filter(o=>o.kind==='withdraw'&&o.tag==='promise')).toEqual([]);
  r.status='cancelled';f.ben.commitments[0].status='cancelled';
  expect(generateOptions(f.w,f.ben,true,true).options.filter(o=>o.kind==='withdraw'&&o.tag==='promise')).toEqual([]);
});
