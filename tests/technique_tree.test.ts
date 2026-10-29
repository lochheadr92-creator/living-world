// STAGED contracts for the technique tree and knowledge continuity (rules 52): smelting after charcoal, forging after smelting,
// taught the same way, worked out by costly trial when nobody is there to teach, and lost with its last holder until then.
import { afterEach, expect, it } from 'vitest';
import { addPerson, building, done, give, pin, stage } from './helpers/kit';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { relOf } from '../src/sim/relations';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { startActivity, newActivity } from '../src/sim/activities';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { startBlocker, startJob, joinBlocker, workJob } from '../src/sim/facilities';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { killPerson } from '../src/sim/lifecycle';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { describePerson } from '../src/sim/inspect';
import { TRIALS_NEEDED, TRIAL_AFTER, LESSON_TICKS, firstLacking, learnBlocker, setTechniqueTree, trialAllowed, techniqueBlocker, describeTechniques } from '../src/sim/techniques';
import { parseIntervention } from '../scripts/lab/lab';
import type { Person } from '../src/sim/types';

afterEach(() => setTechniqueTree(true));
const smelt = RECIPE_BY_ID.smelt_iron;
const forgeAxe = RECIPE_BY_ID.forge_axe;

/**
 * STAGED: Ada (adult; knows charcoal, smelting and forging, set as her starting knowledge), Ben (her child, 12; knows charcoal),
 * Cora (adult, no kin; knows charcoal), a public smithy stocked with ore and charcoal, a kiln. Nobody matures or is granted anything.
 */
function scene(version = 52, opts: { benCharcoal?: boolean; coraCharcoal?: boolean } = {}) {
  const s = stage('technique-tree-52');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.birthCount = 0;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 36, hunger: 98, thirst: 98, energy: 98, traits: { generosity: 0.9, sociability: 1 } });
  const ben = addPerson(s, 'Ben', 42, 40.5, { age: 12, hh: ada.hhId, hunger: 98, thirst: 98, energy: 98, traits: { curiosity: 0.9, sociability: 1 } });
  const cora = addPerson(s, 'Cora', 44, 40.5, { age: 30, hunger: 98, thirst: 98, energy: 98, traits: { curiosity: 0.9, diligence: 1 } });
  const kiln = building(s, 'kiln', 44, 43, 0, { wood: 6 });
  const smithy = building(s, 'smithy', 48, 43, 0, { ore: 12, charcoal: 10, handles: 2 });
  relOf(ada, ben.id).kin = 'child';
  relOf(ben, ada.id).kin = 'parent';
  for (const [p, q] of [[ada, ben], [ben, ada]] as const) {
    relOf(p, q.id).affinity = 80;
    relOf(p, q.id).trust = 60;
  }
  for (const p of [ada, ben, cora]) {
    p.needs.warmth = 95;
    p.needs.safety = 95;
    pin(p);
    observe(w, p, kiln);
    observe(w, p, smithy);
  }
  done(s);
  // starting knowledge, staged: what each knows on arrival (never a grant during the run)
  ada.techniques = { charcoal: { source: 'initial', learned: 0, teacher: 0 }, smelting: { source: 'initial', learned: 0, teacher: 0 }, forging: { source: 'initial', learned: 0, teacher: 0 } };
  ben.techniques = opts.benCharcoal === false ? {} : { charcoal: { source: 'initial', learned: 0, teacher: 0 } };
  cora.techniques = opts.coraCharcoal === false ? {} : { charcoal: { source: 'initial', learned: 0, teacher: 0 } };
  for (const p of [ada, ben, cora]) perceive(w, p);
  w.sceneLabel = 'STAGED: iron smelting and forging pass through instruction or trial';
  const teach = (kind: 'smelting' | 'forging') => {
    ada.cooldowns.pause = 0;
    ada.cooldowns['talk' + ben.id] = 0;
    ada.cooldowns['teach:' + ben.id] = 0;
    perceive(w, ada);
    const o = rankOptions(generateOptions(w, ada, true, true)).find((x) => x.key === `socialize:${ben.id}:teach_technique:${kind}`);
    if (!o?.make) throw new Error('no teaching option for ' + kind + ': ' + generateOptions(w, ada, true, true).options.filter((x) => /teach|Offer/.test(x.label)).map((x) => x.key).join('|'));
    startActivity(w, ada, o.make()!);
    for (let i = 0; i < 300 && !w.conversations.some((c) => c.lesson); i++) {
      stepWorld(w);
      if (ben.convId) ben.cooldowns.pause = 0;
    }
    return w.conversations.find((c) => c.lesson)!;
  };
  /** run one batch of a recipe at the smithy by the ordinary operate activity (a trial when asked), until the job is gone */
  const operate = (p: Person, recipeId: string, trial: boolean) => {
    p.cooldowns.pause = 0;
    startActivity(w, p, newActivity(w, p, { kind: 'operate', label: 'staged batch', goal: 'staged', targetId: smithy.id, targetType: 'building', tx: smithy.x, ty: smithy.y, spotX: smithy.x - 1, spotY: smithy.y + 1, utility: 50, minCommit: 80, maxTicks: 3000, data: { recipe: recipeId, client: p.id, purpose: 'staged', destSite: 0, ...(trial ? { trial: true } : {}) } }));
    let started = false;
    for (let i = 0; i < 3000; i++) {
      stepWorld(w);
      if (smithy.ops?.job) started = true;
      if (started && !smithy.ops?.job) break;
    }
    pin(p);
    return started;
  };
  return { w, ada, ben, cora, kiln, smithy, teach, operate };
}

