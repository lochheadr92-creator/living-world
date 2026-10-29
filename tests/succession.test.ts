// STAGED contracts for taking up what a dead member left unfinished (rules 53, succession.ts).
import { afterEach, expect, it } from 'vitest';
import { addPerson, done, pin, site, stage } from './helpers/kit';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { generateOptions } from '../src/sim/decision';
import { reviewIntentions } from '../src/sim/intent';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { killPerson } from '../src/sim/lifecycle';
import { cancelSite } from '../src/sim/buildings';
import { knowsDeath } from '../src/sim/death_knowledge';
import { SUCCESSION_WINDOW, describeUnfinished, setSuccession, successionWanted } from '../src/sim/succession';
import { observeNow } from './helpers/inhabit';
import { parseIntervention } from '../scripts/lab/lab';

afterEach(() => setSuccession(true));

/**
 * STAGED: Ada and Ben, adults of one household with no home and a house site laid out; Ada carries wood for it and has taken
 * on the shelter plan; Cora, another household, far off. Nobody matures; nothing is granted.
 */
function scene(version = 53, opts: { tool?: boolean } = {}) {
  const s = stage('succession-53');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 34, inv: opts.tool ? { wood: 2, stone: 1 } : { wood: 3 }, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const ben = addPerson(s, 'Ben', 42.5, 40.5, { age: 30, hh: ada.hhId, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const cora = addPerson(s, 'Cora', 70.5, 70.5, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  const st = site(s, 'hut', 46, 43, ada.hhId, ada.id);
  for (const p of [ada, ben]) {
    observe(w, p, st);
    p.needs.warmth = 100;
    p.needs.safety = 100;
    pin(p);
  }
  pin(cora);
  done(s);
  for (const p of [ada, ben, cora]) perceive(w, p);
  w.sceneLabel = 'STAGED: a shelter plan outlives its maker';
  return { w, ada, ben, cora, st };
}

it('rules 53: what a dead member left unfinished is recorded on the household with what they had gathered, and a witness who knows of the death takes it up', () => {
  const f = scene(53);
  reviewIntentions(generateOptions(f.w, f.ada, true));
  const plan = f.ada.intentions.find((i) => i.kind === 'shelter' && i.status === 'active')!;
  expect(plan).toBeDefined();
  expect(plan.aboutId).toBe(f.st.id);
  const hh = f.w.households.find((h) => h.id === f.ada.hhId)!;
  killPerson(f.w, f.ada, 'injuries');
  expect(knowsDeath(f.ben, f.ada.id)).toBe(true);
  expect(hh.unfinished).toHaveLength(1);
  const u = hh.unfinished![0];
  expect(u).toMatchObject({ by: f.ada.id, name: 'Ada', kind: 'shelter', aboutId: f.st.id });
  expect(u.carried.wood).toBe(3);
  expect(u.pileId).toBeGreaterThan(0);
  expect(describeUnfinished(f.w, hh)[0]).toMatch(/^Ada left the household home unfinished 0\.0 days ago\.$/);
  // the site's own record is untouched by the death
  expect(f.st.delivered.wood ?? 0).toBe(0);
  // Ben takes it up: the ordinary shelter plan, naming whom it continues, and the pile he saw her belongings fall into
  f.ben.cooldowns.pause = 0;
  perceive(f.w, f.ben);
  expect(successionWanted(generateOptions(f.w, f.ben, true, true))?.id).toBe(u.id);
  reviewIntentions(generateOptions(f.w, f.ben, true));
  const mine = f.ben.intentions.find((i) => i.kind === 'shelter' && i.status === 'active')!;
  expect(mine).toBeDefined();
  expect(mine.succeeding).toEqual({ from: f.ada.id, name: 'Ada', worked: 0 });
  expect(mine.goal).toBe("finish what Ada began: get the household's hut built");
  expect(hh.unfinished).toBeUndefined();
  expect(f.ben.beliefs[u.pileId]?.kind).toBe('pile');
  expect(f.ben.log.some((l) => /Taking up what Ada left unfinished: the household home \(they had gathered 3 wood, left where they fell\)/.test(l.text))).toBe(true);
  // and the wood she dropped reaches the site by his hands, credited to him as contributor
  for (let i = 0; i < 3000 && (f.st.delivered.wood ?? 0) < 1; i++) stepWorld(f.w);
  expect(f.st.delivered.wood ?? 0).toBeGreaterThanOrEqual(1);
  expect(f.st.contrib?.[f.ben.hhId] ?? 0).toBeGreaterThanOrEqual(1);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 53: a hand-tool plan is taken up by its recipe, and someone who does not know of the death takes nothing up until told', () => {
  const f = scene(53, { tool: true });
  f.ada.intentions.push({ id: f.w.nextId++, kind: 'tool', goal: 'make a axe', since: f.w.tick, until: f.w.tick + 4800, status: 'active', reason: 'staged', setAside: 0, aboutId: 0, wants: { wood: 2, stone: 1 }, makes: 'axe', sheltered: 0, worked: 0, ended: 0, step: '', stepKind: 'none', stepTarget: 0, stepItem: null, stepKey: null, blocked: '' });
  // Ben is asleep: he does not witness; afterwards he is far off, where he cannot see the grave either, and knows nothing of it
  f.ben.pose = 'sleep';
  killPerson(f.w, f.ada, 'injuries');
  f.ben.pose = 'stand';
  f.ben.x = 62.5;
  f.ben.y = 62.5;
  expect(knowsDeath(f.ben, f.ada.id)).toBe(false);
  const hh = f.w.households.find((h) => h.id === f.ben.hhId)!;
  expect(hh.unfinished?.map((u) => u.kind)).toEqual(['tool']);
  f.ben.cooldowns.pause = 0;
  perceive(f.w, f.ben);
  expect(successionWanted(generateOptions(f.w, f.ben, true, true))).toBeNull();
  // told of it (the rules-14 path writes the same record a witness gets)
  f.ben.relations[f.ada.id] = { ...f.ben.relations[f.ada.id], deathKnown: { learned: f.w.tick, source: 'told', via: f.cora.id } };
  expect(successionWanted(generateOptions(f.w, f.ben, true, true))?.kind).toBe('tool');
  reviewIntentions(generateOptions(f.w, f.ben, true));
  const mine = f.ben.intentions.find((i) => i.kind === 'tool')!;
  expect(mine.makes).toBe('axe');
  expect(mine.wants).toEqual({ wood: 2, stone: 1 });
  expect(mine.succeeding?.name).toBe('Ada');
  // told, not a witness: he does not know where her belongings fell
  expect(Object.values(f.ben.beliefs).some((b) => b.kind === 'pile')).toBe(false);
});

it('rules 53: an undertaking that no longer stands is cancelled with the reason; a record older than the window lapses', () => {
  const f = scene(53);
  reviewIntentions(generateOptions(f.w, f.ada, true));
  killPerson(f.w, f.ada, 'injuries');
  const hh = f.w.households.find((h) => h.id === f.ben.hhId)!;
  cancelSite(f.w, f.st, 'staged: the site is given up');
  f.ben.cooldowns.pause = 0;
  perceive(f.w, f.ben);
  reviewIntentions(generateOptions(f.w, f.ben, true));
  // (his own rules-7 shelter plan from the stale belief may follow; it continues nobody)
  expect(f.ben.intentions.some((i) => i.succeeding)).toBe(false);
  expect(hh.unfinished).toBeUndefined();
  expect(f.ben.log.some((l) => /What Ada left unfinished \(the household home\) cannot be taken up: the site is finished or gone/.test(l.text))).toBe(true);
  const g = scene(53);
  reviewIntentions(generateOptions(g.w, g.ada, true));
  killPerson(g.w, g.ada, 'injuries');
  g.w.tick += SUCCESSION_WINDOW + 1;
  g.ben.cooldowns.pause = 0;
  perceive(g.w, g.ben);
  expect(successionWanted(generateOptions(g.w, g.ben, true, true))).toBeNull();
});

it('rules 53: switch, exact replay, observer purity, hash coverage, and rules 52 unchanged', () => {
  const f = scene(53);
  reviewIntentions(generateOptions(f.w, f.ada, true));
  killPerson(f.w, f.ada, 'injuries');
  const saved = serializeWorld(f.w);
  const hash = hashWorld(f.w);
  for (let i = 0; i < 3; i++) {
    observeNow(f.w, f.ben);
    successionWanted(generateOptions(f.w, f.ben, true, true));
    describeUnfinished(f.w, f.w.households.find((h) => h.id === f.ben.hhId)!);
  }
  expect(serializeWorld(f.w)).toBe(saved);
  const copy = deserializeWorld(saved);
  for (let i = 0; i < 300; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
  const changed = deserializeWorld(saved);
  changed.households.find((h) => h.id === f.ben.hhId)!.unfinished!.pop();
  expect(hashWorld(changed)).not.toBe(hash);
  const restore = parseIntervention('rich-no-succession').install!();
  try {
    const g = scene(53);
    reviewIntentions(generateOptions(g.w, g.ada, true));
    killPerson(g.w, g.ada, 'injuries');
    expect(g.w.households.find((h) => h.id === g.ben.hhId)!.unfinished).toBeUndefined();
  } finally {
    restore();
  }
  const old = scene(52);
  reviewIntentions(generateOptions(old.w, old.ada, true));
  killPerson(old.w, old.ada, 'injuries');
  expect(old.w.households.find((h) => h.id === old.ben.hhId)!.unfinished).toBeUndefined();
});
