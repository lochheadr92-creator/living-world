import { carryCap } from '../src/sim/people';
import { DAY } from '../src/sim/constants';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { makeCtx } from '../src/sim/optutil';
import { reviewIntentions, setReconsider } from '../src/sim/intent';
import { putBelief } from '../src/sim/knowledge';
import { createRequest } from '../src/sim/social';
import type { Intention } from '../src/sim/types';

function toolIntent(w: { tick: number }): Intention {
  return { id: 1, kind: 'tool', goal: 'make a pick', since: w.tick, until: w.tick + 100000, status: 'active', step: 'get 2 wood', stepKind: 'get', stepItem: 'wood', stepTarget: 0, stepKey: null, aboutId: 0, wants: { wood: 2 }, makes: 'pick', sheltered: 0, worked: 0, blocked: '', reason: '', setAside: 0, ended: 0 };
}

function make(seed = 'reconsider') {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const p = w.persons[0];
  p.needs = { hunger: 100, thirst: 100, energy: 100, warmth: 100, safety: 100, social: 100 };
  p.intentions = [toolIntent(w)];
  p.inv = {};
  for (const k of Object.keys(p.beliefs)) if (p.beliefs[Number(k)].kind === 'tree') delete p.beliefs[Number(k)];
  if (p.bykind.tree) p.bykind.tree = [];
  return { w, p };
}

it('relinquishes a material-fetch plan with no known source and no promise (rules 34)', () => {
  const { w, p } = make();
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('dropped');
  expect(p.intentions[0].reason).toContain('no known source of wood');
  expect(p.intentions[0].wants).toEqual({});
});

it('retains the plan when a source of the material is known', () => {
  const { w, p } = make();
  const tree = w.sources.find((s) => s.type === 'tree');
  expect(tree).toBeTruthy();
  putBelief(p, { id: tree!.id, kind: 'tree', x: tree!.x, y: tree!.y, amount: 3, max: tree!.max, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('active');
});

it('retains the plan while a request for the material is pending', () => {
  const { w, p } = make();
  const other = w.persons[1];
  createRequest(w, p, other, { kind: 'wood', item: 'wood', amount: 2, planId: p.intentions[0].id });
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('active');
});

it('retains the plan below rules 34, and with the off-switch', () => {
  const w = createWorld({ ...currentWorldSettings('normal', 'river', { immigration: false }), rulesVersion: 33 });
  const p = w.persons[0];
  p.needs = { hunger: 100, thirst: 100, energy: 100, warmth: 100, safety: 100, social: 100 };
  p.intentions = [toolIntent(w)];
  p.inv = {};
  reviewIntentions(makeCtx(w, p, true, true));
  expect(p.intentions[0].status).toBe('active');
  const { w: w2, p: p2 } = make();
  setReconsider(false);
  try { reviewIntentions(makeCtx(w2, p2, true, true)); } finally { setReconsider(true); }
  expect(p2.intentions[0].status).toBe('active');
});

function competing() {
  const { w, p } = make(); w.tick = DAY + 1;
  p.intentions[0].wants = { wood: 2, stone: 2 }; p.inv = { wood: 2, berries: 2 };
  p.beliefs = {}; p.bykind = {};
  putBelief(p, { id: 987654, kind: 'site', amount: 0, max: 0, btype: 'hut', hh: p.hhId, need: { wood: 4, stone: 4 }, x: p.x, y: p.y, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
  putBelief(p, { id: 987656, kind: 'tree', amount: 8, max: 8, x: p.x+3, y: p.y, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
  putBelief(p, { id: 987655, kind: 'rock', amount: 8, max: 8, x: p.x+2, y: p.y, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
  return {w,p};
}
it('releases tool material for the known home after a day; save/load agrees', () => {
  const {w,p}=competing(); const restored=deserializeWorld(serializeWorld(w));
  for (const world of [w,restored]) {
    const person=world.persons.find(q=>q.id===p.id)!;
    reviewIntentions(makeCtx(world,person,true,true));
    expect(person.intentions[0].status).toBe('dropped');
    expect(person.intentions[0].reason).toContain('household home');
    expect(person.inv).toEqual({wood:2,berries:2});
    expect(person.intentions.find(i=>i.status==='active' && i.kind==='shelter')).toBeTruthy();
  }
  expect(serializeWorld(restored)).toBe(serializeWorld(w));
});
it('retains ready tools, young plans, unknown-home plans and plans awaiting help; legacy and ablation stay unchanged', () => {
  for (const mode of ['ready','young','unknown','help','legacy','off']) {
    const {w,p}=competing();
    if(mode==='ready')p.inv.stone=2;
    if(mode==='young')p.intentions[0].since=w.tick;
    if(mode==='unknown'){delete p.beliefs[987654];p.bykind.site=[];}
    if(mode==='help')createRequest(w,p,w.persons[1],{kind:'stone',item:'stone',amount:2,planId:p.intentions[0].id});
    if(mode==='legacy')w.settings.rulesVersion=35;
    setReconsider(mode!=='off');
    try {reviewIntentions(makeCtx(w,p,true,true));} finally {setReconsider(true);}
    expect(p.intentions[0].status,mode).toBe('active');
  }
});

it('a full pack delivers a useful partial shelter batch without creating or discarding goods', () => {
 const {w,p}=competing();p.inv={wood:2,berries:carryCap(w,p)-4};
 reviewIntentions(makeCtx(w,p,true,true));
 reviewIntentions(makeCtx(w,p,true,true));
 const home=p.intentions.find(i=>i.status==='active'&&i.kind==='shelter')!;
 expect(home.stepKind).toBe('deliver');expect(home.step).toContain('take 2 wood');
 expect(home.stepTarget).toBe(987654);expect(p.inv).toEqual({wood:2,berries:carryCap(w,p)-4});
 const before=serializeWorld(w); const restored=deserializeWorld(before);
 reviewIntentions(makeCtx(restored,restored.persons.find(q=>q.id===p.id)!,true,true));
 expect(restored.persons.find(q=>q.id===p.id)!.intentions.find(i=>i.status==='active'&&i.kind==='shelter')!.step).toBe(home.step);
});
it('rules 36 and the ablation retain the full-batch shelter step', () => {
 for(const off of [false,true]){
  const {w,p}=competing();p.inv={wood:2,berries:carryCap(w,p)-4};
  reviewIntentions(makeCtx(w,p,true,true));
  w.settings.rulesVersion=off?37:36; setReconsider(!off);
  try{reviewIntentions(makeCtx(w,p,true,true));}finally{setReconsider(true);}
  expect(p.intentions.find(i=>i.status==='active'&&i.kind==='shelter')!.stepKind).toBe('get');
 }
});

it('retains a plan for an accepted live promise, but releases it after that promise is interrupted', () => {
 const {w,p}=make();const helper=w.persons[1];
 const r=createRequest(w,p,helper,{kind:'wood',item:'wood',amount:2,planId:p.intentions[0].id});
 r.status='promised';r.commitmentId=w.nextId++;
 helper.commitments.push({id:r.commitmentId,requestId:r.id,kind:'deliver',to:p.id,item:'wood',amount:2,delivered:0,siteId:0,made:w.tick,deadline:w.tick+1000,status:'active'});
 reviewIntentions(makeCtx(w,p,true,true));expect(p.intentions[0].status).toBe('active');
 helper.commitments.at(-1)!.status='interrupted';r.status='interrupted';
 reviewIntentions(makeCtx(w,p,true,true));expect(p.intentions[0].status).toBe('dropped');
});