it('rules 52: smelting and forging are held procedures after charcoal, at the planner, the start, the join and the work; rules 51 reads them as known', () => {
  const f = scene(52);
  expect(startBlocker(f.w, f.smithy, f.cora, smelt)).toBe('has not learned iron smelting');
  expect(startBlocker(f.w, f.smithy, f.cora, forgeAxe)).toBe('has not learned iron forging');
  expect(startBlocker(f.w, f.smithy, f.ada, smelt)).toBe('');
  expect(startJob(f.w, f.smithy, f.cora, smelt, f.cora.id, 'test')).toBe('has not learned iron smelting');
  expect(startJob(f.w, f.smithy, f.ada, smelt, f.ada.id, 'test')).toBeNull();
  expect(joinBlocker(f.w, f.smithy, f.cora)).toBe('has not learned iron smelting');
  expect(workJob(f.w, f.smithy, f.cora)).toBe('stopped');
  expect(firstLacking(f.w, f.cora, 'forging')).toBe('smelting');
  expect(learnBlocker(f.w, f.cora, 'forging')).toBe('must learn iron smelting first');
  const old = scene(51);
  expect(startBlocker(old.w, old.smithy, old.cora, smelt)).toBe('');
  expect(techniqueBlocker(old.w, old.cora, 'forge_axe')).toBe('');
  expect(describeTechniques(old.w, old.cora)).toHaveLength(1);
  expect(describeTechniques(f.w, f.cora)).toHaveLength(3);
  expect(describeTechniques(f.w, f.cora)[1]).toBe('Iron smelting: not learned. Smithy proficiency alone does not supply this technique.');
  expect(describeTechniques(f.w, f.cora)[2]).toBe('Iron forging: not learned (must learn iron smelting first).');
});

it('rules 52: who starts knowing comes from the creation-time background; a rules-51 world of the same seed is untouched', () => {
  const now = createWorld({ ...currentWorldSettings('normal', 'technique-tree', { immigration: false }), rulesVersion: 52 });
  const before = createWorld({ ...currentWorldSettings('normal', 'technique-tree', { immigration: false }), rulesVersion: 51 });
  const adults = now.persons.filter((p) => p.techniques && Object.keys(p.techniques).length >= 0);
  expect(adults.length).toBeGreaterThan(0);
  const smelters = now.persons.filter((p) => p.techniques?.smelting);
  const forgers = now.persons.filter((p) => p.techniques?.forging);
  expect(smelters.length).toBeGreaterThan(0);
  expect(smelters.length).toBeLessThan(now.persons.length / 2);
  expect(forgers.every((p) => p.techniques?.smelting && p.techniques?.charcoal)).toBe(true);
  expect(before.persons.some((p) => p.techniques?.smelting || p.techniques?.forging)).toBe(false);
  // a smith knows the fire: every smelter knows charcoal; everyone who knew charcoal at 51 knows it at 52; every other creation draw is the same
  expect(smelters.every((p) => p.techniques?.charcoal)).toBe(true);
  expect(before.persons.every((p, i) => !p.techniques?.charcoal || !!now.persons[i].techniques?.charcoal)).toBe(true);
  expect(now.persons.filter((p, i) => p.techniques?.charcoal && !before.persons[i].techniques?.charcoal).every((p) => p.techniques?.smelting)).toBe(true);
  expect(before.persons.map((p) => p.skills.smith)).toEqual(now.persons.map((p) => p.skills.smith));
});

