import { afterEach, expect, it } from 'vitest';
import { learnerScene } from './helpers/learner_instruction';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { startActivity } from '../src/sim/activities';
import { perceive } from '../src/sim/perception';
import { delBelief } from '../src/sim/knowledge';
import { conservationReport } from '../src/sim/economy';
import { answerRequestedLesson, finishLesson, setLearnerInstruction, LESSON_TICKS } from '../src/sim/techniques';
import { updateConversations } from '../src/sim/social';
import { parseIntervention } from '../scripts/lab/lab';
import { observeNow } from './helpers/inhabit';

afterEach(() => setLearnerInstruction(true));

it('offers a wanted learner-initiated lesson without reading private teacher knowledge', () => {
  const { w, a, b } = learnerScene();
  const option = rankOptions(generateOptions(w, b, true, true)).find(o => o.key === `socialize:${a.id}:learn_technique`);
  expect(option?.label).toBe('Ask Ada to teach charcoal firing');
  a.techniques = {};
  expect(rankOptions(generateOptions(w, b, true, true)).find(o => o.key === option!.key)).toBeDefined();
});

it('executes the request, saves a timed lesson and enables ordinary material production', () => {
  const f = learnerScene(), { w, a, b, kiln } = f;
  const c = f.reach()!;
  expect(c?.purpose).toBe('learn_technique'); expect(c?.lesson?.outcome).toBe('learning');
  expect(b.techniques).toEqual({});
  for (let i = 0; i < 80; i++) stepWorld(w);
  const saved = serializeWorld(w), loaded = deserializeWorld(saved);
  for (let i = 0; i < 200 && b.convId; i++) { stepWorld(w); stepWorld(loaded); }
  expect(serializeWorld(w)).toBe(serializeWorld(loaded));
  expect(b.techniques?.charcoal).toMatchObject({ teacher: a.id, source: 'taught', lesson: c.id });
  expect(b.techniques!.charcoal!.learned - b.techniques!.charcoal!.started!).toBe(LESSON_TICKS);
  const once = serializeWorld(w); expect(finishLesson(w, c, a, b)).toBe(false); expect(serializeWorld(w)).toBe(once);
  f.hold(); b.cooldowns.pause = 0;
  const op = rankOptions(generateOptions(w, b, true, true)).find(o => o.label === 'Burning charcoal')!;
  expect(op?.make).toBeDefined(); startActivity(w, b, op.make!()!);
  for (let i = 0; i < 1400 && (kiln.store.items.charcoal ?? 0) < 3; i++) stepWorld(w);
  expect(kiln.store.items.charcoal).toBe(3); expect(kiln.store.items.wood ?? 0).toBe(0);
  expect(conservationReport(w).ok).toBe(true);
});

it.each(['unknown', 'distrust', 'commitment'] as const)('the recipient can decline for %s and grants no knowledge', reason => {
  const f = learnerScene(), { w, a, b } = f;
  if (reason === 'unknown') a.techniques = {};
  if (reason === 'distrust') a.relations[b.id].trust = -40;
  if (reason === 'commitment') a.commitments.push({ id:w.nextId++, requestId:0, kind:'deliver', to:b.id, item:'wood', amount:1, siteId:0, made:w.tick, deadline:w.tick+1000, status:'active' });
  const c = f.reach()!;
  expect(c?.lesson?.outcome).toBe('declined');
  const before = serializeWorld(w); answerRequestedLesson(w,c,a,b); expect(serializeWorld(w)).toBe(before);
  for (let i = 0; i < 240; i++) stepWorld(w);
  expect(b.techniques).toEqual({}); expect(conservationReport(w).ok).toBe(true);
});

it.each(['separate','need'] as const)('interrupting a requested lesson for %s teaches nothing', reason => {
  const f=learnerScene(); expect(f.reach()?.lesson?.outcome).toBe('learning');
  if(reason==='separate')f.a.x=70; else f.b.needs.thirst=1;
  updateConversations(f.w);
  expect(f.b.techniques).toEqual({}); expect(f.b.lastInteraction?.outcome).toBe('interrupted');
});

it('requires wanted work, local contact and a plausible contact; it does not expose hidden competence', () => {
  for(const condition of ['unseen','stranger','known','no-work','urgent','cooldown'] as const){
    const f=learnerScene();
    if(condition==='unseen')f.a.x=70;
    if(condition==='stranger')f.b.relations[f.a.id].kin='';
    if(condition==='known')f.b.techniques={charcoal:{source:'initial',teacher:0,learned:0}};
    if(condition==='no-work'){f.a.x=70;f.a.y=70;f.b.x=71.5;f.b.y=70;delBelief(f.b,f.kiln.id);delBelief(f.b,f.smithy.id);}
    if(condition==='urgent')f.b.needs.thirst=1;
    if(condition==='cooldown')f.b.cooldowns['learn:'+f.a.id]=f.w.tick+100;
    perceive(f.w,f.b);
    expect(f.request(),condition).toBeUndefined();
  }
});

it('keeps observer purity, predecessor behavior and an isolated install/restore ablation', () => {
  for(const version of [40,41]){
    const f=learnerScene(version),before=serializeWorld(f.w);
    for(let i=0;i<8;i++){generateOptions(f.w,f.b,true,true);observeNow(f.w,f.b);}
    expect(serializeWorld(f.w)).toBe(before);
    expect(!!f.request()).toBe(version===41);
    const restore=parseIntervention('rich-no-learner-instruction').install!(); expect(f.request()).toBeUndefined(); restore();
    expect(!!f.request()).toBe(version===41);
    expect(rankOptions(generateOptions(f.w,f.a,true,true)).some(o=>o.key.endsWith(':teach_technique'))).toBe(true);
  }
});