it('rules 52: a lesson in smelting is refused to a learner without charcoal, taught to one with it, and forging follows; the taught batch makes real iron', () => {
  const g = scene(52, { benCharcoal: false });
  const refused = g.teach('smelting');
  expect(refused.lesson?.outcome).toBe('declined');
  expect(refused.lesson?.reason).toBe('must learn iron smelting first'.replace('iron smelting', 'charcoal firing'));
  const f = scene(52);
  const c = f.teach('smelting');
  expect(c.lesson?.outcome).toBe('learning');
  expect(c.lesson?.kind).toBe('smelting');
  for (let i = 0; i < LESSON_TICKS + 60 && f.ben.convId; i++) stepWorld(f.w);
  expect(f.ben.techniques?.smelting).toMatchObject({ source: 'taught', teacher: f.ada.id });
  expect(f.ben.techniques?.forging).toBeUndefined();
  expect(f.ben.log.some((l) => /Learned iron smelting from Ada; smithy proficiency still comes from practice/.test(l.text))).toBe(true);
  // the next lesson, forging, now that smelting is theirs
  for (const p of [f.ada, f.ben]) pin(p);
  f.ada.cooldowns['teach:' + f.ben.id] = 0;
  const c2 = f.teach('forging');
  expect(c2.lesson?.kind).toBe('forging');
  for (let i = 0; i < LESSON_TICKS + 60 && f.ben.convId; i++) stepWorld(f.w);
  expect(f.ben.techniques?.forging).toMatchObject({ source: 'taught', teacher: f.ada.id });
  // and the taught procedure is the real thing: Ben smelts iron at the smithy
  expect(startBlocker(f.w, f.smithy, f.ben, smelt)).toBe('');
  expect(f.operate(f.ben, 'smelt_iron', false)).toBe(true);
  expect(f.smithy.ops!.produced.iron).toBe(1);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 52: with nobody to teach her, Cora may try smelting after two days of wanting it; the first two batches come to nothing, the third yields iron and the procedure', () => {
  const f = scene(52);
  // not yet: the want has not stood two days
  expect(trialAllowed(f.w, f.cora, 'smelting')).toBe(false);
  expect(startJob(f.w, f.smithy, f.cora, smelt, f.cora.id, 'test', 0, true)).toBe('has not learned iron smelting');
  f.cora.cooldowns['techWant:smelting'] = f.w.tick;
  f.w.tick += TRIAL_AFTER;
  expect(trialAllowed(f.w, f.cora, 'smelting')).toBe(true);
  // never for forging while smelting is lacking, and never for somebody without charcoal
  expect(trialAllowed(f.w, f.cora, 'forging')).toBe(false);
  const h = scene(52, { coraCharcoal: false });
  h.cora.cooldowns['techWant:smelting'] = h.w.tick;
  h.w.tick += TRIAL_AFTER;
  expect(trialAllowed(h.w, h.cora, 'smelting')).toBe(false);
  const ore0 = f.smithy.store.items.ore!;
  for (let attempt = 1; attempt <= TRIALS_NEEDED; attempt++) {
    expect(f.operate(f.cora, 'smelt_iron', true)).toBe(true);
    if (attempt < TRIALS_NEEDED) {
      expect(f.cora.techniques?.smelting).toBeUndefined();
      expect(f.cora.trials?.smelting?.attempts).toBe(attempt);
      expect(f.smithy.ops!.produced.iron ?? 0).toBe(0);
      expect(f.cora.log.some((l) => new RegExp(`Tried to smelt iron at the smithy without knowing how: the batch came to nothing \\(attempt ${attempt};`).test(l.text))).toBe(true);
    }
  }
  expect(f.cora.techniques?.smelting).toMatchObject({ source: 'trial', attempts: TRIALS_NEEDED });
  expect(f.cora.trials).toBeUndefined();
  expect(f.smithy.ops!.produced.iron).toBe(1);
  expect(f.smithy.ops!.wasted['a failed attempt']).toBe(TRIALS_NEEDED - 1);
  expect(ore0 - (f.smithy.store.items.ore ?? 0)).toBe(3 * TRIALS_NEEDED);
  expect(f.cora.log.some((l) => /Worked out iron smelting by trial at the smithy: 3 attempts, 9 ore, 6 charcoal spent; nobody taught me/.test(l.text))).toBe(true);
  expect(describeTechniques(f.w, f.cora)[1]).toMatch(/^Iron smelting: worked out by trial at tick \d+, after 3 attempts \(9 ore, 6 charcoal spent\); nobody taught it\./);
  expect(conservationReport(f.w).ok).toBe(true);
  // and now the ordinary start is hers
  expect(startBlocker(f.w, f.smithy, f.cora, smelt)).toBe('');
});

it('rules 52: the planner offers the trial of the first procedure lacking, for a forged tool wanted; the want is noted by the decision, not by an observer', () => {
  const f = scene(52);
  // a worn axe makes Cora want an iron one, which wants forging, which wants smelting first
  const axe = give(f.w, f.cora, 'axe');
  axe.wear = 40;
  perceive(f.w, f.cora);
  const ctx = generateOptions(f.w, f.cora, true, true);
  expect(ctx.techniqueWanted?.kind).toBe('smelting');
  expect(ctx.blocked.some((b) => /Forging an iron axe/.test(b.label) && b.blocked === 'has not learned iron forging')).toBe(true);
  expect(ctx.options.some((o) => /untaught \(a trial\)/.test(o.label))).toBe(false);
  // observers do not write the want; the decision does
  expect(f.cora.cooldowns['techWant:smelting']).toBeUndefined();
  const saved = serializeWorld(f.w);
  describePerson(f.w, f.cora.id);
  generateOptions(f.w, f.cora, true, true);
  expect(serializeWorld(f.w)).toBe(saved);
  f.cora.cooldowns.pause = 0;
  stepWorld(f.w);
  expect(f.cora.cooldowns['techWant:smelting']).toBeDefined();
  pin(f.cora);
  f.w.tick += TRIAL_AFTER;
  perceive(f.w, f.cora);
  const o = rankOptions(generateOptions(f.w, f.cora, true, true)).find((x) => x.label === 'Smelting iron untaught (a trial)');
  expect(o?.goal).toMatch(/to work out iron smelting first, to replace my worn axe with an iron one/);
  expect(o?.parts.some((p) => /nobody to teach me iron smelting: try it/.test(p[0]))).toBe(true);
});

it('rules 52: the last holder’s death leaves a gap nobody is told of; the taught survivor keeps it, the rest fall to the trial', () => {
  const f = scene(52);
  f.teach('smelting');
  for (let i = 0; i < LESSON_TICKS + 60 && f.ben.convId; i++) stepWorld(f.w);
  expect(f.ben.techniques?.smelting).toBeDefined();
  killPerson(f.w, f.ada, 'injuries');
  expect(f.ada.techniques?.forging).toBeDefined();
  expect(f.w.persons.filter((p) => p.alive && p.techniques?.forging)).toHaveLength(0);
  expect(startBlocker(f.w, f.smithy, f.ben, smelt)).toBe('');
  // Ben may learn forging from nobody now; two days of wanting it and he may try
  expect(learnBlocker(f.w, f.ben, 'forging')).toBe('');
  expect(trialAllowed(f.w, f.ben, 'forging')).toBe(false);
  f.ben.cooldowns['techWant:forging'] = f.w.tick;
  f.w.tick += TRIAL_AFTER;
  expect(trialAllowed(f.w, f.ben, 'forging')).toBe(true);
  expect(trialAllowed(f.w, f.cora, 'forging')).toBe(false);
});

it('rules 52: switch, exact replay through a trial batch, observer purity, hash coverage, and rules 51 unchanged', () => {
  const f = scene(52);
  f.cora.cooldowns['techWant:smelting'] = f.w.tick;
  f.w.tick += TRIAL_AFTER;
  f.cora.cooldowns.pause = 0;
  startActivity(f.w, f.cora, newActivity(f.w, f.cora, { kind: 'operate', label: 'staged batch', goal: 'staged', targetId: f.smithy.id, targetType: 'building', tx: f.smithy.x, ty: f.smithy.y, spotX: f.smithy.x - 1, spotY: f.smithy.y + 1, utility: 50, minCommit: 80, maxTicks: 3000, data: { recipe: 'smelt_iron', client: f.cora.id, purpose: 'staged', destSite: 0, trial: true } }));
  for (let i = 0; i < 400 && !f.smithy.ops?.job; i++) stepWorld(f.w);
  expect(f.smithy.ops?.job?.trial).toBe(f.cora.id);
  const saved = serializeWorld(f.w);
  const hash = hashWorld(f.w);
  for (let i = 0; i < 3; i++) {
    describePerson(f.w, f.cora.id);
    generateOptions(f.w, f.cora, true, true);
    describeTechniques(f.w, f.cora);
    trialAllowed(f.w, f.cora, 'smelting');
  }
  expect(serializeWorld(f.w)).toBe(saved);
  const copy = deserializeWorld(saved);
  for (let i = 0; i < 600; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
  expect(f.cora.trials?.smelting?.attempts).toBe(1);
  const changed = deserializeWorld(serializeWorld(f.w));
  changed.persons.find((p) => p.id === f.cora.id)!.trials!.smelting!.attempts = 2;
  expect(hashWorld(changed)).not.toBe(hashWorld(f.w));
  void hash;
  const restore = parseIntervention('rich-no-technique-tree').install!();
  try {
    expect(startBlocker(f.w, f.smithy, f.cora, smelt)).toBe('');
    expect(trialAllowed(f.w, f.cora, 'smelting')).toBe(false);
    expect(describeTechniques(f.w, f.cora)).toHaveLength(1);
  } finally {
    restore();
  }
  expect(startBlocker(f.w, f.smithy, f.cora, forgeAxe)).toBe('has not learned iron forging');
});
